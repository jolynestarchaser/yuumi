import type { ReactNode } from 'react';
export { useI18n as useCompanionLanguage } from '../../lib/i18n.js';

export function CompanionLanguageProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
