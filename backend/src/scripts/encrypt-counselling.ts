// One-off: encrypts counselling records saved before field encryption existed (PRD Flow 5).
// Safe to run more than once — values that are already encrypted are skipped.
//   npm run counselling:encrypt
import { connectDatabase, disconnectDatabase } from "../config/db";
import { Counselling } from "../models/Counselling.model";
import { ENCRYPTED_FIELDS } from "../repositories/counselling.repository";
import { encryptField, isEncrypted } from "../utils/fieldCrypto";

async function main() {
  await connectDatabase();
  try {
    let updated = 0;
    // Raw collection access: no schema casting, and the fields are read exactly as stored.
    const cursor = Counselling.collection.find({}, { projection: Object.fromEntries(ENCRYPTED_FIELDS.map((f) => [f, 1])) });
    for await (const doc of cursor) {
      const set: Record<string, string> = {};
      for (const f of ENCRYPTED_FIELDS) {
        const v = doc[f];
        if (typeof v === "string" && !isEncrypted(v)) set[f] = encryptField(v);
      }
      if (Object.keys(set).length === 0) continue;
      await Counselling.collection.updateOne({ _id: doc._id }, { $set: set });
      updated++;
    }
    console.log(`Encrypted ${updated} counselling record(s).`);
  } finally {
    await disconnectDatabase();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
