// Wie is er ingelogd, en wat mag die persoon?
// De database beslist zelf wat iemand mag zien; dit bestand zorgt er alleen
// voor dat de app het juiste scherm toont.

import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { supabase } from './supabase';

export type Role = 'client' | 'coach' | 'admin';
export type AccountStatus = 'invited' | 'active' | 'blocked' | 'closed';
export type Profile = { id: string; full_name: string; role: Role; status: AccountStatus };

type AuthState = {
  /** false zolang de opgeslagen sessie nog wordt opgehaald */
  ready: boolean;
  session: Session | null;
  /** het profiel van de ingelogde gebruiker; null als het (nog) niet is opgehaald */
  profile: Profile | null;
  /** true zolang het profiel wordt opgehaald */
  profileLoading: boolean;
  reloadProfile(): void;
  signIn(email: string, password: string): Promise<string | null>;
  signOut(): Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

function messageFor(error: { message?: string; status?: number }): string {
  const text = (error.message ?? '').toLowerCase();
  if (text.includes('invalid login credentials')) return 'Het e-mailadres of wachtwoord klopt niet.';
  if (text.includes('email not confirmed')) return 'Dit account is nog niet bevestigd. Gebruik de link uit je uitnodiging.';
  if (text.includes('network') || text.includes('fetch')) return 'Geen verbinding. Controleer je internet en probeer het opnieuw.';
  if (error.status === 429) return 'Te veel pogingen. Wacht even en probeer het opnieuw.';
  return 'Inloggen is niet gelukt. Probeer het opnieuw.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [attempt, setAttempt] = useState(0);
  // voor welke gebruiker en poging het profiel al is opgehaald
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setReady(true);
    });
    // In deze callback alleen de sessie bijwerken; gegevens ophalen gebeurt hieronder.
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const userId = session?.user.id ?? null;
  const key = userId ? `${userId}:${attempt}` : null;
  const profileLoading = key !== null && loadedKey !== key;
  useEffect(() => {
    if (!supabase || !userId || !key) {
      setProfile(null);
      return;
    }
    let active = true;
    supabase
      .from('profiles')
      .select('id, full_name, role, status')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data: row }) => {
        if (!active) return;
        setProfile((row as Profile | null) ?? null);
        setLoadedKey(key);
      });
    return () => {
      active = false;
    };
  }, [userId, key]);

  const reloadProfile = useCallback(() => setAttempt((count) => count + 1), []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return 'De app is nog niet aan Supabase gekoppeld.';
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return error ? messageFor(error) : null;
  }, []);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
  }, []);

  const value = useMemo(
    () => ({ ready, session, profile, profileLoading, reloadProfile, signIn, signOut }),
    [ready, session, profile, profileLoading, reloadProfile, signIn, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth hoort binnen AuthProvider');
  return value;
}
