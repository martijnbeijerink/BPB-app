// Afspraken: het overzicht en het scherm om een afspraak toe te voegen.

import { TabStack } from '@/components/tab-stack';

export const unstable_settings = { anchor: 'index' };

export default function AfsprakenLayout() {
  return <TabStack tab="afspraken" />;
}
