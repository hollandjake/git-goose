/* eslint @typescript-eslint/ban-ts-comment: 0 */

import { Types } from 'mongoose';
import { describe, expect, test, vi } from 'vitest';
import { GitError } from '../lib/errors';
import { exampleSchema, getModel } from './utils';

const Model = getModel();

describe('status', () => {
  test('new doc', async () => {
    const obj = new Model({ some_field: 'some_value' });
    expect(new Set(await obj.$git.status())).toEqual(
      new Set([
        {
          op: 'add',
          path: '/some_field',
          value: 'some_value',
        },
        {
          op: 'add',
          path: '/_id',
          value: obj._id,
        },
      ])
    );
  });
  test('after save', async () => {
    const obj = await Model.create({ some_field: 'some_value' });
    expect(new Set(await obj.$git.status())).toEqual(new Set());
  });
  test('before update', async () => {
    const obj = await Model.create({ some_field: 'some_value' });
    obj.some_field = 'some_other_value';
    expect(new Set(await obj.$git.status())).toEqual(
      new Set([{ path: '/some_field', op: 'replace', value: 'some_other_value' }])
    );
  });
});

describe('log', () => {
  test('only staged', async () => {
    const obj = new Model({ some_field: 'some_value' });
    await expect(obj.$git.log()).resolves.toHaveLength(0);
  });
  test('after save', async () => {
    const obj = await Model.create({ some_field: 'some_value' });
    const log = await obj.$git.log();

    expect(log).toHaveLength(1);
    expect(new Set(log[0].patches)).toEqual(
      new Set([
        { path: '/_id', op: 'add', value: obj._id },
        { path: '/some_field', op: 'add', value: 'some_value' },
      ])
    );
  });
  test('after update', async () => {
    const obj = await Model.create({ some_field: 'some_value' });
    obj.some_field = 'some_other_value';
    await obj.save();

    const log = await obj.$git.log();

    expect(log).toHaveLength(2);
    expect(new Set(log[0].patches)).toEqual(
      new Set([{ path: '/some_field', op: 'replace', value: 'some_other_value' }])
    );
  });
});

describe('diff', () => {
  test('check previous commit', async () => {
    const obj = await Model.create({ some_field: 'some_value' });
    obj.some_field = 'some_other_value';
    await obj.save();

    expect(new Set(await obj.$git.diff(-1))).toEqual(
      new Set([{ op: 'replace', path: '/some_field', value: 'some_other_value' }])
    );
    expect(new Set(await obj.$git.diff('HEAD^1'))).toEqual(
      new Set([{ op: 'replace', path: '/some_field', value: 'some_other_value' }])
    );
  });
  test('check a range of commits', async () => {
    const obj = await Model.create({ some_field: '1' });
    obj.some_field = '2';
    await obj.save();
    obj.some_field = '3';
    await obj.save();

    const difference = await obj.$git.diff(-2);
    expect(new Set(difference)).toEqual(new Set([{ op: 'replace', path: '/some_field', value: '3' }]));
  });
});

