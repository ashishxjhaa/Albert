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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, Loader2, Plus, Search, Sparkles } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type KbDoc = {
  id: string;
  sourceId: string;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: string | Date | null;
  chunkCount: number;
};

type SearchHit = {
  id: string;
  content: string;
  sourceId: string;
  metadata: Record<string, unknown> | null;
};

export default function KnowledgeBasePage() {
  const params = useParams<{ workspace: string }>();
  const workspaceId = params.workspace;
  const [docs, setDocs] = useState<KbDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [searchHits, setSearchHits] = useState<SearchHit[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const fetchDocs = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/unrag/documents?workspace=${workspaceId}`);
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to load KB");
      setDocs(result.documents ?? []);
    } catch (error) {
      toast.error((error as Error).message || "Failed to load KB");
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void fetchDocs();
  }, [fetchDocs]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error("Title and content are required");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/unrag/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          title: title.trim(),
          content: content.trim(),
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to add document");
      toast.success("Document added");
      setTitle("");
      setContent("");
      setIsAddOpen(false);
      await fetchDocs();
    } catch (error) {
      toast.error((error as Error).message || "Failed to add document");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      setSearchHits(null);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch("/api/unrag/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          workspaceId,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Search failed");
      setSearchHits(result.results ?? []);
    } catch (error) {
      toast.error((error as Error).message || "Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Knowledge Base</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Paste brand docs and search them (keyword search for now)
          </p>
        </div>
        <Button
          className="h-9 hover:bg-[#e64e00]"
          onClick={() => setIsAddOpen(true)}
        >
          <Plus className="size-4" />
          Add Document
        </Button>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search knowledge base..."
          className="border-neutral-300"
        />
        <Button type="submit" variant="outline" className="h-9 shrink-0" disabled={isSearching}>
          {isSearching ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Search className="size-4" />
          )}
          Search
        </Button>
      </form>

      {searchHits ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">
              Search results ({searchHits.length})
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchHits(null);
                setQuery("");
              }}
            >
              Clear
            </Button>
          </div>
          {searchHits.length === 0 ? (
            <p className="text-sm text-muted-foreground">No matches.</p>
          ) : (
            <ul className="space-y-2">
              {searchHits.map((hit) => (
                <li
                  key={hit.id}
                  className="rounded-xl border border-neutral-200 bg-white p-4"
                >
                  <p className="text-xs text-muted-foreground">
                    {(hit.metadata?.title as string) || hit.sourceId}
                  </p>
                  <p className="mt-1 line-clamp-4 text-sm">{hit.content}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : isLoading ? (
        <ul className="space-y-3" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <li
              key={i}
              className="rounded-xl border border-neutral-200 bg-white p-4"
            >
              <Skeleton className="h-5 w-[40%] rounded-md" />
              <Skeleton className="mt-2 h-4 w-full rounded-md" />
            </li>
          ))}
        </ul>
      ) : docs.length === 0 ? (
        <div className="flex h-[40vh] items-center justify-center rounded-lg border-2 border-dashed border-neutral-200 p-4">
          <div className="flex max-w-sm flex-col items-center text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-accent">
              <Sparkles className="size-5 text-primary" />
            </div>
            <h4 className="text-lg font-medium tracking-tight">
              Knowledge base is empty
            </h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Add pasted brand briefs, guidelines, or past campaign notes to
              search later.
            </p>
          </div>
        </div>
      ) : (
        <ul className="space-y-3">
          {docs.map((doc) => (
            <li
              key={doc.id}
              className="rounded-xl border border-neutral-200 bg-white p-4"
            >
              <div className="flex items-start gap-2">
                <BookOpen className="mt-0.5 size-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <h3 className="font-medium tracking-tight">
                    {(doc.metadata?.title as string) || doc.sourceId}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {doc.chunkCount} chunk{doc.chunkCount === 1 ? "" : "s"}
                  </p>
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                    {doc.content}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-lg bg-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Document</DialogTitle>
            <DialogDescription>
              Paste text content into the knowledge base for this workspace.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="kb-title">Title</Label>
              <Input
                id="kb-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="border-neutral-300"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kb-content">Content</Label>
              <Textarea
                id="kb-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                className="border-neutral-300"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="hover:bg-[#e64e00]"
              >
                {isSaving ? "Saving..." : "Add"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
