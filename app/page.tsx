"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SiteShell from "./components/SiteShell";
import { useAccount } from "./components/AccountProvider";

const BASE_USD = 0.1;
const MIN_USD = 0.08;
const MAX_USD = 0.22;
const PRICE_UPDATE_MS = 5000;
const PRICE_VOLATILITY = 0.0018;
const PRICE_BIAS_SCALE = 0.000015;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function Home() {
  const [usdPrice, setUsdPrice] = useState(BASE_USD);
  const [usdChange, setUsdChange] = useState(0);
  const [onionUrl, setOnionUrl] = useState<string | null>(null);
  const [onionStatus, setOnionStatus] = useState('Checking hidden service...');
  const [onionLoading, setOnionLoading] = useState(true);
  const { account } = useAccount();

  const normalizeOnionHostname = (url: string) => url.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const getTor2WebUrl = (hostname: string) => `https://onion.to/${hostname}`;

  useEffect(() => {
    const saved = window.localStorage.getItem("tickcoin_usd_price");
    const parsed = saved ? parseFloat(saved) : BASE_USD;
    setUsdPrice(clamp(Number.isFinite(parsed) ? parsed : BASE_USD, MIN_USD, MAX_USD));
  }, []);

  useEffect(() => {
    const fetchOnion = async () => {
      try {
        const res = await fetch('/api/hidden-service');
        if (!res.ok) {
          setOnionStatus('Hidden service unavailable. Run `npm run host:onion` to configure Tor hosting.');
          setOnionUrl(null);
          return;
        }

        const data = await res.json();
        if (data?.onionUrl) {
          setOnionUrl(data.onionUrl);
          setOnionStatus('Tor hidden service detected. Open with Tor Browser.');
        } else {
          setOnionStatus('Hidden service not configured. Run `npm run host:onion` to configure Tor hosting.');
        }
      } catch {
        setOnionStatus('Unable to detect hidden service. Ensure Tor is installed and running.');
      } finally {
        setOnionLoading(false);
      }
    };

    fetchOnion();

    const tick = () => {
      const balance = account?.balance ?? 0;

      setUsdPrice((previous) => {
        const usageBias = clamp(balance * PRICE_BIAS_SCALE, 0, 0.003);
        const volatility = (Math.random() - 0.5) * PRICE_VOLATILITY;
        const next = clamp(previous * (1 + volatility + usageBias), MIN_USD, MAX_USD);
        const delta = Number((next - previous).toFixed(4));
        setUsdChange(delta);
        window.localStorage.setItem("tickcoin_usd_price", next.toFixed(4));
        return next;
      });
    };

    const interval = window.setInterval(tick, PRICE_UPDATE_MS);
    return () => window.clearInterval(interval);
  }, [account]);

  return (
    <SiteShell>
      <main className="relative flex flex-col items-center py-20 px-6">
        <div className="relative z-10 max-w-4xl rounded-[2rem] bg-white/90 p-10 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.45)] ring-1 ring-slate-200 dark:bg-zinc-950/85 dark:ring-white/10">
          <div className="mb-8 flex flex-col items-center gap-4 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-slate-900 text-3xl text-white shadow-lg dark:bg-slate-100 dark:text-slate-950">
              ₿
            </div>
            <h1 className="text-5xl font-bold tracking-tight text-slate-950 dark:text-white">TickCoin: Private crypto, hosted on Tor.</h1>
            <p className="max-w-2xl text-lg text-slate-600 dark:text-slate-300">
              Secure wallet generation, anonymous social sharing, and browser mining that keeps your hidden service live. All built for privacy and ease of use.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] mb-10">
            <div className="rounded-[1.75rem] bg-slate-950 p-8 text-white shadow-2xl ring-1 ring-white/10">
              <p className="text-xs uppercase tracking-[0.45em] text-slate-400">Live TickCoin Price</p>
              <p className="mt-4 text-5xl font-semibold">${usdPrice.toFixed(2)}</p>
              <p className={`mt-3 text-sm font-medium ${usdChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {usdChange >= 0 ? '+' : ''}{usdChange.toFixed(2)} USD since last update
              </p>
              <div className="mt-6 rounded-3xl bg-white/10 p-5 text-left text-slate-200 ring-1 ring-white/10">
                <p className="font-semibold text-sm uppercase tracking-[0.3em] text-slate-400">Hidden Service</p>
                {onionUrl ? (
                  <>
                    <p className="mt-3 break-all text-blue-300"><a href={onionUrl} target="_blank" rel="noopener noreferrer">{normalizeOnionHostname(onionUrl)}</a></p>
                    <p className="mt-3 text-sm text-slate-400">
                      Open in Tor Browser, or use{' '}
                      <a href={getTor2WebUrl(normalizeOnionHostname(onionUrl))} target="_blank" rel="noopener noreferrer" className="text-blue-300 underline">
                        Tor2Web
                      </a>{' '}
                      if needed.
                    </p>
                  </>
                ) : (
                  <p className="mt-3 text-sm text-slate-400">{onionLoading ? 'Checking hidden service...' : onionStatus}</p>
                )}
              </div>
              <div className="mt-6 rounded-[1.5rem] bg-purple-50 p-5 text-slate-950 dark:bg-purple-950/20 dark:text-purple-100 ring-1 ring-purple-200 dark:ring-purple-500/20">
                <p className="text-xs uppercase tracking-[0.35em] text-purple-600 dark:text-purple-300">Account Pulse</p>
                {account ? (
                  <div className="mt-4 space-y-2 text-sm">
                    <p className="font-semibold text-slate-950 dark:text-white">Welcome back{account.username ? `, ${account.username}` : ''}.</p>
                    <p>Your saved balance is <span className="font-semibold text-purple-700 dark:text-purple-200">{account.balance.toFixed(2)} TICK</span>.</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">This value updates live when mining or receiving funds.</p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-400">
                    <p>No account loaded yet.</p>
                    <p>Create an account to save your mined balance and keep it synchronized across sessions.</p>
                  </div>
                )}
              </div>
            </div>
            <div className="rounded-[1.75rem] bg-slate-50 p-8 text-slate-900 shadow-xl ring-1 ring-slate-200 dark:bg-zinc-900 dark:text-slate-100 dark:ring-white/10">
              <p className="text-xs uppercase tracking-[0.45em] text-slate-500 dark:text-slate-400">Privacy-first network</p>
              <h2 className="mt-4 text-2xl font-semibold">Built for secure, anonymous access</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-400">
                TickCoin combines browser wallet creation, on-chain simulation, social sharing, and Tor hidden service discovery in one polished experience.
              </p>
              <div className="mt-6 space-y-3 text-sm text-slate-600 dark:text-slate-400">
                <p>• Browser mining keeps your .onion site alive.</p>
                <p>• Generate wallets locally with private key safety.</p>
                <p>• Anonymous feed, chat, and account tools in one app.</p>
              </div>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-10">
            {[
              { title: 'Anonymous Transactions', description: 'Send and receive without exposing your identity.' },
              { title: 'Tor Hosting', description: 'Keep your service reachable through a hidden service.' },
              { title: 'Secure Wallets', description: 'Create local wallets with private keys and mnemonics.' },
              { title: 'Live Chat', description: 'Join the TickCoin community and chat securely.' }
            ].map((item) => (
              <div key={item.title} className="rounded-[1.5rem] bg-white p-6 shadow-lg ring-1 ring-slate-200 dark:bg-zinc-900 dark:ring-zinc-800">
                <h3 className="text-lg font-semibold mb-2 text-slate-950 dark:text-white">{item.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/wallet" className="inline-flex min-w-[180px] items-center justify-center rounded-full bg-purple-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-purple-700 focus:outline-none focus:ring-4 focus:ring-purple-300 dark:focus:ring-purple-500">
              Generate Wallet
            </Link>
            <Link href="/account" className="inline-flex min-w-[180px] items-center justify-center rounded-full border border-purple-600 px-6 py-3 text-sm font-semibold text-purple-600 transition hover:bg-purple-600 hover:text-white dark:border-purple-400 dark:text-purple-200 dark:hover:bg-purple-500 dark:hover:text-white">
              Create Account
            </Link>
            <Link href="/dashboard" className="inline-flex min-w-[180px] items-center justify-center rounded-full bg-purple-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-purple-700 focus:outline-none focus:ring-4 focus:ring-purple-300 dark:focus:ring-purple-500">
              Start Mining
            </Link>
          </div>
        </div>
      </main>
    </SiteShell>
  );
}
