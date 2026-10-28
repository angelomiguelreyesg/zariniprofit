"use client";

import { createContext, useContext } from "react";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types";

type AppContextValue = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
};

export const AppContext = createContext<AppContextValue>({
  user: null,
  profile: null,
  loading: true,
});

export function useApp() {
  return useContext(AppContext);
}
