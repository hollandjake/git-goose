/* eslint @typescript-eslint/ban-ts-comment: 0 */

import { describe, expect, test } from 'vitest';
import { GitError } from '../../lib/errors';
import { getModel } from '../utils';

const Model = getModel({ patcher: 'json-patch' });

describe('checkout', () => {
  test('throws error', async () => {
    await expect(Model.$git().checkout()).rejects.toThrow(GitError);
  });
});

describe('diff', () => {
  test('throws error', async () => {
    await expect(Model.$git().diff()).rejects.toThrow(GitError);
  });
});

describe('log', () => {
  test('throws error', async () => {
    await expect(Model.$git().log()).rejects.toThrow(GitError);
  });
});

describe('commit', () => {
  test('throws error', async () => {
    // @ts-ignore Allow access to protected property
    await expect(Model.$git().commit()).rejects.toThrow(GitError);
  });
});

describe('withRefId', () => {
  test('retains information', async () => {
    const obj = await Model.create({ some_field: 'some_value' });
    const gitFromRefId = Model.$git().withRefId(obj._id);
    // @ts-ignore Allow access to protected property
    expect(gitFromRefId.refId).toEqual(obj._id);
    // @ts-ignore Allow access to protected property
    expect(gitFromRefId._referenceModel).toEqual(Model);
  });
});

describe('withDocument', () => {
  test('retains information', async () => {
    const obj = await Model.create({ some_field: 'some_value' });
    const gitFromRefId = Model.$git().withDocument(obj);
    // @ts-ignore Allow access to protected property
    expect(gitFromRefId.refId).toEqual(obj._id);
    // @ts-ignore Allow access to protected property
    expect(gitFromRefId._referenceModel).toEqual(Model);
  });
});
