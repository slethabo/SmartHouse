import { api } from './api';

export const plansService = {
  /** @param {{search?:string,bedrooms?:number,floors?:number,style?:string,maxArea?:number}} query */
  browse: (query, options) => api.get('/plans', { query, ...options }),
  detail: (id, options) => api.get(`/plans/${id}`, options),
  listSaved: (options) => api.get('/plans/saved', options),
  save: (id) => api.post(`/plans/${id}/save`),
  unsave: (id) => api.delete(`/plans/${id}/save`),
  rates: () => api.get('/rates'),
};
