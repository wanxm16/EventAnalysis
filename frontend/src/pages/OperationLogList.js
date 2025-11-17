import React, { useState, useEffect } from 'react';
import {
  Table, Card, Space, Button, Input, Select, DatePicker,
  Tag, Typography, message, Modal, Descriptions, Divider, Statistic, Row, Col
} from 'antd';
import {
  SearchOutlined, ReloadOutlined, FilterOutlined, InfoCircleOutlined, BarChartOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../services/api';

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const OperationLogList = () => {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  // 筛选状态
  const [filters, setFilters] = useState({
    search: '',
    operator: '',
    operation_type: '',
    resource_type: '',
    start_time: null,
    end_time: null
  });

  // 筛选选项
  const [filterOptions, setFilterOptions] = useState({
    operators: [],
    operation_types: [],
    resource_types: []
  });

  // 统计数据
  const [stats, setStats] = useState({
    total_operations: 0,
    by_operator: [],
    by_operation_type: [],
    by_resource_type: [],
    recent_operations: []
  });

  // 详情模态框
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailRecord, setDetailRecord] = useState(null);

  // 统计模态框
  const [statsVisible, setStatsVisible] = useState(false);

  // 加载数据
  const fetchLogs = async (page = currentPage) => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: pageSize,
        ...filters,
        start_time: filters.start_time ? filters.start_time.format('YYYY-MM-DD HH:mm:ss') : null,
        end_time: filters.end_time ? filters.end_time.format('YYYY-MM-DD HH:mm:ss') : null
      };

      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });

      const response = await api.get('/operation-logs', { params });
      setLogs(response.items || []);
      setTotal(response.total || 0);
      setCurrentPage(page);
    } catch (error) {
      console.error('获取操作日志失败:', error);
      message.error('获取操作日志失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载筛选选项
  const fetchFilterOptions = async () => {
    try {
      const response = await api.get('/operation-logs/filter-options');
      setFilterOptions(response);
    } catch (error) {
      console.error('获取筛选选项失败:', error);
    }
  };

  // 加载统计数据
  const fetchStats = async () => {
    try {
      const response = await api.get('/operation-logs/stats');
      setStats(response);
    } catch (error) {
      console.error('获取统计数据失败:', error);
    }
  };

  useEffect(() => {
    fetchLogs(1);
    fetchFilterOptions();
    fetchStats();
  }, [filters]);

  // 重置筛选
  const resetFilters = () => {
    setFilters({
      search: '',
      operator: '',
      operation_type: '',
      resource_type: '',
      start_time: null,
      end_time: null
    });
    setCurrentPage(1);
  };

  // 显示详情
  const showDetail = (record) => {
    setDetailRecord(record);
    setDetailVisible(true);
  };

  // 操作类型颜色映射
  const getOperationTypeColor = (type) => {
    const colorMap = {
      'create': 'green',
      'update': 'blue',
      'delete': 'red',
      'view': 'default',
      'export': 'orange',
      'login': 'purple'
    };
    return colorMap[type] || 'default';
  };

  // 资源类型显示名称映射
  const getResourceTypeName = (type) => {
    const nameMap = {
      'topic': '主题',
      'report': '报告',
      'subscription': '订阅',
      'cluster': '聚类',
      'event': '事件',
      'system': '系统'
    };
    return nameMap[type] || type;
  };

  // 操作类型显示名称映射
  const getOperationTypeName = (type) => {
    const nameMap = {
      'create': '创建',
      'update': '更新',
      'delete': '删除',
      'view': '查看',
      'export': '导出',
      'login': '登录'
    };
    return nameMap[type] || type;
  };

  // 表格列配置
  const columns = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (timestamp) => dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss'),
      sorter: (a, b) => dayjs(a.timestamp).unix() - dayjs(b.timestamp).unix(),
    },
    {
      title: '操作人',
      dataIndex: 'operator',
      key: 'operator',
      width: 120,
    },
    {
      title: '操作类型',
      dataIndex: 'operation_type',
      key: 'operation_type',
      width: 100,
      render: (type) => (
        <Tag color={getOperationTypeColor(type)}>
          {getOperationTypeName(type)}
        </Tag>
      ),
    },
    {
      title: '资源类型',
      dataIndex: 'resource_type',
      key: 'resource_type',
      width: 100,
      render: (type) => getResourceTypeName(type),
    },
    {
      title: '资源名称',
      dataIndex: 'resource_name',
      key: 'resource_name',
      width: 150,
      ellipsis: true,
    },
    {
      title: '操作描述',
      dataIndex: 'operation_desc',
      key: 'operation_desc',
      ellipsis: true,
    },
    {
      title: 'IP地址',
      dataIndex: 'ip_address',
      key: 'ip_address',
      width: 120,
    },
    {
      title: '操作',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <Button
          type="link"
          icon={<InfoCircleOutlined />}
          onClick={() => showDetail(record)}
          size="small"
        >
          详情
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>操作日志</Title>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap style={{ marginBottom: 16 }}>
          <Input
            placeholder="搜索操作描述、资源名称、操作人"
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            style={{ width: 250 }}
            allowClear
          />

          <Select
            placeholder="操作人"
            value={filters.operator || undefined}
            onChange={(value) => setFilters(prev => ({ ...prev, operator: value }))}
            style={{ width: 120 }}
            allowClear
          >
            {filterOptions.operators.map(operator => (
              <Option key={operator} value={operator}>{operator}</Option>
            ))}
          </Select>

          <Select
            placeholder="操作类型"
            value={filters.operation_type || undefined}
            onChange={(value) => setFilters(prev => ({ ...prev, operation_type: value }))}
            style={{ width: 120 }}
            allowClear
          >
            {filterOptions.operation_types.map(type => (
              <Option key={type} value={type}>{getOperationTypeName(type)}</Option>
            ))}
          </Select>

          <Select
            placeholder="资源类型"
            value={filters.resource_type || undefined}
            onChange={(value) => setFilters(prev => ({ ...prev, resource_type: value }))}
            style={{ width: 120 }}
            allowClear
          >
            {filterOptions.resource_types.map(type => (
              <Option key={type} value={type}>{getResourceTypeName(type)}</Option>
            ))}
          </Select>

          <RangePicker
            value={[filters.start_time, filters.end_time]}
            onChange={(dates) => setFilters(prev => ({
              ...prev,
              start_time: dates ? dates[0] : null,
              end_time: dates ? dates[1] : null
            }))}
            showTime={{ format: 'HH:mm:ss' }}
            format="YYYY-MM-DD HH:mm:ss"
            placeholder={['开始时间', '结束时间']}
          />

          <Button icon={<FilterOutlined />} onClick={resetFilters}>
            清空筛选
          </Button>

          <Button icon={<ReloadOutlined />} onClick={() => fetchLogs(1)}>
            刷新
          </Button>

          <Button
            icon={<BarChartOutlined />}
            onClick={() => setStatsVisible(true)}
          >
            统计分析
          </Button>
        </Space>

        <Table
          columns={columns}
          dataSource={logs}
          rowKey="id"
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize,
            total,
            showSizeChanger: false,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: fetchLogs,
          }}
          size="middle"
        />
      </Card>

      {/* 详情模态框 */}
      <Modal
        title="操作日志详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailVisible(false)}>
            关闭
          </Button>
        ]}
        width={800}
      >
        {detailRecord && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="操作时间" span={2}>
              {dayjs(detailRecord.timestamp).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="操作人">
              {detailRecord.operator}
            </Descriptions.Item>
            <Descriptions.Item label="IP地址">
              {detailRecord.ip_address || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="操作类型">
              <Tag color={getOperationTypeColor(detailRecord.operation_type)}>
                {getOperationTypeName(detailRecord.operation_type)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="资源类型">
              {getResourceTypeName(detailRecord.resource_type)}
            </Descriptions.Item>
            <Descriptions.Item label="资源ID">
              {detailRecord.resource_id}
            </Descriptions.Item>
            <Descriptions.Item label="资源名称">
              {detailRecord.resource_name || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="操作描述" span={2}>
              {detailRecord.operation_desc}
            </Descriptions.Item>
            <Descriptions.Item label="用户代理" span={2}>
              {detailRecord.user_agent || '-'}
            </Descriptions.Item>

            {detailRecord.before_data && (
              <Descriptions.Item label="操作前数据" span={2}>
                <pre style={{ fontSize: '12px', maxHeight: '200px', overflow: 'auto' }}>
                  {JSON.stringify(detailRecord.before_data, null, 2)}
                </pre>
              </Descriptions.Item>
            )}

            {detailRecord.after_data && (
              <Descriptions.Item label="操作后数据" span={2}>
                <pre style={{ fontSize: '12px', maxHeight: '200px', overflow: 'auto' }}>
                  {JSON.stringify(detailRecord.after_data, null, 2)}
                </pre>
              </Descriptions.Item>
            )}

            {detailRecord.extra_info && (
              <Descriptions.Item label="额外信息" span={2}>
                <pre style={{ fontSize: '12px', maxHeight: '200px', overflow: 'auto' }}>
                  {JSON.stringify(detailRecord.extra_info, null, 2)}
                </pre>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>

      {/* 统计分析模态框 */}
      <Modal
        title="操作统计分析"
        open={statsVisible}
        onCancel={() => setStatsVisible(false)}
        footer={[
          <Button key="close" onClick={() => setStatsVisible(false)}>
            关闭
          </Button>
        ]}
        width={1000}
      >
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col span={24}>
            <Statistic
              title="总操作数"
              value={stats.total_operations}
              style={{ textAlign: 'center' }}
            />
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Card title="按操作人统计" size="small">
              {stats.by_operator.slice(0, 10).map((item, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span>{item.value}</span>
                  <span>{item.count} ({item.percentage}%)</span>
                </div>
              ))}
            </Card>
          </Col>

          <Col span={8}>
            <Card title="按操作类型统计" size="small">
              {stats.by_operation_type.map((item, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Tag color={getOperationTypeColor(item.value)}>
                    {getOperationTypeName(item.value)}
                  </Tag>
                  <span>{item.count} ({item.percentage}%)</span>
                </div>
              ))}
            </Card>
          </Col>

          <Col span={8}>
            <Card title="按资源类型统计" size="small">
              {stats.by_resource_type.map((item, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span>{getResourceTypeName(item.value)}</span>
                  <span>{item.count} ({item.percentage}%)</span>
                </div>
              ))}
            </Card>
          </Col>
        </Row>

        <Divider>最近操作</Divider>
        <Table
          columns={[
            {
              title: '时间',
              dataIndex: 'timestamp',
              render: (timestamp) => dayjs(timestamp).format('MM-DD HH:mm'),
              width: 100,
            },
            {
              title: '操作人',
              dataIndex: 'operator',
              width: 80,
            },
            {
              title: '操作',
              dataIndex: 'operation_type',
              render: (type) => (
                <Tag color={getOperationTypeColor(type)} size="small">
                  {getOperationTypeName(type)}
                </Tag>
              ),
              width: 80,
            },
            {
              title: '描述',
              dataIndex: 'operation_desc',
              ellipsis: true,
            },
          ]}
          dataSource={stats.recent_operations}
          rowKey="id"
          size="small"
          pagination={false}
          style={{ maxHeight: '300px', overflow: 'auto' }}
        />
      </Modal>
    </div>
  );
};

export default OperationLogList;