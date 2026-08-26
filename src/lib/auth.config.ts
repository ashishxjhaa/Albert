import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!auth?.user;

      const isAuthPage =
        pathname.startsWith("/login") || pathname.startsWith("/register");
      const isProtected =
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/workspace") ||
        pathname.startsWith("/w/");

      if (isProtected && !isLoggedIn) {
        return Response.redirect(new URL("/login", request.nextUrl));
      }

      if (isAuthPage && isLoggedIn) {
        return Response.redirect(new URL("/workspace", request.nextUrl));
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
