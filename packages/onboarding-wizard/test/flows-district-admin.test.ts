import { describe, it, expect } from 'vitest';

import { districtAdminFlow } from '../src/flows/district-admin.js';

describe('districtAdminFlow', () => {
  it('has correct id', () => {
    expect(districtAdminFlow.id).toBe('district_admin');
  });

  it('has role district_admin', () => {
    expect(districtAdminFlow.role).toBe('district_admin');
  });

  it('has a title', () => {
    expect(districtAdminFlow.title).toBeTruthy();
  });

  it('has a description', () => {
    expect(districtAdminFlow.description).toBeTruthy();
  });

  it('has completionRoute', () => {
    expect(districtAdminFlow.completionRoute).toBeTruthy();
  });

  it('has completionMessage', () => {
    expect(districtAdminFlow.completionMessage).toBeTruthy();
  });

  it('has at least 5 steps', () => {
    expect(districtAdminFlow.steps.length).toBeGreaterThanOrEqual(5);
  });

  it('all steps have id, title, description, completionKey', () => {
    for (const step of districtAdminFlow.steps) {
      expect(step.id).toBeTruthy();
      expect(step.title).toBeTruthy();
      expect(step.description).toBeTruthy();
      expect(step.completionKey).toBeTruthy();
    }
  });

  it('first step is welcome', () => {
    expect(districtAdminFlow.steps[0].id).toBe('da_welcome');
  });

  it('has at least one skippable step', () => {
    const hasSkippable = districtAdminFlow.steps.some(s => s.skippable);
    expect(hasSkippable).toBe(true);
  });

  it('steps have unique ids', () => {
    const ids = districtAdminFlow.steps.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('steps have unique completionKeys', () => {
    const keys = districtAdminFlow.steps.map(s => s.completionKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
