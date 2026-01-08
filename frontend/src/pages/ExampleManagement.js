import React, { useState, useEffect } from 'react';
import {
  Card,
  Upload,
  List,
  Button,
  message,
  Typography,
  Spin
} from 'antd';
import {
  UploadOutlined,
  DeleteOutlined,
  FileMarkdownOutlined
} from '@ant-design/icons';
import reportApi from '../services/reportApi';

const { Title, Text } = Typography;

function ExampleManagement() {
  const [exampleFiles, setExampleFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const projectId = 'default'; // 默认项目ID

  useEffect(() => {
    loadExampleFiles();
  }, []);

  const loadExampleFiles = async () => {
    setLoading(true);
    try {
      const files = await reportApi.getAllExamples(projectId);
      setExampleFiles(files || []);
    } catch (error) {
      console.error('加载示例文档失败:', error);
      message.error('加载示例文档失败');
    } finally {
      setLoading(false);
    }
  };

  const handleBeforeUpload = async (file) => {
    const allowedExtensions = ['.md', '.markdown', '.docx', '.doc'];
    const isAllowed = allowedExtensions.some(ext =>
      file.name.toLowerCase().endsWith(ext)
    );

    if (!isAllowed) {
      message.error('只支持 Markdown (.md, .markdown) 和 Word (.docx, .doc) 文件');
      return false;
    }

    setUploading(true);
    try {
      const response = await reportApi.uploadExampleFile(file, projectId);
      if (response.success) {
        message.success('示例文档上传成功');
        loadExampleFiles();
      } else {
        message.error(response.error || '上传失败');
      }
    } catch (error) {
      console.error('上传失败:', error);
      message.error(error.response?.data?.detail || '上传失败');
    } finally {
      setUploading(false);
    }
    return false; // 阻止自动上传
  };

  const handleDelete = async (fileId) => {
    try {
      await reportApi.deleteExampleFile(fileId, projectId);
      message.success('示例文档已删除');
      loadExampleFiles();
    } catch (error) {
      console.error('删除失败:', error);
      message.error('删除失败');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">加载中...</Text>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      <Title level={2}>示例文档管理</Title>
      <Text type="secondary">
        上传示例文档（已有报告样本），帮助 AI 学习报告格式和风格。支持 Markdown (.md) 和 Word (.docx, .doc) 格式。
      </Text>

      <Card
        title="示例文件列表"
        extra={
          <Upload
            accept=".md,.markdown,.docx,.doc"
            beforeUpload={handleBeforeUpload}
            showUploadList={false}
          >
            <Button
              type="primary"
              icon={<UploadOutlined />}
              loading={uploading}
            >
              上传示例文档
            </Button>
          </Upload>
        }
        style={{ marginTop: 24 }}
      >
        {exampleFiles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
            <FileMarkdownOutlined style={{ fontSize: 48, marginBottom: 16 }} />
            <div>暂无示例文档</div>
            <div style={{ fontSize: 12, marginTop: 8 }}>
              请点击"上传示例文档"按钮添加
            </div>
          </div>
        ) : (
          <List
            dataSource={exampleFiles}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button
                    type="link"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDelete(item.id)}
                  >
                    删除
                  </Button>
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <FileMarkdownOutlined
                      style={{ fontSize: 24, color: '#1890ff' }}
                    />
                  }
                  title={item.name}
                  description={`文档 ID: ${item.id}`}
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
}

export default ExampleManagement;
