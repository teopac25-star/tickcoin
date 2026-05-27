import { promises as fs } from 'fs';
import { join } from 'path';
import crypto from 'crypto';

const DATA_DIR = join(/* turbopackIgnore: true */ process.cwd(), 'data');
const CHAIN_FILE = join(DATA_DIR, 'chain.json');
const DEFAULT_CHAIN_NAME = 'TickCoin Private Chain';
const DIFFICULTY_PREFIX = '0000';

export interface Block {
  index: number;
  timestamp: string;
  nonce: number;
  hash: string;
  previousHash: string;
  data: string;
  difficulty: string;
  chainName: string;
}

export interface ChainState {
  chainName: string;
  difficultyPrefix: string;
  blocks: Block[];
  createdAt: string;
}

const DEFAULT_CHAIN: ChainState = {
  chainName: DEFAULT_CHAIN_NAME,
  difficultyPrefix: DIFFICULTY_PREFIX,
  createdAt: new Date().toISOString(),
  blocks: [
    {
      index: 1,
      timestamp: new Date().toISOString(),
      nonce: 0,
      previousHash: '0'.repeat(64),
      data: 'Genesis block',
      difficulty: DIFFICULTY_PREFIX,
      chainName: DEFAULT_CHAIN_NAME,
      hash: '',
    },
  ],
};

function baseString(chainName: string, previousHash: string, timestamp: string, data: string) {
  return `${chainName}|${previousHash}|${timestamp}|${data}`;
}

function computeHash(base: string, nonce: number) {
  return crypto.createHash('sha256').update(`${base}|${nonce}`).digest('hex');
}

function createValidGenesisHash() {
  const block = DEFAULT_CHAIN.blocks[0];
  const base = baseString(block.chainName, block.previousHash, block.timestamp, block.data);
  let nonce = 0;
  while (true) {
    const hash = computeHash(base, nonce);
    if (hash.startsWith(DIFFICULTY_PREFIX)) {
      return { hash, nonce };
    }
    nonce += 1;
  }
}

async function ensureChainFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(CHAIN_FILE);
  } catch {
    const genesis = createValidGenesisHash();
    DEFAULT_CHAIN.blocks[0].hash = genesis.hash;
    DEFAULT_CHAIN.blocks[0].nonce = genesis.nonce;
    await fs.writeFile(CHAIN_FILE, JSON.stringify(DEFAULT_CHAIN, null, 2), 'utf8');
  }
}

async function readChainFile(): Promise<ChainState> {
  await ensureChainFile();
  const raw = await fs.readFile(CHAIN_FILE, 'utf8');
  return JSON.parse(raw) as ChainState;
}

async function writeChainFile(chain: ChainState) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(CHAIN_FILE, JSON.stringify(chain, null, 2), 'utf8');
}

export async function getChain(): Promise<ChainState> {
  const chain = await readChainFile();
  if (chain.blocks.length === 0) {
    const initial = DEFAULT_CHAIN;
    await writeChainFile(initial);
    return initial;
  }
  return chain;
}

export async function getChainTemplate() {
  const chain = await getChain();
  const tip = chain.blocks[chain.blocks.length - 1];
  const index = tip.index + 1;
  const timestamp = new Date().toISOString();
  const data = `Block ${index} mined on ${new Date(timestamp).toISOString()}`;
  const base = baseString(chain.chainName, tip.hash, timestamp, data);

  return {
    chainName: chain.chainName,
    difficulty: chain.difficultyPrefix,
    previousHash: tip.hash,
    index,
    timestamp,
    data,
    base,
  };
}

export function validateProof(base: string, nonce: number, expectedHash: string, difficulty: string) {
  const hash = computeHash(base, nonce);
  return hash === expectedHash && hash.startsWith(difficulty);
}

export async function submitBlock(candidate: {
  chainName: string;
  previousHash: string;
  index: number;
  timestamp: string;
  data: string;
  base: string;
  nonce: number;
  hash: string;
}) {
  const chain = await getChain();
  const tip = chain.blocks[chain.blocks.length - 1];

  if (candidate.chainName !== chain.chainName) {
    throw new Error('Invalid chain name.');
  }
  if (candidate.previousHash !== tip.hash) {
    throw new Error('Chain tip has changed. Refresh and mine the latest block.');
  }
  if (candidate.index !== tip.index + 1) {
    throw new Error('Invalid block index.');
  }
  const expectedBase = baseString(chain.chainName, tip.hash, candidate.timestamp, candidate.data);
  if (candidate.base !== expectedBase) {
    throw new Error('Invalid block template.');
  }
  if (!validateProof(candidate.base, candidate.nonce, candidate.hash, chain.difficultyPrefix)) {
    throw new Error('Block proof-of-work is invalid.');
  }

  const block: Block = {
    index: candidate.index,
    timestamp: candidate.timestamp,
    nonce: candidate.nonce,
    hash: candidate.hash,
    previousHash: candidate.previousHash,
    data: candidate.data,
    difficulty: chain.difficultyPrefix,
    chainName: chain.chainName,
  };

  chain.blocks.push(block);
  await writeChainFile(chain);
  return chain;
}

export async function setChainName(chainName: string) {
  const chain = await getChain();
  chain.chainName = chainName || DEFAULT_CHAIN_NAME;
  await writeChainFile(chain);
  return chain;
}

export async function resetChain(chainName?: string) {
  const genesis = createValidGenesisHash();
  DEFAULT_CHAIN.blocks[0].hash = genesis.hash;
  DEFAULT_CHAIN.blocks[0].nonce = genesis.nonce;
  DEFAULT_CHAIN.chainName = chainName || DEFAULT_CHAIN_NAME;
  DEFAULT_CHAIN.createdAt = new Date().toISOString();
  await writeChainFile(DEFAULT_CHAIN);
  return DEFAULT_CHAIN;
}
