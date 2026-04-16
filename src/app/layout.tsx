import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Football Tracker",
  description: "Track football match expenses and player balances",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-100 min-h-screen`}>
        <Sidebar />
        <main className="md:ml-60 min-h-screen">
          <div className="px-6 py-7 pb-24 md:pb-8 max-w-5xl mx-auto">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
