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
import { useState } from "react";
import { toast } from "sonner";

type CreateIdeaModalProps = {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  workspaceId: string;
  onCreated?: () => void;
};

export default function CreateIdeaModal({
  isOpen,
  onClose,
  campaignId,
  workspaceId,
  onCreated,
}: CreateIdeaModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const handleClose = () => {
    if (isLoading) return;
    onClose();
    setTitle("");
    setContent("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 3) {
      toast.error("Title must be at least 3 characters");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim() || undefined,
          collectionId: campaignId,
          workspaceId,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to create idea");
      }

      toast.success("Idea created successfully");
      setTitle("");
      setContent("");
      onClose();
      onCreated?.();
    } catch (error) {
      toast.error((error as Error).message || "Failed to create idea");
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
          <DialogTitle>Add New Idea</DialogTitle>
          <DialogDescription>
            Create a new idea for this campaign. You can expand on it later.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ideaTitle">Idea Title</Label>
            <Input
              id="ideaTitle"
              placeholder="Enter a catchy title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="border-neutral-300"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ideaContent">Description</Label>
            <Textarea
              id="ideaContent"
              placeholder="Describe your idea, concept, and key elements..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="border-neutral-300"
            />
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
              {isLoading ? "Creating..." : "Create Idea"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
