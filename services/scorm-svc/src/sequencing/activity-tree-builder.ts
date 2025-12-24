/**
 * SCORM 2004 Activity Tree Builder
 *
 * Transforms parsed SCORM manifest into an activity tree
 * suitable for the sequencing engine.
 */

import type {
  ScormItem,
  ScormManifest,
  ScormOrganization,
  ScormResource,
  ScormSequencing,
} from './manifest-types.js';
import type {
  Activity,
  ControlMode,
  DeliveryControls,
  LimitConditions,
  ObjectiveDescription,
  RollupRules,
  SequencingDefinition,
} from './types.js';
import {
  createDefaultTrackingInfo,
  DEFAULT_CONTROL_MODE,
  DEFAULT_DELIVERY_CONTROLS,
  DEFAULT_RANDOMIZATION_CONTROLS,
  DEFAULT_ROLLUP_RULES,
} from './types.js';

/**
 * Build an activity tree from a parsed SCORM manifest
 */
export function buildActivityTree(manifest: ScormManifest, baseContentUrl: string): Activity {
  // Find the default organization
  const organization =
    manifest.organizations.find((o) => o.identifier === manifest.defaultOrganization) ||
    manifest.organizations[0];

  if (!organization) {
    throw new Error('No organization found in manifest');
  }

  // Create resource lookup map
  const resourceMap = new Map<string, ScormResource>();
  for (const resource of manifest.resources) {
    resourceMap.set(resource.identifier, resource);
  }

  // Build root activity from organization
  const rootActivity = buildActivityFromOrganization(
    organization,
    resourceMap,
    manifest.sequencing,
    baseContentUrl
  );

  return rootActivity;
}

/**
 * Build activity from organization
 */
function buildActivityFromOrganization(
  organization: ScormOrganization,
  resourceMap: Map<string, ScormResource>,
  globalSequencing: ScormSequencing | undefined,
  baseContentUrl: string
): Activity {
  const rootActivity: Activity = {
    id: organization.identifier,
    title: organization.title,
    parentId: null,
    children: [],
    isVisible: true,
    isActive: false,
    isSuspended: false,
    attemptCount: 0,
    sequencingDefinition: buildSequencingDefinition(globalSequencing),
    trackingInfo: createDefaultTrackingInfo(),
    deliveryControls: { ...DEFAULT_DELIVERY_CONTROLS },
  };

  // Build child activities
  rootActivity.children = organization.items.map((item) =>
    buildActivityFromItem(item, rootActivity.id, resourceMap, globalSequencing, baseContentUrl)
  );

  return rootActivity;
}

/**
 * Build activity from manifest item
 */
function buildActivityFromItem(
  item: ScormItem,
  parentId: string,
  resourceMap: Map<string, ScormResource>,
  globalSequencing: ScormSequencing | undefined,
  baseContentUrl: string
): Activity {
  // Get resource if referenced
  const resource = item.identifierRef ? resourceMap.get(item.identifierRef) : undefined;

  // Build launch URL for SCOs
  let launchUrl: string | undefined;
  if (resource?.href) {
    const params = item.parameters || '';
    const separator = resource.href.includes('?') ? '&' : '?';
    launchUrl = `${baseContentUrl}/${resource.href}${params ? separator + params : ''}`;
  }

  const activity: Activity = {
    id: item.identifier,
    title: item.title,
    parentId,
    children: [],
    resourceId: item.identifierRef,
    launchUrl,
    isVisible: item.isVisible,
    isActive: false,
    isSuspended: false,
    attemptCount: 0,
    sequencingDefinition: buildSequencingDefinition(globalSequencing, item),
    trackingInfo: createDefaultTrackingInfo(),
    deliveryControls: { ...DEFAULT_DELIVERY_CONTROLS },
  };

  // Build child activities recursively
  activity.children = item.children.map((child) =>
    buildActivityFromItem(child, activity.id, resourceMap, globalSequencing, baseContentUrl)
  );

  return activity;
}

/**
 * Build sequencing definition from manifest data
 */
