import mongoose, { Types } from 'mongoose';
import { beforeEach, describe, test, vi } from 'vitest';
import { exampleSchema, ExampleSchemaType, getModel, SchemaToCommittableModel } from '../../tests/utils';
import '../../tests/withDB';
import { GitError } from '../errors';
import { GitDetached } from '../git';
import { CommittableDocument } from '../types';

declare module 'vitest' {
  export interface TestContext {
    Model: SchemaToCommittableModel<ExampleSchemaType>;
    globalGit: ReturnType<SchemaToCommittableModel<ExampleSchemaType>['$git']>;
  }
}

beforeEach(ctx => {
  const Model = getModel({ patcher: 'mini-json-patch' });
  const globalGit = Model.$git();

  ctx.Model = Model;
  ctx.globalGit = globalGit;

  return () => {
    mongoose.deleteModel(Model.modelName).deleteModel(globalGit._model.modelName);
  };
});

const gitMaker = [
  ['by object', (o: CommittableDocument<any>) => o.$git] as const,
  ['by ref', (o: CommittableDocument<any>, globalGit: GitDetached<any, any>) => globalGit.withRefId(o._id)] as const,
] as const;

describe('checkout', () => {
  describe.concurrent('by commit id', () => {
    test.for(gitMaker)('%s', async ([, git], { Model, globalGit, expect }) => {
      const obj = await Model.create({ some_field: 'some_value' });
      obj.some_field = 'some_other_value';
      await obj.save();

      const log = await git(obj, globalGit).log();

      const checkout = await git(obj, globalGit).checkout(log[1]._id);
      expect(checkout).toMatchObject({
        _id: obj._id,
        some_field: 'some_value',
      });
    });
  });
  describe.concurrent('by commit id string', () => {
    test.for(gitMaker)('%s', async ([, git], { Model, globalGit, expect }) => {
      const obj = await Model.create({ some_field: 'some_value' });
      obj.some_field = 'some_other_value';
      await obj.save();

      const log = await git(obj, globalGit).log();

      await expect(git(obj, globalGit).checkout(log[1].id)).resolves.toMatchObject({
        _id: obj._id,
        some_field: 'some_value',
      });
    });
  });
  describe.sequential('by date', () => {
    // Seems to be a bug in vitest fake timers not supporting parallelism, so for now these are sequential
    beforeEach(() => {
      vi.useFakeTimers();

      return () => vi.useRealTimers();
    });

    test.for(gitMaker)('%s', async ([, git], { Model, globalGit, expect }) => {
      vi.setSystemTime(new Date(0));
      const obj = await Model.create({ some_field: 'some_value' });
      vi.advanceTimersByTime(1000);
      obj.some_field = 'some_other_value';
      await obj.save();

      await expect(git(obj, globalGit).checkout(new Date(0))).resolves.toMatchObject({
        _id: obj._id,
        some_field: 'some_value',
      });
      await expect(git(obj, globalGit).checkout('1970-01-01T00:00:00.000Z')).resolves.toMatchObject({
        _id: obj._id,
        some_field: 'some_value',
      });
    });
  });
  describe.concurrent('from commit id', () => {
    beforeEach(ctx => {
      ctx.Model = getModel(exampleSchema, { snapshotWindow: 2, patcher: 'mini-json-patch' });
      ctx.globalGit = ctx.Model.$git();

      return () => {
        mongoose.deleteModel(ctx.Model.modelName).deleteModel(ctx.globalGit._model.modelName);
      };
    });
    test.for(gitMaker)('%s', async ([, git], { Model, globalGit, expect }) => {
      const obj = await Model.create({ some_field: '1' });
      obj.some_field = '2';
      await obj.save();
      obj.some_field = '3';
      await obj.save();

      const latestSnapshot = await git(obj, globalGit)._model.findOne(
        {
          refId: obj._id,
          snapshot: { $exists: true },
        },
        { snapshot: true },
        { sort: { _id: -1 } }
      );

      expect(latestSnapshot, 'No snapshot found').not.toBeNull();
      expect(latestSnapshot!.snapshot, 'Incorrect snapshot').toEqual({ _id: obj._id, some_field: '3' });

      await expect(git(obj, globalGit).checkout(latestSnapshot!._id)).resolves.toMatchObject({
        _id: obj._id,
        some_field: '3',
      });
    });
  });

  describe.concurrent('by offset', () => {
    test.for(gitMaker)('%s', async ([, git], { Model, globalGit, expect }) => {
      const obj = await Model.create({ some_field: '1' });
      obj.some_field = '2';
      await obj.save();
      await expect(git(obj, globalGit).checkout(0)).resolves.toMatchObject({ _id: obj._id, some_field: '2' });
      await expect(git(obj, globalGit).checkout(1)).resolves.toMatchObject({ _id: obj._id, some_field: '1' });
      await expect(git(obj, globalGit).checkout(-1)).resolves.toMatchObject({ _id: obj._id, some_field: '1' });
      await expect(git(obj, globalGit).checkout('HEAD')).resolves.toMatchObject({ _id: obj._id, some_field: '2' });
      await expect(git(obj, globalGit).checkout('@')).resolves.toMatchObject({ _id: obj._id, some_field: '2' });
      await expect(git(obj, globalGit).checkout('HEAD^')).resolves.toMatchObject({ _id: obj._id, some_field: '1' });
      await expect(git(obj, globalGit).checkout('@^')).resolves.toMatchObject({ _id: obj._id, some_field: '1' });
      await expect(git(obj, globalGit).checkout('HEAD~')).resolves.toMatchObject({ _id: obj._id, some_field: '1' });
      await expect(git(obj, globalGit).checkout('@~')).resolves.toMatchObject({ _id: obj._id, some_field: '1' });
      await expect(git(obj, globalGit).checkout('HEAD^1')).resolves.toMatchObject({ _id: obj._id, some_field: '1' });
      await expect(git(obj, globalGit).checkout('@^1')).resolves.toMatchObject({ _id: obj._id, some_field: '1' });
      await expect(git(obj, globalGit).checkout('HEAD~1')).resolves.toMatchObject({ _id: obj._id, some_field: '1' });
      await expect(git(obj, globalGit).checkout('@~1')).resolves.toMatchObject({ _id: obj._id, some_field: '1' });
    });
  });

  describe.concurrent('by invalid commit ref', () => {
    test.for(gitMaker)('%s', async ([, git], { Model, globalGit, expect }) => {
      const obj = await Model.create({ some_field: '1' });
      await expect(git(obj, globalGit).checkout(1)).rejects.toThrow(GitError);
      await expect(git(obj, globalGit).checkout(2)).rejects.toThrow(GitError);
      await expect(git(obj, globalGit).checkout(-1)).rejects.toThrow(GitError);
      await expect(git(obj, globalGit).checkout('HEAD^-1')).rejects.toThrow(GitError);
      await expect(git(obj, globalGit).checkout('@^-1')).rejects.toThrow(GitError);
      await expect(git(obj, globalGit).checkout('@^2')).rejects.toThrow(GitError);
      await expect(git(obj, globalGit).checkout(new Date(0)), 'Past date').rejects.toThrow(GitError);
      await expect(git(obj, globalGit).checkout('1970-01-01T00:00:00'), 'Past date').rejects.toThrow(GitError);
      await expect(git(obj, globalGit).checkout(new Types.ObjectId()), 'Invalid commit id').rejects.toThrow(GitError);
      await expect(git(obj, globalGit).checkout(true), 'Invalid commit identifier').rejects.toThrow(GitError);
    });
  });
});

