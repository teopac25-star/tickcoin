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
}

const DIFFICULTY_PREFIX = '0000';
const BATCH_SIZE = 12;

function getSubtleCrypto(): SubtleCrypto | null {
  const globalCrypto = window.crypto || (window as any).msCrypto;
  return globalCrypto?.subtle || (globalCrypto as any).webkitSubtle || null;
}

async function sha256(message: string): Promise<string> {
  const subtle = getSubtleCrypto();
  if (subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  return jsSha256(message);
}

function jsSha256(message: string) {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
    0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
    0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
    0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
    0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
    0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  const encoder = new TextEncoder();
  const messageBytes = Array.from(encoder.encode(message));
  const bitLength = messageBytes.length * 8;

  messageBytes.push(0x80);
  while ((messageBytes.length % 64) !== 56) {
    messageBytes.push(0x00);
  }

  const lengthArray = new Uint8Array(8);
  const dataView = new DataView(lengthArray.buffer);
  dataView.setUint32(4, bitLength >>> 0, false);
  dataView.setUint32(0, Math.floor(bitLength / 0x100000000), false);
  messageBytes.push(...lengthArray);

  const H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  const W = new Array(64).fill(0);

  for (let i = 0; i < messageBytes.length; i += 64) {
    for (let t = 0; t < 16; t += 1) {
      const j = i + t * 4;
      W[t] = (messageBytes[j] << 24) | (messageBytes[j + 1] << 16) | (messageBytes[j + 2] << 8) | (messageBytes[j + 3]);
    }
    for (let t = 16; t < 64; t += 1) {
      const s0 = rightRotate(W[t - 15], 7) ^ rightRotate(W[t - 15], 18) ^ (W[t - 15] >>> 3);
      const s1 = rightRotate(W[t - 2], 17) ^ rightRotate(W[t - 2], 19) ^ (W[t - 2] >>> 10);
      W[t] = (W[t - 16] + s0 + W[t - 7] + s1) >>> 0;
    }

    let a = H[0];
    let b = H[1];
    let c = H[2];
    let d = H[3];
    let e = H[4];
    let f = H[5];
    let g = H[6];
    let h = H[7];

    for (let t = 0; t < 64; t += 1) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[t] + W[t]) >>> 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    H[0] = (H[0] + a) >>> 0;
    H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0;
    H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0;
    H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0;
    H[7] = (H[7] + h) >>> 0;
  }

  return H.map((value) => value.toString(16).padStart(8, '0')).join('');
}

function rightRotate(value: number, amount: number) {
  return (value >>> amount) | (value << (32 - amount));
}

