import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth"; // ensure this file exports a valid `authOptions` object

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
