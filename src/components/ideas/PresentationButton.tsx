"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, ExternalLink, Loader2, Presentation } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type PresentationButtonProps = {
  documentId: string;
  documentTitle?: string;
  currentPresentationUrl?: string | null;
  currentPresentationStatus?: string | null;
  onStatusChange?: (status: string, url?: string | null) => void;
};

export default function PresentationButton({
  documentId,
  documentTitle,
  currentPresentationUrl,
  currentPresentationStatus,
  onStatusChange,
}: PresentationButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [presentationUrl, setPresentationUrl] = useState(
    currentPresentationUrl
  );
  const [presentationStatus, setPresentationStatus] = useState(
    currentPresentationStatus || "none"
  );

  useEffect(() => {
    setPresentationUrl(currentPresentationUrl);
    setPresentationStatus(currentPresentationStatus || "none");
  }, [currentPresentationUrl, currentPresentationStatus]);

  const startPolling = () => {
    const poll = async () => {
      try {
        const response = await fetch(
          `/api/document/${documentId}/generate-presentation`
        );
        const data = await response.json();

        if (!data.presentation) return;

        if (data.presentation.status === "completed") {
          setPresentationUrl(data.presentation.url);
          setPresentationStatus("completed");
          onStatusChange?.("completed", data.presentation.url);
          toast.success("Presentation is ready!");
          return;
        }
        if (data.presentation.status === "failed") {
          setPresentationStatus("failed");
          onStatusChange?.("failed");
          toast.error("Presentation generation failed");
          return;
        }
        if (data.presentation.status === "generating") {
          setTimeout(poll, 10000);
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    };

    setTimeout(poll, 5000);
  };

  const handleGeneratePresentation = async () => {
    setIsGenerating(true);
    setPresentationStatus("generating");
    onStatusChange?.("generating");

    try {
      const response = await fetch(
        `/api/document/${documentId}/generate-presentation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            additionalNotes: additionalNotes.trim() || undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate presentation");
      }

      if (data.success) {
        setPresentationUrl(data.presentation?.url ?? null);
        setPresentationStatus(data.presentation?.status || "completed");
        onStatusChange?.(
          data.presentation?.status || "completed",
          data.presentation?.url
        );

        if (data.presentation?.status === "completed") {
          toast.success("Presentation generated successfully!");
          setIsDialogOpen(false);
          setAdditionalNotes("");
        } else if (data.presentation?.status === "generating" || data.presentation?.status === "processing") {
          toast.success("Presentation is being generated...");
          setPresentationStatus("generating");
          setIsDialogOpen(false);
          setAdditionalNotes("");
          startPolling();
        }
      } else {
        throw new Error(data.error || "Generation failed");
      }
    } catch (error) {
      console.error("Presentation generation error:", error);
      setPresentationStatus("failed");
      onStatusChange?.("failed");
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to generate presentation"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const getButtonContent = () => {
    if (presentationStatus === "generating") {
      return (
        <>
          <Loader2 className="size-4 animate-spin" />
          Generating...
        </>
      );
    }
    if (presentationStatus === "completed" && presentationUrl) {
      return (
        <>
          <Presentation className="size-4" />
          View Presentation
        </>
      );
    }
    if (presentationStatus === "failed") {
      return (
        <>
          <AlertCircle className="size-4" />
          Retry Generation
        </>
      );
    }
    return (
      <>
        <Presentation className="size-4" />
        Generate Presentation
      </>
    );
  };

  const handleButtonClick = () => {
    if (presentationStatus === "completed" && presentationUrl) {
      window.open(presentationUrl, "_blank", "noopener,noreferrer");
    } else {
      setIsDialogOpen(true);
    }
  };

  return (
    <>
      <Button
        variant={presentationStatus === "completed" ? "default" : "outline"}
        size="sm"
        onClick={handleButtonClick}
        disabled={isGenerating}
        className="h-9 w-full justify-start gap-2"
        data-presentation-button="true"
      >
        {getButtonContent()}
      </Button>

      {presentationStatus === "completed" && presentationUrl ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-full justify-start gap-2 text-muted-foreground"
          onClick={() => setIsDialogOpen(true)}
        >
          <ExternalLink className="size-3.5" />
          Regenerate
        </Button>
      ) : null}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Presentation</DialogTitle>
            <DialogDescription>
              Create a professional Gamma presentation for &quot;
              {documentTitle || "this idea"}&quot;.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Tone, slide focus, or extra context..."
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={3}
                className="border-neutral-300"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isGenerating}
              >
                Cancel
              </Button>
              <Button
                onClick={() => void handleGeneratePresentation()}
                disabled={isGenerating}
                className="gap-2 hover:bg-[#e64e00]"
              >
                {isGenerating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                Generate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
