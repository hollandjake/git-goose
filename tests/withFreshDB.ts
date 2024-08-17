import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Connection } from 'mongoose';
import 'vitest';
import { beforeEach } from 'vitest';

declare module 'vitest' {
  export interface TestContext {
    connection: Connection;
  }
}

beforeEach(async ctx => {
  const mongod = await MongoMemoryServer.create();

  const uri = mongod.getUri();
  const connection = mongoose.createConnection(uri);

  ctx.connection = connection;

  return async () => {
    await connection.destroy(true);
    await mongod.stop();
  };
});
