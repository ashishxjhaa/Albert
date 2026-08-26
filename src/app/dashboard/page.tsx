import { auth } from "@/lib/auth";
import { DashboardClient } from "@/app/dashboard/dashboard-client";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <DashboardClient
      email={session.user.email}
      name={session.user.name}
    />
  );
}
