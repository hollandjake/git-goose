import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll } from 'vitest';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();

  const uri = mongod.getUri();
  await mongoose.connect(uri);
});

afterEach(() => mongoose.connection.dropDatabase());

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});
