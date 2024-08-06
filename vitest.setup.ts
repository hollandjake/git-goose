import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach } from 'vitest';
import { clearCache } from './src/model';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();

  const uri = mongod.getUri();
  await mongoose.connect(uri);
});

beforeEach(async () => {
  for (const model in mongoose.models) mongoose.deleteModel(model);
  clearCache();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongod.stop();
});
