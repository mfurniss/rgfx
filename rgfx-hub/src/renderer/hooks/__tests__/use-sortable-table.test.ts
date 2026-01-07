/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSortableTable } from '../use-sortable-table';
import { useUiStore } from '@/renderer/store/ui-store';

type TestSortField = 'name' | 'date' | 'count';

describe('useSortableTable', () => {
  beforeEach(() => {
    // Reset store state between tests
    useUiStore.setState({
      tableSortPreferences: {},
    });
  });

  describe('initialization', () => {
    it('uses default field and order when no persisted state exists', () => {
      const { result } = renderHook(() =>
        useSortableTable<TestSortField>({
          storageKey: 'test-table',
          defaultField: 'name',
        }),
      );

      expect(result.current.sortField).toBe('name');
      expect(result.current.sortOrder).toBe('asc');
    });

    it('restores persisted sort state from store', () => {
      useUiStore.setState({
        tableSortPreferences: {
          'test-table': { field: 'date', order: 'desc' },
        },
      });

      const { result } = renderHook(() =>
        useSortableTable<TestSortField>({
          storageKey: 'test-table',
          defaultField: 'name',
        }),
      );

      expect(result.current.sortField).toBe('date');
      expect(result.current.sortOrder).toBe('desc');
    });

    it('uses defaultOrder when provided', () => {
      const { result } = renderHook(() =>
        useSortableTable<TestSortField>({
          storageKey: 'test-table',
          defaultField: 'date',
          defaultOrder: 'desc',
        }),
      );

      expect(result.current.sortField).toBe('date');
      expect(result.current.sortOrder).toBe('desc');
    });
  });

  describe('handleSort', () => {
    it('toggles order when clicking same field (asc -> desc)', () => {
      const { result } = renderHook(() =>
        useSortableTable<TestSortField>({
          storageKey: 'test-table',
          defaultField: 'name',
        }),
      );

      expect(result.current.sortOrder).toBe('asc');

      act(() => {
        result.current.handleSort('name');
      });

      expect(result.current.sortField).toBe('name');
      expect(result.current.sortOrder).toBe('desc');
    });

    it('toggles order when clicking same field (desc -> asc)', () => {
      useUiStore.setState({
        tableSortPreferences: {
          'test-table': { field: 'name', order: 'desc' },
        },
      });

      const { result } = renderHook(() =>
        useSortableTable<TestSortField>({
          storageKey: 'test-table',
          defaultField: 'name',
        }),
      );

      act(() => {
        result.current.handleSort('name');
      });

      expect(result.current.sortField).toBe('name');
      expect(result.current.sortOrder).toBe('asc');
    });

    it('switches to new field with asc order by default', () => {
      const { result } = renderHook(() =>
        useSortableTable<TestSortField>({
          storageKey: 'test-table',
          defaultField: 'name',
        }),
      );

      act(() => {
        result.current.handleSort('count');
      });

      expect(result.current.sortField).toBe('count');
      expect(result.current.sortOrder).toBe('asc');
    });

    it('switches to new field with desc order when field is in defaultDescFields', () => {
      const { result } = renderHook(() =>
        useSortableTable<TestSortField>({
          storageKey: 'test-table',
          defaultField: 'name',
          defaultDescFields: ['date'],
        }),
      );

      act(() => {
        result.current.handleSort('date');
      });

      expect(result.current.sortField).toBe('date');
      expect(result.current.sortOrder).toBe('desc');
    });
  });

  describe('persistence', () => {
    it('persists sort state to store on change', () => {
      const { result } = renderHook(() =>
        useSortableTable<TestSortField>({
          storageKey: 'test-table',
          defaultField: 'name',
        }),
      );

      act(() => {
        result.current.handleSort('count');
      });

      const stored = useUiStore.getState().tableSortPreferences['test-table'];
      expect(stored).toEqual({ field: 'count', order: 'asc' });
    });

    it('uses correct storage key for different tables', () => {
      const { result: result1 } = renderHook(() =>
        useSortableTable<TestSortField>({
          storageKey: 'table-1',
          defaultField: 'name',
        }),
      );

      const { result: result2 } = renderHook(() =>
        useSortableTable<TestSortField>({
          storageKey: 'table-2',
          defaultField: 'date',
        }),
      );

      act(() => {
        result1.current.handleSort('count');
        result2.current.handleSort('name');
      });

      const prefs = useUiStore.getState().tableSortPreferences;
      expect(prefs['table-1']).toEqual({ field: 'count', order: 'asc' });
      expect(prefs['table-2']).toEqual({ field: 'name', order: 'asc' });
    });
  });

  describe('sortData', () => {
    const testData = [
      { name: 'Charlie', date: '2024-03-01', count: 5 },
      { name: 'alice', date: '2024-01-15', count: 10 },
      { name: 'Bob', date: '2024-02-20', count: 3 },
    ];

    it('sorts strings alphabetically ascending (case-insensitive)', () => {
      const { result } = renderHook(() =>
        useSortableTable<TestSortField>({
          storageKey: 'test-table',
          defaultField: 'name',
        }),
      );

      const sorted = result.current.sortData(testData);

      expect(sorted.map((d) => d.name)).toEqual(['alice', 'Bob', 'Charlie']);
    });

    it('sorts strings alphabetically descending', () => {
      useUiStore.setState({
        tableSortPreferences: {
          'test-table': { field: 'name', order: 'desc' },
        },
      });

      const { result } = renderHook(() =>
        useSortableTable<TestSortField>({
          storageKey: 'test-table',
          defaultField: 'name',
        }),
      );

      const sorted = result.current.sortData(testData);

      expect(sorted.map((d) => d.name)).toEqual(['Charlie', 'Bob', 'alice']);
    });

    it('sorts numbers numerically', () => {
      useUiStore.setState({
        tableSortPreferences: {
          'test-table': { field: 'count', order: 'asc' },
        },
      });

      const { result } = renderHook(() =>
        useSortableTable<TestSortField>({
          storageKey: 'test-table',
          defaultField: 'count',
        }),
      );

      const sorted = result.current.sortData(testData);

      expect(sorted.map((d) => d.count)).toEqual([3, 5, 10]);
    });

    it('handles null/undefined values (sorts to end)', () => {
      const dataWithNulls = [
        { name: 'Bob', date: null, count: 5 },
        { name: null, date: '2024-01-01', count: 10 },
        { name: 'Alice', date: '2024-02-01', count: 3 },
      ];

      const { result } = renderHook(() =>
        useSortableTable<TestSortField>({
          storageKey: 'test-table',
          defaultField: 'name',
        }),
      );

      const sorted = result.current.sortData(dataWithNulls);

      // Non-null values first, null at end
      expect(sorted[0].name).toBe('Alice');
      expect(sorted[1].name).toBe('Bob');
      expect(sorted[2].name).toBeNull();
    });

    it('uses custom comparator when provided', () => {
      const dataWithStatus = [
        { name: 'A', date: '', count: 0, status: 'connected' },
        { name: 'B', date: '', count: 0, status: 'disconnected' },
        { name: 'C', date: '', count: 0, status: 'connected' },
      ];

      useUiStore.setState({
        tableSortPreferences: {
          'test-table': { field: 'name', order: 'asc' },
        },
      });

      const { result } = renderHook(() =>
        useSortableTable<'name' | 'status'>({
          storageKey: 'test-table',
          defaultField: 'name',
        }),
      );

      // Custom comparator: connected = 1, disconnected = 0
      const customCompare = (
        a: (typeof dataWithStatus)[0],
        b: (typeof dataWithStatus)[0],
        field: 'name' | 'status',
      ) => {
        if (field === 'status') {
          const aVal = a.status === 'connected' ? 1 : 0;
          const bVal = b.status === 'connected' ? 1 : 0;
          return aVal - bVal;
        }
        return a.name.localeCompare(b.name);
      };

      // Change to sort by status
      act(() => {
        result.current.handleSort('status');
      });

      const sorted = result.current.sortData(dataWithStatus, customCompare);

      expect(sorted[0].status).toBe('disconnected');
      expect(sorted[1].status).toBe('connected');
      expect(sorted[2].status).toBe('connected');
    });

    it('returns new array without mutating original', () => {
      const { result } = renderHook(() =>
        useSortableTable<TestSortField>({
          storageKey: 'test-table',
          defaultField: 'name',
        }),
      );

      const original = [...testData];
      const sorted = result.current.sortData(testData);

      expect(sorted).not.toBe(testData);
      expect(testData).toEqual(original);
    });
  });
});
