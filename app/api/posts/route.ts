import { NextResponse } from 'next/server';
import { addPost, getPosts, likePost, addPostComment } from '../../../lib/server-db';

function sanitizeText(value: unknown, maxLength = 1000) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

export async function GET() {
  const posts = await getPosts();
  return NextResponse.json(posts, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const author = sanitizeText(body?.post?.author, 80) || 'anonymous';
  const caption = sanitizeText(body?.post?.caption, 1000);
  const imageUrl = typeof body?.post?.imageUrl === 'string' ? body.post.imageUrl.trim().slice(0, 1024) : undefined;

  if (!caption) {
    return NextResponse.json({ message: 'Missing or invalid post payload.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }

  const saved = await addPost({
    id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    author,
    caption,
    imageUrl,
    createdAt: new Date().toISOString(),
    likes: 0,
    comments: [],
  });
  return NextResponse.json(saved, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => ({}));
  const action = sanitizeText(body?.action, 20);
  const postId = sanitizeText(body?.postId, 80);

  if (!action || !postId) {
    return NextResponse.json({ message: 'Missing action or postId.' }, { status: 400 });
  }

  try {
    if (action === 'like') {
      const updated = await likePost(postId);
      return NextResponse.json(updated, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (action === 'comment') {
      const commentText = sanitizeText(body?.comment, 500);
      if (!commentText) {
        return NextResponse.json({ message: 'Missing comment body.' }, { status: 400 });
      }

      const updated = await addPostComment(postId, {
        id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        author: 'anonymous',
        text: commentText,
        createdAt: new Date().toISOString(),
      });
      return NextResponse.json(updated, { headers: { 'Cache-Control': 'no-store' } });
    }

    return NextResponse.json({ message: 'Unsupported action.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ message: message || 'An error occurred.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
}
