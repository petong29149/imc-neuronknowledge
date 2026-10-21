import React from "react";
import type { Metadata } from "next";
import ChatInterface from "@/components/chat/ChatInterface";

export const metadata: Metadata = {
  title: "Test console",
};

export default function ChatPage() {
  return <ChatInterface />;
}
