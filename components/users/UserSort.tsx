'use client';

import { ArrowDown, ArrowUp } from 'lucide-react';
import { type SortBy, type SortOrder } from '@/hooks/useUserFilters';

interface UserSortProps {
  sortBy: SortBy;
  sortOrder: SortOrder;
  onSortByChange: (sortBy: SortBy) => void;
  onSortOrderChange: (sortOrder: SortOrder) => void;
}

type SortOption = {
  label: string;
  sortBy: SortBy;
  sortOrder: SortOrder;
};

const SORT_OPTIONS: SortOption[] = [
  { label: 'Mới nhất', sortBy: 'created_at', sortOrder: 'desc' },
  { label: 'Cũ nhất', sortBy: 'created_at', sortOrder: 'asc' },
  { label: 'Email A-Z', sortBy: 'email', sortOrder: 'asc' },
  { label: 'Email Z-A', sortBy: 'email', sortOrder: 'desc' },
];

export default function UserSort({ sortBy, sortOrder, onSortByChange, onSortOrderChange }: UserSortProps) {
  const currentSort = SORT_OPTIONS.find((opt) => opt.sortBy === sortBy && opt.sortOrder === sortOrder);

  const handleSortOptionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const index = parseInt(event.target.value, 10);
    const option = SORT_OPTIONS[index];
    if (option) {
      onSortByChange(option.sortBy);
      onSortOrderChange(option.sortOrder);
    }
  };

  const currentIndex = currentSort ? SORT_OPTIONS.indexOf(currentSort) : 0;

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sort-select" className="text-sm font-medium text-slate-600">
        Sắp xếp:
      </label>
      <select
        id="sort-select"
        value={currentIndex}
        onChange={handleSortOptionChange}
        className="h-9 rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
      >
        {SORT_OPTIONS.map((option, index) => (
          <option key={index} value={index}>
            {option.label}
          </option>
        ))}
      </select>

      {sortOrder === 'desc' ? (
        <ArrowDown className="h-4 w-4 text-slate-500" />
      ) : (
        <ArrowUp className="h-4 w-4 text-slate-500" />
      )}
    </div>
  );
}

// sortable header helper component
interface SortableHeaderProps {
  label: string;
  fieldName: SortBy;
  currentSortBy: SortBy;
  currentSortOrder: SortOrder;
  onSort: (sortBy: SortBy) => void;
  className?: string;
}

export function SortableHeader({ label, fieldName, currentSortBy, currentSortOrder, onSort, className }: SortableHeaderProps) {
  const isActive = currentSortBy === fieldName;
  const isSortReverse = isActive && currentSortOrder === 'asc';

  return (
    <th
      className={`cursor-pointer px-4 py-3 font-medium text-slate-600 hover:bg-slate-100 transition-colors ${className ?? ''}`}
      onClick={() => {
        if (isActive) {
          // Toggle sort order if already sorted by this field
          onSort(fieldName);
        } else {
          // Start with desc order for new sort field
          onSort(fieldName);
        }
      }}
    >
      <div className="inline-flex items-center gap-1">
        <span>{label}</span>
        {isActive && (isSortReverse ? <ArrowUp className="h-4 w-4 text-[#2E7D32]" /> : <ArrowDown className="h-4 w-4 text-[#2E7D32]" />)}
      </div>
    </th>
  );
}
