import IdeaEditor from "@/components/ideas/IdeaEditor";
import { Suspense } from "react";

type PageProps = {
  params: Promise<{
    workspace: string;
    campaignId: string;
    ideaId: string;
  }>;
};

export default async function IdeaDetailPage({ params }: PageProps) {
  const { workspace, campaignId, ideaId } = await params;

  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
      <IdeaEditor
        workspace={workspace}
        campaignId={campaignId}
        ideaId={ideaId}
      />
    </Suspense>
  );
}
