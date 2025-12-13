'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useAuth } from '../../../providers';

// Mock price book data
const priceBookItems = [
  { sku: 'SEAT_K5', name: 'K-5 Learner Seats', unitPriceCents: 1200, category: 'SEAT' },
  { sku: 'SEAT_6_8', name: '6-8 Learner Seats', unitPriceCents: 1200, category: 'SEAT' },
  { sku: 'SEAT_9_12', name: '9-12 Learner Seats', unitPriceCents: 1500, category: 'SEAT' },
  { sku: 'ADDON_SEL', name: 'SEL Module Add-on', unitPriceCents: 300, category: 'ADDON' },
  { sku: 'ADDON_SPEECH', name: 'Speech Module Add-on', unitPriceCents: 400, category: 'ADDON' },
  { sku: 'ADDON_SCIENCE', name: 'Science Module Add-on', unitPriceCents: 350, category: 'ADDON' },
  {
    sku: 'SETUP_ONBOARDING',
    name: 'Onboarding & Training',
    unitPriceCents: 500000,
    category: 'SERVICES',
  },
  {
    sku: 'PROFESSIONAL_SERVICES',
    name: 'Professional Services (hourly)',
    unitPriceCents: 15000,
    category: 'SERVICES',
  },
];

// Mock tenants/districts
const mockTenants = [
  { id: 't1', name: 'North Valley USD', billingAccountId: 'ba-1' },
  { id: 't2', name: 'Riverside School District', billingAccountId: 'ba-2' },
  { id: 't3', name: 'Metro ISD', billingAccountId: 'ba-3' },
  { id: 't4', name: 'Lakeside Schools', billingAccountId: 'ba-4' },
];

