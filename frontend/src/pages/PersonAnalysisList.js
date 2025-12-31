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
  Drawer,
  List,
  Tooltip,
  Badge,
} from 'antd';
import { SearchOutlined, EyeOutlined, FilterOutlined, UserOutlined, FileTextOutlined, BarChartOutlined, DownOutlined, UpOutlined, RightOutlined, StarOutlined, StarFilled } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { Pie, Column, Line, Bar } from '@ant-design/plots';
import api from '../services/api';

const { Title } = Typography;
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

  // 列宽度状态管理
  const [columnWidths, setColumnWidths] = useState({
    phone: 150,
    name: 120,
    id_card: 180,
    primary_role: 100,
    event_count: 100,
    population_tags: 200,
    action: 100,
  });

  // 标签穿透分析相关状态
  const [activeTab, setActiveTab] = useState('list');

  // 关注状态管理
  const [followedPersons, setFollowedPersons] = useState(new Set());
  const [selectedPopulationTag, setSelectedPopulationTag] = useState('高频涉事人员');
  const [personListExpanded, setPersonListExpanded] = useState(false);
  const [eventListExpanded, setEventListExpanded] = useState(false);
  const [personModalVisible, setPersonModalVisible] = useState(false);
  const [eventModalVisible, setEventModalVisible] = useState(false);

  // 二级分类明细抽屉状态
  const [categoryDrawerVisible, setCategoryDrawerVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // 抽屉表格筛选状态
  const [drawerColumnFilters, setDrawerColumnFilters] = useState({});
  const [drawerSearchText, setDrawerSearchText] = useState('');
  const [drawerSearchedColumn, setDrawerSearchedColumn] = useState('');
  const drawerSearchInput = useRef(null);

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
      eventTypesForChart: [
        { type: '债务纠纷', value: 247, percent: 30 },
        { type: '邻里纠纷', value: 206, percent: 25 },
        { type: '停车纠纷', value: 165, percent: 20 },
        { type: '物业纠纷', value: 123, percent: 15 },
        { type: '其他', value: 82, percent: 10 },
      ],
      eventTypesForList: [
        { type: '债务纠纷', value: 247, percent: 30 },
        { type: '邻里纠纷', value: 206, percent: 25 },
        { type: '停车纠纷', value: 165, percent: 20 },
        { type: '物业纠纷', value: 123, percent: 15 },
        { type: '家庭纠纷', value: 28, percent: 3.4 },
        { type: '合同纠纷', value: 22, percent: 2.7 },
        { type: '劳务纠纷', value: 18, percent: 2.2 },
        { type: '消费纠纷', value: 14, percent: 1.7 },
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
      eventTypesForChart: [
        { type: '邻里纠纷', value: 187, percent: 40 },
        { type: '停车纠纷', value: 140, percent: 30 },
        { type: '债务纠纷', value: 93, percent: 20 },
        { type: '其他', value: 47, percent: 10 },
      ],
      eventTypesForList: [
        { type: '邻里纠纷', value: 187, percent: 40 },
        { type: '停车纠纷', value: 140, percent: 30 },
        { type: '债务纠纷', value: 93, percent: 20 },
        { type: '噪音投诉', value: 21, percent: 4.5 },
        { type: '宠物纠纷', value: 15, percent: 3.2 },
        { type: '装修纠纷', value: 11, percent: 2.3 },
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
      eventTypesForChart: [
        { type: '租房纠纷', value: 347, percent: 30 },
        { type: '债务纠纷', value: 289, percent: 25 },
        { type: '劳务纠纷', value: 231, percent: 20 },
        { type: '邻里纠纷', value: 173, percent: 15 },
        { type: '其他', value: 116, percent: 10 },
      ],
      eventTypesForList: [
        { type: '租房纠纷', value: 347, percent: 30 },
        { type: '债务纠纷', value: 289, percent: 25 },
        { type: '劳务纠纷', value: 231, percent: 20 },
        { type: '邻里纠纷', value: 173, percent: 15 },
        { type: '医疗纠纷', value: 46, percent: 4.0 },
        { type: '消费纠纷', value: 35, percent: 3.0 },
        { type: '交通纠纷', value: 23, percent: 2.0 },
        { type: '教育纠纷', value: 12, percent: 1.0 },
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

  // 抽屉表格筛选辅助函数
  const getDrawerColumnSearchProps = (dataIndex, placeholder) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
        <Input
          ref={drawerSearchInput}
          placeholder={placeholder}
          value={selectedKeys[0]}
          onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => handleDrawerColumnSearchFilter(selectedKeys, confirm, dataIndex)}
          style={{ marginBottom: 8, display: 'block' }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() => handleDrawerColumnSearchFilter(selectedKeys, confirm, dataIndex)}
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            搜索
          </Button>
          <Button
            onClick={() => handleDrawerColumnFilterReset(clearFilters, dataIndex)}
            size="small"
            style={{ width: 90 }}
          >
            重置
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered) => (
      <SearchOutlined style={{ color: drawerColumnFilters[dataIndex] ? '#1890ff' : undefined }} />
    ),
    onFilterDropdownOpenChange: (visible) => {
      if (visible) {
        setTimeout(() => drawerSearchInput.current?.select(), 100);
      }
    },
  });

  const getDrawerColumnFilterProps = (dataIndex, options, placeholder) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8 }}>
        <Select
          mode="multiple"
          placeholder={placeholder}
          value={selectedKeys}
          onChange={(values) => setSelectedKeys(values || [])}
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
            onClick={() => handleDrawerColumnFilterMultiple(selectedKeys, confirm, dataIndex)}
            icon={<FilterOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            筛选
          </Button>
          <Button
            onClick={() => handleDrawerColumnFilterReset(clearFilters, dataIndex)}
            size="small"
            style={{ width: 90 }}
          >
            重置
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered) => (
      <FilterOutlined style={{ color: drawerColumnFilters[dataIndex] ? '#1890ff' : undefined }} />
    ),
    filteredValue: Array.isArray(drawerColumnFilters[dataIndex]) ? drawerColumnFilters[dataIndex] : null,
  });

  // 抽屉表格筛选处理函数
  const handleDrawerColumnSearchFilter = (selectedKeys, confirm, dataIndex) => {
    confirm();
    const value = selectedKeys[0];
    setDrawerSearchText(value);
    setDrawerSearchedColumn(dataIndex);

    const newFilters = { ...drawerColumnFilters };
    if (value) {
      newFilters[dataIndex] = value;
    } else {
      delete newFilters[dataIndex];
    }
    setDrawerColumnFilters(newFilters);
  };

  const handleDrawerColumnFilterMultiple = (selectedKeys, confirm, dataIndex) => {
    confirm();
    const values = Array.isArray(selectedKeys) ? selectedKeys : [];

    const newFilters = { ...drawerColumnFilters };
    if (values.length) {
      newFilters[dataIndex] = values;
    } else {
      delete newFilters[dataIndex];
    }
    setDrawerColumnFilters(newFilters);
  };

  const handleDrawerColumnFilterReset = (clearFilters, dataIndex) => {
    clearFilters();

    const newFilters = { ...drawerColumnFilters };
    delete newFilters[dataIndex];
    setDrawerColumnFilters(newFilters);

    if (dataIndex === drawerSearchedColumn) {
      setDrawerSearchText('');
      setDrawerSearchedColumn('');
    }
  };

  // 抽屉表格数据过滤
  const getFilteredDrawerData = useMemo(() => {
    if (!selectedCategory) return [];

    let data = [
      {
        id: 1,
        事件编号: 'SQW202505310510',
        事件描述: '快速送达客户要求快件理由报道事项等，有纠纷',
        镇街名称: '白云街道',
        村社名称: '王长社区',
        事件级别: '二级事件',
        二级分类: selectedCategory?.type || '债务纠纷',
        上报时间: '2025-12-22 09:31',
        处置结果: '已办结',
        相关事件: 0,
      },
      {
        id: 2,
        事件编号: 'GQW202505310011',
        事件描述: `${selectedCategory?.type || ''}相关事件描述`,
        镇街名称: '河桥镇',
        村社名称: '塑桥村',
        事件级别: '三级事件',
        二级分类: selectedCategory?.type || '债务纠纷',
        上报时间: '2025-12-21 14:25',
        处置结果: '未办结',
        相关事件: 2,
      },
      {
        id: 3,
        事件编号: 'WCW202505310014',
        事件描述: `${selectedCategory?.type || ''}相关投诉`,
        镇街名称: '塑桥镇',
        村社名称: '-',
        事件级别: '一级事件',
        二级分类: selectedCategory?.type || '债务纠纷',
        上报时间: '2025-12-20 08:15',
        处置结果: '已办结',
        相关事件: 1,
      },
      {
        id: 4,
        事件编号: 'SQW202505310012',
        事件描述: `${selectedCategory?.type || ''}问题反映`,
        镇街名称: '南广街道',
        村社名称: '南广村',
        事件级别: '二级事件',
        二级分类: selectedCategory?.type || '债务纠纷',
        上报时间: '2025-12-19 16:42',
        处置结果: '处理中',
        相关事件: 0,
      },
      {
        id: 5,
        事件编号: 'GLW202505010001',
        事件描述: `${selectedCategory?.type || ''}纠纷处理`,
        镇街名称: '古林镇',
        村社名称: '古林村',
        事件级别: '三级事件',
        二级分类: selectedCategory?.type || '债务纠纷',
        上报时间: '2025-12-18 11:20',
        处置结果: '已办结',
        相关事件: 0,
      },
    ];

    // 应用筛选
    Object.keys(drawerColumnFilters).forEach(key => {
      const filterValue = drawerColumnFilters[key];
      if (!filterValue) return;

      if (Array.isArray(filterValue)) {
        // 多选筛选
        data = data.filter(item => filterValue.includes(item[key]));
      } else if (typeof filterValue === 'string') {
        // 文本搜索
        data = data.filter(item => {
          const value = item[key];
          if (!value) return false;
          return String(value).toLowerCase().includes(filterValue.toLowerCase());
        });
      }
    });

    return data;
  }, [selectedCategory, drawerColumnFilters]);

  // 前端过滤数据（用于姓名、身份证、事件数量的筛选）
  const filteredData = useMemo(() => {
    let result = [...data];

    // 如果在"我的关注"Tab，只显示已关注的人员
    if (activeTab === 'followed') {
      result = result.filter(item => followedPersons.has(item.phone));
    }

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
  }, [data, columnFilters, activeTab, followedPersons]);

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

  // 关注/取消关注
  const handleToggleFollow = (phone) => {
    setFollowedPersons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(phone)) {
        newSet.delete(phone);
        message.success('已取消关注');
      } else {
        newSet.add(phone);
        message.success('已添加关注');
      }
      return newSet;
    });
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

  // 处理列宽度变化
  const handleResize = (key) => (width) => {
    setColumnWidths(prev => ({
      ...prev,
      [key]: width
    }));
  };

  // 表格列配置
  const columns = [
    {
      title: '手机号码',
      dataIndex: 'phone',
      key: 'phone',
      width: columnWidths['phone'],
      onHeaderCell: () => ({
        width: columnWidths['phone'],
        onResize: handleResize('phone'),
      }),
      ...getColumnSearchProps('phone', '搜索姓名或手机号', 'search'),
      render: (text) => (
        <span style={{ fontFamily: 'monospace' }}>{text || '-'}</span>
      ),
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: columnWidths['name'],
      onHeaderCell: () => ({
        width: columnWidths['name'],
        onResize: handleResize('name'),
      }),
      ...getColumnSearchProps('name', '搜索姓名', 'name'),
      render: (text) => text || '-',
    },
    {
      title: '身份证号码',
      dataIndex: 'id_card',
      key: 'id_card',
      width: columnWidths['id_card'],
      onHeaderCell: () => ({
        width: columnWidths['id_card'],
        onResize: handleResize('id_card'),
      }),
      ...getColumnSearchProps('id_card', '搜索身份证', 'id_card'),
      render: (text) => (
        <span style={{ fontFamily: 'monospace' }}>{text || '-'}</span>
      ),
    },
    {
      title: '主要角色',
      dataIndex: 'primary_role',
      key: 'primary_role',
      width: columnWidths['primary_role'],
      onHeaderCell: () => ({
        width: columnWidths['primary_role'],
        onResize: handleResize('primary_role'),
      }),
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
      width: columnWidths['event_count'],
      align: 'center',
      onHeaderCell: () => ({
        width: columnWidths['event_count'],
        onResize: handleResize('event_count'),
      }),
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
      width: columnWidths['population_tags'],
      onHeaderCell: () => ({
        width: columnWidths['population_tags'],
        onResize: handleResize('population_tags'),
      }),
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
      width: columnWidths['action'] || 150,
      align: 'center',
      onHeaderCell: () => ({
        width: columnWidths['action'] || 150,
        onResize: handleResize('action'),
      }),
      render: (_, record) => {
        const isFollowed = followedPersons.has(record.phone);
        return (
          <Space size="small">
            <Button
              type="link"
              icon={<EyeOutlined />}
              size="small"
              onClick={() => handleViewDetail(record.phone)}
            >
              详情
            </Button>
            <Button
              type="link"
              icon={isFollowed ? <StarFilled /> : <StarOutlined />}
              size="small"
              style={{ color: isFollowed ? '#faad14' : undefined }}
              onClick={() => handleToggleFollow(record.phone)}
            >
              {isFollowed ? '已关注' : '关注'}
            </Button>
          </Space>
        );
      },
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
          components={{
            header: {
              cell: ResizeableTitle,
            },
          }}
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
              key: 'followed',
              label: (
                <span>
                  <StarFilled style={{ marginRight: 4, color: '#faad14' }} />
                  重点关注
                  {followedPersons.size > 0 && (
                    <Badge count={followedPersons.size} style={{ marginLeft: 8 }} />
                  )}
                </span>
              ),
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
                    <Table
                      columns={columns}
                      dataSource={filteredData}
                      loading={loading}
                      rowKey="phone"
                      pagination={{
                        current: currentPage,
                        pageSize: pageSize,
                        total: total,
                        showSizeChanger: true,
                        showTotal: (total) => `共 ${total} 条`,
                        onChange: handlePageChange,
                        onShowSizeChange: handlePageChange,
                      }}
                      locale={{
                        emptyText: followedPersons.size === 0 ? '暂无关注的人员' : '没有符合条件的关注人员'
                      }}
                    />
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
                          data={currentTagData.eventTypesForChart}
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
                        <div style={{ textAlign: 'center', marginBottom: 16 }}>
                          <strong>二级分类统计明细</strong>
                        </div>
                        <List
                          dataSource={currentTagData.eventTypesForList}
                          renderItem={(item) => (
                            <List.Item
                              style={{
                                padding: '12px 16px',
                                borderBottom: '1px solid #f0f0f0',
                              }}
                              extra={
                                <Button
                                  type="link"
                                  size="small"
                                  icon={<RightOutlined />}
                                  onClick={() => {
                                    setSelectedCategory(item);
                                    setCategoryDrawerVisible(true);
                                  }}
                                >
                                  查看明细
                                </Button>
                              }
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                <span style={{ fontWeight: 500, fontSize: 14, flex: 1 }}>{item.type}</span>
                                <span style={{
                                  fontSize: 18,
                                  fontWeight: 'bold',
                                  color: '#1890ff',
                                  minWidth: 80,
                                  textAlign: 'right'
                                }}>
                                  {item.value} 条
                                </span>
                                <span style={{
                                  fontSize: 14,
                                  color: '#666',
                                  minWidth: 60,
                                  textAlign: 'right',
                                  marginRight: 20
                                }}>
                                  {item.percent}%
                                </span>
                              </div>
                            </List.Item>
                          )}
                          style={{
                            maxHeight: 300,
                            overflow: 'auto',
                            border: '1px solid #f0f0f0',
                            borderRadius: 4,
                          }}
                        />
                      </Col>
                    </Row>
                  </Card>

                  {/* 事件等级分布 */}
                  <Card title="事件等级分布" style={{ marginBottom: 16 }}>
                    <Row gutter={16}>
                      <Col span={12}>
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
                      </Col>
                      <Col span={12}>
                        <div style={{ textAlign: 'center', marginBottom: 16 }}>
                          <strong>事件等级统计明细</strong>
                        </div>
                        <List
                          dataSource={currentTagData.eventLevels}
                          renderItem={(item) => (
                            <List.Item
                              style={{
                                padding: '12px 16px',
                                borderBottom: '1px solid #f0f0f0',
                              }}
                              extra={
                                <Button
                                  type="link"
                                  size="small"
                                  icon={<RightOutlined />}
                                  onClick={() => {
                                    setSelectedCategory({ type: item.level, value: item.value });
                                    setCategoryDrawerVisible(true);
                                  }}
                                >
                                  查看明细
                                </Button>
                              }
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                <span style={{ fontWeight: 500, fontSize: 14, flex: 1 }}>{item.level}</span>
                                <span style={{
                                  fontSize: 18,
                                  fontWeight: 'bold',
                                  color: '#1890ff',
                                  minWidth: 80,
                                  textAlign: 'right'
                                }}>
                                  {item.value} 条
                                </span>
                                <span style={{
                                  fontSize: 14,
                                  color: '#666',
                                  minWidth: 60,
                                  textAlign: 'right',
                                  marginRight: 20
                                }}>
                                  {item.percent}%
                                </span>
                              </div>
                            </List.Item>
                          )}
                          style={{
                            maxHeight: 300,
                            overflow: 'auto',
                            border: '1px solid #f0f0f0',
                            borderRadius: 4,
                          }}
                        />
                      </Col>
                    </Row>
                  </Card>

                  {/* 街镇地区统计 */}
                  <Card title="街镇地区统计" style={{ marginBottom: 16 }}>
                    <Row gutter={16}>
                      <Col span={12}>
                        <div style={{ textAlign: 'center', marginBottom: 8 }}>
                          <strong>地区分布（条状图）</strong>
                        </div>
                        <Bar
                          data={currentTagData.townStats}
                          xField="count"
                          yField="town"
                          label={{
                            position: 'right',
                            style: {
                              fill: '#000',
                              opacity: 0.6,
                            },
                          }}
                          barStyle={{
                            radius: [0, 4, 4, 0],
                          }}
                          color="#52c41a"
                          height={350}
                        />
                      </Col>
                      <Col span={12}>
                        <div style={{ textAlign: 'center', marginBottom: 16 }}>
                          <strong>街镇地区统计明细</strong>
                        </div>
                        <List
                          dataSource={currentTagData.townStats}
                          renderItem={(item) => {
                            const totalCount = currentTagData.townStats.reduce((sum, t) => sum + t.count, 0);
                            const percent = ((item.count / totalCount) * 100).toFixed(1);
                            return (
                              <List.Item
                                style={{
                                  padding: '12px 16px',
                                  borderBottom: '1px solid #f0f0f0',
                                }}
                                extra={
                                  <Button
                                    type="link"
                                    size="small"
                                    icon={<RightOutlined />}
                                    onClick={() => {
                                      setSelectedCategory({ type: item.town, value: item.count });
                                      setCategoryDrawerVisible(true);
                                    }}
                                  >
                                    查看明细
                                  </Button>
                                }
                              >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                  <span style={{ fontWeight: 500, fontSize: 14, flex: 1 }}>{item.town}</span>
                                  <span style={{
                                    fontSize: 18,
                                    fontWeight: 'bold',
                                    color: '#1890ff',
                                    minWidth: 80,
                                    textAlign: 'right'
                                  }}>
                                    {item.count} 条
                                  </span>
                                  <span style={{
                                    fontSize: 14,
                                    color: '#666',
                                    minWidth: 60,
                                    textAlign: 'right',
                                    marginRight: 20
                                  }}>
                                    {percent}%
                                  </span>
                                </div>
                              </List.Item>
                            );
                          }}
                          style={{
                            maxHeight: 350,
                            overflow: 'auto',
                            border: '1px solid #f0f0f0',
                            borderRadius: 4,
                          }}
                        />
                      </Col>
                    </Row>
                  </Card>

                  {/* 事件标签分布 */}
                  <Card title="事件标签分布（TOP 10）">
                    <Row gutter={16}>
                      <Col span={12}>
                        <div style={{ textAlign: 'center', marginBottom: 8 }}>
                          <strong>标签分布（柱状图）</strong>
                        </div>
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
                      </Col>
                      <Col span={12}>
                        <div style={{ textAlign: 'center', marginBottom: 16 }}>
                          <strong>事件标签统计明细</strong>
                        </div>
                        <List
                          dataSource={currentTagData.eventTags}
                          renderItem={(item) => {
                            const totalCount = currentTagData.eventTags.reduce((sum, t) => sum + t.count, 0);
                            const percent = ((item.count / totalCount) * 100).toFixed(1);
                            return (
                              <List.Item
                                style={{
                                  padding: '12px 16px',
                                  borderBottom: '1px solid #f0f0f0',
                                }}
                                extra={
                                  <Button
                                    type="link"
                                    size="small"
                                    icon={<RightOutlined />}
                                    onClick={() => {
                                      setSelectedCategory({ type: item.tag, value: item.count });
                                      setCategoryDrawerVisible(true);
                                    }}
                                  >
                                    查看明细
                                  </Button>
                                }
                              >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                  <span style={{ fontWeight: 500, fontSize: 14, flex: 1 }}>{item.tag}</span>
                                  <span style={{
                                    fontSize: 18,
                                    fontWeight: 'bold',
                                    color: '#1890ff',
                                    minWidth: 80,
                                    textAlign: 'right'
                                  }}>
                                    {item.count} 条
                                  </span>
                                  <span style={{
                                    fontSize: 14,
                                    color: '#666',
                                    minWidth: 60,
                                    textAlign: 'right',
                                    marginRight: 20
                                  }}>
                                    {percent}%
                                  </span>
                                </div>
                              </List.Item>
                            );
                          }}
                          style={{
                            maxHeight: 400,
                            overflow: 'auto',
                            border: '1px solid #f0f0f0',
                            borderRadius: 4,
                          }}
                        />
                      </Col>
                    </Row>
                  </Card>

                  {/* 关联人员抽屉 */}
                  <Drawer
                    title={`关联人员列表 - ${selectedPopulationTag}`}
                    placement="right"
                    width={900}
                    onClose={() => setPersonModalVisible(false)}
                    open={personModalVisible}
                  >
                    <div style={{ marginBottom: 16, padding: 16, background: '#f5f5f5', borderRadius: 4 }}>
                      <Statistic
                        title="总人数"
                        value={currentTagData.personCount}
                        suffix="人"
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </div>
                    <Table
                      dataSource={currentTagData.persons}
                      pagination={{
                        pageSize: 10,
                        showTotal: (total) => `共 ${total} 人`
                      }}
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
                  </Drawer>

                  {/* 关联事件抽屉 */}
                  <Drawer
                    title={`关联事件列表 - ${selectedPopulationTag}`}
                    placement="right"
                    width={1200}
                    onClose={() => setEventModalVisible(false)}
                    open={eventModalVisible}
                  >
                    <div style={{ marginBottom: 16, padding: 16, background: '#f5f5f5', borderRadius: 4 }}>
                      <Statistic
                        title="总事件数"
                        value={currentTagData.eventCount}
                        suffix="条"
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </div>
                    <Table
                      dataSource={currentTagData.events}
                      pagination={{
                        pageSize: 10,
                        showTotal: (total) => `共 ${total} 条`
                      }}
                      size="small"
                      rowKey="id"
                      scroll={{ x: 1000 }}
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
                  </Drawer>
                </div>
              )
            }
          ]}
        />
      </Card>

      {/* 二级分类明细抽屉 */}
      <Drawer
        title={`${selectedCategory?.type || ''} - 事件明细`}
        placement="right"
        width={1200}
        onClose={() => {
          setCategoryDrawerVisible(false);
          setSelectedCategory(null);
          // 重置抽屉筛选状态
          setDrawerColumnFilters({});
          setDrawerSearchText('');
          setDrawerSearchedColumn('');
        }}
        open={categoryDrawerVisible}
      >
        {selectedCategory && (
          <div>
            <div style={{ marginBottom: 16, padding: 16, background: '#f5f5f5', borderRadius: 4 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title="事件总数"
                    value={selectedCategory.value}
                    suffix="条"
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title={Object.keys(drawerColumnFilters).length > 0 ? "筛选后数量" : "占比"}
                    value={Object.keys(drawerColumnFilters).length > 0
                      ? getFilteredDrawerData.length
                      : ((selectedCategory.value / currentTagData.eventCount) * 100).toFixed(1)}
                    suffix={Object.keys(drawerColumnFilters).length > 0 ? "条" : "%"}
                  />
                </Col>
              </Row>
            </div>

            <Table
              dataSource={getFilteredDrawerData}
              columns={[
                {
                  title: '事件编号',
                  dataIndex: '事件编号',
                  key: '事件编号',
                  width: 160,
                  ...getDrawerColumnSearchProps('事件编号', '搜索事件编号'),
                  render: (text) => (
                    <span style={{ fontSize: '12px', fontFamily: 'monospace' }}>{text}</span>
                  ),
                },
                {
                  title: '事件描述',
                  dataIndex: '事件描述',
                  key: '事件描述',
                  ...getDrawerColumnSearchProps('事件描述', '搜索事件描述'),
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
                  ...getDrawerColumnFilterProps('镇街名称', ['白云街道', '河桥镇', '塑桥镇', '南广街道', '古林镇'], '选择镇街'),
                },
                {
                  title: '村社名称',
                  dataIndex: '村社名称',
                  key: '村社名称',
                  width: 100,
                  ...getDrawerColumnFilterProps('村社名称', ['王长社区', '塑桥村', '南广村', '古林村'], '选择村社'),
                  ellipsis: true,
                  render: (text) => text || '-',
                },
                {
                  title: '事件级别',
                  dataIndex: '事件级别',
                  key: '事件级别',
                  width: 100,
                  ...getDrawerColumnFilterProps('事件级别', ['一级事件', '二级事件', '三级事件'], '选择级别'),
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
                  ...getDrawerColumnSearchProps('二级分类', '搜索二级分类'),
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
                },
                {
                  title: '处置结果',
                  dataIndex: '处置结果',
                  key: '处置结果',
                  width: 100,
                  ...getDrawerColumnFilterProps('处置结果', ['已办结', '未办结', '处理中'], '选择状态'),
                  ellipsis: { showTitle: false },
                  render: (text) => (
                    <Tooltip title={text}>
                      <span>{text || '-'}</span>
                    </Tooltip>
                  ),
                },
                {
                  title: '相关事件',
                  dataIndex: '相关事件',
                  key: '相关事件',
                  width: 100,
                  render: (value) => {
                    if (value && value > 0) {
                      return (
                        <Tag color="blue">
                          {value} 个关联
                        </Tag>
                      );
                    }
                    return '-';
                  },
                },
                {
                  title: '操作',
                  key: 'action',
                  width: 80,
                  fixed: 'right',
                  render: (_, record) => (
                    <Button type="link" size="small" icon={<EyeOutlined />}>
                      详情
                    </Button>
                  ),
                },
              ]}
              pagination={{
                pageSize: 10,
                showTotal: (total) => {
                  if (Object.keys(drawerColumnFilters).length > 0) {
                    return `筛选后共 ${total} 条，总计 ${selectedCategory.value} 条`;
                  }
                  return `共 ${total} 条`;
                },
              }}
              size="small"
              scroll={{ x: 1200 }}
            />
          </div>
        )}
      </Drawer>

    </div>
  );
};

export default PersonAnalysisList; 