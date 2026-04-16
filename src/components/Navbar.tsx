"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Balances" },
    { href: "/players", label: "Players" },
    { href: "/matches", label: "Matches" },
  ];

  return (
    <nav className="bg-green-700 text-white shadow-lg">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="font-bold text-lg tracking-tight hover:opacity-80 transition-opacity">
            ⚽ Football Tracker
          </Link>
          <div className="flex gap-1">
            {links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? "bg-green-900 text-white"
                    : "hover:bg-green-600"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
