import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import { join } from "path";

const ENV_HOSTNAME = (process.env.TOR_HIDDEN_SERVICE_HOSTNAME || process.env.TOR_HOSTNAME || '').trim();
const HOSTNAME_PATHS = [
  "/var/lib/tor/ionut_hidden_service/hostname",
  "/var/lib/tor/hidden_service/hostname",
  "/var/lib/tor/hidden_service/ionut_hidden_service/hostname",
  join(process.cwd(), "tor_hidden_service", "hostname"),
  join(process.cwd(), "hostname"),
  join(process.cwd(), "hidden_service", "hostname"),
];

export async function GET() {
  if (ENV_HOSTNAME) {
    return NextResponse.json({ hostname: ENV_HOSTNAME, onionUrl: `http://${ENV_HOSTNAME}` });
  }

  for (const path of HOSTNAME_PATHS) {
    try {
      const hostname = (await fs.readFile(path, "utf8")).trim();
      if (hostname) {
        return NextResponse.json({ hostname, onionUrl: `http://${hostname}` });
      }
    } catch {
      continue;
    }
  }

  return NextResponse.json({ hostname: null, onionUrl: null }, { status: 404 });
}
