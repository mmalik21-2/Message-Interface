import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectToDatabase } from "./db";
import User from "@/models/User";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing email or password");
        }

        await connectToDatabase();
        const user = await User.findOne({ email: credentials.email }).select(
          "email password firstName lastName _id"
        );

        if (!user) {
          throw new Error("No user found with this email");
        }

        if (credentials.password !== user.password) {
          throw new Error("Invalid password");
        }

        return {
          id: user._id.toString(),
          email: user.email,
          firstName: user.firstName || null,
          lastName: user.lastName || null,
        };
      },
    }),
  ],

  callbacks: {
    async signIn() {
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id || token.sub;
        token.firstName = user.firstName || null;
        token.lastName = user.lastName || null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.firstName = token.firstName as string | null;
        session.user.lastName = token.lastName as string | null;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },

  secret: process.env.NEXTAUTH_SECRET,
};
