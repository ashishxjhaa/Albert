"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Workspace } from "@/lib/db/schema";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const navItems = [
  { label: "Campaigns", suffix: "campaign" },
  { label: "Ideas", suffix: "ideas" },
  { label: "Research", suffix: "research" },
  { label: "KB", suffix: "kb" },
  { label: "Settings", suffix: "settings" },
] as const;

export default function WorkspaceShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, update } = useSession();
  const params = useParams<{ workspace: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const workspaceId = params.workspace;
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  const fetchWorkspaces = useCallback(async () => {
    try {
      const res = await fetch("/api/workspace");
      const result = await res.json();
      if (res.ok && result.data) {
        setWorkspaces(result.data);
      }
    } catch {
      // ignore — switcher stays empty
    }
  }, []);

  useEffect(() => {
    void fetchWorkspaces();
  }, [fetchWorkspaces]);

  const handleWorkspaceChange = async (nextId: string) => {
    if (!nextId || nextId === workspaceId) return;
    const next = workspaces.find((w) => w.id === nextId);
    if (!next) return;

    await update({
      user: {
        activeWorkspace: {
          id: next.id,
          name: next.name,
          slug: next.slug,
        },
      },
    });
    router.push(`/w/${next.id}/campaign`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <div className="flex min-w-0 items-center gap-4 sm:gap-6">
            <Link
              href={`/w/${workspaceId}/campaign`}
              className="flex shrink-0 items-center gap-2"
            >
              <Image
                src="/albert.svg"
                alt="Albert"
                width={28}
                height={28}
                className="rounded-md"
                priority
              />
              <span className="text-sm font-medium tracking-tight">Albert</span>
            </Link>

            <nav className="flex items-center gap-1 overflow-x-auto">
              {navItems.map((item) => {
                const href = `/w/${workspaceId}/${item.suffix}`;
                const active =
                  pathname === href || pathname?.startsWith(`${href}/`);
                return (
                  <Link
                    key={item.suffix}
                    href={href}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap",
                      active
                        ? "bg-accent text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <select
              aria-label="Switch workspace"
              value={workspaceId}
              onChange={(e) => void handleWorkspaceChange(e.target.value)}
              className="h-8 max-w-[160px] truncate rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            >
              {workspaces.length === 0 ? (
                <option value={workspaceId}>
                  {session?.user?.activeWorkspace?.name ?? "Workspace"}
                </option>
              ) : (
                workspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))
              )}
            </select>
            <Link
              href="/workspace"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "h-8"
              )}
            >
              Manage
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
