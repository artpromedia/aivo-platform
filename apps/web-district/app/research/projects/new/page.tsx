'use client';

import { Card, Heading, Button, Input, Select } from '@aivo/ui-web';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface CreateProjectForm {
  title: string;
  description: string;
  type: 'INTERNAL_EVAL' | 'EXTERNAL_RESEARCH' | 'VENDOR_STUDY';
  piName: string;
  piEmail: string;
  piAffiliation: string;
  startDate: string;
  endDate: string;
  irbProtocolId: string;
  irbExpiryDate: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function NewProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [form, setForm] = useState<CreateProjectForm>({
    title: '',
    description: '',
    type: 'INTERNAL_EVAL',
    piName: '',
    piEmail: '',
    piAffiliation: '',
    startDate: '',
    endDate: '',
    irbProtocolId: '',
    irbExpiryDate: '',
  });

  const updateField = <K extends keyof CreateProjectForm>(field: K, value: CreateProjectForm[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/research/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token', // TODO: Get from auth
        },
        body: JSON.stringify({
          ...form,
          startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
          endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
          irbExpiryDate: form.irbExpiryDate ? new Date(form.irbExpiryDate).toISOString() : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create project');
      }

      const project = await res.json();
      router.push(`/research/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-6 max-w-3xl">
      <div>
        <Heading level={1}>Create Research Project</Heading>
        <p className="text-muted mt-1">
          Set up a new research project to access de-identified district data
        </p>
      </div>

      {error && (
        <Card className="border-error">
          <p className="text-error">{error}</p>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Project Details */}
        <Card title="Project Details">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Project Title <span className="text-error">*</span>
              </label>
              <Input
                value={form.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="e.g., Impact of AI Tutoring on Math Achievement"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                rows={4}
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Describe the research objectives and methodology..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Project Type <span className="text-error">*</span>
              </label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.type}
                onChange={(e) => updateField('type', e.target.value as CreateProjectForm['type'])}
                required
              >
                <option value="INTERNAL_EVAL">Internal Evaluation</option>
                <option value="EXTERNAL_RESEARCH">External Research</option>
                <option value="VENDOR_STUDY">Vendor Study</option>
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => updateField('startDate', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Date</label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => updateField('endDate', e.target.value)}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Principal Investigator */}
        <Card title="Principal Investigator">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Full Name <span className="text-error">*</span>
              </label>
              <Input
                value={form.piName}
                onChange={(e) => updateField('piName', e.target.value)}
                placeholder="Dr. Jane Smith"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Email <span className="text-error">*</span>
              </label>
              <Input
                type="email"
                value={form.piEmail}
                onChange={(e) => updateField('piEmail', e.target.value)}
                placeholder="jane.smith@university.edu"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Affiliation</label>
              <Input
                value={form.piAffiliation}
                onChange={(e) => updateField('piAffiliation', e.target.value)}
                placeholder="University of Education Research"
              />
            </div>
          </div>
        </Card>

        {/* IRB Information (for external research) */}
        {form.type === 'EXTERNAL_RESEARCH' && (
          <Card title="IRB Approval">
            <p className="text-sm text-muted mb-4">
              External research projects require IRB approval documentation.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">IRB Protocol ID</label>
                <Input
                  value={form.irbProtocolId}
                  onChange={(e) => updateField('irbProtocolId', e.target.value)}
                  placeholder="IRB-2024-001234"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">IRB Expiry Date</label>
                <Input
                  type="date"
                  value={form.irbExpiryDate}
                  onChange={(e) => updateField('irbExpiryDate', e.target.value)}
                />
              </div>
            </div>
          </Card>
        )}

        {/* Privacy Notice */}
        <Card>
          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
            <span className="text-2xl">🔒</span>
            <div>
              <h4 className="font-medium text-blue-900">Privacy & Compliance</h4>
              <p className="text-sm text-blue-800 mt-1">
                All data exports are de-identified and subject to k-anonymity thresholds (minimum 10).
                A Data Use Agreement (DUA) will be generated upon project approval.
                Full audit trails are maintained for FERPA/COPPA compliance.
              </p>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex gap-4 justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Project'}
          </Button>
        </div>
      </form>
    </section>
  );
}
