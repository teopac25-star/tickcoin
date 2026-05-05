import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';

const HOST_CONTROL_TOKEN = process.env.TOR_HOST_CONTROL_TOKEN?.trim();
const HOSTNAME_PATHS = [
  '/var/lib/tor/ionut_hidden_service/hostname',
  '/var/lib/tor/hidden_service/hostname',
  '/var/lib/tor/hidden_service/ionut_hidden_service/hostname',
  join(process.cwd(), 'tor_hidden_service', 'hostname'),
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
    return true;
  }
  const token = request.headers.get('x-host-token')?.trim();
  return Boolean(token && token === HOST_CONTROL_TOKEN);
}

async function startTorIfNeeded() {
  const hostname = await readHostname();
  if (hostname) {
    return { active: true, onion: `http://${hostname}`, message: 'Hidden service already available.' };
  }

  const torrcPath = join(process.cwd(), 'torrc.local');
  try {
    const torProcess = spawn('tor', ['-f', torrcPath], {
      cwd: process.cwd(),
      detached: true,
      stdio: 'ignore',
    });
    torProcess.unref();
    return { active: false, onion: null, message: 'Tor process started. Hidden service will appear shortly.' };
  } catch (error: any) {
    return { active: false, onion: null, message: `Unable to start Tor: ${error?.message || 'unknown error'}` };
  }
}

export async function GET() {
  const hostname = await readHostname();
  if (hostname) {
    return NextResponse.json({ active: true, onion: `http://${hostname}`, message: 'Hidden service ready.' });
  }
  return NextResponse.json({ active: false, onion: null, message: 'Hidden service is not active.' });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const action = (body?.action as string) || 'ensure';

  if (action !== 'ensure') {
    return NextResponse.json({ message: 'Unsupported action.' }, { status: 400 });
  }

  if (!isHostControlAuthorized(request)) {
    return NextResponse.json({ message: 'Host control token required.' }, { status: 403 });
  }

  const result = await startTorIfNeeded();
  return NextResponse.json(result);
}
