const DIFFICULTY_PREFIX = '0000';

interface StartMessage {
  type: 'start';
  base: string;
  difficulty: string;
  batchSize: number;
}

interface StopMessage {
  type: 'stop';
}

interface MinerStats {
  type: 'stats';
  hashes: number;
  hashRate: number;
}

interface FoundMessage {
  type: 'found';
  nonce: number;
  hash: string;
}

type Message = StartMessage | StopMessage;

let running = false;
let base = '';
let difficulty = DIFFICULTY_PREFIX;
let batchSize = 12;
let nonce = 0;
let hashCount = 0;
let lastStats = performance.now();

self.onmessage = async (event: MessageEvent<Message>) => {
  const message = event.data;

  if (message.type === 'start') {
    if (running) return;
    running = true;
    base = message.base;
    difficulty = message.difficulty;
    batchSize = message.batchSize;
    nonce = 0;
    hashCount = 0;
    lastStats = performance.now();
    mineLoop();
    return;
  }

  if (message.type === 'stop') {
    running = false;
    return;
  }
};

async function mineLoop() {
  while (running) {
    for (let i = 0; i < batchSize && running; i += 1) {
      const hash = await sha256(`${base}-${nonce}`);
      nonce += 1;
      hashCount += 1;

      if (hash.startsWith(difficulty)) {
        const found: FoundMessage = {
          type: 'found',
          nonce,
          hash,
        };
        self.postMessage(found);
      }
    }

    const now = performance.now();
    if (now - lastStats >= 500) {
      const elapsed = now - lastStats;
      const rate = Math.round((hashCount / elapsed) * 1000);
      const stats: MinerStats = {
        type: 'stats',
        hashes: hashCount,
        hashRate: rate,
      };
      self.postMessage(stats);
      lastStats = now;
      hashCount = 0;
    }

    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

async function sha256(message: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
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
    0x2de92c6f, 0x4d2c6dfc, 0x53380d13, 0x650a7354,
    0x766a0abb, 0x81c2c878, 0x92722c85, 0xa2bfe8a1,
    0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819,
    0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116,
    0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3,
    0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee,
    0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa,
    0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
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

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + ((S0 + maj) >>> 0)) >>> 0;
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
