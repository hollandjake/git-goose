/* eslint @typescript-eslint/ban-ts-comment: 0 */
/* eslint @typescript-eslint/no-explicit-any: 0 */

import { Types } from 'mongoose';
import { describe, expect, test, vi } from 'vitest';
import { GitError } from '../../lib/errors';
import { GitDetached } from '../../lib/git';
import { CommittableDocument } from '../../lib/types';
import { exampleSchema, getModel } from '../utils';

const Model = getModel({ patcher: 'json-patch' });
const globalGit = Model.$git();

const gitMaker = [
  ['by object', (o: CommittableDocument<any>) => o.$git] as const,
  ['by ref', (o: CommittableDocument<any>, globalGit: GitDetached<any, any>) => globalGit.withRefId(o._id)] as const,
] as const;

describe('checkout', () => {
  describe('by commit id', () => {
    test.for(gitMaker)('%s', async ([, git]) => {
      const obj = await Model.create({ some_field: 'some_value' });
      obj.some_field = 'some_other_value';
      await obj.save();

      const log = await git(obj, globalGit).log();

      await expect(git(obj, globalGit).checkout(log[1]._id)).resolves.toMatchObject({
        _id: obj._id,
        some_field: 'some_value',
      });
    });
  });
  describe('by commit id string', () => {
    test.for(gitMaker)('%s', async ([, git]) => {
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
  describe('by date', () => {
    test.for(gitMaker)('%s', async ([, git]) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(0));
      const obj = await Model.create({ some_field: 'some_value' });
      vi.setSystemTime(new Date(1));
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
      vi.useRealTimers();
    });
  });
  describe('from commit id', () => {
    test.for(gitMaker)('%s', async ([, git]) => {
      const Model = getModel(exampleSchema, { snapshotWindow: 2, patcher: 'json-patch' });
      const obj = await Model.create({ some_field: '1' });
      obj.some_field = '2';
      await obj.save();
      obj.some_field = '3';
      await obj.save();

      // @ts-ignore Allow access to protected property
      const latestSnapshot = await git(obj, globalGit).model.findOne(
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

  describe('by offset', () => {
    test.for(gitMaker)('%s', async ([, git]) => {
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

  describe('by invalid commit ref', () => {
    test.for(gitMaker)('%s', async ([, git]) => {
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

describe('diff', () => {
  test('with no args', async () => {
    const obj = await Model.create({ some_field: 'some_value' });
    obj.some_field = 'some_other_value';

    await expect(obj.$git.diff()).resolves.toEqual({
      type: 'json-patch',
      ops: [{ op: 'replace', path: '/some_field', value: 'some_other_value' }],
    });

    // Global Git it not aware of uncommitted changes, it effectively acts as the remote server
    await expect(globalGit.withRefId(obj._id).diff()).resolves.toEqual({
      type: 'json-patch',
      ops: [],
    });
  });
  describe('check previous commit', () => {
    test.for(gitMaker)('%s', async ([, git]) => {
      const obj = await Model.create({ some_field: 'some_value' });
      obj.some_field = 'some_other_value';
      await obj.save();

      await expect(git(obj, globalGit).diff(-1)).resolves.toEqual({
        type: 'json-patch',
        ops: [{ op: 'replace', path: '/some_field', value: 'some_other_value' }],
      });
      await expect(git(obj, globalGit).diff('HEAD^1')).resolves.toEqual({
        type: 'json-patch',
        ops: [{ op: 'replace', path: '/some_field', value: 'some_other_value' }],
      });
    });
  });
  describe('check a range of commits', () => {
    test.for(gitMaker)('%s', async ([, git]) => {
      const obj = await Model.create({ some_field: '1' });
      obj.some_field = '2';
      await obj.save();
      obj.some_field = '3';
      await obj.save();

      await expect(git(obj, globalGit).diff(-2)).resolves.toEqual({
        type: 'json-patch',
        ops: [{ op: 'replace', path: '/some_field', value: '3' }],
      });
    });
  });
  describe('between two non-HEAD commits', () => {
    test.for(gitMaker)('%s', async ([, git]) => {
      const obj = await Model.create({ some_field: '1' });
      obj.some_field = '2';
      await obj.save();
      obj.some_field = '3';
      await obj.save();

      await expect(git(obj, globalGit).diff(-2, -1)).resolves.toEqual({
        type: 'json-patch',
        ops: [{ op: 'replace', path: '/some_field', value: '2' }],
      });
    });
  });
});

describe('log', () => {
  describe('pre save', () => {
    test.for(gitMaker)('%s', async ([, git]) => {
      const obj = new Model({ some_field: 'some_value' });
      await expect(git(obj, globalGit).log()).resolves.toHaveLength(0);
    });
  });
  describe('post save', () => {
    test.for(gitMaker)('%s', async ([, git]) => {
      const obj = await Model.create({ some_field: 'some_value' });
      const log = await git(obj, globalGit).log();

      expect(log).toHaveLength(1);
      expect(log[0].patch.type).toEqual('json-patch');
      expect(new Set(log[0].patch.ops)).toEqual(
        new Set([
          {
            op: 'replace',
            path: '',
            value: { some_field: 'some_value', _id: obj._id },
          },
        ])
      );
    });
  });
  describe('after update', () => {
    test.for(gitMaker)('%s', async ([, git]) => {
      const obj = await Model.create({ some_field: 'some_value' });
      obj.some_field = 'some_other_value';
      await obj.save();

      const log = await git(obj, globalGit).log();

      expect(log).toHaveLength(2);
      expect(log[0].patch.type).toEqual('json-patch');
      expect(new Set(log[0].patch.ops)).toEqual(
        new Set([{ path: '/some_field', op: 'replace', value: 'some_other_value' }])
      );
    });
  });
});

describe('status', () => {
  test('new doc', async () => {
    const obj = new Model({ some_field: 'some_value' });
    await expect(obj.$git.status()).resolves.toEqual({
      type: 'json-patch',
      ops: [
        {
          op: 'replace',
          path: '',
          value: { some_field: 'some_value', _id: obj._id },
        },
      ],
    });
    // At this point the doc has not been committed to the db so there is no commits available
    await expect(globalGit.withRefId(obj._id).status()).rejects.toThrow();
  });
  test('after save', async () => {
    const obj = await Model.create({ some_field: 'some_value' });
    await expect(obj.$git.status()).resolves.toEqual({
      type: 'json-patch',
      ops: [],
    });
    await expect(globalGit.withRefId(obj._id).status()).resolves.toEqual({ type: 'json-patch', ops: [] });
  });
  test('before update', async () => {
    const obj = await Model.create({ some_field: 'some_value' });
    obj.some_field = 'some_other_value';
    await expect(obj.$git.status()).resolves.toEqual({
      type: 'json-patch',
      ops: [{ path: '/some_field', op: 'replace', value: 'some_other_value' }],
    });
    await expect(globalGit.withRefId(obj._id).status()).resolves.toEqual({ type: 'json-patch', ops: [] });
  });
});

describe('commit', () => {
  test('throws an error when not a document', async () => {
    const obj = await Model.create({ some_field: 'some_value' });
    // @ts-ignore Allow access to protected property
    await expect(Model.$git().withRefId(obj._id).commit()).rejects.toThrow(GitError);
  });
});
