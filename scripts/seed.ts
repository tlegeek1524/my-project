import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding test users into SQLite database...");

  const defaultPasswordHash = await bcrypt.hash("Password123!", 10);

  // 1. Normal Active User
  const user1 = await prisma.user.upsert({
    where: { email: "user@example.com" },
    update: {
      passwordHash: defaultPasswordHash,
      isVerified: true,
      isSuspended: false,
    },
    create: {
      email: "user@example.com",
      name: "สมชาย ใจดี",
      passwordHash: defaultPasswordHash,
      role: "USER",
      isVerified: true,
      isSuspended: false,
    },
  });

  // 2. Suspended User (for Case ACC-01 / 403 Forbidden)
  const user2 = await prisma.user.upsert({
    where: { email: "suspended@example.com" },
    update: {
      passwordHash: defaultPasswordHash,
      isVerified: true,
      isSuspended: true,
    },
    create: {
      email: "suspended@example.com",
      name: "ผู้ใช้ ที่ถูกระงับ",
      passwordHash: defaultPasswordHash,
      role: "USER",
      isVerified: true,
      isSuspended: true,
    },
  });

  // 3. Unverified User (for Case ACC-02 / 403 Forbidden)
  const user3 = await prisma.user.upsert({
    where: { email: "unverified@example.com" },
    update: {
      passwordHash: defaultPasswordHash,
      isVerified: false,
      isSuspended: false,
    },
    create: {
      email: "unverified@example.com",
      name: "ผู้ใช้ ยังไม่ยืนยันอีเมล",
      passwordHash: defaultPasswordHash,
      role: "USER",
      isVerified: false,
      isSuspended: false,
    },
  });

  console.log("Seed successful!");
  console.log("1. Active user:      user@example.com       (Password: Password123!)");
  console.log("2. Suspended user:   suspended@example.com  (Password: Password123!)");
  console.log("3. Unverified user:  unverified@example.com (Password: Password123!)");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
