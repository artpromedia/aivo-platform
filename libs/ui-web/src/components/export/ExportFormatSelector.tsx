// ══════════════════════════════════════════════════════════════════════════════
// EXPORT FORMAT SELECTOR
// Format selection cards for choosing export type
// ══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileArchive,
  FileQuestion,
  BookOpen,
  Activity,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type ExportFormat =
  | 'scorm_1.2'
  | 'scorm_2004'
  | 'qti_2.1'
  | 'qti_3.0'
  | 'common_cartridge'
  | 'xapi';

export type ContentType = 'lesson' | 'assessment' | 'question' | 'course';

interface FormatOption {
  id: ExportFormat;
  name: string;
  description: string;
  icon: React.ReactNode;
  supportedTypes: ContentType[];
  tags: string[];
}

const FORMAT_OPTIONS: FormatOption[] = [
  {
    id: 'scorm_1.2',
    name: 'SCORM 1.2',
    description: 'Legacy SCORM format with broad LMS compatibility',
    icon: <FileArchive className="h-8 w-8" />,
    supportedTypes: ['lesson', 'course'],
    tags: ['LMS', 'Tracking'],
  },
  {
    id: 'scorm_2004',
    name: 'SCORM 2004',
    description: 'Modern SCORM with sequencing and navigation support',
    icon: <FileArchive className="h-8 w-8" />,
    supportedTypes: ['lesson', 'course'],
    tags: ['LMS', 'Sequencing', '4th Ed'],
  },
  {
    id: 'qti_2.1',
    name: 'QTI 2.1',
    description: 'IMS Question & Test Interoperability standard',
    icon: <FileQuestion className="h-8 w-8" />,
    supportedTypes: ['assessment', 'question'],
    tags: ['Assessments', 'IMS'],
  },
  {
    id: 'qti_3.0',
    name: 'QTI 3.0',
    description: 'Latest QTI with enhanced accessibility and PCI support',
    icon: <FileQuestion className="h-8 w-8" />,
    supportedTypes: ['assessment', 'question'],
    tags: ['Assessments', 'IMS', 'A11y'],
  },
  {
    id: 'common_cartridge',
    name: 'Common Cartridge',
    description: 'IMS Common Cartridge for course content exchange',
    icon: <BookOpen className="h-8 w-8" />,
    supportedTypes: ['course', 'lesson'],
    tags: ['Course', 'IMS', 'LTI'],
  },
  {
    id: 'xapi',
    name: 'xAPI Statements',
    description: 'Experience API learning records for analytics',
    icon: <Activity className="h-8 w-8" />,
    supportedTypes: ['lesson', 'assessment', 'question', 'course'],
    tags: ['Analytics', 'LRS'],
  },
];

interface ExportFormatSelectorProps {
  contentType: ContentType;
  onSelect: (format: ExportFormat) => void;
  selectedFormat?: ExportFormat | null;
}

export function ExportFormatSelector({
  contentType,
  onSelect,
  selectedFormat,
}: ExportFormatSelectorProps) {
  const availableFormats = FORMAT_OPTIONS.filter((f) =>
    f.supportedTypes.includes(contentType)
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Select an export format compatible with your {contentType}
      </p>

      <div className="grid gap-3">
        {availableFormats.map((format) => (
          <FormatCard
            key={format.id}
            format={format}
            isSelected={selectedFormat === format.id}
            onClick={() => onSelect(format.id)}
          />
        ))}
      </div>

      {availableFormats.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No export formats available for {contentType}s
        </div>
      )}
    </div>
  );
}

interface FormatCardProps {
  format: FormatOption;
  isSelected: boolean;
  onClick: () => void;
}

function FormatCard({ format, isSelected, onClick }: FormatCardProps) {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:border-primary/50',
        isSelected && 'border-primary ring-2 ring-primary/20'
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'text-muted-foreground',
              isSelected && 'text-primary'
            )}>
              {format.icon}
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {format.name}
                {isSelected && (
                  <CheckCircle className="h-4 w-4 text-primary" />
                )}
              </CardTitle>
              <CardDescription className="text-sm mt-1">
                {format.description}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-1">
          {format.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
