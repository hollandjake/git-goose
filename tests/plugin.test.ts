/* eslint @typescript-eslint/ban-ts-comment: 0 */

import { describe, expect, test } from 'vitest';
import { exampleSchema, getModel } from './utils';

describe('mongoose.plugin(git)', () => {
  test('creates correct collection on default', async () => {
    const Model = getModel();
    const a = await Model.create({ some_field: 'some_value' });
    // @ts-ignore Allow access to protected property
    expect(a.$git.model.collection.collectionName).toEqual('test_history');
  });
  test('creates correct collection with custom suffix', async () => {
    const Model = getModel(exampleSchema, { collectionSuffix: '-suffix' });
    const a = await Model.create({ some_field: 'some_value' });
    // @ts-ignore Allow access to protected property
    expect(a.$git.model.collection.collectionName).toEqual('test-suffix');
  });
  test('creates correct collection with custom collection name', async () => {
    const Model = getModel(exampleSchema, { collectionName: 'some_collection' });
    const a = await Model.create({ some_field: 'some_value' });
    // @ts-ignore Allow access to protected property
    expect(a.$git.model.collection.collectionName).toEqual('some_collection');
  });
  test('creates correct collection with custom collection name and redundant suffix', async () => {
    const Model = getModel(exampleSchema, { collectionName: 'some_collection', collectionSuffix: 'some_suffix' });
    const a = await Model.create({ some_field: 'some_value' });
    // @ts-ignore Allow access to protected property
    expect(a.$git.model.collection.collectionName).toEqual('some_collection');
  });
});

describe('save', () => {
  describe('when new', () => {
    test('from constructor', async () => {
      const model = getModel();
      // Create
      const obj = new model({ some_field: 'some_value' });
      await expect(obj.$git.log()).resolves.toHaveLength(0);
      // Then save
      await obj.save();
      await expect(obj.$git.log()).resolves.toHaveLength(1);
    });
    test('from create', async () => {
      const model = getModel();
      const obj = await model.create({ some_field: 'some_value' });
      expect(obj.toObject()).toMatchObject({ some_field: 'some_value' });
      await expect(obj.$git.log()).resolves.toHaveLength(1);
    });
  });
  describe('document', () => {
    test('update one field', async () => {
      const model = getModel();
      // Create
      const obj = await model.create({ some_field: 'some_value' });
      await expect(obj.$git.log()).resolves.toHaveLength(1);
      // Update
      obj.some_field = 'some_other_value';
      await obj.save();
      await expect(obj.$git.log()).resolves.toHaveLength(2);
    });
  });
});
