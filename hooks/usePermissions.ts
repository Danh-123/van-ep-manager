import { useMemo } from 'react';

export type AppRole = 'Admin' | 'KeToan' | 'Viewer';
export type PermissionResource =
  | 'dashboard'
  | 'attendance'
  | 'salary'
  | 'trucks'
  | 'sales'
  | 'debt'
  | 'reports'
  | 'employees'
  | 'users'
  | 'my-salary'
  | 'my-attendance'
  | 'my-debt';

type PermissionSet = {
  view: AppRole[];
  edit: AppRole[];
  delete: AppRole[];
};

const PERMISSIONS: Record<PermissionResource, PermissionSet> = {
  dashboard: {
    view: ['Admin', 'KeToan', 'Viewer'],
    edit: ['Admin', 'KeToan'],
    delete: ['Admin'],
  },
  attendance: {
    view: ['Admin', 'KeToan'],
    edit: ['Admin', 'KeToan'],
    delete: ['Admin'],
  },
  salary: {
    view: ['Admin', 'KeToan'],
    edit: ['Admin', 'KeToan'],
    delete: ['Admin'],
  },
  trucks: {
    view: ['Admin', 'KeToan'],
    edit: ['Admin', 'KeToan'],
    delete: ['Admin'],
  },
  sales: {
    view: ['Admin', 'KeToan'],
    edit: ['Admin', 'KeToan'],
    delete: ['Admin'],
  },
  debt: {
    view: ['Admin', 'KeToan'],
    edit: ['Admin', 'KeToan'],
    delete: ['Admin'],
  },
  reports: {
    view: ['Admin', 'KeToan'],
    edit: ['Admin', 'KeToan'],
    delete: ['Admin'],
  },
  employees: {
    view: ['Admin', 'KeToan'],
    edit: ['Admin', 'KeToan'],
    delete: ['Admin'],
  },
  users: {
    view: ['Admin'],
    edit: ['Admin'],
    delete: ['Admin'],
  },
  'my-salary': {
    view: ['Viewer'],
    edit: ['Viewer'],
    delete: ['Viewer'],
  },
  'my-attendance': {
    view: ['Viewer'],
    edit: ['Viewer'],
    delete: ['Viewer'],
  },
  'my-debt': {
    view: ['Viewer'],
    edit: ['Viewer'],
    delete: ['Viewer'],
  },
};

function normalizeRole(role: string | null | undefined): AppRole {
  if (role === 'Admin' || role === 'KeToan' || role === 'Viewer') {
    return role;
  }

  return 'Viewer';
}

export function usePermissions(role: string | null | undefined) {
  return useMemo(() => {
    const currentRole = normalizeRole(role);

    const canView = (resource: PermissionResource) =>
      PERMISSIONS[resource].view.includes(currentRole);

    const canEdit = (resource: PermissionResource) =>
      PERMISSIONS[resource].edit.includes(currentRole);

    const canDelete = (resource: PermissionResource) =>
      PERMISSIONS[resource].delete.includes(currentRole);

    return {
      role: currentRole,
      isAdmin: currentRole === 'Admin',
      isKeToan: currentRole === 'KeToan',
      isViewer: currentRole === 'Viewer',
      canView,
      canEdit,
      canDelete,
    };
  }, [role]);
}
