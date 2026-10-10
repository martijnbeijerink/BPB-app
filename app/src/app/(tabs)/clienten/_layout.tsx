// Cliënten: de lijst, de pagina van één cliënt en de schermen om iets te delen.

import { TabStack } from '@/components/tab-stack';

// De lijst ligt altijd onder de andere schermen, ook als iemand er vanuit
// een andere tab direct naartoe gaat. Zo werkt de terugknop overal.
export const unstable_settings = { anchor: 'index' };

export default function ClientenLayout() {
  return <TabStack tab="clienten" />;
}
