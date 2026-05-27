import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { spawn } from 'child_process';

import { join } from 'path';

const HOST_CONTROL_TOKEN = process.env.TOR_HOST_CONTROL_TOKEN?.trim();
const cwd = /* turbopackIgnore: true */ process.cwd();
const HOSTNAME_PATHS = [
  '/var/lib/tor/ionut_hidden_service/hostname',
  '/var/lib/tor/hidden_service/hostname',
  '/var/lib/tor/hidden_service/ionut_hidden_service/hostname',
  join(cwd, 'tor_hidden_service', 'hostname'),
];

async function readHostname() {
  for (const path of HOSTNAME_PATHS) {
    try {
      const hostname = (await fs.readFile(path, 'utf8')).trim();
      if (hostname) {
        return hostname;
      }
    } catch {
      continue;
    }
  }
  return null;
}

function isHostControlAuthorized(request: Request) {
  if (!HOST_CONTROL_TOKEN) {
    return false;
  }
  const token = request.headers.get('x-host-token')?.trim();
  return Boolean(token && token === HOST_CONTROL_TOKEN);
}

async function startTorIfNeeded() {
  const hostname = await readHostname();
  if (hostname) {
    return { active: true, onion: `http://${hostname}`, message: 'Hidden service already available.' };
  }

  const torrcPath = join(cwd, 'torrc.local');
  try {
    const torProcess = spawn('tor', ['-f', torrcPath], {
      cwd,
      detached: true,
      stdio: 'ignore',
    });
    torProcess.unref();
    return { active: false, onion: null, message: 'Tor process started. Hidden service will appear shortly.' };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { active: false, onion: null, message: `Unable to start Tor: ${message || 'unknown error'}` };
  }
}

export async function GET() {
  const hostname = await readHostname();
  if (hostname) {
    return NextResponse.json({ active: true, onion: `http://${hostname}`, message: 'Hidden service ready.' }, { headers: { 'Cache-Control': 'no-store' } });
  }
  return NextResponse.json({ active: false, onion: null, message: 'Hidden service is not active.' }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const action = (body?.action as string) || 'ensure';

  if (action !== 'ensure') {
    return NextResponse.json({ message: 'Unsupported action.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }

  if (!isHostControlAuthorized(request)) {
    return NextResponse.json({ message: 'Host control token required.' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
  }

  const result = await startTorIfNeeded();
  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
}
