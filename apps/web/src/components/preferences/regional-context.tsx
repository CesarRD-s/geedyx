"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { RegionalContext } from "@/lib/api/types";

const Context = createContext<RegionalContext | null>(null);

export function RegionalContextProvider({
  value,
  children,
}: {
  value: RegionalContext;
  children: ReactNode;
}) {
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useRegionalContext() {
  const context = useContext(Context);
  if (!context)
    throw new Error("Regional context requires the workspace provider");
  return context;
}
