// De gedeelde bibliotheek: soorten, thema's en het filteren van de lijst.

export type LibraryKind = 'video' | 'document';
export type LibraryItem = { id: string; title: string; description: string; theme: string; kind: LibraryKind };

/** De zes werkenergie-thema's van BPB, in de volgorde van het ontwerp. */
export const themes = ['bewegen', 'brein', 'emoties', 'inzicht', 'ontspannen', 'voeding'] as const;

export const kindName: Record<LibraryKind, string> = { video: 'Filmpje', document: 'Document' };

export const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Filtert op thema (null = alles) en op een zoekterm in de titel. */
export function filterLibrary(items: LibraryItem[], theme: string | null, query: string): LibraryItem[] {
  const needle = query.trim().toLowerCase();
  return items.filter((item) => (theme === null || item.theme === theme) && (needle === '' || item.title.toLowerCase().includes(needle)));
}
