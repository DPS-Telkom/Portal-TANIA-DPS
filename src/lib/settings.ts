"use client";

import { useEffect, useState } from "react";

import { supabase } from "./supabase";

export interface Thresholds {
  utilizationOver: number;
  utilizationUnder: number;
  budgetWarning: number;
  budgetCritical: number;
}

// PRD defaults (WA-03, BC-04) — used until app_settings loads.
export const DEFAULT_THRESHOLDS: Thresholds = {
  utilizationOver: 100,
  utilizationUnder: 60,
  budgetWarning: 80,
  budgetCritical: 100,
};

export function useThresholds(): Thresholds {
  const [t, setT] = useState(DEFAULT_THRESHOLDS);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("app_settings").select("key, value");
      if (!data) return;
      const get = (k: string, d: number) => Number(data.find((r) => r.key === k)?.value ?? d);
      setT({
        utilizationOver: get("utilization_over_pct", DEFAULT_THRESHOLDS.utilizationOver),
        utilizationUnder: get("utilization_under_pct", DEFAULT_THRESHOLDS.utilizationUnder),
        budgetWarning: get("budget_warning_pct", DEFAULT_THRESHOLDS.budgetWarning),
        budgetCritical: get("budget_critical_pct", DEFAULT_THRESHOLDS.budgetCritical),
      });
    })();
  }, []);
  return t;
}
