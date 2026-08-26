"use client";

import { SocialAuthButtons } from "@/components/form/SocialAuthButtons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { register as signUp } from "@/lib/actions";
import { RegisterSchema } from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import { EyeIcon, EyeOffIcon, Loader } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

const Register = () => {
  const router = useRouter();
  const {
    handleSubmit,
    register,
    formState: { isSubmitting },
  } = useForm({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const [show, setShow] = React.useState(false);

  const handleOAuthSignUp = async (provider: "google" | "github") => {
    await signIn(provider, {
      redirect: true,
      callbackUrl: "/workspace",
    });
  };

  return (
    <div className="z-20 flex w-full max-w-md flex-col px-6 py-10">
      <div className="mb-4">
        <span className="text-xl font-medium tracking-tight">Register Now</span>
      </div>
      <SocialAuthButtons mode="signup" onProvider={handleOAuthSignUp} />
      <div className="my-4 flex w-full items-center justify-center gap-x-2">
        <Separator className="flex-1 bg-neutral-300/60" />
        <span className="shrink-0 text-sm opacity-80">or</span>
        <Separator className="flex-1 bg-neutral-300/60" />
      </div>
      <form
        onSubmit={handleSubmit(async (data) => {
          const { data: res, error } = await signUp(data);
          if (error) {
            toast.error(error);
            return;
          }
          const resp = await signIn("credentials", {
            email: res?.email,
            password: data.password,
            redirect: false,
          });
          if (!resp?.ok || resp?.error) {
            toast.error(resp?.error || "Sign in failed");
            return;
          }
          toast.success("Signed up successfully");
          router.push("/workspace");
        })}
        className="flex w-full flex-col"
      >
        <Label htmlFor="name" className="mt-1 px-1 font-normal opacity-80">
          Name
        </Label>
        <Input
          required
          placeholder="Enter your name"
          maxLength={50}
          id="name"
          className="mt-1"
          {...register("name")}
        />
        <Label htmlFor="email" className="mt-2 px-1 font-normal opacity-80">
          Email
        </Label>
        <Input
          type="email"
          autoComplete="email"
          required
          maxLength={50}
          placeholder="Enter your email"
          id="email"
          className="mt-1 placeholder:text-sm placeholder:font-light"
          {...register("email")}
        />

        <Label htmlFor="password" className="mt-2 px-1 font-normal opacity-80">
          Password
        </Label>

        <div className="mt-1 flex items-stretch overflow-hidden rounded-lg border border-neutral-300 bg-white">
          <Input
            className="h-auto flex-1 rounded-none border-0 bg-transparent px-4 py-2 shadow-none focus-visible:border-0 focus-visible:ring-0"
            id="password"
            required
            placeholder="Create a strong password"
            autoComplete="new-password"
            type={show ? "text" : "password"}
            {...register("password")}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-auto shrink-0 rounded-none px-3 hover:bg-transparent"
            onClick={() => setShow(!show)}
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? (
              <EyeOffIcon strokeWidth={1.6} className="size-5 opacity-80" />
            ) : (
              <EyeIcon strokeWidth={1.6} className="size-5 opacity-80" />
            )}
          </Button>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="mt-4 h-auto w-full py-2 font-medium tracking-tight hover:bg-[#e64e00]"
        >
          {isSubmitting && <Loader className="size-4 animate-spin opacity-80" />}
          Signup
        </Button>
      </form>
      <div className="mt-3 flex w-full items-center justify-center">
        <span className="text-sm">
          Already have an account?{" "}
          <Button
            type="button"
            variant="link"
            onClick={() => router.push("/login")}
            className="h-auto p-0 text-primary"
          >
            Log In
          </Button>
        </span>
      </div>
    </div>
  );
};

export default Register;
