import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export function slugifyUsername(fullName: string): string {
  const base = fullName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s._-]/g, "")
    .replace(/[\s._-]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 24);

  return base || "user";
}

export async function createUniqueUsername(fullName: string): Promise<string> {
  const base = slugifyUsername(fullName);
  let candidate = base;
  let attempt = 0;

  while (true) {
    const existing = await prisma.user.findUnique({
      where: { username: candidate },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }

    attempt += 1;
    candidate = `${base}${attempt}`;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}
