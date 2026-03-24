import { useMemo } from 'react';

export type AppRole = 'Admin' | 'KeToan' | 'Viewer';
export type PermissionResource =
  | 'dashboard'
  | 'cham-cong'
  | 'tinh-luong'
  | 'xe-hang'
  | 'loai-van-ep'
  | 'cong-no'
  | 'bao-cao'
  | 'cong-nhan'
  | 'nguoi-dung';

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
  'cham-cong': {
    view: ['Admin', 'KeToan', 'Viewer'],
    edit: ['Admin', 'KeToan'],
    delete: ['Admin'],
  },
  'tinh-luong': {
    view: ['Admin', 'KeToan', 'Viewer'],
    edit: ['Admin', 'KeToan'],
    delete: ['Admin'],
  },
  'xe-hang': {
    view: ['Admin', 'KeToan', 'Viewer'],
    edit: ['Admin', 'KeToan'],
    delete: ['Admin'],
  },
  'loai-van-ep': {
    view: ['Admin'],
    edit: ['Admin'],
    delete: ['Admin'],
  },
  'cong-no': {
    view: ['Admin', 'KeToan', 'Viewer'],
    edit: ['Admin', 'KeToan'],
    delete: ['Admin'],
  },
  'bao-cao': {
    view: ['Admin', 'KeToan', 'Viewer'],
    edit: ['Admin', 'KeToan'],
    delete: ['Admin'],
  },
  'cong-nhan': {
    view: ['Admin', 'KeToan', 'Viewer'],
    edit: ['Admin', 'KeToan'],
    delete: ['Admin'],
  },
  'nguoi-dung': {
    view: ['Admin'],
    edit: ['Admin'],
    delete: ['Admin'],
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
      canView,
      canEdit,
      canDelete,
    };
  }, [role]);
}
