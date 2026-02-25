'use client';

import { LanguageSwitcher } from '@aivo/i18n';

export function FloatingLanguageSwitcher() {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <LanguageSwitcher variant="compact" />
    </div>
  );
}
