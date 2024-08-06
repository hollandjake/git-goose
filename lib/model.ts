import mongoose, { type Connection } from 'mongoose';
import { CommitSchema, type DBCommitModel } from './schemas';

const modelCache: Record<string, DBCommitModel> = {};

export interface ModelOptions {
  db?: Pick<Connection, 'model'>;
}

export function GitModel<T extends object>(
  collectionName: string,
  { db = mongoose }: ModelOptions = {}
): DBCommitModel<T> {
  if (!(collectionName in modelCache)) {
    modelCache[collectionName] = db.model(collectionName, CommitSchema, collectionName);
  }

  return modelCache[collectionName] as unknown as DBCommitModel<T>;
}

export function clearCache() {
  for (const member in modelCache) {
    delete modelCache[member];
  }
}
