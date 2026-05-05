import { NextResponse } from 'next/server';
import { addChatMessage, getChatMessages } from '../../../lib/server-db';

export async function GET() {
  const messages = await getChatMessages();
  return NextResponse.json(messages);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { message } = body;
  if (!message) {
    return NextResponse.json({ message: 'Missing message payload.' }, { status: 400 });
  }
  const saved = await addChatMessage(message);
  return NextResponse.json(saved);
}
