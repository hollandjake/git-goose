import { Model, Schema } from 'mongoose';
import { beforeEach, describe, expect, test } from 'vitest';
import { CommittableModel } from '../lib/types';
import { getModel } from './utils';
import './withFreshDB';

declare module 'vitest' {
  export interface TestContext {
    Model: CommittableModel<Model<any>>;
  }
}

describe('#21', () => {
  /*
   * A user may use one of the following fields by accident
   * e.g. new Schema({ model: String }) referring to a model of a vehicle
   * We can be smart about this and use the Symbolic reference, rather than the string reference
   * Unfortunately we cant prevent a user using $local as there is no Symbol for it
   */

  beforeEach(ctx => {
    const Model = getModel(
      new Schema(
        {
          model: String,
          $model: String,
          db: String,
          $db: String,
          collection: String,
          $collection: String,
        },
        { suppressReservedKeysWarning: true }
      ),
      { patcher: 'json-patch' },
      ctx.connection
    );
    const globalGit = Model.$git();

    ctx.Model = Model;

    return () => {
      ctx.connection.deleteModel(Model.modelName).deleteModel(globalGit._model.modelName);
    };
  });

  test('handles schema field default overrides', async ({ Model }) => {
    expect(() => Model.$git()).not.toThrow();
    const a = await Model.create({});
    // @ts-ignore Allow access to protected property
    expect(a.$git._referenceModel === Model).toBeTruthy();
  });
});
