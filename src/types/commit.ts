import { HydratedDocument, Model, Types } from 'mongoose';
import { GitDetached, GitFromDocument } from '../git';
import { Patch, PatcherName } from './patch';

/**
 * A discrete snapshot of an objects state at a specific time
 */
export interface Commit<PatchName extends PatcherName = PatcherName> {
  /** Commit ID */
  readonly _id: Types.ObjectId;
  /** Hex version of the _id field */
  readonly id: string;
  /** Timestamp of the commit */
  readonly date: Date;
  /** The changes on the object */
  readonly patch: Patch<PatchName>;
}

/**
 * Model document methods
 *
 * Accessible using Document.<instance_name>()
 */
export interface CommitableInstanceMethods<_TargetType> {}

/**
 * Model document properties
 *
 * Accessible using Document.<virtual_name>
 */
export interface CommitableVirtualProperties<TargetDocType> {
  $git: GitFromDocument<TargetDocType, PatcherName>;
}

/**
 * Static model methods
 *
 * Accessible using Model.<method_name>()
 */
export interface CommitableStatics<TargetDocType> {
  $git(): GitDetached<TargetDocType, PatcherName>;
}

/** Extend the supplied model with the relevant commit related extensions */
export type CommittableModel<M = unknown> =
  M extends Model<
    infer TRawDocType,
    infer TQueryHelpers,
    infer TInstanceMethods,
    infer TVirtuals,
    infer _THydratedDocumentType,
    infer TSchema
  >
    ? Model<
        TRawDocType,
        TQueryHelpers,
        TInstanceMethods & CommitableInstanceMethods<TRawDocType>,
        TVirtuals & CommitableVirtualProperties<TRawDocType>,
        HydratedDocument<
          TRawDocType,
          TVirtuals &
            CommitableVirtualProperties<TRawDocType> &
            TInstanceMethods &
            CommitableInstanceMethods<TRawDocType>,
          TQueryHelpers
        >,
        TSchema
      > &
        CommitableStatics<TRawDocType>
    : Model<M, {}, CommitableInstanceMethods<unknown>, CommitableVirtualProperties<unknown>> &
        CommitableStatics<unknown>;

export type CommittableDocument<TargetType> = HydratedDocument<
  TargetType,
  CommitableVirtualProperties<TargetType> & CommitableInstanceMethods<TargetType>
>;
