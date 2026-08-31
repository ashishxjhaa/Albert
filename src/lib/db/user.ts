import { eq, sql } from "drizzle-orm";
import { db } from "./drizzle";
import { NewUser, users } from "./schema";

export type UsageType = "research" | "presentation";

/**
 * Check whether the user is within their usage limit, and atomically increment
 * the counter if allowed.
 *
 * - null limit = unlimited (allowed without incrementing)
 * - Returns { allowed: false } → caller should return 429
 */
export async function checkAndIncrementUsage(
  userId: string,
  type: UsageType
): Promise<
  | { allowed: true }
  | { allowed: false; used: number; limit: number }
> {
  const limitCol =
    type === "research" ? users.researchLimit : users.presentationLimit;
  const countCol =
    type === "research" ? users.researchCount : users.presentationCount;

  const [user] = await db
    .select({ limit: limitCol, count: countCol })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return { allowed: false, used: 0, limit: 0 };

  if (user.limit === null) return { allowed: true };

  if (user.count >= user.limit) {
    return { allowed: false, used: user.count, limit: user.limit };
  }

  if (type === "research") {
    await db
      .update(users)
      .set({
        researchCount: sql`${users.researchCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  } else {
    await db
      .update(users)
      .set({
        presentationCount: sql`${users.presentationCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  return { allowed: true };
}

export const getUserByEmail = async (email: string) => {
  try {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user[0]) throw new Error("User not found");

    return { data: user[0], error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
};

export const updateUser = async (email: string, payload: NewUser) => {
  try {
    const user = await db
      .update(users)
      .set(payload)
      .where(eq(users.email, email))
      .returning();

    if (!user[0]) throw new Error("User not found");

    return { data: user[0], error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
};
