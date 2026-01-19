'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Award,
  Calendar,
  Clock,
  Download,
  Share2,
  AlertTriangle,
  CheckCircle,
  Trophy,
  Target,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type CertificationType = 'certificate' | 'badge' | 'credential';
type CertificationStatus = 'active' | 'expiring-soon' | 'expired' | 'in-progress';

interface Certification {
  id: string;
  title: string;
  issuer: string;
  type: CertificationType;
  status: CertificationStatus;
  issueDate?: string;
  expiryDate?: string;
  hours: number;
  credentialId?: string;
  credentialUrl?: string;
  badgeImageUrl?: string;
  progress?: number;
  requirements?: {
    total: number;
    completed: number;
    items: string[];
  };
}

interface CertificationTrackerProps {
  certifications?: Certification[];
  className?: string;
  compact?: boolean;
}

const mockCertifications: Certification[] = [
  {
    id: '1',
    title: 'Differentiated Instruction Specialist',
    issuer: 'Aivo Learning Academy',
    type: 'certificate',
    status: 'active',
    issueDate: '2024-09-15',
    expiryDate: '2026-09-15',
    hours: 20,
    credentialId: 'DIS-2024-00892',
    credentialUrl: '#',
    badgeImageUrl: '/badges/differentiation.png',
  },
  {
    id: '2',
    title: 'Google Certified Educator Level 1',
    issuer: 'Google for Education',
    type: 'credential',
    status: 'expiring-soon',
    issueDate: '2023-03-20',
    expiryDate: '2025-03-20',
    hours: 15,
    credentialId: 'GCE-L1-45892',
    credentialUrl: '#',
  },
  {
    id: '3',
    title: 'Classroom Management Master',
    issuer: 'Aivo Learning Academy',
    type: 'badge',
    status: 'active',
    issueDate: '2024-11-01',
    hours: 10,
    badgeImageUrl: '/badges/management.png',
  },
  {
    id: '4',
    title: 'IEP Implementation Specialist',
    issuer: 'Special Education Association',
    type: 'certificate',
    status: 'in-progress',
    hours: 25,
    progress: 65,
    requirements: {
      total: 4,
      completed: 2,
      items: [
        'Complete Module 1: Understanding IEPs',
        'Complete Module 2: Writing SMART Goals',
        'Pass final assessment (80%+)',
        'Submit implementation portfolio',
      ],
    },
  },
  {
    id: '5',
    title: 'Technology Integration Champion',
    issuer: 'District Professional Development',
    type: 'badge',
    status: 'in-progress',
    hours: 8,
    progress: 40,
    requirements: {
      total: 5,
      completed: 2,
      items: [
        'Complete ed-tech basics course',
        'Implement 3 tech tools in lessons',
        'Mentor a colleague on tech use',
        'Present at staff meeting',
        'Submit reflection portfolio',
      ],
    },
  },
];

const typeIcons: Record<CertificationType, typeof Award> = {
  certificate: Award,
  badge: Trophy,
  credential: Target,
};

const statusConfig: Record<CertificationStatus, { color: string; label: string; icon: typeof CheckCircle }> = {
  active: { color: 'bg-green-100 text-green-700', label: 'Active', icon: CheckCircle },
  'expiring-soon': { color: 'bg-yellow-100 text-yellow-700', label: 'Expiring Soon', icon: AlertTriangle },
  expired: { color: 'bg-red-100 text-red-700', label: 'Expired', icon: AlertTriangle },
  'in-progress': { color: 'bg-blue-100 text-blue-700', label: 'In Progress', icon: Clock },
};

