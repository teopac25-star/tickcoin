"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "tickcoin_account";

export interface AccountData {
  username: string;
  email?: string;
  balance: number;
  wallets?: unknown[];
  messages?: unknown[];
  transactions?: unknown[];
  notifications?: unknown[];
  [key: string]: unknown;
}

interface AccountContextValue {
  account: AccountData | null;
  setAccount: (account: AccountData | null) => void;
  updateAccount: (updater: (current: AccountData | null) => AccountData | null) => void;
  clearAccount: () => void;
}

const AccountContext = createContext<AccountContextValue | undefined>(undefined);

function readStoredAccount(): AccountData | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as AccountData;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function sanitizeStoredAccount(account: AccountData): AccountData {
  const { password, sessionToken, ...rest } = account as Record<string, unknown>;

  return {
    ...(rest as AccountData),
    wallets: Array.isArray(account.wallets)
      ? account.wallets.map((wallet) => ({ address: String((wallet as { address?: unknown }).address || '') }))
      : [],
  };
}

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccountState] = useState<AccountData | null>(() => readStoredAccount());

  const persistAccount = useCallback((nextAccount: AccountData | null) => {
    if (typeof window === "undefined") {
      setAccountState(nextAccount);
      return;
    }

    if (nextAccount) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizeStoredAccount(nextAccount)));
      setAccountState(sanitizeStoredAccount(nextAccount));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
      setAccountState(null);
    }
  }, []);

  const updateAccount = useCallback(
    (updater: (current: AccountData | null) => AccountData | null) => {
      setAccountState((current) => {
        const next = updater(current);
        const sanitized = next ? sanitizeStoredAccount(next) : null;
        if (typeof window !== "undefined") {
          if (sanitized) {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
          } else {
            window.localStorage.removeItem(STORAGE_KEY);
          }
        }
        return sanitized;
      });
    },
    [],
  );

  const clearAccount = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setAccountState(null);
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      if (event.newValue) {
        try {
          setAccountState(JSON.parse(event.newValue));
        } catch {
          setAccountState(null);
        }
      } else {
        setAccountState(null);
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return (
    <AccountContext.Provider
      value={{
        account,
        setAccount: persistAccount,
        updateAccount,
        clearAccount,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error("useAccount must be used within an AccountProvider");
  }
  return context;
}

export default AccountProvider;
