'use client';

import { useEffect, useState } from 'react';
import SiteShell from '../components/SiteShell';
import { useAccount } from '../components/AccountProvider';

interface Wallet {
  address: string;
  privateKey: string;
  mnemonic: string;
}

interface AccountMessage {
  id: string;
  sender: 'me' | 'them';
  text: string;
  createdAt: string;
}

interface TransactionEntry {
  id: string;
  type: 'sent' | 'received';
  amount: number;
  counterparty: string;
  description: string;
  timestamp: string;
  recipient?: string;
}

interface GlobalTransfer extends TransactionEntry {
  sender: string;
  recipient: string;
}

interface AccountNotification {
  id: string;
  type: 'message' | 'transaction';
  title: string;
  description: string;
  createdAt: string;
  read: boolean;
}

interface Account {
  username: string;
  email: string;
  balance: number;
  password?: string;
  wallets: Wallet[];
  messages: AccountMessage[];
  transactions: TransactionEntry[];
  notifications: AccountNotification[];
}

type AuthMode = 'create' | 'login';
type Step = 'form' | 'verify' | 'ready';
type AccountTab = 'overview' | 'wallets' | 'messages' | 'transactions' | 'security';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SESSION_KEY = 'ionut_session';

interface SessionState {
  username: string;
  token: string;
}

const getSession = (): SessionState | null => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(SESSION_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as SessionState;
  } catch {
    return null;
  }
};

const getSessionUsername = (): string | null => getSession()?.username ?? null;
const getSessionToken = (): string | null => getSession()?.token ?? null;

const saveSession = (session: SessionState) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

const clearSession = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(SESSION_KEY);
  window.localStorage.removeItem('ionut_account');
};

const bufferToBase64 = (buffer: ArrayBuffer) => {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
};

const base64ToBuffer = (base64: string) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

async function deriveEncryptionKey(password: string, salt: Uint8Array) {
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );

  const saltBuffer = salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer;
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 200000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function encryptString(value: string, password: string) {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveEncryptionKey(password, salt);
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(value),
  );
  return `${bufferToBase64(salt.buffer)}:${bufferToBase64(iv.buffer)}:${bufferToBase64(encrypted)}`;
}

async function decryptString(payload: string, password: string) {
  const [saltB64, ivB64, dataB64] = payload.split(':');
  if (!saltB64 || !ivB64 || !dataB64) {
    throw new Error('Invalid encrypted backup format.');
  }
  const salt = new Uint8Array(base64ToBuffer(saltB64));
  const iv = new Uint8Array(base64ToBuffer(ivB64));
  const data = base64ToBuffer(dataB64);
  const key = await deriveEncryptionKey(password, salt);
  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data,
  );
  return new TextDecoder().decode(decrypted);
}

const maskEmail = (email: string) => {
  const parts = email.split('@');
  if (parts.length !== 2) return '******';
  const [local, domain] = parts;
  const visibleLocal = local.length > 1 ? `${local[0]}***${local.slice(-1)}` : '***';
  const visibleDomain = domain.length > 4 ? `${domain.slice(0, 3)}***${domain.slice(-3)}` : '***';
  return `${visibleLocal}@${visibleDomain}`;
};

const maskText = (value: string) => {
  if (value.length <= 4) return '****';
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
};

const requestAccount = async (body: any) => {
  const token = getSessionToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['x-ionut-session'] = token;
  }

  const response = await fetch('/api/account', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || 'Server error');
  }
  return data;
};

const fetchAccount = async (username: string) => {
  const token = getSessionToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['x-ionut-session'] = token;
  }

  const response = await fetch(`/api/account?username=${encodeURIComponent(username)}`, {
    headers,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || 'Unable to load account.');
  }
  return data as Account;
};

const normalizeAccount = (raw: any): Account => ({
  username: raw.username || '',
  email: raw.email || '',
  balance: typeof raw.balance === 'number' ? raw.balance : parseFloat(raw.balance) || 0,
  password: raw.password || undefined,
  wallets: Array.isArray(raw.wallets) ? raw.wallets : [],
  messages: Array.isArray(raw.messages)
    ? raw.messages.map((message: any) => ({
        id: message?.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        sender: message?.sender === 'them' ? 'them' : 'me',
        text: message?.text || '',
        createdAt: message?.createdAt || new Date().toISOString(),
      }))
    : [],
  transactions: Array.isArray(raw.transactions) ? raw.transactions : [],
  notifications: Array.isArray(raw.notifications)
    ? raw.notifications.map((notification: any) => ({
        id: notification?.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: notification?.type === 'transaction' ? 'transaction' : 'message',
        title: notification?.title || 'Notification',
        description: notification?.description || '',
        createdAt: notification?.createdAt || new Date().toISOString(),
        read: notification?.read === true,
      }))
    : [],
});

