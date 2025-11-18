import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

// 项目管理
export const getProjects = async () => {
  const response = await axios.get(`${API_BASE_URL}/projects`);
  return response.data;
};

export const createProject = async (name) => {
  const response = await axios.post(`${API_BASE_URL}/projects`, { name });
  return response.data;
};

export const getProjectChapters = async (projectId) => {
  const response = await axios.get(`${API_BASE_URL}/projects/${projectId}/chapters`);
  return response.data;
};

export const getChapterData = async (projectId, chapterId) => {
  const response = await axios.get(`${API_BASE_URL}/projects/${projectId}/chapters/${chapterId}/data`);
  return response.data;
};

export const saveChapterData = async (projectId, chapterId, data) => {
  const response = await axios.post(
    `${API_BASE_URL}/projects/${projectId}/chapters/${chapterId}/data`,
    data
  );
  return response.data;
};

// 文件上传
export const uploadExampleFile = async (file, projectId) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('project_id', projectId);

  const response = await axios.post(`${API_BASE_URL}/upload/example`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const getAllExamples = async (projectId) => {
  const response = await axios.get(`${API_BASE_URL}/upload/examples?project_id=${projectId}`);
  return response.data;
};

// 报告生成
export const generateReportWithText = async (chapterId, textData, projectId, exampleFileIds = [], templateId = null) => {
  const response = await axios.post(`${API_BASE_URL}/report/generate-with-text`, {
    chapter: chapterId,
    text_data: textData,
    project_id: projectId,
    example_file_ids: exampleFileIds,
    template_id: templateId
  });
  return response.data;
};

// Word导出
export const exportToWord = async (content, filename = '报告') => {
  const response = await axios.post(
    `${API_BASE_URL}/report/export`,
    { markdown_content: content, filename },
    { responseType: 'blob' }
  );
  return response.data;
};

export default {
  getProjects,
  createProject,
  getProjectChapters,
  getChapterData,
  saveChapterData,
  uploadExampleFile,
  getAllExamples,
  generateReportWithText,
  exportToWord
};
