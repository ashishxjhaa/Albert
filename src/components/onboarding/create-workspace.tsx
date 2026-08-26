"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { Briefcase, Loader } from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const NewWorkspaceSchema = z.object({
  name: z.string().min(1).max(30),
});

type CreateWorkspaceProps = {
  onCreated?: () => void;
};

export default function CreateWorkspace({ onCreated }: CreateWorkspaceProps) {
  const router = useRouter();
  const { update } = useSession();

  const {
    register,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: { name: "" },
    resolver: zodResolver(NewWorkspaceSchema),
  });

  const watchTitle = watch("name");

  const workspaceImage = useMemo(() => {
    if (!watchTitle?.trim()) {
      return "https://api.dicebear.com/9.x/glass/svg?seed=Untitled-Workspace";
    }
    return `https://api.dicebear.com/9.x/glass/svg?seed=${watchTitle.toLowerCase()}`;
  }, [watchTitle]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const response = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          image: workspaceImage,
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        toast.error(result.error || "Failed to create workspace");
        return;
      }

      const data = result.data;
      toast.success("Workspace created successfully");

      await update({
        user: {
          activeWorkspace: {
            id: data.id,
            name: data.name,
            slug: data.slug,
          },
        },
      });

      onCreated?.();
      router.push(`/w/${data.id}`);
    } catch (error) {
      toast.error((error as Error).message || "Failed to create workspace");
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="workspace-name">Client/Brand Name</Label>
        <Input
          id="workspace-name"
          placeholder="e.g., Everest Masala, Zee5 Entertainment"
          maxLength={30}
          {...register("name")}
        />
        <p className="text-xs text-muted-foreground">
          This will be used to create campaigns tailored to your client&apos;s
          brand
        </p>
      </div>

      {watchTitle?.trim() ? (
        <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
          <Image
            src={workspaceImage}
            alt=""
            width={32}
            height={32}
            className="rounded-lg"
            unoptimized
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{watchTitle}</p>
            <p className="text-xs text-muted-foreground">Workspace preview</p>
          </div>
        </div>
      ) : null}

      <Button
        type="submit"
        disabled={isSubmitting || !watchTitle?.trim()}
        className="h-auto w-full py-2 hover:bg-[#e64e00]"
      >
        {isSubmitting ? (
          <Loader className="size-4 animate-spin" />
        ) : (
          <Briefcase className="size-4" />
        )}
        Create Workspace
      </Button>
    </form>
  );
}
