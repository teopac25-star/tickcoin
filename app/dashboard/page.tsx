'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import SiteShell from '../components/SiteShell';
import { useAccount } from '../components/AccountProvider';

const MINER_CONSENT_KEY = 'ionut_miner_consent';

interface Block {
  index: number;
  timestamp: string;
  nonce: number;
  hash: string;
  previousHash: string;
  reward: number;
  difficulty: string;
  data: string;
  chainName: string;
}

interface ChainTemplate {
  chainName: string;
  difficulty: string;
  previousHash: string;
  index: number;
  timestamp: string;
  data: string;
  base: string;
}

const DIFFICULTY_PREFIX = '0000';
const BATCH_SIZE = 12;



export default function DashboardPage() {
  const { account, updateAccount } = useAccount();
  const [mining, setMining] = useState(false);
  const [minerConsent, setMinerConsent] = useState(false);
  const [hashRate, setHashRate] = useState(0);
  const [hashes, setHashes] = useState(0);
  const [mined, setMined] = useState(0);
  const [status, setStatus] = useState('Ready to mine.');
  const [hostingStatus, setHostingStatus] = useState('Hidden service status unknown.');
  const [hostingActive, setHostingActive] = useState(false);
    const [onionUrl, setOnionUrl] = useState<string | null>(null);
  const [hostingBusy, setHostingBusy] = useState(false);
  const [chain, setChain] = useState<Block[]>([]);
  const [chainName, setChainName] = useState('TickCoin Private Chain');
  const [template, setTemplate] = useState<ChainTemplate | null>(null);
  const [selectedBlockIndex, setSelectedBlockIndex] = useState(0);

  const workerRef = useRef<Worker | null>(null);
  const lastStatsRef = useRef(0);

  const consentStatus = minerConsent
    ? 'Consent enabled — your browser may mine while this page is active.'
    : 'Consent required before mining can begin.';

  useEffect(() => {
    const savedConsent = localStorage.getItem(MINER_CONSENT_KEY);
    setMinerConsent(savedConsent === 'true');

    async function loadChain() {
      try {
        const response = await fetch('/api/blockchain');
        if (!response.ok) {
          throw new Error('Unable to load chain');
        }
        const data = await response.json();
        setChain(Array.isArray(data.blocks) ? data.blocks.reverse() : []);
        setChainName(String(data.chainName || 'TickCoin Private Chain'));
        setSelectedBlockIndex(data.blocks?.length ? data.blocks.length - 1 : 0);
      } catch {
        setChain([]);
      }
    }

    loadChain();
    fetchTemplate().then(setTemplate).catch(() => {
      setStatus('Unable to fetch block template on page load.');
    });
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && mining) {
        stopMining('Mining paused while tab is hidden to save CPU.');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [mining]);

  const fetchHostStatus = async () => {
    try {
      const response = await fetch('/api/host');
      const data = await response.json();
      setHostingActive(Boolean(data?.active));
      setOnionUrl(data?.onion ?? null);
      setHostingStatus(data?.message ?? 'Unknown hidden service status.');
    } catch {
      setHostingActive(false);
      setOnionUrl(null);
      setHostingStatus('Unable to fetch hidden service status.');
    }
  };

  const ensureHiddenService = async () => {
    setHostingBusy(true);
    try {
      const response = await fetch('/api/host', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ensure' }),
      });
      const data = await response.json();
      setHostingActive(Boolean(data?.active));
      setOnionUrl(data?.onion ?? null);
      setHostingStatus(data?.message ?? 'Hidden service activation requested.');
    } catch {
      setHostingActive(false);
      setOnionUrl(null);
      setHostingStatus('Unable to request hidden service startup.');
    } finally {
      setHostingBusy(false);
    }
  };

  const updateChainNameOnServer = async (nextName: string) => {
    setChainName(nextName);
    try {
      const response = await fetch('/api/blockchain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setName', chainName: nextName }),
      });
      if (!response.ok) {
        throw new Error('Unable to update chain name.');
      }
      const data = await response.json();
      if (Array.isArray(data.chain?.blocks)) {
        setChain(data.chain.blocks.reverse());
        setSelectedBlockIndex(data.chain.blocks.length - 1);
      }
    } catch {
      setStatus('Unable to update chain name on the server.');
    }
  };

  const resetServerChain = async () => {
    if (mining) {
      stopMining('Stopping mining before chain reset.');
    }
    setStatus('Resetting private blockchain...');
    try {
      const response = await fetch('/api/blockchain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset', chainName }),
      });
      if (!response.ok) {
        throw new Error('Unable to reset chain.');
      }
      const data = await response.json();
      if (Array.isArray(data.chain?.blocks)) {
        setChain(data.chain.blocks.reverse());
        setSelectedBlockIndex(data.chain.blocks.length - 1);
      }
      setStatus('Private blockchain reset. Mine the next valid block.');
    } catch {
      setStatus('Unable to reset the chain on the server.');
    }
  };

  const loadChain = async () => {
    try {
      const response = await fetch('/api/blockchain');
      if (!response.ok) {
        throw new Error('Unable to load chain');
      }
      const data = await response.json();
      setChain(Array.isArray(data.blocks) ? data.blocks.reverse() : []);
      setChainName(String(data.chainName || 'TickCoin Private Chain'));
      setSelectedBlockIndex(data.blocks?.length ? data.blocks.length - 1 : 0);
    } catch {
      setChain([]);
    }
  };

  const fetchTemplate = async () => {
    const response = await fetch('/api/blockchain?template=true');
    if (!response.ok) {
      throw new Error('Unable to get block template.');
    }
    const data = await response.json();
    return data as ChainTemplate;
  };

  const submitCandidate = async (nonce: number, hash: string) => {
    if (!template) {
      throw new Error('No mining template available.');
    }

    const response = await fetch('/api/blockchain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'submit',
        block: {
          chainName: template.chainName,
          previousHash: template.previousHash,
          index: template.index,
          timestamp: template.timestamp,
          data: template.data,
          base: template.base,
          nonce,
          hash,
        },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.message || 'Block rejected.');
    }
    return data as { success: true; chain: { blocks: Block[]; chainName: string } };
  };

  useEffect(() => {
    fetchHostStatus();
    loadChain();
  }, []);

  const stopMining = (message: string) => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'stop' });
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setMining(false);
    setStatus(message);
  };

  useEffect(() => {
    if (!mining) {
      return;
    }

    if (!minerConsent) {
      setStatus('Consent is required before mining can start.');
      setMining(false);
      return;
    }

    if (!window.Worker) {
      setStatus('Web Workers are not supported in this browser.');
      setMining(false);
      return;
    }

    if (!template) {
      setStatus('Waiting for a block template before mining.');
      setMining(false);
      return;
    }

    const worker = new Worker(new URL('./miner.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    lastStatsRef.current = performance.now();
    setHashRate(0);
    setHashes(0);
    setMined(0);
    setStatus('Mining in browser...');

    worker.onmessage = async (event: MessageEvent<unknown>) => {
      const message = event.data as Record<string, unknown>;

      if (message.type === 'stats') {
        setHashRate(typeof message.hashRate === 'number' ? message.hashRate : 0);
        setHashes((prev) => prev + (typeof message.hashes === 'number' ? message.hashes : 0));
      }

      if (message.type === 'found') {
        setMined((previous) => parseFloat((previous + 0.01).toFixed(2)));
        const nonce = typeof message.nonce === 'number' ? message.nonce : 0;
        const hash = typeof message.hash === 'string' ? message.hash : '';

        try {
          const result = await submitCandidate(nonce, hash);
          setChain(Array.isArray(result.chain.blocks) ? result.chain.blocks.reverse() : []);
          setChainName(result.chain.chainName);
          setSelectedBlockIndex(result.chain.blocks.length - 1);
          updateAccount((prevAccount) => {
            if (!prevAccount) return prevAccount;
            return {
              ...prevAccount,
              balance: parseFloat((prevAccount.balance + 0.01).toFixed(2)),
            };
          });
          setStatus(`Block accepted on chain ${result.chain.chainName}.`);
        } catch (error: unknown) {
          const messageText = error instanceof Error ? error.message : String(error);
          stopMining(`Block rejected: ${messageText}`);
        }
      }
    };

    worker.postMessage({ type: 'start', base: template.base, difficulty: template.difficulty, batchSize: BATCH_SIZE });

    return () => {
      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'stop' });
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [mining, minerConsent, updateAccount]);

  const handleConsentChange = () => {
    const nextConsent = !minerConsent;
    setMinerConsent(nextConsent);
    localStorage.setItem(MINER_CONSENT_KEY, nextConsent ? 'true' : 'false');

    if (!nextConsent && mining) {
      stopMining('Mining stopped because consent was revoked.');
    }
  };

  const handleToggleMining = async () => {
    if (mining) {
      stopMining('Mining stopped.');
      return;
    }

    if (!minerConsent) {
      setStatus('Enable CPU mining consent before starting.');
      return;
    }

    setStatus('Fetching mining template...');
    try {
      const latestTemplate = await fetchTemplate();
      setTemplate(latestTemplate);
      setMining(true);
      setStatus('Starting miner...');
      ensureHiddenService();
    } catch {
      setStatus('Unable to fetch mining template. Try again later.');
    }
  };

  return (
    <SiteShell>
      <main className="max-w-4xl mx-auto py-16 px-6">
        <h1 className="text-3xl font-bold text-center text-black dark:text-zinc-50 mb-8">Private SHA-256 Blockchain Miner</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-zinc-800 p-6 rounded-3xl shadow-lg ring-1 ring-zinc-100 dark:ring-zinc-800">
            <h2 className="text-xl font-semibold mb-4">Miner Status</h2>
            <p className="mb-3 text-zinc-600 dark:text-zinc-400">{status}</p>
            <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
              {hostingBusy ? 'Checking or starting hidden service...' : hostingStatus}
            </p>
            <p className="mb-3">
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${minerConsent ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'}`}>
                {minerConsent ? 'Consent enabled' : 'Consent required'}
              </span>
            </p>
            <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">{consentStatus}</p>
            {onionUrl ? (
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400 break-all">
                <a href={onionUrl} target="_blank" rel="noreferrer">{onionUrl}</a>
              </p>
            ) : null}
            <label className="mt-4 flex items-start gap-3 text-sm text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={minerConsent}
                onChange={handleConsentChange}
                className="mt-1 h-4 w-4 rounded border-zinc-300 text-black dark:text-zinc-50"
              />
              <span>
                I consent to use my browser CPU for mining while this page is active.
              </span>
            </label>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-zinc-700 dark:text-zinc-300">
                <span>Hashes computed</span>
                <span>{hashes.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-zinc-700 dark:text-zinc-300">
                <span>Hash rate</span>
                <span>{hashRate} H/s</span>
              </div>
              <div className="flex items-center justify-between text-sm text-zinc-700 dark:text-zinc-300">
                <span>Estimated reward</span>
                <span>{mined.toFixed(2)} TICK</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleMining}
              className="mt-6 w-full rounded-full bg-orange-500 px-5 py-3 text-white transition hover:bg-orange-600"
            >
              {mining ? 'Stop Mining' : 'Start Mining'}
            </button>
          </div>

          <div className="bg-white dark:bg-zinc-800 p-6 rounded-3xl shadow-lg ring-1 ring-zinc-100 dark:ring-zinc-800">
            <h2 className="text-xl font-semibold mb-4">Browser Mining for a Private Chain</h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              This miner runs in your browser and submits valid SHA-256 proofs to a private blockchain backend. It is a local network experience rather than a live Bitcoin network.
            </p>
            <ul className="list-disc list-inside text-sm space-y-2 text-zinc-600 dark:text-zinc-400">
              <li>Works on Windows, macOS, Linux, Android, and iOS.</li>
              <li>Uses Web Crypto SHA-256 when available, falling back to a software implementation.</li>
              <li>Runs inside the browser, no native installation needed.</li>
              <li>Mining continues only while the page is open and active.</li>
            </ul>
          </div>
        </div>

        {account ? (
          <div className="bg-white dark:bg-zinc-800 p-6 rounded-3xl shadow-lg ring-1 ring-zinc-100 dark:ring-zinc-800 mb-8">
            <h2 className="text-xl font-semibold mb-4">Account Balance</h2>
            <p><strong>Username:</strong> {account.username}</p>
            <p><strong>Email:</strong> {account.email}</p>
            <p><strong>Balance:</strong> {account.balance.toFixed(2)} TICK</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-800 p-6 rounded-3xl shadow-lg ring-1 ring-zinc-100 dark:ring-zinc-800 mb-8">
            <h2 className="text-xl font-semibold mb-4">No account loaded</h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">Create an account on the Account page to save your mined balance and transfer funds.</p>
            <Link href="/account" className="inline-flex px-4 py-2 rounded-full bg-blue-600 text-white hover:bg-blue-700">Create Account</Link>
          </div>
        )}

        <div className="bg-white dark:bg-zinc-800 p-6 rounded-3xl shadow-lg ring-1 ring-zinc-100 dark:ring-zinc-800 mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-4">Manage Your Private Blockchain</h2>
              <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                Each valid proof-of-work result is submitted to your private backend chain. Inspect mined blocks, verify hashes, and reset the chain whenever you want.
              </p>
            </div>
            <div className="w-full sm:w-auto">
              <label className="block text-sm text-zinc-700 dark:text-zinc-300">
                Chain name
                <input
                  value={chainName}
                  onChange={(event) => {
                    setChainName(event.target.value);
                  }}
                  onBlur={(event) => updateChainNameOnServer(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-black outline-none transition focus:border-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </label>
              <button
                type="button"
                onClick={resetServerChain}
                className="mt-4 w-full rounded-full bg-black px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
              >
                Reset Private Blockchain
              </button>
            </div>
          </div>
          {chain.length > 0 ? (
            <>
              <div className="space-y-3 mb-4">
                <div className="rounded-3xl bg-zinc-100 p-5 dark:bg-zinc-900">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">Chain: {chainName}</p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">Block #{chain[selectedBlockIndex].index}</p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">Mined at {new Date(chain[selectedBlockIndex].timestamp).toLocaleTimeString()}</p>
                    </div>
                    <span className="rounded-full bg-black px-3 py-1 text-xs font-semibold text-white dark:bg-zinc-50 dark:text-black">Reward {chain[selectedBlockIndex].reward.toFixed(2)} TICK</span>
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                    <p><strong>Nonce:</strong> {chain[selectedBlockIndex].nonce}</p>
                    <p><strong>Hash:</strong> {chain[selectedBlockIndex].hash}</p>
                    <p><strong>Previous hash:</strong> {chain[selectedBlockIndex].previousHash}</p>
                    <p><strong>Difficulty:</strong> {chain[selectedBlockIndex].difficulty}</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={selectedBlockIndex === 0}
                  onClick={() => setSelectedBlockIndex((index) => Math.max(index - 1, 0))}
                  className="inline-flex items-center justify-center rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Flip Back
                </button>
                <button
                  type="button"
                  disabled={selectedBlockIndex >= chain.length - 1}
                  onClick={() => setSelectedBlockIndex((index) => Math.min(index + 1, chain.length - 1))}
                  className="inline-flex items-center justify-center rounded-full bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
                >
                  Flip Forward
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">No blocks mined yet. Reset the private blockchain and start mining your first valid block.</p>
          )}
        </div>

        <div className="bg-white dark:bg-zinc-800 p-6 rounded-3xl shadow-lg ring-1 ring-zinc-100 dark:ring-zinc-800">
          <h2 className="text-xl font-semibold mb-4">How it works</h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            Your browser computes SHA-256 proofs against a backend block template. Valid blocks are submitted to a private chain stored on the server, giving a real chain history even after you leave the page.
          </p>
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
            Keep this tab open while mining. Mobile browsers may reduce CPU activity for battery savings.
          </p>
        </div>
      </main>
    </SiteShell>
  );
}
