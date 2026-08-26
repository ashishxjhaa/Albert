"use server";

import { NewUser, users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/password";
import { getAvatarByUserInitials } from "@/lib/utils";
import { RegisterSchema, type RegisterInput } from "@/lib/validations";
import { eq } from "drizzle-orm";
import { db } from "./db/drizzle";

export const register = async (payload: RegisterInput) => {
  const parsed = RegisterSchema.safeParse(payload);
  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { email, image, name, password } = parsed.data;
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser.length > 0) {
    return {
      data: null,
      error: `User with email ${existingUser[0]?.email} already exists`,
    };
  }

  const passwordHash = await hashPassword(password);
  const newUser: NewUser = {
    image: image || getAvatarByUserInitials(name) || null,
    name,
    email,
    passwordHash,
  };

  const [createdUser] = await db.insert(users).values(newUser).returning();
  if (!createdUser) {
    return { data: null, error: "Failed to create user. Please try again." };
  }
  return { data: createdUser, error: null };
};
