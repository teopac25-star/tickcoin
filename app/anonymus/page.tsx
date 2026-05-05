'use client';

import { useEffect, useState } from 'react';
import SiteShell from '../components/SiteShell';

interface AnonymousComment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

interface AnonymousPost {
  id: string;
  author: string;
  caption: string;
  imageUrl?: string;
  createdAt: string;
  likes: number;
  comments: AnonymousComment[];
}

const SESSION_KEY = 'tickcoin_session';

const getSessionUsername = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(SESSION_KEY);
    if (!stored) return null;
    return JSON.parse(stored)?.username ?? null;
  } catch {
    return null;
  }
};

async function loadAnonymusPosts(): Promise<AnonymousPost[]> {
  try {
    const response = await fetch('/api/posts');
    if (!response.ok) return [];
    const data = await response.json();
    if (!Array.isArray(data)) return [];
    return data;
  } catch {
    return [];
  }
}

function saveAnonymusPosts(posts: AnonymousPost[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('tickcoin_anonymus_posts', JSON.stringify(posts));
}

export default function AnonymusPage() {
  const [posts, setPosts] = useState<AnonymousPost[]>([]);
  const [caption, setCaption] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState('Anonymous');
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      const stored = await loadAnonymusPosts();
      setPosts(stored);
    };

    load();

    const username = getSessionUsername();
    if (username) {
      setStatus(`Anon-${username.slice(0, 6)}`);
    }
  }, []);

  const createPost = async () => {
    if (!caption.trim() && !imageUrl.trim()) {
      setError('Write a caption or add a photo URL to post.');
      return;
    }

    const newPost: AnonymousPost = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      author: status,
      caption: caption.trim() || 'Shared a new memory.',
      imageUrl: imageUrl.trim() || undefined,
      createdAt: new Date().toISOString(),
      likes: 0,
      comments: [],
    };

    const nextPosts = [newPost, ...posts];
    setPosts(nextPosts);
    saveAnonymusPosts(nextPosts);
    setCaption('');
    setImageUrl('');
    setError('');
  };

  const likePost = (id: string) => {
    const updated = posts.map((post) =>
      post.id === id ? { ...post, likes: post.likes + 1 } : post
    );
    setPosts(updated);
    saveAnonymusPosts(updated);
  };

  const addComment = (postId: string) => {
    const text = commentDrafts[postId]?.trim();
    if (!text) return;
    const updated = posts.map((post) => {
      if (post.id !== postId) return post;
      const comment: AnonymousComment = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        author: status,
        text,
        createdAt: new Date().toISOString(),
      };
      return { ...post, comments: [...post.comments, comment] };
    });
    setPosts(updated);
    saveAnonymusPosts(updated);
    setCommentDrafts({ ...commentDrafts, [postId]: '' });
  };

  return (
    <SiteShell>
      <main className="max-w-5xl mx-auto py-16 px-6">
        <div className="mb-10 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-400">TickCoin Anonymus Feed</p>
          <h1 className="text-4xl font-bold text-black dark:text-zinc-50 mt-4">Post photos and updates anonymously</h1>
          <p className="mt-3 text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Share a photo, write a post, and browse the anonymous feed. Everything is stored locally so you can post fast without an account.
          </p>
        </div>

        <section className="rounded-3xl bg-white dark:bg-zinc-800 p-6 shadow-lg ring-1 ring-zinc-100 dark:ring-zinc-800 mb-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Posting as</p>
              <p className="text-xl font-semibold text-black dark:text-zinc-50">{status}</p>
            </div>
            <div className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
              {posts.length} posts in feed
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            <textarea
              rows={4}
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="Write your anonymous story or post..."
              className="w-full rounded-3xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-black outline-none transition focus:border-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <input
              type="url"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="Photo URL (optional)"
              className="w-full rounded-3xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-black outline-none transition focus:border-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={createPost}
                className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
              >
                Post to Anonymus
              </button>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Your posts stay local to your browser. Use the feed to share photos, announcements, or status updates.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          {posts.length === 0 ? (
            <div className="rounded-3xl bg-white dark:bg-zinc-800 p-8 shadow-lg ring-1 ring-zinc-100 dark:ring-zinc-800">
              <p className="text-lg text-zinc-600 dark:text-zinc-400">No anonymous posts yet. Be the first to share a photo or update.</p>
            </div>
          ) : (
            posts.map((post) => (
              <article key={post.id} className="rounded-3xl bg-white dark:bg-zinc-800 p-6 shadow-lg ring-1 ring-zinc-100 dark:ring-zinc-800">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-black dark:text-zinc-50">{post.author}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{new Date(post.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
                    {post.likes} likes
                  </div>
                </div>
                {post.imageUrl ? (
                  <div className="mt-5 overflow-hidden rounded-3xl bg-zinc-100 dark:bg-zinc-900">
                    <img src={post.imageUrl} alt="Anonymous post image" className="h-80 w-full object-cover" />
                  </div>
                ) : null}
                <p className="mt-5 text-sm leading-6 text-zinc-700 dark:text-zinc-200">{post.caption}</p>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => likePost(post.id)}
                    className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Like
                  </button>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Anonymous shared post</p>
                </div>
                <div className="mt-6 rounded-3xl bg-zinc-50 p-4 dark:bg-zinc-900">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Comments</p>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">{post.comments.length} replies</span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {post.comments.length === 0 ? (
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">No comments yet. Be first to reply.</p>
                    ) : (
                      post.comments.map((comment) => (
                        <div key={comment.id} className="rounded-3xl bg-white p-3 dark:bg-zinc-800">
                          <div className="flex items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100">{comment.author}</span>
                            <span>{new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{comment.text}</p>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="mt-4 space-y-3">
                    <textarea
                      rows={2}
                      value={commentDrafts[post.id] || ''}
                      onChange={(event) => setCommentDrafts({ ...commentDrafts, [post.id]: event.target.value })}
                      placeholder="Write a comment..."
                      className="w-full rounded-3xl border border-zinc-200 bg-white px-4 py-3 text-sm text-black outline-none transition focus:border-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                    <button
                      type="button"
                      onClick={() => addComment(post.id)}
                      className="rounded-full bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
                    >
                      Comment
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </section>
      </main>
    </SiteShell>
  );
}