describe.concurrent('diff', () => {
  test('with no args', async ({ Model, globalGit, expect }) => {
    const obj = await Model.create({ some_field: 'some_value' });
    obj.some_field = 'some_other_value';

    await expect(obj.$git.diff()).resolves.toEqual({
      type: 'mini-json-patch',
      ops: [['~', '/some_field', 'some_other_value']],
    });

    // Global Git it not aware of uncommitted changes, it effectively acts as the remote server
    await expect(globalGit.withRefId(obj._id).diff()).resolves.toEqual({
      type: 'mini-json-patch',
      ops: null,
    });
  });
  describe('check previous commit', () => {
    test.for(gitMaker)('%s', async ([, git], { Model, globalGit, expect }) => {
      const obj = await Model.create({ some_field: 'some_value' });
      obj.some_field = 'some_other_value';
      await obj.save();

      await expect(git(obj, globalGit).diff(-1)).resolves.toEqual({
        type: 'mini-json-patch',
        ops: [['~', '/some_field', 'some_other_value']],
      });
      await expect(git(obj, globalGit).diff('HEAD^1')).resolves.toEqual({
        type: 'mini-json-patch',
        ops: [['~', '/some_field', 'some_other_value']],
      });
    });
  });
  describe('check a range of commits', () => {
    test.for(gitMaker)('%s', async ([, git], { Model, globalGit, expect }) => {
      const obj = await Model.create({ some_field: '1' });
      obj.some_field = '2';
      await obj.save();
      obj.some_field = '3';
      await obj.save();

      await expect(git(obj, globalGit).diff(-2)).resolves.toEqual({
        type: 'mini-json-patch',
        ops: [['~', '/some_field', '3']],
      });
    });
  });
  describe('between two non-HEAD commits', () => {
    test.for(gitMaker)('%s', async ([, git], { Model, globalGit, expect }) => {
      const obj = await Model.create({ some_field: '1' });
      obj.some_field = '2';
      await obj.save();
      obj.some_field = '3';
      await obj.save();

      await expect(git(obj, globalGit).diff(-2, -1)).resolves.toEqual({
        type: 'mini-json-patch',
        ops: [['~', '/some_field', '2']],
      });
    });
  });
});

