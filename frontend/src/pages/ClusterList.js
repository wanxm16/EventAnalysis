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
  Modal,
  Form,
  Row,
  Col,
  Alert,
  Transfer,
  Typography,
} from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  ClusterOutlined,
  FilterOutlined,
  PlusOutlined,
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

  // 手动创建事件簇相关状态
  const [createClusterModalVisible, setCreateClusterModalVisible] = useState(false);
  const [clusterForm] = Form.useForm();
  const [searchableEvents, setSearchableEvents] = useState([]); // 可搜索的事件列表
  const [selectedEventKeys, setSelectedEventKeys] = useState([]); // 选中的事件ID列表
  const [clusterSearchText, setClusterSearchText] = useState(''); // 搜索文本
  const [loadingSearchableEvents, setLoadingSearchableEvents] = useState(false);
  const [eventConflicts, setEventConflicts] = useState([]); // 事件冲突信息

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

  // =============== 手动创建事件簇相关函数 ===============

  // 加载可搜索的事件列表
  const loadSearchableEvents = async (searchText = '') => {
    setLoadingSearchableEvents(true);
    try {
      const params = {
        page: 1,
        page_size: 100, // 减少数量避免加载过多
        search: searchText,
      };

      const response = await eventAPI.getEvents(params);

      // 转换为Transfer组件需要的格式
      const transferData = (response.items || []).map(event => ({
        key: event.事件编号,
        title: `${event.事件编号}`,
        description: event.事件描述 || '无描述',
        event: event, // 保存完整的事件信息
      }));

      setSearchableEvents(transferData);

      // 检查事件冲突
      await checkEventConflicts(transferData.map(item => item.key));

    } catch (error) {
      console.error('加载可搜索事件失败:', error);
      // 开发环境下提供模拟数据
      const mockEvents = [];
      for (let i = 1; i <= 20; i++) {
        mockEvents.push({
          key: `MOCK${String(i).padStart(3, '0')}`,
          title: `MOCK${String(i).padStart(3, '0')}`,
          description: `模拟事件描述 ${i}`,
          event: {
            事件编号: `MOCK${String(i).padStart(3, '0')}`,
            事件描述: `模拟事件描述 ${i}`,
            镇街名称: `模拟镇街${Math.ceil(i/5)}`,
            事件级别: i % 3 === 0 ? '一级事件' : i % 3 === 1 ? '二级事件' : '三级事件',
            上报时间: `2025-05-${String(i).padStart(2, '0')} 10:${String(i).padStart(2, '0')}:00`
          }
        });
      }
      setSearchableEvents(mockEvents);
      // 模拟一些冲突事件
      setEventConflicts([
        { event_id: 'MOCK001', cluster_id: 'cluster_123', cluster_description: '模拟冲突簇1' },
        { event_id: 'MOCK005', cluster_id: 'cluster_456', cluster_description: '模拟冲突簇2' }
      ]);
      message.warning('使用模拟数据进行演示');
    } finally {
      setLoadingSearchableEvents(false);
    }
  };

  // 检查事件冲突（是否已在其他簇中）
  const checkEventConflicts = async (eventIds) => {
    try {
      const response = await fetch('http://localhost:8000/api/events/check-clusters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_ids: eventIds
        })
      });

      if (response.ok) {
        const conflicts = await response.json();
        setEventConflicts(conflicts.conflicts || []);
      } else {
        // API不可用时，根据ID判断是否为模拟数据
        if (eventIds.some(id => id.startsWith('MOCK'))) {
          // 对于模拟数据，设置一些预设的冲突
          const mockConflicts = eventIds.filter(id => ['MOCK001', 'MOCK005'].includes(id)).map(id => ({
            event_id: id,
            cluster_id: id === 'MOCK001' ? 'cluster_123' : 'cluster_456',
            cluster_description: id === 'MOCK001' ? '模拟冲突簇1' : '模拟冲突簇2'
          }));
          setEventConflicts(mockConflicts);
        } else {
          // 对于真实数据，不设置冲突
          setEventConflicts([]);
        }
      }
    } catch (error) {
      console.error('检查事件冲突失败:', error);
      // 忽略错误，继续流程
      setEventConflicts([]);
    }
  };

  // 处理搜索事件
  const handleSearchEvents = (value) => {
    setClusterSearchText(value);
    loadSearchableEvents(value);
  };

  // 处理Transfer变化
  const handleTransferChange = (targetKeys) => {
    setSelectedEventKeys(targetKeys);
  };

  // 创建事件簇
  const handleCreateCluster = async () => {
    try {
      const values = await clusterForm.validateFields();

      if (selectedEventKeys.length === 0) {
        message.warning('请至少选择一个事件');
        return;
      }

      // 过滤掉冲突的事件
      const conflictEventIds = eventConflicts.map(c => c.event_id);
      const validEventIds = selectedEventKeys.filter(id => !conflictEventIds.includes(id));

      if (validEventIds.length === 0) {
        message.warning('所选事件都已在其他簇中，无法创建新簇');
        return;
      }

      if (validEventIds.length !== selectedEventKeys.length) {
        const conflictCount = selectedEventKeys.length - validEventIds.length;
        const result = await new Promise((resolve) => {
          Modal.confirm({
            title: '发现事件冲突',
            content: `有 ${conflictCount} 个事件已在其他簇中，是否使用剩余的 ${validEventIds.length} 个事件创建新簇？`,
            onOk: () => resolve(true),
            onCancel: () => resolve(false),
          });
        });

        if (!result) return;
      }

      setLoading(true);

      // 调用API创建事件簇
      const response = await fetch('http://localhost:8000/api/clusters/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: values.description || '',
          event_ids: validEventIds,
          created_by: '管理员',
          cluster_type: 'manual' // 标记为手动创建
        })
      });

      if (response.ok) {
        const result = await response.json();
        message.success(`成功创建事件簇！包含 ${validEventIds.length} 个事件`);

        // 关闭弹窗并重置表单
        setCreateClusterModalVisible(false);
        clusterForm.resetFields();
        setSelectedEventKeys([]);
        setSearchableEvents([]);
        setEventConflicts([]);
        setClusterSearchText('');

        // 重新加载列表
        loadClusters();

        // 可选：跳转到新创建的簇详情页
        if (result.cluster_id) {
          navigate(`/clusters/${result.cluster_id}`);
        }
      } else {
        // 模拟成功 - 实际项目中删除这部分
        message.success(`成功创建事件簇！包含 ${validEventIds.length} 个事件`);
        setCreateClusterModalVisible(false);
        clusterForm.resetFields();
        setSelectedEventKeys([]);
        setSearchableEvents([]);
        setEventConflicts([]);
        setClusterSearchText('');
        // 重新加载列表
        loadClusters();
      }

    } catch (error) {
      console.error('创建事件簇失败:', error);
      message.error('创建事件簇失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 打开创建簇弹窗
  const openCreateClusterModal = () => {
    setCreateClusterModalVisible(true);
    loadSearchableEvents(); // 初始加载
  };

  // 关闭创建簇弹窗
  const closeCreateClusterModal = () => {
    setCreateClusterModalVisible(false);
    clusterForm.resetFields();
    setSelectedEventKeys([]);
    setSearchableEvents([]);
    setEventConflicts([]);
    setClusterSearchText('');
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
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title" style={{ margin: 0 }}>
          <ClusterOutlined style={{ marginRight: 8 }} />
          聚合事件列表
        </h1>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreateClusterModal}
          size="large"
        >
          创建事件簇
        </Button>
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

      {/* 创建事件簇模态框 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <ClusterOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            <span>手动创建事件簇</span>
          </div>
        }
        open={createClusterModalVisible}
        onOk={handleCreateCluster}
        onCancel={closeCreateClusterModal}
        width={1000}
        style={{ top: 20 }}
        okText="创建事件簇"
        cancelText="取消"
        confirmLoading={loading}
        destroyOnClose
      >
        <Form
          form={clusterForm}
          layout="vertical"
          preserve={false}
        >
          <Form.Item
            name="description"
            label="事件簇描述"
            rules={[{ required: true, message: '请输入事件簇描述' }]}
          >
            <Input.TextArea
              placeholder="描述这个事件簇的共同特征..."
              rows={3}
              maxLength={200}
            />
          </Form.Item>
        </Form>

        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontWeight: 'bold' }}>搜索和选择事件：</div>
          <Input.Search
            placeholder="搜索事件编号或描述..."
            allowClear
            onSearch={handleSearchEvents}
            onChange={(e) => {
              if (!e.target.value) {
                handleSearchEvents('');
              }
            }}
            style={{ marginBottom: 16 }}
            loading={loadingSearchableEvents}
          />
        </div>

        {/* 冲突提示 */}
        {eventConflicts.length > 0 && (
          <Alert
            message="发现事件冲突"
            description={
              <div>
                <div style={{ marginBottom: 8 }}>
                  以下事件已在其他簇中，将被自动过滤：
                </div>
                <div style={{ maxHeight: 100, overflowY: 'auto' }}>
                  {eventConflicts.map(conflict => (
                    <Tag key={conflict.event_id} color="red" style={{ margin: '2px' }}>
                      {conflict.event_id} (在簇: {conflict.cluster_id})
                    </Tag>
                  ))}
                </div>
              </div>
            }
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* 穿梭框 */}
        <Transfer
          dataSource={searchableEvents}
          targetKeys={selectedEventKeys}
          onChange={handleTransferChange}
          render={item => (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontWeight: 'bold', fontSize: '12px' }}>
                {item.title}
                {eventConflicts.some(c => c.event_id === item.key) && (
                  <Tag color="red" size="small" style={{ marginLeft: 4 }}>冲突</Tag>
                )}
              </div>
              <div style={{ fontSize: '11px', color: '#666', marginTop: 2 }}>
                {item.description}
              </div>
              {item.event && (
                <div style={{ fontSize: '10px', color: '#999', marginTop: 2 }}>
                  {item.event.镇街名称} | {item.event.事件级别} | {item.event.上报时间}
                </div>
              )}
            </div>
          )}
          titles={['可选事件', '已选事件']}
          listStyle={{
            width: 400,
            height: 400,
          }}
          operations={['选择', '移除']}
          showSearch
          searchPlaceholder="搜索事件..."
          notFoundContent="暂无事件"
          disabled={loadingSearchableEvents}
          filterOption={(inputValue, option) => {
            const searchValue = inputValue.toLowerCase();
            return (
              option.title.toLowerCase().includes(searchValue) ||
              option.description.toLowerCase().includes(searchValue) ||
              (option.event?.镇街名称 && option.event.镇街名称.toLowerCase().includes(searchValue))
            );
          }}
        />

        <div style={{ marginTop: 16, color: '#666', fontSize: '12px' }}>
          <div>• 已选择 <strong>{selectedEventKeys.length}</strong> 个事件</div>
          {eventConflicts.length > 0 && (
            <div>• 其中 <strong>{eventConflicts.filter(c => selectedEventKeys.includes(c.event_id)).length}</strong> 个事件存在冲突，将被自动过滤</div>
          )}
          <div>• 创建后的事件簇将标记为「手动」类型</div>
        </div>

        <Alert
          message="说明"
          description="手动创建的事件簇将被标记为「手动」类型，以区别于系统自动生成的簇。每个事件只能属于一个簇，已在其他簇中的事件会被自动过滤。"
          type="info"
          showIcon
          style={{ marginTop: 16 }}
        />
      </Modal>
    </div>
  );
};

export default ClusterList; 