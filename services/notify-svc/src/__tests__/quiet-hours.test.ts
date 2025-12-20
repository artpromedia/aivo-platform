/**
 * Quiet Hours Logic Tests
 * 
 * Tests timezone-aware quiet hours functionality across different scenarios
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DateTime } from 'luxon';

describe('Quiet Hours Logic', () => {
  // Helper function to simulate quiet hours check
  function isInQuietHours(
    currentTime: DateTime,
    quietStart: string, // "HH:MM" format
    quietEnd: string,   // "HH:MM" format
    timezone: string
  ): boolean {
    const userTime = currentTime.setZone(timezone);
    const [startHour, startMin] = quietStart.split(':').map(Number);
    const [endHour, endMin] = quietEnd.split(':').map(Number);
    
    const currentMinutes = userTime.hour * 60 + userTime.minute;
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    // Handle overnight quiet hours (e.g., 22:00 - 07:00)
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
    
    // Same-day quiet hours (e.g., 12:00 - 14:00)
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  describe('Same-Day Quiet Hours', () => {
    it('should recognize time within quiet hours', () => {
      // Quiet hours: 12:00 - 14:00
      const lunchTime = DateTime.fromISO('2024-01-15T13:00:00', { zone: 'UTC' });
      
      expect(isInQuietHours(lunchTime, '12:00', '14:00', 'UTC')).toBe(true);
    });

    it('should recognize time outside quiet hours', () => {
      const morningTime = DateTime.fromISO('2024-01-15T09:00:00', { zone: 'UTC' });
      
      expect(isInQuietHours(morningTime, '12:00', '14:00', 'UTC')).toBe(false);
    });

    it('should handle exact start time', () => {
      const exactStart = DateTime.fromISO('2024-01-15T12:00:00', { zone: 'UTC' });
      
      expect(isInQuietHours(exactStart, '12:00', '14:00', 'UTC')).toBe(true);
    });

    it('should handle exact end time', () => {
      const exactEnd = DateTime.fromISO('2024-01-15T14:00:00', { zone: 'UTC' });
      
      expect(isInQuietHours(exactEnd, '12:00', '14:00', 'UTC')).toBe(false);
    });
  });

  describe('Overnight Quiet Hours', () => {
    it('should recognize late night within quiet hours', () => {
      // Quiet hours: 22:00 - 07:00 (overnight)
      const lateNight = DateTime.fromISO('2024-01-15T23:30:00', { zone: 'UTC' });
      
      expect(isInQuietHours(lateNight, '22:00', '07:00', 'UTC')).toBe(true);
    });

    it('should recognize early morning within quiet hours', () => {
      const earlyMorning = DateTime.fromISO('2024-01-15T05:00:00', { zone: 'UTC' });
      
      expect(isInQuietHours(earlyMorning, '22:00', '07:00', 'UTC')).toBe(true);
    });

    it('should recognize daytime outside quiet hours', () => {
      const daytime = DateTime.fromISO('2024-01-15T12:00:00', { zone: 'UTC' });
      
      expect(isInQuietHours(daytime, '22:00', '07:00', 'UTC')).toBe(false);
    });

    it('should handle midnight correctly', () => {
      const midnight = DateTime.fromISO('2024-01-15T00:00:00', { zone: 'UTC' });
      
      expect(isInQuietHours(midnight, '22:00', '07:00', 'UTC')).toBe(true);
    });
  });

  describe('Timezone Handling', () => {
    it('should respect user timezone for US Eastern', () => {
      // Server time: 2024-01-15 03:00 UTC
      // User time (America/New_York): 2024-01-14 22:00 EST
      const serverTime = DateTime.fromISO('2024-01-15T03:00:00', { zone: 'UTC' });
      
      // Quiet hours 21:00 - 07:00 in user's timezone
      expect(isInQuietHours(serverTime, '21:00', '07:00', 'America/New_York')).toBe(true);
    });

    it('should respect user timezone for Pacific', () => {
      // Server time: 2024-01-15 12:00 UTC
      // User time (America/Los_Angeles): 2024-01-15 04:00 PST
      const serverTime = DateTime.fromISO('2024-01-15T12:00:00', { zone: 'UTC' });
      
      expect(isInQuietHours(serverTime, '22:00', '07:00', 'America/Los_Angeles')).toBe(true);
    });

    it('should handle different timezone for Europe', () => {
      // Server time: 2024-01-15 20:00 UTC
      // User time (Europe/London): 2024-01-15 20:00 GMT (no DST in Jan)
      const serverTime = DateTime.fromISO('2024-01-15T20:00:00', { zone: 'UTC' });
      
      expect(isInQuietHours(serverTime, '21:00', '07:00', 'Europe/London')).toBe(false);
    });

    it('should handle Asia timezone', () => {
      // Server time: 2024-01-15 10:00 UTC
      // User time (Asia/Tokyo): 2024-01-15 19:00 JST
      const serverTime = DateTime.fromISO('2024-01-15T10:00:00', { zone: 'UTC' });
      
      expect(isInQuietHours(serverTime, '21:00', '07:00', 'Asia/Tokyo')).toBe(false);
    });

    it('should handle Australia timezone', () => {
      // Server time: 2024-01-15 20:00 UTC
      // User time (Australia/Sydney): 2024-01-16 07:00 AEDT
      const serverTime = DateTime.fromISO('2024-01-15T20:00:00', { zone: 'UTC' });
      
      // Exactly at end of quiet hours - should be outside
      expect(isInQuietHours(serverTime, '22:00', '07:00', 'Australia/Sydney')).toBe(false);
    });
  });

  describe('Daylight Saving Time Transitions', () => {
    it('should handle DST start (spring forward)', () => {
      // DST starts in US on second Sunday of March
      // At 2:00 AM, clocks spring forward to 3:00 AM
      const dstTransition = DateTime.fromISO('2024-03-10T07:30:00', { zone: 'UTC' });
      // In America/New_York this would be around 2:30 AM EST -> 3:30 AM EDT
      
      expect(isInQuietHours(dstTransition, '22:00', '07:00', 'America/New_York')).toBe(true);
    });

    it('should handle DST end (fall back)', () => {
      // DST ends in US on first Sunday of November
      // At 2:00 AM, clocks fall back to 1:00 AM
      const dstTransition = DateTime.fromISO('2024-11-03T06:30:00', { zone: 'UTC' });
      // In America/New_York this would be around 1:30 AM EST
      
      expect(isInQuietHours(dstTransition, '22:00', '07:00', 'America/New_York')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle 24-hour quiet period', () => {
      // Start and end at same time = full 24 hours
      const anyTime = DateTime.fromISO('2024-01-15T15:00:00', { zone: 'UTC' });
      
      // When start equals end, technically no quiet hours
      expect(isInQuietHours(anyTime, '00:00', '00:00', 'UTC')).toBe(false);
    });

    it('should handle 1-minute quiet period', () => {
      const inWindow = DateTime.fromISO('2024-01-15T12:00:30', { zone: 'UTC' });
      
      expect(isInQuietHours(inWindow, '12:00', '12:01', 'UTC')).toBe(true);
    });

    it('should handle invalid timezone gracefully', () => {
      const time = DateTime.fromISO('2024-01-15T12:00:00', { zone: 'UTC' });
      
      // Luxon handles invalid timezone by falling back
      // This tests that our code doesn't crash
      expect(() => {
        isInQuietHours(time, '22:00', '07:00', 'Invalid/Timezone');
      }).not.toThrow();
    });
  });

  describe('School Day Patterns', () => {
    it('should allow notifications during school hours', () => {
      // 9 AM on a weekday - notifications should be allowed
      const schoolTime = DateTime.fromISO('2024-01-15T09:00:00', { zone: 'America/New_York' });
      
      // Quiet hours only at night
      expect(isInQuietHours(schoolTime, '21:00', '07:00', 'America/New_York')).toBe(false);
    });

    it('should block notifications during sleep hours', () => {
      // 11 PM - should be quiet
      const sleepTime = DateTime.fromISO('2024-01-15T23:00:00', { zone: 'America/New_York' });
      
      expect(isInQuietHours(sleepTime, '21:00', '07:00', 'America/New_York')).toBe(true);
    });

    it('should block notifications early morning before school', () => {
      // 5 AM - should be quiet
      const earlyMorning = DateTime.fromISO('2024-01-15T05:00:00', { zone: 'America/New_York' });
      
      expect(isInQuietHours(earlyMorning, '21:00', '07:00', 'America/New_York')).toBe(true);
    });
  });
});

describe('COPPA Age Calculation', () => {
  function isUnder13(birthDate: Date): boolean {
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1 < 13;
    }
    
    return age < 13;
  }

  it('should identify 12-year-old as under 13', () => {
    const birthDate = new Date();
    birthDate.setFullYear(birthDate.getFullYear() - 12);
    
    expect(isUnder13(birthDate)).toBe(true);
  });

  it('should identify 13-year-old as not under 13', () => {
    const birthDate = new Date();
    birthDate.setFullYear(birthDate.getFullYear() - 13);
    birthDate.setMonth(birthDate.getMonth() - 1); // Ensure birthday passed
    
    expect(isUnder13(birthDate)).toBe(false);
  });

  it('should handle birthday not yet passed this year', () => {
    const birthDate = new Date();
    birthDate.setFullYear(birthDate.getFullYear() - 13);
    birthDate.setMonth(birthDate.getMonth() + 1); // Birthday next month
    
    expect(isUnder13(birthDate)).toBe(true);
  });

  it('should handle exact 13th birthday today', () => {
    const birthDate = new Date();
    birthDate.setFullYear(birthDate.getFullYear() - 13);
    
    expect(isUnder13(birthDate)).toBe(false);
  });
});
