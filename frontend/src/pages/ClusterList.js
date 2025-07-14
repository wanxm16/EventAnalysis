import React, { useState, useEffect, useRef } from 'react';
import {
  Table,
  Card,
  Input,
  Button,
  Select,
  Space,
  message,
  Tag,
  Pagination,
  Tooltip,
  DatePicker,
} from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  ClusterOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import Highlighter from 'react-highlight-words';
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
  
  const [searchText, setSearchText] = useState('');
  const [searchedColumn, setSearchedColumn] = useState('');
  const searchInput = useRef(null);
  const [columnFilters, setColumnFilters] = useState({});

  // 获取列搜索属性
  const getColumnSearchProps = (dataIndex, placeholder, apiParam) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
        <Input
          ref={searchInput}
          placeholder={placeholder}
          value={selectedKeys[0]}
          onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => handleColumnSearchFilter(selectedKeys, confirm, dataIndex, apiParam)}
          style={{ marginBottom: 8, display: 'block' }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() => handleColumnSearchFilter(selectedKeys, confirm, dataIndex, apiParam)}
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            搜索
          </Button>
          <Button
            onClick={() => handleColumnFilterReset(clearFilters, apiParam)}
            size="small"
            style={{ width: 90 }}
          >
            重置
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered) => (
      <SearchOutlined style={{ color: columnFilters[apiParam] ? '#1890ff' : undefined }} />
    ),
    onFilterDropdownOpenChange: (visible) => {
      if (visible) {
        setTimeout(() => searchInput.current?.select(), 100);
      }
    },
    render: (text) =>
      searchedColumn === dataIndex ? (
        <Highlighter
          highlightStyle={{ backgroundColor: '#ffc069', padding: 0 }}
          searchWords={[searchText]}
          autoEscape
          textToHighlight={text ? text.toString() : ''}
        />
      ) : (
        text
      ),
  });

  // 获取事件数量筛选属性
  const getEventCountFilterProps = () => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8 }}>
        <Select
          placeholder="选择事件数量范围"
          value={selectedKeys[0]}
          onChange={(value) => setSelectedKeys(value ? [value] : [])}
          style={{ width: 200, marginBottom: 8, display: 'block' }}
          allowClear
        >
          <Option value="2">2个</Option>
          <Option value="3-5">3-5个</Option>
          <Option value="6-10">6-10个</Option>
          <Option value="10+">10个以上</Option>
        </Select>
        <Space>
          <Button
            type="primary"
            onClick={() => handleColumnFilter(selectedKeys, confirm, 'event_count_range')}
            icon={<FilterOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            筛选
          </Button>
          <Button
            onClick={() => handleColumnFilterReset(clearFilters, 'event_count_range')}
            size="small"
            style={{ width: 90 }}
          >
            重置
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered) => (
      <FilterOutlined style={{ color: columnFilters['event_count_range'] ? '#1890ff' : undefined }} />
    ),
  });

  // 获取持续时间筛选属性
  const getDurationFilterProps = () => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8 }}>
        <Select
          placeholder="选择持续时间范围"
          value={selectedKeys[0]}
          onChange={(value) => setSelectedKeys(value ? [value] : [])}
          style={{ width: 200, marginBottom: 8, display: 'block' }}
          allowClear
        >
          <Option value="0-1天">0-1天</Option>
          <Option value="1-7天">1-7天</Option>
          <Option value="7-30天">7-30天</Option>
          <Option value="30天以上">30天以上</Option>
        </Select>
        <Space>
          <Button
            type="primary"
            onClick={() => handleColumnFilter(selectedKeys, confirm, 'duration_range')}
            icon={<FilterOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            筛选
          </Button>
          <Button
            onClick={() => handleColumnFilterReset(clearFilters, 'duration_range')}
            size="small"
            style={{ width: 90 }}
          >
            重置
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered) => (
      <FilterOutlined style={{ color: columnFilters['duration_range'] ? '#1890ff' : undefined }} />
    ),
  });

  // 获取日期筛选属性
  const getDateFilterProps = (dataIndex, apiParam) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8 }}>
        <DatePicker.RangePicker
          value={selectedKeys[0]}
          onChange={(dates) => setSelectedKeys(dates ? [dates] : [])}
          style={{ marginBottom: 8, display: 'block' }}
          placeholder={['开始日期', '结束日期']}
          allowEmpty={[false, true]}
        />
        <Space>
          <Button
            type="primary"
            onClick={() => handleDateFilter(selectedKeys, confirm, apiParam)}
            icon={<FilterOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            筛选
          </Button>
          <Button
            onClick={() => handleColumnFilterReset(clearFilters, apiParam)}
            size="small"
            style={{ width: 90 }}
          >
            重置
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered) => (
      <FilterOutlined style={{ color: columnFilters[apiParam] ? '#1890ff' : undefined }} />
    ),
  });

  // 处理列搜索筛选
  const handleColumnSearchFilter = (selectedKeys, confirm, dataIndex, apiParam) => {
    confirm();
    const value = selectedKeys[0];
    setSearchText(value);
    setSearchedColumn(dataIndex);
    
    // 更新列筛选状态
    const newColumnFilters = { ...columnFilters };
    if (value) {
      newColumnFilters[apiParam] = value;
    } else {
      delete newColumnFilters[apiParam];
    }
    setColumnFilters(newColumnFilters);
    
    // 更新搜索参数并重新加载数据
    const newParams = { ...Object.fromEntries(searchParams), ...newColumnFilters };
    setSearchParams(newParams);
    setPagination(prev => ({ ...prev, current: 1 }));
    loadClusters({ page: 1, ...newParams });
  };

  // 处理列筛选
  const handleColumnFilter = (selectedKeys, confirm, apiParam) => {
    confirm();
    const value = selectedKeys[0];
    
    // 更新列筛选状态
    const newColumnFilters = { ...columnFilters };
    if (value) {
      newColumnFilters[apiParam] = value;
    } else {
      delete newColumnFilters[apiParam];
    }
    setColumnFilters(newColumnFilters);
    
    // 转换为API参数
    const newParams = { ...Object.fromEntries(searchParams) };
    
    if (apiParam === 'event_count_range') {
      // 清除之前的事件数量筛选
      delete newParams.min_event_count;
      delete newParams.max_event_count;
      
      if (value === "2") {
        newParams.min_event_count = 2;
        newParams.max_event_count = 2;
      } else if (value === "3-5") {
        newParams.min_event_count = 3;
        newParams.max_event_count = 5;
      } else if (value === "6-10") {
        newParams.min_event_count = 6;
        newParams.max_event_count = 10;
      } else if (value === "10+") {
        newParams.min_event_count = 11;
      }
    } else if (apiParam === 'duration_range') {
      // 清除之前的持续时间筛选
      delete newParams.min_duration;
      delete newParams.max_duration;
      
      if (value === "0-1天") {
        newParams.min_duration = 0;
        newParams.max_duration = 1;
      } else if (value === "1-7天") {
        newParams.min_duration = 1;
        newParams.max_duration = 7;
      } else if (value === "7-30天") {
        newParams.min_duration = 7;
        newParams.max_duration = 30;
      } else if (value === "30天以上") {
        newParams.min_duration = 30;
      }
    }
    
    setSearchParams(newParams);
    setPagination(prev => ({ ...prev, current: 1 }));
    loadClusters({ page: 1, ...newParams });
  };

  // 处理日期筛选
  const handleDateFilter = (selectedKeys, confirm, apiParam) => {
    confirm();
    const dateRange = selectedKeys[0];

    const newColumnFilters = { ...columnFilters };
    if (dateRange && (dateRange[0] || dateRange[1])) {
      newColumnFilters[apiParam] = dateRange;
    } else {
      delete newColumnFilters[apiParam];
    }
    setColumnFilters(newColumnFilters);

    const newParams = { ...Object.fromEntries(searchParams) };

    // 清除之前的日期筛选参数
    delete newParams[`${apiParam}_start`];
    delete newParams[`${apiParam}_end`];

    if (dateRange) {
      const [start, end] = dateRange;
      if (start) {
        newParams[`${apiParam}_start`] = start.format('YYYY-MM-DD');
      }
      if (end) {
        newParams[`${apiParam}_end`] = end.endOf('day').format('YYYY-MM-DD HH:mm:ss');
      }
    }

    setSearchParams(newParams);
    setPagination(prev => ({ ...prev, current: 1 }));
    loadClusters({ page: 1, ...newParams });
  };

  // 处理列筛选重置
  const handleColumnFilterReset = (clearFilters, apiParam) => {
    clearFilters();
    
    // 更新列筛选状态
    const newColumnFilters = { ...columnFilters };
    delete newColumnFilters[apiParam];
    setColumnFilters(newColumnFilters);
    
    // 更新搜索参数并重新加载数据
    const newParams = { ...Object.fromEntries(searchParams) };
    
    if (apiParam === 'search') {
      delete newParams.search;
      setSearchText('');
      setSearchedColumn('');
    } else if (apiParam === 'event_count_range') {
      delete newParams.min_event_count;
      delete newParams.max_event_count;
    } else if (apiParam === 'duration_range') {
      delete newParams.min_duration;
      delete newParams.max_duration;
    } else if (apiParam === 'first_report_time' || apiParam === 'last_report_time') {
      delete newParams[`${apiParam}_start`];
      delete newParams[`${apiParam}_end`];
    } else {
      delete newParams[apiParam];
    }
    
    setSearchParams(newParams);
    setPagination(prev => ({ ...prev, current: 1 }));
    loadClusters({ page: 1, ...newParams });
  };

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
      ...getColumnSearchProps('cluster_description', '搜索描述', 'search'),
      ellipsis: {
        showTitle: false,
      },
      render: (text) => 
        searchedColumn === 'cluster_description' ? (
          <Tooltip title={text}>
            <Highlighter
              highlightStyle={{ backgroundColor: '#ffc069', padding: 0 }}
              searchWords={[searchText]}
              autoEscape
              textToHighlight={text ? text.toString() : ''}
            />
          </Tooltip>
        ) : (
          <Tooltip title={text}>
            <span style={{ fontSize: '13px' }}>
              {text}
            </span>
          </Tooltip>
        ),
    },
    {
      title: '事件数量',
      dataIndex: 'record_count',
      key: 'record_count',
      width: 100,
      align: 'center',
      ...getEventCountFilterProps(),
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
      ...getDurationFilterProps(),
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
      ...getDateFilterProps('first_report_time', 'first_report_time'),
      render: formatTime,
    },
    {
      title: '最后上报',
      dataIndex: 'last_report_time',
      key: 'last_report_time',
      width: 120,
      ...getDateFilterProps('last_report_time', 'last_report_time'),
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
    // 从URL参数加载数据
    const params = Object.fromEntries(searchParams);
    
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