// Het overzicht van de eigen koppelingen, gedeeld door de menubalk en de
// schermen Voor mij, Cliënten en Berichten. Het wordt ververst als de app
// weer naar voren komt en als er live iets nieuws binnenkomt.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { fetchAssignments, type Assignment } from './data';
import { supabase } from './supabase';

type Overview = {
  assignments: Assignment[];
  /** true tot de eerste keer ophalen klaar is */
  loading: boolean;
  failed: boolean;
  refresh(): Promise<void>;
};

const OverviewContext = createContext<Overview | null>(null);

export function OverviewProvider({ children }: { children: ReactNode }) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const alive = useRef(true);
  // Alleen het antwoord op de laatste vraag telt; een ouder antwoord dat
  // later binnenkomt, mag nieuwere tellers niet overschrijven.
  const latest = useRef(0);

  const refresh = useCallback(async () => {
    const call = ++latest.current;
    const current = () => alive.current && call === latest.current;
    try {
      const rows = await fetchAssignments();
      if (!current()) return;
      setAssignments(rows);
      setFailed(false);
    } catch {
      if (current()) setFailed(true);
    } finally {
      if (current()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    refresh();
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    // Live: een nieuw bericht of persoonlijk onderdeel werkt de tellers bij.
    const channel = supabase
      ?.channel('overzicht')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => refresh())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'personal_items' }, () => refresh())
      .subscribe();
    return () => {
      alive.current = false;
      appState.remove();
      if (channel) supabase?.removeChannel(channel);
    };
  }, [refresh]);

  const value = useMemo(() => ({ assignments, loading, failed, refresh }), [assignments, loading, failed, refresh]);
  return <OverviewContext.Provider value={value}>{children}</OverviewContext.Provider>;
}

export function useOverview(): Overview {
  const value = useContext(OverviewContext);
  if (!value) throw new Error('useOverview hoort binnen OverviewProvider');
  return value;
}

/** Eén koppeling uit het overzicht, of null als die (nog) niet bekend is. */
export function useAssignment(id: string | undefined): Assignment | null {
  const { assignments } = useOverview();
  return assignments.find((assignment) => assignment.assignment_id === id) ?? null;
}
