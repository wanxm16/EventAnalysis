import React, { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Input,
  Button,
  Form,
  Select,
  Space,
  message,
  Tag,
  Pagination,
  InputNumber,
  Row,
  Col,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  ClusterOutlined,
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { eventAPI } from '../services/api';

const { Option } = Select;

const ClusterList = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [loading, setLoading] = useState(false);
  const [clusters, setClusters] = useState([]);
  const [pagination, setPagination] = useState({
    current: parseInt(searchParams.get('page')) || 1,
    pageSize: parseInt(searchParams.get('page_size')) || 20,
    total: 0,
  });
  const [filterOptions, setFilterOptions] = useState({
    event_count_ranges: [],
    duration_ranges: [],
  });
  
  const [form] = Form.useForm();

  // 加载聚合事件列表
  const loadClusters = async (params = {}) => {
    setLoading(true);
    try {
      const queryParams = {
        page: pagination.current,
        page_size: pagination.pageSize,
        ...params,
      };
      
      const response = await eventAPI.getClusterList(queryParams);
      setClusters(response.items || []);
      setPagination(prev => ({
        ...prev,
        total: response.total || 0,
        current: response.page || 1,
      }));
    } catch (error) {
      message.error('加载聚合事件列表失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 加载筛选选项
  const loadFilterOptions = async () => {
    try {
      const options = await eventAPI.getClusterFilterOptions();
      setFilterOptions(options);
    } catch (error) {
      message.error('加载筛选选项失败: ' + error.message);
    }
  };

  // 处理搜索
  const handleSearch = (values) => {
    const params = {};
    
    // 搜索参数
    if (values.search) {
      params.search = values.search;
    }
    
    // 事件数量筛选
    if (values.event_count_range) {
      if (values.event_count_range === "2") {
        params.min_event_count = 2;
        params.max_event_count = 2;
      } else if (values.event_count_range === "3-5") {
        params.min_event_count = 3;
        params.max_event_count = 5;
      } else if (values.event_count_range === "6-10") {
        params.min_event_count = 6;
        params.max_event_count = 10;
      } else if (values.event_count_range === "10+") {
        params.min_event_count = 11;
      }
    }
    
    // 自定义事件数量筛选
    if (values.min_event_count) {
      params.min_event_count = values.min_event_count;
    }
    if (values.max_event_count) {
      params.max_event_count = values.max_event_count;
    }
    
    // 持续时间筛选
    if (values.duration_range) {
      if (values.duration_range === "0-1天") {
        params.min_duration = 0;
        params.max_duration = 1;
      } else if (values.duration_range === "1-7天") {
        params.min_duration = 1;
        params.max_duration = 7;
      } else if (values.duration_range === "7-30天") {
        params.min_duration = 7;
        params.max_duration = 30;
      } else if (values.duration_range === "30天以上") {
        params.min_duration = 30;
      }
    }
    
    // 自定义持续时间筛选
    if (values.min_duration !== undefined && values.min_duration !== null) {
      params.min_duration = values.min_duration;
    }
    if (values.max_duration !== undefined && values.max_duration !== null) {
      params.max_duration = values.max_duration;
    }
    
    setSearchParams(params);
    setPagination(prev => ({ ...prev, current: 1 }));
    loadClusters({ page: 1, ...params });
  };

  // 重置搜索
  const handleReset = () => {
    form.resetFields();
    setSearchParams({});
    setPagination(prev => ({ ...prev, current: 1 }));
    loadClusters({ page: 1 });
  };

  // 分页处理
  const handleTableChange = (page, pageSize) => {
    const newPagination = { ...pagination, current: page, pageSize };
    setPagination(newPagination);
    
    const params = Object.fromEntries(searchParams);
    loadClusters({ page, page_size: pageSize, ...params });
    
    setSearchParams({ ...params, page: page.toString(), page_size: pageSize.toString() });
  };

  // 查看聚类详情
  const handleViewDetail = (eventUID) => {
    navigate(`/clusters/${eventUID}`);
  };

  // 格式化持续时间
  const formatDuration = (days) => {
    if (days === null || days === undefined) return '-';
    if (days < 1) return '不到1天';
    if (days === 1) return '1天';
    return `${days}天`;
  };

  // 格式化时间
  const formatTime = (timeStr) => {
    if (!timeStr) return '-';
    try {
      return new Date(timeStr).toLocaleDateString('zh-CN');
    } catch {
      return timeStr;
    }
  };

  // 表格列配置
  const columns = [
    {
      title: 'EventUID',
      dataIndex: 'EventUID',
      key: 'EventUID',
      width: 150,
      render: (text) => (
        <Tag color="blue" style={{ fontFamily: 'monospace' }}>
          {text}
        </Tag>
      ),
    },
    {
      title: '描述',
      dataIndex: 'cluster_description',
      key: 'cluster_description',
      ellipsis: {
        showTitle: false,
      },
      render: (text) => (
        <span title={text} style={{ fontSize: '13px' }}>
          {text}
        </span>
      ),
    },
    {
      title: '事件数量',
      dataIndex: 'record_count',
      key: 'record_count',
      width: 100,
      align: 'center',
      render: (count) => (
        <Tag color="green" style={{ fontWeight: 'bold' }}>
          {count}个
        </Tag>
      ),
    },
    {
      title: '持续时间',
      dataIndex: 'duration_days',
      key: 'duration_days',
      width: 100,
      align: 'center',
      render: (days) => (
        <Tag color="orange">
          {formatDuration(days)}
        </Tag>
      ),
    },
    {
      title: '首次上报',
      dataIndex: 'first_report_time',
      key: 'first_report_time',
      width: 120,
      render: formatTime,
    },
    {
      title: '最后上报',
      dataIndex: 'last_report_time',
      key: 'last_report_time',
      width: 120,
      render: formatTime,
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <Button
          type="primary"
          icon={<EyeOutlined />}
          size="small"
          onClick={() => handleViewDetail(record.EventUID)}
        >
          查看详情
        </Button>
      ),
    },
  ];

  useEffect(() => {
    loadFilterOptions();
    
    // 从URL参数初始化表单
    const params = Object.fromEntries(searchParams);
    form.setFieldsValue(params);
    
    loadClusters(params);
  }, []);

  return (
    <div className="page-container">
      {/* 页面标题 */}
      <div className="page-header">
        <h1 className="page-title">
          <ClusterOutlined style={{ marginRight: 8 }} />
          聚合事件列表
        </h1>
      </div>

      {/* 搜索筛选表单 */}
      <Card className="search-card" style={{ marginBottom: 16 }}>
        <Form
          form={form}
          layout="inline"
          onFinish={handleSearch}
          style={{ width: '100%' }}
        >
          <Row gutter={[16, 16]} style={{ width: '100%' }}>
            <Col span={24} md={6}>
              <Form.Item name="search" style={{ marginBottom: 16, width: '100%' }}>
                <Input
                  placeholder="搜索描述关键词..."
                  prefix={<SearchOutlined />}
                  allowClear
                />
              </Form.Item>
            </Col>
            
            <Col span={24} md={4}>
              <Form.Item name="event_count_range" style={{ marginBottom: 16, width: '100%' }}>
                <Select
                  placeholder="事件数量"
                  allowClear
                >
                  {filterOptions.event_count_ranges.map(range => (
                    <Option key={range} value={range}>
                      {range === '10+' ? '10个以上' : `${range}个`}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            
            <Col span={24} md={4}>
              <Form.Item name="duration_range" style={{ marginBottom: 16, width: '100%' }}>
                <Select
                  placeholder="持续时间"
                  allowClear
                >
                  {filterOptions.duration_ranges.map(range => (
                    <Option key={range} value={range}>{range}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            
            <Col span={24} md={3}>
              <Form.Item name="min_event_count" style={{ marginBottom: 16, width: '100%' }}>
                <InputNumber
                  placeholder="最小事件数"
                  min={2}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            
            <Col span={24} md={3}>
              <Form.Item name="max_event_count" style={{ marginBottom: 16, width: '100%' }}>
                <InputNumber
                  placeholder="最大事件数"
                  min={2}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            
            <Col span={24} md={4}>
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
            </Col>
          </Row>
        </Form>
      </Card>

      {/* 聚合事件表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={clusters}
          rowKey="EventUID"
          loading={loading}
          pagination={false}
          size="middle"
        />
        
        {/* 自定义分页 */}
        <div style={{ textAlign: 'right', marginTop: 16 }}>
          <Pagination
            current={pagination.current}
            pageSize={pagination.pageSize}
            total={pagination.total}
            showSizeChanger
            showQuickJumper
            showTotal={(total, range) => 
              `共 ${total} 条记录，显示第 ${range[0]}-${range[1]} 条`
            }
            onChange={handleTableChange}
            onShowSizeChange={handleTableChange}
            pageSizeOptions={['10', '20', '50', '100']}
          />
        </div>
      </Card>
    </div>
  );
};

export default ClusterList; 