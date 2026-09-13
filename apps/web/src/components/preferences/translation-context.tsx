"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import {
  getTranslations,
  supportedLocale,
  type MessageKey,
} from "@/lib/i18n/catalogs";

const TranslationContext = createContext<((key: MessageKey) => string) | null>(
  null,
);

export function TranslationProvider({
  locale,
  children,
}: {
  locale: string;
  children: ReactNode;
}) {
  const effectiveLocale = supportedLocale(locale);
  const translate = useMemo(
    () => getTranslations(effectiveLocale),
    [effectiveLocale],
  );
  useEffect(() => {
    document.documentElement.lang = effectiveLocale;
  }, [effectiveLocale]);
  return (
    <TranslationContext.Provider value={translate}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslations() {
  const translate = useContext(TranslationContext);
  if (!translate)
    throw new Error("Translations require the workspace provider");
  return translate;
}
