"use client";

import { Button } from "@/components/ui/button";
import Image from "next/image";

type SocialAuthButtonsProps = {
  mode?: "login" | "signup";
  onProvider: (provider: "google" | "github") => void;
};

export function SocialAuthButtons({
  mode = "login",
  onProvider,
}: SocialAuthButtonsProps) {
  const label = mode === "login" ? "Login" : "Signup";

  return (
    <div className="flex w-full flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={() => onProvider("github")}
        className="h-auto w-full justify-center gap-2 border-neutral-300 bg-white px-4 py-2.5 text-sm font-normal hover:bg-neutral-50"
      >
        <Image
          src="/github.svg"
          width={22}
          height={22}
          alt=""
          className="shrink-0"
        />
        <span className="opacity-80 hover:opacity-100">
          {label} with Github
        </span>
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => onProvider("google")}
        className="h-auto w-full justify-center gap-2 border-neutral-300 bg-white px-4 py-2.5 text-sm font-normal hover:bg-neutral-50"
      >
        <Image
          src="/google.svg"
          width={22}
          height={22}
          alt=""
          className="shrink-0"
        />
        <span className="opacity-80 hover:opacity-100">
          {label} with Google
        </span>
      </Button>
    </div>
  );
}
