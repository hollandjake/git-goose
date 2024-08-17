import mongoose, { Schema } from 'mongoose';
import { afterAll, beforeEach, describe, test, vi } from 'vitest';
import * as config from '../lib/config';
import { GitError } from '../lib/errors';
import { GitModel } from '../lib/model';
import './withDB';

declare module 'vitest' {
  export interface TestContext {
    GitGlobalConfig: typeof config.GitGlobalConfig;
  }
}
beforeEach(async ctx => {
  const actualConfig = (await vi.importActual('../lib/config')) as typeof config;
  ctx.GitGlobalConfig = actualConfig.GitGlobalConfig;
});

const mocks = vi.hoisted(() => {
  return {
    GitGlobalConfig: vi.fn(),
  };
});

vi.mock('../lib/config', async importOriginal => {
  const mod = { ...((await importOriginal()) as object) };
  Object.defineProperty(mod, 'GitGlobalConfig', {
    get: mocks.GitGlobalConfig,
  });
  return mod;
});

beforeEach(() => {
  vi.resetAllMocks();
});
describe.concurrent('GitModel', () => {
  afterAll(() => {
    mongoose.deleteModel(/GitModel-/);
  });
  test('from global config', ({ GitGlobalConfig, expect }) => {
    mocks.GitGlobalConfig.mockReturnValue({
      ...GitGlobalConfig,
      connection: mongoose.connection,
      collectionName: 'GitModel-globalConfigCollectionName',
    });
    const model = GitModel();
    expect(model.collection.collectionName).toEqual('GitModel-globalConfigCollectionName');
  });
  test('from missing global config connection', ({ GitGlobalConfig, expect }) => {
    mocks.GitGlobalConfig.mockReturnValue({
      ...GitGlobalConfig,
      connection: undefined,
    });
    expect(() => GitModel()).toThrow(GitError);
  });
  test('from missing global config collectionName', ({ GitGlobalConfig, expect }) => {
    mocks.GitGlobalConfig.mockReturnValue({
      ...GitGlobalConfig,
      collectionName: undefined,
    });
    expect(() => GitModel()).toThrow(GitError);
  });
  test('when non-committal model already exists', ({ GitGlobalConfig, expect }) => {
    mongoose.model('GitModel-preDefinedModel', new Schema({}));
    mocks.GitGlobalConfig.mockReturnValue({
      ...GitGlobalConfig,
      collectionName: 'GitModel-preDefinedModel',
    });
    expect(() => GitModel()).toThrow(GitError);
  });
  test('from provided config', ({ GitGlobalConfig, expect }) => {
    mocks.GitGlobalConfig.mockReturnValue(GitGlobalConfig);
    const model = GitModel({ collectionName: 'GitModel-scopedCollectionName' });
    expect(model.collection.collectionName).toEqual('GitModel-scopedCollectionName');
  });
  test('when model already exists', ({ GitGlobalConfig, expect }) => {
    mocks.GitGlobalConfig.mockReturnValue({
      ...GitGlobalConfig,
      collectionName: 'GitModel-existingModel',
    });
    expect(GitModel()).toBe(GitModel());
  });
});
