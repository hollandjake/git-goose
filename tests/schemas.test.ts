import mongoose, { Error, Types } from 'mongoose';
import { describe, expect, test } from 'vitest';
import { GitModel } from '../lib/model';

describe('schema validation', () => {
  const model = GitModel('test', { db: mongoose.connection });
  test('happy path', async () => {
    await expect(
      model.create({
        target: new Types.ObjectId(),
        patches: [{ path: '/a', op: 'add', value: 'some_val' }],
      })
    ).resolves.toBeDefined();
  });
  test('no patches', async () => {
    await expect(async () => model.create({ target: new Types.ObjectId() })).rejects.toThrow(Error.ValidationError);
  });
  test('undefined patches', async () => {
    await expect(async () =>
      model.create({
        target: new Types.ObjectId(),
        patches: undefined,
      })
    ).rejects.toThrow(Error.ValidationError);
  });
  test('null patches', async () => {
    await expect(async () =>
      model.create({
        target: new Types.ObjectId(),
        patches: null,
      })
    ).rejects.toThrow(Error.ValidationError);
  });
  test('empty patches', async () => {
    await expect(async () =>
      model.create({
        target: new Types.ObjectId(),
        patches: [],
      })
    ).rejects.toThrow(Error.ValidationError);
  });
});
