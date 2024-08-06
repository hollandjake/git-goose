import mongoose, { Schema } from 'mongoose';
import { GitOptions } from '../src/git';
import { git } from '../src/plugin';
import { committable } from '../src/types';

export const exampleSchema = new Schema(
  {
    some_field: String,
  },
  { versionKey: false }
);

export function getModel(schema = exampleSchema, opts?: GitOptions) {
  const postSchema = schema.clone().plugin(git, opts);
  return committable(mongoose.model('test', postSchema, 'test', { overwriteModels: true }));
}
