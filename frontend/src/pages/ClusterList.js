import React, { useState, useEffect, useRef } from 'react';
import {
  Table,
  Card,
  Input,
  InputNumber,
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
  Tabs,
  Badge,
  Statistic,
} from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  ClusterOutlined,
  FilterOutlined,
  PlusOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import Highlighter from 'react-highlight-words';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { eventAPI } from '../services/api';

const { Option } = Select;

// 可拖拽列宽度组件
const ResizeableTitle = (props) => {
  const { onResize, width, ...restProps } = props;

  if (!width) {
    return <th {...restProps} />;
  }

  return (
    <th
      {...restProps}
      style={{ position: 'relative' }}
    >
      {restProps.children}
      <div
        style={{
          position: 'absolute',
          right: '-5px',
          top: 0,
          bottom: 0,
          width: '10px',
          cursor: 'col-resize',
          zIndex: 1,
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          const startX = e.pageX;
          const startWidth = width;

          const handleMouseMove = (e) => {
            const newWidth = startWidth + e.pageX - startX;
            if (newWidth > 50) { // 最小宽度限制
              onResize(newWidth);
            }
          };

          const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
          };

          document.addEventListener('mousemove', handleMouseMove);
          document.addEventListener('mouseup', handleMouseUp);
        }}
      />
    </th>
  );
};

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

  // 列宽度状态管理
  const [columnWidths, setColumnWidths] = useState({
    EventUID: 150,
    cluster_description: 200,
    record_count: 100,
    participant_count: 110,
    duration_days: 100,
    first_report_time: 120,
    last_report_time: 120,
    actions: 120,
  });

  // 重复报警列宽度状态管理
  const [repeatAlarmColumnWidths, setRepeatAlarmColumnWidths] = useState({
    event_uid: 150,
    description: 300,
    caller: 180,
    town: 100,
    repeat_count: 100,
    first_time: 180,
    time_span_minutes: 110,
    action: 120,
  });

  const [searchText, setSearchText] = useState('');
  const [searchedColumn, setSearchedColumn] = useState('');
  const searchInput = useRef(null);
  const [columnFilters, setColumnFilters] = useState({});

  // Tab切换状态
  const [activeTab, setActiveTab] = useState('all');

  // 重复报警详情Modal状态
  const [repeatAlarmDetailVisible, setRepeatAlarmDetailVisible] = useState(false);
  const [selectedRepeatAlarm, setSelectedRepeatAlarm] = useState(null);

  // 重复报警Mock数据
  const [repeatAlarms] = useState([
    {
      event_uid: "cluster_repeat_001",
      phone: "15258180637",
      name: "王长远",
      event_type: "矛盾纠纷",
      category: "快递纠纷",
      description: "快递送货客户要求各种拖理由投诉退款，有纠纷",
      repeat_count: 2,
      first_time: "2025-12-22 09:31:00",
      last_time: "2025-12-22 09:50:00",
      time_span_minutes: 19,
      status: "处理中",
      warning_level: "高",
      resolved_count: 0,
      pending_count: 2,
      town: "白云街道",
      events: [
        { id: "BYW20251220002", time: "09:31", status: "已办结" },
        { id: "BYW20251220003", time: "09:50", status: "处理中" }
      ]
    },
    {
      event_uid: "cluster_repeat_002",
      phone: "15038305197",
      name: null,
      event_type: "矛盾纠纷",
      category: "运费纠纷",
      description: "给人送货，运费不给我，有纠纷",
      repeat_count: 2,
      first_time: "2025-12-15 21:57:00",
      last_time: "2025-12-15 22:11:00",
      time_span_minutes: 14,
      status: "已办结",
      warning_level: "极高",
      resolved_count: 2,
      pending_count: 0,
      town: "洞桥镇",
      events: [
        { id: "DQIW20251215004", time: "21:57", status: "已办结" },
        { id: "DQIW20251215005", time: "22:11", status: "已办结" }
      ]
    },
    {
      event_uid: "cluster_repeat_003",
      phone: "13900001111",
      name: "张三",
      event_type: "矛盾纠纷",
      category: "停车纠纷",
      description: "小区停车位被长期占用，多次沟通无果",
      repeat_count: 3,
      first_time: "2025-12-20 08:15:00",
      last_time: "2025-12-20 10:30:00",
      time_span_minutes: 135,
      status: "处理中",
      warning_level: "中",
      resolved_count: 1,
      pending_count: 2,
      town: "南门街道",
      events: [
        { id: "NMW20251220015", time: "08:15", status: "已办结" },
        { id: "NMW20251220023", time: "09:20", status: "处理中" },
        { id: "NMW20251220031", time: "10:30", status: "处理中" }
      ]
    },
    {
      event_uid: "cluster_repeat_004",
      phone: "13800002222",
      name: "李四",
      event_type: "矛盾纠纷",
      category: "噪音投诉",
      description: "楼上住户深夜噪音扰民，影响休息",
      repeat_count: 4,
      first_time: "2025-12-18 22:45:00",
      last_time: "2025-12-19 01:30:00",
      time_span_minutes: 165,
      status: "处理中",
      warning_level: "高",
      resolved_count: 0,
      pending_count: 4,
      town: "望城街道",
      events: [
        { id: "WCW20251218045", time: "22:45", status: "处理中" },
        { id: "WCW20251218052", time: "23:20", status: "处理中" },
        { id: "WCW20251219002", time: "00:15", status: "处理中" },
        { id: "WCW20251219008", time: "01:30", status: "处理中" }
      ]
    },
    {
      event_uid: "cluster_repeat_005",
      phone: "13700003333",
      name: "王五",
      event_type: "矛盾纠纷",
      category: "物业纠纷",
      description: "物业不作为，公共设施损坏长期不修",
      repeat_count: 5,
      first_time: "2025-12-17 14:20:00",
      last_time: "2025-12-17 17:45:00",
      time_span_minutes: 205,
      status: "已办结",
      warning_level: "极高",
      resolved_count: 5,
      pending_count: 0,
      town: "古林镇",
      events: [
        { id: "GLW20251217020", time: "14:20", status: "已办结" },
        { id: "GLW20251217025", time: "15:05", status: "已办结" },
        { id: "GLW20251217032", time: "15:50", status: "已办结" },
        { id: "GLW20251217038", time: "16:40", status: "已办结" },
        { id: "GLW20251217044", time: "17:45", status: "已办结" }
      ]
    }
  ]);

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
  const getEventCountFilterProps = () => {
    let minValue;
    let maxValue;

    return {
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
        <div style={{ padding: 8 }}>
          <div style={{ marginBottom: 8 }}>
            <InputNumber
              placeholder="最小值"
              defaultValue={selectedKeys[0]?.min}
              onChange={(value) => { minValue = value; }}
              min={0}
              style={{ width: 90, marginRight: 4 }}
            />
            <span style={{ margin: '0 4px' }}>-</span>
            <InputNumber
              placeholder="最大值"
              defaultValue={selectedKeys[0]?.max}
              onChange={(value) => { maxValue = value; }}
              min={0}
              style={{ width: 90 }}
            />
          </div>
          <Space>
            <Button
              type="primary"
              onClick={() => {
                const range = { min: minValue, max: maxValue };
                setSelectedKeys(minValue !== undefined || maxValue !== undefined ? [range] : []);
                handleColumnFilter(
                  minValue !== undefined || maxValue !== undefined ? [range] : [],
                  confirm,
                  'event_count_range'
                );
              }}
              icon={<FilterOutlined />}
              size="small"
              style={{ width: 90 }}
            >
              筛选
            </Button>
            <Button
              onClick={() => {
                minValue = undefined;
                maxValue = undefined;
                handleColumnFilterReset(clearFilters, 'event_count_range');
              }}
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
    };
  };

  // 获取持续时间筛选属性
  const getDurationFilterProps = () => {
    let minValue;
    let maxValue;

    return {
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
        <div style={{ padding: 8 }}>
          <div style={{ marginBottom: 8 }}>
            <InputNumber
              placeholder="最小天数"
              defaultValue={selectedKeys[0]?.min}
              onChange={(value) => { minValue = value; }}
              min={0}
              style={{ width: 90, marginRight: 4 }}
            />
            <span style={{ margin: '0 4px' }}>-</span>
            <InputNumber
              placeholder="最大天数"
              defaultValue={selectedKeys[0]?.max}
              onChange={(value) => { maxValue = value; }}
              min={0}
              style={{ width: 90 }}
            />
          </div>
          <Space>
            <Button
              type="primary"
              onClick={() => {
                const range = { min: minValue, max: maxValue };
                setSelectedKeys(minValue !== undefined || maxValue !== undefined ? [range] : []);
                handleColumnFilter(
                  minValue !== undefined || maxValue !== undefined ? [range] : [],
                  confirm,
                  'duration_range'
                );
              }}
              icon={<FilterOutlined />}
              size="small"
              style={{ width: 90 }}
            >
              筛选
            </Button>
            <Button
              onClick={() => {
                minValue = undefined;
                maxValue = undefined;
                handleColumnFilterReset(clearFilters, 'duration_range');
              }}
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
    };
  };

  // 获取参与人数量筛选属性
  const getParticipantCountFilterProps = () => {
    let minValue;
    let maxValue;

    return {
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
        <div style={{ padding: 8 }}>
          <div style={{ marginBottom: 8 }}>
            <InputNumber
              placeholder="最小值"
              defaultValue={selectedKeys[0]?.min}
              onChange={(value) => { minValue = value; }}
              min={0}
              style={{ width: 90, marginRight: 4 }}
            />
            <span style={{ margin: '0 4px' }}>-</span>
            <InputNumber
              placeholder="最大值"
              defaultValue={selectedKeys[0]?.max}
              onChange={(value) => { maxValue = value; }}
              min={0}
              style={{ width: 90 }}
            />
          </div>
          <Space>
            <Button
              type="primary"
              onClick={() => {
                const range = { min: minValue, max: maxValue };
                setSelectedKeys(minValue !== undefined || maxValue !== undefined ? [range] : []);
                handleColumnFilter(
                  minValue !== undefined || maxValue !== undefined ? [range] : [],
                  confirm,
                  'participant_count_range'
                );
              }}
              icon={<FilterOutlined />}
              size="small"
              style={{ width: 90 }}
            >
              筛选
            </Button>
            <Button
              onClick={() => {
                minValue = undefined;
                maxValue = undefined;
                handleColumnFilterReset(clearFilters, 'participant_count_range');
              }}
              size="small"
              style={{ width: 90 }}
            >
              重置
            </Button>
          </Space>
        </div>
      ),
      filterIcon: (filtered) => (
        <FilterOutlined style={{ color: columnFilters['participant_count_range'] ? '#1890ff' : undefined }} />
      ),
    };
  };

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

      if (value && (value.min !== undefined || value.max !== undefined)) {
        if (value.min !== undefined) {
          newParams.min_event_count = value.min;
        }
        if (value.max !== undefined) {
          newParams.max_event_count = value.max;
        }
      }
    } else if (apiParam === 'duration_range') {
      // 清除之前的持续时间筛选
      delete newParams.min_duration;
      delete newParams.max_duration;

      if (value && (value.min !== undefined || value.max !== undefined)) {
        if (value.min !== undefined) {
          newParams.min_duration = value.min;
        }
        if (value.max !== undefined) {
          newParams.max_duration = value.max;
        }
      }
    } else if (apiParam === 'participant_count_range') {
      // 清除之前的参与人数量筛选
      delete newParams.min_participant_count;
      delete newParams.max_participant_count;

      if (value && (value.min !== undefined || value.max !== undefined)) {
        if (value.min !== undefined) {
          newParams.min_participant_count = value.min;
        }
        if (value.max !== undefined) {
          newParams.max_participant_count = value.max;
        }
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
    } else if (apiParam === 'participant_count_range') {
      delete newParams.min_participant_count;
      delete newParams.max_participant_count;
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

      // 为每条记录添加 mock 的参与人数量（用于前端展示）
      const clustersWithParticipantCount = (response.items || []).map(item => ({
        ...item,
        participant_count: item.participant_count || Math.floor(Math.random() * 10) + 1, // 1-10人
      }));

      setClusters(clustersWithParticipantCount);
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

  // 查看重复报警详情
  const handleViewRepeatAlarmDetail = (alarm) => {
    setSelectedRepeatAlarm(alarm);
    setRepeatAlarmDetailVisible(true);
  };

  // 获取筛选标签 - 用于显示当前筛选条件
  const getFilterTags = () => {
    const tags = [];

    // 搜索关键词
    if (columnFilters['search']) {
      tags.push({
        key: 'search',
        label: `描述关键词: ${columnFilters['search']}`,
        closable: true,
        onClose: () => handleColumnFilterReset(() => {}, 'search')
      });
    }

    // 事件数量范围
    if (columnFilters['event_count_range']) {
      const range = columnFilters['event_count_range'];
      let label = '事件数量: ';
      if (range.min !== undefined && range.max !== undefined) {
        label += `${range.min} - ${range.max}`;
      } else if (range.min !== undefined) {
        label += `≥ ${range.min}`;
      } else if (range.max !== undefined) {
        label += `≤ ${range.max}`;
      }
      tags.push({
        key: 'event_count_range',
        label,
        closable: true,
        onClose: () => handleColumnFilterReset(() => {}, 'event_count_range')
      });
    }

    // 持续时间范围
    if (columnFilters['duration_range']) {
      const range = columnFilters['duration_range'];
      let label = '持续时间: ';
      if (range.min !== undefined && range.max !== undefined) {
        label += `${range.min} - ${range.max}天`;
      } else if (range.min !== undefined) {
        label += `≥ ${range.min}天`;
      } else if (range.max !== undefined) {
        label += `≤ ${range.max}天`;
      }
      tags.push({
        key: 'duration_range',
        label,
        closable: true,
        onClose: () => handleColumnFilterReset(() => {}, 'duration_range')
      });
    }

    // 参与人数量范围
    if (columnFilters['participant_count_range']) {
      const range = columnFilters['participant_count_range'];
      let label = '参与人数量: ';
      if (range.min !== undefined && range.max !== undefined) {
        label += `${range.min} - ${range.max}`;
      } else if (range.min !== undefined) {
        label += `≥ ${range.min}`;
      } else if (range.max !== undefined) {
        label += `≤ ${range.max}`;
      }
      tags.push({
        key: 'participant_count_range',
        label,
        closable: true,
        onClose: () => handleColumnFilterReset(() => {}, 'participant_count_range')
      });
    }

    // 首次上报时间
    if (columnFilters['first_report_time']) {
      const [start, end] = columnFilters['first_report_time'];
      const startStr = start ? start.format('YYYY-MM-DD') : '';
      const endStr = end ? end.format('YYYY-MM-DD') : '';
      tags.push({
        key: 'first_report_time',
        label: `首次上报: ${startStr} ~ ${endStr}`,
        closable: true,
        onClose: () => handleColumnFilterReset(() => {}, 'first_report_time')
      });
    }

    // 最后上报时间
    if (columnFilters['last_report_time']) {
      const [start, end] = columnFilters['last_report_time'];
      const startStr = start ? start.format('YYYY-MM-DD') : '';
      const endStr = end ? end.format('YYYY-MM-DD') : '';
      tags.push({
        key: 'last_report_time',
        label: `最后上报: ${startStr} ~ ${endStr}`,
        closable: true,
        onClose: () => handleColumnFilterReset(() => {}, 'last_report_time')
      });
    }

    return tags;
  };

  // 清除所有筛选
  const clearAllFilters = () => {
    setColumnFilters({});
    setSearchText('');
    setSearchedColumn('');
    setSearchParams({});
    setPagination(prev => ({ ...prev, current: 1 }));
    loadClusters({ page: 1 });
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

  // 处理列宽度变化
  const handleResize = (key) => (width) => {
    setColumnWidths(prev => ({
      ...prev,
      [key]: width
    }));
  };

  // 处理重复报警列宽度变化
  const handleRepeatAlarmResize = (key) => (width) => {
    setRepeatAlarmColumnWidths(prev => ({
      ...prev,
      [key]: width
    }));
  };

  // 表格列配置
  const columns = [
    {
      title: 'EventUID',
      dataIndex: 'EventUID',
      key: 'EventUID',
      width: columnWidths['EventUID'],
      onHeaderCell: () => ({
        width: columnWidths['EventUID'],
        onResize: handleResize('EventUID'),
      }),
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
      width: columnWidths['cluster_description'],
      onHeaderCell: () => ({
        width: columnWidths['cluster_description'],
        onResize: handleResize('cluster_description'),
      }),
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
      width: columnWidths['record_count'],
      align: 'center',
      onHeaderCell: () => ({
        width: columnWidths['record_count'],
        onResize: handleResize('record_count'),
      }),
      ...getEventCountFilterProps(),
      sorter: (a, b) => (a.record_count || 0) - (b.record_count || 0),
      render: (count) => (
        <Tag color="green" style={{ fontWeight: 'bold' }}>
          {count}个
        </Tag>
      ),
    },
    {
      title: '参与人数量',
      dataIndex: 'participant_count',
      key: 'participant_count',
      width: columnWidths['participant_count'],
      align: 'center',
      onHeaderCell: () => ({
        width: columnWidths['participant_count'],
        onResize: handleResize('participant_count'),
      }),
      ...getParticipantCountFilterProps(),
      sorter: (a, b) => (a.participant_count || 0) - (b.participant_count || 0),
      render: (count) => (
        <Tag color="blue" style={{ fontWeight: 'bold' }}>
          {count || 0}人
        </Tag>
      ),
    },
    {
      title: '持续时间',
      dataIndex: 'duration_days',
      key: 'duration_days',
      width: columnWidths['duration_days'],
      align: 'center',
      onHeaderCell: () => ({
        width: columnWidths['duration_days'],
        onResize: handleResize('duration_days'),
      }),
      ...getDurationFilterProps(),
      sorter: (a, b) => (a.duration_days || 0) - (b.duration_days || 0),
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
      width: columnWidths['first_report_time'],
      onHeaderCell: () => ({
        width: columnWidths['first_report_time'],
        onResize: handleResize('first_report_time'),
      }),
      ...getDateFilterProps('first_report_time', 'first_report_time'),
      sorter: (a, b) => {
        const timeA = a.first_report_time ? new Date(a.first_report_time).getTime() : 0;
        const timeB = b.first_report_time ? new Date(b.first_report_time).getTime() : 0;
        return timeA - timeB;
      },
      render: formatTime,
    },
    {
      title: '最后上报',
      dataIndex: 'last_report_time',
      key: 'last_report_time',
      width: columnWidths['last_report_time'],
      onHeaderCell: () => ({
        width: columnWidths['last_report_time'],
        onResize: handleResize('last_report_time'),
      }),
      ...getDateFilterProps('last_report_time', 'last_report_time'),
      sorter: (a, b) => {
        const timeA = a.last_report_time ? new Date(a.last_report_time).getTime() : 0;
        const timeB = b.last_report_time ? new Date(b.last_report_time).getTime() : 0;
        return timeA - timeB;
      },
      render: formatTime,
    },
    {
      title: '操作',
      key: 'actions',
      width: columnWidths['actions'],
      align: 'center',
      onHeaderCell: () => ({
        width: columnWidths['actions'],
        onResize: handleResize('actions'),
      }),
      render: (_, record) => (
        <Button
          type="link"
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

  // 格式化时间间隔
  const formatTimeSpan = (minutes) => {
    if (minutes < 60) {
      return `${minutes}分钟`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
    } else {
      const days = Math.floor(minutes / 1440);
      return `${days}天`;
    }
  };

  // 获取预警级别颜色
  const getWarningColor = (level) => {
    const colors = {
      '极高': '#ff4d4f',
      '高': '#ff7a45',
      '中': '#ffa940',
      '低': '#52c41a'
    };
    return colors[level] || '#999';
  };

  // 获取时间间隔的紧急程度标签
  const getUrgencyTag = (minutes) => {
    if (minutes <= 15) {
      return { text: '极紧急', color: 'red', icon: <WarningOutlined /> };
    } else if (minutes <= 30) {
      return { text: '紧急', color: 'orange', icon: <WarningOutlined /> };
    } else if (minutes <= 60) {
      return { text: '关注', color: 'gold', icon: <ClockCircleOutlined /> };
    } else {
      return { text: '常规', color: 'default', icon: <ClockCircleOutlined /> };
    }
  };

  // 渲染重复报警列表
  const renderRepeatAlarmsList = () => {
    // 表格列配置
    const repeatAlarmsColumns = [
      {
        title: '事件编号',
        dataIndex: 'event_uid',
        key: 'event_uid',
        width: repeatAlarmColumnWidths['event_uid'],
        onHeaderCell: () => ({
          width: repeatAlarmColumnWidths['event_uid'],
          onResize: handleRepeatAlarmResize('event_uid'),
        }),
        render: (text) => (
          <Tag color="blue" style={{ fontFamily: 'monospace' }}>
            {text}
          </Tag>
        ),
      },
      {
        title: '事件描述',
        dataIndex: 'description',
        key: 'description',
        width: repeatAlarmColumnWidths['description'],
        onHeaderCell: () => ({
          width: repeatAlarmColumnWidths['description'],
          onResize: handleRepeatAlarmResize('description'),
        }),
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
        title: '报警人',
        key: 'caller',
        width: repeatAlarmColumnWidths['caller'],
        onHeaderCell: () => ({
          width: repeatAlarmColumnWidths['caller'],
          onResize: handleRepeatAlarmResize('caller'),
        }),
        render: (_, record) => (
          <div>
            <div>
              <PhoneOutlined style={{ marginRight: 4, color: '#666' }} />
              {record.phone}
            </div>
            {record.name && (
              <div style={{ fontSize: '12px', color: '#999', marginTop: 2 }}>
                {record.name}
              </div>
            )}
          </div>
        ),
      },
      {
        title: '镇街',
        dataIndex: 'town',
        key: 'town',
        width: repeatAlarmColumnWidths['town'],
        onHeaderCell: () => ({
          width: repeatAlarmColumnWidths['town'],
          onResize: handleRepeatAlarmResize('town'),
        }),
      },
      {
        title: '报警次数',
        dataIndex: 'repeat_count',
        key: 'repeat_count',
        width: repeatAlarmColumnWidths['repeat_count'],
        align: 'center',
        onHeaderCell: () => ({
          width: repeatAlarmColumnWidths['repeat_count'],
          onResize: handleRepeatAlarmResize('repeat_count'),
        }),
        render: (count) => (
          <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#fa8c16' }}>
            {count}
          </span>
        ),
        sorter: (a, b) => a.repeat_count - b.repeat_count,
      },
      {
        title: '首次上报时间',
        dataIndex: 'first_time',
        key: 'first_time',
        width: repeatAlarmColumnWidths['first_time'],
        onHeaderCell: () => ({
          width: repeatAlarmColumnWidths['first_time'],
          onResize: handleRepeatAlarmResize('first_time'),
        }),
        render: (time) => (
          <span>
            <ClockCircleOutlined style={{ marginRight: 4, color: '#52c41a' }} />
            {time}
          </span>
        ),
        sorter: (a, b) => {
          const timeA = a.first_time ? new Date(a.first_time).getTime() : 0;
          const timeB = b.first_time ? new Date(b.first_time).getTime() : 0;
          return timeA - timeB;
        },
      },
      {
        title: '持续时间',
        dataIndex: 'time_span_minutes',
        key: 'time_span_minutes',
        width: repeatAlarmColumnWidths['time_span_minutes'],
        align: 'center',
        onHeaderCell: () => ({
          width: repeatAlarmColumnWidths['time_span_minutes'],
          onResize: handleRepeatAlarmResize('time_span_minutes'),
        }),
        render: (minutes) => (
          <span style={{ color: '#1890ff', fontWeight: 500 }}>
            {formatTimeSpan(minutes)}
          </span>
        ),
        sorter: (a, b) => a.time_span_minutes - b.time_span_minutes,
      },
      {
        title: '操作',
        key: 'action',
        width: repeatAlarmColumnWidths['action'],
        align: 'center',
        onHeaderCell: () => ({
          width: repeatAlarmColumnWidths['action'],
          onResize: handleRepeatAlarmResize('action'),
        }),
        render: (_, record) => (
          <Button
            type="link"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => handleViewRepeatAlarmDetail(record)}
          >
            查看详情
          </Button>
        ),
      },
    ];

    return (
      <div>
        {/* 统计卡片 */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="重复报警总数"
                value={repeatAlarms.length}
                suffix="个"
                valueStyle={{ color: '#cf1322' }}
                prefix={<WarningOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="未办结事件"
                value={repeatAlarms.filter(a => a.pending_count > 0).length}
                suffix="个"
                valueStyle={{ color: '#faad14' }}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="平均报警次数"
                value={(repeatAlarms.reduce((sum, a) => sum + a.repeat_count, 0) / repeatAlarms.length).toFixed(1)}
                suffix="次"
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="极高预警"
                value={repeatAlarms.filter(a => a.warning_level === '极高').length}
                suffix="个"
                valueStyle={{ color: '#ff4d4f' }}
                prefix={<WarningOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* 重复报警表格 */}
        <Card>
          <Table
            columns={repeatAlarmsColumns}
            dataSource={repeatAlarms}
            rowKey="event_uid"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条记录`,
              pageSizeOptions: ['10', '20', '50'],
            }}
            scroll={{ x: 1800 }}
            size="middle"
            components={{
              header: {
                cell: ResizeableTitle,
              },
            }}
          />
        </Card>

        {repeatAlarms.length === 0 && (
          <Card style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ color: '#999', fontSize: '14px' }}>
              暂无重复报警事件
            </div>
          </Card>
        )}
      </div>
    );
  };

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


      {/* Tabs切换 */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        size="large"
        style={{ marginBottom: 0 }}
        items={[
          {
            key: 'all',
            label: (
              <span>
                <ClusterOutlined style={{ marginRight: 4 }} />
                全部聚类
              </span>
            ),
            children: (
              <div>
                {/* 筛选条件标签 */}
                {getFilterTags().length > 0 && (
                  <Card style={{ marginBottom: 16 }}>
                    <div style={{ marginBottom: 8, fontWeight: 'bold', color: '#1890ff' }}>当前筛选条件：</div>
                    <Row gutter={[8, 8]}>
                      {getFilterTags().map(tag => (
                        <Col key={tag.key}>
                          <Tag
                            closable={tag.closable}
                            onClose={tag.onClose}
                            color="blue"
                          >
                            {tag.label}
                          </Tag>
                        </Col>
                      ))}
                      <Col>
                        <Button
                          type="link"
                          size="small"
                          onClick={clearAllFilters}
                          style={{ padding: 0, height: 'auto' }}
                        >
                          清除全部
                        </Button>
                      </Col>
                    </Row>
                  </Card>
                )}

                {/* 聚合事件表格 */}
      <Card>
        {/* 统计信息 */}
        <div style={{ marginBottom: 12, fontSize: 14 }}>
          {getFilterTags().length === 0 ? (
            <span style={{ color: '#666' }}>
              总计 <strong style={{ fontSize: 16, color: '#1890ff' }}>{pagination.total}</strong> 条
            </span>
          ) : (
            <span style={{ color: '#666' }}>
              筛选出 <strong style={{ fontSize: 16, color: '#1890ff' }}>{clusters.length}</strong> 条 / 总计 <strong style={{ fontSize: 16, color: '#1890ff' }}>{pagination.total}</strong> 条
            </span>
          )}
        </div>

        <Table
          columns={columns}
          dataSource={clusters}
          rowKey="EventUID"
          loading={loading}
          pagination={false}
          size="middle"
          components={{
            header: {
              cell: ResizeableTitle,
            },
          }}
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
            ),
          },
          {
            key: 'repeat',
            label: (
              <span>
                <Badge count={repeatAlarms.length} offset={[10, 0]}>
                  <span style={{ paddingRight: 12 }}>
                    <WarningOutlined style={{ marginRight: 4, color: '#ff4d4f' }} />
                    重复报警
                  </span>
                </Badge>
              </span>
            ),
            children: renderRepeatAlarmsList(),
          },
        ]}
      />

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

      {/* 重复报警详情Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <WarningOutlined style={{ marginRight: 8, color: '#ff4d4f' }} />
            <span>重复报警详情</span>
          </div>
        }
        open={repeatAlarmDetailVisible}
        onCancel={() => setRepeatAlarmDetailVisible(false)}
        footer={null}
        width={800}
      >
        {selectedRepeatAlarm && (
          <div>
            {/* 基本信息 */}
            <Card size="small" style={{ marginBottom: 16 }}>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ color: '#666' }}>事件编号：</span>
                    <Tag color="blue" style={{ fontFamily: 'monospace' }}>
                      {selectedRepeatAlarm.event_uid}
                    </Tag>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ color: '#666' }}>报警人：</span>
                    <strong>
                      {selectedRepeatAlarm.name || '未知'} ({selectedRepeatAlarm.phone})
                    </strong>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ color: '#666' }}>所属镇街：</span>
                    <Tag icon={<EnvironmentOutlined />}>{selectedRepeatAlarm.town}</Tag>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ color: '#666' }}>事件类型：</span>
                    <Tag color="purple">{selectedRepeatAlarm.event_type}</Tag>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ color: '#666' }}>事件分类：</span>
                    <Tag color="cyan">{selectedRepeatAlarm.category}</Tag>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ color: '#666' }}>状态：</span>
                    <Tag color={selectedRepeatAlarm.status === '已办结' ? 'success' : 'processing'}>
                      {selectedRepeatAlarm.status}
                    </Tag>
                  </div>
                </Col>
              </Row>
            </Card>

            {/* 事件描述 */}
            <Card size="small" title="事件描述" style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
                {selectedRepeatAlarm.description}
              </div>
            </Card>

            {/* 统计信息 */}
            <Card size="small" title="统计信息" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic
                    title="报警次数"
                    value={selectedRepeatAlarm.repeat_count}
                    suffix="次"
                    valueStyle={{ color: '#fa8c16', fontSize: '24px' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="时间跨度"
                    value={formatTimeSpan(selectedRepeatAlarm.time_span_minutes)}
                    valueStyle={{ color: '#1890ff', fontSize: '20px' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="已办结"
                    value={selectedRepeatAlarm.resolved_count}
                    suffix="个"
                    valueStyle={{ color: '#52c41a', fontSize: '24px' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="未办结"
                    value={selectedRepeatAlarm.pending_count}
                    suffix="个"
                    valueStyle={{ color: '#ff4d4f', fontSize: '24px' }}
                  />
                </Col>
              </Row>
            </Card>

            {/* 时间线信息 */}
            <Card size="small" title="时间线" style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8 }}>
                <ClockCircleOutlined style={{ marginRight: 8, color: '#52c41a' }} />
                <span style={{ color: '#666' }}>首次报警：</span>
                <strong style={{ marginLeft: 8 }}>{selectedRepeatAlarm.first_time}</strong>
              </div>
              <div style={{ marginBottom: 8 }}>
                <ClockCircleOutlined style={{ marginRight: 8, color: '#ff4d4f' }} />
                <span style={{ color: '#666' }}>最后报警：</span>
                <strong style={{ marginLeft: 8 }}>{selectedRepeatAlarm.last_time}</strong>
              </div>
              <div>
                <span style={{ color: '#666' }}>紧急程度：</span>
                {(() => {
                  const urgency = getUrgencyTag(selectedRepeatAlarm.time_span_minutes);
                  return (
                    <Tag color={urgency.color} icon={urgency.icon} style={{ marginLeft: 8 }}>
                      {urgency.text}
                    </Tag>
                  );
                })()}
              </div>
            </Card>

            {/* 相关事件列表 */}
            <Card size="small" title={`相关事件 (${selectedRepeatAlarm.events.length}个)`}>
              <Table
                size="small"
                dataSource={selectedRepeatAlarm.events}
                pagination={false}
                columns={[
                  {
                    title: '序号',
                    key: 'index',
                    width: 60,
                    render: (_, __, index) => index + 1,
                  },
                  {
                    title: '事件编号',
                    dataIndex: 'id',
                    key: 'id',
                    render: (text) => (
                      <Tag color="blue" style={{ fontFamily: 'monospace' }}>
                        {text}
                      </Tag>
                    ),
                  },
                  {
                    title: '报警时间',
                    dataIndex: 'time',
                    key: 'time',
                    render: (text) => (
                      <span>
                        <ClockCircleOutlined style={{ marginRight: 4 }} />
                        {text}
                      </span>
                    ),
                  },
                  {
                    title: '状态',
                    dataIndex: 'status',
                    key: 'status',
                    align: 'center',
                    render: (status) => (
                      <Tag color={status === '已办结' ? 'success' : 'processing'}>
                        {status}
                      </Tag>
                    ),
                  },
                ]}
              />
            </Card>

            {/* 预警提示 */}
            <Alert
              message={`预警级别：${selectedRepeatAlarm.warning_level}`}
              description={`此重复报警被评估为${selectedRepeatAlarm.warning_level}预警级别，建议优先处理。`}
              type={selectedRepeatAlarm.warning_level === '极高' || selectedRepeatAlarm.warning_level === '高' ? 'error' : 'warning'}
              showIcon
              icon={<WarningOutlined />}
              style={{ marginTop: 16 }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ClusterList; 