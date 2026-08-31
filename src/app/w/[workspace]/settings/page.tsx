"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { Vendor, Workspace } from "@/lib/db/schema";
import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type BrandColors = {
  primary: string;
  secondary: string;
  accent: string;
};

type FormState = {
  name: string;
  brandName: string;
  website: string;
  logoUrl: string;
  industry: string;
  vendor: Vendor;
  brandGuidelines: string;
  brandColors: BrandColors;
  instagramHandle: string;
  youtubeChannel: string;
  linkedinPage: string;
};

const DEFAULT_COLORS: BrandColors = {
  primary: "#ff5800",
  secondary: "#64748B",
  accent: "#F59E0B",
};

const VENDOR_OPTIONS: { value: Vendor; label: string }[] = [
  { value: "generic", label: "Generic" },
  { value: "zee5", label: "Zee5" },
  { value: "dainik_bhaskar", label: "Dainik Bhaskar" },
  { value: "star_india", label: "Star India" },
];

function workspaceToForm(workspace: Workspace): FormState {
  const colors =
    typeof workspace.brandColors === "object" && workspace.brandColors
      ? (workspace.brandColors as Partial<BrandColors>)
      : {};

  return {
    name: workspace.name || "",
    brandName: workspace.brandName || "",
    website: workspace.website || "",
    logoUrl: workspace.logoUrl || "",
    industry: workspace.industry || "",
    vendor: (workspace.vendor as Vendor) || "generic",
    brandGuidelines: workspace.brandGuidelines || "",
    brandColors: {
      primary: colors.primary || DEFAULT_COLORS.primary,
      secondary: colors.secondary || DEFAULT_COLORS.secondary,
      accent: colors.accent || DEFAULT_COLORS.accent,
    },
    instagramHandle: workspace.instagramHandle || "",
    youtubeChannel: workspace.youtubeChannel || "",
    linkedinPage: workspace.linkedinPage || "",
  };
}

function SettingsSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5"
        >
          <Skeleton className="h-5 w-32 rounded-md" />
          <Skeleton className="h-9 w-full rounded-md" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      ))}
    </div>
  );
}

export default function WorkspaceSettingsPage() {
  const params = useParams<{ workspace: string }>();
  const workspaceId = params.workspace;
  const { update } = useSession();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [slug, setSlug] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    name: "",
    brandName: "",
    website: "",
    logoUrl: "",
    industry: "",
    vendor: "generic",
    brandGuidelines: "",
    brandColors: { ...DEFAULT_COLORS },
    instagramHandle: "",
    youtubeChannel: "",
    linkedinPage: "",
  });

  const fetchWorkspace = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/workspace/${workspaceId}`);
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to load workspace");
      }
      const workspace = result.workspace as Workspace;
      setForm(workspaceToForm(workspace));
      setSlug(workspace.slug);
    } catch (error) {
      toast.error((error as Error).message || "Failed to load workspace");
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void fetchWorkspace();
  }, [fetchWorkspace]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const setColor = (key: keyof BrandColors, value: string) => {
    setForm((prev) => ({
      ...prev,
      brandColors: { ...prev.brandColors, [key]: value },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Workspace name is required");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/workspace/${workspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          brandName: form.brandName.trim(),
          website: form.website.trim(),
          logoUrl: form.logoUrl.trim(),
          industry: form.industry.trim(),
          vendor: form.vendor,
          brandGuidelines: form.brandGuidelines.trim(),
          brandColors: form.brandColors,
          instagramHandle: form.instagramHandle.trim(),
          youtubeChannel: form.youtubeChannel.trim(),
          linkedinPage: form.linkedinPage.trim(),
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to update workspace");
      }

      const updated = result.workspace as Workspace;
      setForm(workspaceToForm(updated));
      setSlug(updated.slug);

      await update({
        user: {
          activeWorkspace: {
            id: updated.id,
            name: updated.name,
            slug: updated.slug,
          },
        },
      });

      toast.success("Workspace settings saved");
    } catch (error) {
      toast.error((error as Error).message || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Brand profile used for idea generation, research, and Gamma
          presentations.
        </p>
      </div>

      {isLoading ? (
        <SettingsSkeleton />
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
          <section className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5">
            <h2 className="text-sm font-medium tracking-tight">Workspace</h2>
            <div className="space-y-2">
              <Label htmlFor="workspace-name">Name</Label>
              <Input
                id="workspace-name"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="Client or workspace name"
                maxLength={100}
                required
              />
            </div>
            {slug ? (
              <p className="text-xs text-muted-foreground">Slug: {slug}</p>
            ) : null}
          </section>

          <section className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5">
            <h2 className="text-sm font-medium tracking-tight">Brand</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="brand-name">Brand name</Label>
                <Input
                  id="brand-name"
                  value={form.brandName}
                  onChange={(e) => setField("brandName", e.target.value)}
                  placeholder="e.g. Sony Liv"
                  maxLength={255}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  value={form.industry}
                  onChange={(e) => setField("industry", e.target.value)}
                  placeholder="e.g. Media & Entertainment"
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={form.website}
                  onChange={(e) => setField("website", e.target.value)}
                  placeholder="https://"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logo-url">Logo URL</Label>
                <Input
                  id="logo-url"
                  type="url"
                  value={form.logoUrl}
                  onChange={(e) => setField("logoUrl", e.target.value)}
                  placeholder="https://"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="vendor">Vendor</Label>
                <select
                  id="vendor"
                  value={form.vendor}
                  onChange={(e) =>
                    setField("vendor", e.target.value as Vendor)
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                >
                  {VENDOR_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="guidelines">Brand guidelines</Label>
                <Textarea
                  id="guidelines"
                  value={form.brandGuidelines}
                  onChange={(e) =>
                    setField("brandGuidelines", e.target.value)
                  }
                  placeholder="Tone, do's and don'ts, visual direction..."
                  rows={4}
                  maxLength={2000}
                  className="border-neutral-300"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5">
            <h2 className="text-sm font-medium tracking-tight">Colors</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {(
                [
                  ["primary", "Primary"],
                  ["secondary", "Secondary"],
                  ["accent", "Accent"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={`color-${key}`}>{label}</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      id={`color-${key}-picker`}
                      value={form.brandColors[key]}
                      onChange={(e) => setColor(key, e.target.value)}
                      className="size-9 shrink-0 cursor-pointer rounded-md border border-neutral-200 bg-white p-0.5"
                      aria-label={`${label} color picker`}
                    />
                    <Input
                      id={`color-${key}`}
                      value={form.brandColors[key]}
                      onChange={(e) => setColor(key, e.target.value)}
                      placeholder="#000000"
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5">
            <h2 className="text-sm font-medium tracking-tight">Social</h2>
            <p className="text-xs text-muted-foreground">
              Used for brand research sessions.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  value={form.instagramHandle}
                  onChange={(e) =>
                    setField("instagramHandle", e.target.value)
                  }
                  placeholder="@handle"
                  maxLength={255}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="youtube">YouTube</Label>
                <Input
                  id="youtube"
                  value={form.youtubeChannel}
                  onChange={(e) => setField("youtubeChannel", e.target.value)}
                  placeholder="Channel name or URL"
                  maxLength={255}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn</Label>
                <Input
                  id="linkedin"
                  value={form.linkedinPage}
                  onChange={(e) => setField("linkedinPage", e.target.value)}
                  placeholder="Company page"
                  maxLength={255}
                />
              </div>
            </div>
          </section>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSaving}
              className="h-9 gap-2 hover:bg-[#e64e00]"
            >
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
              {isSaving ? "Saving..." : "Save settings"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
