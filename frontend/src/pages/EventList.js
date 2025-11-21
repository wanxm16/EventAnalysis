import React, { useState, useEffect, useRef } from 'react';
import {
  Table,
  Input,
  Select,
  Button,
  Card,
  Space,
  message,
  Tag,
  Tooltip,
  DatePicker,
  Row,
  Col,
  Alert,
  Modal,
  Form,
  Badge,
  Spin,
  Radio,
} from 'antd';
import { SearchOutlined, EyeOutlined, FilterOutlined, BellOutlined, DeleteOutlined, SettingOutlined, CheckCircleOutlined, PauseCircleOutlined, UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import Highlighter from 'react-highlight-words';
// 图表已迁移到 Topic 统计页面
import { useNavigate } from 'react-router-dom';
import { eventAPI } from '../services/api';
import dayjs from 'dayjs';

const { Option } = Select;

const EventList = () => {
  const navigate = useNavigate();
  
  // 状态管理
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [searchParams, setSearchParams] = useState({});
  const [searchText, setSearchText] = useState('');
  const [searchedColumn, setSearchedColumn] = useState('');
  const searchInput = useRef(null);
  const [columnFilters, setColumnFilters] = useState({});
  const [filterOptions, setFilterOptions] = useState({
    towns: [],
    villages: [],
    levels: [],
    categories: [],
  });

  // 订阅相关状态
  const [subscribeModalVisible, setSubscribeModalVisible] = useState(false);
  const [subscribeForm] = Form.useForm();
  const [subscriptions, setSubscriptions] = useState([]);
  const [manageModalVisible, setManageModalVisible] = useState(false);
  const [newEventNotifications, setNewEventNotifications] = useState([]); // 新事件通知

  // 趋势图数据
  // 事件页不再维护趋势图状态

  // 自定义列展示
  const defaultVisibleKeys = () => {
    // 默认显示除新增两列外的主要列
    const saved = localStorage.getItem('event_list_visible_columns');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return (parsed || []).filter(k => k !== '事件编号' && k !== 'action');
      } catch {}
    }
    return ['事件描述','镇街名称','事件级别','二级分类','上报时间','报警人信息','相关','处置结果'];
  };
  const [visibleColumnKeys, setVisibleColumnKeys] = useState(defaultVisibleKeys());
  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const dragIndexRef = useRef(null);
  
  // 排序状态管理
  const [sortField, setSortField] = useState(null);
  const [sortOrder, setSortOrder] = useState(null);
  
  // 列宽度状态管理
  const [columnWidths, setColumnWidths] = useState({
    '事件编号': 160,
    '事件描述': 200,
    '镇街名称': 100,
    '村社名称': 120,
    '事件级别': 100,
    '二级分类': 120,
    '上报时间': 150,
    '报警人信息': 200,
    '处置结果': 180,
    '相关': 100,
    'action': 100,
  });

  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const fileInputRef = useRef(null);

  const saveVisibleColumns = (keys) => {
    setVisibleColumnKeys(keys);
    try { localStorage.setItem('event_list_visible_columns', JSON.stringify(keys)); } catch {}
  };

  const resetVisibleColumns = () => {
    const keys = defaultVisibleKeys();
    saveVisibleColumns(keys);
  };

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

  // 处理列宽度变化
  const handleResize = (key) => (width) => {
    setColumnWidths(prev => ({
      ...prev,
      [key]: width
    }));
  };

  // 解析搜索输入：空格分词，前缀-为排除
  const parseSearchInput = (input) => {
    const tokens = (input || '')
      .split(/\s+/)
      .map(t => t.trim())
      .filter(Boolean);
    const include = [];
    const exclude = [];
    for (const t of tokens) {
      if (t.startsWith('-') && t.length > 1) exclude.push(t.slice(1));
      else include.push(t);
    }
    return { include, exclude };
  };

  // 获取列搜索属性
  const getColumnSearchProps = (dataIndex, placeholder, apiParam) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8, width: 320 }} onKeyDown={(e) => e.stopPropagation()}>
        {(() => {
          let state = { include: [], exclude: [], logic: 'and', excludeLogic: 'or' };
          try {
            if (selectedKeys && selectedKeys[0]) {
              state = JSON.parse(selectedKeys[0]);
              // 兼容旧数据，如果没有 logic 字段，默认为 'and'
              if (!state.logic) state.logic = 'and';
              if (!state.excludeLogic) state.excludeLogic = 'or';
            }
          } catch {}
          const update = (next) => {
            const merged = {
              include: next.include ?? state.include,
              exclude: next.exclude ?? state.exclude,
              logic: next.logic ?? state.logic,
              excludeLogic: next.excludeLogic ?? state.excludeLogic
            };
            setSelectedKeys([JSON.stringify(merged)]);
          };
          return (
            <div>
              {/* 包含关键词输入框标题 */}
              <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>包含关键词（回车添加）</div>

              {/* 包含关键词 AND/OR 逻辑选择 - 默认显示在输入框上方 */}
              <div style={{ marginBottom: 8, paddingLeft: 4 }}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>包含逻辑：</div>
                <Radio.Group
                  value={state.logic}
                  onChange={(e) => update({ logic: e.target.value })}
                  size="small"
                >
                  <Radio value="and">AND（同时包含）</Radio>
                  <Radio value="or">OR（包含任一）</Radio>
                </Radio.Group>
              </div>

              {/* 包含关键词输入框 */}
              <Select
                mode="tags"
                style={{ width: '100%', marginBottom: 12 }}
                value={state.include}
                onChange={(vals) => update({ include: vals })}
                open={false}
                placeholder={placeholder || '如：离婚 酒店'}
              />

              {/* 排除关键词输入框标题 */}
              <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>排除关键词（回车添加）</div>

              {/* 排除关键词 AND/OR 逻辑选择 - 默认显示在输入框上方 */}
              <div style={{ marginBottom: 8, paddingLeft: 4 }}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>排除逻辑：</div>
                <Radio.Group
                  value={state.excludeLogic}
                  onChange={(e) => update({ excludeLogic: e.target.value })}
                  size="small"
                >
                  <Radio value="and">AND（同时排除）</Radio>
                  <Radio value="or">OR（排除任一）</Radio>
                </Radio.Group>
              </div>

              {/* 排除关键词输入框 */}
              <Select
                mode="tags"
                style={{ width: '100%', marginBottom: 12 }}
                value={state.exclude}
                onChange={(vals) => update({ exclude: vals })}
                open={false}
                placeholder={'如：交通 群体'}
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
              <div style={{ marginTop: 8, fontSize: 11, color: '#999' }}>
                提示：可添加多个包含/排除词，支持 AND/OR 逻辑
              </div>
            </div>
          );
        })()}
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
    filteredValue: columnFilters[apiParam] ? [columnFilters[apiParam]] : null,
  });

  // 简单文本搜索属性（仅设置单一 search，不使用 include/exclude）
  const getSimpleSearchProps = (dataIndex, placeholder) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
        <Input
          ref={searchInput}
          placeholder={placeholder}
          value={selectedKeys[0]}
          onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => handleSimpleSearch(selectedKeys, confirm, dataIndex)}
          style={{ marginBottom: 8, display: 'block' }}
        />
        <Space>
          <Button type="primary" onClick={() => handleSimpleSearch(selectedKeys, confirm, dataIndex)} icon={<SearchOutlined />} size="small" style={{ width: 90 }}>搜索</Button>
          <Button onClick={() => handleColumnFilterReset(clearFilters, 'search')} size="small" style={{ width: 90 }}>重置</Button>
        </Space>
      </div>
    ),
    filterIcon: () => (
      <SearchOutlined style={{ color: columnFilters['search'] ? '#1890ff' : undefined }} />
    ),
    onFilterDropdownOpenChange: (visible) => {
      if (visible) {
        setTimeout(() => searchInput.current?.select(), 100);
      }
    },
    render: (text) => (
      searchedColumn === dataIndex ? (
        <Highlighter
          highlightStyle={{ backgroundColor: '#ffc069', padding: 0 }}
          searchWords={[searchText]}
          autoEscape
          textToHighlight={text ? text.toString() : ''}
        />
      ) : (
        text
      )
    ),
    filteredValue: columnFilters['search'] ? [columnFilters['search']] : null,
  });

  const handleSimpleSearch = (selectedKeys, confirm, dataIndex) => {
    confirm();
    const value = selectedKeys[0] || '';
    setSearchText(value);
    setSearchedColumn(dataIndex);
    const newColumnFilters = { ...columnFilters };
    if (value) newColumnFilters['search'] = value; else delete newColumnFilters['search'];
    setColumnFilters(newColumnFilters);
    const newParams = { ...searchParams };
    if (value) newParams.search = value; else delete newParams.search;
    // 清除 include/exclude
    delete newParams.include;
    delete newParams.exclude;
    setSearchParams(newParams);
    setPagination(prev => ({ ...prev, current: 1 }));
    loadEvents({ page: 1, ...newParams });
  };

  // 获取列筛选属性（支持多选）
  const getColumnFilterProps = (dataIndex, options, placeholder, apiParam) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8 }}>
        <Select
          mode="multiple"
          placeholder={placeholder}
          value={selectedKeys}
          onChange={(values) => setSelectedKeys(values || [])}
          style={{ width: 260, marginBottom: 8, display: 'block' }}
          allowClear
          showSearch
          maxTagCount="responsive"
        >
          {options.map(option => (
            <Option key={option} value={option}>{option}</Option>
          ))}
        </Select>
        <Space>
          <Button
            type="primary"
            onClick={() => handleColumnFilterMultiple(selectedKeys, confirm, apiParam)}
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
    filteredValue: Array.isArray(columnFilters[apiParam]) ? columnFilters[apiParam] : null,
  });

  // 获取相关事件筛选属性
  const getRelatedEventsFilterProps = () => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8 }}>
        <Select
          placeholder="选择相关事件数量"
          value={selectedKeys[0]}
          onChange={(value) => setSelectedKeys(value ? [value] : [])}
          style={{ width: 200, marginBottom: 8, display: 'block' }}
          allowClear
        >
          <Option value="0">无关联事件</Option>
          <Option value="1">1个关联事件</Option>
          <Option value="2-5">2-5个关联事件</Option>
          <Option value="5+">5个以上关联事件</Option>
        </Select>
        <Space>
          <Button
            type="primary"
            onClick={() => handleColumnFilter(selectedKeys, confirm, 'related_events')}
            icon={<FilterOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            筛选
          </Button>
          <Button
            onClick={() => handleColumnFilterReset(clearFilters, 'related_events')}
            size="small"
            style={{ width: 90 }}
          >
            重置
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered) => (
      <FilterOutlined style={{ color: columnFilters['related_events'] ? '#1890ff' : undefined }} />
    ),
    filteredValue: columnFilters['related_events'] ? [columnFilters['related_events']] : null,
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
          showTime
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
    filteredValue: columnFilters[apiParam] ? [columnFilters[apiParam]] : null,
  });

  // 处理列搜索
  const handleColumnSearch = (selectedKeys, confirm, dataIndex) => {
    confirm();
    setSearchText(selectedKeys[0]);
    setSearchedColumn(dataIndex);
  };

  // 处理列搜索筛选（与API集成）
  const handleColumnSearchFilter = (selectedKeys, confirm, dataIndex, apiParam) => {
    confirm();
    const raw = selectedKeys && selectedKeys[0];
    let include = [], exclude = [];
    if (raw) {
      try {
        const obj = JSON.parse(raw);
        include = Array.isArray(obj.include) ? obj.include : [];
        exclude = Array.isArray(obj.exclude) ? obj.exclude : [];
      } catch {
        const parsed = parseSearchInput(String(raw));
        include = parsed.include; exclude = parsed.exclude;
      }
    }
    const display = [
      ...(include || []),
      ...((exclude || []).map(x => `-${x}`))
    ].join(' ');
    setSearchText(display);
    setSearchedColumn(dataIndex);

    const newColumnFilters = { ...columnFilters };
    // 保存原始JSON格式用于filteredValue回显
    if (include.length > 0 || exclude.length > 0) {
      newColumnFilters[apiParam] = JSON.stringify({ include, exclude });
    } else {
      delete newColumnFilters[apiParam];
    }
    setColumnFilters(newColumnFilters);

    const newParams = { ...searchParams };
    // 清理单一 search（事件编号）不会影响本列
    if (apiParam === 'search_desc') {
      // 描述关键词（独立）
      if (include.length > 0) newParams.include_desc = include; else delete newParams.include_desc;
      if (exclude.length > 0) newParams.exclude_desc = exclude; else delete newParams.exclude_desc;
    } else if (apiParam === 'search_result') {
      // 处置结果关键词（独立）
      if (include.length > 0) newParams.include_result = include; else delete newParams.include_result;
      if (exclude.length > 0) newParams.exclude_result = exclude; else delete newParams.exclude_result;
    } else {
      // 兼容旧用法
      if (include.length > 0) newParams.include = include; else delete newParams.include;
      if (exclude.length > 0) newParams.exclude = exclude; else delete newParams.exclude;
    }
    setSearchParams(newParams);
    setPagination(prev => ({ ...prev, current: 1 }));
    loadEvents({ page: 1, ...newParams });
  };

  // 处理列重置
  const handleColumnReset = (clearFilters) => {
    clearFilters();
    setSearchText('');
  };

  // 处理列筛选（多选）
  const handleColumnFilterMultiple = (selectedKeys, confirm, apiParam) => {
    confirm();
    const values = Array.isArray(selectedKeys) ? selectedKeys : [];
    
    // 更新列筛选状态
    const newColumnFilters = { ...columnFilters };
    if (values.length) {
      newColumnFilters[apiParam] = values;
    } else {
      delete newColumnFilters[apiParam];
    }
    setColumnFilters(newColumnFilters);
    
    // 更新搜索参数并重新加载数据
    const newParams = { ...searchParams, ...newColumnFilters };
    setSearchParams(newParams);
    setPagination(prev => ({ ...prev, current: 1 }));
    loadEvents({ page: 1, ...newParams });
  };

  // 处理单选筛选（用于相关事件数量等场景，保持兼容）
  const handleColumnFilter = (selectedKeys, confirm, apiParam) => {
    confirm();
    const value = selectedKeys && selectedKeys[0];

    const newColumnFilters = { ...columnFilters };
    if (value) newColumnFilters[apiParam] = value; else delete newColumnFilters[apiParam];
    setColumnFilters(newColumnFilters);

    const newParams = { ...searchParams, ...newColumnFilters };
    setSearchParams(newParams);
    setPagination(prev => ({ ...prev, current: 1 }));
    loadEvents({ page: 1, ...newParams });
  };


  // 处理日期筛选
  const handleDateFilter = (selectedKeys, confirm, apiParam) => {
    confirm();
    const dateRange = selectedKeys[0];

    // 更新列筛选状态
    const newColumnFilters = { ...columnFilters };
    if (dateRange && (dateRange[0] || dateRange[1])) {
      newColumnFilters[apiParam] = dateRange; // 保存原始日期范围用于显示
    } else {
      delete newColumnFilters[apiParam];
    }
    setColumnFilters(newColumnFilters);

    // 更新搜索参数并重新加载数据
    const newParams = { ...searchParams };

    // 清除之前的日期筛选参数
    delete newParams[`${apiParam}_start`];
    delete newParams[`${apiParam}_end`];
    delete newParams['start_time'];
    delete newParams['end_time'];
    delete newParams['report_time_start'];
    delete newParams['report_time_end'];

    if (dateRange) {
      const [start, end] = dateRange;
      // 根据API参数类型设置正确的参数名
      if (apiParam === 'report_time') {
        if (start) {
          newParams['start_time'] = start.format('YYYY-MM-DD HH:mm:ss');
        }
        if (end) {
          newParams['end_time'] = end.format('YYYY-MM-DD HH:mm:ss');
        }
      } else {
        if (start) {
          newParams[`${apiParam}_start`] = start.format('YYYY-MM-DD');
        }
        if (end) {
          newParams[`${apiParam}_end`] = end.format('YYYY-MM-DD');
        }
      }
    }

    setSearchParams(newParams);
    setPagination(prev => ({ ...prev, current: 1 }));
    loadEvents({ page: 1, ...newParams });
  };

  // 处理列筛选重置
  const handleColumnFilterReset = (clearFilters, apiParam) => {
    clearFilters();
    
    // 更新列筛选状态
    const newColumnFilters = { ...columnFilters };
    delete newColumnFilters[apiParam];
    setColumnFilters(newColumnFilters);
    
    // 更新搜索参数并重新加载数据
    const newParams = { ...searchParams };
    delete newParams[apiParam];
    delete newParams[`${apiParam}_start`];
    delete newParams[`${apiParam}_end`];
    if (apiParam === 'search' || apiParam === 'search_desc' || apiParam === 'search_result') {
      delete newParams.include;
      delete newParams.exclude;
      delete newParams.include_desc;
      delete newParams.exclude_desc;
      delete newParams.include_result;
      delete newParams.exclude_result;
    }
    
    // 特殊处理日期参数
    if (apiParam === 'report_time') {
      delete newParams['start_time'];
      delete newParams['end_time'];
      delete newParams['report_time_start'];
      delete newParams['report_time_end'];
    }
    
    setSearchParams(newParams);
    setPagination(prev => ({ ...prev, current: 1 }));
    loadEvents({ page: 1, ...newParams });
  };

  // 表格列定义
  const columns = [
    {
      title: '事件编号',
      dataIndex: '事件编号',
      key: '事件编号',
      width: columnWidths['事件编号'],
      resizable: true,
      onHeaderCell: () => ({
        width: columnWidths['事件编号'],
        onResize: handleResize('事件编号'),
      }),
      ...getSimpleSearchProps('事件编号', '搜索事件编号'),
      render: (text) => 
        searchedColumn === '事件编号' ? (
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
            <span style={{ fontSize: '12px' }}>{text}</span>
          </Tooltip>
        ),
    },
    {
      title: '事件描述',
      dataIndex: '事件描述',
      key: '事件描述',
      width: columnWidths['事件描述'],
      resizable: true,
      onHeaderCell: () => ({
        width: columnWidths['事件描述'],
        onResize: handleResize('事件描述'),
      }),
      ...getColumnSearchProps('事件描述', '搜索事件描述', 'search_desc'),
      ellipsis: {
        showTitle: false,
      },
      render: (text) => 
        searchedColumn === '事件描述' ? (
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
            <span>{text}</span>
          </Tooltip>
        ),
    },
    {
      title: '镇街名称',
      dataIndex: '镇街名称',
      key: '镇街名称',
      width: columnWidths['镇街名称'],
      resizable: true,
      onHeaderCell: () => ({
        width: columnWidths['镇街名称'],
        onResize: handleResize('镇街名称'),
      }),
      ...getColumnFilterProps('镇街名称', filterOptions.towns, '选择镇街名称', 'town'),
    },
    {
      title: '村社名称',
      dataIndex: '村社名称',
      key: '村社名称',
      width: columnWidths['村社名称'],
      resizable: true,
      onHeaderCell: () => ({
        width: columnWidths['村社名称'],
        onResize: handleResize('村社名称'),
      }),
      ...getColumnFilterProps('村社名称', filterOptions.villages || [], '选择村社名称', 'village'),
      ellipsis: true,
      render: (text) => text || '-',
    },
    {
      title: '事件级别',
      dataIndex: '事件级别',
      key: '事件级别',
      width: columnWidths['事件级别'],
      resizable: true,
      onHeaderCell: () => ({
        width: columnWidths['事件级别'],
        onResize: handleResize('事件级别'),
      }),
      ...getColumnFilterProps('事件级别', filterOptions.levels, '选择事件级别', 'level'),
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
      width: columnWidths['二级分类'],
      resizable: true,
      onHeaderCell: () => ({
        width: columnWidths['二级分类'],
        onResize: handleResize('二级分类'),
      }),
      ...getColumnFilterProps('二级分类', filterOptions.categories, '选择二级分类', 'category'),
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
      width: columnWidths['上报时间'],
      resizable: true,
      onHeaderCell: () => ({
        width: columnWidths['上报时间'],
        onResize: handleResize('上报时间'),
      }),
      sorter: true,
      ...getDateFilterProps('上报时间', 'report_time'),
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
            
            // 处理特殊格式 "5/1/25 8:20" 表示 2025年5月1日 8:20（月/日/年）
            const match = timeStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})\s+(\d{1,2}):(\d{2})$/);
            if (match) {
              const [, month, day, year, hour, minute] = match;
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
      dataIndex: '报警人信息',
      key: '报警人信息',
      width: columnWidths['报警人信息'],
      resizable: true,
      onHeaderCell: () => ({
        width: columnWidths['报警人信息'],
        onResize: handleResize('报警人信息'),
      }),
      ellipsis: {
        showTitle: false,
      },
      render: (text) => {
        if (!text) return '-';
        return (
          <Tooltip title={text}>
            <div style={{ fontSize: '12px', lineHeight: '16px' }}>
              {text}
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: '处置结果',
      dataIndex: '处置结果',
      key: '处置结果',
      width: columnWidths['处置结果'],
      resizable: true,
      onHeaderCell: () => ({
        width: columnWidths['处置结果'],
        onResize: handleResize('处置结果'),
      }),
      ...getColumnSearchProps('处置结果', '搜索处置结果', 'search_result'),
      ellipsis: { showTitle: false },
      render: (text) => (
        <Tooltip title={text}>
          <span>{text || '-'}</span>
        </Tooltip>
      ),
    },
    {
      title: '相关事件',
      key: '相关',
      width: columnWidths['相关'],
      resizable: true,
      onHeaderCell: () => ({
        width: columnWidths['相关'],
        onResize: handleResize('相关'),
      }),
      ...getRelatedEventsFilterProps(),
      render: (_, record) => {
        if (record.相关事件 && record.相关事件 > 0) {
          return (
            <Tag color="blue">
              {record.相关事件} 个关联
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

  // 根据选择过滤列，并按用户选择顺序排列（固定：事件编号在最前，操作在最后）
  const orderedColumns = () => {
    const map = Object.fromEntries(columns.map(c => [c.key, c]));
    const middle = visibleColumnKeys
      .filter(k => k !== '事件编号' && k !== 'action')
      .filter(k => map[k]);
    const result = [];
    if (map['事件编号']) result.push(map['事件编号']);
    result.push(...middle.map(k => map[k]));
    if (map['action']) result.push(map['action']);
    return result;
  };

  // 加载事件列表
  const loadEvents = async (params = {}) => {
    setLoading(true);
    try {
      const response = await eventAPI.getEvents({
        page: pagination.current,
        page_size: pagination.pageSize,
        ...searchParams,
        sort_field: sortField,
        sort_order: sortOrder,
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

  const buildExportParams = () => {
    const params = { ...searchParams };
    if (sortField) params.sort_field = sortField;
    if (sortOrder) params.sort_order = sortOrder;
    delete params.search_desc;
    delete params.search_result;
    delete params.report_time;
    return params;
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      setImporting(true);
      const result = await eventAPI.importEvents(file);
      message.success(`导入成功，新增/更新 ${result?.imported ?? 0} 条事件`);
      setPagination(prev => ({ ...prev, current: 1 }));
      await loadEvents({ page: 1 });
      await loadFilterOptions();
    } catch (error) {
      const detail = error?.response?.data?.detail || error.message;
      message.error(`导入失败: ${detail}`);
    } finally {
      setImporting(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleExport = () => {
    setExportModalVisible(true);
  };

  const confirmExport = async (desensitized) => {
    try {
      setExporting(true);
      setExportModalVisible(false);
      const params = buildExportParams();
      // 添加脱敏参数（前端模拟，实际需要后端支持）
      params.desensitized = desensitized;
      const blob = await eventAPI.exportEvents(params);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = dayjs().format('YYYYMMDD_HHmmss');
      const suffix = desensitized ? '_脱敏' : '_非脱敏';
      link.href = url;
      link.download = `事件列表${suffix}_${timestamp}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      message.success(`导出成功（${desensitized ? '脱敏' : '非脱敏'}）`);
    } catch (error) {
      const detail = error?.response?.data?.detail || error.message;
      message.error(`导出失败: ${detail}`);
    } finally {
      setExporting(false);
    }
  };

  // 事件页不再加载趋势


  // 处理分页变化和排序
  const handleTableChange = (pagination, filters, sorter) => {
    setPagination(pagination);
    
    // 处理排序
    let newSortField = null;
    let newSortOrder = null;
    
    if (sorter && sorter.field) {
      newSortField = sorter.field;
      newSortOrder = sorter.order === 'ascend' ? 'asc' : 'desc';
    }
    
    setSortField(newSortField);
    setSortOrder(newSortOrder);
    
    loadEvents({
      page: pagination.current,
      page_size: pagination.pageSize,
      sort_field: newSortField,
      sort_order: newSortOrder,
    });
  };

  // 查看详情
  const handleViewDetail = (record) => {
    navigate(`/events/${record.事件编号}`);
  };

  // 获取当前筛选条件的标签
  const getFilterTags = () => {
    const tags = [];
    
    // 搜索文本（独立）
    if (columnFilters.search_desc) {
      try {
        const parsed = JSON.parse(columnFilters.search_desc);
        const include = parsed.include || [];
        const exclude = parsed.exclude || [];
        const display = [
          ...include,
          ...exclude.map(x => `-${x}`)
        ].join(' ');
        if (display) {
          tags.push({ key: 'search_desc', label: '描述关键词', value: display, color: 'blue' });
        }
      } catch {
        // 向后兼容，如果不是JSON格式就直接显示
        tags.push({ key: 'search_desc', label: '描述关键词', value: columnFilters.search_desc, color: 'blue' });
      }
    }
    if (columnFilters.search_result) {
      try {
        const parsed = JSON.parse(columnFilters.search_result);
        const include = parsed.include || [];
        const exclude = parsed.exclude || [];
        const display = [
          ...include,
          ...exclude.map(x => `-${x}`)
        ].join(' ');
        if (display) {
          tags.push({ key: 'search_result', label: '处置关键词', value: display, color: 'geekblue' });
        }
      } catch {
        // 向后兼容，如果不是JSON格式就直接显示
        tags.push({ key: 'search_result', label: '处置关键词', value: columnFilters.search_result, color: 'geekblue' });
      }
    }
    
    // 镇街名称
    if (columnFilters.town) {
      tags.push({
        key: 'town',
        label: '镇街',
        value: Array.isArray(columnFilters.town) ? columnFilters.town.join('、') : columnFilters.town,
        color: 'green'
      });
    }
    
    // 事件级别
    if (columnFilters.level) {
      tags.push({
        key: 'level',
        label: '级别',
        value: Array.isArray(columnFilters.level) ? columnFilters.level.join('、') : columnFilters.level,
        color: 'orange'
      });
    }
    
    // 二级分类
    if (columnFilters.category) {
      tags.push({
        key: 'category',
        label: '分类',
        value: Array.isArray(columnFilters.category) ? columnFilters.category.join('、') : columnFilters.category,
        color: 'purple'
      });
    }
    
    // 相关事件
    if (columnFilters.related_events) {
      const relatedEventsMap = {
        '0': '无关联事件',
        '1': '1个关联事件',
        '2-5': '2-5个关联事件',
        '5+': '5个以上关联事件'
      };
      tags.push({
        key: 'related_events',
        label: '关联',
        value: relatedEventsMap[columnFilters.related_events] || columnFilters.related_events,
        color: 'cyan'
      });
    }
    
    // 日期筛选
    if (columnFilters.report_time && Array.isArray(columnFilters.report_time)) {
      const [start, end] = columnFilters.report_time;
      let value = '';
      if (start && end) {
        value = `${start.format('MM-DD')} 至 ${end.format('MM-DD')}`;
      } else if (start) {
        value = `从 ${start.format('MM-DD')} 开始`;
      } else if (end) {
        value = `截至 ${end.format('MM-DD')}`;
      }
      tags.push({
        key: 'report_time',
        label: '上报时间',
        value: value,
        color: 'volcano'
      });
    }
    
    return tags;
  };
  
  // 移除筛选标签
  const removeFilterTag = (tagKey) => {
    const newColumnFilters = { ...columnFilters };
    delete newColumnFilters[tagKey];
    setColumnFilters(newColumnFilters);
    
    // 更新搜索参数
    const newParams = { ...searchParams };
    delete newParams[tagKey];
    
    // 特殊处理日期参数
    if (tagKey === 'report_time') {
      delete newParams['start_time'];
      delete newParams['end_time'];
    }

    // 清理相应的 include/exclude 参数
    if (tagKey === 'search_desc') {
      delete newParams.include_desc;
      delete newParams.exclude_desc;
    } else if (tagKey === 'search_result') {
      delete newParams.include_result;
      delete newParams.exclude_result;
    } else if (tagKey === 'search') {
      delete newParams.include;
      delete newParams.exclude;
    }
    
    setSearchParams(newParams);
    setPagination(prev => ({ ...prev, current: 1 }));
    loadEvents({ page: 1, ...newParams });
  };
  
  // 清除所有筛选条件
  const clearAllFilters = () => {
    setColumnFilters({});
    setSearchParams({});
    setSearchText('');
    setSearchedColumn('');
    setPagination(prev => ({ ...prev, current: 1 }));
    loadEvents({ page: 1 });
  };
  
  // 处理订阅
  const handleSubscribe = async () => {
    try {
      const values = await subscribeForm.validateFields();
      const filterTags = getFilterTags();
      
      if (filterTags.length === 0) {
        message.warning('请先设置筛选条件');
        return;
      }
      
      // 调用API创建订阅
      const response = await fetch('http://localhost:8000/api/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: values.name,
          description: values.description || '无描述',
          filters: columnFilters,
          searchParams: searchParams,
          tags: filterTags
        })
      });
      
      if (!response.ok) {
        throw new Error('创建订阅失败');
      }
      
      const newSubscription = await response.json();
      
      // 更新本地状态
      setSubscriptions(prev => [...prev, newSubscription]);
      
      message.success(`已成功创建订阅「${values.name}」，系统将会监控符合条件的新事件。`);
      
      setSubscribeModalVisible(false);
      subscribeForm.resetFields();
      
    } catch (error) {
      console.error('订阅失败:', error);
      message.error('创建订阅失败: ' + error.message);
    }
  };
  
  // 加载订阅列表
  const loadSubscriptions = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/subscriptions');
      if (response.ok) {
        const data = await response.json();
        setSubscriptions(data.subscriptions || []);
      }
    } catch (error) {
      console.error('加载订阅列表失败:', error);
      // 降级到本地存储
      const savedSubscriptions = JSON.parse(localStorage.getItem('event_subscriptions') || '[]');
      setSubscriptions(savedSubscriptions);
    }
  };
  
  // 删除订阅
  const deleteSubscription = async (subscriptionId) => {
    try {
      const response = await fetch(`http://localhost:8000/api/subscriptions/${subscriptionId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('删除订阅失败');
      }
      
      // 更新本地状态
      setSubscriptions(prev => prev.filter(sub => sub.id !== subscriptionId));
      message.success('订阅已删除');
      
    } catch (error) {
      console.error('删除订阅失败:', error);
      message.error('删除订阅失败: ' + error.message);
    }
  };
  
  // 切换订阅状态
  const toggleSubscription = async (subscriptionId) => {
    try {
      const subscription = subscriptions.find(sub => sub.id === subscriptionId);
      if (!subscription) return;
      
      const response = await fetch(`http://localhost:8000/api/subscriptions/${subscriptionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enabled: !subscription.enabled
        })
      });
      
      if (!response.ok) {
        throw new Error('更新订阅状态失败');
      }
      
      const updatedSubscription = await response.json();
      
      // 更新本地状态
      setSubscriptions(prev => 
        prev.map(sub => 
          sub.id === subscriptionId ? updatedSubscription : sub
        )
      );
      
      message.success('订阅状态已更新');
      
    } catch (error) {
      console.error('更新订阅状态失败:', error);
      message.error('更新订阅状态失败: ' + error.message);
    }
  };
  
  // 应用订阅筛选条件
  const applySubscriptionFilters = (subscription) => {
    // 设置筛选条件
    setColumnFilters(subscription.filters);
    setSearchParams(subscription.searchParams);
    
    // 重新加载数据
    setPagination(prev => ({ ...prev, current: 1 }));
    loadEvents({ page: 1, ...subscription.searchParams });
    
    // 关闭管理模态框
    setManageModalVisible(false);
    
    message.success(`已应用订阅「${subscription.name}」的筛选条件`);
  };

  // 获取特定订阅的通知
  const getSubscriptionNotifications = (subscriptionId) => {
    return newEventNotifications.filter(notification => 
      notification.subscriptionId === subscriptionId
    ).slice(0, 3); // 只显示最近3条
  };

  // 清除特定订阅的通知
  const clearSubscriptionNotifications = (subscriptionId) => {
    setNewEventNotifications(prev => 
      prev.filter(notification => notification.subscriptionId !== subscriptionId)
    );
  };

  // 检查订阅匹配的新事件
  const checkSubscriptionMatches = async (changes) => {
    if (!subscriptions.length || changes.raw_change <= 0) return;
    
    try {
      const subscriptionNotifications = {};
      
      for (const subscription of subscriptions) {
        if (!subscription.enabled) continue;
        
        // 构建API查询参数
        const params = new URLSearchParams({
          page: '1',
          page_size: '1', // 只需要知道总数
          ...subscription.searchParams
        });
        
        const response = await fetch(`http://localhost:8000/api/events?${params}`);
        if (response.ok) {
          const data = await response.json();
          if (data.total > 0) {
            // 为每个订阅创建单独的通知
            subscriptionNotifications[subscription.id] = {
              id: Date.now() + Math.random(),
              subscriptionId: subscription.id,
              subscriptionName: subscription.name,
              newEventCount: changes.raw_change,
              matchedCount: data.total,
              timestamp: new Date().toLocaleString()
            };
          }
        }
      }
      
      // 保存每个订阅的通知信息
      if (Object.keys(subscriptionNotifications).length > 0) {
        const allNotifications = Object.values(subscriptionNotifications);
        setNewEventNotifications(prev => [...allNotifications, ...prev.slice(0, 10)]); // 保留最近10条
        
        // 显示简单的总体通知
        message.info(`发现 ${changes.raw_change} 个新事件，匹配 ${Object.keys(subscriptionNotifications).length} 个订阅条件`);
      }
      
    } catch (error) {
      console.error('检查订阅匹配失败:', error);
    }
  };


  // =============== 原有函数 ===============

  // 数据刷新功能
  const reloadData = async () => {
    try {
      setLoading(true);
      
      // 调用后端数据重新加载API
      const response = await fetch('http://localhost:8000/api/reload-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('数据刷新失败');
      }
      
      const result = await response.json();
      
      // 重新加载当前页面的事件数据
      await loadEvents({ page: pagination.current, ...searchParams });
      
      // 重新加载筛选选项
      await loadFilterOptions();
      
      // 检查订阅匹配的新事件
      await checkSubscriptionMatches(result.changes);
      
      // 显示刷新结果
      const changes = result.changes;
      const hasChanges = changes.raw_change !== 0 || changes.detail_change !== 0 || changes.cluster_change !== 0;
      
      if (hasChanges) {
        message.success({
          content: `数据刷新成功！原始事件: ${changes.raw_change > 0 ? '+' : ''}${changes.raw_change}`,
          duration: 3,
        });
      } else {
        message.info('数据刷新成功，没有发现新数据');
      }
      
    } catch (error) {
      console.error('数据刷新失败:', error);
      message.error('数据刷新失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // 组件挂载时加载数据
  useEffect(() => {
    loadEvents();
    loadFilterOptions();
    loadSubscriptions();
  }, []);

  // 当筛选条件改变时，刷新趋势（与表格保持一致）
  // 事件页不再随筛选刷新趋势

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="page-title" style={{ margin: 0 }}>事件列表</h1>
        <Space>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExport}
            loading={exporting}
            disabled={exporting}
          >
            导出结果
          </Button>
        </Space>
      </div>


      {/* 筛选条件标签和订阅按钮 */}
      {getFilterTags().length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <Row justify="space-between" align="top">
            <Col flex="auto">
              <div style={{ marginBottom: 8 }}>
                <span style={{ color: '#666', marginRight: 8 }}>当前筛选条件:</span>
              </div>
              <Space size={[8, 8]} wrap>
                {getFilterTags().map(tag => (
                  <Tag
                    key={tag.key}
                    color={tag.color}
                    closable
                    onClose={() => removeFilterTag(tag.key)}
                    style={{ marginBottom: 0 }}
                  >
                    <strong>{tag.label}:</strong> {tag.value}
                  </Tag>
                ))}
                <Button
                  type="link"
                  size="small"
                  onClick={clearAllFilters}
                  style={{ padding: 0, height: 'auto' }}
                >
                  清除全部
                </Button>
              </Space>
            </Col>
            <Col>
              <Button
                type="primary"
                icon={<BellOutlined />}
                onClick={() => setSubscribeModalVisible(true)}
                style={{ marginLeft: 16 }}
              >
                订阅查询
              </Button>
            </Col>
          </Row>
        </Card>
      )}
      

      {/* 事件列表表格 */}
      <Card>
        {/* 趋势图已移动到主题统计页面 */}
        {/* 自定义列控制 */}
        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={() => setColumnModalOpen(true)} icon={<SettingOutlined />}>自定义列</Button>
        </div>
        <Table
          columns={orderedColumns()}
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
          showSorterTooltip={false}
          components={{
            header: {
              cell: ResizeableTitle,
            },
          }}
        />
      </Card>

      {/* 自定义列模态框 */}
      <Modal
        title="自定义显示的列"
        open={columnModalOpen}
        onCancel={() => setColumnModalOpen(false)}
        onOk={() => { saveVisibleColumns(visibleColumnKeys); setColumnModalOpen(false); }}
        footer={[
          <Button key="reset" onClick={resetVisibleColumns}>恢复默认</Button>,
          <Button key="cancel" onClick={() => setColumnModalOpen(false)}>取消</Button>,
          <Button key="ok" type="primary" onClick={() => { saveVisibleColumns(visibleColumnKeys); setColumnModalOpen(false); }}>确定</Button>,
        ]}
      >
        <div style={{ marginBottom: 8, color: '#666' }}>勾选需要显示的列（可多选）：</div>
        <Select
          mode="multiple"
          value={visibleColumnKeys}
          onChange={setVisibleColumnKeys}
          style={{ width: '100%' }}
          options={(() => {
            const opts = columns
              .filter(c => c.key !== '事件编号' && c.key !== 'action')
              .map(c => ({ label: c.title, value: c.key }));
            // 未选中的排前面
            return opts.sort((a, b) => {
              const aSel = visibleColumnKeys.includes(a.value);
              const bSel = visibleColumnKeys.includes(b.value);
              if (aSel === bSel) return 0;
              return aSel ? 1 : -1;
            });
          })()}
        />
        <div style={{ marginTop: 12, color: '#666' }}>拖拽下方项目以调整显示顺序：</div>
        <div
          style={{
            border: '1px dashed #d9d9d9',
            padding: 8,
            borderRadius: 4,
            minHeight: 48,
            marginTop: 8,
          }}
          onDragOver={(e) => e.preventDefault()}
        >
          {visibleColumnKeys.map((k, idx) => (
            <div
              key={k}
              draggable
              onDragStart={() => { dragIndexRef.current = idx; }}
              onDrop={(e) => {
                e.preventDefault();
                const from = dragIndexRef.current;
                const to = idx;
                if (from === null || from === undefined || from === to) return;
                const next = [...visibleColumnKeys];
                const [moved] = next.splice(from, 1);
                next.splice(to, 0, moved);
                setVisibleColumnKeys(next);
                dragIndexRef.current = null;
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 8px',
                margin: 4,
                border: '1px solid #e5e7eb',
                borderRadius: 4,
                background: '#fafafa',
                cursor: 'grab',
                userSelect: 'none',
              }}
              title="拖拽以排序"
            >
              <span style={{ color: '#999', fontSize: 12, letterSpacing: 1 }}>≡</span>
              <span>{(columns.find(c => c.key === k) || {}).title || k}</span>
            </div>
          ))}
          {visibleColumnKeys.length === 0 && (
            <div style={{ color: '#999', fontSize: 12 }}>未选择任何列</div>
          )}
        </div>
      </Modal>
      
      {/* 订阅模态框 */}
      <Modal
        title="创建事件订阅"
        open={subscribeModalVisible}
        onOk={handleSubscribe}
        onCancel={() => {
          setSubscribeModalVisible(false);
          subscribeForm.resetFields();
        }}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontWeight: 'bold' }}>当前筛选条件:</div>
          <Space size={[8, 8]} wrap>
            {getFilterTags().map(tag => (
              <Tag key={tag.key} color={tag.color}>
                <strong>{tag.label}:</strong> {tag.value}
              </Tag>
            ))}
          </Space>
          {getFilterTags().length === 0 && (
            <span style={{ color: '#999' }}>暂无筛选条件</span>
          )}
        </div>
        
        <Form
          form={subscribeForm}
          layout="vertical"
          preserve={false}
        >
          <Form.Item
            name="name"
            label="订阅名称"
            rules={[{ required: true, message: '请输入订阅名称' }]}
          >
            <Input placeholder="例如：高级别事件订阅" maxLength={50} />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="描述（可选）"
          >
            <Input.TextArea
              placeholder="描述这个订阅的用途..."
              rows={3}
              maxLength={200}
            />
          </Form.Item>
        </Form>
        
        <Alert
          message="订阅说明"
          description="创建订阅后，系统将会监控符合当前筛选条件的新事件，并通过消息通知您。您可以随时在管理页面中查看和管理所有订阅。"
          type="info"
          showIcon
          style={{ marginTop: 16 }}
        />
      </Modal>
      
      {/* 管理订阅模态框 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <SettingOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            我的订阅
          </div>
        }
        open={manageModalVisible}
        onCancel={() => setManageModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setManageModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={700}
        style={{ top: 20 }}
      >
        {subscriptions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
            <SettingOutlined style={{ fontSize: 48, marginBottom: 16, color: '#d9d9d9' }} />
            <div>暂无订阅</div>
            <div style={{ fontSize: 12, marginTop: 8 }}>
              在事件列表中设置筛选条件后可创建订阅
            </div>
          </div>
        ) : (
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {subscriptions.map((subscription) => (
              <Card
                key={subscription.id}
                size="small"
                style={{ 
                  marginBottom: 12,
                  border: subscription.enabled ? '1px solid #d9f7be' : '1px solid #f0f0f0',
                  backgroundColor: subscription.enabled ? '#f6ffed' : '#fafafa'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                      <h4 style={{ margin: 0, marginRight: 8 }}>
                        {subscription.name}
                      </h4>
                      <Tag 
                        color={subscription.enabled ? 'green' : 'default'}
                        icon={subscription.enabled ? <CheckCircleOutlined /> : <PauseCircleOutlined />}
                      >
                        {subscription.enabled ? '活跃' : '暂停'}
                      </Tag>
                    </div>
                    
                    <div style={{ color: '#666', fontSize: '12px', marginBottom: 8 }}>
                      {subscription.description}
                    </div>
                    
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: '#999', fontSize: '12px' }}>筛选条件: </span>
                      <Space size={[4, 4]} wrap>
                        {subscription.tags.map(tag => (
                          <Tag key={tag.key} color={tag.color} size="small">
                            {tag.label}: {tag.value}
                          </Tag>
                        ))}
                      </Space>
                    </div>
                    
                    <div style={{ color: '#999', fontSize: '11px' }}>
                      创建时间: {subscription.createTime}
                    </div>
                    
                    {/* 该订阅的通知区域 */}
                    {(() => {
                      const notifications = getSubscriptionNotifications(subscription.id);
                      if (notifications.length > 0) {
                        return (
                          <div style={{ marginTop: 12, padding: 8, backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 4 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                              <span style={{ fontSize: '11px', color: '#0369a1', fontWeight: 'bold' }}>
                                <BellOutlined style={{ marginRight: 4 }} />
                                新事件通知
                              </span>
                              <Button
                                type="text"
                                size="small"
                                onClick={() => clearSubscriptionNotifications(subscription.id)}
                                style={{ fontSize: '10px', padding: '0 4px', height: 'auto' }}
                              >
                                清除
                              </Button>
                            </div>
                            {notifications.map((notification) => (
                              <div key={notification.id} style={{ fontSize: '10px', color: '#0369a1', marginBottom: 2 }}>
                                • {notification.timestamp}: 发现 {notification.newEventCount} 个新事件，{notification.matchedCount} 个匹配
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  
                  <div style={{ marginLeft: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => applySubscriptionFilters(subscription)}
                      style={{ width: 80 }}
                    >
                      立即搜索
                    </Button>
                    
                    <Button
                      size="small"
                      onClick={() => toggleSubscription(subscription.id)}
                      style={{ width: 80 }}
                    >
                      {subscription.enabled ? '暂停' : '启用'}
                    </Button>
                    
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => {
                        Modal.confirm({
                          title: '确认删除',
                          content: `确定要删除订阅「${subscription.name}」吗？`,
                          onOk: () => deleteSubscription(subscription.id),
                        });
                      }}
                      style={{ width: 80 }}
                    >
                      删除
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Modal>

      {/* 导出选择对话框 */}
      <Modal
        title="选择导出方式"
        open={exportModalVisible}
        onCancel={() => setExportModalVisible(false)}
        footer={null}
        width={500}
      >
        <div style={{ padding: '20px 0' }}>
          <Alert
            message="数据脱敏说明"
            description="脱敏导出将对手机号、身份证等敏感信息进行遮蔽处理；非脱敏导出将显示完整信息。"
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Button
              type="primary"
              size="large"
              block
              onClick={() => confirmExport(true)}
              loading={exporting}
              style={{
                height: '60px',
                fontSize: '16px',
                borderRadius: '8px'
              }}
            >
              导出脱敏数据
            </Button>
            <Button
              size="large"
              block
              onClick={() => confirmExport(false)}
              loading={exporting}
              style={{
                height: '60px',
                fontSize: '16px',
                borderRadius: '8px',
                borderColor: '#ff4d4f',
                color: '#ff4d4f'
              }}
            >
              导出非脱敏数据
            </Button>
          </Space>
          <div style={{ marginTop: 16, textAlign: 'center', color: '#999', fontSize: '12px' }}>
            提示：导出非脱敏数据需要相应权限，请谨慎使用
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default EventList; 
