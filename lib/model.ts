import { type Connection } from 'mongoose';
import { CommitSchema, type DBCommitModel } from './schemas';

export interface ModelOptions {
  db: Connection;
}

export function GitModel<T extends object>(collectionName: string, { db }: ModelOptions): DBCommitModel<T> {
  const model = db.models[collectionName] ?? db.model(collectionName, CommitSchema, collectionName);

  if (model.schema.obj !== CommitSchema.obj) throw new Error('Collection is already in use');
  return model as unknown as DBCommitModel<T>;
}
