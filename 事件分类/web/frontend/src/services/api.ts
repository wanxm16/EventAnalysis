import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const message = error.response?.data?.detail || '请求失败';
    return Promise.reject(new Error(message));
  }
);

// ==================== 类型定义 ====================

export interface SingleEventRequest {
  event_description: string;
  event_type: string;
  district?: string;
  street?: string;
}

export interface SingleEventResponse {
  predicted_category: string;
  confidence: number;
  reasoning?: string;
  timestamp: string;
}

export interface FeedbackRequest {
  event_description: string;
  event_type: string;
  predicted_category: string;
  correct_category: string;
  confidence: number;
}

export interface BatchTaskStatus {
  task_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total: number;
  processed: number;
  success_count: number;
  results?: Array<{
    index: number;
    event_description: string;
    event_type: string;
    predicted_category: string;
    confidence: number;
    original_category?: string;
  }>;
  created_at: string;
  completed_at?: string;
}

export interface CategoryConfig {
  category_name: string;
  event_types: string[];
  enabled: boolean;
}

export interface FewShotExample {
  category: string;
  event_description: string;
  event_type: string;
  district?: string;
  street?: string;
}

export interface AnalyticsSummary {
  total_predictions: number;
  accuracy?: number;
  avg_confidence?: number;
  category_distribution: Record<string, number>;
  last_updated: string;
}

// ==================== API 方法 ====================

// 1. 单事件分类
export const classifySingleEvent = (data: SingleEventRequest): Promise<SingleEventResponse> => {
  return api.post('/api/classify/single', data);
};

// 2. 批量分类
export const uploadBatchFile = (file: File): Promise<{ task_id: string; message: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/api/classify/batch', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const getBatchTaskStatus = (taskId: string): Promise<BatchTaskStatus> => {
  return api.get(`/api/classify/batch/${taskId}`);
};

// 3. 结果反馈
export const submitFeedback = (data: FeedbackRequest): Promise<{ message: string; feedback_id: string }> => {
  return api.post('/api/feedback', data);
};

// 4. 分类配置管理
export const getCategories = (): Promise<{ categories: string[]; total: number }> => {
  return api.get('/api/categories');
};

export const getEventTypes = (): Promise<{ event_types: string[]; total: number }> => {
  return api.get('/api/event-types');
};

export const getCategoryMapping = (): Promise<Record<string, string[]>> => {
  return api.get('/api/categories/mapping');
};

export const addCategory = (data: CategoryConfig): Promise<{ message: string }> => {
  return api.post('/api/categories', data);
};

// 5. Few-shot 示例管理
export const getFewShotExamples = (): Promise<Record<string, FewShotExample[]>> => {
  return api.get('/api/few-shot');
};

export const getCategoryExamples = (category: string): Promise<{ category: string; examples: FewShotExample[] }> => {
  return api.get(`/api/few-shot/${category}`);
};

export const addFewShotExample = (data: FewShotExample): Promise<{ message: string }> => {
  return api.post('/api/few-shot', data);
};

// 6. 提示词管理
export const getPromptTemplates = (): Promise<{ templates: any[] }> => {
  return api.get('/api/prompts');
};

// 7. 结果分析
export const getAnalyticsSummary = (): Promise<AnalyticsSummary> => {
  return api.get('/api/analytics/summary');
};

export const getConfusionMatrix = (): Promise<any> => {
  return api.get('/api/analytics/confusion');
};

// 健康检查
export const healthCheck = (): Promise<{ status: string; classifier: string; categories_count: number }> => {
  return api.get('/api/health');
};

export default api;
