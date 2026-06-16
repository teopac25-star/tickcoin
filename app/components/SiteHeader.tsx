"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import { useAccount } from "./AccountProvider";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/wallet", label: "Wallet" },
  { href: "/account", label: "Account" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/chat", label: "Chat" },
  { href: "/anonymus", label: "Anonymous" },
  { href: "/status", label: "Status" },
  { href: "/about", label: "About" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const { account } = useAccount();

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur-xl px-6 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/95">
      <div className="mx-auto flex flex-col gap-4 md:flex-row md:items-center md:justify-between max-w-[1200px]">
        <div>
          <Link href="/" className="flex items-center text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            <Image src="/wolf.svg" alt="Wolf logo" width={32} height={32} className="mr-3" />
            TickCoin
          </Link>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Privacy-first crypto with Tor hosting and browser mining.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <nav className="flex flex-wrap gap-2">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                      : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          {account?.username ? (
            <div className="hidden rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 dark:bg-zinc-800 dark:text-slate-200 md:inline-flex">
              Logged in as {account.username}
            </div>
          ) : null}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
