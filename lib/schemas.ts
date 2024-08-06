import { Model, Schema } from 'mongoose';
import { type Operation } from 'rfc6902';
import { type Commit } from './types';

export interface DBCommit<Snapshot extends object = object, Target = never> extends Commit {
  readonly target: Target;
  readonly snapshot: Snapshot;
  readonly isRoot: boolean;
}

export type DBCommitModel<T extends object = object> = Model<DBCommit<T>>;

const ops = ['add', 'remove', 'replace', 'move', 'copy', 'test', '_get'] as const;
const operationSchema = new Schema<Operation>(
  {
    // json-patch related fields
    path: { type: String, required: true },
    op: { type: String, enum: ops, required: true },
    value: { type: Schema.Types.Mixed },
    from: { type: String },
  },
  { _id: false, versionKey: false }
);

export const CommitSchema = new Schema<DBCommit>(
  {
    date: { type: Date, default: () => new Date(), immutable: true },
    target: { type: Schema.Types.Mixed, required: true, immutable: true, select: false },
    patches: {
      type: [operationSchema],
      required: true,
      immutable: true,
      validate: [(value: Operation[]) => !!value.length, 'No Empty'],
    },
    isRoot: { type: Boolean, immutable: true },
    // Snapshot represents the state of the object AFTER this commit has been applied
    snapshot: { type: Schema.Types.Mixed, immutable: true, select: false },
  },
  { versionKey: false }
).index({ target: 1, date: 1 }, { unique: true });