describe('checkout', () => {
  test('by commit id', async () => {
    const obj = await Model.create({ some_field: 'some_value' });
    obj.some_field = 'some_other_value';
    await obj.save();

    const log = await obj.$git.log();

    const checkedOut = await obj.$git.checkout(log[1]._id);
    expect(checkedOut).toMatchObject({ _id: obj._id, some_field: 'some_value' });
  });
  test('by commit id string', async () => {
    const obj = await Model.create({ some_field: 'some_value' });
    obj.some_field = 'some_other_value';
    await obj.save();

    const log = await obj.$git.log();

    const checkedOut = await obj.$git.checkout(log[1].id);
    expect(checkedOut).toMatchObject({ _id: obj._id, some_field: 'some_value' });
  });
  test('by date', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(0));
    const obj = await Model.create({ some_field: 'some_value' });
    vi.setSystemTime(new Date(1));
    obj.some_field = 'some_other_value';
    await obj.save();

    await expect(obj.$git.checkout(new Date(0))).resolves.toMatchObject({
      _id: obj._id,
      some_field: 'some_value',
    });
    await expect(obj.$git.checkout('1970-01-01T00:00:00.000Z')).resolves.toMatchObject({
      _id: obj._id,
      some_field: 'some_value',
    });

    vi.useRealTimers();
  });
  test('from snapshot', async () => {
    const Model = getModel(exampleSchema, { snapshotWindow: 2 });
    const obj = await Model.create({ some_field: '1' });
    obj.some_field = '2';
    await obj.save();
    obj.some_field = '3';
    await obj.save();

    // @ts-ignore Allow access to protected property
    const latestSnapshot = await obj.$git.model.findOne(
      {
        target: obj._id,
        snapshot: { $exists: true },
      },
      { snapshot: true },
      { sort: { _id: -1 } }
    );

    expect(latestSnapshot, 'No snapshot found').toBeDefined();
    expect(latestSnapshot!.snapshot, 'Incorrect snapshot').toEqual({ _id: obj._id, some_field: '3' });

    const checkedOut = await obj.$git.checkout(latestSnapshot!._id);
    expect(checkedOut).toMatchObject({ _id: obj._id, some_field: '3' });
  });

  test('by offset', async () => {
    const obj = await Model.create({ some_field: '1' });
    obj.some_field = '2';
    await obj.save();
    await expect(obj.$git.checkout(0)).resolves.toMatchObject({ _id: obj._id, some_field: '2' });
    await expect(obj.$git.checkout(1)).resolves.toMatchObject({ _id: obj._id, some_field: '1' });
    await expect(obj.$git.checkout('HEAD')).resolves.toMatchObject({ _id: obj._id, some_field: '2' });
    await expect(obj.$git.checkout('@')).resolves.toMatchObject({ _id: obj._id, some_field: '2' });
    await expect(obj.$git.checkout('HEAD^')).resolves.toMatchObject({ _id: obj._id, some_field: '1' });
    await expect(obj.$git.checkout('@^')).resolves.toMatchObject({ _id: obj._id, some_field: '1' });
    await expect(obj.$git.checkout('HEAD^1')).resolves.toMatchObject({ _id: obj._id, some_field: '1' });
    await expect(obj.$git.checkout('@^1')).resolves.toMatchObject({ _id: obj._id, some_field: '1' });
    await expect(obj.$git.checkout('HEAD~')).resolves.toMatchObject({ _id: obj._id, some_field: '1' });
    await expect(obj.$git.checkout('@~')).resolves.toMatchObject({ _id: obj._id, some_field: '1' });
    await expect(obj.$git.checkout('HEAD~1')).resolves.toMatchObject({ _id: obj._id, some_field: '1' });
    await expect(obj.$git.checkout('@~1')).resolves.toMatchObject({ _id: obj._id, some_field: '1' });
  });

  test('by invalid commit ref', async () => {
    const obj = await Model.create({ some_field: '1' });
    await expect(obj.$git.checkout(1)).rejects.toThrow(GitError);
    await expect(obj.$git.checkout(2)).rejects.toThrow(GitError);
    await expect(obj.$git.checkout(-1)).rejects.toThrow(GitError);
    await expect(obj.$git.checkout('HEAD^-1')).rejects.toThrow(GitError);
    await expect(obj.$git.checkout('@^-1')).rejects.toThrow(GitError);
    await expect(obj.$git.checkout('@^2')).rejects.toThrow(GitError);
    await expect(obj.$git.checkout(new Date()), 'Future date').rejects.toThrow(GitError);
    await expect(obj.$git.checkout(new Date(0)), 'Past date').rejects.toThrow(GitError);
    await expect(obj.$git.checkout('1970-01-01T00:00:00'), 'Past date').rejects.toThrow(GitError);
    await expect(obj.$git.checkout(new Types.ObjectId()), 'Invalid commit id').rejects.toThrow(GitError);
  });
});
