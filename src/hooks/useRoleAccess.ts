import { UserRole } from '@/types/logging';

interface RolePermissions {
  canSubmit: boolean;
  canAddReviewNotes: boolean;
  isReadOnly: boolean;
  hasAccess: boolean;
}

export function useRoleAccess(role: UserRole): RolePermissions {
  switch (role) {
    case 'operator':
      return {
        canSubmit: true,
        canAddReviewNotes: false,
        isReadOnly: false,
        hasAccess: true,
      };
    case 'supervisor':
      return {
        canSubmit: true,
        canAddReviewNotes: true,
        isReadOnly: false,
        hasAccess: true,
      };
    case 'manager':
      return {
        canSubmit: false,
        canAddReviewNotes: false,
        isReadOnly: true,
        hasAccess: true,
      };
    case 'executive':
      return {
        canSubmit: false,
        canAddReviewNotes: false,
        isReadOnly: true,
        hasAccess: false,
      };
    default:
      return {
        canSubmit: false,
        canAddReviewNotes: false,
        isReadOnly: true,
        hasAccess: false,
      };
  }
}
