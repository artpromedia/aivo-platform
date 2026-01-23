'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { ArrowLeft, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import {
  CurrentPlan,
  PaymentHistory,
  ManageSeats,
  BillingDetails,
  UpgradeOptions,
} from '@/components/billing';
import {
  useSubscription,
  usePlans,
  usePaymentMethods,
  useInvoices,
  useAvailableChildren,
  useCancelSubscription,
  useResumeSubscription,
  useManageSeats,
  useCreateCheckout,
  useCreateBillingPortal,
  useDownloadInvoice,
  useRemovePaymentMethod,
  useSetDefaultPaymentMethod,
  useCouponValidation,
} from '@/hooks';
import type { BillingPeriod, SeatChangeRequest } from '@/lib/billing-types';

// Initialize Stripe
const stripePromise = process.env.NEXT_PUBLIC_STRIPE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY)
  : null;

export default function BillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState<string | null>(null);

  // Data hooks
  const { data: subscription, isLoading: subscriptionLoading } = useSubscription();
  const { data: plans = [], isLoading: plansLoading } = usePlans();
  const { data: paymentMethods = [], isLoading: paymentMethodsLoading } = usePaymentMethods();
  const { data: invoices = [], isLoading: invoicesLoading } = useInvoices();
  const { data: availableChildren = [] } = useAvailableChildren();
  const { data: validatedCoupon } = useCouponValidation(couponCode);

  // Mutation hooks
  const cancelSubscription = useCancelSubscription();
  const resumeSubscription = useResumeSubscription();
  const manageSeats = useManageSeats();
  const createCheckout = useCreateCheckout();
  const createBillingPortal = useCreateBillingPortal();
  const downloadInvoice = useDownloadInvoice();
  const removePaymentMethod = useRemovePaymentMethod();
  const setDefaultPaymentMethod = useSetDefaultPaymentMethod();

  // Handle success/cancel redirects from Stripe
  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');

    if (success === 'true') {
      setSuccessMessage('Your subscription has been updated successfully!');
      // Clear the URL params
      router.replace('/billing');
    } else if (canceled === 'true') {
      setErrorMessage('Checkout was canceled. No changes were made.');
      router.replace('/billing');
    }
  }, [searchParams, router]);

  // Auto-clear messages
  useEffect(() => {
    if (successMessage || errorMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
        setErrorMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, errorMessage]);

  // Handlers
  const handleCancel = async () => {
    try {
      await cancelSubscription.mutateAsync({});
      setSuccessMessage('Your subscription has been canceled. You will have access until the end of your billing period.');
    } catch (error) {
      setErrorMessage('Failed to cancel subscription. Please try again.');
    }
  };

  const handleResume = async () => {
    try {
      await resumeSubscription.mutateAsync();
      setSuccessMessage('Your subscription has been resumed!');
    } catch (error) {
      setErrorMessage('Failed to resume subscription. Please try again.');
    }
  };

  const handleUpgrade = async (planId: string, billingPeriod: BillingPeriod) => {
    try {
      const { sessionId } = await createCheckout.mutateAsync({
        planId,
        billingPeriod,
        couponCode: validatedCoupon?.code,
      });

      // Redirect to Stripe Checkout
      const stripe = await stripePromise;
      if (stripe && sessionId) {
        const { error } = await stripe.redirectToCheckout({ sessionId });
        if (error) {
          setErrorMessage(error.message || 'Failed to redirect to checkout');
        }
      } else {
        // In development without Stripe, just show success
        setSuccessMessage('Plan change initiated (dev mode)');
      }
    } catch (error) {
      setErrorMessage('Failed to start checkout. Please try again.');
    }
  };

  const handleSeatUpdate = async (changes: SeatChangeRequest[]) => {
    try {
      await manageSeats.mutateAsync(changes);
      setSuccessMessage('Seats updated successfully!');
    } catch (error) {
      setErrorMessage('Failed to update seats. Please try again.');
    }
  };

  const handleDownloadInvoice = async (invoiceId: string, description: string) => {
    try {
      await downloadInvoice.mutateAsync({ invoiceId, invoiceDescription: description });
    } catch (error) {
      setErrorMessage('Failed to download invoice. Please try again.');
    }
  };

  const handleRemovePaymentMethod = async (id: string) => {
    try {
      await removePaymentMethod.mutateAsync(id);
      setSuccessMessage('Payment method removed');
    } catch (error) {
      setErrorMessage('Failed to remove payment method');
    }
  };

  const handleSetDefaultPaymentMethod = async (id: string) => {
    try {
      await setDefaultPaymentMethod.mutateAsync(id);
      setSuccessMessage('Default payment method updated');
    } catch (error) {
      setErrorMessage('Failed to update default payment method');
    }
  };

  const handleManageInStripe = async () => {
    try {
      const { url } = await createBillingPortal.mutateAsync();
      window.open(url, '_blank');
    } catch (error) {
      setErrorMessage('Failed to open billing portal');
    }
  };

  const handleApplyCoupon = async (code: string) => {
    setCouponCode(code);
    // Wait a bit for the query to resolve
    await new Promise(resolve => setTimeout(resolve, 500));
    return validatedCoupon ?? null;
  };

  const isLoading = subscriptionLoading || plansLoading || paymentMethodsLoading;

  return (
    <main id="main-content" className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
          <p className="text-gray-600 mt-1">Manage your subscription and payment settings</p>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <p className="text-green-800">{successMessage}</p>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-800">{errorMessage}</p>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        )}

        {/* Main Content */}
        {!isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content - Left Column */}
            <div className="lg:col-span-2 space-y-8">
              <CurrentPlan
                subscription={subscription || null}
                onCancel={handleCancel}
                onResume={handleResume}
                onChangePlan={() => {
                  const el = document.getElementById('plans-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
              />

              <ManageSeats
                subscription={subscription || null}
                availableChildren={availableChildren}
                pricePerSeat={subscription?.plan?.pricePerSeatMonthly || 0}
                onUpdate={handleSeatUpdate}
                isLoading={manageSeats.isPending}
              />

              <PaymentHistory
                payments={invoices}
                isLoading={invoicesLoading}
                onDownloadInvoice={handleDownloadInvoice}
              />
            </div>

            {/* Sidebar - Right Column */}
            <div className="space-y-8">
              <BillingDetails
                subscription={subscription || null}
                paymentMethods={paymentMethods}
                defaultPaymentMethod={paymentMethods.find(pm => pm.isDefault) || null}
                billingAddress={paymentMethods.find(pm => pm.isDefault)?.billingAddress || null}
                onManageInStripe={handleManageInStripe}
                onRemovePaymentMethod={handleRemovePaymentMethod}
                onSetDefaultPaymentMethod={handleSetDefaultPaymentMethod}
                isLoading={paymentMethodsLoading}
              />

              <div id="plans-section">
                <UpgradeOptions
                  plans={plans}
                  currentPlan={subscription?.plan || null}
                  onUpgrade={handleUpgrade}
                  onApplyCoupon={handleApplyCoupon}
                  isLoading={createCheckout.isPending}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
