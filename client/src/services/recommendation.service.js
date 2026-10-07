import { api } from './api';

export const recommendationService = {
  /**
   * @param {{plotSizeM2:number,budget:number,filters?:{bedrooms?:number,floors?:number,style?:string}}} payload
   */
  recommend: (payload, options) => api.post('/recommendations', payload, options),
  lastSearch: () => api.get('/recommendations/last-search'),
};
