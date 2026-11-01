// Make the database indexes match the model schemas (database-schema.md §4).
// autoIndex only creates missing indexes on startup. It never drops old ones and fails when an
// index changes its options (e.g. the courses text index language), so run this after such changes:
//   npm run db:indexes             → dry run, prints what would change
//   npm run db:indexes -- --apply  → drops stale indexes and builds missing ones
import type { Model } from "mongoose";
import { connectDatabase, disconnectDatabase } from "../config/db";
import { Batch } from "../models/Batch.model";
import { Counselling } from "../models/Counselling.model";
import { Course } from "../models/Course.model";
import { Enrollment } from "../models/Enrollment.model";
import { Institution } from "../models/Institution.model";
import { Otp } from "../models/Otp.model";
import { Resource } from "../models/Resource.model";
import { Review } from "../models/Review.model";
import { User } from "../models/User.model";
import { Waitlist } from "../models/Waitlist.model";

const models: Model<any>[] = [User, Otp, Course, Batch, Enrollment, Institution, Counselling, Review, Resource, Waitlist];

async function main() {
  const apply = process.argv.includes("--apply");

  await connectDatabase();
  try {
    for (const model of models) {
      const name = model.collection.collectionName;
      const { toDrop, toCreate } = await model.diffIndexes();
      if (toDrop.length === 0 && toCreate.length === 0) {
        console.log(`${name}: up to date`);
        continue;
      }
      for (const index of toDrop) console.log(`${name}: drop   ${index}`);
      for (const index of toCreate) console.log(`${name}: create ${JSON.stringify(index)}`);
      if (apply) await model.syncIndexes();
    }
    console.log(apply ? "Indexes synced." : "Dry run. Re-run with --apply to make these changes.");
  } finally {
    await disconnectDatabase();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
