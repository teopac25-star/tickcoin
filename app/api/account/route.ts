import { NextResponse } from 'next/server';
import {
  addAccountMessage,
  addAccountTransaction,
  addWalletToAccount,
  deleteAccount,
  getAccount,
  getAccountByUsername,
  loginAccount,
  registerAccount,
  removeAccountMessage,
  removeWalletFromAccount,
  transferFunds,
  verifySession,
} from '../../../lib/server-db';

const AUTH_HEADER = 'x-tickcoin-session';
const COOKIE_NAME = 'tickcoin_session';

function parseCookieHeader(cookieHeader: string | null) {
  if (!cookieHeader) return null;
  return Object.fromEntries(
    cookieHeader.split(';').map(part => {
      const [name, ...value] = part.trim().split('=');
      return [name, decodeURIComponent(value.join('='))];
    }),
  );
}

function extractAuthToken(request: Request) {
  const cookieHeader = request.headers.get('cookie');
  const cookies = parseCookieHeader(cookieHeader);
  return (
    request.headers.get(AUTH_HEADER)
    || cookies?.[COOKIE_NAME]
    || ''
  );
}

function createAuthCookie(token: string) {
  const secure = process.env.NODE_ENV === 'production';
  const maxAge = 60 * 60 * 24 * 7; // 1 week
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge};${secure ? ' Secure;' : ''}`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const username = url.searchParams.get('username');
  if (!username) {
    return NextResponse.json({ message: 'Missing username query parameter.' }, { status: 400 });
  }

  const token = extractAuthToken(request);
  if (!token) {
    return NextResponse.json({ message: 'Authentication token required.' }, { status: 401 });
  }

  if (!(await verifySession(username, token))) {
    return NextResponse.json({ message: 'Invalid or expired session token.' }, { status: 403 });
  }

  const account = await getAccount(username);
  if (!account) {
    return NextResponse.json({ message: 'Account not found.' }, { status: 404 });
  }
  return NextResponse.json(account);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const action = (body?.action as string) || 'none';
  const authToken = extractAuthToken(request);

  try {
    switch (action) {
      case 'register': {
        const { username, email, password } = body;
        if (!username || !email || !password) {
          return NextResponse.json({ message: 'Missing registration fields.' }, { status: 400 });
        }
        const account = await registerAccount(username, email, password);
        const full = await getAccountByUsername(username);
        const response = NextResponse.json({
          account,
          token: full?.sessionToken ?? null,
        });
        if (full?.sessionToken) {
          response.headers.set('Set-Cookie', createAuthCookie(full.sessionToken));
        }
        return response;
      }
      case 'login': {
        const { username, password } = body;
        if (!username || !password) {
          return NextResponse.json({ message: 'Missing login credentials.' }, { status: 400 });
        }
        const account = await loginAccount(username, password);
        const full = await getAccountByUsername(username);
        const response = NextResponse.json({
          account,
          token: full?.sessionToken ?? null,
        });
        if (full?.sessionToken) {
          response.headers.set('Set-Cookie', createAuthCookie(full.sessionToken));
        }
        return response;
      }
      default: {
        const { username } = body;
        if (!username) {
          return NextResponse.json({ message: 'Missing username.' }, { status: 400 });
        }
        if (!authToken) {
          return NextResponse.json({ message: 'Authentication token required.' }, { status: 401 });
        }
        if (!(await verifySession(username, authToken))) {
          return NextResponse.json({ message: 'Invalid or expired session token.' }, { status: 403 });
        }

        switch (action) {
          case 'saveWallet': {
            const { wallet } = body;
            if (!wallet) {
              return NextResponse.json({ message: 'Missing wallet data.' }, { status: 400 });
            }
            const account = await addWalletToAccount(username, wallet);
            return NextResponse.json(account);
          }
          case 'removeWallet': {
            const { index } = body;
            if (typeof index !== 'number') {
              return NextResponse.json({ message: 'Missing wallet index.' }, { status: 400 });
            }
            const account = await removeWalletFromAccount(username, index);
            return NextResponse.json(account);
          }
          case 'addNote': {
            const { note } = body;
            if (!note) {
              return NextResponse.json({ message: 'Missing note payload.' }, { status: 400 });
            }
            const account = await addAccountMessage(username, note);
            return NextResponse.json(account);
          }
          case 'removeNote': {
            const { messageId } = body;
            if (!messageId) {
              return NextResponse.json({ message: 'Missing note removal payload.' }, { status: 400 });
            }
            const account = await removeAccountMessage(username, messageId);
            return NextResponse.json(account);
          }
          case 'transaction': {
            const { transaction } = body;
            if (!transaction) {
              return NextResponse.json({ message: 'Missing transaction payload.' }, { status: 400 });
            }
            const account = await addAccountTransaction(username, transaction);
            return NextResponse.json(account);
          }
          case 'transfer': {
            const { recipient, amount, description } = body;
            if (!recipient || typeof amount !== 'number' || amount <= 0) {
              return NextResponse.json({ message: 'Missing or invalid transfer payload.' }, { status: 400 });
            }
            const account = await transferFunds(username, recipient, amount, description ?? '');
            return NextResponse.json(account);
          }
          case 'delete': {
            await deleteAccount(username);
            return NextResponse.json({ success: true });
          }
          default:
            return NextResponse.json({ message: 'Unsupported action.' }, { status: 400 });
        }
      }
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An error occurred.';
    return NextResponse.json({ message }, { status: 400 });
  }
}
