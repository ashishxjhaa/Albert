import IdeasManager from "@/components/ideas/IdeasManager";

type PageProps = {
  params: Promise<{
    workspace: string;
    campaignId: string;
  }>;
};

export default async function CampaignIdeasPage({ params }: PageProps) {
  const { workspace, campaignId } = await params;

  return <IdeasManager workspace={workspace} campaignId={campaignId} />;
}
