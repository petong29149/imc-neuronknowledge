import type { Metadata } from "next";
import ConnectionsPage from "@/components/studio/connections/ConnectionsPage";

export const metadata: Metadata = {
  title: "Data Connections",
};

export default function StudioConnectionsPage() {
  return <ConnectionsPage />;
}
