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
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type CreateCampaignModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
};

const emptyForm = {
  campaignName: "",
  brief: "",
  targetAudience: "",
  industry: "",
  tone: "",
};

export default function CreateCampaignModal({
  isOpen,
  onClose,
  onCreated,
}: CreateCampaignModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const params = useParams<{ workspace: string }>();
  const workspaceId = params.workspace;

  const handleChange = (field: keyof typeof emptyForm, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleClose = () => {
    if (isLoading) return;
    onClose();
    setFormData(emptyForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.campaignName.trim()) {
      toast.error("Campaign name is required");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          workspaceId,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to create campaign");
      }

      toast.success("Campaign created successfully");
      setFormData(emptyForm);
      onClose();
      onCreated?.();
    } catch (error) {
      toast.error((error as Error).message || "Failed to create campaign");
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
          <DialogTitle>Create New Campaign</DialogTitle>
          <DialogDescription>
            Create a new campaign to generate AI-powered ideas for your client.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
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
              {isLoading ? "Creating..." : "Create Campaign"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
