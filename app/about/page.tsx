'use client';

import Link from "next/link";
import SiteShell from "../components/SiteShell";

export default function About() {
  return (
    <SiteShell>
      <main className="max-w-4xl mx-auto py-16 px-6">
        <h1 className="text-4xl font-bold text-center text-black dark:text-zinc-50 mb-8">About Ionut</h1>
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">What is Ionut?</h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-4">
            Ionut is a privacy-first cryptocurrency built for anonymous transfers and secure token management. It combines Tor access with blockchain standards, making it easy to stay private while staying on-chain.
          </p>
        </section>
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Tokenomics</h2>
          <ul className="list-disc list-inside text-lg text-zinc-600 dark:text-zinc-400 space-y-2">
            <li><strong>Total Supply:</strong> 1.5 billion IONUT</li>
            <li><strong>Max Circulating:</strong> 1 billion IONUT</li>
            <li><strong>Contract:</strong> ERC-20 compatible with OpenZeppelin best practices</li>
          </ul>
        </section>
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Inspired by privacy-first tools</h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Ionut is inspired by trusted privacy applications such as Tor Browser, Monero, and Electrum. It blends anonymous access, local wallet safety, and a simple transaction flow for users who value privacy and usability.
          </p>
        </section>
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Core Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-3xl bg-white dark:bg-zinc-800 p-6 shadow-lg ring-1 ring-zinc-100 dark:ring-zinc-800">
              <h3 className="text-xl font-medium mb-2">Privacy First</h3>
              <p>Access the network through Tor and keep your transaction data private.</p>
            </div>
            <div className="rounded-3xl bg-white dark:bg-zinc-800 p-6 shadow-lg ring-1 ring-zinc-100 dark:ring-zinc-800">
              <h3 className="text-xl font-medium mb-2">Secure Wallets</h3>
              <p>Generate wallets locally with encrypted keys and mnemonic recovery.</p>
            </div>
            <div className="rounded-3xl bg-white dark:bg-zinc-800 p-6 shadow-lg ring-1 ring-zinc-100 dark:ring-zinc-800">
              <h3 className="text-xl font-medium mb-2">Decentralized</h3>
              <p>No central control—community-driven and blockchain-powered.</p>
            </div>
            <div className="rounded-3xl bg-white dark:bg-zinc-800 p-6 shadow-lg ring-1 ring-zinc-100 dark:ring-zinc-800">
              <h3 className="text-xl font-medium mb-2">Future Ready</h3>
              <p>Built to scale with token utilities and privacy-first integrations.</p>
            </div>
          </div>
        </section>
        <section>
          <h2 className="text-2xl font-semibold mb-4">Roadmap</h2>
          <ul className="list-decimal list-inside text-lg text-zinc-600 dark:text-zinc-400 space-y-2">
            <li>Q1 2026: Launch and core wallet support</li>
            <li>Q2 2026: Tor hidden service and secure wallet tooling</li>
            <li>Q3 2026: Mobile wallet and community features</li>
            <li>Q4 2026: Exchange access and wider adoption</li>
          </ul>
        </section>
        <div className="text-center mt-12">
          <Link href="/wallet" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-black px-6 text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200">
            Get Started with a Wallet
          </Link>
        </div>
      </main>
    </SiteShell>
  );
}
