import mongoose, { Schema } from 'mongoose';
import { beforeEach, describe, test } from 'vitest';
import { GitError } from '../lib/errors';
import { committable, git } from '../lib/plugin';
import { exampleSchema, ExampleSchemaType, getModel, SchemaToCommittableModel } from './utils';
import './withDB';

declare module 'vitest' {
  export interface TestContext {
    Model: SchemaToCommittableModel<ExampleSchemaType>;
  }
}

beforeEach(ctx => {
  const Model = getModel({ patcher: 'json-patch' });
  const globalGit = Model.$git();

  ctx.Model = Model;

  return () => {
    mongoose.deleteModel(Model.modelName).deleteModel(globalGit._model.modelName);
  };
});

describe.concurrent('committable', () => {
  test('validate model is actually ours', async ({ expect }) => {
    const postSchema = exampleSchema.clone();
    expect(() => committable(mongoose.model('invalid', postSchema))).toThrow(GitError);

    const postSchemaWithPlugin = exampleSchema.clone().plugin(git);
    expect(() => committable(mongoose.model('invalid', postSchemaWithPlugin))).not.toThrow(GitError);
  });
});

describe.concurrent('mongoose.plugin(git)', () => {
  test('creates correct collection on default', async ({ expect, Model }) => {
    const a = await Model.create({ some_field: 'some_value' });
    expect(a.$git._model.collection.collectionName).toEqual(`${Model.collection.collectionName}.git`);
  });
  test('creates correct collection with custom suffix', async ({ expect }) => {
    const Model = getModel(exampleSchema, { collectionSuffix: '-suffix' });
    const a = await Model.create({ some_field: 'some_value' });
    expect(a.$git._model.collection.collectionName).toEqual(`${Model.collection.collectionName}-suffix`);
    mongoose.deleteModel(`${Model.collection.collectionName}`).deleteModel(`${Model.collection.collectionName}-suffix`);
  });
  test('creates correct collection with custom collection name', async ({ expect }) => {
    const Model = getModel(exampleSchema, { collectionName: 'custom_collection' });
    const a = await Model.create({ some_field: 'some_value' });
    expect(a.$git._model.collection.collectionName).toEqual('custom_collection');
    mongoose.deleteModel(`${Model.collection.collectionName}`).deleteModel('custom_collection');
  });
  test('creates correct collection with custom collection name and redundant suffix', async ({ expect }) => {
    const Model = getModel(exampleSchema, { collectionName: 'some_collection', collectionSuffix: 'some_suffix' });
    const a = await Model.create({ some_field: 'some_value' });
    expect(a.$git._model.collection.collectionName).toEqual('some_collection');
    mongoose.deleteModel(`${Model.collection.collectionName}`).deleteModel('some_collection');
  });
});

describe.concurrent('document', () => {
  test('.save()', async ({ expect, Model }) => {
    // Create
    const obj = await Model.create({ some_field: 'some_value' });
    await expect(obj.$git.log()).resolves.toHaveLength(1);
    // Update
    obj.some_field = 'some_other_value';
    await obj.save();
    await expect(obj.$git.log()).resolves.toHaveLength(2);
  });
});

