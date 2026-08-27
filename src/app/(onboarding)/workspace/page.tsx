"use client";

import CreateWorkspace from "@/components/onboarding/create-workspace";
import type { Workspace } from "@/lib/db/schema";
import { Loader2, Sparkles } from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export default function WorkspaceOnboardingPage() {
  const router = useRouter();
  const { update } = useSession();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWorkspaces = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/workspace");
      const result = await res.json();
      if (!res.ok || result.error) {
        toast.error(result.error || "Failed to load workspaces");
        return;
      }
      setWorkspaces(result.data ?? []);
    } catch (error) {
      toast.error((error as Error).message || "Failed to load workspaces");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchWorkspaces();
  }, [fetchWorkspaces]);

  const selectWorkspace = async (workspace: Workspace) => {
    await update({
      user: {
        activeWorkspace: {
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
        },
      },
    });
    router.push(`/w/${workspace.id}/campaign`);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="mb-8 text-center">
        <div className="mb-3 flex items-center justify-center gap-3">
          <Image
            src="/albert.svg"
            alt="Albert"
            width={40}
            height={40}
            className="rounded-lg"
            priority
          />
          <h1 className="text-3xl font-medium tracking-tight">Albert</h1>
        </div>
        <p className="text-muted-foreground">
          AI-powered campaign generator for media companies
        </p>
      </div>

      <div className="grid w-full max-w-4xl gap-8 lg:grid-cols-2">
        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="text-lg font-medium">Create New Client Workspace</h2>
          <p className="mt-1 mb-5 text-xs text-muted-foreground">
            Set up a workspace for your client to generate targeted campaigns
          </p>
          <CreateWorkspace onCreated={fetchWorkspaces} />
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-medium">Your Client Workspaces</h2>

          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading...
            </div>
          ) : workspaces.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-accent">
                <Sparkles className="size-5 text-primary" />
              </div>
              <p className="max-w-xs text-sm text-muted-foreground">
                Create your first client workspace to start generating campaigns
              </p>
            </div>
          ) : (
            <ul className="max-h-96 space-y-2 overflow-y-auto">
              {workspaces.map((workspace) => (
                <li key={workspace.id}>
                  <button
                    type="button"
                    onClick={() => void selectWorkspace(workspace)}
                    className="flex w-full items-center gap-3 rounded-lg border border-neutral-200 px-3 py-2.5 text-left transition-colors hover:bg-neutral-50"
                  >
                    {workspace.image ? (
                      <Image
                        src={workspace.image}
                        alt=""
                        width={36}
                        height={36}
                        className="rounded-md"
                        unoptimized
                      />
                    ) : (
                      <div className="flex size-9 items-center justify-center rounded-md bg-neutral-100 text-sm font-medium">
                        {workspace.name?.charAt(0)?.toUpperCase() ?? "W"}
                      </div>
                    )}
                    <span className="truncate text-sm font-medium">
                      {workspace.name}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
