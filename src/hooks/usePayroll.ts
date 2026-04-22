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

function isoDateFor(year: number, month: number, day: number): string {
  const normalized = new Date(year, month, 1);
  const lastDay = new Date(normalized.getFullYear(), normalized.getMonth() + 1, 0).getDate();
  const clamped = Math.min(Math.max(1, day), lastDay);
  const y = normalized.getFullYear();
  const m = String(normalized.getMonth() + 1).padStart(2, '0');
  const d = String(clamped).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isInMonth(dateStr: string, year: number, month: number): boolean {
  const d = new Date(dateStr);
  return d.getFullYear() === year && d.getMonth() === month;
}

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

  const currentMonthPendingAdvances = useCallback(
    (employeeId: string) => {
      const now = new Date();
      return advances
        .filter(
          (a) =>
            a.employeeId === employeeId &&
            !a.settled &&
            isInMonth(a.date, now.getFullYear(), now.getMonth()),
        )
        .reduce((sum, a) => sum + a.amount, 0);
    },
    [advances],
  );

  const addAdvance = useCallback(
    async (employeeId: string, amount: number): Promise<Advance[]> => {
      const employee = employees.find((e) => e.id === employeeId);
      const now = new Date();
      const todayIso = isoDateFor(now.getFullYear(), now.getMonth(), now.getDate());

      let currentPortion = amount;
      let carryPortion = 0;
      let carryDateIso: string | null = null;

      if (employee) {
        const currentMonthPending = advances
          .filter(
            (a) =>
              a.employeeId === employeeId &&
              !a.settled &&
              isInMonth(a.date, now.getFullYear(), now.getMonth()),
          )
          .reduce((sum, a) => sum + a.amount, 0);
        const currentMonthRemaining = Math.max(0, employee.salary - currentMonthPending);
        currentPortion = Math.min(amount, currentMonthRemaining);
        carryPortion = amount - currentPortion;
        if (carryPortion > 0) {
          carryDateIso = isoDateFor(now.getFullYear(), now.getMonth() + 1, employee.payDay);
        }
      }

      const created: Advance[] = [];
      const createdAt = new Date().toISOString();
      if (currentPortion > 0) {
        created.push({
          id: crypto.randomUUID(),
          employeeId,
          amount: currentPortion,
          date: todayIso,
          settled: false,
          createdAt,
        });
      }
      if (carryPortion > 0 && carryDateIso) {
        created.push({
          id: crypto.randomUUID(),
          employeeId,
          amount: carryPortion,
          date: carryDateIso,
          settled: false,
          createdAt,
        });
      }

      for (const a of created) {
        await dbAddAdvance(a);
      }
      setAdvances((prev) => [...prev, ...created]);
      return created;
    },
    [advances, employees],
  );

  const removeAdvance = useCallback(async (id: string) => {
    await dbDeleteAdvance(id);
    setAdvances((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const settlePayday = useCallback(async (employeeId: string) => {
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);
    const pending = advances.filter(
      (a) =>
        a.employeeId === employeeId &&
        !a.settled &&
        new Date(a.date) <= endOfMonth,
    );
    const ids = pending.map((a) => a.id);
    if (ids.length === 0) return;
    const nowIso = now.toISOString();
    await dbSettleAdvances(ids);
    setAdvances((prev) =>
      prev.map((a) => (ids.includes(a.id) ? { ...a, settled: true, settledAt: nowIso } : a)),
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
    currentMonthPendingAdvances,
    advancesForEmployee,
  };
}
