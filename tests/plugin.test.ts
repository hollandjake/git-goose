import mongoose, { Schema } from 'mongoose';
import { describe, expect, test } from 'vitest';
import { GitError } from '../lib/errors';
import { committable, git } from '../lib/plugin';
import { exampleSchema, getModel } from './utils';

describe('committable', () => {
  test('validate model is actually ours', async () => {
    const postSchema = exampleSchema.clone();
    expect(() => committable(mongoose.model('invalid', postSchema))).toThrow(GitError);

    const postSchemaWithPlugin = exampleSchema.clone().plugin(git);
    expect(() => committable(mongoose.model('invalid', postSchemaWithPlugin))).not.toThrow(GitError);
  });
});

describe('mongoose.plugin(git)', () => {
  test('creates correct collection on default', async () => {
    const Model = getModel();
    const a = await Model.create({ some_field: 'some_value' });
    // @ts-ignore Allow access to protected property
    expect(a.$git.model.collection.collectionName).toEqual('test.git');
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

describe('document', () => {
  const model = getModel();
  test('.save()', async () => {
    // Create
    const obj = await model.create({ some_field: 'some_value' });
    await expect(obj.$git.log()).resolves.toHaveLength(1);
    // Update
    obj.some_field = 'some_other_value';
    await obj.save();
    await expect(obj.$git.log()).resolves.toHaveLength(2);
  });
});

describe('Model', () => {
  const model = getModel();
  test('.create', async () => {
    const obj = await model.create({ some_field: 'some_value' });
    expect(obj.toObject()).toMatchObject({ some_field: 'some_value' });
    await expect(obj.$git.log()).resolves.toHaveLength(1);
  });
  test('new', async () => {
    // Create
    const obj = new model({ some_field: 'some_value' });
    await expect(obj.$git.log()).resolves.toHaveLength(0);
    // Then save
    await obj.save();
    await expect(obj.$git.log()).resolves.toHaveLength(1);
  });
  describe('.updateOne', () => {
    test('existing doc', async () => {
      const a = await model.create({ some_field: 'target' });
      const b = await model.create({ some_field: 'target' });
      const c = await model.create({ some_field: 'non_target' });
      await model.updateOne({ some_field: 'target' }, { some_field: 'new_val' });

      // We only update the first match
      await expect(a.$git.log()).resolves.toHaveLength(2);
      // Second match should be unaffected
      await expect(b.$git.log()).resolves.toHaveLength(1);
      // Non-matching doc should be unaffected
      await expect(c.$git.log()).resolves.toHaveLength(1);
    });
    test('non existing doc', async () => {
      const c = await model.create({ some_field: 'non_target' });
      await model.updateOne({ some_field: 'target' }, { some_field: 'new_val' });

      // Non-matching doc should be unaffected
      await expect(c.$git.log()).resolves.toHaveLength(1);
    });
    test('upsert', async () => {
      const a = await model.create({ some_field: 'non_target' });
      const res = await model.updateOne({ some_field: 'target' }, { some_field: 'new_val' }, { upsert: true });

      // Non-matching doc should be unaffected
      await expect(a.$git.log()).resolves.toHaveLength(1);

      // Validate upserted document has its commits
      const b = await model.findById(res.upsertedId).orFail();
      const bLog = await b.$git.log();
      expect(bLog).toHaveLength(1);
      expect(bLog[0].patch).toMatchObject({
        type: 'json-patch',
        ops: [{ op: 'replace', path: '', value: { _id: b._id, some_field: 'new_val' } }],
      });
    });
  });
  describe('.updateMany', () => {
    test('existing doc', async () => {
      const a = await model.create({ some_field: 'target' });
      const b = await model.create({ some_field: 'target' });
      const c = await model.create({ some_field: 'non_target' });
      await model.updateMany({ some_field: 'target' }, { some_field: 'new_val' });

      // Matched documents should have new log entry
      await expect(a.$git.log()).resolves.toHaveLength(2);
      await expect(b.$git.log()).resolves.toHaveLength(2);
      // Non-matching doc should be unaffected
      await expect(c.$git.log()).resolves.toHaveLength(1);
    });
    test('upsert', async () => {
      const a = await model.create({ some_field: 'non_target' });
      const { upsertedId } = await model.updateMany(
        { some_field: 'target' },
        { some_field: 'new_val' },
        { upsert: true }
      );

      await expect(a.$git.log()).resolves.toHaveLength(1);

      const b = await model.findById(upsertedId).orFail();
      const bLog = await b.$git.log();
      expect(bLog).toHaveLength(1);
      expect(bLog[0].patch).toMatchObject({
        type: 'json-patch',
        ops: [{ op: 'replace', path: '', value: { _id: b._id, some_field: 'new_val' } }],
      });
    });
  });
  describe('.deleteOne', () => {
    test('existing doc', async () => {
      const a = await model.create({ some_field: 'target' });
      const b = await model.create({ some_field: 'target' });
      const c = await model.create({ some_field: 'non_target' });
      await model.deleteOne({ some_field: 'target' });

      // We only update the first match
      await expect(a.$git.log()).resolves.toHaveLength(2);
      // Second match should be unaffected
      await expect(b.$git.log()).resolves.toHaveLength(1);
      // Non-matching doc should be unaffected
      await expect(c.$git.log()).resolves.toHaveLength(1);
    });
    test('non existing doc', async () => {
      const c = await model.create({ some_field: 'non_target' });
      await model.deleteOne({ some_field: 'target' });

      // Non-matching doc should be unaffected
      await expect(c.$git.log()).resolves.toHaveLength(1);
    });
  });
  describe('.deleteMany', () => {
    test('existing doc', async () => {
      const a = await model.create({ some_field: 'target' });
      const b = await model.create({ some_field: 'target' });
      const c = await model.create({ some_field: 'non_target' });
      await model.deleteMany({ some_field: 'target' });

      // Matched documents should have new log entry
      await expect(a.$git.log()).resolves.toHaveLength(2);
      await expect(b.$git.log()).resolves.toHaveLength(2);
      // Non-matching doc should be unaffected
      await expect(c.$git.log()).resolves.toHaveLength(1);
    });
  });
  describe('.findOneAndUpdate', () => {
    test('existing doc', async () => {
      const a = await model.create({ some_field: 'target' });
      const b = await model.create({ some_field: 'target' });
      const c = await model.create({ some_field: 'non_target' });
      await model.findOneAndUpdate({ some_field: 'target' }, { some_field: 'new_val' });

      // We only update the first match
      await expect(a.$git.log()).resolves.toHaveLength(2);
      // Second match should be unaffected
      await expect(b.$git.log()).resolves.toHaveLength(1);
      // Non-matching doc should be unaffected
      await expect(c.$git.log()).resolves.toHaveLength(1);
    });
    test('upsert', async () => {
      const a = await model.create({ some_field: 'non_target' });
      const b = await model.findOneAndUpdate(
        { some_field: 'target' },
        { some_field: 'new_val' },
        { upsert: true, new: true }
      );

      // Non-matching doc should be unaffected
      await expect(a.$git.log()).resolves.toHaveLength(1);

      // Validate upserted document has its commits
      const bLog = await b.$git.log();
      expect(bLog).toHaveLength(1);
      expect(bLog[0].patch).toMatchObject({
        type: 'json-patch',
        ops: [{ op: 'replace', path: '', value: { _id: b._id, some_field: 'new_val' } }],
      });
    });
    test('upsert without new', async () => {
      await expect(
        model.findOneAndUpdate({ some_field: 'target' }, { some_field: 'new_val' }, { upsert: true })
      ).rejects.toThrow(GitError);
    });
    test('without _id', async () => {
      await model.create({ some_field: 'target' });
      await expect(
        model.findOneAndUpdate({ some_field: 'target' }, { some_field: 'new_val' }, { projection: '-_id' })
      ).rejects.toThrow(GitError);
      await expect(
        model.findOneAndUpdate({ some_field: 'target' }, { some_field: 'new_val' }, { projection: { _id: 0 } })
      ).rejects.toThrow(GitError);
      await expect(
        model.findOneAndUpdate({ some_field: 'target' }, { some_field: 'new_val' }, { projection: { _id: false } })
      ).rejects.toThrow(GitError);
    });
  });
  describe('.findOneAndDelete', () => {
    test('existing doc', async () => {
      const a = await model.create({ some_field: 'target' });
      const b = await model.create({ some_field: 'target' });
      const c = await model.create({ some_field: 'non_target' });
      await model.findOneAndDelete({ some_field: 'target' });

      // We only update the first match
      await expect(a.$git.log()).resolves.toHaveLength(2);
      // Second match should be unaffected
      await expect(b.$git.log()).resolves.toHaveLength(1);
      // Non-matching doc should be unaffected
      await expect(c.$git.log()).resolves.toHaveLength(1);
    });
    test('non existing doc', async () => {
      const c = await model.create({ some_field: 'non_target' });
      await model.findOneAndDelete({ some_field: 'target' });

      // Non-matching doc should be unaffected
      await expect(c.$git.log()).resolves.toHaveLength(1);
    });
  });
  describe('.findOneAndReplace', () => {
    test('existing doc', async () => {
      const model = getModel(
        new Schema(
          {
            some_field: String,
            some_other_field: String,
          },
          { versionKey: false }
        )
      );
      const a = await model.create({ some_field: 'target', some_other_field: 'test' });
      const b = await model.create({ some_field: 'target' });
      const c = await model.create({ some_field: 'non_target' });
      await model.findOneAndReplace({ some_field: 'target' }, { some_field: 'new_val' });

      // We only update the first match
      const aLog = await a.$git.log();
      expect(aLog).toHaveLength(2);
      expect(aLog[0].patch).toMatchObject({
        type: 'json-patch',
        ops: [
          {
            op: 'remove',
            path: '/some_other_field',
          },
          {
            op: 'replace',
            path: '/some_field',
            value: 'new_val',
          },
        ],
      });

      // Second match should be unaffected
      await expect(b.$git.log()).resolves.toHaveLength(1);
      // Non-matching doc should be unaffected
      await expect(c.$git.log()).resolves.toHaveLength(1);
    });
    test('upsert', async () => {
      const a = await model.create({ some_field: 'non_target' });
      const b = await model.findOneAndReplace(
        { some_field: 'target' },
        { some_field: 'new_val' },
        { upsert: true, new: true }
      );

      // Non-matching doc should be unaffected
      await expect(a.$git.log()).resolves.toHaveLength(1);

      // Validate upserted document has its commits
      const bLog = await b.$git.log();
      expect(bLog).toHaveLength(1);
      expect(bLog[0].patch).toMatchObject({
        type: 'json-patch',
        ops: [{ op: 'replace', path: '', value: { _id: b._id, some_field: 'new_val' } }],
      });
    });
    test('upsert without new', async () => {
      await expect(
        model.findOneAndReplace({ some_field: 'target' }, { some_field: 'new_val' }, { upsert: true })
      ).rejects.toThrow(GitError);
    });
    test('without _id', async () => {
      await model.create({ some_field: 'target' });
      await expect(
        model.findOneAndReplace({ some_field: 'target' }, { some_field: 'new_val' }, { projection: '-_id' })
      ).rejects.toThrow(GitError);
      await expect(
        model.findOneAndReplace({ some_field: 'target' }, { some_field: 'new_val' }, { projection: { _id: 0 } })
      ).rejects.toThrow(GitError);
      await expect(
        model.findOneAndReplace({ some_field: 'target' }, { some_field: 'new_val' }, { projection: { _id: false } })
      ).rejects.toThrow(GitError);
    });
  });
});
