"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type CrmSearchContextValue = {
  globalSearch: string;
  setGlobalSearch: (value: string) => void;
};

const CrmSearchContext = createContext<CrmSearchContextValue | null>(null);

export function CrmSearchProvider({ children }: { children: ReactNode }) {
  const [globalSearch, setGlobalSearch] = useState("");
  const value = useMemo(() => ({ globalSearch, setGlobalSearch }), [globalSearch]);
  return <CrmSearchContext.Provider value={value}>{children}</CrmSearchContext.Provider>;
}

export function useCrmSearch() {
  const ctx = useContext(CrmSearchContext);
  if (!ctx) {
    throw new Error("useCrmSearch must be used within CrmSearchProvider");
  }
  return ctx;
}
