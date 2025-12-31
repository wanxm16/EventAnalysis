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

  // 更新事件标签
  updateEventTags: (eventId, tags) => {
    return api.put(`/events/${eventId}/tags`, { tags });
  },

  // 获取聚类事件详情
  getClusterDetail: (eventUID) => {
    return api.get(`/clusters/${eventUID}`);
  },

  // 获取聚类参与人详情
  getClusterParticipants: (eventUID) => {
    return api.get(`/clusters/${eventUID}/participants`);
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

  // 获取分类列表
  getCategories: () => {
    return api.get('/classify/categories');
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

// AI报告生成API
export { default as reportApi } from './reportApi';

export const tagAPI = {
  getTagLibrary: () => api.get('/classify/tag-library'),
  getTags: (params = {}) => api.get('/classify/tags', { params: serializeParams(params) }),
  createTag: (payload) => api.post('/classify/tags', payload),
  updateTag: (tagId, payload) => api.put(`/classify/tags/${tagId}`, payload),
  getGroups: (includeSystem = true) => api.get('/classify/tag-groups', { params: { include_system: includeSystem } }),
  createGroup: (payload) => api.post('/classify/tag-groups', payload),
  updateGroup: (groupId, payload) => api.put(`/classify/tag-groups/${groupId}`, payload)
};

// 分类任务管理API
export const taskAPI = {
  // 获取任务列表
  getTasks: (params = {}) => api.get('/classify/tasks', { params: serializeParams(params) }),

  // 创建任务
  createTask: (payload) => api.post('/classify/tasks', payload),

  // 上传Excel文件
  uploadFile: (taskId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/classify/tasks/${taskId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  // 启动任务
  startTask: (taskId) => api.post(`/classify/tasks/${taskId}/start`),

  // 获取任务详情
  getTaskDetail: (taskId, params = {}) =>
    api.get(`/classify/tasks/${taskId}`, { params: serializeParams(params) }),

  // 删除任务
  deleteTask: (taskId) => api.delete(`/classify/tasks/${taskId}`),

  // 导出结果
  exportResults: (taskId) =>
    api.get(`/classify/tasks/${taskId}/export`, { responseType: 'blob' })
};

// 分类集合管理API
export const categorySetAPI = {
  // 获取所有分类集合
  getAll: () => api.get('/classify/category-sets'),

  // 获取单个分类集合
  getById: (setId) => api.get(`/classify/category-sets/${setId}`),

  // 创建分类集合
  create: (payload) => api.post('/classify/category-sets', payload),

  // 更新分类集合
  update: (setId, payload) => api.put(`/classify/category-sets/${setId}`, payload),

  // 删除分类集合
  delete: (setId) => api.delete(`/classify/category-sets/${setId}`)
};

export default api; 
