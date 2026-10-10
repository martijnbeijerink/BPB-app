// De persoonlijke onderdelen van één koppeling ophalen, voor de pagina van
// de cliënt (Voor mij) en die van de begeleider (Cliënten).

import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchItems, markRead, type PersonalItem } from './data';
import { useAssignment, useOverview } from './overview';

type State = {
  items: PersonalItem[] | null;
  failed: boolean;
  /** ids die bij dit bezoek nieuw waren voor de kijker */
  fresh: string[];
  reload(): Promise<void>;
};

/**
 * Haalt de lijst op als het scherm in beeld komt en als er live iets nieuws
 * binnenkomt. Met `markSeen` wordt de lijst daarna als gezien genoteerd, zodat
 * de teller "nieuw" verdwijnt.
 */
export function usePersonalItems(assignmentId: string | undefined, markSeen: boolean): State {
  const { refresh } = useOverview();
  const assignment = useAssignment(assignmentId);
  const [items, setItems] = useState<PersonalItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [fresh, setFresh] = useState<string[]>([]);

  // Hoeveel er nieuw is op het moment van ophalen; de lijst staat op nieuwste eerst.
  const newCount = useRef(0);
  useEffect(() => {
    newCount.current = assignment?.new_items ?? 0;
  });

  const reload = useCallback(async () => {
    if (!assignmentId) return;
    try {
      const rows = await fetchItems(assignmentId);
      setItems(rows);
      setFailed(false);
      if (!markSeen) return;
      const arrived = rows.slice(0, newCount.current).map((row) => row.id);
      if (arrived.length > 0) setFresh((known) => [...new Set([...known, ...arrived])]);
      await markRead(assignmentId, { items: true });
      await refresh();
    } catch {
      setFailed(true);
    }
  }, [assignmentId, markSeen, refresh]);

  // Bij openen van het scherm, en bij terugkomen vanaf een ander scherm.
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  // Live: het overzicht meldt dat er iets bij is gekomen.
  const lastItemAt = assignment?.last_item_at ?? null;
  const seenAt = useRef(lastItemAt);
  useEffect(() => {
    if (seenAt.current === lastItemAt) return;
    seenAt.current = lastItemAt;
    reload();
  }, [lastItemAt, reload]);

  return { items, failed, fresh, reload };
}
