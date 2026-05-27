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

function extractAuthToken(request: Request) {
  return (request.headers.get(AUTH_HEADER) ?? '').trim();
}

type ResponseConfig = number | { status: number };

function responseJson(body: unknown, status: ResponseConfig = 200) {
  const responseStatus = typeof status === 'number' ? status : status.status;
  return NextResponse.json(body, {
    status: responseStatus,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const username = url.searchParams.get('username');
  if (!username) {
    return responseJson({ message: 'Missing username query parameter.' }, { status: 400 });
  }

  const token = extractAuthToken(request);
  if (!token) {
    return responseJson({ message: 'Authentication token required.' }, { status: 401 });
  }

  if (!(await verifySession(username, token))) {
    return responseJson({ message: 'Invalid or expired session token.' }, { status: 403 });
  }

  const account = await getAccount(username);
  if (!account) {
    return responseJson({ message: 'Account not found.' }, { status: 404 });
  }
  return responseJson(account);
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
          return responseJson({ message: 'Missing registration fields.' }, { status: 400 });
        }
        const account = await registerAccount(username, email, password);
        const full = await getAccountByUsername(username);
        return responseJson({
          account,
          token: full?.sessionToken ?? null,
        });
      }
      case 'login': {
        const { username, password } = body;
        if (!username || !password) {
          return responseJson({ message: 'Missing login credentials.' }, { status: 400 });
        }
        const account = await loginAccount(username, password);
        const full = await getAccountByUsername(username);
        return responseJson({
          account,
          token: full?.sessionToken ?? null,
        });
      }
      default: {
        const { username } = body;
        if (!username) {
          return responseJson({ message: 'Missing username.' }, { status: 400 });
        }
        if (!authToken) {
          return responseJson({ message: 'Authentication token required.' }, { status: 401 });
        }
        if (!(await verifySession(username, authToken))) {
          return responseJson({ message: 'Invalid or expired session token.' }, { status: 403 });
        }

        switch (action) {
          case 'saveWallet': {
            const { wallet } = body;
            if (!wallet) {
              return responseJson({ message: 'Missing wallet data.' }, { status: 400 });
            }
            const account = await addWalletToAccount(username, wallet);
            return responseJson(account);
          }
          case 'removeWallet': {
            const { index } = body;
            if (typeof index !== 'number') {
              return responseJson({ message: 'Missing wallet index.' }, { status: 400 });
            }
            const account = await removeWalletFromAccount(username, index);
            return responseJson(account);
          }
          case 'addNote': {
            const { note } = body;
            if (!note) {
              return responseJson({ message: 'Missing note payload.' }, { status: 400 });
            }
            const account = await addAccountMessage(username, note);
            return responseJson(account);
          }
          case 'removeNote': {
            const { messageId } = body;
            if (!messageId) {
              return responseJson({ message: 'Missing note removal payload.' }, { status: 400 });
            }
            const account = await removeAccountMessage(username, messageId);
            return responseJson(account);
          }
          case 'transaction': {
            const { transaction } = body;
            if (!transaction) {
              return responseJson({ message: 'Missing transaction payload.' }, { status: 400 });
            }
            const account = await addAccountTransaction(username, transaction);
            return responseJson(account);
          }
          case 'transfer': {
            const { recipient, amount, description } = body;
            if (!recipient || typeof amount !== 'number' || amount <= 0) {
              return responseJson({ message: 'Missing or invalid transfer payload.' }, { status: 400 });
            }
            const account = await transferFunds(username, recipient, amount, description ?? '');
            return responseJson(account);
          }
          case 'delete': {
            await deleteAccount(username);
            return responseJson({ success: true });
          }
          default:
            return responseJson({ message: 'Unsupported action.' }, { status: 400 });
        }
      }
    }
  } catch (error: unknown) {
    return responseJson({ message: error instanceof Error ? error.message : String(error) || 'An error occurred.' }, { status: 400 });
  }
}
