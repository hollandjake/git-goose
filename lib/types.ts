import assert from 'assert';
import { Document, HydratedDocument, Model, Types } from 'mongoose';
import { Operation } from 'rfc6902';
import { Git } from './git';

/**
 * Type caster for
 * @param model
 */
export function committable<M extends Model<object>>(model: M): CommittableModel<M> {
  assert('$git' in model.schema.virtuals);
  return model as unknown as CommittableModel<M>;
}

export interface Commit {
  /** Commit ID */
  readonly _id: Types.ObjectId;
  /** Hex version of the _id field */
  readonly id: string;
  /** Timestamp of the commit */
  readonly date: Date;
  /** List of the changes to be made to the object */
  readonly patches: ReadonlyArray<Operation>;
}

export class Diff extends Array<Commit> {
  ops() {
    return this.sort((a, b) => a._id.toString().localeCompare(b._id.toString())).flatMap(d => d.patches);
  }
}

export type CommittableModel<M = unknown> =
  M extends Model<
    infer TRawDocType extends object,
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
    : Model<M, {}, CommitableInstanceMethods<object>, CommitableVirtualProperties<object>> & CommitableStatics<object>;

export interface CommitableInstanceMethods<_T extends object> {}

export interface CommitableVirtualProperties<T extends object> {
  $git: Git<T>;
}

export interface CommitableStatics<_T extends object> {}

export interface CommittableDocument<T extends object>
  extends Document<T>,
    CommitableInstanceMethods<T>,
    CommitableVirtualProperties<T> {}
