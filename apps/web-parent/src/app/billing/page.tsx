'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  Check,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Download,
  Shield,
  Sparkles,
} from 'lucide-react';

// Subscription types matching billing-svc
type SubscriptionStatus = 'none' | 'in_trial' | 'active' | 'past_due' | 'canceled' | 'expired';
type BillingPeriod = 'MONTHLY' | 'YEARLY';

interface Plan {
  id: string;
  sku: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  modules: string[];
  features: string[];
  popular?: boolean;
}

interface Subscription {
  id: string;
  planId: string;
  planName: string;
  status: SubscriptionStatus;
  billingPeriod: BillingPeriod;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndDate?: string;
  cancelAtPeriodEnd: boolean;
  pricePerPeriod: number;
}

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
}

interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  description: string;
  pdfUrl?: string;
}

// Mock data
const MOCK_PLANS: Plan[] = [
  {
    id: 'plan-basic',
    sku: 'PARENT_BASE',
    name: 'Basic',
    description: 'Essential learning tools',
    priceMonthly: 0,
    priceYearly: 0,
    modules: ['ELA', 'Math'],
    features: [
      'Core ELA & Math curriculum',
      'Progress tracking',
      'Weekly reports',
      'Parent-teacher messaging',
    ],
  },
  {
    id: 'plan-premium',
    sku: 'PARENT_PREMIUM',
    name: 'Premium',
    description: 'Full access to all modules',
    priceMonthly: 14.99,
    priceYearly: 143.90, // 20% discount
    modules: ['ELA', 'Math', 'Science', 'SEL', 'Speech', 'Coding', 'Writing'],
    features: [
      'Everything in Basic',
      'Science curriculum',
      'Social-emotional learning',
      'Speech therapy exercises',
      'Coding fundamentals',
      'Writing workshop',
      'Priority support',
      'Advanced analytics',
    ],
    popular: true,
  },
];

const MOCK_SUBSCRIPTION: Subscription = {
  id: 'sub-123',
  planId: 'plan-premium',
  planName: 'Premium',
  status: 'active',
  billingPeriod: 'MONTHLY',
  currentPeriodStart: '2025-01-01',
  currentPeriodEnd: '2025-02-01',
  cancelAtPeriodEnd: false,
  pricePerPeriod: 14.99,
};

const MOCK_PAYMENT_METHOD: PaymentMethod = {
  id: 'pm-123',
  brand: 'visa',
  last4: '4242',
  expiryMonth: 12,
  expiryYear: 2027,
  isDefault: true,
};

const MOCK_INVOICES: Invoice[] = [
  { id: 'inv-3', date: '2025-01-01', amount: 14.99, status: 'paid', description: 'Premium Plan - January 2025' },
  { id: 'inv-2', date: '2024-12-01', amount: 14.99, status: 'paid', description: 'Premium Plan - December 2024' },
  { id: 'inv-1', date: '2024-11-01', amount: 14.99, status: 'paid', description: 'Premium Plan - November 2024' },
];

const PREMIUM_MODULES = [
  { id: 'science', name: 'Science', description: 'Interactive science curriculum with experiments', icon: '🔬' },
  { id: 'sel', name: 'Social-Emotional Learning', description: 'Build emotional intelligence and social skills', icon: '💭' },
  { id: 'speech', name: 'Speech Therapy', description: 'Articulation and language exercises', icon: '🗣️' },
  { id: 'coding', name: 'Coding', description: 'Learn programming fundamentals', icon: '💻' },
  { id: 'writing', name: 'Writing Workshop', description: 'Creative and academic writing skills', icon: '✍️' },
];

function getStatusBadge(status: SubscriptionStatus): { color: string; label: string } {
  switch (status) {
    case 'active': return { color: 'bg-green-100 text-green-800', label: 'Active' };
    case 'in_trial': return { color: 'bg-blue-100 text-blue-800', label: 'Trial' };
    case 'past_due': return { color: 'bg-red-100 text-red-800', label: 'Past Due' };
    case 'canceled': return { color: 'bg-gray-100 text-gray-800', label: 'Canceled' };
    case 'expired': return { color: 'bg-gray-100 text-gray-500', label: 'Expired' };
    default: return { color: 'bg-gray-100 text-gray-800', label: 'None' };
  }
}

