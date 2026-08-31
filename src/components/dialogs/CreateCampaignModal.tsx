"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Collection } from "@/lib/db/schema";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type CampaignForm = {
  campaignName: string;
  brief: string;
  targetAudience: string;
  industry: string;
  tone: string;
};

const emptyForm: CampaignForm = {
  campaignName: "",
  brief: "",
  targetAudience: "",
  industry: "",
  tone: "",
};

type CampaignModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (campaign?: Collection) => void;
  /** When set, modal edits this campaign via PATCH instead of creating */
  campaign?: Collection | null;
};

export default function CampaignModal({
  isOpen,
  onClose,
  onSaved,
  campaign = null,
}: CampaignModalProps) {
  const isEdit = Boolean(campaign?.id);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<CampaignForm>(emptyForm);
  const params = useParams<{ workspace: string }>();
  const workspaceId = params.workspace;

  useEffect(() => {
    if (!isOpen) return;
    if (campaign) {
      setFormData({
        campaignName: campaign.campaignName || "",
        brief: campaign.brief || "",
        targetAudience: campaign.targetAudience || "",
        industry: campaign.industry || "",
        tone: campaign.tone || "",
      });
    } else {
      setFormData(emptyForm);
    }
  }, [isOpen, campaign]);

  const handleChange = (field: keyof CampaignForm, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleClose = () => {
    if (isLoading) return;
    onClose();
    if (!isEdit) setFormData(emptyForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.campaignName.trim()) {
      toast.error("Campaign name is required");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        isEdit ? `/api/collection/${campaign!.id}` : "/api/collection",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            workspaceId,
          }),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          result.error ||
            (isEdit ? "Failed to update campaign" : "Failed to create campaign")
        );
      }

      toast.success(isEdit ? "Campaign updated" : "Campaign created successfully");
      if (!isEdit) setFormData(emptyForm);
      onClose();
      onSaved?.(result.data ?? undefined);
    } catch (error) {
      toast.error(
        (error as Error).message ||
          (isEdit ? "Failed to update campaign" : "Failed to create campaign")
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent className="max-w-lg bg-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Campaign" : "Create New Campaign"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update campaign brief and targeting details."
              : "Create a new campaign to generate AI-powered ideas for your client."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-2 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="campaignName">Campaign Name</Label>
            <Input
              id="campaignName"
              placeholder="Enter campaign name..."
              value={formData.campaignName}
              onChange={(e) => handleChange("campaignName", e.target.value)}
              required
              className="border-neutral-300"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="brief">Brief</Label>
            <Textarea
              id="brief"
              placeholder="Describe your campaign objectives and requirements..."
              value={formData.brief}
              onChange={(e) => handleChange("brief", e.target.value)}
              rows={3}
              className="border-neutral-300"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetAudience">Target Audience</Label>
            <Input
              id="targetAudience"
              placeholder="e.g., Gen Z, Housewives, Corporate professionals..."
              value={formData.targetAudience}
              onChange={(e) => handleChange("targetAudience", e.target.value)}
              className="border-neutral-300"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                placeholder="e.g., FMCG, Auto, BFSI"
                value={formData.industry}
                onChange={(e) => handleChange("industry", e.target.value)}
                className="border-neutral-300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tone">Tone</Label>
              <Input
                id="tone"
                placeholder="e.g., Emotional, Humorous"
                value={formData.tone}
                onChange={(e) => handleChange("tone", e.target.value)}
                className="border-neutral-300"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="hover:bg-[#e64e00]"
            >
              {isLoading
                ? isEdit
                  ? "Saving..."
                  : "Creating..."
                : isEdit
                  ? "Save changes"
                  : "Create Campaign"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** @deprecated Prefer CampaignModal — kept as alias for create flow */
export { CampaignModal as CreateCampaignModal };
