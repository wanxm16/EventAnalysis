import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  message,
  Popconfirm,
  Progress,
  Typography
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  DeleteOutlined,
  DownloadOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { taskAPI } from '../services/api';

const { Title, Text } = Typography;

function ClassificationTaskList() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });

  useEffect(() => {
    loadTasks();
    // 设置定时刷新，每5秒刷新一次正在运行的任务
    const timer = setInterval(() => {
      const hasPendingOrRunning = tasks.some(
        task => task.status === 'pending' || task.status === 'running'
      );
      if (hasPendingOrRunning) {
        loadTasks(false); // 静默刷新
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [tasks]);

  const loadTasks = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const response = await taskAPI.getTasks({
        page: pagination.current,
        page_size: pagination.pageSize
      });
      setTasks(response.data.tasks);
      setPagination({
        ...pagination,
        total: response.data.total
      });
    } catch (error) {
      console.error('加载任务列表失败:', error);
      if (showLoading) {
        message.error('加载任务列表失败');
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleTableChange = (newPagination) => {
    setPagination(newPagination);
    loadTasks();
  };

  const handleDelete = async (taskId) => {
    try {
      await taskAPI.deleteTask(taskId);
      message.success('任务已删除');
      loadTasks();
    } catch (error) {
      console.error('删除任务失败:', error);
      message.error('删除任务失败');
    }
  };

  const handleExport = async (taskId, taskName) => {
    try {
      const response = await taskAPI.exportResults(taskId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${taskName}_结果.xlsx`);
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

  const getTaskTypeTag = (type) => {
    const typeMap = {
      classify: { color: 'blue', text: '分类任务' },
      tag: { color: 'green', text: '打标任务' }
    };
    const config = typeMap[type] || { color: 'default', text: type };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      width: 200
    },
    {
      title: '任务类型',
      dataIndex: 'task_type',
      key: 'task_type',
      width: 120,
      render: (type) => getTaskTypeTag(type)
    },
    {
      title: '分类/标签',
      key: 'target',
      width: 200,
      render: (_, record) => {
        if (record.task_type === 'classify') {
          return <Text>{record.category_name || '-'}</Text>;
        } else {
          return (
            <div>
              {record.tag_names && record.tag_names.length > 0 ? (
                record.tag_names.map((tag, idx) => (
                  <Tag key={idx} color="green" style={{ marginBottom: 4 }}>
                    {tag}
                  </Tag>
                ))
              ) : '-'}
            </div>
          );
        }
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => getStatusTag(status)
    },
    {
      title: '进度',
      key: 'progress',
      width: 200,
      render: (_, record) => {
        if (record.total_count === 0) {
          return <Text type="secondary">-</Text>;
        }
        const percent = Math.round((record.processed_count / record.total_count) * 100);
        return (
          <div>
            <Progress
              percent={percent}
              size="small"
              status={record.status === 'failed' ? 'exception' : record.status === 'completed' ? 'success' : 'active'}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.processed_count} / {record.total_count}
              {record.success_count > 0 && ` (成功: ${record.success_count})`}
              {record.failed_count > 0 && ` (失败: ${record.failed_count})`}
            </Text>
          </div>
        );
      }
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (time) => time ? new Date(time).toLocaleString('zh-CN') : '-'
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/event-classification/tasks/${record.id}`)}
          >
            查看
          </Button>
          {record.status === 'completed' && (
            <Button
              type="link"
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => handleExport(record.id, record.name)}
            >
              导出
            </Button>
          )}
          <Popconfirm
            title="确认删除此任务吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>分类任务列表</Title>
            <Text type="secondary">批量分类和打标任务管理</Text>
          </div>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => loadTasks()}
            >
              刷新
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/event-classification/tasks/create')}
            >
              创建任务
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={tasks}
          rowKey="id"
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
        />
      </Card>
    </div>
  );
}

export default ClassificationTaskList;
