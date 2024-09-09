import mongoose from 'mongoose';
import { beforeEach, describe, test } from 'vitest';
import { ExampleSchemaType, getModel, SchemaToCommittableModel } from '../../tests/utils';
import '../../tests/withDB';
import { GitError } from '../errors';

declare module 'vitest' {
  export interface TestContext {
    Model: SchemaToCommittableModel<ExampleSchemaType>;
  }
}

beforeEach(ctx => {
  const Model = getModel({ patcher: 'json-patch' });
  const globalGit = Model.$git();

  ctx.Model = Model;

  return () => {
    mongoose.deleteModel(Model.modelName).deleteModel(globalGit._model.modelName);
  };
});

describe.concurrent('checkout', () => {
  test('throws error', async ({ Model, expect }) => {
    await expect(Model.$git().checkout()).rejects.toThrow(GitError);
  });
});

describe.concurrent('diff', () => {
  test('throws error', async ({ Model, expect }) => {
    await expect(Model.$git().diff()).rejects.toThrow(GitError);
  });
});

describe.concurrent('log', () => {
  test('throws error', async ({ Model, expect }) => {
    await expect(Model.$git().log()).rejects.toThrow(GitError);
  });
});

describe.concurrent('commit', () => {
  test('throws error', async ({ Model, expect }) => {
    // @ts-ignore Allow access to protected property
    await expect(Model.$git().commit()).rejects.toThrow(GitError);
  });
});

describe.concurrent('withRefId', () => {
  test('retains information', async ({ Model, expect }) => {
    const obj = await Model.create({ some_field: 'some_value' });
    const gitFromRefId = Model.$git().withRefId(obj._id);
    // @ts-ignore Allow access to protected property
    expect(gitFromRefId.refId).toEqual(obj._id);
    // @ts-ignore Allow access to protected property
    expect(gitFromRefId._referenceModel).toEqual(Model);
  });
});

describe.concurrent('withDocument', () => {
  test('retains information', async ({ Model, expect }) => {
    const obj = await Model.create({ some_field: 'some_value' });
    const gitFromRefId = Model.$git().withDocument(obj);
    // @ts-ignore Allow access to protected property
    expect(gitFromRefId.refId).toEqual(obj._id);
    // @ts-ignore Allow access to protected property
    expect(gitFromRefId._referenceModel).toEqual(Model);
  });
});
