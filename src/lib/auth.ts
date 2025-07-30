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
        try {
          if (!credentials?.email || !credentials?.password) {
            console.error("Missing email or password");
            return null;
          }

          await connectToDatabase();

          const user = await User.findOne({ email: credentials.email }).select(
            "email password firstName lastName _id isVerified"
          );

          if (!user) {
            console.error("No user found with this email");
            return null;
          }

          // NOTE: Replace this with hashed password check in production (e.g., bcrypt)
          if (credentials.password !== user.password) {
            console.error("Invalid password");
            return null;
          }

          if (!user.isVerified) {
            console.error("User not verified. Please verify your OTP.");
            return null;
          }

          return {
            id: user._id.toString(),
            email: user.email,
            firstName: user.firstName || null,
            lastName: user.lastName || null,
          };
        } catch (err) {
          console.error("Authorization error:", err);
          return null;
        }
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
    error: "/login", // receives error query param (?error=...)
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  secret: process.env.NEXTAUTH_SECRET,
};