describe.concurrent('Model', () => {
  test('.create', async ({ expect, Model }) => {
    const obj = await Model.create({ some_field: 'some_value' });
    expect(obj.toObject()).toMatchObject({ some_field: 'some_value' });
    await expect(obj.$git.log()).resolves.toHaveLength(1);
  });
  test('new', async ({ expect, Model }) => {
    // Create
    const obj = new Model({ some_field: 'some_value' });
    await expect(obj.$git.log()).resolves.toHaveLength(0);
    // Then save
    await obj.save();
    await expect(obj.$git.log()).resolves.toHaveLength(1);
  });
  describe('.updateOne', () => {
    test('existing doc', async ({ expect, Model }) => {
      const a = await Model.create({ some_field: 'target' });
      const b = await Model.create({ some_field: 'target' });
      const c = await Model.create({ some_field: 'non_target' });
      await Model.updateOne({ some_field: 'target' }, { some_field: 'new_val' });

      // We only update the first match
      await expect(a.$git.log()).resolves.toHaveLength(2);
      // Second match should be unaffected
      await expect(b.$git.log()).resolves.toHaveLength(1);
      // Non-matching doc should be unaffected
      await expect(c.$git.log()).resolves.toHaveLength(1);
    });
    test('non existing doc', async ({ expect, Model }) => {
      const c = await Model.create({ some_field: 'non_target' });
      await Model.updateOne({ some_field: 'target' }, { some_field: 'new_val' });

      // Non-matching doc should be unaffected
      await expect(c.$git.log()).resolves.toHaveLength(1);
    });
    test('upsert', async ({ expect, Model }) => {
      const a = await Model.create({ some_field: 'non_target' });
      const res = await Model.updateOne({ some_field: 'target' }, { some_field: 'new_val' }, { upsert: true });

      // Non-matching doc should be unaffected
      await expect(a.$git.log()).resolves.toHaveLength(1);

      // Validate upserted document has its commits
      const b = await Model.findById(res.upsertedId).orFail();
      const bLog = await b.$git.log();
      expect(bLog).toHaveLength(1);
      expect(bLog[0].patch).toMatchObject({
        type: 'json-patch',
        ops: [{ op: 'replace', path: '', value: { _id: b._id, some_field: 'new_val' } }],
      });
    });
  });
  describe('.updateMany', () => {
    test('existing doc', async ({ expect, Model }) => {
      const a = await Model.create({ some_field: 'target' });
      const b = await Model.create({ some_field: 'target' });
      const c = await Model.create({ some_field: 'non_target' });
      await Model.updateMany({ some_field: 'target' }, { some_field: 'new_val' });

      // Matched documents should have new log entry
      await expect(a.$git.log()).resolves.toHaveLength(2);
      await expect(b.$git.log()).resolves.toHaveLength(2);
      // Non-matching doc should be unaffected
      await expect(c.$git.log()).resolves.toHaveLength(1);
    });
    test('upsert', async ({ expect, Model }) => {
      const a = await Model.create({ some_field: 'non_target' });
      const { upsertedId } = await Model.updateMany(
        { some_field: 'target' },
        { some_field: 'new_val' },
        { upsert: true }
      );

      await expect(a.$git.log()).resolves.toHaveLength(1);

      const b = await Model.findById(upsertedId).orFail();
      const bLog = await b.$git.log();
      expect(bLog).toHaveLength(1);
      expect(bLog[0].patch).toMatchObject({
        type: 'json-patch',
        ops: [{ op: 'replace', path: '', value: { _id: b._id, some_field: 'new_val' } }],
      });
    });
  });
  describe('.deleteOne', () => {
    test('existing doc', async ({ expect, Model }) => {
      const a = await Model.create({ some_field: 'target' });
      const b = await Model.create({ some_field: 'target' });
      const c = await Model.create({ some_field: 'non_target' });
      await Model.deleteOne({ some_field: 'target' });

      // We only update the first match
      await expect(a.$git.log()).resolves.toHaveLength(2);
      // Second match should be unaffected
      await expect(b.$git.log()).resolves.toHaveLength(1);
      // Non-matching doc should be unaffected
      await expect(c.$git.log()).resolves.toHaveLength(1);
    });
    test('non existing doc', async ({ expect, Model }) => {
      const c = await Model.create({ some_field: 'non_target' });
      await Model.deleteOne({ some_field: 'target' });

      // Non-matching doc should be unaffected
      await expect(c.$git.log()).resolves.toHaveLength(1);
    });
  });
  describe('.deleteMany', () => {
    test('existing doc', async ({ expect, Model }) => {
      const a = await Model.create({ some_field: 'target' });
      const b = await Model.create({ some_field: 'target' });
      const c = await Model.create({ some_field: 'non_target' });
      await Model.deleteMany({ some_field: 'target' });

      // Matched documents should have new log entry
      await expect(a.$git.log()).resolves.toHaveLength(2);
      await expect(b.$git.log()).resolves.toHaveLength(2);
      // Non-matching doc should be unaffected
      await expect(c.$git.log()).resolves.toHaveLength(1);
    });
  });
  describe('.findOneAndUpdate', () => {
    test('existing doc', async ({ expect, Model }) => {
      const a = await Model.create({ some_field: 'target' });
      const b = await Model.create({ some_field: 'target' });
      const c = await Model.create({ some_field: 'non_target' });
      await Model.findOneAndUpdate({ some_field: 'target' }, { some_field: 'new_val' });

      // We only update the first match
      await expect(a.$git.log()).resolves.toHaveLength(2);
      // Second match should be unaffected
      await expect(b.$git.log()).resolves.toHaveLength(1);
      // Non-matching doc should be unaffected
      await expect(c.$git.log()).resolves.toHaveLength(1);
    });
    test('upsert', async ({ expect, Model }) => {
      const a = await Model.create({ some_field: 'non_target' });
      const b = await Model.findOneAndUpdate(
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
    test('upsert without new', async ({ expect, Model }) => {
      await expect(
        Model.findOneAndUpdate({ some_field: 'target' }, { some_field: 'new_val' }, { upsert: true })
      ).rejects.toThrow(GitError);
    });
    test('without _id', async ({ expect, Model }) => {
      await Model.create({ some_field: 'target' });
      await expect(
        Model.findOneAndUpdate({ some_field: 'target' }, { some_field: 'new_val' }, { projection: '-_id' })
      ).rejects.toThrow(GitError);
      await expect(
        Model.findOneAndUpdate({ some_field: 'target' }, { some_field: 'new_val' }, { projection: { _id: 0 } })
      ).rejects.toThrow(GitError);
      await expect(
        Model.findOneAndUpdate({ some_field: 'target' }, { some_field: 'new_val' }, { projection: { _id: false } })
      ).rejects.toThrow(GitError);
    });
  });
  describe('.findOneAndDelete', () => {
    test('existing doc', async ({ expect, Model }) => {
      const a = await Model.create({ some_field: 'target' });
      const b = await Model.create({ some_field: 'target' });
      const c = await Model.create({ some_field: 'non_target' });
      await Model.findOneAndDelete({ some_field: 'target' });

      // We only update the first match
      await expect(a.$git.log()).resolves.toHaveLength(2);
      // Second match should be unaffected
      await expect(b.$git.log()).resolves.toHaveLength(1);
      // Non-matching doc should be unaffected
      await expect(c.$git.log()).resolves.toHaveLength(1);
    });
    test('non existing doc', async ({ expect, Model }) => {
      const c = await Model.create({ some_field: 'non_target' });
      await Model.findOneAndDelete({ some_field: 'target' });

      // Non-matching doc should be unaffected
      await expect(c.$git.log()).resolves.toHaveLength(1);
    });
  });
  describe('.findOneAndReplace', () => {
    test('existing doc', async ({ expect }) => {
      const Model = getModel(
        new Schema(
          {
            some_field: String,
            some_other_field: String,
          },
          { versionKey: false }
        )
      );
      const a = await Model.create({ some_field: 'target', some_other_field: 'test' });
      const b = await Model.create({ some_field: 'target' });
      const c = await Model.create({ some_field: 'non_target' });
      await Model.findOneAndReplace({ some_field: 'target' }, { some_field: 'new_val' });

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
      mongoose.deleteModel(Model.modelName).deleteModel(Model.$git()._model.modelName);
    });
    test('upsert', async ({ expect, Model }) => {
      const a = await Model.create({ some_field: 'non_target' });
      const b = await Model.findOneAndReplace(
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
    test('upsert without new', async ({ expect, Model }) => {
      await expect(
        Model.findOneAndReplace({ some_field: 'target' }, { some_field: 'new_val' }, { upsert: true })
      ).rejects.toThrow(GitError);
    });
    test('without _id', async ({ expect, Model }) => {
      await Model.create({ some_field: 'target' });
      await expect(
        Model.findOneAndReplace({ some_field: 'target' }, { some_field: 'new_val' }, { projection: '-_id' })
      ).rejects.toThrow(GitError);
      await expect(
        Model.findOneAndReplace({ some_field: 'target' }, { some_field: 'new_val' }, { projection: { _id: 0 } })
      ).rejects.toThrow(GitError);
      await expect(
        Model.findOneAndReplace({ some_field: 'target' }, { some_field: 'new_val' }, { projection: { _id: false } })
      ).rejects.toThrow(GitError);
    });
  });
});
