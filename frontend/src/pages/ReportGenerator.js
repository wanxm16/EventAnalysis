import React, { useState, useEffect } from 'react';
import {
  Card,
  Input,
  Button,
  Space,
  message,
  Typography,
  Divider,
  Spin,
  Upload,
  Tag,
  Row,
  Col,
  PageHeader
} from 'antd';
import {
  ThunderboltOutlined,
  FileWordOutlined,
  UploadOutlined,
  DeleteOutlined,
  FileTextOutlined,
  ArrowLeftOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import axios from 'axios';
import { reportApi, reportAPI } from '../services/api';

const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;

function ReportGenerator() {
  const { id: reportId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [reportInfo, setReportInfo] = useState({
    title: location.state?.title || '',
    month: location.state?.month || ''
  });
  const [inputData, setInputData] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [exampleFiles, setExampleFiles] = useState([]);
  const [projectId, setProjectId] = useState(reportId || 'default');
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (reportId) {
      loadReportData();
    }
    loadExampleFiles();
    loadSavedData();
  }, [reportId]);

  const loadReportData = async () => {
    try {
      const report = await reportAPI.getReport(reportId);
      setReportInfo({
        title: report.title || '',
        month: report.month || ''
      });
      if (report.content_md_draft) {
        setGeneratedContent(report.content_md_draft);
      }
    } catch (error) {
      console.error('加载报告数据失败:', error);
      message.warning('加载报告数据失败，使用默认配置');
    }
  };

  const loadExampleFiles = async () => {
    try {
      const files = await reportApi.getAllExamples(projectId);
      setExampleFiles(files);
    } catch (error) {
      console.error('加载示例文档失败:', error);
    }
  };

  const loadSavedData = async () => {
    try {
      const data = await reportApi.getChapterData(projectId, 'report');
      if (data.input_data) setInputData(data.input_data);
      if (data.generated_content) setGeneratedContent(data.generated_content);
    } catch (error) {
      console.log('无已保存数据');
    }
  };

  const handleGenerate = async () => {
    if (!inputData.trim()) {
      message.error('请先输入数据');
      return;
    }

    setLoading(true);
    try {
      const exampleFileIds = exampleFiles.map(f => f.id);
      const response = await reportApi.generateReportWithText(
        'report',
        inputData,
        projectId,
        exampleFileIds
      );

      if (response.success) {
        setGeneratedContent(response.content);
        // 自动保存
        await reportApi.saveChapterData(projectId, 'report', {
          input_data: inputData,
          generated_content: response.content
        });
        message.success('报告生成成功！');
      } else {
        message.error(response.error || '生成失败');
      }
    } catch (error) {
      console.error('生成报告失败:', error);
      message.error(error.response?.data?.detail || '生成失败，请检查DeepSeek API配置');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!generatedContent.trim()) {
      message.error('没有可导出的内容');
      return;
    }

    try {
      const blob = await reportApi.exportToWord(generatedContent, '月度报告');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `月度报告_${new Date().toLocaleDateString('zh-CN')}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      message.success('导出成功');
    } catch (error) {
      console.error('导出失败:', error);
      message.error(error.response?.data?.detail || '导出失败');
    }
  };

  const handleUploadExample = async (file) => {
    setUploading(true);
    try {
      const response = await reportApi.uploadExampleFile(file, projectId);
      if (response.success) {
        await loadExampleFiles();
        message.success('示例文档上传成功');
      } else {
        message.error(response.error || '上传失败');
      }
    } catch (error) {
      message.error(error.response?.data?.detail || '上传失败');
    } finally {
      setUploading(false);
    }
    return false; // 阻止默认上传行为
  };

  const handleDeleteExample = async (fileId) => {
    try {
      await axios.delete(`http://localhost:8000/api/upload/example/${fileId}?project_id=${projectId}`);
      setExampleFiles(prev => prev.filter(f => f.id !== fileId));
      message.success('示例文档已删除');
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleDataChange = (e) => {
    const value = e.target.value;
    setInputData(value);
    // 自动保存输入数据
    if (projectId) {
      reportApi.saveChapterData(projectId, 'report', {
        input_data: value,
        generated_content: generatedContent
      }).catch(err => console.error('保存失败:', err));
    }
  };

  const handleContentEdit = () => {
    setEditMode(!editMode);
    if (editMode && projectId) {
      // 退出编辑模式时保存
      reportApi.saveChapterData(projectId, 'report', {
        input_data: inputData,
        generated_content: generatedContent
      }).catch(err => console.error('保存失败:', err));
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      {reportInfo.title && (
        <>
          <div style={{ marginBottom: 16 }}>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/reports')}
            >
              返回报告列表
            </Button>
          </div>
          <Card style={{ marginBottom: 24, background: '#f5f5f5' }}>
            <Space direction="vertical" size="small">
              <Title level={3} style={{ margin: 0 }}>
                <FileTextOutlined /> {reportInfo.title}
              </Title>
              {reportInfo.month && (
                <Text type="secondary">
                  <CalendarOutlined /> 报告月份：{reportInfo.month}
                </Text>
              )}
            </Space>
          </Card>
        </>
      )}

      {!reportInfo.title && (
        <>
          <Title level={2}>
            <FileTextOutlined /> AI月度报告生成
          </Title>
          <Text type="secondary">
            基于 DeepSeek 大模型的智能月度报告生成系统，输入数据即可自动生成专业报告
          </Text>
          <Divider />
        </>
      )}

      <Row gutter={24}>
        <Col span={24}>
          <Card
            title="示例文档管理"
            size="small"
            style={{ marginBottom: 16 }}
            extra={
              <Upload
                beforeUpload={handleUploadExample}
                showUploadList={false}
                accept=".md,.markdown,.docx,.doc"
              >
                <Button
                  icon={<UploadOutlined />}
                  loading={uploading}
                  size="small"
                >
                  上传示例
                </Button>
              </Upload>
            }
          >
            <Space wrap>
              {exampleFiles.length === 0 ? (
                <Text type="secondary">暂无示例文档，上传示例可提高生成质量</Text>
              ) : (
                exampleFiles.map(file => (
                  <Tag
                    key={file.id}
                    closable
                    onClose={() => handleDeleteExample(file.id)}
                  >
                    {file.name}
                  </Tag>
                ))
              )}
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={24}>
        <Col span={12}>
          <Card
            title="数据输入"
            bordered={false}
            extra={
              <Button
                type="primary"
                icon={<ThunderboltOutlined />}
                onClick={handleGenerate}
                loading={loading}
              >
                生成报告
              </Button>
            }
          >
            <Paragraph type="secondary" style={{ marginBottom: 16 }}>
              支持粘贴 CSV 或 Markdown 表格格式的数据
            </Paragraph>
            <TextArea
              rows={20}
              value={inputData}
              onChange={handleDataChange}
              placeholder={`请粘贴 CSV 或 Markdown 格式的数据

CSV 示例：
事件ID,事件类型,等级,街镇
E001,城市管理,三级,街道A
E002,环境保护,二级,街道B

或直接粘贴 Markdown 表格`}
              style={{ fontFamily: 'monospace', fontSize: 13 }}
            />
          </Card>
        </Col>

        <Col span={12}>
          <Card
            title="生成结果"
            bordered={false}
            extra={
              <Space>
                {generatedContent && (
                  <>
                    <Button
                      onClick={handleContentEdit}
                      size="small"
                    >
                      {editMode ? '预览模式' : '编辑模式'}
                    </Button>
                    <Button
                      type="primary"
                      icon={<FileWordOutlined />}
                      onClick={handleExport}
                    >
                      导出Word
                    </Button>
                  </>
                )}
              </Space>
            }
          >
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <Spin size="large" />
                <div style={{ marginTop: 16 }}>
                  <Text type="secondary">AI正在生成报告，请稍候...</Text>
                </div>
              </div>
            ) : generatedContent ? (
              editMode ? (
                <TextArea
                  rows={20}
                  value={generatedContent}
                  onChange={(e) => setGeneratedContent(e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: 13 }}
                />
              ) : (
                <div
                  style={{
                    maxHeight: 600,
                    overflow: 'auto',
                    padding: 16,
                    background: '#fafafa',
                    borderRadius: 4
                  }}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {generatedContent}
                  </ReactMarkdown>
                </div>
              )
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <Text type="secondary">
                  在左侧输入数据后点击「生成报告」按钮开始
                </Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Card
        title="使用说明"
        size="small"
        style={{ marginTop: 24 }}
      >
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li>在左侧输入CSV或Markdown格式的事件数据</li>
          <li>上传历史月报示例文档（可选），帮助AI学习报告风格</li>
          <li>点击「生成报告」使用DeepSeek AI自动生成专业报告</li>
          <li>支持在线编辑生成的报告内容</li>
          <li>点击「导出Word」保存为Word文档</li>
          <li>所有输入和生成内容会自动保存</li>
        </ul>
      </Card>
    </div>
  );
}

export default ReportGenerator;
