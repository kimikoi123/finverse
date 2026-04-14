import { useState, useEffect, useCallback } from 'react';
import type { Employee, Advance } from '../types';
import {
  loadEmployees,
  addEmployee as dbAddEmployee,
  updateEmployee as dbUpdateEmployee,
  deleteEmployee as dbDeleteEmployee,
  loadAdvances,
  addAdvance as dbAddAdvance,
  deleteAdvance as dbDeleteAdvance,
  settleAdvances as dbSettleAdvances,
} from '../db/storage';
import { useRefreshOnRemote } from './useRefreshOnRemote';

export function usePayroll() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [e, a] = await Promise.all([loadEmployees(), loadAdvances()]);
    setEmployees(e);
    setAdvances(a);
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  useRefreshOnRemote(refresh);

  const addEmployee = useCallback(async (data: Omit<Employee, 'id' | 'createdAt'>) => {
    const employee: Employee = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    await dbAddEmployee(employee);
    setEmployees((prev) => [...prev, employee]);
    return employee;
  }, []);

  const editEmployee = useCallback(async (id: string, updates: Partial<Employee>) => {
    await dbUpdateEmployee(id, updates);
    setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
  }, []);

  const removeEmployee = useCallback(async (id: string) => {
    await dbDeleteEmployee(id);
    setEmployees((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const pendingAdvancesFor = useCallback(
    (employeeId: string) => advances.filter((a) => a.employeeId === employeeId && !a.settled),
    [advances],
  );

  const totalPendingAdvances = useCallback(
    (employeeId: string) => pendingAdvancesFor(employeeId).reduce((sum, a) => sum + a.amount, 0),
    [pendingAdvancesFor],
  );

  const addAdvance = useCallback(async (employeeId: string, amount: number) => {
    const advance: Advance = {
      id: crypto.randomUUID(),
      employeeId,
      amount,
      date: new Date().toISOString().split('T')[0]!,
      settled: false,
      createdAt: new Date().toISOString(),
    };
    await dbAddAdvance(advance);
    setAdvances((prev) => [...prev, advance]);
    return advance;
  }, []);

  const removeAdvance = useCallback(async (id: string) => {
    await dbDeleteAdvance(id);
    setAdvances((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const settlePayday = useCallback(async (employeeId: string) => {
    const pending = advances.filter((a) => a.employeeId === employeeId && !a.settled);
    const ids = pending.map((a) => a.id);
    if (ids.length === 0) return;
    const now = new Date().toISOString();
    await dbSettleAdvances(ids);
    setAdvances((prev) =>
      prev.map((a) => (ids.includes(a.id) ? { ...a, settled: true, settledAt: now } : a)),
    );
  }, [advances]);

  const advancesForEmployee = useCallback(
    (employeeId: string) => advances.filter((a) => a.employeeId === employeeId),
    [advances],
  );

  return {
    employees,
    advances,
    loading,
    addEmployee,
    editEmployee,
    removeEmployee,
    addAdvance,
    removeAdvance,
    settlePayday,
    pendingAdvancesFor,
    totalPendingAdvances,
    advancesForEmployee,
  };
}
