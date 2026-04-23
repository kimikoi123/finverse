import { useState, useEffect, useCallback } from 'react';
import type { Rule } from '../types';
import {
  loadRules,
  addRule as dbAddRule,
  updateRule as dbUpdateRule,
  deleteRule as dbDeleteRule,
} from '../db/storage';
import { useRefreshOnRemote } from './useRefreshOnRemote';

export function useRules() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const r = await loadRules();
    setRules(r);
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  useRefreshOnRemote(refresh);

  const addRule = useCallback(async (data: Omit<Rule, 'id' | 'createdAt'>) => {
    const rule: Rule = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    await dbAddRule(rule);
    setRules((prev) => [...prev, rule]);
    return rule;
  }, []);

  const editRule = useCallback(async (id: string, updates: Partial<Rule>) => {
    await dbUpdateRule(id, updates);
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  }, []);

  const removeRule = useCallback(async (id: string) => {
    await dbDeleteRule(id);
    setRules((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return { rules, loading, addRule, editRule, removeRule };
}
