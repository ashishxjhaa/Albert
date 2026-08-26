import { auth } from "@/lib/auth";
import { db } from "@/lib/db/drizzle";
import { workspaces } from "@/lib/db/schema";
import { getSlug } from "@/lib/utils";
import { and, eq, isNull } from "drizzle-orm";
import { NextRequest } from "next/server";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json(
      { data: null, error: "Session not found" },
      { status: 401 }
    );
  }

  try {
    const userWorkspaces = await db
      .select()
      .from(workspaces)
      .where(
        and(eq(workspaces.user, session.user.id), isNull(workspaces.deletedAt))
      );

    return Response.json({ data: userWorkspaces, error: null }, { status: 200 });
  } catch (error) {
    return Response.json(
      { data: null, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json(
      { data: null, error: "Session not found" },
      { status: 401 }
    );
  }

  try {
    const payload = (await req.json()) as { name?: string; image?: string };
    const name = payload.name?.trim();

    if (!name) {
      return Response.json(
        { data: null, error: "Workspace name is required" },
        { status: 400 }
      );
    }

    const [workspace] = await db
      .insert(workspaces)
      .values({
        name,
        image: payload.image || null,
        slug: getSlug(name),
        user: session.user.id,
      })
      .returning();

    return Response.json({ data: workspace, error: null }, { status: 201 });
  } catch (error) {
    return Response.json(
      { data: null, error: (error as Error).message },
      { status: 500 }
    );
  }
}
