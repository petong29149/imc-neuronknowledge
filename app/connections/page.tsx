import type { Metadata } from "next";
import { redirect } from "next/navigation";
import UserConnectionsPage from "@/components/connections/UserConnectionsPage";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "เลือกฐานข้อมูล",
};

// Signed-in users of every role; checked here so middleware.ts (CORE-01) stays untouched.
export default async function ConnectionsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login?redirect=/connections");
  }
  return <UserConnectionsPage userName={session.name} />;
}
