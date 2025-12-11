'use client';

/**
 * "Why This?" Modal Component
 *
 * Displays contextual explanations for AI-driven decisions in the Teacher web app.
 * Features:
 * - Accessible modal with focus management
 * - Loading and error states
 * - Expandable details section
 * - Graceful fallbacks
 */

import { useCallback, useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  GraduationCap,
  Hand,
  Lightbulb,
  LifeBuoy,
  Route,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Timer,
  TrendingUp,
  X,
} from 'lucide-react';

import { cn } from '@/lib/cn';
import type { Explanation, ExplanationDetails } from '@/lib/explanation-api';
import {
  getExplanationsByEntity,
  getActionTypeLabel,
  formatRelativeDate,
} from '@/lib/explanation-api';
import type { AuthSession } from '@/lib/auth';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface WhyThisModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: string;
  entityId: string;
  learnerId?: string;
  session: AuthSession;
  title?: string;
}

interface WhyThisButtonProps {
  entityType: string;
  entityId: string;
  learnerId?: string;
  session: AuthSession;
  variant?: 'subtle' | 'outlined' | 'text';
  label?: string;
  className?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// ICONS HELPER
// ══════════════════════════════════════════════════════════════════════════════

function ActionIcon({ actionType, className }: { actionType: string; className?: string }) {
  const iconProps = { className: cn('h-4 w-4', className) };

  switch (actionType) {
    case 'CONTENT_SELECTION':
      return <Sparkles {...iconProps} />;
    case 'DIFFICULTY_CHANGE':
      return <SlidersHorizontal {...iconProps} />;
    case 'FOCUS_BREAK_TRIGGER':
      return <Timer {...iconProps} />;
    case 'FOCUS_INTERVENTION':
      return <Hand {...iconProps} />;
    case 'MODULE_RECOMMENDATION':
      return <GraduationCap {...iconProps} />;
    case 'LEARNING_PATH_ADJUSTMENT':
      return <Route {...iconProps} />;
    case 'SKILL_PROGRESSION':
      return <TrendingUp {...iconProps} />;
    case 'SCAFFOLDING_DECISION':
      return <LifeBuoy {...iconProps} />;
    case 'POLICY_ENFORCEMENT':
      return <Shield {...iconProps} />;
    default:
      return <Lightbulb {...iconProps} />;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// WHY THIS BUTTON
// ══════════════════════════════════════════════════════════════════════════════

/**
 * A "Why this?" button that opens the explanation modal.
 */
export function WhyThisButton({
  entityType,
  entityId,
  learnerId,
  session,
  variant = 'subtle',
  label = 'Why this?',
  className,
}: WhyThisButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const buttonClasses = cn(
    'inline-flex items-center gap-1 text-sm font-medium transition-colors',
    {
      'text-primary hover:text-primary/80': variant === 'subtle',
      'text-primary border border-primary/30 rounded-md px-2 py-1 hover:bg-primary/10':
        variant === 'outlined',
      'text-muted-foreground hover:text-foreground': variant === 'text',
    },
    className
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={buttonClasses}
        aria-label={label}
      >
        <Lightbulb className="h-3.5 w-3.5" />
        <span>{label}</span>
      </button>

      <WhyThisModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        entityType={entityType}
        entityId={entityId}
        learnerId={learnerId}
        session={session}
      />
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// WHY THIS MODAL
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Modal displaying explanation details.
 */
export function WhyThisModal({
  isOpen,
  onClose,
  entityType,
  entityId,
  learnerId,
  session,
  title = 'How this was decided',
}: WhyThisModalProps) {
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [hasFallback, setHasFallback] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Fetch explanation when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const fetchExplanation = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await getExplanationsByEntity(entityType, entityId, session, {
          learnerId,
          limit: 1,
        });

        if (response.explanations.length > 0) {
          setExplanation(response.explanations[0]);
          setHasFallback(response.hasFallback);
        } else {
          setError('No explanation available');
        }
      } catch (err) {
        setError('Failed to load explanation');
      } finally {
        setIsLoading(false);
      }
    };

    fetchExplanation();
  }, [isOpen, entityType, entityId, learnerId, session]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Focus trap and body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="why-this-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-background rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
              <Lightbulb className="h-5 w-5 text-primary" />
            </div>
            <h2 id="why-this-title" className="text-lg font-semibold">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-md hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} />
          ) : explanation ? (
            <ExplanationContent
              explanation={explanation}
              hasFallback={hasFallback}
              showDetails={showDetails}
              onToggleDetails={() => setShowDetails(!showDetails)}
            />
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            Aivo uses learning data to make personalized recommendations for each student.
          </p>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      <p className="mt-4 text-sm text-muted-foreground">Loading explanation...</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Lightbulb className="h-12 w-12 text-muted-foreground/50" />
      <p className="mt-4 text-sm text-muted-foreground">{message}</p>
      <p className="mt-2 text-sm text-muted-foreground">
        This decision was made based on learning data and educational goals.
      </p>
    </div>
  );
}

