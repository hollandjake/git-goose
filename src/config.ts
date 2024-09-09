import { type Connection } from 'mongoose';
import { GitError } from './errors';
import { mini_rfc6902, rfc6902 } from './patchers';
import { Patcher, PatcherName, PatchType } from './types';

export interface ModelOptions {
  /** Mongoose connection to use for queries */
  connection?: Connection;
  /** Collection name to use for all commits */
  collectionName?: string;
}

export interface GitConfig<TPatcherName extends PatcherName> extends ModelOptions {
  /** Suffix for the commit models collection (unless [collectionName]{@link ModelOptions#collectionName} is defined)*/
  collectionSuffix: string;
  /** The method for creating patches when saving updates */
  patcher: TPatcherName;
}

export interface ContextualGitConfig<TPatcherName extends PatcherName = PatcherName> extends GitConfig<TPatcherName> {
  /** How many commits to keep before aggregating them into a snapshot */
  snapshotWindow: number;
}

export const GitGlobalConfig: ContextualGitConfig = {
  collectionSuffix: '.git',
  snapshotWindow: 100,
  patcher: 'mini-json-patch',
};

export const RequiredConfig: (keyof ContextualGitConfig)[] = ['collectionSuffix', 'patcher', 'snapshotWindow'];

export const Patchers = {
  'json-patch': <Patcher<ReturnType<typeof rfc6902.create>>>{
    create: rfc6902.create,
    apply: rfc6902.apply,
  },
  'mini-json-patch': <Patcher<ReturnType<typeof mini_rfc6902.create>>>{
    create: mini_rfc6902.create,
    apply: mini_rfc6902.apply,
  },
} satisfies Record<string, Patcher>;

/**
 * Fetch the appropriate patcher for a given patcher name
 *
 * @param name
 * @private
 */
export function getPatcher<Name extends PatcherName>(name: Name): Patcher<PatchType<Name>> {
  const patchMethod = Patchers[name];
  if (!patchMethod) throw new GitError(`PatchMethod not found '${name}'`);

  if (typeof patchMethod.create !== 'function') {
    throw new GitError(`Invalid PatchMethod '${name}', invalid 'create' function`);
  }

  if (typeof patchMethod.apply !== 'function') {
    throw new GitError(`Invalid PatchMethod '${name}', invalid 'apply' function`);
  }

  return patchMethod as never;
}
