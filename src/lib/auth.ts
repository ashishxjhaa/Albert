import { db } from "@/lib/db/drizzle";
import { AuthProvider, users } from "@/lib/db/schema";
import { getUserByEmail } from "@/lib/db/user";
import { comparePasswords } from "@/lib/password";
import { authConfig } from "@/lib/auth.config";
import { eq } from "drizzle-orm";
import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

type ActiveWorkspace = {
  id: string;
  name: string;
  slug: string;
};

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      activeWorkspace: ActiveWorkspace | null;
    } & DefaultSession["user"];
  }

  interface JWT {
    id?: string;
    activeWorkspace?: ActiveWorkspace | null;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) {
          return null;
        }

        const user = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (!user[0]?.passwordHash) {
          return null;
        }

        const passwordMatch = await comparePasswords(
          password,
          user[0].passwordHash
        );

        if (!passwordMatch) {
          return null;
        }

        return {
          id: user[0].id,
          email: user[0].email,
          name: user[0].name,
          image: user[0].image,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      try {
        if (!user.email) return false;

        const existingUser = await db
          .select()
          .from(users)
          .where(eq(users.email, user.email))
          .limit(1);

        if (!existingUser[0]) {
          await db.insert(users).values({
            email: user.email,
            name: user.name,
            image: user.image,
            ...(account && {
              authProvider: account.provider as AuthProvider,
            }),
          });
        }

        return true;
      } catch (error) {
        console.error(error);
        return false;
      }
    },
    async jwt({ token, trigger, session }) {
      if (token.email) {
        const { data } = await getUserByEmail(token.email);
        token.id = data?.id;
        token.picture = data?.image;
      }

      if (trigger === "update" && session?.user) {
        token.activeWorkspace = session.user.activeWorkspace;
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        if (typeof token.id === "string") {
          session.user.id = token.id;
        }
        if (typeof token.picture === "string") {
          session.user.image = token.picture;
        }
        session.user.activeWorkspace =
          (token.activeWorkspace as ActiveWorkspace | null | undefined) ?? null;
      }
      return session;
    },
  },
});
