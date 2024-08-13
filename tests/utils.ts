import mongoose, { HydratedDocument, InferSchemaType, Model, ObtainSchemaGeneric, Schema } from 'mongoose';
import { ContextualGitConfig } from '../lib/config';
import { committable, git } from '../lib/plugin';
import { CommittableModel } from '../lib/types';

export const exampleSchema = new Schema(
  {
    some_field: String,
  },
  { versionKey: false }
);

export type ExampleSchemaType = typeof exampleSchema;

export type SchemaToCommittableModel<TSchema extends Schema> = CommittableModel<
  Model<
    InferSchemaType<TSchema>,
    ObtainSchemaGeneric<TSchema, 'TQueryHelpers'>,
    ObtainSchemaGeneric<TSchema, 'TInstanceMethods'>,
    ObtainSchemaGeneric<TSchema, 'TVirtuals'>,
    HydratedDocument<
      InferSchemaType<TSchema>,
      ObtainSchemaGeneric<TSchema, 'TVirtuals'> & ObtainSchemaGeneric<TSchema, 'TInstanceMethods'>,
      ObtainSchemaGeneric<TSchema, 'TQueryHelpers'>
    >,
    TSchema
  > &
    ObtainSchemaGeneric<TSchema, 'TStaticMethods'>
>;

export function getModel(): SchemaToCommittableModel<ExampleSchemaType>;
export function getModel(config?: Partial<ContextualGitConfig>): SchemaToCommittableModel<ExampleSchemaType>;
export function getModel<TSchema extends Schema>(schema: TSchema): SchemaToCommittableModel<TSchema>;
export function getModel<TSchema extends Schema = ExampleSchemaType>(
  schema?: TSchema | null,
  config?: Partial<ContextualGitConfig>
): SchemaToCommittableModel<TSchema>;
export function getModel<TSchema extends Schema = ExampleSchemaType>(
  schema?: TSchema | null,
  config?: Partial<ContextualGitConfig>
): SchemaToCommittableModel<TSchema> {
  if (!schema || !(schema instanceof Schema)) {
    [schema, config] = [config as never, (schema ?? undefined) as never];
  }
  if (!schema) schema = exampleSchema as TSchema;
  const postSchema = schema.clone().plugin(git, config);
  return committable(mongoose.model('test', postSchema, 'test', { overwriteModels: true }));
}
