import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";

import { useAppSelector } from "../store/hooks";
import { Lang, STRINGS, TKey } from "./translations";

// Persisted with expo-secure-store (same store used for auth tokens / wishlist),
// so the rider's choice survives restarts. Key is namespaced like the others.
const KEY = "mk_lang";

type Vars = Record<string, string | number>;
type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TKey, vars?: Vars) => string;
};

const LanguageContext = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  // The language switch is a RIDER-only feature. Customers always see English,
  // even though the stored preference is device-wide (a rider may have set Hindi
  // on a shared screen like Notifications).
  const isRider = useAppSelector((s) => !!s.auth.user?.is_rider);

  useEffect(() => {
    SecureStore.getItemAsync(KEY)
      .then((v) => {
        if (v === "en" || v === "hi") setLangState(v);
      })
      .catch(() => {
        /* default English */
      });
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    SecureStore.setItemAsync(KEY, l).catch(() => {
      /* best-effort persistence */
    });
  }, []);

  // Effective language: only riders get the chosen language; everyone else "en".
  const effLang: Lang = isRider ? lang : "en";

  const t = useCallback(
    (key: TKey, vars?: Vars) => {
      const table = STRINGS[effLang] as Record<string, string>;
      let s = table[key] ?? (STRINGS.en as Record<string, string>)[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
      }
      return s;
    },
    [effLang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): Ctx {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}

// Convenience hook when a component only needs the translate function.
export function useT() {
  return useLanguage().t;
}
