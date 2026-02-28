'use client';

import { useTranslation } from 'react-i18next';

interface TutorTypingIndicatorProps {
  personaName: string;
  /** When true, show text-only indicator instead of bouncing dots. */
  reducedMotion?: boolean;
}

export function TutorTypingIndicator({
  personaName,
  reducedMotion = false,
}: TutorTypingIndicatorProps) {
  const { t } = useTranslation('tutor');

  return (
    <div className="flex items-start gap-3" role="status" aria-live="polite">
      <div className="max-w-[75%] rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {t('chat.typing', { name: personaName })}
            {reducedMotion ? '…' : ''}
          </span>
          {!reducedMotion && (
            <span className="flex gap-1" aria-hidden="true">
              <span
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"
                style={{ animationDelay: '0ms' }}
              />
              <span
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"
                style={{ animationDelay: '150ms' }}
              />
              <span
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"
                style={{ animationDelay: '300ms' }}
              />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
