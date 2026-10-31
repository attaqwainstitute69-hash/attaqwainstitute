import { connectDatabase, disconnectDatabase } from "../config/db";
import { Course } from "../models/Course.model";
import { Batch, type IBatch } from "../models/Batch.model";
import type { CourseInput } from "../repositories/course.repository";

// Test data for the AI chat end-to-end test. Every slug starts with "test-" so `--clean` removes exactly these.
// Run: npm run seed:test   |   npm run seed:test -- --clean
const courses: (CourseInput & { batch: Pick<IBatch, "seatCapacity" | "enrolledCount" | "venueOrLink"> })[] = [
  {
    slug: "test-hifz-teacher-training",
    titleBn: "হিফজ শিক্ষক প্রশিক্ষণ (টেস্ট)",
    titleEn: "Hifz Teacher Training (test)",
    pillar: "training",
    format: "online",
    price: 1500,
    descriptionBn: "হিফজ বিভাগের শিক্ষকদের জন্য পাঠদান পদ্ধতি, তিলাওয়াত সংশোধন ও শিক্ষার্থী মনোবিজ্ঞান।",
    syllabus: [{ moduleNo: 1, titleBn: "তিলাওয়াত সংশোধন পদ্ধতি", topics: ["মাখরাজ", "তাজবিদ"] }],
    trainerName: "টেস্ট ট্রেইনার",
    batch: { seatCapacity: 30, enrolledCount: 12, venueOrLink: "https://meet.example.com/test-secret-link" },
  },
  {
    slug: "test-conscious-parent",
    titleBn: "সচেতন অভিভাবক প্রোগ্রাম (টেস্ট)",
    titleEn: "Conscious Parent Program (test)",
    pillar: "training",
    format: "offline",
    price: 800,
    descriptionBn: "সন্তানের স্ক্রিন আসক্তি, কৈশোর ও ভারসাম্যপূর্ণ তারবিয়াহ নিয়ে অভিভাবকদের কর্মশালা।",
    syllabus: [{ moduleNo: 1, titleBn: "স্ক্রিন টাইম ব্যবস্থাপনা", topics: [] }],
    trainerName: "টেস্ট ট্রেইনার ২",
    // Full batch — the assistant must say "সিট পূর্ণ" and mention the waitlist.
    batch: { seatCapacity: 20, enrolledCount: 20, venueOrLink: "Test venue, Bank Colony, Savar" },
  },
];

async function main() {
  await connectDatabase();
  const existing = await Course.find({ slug: /^test-/ }, { _id: 1 }).lean();
  await Batch.deleteMany({ courseId: { $in: existing.map((c) => c._id) } });
  await Course.deleteMany({ slug: /^test-/ });

  if (process.argv.includes("--clean")) {
    console.log(`Removed ${existing.length} test courses.`);
    return;
  }

  const startDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  for (const { batch, ...course } of courses) {
    const doc = await Course.create({ ...course, status: "open" });
    await Batch.create({ courseId: doc._id, batchNo: 1, startDate, scheduleDetails: "শুক্রবার, সকাল ১০টা", ...batch });
  }
  console.log(`Seeded ${courses.length} test courses.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(disconnectDatabase);
