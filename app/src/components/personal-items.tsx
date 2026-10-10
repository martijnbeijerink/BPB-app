// De lijst met persoonlijke onderdelen van één koppeling, nieuwste bovenaan.
// Gebruikt op de pagina van de cliënt (Voor mij) en van de begeleider
// (Cliënten).

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Badge, partStyles } from '@/components/parts';
import { Body } from '@/components/ui';
import type { PersonalItem } from '@/lib/data';
import { dayLabel } from '@/lib/format';
import { kindName } from '@/lib/library';
import { colors, fonts } from '@/lib/theme';

type Props = {
  items: PersonalItem[];
  /** ids die bij dit bezoek het label "Nieuw" krijgen */
  fresh?: string[];
  emptyText: string;
  /** openen van een aangeraden item uit de bibliotheek */
  onOpenLibraryItem?(id: string): void;
};

export function PersonalItems({ items, fresh = [], emptyText, onOpenLibraryItem }: Props) {
  if (items.length === 0) return <Body muted>{emptyText}</Body>;

  return (
    <View style={styles.list}>
      {items.map((item) => {
        const isNew = fresh.includes(item.id);
        const day = dayLabel(item.created_at);

        if (item.kind === 'note') {
          return (
            <View key={item.id} style={styles.note}>
              <View style={styles.noteHead}>
                <Icon color={colors.ink2} name="note" size={18} />
                <Text style={[partStyles.rowMeta, styles.grow]}>Notitie · {day}</Text>
                {isNew ? <Badge>Nieuw</Badge> : null}
              </View>
              <Text style={styles.noteText}>{item.body}</Text>
            </View>
          );
        }

        const library = item.kind === 'library' ? item.library_item : null;
        const kind = library ? library.kind : item.kind === 'video' ? 'video' : 'document';
        const title = library ? library.title : (item.title ?? '');
        const meta = library ? `Aangeraden uit de bibliotheek · ${day}` : `${kindName[kind]} · ${day}`;
        const content = (
          <>
            <View style={[styles.thumb, kind === 'video' ? styles.thumbVideo : styles.thumbDocument]}>
              {kind === 'video' ? <Icon color={colors.accent} filled name="play" /> : <Icon name="file" />}
            </View>
            <View style={partStyles.rowText}>
              <Text style={styles.title}>{title}</Text>
              <Text style={partStyles.rowMeta}>{meta}</Text>
            </View>
            {isNew ? <Badge>Nieuw</Badge> : null}
          </>
        );

        if (library && onOpenLibraryItem) {
          return (
            <Pressable
              accessibilityHint="Opent dit item in de bibliotheek"
              accessibilityRole="button"
              key={item.id}
              onPress={() => onOpenLibraryItem(library.id)}
              style={({ pressed }) => [styles.row, pressed && partStyles.pressed]}>
              {content}
            </Pressable>
          );
        }
        return (
          <View key={item.id} style={styles.row}>
            {content}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  grow: { flex: 1 },
  note: { gap: 8, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 18, backgroundColor: colors.surface },
  noteHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  noteText: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22, color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 10, borderRadius: 18, backgroundColor: colors.surface },
  thumb: { width: 76, height: 60, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  thumbVideo: { backgroundColor: colors.ink },
  thumbDocument: { backgroundColor: colors.calm },
  title: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 20, color: colors.ink },
});