export default function DashboardPage() {
  const { account, setAccount, updateAccount } = useAccount();
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
  const [selectedBlockIndex, setSelectedBlockIndex] = useState(0);

  const workerRef = useRef<Worker | null>(null);
  const lastStatsRef = useRef(0);

  const consentStatus = minerConsent
    ? 'Consent enabled — your browser may mine while this page is active.'
    : 'Consent required before mining can begin.';

  useEffect(() => {
    const savedConsent = localStorage.getItem(MINER_CONSENT_KEY);
    setMinerConsent(savedConsent === 'true');
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

  useEffect(() => {
    fetchHostStatus();
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

    const worker = new Worker(new URL('./miner.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    lastStatsRef.current = performance.now();
    setHashRate(0);
    setHashes(0);
    setMined(0);
    setStatus('Mining in browser...');

    worker.onmessage = (event: MessageEvent<any>) => {
      const message = event.data;

      if (message.type === 'stats') {
        setHashRate(message.hashRate ?? 0);
        setHashes((prev) => prev + (message.hashes ?? 0));
      }

      if (message.type === 'found') {
        setMined((previous) => parseFloat((previous + 0.01).toFixed(2)));
        setChain((currentChain) => {
          const previousHash = currentChain.length ? currentChain[currentChain.length - 1].hash : '0'.repeat(64);
          const newBlock: Block = {
            index: currentChain.length + 1,
            timestamp: new Date().toISOString(),
            nonce: message.nonce,
            hash: message.hash,
            previousHash,
            reward: 0.01,
            difficulty: DIFFICULTY_PREFIX,
          };
          return [...currentChain, newBlock];
        });
        setSelectedBlockIndex((currentIndex) => Math.max(currentIndex, 0));
        updateAccount((prevAccount) => {
          if (!prevAccount) return prevAccount;
          return {
            ...prevAccount,
            balance: parseFloat((prevAccount.balance + 0.01).toFixed(2)),
          };
        });
      }
    };

    worker.postMessage({ type: 'start', base: `ionut-browser-mining-${Math.round(Date.now() / 1000)}`, difficulty: DIFFICULTY_PREFIX, batchSize: BATCH_SIZE });

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

  const handleToggleMining = () => {
    if (mining) {
      stopMining('Mining stopped.');
      return;
    }

    if (!minerConsent) {
      setStatus('Enable CPU mining consent before starting.');
      return;
    }

    setMining(true);
    setStatus('Starting miner...');
    ensureHiddenService();
  };

  return (
    <SiteShell>
      <main className="max-w-4xl mx-auto py-16 px-6">
        <h1 className="text-3xl font-bold text-center text-black dark:text-zinc-50 mb-8">Browser Miner</h1>

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
                <span>{mined.toFixed(2)} IONUT</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleMining}
              className="mt-6 w-full rounded-full bg-black px-5 py-3 text-white transition hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
            >
              {mining ? 'Stop Mining' : 'Start Mining'}
            </button>
          </div>

          <div className="bg-white dark:bg-zinc-800 p-6 rounded-3xl shadow-lg ring-1 ring-zinc-100 dark:ring-zinc-800">
            <h2 className="text-xl font-semibold mb-4">Mobile & Cross-Platform Ready</h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              This miner runs entirely in your browser, so it works on desktop, laptop, tablet, and mobile devices. No native installation is required.
            </p>
            <ul className="list-disc list-inside text-sm space-y-2 text-zinc-600 dark:text-zinc-400">
              <li>Works on Windows, macOS, Linux, Android, and iOS.</li>
              <li>Uses Web Crypto API when available, with a software fallback when needed.</li>
              <li>Runs inside the browser, no download needed.</li>
              <li>Mining continues only while the page is open and active.</li>
            </ul>
          </div>
        </div>

        {account ? (
          <div className="bg-white dark:bg-zinc-800 p-6 rounded-3xl shadow-lg ring-1 ring-zinc-100 dark:ring-zinc-800 mb-8">
            <h2 className="text-xl font-semibold mb-4">Account Balance</h2>
            <p><strong>Username:</strong> {account.username}</p>
            <p><strong>Email:</strong> {account.email}</p>
            <p><strong>Balance:</strong> {account.balance.toFixed(2)} IONUT</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-800 p-6 rounded-3xl shadow-lg ring-1 ring-zinc-100 dark:ring-zinc-800 mb-8">
            <h2 className="text-xl font-semibold mb-4">No account loaded</h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">Create an account on the Account page to save your mined balance and transfer funds.</p>
            <Link href="/account" className="inline-flex px-4 py-2 rounded-full bg-blue-600 text-white hover:bg-blue-700">Create Account</Link>
          </div>
        )}

        <div className="bg-white dark:bg-zinc-800 p-6 rounded-3xl shadow-lg ring-1 ring-zinc-100 dark:ring-zinc-800 mb-8">
          <h2 className="text-xl font-semibold mb-4">Flipping Blockchain</h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-4">
            Each valid proof-of-work result becomes a block in a simple browser chain. Flip through mined blocks to inspect hash, nonce, parent hash, and reward.
          </p>
          {chain.length > 0 ? (
            <>
              <div className="space-y-3 mb-4">
                <div className="rounded-3xl bg-zinc-100 p-5 dark:bg-zinc-900">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">Block #{chain[selectedBlockIndex].index}</p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">Mined at {new Date(chain[selectedBlockIndex].timestamp).toLocaleTimeString()}</p>
                    </div>
                    <span className="rounded-full bg-black px-3 py-1 text-xs font-semibold text-white dark:bg-zinc-50 dark:text-black">Reward {chain[selectedBlockIndex].reward.toFixed(2)} IONUT</span>
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
            <p className="text-sm text-zinc-600 dark:text-zinc-400">No blocks mined yet. Start mining to generate a toy chain and flip through blocks.</p>
          )}
        </div>

        <div className="bg-white dark:bg-zinc-800 p-6 rounded-3xl shadow-lg ring-1 ring-zinc-100 dark:ring-zinc-800">
          <h2 className="text-xl font-semibold mb-4">How it works</h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            The miner computes SHA-256 hashes in the browser against a lightweight difficulty target. It is built for compatibility across modern devices and browsers, not real blockchain mining. The in-browser chain is a simplified toy blockchain that flips through blocks as they are found.
          </p>
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
            Keep this tab open while mining. Mobile browsers may reduce CPU activity for battery savings.
          </p>
        </div>
      </main>
    </SiteShell>
  );
}
