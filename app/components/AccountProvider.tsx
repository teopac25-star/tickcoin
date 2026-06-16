"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "tickcoin_account";

export interface AccountData {
  username: string;
  email?: string;
  balance: number;
  wallets?: Array<{ address: string }>;
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

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccountState] = useState<AccountData | null>(null);

  const persistAccount = useCallback((nextAccount: AccountData | null) => {
    if (typeof window === "undefined") {
      setAccountState(nextAccount);
      return;
    }

    if (nextAccount) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextAccount));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setAccountState(nextAccount);
  }, []);

  const updateAccount = useCallback(
    (updater: (current: AccountData | null) => AccountData | null) => {
      setAccountState((current) => {
        const next = updater(current);
        if (typeof window !== "undefined") {
          if (next) {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          } else {
            window.localStorage.removeItem(STORAGE_KEY);
          }
        }
        return next;
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
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as AccountData;
        setAccountState(parsed);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
        setAccountState(null);
      }
    }

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