export function CertificationTracker({
  certifications = mockCertifications,
  className,
  compact = false,
}: CertificationTrackerProps) {
  const [filter, setFilter] = useState<CertificationStatus | ''>('');

  const filteredCertifications = certifications.filter(
    (cert) => !filter || cert.status === filter
  );

  const displayedCertifications = compact
    ? filteredCertifications.slice(0, 3)
    : filteredCertifications;

  const totalHours = certifications
    .filter((c) => c.status === 'active')
    .reduce((sum, c) => sum + c.hours, 0);

  const activeCertCount = certifications.filter((c) => c.status === 'active').length;
  const inProgressCount = certifications.filter((c) => c.status === 'in-progress').length;
  const expiringCount = certifications.filter((c) => c.status === 'expiring-soon').length;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDaysUntilExpiry = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Certification Tracker
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        {!compact && (
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{activeCertCount}</div>
              <div className="text-xs text-gray-600">Active</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{inProgressCount}</div>
              <div className="text-xs text-gray-600">In Progress</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{totalHours}</div>
              <div className="text-xs text-gray-600">PD Hours</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-700">{expiringCount}</div>
              <div className="text-xs text-yellow-600">Expiring</div>
            </div>
          </div>
        )}

        {/* Filter Buttons */}
        {!compact && (
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filter === '' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('')}
            >
              All
            </Button>
            <Button
              variant={filter === 'active' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('active')}
            >
              Active
            </Button>
            <Button
              variant={filter === 'in-progress' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('in-progress')}
            >
              In Progress
            </Button>
            <Button
              variant={filter === 'expiring-soon' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('expiring-soon')}
              className={expiringCount > 0 ? 'border-yellow-500' : ''}
            >
              Expiring Soon ({expiringCount})
            </Button>
          </div>
        )}

        {/* Certifications List */}
        <div className="space-y-3">
          {displayedCertifications.map((cert) => {
            const TypeIcon = typeIcons[cert.type];
            const statusInfo = statusConfig[cert.status];
            const StatusIcon = statusInfo.icon;
            const daysUntilExpiry = cert.expiryDate ? getDaysUntilExpiry(cert.expiryDate) : null;

            return (
              <div
                key={cert.id}
                className={cn(
                  'border rounded-lg p-3 transition-all hover:shadow-sm',
                  cert.status === 'expiring-soon' && 'border-yellow-200 bg-yellow-50/30',
                  cert.status === 'expired' && 'border-red-200 bg-red-50/30'
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Icon/Badge */}
                  <div
                    className={cn(
                      'w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0',
                      cert.status === 'active' && 'bg-green-100',
                      cert.status === 'in-progress' && 'bg-blue-100',
                      cert.status === 'expiring-soon' && 'bg-yellow-100',
                      cert.status === 'expired' && 'bg-red-100'
                    )}
                  >
                    <TypeIcon
                      className={cn(
                        'h-6 w-6',
                        cert.status === 'active' && 'text-green-600',
                        cert.status === 'in-progress' && 'text-blue-600',
                        cert.status === 'expiring-soon' && 'text-yellow-600',
                        cert.status === 'expired' && 'text-red-600'
                      )}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm">{cert.title}</h4>
                        <p className="text-xs text-gray-600">{cert.issuer}</p>
                      </div>
                      <Badge className={statusInfo.color}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusInfo.label}
                      </Badge>
                    </div>

                    {/* Progress for in-progress certs */}
                    {cert.status === 'in-progress' && cert.progress !== undefined && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span>Progress</span>
                          <span>{cert.progress}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500"
                            style={{ width: `${cert.progress}%` }}
                          />
                        </div>
                        {cert.requirements && !compact && (
                          <div className="mt-2 text-xs text-gray-600">
                            <span className="font-medium">
                              {cert.requirements.completed}/{cert.requirements.total} requirements
                              completed
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Date info */}
                    {cert.status !== 'in-progress' && (
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        {cert.issueDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Issued: {formatDate(cert.issueDate)}
                          </span>
                        )}
                        {cert.expiryDate && (
                          <span
                            className={cn(
                              'flex items-center gap-1',
                              daysUntilExpiry && daysUntilExpiry < 90 && 'text-yellow-600 font-medium'
                            )}
                          >
                            <Clock className="h-3 w-3" />
                            {daysUntilExpiry && daysUntilExpiry > 0
                              ? `Expires in ${daysUntilExpiry} days`
                              : 'Expired'}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          {cert.hours} PD hours
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {!compact && cert.status !== 'in-progress' && (
                    <div className="flex gap-1 flex-shrink-0">
                      {cert.credentialUrl && (
                        <Button size="sm" variant="ghost" asChild>
                          <a href={cert.credentialUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <Button size="sm" variant="ghost">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {cert.status === 'in-progress' && (
                    <Button size="sm">Continue</Button>
                  )}
                </div>
              </div>
            );
          })}

          {displayedCertifications.length === 0 && (
            <div className="text-center py-6 text-gray-500">
              <Award className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">No certifications found</p>
            </div>
          )}
        </div>

        {/* View All Link */}
        {compact && filteredCertifications.length > 3 && (
          <div className="pt-2 border-t">
            <Button variant="link" className="w-full" size="sm">
              View All Certifications
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}

        {/* Renewal Alert */}
        {expiringCount > 0 && compact && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
              <div className="text-sm">
                <span className="font-medium text-yellow-800">
                  {expiringCount} certification{expiringCount > 1 ? 's' : ''} expiring soon
                </span>
                <Button variant="link" size="sm" className="h-auto p-0 ml-1 text-yellow-700">
                  View Details
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CertificationTracker;
