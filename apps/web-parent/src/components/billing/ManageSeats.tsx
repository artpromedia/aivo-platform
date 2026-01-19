'use client';

import { useState } from 'react';
import {
  Users,
  UserPlus,
  UserMinus,
  AlertCircle,
  Check,
  X,
  GraduationCap,
} from 'lucide-react';
import type { Subscription, SubscriptionSeat, SeatChangeRequest } from '@/lib/billing-types';

interface ManageSeatProps {
  subscription: Subscription | null;
  availableChildren?: { id: string; name: string; grade: number }[];
  pricePerSeat?: number;
  onUpdate?: (changes: SeatChangeRequest[]) => Promise<void>;
  isLoading?: boolean;
}

export function ManageSeats({
  subscription,
  availableChildren = [],
  pricePerSeat = 0,
  onUpdate,
  isLoading = false,
}: ManageSeatProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<SubscriptionSeat | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  if (!subscription) {
    return null;
  }

  const { totalSeats, usedSeats, seats, plan } = subscription;
  const canAddMore = usedSeats < totalSeats;
  const atMaxCapacity = usedSeats >= (plan?.maxSeats || totalSeats);
  const needsUpgrade = !canAddMore && atMaxCapacity;

  const handleAddSeat = async () => {
    if (!selectedChild || !onUpdate) return;

    const child = availableChildren.find(c => c.id === selectedChild);
    if (!child) return;

    setIsUpdating(true);
    try {
      await onUpdate([
        {
          action: 'add',
          childId: child.id,
          childName: child.name,
        },
      ]);
      setShowAddModal(false);
      setSelectedChild(null);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveSeat = async () => {
    if (!selectedSeat || !onUpdate) return;

    setIsUpdating(true);
    try {
      await onUpdate([
        {
          action: 'remove',
          childId: selectedSeat.childId,
          childName: selectedSeat.childName,
        },
      ]);
      setShowRemoveModal(false);
      setSelectedSeat(null);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Manage Seats</h2>
          </div>
          {canAddMore && availableChildren.length > 0 && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              <UserPlus className="w-4 h-4" />
              Add Child
            </button>
          )}
        </div>

        {/* Seat usage indicator */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">
              {usedSeats} of {totalSeats} seats used
            </span>
            {pricePerSeat > 0 && (
              <span className="text-gray-500">
                ${pricePerSeat.toFixed(2)}/seat/month
              </span>
            )}
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                usedSeats >= totalSeats ? 'bg-amber-500' : 'bg-indigo-600'
              }`}
              style={{ width: `${Math.min(100, (usedSeats / totalSeats) * 100)}%` }}
            />
          </div>
        </div>

        {/* Warning if at capacity */}
        {needsUpgrade && availableChildren.length > 0 && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">All seats are in use</p>
              <p className="mt-1">
                Upgrade your plan to add more children, or remove a seat to make room.
              </p>
            </div>
          </div>
        )}

        {/* Current seats list */}
        {seats.length > 0 ? (
          <div className="space-y-3">
            {seats.map((seat) => (
              <div
                key={seat.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                    {seat.childAvatar ? (
                      <img
                        src={seat.childAvatar}
                        alt={seat.childName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-indigo-600 font-semibold text-sm">
                        {seat.childName.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{seat.childName}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {seat.grade && (
                        <span className="flex items-center gap-1">
                          <GraduationCap className="w-3 h-3" />
                          Grade {seat.grade}
                        </span>
                      )}
                      <span
                        className={`px-1.5 py-0.5 rounded-full ${
                          seat.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : seat.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {seat.status}
                      </span>
                    </div>
                  </div>
                </div>
                {seats.length > 1 && (
                  <button
                    onClick={() => {
                      setSelectedSeat(seat);
                      setShowRemoveModal(true);
                    }}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    title="Remove from subscription"
                  >
                    <UserMinus className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No children added yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Add your first child to start their learning journey
            </p>
            {availableChildren.length > 0 && (
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
              >
                Add Child
              </button>
            )}
          </div>
        )}

        {/* Plan limits info */}
        {plan && (
          <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-500">
            <p>
              Your {plan.name} plan includes {plan.baseSeats} seat{plan.baseSeats !== 1 ? 's' : ''}{' '}
              and supports up to {plan.maxSeats === 99 ? 'unlimited' : plan.maxSeats} children.
            </p>
          </div>
        )}
      </div>

      {/* Add Child Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add Child to Subscription</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedChild(null);
                }}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {availableChildren.length === 0 ? (
              <div className="text-center py-6">
                <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-600">All your children are already on the subscription</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  Select a child to add to your subscription. They will get immediate access to all features.
                </p>

                <div className="space-y-2 mb-4">
                  {availableChildren.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => setSelectedChild(child.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${
                        selectedChild === child.id
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-gray-600 font-medium text-sm">
                            {child.name.charAt(0)}
                          </span>
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-gray-900">{child.name}</p>
                          <p className="text-xs text-gray-500">Grade {child.grade}</p>
                        </div>
                      </div>
                      {selectedChild === child.id && (
                        <Check className="w-5 h-5 text-indigo-600" />
                      )}
                    </button>
                  ))}
                </div>

                {pricePerSeat > 0 && usedSeats >= (plan?.baseSeats || 1) && (
                  <div className="p-3 bg-gray-50 rounded-lg mb-4 text-sm text-gray-600">
                    Adding this child will increase your monthly bill by{' '}
                    <strong>${pricePerSeat.toFixed(2)}</strong>.
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setSelectedChild(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddSeat}
                    disabled={!selectedChild || isUpdating}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdating ? 'Adding...' : 'Add Child'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Remove Child Modal */}
      {showRemoveModal && selectedSeat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Remove Child?</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to remove <strong>{selectedSeat.childName}</strong> from your subscription?
            </p>
            <div className="bg-amber-50 p-3 rounded-lg mb-4">
              <p className="text-sm text-amber-800">
                They will lose access to all premium features immediately. You can add them back later.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRemoveModal(false);
                  setSelectedSeat(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
              >
                Keep
              </button>
              <button
                onClick={handleRemoveSeat}
                disabled={isUpdating}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50"
              >
                {isUpdating ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