function buildSequencingDefinition(
  globalSequencing?: ScormSequencing,
  item?: ScormItem
): SequencingDefinition {
  const controlMode: ControlMode = {
    ...DEFAULT_CONTROL_MODE,
    ...globalSequencing?.controlMode,
  };

  const deliveryControls: DeliveryControls = {
    ...DEFAULT_DELIVERY_CONTROLS,
    ...globalSequencing?.deliveryControls,
  };

  const limitConditions: LimitConditions = {};
  if (item?.attemptLimit) {
    limitConditions.attemptLimit = item.attemptLimit;
  }

  const rollupRules: RollupRules = { ...DEFAULT_ROLLUP_RULES };

  const objectives: ObjectiveDescription[] = [
    {
      objectiveId: 'primary-objective',
      satisfiedByMeasure: false,
      minNormalizedMeasure: item?.masterScore ? item.masterScore / 100 : 0.8,
      mapInfo: [],
    },
  ];

  return {
    controlMode,
    preConditionRules: [],
    postConditionRules: [],
    exitConditionRules: [],
    limitConditions,
    rollupRules,
    objectives,
    primaryObjectiveId: 'primary-objective',
    randomizationControls: { ...DEFAULT_RANDOMIZATION_CONTROLS },
    deliveryControls,
    constrainedChoice: globalSequencing?.constrainedChoiceConsiderations?.constrainChoice ?? false,
    preventActivation:
      globalSequencing?.constrainedChoiceConsiderations?.preventActivation ?? false,
  };
}

/**
 * Serialize activity tree for storage
 */
export function serializeActivityTree(activity: Activity): object {
  return {
    id: activity.id,
    title: activity.title,
    parentId: activity.parentId,
    resourceId: activity.resourceId,
    launchUrl: activity.launchUrl,
    isVisible: activity.isVisible,
    sequencingDefinition: activity.sequencingDefinition,
    deliveryControls: activity.deliveryControls,
    children: activity.children.map(serializeActivityTree),
  };
}

/** Serialized activity structure for storage */
interface SerializedActivity {
  id: string;
  title: string;
  resourceId?: string;
  launchUrl?: string;
  isVisible?: boolean;
  sequencingDefinition: SequencingDefinition;
  deliveryControls?: DeliveryControls;
  children?: SerializedActivity[];
}

/**
 * Deserialize activity tree from storage
 */
export function deserializeActivityTree(
  data: SerializedActivity,
  parentId: string | null = null
): Activity {
  const activity: Activity = {
    id: data.id,
    title: data.title,
    parentId,
    children: [],
    resourceId: data.resourceId,
    launchUrl: data.launchUrl,
    isVisible: data.isVisible ?? true,
    isActive: false,
    isSuspended: false,
    attemptCount: 0,
    sequencingDefinition: data.sequencingDefinition,
    trackingInfo: createDefaultTrackingInfo(),
    deliveryControls: data.deliveryControls ?? { ...DEFAULT_DELIVERY_CONTROLS },
  };

  activity.children = (data.children ?? []).map((child: SerializedActivity) =>
    deserializeActivityTree(child, activity.id)
  );

  return activity;
}

/**
 * Flatten activity tree into a list
 */
export function flattenActivityTree(activity: Activity): Activity[] {
  const activities: Activity[] = [activity];

  for (const child of activity.children) {
    activities.push(...flattenActivityTree(child));
  }

  return activities;
}

/**
 * Find activity by ID in tree
 */
export function findActivityById(tree: Activity, id: string): Activity | null {
  if (tree.id === id) {
    return tree;
  }

  for (const child of tree.children) {
    const found = findActivityById(child, id);
    if (found) {
      return found;
    }
  }

  return null;
}

/**
 * Get all leaf activities (SCOs)
 */
export function getLeafActivities(tree: Activity): Activity[] {
  if (tree.resourceId && tree.children.length === 0) {
    return [tree];
  }

  const leaves: Activity[] = [];
  for (const child of tree.children) {
    leaves.push(...getLeafActivities(child));
  }

  return leaves;
}

/**
 * Get activity path from root to target
 */
export function getActivityPath(tree: Activity, targetId: string): Activity[] | null {
  if (tree.id === targetId) {
    return [tree];
  }

  for (const child of tree.children) {
    const path = getActivityPath(child, targetId);
    if (path) {
      return [tree, ...path];
    }
  }

  return null;
}