interface LineItem {
  id: string;
  sku: string;
  description: string;
  quantity: number;
  listPriceCents: number;
  unitPriceCents: number;
  discountPercent: number;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

export default function NewQuotePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [quoteName, setQuoteName] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState(30);
  const [internalNotes, setInternalNotes] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  // Add line item modal state
  const [showAddItem, setShowAddItem] = useState(false);
  const [selectedSku, setSelectedSku] = useState('');
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemDiscount, setItemDiscount] = useState(0);

  const selectedTenant = mockTenants.find((t) => t.id === selectedTenantId);

  const calculateTotal = () => {
    return lineItems.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
  };

  const handleAddLineItem = () => {
    const priceItem = priceBookItems.find((p) => p.sku === selectedSku);
    if (!priceItem) return;

    const discountMultiplier = (100 - itemDiscount) / 100;
    const unitPriceCents = Math.round(priceItem.unitPriceCents * discountMultiplier);

    const newItem: LineItem = {
      id: Date.now().toString(),
      sku: priceItem.sku,
      description: priceItem.name,
      quantity: itemQuantity,
      listPriceCents: priceItem.unitPriceCents,
      unitPriceCents,
      discountPercent: itemDiscount,
    };

    setLineItems([...lineItems, newItem]);
    setShowAddItem(false);
    setSelectedSku('');
    setItemQuantity(1);
    setItemDiscount(0);
  };

  const handleRemoveItem = (itemId: string) => {
    setLineItems(lineItems.filter((item) => item.id !== itemId));
  };

  const handleSubmit = async (asDraft: boolean) => {
    if (!selectedTenantId || !validUntil || lineItems.length === 0) {
      alert('Please fill in all required fields and add at least one line item.');
      return;
    }

    setIsLoading(true);

    // Mock API call
    await new Promise((r) => setTimeout(r, 1000));

    setIsLoading(false);

    if (asDraft) {
      alert('Quote saved as draft!');
    } else {
      alert('Quote created and marked as sent!');
    }

    router.push('/billing');
  };

  if (!isAuthenticated) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center">
        <p className="text-slate-600">Please log in to create quotes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <Link href="/billing" className="hover:underline">
          Billing
        </Link>
        <span>/</span>
        <span className="text-slate-900">New Quote</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Create New Quote</h1>
        <p className="text-slate-600">Build a quote for a district customer</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="col-span-2 space-y-6">
          {/* Quote Info */}
          <div className="rounded-lg border bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold">Quote Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label
                  htmlFor="district-select"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  District *
                </label>
                <select
                  id="district-select"
                  value={selectedTenantId}
                  onChange={(e) => {
                    setSelectedTenantId(e.target.value);
                  }}
                  className="w-full rounded-lg border px-3 py-2"
                >
                  <option value="">Select a district...</option>
                  {mockTenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label
                  htmlFor="quote-name"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Quote Name
                </label>
                <input
                  id="quote-name"
                  type="text"
                  value={quoteName}
                  onChange={(e) => {
                    setQuoteName(e.target.value);
                  }}
                  placeholder="e.g., North Valley USD - 2025-26"
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>
              <div>
                <label
                  htmlFor="valid-until"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Valid Until *
                </label>
                <input
                  id="valid-until"
                  type="date"
                  value={validUntil}
                  onChange={(e) => {
                    setValidUntil(e.target.value);
                  }}
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>
              <div>
                <label
                  htmlFor="payment-terms"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Payment Terms
                </label>
                <select
                  id="payment-terms"
                  value={paymentTerms}
                  onChange={(e) => {
                    setPaymentTerms(Number(e.target.value));
                  }}
                  className="w-full rounded-lg border px-3 py-2"
                >
                  <option value={15}>Net 15</option>
                  <option value={30}>Net 30</option>
                  <option value={45}>Net 45</option>
                  <option value={60}>Net 60</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="start-date"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Contract Start
                </label>
                <input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                  }}
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>
              <div>
                <label htmlFor="end-date" className="mb-1 block text-sm font-medium text-slate-700">
                  Contract End
                </label>
                <input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                  }}
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="rounded-lg border bg-white">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-lg font-semibold">Line Items</h2>
              <button
                onClick={() => {
                  setShowAddItem(true);
                }}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                Add Item
              </button>
            </div>

            {lineItems.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                No items added yet. Click &quot;Add Item&quot; to add products to this quote.
              </div>
            ) : (
              <table className="w-full">
                <thead className="border-b bg-slate-50 text-left text-sm text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">SKU</th>
                    <th className="px-4 py-3 font-medium">Description</th>
                    <th className="px-4 py-3 text-right font-medium">Qty</th>
                    <th className="px-4 py-3 text-right font-medium">List</th>
                    <th className="px-4 py-3 text-right font-medium">Disc.</th>
                    <th className="px-4 py-3 text-right font-medium">Unit</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lineItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-mono text-sm">{item.sku}</td>
                      <td className="px-4 py-3">{item.description}</td>
                      <td className="px-4 py-3 text-right">{item.quantity.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-slate-500">
                        {formatCurrency(item.listPriceCents)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {item.discountPercent > 0 ? (
                          <span className="text-green-600">-{item.discountPercent}%</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatCurrency(item.unitPriceCents)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatCurrency(item.unitPriceCents * item.quantity)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            handleRemoveItem(item.id);
                          }}
                          className="text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t bg-slate-50">
                  <tr>
                    <td colSpan={6} className="px-4 py-3 text-right font-semibold">
                      Total
                    </td>
                    <td className="px-4 py-3 text-right text-lg font-bold">
                      {formatCurrency(calculateTotal())}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* Internal Notes */}
          <div className="rounded-lg border bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold">Internal Notes</h2>
            <textarea
              value={internalNotes}
              onChange={(e) => {
                setInternalNotes(e.target.value);
              }}
              placeholder="Notes visible only to Aivo team..."
              rows={3}
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Summary */}
          <div className="rounded-lg border bg-white p-6">
            <h3 className="mb-4 font-semibold">Quote Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">District</span>
                <span className="font-medium">{selectedTenant?.name || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Items</span>
                <span className="font-medium">{lineItems.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Payment Terms</span>
                <span className="font-medium">Net {paymentTerms}</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="text-xl font-bold text-green-600">
                    {formatCurrency(calculateTotal())}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <button
              onClick={() => handleSubmit(false)}
              disabled={isLoading}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save & Send Quote'}
            </button>
            <button
              onClick={() => handleSubmit(true)}
              disabled={isLoading}
              className="w-full rounded-lg border px-4 py-2 font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              Save as Draft
            </button>
            <Link
              href="/billing"
              className="block w-full rounded-lg px-4 py-2 text-center font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </Link>
          </div>
        </div>
      </div>

      {/* Add Item Modal */}
      {showAddItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold">Add Line Item</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="product-select" className="mb-1 block text-sm font-medium">
                  Product
                </label>
                <select
                  id="product-select"
                  value={selectedSku}
                  onChange={(e) => {
                    setSelectedSku(e.target.value);
                  }}
                  className="w-full rounded-lg border px-3 py-2"
                >
                  <option value="">Select a product...</option>
                  {priceBookItems.map((item) => (
                    <option key={item.sku} value={item.sku}>
                      {item.name} ({formatCurrency(item.unitPriceCents)}/unit)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="item-quantity" className="mb-1 block text-sm font-medium">
                  Quantity
                </label>
                <input
                  id="item-quantity"
                  type="number"
                  min="1"
                  value={itemQuantity}
                  onChange={(e) => {
                    setItemQuantity(Number(e.target.value));
                  }}
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>
              <div>
                <label htmlFor="item-discount" className="mb-1 block text-sm font-medium">
                  Discount %
                </label>
                <input
                  id="item-discount"
                  type="number"
                  min="0"
                  max="100"
                  value={itemDiscount}
                  onChange={(e) => {
                    setItemDiscount(Number(e.target.value));
                  }}
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <button
                onClick={handleAddLineItem}
                disabled={!selectedSku}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Add Item
              </button>
              <button
                onClick={() => {
                  setShowAddItem(false);
                }}
                className="flex-1 rounded-lg border px-4 py-2 font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