function ExplanationContent({
  explanation,
  hasFallback,
  showDetails,
  onToggleDetails,
}: {
  explanation: Explanation;
  hasFallback: boolean;
  showDetails: boolean;
  onToggleDetails: () => void;
}) {
  const hasDetails =
    explanation.details.reasons.length > 0 || explanation.details.inputs.length > 0;

  return (
    <div className="space-y-4">
      {/* Action type badge */}
      {!hasFallback && (
        <div className="flex items-center gap-2">
          <ActionIcon actionType={explanation.actionType} className="text-primary" />
          <span className="text-sm font-medium text-primary">
            {getActionTypeLabel(explanation.actionType)}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatRelativeDate(explanation.createdAt)}
          </span>
        </div>
      )}

      {/* Summary */}
      <p className="text-base leading-relaxed">{explanation.summary}</p>

      {/* Details toggle */}
      {hasDetails && !hasFallback && (
        <>
          <button
            type="button"
            onClick={onToggleDetails}
            className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            {showDetails ? (
              <>
                <ChevronUp className="h-4 w-4" />
                <span>Hide details</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                <span>More details</span>
              </>
            )}
          </button>

          {showDetails && <DetailsSection details={explanation.details} />}
        </>
      )}

      {/* Fallback note */}
      {hasFallback && (
        <div className="p-3 rounded-md bg-muted/50 text-sm text-muted-foreground">
          <p>We're working on providing more detailed explanations for all decisions.</p>
        </div>
      )}
    </div>
  );
}

function DetailsSection({ details }: { details: ExplanationDetails }) {
  return (
    <div className="space-y-4 pl-2 border-l-2 border-primary/20">
      {/* Reasons */}
      {details.reasons.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">What Aivo considered:</h4>
          <ul className="space-y-1.5">
            {details.reasons.map((reason, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>{reason.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Inputs */}
      {details.inputs.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Based on these factors:</h4>
          <dl className="space-y-1">
            {details.inputs.map((input, index) => (
              <div key={index} className="flex justify-between text-sm">
                <dt className="text-muted-foreground">{input.label}</dt>
                <dd className="font-medium">
                  {input.value}
                  {input.unit && <span className="text-muted-foreground ml-1">{input.unit}</span>}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* Additional context */}
      {details.additionalContext && (
        <div className="p-3 rounded-md bg-primary/5 text-sm italic">
          {details.additionalContext}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// INLINE WHY THIS (for compact spaces)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Inline "Why?" link for use in tables or compact UIs.
 */
export function WhyThisLink({
  entityType,
  entityId,
  learnerId,
  session,
  className,
}: Omit<WhyThisButtonProps, 'variant' | 'label'>) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          'text-xs text-primary hover:text-primary/80 hover:underline transition-colors',
          className
        )}
      >
        Why?
      </button>

      <WhyThisModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        entityType={entityType}
        entityId={entityId}
        learnerId={learnerId}
        session={session}
      />
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPLANATION CARD (for lists)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Card displaying a single explanation in a list.
 */
export function ExplanationCard({
  explanation,
  onClick,
  className,
}: {
  explanation: Explanation;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer',
        className
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick?.();
        }
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <ActionIcon actionType={explanation.actionType} className="text-primary" />
        <span className="text-sm font-medium">
          {getActionTypeLabel(explanation.actionType)}
        </span>
        <span className="ml-auto text-xs text-muted-foreground">
          {formatRelativeDate(explanation.createdAt)}
        </span>
      </div>
      <p className="text-sm text-muted-foreground line-clamp-2">{explanation.summary}</p>
    </div>
  );
}
