// ══════════════════════════════════════════════════════════════════════════════
// EXPORT OPTIONS PANEL
// Format-specific options for export configuration
// ══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ExportFormat, ContentType } from './ExportFormatSelector';

export interface ExportOptions {
  // General
  title?: string;
  description?: string;
  language?: string;

  // SCORM
  scormVersion?: '1.2' | '2004';
  includeSequencing?: boolean;
  masteryCriteria?: 'passed' | 'completed' | 'score';
  masteryScore?: number;

  // QTI
  qtiVersion?: '2.1' | '3.0';
  includeResponseProcessing?: boolean;
  includeMetadata?: boolean;
  shuffleChoices?: boolean;

  // Common Cartridge
  ccVersion?: '1.0' | '1.1' | '1.2' | '1.3';
  includeQTI?: boolean;
  includeLTILinks?: boolean;

  // xAPI
  xapiFormat?: 'json' | 'json-lines';
  includeTimestamps?: boolean;
  anonymize?: boolean;
}

interface ExportOptionsPanelProps {
  format: ExportFormat;
  contentType: ContentType;
  options: ExportOptions;
  onChange: (options: ExportOptions) => void;
}

export function ExportOptionsPanel({
  format,
  contentType,
  options,
  onChange,
}: ExportOptionsPanelProps) {
  const updateOption = <K extends keyof ExportOptions>(
    key: K,
    value: ExportOptions[K]
  ) => {
    onChange({ ...options, [key]: value });
  };

  return (
    <div className="space-y-6">
      {/* General Metadata */}
      <Accordion type="single" collapsible defaultValue="general">
        <AccordionItem value="general">
          <AccordionTrigger>General Metadata</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="title">Package Title</Label>
                <Input
                  id="title"
                  value={options.title || ''}
                  onChange={(e) => updateOption('title', e.target.value)}
                  placeholder="Enter export title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={options.description || ''}
                  onChange={(e) => updateOption('description', e.target.value)}
                  placeholder="Enter package description"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select
                  value={options.language || 'en'}
                  onValueChange={(v) => updateOption('language', v)}
                >
                  <SelectTrigger id="language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="pt">Portuguese</SelectItem>
                    <SelectItem value="zh">Chinese</SelectItem>
                    <SelectItem value="ja">Japanese</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* SCORM Options */}
        {(format === 'scorm_1.2' || format === 'scorm_2004') && (
          <AccordionItem value="scorm">
            <AccordionTrigger>SCORM Options</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-2">
                {format === 'scorm_2004' && (
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Include Sequencing</Label>
                      <p className="text-xs text-muted-foreground">
                        Add SCORM 2004 sequencing and navigation rules
                      </p>
                    </div>
                    <Switch
                      checked={options.includeSequencing ?? true}
                      onCheckedChange={(v) => updateOption('includeSequencing', v)}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Mastery Criteria</Label>
                  <Select
                    value={options.masteryCriteria || 'completed'}
                    onValueChange={(v: any) => updateOption('masteryCriteria', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completed">Completion</SelectItem>
                      <SelectItem value="passed">Pass/Fail</SelectItem>
                      <SelectItem value="score">Minimum Score</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {options.masteryCriteria === 'score' && (
                  <div className="space-y-2">
                    <Label htmlFor="masteryScore">Mastery Score (%)</Label>
                    <Input
                      id="masteryScore"
                      type="number"
                      min={0}
                      max={100}
                      value={options.masteryScore || 80}
                      onChange={(e) => updateOption('masteryScore', Number(e.target.value))}
                    />
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* QTI Options */}
        {(format === 'qti_2.1' || format === 'qti_3.0') && (
          <AccordionItem value="qti">
            <AccordionTrigger>QTI Options</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Include Response Processing</Label>
                    <p className="text-xs text-muted-foreground">
                      Add automated scoring rules
                    </p>
                  </div>
                  <Switch
                    checked={options.includeResponseProcessing ?? true}
                    onCheckedChange={(v) => updateOption('includeResponseProcessing', v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Include Metadata</Label>
                    <p className="text-xs text-muted-foreground">
                      Add IEEE LOM metadata
                    </p>
                  </div>
                  <Switch
                    checked={options.includeMetadata ?? true}
                    onCheckedChange={(v) => updateOption('includeMetadata', v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Shuffle Choices</Label>
                    <p className="text-xs text-muted-foreground">
                      Randomize answer order
                    </p>
                  </div>
                  <Switch
                    checked={options.shuffleChoices ?? false}
                    onCheckedChange={(v) => updateOption('shuffleChoices', v)}
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Common Cartridge Options */}
        {format === 'common_cartridge' && (
          <AccordionItem value="cc">
            <AccordionTrigger>Common Cartridge Options</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>CC Version</Label>
                  <Select
                    value={options.ccVersion || '1.3'}
                    onValueChange={(v: any) => updateOption('ccVersion', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1.3">1.3 (Latest)</SelectItem>
                      <SelectItem value="1.2">1.2</SelectItem>
                      <SelectItem value="1.1">1.1</SelectItem>
                      <SelectItem value="1.0">1.0</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Include QTI Assessments</Label>
                    <p className="text-xs text-muted-foreground">
                      Embed assessments as QTI
                    </p>
                  </div>
                  <Switch
                    checked={options.includeQTI ?? true}
                    onCheckedChange={(v) => updateOption('includeQTI', v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Include LTI Links</Label>
                    <p className="text-xs text-muted-foreground">
                      Add LTI tool links
                    </p>
                  </div>
                  <Switch
                    checked={options.includeLTILinks ?? false}
                    onCheckedChange={(v) => updateOption('includeLTILinks', v)}
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* xAPI Options */}
        {format === 'xapi' && (
          <AccordionItem value="xapi">
            <AccordionTrigger>xAPI Options</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Output Format</Label>
                  <Select
                    value={options.xapiFormat || 'json'}
                    onValueChange={(v: any) => updateOption('xapiFormat', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="json">JSON (Single file)</SelectItem>
                      <SelectItem value="json-lines">JSON Lines (Streaming)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Include Timestamps</Label>
                    <p className="text-xs text-muted-foreground">
                      Add stored timestamps
                    </p>
                  </div>
                  <Switch
                    checked={options.includeTimestamps ?? true}
                    onCheckedChange={(v) => updateOption('includeTimestamps', v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Anonymize Data</Label>
                    <p className="text-xs text-muted-foreground">
                      Remove PII from statements
                    </p>
                  </div>
                  <Switch
                    checked={options.anonymize ?? false}
                    onCheckedChange={(v) => updateOption('anonymize', v)}
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
}
