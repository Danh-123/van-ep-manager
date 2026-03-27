'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

export type UserRole = 'Admin' | 'KeToan' | 'Viewer';
export type SortBy = 'created_at' | 'email';
export type SortOrder = 'asc' | 'desc';
export type RoleFilter = UserRole | 'all';
export type LinkStatus = 'linked' | 'unlinked' | 'all';

export interface UserFiltersState {
  page: number;
  limit: number;
  sortBy: SortBy;
  sortOrder: SortOrder;
  role: RoleFilter;
  linkStatus: LinkStatus;
  search: string;
}

const DEFAULT_FILTERS: UserFiltersState = {
  page: 1,
  limit: 20,
  sortBy: 'created_at',
  sortOrder: 'desc',
  role: 'all',
  linkStatus: 'all',
  search: '',
};

function parseIntParam(value: string | null, defaultValue: number, min: number, max: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (!isNaN(parsed)) {
    return Math.max(min, Math.min(max, parsed));
  }
  return defaultValue;
}

function parseStringParam<T extends string>(value: string | null, validValues: T[], defaultValue: T): T {
  if (value && (validValues as string[]).includes(value)) {
    return value as T;
  }
  return defaultValue;
}

export function useUserFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse URL params into state
  const filters: UserFiltersState = useMemo(() => {
    return {
      page: parseIntParam(searchParams.get('page'), DEFAULT_FILTERS.page, 1, 10000),
      limit: parseIntParam(searchParams.get('limit'), DEFAULT_FILTERS.limit, 10, 100),
      sortBy: parseStringParam(searchParams.get('sortBy'), ['created_at', 'email'], DEFAULT_FILTERS.sortBy),
      sortOrder: parseStringParam(searchParams.get('sortOrder'), ['asc', 'desc'], DEFAULT_FILTERS.sortOrder),
      role: parseStringParam(searchParams.get('role'), ['Admin', 'KeToan', 'Viewer', 'all'], DEFAULT_FILTERS.role),
      linkStatus: parseStringParam(searchParams.get('linkStatus'), ['linked', 'unlinked', 'all'], DEFAULT_FILTERS.linkStatus),
      search: searchParams.get('search') ?? DEFAULT_FILTERS.search,
    };
  }, [searchParams]);

  // Update URL while preserving other params
  const updateFilters = useCallback(
    (updates: Partial<UserFiltersState>) => {
      const newParams = new URLSearchParams(searchParams);

      // Update only the specified params
      Object.entries(updates).forEach(([key, value]) => {
        if (value === DEFAULT_FILTERS[key as keyof UserFiltersState]) {
          newParams.delete(key);
        } else {
          newParams.set(key, String(value));
        }
      });

      // If page is out of range after other changes, reset to 1
      if (updates.search !== undefined || updates.role !== undefined || updates.linkStatus !== undefined) {
        newParams.set('page', '1');
      }

      const queryString = newParams.toString();
      const newUrl = queryString ? `?${queryString}` : '/dashboard/users';
      router.push(newUrl);
    },
    [router, searchParams],
  );

  // Update individual filter
  const setPage = useCallback((page: number) => updateFilters({ page }), [updateFilters]);
  const setLimit = useCallback((limit: number) => updateFilters({ limit }), [updateFilters]);

  const setSortBy = useCallback(
    (newSortBy: SortBy) => {
      // If clicking the same field, toggle sort order
      if (newSortBy === filters.sortBy) {
        const newSortOrder: SortOrder = filters.sortOrder === 'desc' ? 'asc' : 'desc';
        updateFilters({ sortBy: newSortBy, sortOrder: newSortOrder, page: 1 });
      } else {
        // New field, default to desc
        updateFilters({ sortBy: newSortBy, sortOrder: 'desc', page: 1 });
      }
    },
    [filters, updateFilters],
  );

  const setSortOrder = useCallback((sortOrder: SortOrder) => updateFilters({ sortOrder, page: 1 }), [updateFilters]);
  const setRole = useCallback((role: RoleFilter) => updateFilters({ role, page: 1 }), [updateFilters]);
  const setLinkStatus = useCallback((linkStatus: LinkStatus) => updateFilters({ linkStatus, page: 1 }), [updateFilters]);
  const setSearch = useCallback((search: string) => updateFilters({ search, page: 1 }), [updateFilters]);

  const resetFilters = useCallback(() => {
    router.push('/dashboard/users');
  }, [router]);

  return {
    filters,
    setPage,
    setLimit,
    setSortBy,
    setSortOrder,
    setRole,
    setLinkStatus,
    setSearch,
    resetFilters,
    updateFilters,
  };
}
