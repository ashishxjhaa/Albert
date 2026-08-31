"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

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
  const { data: session } = useSession();
  const params = useParams<{ workspace: string }>();
  const pathname = usePathname();
  const workspaceId = params.workspace;
  const workspaceName =
    session?.user?.activeWorkspace?.name ?? "Workspace";

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

          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden max-w-[140px] truncate text-sm text-muted-foreground sm:inline">
              {workspaceName}
            </span>
            <Link
              href="/workspace"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "h-8"
              )}
            >
              Switch workspace
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
