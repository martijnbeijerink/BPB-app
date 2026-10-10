// Voor mij: het overzicht per discipline en de pagina van één discipline.

import { TabStack } from '@/components/tab-stack';

// De lijst ligt altijd onder de andere schermen, ook als iemand er vanuit
// een andere tab direct naartoe gaat. Zo werkt de terugknop overal.
export const unstable_settings = { anchor: 'index' };

export default function VoorMijLayout() {
  return <TabStack tab="voor-mij" />;
}
