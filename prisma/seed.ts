import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const seedPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!seedPassword) throw new Error("SEED_ADMIN_PASSWORD env variable is required");
  const passwordHash = await bcrypt.hash(seedPassword, 12);

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      password: passwordHash,
    },
  });

  console.log(`Admin user ready: ${admin.username} (id: ${admin.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
