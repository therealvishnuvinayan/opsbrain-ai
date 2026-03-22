import NextAuth, { type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";

import { isGoogleOAuthConfigured, usePrismaAuthAdapter } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

if (!process.env.NEXTAUTH_URL?.trim()) {
  process.env.NEXTAUTH_URL = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";
}

const providers: NextAuthOptions["providers"] = [
  Credentials({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        return null;
      }

      const email = String(credentials.email).toLowerCase().trim();
      const password = String(credentials.password);

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user?.passwordHash) {
        return null;
      }

      const passwordIsValid = await verifyPassword(password, user.passwordHash);

      if (!passwordIsValid) {
        return null;
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      };
    },
  }),
];

if (isGoogleOAuthConfigured) {
  providers.unshift(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    })
  );
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
    verifyRequest: "/auth/verify",
  },
  providers,
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }

      return session;
    },
  },
};

if (usePrismaAuthAdapter) {
  authOptions.adapter = PrismaAdapter(prisma);
}
