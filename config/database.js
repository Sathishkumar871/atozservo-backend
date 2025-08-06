import { MongoClient } from "mongodb";

let _db = null;

async function connectToDatabase() {
  if (!_db) {
    const ConnectionString = process.env.DB_URL;
    const DBName = process.env.DB_NAME;

    const client = await MongoClient.connect(ConnectionString, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    _db = client.db(DBName);
  }
  return _db;
}

async function ping() {
  const db = await connectToDatabase();
  await db.command({ ping: 1 });
  console.log("✅ Pinged the database successfully");
}

ping();

export { connectToDatabase };
