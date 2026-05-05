'use client';

import { useEffect, useMemo, useState } from 'react';
import SiteShell from '../components/SiteShell';

interface ChatMessage {
  id: string;
  user: string;
  text: string;
  timestamp: string;
  recipient?: string;
}

const SESSION_KEY = 'ionut_session';
const MAX_MESSAGES = 120;

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

async function loadChatMessages(): Promise<ChatMessage[]> {
  try {
    const response = await fetch('/api/chat');
    if (!response.ok) return [];
    const data = await response.json();
    if (!Array.isArray(data)) return [];
    return data.slice(0, MAX_MESSAGES);
  } catch {
    return [];
  }
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [username, setUsername] = useState('Guest');
  const [draft, setDraft] = useState('');
  const [selectedThread, setSelectedThread] = useState('Global');
  const [manualRecipient, setManualRecipient] = useState('');
  const [status, setStatus] = useState('Connected');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const username = getSessionUsername();
    if (username) {
      setUsername(username);
    }

    const load = async () => {
      const messages = await loadChatMessages();
      setMessages(messages);
    };

    load();
    const interval = window.setInterval(load, 7000);

    return () => window.clearInterval(interval);
  }, []);

  const contacts = useMemo(() => {
    const set = new Set<string>();
    messages.forEach((message) => {
      if (message.user && message.user !== username) {
        set.add(message.user);
      }
      if (message.recipient && message.recipient !== username) {
        set.add(message.recipient);
      }
    });
    return Array.from(set).sort();
  }, [messages, username]);

  const threadCounts = useMemo(() => {
    const counts = new Map<string, number>();
    messages.forEach((message) => {
      if (!message.recipient) return;
      const other = message.user === username ? message.recipient : message.user;
      if (!other || other === username) return;
      counts.set(other, (counts.get(other) || 0) + 1);
    });
    return counts;
  }, [messages, username]);

  const visibleMessages = useMemo(() => {
    if (selectedThread === 'Global') {
      return messages.filter((message) => !message.recipient);
    }

    return messages.filter((message) => {
      const other = selectedThread;
      return (
        (message.user === username && message.recipient === other) ||
        (message.user === other && message.recipient === username)
      );
    });
  }, [messages, selectedThread, username]);

  const sendMessage = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;

    const newMessage: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      user: username || 'Guest',
      text: trimmed,
      timestamp: new Date().toISOString(),
      recipient:
        selectedThread === 'Global'
          ? manualRecipient.trim() || undefined
          : selectedThread,
    };

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage }),
      });
      if (response.ok) {
        const saved = await response.json();
        setMessages((prev) => [saved, ...prev].slice(0, MAX_MESSAGES));
      } else {
        setMessages((prev) => [newMessage, ...prev].slice(0, MAX_MESSAGES));
      }
    } catch {
      setMessages((prev) => [newMessage, ...prev].slice(0, MAX_MESSAGES));
    }

    if (selectedThread === 'Global' && manualRecipient.trim()) {
      setSelectedThread(manualRecipient.trim());
      setManualRecipient('');
    }

    setDraft('');
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <SiteShell>
      <main className="max-w-5xl mx-auto py-16 px-6">
        <div className="mb-10 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-400">Ionut Live Chat</p>
          <h1 className="text-4xl font-bold text-black dark:text-zinc-50 mt-4">Chat with other users</h1>
          <p className="mt-3 text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Interact with other Ionut users in real time. Messages synchronize across browser tabs and local sessions.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
          <section className="space-y-6 rounded-3xl bg-white dark:bg-zinc-800 p-6 shadow-lg ring-1 ring-zinc-100 dark:ring-zinc-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Signed in as</p>
                <p className="text-lg font-semibold text-black dark:text-zinc-50">{username}</p>
              </div>
              <div className="rounded-full bg-zinc-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
                {status}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Conversations</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Select a thread or start a private chat.</p>
                  </div>
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {selectedThread === 'Global' ? 'Global' : 'Private'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedThread('Global');
                    setManualRecipient('');
                  }}
                  className={`mb-3 w-full rounded-3xl px-4 py-3 text-left text-sm font-medium transition ${
                    selectedThread === 'Global'
                      ? 'bg-black text-white'
                      : 'bg-white text-zinc-900 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  Global room
                </button>
                {contacts.length === 0 ? (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">No private conversations yet.</p>
                ) : (
                  <div className="space-y-2">
                    {contacts.map((contact) => (
                      <button
                        key={contact}
                        type="button"
                        onClick={() => setSelectedThread(contact)}
                        className={`w-full rounded-3xl px-4 py-3 text-left text-sm font-medium transition ${
                          selectedThread === contact
                            ? 'bg-black text-white'
                            : 'bg-white text-zinc-900 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700'
                        }`}
                      >
                        {contact}
                      </button>
                    ))}
                  </div>
                )}
                <div className="mt-4 space-y-3">
                  <label className="block text-sm text-zinc-700 dark:text-zinc-300">
                    New private chat
                    <input
                      type="text"
                      value={manualRecipient}
                      onChange={(event) => setManualRecipient(event.target.value)}
                      placeholder="Recipient username"
                      className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-black dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const recipientName = manualRecipient.trim();
                      if (recipientName) {
                        setSelectedThread(recipientName);
                        setManualRecipient('');
                      }
                    }}
                    className="w-full rounded-full bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Open private chat
                  </button>
                </div>
              </div>
              <input
                type="text"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message here..."
                className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-black outline-none transition focus:border-black focus:bg-white dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
              <button
                type="button"
                onClick={sendMessage}
                className="inline-flex h-12 items-center justify-center rounded-full bg-black px-6 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
              >
                Send Message
              </button>
            </div>

            <div className="rounded-3xl bg-zinc-50 p-4 text-sm text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
              <p className="font-semibold">Chat notes</p>
              <ul className="mt-3 space-y-2 list-disc pl-5">
                <li>Messages are persisted locally in your browser.</li>
                <li>BroadcastChannel syncs across tabs when supported.</li>
                <li>Use the same username across sessions by creating an account first.</li>
              </ul>
            </div>
          </section>

          <section className="rounded-3xl bg-white dark:bg-zinc-800 p-6 shadow-lg ring-1 ring-zinc-100 dark:ring-zinc-800">
            <div className="mb-6 rounded-3xl bg-zinc-50 p-4 dark:bg-zinc-900">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Current thread</p>
              <h2 className="text-2xl font-semibold text-black dark:text-zinc-50">
                {selectedThread === 'Global' ? 'Global Room' : `Private chat with ${selectedThread}`}
              </h2>
            </div>
            <div className="space-y-4">
              {visibleMessages.length === 0 ? (
                <div className="rounded-3xl bg-zinc-100 p-6 text-sm text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
                  {selectedThread === 'Global'
                    ? 'No messages in the global room yet. Start the conversation.'
                    : `No private messages with ${selectedThread} yet. Send one to start.`}
                </div>
              ) : (
                visibleMessages.map((message) => {
                  const isMine = message.user === username;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-3xl p-4 text-sm leading-6 shadow-sm ${
                          isMine
                            ? 'bg-slate-900 text-white rounded-br-[6px] rounded-bl-3xl rounded-tr-3xl rounded-tl-3xl'
                            : 'bg-white text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 rounded-bl-[6px] rounded-br-3xl rounded-tl-3xl rounded-tr-3xl'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                          <span className="font-semibold">{isMine ? 'You' : message.user}</span>
                          <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="mt-3 whitespace-pre-wrap">{message.text}</p>
                        {message.recipient && selectedThread === 'Global' ? (
                          <p className="mt-3 text-[11px] text-zinc-500 dark:text-zinc-400">Private to {message.recipient}</p>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </main>
    </SiteShell>
  );
}
