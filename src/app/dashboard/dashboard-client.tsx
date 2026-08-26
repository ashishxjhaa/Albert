"use client";

import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";

type DashboardClientProps = {
  email?: string | null;
  name?: string | null;
};

export function DashboardClient({ email, name }: DashboardClientProps) {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-2xl font-medium tracking-tight">Dashboard</h1>
      <p className="text-sm opacity-80">Signed in as {email ?? name}</p>
      <p className="max-w-md text-center text-sm text-muted-foreground">
        Temporary stub — UI rebuild starts from auth; more screens will be added
        next.
      </p>
      <Button
        variant="outline"
        onClick={() => signOut({ callbackUrl: "/login" })}
      >
        Sign out
      </Button>
    </div>
  );
}
