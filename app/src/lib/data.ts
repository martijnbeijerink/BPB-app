// Gegevens ophalen en wegschrijven voor Voor mij, Cliënten en Berichten.
// De database bepaalt wat iemand mag zien en doen; deze functies vragen
// alleen op wat de schermen nodig hebben.

import type { LibraryKind } from './library';
import { supabase } from './supabase';

/** Eén koppeling van de ingelogde gebruiker: één cliënt, één begeleider, één discipline. */
export type Assignment = {
  assignment_id: string;
  discipline: string;
  client_id: string;
  client_name: string;
  coach_id: string;
  coach_name: string;
  ended: boolean;
  new_items: number;
  unread_messages: number;
  last_item_at: string | null;
  last_message_body: string | null;
  last_message_at: string | null;
  last_message_mine: boolean | null;
};

export type PersonalItem = {
  id: string;
  kind: 'video' | 'document' | 'note' | 'library';
  title: string | null;
  body: string | null;
  created_at: string;
  library_item: { id: string; title: string; kind: LibraryKind; theme: string } | null;
};

export type Message = { id: string; assignment_id: string; sender_id: string; body: string; created_at: string };

/** Een afspraak bij één koppeling. De namen komen uit het overzicht van de koppelingen. */
export type Appointment = { id: string; assignment_id: string; starts_at: string; place: string };

function client() {
  if (!supabase) throw new Error('De app is nog niet aan Supabase gekoppeld.');
  return supabase;
}

export async function fetchAssignments(): Promise<Assignment[]> {
  const { data, error } = await client().rpc('my_assignments');
  if (error) throw error;
  return (data as Assignment[] | null) ?? [];
}

export async function fetchItems(assignmentId: string): Promise<PersonalItem[]> {
  const { data, error } = await client()
    .from('personal_items')
    .select('id, kind, title, body, created_at, library_item:library_items(id, title, kind, theme)')
    .eq('assignment_id', assignmentId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as PersonalItem[] | null) ?? [];
}

export async function fetchMessages(assignmentId: string): Promise<Message[]> {
  const { data, error } = await client()
    .from('messages')
    .select('id, assignment_id, sender_id, body, created_at')
    .eq('assignment_id', assignmentId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as Message[] | null) ?? [];
}

export async function sendMessage(assignmentId: string, senderId: string, body: string): Promise<Message> {
  const { data, error } = await client()
    .from('messages')
    .insert({ assignment_id: assignmentId, sender_id: senderId, body })
    .select('id, assignment_id, sender_id, body, created_at')
    .single();
  if (error) throw error;
  return data as Message;
}

export async function shareNote(assignmentId: string, coachId: string, body: string): Promise<void> {
  const { error } = await client().from('personal_items').insert({ assignment_id: assignmentId, kind: 'note', body, created_by: coachId });
  if (error) throw error;
}

export async function recommendLibraryItem(assignmentId: string, coachId: string, libraryItemId: string): Promise<void> {
  const { error } = await client()
    .from('personal_items')
    .insert({ assignment_id: assignmentId, kind: 'library', library_item_id: libraryItemId, created_by: coachId });
  if (error) throw error;
}

/** Zet de leesstand op "nu", met de klok van de server. Mislukken is niet erg: de teller blijft dan staan. */
export async function markRead(assignmentId: string, what: { messages?: boolean; items?: boolean }): Promise<void> {
  await client().rpc('mark_read', { a_id: assignmentId, mark_messages: !!what.messages, mark_items: !!what.items });
}

/** Alle afspraken die de ingelogde gebruiker mag zien: de database geeft alleen de eigen terug. */
export async function fetchAppointments(): Promise<Appointment[]> {
  const { data, error } = await client().from('appointments').select('id, assignment_id, starts_at, place').order('starts_at', { ascending: true });
  if (error) throw error;
  return (data as Appointment[] | null) ?? [];
}

export async function addAppointment(assignmentId: string, coachId: string, startsAt: Date, place: string): Promise<void> {
  const { error } = await client()
    .from('appointments')
    .insert({ assignment_id: assignmentId, starts_at: startsAt.toISOString(), place, created_by: coachId });
  if (error) throw error;
}
