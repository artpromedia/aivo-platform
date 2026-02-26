import { describe, it, expect } from 'vitest';

import { parentFlow } from '../src/flows/parent.js';

describe('parentFlow', () => {
  it('has correct id', () => {
    expect(parentFlow.id).toBe('parent');
  });

  it('has role parent', () => {
    expect(parentFlow.role).toBe('parent');
  });

  it('has a title', () => {
    expect(parentFlow.title).toBeTruthy();
  });

  it('has a description', () => {
    expect(parentFlow.description).toBeTruthy();
  });

  it('has completionRoute', () => {
    expect(parentFlow.completionRoute).toBeTruthy();
  });

  it('has completionMessage', () => {
    expect(parentFlow.completionMessage).toBeTruthy();
  });

  it('has at least 3 steps', () => {
    expect(parentFlow.steps.length).toBeGreaterThanOrEqual(3);
  });

  it('all steps have required fields', () => {
    for (const step of parentFlow.steps) {
      expect(step.id).toBeTruthy();
      expect(step.title).toBeTruthy();
      expect(step.description).toBeTruthy();
      expect(step.completionKey).toBeTruthy();
    }
  });

  it('first step is welcome', () => {
    expect(parentFlow.steps[0].id).toBe('parent_welcome');
  });

  it('has link child step', () => {
    const linkStep = parentFlow.steps.find(s => s.id === 'parent_link_child');
    expect(linkStep).toBeDefined();
    expect(linkStep?.targetRoute).toBeTruthy();
  });

  it('steps have unique ids', () => {
    const ids = parentFlow.steps.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has at least one skippable step', () => {
    const hasSkippable = parentFlow.steps.some(s => s.skippable);
    expect(hasSkippable).toBe(true);
  });
});
