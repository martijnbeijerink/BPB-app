// Gesprekken: de volgorde van de lijst, en de opbouw van één gesprek met
// een dagkop boven het eerste bericht van elke dag.

export type ChatMessage = { id: string; sender_id: string; body: string; created_at: string };

export type ChatRow<M extends ChatMessage> = { type: 'day'; key: string; at: string } | { type: 'message'; key: string; message: M };

/** Voegt berichten samen zonder dubbelen, oudste eerst. */
export function mergeMessages<M extends ChatMessage>(known: M[], incoming: M[]): M[] {
  const byId = new Map<string, M>();
  for (const message of [...known, ...incoming]) byId.set(message.id, message);
  return [...byId.values()].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
}

/** Berichten (oudste eerst) met een dagkop boven het eerste bericht van elke dag. */
export function chatRows<M extends ChatMessage>(messages: M[]): ChatRow<M>[] {
  const rows: ChatRow<M>[] = [];
  let day = '';
  for (const message of messages) {
    const current = new Date(message.created_at).toDateString();
    if (current !== day) {
      day = current;
      rows.push({ type: 'day', key: `dag-${current}`, at: message.created_at });
    }
    rows.push({ type: 'message', key: message.id, message });
  }
  return rows;
}

/** Gesprekken met het nieuwste bericht bovenaan; gesprekken zonder berichten onderaan, in de oude volgorde. */
export function sortConversations<A extends { last_message_at: string | null }>(list: A[]): A[] {
  return list
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const left = a.item.last_message_at;
      const right = b.item.last_message_at;
      if (left && right) return right.localeCompare(left) || a.index - b.index;
      if (left) return -1;
      if (right) return 1;
      return a.index - b.index;
    })
    .map(({ item }) => item);
}
