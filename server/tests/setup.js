// Every test file gets its own throwaway MongoDB in memory, so tests never touch Atlas.
const os = require('os');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  // The MongoDB driver (v7.8) loads `os` with a dynamic import(), which Jest's
  // sandbox blocks unless Node runs with --experimental-vm-modules. The failure is
  // swallowed and the server then rejects the handshake ("Missing required
  // sub-document 'driver'"). Handing the driver `os` directly avoids the import.
  await mongoose.connect(mongo.getUri(), { runtimeAdapters: { os } });
  await mongoose.connection.syncIndexes(); // make the unique email index exist
});

afterEach(async () => {
  // Start each test with empty collections
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});
