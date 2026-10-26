import type { Metadata } from "next";
import { Anuphan, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./theme-provider";
import { AuthProvider } from "@/context/AuthContext";

const anuphan = Anuphan({
  weight: ["100", "200", "300", "400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  variable: "--font-anuphan",
  display: "swap",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NeuronKnowledge | MCP Server & Knowledge Hub",
  description: "ศูนย์กลาง MCP Server และคลังความรู้สำหรับ AI Agent ขององค์กร รวม MCP Tools และ Ready Knowledge ของ IMC Institute ให้ระบบแชทและ MCP client อื่นเรียกใช้ พร้อมแหล่งอ้างอิงที่ตรวจสอบย้อนกลับได้",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="th"
      suppressHydrationWarning
      className={`${anuphan.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="min-h-screen flex flex-col font-sans selection:bg-[#0055fa] selection:text-white bg-white dark:bg-[#060911] text-slate-900 dark:text-slate-100 transition-colors duration-200">
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
