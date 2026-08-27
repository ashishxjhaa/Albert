"use client";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

export default function CampaignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ workspace: string; campaignId: string }>();
  const pathname = usePathname();
  const isIdeaDetail = /\/ideas\/[^/]+$/.test(pathname);

  return (
    <div className="space-y-4">
      {!isIdeaDetail ? (
        <Link
          href={`/w/${params.workspace}/campaign`}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "h-8 -ml-2 w-fit gap-1.5 text-muted-foreground"
          )}
        >
          <ArrowLeft className="size-4" />
          All Campaigns
        </Link>
      ) : null}
      {children}
    </div>
  );
}