describe.concurrent('log', () => {
  describe('pre save', () => {
    test.for(gitMaker)('%s', async ([, git], { Model, globalGit, expect }) => {
      const obj = new Model({ some_field: 'some_value' });
      await expect(git(obj, globalGit).log()).resolves.toHaveLength(0);
    });
  });
  describe('post save', () => {
    test.for(gitMaker)('%s', async ([, git], { Model, globalGit, expect }) => {
      const obj = await Model.create({ some_field: 'some_value' });
      const log = await git(obj, globalGit).log();

      expect(log).toHaveLength(1);
      expect(log[0].patch).toMatchObject({
        type: 'mini-json-patch',
        ops: [['~', '', { some_field: 'some_value', _id: obj._id }]],
      });
    });
  });
  describe('after update', () => {
    test.for(gitMaker)('%s', async ([, git], { Model, globalGit, expect }) => {
      const obj = await Model.create({ some_field: 'some_value' });
      obj.some_field = 'some_other_value';
      await obj.save();

      const log = await git(obj, globalGit).log();

      expect(log).toHaveLength(2);
      expect(log[0].patch).toMatchObject({
        type: 'mini-json-patch',
        ops: [['~', '/some_field', 'some_other_value']],
      });
    });
  });
});

describe.concurrent('status', () => {
  test('new doc', async ({ Model, globalGit, expect }) => {
    const obj = new Model({ some_field: 'some_value' });
    await expect(obj.$git.status()).resolves.toEqual({
      type: 'mini-json-patch',
      ops: [['~', '', { some_field: 'some_value', _id: obj._id }]],
    });
    // At this point the doc has not been committed to the db so there is no commits available
    await expect(globalGit.withRefId(obj._id).status()).resolves.toEqual({ type: 'mini-json-patch', ops: null });
  });
  test('after save', async ({ Model, globalGit, expect }) => {
    const obj = await Model.create({ some_field: 'some_value' });
    await expect(obj.$git.status()).resolves.toEqual({ type: 'mini-json-patch', ops: null });
    await expect(globalGit.withRefId(obj._id).status()).resolves.toEqual({ type: 'mini-json-patch', ops: null });
  });
  test('before update', async ({ Model, globalGit, expect }) => {
    const obj = await Model.create({ some_field: 'some_value' });
    obj.some_field = 'some_other_value';
    await expect(obj.$git.status()).resolves.toEqual({
      type: 'mini-json-patch',
      ops: [['~', '/some_field', 'some_other_value']],
    });
    await expect(globalGit.withRefId(obj._id).status()).resolves.toEqual({ type: 'mini-json-patch', ops: null });
  });
});
