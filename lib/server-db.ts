import { promises as fs } from 'fs';
import { join } from 'path';
import crypto from 'crypto';

const DATA_DIR = join(process.cwd(), 'data');
const DB_FILE = join(DATA_DIR, 'ionut-db.json');

export interface Wallet {
  address: string;
  privateKey: string;
  mnemonic: string;
}

export interface AccountMessage {
  id: string;
  text: string;
  createdAt: string;
}

export interface TransactionEntry {
  id: string;
  type: 'sent' | 'received';
  amount: number;
  counterparty: string;
  description: string;
  timestamp: string;
  recipient?: string;
}

export interface Account {
  username: string;
  email: string;
  passwordHash: string;
  sessionToken?: string;
  balance: number;
  wallets: Wallet[];
  messages: AccountMessage[];
  transactions: TransactionEntry[];
  notifications: { id: string; type: 'message' | 'transaction'; title: string; description: string; createdAt: string; read: boolean; }[];
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  user: string;
  text: string;
  timestamp: string;
  recipient?: string;
}

export interface AnonymousComment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface AnonymousPost {
  id: string;
  author: string;
  caption: string;
  imageUrl?: string;
  createdAt: string;
  likes: number;
  comments: AnonymousComment[];
}

export interface Database {
  accounts: Account[];
  chatMessages: ChatMessage[];
  posts: AnonymousPost[];
}

const DEFAULT_DB: Database = {
  accounts: [],
  chatMessages: [],
  posts: [],
};

async function ensureDbFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DB_FILE);
  } catch {
    await fs.writeFile(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), 'utf8');
  }
}

async function readDb(): Promise<Database> {
  await ensureDbFile();
  const raw = await fs.readFile(DB_FILE, 'utf8');
  return JSON.parse(raw) as Database;
}

async function writeDb(db: Database) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}

