import { GitGlobalConfig, Patchers } from '../config';
import { Nullable } from './index';

/**
 * Represents the transformation from one commit
 */
export interface Patch<Name extends PatcherName = PatcherName> {
  /**
   * The type of patch
   *
   * Used to indicate how to apply the patch to the object
   */
  type: Name;
  /** The operations for the patch */
  ops: PatchType<Name>;

  /**
   * Apply this patch to a target
   *
   * @param target - The target object
   *
   * @returns The result of this patch being applied to the target
   */
  apply<T>(target: Nullable<T>): Nullable<T>;
}

export type TPatchers = typeof Patchers;
export type PatcherName = keyof TPatchers;
export type GlobalPatcherName = (typeof GitGlobalConfig)['patcher'];

/**
 * @template PatchDocType - The type of the patch
 * @template DocType - The type of the object being transformed
 */
export interface Patcher<TPatchType = unknown, DocType = unknown> {
  /**
   * Create a patch by computing the differences between an existing committed and the current active
   *
   * @param committed - The previously committed document
   * @param active - The current document
   *
   * @returns A patch representing the transformation between {@link committed} and {@link active}
   */
  create(committed: Nullable<DocType>, active: Nullable<DocType>): TPatchType | Promise<TPatchType>;

  /**
   * Apply a patch to a target
   *
   * @param target - The target object
   * @param patch - The patch
   *
   * @returns The result of the patch being applied to the target
   */
  apply(target: Nullable<DocType>, patch: TPatchType): Nullable<DocType>;
}

/** The type of the given PatchMethod's Patch */
export type PatchType<Name> = Name extends PatcherName
  ? TPatchers[Name] extends Patcher<infer PatchType, infer _DocType>
    ? PatchType
    : unknown
  : unknown;
