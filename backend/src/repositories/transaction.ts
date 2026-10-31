import mongoose, { type ClientSession } from "mongoose";

// Services open transactions through this helper so they never import mongoose (backend.md §1.2).
// session.withTransaction retries TransientTransactionError automatically (api-spec §1.9.5).
export async function runInTransaction<T>(fn: (session: ClientSession) => Promise<T>): Promise<T> {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(() => fn(session));
  } finally {
    await session.endSession();
  }
}

export type { ClientSession };
