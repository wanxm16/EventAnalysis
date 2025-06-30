import axios from 'axios';

// 创建axios实例
const api = axios.create({
  baseURL: 'http://localhost:8000/api',  // 直接使用完整的后端URL
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    console.error('API Error:', error);
    throw error;
  }
);

// API方法
export const eventAPI = {
  // 获取事件列表
  getEvents: (params) => {
    return api.get('/events', { params });
  },

  // 获取事件详情
  getEventDetail: (eventId) => {
    return api.get(`/events/${eventId}`);
  },

  // 获取聚类事件详情
  getClusterDetail: (eventUID) => {
    return api.get(`/clusters/${eventUID}`);
  },

  // 获取筛选选项
  getFilterOptions: () => {
    return api.get('/filter-options');
  },

  // 获取聚合事件列表
  getClusterList: (params) => {
    return api.get('/cluster-list', { params });
  },

  // 获取聚合事件筛选选项
  getClusterFilterOptions: () => {
    return api.get('/cluster-filter-options');
  },

  // 健康检查
  healthCheck: () => {
    return api.get('/health');
  }
};

export default api; 