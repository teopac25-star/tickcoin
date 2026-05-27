import { NextResponse } from 'next/server';
import { addChatMessage, getChatMessages } from '../../../lib/server-db';

function sanitizeText(value: unknown, maxLength = 1000) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

export async function GET() {
  const messages = await getChatMessages();
  return NextResponse.json(messages, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const message = sanitizeText(body?.message);
  if (!message) {
    return NextResponse.json({ message: 'Missing or invalid message payload.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }

  const saved = await addChatMessage({
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    user: 'anonymous',
    text: message,
    timestamp: new Date().toISOString(),
  });
  return NextResponse.json(saved, { headers: { 'Cache-Control': 'no-store' } });
}
