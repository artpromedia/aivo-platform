/**
 * Google Classroom Admin Console Component
 *
 * Admin interface for managing domain-wide Google Classroom installations.
 * Allows platform administrators to configure and monitor integrations
 * across all tenants.
 *
 * Features:
 * - Domain-wide installation management
 * - Service account configuration
 * - Integration monitoring dashboard
 * - Sync status across all tenants
 *
 * @component
 */

'use client';

import {
  Loader2,
  RefreshCw,
  Plus,
  Trash2,
  Settings,
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  Users,
  Activity,
  ExternalLink,
} from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface DomainInstallation {
  id: string;
  tenantId: string;
  tenantName: string;
  domain: string;
  serviceAccountEmail?: string;
  customerDomain: string;
  adminEmail: string;
  isActive: boolean;
  autoProvision: boolean;
  syncEnabled: boolean;
  lastSyncAt?: string;
  coursesCount: number;
  usersCount: number;
  errorCount: number;
  createdAt: string;
  updatedAt: string;
}

interface IntegrationStats {
  totalDomains: number;
  activeDomains: number;
  totalCoursesSynced: number;
  totalUsersSynced: number;
  recentErrors: number;
  lastGlobalSync?: string;
}

interface ServiceAccountConfig {
  clientEmail: string;
  privateKeyId: string;
  hasPrivateKey: boolean;
  scopes: string[];
  isValid: boolean;
  lastValidated?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export function GoogleClassroomAdmin() {
  const [stats, setStats] = useState<IntegrationStats | null>(null);
  const [installations, setInstallations] = useState<DomainInstallation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsRes, installationsRes] = await Promise.all([
        fetch('/api/admin/integrations/google-classroom/stats'),
        fetch('/api/admin/integrations/google-classroom/installations'),
      ]);

