/**
 * Caregivers Settings Page
 *
 * Allows parents to manage delegated access for their children.
 * Parents can invite up to 2 additional caregivers per child.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Users,
  UserPlus,
  Mail,
  Shield,
  Clock,
  Check,
  X,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Info,
} from 'lucide-react';

import { isDevMode } from '@/lib/mock-data';
import {
  useStudentCaregivers,
  useCreateCaregiverInvite,
  useUpdateCaregiverPermissions,
  useRevokeCaregiverAccess,
  useResendCaregiverInvite,
  useCancelCaregiverInvite,
  type CaregiverPermissions,
  type CaregiverRelationship,
  type Caregiver,
  type CaregiverInvite,
  DEFAULT_CAREGIVER_PERMISSIONS,
  CAREGIVER_RELATIONSHIP_LABELS,
  PERMISSION_LABELS,
} from '@/lib/caregiver-hooks';

// Mock selected student for demo
const MOCK_STUDENT_ID = 'student_001';

export default function CaregiversPage() {
  const router = useRouter();
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [selectedCaregiverId, setSelectedCaregiverId] = useState<string | null>(null);

  // Fetch caregivers data
  const {
    data: caregiverData,
    isLoading,
    error,
    refetch,
  } = useStudentCaregivers(MOCK_STUDENT_ID);

  // Mutations
  const createInvite = useCreateCaregiverInvite();
  const updatePermissions = useUpdateCaregiverPermissions();
  const revokeAccess = useRevokeCaregiverAccess();
  const resendInvite = useResendCaregiverInvite();
  const cancelInvite = useCancelCaregiverInvite();

  const canAddMore = caregiverData ? caregiverData.remainingSlots > 0 : false;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/settings')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-2">
                <Users className="w-6 h-6 text-indigo-600" />
                <h1 className="text-xl font-semibold text-gray-900">Caregivers</h1>
              </div>
            </div>
            {canAddMore && (
              <button
                onClick={() => setShowInviteForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Invite Caregiver
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">About Caregiver Access</h3>
              <p className="text-sm text-blue-700 mt-1">
                You can invite up to 2 additional caregivers (grandparents, nannies, etc.) to view{' '}
                {caregiverData?.studentName || "your child's"} learning progress. They will have a
                similar dashboard experience with the permissions you grant.
              </p>
            </div>
          </div>
        </div>

        {/* Slots Info */}
        {caregiverData && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Caregiver Slots</p>
                <p className="text-lg font-semibold text-gray-900">
                  {caregiverData.currentCount} of {caregiverData.maxCaregivers} used
                </p>
              </div>
              <div className="flex gap-1">
                {Array.from({ length: caregiverData.maxCaregivers }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      i < caregiverData.currentCount
                        ? 'bg-indigo-100 text-indigo-600'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <div>
                <p className="font-medium text-red-900">Failed to load caregivers</p>
                <button
                  onClick={() => refetch()}
                  className="text-sm text-red-700 underline mt-1"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Active Caregivers */}
        {caregiverData && caregiverData.caregivers.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Caregivers</h2>
            <div className="space-y-4">
              {caregiverData.caregivers.map((caregiver) => (
                <CaregiverCard
                  key={caregiver.id}
                  caregiver={caregiver}
                  studentId={MOCK_STUDENT_ID}
                  isExpanded={selectedCaregiverId === caregiver.id}
                  onToggleExpand={() =>
                    setSelectedCaregiverId(
                      selectedCaregiverId === caregiver.id ? null : caregiver.id
                    )
                  }
                  onUpdatePermissions={(permissions) =>
                    updatePermissions.mutate({
                      caregiverId: caregiver.id,
                      studentId: MOCK_STUDENT_ID,
                      ...permissions,
                    })
                  }
                  onRevoke={() =>
                    revokeAccess.mutate({
                      caregiverId: caregiver.id,
                      studentId: MOCK_STUDENT_ID,
                    })
                  }
                  isUpdating={updatePermissions.isPending}
                  isRevoking={revokeAccess.isPending}
                />
              ))}
            </div>
          </section>
        )}

        {/* Pending Invitations */}
        {caregiverData && caregiverData.pendingInvites.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Pending Invitations</h2>
            <div className="space-y-4">
              {caregiverData.pendingInvites.map((invite) => (
                <PendingInviteCard
                  key={invite.id}
                  invite={invite}
                  onResend={() =>
                    resendInvite.mutate({ inviteId: invite.id, studentId: MOCK_STUDENT_ID })
                  }
                  onCancel={() =>
                    cancelInvite.mutate({ inviteId: invite.id, studentId: MOCK_STUDENT_ID })
                  }
                  isResending={resendInvite.isPending}
                  isCancelling={cancelInvite.isPending}
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {caregiverData &&
          caregiverData.caregivers.length === 0 &&
          caregiverData.pendingInvites.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No caregivers yet</h3>
              <p className="text-gray-500 mb-6">
                Invite trusted family members or caregivers to help monitor your child's learning
                progress.
              </p>
              <button
                onClick={() => setShowInviteForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Invite Your First Caregiver
              </button>
            </div>
          )}

        {/* Invite Form Modal */}
        {showInviteForm && (
          <InviteFormModal
            studentId={MOCK_STUDENT_ID}
            onClose={() => setShowInviteForm(false)}
            onSubmit={async (data) => {
              await createInvite.mutateAsync(data);
              setShowInviteForm(false);
            }}
            isSubmitting={createInvite.isPending}
            error={createInvite.error}
          />
        )}
      </main>

      {/* DEV Mode */}
      {isDevMode() && (
        <div className="fixed bottom-4 right-4 bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-medium">
          DEV MODE
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPONENTS
// ============================================================================

function CaregiverCard({
  caregiver,
  studentId,
  isExpanded,
  onToggleExpand,
  onUpdatePermissions,
  onRevoke,
  isUpdating,
  isRevoking,
}: {
  caregiver: Caregiver;
  studentId: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdatePermissions: (permissions: Partial<CaregiverPermissions>) => void;
  onRevoke: () => void;
  isUpdating: boolean;
  isRevoking: boolean;
}) {
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
            <span className="text-indigo-600 font-medium">
              {caregiver.givenName[0]}
              {caregiver.familyName[0]}
            </span>
          </div>
          <div>
            <p className="font-medium text-gray-900">
              {caregiver.givenName} {caregiver.familyName}
            </p>
            <p className="text-sm text-gray-500">
              {CAREGIVER_RELATIONSHIP_LABELS[caregiver.relationship]} • {caregiver.email}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
            Active
          </span>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-100 p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Permissions</h4>
          <div className="space-y-3">
            {Object.entries(PERMISSION_LABELS).map(([key, { label, description }]) => (
              <PermissionToggle
                key={key}
                label={label}
                description={description}
                enabled={caregiver.permissions[key as keyof CaregiverPermissions]}
                onChange={(enabled) => onUpdatePermissions({ [key]: enabled })}
                disabled={isUpdating}
              />
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100">
            {!showRevokeConfirm ? (
              <button
                onClick={() => setShowRevokeConfirm(true)}
                className="text-red-600 hover:text-red-700 text-sm font-medium"
              >
                Revoke Access
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <p className="text-sm text-gray-600">Remove this caregiver's access?</p>
                <button
                  onClick={onRevoke}
                  disabled={isRevoking}
                  className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {isRevoking ? 'Removing...' : 'Yes, Remove'}
                </button>
                <button
                  onClick={() => setShowRevokeConfirm(false)}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PendingInviteCard({
  invite,
  onResend,
  onCancel,
  isResending,
  isCancelling,
}: {
  invite: CaregiverInvite;
  onResend: () => void;
  onCancel: () => void;
  isResending: boolean;
  isCancelling: boolean;
}) {
  const expiresAt = new Date(invite.expiresAt);
  const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
            <Mail className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">
              {invite.caregiverName || invite.caregiverEmail}
            </p>
            <p className="text-sm text-gray-500">
              {CAREGIVER_RELATIONSHIP_LABELS[invite.relationship]} • Pending
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
            <Clock className="w-3 h-3" />
            {daysLeft} days left
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={onResend}
          disabled={isResending}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isResending ? 'animate-spin' : ''}`} />
          Resend
        </button>
        <button
          onClick={onCancel}
          disabled={isCancelling}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
      </div>
    </div>
  );
}

function PermissionToggle({
  label,
  description,
  enabled,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        disabled={disabled}
        className={`relative w-10 h-6 rounded-full transition-colors disabled:opacity-50 ${
          enabled ? 'bg-indigo-600' : 'bg-gray-300'
        }`}
      >
        <div
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            enabled ? 'translate-x-4' : ''
          }`}
        />
      </button>
    </div>
  );
}

function InviteFormModal({
  studentId,
  onClose,
  onSubmit,
  isSubmitting,
  error,
}: {
  studentId: string;
  onClose: () => void;
  onSubmit: (data: {
    studentId: string;
    caregiverEmail: string;
    caregiverName?: string;
    relationship: CaregiverRelationship;
    permissions: CaregiverPermissions;
    message?: string;
  }) => Promise<void>;
  isSubmitting: boolean;
  error: Error | null;
}) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState<CaregiverRelationship>('grandparent');
  const [message, setMessage] = useState('');
  const [permissions, setPermissions] = useState<CaregiverPermissions>(DEFAULT_CAREGIVER_PERMISSIONS);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      studentId,
      caregiverEmail: email,
      caregiverName: name || undefined,
      relationship,
      permissions,
      message: message || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Invite Caregiver</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error.message}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="caregiver@example.com"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name (optional)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Grandma Mary"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Relationship */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
              <select
                value={relationship}
                onChange={(e) => setRelationship(e.target.value as CaregiverRelationship)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {Object.entries(CAREGIVER_RELATIONSHIP_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Personal Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Personal Message (optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Hi! I'd like to invite you to..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Permissions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Permissions</label>
              <div className="space-y-2 bg-gray-50 rounded-lg p-3">
                {Object.entries(PERMISSION_LABELS).map(([key, { label }]) => (
                  <label key={key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={permissions[key as keyof CaregiverPermissions]}
                      onChange={(e) =>
                        setPermissions({ ...permissions, [key]: e.target.checked })
                      }
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !email}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Send Invitation
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
