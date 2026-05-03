import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const newPassword = process.argv[2];
if (!newPassword || newPassword.length < 8) {
  console.error("Kullanım: node update_password.mjs <yeni_şifre> (en az 8 karakter)");
  process.exit(1);
}

const prisma = new PrismaClient();
const hash = await bcrypt.hash(newPassword, 12);
await prisma.user.update({ where: { username: "admin" }, data: { password: hash, failedLoginAttempts: 0, lockedUntil: null } });
await prisma.$disconnect();
console.log("Şifre güncellendi.");
