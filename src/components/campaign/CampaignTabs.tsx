"use client";

import { cn } from "@/lib/utils";
import { FileText, Presentation } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type CampaignTabsProps = {
  workspace: string;
  campaignId: string;
};

export default function CampaignTabs({
  workspace,
  campaignId,
}: CampaignTabsProps) {
  const pathname = usePathname();

  const tabs = [
    {
      name: "Ideas",
      href: `/w/${workspace}/c/${campaignId}/ideas`,
      icon: FileText,
      current: pathname?.includes("/ideas"),
    },
    {
      name: "Presentations",
      href: `/w/${workspace}/c/${campaignId}/presentations`,
      icon: Presentation,
      current: pathname?.includes("/presentations"),
    },
  ];

  return (
    <nav className="flex gap-1 border-b border-neutral-200" aria-label="Campaign tabs">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <Link
            key={tab.name}
            href={tab.href}
            className={cn(
              "inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              tab.current
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-4" />
            {tab.name}
          </Link>
        );
      })}
    </nav>
  );
}
