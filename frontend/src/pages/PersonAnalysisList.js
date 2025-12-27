import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Table,
  Card,
  Input,
  Select,
  Button,
  Space,
  Pagination,
  message,
  Typography,
  Tag,
  Row,
  Col,
  Tabs,
  Statistic,
  Collapse,
  Modal,
} from 'antd';
import { SearchOutlined, EyeOutlined, FilterOutlined, UserOutlined, FileTextOutlined, BarChartOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { Pie, Column, Line } from '@ant-design/plots';
import api from '../services/api';

const { Title } = Typography;
const { Option } = Select;

const PersonAnalysisList = () => {
  const navigate = useNavigate();
  const searchInput = useRef(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchText, setSearchText] = useState('');
  const [selectedRole, setSelectedRole] = useState(null);
  const [roles, setRoles] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [columnFilters, setColumnFilters] = useState({});
  const [searchedColumn, setSearchedColumn] = useState('');

  // 标签穿透分析相关状态
  const [activeTab, setActiveTab] = useState('list');
  const [selectedPopulationTag, setSelectedPopulationTag] = useState('高频涉事人员');
  const [personListExpanded, setPersonListExpanded] = useState(false);
  const [eventListExpanded, setEventListExpanded] = useState(false);
  const [personModalVisible, setPersonModalVisible] = useState(false);
  const [eventModalVisible, setEventModalVisible] = useState(false);

  // 标签穿透分析 Mock 数据
  const tagPenetrationData = useMemo(() => ({
    '高频涉事人员': {
      personCount: 156,
      eventCount: 823,
      trend: 12,
      weekNew: 45,
      persons: [
        { name: '张三', phone: '138****0001', event_count: 13, role: '报警人', lastEventTime: '2025-12-10' },
        { name: '李四', phone: '139****0002', event_count: 12, role: '对方', lastEventTime: '2025-12-09' },
        { name: '王五', phone: '137****0003', event_count: 11, role: '报警人', lastEventTime: '2025-12-08' },
        { name: '赵六', phone: '136****0004', event_count: 10, role: '当事人', lastEventTime: '2025-12-07' },
        { name: '钱七', phone: '135****0005', event_count: 9, role: '报警人', lastEventTime: '2025-12-06' },
      ],
      events: [
        { id: 'NMW202505060002', desc: '转贷款租赁的车子相关投诉', type: '债务纠纷', level: '二级事件', town: '南门街道', time: '2025-12-10 14:23' },
        { id: 'WCW202505050001', phone: '153****0394', desc: '报警称邻居装修噪音扰民', type: '邻里纠纷', level: '二级事件', town: '望城街道', time: '2025-12-10 10:15' },
        { id: 'GLW202505010001', desc: '米粮也有声音，来自楼上住户', type: '邻里纠纷', level: '三级事件', town: '古林镇', time: '2025-12-09 16:45' },
        { id: 'SQW202505310004', desc: '因买车贷款的事情产生纠纷', type: '债务纠纷', level: '二级事件', town: '石碶街道', time: '2025-12-09 09:30' },
        { id: 'GLW202505300008', phone: '187****5678', desc: '在长沙手机号的投诉', type: '停车纠纷', level: '经济纠纷', town: '古林镇', time: '2025-12-08 20:12' },
        { id: 'GQW202505280017', desc: '与贷款公司为贷款问题发生争执', type: '债务纠纷', level: '债务纠纷', town: '高桥镇', time: '2025-12-08 11:22' },
        { id: 'GQW202505280016', desc: '与贷款公司为贷款问题发生争执', type: '债务纠纷', level: '债务纠纷', town: '高桥镇', time: '2025-12-07 15:33' },
      ],
      eventTypes: [
        { type: '债务纠纷', value: 247, percent: 30 },
        { type: '邻里纠纷', value: 206, percent: 25 },
        { type: '停车纠纷', value: 165, percent: 20 },
        { type: '物业纠纷', value: 123, percent: 15 },
        { type: '其他', value: 82, percent: 10 },
      ],
      eventLevels: [
        { level: '一级事件', value: 82, percent: 10 },
        { level: '二级事件', value: 412, percent: 50 },
        { level: '三级事件', value: 329, percent: 40 },
      ],
      townStats: [
        { town: '南门街道', count: 198 },
        { town: '望城街道', count: 165 },
        { town: '古林镇', count: 134 },
        { town: '石碶街道', count: 112 },
        { town: '高桥镇', count: 98 },
        { town: '洪塘街道', count: 76 },
        { town: '集士港镇', count: 40 },
      ],
      trendData: [
        { date: '12-06', count: 58 },
        { date: '12-07', count: 62 },
        { date: '12-08', count: 65 },
        { date: '12-09', count: 71 },
        { date: '12-10', count: 68 },
        { date: '12-11', count: 73 },
        { date: '12-12', count: 69 },
        { date: '12-13', count: 75 },
        { date: '12-14', count: 78 },
        { date: '12-15', count: 82 },
        { date: '12-16', count: 85 },
        { date: '12-17', count: 88 },
        { date: '12-18', count: 91 },
        { date: '12-19', count: 87 },
      ],
      eventTags: [
        { tag: '噪音投诉', count: 234 },
        { tag: '催收投诉', count: 189 },
        { tag: '合同纠纷', count: 156 },
        { tag: '利息争议', count: 134 },
        { tag: '宠物扰民', count: 112 },
        { tag: '违规停车', count: 98 },
        { tag: '装修扰民', count: 87 },
        { tag: '垃圾问题', count: 76 },
        { tag: '公共设施', count: 65 },
        { tag: '安全隐患', count: 54 },
      ]
    },
    '多次涉事': {
      personCount: 89,
      eventCount: 467,
      trend: -8,
      weekNew: 12,
      persons: [
        { name: '孙八', phone: '134****0006', event_count: 8, role: '报警人', lastEventTime: '2025-12-11' },
        { name: '周九', phone: '133****0007', event_count: 7, role: '对方', lastEventTime: '2025-12-10' },
        { name: '吴十', phone: '132****0008', event_count: 7, role: '当事人', lastEventTime: '2025-12-09' },
      ],
      events: [
        { id: 'NMW202505120001', desc: '报警称楼上住户深夜噪音扰民', type: '邻里纠纷', level: '二级事件', town: '南门街道', time: '2025-12-11 23:45' },
        { id: 'WCW202505110002', desc: '反映小区内有人乱停车堵住出口', type: '停车纠纷', level: '三级事件', town: '望城街道', time: '2025-12-11 18:30' },
        { id: 'GLW202505100003', desc: '邻居家宠物狗经常乱叫影响休息', type: '邻里纠纷', level: '三级事件', town: '古林镇', time: '2025-12-10 21:15' },
        { id: 'SQW202505090004', desc: '楼下住户装修噪音过大', type: '邻里纠纷', level: '二级事件', town: '石碶街道', time: '2025-12-09 15:20' },
        { id: 'GQW202505080005', desc: '反映小区停车位被长期占用', type: '停车纠纷', level: '三级事件', town: '高桥镇', time: '2025-12-08 10:40' },
      ],
      eventTypes: [
        { type: '邻里纠纷', value: 187, percent: 40 },
        { type: '停车纠纷', value: 140, percent: 30 },
        { type: '债务纠纷', value: 93, percent: 20 },
        { type: '其他', value: 47, percent: 10 },
      ],
      eventLevels: [
        { level: '一级事件', value: 47, percent: 10 },
        { level: '二级事件', value: 233, percent: 50 },
        { level: '三级事件', value: 187, percent: 40 },
      ],
      townStats: [
        { town: '南门街道', count: 112 },
        { town: '望城街道', count: 98 },
        { town: '古林镇', count: 87 },
        { town: '石碶街道', count: 76 },
        { town: '高桥镇', count: 54 },
        { town: '洪塘街道', count: 40 },
      ],
      trendData: [
        { date: '12-06', count: 42 },
        { date: '12-07', count: 40 },
        { date: '12-08', count: 38 },
        { date: '12-09', count: 35 },
        { date: '12-10', count: 37 },
        { date: '12-11', count: 34 },
        { date: '12-12', count: 36 },
        { date: '12-13', count: 33 },
        { date: '12-14', count: 31 },
        { date: '12-15', count: 32 },
        { date: '12-16', count: 30 },
        { date: '12-17', count: 29 },
        { date: '12-18', count: 31 },
        { date: '12-19', count: 28 },
      ],
      eventTags: [
        { tag: '噪音投诉', count: 156 },
        { tag: '停车纠纷', count: 123 },
        { tag: '邻里矛盾', count: 98 },
        { tag: '宠物扰民', count: 76 },
        { tag: '装修扰民', count: 54 },
      ]
    },
    '外地户籍': {
      personCount: 234,
      eventCount: 1156,
      trend: 5,
      weekNew: 67,
      persons: [
        { name: '郑一', phone: '131****0009', event_count: 15, role: '报警人', lastEventTime: '2025-12-12' },
        { name: '冯二', phone: '130****0010', event_count: 14, role: '对方', lastEventTime: '2025-12-11' },
      ],
      events: [
        { id: 'NMW202505130001', desc: '与房东因租金上涨产生纠纷', type: '租房纠纷', level: '二级事件', town: '南门街道', time: '2025-12-12 14:20' },
        { id: 'WCW202505120003', desc: '报警称用人单位拖欠工资三个月', type: '劳务纠纷', level: '一级事件', town: '望城街道', time: '2025-12-12 09:15' },
        { id: 'GLW202505110004', desc: '退租时房东扣押金不退还', type: '租房纠纷', level: '二级事件', town: '古林镇', time: '2025-12-11 16:50' },
        { id: 'SQW202505100005', desc: '与贷款公司因贷款条款产生争议', type: '债务纠纷', level: '二级事件', town: '石碶街道', time: '2025-12-10 11:30' },
        { id: 'GQW202505090006', desc: '反映租住房屋设施损坏房东不修', type: '租房纠纷', level: '三级事件', town: '高桥镇', time: '2025-12-09 13:25' },
        { id: 'NMW202505080007', desc: '劳动合同纠纷要求赔偿', type: '劳务纠纷', level: '二级事件', town: '南门街道', time: '2025-12-08 10:10' },
      ],
      eventTypes: [
        { type: '租房纠纷', value: 347, percent: 30 },
        { type: '债务纠纷', value: 289, percent: 25 },
        { type: '劳务纠纷', value: 231, percent: 20 },
        { type: '邻里纠纷', value: 173, percent: 15 },
        { type: '其他', value: 116, percent: 10 },
      ],
      eventLevels: [
        { level: '一级事件', value: 173, percent: 15 },
        { level: '二级事件', value: 578, percent: 50 },
        { level: '三级事件', value: 405, percent: 35 },
      ],
      townStats: [
        { town: '南门街道', count: 234 },
        { town: '望城街道', count: 198 },
        { town: '古林镇', count: 176 },
        { town: '石碶街道', count: 165 },
        { town: '高桥镇', count: 145 },
        { town: '洪塘街道', count: 123 },
        { town: '集士港镇', count: 98 },
        { town: '横街镇', count: 17 },
      ],
      trendData: [
        { date: '12-06', count: 78 },
        { date: '12-07', count: 80 },
        { date: '12-08', count: 79 },
        { date: '12-09', count: 82 },
        { date: '12-10', count: 81 },
        { date: '12-11', count: 84 },
        { date: '12-12', count: 83 },
        { date: '12-13', count: 85 },
        { date: '12-14', count: 86 },
        { date: '12-15', count: 88 },
        { date: '12-16', count: 87 },
        { date: '12-17', count: 89 },
        { date: '12-18', count: 91 },
        { date: '12-19', count: 90 },
      ],
      eventTags: [
        { tag: '租金纠纷', count: 198 },
        { tag: '合同纠纷', count: 176 },
        { tag: '工资拖欠', count: 145 },
        { tag: '押金问题', count: 123 },
        { tag: '噪音投诉', count: 98 },
      ]
    },
  }), []);

  const currentTagData = tagPenetrationData[selectedPopulationTag] || tagPenetrationData['高频涉事人员'];

  // 前端过滤数据（用于姓名、身份证、事件数量的筛选）
  const filteredData = useMemo(() => {
    let result = [...data];

    // 姓名搜索
    if (columnFilters['name']) {
      const searchValue = columnFilters['name'].toLowerCase();
      result = result.filter(item =>
        item.name && item.name.toLowerCase().includes(searchValue)
      );
    }

    // 身份证搜索
    if (columnFilters['id_card']) {
      const searchValue = columnFilters['id_card'].toLowerCase();
      result = result.filter(item =>
        item.id_card && item.id_card.toLowerCase().includes(searchValue)
      );
    }

    // 事件数量范围筛选
    if (columnFilters['event_count']) {
      const [min, max] = columnFilters['event_count'].split('-');
      result = result.filter(item => {
        const count = item.event_count || 0;
        if (min && max) {
          return count >= Number(min) && count <= Number(max);
        } else if (min) {
          return count >= Number(min);
        } else if (max) {
          return count <= Number(max);
        }
        return true;
      });
    }

    return result;
  }, [data, columnFilters]);

  // 获取角色选项
  const fetchRoles = async () => {
    try {
      const response = await api.get('/person-analysis/roles');
      setRoles(response || []);
    } catch (error) {
      console.error('获取角色选项失败:', error);
    }
  };

  // 获取人员分析数据
  const fetchData = async (page = currentPage, size = pageSize, search = searchText, role = selectedRole, tags = selectedTags) => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: size,
      };
      if (search) params.search = search;
      if (role) params.role = role;
      if (tags && tags.length > 0) params.tags = tags.join(',');

      const response = await api.get('/person-analysis', { params });
      setData(response.items || []);
      setTotal(response.total || 0);
      setCurrentPage(response.page || 1);

      // 提取所有可用标签
      if (response.items && page === 1) {
        const allTags = new Set();
        response.items.forEach(item => {
          if (item.population_tags && Array.isArray(item.population_tags)) {
            item.population_tags.forEach(tag => allTags.add(tag));
          }
        });
        setAvailableTags(Array.from(allTags).sort());
      }
    } catch (error) {
      console.error('获取人员分析数据失败:', error);
      message.error('获取人员分析数据失败');
    } finally {
      setLoading(false);
    }
  };


  // 初始化数据
  useEffect(() => {
    fetchRoles();
    fetchData();
  }, []);

  // 处理搜索
  const handleDataSearch = () => {
    setCurrentPage(1);
    fetchData(1, pageSize, searchText, selectedRole, selectedTags);
  };

  // 处理重置
  const handleReset = () => {
    setSearchText('');
    setSelectedRole(null);
    setSelectedTags([]);
    setCurrentPage(1);
    fetchData(1, pageSize, '', null, []);
  };

  // 处理分页变化
  const handlePageChange = (page, size) => {
    setCurrentPage(page);
    setPageSize(size);
    fetchData(page, size, searchText, selectedRole, selectedTags);
  };

  // 查看详情
  const handleViewDetail = (phone) => {
    navigate(`/person-analysis/${encodeURIComponent(phone)}`);
  };

  // 获取筛选标签 - 用于显示当前筛选条件
  const getFilterTags = () => {
    const tags = [];

    // 搜索关键词（手机号/姓名）
    if (columnFilters['search']) {
      tags.push({
        key: 'search',
        label: `搜索手机/姓名: ${columnFilters['search']}`,
        closable: true,
        onClose: () => handleColumnFilterReset(() => {}, 'search')
      });
    }

    // 姓名搜索
    if (columnFilters['name']) {
      tags.push({
        key: 'name',
        label: `姓名: ${columnFilters['name']}`,
        closable: true,
        onClose: () => handleColumnFilterReset(() => {}, 'name')
      });
    }

    // 身份证搜索
    if (columnFilters['id_card']) {
      tags.push({
        key: 'id_card',
        label: `身份证: ${columnFilters['id_card']}`,
        closable: true,
        onClose: () => handleColumnFilterReset(() => {}, 'id_card')
      });
    }

    // 主要角色
    if (columnFilters['primary_role']) {
      tags.push({
        key: 'primary_role',
        label: `主要角色: ${columnFilters['primary_role']}`,
        closable: true,
        onClose: () => handleColumnFilterReset(() => {}, 'primary_role')
      });
    }

    // 事件数量范围
    if (columnFilters['event_count']) {
      const [min, max] = columnFilters['event_count'].split('-');
      let label = '事件数量: ';
      if (min && max) {
        label += `${min} - ${max}`;
      } else if (min) {
        label += `≥ ${min}`;
      } else if (max) {
        label += `≤ ${max}`;
      }
      tags.push({
        key: 'event_count',
        label,
        closable: true,
        onClose: () => handleColumnFilterReset(() => {}, 'event_count')
      });
    }

    // 人口标签
    if (columnFilters['population_tags']) {
      const tagsArray = columnFilters['population_tags'].split(',');
      tags.push({
        key: 'population_tags',
        label: `人口标签: ${tagsArray.join(', ')}`,
        closable: true,
        onClose: () => handleColumnFilterReset(() => {}, 'population_tags')
      });
    }

    return tags;
  };

  // 清除所有筛选
  const clearAllFilters = () => {
    setColumnFilters({});
    setSearchText('');
    setSearchedColumn('');
    setSelectedRole(null);
    setSelectedTags([]);
    setCurrentPage(1);
    fetchData(1, pageSize, '', null, []);
  };

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
  });

  // 获取选择筛选属性
  const getColumnSelectProps = (dataIndex, options, apiParam) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8 }}>
        <Select
          placeholder={`选择${dataIndex}`}
          value={selectedKeys[0]}
          onChange={(value) => setSelectedKeys(value ? [value] : [])}
          style={{ width: 200, marginBottom: 8, display: 'block' }}
          allowClear
        >
          {options.map(opt => (
            <Option key={opt} value={opt}>{opt}</Option>
          ))}
        </Select>
        <Space>
          <Button
            type="primary"
            onClick={() => handleColumnFilter(selectedKeys, confirm, apiParam)}
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

  // 获取多选筛选属性
  const getColumnMultiSelectProps = (dataIndex, options, apiParam) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8 }}>
        <Select
          mode="multiple"
          placeholder={`选择${dataIndex}`}
          value={selectedKeys[0] ? selectedKeys[0].split(',') : []}
          onChange={(values) => setSelectedKeys(values.length > 0 ? [values.join(',')] : [])}
          style={{ width: 200, marginBottom: 8, display: 'block' }}
          allowClear
          maxTagCount="responsive"
        >
          {options.map(opt => (
            <Option key={opt} value={opt}>{opt}</Option>
          ))}
        </Select>
        <Space>
          <Button
            type="primary"
            onClick={() => handleColumnFilter(selectedKeys, confirm, apiParam)}
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

  // 获取范围筛选属性（用于事件数量）
  const getColumnRangeProps = (dataIndex, apiParam) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => {
      const [min, max] = selectedKeys[0] ? selectedKeys[0].split('-').map(Number) : ['', ''];

      return (
        <div style={{ padding: 8, width: 250 }}>
          <div style={{ marginBottom: 8 }}>
            <Space>
              <Input
                placeholder="最小值"
                type="number"
                value={min || ''}
                onChange={(e) => {
                  const newMin = e.target.value;
                  const newMax = max || '';
                  const rangeStr = newMin || newMax ? `${newMin}-${newMax}` : '';
                  setSelectedKeys(rangeStr ? [rangeStr] : []);
                }}
                style={{ width: 100 }}
              />
              <span>-</span>
              <Input
                placeholder="最大值"
                type="number"
                value={max || ''}
                onChange={(e) => {
                  const newMin = min || '';
                  const newMax = e.target.value;
                  const rangeStr = newMin || newMax ? `${newMin}-${newMax}` : '';
                  setSelectedKeys(rangeStr ? [rangeStr] : []);
                }}
                style={{ width: 100 }}
              />
            </Space>
          </div>
          <Space>
            <Button
              type="primary"
              onClick={() => handleRangeFilter(selectedKeys, confirm, apiParam)}
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
      );
    },
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

    // 重新加载数据（前端实现，实际不调用API，仅更新状态）
    setCurrentPage(1);
    if (apiParam === 'search') {
      fetchData(1, pageSize, value, selectedRole, selectedTags);
    }
    // 注意：姓名和身份证的搜索在前端实现，通过columnFilters状态控制
  };

  // 处理范围筛选
  const handleRangeFilter = (selectedKeys, confirm, apiParam) => {
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

    // 前端实现，仅更新状态
    setCurrentPage(1);
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

    // 重新加载数据
    setCurrentPage(1);
    if (apiParam === 'primary_role') {
      setSelectedRole(value || null);
      fetchData(1, pageSize, searchText, value || null, selectedTags);
    } else if (apiParam === 'population_tags') {
      const tagsArray = value ? value.split(',') : [];
      setSelectedTags(tagsArray);
      fetchData(1, pageSize, searchText, selectedRole, tagsArray);
    }
  };

  // 处理列筛选重置
  const handleColumnFilterReset = (clearFilters, apiParam) => {
    clearFilters();

    // 更新列筛选状态
    const newColumnFilters = { ...columnFilters };
    delete newColumnFilters[apiParam];
    setColumnFilters(newColumnFilters);

    // 重新加载数据
    setCurrentPage(1);
    if (apiParam === 'search') {
      setSearchText('');
      setSearchedColumn('');
      fetchData(1, pageSize, '', selectedRole, selectedTags);
    } else if (apiParam === 'primary_role') {
      setSelectedRole(null);
      fetchData(1, pageSize, searchText, null, selectedTags);
    } else if (apiParam === 'population_tags') {
      setSelectedTags([]);
      fetchData(1, pageSize, searchText, selectedRole, []);
    }
  };

  // 表格列配置
  const columns = [
    {
      title: '手机号码',
      dataIndex: 'phone',
      key: 'phone',
      width: 150,
      ...getColumnSearchProps('phone', '搜索姓名或手机号', 'search'),
      render: (text) => (
        <span style={{ fontFamily: 'monospace' }}>{text || '-'}</span>
      ),
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 120,
      ...getColumnSearchProps('name', '搜索姓名', 'name'),
      render: (text) => text || '-',
    },
    {
      title: '身份证号码',
      dataIndex: 'id_card',
      key: 'id_card',
      width: 180,
      ...getColumnSearchProps('id_card', '搜索身份证', 'id_card'),
      render: (text) => (
        <span style={{ fontFamily: 'monospace' }}>{text || '-'}</span>
      ),
    },
    {
      title: '主要角色',
      dataIndex: 'primary_role',
      key: 'primary_role',
      width: 100,
      ...getColumnSelectProps('主要角色', roles, 'primary_role'),
      render: (text) => {
        if (!text) return '-';
        let color = 'default';
        if (text === '报警人') color = 'blue';
        else if (text === '对方') color = 'orange';
        else if (text === '当事人') color = 'green';
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '事件总数',
      dataIndex: 'event_count',
      key: 'event_count',
      width: 100,
      align: 'center',
      ...getColumnRangeProps('事件总数', 'event_count'),
      sorter: (a, b) => a.event_count - b.event_count,
      render: (text) => (
        <span style={{ fontWeight: 'bold', color: '#1890ff' }}>{text}</span>
      ),
    },
    {
      title: '人口标签',
      dataIndex: 'population_tags',
      key: 'population_tags',
      width: 200,
      ...getColumnMultiSelectProps('人口标签', availableTags, 'population_tags'),
      render: (tags) => {
        if (!tags || !Array.isArray(tags) || tags.length === 0) {
          return <span style={{ color: '#999' }}>-</span>;
        }
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {tags.map((tag, index) => (
              <Tag key={index} color="blue" style={{ fontSize: '11px', margin: 0 }}>
                {tag}
              </Tag>
            ))}
          </div>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <Button
          type="primary"
          icon={<EyeOutlined />}
          size="small"
          onClick={() => handleViewDetail(record.phone)}
        >
          查看详情
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Title level={3}>人员分析</Title>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'list',
              label: '人员列表',
              children: (
                <div>

      {/* 筛选条件标签 */}
      {getFilterTags().length > 0 && (
        <Card style={{ marginTop: 16 }}>
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

      {/* 数据表格 */}
      <Card style={{ marginTop: 16 }}>
        {/* 统计信息 */}
        <div style={{ marginBottom: 12, fontSize: 14 }}>
          {getFilterTags().length === 0 ? (
            <span style={{ color: '#666' }}>
              总计 <strong style={{ fontSize: 16, color: '#1890ff' }}>{total}</strong> 条
            </span>
          ) : (
            <span style={{ color: '#666' }}>
              筛选出 <strong style={{ fontSize: 16, color: '#1890ff' }}>{filteredData.length}</strong> 条 / 总计 <strong style={{ fontSize: 16, color: '#1890ff' }}>{total}</strong> 条
            </span>
          )}
        </div>

        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="phone"
          loading={loading}
          pagination={false}
          scroll={{ x: 1200 }}
          size="middle"
        />

        {/* 分页 */}
        {total > 0 && (
          <div style={{ marginTop: '16px', textAlign: 'right' }}>
            <Pagination
              current={currentPage}
              total={total}
              pageSize={pageSize}
              showSizeChanger
              showQuickJumper
              showTotal={(total, range) => 
                `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`
              }
              onChange={handlePageChange}
              onShowSizeChange={handlePageChange}
              pageSizeOptions={['10', '20', '50', '100']}
            />
          </div>
        )}
      </Card>
                </div>
              )
            },
            {
              key: 'penetration',
              label: '标签穿透分析',
              children: (
                <div>
                  {/* 标签选择区 */}
                  <Card style={{ marginBottom: 16, background: '#e6f7ff', borderColor: '#1890ff' }}>
                    <Space size="large" style={{ width: '100%', justifyContent: 'space-between' }}>
                      <Space>
                        <span style={{ fontWeight: 500 }}>选择人口标签：</span>
                        <Select
                          value={selectedPopulationTag}
                          onChange={setSelectedPopulationTag}
                          style={{ width: 200 }}
                        >
                          <Option value="高频涉事人员">高频涉事人员</Option>
                          <Option value="多次涉事">多次涉事</Option>
                          <Option value="外地户籍">外地户籍</Option>
                        </Select>
                      </Space>
                      <Space size="large">
                        <div
                          onClick={() => setPersonModalVisible(true)}
                          style={{ cursor: 'pointer' }}
                        >
                          <Statistic
                            title="关联人数"
                            value={currentTagData.personCount}
                            suffix="人"
                            valueStyle={{ fontSize: 20, color: '#1890ff' }}
                          />
                        </div>
                        <div
                          onClick={() => setEventModalVisible(true)}
                          style={{ cursor: 'pointer' }}
                        >
                          <Statistic
                            title="关联事件"
                            value={currentTagData.eventCount}
                            suffix="条"
                            valueStyle={{ fontSize: 20, color: '#1890ff' }}
                          />
                        </div>
                      </Space>
                    </Space>
                  </Card>

                  {/* 事件趋势 */}
                  <Card
                    title={<Space><BarChartOutlined />事件趋势</Space>}
                    style={{ marginBottom: 16 }}
                  >
                    <Line
                      data={currentTagData.trendData}
                      xField="date"
                      yField="count"
                      height={250}
                      smooth
                      color="#1890ff"
                      point={{
                        size: 4,
                        shape: 'circle',
                      }}
                      xAxis={{
                        label: {
                          autoRotate: false,
                          style: {
                            fontSize: 12,
                          },
                        },
                      }}
                      yAxis={{
                        label: {
                          style: {
                            fontSize: 12,
                          },
                        },
                        grid: {
                          line: {
                            style: {
                              stroke: '#f0f0f0',
                              lineDash: [4, 4],
                            },
                          },
                        },
                      }}
                      tooltip={{
                        showTitle: false,
                        customContent: (title, items) => {
                          if (!items || items.length === 0) return '';
                          const item = items[0];
                          return `<div style="padding: 8px;">
                            <div style="margin-bottom: 4px; font-weight: bold;">${item.data.date}</div>
                            <div>事件数：<span style="color: #1890ff; font-weight: bold;">${item.data.count}</span> 条</div>
                          </div>`;
                        },
                      }}
                      areaStyle={{
                        fill: 'l(270) 0:#ffffff 0.5:#e6f7ff 1:#bae7ff',
                      }}
                    />
                    <div style={{ marginTop: 12, textAlign: 'center', fontSize: 13, color: '#666' }}>
                      近14天趋势：
                      <span style={{
                        color: currentTagData.trend > 0 ? '#cf1322' : currentTagData.trend < 0 ? '#3f8600' : '#999',
                        fontWeight: 'bold',
                        marginLeft: 4,
                        fontSize: 14
                      }}>
                        {currentTagData.trend > 0 ? '↑' : currentTagData.trend < 0 ? '↓' : ''}
                        {currentTagData.trend > 0 ? '上升' : currentTagData.trend < 0 ? '下降' : '持平'} {Math.abs(currentTagData.trend)}%
                      </span>
                    </div>
                  </Card>

                  {/* 事件类型分布 */}
                  <Card title="事件类型分布" style={{ marginBottom: 16 }}>
                    <Row gutter={16}>
                      <Col span={12}>
                        <div style={{ textAlign: 'center', marginBottom: 8 }}>
                          <strong>占比分布（饼图）</strong>
                        </div>
                        <Pie
                          data={currentTagData.eventTypes}
                          angleField="value"
                          colorField="type"
                          radius={0.8}
                          innerRadius={0.5}
                          label={{
                            content: (item) => `${item.value}`,
                            style: {
                              fontSize: 14,
                            },
                          }}
                          legend={{
                            position: 'bottom',
                          }}
                          statistic={{
                            title: {
                              content: '总计',
                            },
                            content: {
                              content: `${currentTagData.eventCount}条`,
                            },
                          }}
                          height={300}
                        />
                      </Col>
                      <Col span={12}>
                        <div style={{ textAlign: 'center', marginBottom: 8 }}>
                          <strong>数量分布（柱状图）</strong>
                        </div>
                        <Column
                          data={currentTagData.eventTypes}
                          xField="type"
                          yField="value"
                          label={{
                            position: 'top',
                            style: {
                              fill: '#000',
                              opacity: 0.6,
                            },
                          }}
                          xAxis={{
                            label: {
                              autoRotate: false,
                              autoHide: false,
                            },
                          }}
                          columnStyle={{
                            radius: [4, 4, 0, 0],
                          }}
                          height={300}
                        />
                      </Col>
                    </Row>
                  </Card>

                  {/* 事件等级分布和街镇地区统计 - 并排显示 */}
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={12}>
                      <Card title="事件等级分布">
                        <div style={{ textAlign: 'center', marginBottom: 8 }}>
                          <strong>占比分布（饼图）</strong>
                        </div>
                        <Pie
                          data={currentTagData.eventLevels}
                          angleField="value"
                          colorField="level"
                          radius={0.8}
                          innerRadius={0.5}
                          label={{
                            content: (item) => `${item.value}`,
                            style: {
                              fontSize: 14,
                            },
                          }}
                          legend={{
                            position: 'bottom',
                          }}
                          statistic={{
                            title: {
                              content: '总计',
                            },
                            content: {
                              content: `${currentTagData.eventCount}条`,
                            },
                          }}
                          color={['#ff4d4f', '#faad14', '#52c41a']}
                          height={300}
                        />
                      </Card>
                    </Col>

                    <Col span={12}>
                      <Card title="街镇地区统计">
                        <Column
                          data={currentTagData.townStats}
                          xField="town"
                          yField="count"
                          label={{
                            position: 'top',
                            style: {
                              fill: '#000',
                              opacity: 0.6,
                            },
                          }}
                          xAxis={{
                            label: {
                              autoRotate: true,
                              autoHide: false,
                            },
                          }}
                          yAxis={{
                            title: {
                              text: '事件数量',
                            },
                          }}
                          columnStyle={{
                            radius: [4, 4, 0, 0],
                          }}
                          color="#52c41a"
                          height={350}
                        />
                      </Card>
                    </Col>
                  </Row>

                  {/* 事件标签分布 */}
                  <Card title="事件标签分布（TOP 10）">
                    <Column
                      data={currentTagData.eventTags}
                      xField="tag"
                      yField="count"
                      label={{
                        position: 'top',
                        style: {
                          fill: '#000',
                          opacity: 0.6,
                        },
                      }}
                      xAxis={{
                        label: {
                          autoRotate: true,
                          autoHide: false,
                        },
                      }}
                      yAxis={{
                        title: {
                          text: '事件数量',
                        },
                      }}
                      columnStyle={{
                        radius: [4, 4, 0, 0],
                      }}
                      color="#1890ff"
                      height={400}
                    />
                  </Card>

                  {/* 关联人员弹窗 */}
                  <Modal
                    title={`关联人员列表 - ${selectedPopulationTag}`}
                    open={personModalVisible}
                    onCancel={() => setPersonModalVisible(false)}
                    footer={null}
                    width={900}
                  >
                    <div style={{ marginBottom: 16 }}>
                      <Statistic
                        title="总人数"
                        value={currentTagData.personCount}
                        suffix="人"
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </div>
                    <Table
                      dataSource={currentTagData.persons}
                      pagination={{ pageSize: 10 }}
                      size="small"
                      rowKey="phone"
                      columns={[
                        {
                          title: '姓名',
                          dataIndex: 'name',
                          key: 'name',
                          width: 100,
                        },
                        {
                          title: '手机号',
                          dataIndex: 'phone',
                          key: 'phone',
                          width: 150,
                          render: (text) => <span style={{ fontFamily: 'monospace' }}>{text}</span>,
                        },
                        {
                          title: '事件数',
                          dataIndex: 'event_count',
                          key: 'event_count',
                          width: 100,
                          align: 'center',
                          render: (text) => <span style={{ fontWeight: 'bold', color: '#1890ff' }}>{text}</span>,
                        },
                        {
                          title: '主要角色',
                          dataIndex: 'role',
                          key: 'role',
                          width: 100,
                          render: (text) => {
                            let color = 'default';
                            if (text === '报警人') color = 'blue';
                            else if (text === '对方') color = 'orange';
                            else if (text === '当事人') color = 'green';
                            return <Tag color={color}>{text}</Tag>;
                          },
                        },
                        {
                          title: '最近事件时间',
                          dataIndex: 'lastEventTime',
                          key: 'lastEventTime',
                          width: 150,
                        },
                      ]}
                    />
                  </Modal>

                  {/* 关联事件弹窗 */}
                  <Modal
                    title={`关联事件列表 - ${selectedPopulationTag}`}
                    open={eventModalVisible}
                    onCancel={() => setEventModalVisible(false)}
                    footer={null}
                    width={1200}
                  >
                    <div style={{ marginBottom: 16 }}>
                      <Statistic
                        title="总事件数"
                        value={currentTagData.eventCount}
                        suffix="条"
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </div>
                    <Table
                      dataSource={currentTagData.events}
                      pagination={{ pageSize: 10 }}
                      size="small"
                      rowKey="id"
                      columns={[
                        {
                          title: '事件编号',
                          dataIndex: 'id',
                          key: 'id',
                          width: 150,
                          render: (text) => <span style={{ fontFamily: 'monospace', color: '#1890ff' }}>{text}</span>,
                        },
                        {
                          title: '事件描述',
                          dataIndex: 'desc',
                          key: 'desc',
                          width: 300,
                        },
                        {
                          title: '事件类型',
                          dataIndex: 'type',
                          key: 'type',
                          width: 120,
                          render: (text) => <Tag color="blue">{text}</Tag>,
                        },
                        {
                          title: '事件级别',
                          dataIndex: 'level',
                          key: 'level',
                          width: 120,
                          render: (text) => {
                            let color = 'default';
                            if (text === '一级事件') color = 'red';
                            else if (text === '二级事件') color = 'orange';
                            else if (text === '三级事件') color = 'green';
                            return <Tag color={color}>{text}</Tag>;
                          },
                        },
                        {
                          title: '所属街道',
                          dataIndex: 'town',
                          key: 'town',
                          width: 120,
                        },
                        {
                          title: '发生时间',
                          dataIndex: 'time',
                          key: 'time',
                          width: 150,
                          render: (text) => <span style={{ fontFamily: 'monospace' }}>{text}</span>,
                        },
                      ]}
                    />
                  </Modal>
                </div>
              )
            }
          ]}
        />
      </Card>

    </div>
  );
};

export default PersonAnalysisList; 