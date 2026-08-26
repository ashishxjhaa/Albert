"use client";

import { Button } from "@/components/ui/button";
import { signOut, useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";

export default function WorkspaceStubPage() {
  const params = useParams<{ workspace: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const active = session?.user?.activeWorkspace;
  const workspaceId = params.workspace;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6">
      <h1 className="text-2xl font-medium tracking-tight">Workspace ready</h1>
      <p className="text-sm text-muted-foreground">
        {active?.name ?? "Workspace"} · {workspaceId}
      </p>
      <p className="max-w-md text-center text-sm text-muted-foreground">
        Onboarding is done. Campaign and dashboard screens come next.
      </p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => router.push("/workspace")}>
          Switch workspace
        </Button>
        <Button
          variant="outline"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          Sign out
        </Button>
      </div>
    </div>
  );
}
