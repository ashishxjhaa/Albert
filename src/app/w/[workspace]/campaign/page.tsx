"use client";

import CreateCampaignModal from "@/components/dialogs/CreateCampaignModal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Collection } from "@/lib/db/schema";
import { Plus, Sparkles } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type CampaignRow = {
  collection: Collection;
  documents_count: number | string;
};

function formatDate(value: Date | string | null | undefined) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function CampaignsGridSkeleton() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2" aria-busy="true" aria-label="Loading campaigns">
      {Array.from({ length: 6 }).map((_, i) => (
        <li
          key={i}
          className="rounded-xl border border-neutral-200 bg-white p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <Skeleton className="h-5 w-[40%] rounded-md" />
            <Skeleton className="h-4 w-14 rounded-md" />
          </div>
          <Skeleton className="mt-3 h-4 w-full rounded-md" />
          <Skeleton className="mt-2 h-4 w-[80%] rounded-md" />
          <Skeleton className="mt-4 h-3 w-24 rounded-md" />
        </li>
      ))}
    </ul>
  );
}

export default function CampaignsPage() {
  const params = useParams<{ workspace: string }>();
  const router = useRouter();
  const workspaceId = params.workspace;
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const fetchCampaigns = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/collection?workspace=${workspaceId}`);
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to load campaigns");
      }
      setCampaigns(result.data ?? []);
    } catch (error) {
      toast.error((error as Error).message || "Failed to load campaigns");
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void fetchCampaigns();
  }, [fetchCampaigns]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-medium tracking-tight">All Campaigns</h1>
        <Button
          className="h-9 hover:bg-[#e64e00]"
          onClick={() => setIsCreateOpen(true)}
        >
          <Plus className="size-4" />
          Create New Campaign
        </Button>
      </div>

      {isLoading ? (
        <CampaignsGridSkeleton />
      ) : campaigns.length === 0 ? (
        <div className="flex h-[60vh] items-center justify-center rounded-lg border-2 border-dashed border-neutral-200 p-4">
          <div className="flex max-w-sm flex-col items-center text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-accent">
              <Sparkles className="size-5 text-primary" />
            </div>
            <h4 className="text-lg font-medium tracking-tight">
              No Campaigns found
            </h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Create campaigns to generate AI-powered ideas for your clients.
              Each campaign will contain multiple creative concepts tailored to
              your brief.
            </p>
            <Button
              className="mt-4 h-9 hover:bg-[#e64e00]"
              onClick={() => setIsCreateOpen(true)}
            >
              Create Campaign
            </Button>
          </div>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {campaigns.map(({ collection, documents_count }) => (
            <li key={collection.id}>
              <button
                type="button"
                onClick={() =>
                  router.push(`/w/${workspaceId}/c/${collection.id}/ideas`)
                }
                className="flex w-full flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-4 text-left transition-colors hover:bg-neutral-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium tracking-tight">
                    {collection.campaignName || "Untitled campaign"}
                  </h3>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {documents_count ?? 0} ideas
                  </span>
                </div>
                {collection.brief ? (
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {collection.brief}
                  </p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  {formatDate(collection.createdAt)}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

      <CreateCampaignModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={fetchCampaigns}
      />
    </div>
  );
}
