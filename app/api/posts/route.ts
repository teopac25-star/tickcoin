import { NextResponse } from 'next/server';
import { addPost, getPosts, likePost, addPostComment } from '../../../lib/server-db';

export async function GET() {
  const posts = await getPosts();
  return NextResponse.json(posts);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { post } = body;
  if (!post) {
    return NextResponse.json({ message: 'Missing post payload.' }, { status: 400 });
  }
  const saved = await addPost(post);
  return NextResponse.json(saved);
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { action, postId, comment } = body;

  if (!action || !postId) {
    return NextResponse.json({ message: 'Missing action or postId.' }, { status: 400 });
  }

  try {
    if (action === 'like') {
      const updated = await likePost(postId);
      return NextResponse.json(updated);
    }

    if (action === 'comment') {
      if (!comment) {
        return NextResponse.json({ message: 'Missing comment body.' }, { status: 400 });
      }
      const updated = await addPostComment(postId, comment);
      return NextResponse.json(updated);
    }

    return NextResponse.json({ message: 'Unsupported action.' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An error occurred.';
    return NextResponse.json({ message }, { status: 400 });
  }
}
