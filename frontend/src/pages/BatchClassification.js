import React, { useState } from 'react';
import {
  Card,
  Upload,
  Button,
  Progress,
  Table,
  Space,
  Alert,
  Statistic,
  Row,
  Col,
  message,
  Tag,
  Typography,
  Divider,
  Tooltip
} from 'antd';
import {
  InboxOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Dragger } = Upload;
const { Text, Title } = Typography;
const API_BASE_URL = 'http://localhost:8000';

function BatchClassification() {
  const [taskStatus, setTaskStatus] = useState(null);
  const [polling, setPolling] = useState(false);
  const [uploading, setUploading] = useState(false);

  const uploadProps = {
    name: 'file',
    multiple: false,
    accept: '.csv',
    beforeUpload: async (file) => {
      const isCSV = file.name.endsWith('.csv');
      if (!isCSV) {
        message.error('只能上传 CSV 文件！');
        return false;
      }

      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error('文件大小不能超过 10MB！');
        return false;
      }

      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await axios.post(`${API_BASE_URL}/api/classify/batch`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        message.success('文件上传成功，开始处理...');
        startPolling(response.data.task_id);
      } catch (error) {
        message.error(error.response?.data?.detail || '上传失败');
      } finally {
        setUploading(false);
      }

      return false;
    },
  };

  const startPolling = (taskId) => {
    setPolling(true);
    const timer = setInterval(async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/classify/batch/${taskId}`);
        const status = response.data;
        setTaskStatus(status);

        if (status.status === 'completed' || status.status === 'failed') {
          clearInterval(timer);
          setPolling(false);
          if (status.status === 'completed') {
            message.success('批量分类完成！');
          } else {
            message.error('批量分类失败');
          }
        }
      } catch (error) {
        clearInterval(timer);
        setPolling(false);
        message.error('获取任务状态失败');
      }
    }, 2000);
  };

  const handleDownload = () => {
    if (!taskStatus?.results) return;

    const results = taskStatus.results;
    const headers = [
      '序号',
      '事件描述',
      '事件类型',
      '预测分类',
      '置信度',
      '分类依据',
      '标签建议'
    ];

    const csvContent = [
      headers.join(','),
      ...results.map((r) =>
        [
          r.index + 1,
          `"${r.event_description.replace(/"/g, '""')}"`,
          r.event_type,
          r.predicted_category || '分类失败',
          r.confidence ? r.confidence.toFixed(2) : '0',
          `"${(r.reasoning || '').replace(/"/g, '""')}"`,
          `"${(r.tags || [])
            .map((tag) => `${tag.label || tag.tag_id}:${Math.round((tag.confidence || 0) * 100)}%`)
            .join(' / ')
            .replace(/"/g, '""')}"`
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `分类结果_${taskStatus.task_id}.csv`;
    link.click();
  };

  const getStatusTag = (status) => {
    const statusMap = {
      pending: { color: 'default', icon: <ClockCircleOutlined />, text: '等待中' },
      processing: { color: 'processing', icon: <SyncOutlined spin />, text: '处理中' },
      completed: { color: 'success', icon: <CheckCircleOutlined />, text: '已完成' },
      failed: { color: 'error', icon: <ClockCircleOutlined />, text: '失败' },
    };
    const config = statusMap[status] || statusMap.pending;
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    );
  };

  const columns = [
    {
      title: '序号',
      dataIndex: 'index',
      key: 'index',
      width: 80,
      render: (index) => index + 1,
    },
    {
      title: '事件描述',
      dataIndex: 'event_description',
      key: 'event_description',
      ellipsis: true,
      width: 300,
    },
    {
      title: '事件类型',
      dataIndex: 'event_type',
      key: 'event_type',
      width: 120,
    },
    {
      title: '预测分类',
      dataIndex: 'predicted_category',
      key: 'predicted_category',
      width: 150,
      render: (category) => (
        <Tag color={category ? 'blue' : 'red'}>
          {category || '分类失败'}
        </Tag>
      ),
    },
    {
      title: '置信度',
      dataIndex: 'confidence',
      key: 'confidence',
      width: 100,
      render: (confidence) => (
        <span style={{ color: confidence >= 0.8 ? '#52c41a' : '#faad14' }}>
          {confidence ? `${(confidence * 100).toFixed(1)}%` : '-'}
        </span>
      ),
    },
    {
      title: '标签建议',
      dataIndex: 'tags',
      key: 'tags',
      width: 240,
      render: (tags) => {
        if (!tags || tags.length === 0) {
          return <Text type="secondary">-</Text>;
        }
        return (
          <Space size={[4, 4]} wrap>
            {tags.slice(0, 3).map((tag, index) => {
              const percent = `${Math.round((tag.confidence || 0) * 100)}%`;
              const tooltip = [
                tag.label || tag.tag_id,
                `置信度：${percent}`,
                tag.reason
              ]
                .filter(Boolean)
                .join(' | ');
              return (
                <Tooltip title={tooltip} key={`${tag.tag_id}-${index}`}>
                  <Tag color="geekblue">{tag.label || tag.tag_id}</Tag>
                </Tooltip>
              );
            })}
          </Space>
        );
      },
    },
  ];

  const progressPercent = taskStatus
    ? Math.round((taskStatus.processed / taskStatus.total) * 100)
    : 0;

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <FileTextOutlined /> 批量事件分类
      </Title>
      <Text type="secondary">
        上传CSV文件进行批量分类处理，系统将自动对每个事件进行智能分类
      </Text>

      <Divider />

      <Row gutter={24}>
        <Col span={10}>
          <Card title="上传CSV文件" bordered={false}>
            <Alert
              message="CSV文件格式要求"
              description={
                <div>
                  <p>必需列：</p>
                  <ul>
                    <li>事件描述</li>
                    <li>事件类型</li>
                  </ul>
                  <p>可选列：</p>
                  <ul>
                    <li>区县名称</li>
                    <li>镇街名称</li>
                  </ul>
                </div>
              }
              type="info"
              style={{ marginBottom: 16 }}
            />

            <Dragger {...uploadProps} disabled={uploading || polling}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽CSV文件到此区域上传</p>
              <p className="ant-upload-hint">
                支持单个文件上传，文件大小不超过10MB
              </p>
            </Dragger>

            {uploading && (
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <SyncOutlined spin style={{ fontSize: 24 }} />
                <div style={{ marginTop: 8 }}>
                  <Text>正在上传文件...</Text>
                </div>
              </div>
            )}
          </Card>
        </Col>

        <Col span={14}>
          <Card title="处理进度" bordered={false}>
            {!taskStatus && (
              <Alert
                message="等待上传"
                description="请上传CSV文件开始批量分类"
                type="info"
                showIcon
              />
            )}

            {taskStatus && (
              <div>
                <Row gutter={16} style={{ marginBottom: 24 }}>
                  <Col span={6}>
                    <Statistic
                      title="任务状态"
                      value={getStatusTag(taskStatus.status)}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic title="总数" value={taskStatus.total} />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="已处理"
                      value={taskStatus.processed}
                      suffix={`/ ${taskStatus.total}`}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="成功数"
                      value={taskStatus.success_count}
                      valueStyle={{ color: '#3f8600' }}
                    />
                  </Col>
                </Row>

                <Progress
                  percent={progressPercent}
                  status={
                    taskStatus.status === 'completed'
                      ? 'success'
                      : taskStatus.status === 'failed'
                      ? 'exception'
                      : 'active'
                  }
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                />

                {taskStatus.status === 'completed' && (
                  <div style={{ marginTop: 16, textAlign: 'center' }}>
                    <Button
                      type="primary"
                      icon={<DownloadOutlined />}
                      onClick={handleDownload}
                      size="large"
                    >
                      下载分类结果
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {taskStatus?.results && taskStatus.results.length > 0 && (
        <Card
          title="分类结果预览"
          style={{ marginTop: 24 }}
          extra={
            <Text type="secondary">
              显示前 {Math.min(100, taskStatus.results.length)} 条结果
            </Text>
          }
        >
          <Table
            columns={columns}
            dataSource={taskStatus.results.slice(0, 100)}
            rowKey="index"
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条`,
            }}
            scroll={{ x: 1200 }}
          />
        </Card>
      )}
    </div>
  );
}

export default BatchClassification;