export default function AccountPage() {
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('create');
  const [step, setStep] = useState<Step>('form');
  const [section, setSection] = useState<AccountTab>('overview');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [pendingAccount, setPendingAccount] = useState<Account | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [enteredCode, setEnteredCode] = useState('');
  const [feedback, setFeedback] = useState('Choose Create Account or Login to begin.');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [messageDraft, setMessageDraft] = useState('');
  const [transactionForm, setTransactionForm] = useState({ direction: 'sent', amount: '', counterparty: '', description: '' });
  const [privacyMode, setPrivacyMode] = useState(false);
  const [backupPassword, setBackupPassword] = useState('');
  const [restorePassword, setRestorePassword] = useState('');
  const [backupMessage, setBackupMessage] = useState('');
  const { setAccount: setGlobalAccount, clearAccount: clearGlobalAccount } = useAccount() as {
    setAccount: (account: Account | null) => void;
    clearAccount: () => void;
  };

  const getStoredAccount = (): Account | null => {
    const username = getSessionUsername();
    if (!username) return null;
    return null;
  };

  const saveAccount = (account: Account) => {
    const normalized = normalizeAccount(account);
    setCurrentAccount(normalized);
    setGlobalAccount(normalized);
  };

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== 'ionut_account') return;
      if (!event.newValue) {
        setCurrentAccount(null);
        return;
      }

      try {
        setCurrentAccount(normalizeAccount(JSON.parse(event.newValue)));
      } catch {
        setCurrentAccount(null);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const downloadEncryptedBackup = async () => {
    if (!currentAccount) {
      setError('Load an account first to export a backup.');
      return;
    }
    if (!backupPassword.trim()) {
      setError('Enter a password for the encrypted backup.');
      return;
    }

    try {
      const json = JSON.stringify(currentAccount);
      const encrypted = await encryptString(json, backupPassword.trim());
      const blob = new Blob([encrypted], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `ionut-account-backup-${currentAccount.username}.txt`;
      anchor.click();
      URL.revokeObjectURL(url);
      setBackupMessage('Encrypted backup created successfully. Keep the password safe.');
      setError('');
    } catch (error: any) {
      setError(error?.message || 'Unable to create encrypted backup.');
    }
  };

  const handleRestoreBackup = async (file: File) => {
    if (!restorePassword.trim()) {
      setError('Enter the backup password before restoring.');
      return;
    }

    try {
      const payload = await file.text();
      const decrypted = await decryptString(payload, restorePassword.trim());
      const parsed = JSON.parse(decrypted);
      const restoredAccount = normalizeAccount(parsed);
      setCurrentAccount(restoredAccount);
      setGlobalAccount(restoredAccount);
      setBackupMessage('Account backup restored successfully.');
      setError('');
    } catch (error: any) {
      setError(error?.message || 'Unable to restore backup.');
    }
  };

  const GLOBAL_TRANSFER_KEY = 'ionut_global_transfers';

  const loadGlobalTransfers = (): GlobalTransfer[] => {
    const raw = localStorage.getItem(GLOBAL_TRANSFER_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      localStorage.removeItem(GLOBAL_TRANSFER_KEY);
      return [];
    }
  };

  const saveGlobalTransfers = (transfers: GlobalTransfer[]) => {
    localStorage.setItem(GLOBAL_TRANSFER_KEY, JSON.stringify(transfers));
  };

  const syncIncomingTransfers = (account: Account) => {
    const globalTransfers = loadGlobalTransfers();
    const existingIds = new Set(account.transactions.map((tx) => tx.id));
    const incoming = globalTransfers.filter((transfer) => transfer.recipient === account.username && !existingIds.has(transfer.id));
    if (incoming.length === 0) return account;

    const receivedTransactions = incoming.map((transfer) => ({
      id: transfer.id,
      type: 'received' as const,
      amount: transfer.amount,
      counterparty: transfer.sender,
      description: transfer.description || `Transfer from ${transfer.sender}`,
      timestamp: transfer.timestamp,
      recipient: transfer.recipient,
    }));

    const updated = {
      ...account,
      balance: account.balance + incoming.reduce((sum, transfer) => sum + transfer.amount, 0),
      transactions: [...receivedTransactions, ...account.transactions],
    };
    saveAccount(updated);
    return updated;
  };

  const recentRecipients = currentAccount
    ? Array.from(
        new Set(
          currentAccount.transactions
            .map((tx) => tx.recipient || tx.counterparty)
            .filter((name) => Boolean(name) && name !== currentAccount.username),
        ),
      )
    : [];

  const createNotification = (type: 'message' | 'transaction', title: string, description: string) => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type,
    title,
    description,
    createdAt: new Date().toISOString(),
    read: false,
  });

  const markAllNotificationsRead = () => {
    if (!currentAccount) return;
    const updated = {
      ...currentAccount,
      notifications: currentAccount.notifications.map((notification) => ({
        ...notification,
        read: true,
      })),
    };
    saveAccount(updated);
  };

  const unreadNotificationCount = currentAccount?.notifications.filter((notification) => !notification.read).length ?? 0;

  useEffect(() => {
    const username = getSessionUsername();
    if (!username) return;

    fetchAccount(username)
      .then((account) => {
        const normalized = normalizeAccount(account);
        saveAccount(normalized);
        syncIncomingTransfers(normalized);
        setStep('ready');
      })
      .catch(() => {
        clearSession();
      });
  }, []);

  const switchMode = (mode: AuthMode) => {
    setAuthMode(mode);
    setStep('form');
    setError('');
    setCopied(false);
    setVerificationCode('');
    setEnteredCode('');
    setFeedback(
      mode === 'create'
        ? 'Create an account with username, email, and password. You will verify by email and 2FA.'
        : 'Log in with your username and password, then confirm a one-time 2FA code sent to your email.'
    );
  };

  const createAccount = () => {
    setError('');
    setCopied(false);

    if (!form.username.trim()) {
      setError('Username is required.');
      return;
    }
    if (!EMAIL_REGEX.test(form.email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (form.password.trim().length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    const account: Account = {
      username: form.username.trim(),
      email: form.email.trim(),
      balance: 100,
      password: form.password.trim(),
      wallets: [],
      messages: [
        {
          id: `${Date.now()}-welcome`,
          sender: 'them',
          text: `Welcome to Ionut, ${form.username.trim()}. Use this chat to message support and track your account activity.`,
          createdAt: new Date().toISOString(),
        },
      ],
      transactions: [
        {
          id: `${Date.now()}-initial`,
          type: 'received',
          amount: 100,
          counterparty: 'Signup bonus',
          description: 'Welcome credit for creating your account',
          timestamp: new Date().toISOString(),
        },
      ],
      notifications: [
        {
          id: `${Date.now()}-welcome-notification`,
          type: 'message',
          title: 'Welcome to Ionut',
          description: 'Your account is ready. Track activity and messages from the notification center.',
          createdAt: new Date().toISOString(),
          read: false,
        },
      ],
    };

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setPendingAccount(account);
    setVerificationCode(code);
    setFeedback(`A verification code has been generated for ${account.email}. It is displayed below; email sending is simulated and the code can be copied directly from the page.`);
    setStep('verify');
  };

  const loginAccount = () => {
    setError('');
    setCopied(false);

    if (!loginForm.username.trim() || !loginForm.password.trim()) {
      setError('Username and password are required for login.');
      return;
    }

    const account: Account = {
      username: loginForm.username.trim(),
      email: '',
      balance: 0,
      password: loginForm.password.trim(),
      wallets: [],
      messages: [],
      transactions: [],
      notifications: [],
    };

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setPendingAccount(account);
    setVerificationCode(code);
    setFeedback(`A one-time 2FA code has been generated for ${account.email || 'your account'}. Enter it below to complete login.`);
    setStep('verify');
  };

  const verifyCode = async () => {
    setError('');
    if (enteredCode.trim() !== verificationCode) {
      setError('The verification code is invalid.');
      return;
    }
    if (!pendingAccount) {
      setError('No account pending verification.');
      return;
    }

    try {
      const result = await requestAccount(
        authMode === 'create'
          ? {
              action: 'register',
              username: pendingAccount.username,
              email: pendingAccount.email,
              password: pendingAccount.password ?? '',
            }
          : {
              action: 'login',
              username: pendingAccount.username,
              password: pendingAccount.password ?? '',
            },
      );

      const account = 'account' in result ? result.account : result;
      const normalized = normalizeAccount(account);
      if (typeof result?.token === 'string' && result.token) {
        saveSession({ username: normalized.username, token: result.token });
      }
      saveAccount(normalized);
      setPendingAccount(null);
      setEnteredCode('');
      setStep('ready');
      setFeedback('Account verified and ready.');
    } catch (err: any) {
      setError(err.message || 'Unable to verify your account.');
    }
  };

  const copyCode = async () => {
    if (!verificationCode) return;
    try {
      await navigator.clipboard.writeText(verificationCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setError('Unable to copy code automatically. Please type it manually.');
    }
  };

  const logout = () => {
    clearSession();
    clearGlobalAccount();
    setCurrentAccount(null);
    setForm({ username: '', email: '', password: '' });
    setLoginForm({ username: '', password: '' });
    setStep('form');
    setAuthMode('login');
    setFeedback('You have logged out. Log in again or create a new account.');
    setSection('overview');
  };

  const deleteAccount = async () => {
    if (currentAccount) {
      try {
        await requestAccount({ action: 'delete', username: currentAccount.username });
      } catch {
        // proceed with local cleanup even if remote delete fails
      }
    }
    clearSession();
    clearGlobalAccount();
    setCurrentAccount(null);
    setStep('form');
    setAuthMode('create');
    setFeedback('Your account session has been removed. Create a new account to continue.');
    setSection('overview');
  };

  const addMessage = () => {
    if (!currentAccount) return;
    if (!messageDraft.trim()) {
      setError('Enter a message before sending.');
      return;
    }
    const message: AccountMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      sender: 'me',
      text: messageDraft.trim(),
      createdAt: new Date().toISOString(),
    };
    const reply: AccountMessage = {
      id: `${Date.now()}-reply-${Math.random().toString(36).slice(2)}`,
      sender: 'them',
      text: `Ionut Support has received your message: "${messageDraft.trim()}". We will follow up shortly.`,
      createdAt: new Date().toISOString(),
    };
    const notification = createNotification(
      'message',
      'New message conversation',
      `You sent a new message and received an instant support reply.`,
    );
    const updated = {
      ...currentAccount,
      messages: [...currentAccount.messages, message, reply],
      notifications: [notification, ...currentAccount.notifications],
    };
    saveAccount(updated);
    setMessageDraft('');
    setError('');
    setFeedback('Message sent. Ionut Support replied instantly.');
  };

  const removeNote = (id: string) => {
    if (!currentAccount) return;
    const updated = { ...currentAccount, messages: currentAccount.messages.filter((note) => note.id !== id) };
    saveAccount(updated);
  };

  const addTransaction = async (type: 'sent' | 'received') => {
    if (!currentAccount) return;
    const amount = parseFloat(transactionForm.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    if (type === 'sent' && amount > currentAccount.balance) {
      setError('Insufficient balance for this transaction.');
      return;
    }

    const transaction: TransactionEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type,
      amount,
      counterparty: transactionForm.counterparty.trim() || 'External',
      description: transactionForm.description.trim() || (type === 'sent' ? 'Sent IONUT' : 'Received IONUT'),
      timestamp: new Date().toISOString(),
    };

    try {
      const requestBody =
        type === 'sent' && transactionForm.counterparty.trim()
          ? {
              action: 'transfer',
              username: currentAccount.username,
              recipient: transactionForm.counterparty.trim(),
              amount,
              description: transactionForm.description.trim() || `Transfer to ${transactionForm.counterparty.trim()}`,
            }
          : {
              action: 'transaction',
              username: currentAccount.username,
              transaction,
            };

      const updatedAccount = await requestAccount(requestBody);
      saveAccount(normalizeAccount(updatedAccount));
      setTransactionForm({ direction: 'sent', amount: '', counterparty: '', description: '' });
      setError('');
      setFeedback('Transaction recorded successfully.');
    } catch (err: any) {
      setError(err.message || 'Unable to record transaction.');
    }
  };

  const removeWallet = async (index: number) => {
    if (!currentAccount) return;
    try {
      const updatedAccount = await requestAccount({
        action: 'removeWallet',
        username: currentAccount.username,
        index,
      });
      saveAccount(normalizeAccount(updatedAccount));
    } catch (err: any) {
      setError(err.message || 'Unable to remove wallet.');
    }
  };

  return (
    <SiteShell>
      <main className="max-w-6xl mx-auto py-20 px-6">
        <div className="mb-12 rounded-[2rem] bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 p-10 text-white shadow-2xl ring-1 ring-white/10">
          <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
            <div>
              <p className="text-sm uppercase tracking-[0.4em] text-slate-400">Account hub</p>
              <h1 className="mt-4 text-4xl font-bold">Secure account management for Ionut users</h1>
              <p className="mt-4 max-w-xl text-slate-300">
                Create an account, manage wallets, send secure transfers, and keep your profile private with encrypted backups and stealth privacy controls.
              </p>
            </div>
            <div className="space-y-4 rounded-[1.5rem] bg-slate-900/90 p-6 ring-1 ring-white/10">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Privacy mode</p>
                <p className="mt-2 text-lg font-semibold">Mask sensitive fields and share less while using the app.</p>
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Encrypted backup</p>
                <p className="mt-2 text-lg font-semibold">Export account data with password-protected encryption.</p>
              </div>
            </div>
          </div>
        </div>

        {!currentAccount && (
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center mb-8">
            <button
              type="button"
              onClick={() => switchMode('create')}
              className={`rounded-full px-5 py-3 text-sm font-semibold transition ${authMode === 'create' ? 'bg-black text-white' : 'bg-white text-black dark:bg-zinc-800 dark:text-zinc-200'}`}
            >
              Create Account
            </button>
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`rounded-full px-5 py-3 text-sm font-semibold transition ${authMode === 'login' ? 'bg-black text-white' : 'bg-white text-black dark:bg-zinc-800 dark:text-zinc-200'}`}
            >
              Log In
            </button>
          </div>
        )}

        {step === 'form' && !currentAccount && (
          <div className="bg-white dark:bg-zinc-800 p-6 rounded-3xl shadow-lg ring-1 ring-zinc-100 dark:ring-zinc-800 mb-8">
            <h2 className="text-xl font-semibold mb-4">{authMode === 'create' ? 'Create a new account' : 'Log in to your account'}</h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">{feedback}</p>
            {error && <p className="mb-4 text-sm text-rose-600">{error}</p>}
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Username"
                value={authMode === 'create' ? form.username : loginForm.username}
                onChange={(e) => authMode === 'create'
                  ? setForm({ ...form, username: e.target.value })
                  : setLoginForm({ ...loginForm, username: e.target.value })
                }
                className="w-full p-3 border rounded-xl dark:bg-zinc-700 dark:border-zinc-600"
              />
              {authMode === 'create' && (
                <input
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full p-3 border rounded-xl dark:bg-zinc-700 dark:border-zinc-600"
                />
              )}
              <input
                type="password"
                placeholder="Password"
                value={authMode === 'create' ? form.password : loginForm.password}
                onChange={(e) => authMode === 'create'
                  ? setForm({ ...form, password: e.target.value })
                  : setLoginForm({ ...loginForm, password: e.target.value })
                }
                className="w-full p-3 border rounded-xl dark:bg-zinc-700 dark:border-zinc-600"
              />
              <button
                onClick={authMode === 'create' ? createAccount : loginAccount}
                className="w-full bg-black text-white py-3 rounded-full hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200 transition-colors"
              >
                {authMode === 'create' ? 'Create Account' : 'Request 2FA Code'}
              </button>
            </div>
            <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
              {authMode === 'create'
                ? 'Your password is stored locally for this demo. The verification code is shown on-screen for testing.'
                : 'After your credentials are accepted, a one-time 2FA code is generated and displayed below.'}
            </p>
          </div>
        )}

        {step === 'verify' && pendingAccount && (
          <div className="bg-white dark:bg-zinc-800 p-6 rounded-3xl shadow-lg ring-1 ring-zinc-100 dark:ring-zinc-800 mb-8">
            <h2 className="text-xl font-semibold mb-4">Verify {authMode === 'create' ? 'Your Email' : 'Your Login'}</h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">A 6-digit code has been generated for {pendingAccount.email}. Enter it below to continue.</p>
            {feedback && <p className="mb-4 rounded-xl bg-zinc-100 p-3 text-sm text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">{feedback}</p>}
            {error && <p className="mb-4 text-sm text-rose-600">{error}</p>}
            <div className="space-y-4">
              <div className="rounded-3xl bg-zinc-100 p-4 text-sm text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                <p className="font-semibold">Verification code</p>
                <p className="mt-2 text-lg font-mono tracking-wider">{verificationCode}</p>
                <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                  This demo does not send a real email automatically. Use the code above or click the button below to open your email client.
                </p>
                <button
                  type="button"
                  onClick={copyCode}
                  className="mt-3 inline-flex items-center justify-center rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  {copied ? 'Copied' : 'Copy Code'}
                </button>
              </div>
              <input
                type="text"
                placeholder="Verification Code"
                value={enteredCode}
                onChange={(e) => setEnteredCode(e.target.value)}
                className="w-full p-3 border rounded-xl dark:bg-zinc-700 dark:border-zinc-600"
              />
              <button
                onClick={verifyCode}
                className="w-full bg-black text-white py-3 rounded-full hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200 transition-colors"
              >
                Confirm Code
              </button>
              <div className="flex flex-col gap-3 sm:flex-row">
                <a
                  href={`mailto:${pendingAccount.email}?subject=Ionut Verification Code&body=Your%20verification%20code%20is%20${verificationCode}`}
                  className="inline-flex w-full items-center justify-center rounded-full border border-zinc-900 px-4 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  Send Code via Email
                </a>
                <button
                  onClick={() => {
                    const code = Math.floor(100000 + Math.random() * 900000).toString();
                    setVerificationCode(code);
                    setFeedback(`A new verification code was generated for ${pendingAccount.email}.`);
                  }}
                  className="inline-flex w-full items-center justify-center rounded-full bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
                >
                  Resend Code
                </button>
              </div>
              <details className="rounded-2xl bg-zinc-100 p-4 text-sm text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                <summary className="cursor-pointer font-medium">Need help?</summary>
                <p className="mt-3">Use the code below to complete verification if your email doesn’t arrive immediately.</p>
                <p className="mt-2 rounded-xl bg-zinc-50 p-3 text-sm text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">{verificationCode}</p>
              </details>
            </div>
          </div>
        )}

        {step === 'ready' && currentAccount && (
          <div className="space-y-8">
            <div className="rounded-3xl bg-white dark:bg-zinc-800 p-6 shadow-lg ring-1 ring-zinc-100 dark:ring-zinc-800">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Account Dashboard</h2>
                  <p className="text-zinc-600 dark:text-zinc-400">Manage linked wallets, secure notes, and your transaction record from one place.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setSection('wallets')}
                    className="rounded-full bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
                  >
                    Manage Wallets
                  </button>
                  <button
                    type="button"
                    onClick={logout}
                    className="rounded-full bg-rose-600 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-700"
                  >
                    Log Out
                  </button>
                </div>
              </div>
            </div>

            {unreadNotificationCount > 0 && (
              <div className="rounded-3xl bg-sky-50 p-5 text-sky-900 shadow-sm ring-1 ring-sky-200 dark:bg-sky-950/50 dark:text-sky-200 dark:ring-sky-800">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold">{unreadNotificationCount} new notification{unreadNotificationCount === 1 ? '' : 's'}</p>
                    <p className="text-sm text-sky-700 dark:text-sky-300">See the latest account activity below and mark your inbox as read.</p>
                  </div>
                  <button
                    type="button"
                    onClick={markAllNotificationsRead}
                    className="rounded-full bg-sky-900 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
                  >
                    Mark all read
                  </button>
                </div>
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-[1.1fr_1.9fr]">
              <aside className="space-y-4">
                <div className="rounded-3xl bg-white dark:bg-zinc-800 p-6 shadow-lg ring-1 ring-zinc-100 dark:ring-zinc-800">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                      <h2 className="text-xl font-semibold">Profile</h2>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">Protect your personal details while browsing Ionut.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPrivacyMode((prev) => !prev)}
                      className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
                    >
                      {privacyMode ? 'Disable Privacy Mode' : 'Enable Privacy Mode'}
                    </button>
                  </div>
                  <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
                    <p><strong>Username:</strong> {currentAccount.username}</p>
                    <p><strong>Email:</strong> {privacyMode ? maskEmail(currentAccount.email) : currentAccount.email}</p>
                    <p><strong>Balance:</strong> {privacyMode ? `${currentAccount.balance.toFixed(2)} IONUT` : `${currentAccount.balance.toFixed(2)} IONUT`}</p>
                    <p><strong>Wallets:</strong> {currentAccount.wallets.length}</p>
                    <p><strong>Messages:</strong> {currentAccount.messages.length}</p>
                    <p><strong>Transactions:</strong> {currentAccount.transactions.length}</p>
                  </div>
                </div>

                <div className="rounded-3xl bg-white dark:bg-zinc-800 p-6 shadow-lg ring-1 ring-zinc-100 dark:ring-zinc-800">
                  <h2 className="text-xl font-semibold mb-4">Quick actions</h2>
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => setSection('overview')}
                      className="w-full rounded-full border border-zinc-900 px-4 py-3 text-left text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900"
                    >Overview</button>
                    <button
                      type="button"
                      onClick={() => setSection('wallets')}
                      className="w-full rounded-full border border-zinc-900 px-4 py-3 text-left text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900"
                    >Wallets</button>
                    <button
                      type="button"
                      onClick={() => setSection('messages')}
                      className="w-full rounded-full border border-zinc-900 px-4 py-3 text-left text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900"
                    >Messages</button>
                    <button
                      type="button"
                      onClick={() => setSection('transactions')}
                      className="w-full rounded-full border border-zinc-900 px-4 py-3 text-left text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900"
                    >Transactions</button>
                    <button
                      type="button"
                      onClick={() => setSection('security')}
                      className="w-full rounded-full border border-zinc-900 px-4 py-3 text-left text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900"
                    >Security</button>
                  </div>
                </div>

              <div className="rounded-3xl bg-white dark:bg-zinc-800 p-6 shadow-lg ring-1 ring-zinc-100 dark:ring-zinc-800">
                <div className="flex items-center justify-between mb-4 gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">Notifications</h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Latest account events and new activity.</p>
                  </div>
                  {unreadNotificationCount > 0 ? (
                    <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-900 dark:text-sky-200">
                      {unreadNotificationCount} new
                    </span>
                  ) : (
                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
                      All read
                    </span>
                  )}
                </div>
                {currentAccount.notifications.length === 0 ? (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">No notifications yet. New activity appears here.</p>
                ) : (
                  <div className="space-y-3">
                    {currentAccount.notifications.slice(0, 4).map((notification) => (
                      <div key={notification.id} className={`rounded-3xl p-4 ${notification.read ? 'bg-zinc-50 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300' : 'bg-sky-50 text-sky-900 dark:bg-sky-950/60 dark:text-sky-200'}`}>
                        <div className="flex items-center justify-between gap-3 text-sm font-semibold">
                          <span>{notification.title}</span>
                          <span>{new Date(notification.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="mt-2 text-sm leading-6">{notification.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </aside>
              <section className="space-y-6">
                <div className="rounded-3xl bg-white dark:bg-zinc-800 p-6 shadow-lg ring-1 ring-zinc-100 dark:ring-zinc-800">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                    <h2 className="text-xl font-semibold">{section.charAt(0).toUpperCase() + section.slice(1)}</h2>
                    <div className="flex flex-wrap gap-2">
                      {(['overview', 'wallets', 'messages', 'transactions', 'security'] as AccountTab[]).map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setSection(tab)}
                          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${section === tab ? 'bg-black text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800'}`}
                        >
                          {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {section === 'overview' && (
                    <div className="space-y-6">
                      <p className="text-zinc-600 dark:text-zinc-400">Your account dashboard gives you a complete privacy-first profile with linked wallets, messages, and transaction history.</p>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-3xl bg-zinc-50 p-5 dark:bg-zinc-900">
                          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-400">Linked wallets</p>
                          <p className="mt-3 text-3xl font-semibold text-black dark:text-zinc-50">{currentAccount.wallets.length}</p>
                        </div>
                        <div className="rounded-3xl bg-zinc-50 p-5 dark:bg-zinc-900">
                          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-400">Recent transactions</p>
                          <p className="mt-3 text-3xl font-semibold text-black dark:text-zinc-50">{currentAccount.transactions.length}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {section === 'wallets' && (
                    <div className="space-y-6">
                      <p className="text-zinc-600 dark:text-zinc-400">All wallets linked to your account are saved locally and can be removed at any time.</p>
                      {currentAccount.wallets.length === 0 ? (
                        <div className="rounded-3xl bg-zinc-100 p-6 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                          <p>No wallets linked yet. Generate a wallet from the Wallet page and save it to your account.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {currentAccount.wallets.map((walletItem, index) => (
                            <div key={`${walletItem.address}-${index}`} className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-700 dark:bg-zinc-900">
                              <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Wallet #{index + 1}</p>
                                  <p className="mt-2 font-mono text-sm break-all text-black dark:text-zinc-100">{walletItem.address}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeWallet(index)}
                                  className="rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {section === 'messages' && (
                    <div className="space-y-6">
                      <p className="text-zinc-600 dark:text-zinc-400">This is your chat view. Send a message to Ionut Support and see conversation bubbles along the way.</p>
                      <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
                        <div className="mb-4 flex items-center gap-3 border-b border-zinc-200 pb-4 dark:border-zinc-700">
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">I</div>
                          <div>
                            <p className="font-semibold text-zinc-900 dark:text-zinc-100">Ionut Support</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">Active now</p>
                          </div>
                        </div>
                        <div className="flex max-h-[420px] flex-col gap-4 overflow-y-auto pr-2">
                          {currentAccount.messages.length === 0 ? (
                            <div className="rounded-3xl bg-white p-4 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">No messages yet. Send the first message below.</div>
                          ) : (
                            currentAccount.messages.map((note) => (
                              <div key={note.id} className={`flex ${note.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[78%] rounded-3xl p-4 text-sm leading-relaxed shadow-sm ${note.sender === 'me' ? 'bg-slate-900 text-white rounded-br-[6px] rounded-bl-3xl rounded-tr-3xl rounded-tl-3xl' : 'bg-white text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 rounded-bl-[6px] rounded-br-3xl rounded-tl-3xl rounded-tr-3xl'}`}>
                                  <div className="flex items-center justify-between gap-3">
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{note.sender === 'me' ? 'You' : 'Ionut'}</p>
                                    {note.sender === 'me' ? (
                                      <button
                                        type="button"
                                        onClick={() => removeNote(note.id)}
                                        className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-600 hover:text-rose-700 dark:text-rose-300"
                                      >
                                        Delete
                                      </button>
                                    ) : null}
                                  </div>
                                  <p className="mt-2 break-words">{note.text}</p>
                                  <p className="mt-3 text-[11px] text-zinc-500 dark:text-zinc-400">{new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                        <div className="mt-4 flex gap-3">
                          <input
                            type="text"
                            value={messageDraft}
                            onChange={(e) => setMessageDraft(e.target.value)}
                            placeholder="Send a message..."
                            className="min-w-0 flex-1 rounded-3xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                          />
                          <button
                            type="button"
                            onClick={addMessage}
                            className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                          >
                            Send
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {section === 'transactions' && (
                    <div className="space-y-6">
                      <p className="text-sky-700 dark:text-sky-300">Use this transfer panel to move Ionut tokens by recipient username, just like sending crypto to a friend while keeping a clean social wallet feed.</p>
                      <div className="rounded-3xl bg-sky-50 p-6 dark:bg-slate-950">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <label className="block text-sm text-zinc-700 dark:text-zinc-300">
                            Type
                            <select
                              value={transactionForm.direction}
                              onChange={(e) => setTransactionForm({ ...transactionForm, direction: e.target.value as 'sent' | 'received' })}
                              className="mt-2 w-full rounded-3xl border border-zinc-200 bg-white px-4 py-3 text-sm text-black outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                            >
                              <option value="sent">Send</option>
                              <option value="received">Receive</option>
                            </select>
                          </label>
                          <label className="block text-sm text-zinc-700 dark:text-zinc-300">
                            Amount
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={transactionForm.amount}
                              onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                              placeholder="Amount"
                              className="mt-2 w-full rounded-3xl border border-zinc-200 bg-white px-4 py-3 text-sm text-black outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                            />
                          </label>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 mt-4">
                          <label className="block text-sm text-zinc-700 dark:text-zinc-300">
                            Recipient
                            <input
                              type="text"
                              value={transactionForm.counterparty}
                              onChange={(e) => setTransactionForm({ ...transactionForm, counterparty: e.target.value })}
                              placeholder="Recipient username or source"
                              className="mt-2 w-full rounded-3xl border border-zinc-200 bg-white px-4 py-3 text-sm text-black outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                            />
                          </label>
                          <label className="block text-sm text-zinc-700 dark:text-zinc-300">
                            Description
                            <input
                              type="text"
                              value={transactionForm.description}
                              onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                              placeholder="Transaction description"
                              className="mt-2 w-full rounded-3xl border border-zinc-200 bg-white px-4 py-3 text-sm text-black outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                            />
                          </label>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => addTransaction('sent')}
                            className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                          >
                            Transfer IONUT
                          </button>
                          <button
                            type="button"
                            onClick={() => addTransaction('received')}
                            className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
                          >
                            Receive IONUT
                          </button>
                        </div>
                        {recentRecipients.length > 0 && (
                          <div className="mt-4 rounded-3xl bg-white p-4 text-sm text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                            <p className="font-semibold text-zinc-900 dark:text-zinc-100">Recent recipients</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {recentRecipients.map((recipient) => (
                                <button
                                  key={recipient}
                                  type="button"
                                  onClick={() => setTransactionForm({ ...transactionForm, counterparty: recipient })}
                                  className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-300"
                                >
                                  {recipient}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      {currentAccount.transactions.length === 0 ? (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">No transactions recorded yet.</p>
                      ) : (
                        <div className="space-y-4">
                          {currentAccount.transactions.map((tx) => (
                            <div key={tx.id} className="rounded-3xl bg-zinc-100 p-4 dark:bg-zinc-900">
                              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-500 dark:text-zinc-400">
                                <span>{new Date(tx.timestamp).toLocaleString()}</span>
                                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tx.type === 'sent' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'}`}>
                                  {tx.type.toUpperCase()}
                                </span>
                              </div>
                              <p className="mt-3 text-sm text-black dark:text-zinc-100">{tx.description}</p>
                              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                                <span>{tx.counterparty || 'External'}</span>
                                <strong>{tx.type === 'sent' ? '-' : '+'}{tx.amount.toFixed(2)} IONUT</strong>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {section === 'security' && (
                    <div className="space-y-6">
                      <p className="text-zinc-600 dark:text-zinc-400">Keep your account safe by storing your password privately and treating your saved wallet keys with care.</p>
                      <div className="rounded-3xl bg-zinc-100 p-6 dark:bg-zinc-900">
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">Two-factor authentication is active for this account. Each login requires a one-time verification code.</p>
                        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">Wallet private keys and seed phrases are saved locally in your browser only when you link them to your account.</p>
                      </div>
                      <div className="mt-6 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
                        <h3 className="text-lg font-semibold mb-3">Encrypted backup</h3>
                        <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">Export your account data as an encrypted backup file and restore it later with a password.</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="block text-sm text-zinc-700 dark:text-zinc-300">
                            Backup password
                            <input
                              type="password"
                              value={backupPassword}
                              onChange={(e) => setBackupPassword(e.target.value)}
                              placeholder="Choose a strong password"
                              className="mt-2 w-full rounded-3xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={downloadEncryptedBackup}
                            className="h-full w-full rounded-3xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                          >
                            Download encrypted backup
                          </button>
                        </div>
                        <div className="mt-5 border-t border-zinc-200 pt-5 dark:border-zinc-700">
                          <label className="block text-sm text-zinc-700 dark:text-zinc-300">
                            Restore password
                            <input
                              type="password"
                              value={restorePassword}
                              onChange={(e) => setRestorePassword(e.target.value)}
                              placeholder="Enter backup password"
                              className="mt-2 w-full rounded-3xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                            />
                          </label>
                          <input
                            type="file"
                            accept=".txt"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (file) {
                                handleRestoreBackup(file);
                              }
                            }}
                            className="mt-4 w-full text-sm text-zinc-600 dark:text-zinc-300"
                          />
                        </div>
                        {backupMessage ? <p className="mt-4 text-sm text-emerald-600 dark:text-emerald-400">{backupMessage}</p> : null}
                      </div>
                      <button
                        type="button"
                        onClick={deleteAccount}
                        className="rounded-full bg-rose-600 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-700"
                      >
                        Delete Local Account
                      </button>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        )}
      </main>
    </SiteShell>
  );
}
