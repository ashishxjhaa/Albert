"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoaderIcon } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "loading") return;

    if (session) {
      router.push("/workspace");
    } else {
      router.push("/login");
    }
  }, [session, status, router]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center">
      <div className="flex items-center gap-2">
        <LoaderIcon className="h-6 w-6 animate-spin" />
        <span>Loading Albert...</span>
      </div>
    </div>
  );
}
