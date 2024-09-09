import { HydratedDocument, type Model, Require_id, Schema } from 'mongoose';
import { getPatcher } from './config';
import { Commit, Nullable, Patch, PatcherName, RefId } from './types';

const PatchSchema = new Schema<Patch>(
  {
    type: { type: String, required: true },
    ops: { type: Schema.Types.Mixed, required: true },
  },
  {
    methods: {
      apply<T>(this: Patch, target: Nullable<T>) {
        return getPatcher(this.type).apply(target, this.ops);
      },
    },
  }
);

export interface DBCommit<TargetDocType = unknown, PatchName extends PatcherName = PatcherName>
  extends Commit<PatchName> {
  readonly refId: RefId;
  readonly snapshot: Nullable<Require_id<TargetDocType>>;
}

export const DBCommitSchema = new Schema<DBCommit>(
  {
    date: { type: Date, default: () => new Date(), immutable: true },
    refId: { type: Schema.Types.Mixed, required: true, immutable: true, select: false },
    patch: { type: PatchSchema, required: true },
    // Snapshot represents the state of the object AFTER this commit has been applied
    snapshot: { type: Schema.Types.Mixed, immutable: true, select: false },
  },
  { versionKey: false, toObject: { virtuals: ['id'] } }
);

export type DBCommitModel<TargetDocType = unknown> = Model<DBCommit<TargetDocType>>;
export type DBCommitDocument<TargetDocType = unknown, PatchName extends PatcherName = PatcherName> = HydratedDocument<
  DBCommit<TargetDocType, PatchName>
>;
