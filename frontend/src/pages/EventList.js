import React, { useState, useEffect } from 'react';
import {
  Table,
  Form,
  Input,
  Select,
  Button,
  Card,
  Space,
  message,
  Tag,
  Tooltip,
} from 'antd';
import { SearchOutlined, ReloadOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { eventAPI } from '../services/api';

const { Option } = Select;

const EventList = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  
  // 状态管理
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [searchParams, setSearchParams] = useState({});
  const [filterOptions, setFilterOptions] = useState({
    towns: [],
    levels: [],
    categories: [],
  });

  // 表格列定义
  const columns = [
    {
      title: '事件编号',
      dataIndex: '事件编号',
      key: '事件编号',
      width: 120,
      render: (text) => (
        <Tooltip title={text}>
          <span style={{ fontSize: '12px' }}>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: '事件描述',
      dataIndex: '事件描述',
      key: '事件描述',
      width: 200,
      ellipsis: {
        showTitle: false,
      },
      render: (text) => (
        <Tooltip title={text}>
          <span>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: '镇街名称',
      dataIndex: '镇街名称',
      key: '镇街名称',
      width: 100,
    },
    {
      title: '事件级别',
      dataIndex: '事件级别',
      key: '事件级别',
      width: 100,
      render: (level) => {
        let color = 'default';
        if (level?.includes('一级')) color = 'red';
        else if (level?.includes('二级')) color = 'orange';
        else if (level?.includes('三级')) color = 'blue';
        
        return <Tag color={color}>{level}</Tag>;
      },
    },
    {
      title: '二级分类',
      dataIndex: '二级分类',
      key: '二级分类',
      width: 120,
      ellipsis: {
        showTitle: false,
      },
      render: (text) => (
        <Tooltip title={text}>
          <span>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: '上报时间',
      dataIndex: '上报时间',
      key: '上报时间',
      width: 150,
      render: (time) => {
        if (!time) return '-';
        
        // 解析特殊时间格式
        const parseTime = (timeStr) => {
          if (!timeStr) return null;
          
          try {
            // 先尝试标准解析
            let date = new Date(timeStr);
            if (!isNaN(date.getTime())) {
              return date;
            }
            
            // 处理特殊格式 "26/5/25 8:20" 或 "5/8/25 4:11"
            const match = timeStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})\s+(\d{1,2}):(\d{2})$/);
            if (match) {
              const [, day, month, year, hour, minute] = match;
              // 假设年份是20xx年
              const fullYear = 2000 + parseInt(year);
              date = new Date(fullYear, parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
              if (!isNaN(date.getTime())) {
                return date;
              }
            }
            
            return null;
          } catch {
            return null;
          }
        };
        
        const date = parseTime(time);
        if (!date) return time;
        
        try {
          return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          });
        } catch {
          return time;
        }
      },
    },
    {
      title: '报警人信息',
      key: 'caller_info',
      width: 140,
      render: (_, record) => (
        <div style={{ fontSize: '12px' }}>
          {record.CallerPhone && (
            <div>电话: {record.CallerPhone}</div>
          )}
          {record.CallerID && (
            <div>ID: {record.CallerID}</div>
          )}
        </div>
      ),
    },
    {
      title: '相关事件',
      key: 'related',
      width: 100,
      render: (_, record) => {
        if (record.sequence_total > 1) {
          return (
            <Tag color="blue">
              {record.sequence_total - 1} 个关联
            </Tag>
          );
        }
        return '-';
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}
        >
          查看详情
        </Button>
      ),
    },
  ];

  // 加载事件列表
  const loadEvents = async (params = {}) => {
    setLoading(true);
    try {
      const response = await eventAPI.getEvents({
        page: pagination.current,
        page_size: pagination.pageSize,
        ...searchParams,
        ...params,
      });
      
      setEvents(response.items || []);
      setPagination(prev => ({
        ...prev,
        total: response.total,
        current: response.page,
        pageSize: response.page_size,
      }));
    } catch (error) {
      message.error('加载事件列表失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 加载筛选选项
  const loadFilterOptions = async () => {
    try {
      const options = await eventAPI.getFilterOptions();
      setFilterOptions(options);
    } catch (error) {
      console.error('加载筛选选项失败:', error);
    }
  };

  // 处理搜索
  const handleSearch = (values) => {
    const params = {
      search: values.search || undefined,
      town: values.town || undefined,
      level: values.level || undefined,
      category: values.category || undefined,
      related_events: values.related_events || undefined,
    };
    
    setSearchParams(params);
    setPagination(prev => ({ ...prev, current: 1 }));
    loadEvents({ page: 1, ...params });
  };

  // 重置搜索
  const handleReset = () => {
    form.resetFields();
    setSearchParams({});
    setPagination(prev => ({ ...prev, current: 1 }));
    loadEvents({ page: 1 });
  };

  // 处理分页变化
  const handleTableChange = (pagination) => {
    setPagination(pagination);
    loadEvents({
      page: pagination.current,
      page_size: pagination.pageSize,
    });
  };

  // 查看详情
  const handleViewDetail = (record) => {
    navigate(`/events/${record.事件编号}`);
  };

  // 组件挂载时加载数据
  useEffect(() => {
    loadEvents();
    loadFilterOptions();
  }, []);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">事件列表</h1>
      </div>

      {/* 搜索表单 */}
      <Card className="search-form">
        <Form
          form={form}
          layout="inline"
          onFinish={handleSearch}
          style={{ width: '100%' }}
        >
          <Form.Item name="search" style={{ marginBottom: 16 }}>
            <Input
              placeholder="搜索事件编号、描述、处置结果、报警人信息..."
              style={{ width: 300 }}
              prefix={<SearchOutlined />}
            />
          </Form.Item>
          
          <Form.Item name="town" style={{ marginBottom: 16 }}>
            <Select
              placeholder="选择镇街名称"
              style={{ width: 150 }}
              allowClear
            >
              {filterOptions.towns.map(town => (
                <Option key={town} value={town}>{town}</Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item name="level" style={{ marginBottom: 16 }}>
            <Select
              placeholder="选择事件级别"
              style={{ width: 150 }}
              allowClear
            >
              {filterOptions.levels.map(level => (
                <Option key={level} value={level}>{level}</Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item name="category" style={{ marginBottom: 16 }}>
            <Select
              placeholder="选择二级分类"
              style={{ width: 150 }}
              allowClear
            >
              {filterOptions.categories.map(category => (
                <Option key={category} value={category}>{category}</Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item name="related_events" style={{ marginBottom: 16 }}>
            <Select
              placeholder="相关事件数量"
              style={{ width: 150 }}
              allowClear
            >
              <Option value="0">无关联事件</Option>
              <Option value="1">1个关联事件</Option>
              <Option value="2-5">2-5个关联事件</Option>
              <Option value="5+">5个以上关联事件</Option>
            </Select>
          </Form.Item>
          
          <Form.Item style={{ marginBottom: 16 }}>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                搜索
              </Button>
              <Button onClick={handleReset} icon={<ReloadOutlined />}>
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* 事件列表表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={events}
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
          onChange={handleTableChange}
          rowKey="事件编号"
          scroll={{ x: 1200 }}
          size="small"
        />
      </Card>
    </div>
  );
};

export default EventList; 