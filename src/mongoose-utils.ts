import { Collection, Connection, Document, Model } from 'mongoose';
import { GitError } from './errors';

export function getModelSymbolField<T>(doc: Document, key: string): T | undefined {
  doc = Object.getPrototypeOf(doc);
  const symbols = Object.getOwnPropertySymbols(doc);
  const symbol = symbols.find(k => k.toString() === `Symbol(${key})`);
  if (!symbol) return undefined;
  return doc[symbol as never];
}

export function getModelFromDoc<T>(doc: Document<unknown, unknown, T>): Model<T> {
  // Check the cached values
  if (typeof doc.model === 'function') return doc.model();
  if (typeof doc.$model === 'function') return doc.$model();

  // Still invalid so we have to go use the Symbolic search
  const db = getModelSymbolField<Connection>(doc, 'mongoose#Model#db');
  const collection = getModelSymbolField<Collection>(doc, 'mongoose#Model#collection');
  if (!db || !collection) throw new GitError('Failed to extract model from document');
  for (const m of Object.values<Model<T>>(db.models)) {
    if (m.collection === collection) return m;
  }
  throw new GitError('Failed to extract model from document');
}
