import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { beforeAll } from 'vitest';

beforeAll(async () => {
  const mongod = await MongoMemoryServer.create();

  const uri = mongod.getUri();
  await mongoose.connect(uri);

  return async () => {
    await mongoose.disconnect();
    await mongod.stop();
  };
});
