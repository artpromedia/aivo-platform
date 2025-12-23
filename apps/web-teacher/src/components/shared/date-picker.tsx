/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Date Picker Component
 *
 * Simple date and datetime picker with optional time selection
 */

'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';
import { toInputDate, toInputDateTime, formatDate, formatDateTime } from '@/lib/utils/date-utils';

interface DatePickerProps {
  value?: Date | null;
  onChange: (date: Date | null) => void;
  showTime?: boolean;
  minDate?: Date;
  maxDate?: Date;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  error?: string;
}

export function DatePicker({
  value,
  onChange,
  showTime = false,
  minDate,
  maxDate,
  placeholder = 'Select date',
  disabled = false,
  className,
  error,
}: DatePickerProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) {
      onChange(null);
      return;
    }
    const date = new Date(val);
    if (!isNaN(date.getTime())) {
      onChange(date);
    }
  };

  const inputValue = value ? (showTime ? toInputDateTime(value) : toInputDate(value)) : '';

  const displayValue = value ? (showTime ? formatDateTime(value) : formatDate(value)) : '';

  return (
    <div className={cn('relative', className)}>
      <input
        ref={inputRef}
        type={showTime ? 'datetime-local' : 'date'}
        value={inputValue}
        onChange={handleChange}
        min={minDate ? (showTime ? toInputDateTime(minDate) : toInputDate(minDate)) : undefined}
        max={maxDate ? (showTime ? toInputDateTime(maxDate) : toInputDate(maxDate)) : undefined}
        disabled={disabled}
        className={cn(
          'w-full rounded-lg border px-4 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20',
          disabled && 'cursor-not-allowed bg-gray-100 opacity-60',
          error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
        )}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

/**
 * Date Range Picker
 */
interface DateRangePickerProps {
  startDate?: Date | null;
  endDate?: Date | null;
  onStartChange: (date: Date | null) => void;
  onEndChange: (date: Date | null) => void;
  showTime?: boolean;
  disabled?: boolean;
  className?: string;
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
  showTime = false,
  disabled = false,
  className,
}: DateRangePickerProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <DatePicker
        value={startDate}
        onChange={onStartChange}
        showTime={showTime}
        maxDate={endDate || undefined}
        placeholder="Start date"
        disabled={disabled}
        className="flex-1"
      />
      <span className="text-gray-400">to</span>
      <DatePicker
        value={endDate}
        onChange={onEndChange}
        showTime={showTime}
        minDate={startDate || undefined}
        placeholder="End date"
        disabled={disabled}
        className="flex-1"
      />
    </div>
  );
}

/**
 * Quick Date Presets
 */
interface DatePresetsProps {
  onSelect: (startDate: Date, endDate: Date) => void;
  className?: string;
}

export function DatePresets({ onSelect, className }: DatePresetsProps) {
  const presets = [
    {
      label: 'Today',
      getRange: () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);
        return [today, endOfDay] as const;
      },
    },
    {
      label: 'This Week',
      getRange: () => {
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        return [startOfWeek, endOfWeek] as const;
      },
    },
    {
      label: 'This Month',
      getRange: () => {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
        return [startOfMonth, endOfMonth] as const;
      },
    },
    {
      label: 'Last 30 Days',
      getRange: () => {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        thirtyDaysAgo.setHours(0, 0, 0, 0);
        return [thirtyDaysAgo, today] as const;
      },
    },
    {
      label: 'This Quarter',
      getRange: () => {
        const today = new Date();
        const quarter = Math.floor(today.getMonth() / 3);
        const startOfQuarter = new Date(today.getFullYear(), quarter * 3, 1);
        const endOfQuarter = new Date(today.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59, 999);
        return [startOfQuarter, endOfQuarter] as const;
      },
    },
  ];

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {presets.map((preset) => (
        <button
          key={preset.label}
          type="button"
          onClick={() => {
            const [start, end] = preset.getRange();
            onSelect(start, end);
          }}
          className="rounded-full border px-3 py-1 text-xs text-gray-600 hover:border-primary-500 hover:bg-primary-50 hover:text-primary-700"
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
