'use client';

/**
 * Assessment Settings
 * 
 * Panel for configuring assessment-level settings:
 * - Timing & availability
 * - Navigation options
 * - Security settings
 * - Grading & feedback
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Clock,
  Calendar,
  Shield,
  Eye,
  BarChart3,
  Settings2,
  Navigation,
  Shuffle,
  Lock,
} from 'lucide-react';

import type { Assessment, AssessmentSettings as SettingsType, AssessmentType } from './types';

// ============================================================================
// PROPS
// ============================================================================

interface AssessmentSettingsProps {
  assessment: Assessment;
  onUpdate: (updates: Partial<Assessment>) => void;
  onUpdateSettings: (settings: Partial<SettingsType>) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function AssessmentSettings({
  assessment,
  onUpdate,
  onUpdateSettings,
}: AssessmentSettingsProps) {
  const { settings } = assessment;

  return (
    <ScrollArea className="h-full">
      <div className="max-w-3xl space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Assessment Name *</Label>
              <Input
                id="name"
                value={assessment.name}
                onChange={e => onUpdate({ name: e.target.value })}
                placeholder="Enter assessment name..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={assessment.description ?? ''}
                onChange={e => onUpdate({ description: e.target.value })}
                placeholder="Describe this assessment..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructions">Instructions</Label>
              <Textarea
                id="instructions"
                value={assessment.instructions ?? ''}
                onChange={e => onUpdate({ instructions: e.target.value })}
                placeholder="Enter instructions for students..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Assessment Type</Label>
              <Select
                value={assessment.type}
                onValueChange={v => onUpdate({ type: v as AssessmentType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="QUIZ">Quiz</SelectItem>
                  <SelectItem value="TEST">Test</SelectItem>
                  <SelectItem value="EXAM">Exam</SelectItem>
                  <SelectItem value="PRACTICE">Practice</SelectItem>
                  <SelectItem value="SURVEY">Survey</SelectItem>
                  <SelectItem value="DIAGNOSTIC">Diagnostic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Timing & Availability */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Timing & Availability
            </CardTitle>
            <CardDescription>
              Configure when and for how long the assessment is available
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="availableFrom">Available From</Label>
                <Input
                  id="availableFrom"
                  type="datetime-local"
                  value={assessment.availableFrom?.toISOString().slice(0, 16) ?? ''}
                  onChange={e => onUpdate({ 
                    availableFrom: e.target.value ? new Date(e.target.value) : undefined 
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="availableUntil">Available Until</Label>
                <Input
                  id="availableUntil"
                  type="datetime-local"
                  value={assessment.availableUntil?.toISOString().slice(0, 16) ?? ''}
                  onChange={e => onUpdate({ 
                    availableUntil: e.target.value ? new Date(e.target.value) : undefined 
                  })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
              <Input
                id="timeLimit"
                type="number"
                min={0}
                value={settings.timeLimit ?? ''}
                onChange={e => onUpdateSettings({ 
                  timeLimit: e.target.value ? parseInt(e.target.value) : undefined 
                })}
                placeholder="No time limit"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty for no time limit
              </p>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="allowLate">Allow Late Submissions</Label>
                  <p className="text-xs text-muted-foreground">
                    Students can submit after the due date
                  </p>
                </div>
                <Switch
                  id="allowLate"
                  checked={settings.allowLateSubmissions}
                  onCheckedChange={v => onUpdateSettings({ allowLateSubmissions: v })}
                />
              </div>

              {settings.allowLateSubmissions && (
                <div className="space-y-2 ml-4">
                  <Label htmlFor="latePenalty">Late Penalty (%)</Label>
                  <Input
                    id="latePenalty"
                    type="number"
                    min={0}
                    max={100}
                    value={settings.latePenaltyPercent ?? 0}
                    onChange={e => onUpdateSettings({ 
                      latePenaltyPercent: parseInt(e.target.value) || 0 
                    })}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Navigation & Display */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5" />
              Navigation & Display
            </CardTitle>
            <CardDescription>
              Control how students navigate through the assessment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Allow Back Navigation</Label>
                <p className="text-xs text-muted-foreground">
                  Students can return to previous questions
                </p>
              </div>
              <Switch
                checked={settings.allowBackNavigation}
                onCheckedChange={v => onUpdateSettings({ allowBackNavigation: v })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>One Question at a Time</Label>
                <p className="text-xs text-muted-foreground">
                  Display only one question per page
                </p>
              </div>
              <Switch
                checked={settings.showOneQuestionAtATime}
                onCheckedChange={v => onUpdateSettings({ showOneQuestionAtATime: v })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Show Point Values</Label>
                <p className="text-xs text-muted-foreground">
                  Display points for each question
                </p>
              </div>
              <Switch
                checked={settings.showPointValues}
                onCheckedChange={v => onUpdateSettings({ showPointValues: v })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Randomization */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shuffle className="h-5 w-5" />
              Randomization
            </CardTitle>
            <CardDescription>
              Randomize question and answer order
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Shuffle Questions</Label>
                <p className="text-xs text-muted-foreground">
                  Randomize question order for each student
                </p>
              </div>
              <Switch
                checked={settings.shuffleQuestions}
                onCheckedChange={v => onUpdateSettings({ shuffleQuestions: v })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Shuffle Answer Options</Label>
                <p className="text-xs text-muted-foreground">
                  Randomize answer options for each student
                </p>
              </div>
              <Switch
                checked={settings.shuffleOptions}
                onCheckedChange={v => onUpdateSettings({ shuffleOptions: v })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security
            </CardTitle>
            <CardDescription>
              Anti-cheating and proctoring settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Require Lockdown Browser</Label>
                <p className="text-xs text-muted-foreground">
                  Students must use a secure browser
                </p>
              </div>
              <Switch
                checked={settings.requireLockdownBrowser}
                onCheckedChange={v => onUpdateSettings({ requireLockdownBrowser: v })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Prevent Copy/Paste</Label>
                <p className="text-xs text-muted-foreground">
                  Disable copying and pasting text
                </p>
              </div>
              <Switch
                checked={settings.preventCopyPaste}
                onCheckedChange={v => onUpdateSettings({ preventCopyPaste: v })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Detect Tab Switching</Label>
                <p className="text-xs text-muted-foreground">
                  Monitor when students leave the assessment
                </p>
              </div>
              <Switch
                checked={settings.detectTabSwitch}
                onCheckedChange={v => onUpdateSettings({ detectTabSwitch: v })}
              />
            </div>

            {settings.detectTabSwitch && (
              <div className="space-y-2 ml-4">
                <Label htmlFor="maxViolations">Maximum Violations</Label>
                <Input
                  id="maxViolations"
                  type="number"
                  min={1}
                  value={settings.maxViolations}
                  onChange={e => onUpdateSettings({ 
                    maxViolations: parseInt(e.target.value) || 5 
                  })}
                />
                <p className="text-xs text-muted-foreground">
                  Auto-submit after this many violations
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attempts & Grading */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Attempts & Grading
            </CardTitle>
            <CardDescription>
              Configure attempt limits and grading policies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="maxAttempts">Maximum Attempts</Label>
              <Input
                id="maxAttempts"
                type="number"
                min={1}
                value={settings.maxAttempts}
                onChange={e => onUpdateSettings({ 
                  maxAttempts: parseInt(e.target.value) || 1 
                })}
              />
            </div>

            {settings.maxAttempts > 1 && (
              <div className="space-y-2">
                <Label>Grading Policy</Label>
                <Select
                  value={settings.attemptsGradingPolicy}
                  onValueChange={v => onUpdateSettings({ 
                    attemptsGradingPolicy: v as 'HIGHEST' | 'LATEST' | 'AVERAGE' 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HIGHEST">Highest Score</SelectItem>
                    <SelectItem value="LATEST">Latest Attempt</SelectItem>
                    <SelectItem value="AVERAGE">Average Score</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="passingScore">Passing Score (%)</Label>
              <Input
                id="passingScore"
                type="number"
                min={0}
                max={100}
                value={settings.passingScore ?? ''}
                onChange={e => onUpdateSettings({ 
                  passingScore: e.target.value ? parseInt(e.target.value) : undefined 
                })}
                placeholder="No passing score"
              />
            </div>

            <div className="space-y-2">
              <Label>Grade Release Policy</Label>
              <Select
                value={settings.gradeReleasePolicy}
                onValueChange={v => onUpdateSettings({ 
                  gradeReleasePolicy: v as 'IMMEDIATE' | 'MANUAL' | 'AFTER_ALL_GRADED' 
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IMMEDIATE">Immediately</SelectItem>
                  <SelectItem value="AFTER_ALL_GRADED">After All Graded</SelectItem>
                  <SelectItem value="MANUAL">Manual Release</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Feedback */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Feedback & Results
            </CardTitle>
            <CardDescription>
              What students see after completing the assessment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Show Feedback</Label>
                <p className="text-xs text-muted-foreground">
                  Display question feedback to students
                </p>
              </div>
              <Switch
                checked={settings.showFeedback}
                onCheckedChange={v => onUpdateSettings({ showFeedback: v })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Show Correct Answers</Label>
                <p className="text-xs text-muted-foreground">
                  Reveal correct answers after submission
                </p>
              </div>
              <Switch
                checked={settings.showCorrectAnswers}
                onCheckedChange={v => onUpdateSettings({ showCorrectAnswers: v })}
              />
            </div>

            {settings.showCorrectAnswers && (
              <div className="space-y-2 ml-4">
                <Label>When to Show</Label>
                <Select
                  value={settings.showCorrectAnswersAfter ?? 'IMMEDIATE'}
                  onValueChange={v => onUpdateSettings({ 
                    showCorrectAnswersAfter: v as 'IMMEDIATE' | 'AFTER_DUE_DATE' | 'NEVER' 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IMMEDIATE">Immediately</SelectItem>
                    <SelectItem value="AFTER_DUE_DATE">After Due Date</SelectItem>
                    <SelectItem value="NEVER">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
