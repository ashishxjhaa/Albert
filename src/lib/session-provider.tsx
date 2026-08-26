"use client";

import { SessionProvider } from "next-auth/react";
import { FC, PropsWithChildren } from "react";
import { Toaster } from "@/components/ui/sonner";

const NextAuthSessionProvider: FC<PropsWithChildren> = ({ children }) => {
  return (
    <SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus={false}>
      {children}
      <Toaster position="bottom-right" richColors theme="light" />
    </SessionProvider>
  );
};

export default NextAuthSessionProvider;
