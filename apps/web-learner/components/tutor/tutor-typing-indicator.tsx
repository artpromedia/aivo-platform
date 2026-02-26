'use client';

interface TutorTypingIndicatorProps {
  personaName: string;
}

export function TutorTypingIndicator({ personaName }: TutorTypingIndicatorProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="max-w-[75%] rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{personaName} is thinking</span>
          <span className="flex gap-1">
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
        </div>
      </div>
    </div>
  );
}
