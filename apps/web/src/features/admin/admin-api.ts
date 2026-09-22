import { api } from '@/lib/api-client';

export interface AdminDashboard {
  stats: {
    users: number;
    organizations: number;
    courses: number;
    certificates: number;
    verifications: number;
  };
  usersByRole: Array<{ role: string; count: number }>;
  verificationsPerDay: Array<{ day: string; count: number }>;
  certificatesPerMonth: Array<{ month: string; count: number }>;
  onestSummary: Array<{ status: string; count: number }>;
}

export interface AdminUserRow {
  id: string;
  fullName: string;
  email: string;
  role: string;
  organizationName: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AdminOrganizationRow {
  id: string;
  name: string;
  slug: string;
  kind: string;
  isActive: boolean;
  userCount: number;
  courseCount: number;
  certificateCount: number;
  createdAt: string;
}

export interface AuditLogRow {
  id: string;
  action: string;
  actorEmail: string | null;
  entityType: string | null;
  entityId: string | null;
  ipAddress: string | null;
  metadata: string | null;
  createdAt: string;
}

export interface PlatformReport {
  enrollment: Array<{ course: string; enrolled: number; completed: number; rate: number }>;
  assessment: Array<{ course: string; attempts: number; passed: number; averageScore: number }>;
  verification: Array<{ result: string; count: number }>;
}

export interface OnestSyncRow {
  certificateId: string;
  holderName: string;
  trackName: string;
  onestStatus: string;
  onestPublishedAt: string | null;
  onestError: string | null;
}

const query = (params: Record<string, string | undefined>): string => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const s = search.toString();
  return s ? '?' + s : '';
};

export const adminApi = {
  dashboard: () => api.get<AdminDashboard>('/api/admin/dashboard'),
  users: (search?: string) => api.get<AdminUserRow[]>('/api/admin/users' + query({ search })),
  setUserActive: (userId: string, isActive: boolean) =>
    api.patch<{ updated: boolean }>('/api/admin/users/' + userId + '/active', { isActive }),
  changeRole: (userId: string, role: string) =>
    api.patch<{ updated: boolean }>('/api/admin/users/' + userId + '/role', { role }),
  organizations: () => api.get<AdminOrganizationRow[]>('/api/admin/organizations'),
  audit: (filters: { action?: string; from?: string; to?: string; search?: string } = {}) =>
    api.get<AuditLogRow[]>('/api/admin/audit' + query(filters)),
  auditActions: () => api.get<string[]>('/api/admin/audit/actions'),
  reports: () => api.get<PlatformReport>('/api/admin/reports'),
  onest: () => api.get<OnestSyncRow[]>('/api/admin/onest'),
  retryOnest: (certificateId: string) =>
    api.post<{ retried: boolean }>('/api/admin/onest/' + certificateId + '/retry'),
};