function hashPassword(password: string) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function createPasswordHash(password: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}$${derived}`;
}

function verifyPassword(password: string, storedHash: string) {
  if (storedHash.includes('$')) {
    const [salt, hash] = storedHash.split('$');
    const derived = crypto.scryptSync(password, salt, 64).toString('hex');
    return derived === hash;
  }
  return hashPassword(password) === storedHash;
}

function generateSessionToken() {
  return crypto.randomBytes(24).toString('hex');
}

function sanitizeWallet(wallet: Wallet) {
  return {
    address: wallet.address,
  };
}

function sanitizeAccount(account: Account) {
  const { passwordHash, sessionToken, ...rest } = account as Account & { notifications?: any; sessionToken?: string };
  return {
    ...rest,
    wallets: Array.isArray(account.wallets) ? account.wallets.map(sanitizeWallet) : [],
    notifications: Array.isArray((rest as any).notifications) ? rest.notifications : [],
  };
}

export async function getAccountByUsername(username: string) {
  const db = await readDb();
  return db.accounts.find((account) => account.username.toLowerCase() === username.toLowerCase());
}

export async function getAccount(username: string) {
  const account = await getAccountByUsername(username);
  return account ? sanitizeAccount(account) : null;
}

export async function verifySession(username: string, token: string) {
  if (!token || !username) {
    return false;
  }
  const account = await getAccountByUsername(username);
  return Boolean(account?.sessionToken && account.sessionToken === token);
}

export async function getAccountBySessionToken(token: string) {
  const db = await readDb();
  return db.accounts.find((account) => account.sessionToken === token) ?? null;
}

export async function registerAccount(username: string, email: string, password: string) {
  const db = await readDb();
  if (db.accounts.some((account) => account.username.toLowerCase() === username.toLowerCase())) {
    throw new Error('Username already exists.');
  }
  if (db.accounts.some((account) => account.email.toLowerCase() === email.toLowerCase())) {
    throw new Error('Email already exists.');
  }

  const now = new Date().toISOString();
  const account: Account = {
    username,
    email,
    passwordHash: createPasswordHash(password),
    sessionToken: generateSessionToken(),
    balance: 100,
    wallets: [],
    messages: [],
    transactions: [
      {
        id: `${Date.now()}-initial`,
        type: 'received',
        amount: 100,
        counterparty: 'Signup bonus',
        description: 'Welcome credit for creating your account',
        timestamp: now,
      },
    ],
    notifications: [],
    createdAt: now,
  };

  db.accounts.push(account);
  await writeDb(db);
  return sanitizeAccount(account);
}

export async function loginAccount(username: string, password: string) {
  const account = await getAccountByUsername(username);
  if (!account) {
    throw new Error('Account not found.');
  }
  if (!verifyPassword(password, account.passwordHash)) {
    throw new Error('Password is incorrect.');
  }
  if (!account.passwordHash.includes('$')) {
    account.passwordHash = createPasswordHash(password);
  }
  account.sessionToken = generateSessionToken();
  return saveAccount(account);
}

async function saveAccount(accountToSave: Account) {
  const db = await readDb();
  const index = db.accounts.findIndex((account) => account.username.toLowerCase() === accountToSave.username.toLowerCase());
  if (index === -1) {
    throw new Error('Account not found.');
  }
  db.accounts[index] = accountToSave;
  await writeDb(db);
  return sanitizeAccount(accountToSave);
}

export async function deleteAccount(username: string) {
  const db = await readDb();
  db.accounts = db.accounts.filter((account) => account.username.toLowerCase() !== username.toLowerCase());
  await writeDb(db);
}

export async function addWalletToAccount(username: string, wallet: Wallet) {
  const account = await getAccountByUsername(username);
  if (!account) {
    throw new Error('Account not found.');
  }
  account.wallets.unshift(wallet);
  return saveAccount(account);
}

export async function removeWalletFromAccount(username: string, index: number) {
  const account = await getAccountByUsername(username);
  if (!account) {
    throw new Error('Account not found.');
  }
  account.wallets = account.wallets.filter((_, i) => i !== index);
  return saveAccount(account);
}

export async function addAccountMessage(username: string, message: AccountMessage) {
  const account = await getAccountByUsername(username);
  if (!account) {
    throw new Error('Account not found.');
  }
  account.messages.unshift(message);
  return saveAccount(account);
}

export async function removeAccountMessage(username: string, messageId: string) {
  const account = await getAccountByUsername(username);
  if (!account) {
    throw new Error('Account not found.');
  }
  account.messages = account.messages.filter((item) => item.id !== messageId);
  return saveAccount(account);
}

export async function addAccountTransaction(username: string, transaction: TransactionEntry) {
  const account = await getAccountByUsername(username);
  if (!account) {
    throw new Error('Account not found.');
  }
  account.balance = transaction.type === 'sent' ? account.balance - transaction.amount : account.balance + transaction.amount;
  account.transactions.unshift(transaction);
  return saveAccount(account);
}

export async function transferFunds(senderUsername: string, recipientUsername: string, amount: number, description: string) {
  const sender = await getAccountByUsername(senderUsername);
  const recipient = await getAccountByUsername(recipientUsername);
  if (!sender) {
    throw new Error('Sender account not found.');
  }
  if (!recipient) {
    throw new Error('Recipient account not found.');
  }
  if (sender.username.toLowerCase() === recipient.username.toLowerCase()) {
    throw new Error('Cannot transfer to the same account.');
  }
  if (amount <= 0) {
    throw new Error('Transfer amount must be greater than zero.');
  }
  if (sender.balance < amount) {
    throw new Error('Insufficient balance.');
  }

  const now = new Date().toISOString();
  const transactionIdBase = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const senderTransaction: TransactionEntry = {
    id: `${transactionIdBase}-sent`,
    type: 'sent',
    amount,
    counterparty: recipient.username,
    description: description || `Transfer to ${recipient.username}`,
    timestamp: now,
    recipient: recipient.username,
  };

  const recipientTransaction: TransactionEntry = {
    id: `${transactionIdBase}-received`,
    type: 'received',
    amount,
    counterparty: sender.username,
    description: description || `Received from ${sender.username}`,
    timestamp: now,
    recipient: recipient.username,
  };

  sender.balance -= amount;
  recipient.balance += amount;
  sender.transactions.unshift(senderTransaction);
  recipient.transactions.unshift(recipientTransaction);

  await saveAccount(recipient);
  return saveAccount(sender);
}

export async function getChatMessages() {
  const db = await readDb();
  return db.chatMessages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function addChatMessage(message: ChatMessage) {
  const db = await readDb();
  db.chatMessages.unshift(message);
  if (db.chatMessages.length > 200) {
    db.chatMessages = db.chatMessages.slice(0, 200);
  }
  await writeDb(db);
  return message;
}

export async function getPosts() {
  const db = await readDb();
  return db.posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function addPost(post: AnonymousPost) {
  const db = await readDb();
  db.posts.unshift(post);
  if (db.posts.length > 200) {
    db.posts = db.posts.slice(0, 200);
  }
  await writeDb(db);
  return post;
}

export async function likePost(postId: string) {
  const db = await readDb();
  const post = db.posts.find((item) => item.id === postId);
  if (!post) {
    throw new Error('Post not found.');
  }
  post.likes += 1;
  await writeDb(db);
  return post;
}

export async function addPostComment(postId: string, comment: AnonymousComment) {
  const db = await readDb();
  const post = db.posts.find((item) => item.id === postId);
  if (!post) {
    throw new Error('Post not found.');
  }
  post.comments.push(comment);
  await writeDb(db);
  return post;
}
