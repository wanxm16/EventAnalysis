import React, { useState, useEffect } from 'react';
import {
  Card,
  Descriptions,
  Table,
  Tag,
  Button,
  Space,
  message,
  Progress,
  Typography,
  Statistic,
  Row,
  Col
} from 'antd';
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { taskAPI } from '../services/api';

const { Title, Text, Paragraph } = Typography;

function ClassificationTaskDetail() {
  const navigate = useNavigate();
  const { taskId } = useParams();
  const [task, setTask] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 50,
    total: 0
  });

  useEffect(() => {
    loadTaskDetail();

    // 如果任务正在运行，每3秒刷新一次
    const timer = setInterval(() => {
      if (task && (task.status === 'pending' || task.status === 'running')) {
        loadTaskDetail(false);
      }
    }, 3000);

    return () => clearInterval(timer);
  }, [taskId, task?.status]);

  const loadTaskDetail = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const response = await taskAPI.getTaskDetail(taskId, {
        page: pagination.current,
        page_size: pagination.pageSize
      });

      setTask(response.data.task);
      setResults(response.data.results);
      setPagination({
        ...pagination,
        total: response.data.total_results
      });
    } catch (error) {
      console.error('加载任务详情失败:', error);
      if (showLoading) {
        message.error('加载任务详情失败');
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleTableChange = (newPagination) => {
    setPagination(newPagination);
    loadTaskDetail();
  };

  const handleExport = async () => {
    try {
      const response = await taskAPI.exportResults(taskId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${task.name}_结果.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      message.success('导出成功');
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败');
    }
  };

  const getStatusTag = (status) => {
    const statusMap = {
      pending: { color: 'default', text: '待处理' },
      running: { color: 'processing', text: '运行中' },
      completed: { color: 'success', text: '已完成' },
      failed: { color: 'error', text: '失败' }
    };
    const config = statusMap[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns = [
    {
      title: '事件标题',
      dataIndex: 'event_title',
      key: 'event_title',
      width: 200
    },
    {
      title: '事件描述',
      dataIndex: 'event_description',
      key: 'event_description',
      ellipsis: true,
      width: 300
    },
    {
      title: task?.task_type === 'classify' ? '预测分类' : '预测标签',
      key: 'prediction',
      width: 150,
      render: (_, record) => {
        if (task?.task_type === 'classify') {
          return record.predicted_category ? (
            <Tag color="blue">{record.predicted_category}</Tag>
          ) : '-';
        } else {
          return record.predicted_tags && record.predicted_tags.length > 0 ? (
            record.predicted_tags.map((tag, idx) => (
              <Tag key={idx} color="green">{tag}</Tag>
            ))
          ) : '-';
        }
      }
    },
    {
      title: '置信度',
      dataIndex: 'confidence',
      key: 'confidence',
      width: 100,
      render: (confidence) => (
        <Text>{(confidence * 100).toFixed(1)}%</Text>
      )
    },
    {
      title: '依据',
      dataIndex: 'reasoning',
      key: 'reasoning',
      ellipsis: true,
      width: 300
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status) => (
        status === 'success' ?
          <Tag color="success" icon={<CheckCircleOutlined />}>成功</Tag> :
          <Tag color="error" icon={<CloseCircleOutlined />}>失败</Tag>
      )
    }
  ];

  if (!task) {
    return <div style={{ padding: '24px' }}>加载中...</div>;
  }

  const progress = task.total_count > 0 ?
    Math.round((task.processed_count / task.total_count) * 100) : 0;

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/event-classification/tasks')}
              style={{ marginBottom: 16 }}
            >
              返回列表
            </Button>
            <Title level={3} style={{ margin: 0 }}>{task.name}</Title>
          </div>

          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => loadTaskDetail()}
              loading={loading}
            >
              刷新
            </Button>
            {task.status === 'completed' && (
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleExport}
              >
                导出结果
              </Button>
            )}
          </Space>
        </div>

        <Descriptions bordered column={2} style={{ marginBottom: 24 }}>
          <Descriptions.Item label="任务类型">
            {task.task_type === 'classify' ? '分类任务' : '打标任务'}
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            {getStatusTag(task.status)}
          </Descriptions.Item>
          <Descriptions.Item label={task.task_type === 'classify' ? '目标分类' : '目标标签'}>
            {task.task_type === 'classify' ?
              (task.category_names && task.category_names.length > 0 ?
                task.category_names.map((cat, idx) => (
                  <Tag key={idx} color="blue">{cat}</Tag>
                )) : '-'
              ) :
              (task.tag_names && task.tag_names.length > 0 ?
                task.tag_names.map((tag, idx) => (
                  <Tag key={idx} color="green">{tag}</Tag>
                )) : '-'
              )
            }
          </Descriptions.Item>
          <Descriptions.Item label="文件名">
            {task.file_name || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {task.created_at ? new Date(task.created_at).toLocaleString('zh-CN') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="完成时间">
            {task.completed_at ? new Date(task.completed_at).toLocaleString('zh-CN') : '-'}
          </Descriptions.Item>
          {task.error_message && (
            <Descriptions.Item label="错误信息" span={2}>
              <Text type="danger">{task.error_message}</Text>
            </Descriptions.Item>
          )}
        </Descriptions>

        {(task.status === 'running' || task.status === 'completed') && (
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Card>
                <Statistic title="总数" value={task.total_count} />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title="已处理" value={task.processed_count} />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="成功"
                  value={task.success_count}
                  valueStyle={{ color: '#3f8600' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="失败"
                  value={task.failed_count}
                  valueStyle={{ color: '#cf1322' }}
                />
              </Card>
            </Col>
          </Row>
        )}

        {task.status === 'running' && (
          <div style={{ marginBottom: 24 }}>
            <Paragraph>处理进度</Paragraph>
            <Progress
              percent={progress}
              status="active"
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
            />
          </div>
        )}

        {results.length > 0 && (
          <>
            <Title level={4} style={{ marginTop: 24, marginBottom: 16 }}>
              分类结果
            </Title>
            <Table
              columns={columns}
              dataSource={results}
              rowKey="id"
              loading={loading}
              pagination={pagination}
              onChange={handleTableChange}
              scroll={{ x: 1200 }}
            />
          </>
        )}
      </Card>
    </div>
  );
}

export default ClassificationTaskDetail;
