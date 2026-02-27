import { describe, it, expect } from 'vitest';

import { teacherFlow } from '../src/flows/teacher.js';

describe('teacherFlow', () => {
  it('has id "teacher"', () => {
    expect(teacherFlow.id).toBe('teacher');
  });

  it('has role "teacher"', () => {
    expect(teacherFlow.role).toBe('teacher');
  });

  it('has a descriptive title', () => {
    expect(teacherFlow.title).toBe('Teacher Getting Started');
  });

  it('routes to /dashboard on completion', () => {
    expect(teacherFlow.completionRoute).toBe('/dashboard');
  });

  it('has a completion message', () => {
    expect(teacherFlow.completionMessage).toBeTruthy();
  });

  it('contains exactly 5 steps', () => {
    expect(teacherFlow.steps).toHaveLength(5);
  });

  it('steps are in expected order', () => {
    const ids = teacherFlow.steps.map((s) => s.id);
    expect(ids).toEqual([
      'teacher_welcome',
      'teacher_profile',
      'teacher_class',
      'teacher_lesson',
      'teacher_assign',
    ]);
  });

  it('each step has required properties', () => {
    for (const step of teacherFlow.steps) {
      expect(step.id).toBeTruthy();
      expect(step.title).toBeTruthy();
      expect(step.description).toBeTruthy();
      expect(step.icon).toBeTruthy();
      expect(step.completionKey).toBeTruthy();
      expect(step.estimatedTime).toBeTruthy();
    }
  });

  it('welcome step has no targetRoute (inline)', () => {
    const welcome = teacherFlow.steps[0];
    expect(welcome.targetRoute).toBeUndefined();
  });

  it('profile step routes to /profile', () => {
    const profile = teacherFlow.steps[1];
    expect(profile.targetRoute).toBe('/profile');
  });

  it('class step routes to /classes/new', () => {
    const classStep = teacherFlow.steps[2];
    expect(classStep.targetRoute).toBe('/classes/new');
  });

  it('lesson step routes to /lessons/new', () => {
    const lesson = teacherFlow.steps[3];
    expect(lesson.targetRoute).toBe('/lessons/new');
  });

  it('lesson step has helpText', () => {
    const lesson = teacherFlow.steps[3];
    expect(lesson.helpText).toBeTruthy();
  });

  it('assign step is skippable', () => {
    const assign = teacherFlow.steps[4];
    expect(assign.skippable).toBe(true);
  });

  it('only the last step is skippable', () => {
    const skippableSteps = teacherFlow.steps.filter((s) => s.skippable);
    expect(skippableSteps).toHaveLength(1);
    expect(skippableSteps[0].id).toBe('teacher_assign');
  });
});
