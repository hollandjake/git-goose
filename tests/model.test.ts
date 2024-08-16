import mongoose, { Schema } from 'mongoose';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import * as config from '../lib/config';
import { GitError } from '../lib/errors';
import { GitModel } from '../lib/model';

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
describe('GitModel', () => {
  test('from global config', ({ GitGlobalConfig }) => {
    mocks.GitGlobalConfig.mockReturnValue({
      ...GitGlobalConfig,
      connection: mongoose.connection,
      collectionName: 'globalConfigCollectionName',
    });
    const model = GitModel();
    expect(model.collection.collectionName).toEqual('globalConfigCollectionName');
  });
  test('from missing global config connection', ({ GitGlobalConfig }) => {
    mocks.GitGlobalConfig.mockReturnValue({
      ...GitGlobalConfig,
      connection: undefined,
    });
    expect(() => GitModel()).toThrow(GitError);
  });
  test('from missing global config collectionName', ({ GitGlobalConfig }) => {
    mocks.GitGlobalConfig.mockReturnValue({
      ...GitGlobalConfig,
      collectionName: undefined,
    });
    expect(() => GitModel()).toThrow(GitError);
  });
  test('when non-committal model already exists', ({ GitGlobalConfig }) => {
    mongoose.model('test', new Schema({}));
    mocks.GitGlobalConfig.mockReturnValue({
      ...GitGlobalConfig,
      collectionName: 'test',
    });
    expect(() => GitModel()).toThrow(GitError);
  });
  test('from provided config', ({ GitGlobalConfig }) => {
    mocks.GitGlobalConfig.mockReturnValue(GitGlobalConfig);
    const model = GitModel({ collectionName: 'scopedCollectionName' });
    expect(model.collection.collectionName).toEqual('scopedCollectionName');
  });
  test('when model already exists', ({ GitGlobalConfig }) => {
    mocks.GitGlobalConfig.mockReturnValue({
      ...GitGlobalConfig,
      collectionName: 'test',
    });
    expect(GitModel()).toBe(GitModel());
  });
});
