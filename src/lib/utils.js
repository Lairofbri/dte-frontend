// src/lib/utils.js
// Utilidad de clases combinadas (shadcn/ui)

import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}