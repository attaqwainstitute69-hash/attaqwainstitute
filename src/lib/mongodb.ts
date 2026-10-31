import "server-only";
import { MongoClient, type Db } from "mongodb";

// Server only (PRD F18) — the connection string holds the DB password.
const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is not set. Add it to .env.local.");
}

// Reuse one client across hot reloads in dev so we don't open a new pool on every edit.
const globalForMongo = globalThis as unknown as {
  _mongoClientPromise?: Promise<MongoClient>;
};

const clientPromise =
  globalForMongo._mongoClientPromise ?? new MongoClient(uri).connect();

if (process.env.NODE_ENV !== "production") {
  globalForMongo._mongoClientPromise = clientPromise;
}

export default clientPromise;

// Database name comes from MONGODB_DB, defaulting to "attaqwa".
export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB || "attaqwa");
}
