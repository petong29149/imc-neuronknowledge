import React from "react";
import ChatInterface from "@/components/chat/ChatInterface";

export default async function ChatSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ChatInterface initialSessionId={id} />;
}
