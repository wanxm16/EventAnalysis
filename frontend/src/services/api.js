import axios from 'axios';

// 创建axios实例
const api = axios.create({
  baseURL: 'http://localhost:8000/api',  // 直接使用完整的后端URL
  timeout: 60000,  // 增加超时时间到60秒
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

const serializeParams = (params = {}) => Object.fromEntries(
  Object.entries(params)
    .reduce((acc, [key, value]) => {
      if (value === undefined || value === null || value === '') {
        return acc;
      }
      if (Array.isArray(value)) {
        if (value.length === 0) {
          return acc;
        }
        acc.push([key, value.join(',')]);
        return acc;
      }
      acc.push([key, value]);
      return acc;
    }, [])
);

// API方法
export const eventAPI = {
  // 获取事件列表
  getEvents: (params) => {
    const serialized = serializeParams(params);
    return api.get('/events', { params: serialized });
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
  },

  importEvents: (file, mode = 'append') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', mode);
    return api.post('/events/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  exportEvents: (params) => {
    const serialized = serializeParams(params);
    return api.get('/events/export', { params: serialized, responseType: 'blob' });
  },
};

// 报告/指标 API（Demo）
export const reportAPI = {
  // 指标检索
  searchIndicators: (keyword, page = 1, page_size = 10, kind = 'KPI') =>
    api.get('/indicators', { params: { keyword, page, page_size, kind } }),

  searchCharts: (keyword, page = 1, page_size = 10) =>
    api.get('/indicators', { params: { keyword, page, page_size, kind: 'CHART' } }),

  renderChart: (payload) =>
    api.post('/charts/render', payload),

  // 指标取值（可用于调试）
  getIndicatorValue: (code, period, scope) =>
    api.get('/indicators/value', { params: { code, period, scope } }),

  // 报告列表/CRUD
  listReports: () => api.get('/reports'),
  createReport: (payload) => api.post('/reports', payload),
  getReport: (id) => api.get(`/reports/${id}`),
  updateReport: (id, payload) => api.put(`/reports/${id}`, payload),

  // 预览渲染/发布/导出
  preview: (id, content_md, month) =>
    api.post(`/reports/${id}/preview`, { content_md, month }),
  publish: (id, month) =>
    api.post(`/reports/${id}/publish`, null, { params: { month } }),
  exportDocx: (id, month) =>
    api.get(`/reports/${id}/export`, { params: { format: 'docx', month }, responseType: 'blob' }),
};

export default api; 
