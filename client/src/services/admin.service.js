import { api } from './api';

export const adminService = {
  stats: (options) => api.get('/admin/stats', options),

  listUsers: (options) => api.get('/admin/users', options),
  setUserActive: (id, isActive) => api.patch(`/admin/users/${id}/active`, { is_active: isActive }),

  listPlans: (options) => api.get('/admin/plans', options),
  createPlan: (plan) => api.post('/admin/plans', plan),
  updatePlan: (id, plan) => api.put(`/admin/plans/${id}`, plan),
  setPlanActive: (id, isActive) => api.patch(`/admin/plans/${id}/active`, { is_active: isActive }),
  deletePlan: (id) => api.delete(`/admin/plans/${id}`),

  listRates: (options) => api.get('/admin/rates', options),
  updateRate: (level, ratePerM2) => api.put(`/admin/rates/${level}`, { rate_per_m2: ratePerM2 }),
};