      if (!statsRes.ok || !installationsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      setStats(await statsRes.json());
      setInstallations(await installationsRes.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Overview */}
      {stats && <StatsOverview stats={stats} />}

      <Tabs defaultValue="installations">
        <TabsList>
          <TabsTrigger value="installations">Domain Installations</TabsTrigger>
          <TabsTrigger value="config">Service Account</TabsTrigger>
          <TabsTrigger value="logs">Activity Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="installations" className="mt-4">
          <InstallationsTab installations={installations} onRefresh={fetchData} />
        </TabsContent>

        <TabsContent value="config" className="mt-4">
          <ServiceAccountTab />
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <ActivityLogsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

function StatsOverview({ stats }: { stats: IntegrationStats }) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <StatCard
        title="Active Domains"
        value={stats.activeDomains}
        subtitle={`of ${stats.totalDomains} total`}
        icon={Building2}
        status="success"
      />
      <StatCard
        title="Courses Synced"
        value={stats.totalCoursesSynced}
        subtitle="across all domains"
        icon={Activity}
      />
      <StatCard
        title="Users Synced"
        value={stats.totalUsersSynced}
        subtitle="students & teachers"
        icon={Users}
      />
      <StatCard
        title="Recent Errors"
        value={stats.recentErrors}
        subtitle="last 24 hours"
        icon={AlertTriangle}
        status={stats.recentErrors > 0 ? 'warning' : 'success'}
      />
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  status,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ElementType;
  status?: 'success' | 'warning' | 'error';
}) {
  const statusColors = {
    success: 'text-green-500',
    warning: 'text-yellow-500',
    error: 'text-red-500',
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{value.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <Icon className={`h-8 w-8 ${status ? statusColors[status] : 'text-muted-foreground'}`} />
        </div>
      </CardContent>
    </Card>
  );
}

function InstallationsTab({
  installations,
  onRefresh,
}: {
  installations: DomainInstallation[];
  onRefresh: () => void;
}) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedInstallation, setSelectedInstallation] = useState<DomainInstallation | null>(null);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Domain Installations</CardTitle>
            <CardDescription>
              Manage domain-wide Google Classroom installations for tenants
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setShowAddDialog(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Domain
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {installations.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No Domain Installations</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add a domain-wide installation to enable Google Classroom sync for a tenant.
            </p>
            <Button
              onClick={() => {
                setShowAddDialog(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add First Domain
            </Button>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Courses</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Last Sync</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {installations.map((installation) => (
                  <TableRow key={installation.id}>
                    <TableCell className="font-medium">{installation.tenantName}</TableCell>
                    <TableCell>{installation.domain}</TableCell>
                    <TableCell>
                      <InstallationStatusBadge installation={installation} />
                    </TableCell>
                    <TableCell>{installation.coursesCount}</TableCell>
                    <TableCell>{installation.usersCount}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {installation.lastSyncAt
                        ? new Date(installation.lastSyncAt).toLocaleString()
                        : 'Never'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedInstallation(installation);
                        }}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}

        <AddDomainDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          onSuccess={onRefresh}
        />

        {selectedInstallation && (
          <InstallationDetailsDialog
            installation={selectedInstallation}
            open={!!selectedInstallation}
            onOpenChange={(open) => {
              if (!open) setSelectedInstallation(null);
            }}
            onUpdate={onRefresh}
          />
        )}
      </CardContent>
    </Card>
  );
}

function InstallationStatusBadge({ installation }: { installation: DomainInstallation }) {
  if (!installation.isActive) {
    return (
      <Badge variant="secondary" className="gap-1">
        <XCircle className="h-3 w-3" />
        Inactive
      </Badge>
    );
  }

  if (installation.errorCount > 0) {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        {installation.errorCount} errors
      </Badge>
    );
  }

  return (
    <Badge variant="success" className="gap-1">
      <CheckCircle2 className="h-3 w-3" />
      Active
    </Badge>
  );
}

function AddDomainDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [tenantId, setTenantId] = useState('');
  const [domain, setDomain] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [autoProvision, setAutoProvision] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/integrations/google-classroom/installations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          domain,
          adminEmail,
          autoProvision,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to add domain');
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Domain Installation</DialogTitle>
          <DialogDescription>
            Configure domain-wide Google Classroom access for a tenant
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="tenantId">Tenant ID</Label>
            <Input
              id="tenantId"
              value={tenantId}
              onChange={(e) => {
                setTenantId(e.target.value);
              }}
              placeholder="e.g., tenant_abc123"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="domain">Google Workspace Domain</Label>
            <Input
              id="domain"
              value={domain}
              onChange={(e) => {
                setDomain(e.target.value);
              }}
              placeholder="e.g., school.edu"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adminEmail">Domain Admin Email</Label>
            <Input
              id="adminEmail"
              type="email"
              value={adminEmail}
              onChange={(e) => {
                setAdminEmail(e.target.value);
              }}
              placeholder="e.g., admin@school.edu"
              required
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="autoProvision">Auto-provision Users</Label>
              <p className="text-xs text-muted-foreground">
                Automatically create AIVO accounts for synced users
              </p>
            </div>
            <Switch id="autoProvision" checked={autoProvision} onCheckedChange={setAutoProvision} />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Add Domain
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function InstallationDetailsDialog({
  installation,
  open,
  onOpenChange,
  onUpdate,
}: {
  installation: DomainInstallation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(installation.syncEnabled);
  const [autoProvision, setAutoProvision] = useState(installation.autoProvision);

  const handleSave = async () => {
    setLoading(true);
    try {
      await fetch(`/api/admin/integrations/google-classroom/installations/${installation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncEnabled, autoProvision }),
      });
      onUpdate();
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to update installation:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch(
        `/api/admin/integrations/google-classroom/installations/${installation.id}/sync`,
        {
          method: 'POST',
        }
      );
      onUpdate();
    } catch (err) {
      console.error('Failed to trigger sync:', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to remove this domain installation?')) return;

    try {
      await fetch(`/api/admin/integrations/google-classroom/installations/${installation.id}`, {
        method: 'DELETE',
      });
      onUpdate();
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to delete installation:', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Installation Settings</DialogTitle>
          <DialogDescription>
            {installation.tenantName} - {installation.domain}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <InstallationStatusBadge installation={installation} />
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Courses</span>
              <span className="font-medium">{installation.coursesCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Users</span>
              <span className="font-medium">{installation.usersCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Last Sync</span>
              <span className="font-medium">
                {installation.lastSyncAt
                  ? new Date(installation.lastSyncAt).toLocaleString()
                  : 'Never'}
              </span>
            </div>
          </div>

          <Separator />

          {/* Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Sync</Label>
                <p className="text-xs text-muted-foreground">Automatically sync roster changes</p>
              </div>
              <Switch checked={syncEnabled} onCheckedChange={setSyncEnabled} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-provision Users</Label>
                <p className="text-xs text-muted-foreground">Create AIVO accounts for new users</p>
              </div>
              <Switch checked={autoProvision} onCheckedChange={setAutoProvision} />
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSync} disabled={syncing} className="flex-1">
              {syncing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Sync Now
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Remove
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ServiceAccountTab() {
  const [config, setConfig] = useState<ServiceAccountConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/integrations/google-classroom/service-account');
      if (response.ok) {
        setConfig(await response.json());
      }
    } catch (err) {
      console.error('Failed to fetch service account config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    setValidating(true);
    try {
      await fetch('/api/admin/integrations/google-classroom/service-account/validate', {
        method: 'POST',
      });
      await fetchConfig();
    } catch (err) {
      console.error('Validation failed:', err);
    } finally {
      setValidating(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <CardTitle>Service Account Configuration</CardTitle>
        </div>
        <CardDescription>
          Configure the Google Workspace service account for domain-wide delegation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {config ? (
          <>
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Client Email</span>
                <span className="font-mono text-sm">{config.clientEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Private Key</span>
                <Badge variant={config.hasPrivateKey ? 'success' : 'destructive'}>
                  {config.hasPrivateKey ? 'Configured' : 'Missing'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant={config.isValid ? 'success' : 'destructive'}>
                  {config.isValid ? 'Valid' : 'Invalid'}
                </Badge>
              </div>
              {config.lastValidated && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Last Validated</span>
                  <span className="text-sm">{new Date(config.lastValidated).toLocaleString()}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Required Scopes:</p>
              <div className="flex flex-wrap gap-1">
                {config.scopes.map((scope) => (
                  <Badge key={scope} variant="outline" className="text-xs">
                    {scope.split('/').pop()}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        ) : (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>No Service Account Configured</AlertTitle>
            <AlertDescription>
              Upload a service account key file to enable domain-wide delegation.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => {
            setShowUploadDialog(true);
          }}
        >
          {config ? 'Update Key' : 'Upload Key'}
        </Button>
        {config && (
          <Button onClick={handleValidate} disabled={validating}>
            {validating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Validate
          </Button>
        )}
        <Button variant="ghost" asChild>
          <a
            href="https://console.cloud.google.com/iam-admin/serviceaccounts"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Console <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </Button>
      </CardFooter>

      <UploadKeyDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        onSuccess={fetchConfig}
      />
    </Card>
  );
}

function UploadKeyDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [keyJson, setKeyJson] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/integrations/google-classroom/service-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyJson }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to upload key');
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Service Account Key</DialogTitle>
          <DialogDescription>
            Paste the contents of your Google Cloud service account JSON key file
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="keyJson">Service Account Key (JSON)</Label>
            <Textarea
              id="keyJson"
              value={keyJson}
              onChange={(e) => {
                setKeyJson(e.target.value);
              }}
              placeholder='{"type": "service_account", ...}'
              rows={10}
              className="font-mono text-xs"
              required
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Upload Key
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ActivityLogsTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/integrations/google-classroom/logs?limit=100');
      if (response.ok) {
        setLogs(await response.json());
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Activity Logs</CardTitle>
            <CardDescription>
              Recent Google Classroom integration activity across all domains
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchLogs}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No activity logs yet</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {logs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border text-sm">
                  <div className="mt-0.5">
                    {log.success ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{log.action}</p>
                    <p className="text-muted-foreground">{log.details}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {log.domain} · {new Date(log.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

export default GoogleClassroomAdmin;
