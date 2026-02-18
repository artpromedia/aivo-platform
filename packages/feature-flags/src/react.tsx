/**
 * React integration for AIVO Feature Flags
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  type ReactNode,
  type JSX,
} from 'react';
import {
  featureFlags,
  type ParityFeature,
  type UserContext,
  type FeatureFlagConfig,
} from './index';

/**
 * Feature flags context value
 */
interface FeatureFlagsContextValue {
  isEnabled: (feature: ParityFeature) => boolean;
  getConfig: (feature: ParityFeature) => FeatureFlagConfig | undefined;
  isInitialized: boolean;
}

/**
 * Feature flags context
 */
const FeatureFlagsContext = createContext<FeatureFlagsContextValue | null>(null);

/**
 * Provider props
 */
interface FeatureFlagsProviderProps {
  children: ReactNode;
  userContext?: UserContext;
  overrides?: Partial<Record<ParityFeature, FeatureFlagConfig>>;
}

/**
 * Feature flags provider component
 */
export function FeatureFlagsProvider({
  children,
  userContext,
  overrides,
}: FeatureFlagsProviderProps): JSX.Element {
  const [isInitialized, setIsInitialized] = useState(false);
  const [, setVersion] = useState(0);

  useEffect(() => {
    featureFlags.initialize({ userContext, overrides }).then(() => {
      setIsInitialized(true);
    });
  }, []);

  useEffect(() => {
    if (userContext) {
      featureFlags.setUserContext(userContext);
    }
  }, [userContext]);

  useEffect(() => {
    const unsubscribe = featureFlags.subscribe(() => {
      setVersion(v => v + 1);
    });
    return unsubscribe;
  }, []);

  const value = useMemo<FeatureFlagsContextValue>(
    () => ({
      isEnabled: (feature: ParityFeature) => featureFlags.isEnabled(feature),
      getConfig: (feature: ParityFeature) => featureFlags.getConfig(feature),
      isInitialized,
    }),
    [isInitialized]
  );

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

/**
 * Hook to access the feature flags context
 */
export function useFeatureFlags(): FeatureFlagsContextValue {
  const context = useContext(FeatureFlagsContext);
  if (!context) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagsProvider');
  }
  return context;
}

/**
 * Hook to check if a specific feature is enabled
 */
export function useFeatureFlag(feature: ParityFeature): boolean {
  const [enabled, setEnabled] = useState(() => featureFlags.isEnabled(feature));

  useEffect(() => {
    const unsubscribe = featureFlags.subscribe(() => {
      setEnabled(featureFlags.isEnabled(feature));
    });
    return unsubscribe;
  }, [feature]);

  return enabled;
}

/**
 * Hook to check multiple features at once
 */
export function useFeatureFlags_Multi(
  features: ParityFeature[]
): Record<ParityFeature, boolean> {
  const [statuses, setStatuses] = useState<Record<string, boolean>>(() => {
    const result: Record<string, boolean> = {};
    features.forEach(f => {
      result[f] = featureFlags.isEnabled(f);
    });
    return result;
  });

  useEffect(() => {
    const unsubscribe = featureFlags.subscribe(() => {
      const result: Record<string, boolean> = {};
      features.forEach(f => {
        result[f] = featureFlags.isEnabled(f);
      });
      setStatuses(result);
    });
    return unsubscribe;
  }, [features.join(',')]);

  return statuses as Record<ParityFeature, boolean>;
}

/**
 * Props for FeatureGate component
 */
interface FeatureGateProps {
  feature: ParityFeature;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Component that conditionally renders based on feature flag
 */
export function FeatureGate({
  feature,
  children,
  fallback = null,
}: FeatureGateProps): JSX.Element {
  const enabled = useFeatureFlag(feature);
  return <>{enabled ? children : fallback}</>;
}

/**
 * Props for WithFeatureFlag HOC
 */
interface WithFeatureFlagOptions {
  feature: ParityFeature;
  fallback?: ReactNode;
}

/**
 * HOC to wrap components with feature flag checks
 */
export function withFeatureFlag<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: WithFeatureFlagOptions
): React.FC<P> {
  const { feature, fallback = null } = options;

  return function FeatureFlaggedComponent(props: P) {
    const enabled = useFeatureFlag(feature);
    if (!enabled) {
      return <>{fallback}</>;
    }
    return <WrappedComponent {...props} />;
  };
}

// Re-export types and utilities from main module
export { ParityFeature, featureFlags } from './index';
export type { UserContext, FeatureFlagConfig } from './index';
