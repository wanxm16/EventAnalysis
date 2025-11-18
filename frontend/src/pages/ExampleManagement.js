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
  const projectId = 'default'; // (Ø¤yîID

  useEffect(() => {
    loadExampleFiles();
  }, []);

  const loadExampleFiles = async () => {
    setLoading(true);
    try {
      const files = await reportApi.getAllExamples(projectId);
      setExampleFiles(files || []);
    } catch (error) {
      console.error(' }:‹‡c1%:', error);
      message.error(' }:‹‡c1%');
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
      message.error('ê/ Markdown (.md, .markdown) Œ Word (.docx, .doc) ‡ö');
      return false;
    }

    setUploading(true);
    try {
      const response = await reportApi.uploadExampleFile(file, projectId);
      if (response.success) {
        message.success(':‹‡c
 Ÿ');
        loadExampleFiles();
      } else {
        message.error(response.error || '
 1%');
      }
    } catch (error) {
      console.error('
 1%:', error);
      message.error(error.response?.data?.detail || '
 1%');
    } finally {
      setUploading(false);
    }
    return false; // ;bØ¤
 L:
  };

  const handleDelete = async (fileId) => {
    try {
      await reportApi.deleteExampleFile(fileId, projectId);
      message.success(':‹‡cò d');
      loadExampleFiles();
    } catch (error) {
      console.error(' d1%:', error);
      message.error(' d1%');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary"> }-...</Text>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      <Title level={2}>:‹‡c¡</Title>
      <Text type="secondary">
        
 „:‹‡c(Ž¥J.© AI f`íÎ<Œï/ Markdown (.md) Œ Word (.docx, .doc) <
      </Text>

      <Card
        title=":‹‡ch"
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
              
 :‹‡c
            </Button>
          </Upload>
        }
        style={{ marginTop: 24 }}
      >
        {exampleFiles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
            <FileMarkdownOutlined style={{ fontSize: 48, marginBottom: 16 }} />
            <div>‚à:‹‡c</div>
            <div style={{ fontSize: 12, marginTop: 8 }}>
              ¹ûó
Ò"
 :‹‡c"	®û 
            </div>
          </div>
        ) : (
          <List
            dataSource={exampleFiles}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDelete(item.id)}
                  >
                     d
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
                  description={`‡c ID: ${item.id}`}
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
