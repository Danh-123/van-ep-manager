export type UserRole = 'Admin' | 'KeToan' | 'Viewer';
export type SortBy = 'created_at' | 'email';
export type SortOrder = 'asc' | 'desc';
export type LinkStatus = 'linked' | 'unlinked' | 'all';
export type RoleFilter = UserRole | 'all';

export interface LinkedTo {
  type: 'worker' | 'customer';
  id: number;
  name: string;
  code: string;
}

export interface UserListItem {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
  linked_to: LinkedTo | null;
}

export interface UserListResponse {
  success: boolean;
  data: UserListItem[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

export interface UserListError {
  success: false;
  error: string;
}

export interface UserListQueryParams {
  page?: number | string;
  limit?: number | string;
  sortBy?: SortBy;
  sortOrder?: SortOrder;
  role?: RoleFilter;
  linkStatus?: LinkStatus;
  search?: string;
}
