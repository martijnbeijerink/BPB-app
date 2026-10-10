// Lijn-iconen, dezelfde als in het schermontwerp en de demo.

import type { ReactNode } from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors } from '@/lib/theme';

const shapes = {
  book: (
    <>
      <Path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" />
      <Path d="M5 17a3 3 0 0 1 3-3h11" />
    </>
  ),
  mark: <Path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z" />,
  calendar: (
    <>
      <Rect x="4" y="5" width="16" height="15" rx="2" />
      <Path d="M8 3v4M16 3v4M4 10h16" />
    </>
  ),
  message: <Path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />,
  person: (
    <>
      <Circle cx="12" cy="8" r="4" />
      <Path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  people: (
    <>
      <Circle cx="9" cy="8" r="3.5" />
      <Path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <Path d="M16 4.8a3.5 3.5 0 0 1 0 6.4" />
      <Path d="M18 14.5a6.5 6.5 0 0 1 3.5 5.5" />
    </>
  ),
  play: <Path d="M8 5.5v13l11-6.5z" />,
  file: (
    <>
      <Path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <Path d="M14 3v5h5" />
    </>
  ),
  search: (
    <>
      <Circle cx="11" cy="11" r="6.5" />
      <Path d="M16 16l4.5 4.5" />
    </>
  ),
  left: <Path d="M15 6l-6 6 6 6" />,
  lock: (
    <>
      <Rect x="5" y="11" width="14" height="9" rx="2" />
      <Path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof shapes;

type IconProps = { name: IconName; size?: number; color?: string; filled?: boolean; strokeWidth?: number };

export function Icon({ name, size = 24, color = colors.ink, filled = false, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg
      fill={filled ? color : 'none'}
      height={size}
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      viewBox="0 0 24 24"
      width={size}>
      {shapes[name]}
    </Svg>
  );
}
