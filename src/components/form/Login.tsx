"use client";

import { SocialAuthButtons } from "@/components/form/SocialAuthButtons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { LoginSchema } from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import { EyeIcon, EyeOffIcon, Loader } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

const Login = () => {
  const { handleSubmit, register } = useForm({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const [show, setShow] = React.useState(false);

  const handleLogin = handleSubmit(async (values) => {
    setIsLoading(true);
    const res = await signIn("credentials", {
      redirect: false,
      email: values.email,
      password: values.password,
    });

    if (!res?.ok || res?.error) {
      setIsLoading(false);
      // Auth.js hides real auth errors as CredentialsSignin / Configuration
      toast.error("Invalid email or password");
      return;
    }

    setIsLoading(false);
    toast.success("Logged in successfully");
    router.push("/workspace");
  });

  const handleOauthLogin = async (provider: "google" | "github") => {
    await signIn(provider, {
      redirect: true,
      callbackUrl: "/workspace",
    });
  };

  return (
    <div className="z-20 flex w-full max-w-md flex-col px-6 py-10">
      <div className="mb-4">
        <span className="text-xl font-medium tracking-tight">Welcome Back</span>
      </div>
      <SocialAuthButtons mode="login" onProvider={handleOauthLogin} />
      <div className="my-4 flex w-full items-center justify-center gap-x-2">
        <Separator className="flex-1 bg-neutral-300/60" />
        <span className="shrink-0 text-sm opacity-80">or</span>
        <Separator className="flex-1 bg-neutral-300/60" />
      </div>

      <form onSubmit={handleLogin} className="flex w-full flex-col space-y-2">
        <Input
          placeholder="Email"
          autoComplete="email"
          {...register("email")}
        />
        <div className="mt-2 flex items-stretch overflow-hidden rounded-lg border border-neutral-300 bg-white">
          <Input
            className="h-auto flex-1 rounded-none border-0 bg-transparent px-4 py-2 shadow-none focus-visible:border-0 focus-visible:ring-0"
            placeholder="Password"
            autoComplete="current-password"
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
          disabled={isLoading}
          className="mt-4 h-auto w-full py-2 font-medium hover:bg-[#e64e00]"
        >
          {isLoading && <Loader className="size-4 animate-spin opacity-80" />}
          Login
        </Button>
      </form>
      <div className="mt-3 flex w-full items-center justify-center">
        <span className="text-sm">
          Don&apos;t have an account?{" "}
          <Button
            type="button"
            variant="link"
            onClick={() => router.push("/register")}
            className="h-auto p-0 text-primary"
          >
            Sign up
          </Button>
        </span>
      </div>
    </div>
  );
};

export default Login;
