'use client';

import { Wallet as EthersWallet, dataSlice, getAddress, keccak256, toUtf8Bytes } from 'ethers';
import { useEffect, useState } from 'react';
import CopyField from '../components/CopyField';
import SiteShell from '../components/SiteShell';
import { useAccount } from '../components/AccountProvider';

interface Wallet {
  address: string;
  privateKey: string;
  mnemonic: string;
}

interface SavedWallet {
  address: string;
}

interface Account {
  username: string;
  email: string;
  balance: number;
  password?: string;
  wallets: SavedWallet[];
  [key: string]: unknown;
}

export default function WalletPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const { account: globalAccount, setAccount: setGlobalAccount } = useAccount() as {
    account: Account | null;
    setAccount: (account: Account | null) => void;
    updateAccount: (updater: (current: Account | null) => Account | null) => Account | null;
    clearAccount: () => void;
  };
  const [savedWallets, setSavedWallets] = useState<SavedWallet[]>([]);
  const [message, setMessage] = useState('');
  const [stealthAddress, setStealthAddress] = useState<string | null>(null);

  const saveWalletToAccount = () => {
    if (!globalAccount || !wallet) {
      setMessage('Generate a wallet and log in first to save it to your account.');
      return;
    }

    const savedWallet = { address: wallet.address };
    const updatedAccount: Account = {
      ...globalAccount,
      wallets: [...(globalAccount.wallets || []), savedWallet],
    };
    setGlobalAccount(updatedAccount);
    setSavedWallets(updatedAccount.wallets || []);
    setMessage('Wallet saved to your account. You can create more wallets or view them below.');
  };

  const generateWallet = () => {
    const newWallet = EthersWallet.createRandom();
    setWallet({
      address: newWallet.address,
      privateKey: newWallet.privateKey,
      mnemonic: newWallet.mnemonic?.phrase || '',
    });
    setStealthAddress(null);
    setMessage('A new wallet has been generated. Save it to your account if you want to keep it.');
  };

  const generateStealthAddress = () => {
    if (!wallet) {
      setMessage('Generate a wallet first to derive a stealth address.');
      return;
    }
    const entropy = keccak256(
      toUtf8Bytes(`${wallet.address}-${Date.now()}-${Math.random()}`),
    );
    const stealth = getAddress(dataSlice(entropy, 12));
    setStealthAddress(stealth);
    setMessage('Stealth address generated for one-time private receives.');
  };

  useEffect(() => {
    setSavedWallets(globalAccount?.wallets || []);
  }, [globalAccount]);

  return (
    <SiteShell>
      <main className="max-w-3xl mx-auto py-20 px-6">
        <div className="mb-12 rounded-[2rem] bg-slate-950 p-10 text-white shadow-2xl ring-1 ring-white/10">
          <p className="text-sm uppercase tracking-[0.4em] text-slate-400">Wallet studio</p>
          <h1 className="mt-4 text-4xl font-bold">Generate secure crypto wallets with privacy tools</h1>
          <p className="mt-4 max-w-2xl text-slate-300">
            Create wallets locally, save them safely, and derive stealth addresses for one-time private receives.
          </p>
        </div>
        <div className="text-center mb-8">
          <button onClick={generateWallet} className="bg-purple-600 text-white px-6 py-3 rounded-full hover:bg-purple-700 focus:outline-none focus:ring-4 focus:ring-purple-300 dark:focus:ring-purple-500 transition-colors">
            Generate New Wallet
          </button>
        </div>
        {wallet && (
          <div className="bg-white dark:bg-zinc-800 p-6 rounded-3xl shadow-lg ring-1 ring-zinc-100 dark:ring-zinc-800 mb-6">
            <h2 className="text-xl font-semibold mb-4">Your Wallet</h2>
            <div className="space-y-4">
              <CopyField label="Address" value={wallet.address} description="Public address can be shared for deposits." />
              <CopyField label="Private Key" value={wallet.privateKey} description="Keep this private and never share it." />
              <CopyField label="Mnemonic Phrase" value={wallet.mnemonic} description="Store this phrase securely for recovery." />
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={saveWalletToAccount}
                className="min-w-[160px] rounded-full bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700"
              >
                Save to Account
              </button>
              <button
                type="button"
                onClick={generateWallet}
                className="min-w-[160px] rounded-full border border-purple-600 px-5 py-3 text-sm font-medium text-purple-700 hover:bg-purple-50 dark:border-purple-400 dark:text-purple-200 dark:hover:bg-purple-950"
              >
                Generate Another
              </button>
              <button
                type="button"
                onClick={generateStealthAddress}
                className="min-w-[160px] rounded-full bg-purple-600 px-5 py-3 text-sm font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-4 focus:ring-purple-300 dark:focus:ring-purple-500"
              >
                Generate Stealth Address
              </button>
            </div>
            {stealthAddress ? (
              <div className="mt-6 rounded-3xl bg-slate-50 p-5 dark:bg-zinc-900">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Stealth address</p>
                <p className="mt-3 break-all text-sm font-mono text-slate-900 dark:text-slate-100">{stealthAddress}</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Use this one-time address to receive funds privately and avoid address reuse.</p>
              </div>
            ) : null}
          </div>
        )}
        {message && (
          <div className="mb-6 rounded-3xl bg-zinc-100 p-4 text-sm text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
            {message}
          </div>
        )}
        {savedWallets.length > 0 && (
          <div className="bg-white dark:bg-zinc-800 p-6 rounded-3xl shadow-lg ring-1 ring-zinc-100 dark:ring-zinc-800">
            <h2 className="text-xl font-semibold mb-4">Saved Wallets</h2>
            <div className="space-y-4">
              {savedWallets.map((saved, index) => (
                <div key={`${saved.address}-${index}`} className="rounded-3xl bg-zinc-100 p-4 dark:bg-zinc-900">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">Wallet #{index + 1}</p>
                  <p className="mt-2 text-sm break-all"><strong>Address:</strong> {saved.address}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </SiteShell>
  );
}