function getCardBrandIcon(brand: string): string {
  switch (brand.toLowerCase()) {
    case 'visa': return '💳';
    case 'mastercard': return '💳';
    case 'amex': return '💳';
    default: return '💳';
  }
}

export default function BillingPage() {
  const router = useRouter();
  const [subscription] = useState<Subscription | null>(MOCK_SUBSCRIPTION);
  const [paymentMethod] = useState<PaymentMethod | null>(MOCK_PAYMENT_METHOD);
  const [invoices] = useState<Invoice[]>(MOCK_INVOICES);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('MONTHLY');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedModules, setSelectedModules] = useState<string[]>(['science', 'sel', 'speech', 'coding', 'writing']);

  const statusBadge = subscription ? getStatusBadge(subscription.status) : null;
  const daysLeftInPeriod = subscription
    ? Math.ceil((new Date(subscription.currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  const handleCancelSubscription = async () => {
    // In production, call the billing API
    console.log('Canceling subscription...');
    setShowCancelModal(false);
  };

  const handleModuleToggle = (moduleId: string) => {
    setSelectedModules(prev =>
      prev.includes(moduleId)
        ? prev.filter(m => m !== moduleId)
        : [...prev, moduleId]
    );
  };

  return (
    <main id="main-content" className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
        <p className="text-gray-600 mt-1">Manage your subscription and payment settings</p>
      </div>

      {/* Past Due Alert */}
      {subscription?.status === 'past_due' && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-800">Payment Failed</h3>
            <p className="text-sm text-red-700 mt-1">
              Your last payment failed. Please update your payment method to continue your subscription.
            </p>
            <button className="mt-2 text-sm font-medium text-red-800 hover:text-red-900 underline">
              Update Payment Method
            </button>
          </div>
        </div>
      )}

      {/* Current Subscription */}
      {subscription && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl font-bold text-gray-900">{subscription.planName} Plan</h2>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge?.color}`}>
                  {statusBadge?.label}
                </span>
              </div>
              <p className="text-gray-600">
                ${subscription.pricePerPeriod}/{subscription.billingPeriod === 'MONTHLY' ? 'month' : 'year'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">
                <Calendar className="w-4 h-4 inline mr-1" />
                Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-500 mt-1">{daysLeftInPeriod} days left in billing period</p>
            </div>
          </div>

          {subscription.cancelAtPeriodEnd && (
            <div className="mt-4 p-3 bg-amber-50 rounded-lg text-sm text-amber-800">
              Your subscription will end on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}.
              <button className="ml-2 font-medium underline hover:no-underline">Resume subscription</button>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-100 flex justify-between">
            <button
              onClick={() => setShowCancelModal(true)}
              className="text-sm text-gray-600 hover:text-red-600"
            >
              Cancel subscription
            </button>
            <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
              Change plan
            </button>
          </div>
        </div>
      )}

      {/* Module Selection (for Premium) */}
      {subscription?.planName === 'Premium' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <h2 className="text-lg font-semibold text-gray-900">Premium Modules</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Toggle modules on or off for your child. Core ELA and Math are always included.
          </p>

          <div className="space-y-3">
            {/* Core modules (always on) */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-xl">📖</span>
                <div>
                  <p className="font-medium text-gray-900">ELA & Math (Core)</p>
                  <p className="text-xs text-gray-500">Always included in your plan</p>
                </div>
              </div>
              <span className="text-green-600 text-sm font-medium">Included</span>
            </div>

            {/* Premium modules */}
            {PREMIUM_MODULES.map(module => (
              <div key={module.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{module.icon}</span>
                  <div>
                    <p className="font-medium text-gray-900">{module.name}</p>
                    <p className="text-xs text-gray-500">{module.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleModuleToggle(module.id)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    selectedModules.includes(module.id) ? 'bg-indigo-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      selectedModules.includes(module.id) ? 'translate-x-6' : ''
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Plans Comparison */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Plans</h2>

        {/* Billing Period Toggle */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <button
            onClick={() => setBillingPeriod('MONTHLY')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              billingPeriod === 'MONTHLY'
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod('YEARLY')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              billingPeriod === 'YEARLY'
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Yearly (Save 20%)
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {MOCK_PLANS.map(plan => {
            const isCurrentPlan = subscription?.planId === plan.id;
            const price = billingPeriod === 'MONTHLY' ? plan.priceMonthly : plan.priceYearly;
            const periodLabel = billingPeriod === 'MONTHLY' ? '/month' : '/year';

            return (
              <div
                key={plan.id}
                className={`relative rounded-xl border-2 p-6 ${
                  plan.popular
                    ? 'border-indigo-500 bg-indigo-50/30'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                )}

                <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{plan.description}</p>

                <div className="mt-4">
                  <span className="text-3xl font-bold text-gray-900">
                    {price === 0 ? 'Free' : `$${price.toFixed(2)}`}
                  </span>
                  {price > 0 && <span className="text-gray-500">{periodLabel}</span>}
                </div>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  className={`mt-6 w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                    isCurrentPlan
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : plan.popular
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                  }`}
                  disabled={isCurrentPlan}
                >
                  {isCurrentPlan ? 'Current Plan' : price === 0 ? 'Downgrade' : 'Upgrade'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment Method */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Payment Method</h2>
          </div>
          <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            + Add new
          </button>
        </div>

        {paymentMethod ? (
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-4">
              <span className="text-2xl">{getCardBrandIcon(paymentMethod.brand)}</span>
              <div>
                <p className="font-medium text-gray-900">
                  {paymentMethod.brand.toUpperCase()} ending in {paymentMethod.last4}
                </p>
                <p className="text-sm text-gray-500">
                  Expires {paymentMethod.expiryMonth}/{paymentMethod.expiryYear}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {paymentMethod.isDefault && (
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Default</span>
              )}
              <button className="text-sm text-gray-600 hover:text-gray-900">Edit</button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No payment method on file</p>
            <button className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
              Add Payment Method
            </button>
          </div>
        )}

        <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
          <Shield className="w-4 h-4" />
          <span>Your payment information is securely stored and encrypted</span>
        </div>
      </div>

      {/* Billing History */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Billing History</h2>

        {invoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left text-sm font-medium text-gray-500 pb-3">Date</th>
                  <th className="text-left text-sm font-medium text-gray-500 pb-3">Description</th>
                  <th className="text-left text-sm font-medium text-gray-500 pb-3">Amount</th>
                  <th className="text-left text-sm font-medium text-gray-500 pb-3">Status</th>
                  <th className="text-right text-sm font-medium text-gray-500 pb-3">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map(invoice => (
                  <tr key={invoice.id}>
                    <td className="py-3 text-sm text-gray-900">
                      {new Date(invoice.date).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-sm text-gray-600">{invoice.description}</td>
                    <td className="py-3 text-sm font-medium text-gray-900">${invoice.amount.toFixed(2)}</td>
                    <td className="py-3">
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          invoice.status === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : invoice.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {invoice.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button className="text-indigo-600 hover:text-indigo-700">
                        <Download className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">No billing history yet</p>
        )}
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Cancel Subscription?</h3>
            <p className="text-gray-600 mb-4">
              Your subscription will remain active until the end of your current billing period
              ({new Date(subscription?.currentPeriodEnd ?? '').toLocaleDateString()}).
              You won&apos;t be charged again.
            </p>
            <div className="bg-amber-50 p-3 rounded-lg mb-4">
              <p className="text-sm text-amber-800">
                After cancellation, your child will only have access to the Basic plan features (ELA & Math only).
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Keep Subscription
              </button>
              <button
                onClick={handleCancelSubscription}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
