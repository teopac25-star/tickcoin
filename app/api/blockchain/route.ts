import { NextResponse } from 'next/server';
import { getChain, getChainTemplate, resetChain, setChainName, submitBlock } from '../../../lib/blockchain';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const template = url.searchParams.get('template');
  const chain = await getChain();

  if (template === 'true') {
    const chainTemplate = await getChainTemplate();
    return NextResponse.json({ ...chainTemplate, chainLength: chain.blocks.length }, { headers: { 'Cache-Control': 'no-store' } });
  }

  return NextResponse.json(
    {
      chainName: chain.chainName,
      difficulty: chain.difficultyPrefix,
      chainLength: chain.blocks.length,
      tip: chain.blocks[chain.blocks.length - 1],
      blocks: chain.blocks.slice(-20).reverse(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const action = (body?.action as string) || 'submit';

  try {
    if (action === 'submit') {
      const candidate = body?.block;
      if (!candidate || typeof candidate !== 'object') {
        return NextResponse.json({ message: 'Missing block payload.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
      }

      const chain = await submitBlock({
        chainName: String(candidate.chainName || ''),
        previousHash: String(candidate.previousHash || ''),
        index: Number(candidate.index || 0),
        timestamp: String(candidate.timestamp || ''),
        data: String(candidate.data || ''),
        base: String(candidate.base || ''),
        nonce: Number(candidate.nonce || 0),
        hash: String(candidate.hash || ''),
      });
      return NextResponse.json({ success: true, chain }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (action === 'setName') {
      const nextName = String(body?.chainName || '').trim();
      if (!nextName) {
        return NextResponse.json({ message: 'Missing chain name.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
      }
      const chain = await setChainName(nextName);
      return NextResponse.json({ success: true, chain }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (action === 'reset') {
      const chain = await resetChain(String(body?.chainName || ''));
      return NextResponse.json({ success: true, chain }, { headers: { 'Cache-Control': 'no-store' } });
    }

    return NextResponse.json({ message: 'Unsupported action.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  } catch (error: unknown) {
    return NextResponse.json({ message: error instanceof Error ? error.message : String(error) || 'Invalid block.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
}
