'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SiteShell from '../components/SiteShell';

export default function StatusPage() {
  const [onionUrl, setOnionUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('Checking hidden service...');
  const [loading, setLoading] = useState(true);

  const normalizeOnionHostname = (url: string) => url.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const getTor2WebUrl = (hostname: string) => `https://onion.to/${hostname}`;

  useEffect(() => {
    async function fetchHiddenService() {
      try {
        const res = await fetch('/api/hidden-service');
        if (!res.ok) {
          setStatusMessage('No Tor hidden service detected. Run sudo ./full_setup.sh to host locally.');
          return;
        }

        const data = await res.json();
        if (data?.onionUrl) {
          setOnionUrl(data.onionUrl);
          setStatusMessage('Local Tor hidden service is active.');
        } else {
          setStatusMessage('Hidden service not configured. Run sudo ./full_setup.sh to host locally.');
        }
      } catch {
        setStatusMessage('Unable to detect hidden service. Ensure Tor is installed and running.');
      } finally {
        setLoading(false);
      }
    }

    fetchHiddenService();
  }, []);

  return (
    <SiteShell>
      <main className="max-w-3xl mx-auto py-20 px-6">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-slate-950 dark:text-white">System Status</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-400">Check Tor health, view your hidden service address, and keep your TickCoin host reachable.</p>
        </div>
        <div className="space-y-6">
          <div className="rounded-[1.75rem] bg-white p-6 shadow-xl ring-1 ring-slate-200 dark:bg-zinc-900 dark:ring-white/10">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold mb-2">Tor Hidden Service</h2>
                <p className="text-slate-600 dark:text-slate-400">Your .onion endpoint and hosting status are shown here.</p>
              </div>
              <span className={`rounded-full px-3 py-2 text-sm font-semibold ${onionUrl ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300'}`}>
                {loading ? 'Checking…' : onionUrl ? 'Live' : 'Inactive'}
              </span>
            </div>
            <div className="mt-5 space-y-3 text-slate-700 dark:text-slate-300">
              {onionUrl ? (
                <>
                  <p className="text-sm"><strong>.onion URL:</strong></p>
                  <p className="break-all text-blue-600 dark:text-blue-400"><a href={onionUrl} target="_blank" rel="noopener noreferrer">{normalizeOnionHostname(onionUrl)}</a></p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Open from Tor Browser, or use{' '}
                    <a href={getTor2WebUrl(normalizeOnionHostname(onionUrl))} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline">
                      Tor2Web
                    </a>{' '}
                    in a standard browser.
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">{statusMessage}</p>
              )}
            </div>
          </div>
          <div className="rounded-[1.75rem] bg-white p-6 shadow-xl ring-1 ring-slate-200 dark:bg-zinc-900 dark:ring-white/10">
            <h2 className="text-xl font-semibold mb-4">Network Overview</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl bg-slate-50 p-4 dark:bg-zinc-950">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Total Supply</p>
                <p className="mt-2 font-semibold text-slate-900 dark:text-slate-100">7.5B TICK</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4 dark:bg-zinc-950">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Circulating</p>
                <p className="mt-2 font-semibold text-slate-900 dark:text-slate-100">2.5B TICK</p>
              </div>
            </div>
            <div className="mt-5 text-sm text-slate-600 dark:text-slate-400">
              <p><strong>Contract:</strong> ERC-20 compatible token simulation.</p>
              <p><strong>Status:</strong> Live</p>
            </div>
          </div>
          <div className="rounded-[1.75rem] bg-white p-6 shadow-xl ring-1 ring-slate-200 dark:bg-zinc-900 dark:ring-white/10">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <Link href="/wallet" className="rounded-full bg-slate-950 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-slate-800">Generate Wallet</Link>
              <Link href="/dashboard" className="rounded-full bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-blue-700">Enable Mining</Link>
              <Link href="/chat" className="rounded-full border border-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-950 hover:bg-slate-100 dark:border-zinc-700 dark:text-slate-100 dark:hover:bg-zinc-800">Join Chat</Link>
            </div>
          </div>
        </div>
      </main>
    </SiteShell>
  );
}
