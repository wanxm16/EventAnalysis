import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, DatePicker, Input, Space, Table, Tag, Typography, message, Select, Modal, Popconfirm, Tooltip, Drawer, Form, Switch, Row, Col, Divider, Alert, Radio, Tabs, Spin, Steps, Checkbox, Statistic, Empty, Collapse } from 'antd';
import { SettingOutlined, SearchOutlined, FilterOutlined, EyeOutlined, DeleteOutlined, RobotOutlined, EditOutlined, PlusOutlined, InfoCircleOutlined, BarChartOutlined, RightOutlined, LeftOutlined, TagsOutlined, RocketOutlined, CheckCircleOutlined, MinusCircleOutlined, UserOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { Line } from '@ant-design/plots';
import Highlighter from 'react-highlight-words';
import dayjs from 'dayjs';
import { eventAPI, tagAPI } from '../services/api';

const { Title, Paragraph, Text } = Typography;
const { RangePicker } = DatePicker;

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

const TopicDetail = () => {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const [topic, setTopic] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [dateRange, setDateRange] = useState([]);
  const [search, setSearch] = useState('');
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

  // 自定义列：可见列键与弹窗
  const defaultVisibleKeys = () => {
    const saved = localStorage.getItem(`topic_detail_visible_columns_${topicId}`);
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return ['事件描述','镇街名称','村社名称','事件级别','二级分类','上报时间','报警人信息','相关','处置结果','标签'];
  };
  const [visibleColumnKeys, setVisibleColumnKeys] = useState(defaultVisibleKeys());
  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const dragIndexRef = useRef(null);

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
    '标签': 250,
    'action': 120,
  });

  // 标签相关状态
  const [availableTags, setAvailableTags] = useState([]);
  const [tagEditModalVisible, setTagEditModalVisible] = useState(false);
  const [currentEditEvent, setCurrentEditEvent] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [aiRecommending, setAiRecommending] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState([]); // AI推荐结果

  // 统计相关状态
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsDateRange, setStatsDateRange] = useState([]);
  const [statsView, setStatsView] = useState('day'); // 'day' | 'month'
  const [statsCollapsed, setStatsCollapsed] = useState(false);

  // TAB 页面状态
  const [activeTab, setActiveTab] = useState('events');

  // AI 标签发现相关状态
  const [untaggedCount, setUntaggedCount] = useState(20); // Mock: 未分配标签的事件数
  const [aiDiscoveryDrawerVisible, setAiDiscoveryDrawerVisible] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiSuggestedTags, setAiSuggestedTags] = useState([]);
  const [selectedSuggestedTags, setSelectedSuggestedTags] = useState([]);
  const [editingTagId, setEditingTagId] = useState(null); // 正在编辑的标签ID
  const [editingTagName, setEditingTagName] = useState(''); // 编辑中的标签名称

  // 标签分析 mock 数据
  const mockTagAnalysisData = useMemo(() => ({
    tags: [
      {
        id: 1,
        name: '噪音投诉',
        count: 342,
        trend: [
          { date: '2024-01', count: 28 },
          { date: '2024-02', count: 32 },
          { date: '2024-03', count: 29 },
          { date: '2024-04', count: 35 },
          { date: '2024-05', count: 41 },
          { date: '2024-06', count: 38 },
          { date: '2024-07', count: 45 },
          { date: '2024-08', count: 42 },
          { date: '2024-09', count: 52 },
        ],
        persons: [
          { name: '张三', phone: '13800138001', idCard: '330102199001011234', event_count: 15, role: '报警人', profileTags: ['老年人', '退休人员'] },
          { name: '李四', phone: '13800138002', idCard: '330102198505052345', event_count: 12, role: '对方', profileTags: ['中年人', '个体户'] },
          { name: '王五', phone: '13800138003', idCard: '330102199203033456', event_count: 10, role: '报警人', profileTags: ['青年人', '上班族'] },
          { name: '赵六', phone: '13800138004', idCard: '330102197812124567', event_count: 8, role: '当事人', profileTags: ['中年人', '企业主'] },
          { name: '钱七', phone: '13800138005', idCard: '330102200001015678', event_count: 6, role: '报警人', profileTags: ['青年人', '学生'] },
        ]
      },
      {
        id: 2,
        name: '邻里纠纷',
        count: 256,
        trend: [
          { date: '2024-01', count: 22 },
          { date: '2024-02', count: 25 },
          { date: '2024-03', count: 28 },
          { date: '2024-04', count: 24 },
          { date: '2024-05', count: 30 },
          { date: '2024-06', count: 27 },
          { date: '2024-07', count: 32 },
          { date: '2024-08', count: 35 },
          { date: '2024-09', count: 33 },
        ],
        persons: [
          { name: '孙八', phone: '13800138006', idCard: '330102198808086789', event_count: 18, role: '报警人', profileTags: ['中年人', '自由职业者'] },
          { name: '周九', phone: '13800138007', idCard: '330102199509097890', event_count: 14, role: '对方', profileTags: ['青年人', '公司职员'] },
          { name: '吴十', phone: '13800138008', idCard: '330102198212128901', event_count: 11, role: '当事人', profileTags: ['中年人', '个体商户'] },
          { name: '郑一', phone: '13800138009', idCard: '330102199706069012', event_count: 9, role: '报警人', profileTags: ['青年人', '网约车司机'] },
        ]
      },
      {
        id: 3,
        name: '停车纠纷',
        count: 198,
        trend: [
          { date: '2024-01', count: 18 },
          { date: '2024-02', count: 20 },
          { date: '2024-03', count: 22 },
          { date: '2024-04', count: 19 },
          { date: '2024-05', count: 25 },
          { date: '2024-06', count: 23 },
          { date: '2024-07', count: 26 },
          { date: '2024-08', count: 24 },
          { date: '2024-09', count: 21 },
        ],
        persons: [
          { name: '冯二', phone: '13800138010', idCard: '330102199304040123', event_count: 13, role: '报警人', profileTags: ['青年人', '快递员'] },
          { name: '陈三', phone: '13800138011', idCard: '330102198607071234', event_count: 10, role: '对方', profileTags: ['中年人', '餐饮业主'] },
          { name: '褚四', phone: '13800138012', idCard: '330102199101012345', event_count: 8, role: '当事人', profileTags: ['中年人', '教师'] },
        ]
      },
      {
        id: 4,
        name: '宠物扰民',
        count: 167,
        trend: [
          { date: '2024-01', count: 15 },
          { date: '2024-02', count: 17 },
          { date: '2024-03', count: 19 },
          { date: '2024-04', count: 16 },
          { date: '2024-05', count: 21 },
          { date: '2024-06', count: 18 },
          { date: '2024-07', count: 22 },
          { date: '2024-08', count: 20 },
          { date: '2024-09', count: 19 },
        ],
        persons: [
          { name: '卫五', phone: '13800138013', idCard: '330102198909092456', event_count: 12, role: '报警人', profileTags: ['中年人', '护士'] },
          { name: '蒋六', phone: '13800138014', idCard: '330102199402023567', event_count: 9, role: '对方', profileTags: ['青年人', '程序员'] },
          { name: '沈七', phone: '13800138015', idCard: '330102196508084678', event_count: 7, role: '报警人', profileTags: ['老年人', '退休干部'] },
        ]
      },
      {
        id: 5,
        name: '装修扰民',
        count: 143,
        trend: [
          { date: '2024-01', count: 12 },
          { date: '2024-02', count: 14 },
          { date: '2024-03', count: 16 },
          { date: '2024-04', count: 15 },
          { date: '2024-05', count: 18 },
          { date: '2024-06', count: 17 },
          { date: '2024-07', count: 19 },
          { date: '2024-08', count: 18 },
          { date: '2024-09', count: 14 },
        ],
        persons: [
          { name: '韩八', phone: '13800138016', idCard: '330102199208085789', event_count: 11, role: '报警人', profileTags: ['中年人', '设计师'] },
          { name: '杨九', phone: '13800138017', idCard: '330102198803036890', event_count: 8, role: '对方', profileTags: ['中年人', '装修工人'] },
        ]
      },
    ]
  }), []);

  // 编辑抽屉相关状态
  const [editDrawerVisible, setEditDrawerVisible] = useState(false);
  const [editCurrentStep, setEditCurrentStep] = useState(0);
  const [editStep1Form] = Form.useForm();
  const [editStep3Form] = Form.useForm();
  const [editStep1Skipped, setEditStep1Skipped] = useState(false);
  const [editStep2Skipped, setEditStep2Skipped] = useState(false);

  // 人员事件明细抽屉状态
  const [personEventDrawerVisible, setPersonEventDrawerVisible] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [editCategories, setEditCategories] = useState([]);
  const [editSelectedTags, setEditSelectedTags] = useState([]);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [filterOptionsForEdit, setFilterOptionsForEdit] = useState({ towns: [], levels: [], categories: [] });
  const [editTags, setEditTags] = useState([]);
  const [editGroups, setEditGroups] = useState([]);
  const [editTagsLoading, setEditTagsLoading] = useState(false);

  // 标签事件列表Modal状态
  const [tagEventsModalVisible, setTagEventsModalVisible] = useState(false);
  const [selectedTag, setSelectedTag] = useState(null);


  // 模拟AI分类数据 - 随机标记一些事件为AI分类
  const mockAiClassifiedEvents = useMemo(() => {
    const aiEvents = new Set();
    // 模拟30%的事件是AI分类的
    if (events.length > 0) {
      const count = Math.floor(events.length * 0.3);
      const indices = [];
      while (indices.length < count) {
        const randomIndex = Math.floor(Math.random() * events.length);
        if (!indices.includes(randomIndex)) {
          indices.push(randomIndex);
          aiEvents.add(events[randomIndex]?.事件编号);
        }
      }
    }
    return aiEvents;
  }, [events]);

  // Mock tag data for first 10 events
  const addMockTags = (events) => {
    const mockTagsData = [
      { tags: [
        { name: '高频事件', type: 'ai' },
        { name: '紧急处理', type: 'human' },
        { name: '已解决', type: 'human' }
      ]},
      { tags: [
        { name: '噪音投诉', type: 'ai' },
        { name: '夜间扰民', type: 'ai' },
        { name: '待跟进', type: 'human' }
      ]},
      { tags: [
        { name: '停车纠纷', type: 'ai' },
        { name: '重点关注', type: 'human' }
      ]},
      { tags: [
        { name: '基础设施', type: 'ai' },
        { name: '道路维修', type: 'ai' },
        { name: '已派单', type: 'human' }
      ]},
      { tags: [
        { name: '环境卫生', type: 'ai' },
        { name: '垃圾清理', type: 'ai' }
      ]},
      { tags: [
        { name: '邻里纠纷', type: 'ai' },
        { name: '需调解', type: 'human' },
        { name: '持续关注', type: 'human' }
      ]},
      { tags: [
        { name: '消防安全', type: 'ai' },
        { name: '隐患排查', type: 'ai' },
        { name: '整改中', type: 'human' }
      ]},
      { tags: [
        { name: '违章建筑', type: 'ai' },
        { name: '待拆除', type: 'human' }
      ]},
      { tags: [
        { name: '交通违章', type: 'ai' },
        { name: '已处罚', type: 'human' }
      ]},
      { tags: [
        { name: '公共秩序', type: 'ai' },
        { name: '重点区域', type: 'human' },
        { name: '加强巡查', type: 'human' }
      ]}
    ];

    return events.map((event, index) => {
      if (index < 10 && mockTagsData[index]) {
        return { ...event, tags: mockTagsData[index].tags };
      }
      return event;
    });
  };

  const loadTopic = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/topics');
      if (!res.ok) throw new Error('加载主题失败');
      const data = await res.json();
      const t = (data.topics || []).find(x => x.id === topicId);
      if (!t) throw new Error('主题不存在');
      setTopic(t);
    } catch (e) {
      console.error(e);
      message.error(e.message);
    }
  };

  const loadEvents = async (page = pagination.current, pageSize = pagination.pageSize) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      if (dateRange?.length === 2) {
        params.set('start_time', dateRange[0].format('YYYY-MM-DD HH:mm:ss'));
        params.set('end_time', dateRange[1].format('YYYY-MM-DD HH:mm:ss'));
      }
      if (search) params.set('search', search);
      const res = await fetch(`http://localhost:8000/api/topics/${topicId}/events?${params.toString()}`);
      if (!res.ok) throw new Error('加载事件失败');
      const data = await res.json();

      // Add mock tags
      const eventsWithTags = addMockTags(data.items || []);
      setEvents(eventsWithTags);
      setPagination({ current: data.page, pageSize: data.page_size, total: data.total });
    } catch (e) {
      console.error(e);
      message.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTopic(); }, [topicId]);

  // 初始化时检查URL参数并设置日期筛选
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const startTime = urlParams.get('start_time');
    const endTime = urlParams.get('end_time');

    if (startTime && endTime) {
      // 设置日期范围，确保包含整天的时间
      const startDate = dayjs(startTime).startOf('day');
      const endDate = dayjs(endTime).endOf('day');
      const dateRange = [startDate, endDate];
      setDateRange(dateRange);
    }
  }, [topicId]);

  useEffect(() => { loadEvents(1, pagination.pageSize); }, [topicId, dateRange, search]);

  // 加载可用标签列表
  const loadAvailableTags = async () => {
    try {
      // Mock 分组标签数据
      const mockTagGroups = [
        {
          groupName: '事件分类',
          tags: [
            { name: '高频事件', type: 'ai' },
            { name: '噪音投诉', type: 'ai' },
            { name: '停车纠纷', type: 'ai' },
            { name: '邻里纠纷', type: 'ai' },
            { name: '消防安全', type: 'ai' },
            { name: '违章建筑', type: 'ai' },
            { name: '交通违章', type: 'ai' },
            { name: '公共秩序', type: 'ai' },
          ]
        },
        {
          groupName: '环境类',
          tags: [
            { name: '环境卫生', type: 'ai' },
            { name: '垃圾清理', type: 'ai' },
            { name: '夜间扰民', type: 'ai' },
            { name: '道路维修', type: 'ai' },
            { name: '基础设施', type: 'ai' },
          ]
        },
        {
          groupName: '处理状态',
          tags: [
            { name: '待处理', type: 'human' },
            { name: '处理中', type: 'human' },
            { name: '已处理', type: 'human' },
            { name: '已解决', type: 'human' },
            { name: '待跟进', type: 'human' },
            { name: '已派单', type: 'human' },
            { name: '整改中', type: 'human' },
          ]
        },
        {
          groupName: '优先级标签',
          tags: [
            { name: '紧急处理', type: 'human' },
            { name: '重点关注', type: 'human' },
            { name: '持续关注', type: 'human' },
            { name: '加强巡查', type: 'human' },
            { name: '重点区域', type: 'human' },
          ]
        },
        {
          groupName: '安全隐患',
          tags: [
            { name: '隐患排查', type: 'ai' },
            { name: '待拆除', type: 'human' },
            { name: '已处罚', type: 'human' },
            { name: '需调解', type: 'human' },
          ]
        }
      ];

      setAvailableTags(mockTagGroups);
    } catch (error) {
      console.error('加载标签列表失败:', error);
    }
  };

  useEffect(() => {
    loadAvailableTags();
  }, []);

  // 加载编辑所需的筛选选项
  useEffect(() => {
    const loadEditOptions = async () => {
      try {
        const opts = await eventAPI.getFilterOptions();
        setFilterOptionsForEdit(opts || { towns: [], levels: [], categories: [] });
      } catch (e) {
        console.error('加载筛选选项失败:', e);
      }
    };
    loadEditOptions();
  }, []);

  // 打开编辑抽屉
  const openEditDrawer = async () => {
    if (!topic) return;

    // 加载标签库
    setEditTagsLoading(true);
    try {
      const [tagsRes, groupsRes] = await Promise.all([
        tagAPI.getTags({ include_system: false }),
        tagAPI.getGroups(false)
      ]);
      setEditTags(tagsRes.tags || []);
      setEditGroups(groupsRes.groups || []);
    } catch (error) {
      message.error('加载标签库失败');
      console.error(error);
    } finally {
      setEditTagsLoading(false);
    }

    // 填充第一步表单数据
    editStep1Form.setFieldsValue({
      include_desc: topic.include_keywords?.description || [],
      include_result: topic.include_keywords?.result || [],
      exclude_desc: topic.exclude_keywords?.description || [],
      exclude_result: topic.exclude_keywords?.result || [],
      dedup: topic.dedup === 'description'
    });

    // 填充分类数据
    if (topic.categories && topic.categories.length > 0) {
      const cats = topic.categories.map(c => ({
        towns: c.towns || [],
        levels: c.levels || [],
        categories: c.categories || [],
        timeRange: (c.start_time || c.end_time)
          ? [
              c.start_time ? dayjs(c.start_time) : null,
              c.end_time ? dayjs(c.end_time) : null
            ]
          : null
      }));
      setEditCategories(cats);
    } else {
      setEditCategories([]);
    }

    // 检查是否跳过了步骤
    const hasStep1Config =
      (topic.include_keywords?.description?.length > 0) ||
      (topic.include_keywords?.result?.length > 0) ||
      (topic.exclude_keywords?.description?.length > 0) ||
      (topic.exclude_keywords?.result?.length > 0) ||
      topic.dedup ||
      (topic.categories?.length > 0);
    setEditStep1Skipped(!hasStep1Config);

    // TODO: 从后端加载AI标签配置
    setEditSelectedTags([]);
    setEditStep2Skipped(true);

    // 填充第三步表单数据
    editStep3Form.setFieldsValue({
      name: topic.name,
      description: topic.description || ''
    });

      setEditCurrentStep(0);
    setEditDrawerVisible(true);
  };

  // 编辑抽屉 - 分类管理
  const addEditCategory = () => {
    setEditCategories(prev => [...prev, { towns: [], levels: [], categories: [], timeRange: null }]);
  };

  const updateEditCategory = (idx, field, value) => {
    setEditCategories(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  const removeEditCategory = (idx) => {
    setEditCategories(prev => prev.filter((_, i) => i !== idx));
  };

  // 编辑抽屉 - 步骤控制
  const nextEditStep = async () => {
    if (editCurrentStep === 0 && !editStep1Skipped) {
      try {
        await editStep1Form.validateFields();
      } catch (error) {
        return;
      }
    }

    if (editCurrentStep < 2) {
      setEditCurrentStep(editCurrentStep + 1);
    }
  };

  const prevEditStep = () => {
    if (editCurrentStep > 0) {
      setEditCurrentStep(editCurrentStep - 1);
    }
  };

  const handleEditSkipStep1 = () => {
    setEditStep1Skipped(!editStep1Skipped);
    if (!editStep1Skipped) {
      editStep1Form.resetFields();
      setEditCategories([]);
    }
  };

  const handleEditSkipStep2 = () => {
    setEditStep2Skipped(!editStep2Skipped);
    if (!editStep2Skipped) {
      setEditSelectedTags([]);
    }
  };

  // 编辑抽屉 - 提交保存
  const handleEditSubmit = async () => {
    try {
      const values = await editStep3Form.validateFields();
      setEditSubmitting(true);

      // 构建payload（与创建主题类似）
      const parseKeywords = (v) => Array.isArray(v)
        ? v.map(s => String(s).trim()).filter(Boolean)
        : String(v || '')
            .split(/[，,\s]+/)
            .map(s => s.trim())
            .filter(Boolean);

      const step1Values = editStep1Skipped ? {} : editStep1Form.getFieldsValue();

      const payload = {
        name: values.name,
        description: values.description || '',
        include_keywords: editStep1Skipped ? { description: [], result: [] } : {
          description: parseKeywords(step1Values.include_desc),
          result: parseKeywords(step1Values.include_result)
        },
        exclude_keywords: editStep1Skipped ? { description: [], result: [] } : {
          description: parseKeywords(step1Values.exclude_desc),
          result: parseKeywords(step1Values.exclude_result)
        },
        dedup: editStep1Skipped ? null : (step1Values.dedup ? 'description' : null),
        categories: editStep1Skipped ? [] : editCategories.map(c => ({
          name: null,
          keywords: [],
          towns: c.towns || [],
          levels: c.levels || [],
          categories: c.categories || [],
          start_time: c.timeRange && c.timeRange[0] ? c.timeRange[0].format('YYYY-MM-DD') : null,
          end_time: c.timeRange && c.timeRange[1] ? c.timeRange[1].format('YYYY-MM-DD') : null,
        })),
        ai_tags: editStep2Skipped ? [] : editSelectedTags,
        enabled: true
      };

      // TODO: 调用后端API更新主题
      console.log('Update topic payload:', payload);
      await new Promise(resolve => setTimeout(resolve, 1000));

      message.success('主题更新成功');
      setEditDrawerVisible(false);

      // 重新加载主题详情
      loadTopic();
    } catch (e) {
      if (e?.errorFields) return;
      console.error(e);
      message.error('更新失败: ' + (e.message || '未知错误'));
    } finally {
      setEditSubmitting(false);
    }
  };

  // 按标签组分组（用于编辑抽屉）
  const editTagsByGroup = editTags.reduce((acc, tag) => {
    const groupId = tag.group_id || 'ungrouped';
    if (!acc[groupId]) {
      acc[groupId] = [];
    }
    acc[groupId].push(tag);
    return acc;
  }, {});

  // 编辑抽屉 - 渲染第一步：规则筛选
  const renderEditStep1 = () => (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Typography.Title level={5} style={{ margin: 0, marginBottom: 8 }}>
            <FilterOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            配置筛选规则
          </Typography.Title>
          <Typography.Text type="secondary">设置事件筛选条件，精确定位目标事件集合</Typography.Text>
        </div>
        <Button
          type={editStep1Skipped ? 'primary' : 'default'}
          onClick={handleEditSkipStep1}
        >
          {editStep1Skipped ? '取消跳过' : '跳过此步骤'}
        </Button>
      </div>

      {editStep1Skipped ? (
        <Alert
          message="已跳过规则筛选"
          description="将对所有事件进行处理，不进行初步筛选"
          type="info"
          showIcon
        />
      ) : (
        <Form form={editStep1Form} layout="vertical">
          <Card style={{ marginBottom: 16 }}>
            <Typography.Title level={5}>包含关键词筛选</Typography.Title>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="include_desc" label="事件描述关键词">
                  <Select mode="tags" placeholder="例如：噪音 噪声 吵闹" tokenSeparators={[',', '，', ' ']} open={false} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="include_result" label="处置结果关键词">
                  <Select mode="tags" placeholder="例如：处理完毕 已解决" tokenSeparators={[',', '，', ' ']} open={false} />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card style={{ marginBottom: 16 }}>
            <Typography.Title level={5}>过滤关键词筛选</Typography.Title>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="exclude_desc" label="排除事件描述关键词">
                  <Select mode="tags" placeholder="例如：KTV 超市 商场" tokenSeparators={[',', '，', ' ']} open={false} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="exclude_result" label="排除处置结果关键词">
                  <Select mode="tags" placeholder="例如：无需处理 已撤销" tokenSeparators={[',', '，', ' ']} open={false} />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card style={{ marginBottom: 16 }}>
            <Form.Item name="dedup" label="按事件描述去重" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Switch checkedChildren="开启" unCheckedChildren="关闭" />
            </Form.Item>
          </Card>

          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <Typography.Title level={5} style={{ margin: 0 }}>分类配置（可选）</Typography.Title>
              <Button icon={<PlusOutlined />} onClick={addEditCategory}>添加分类</Button>
            </div>

            {editCategories.length === 0 ? (
              <Empty description="暂无分类配置" />
            ) : (
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                {editCategories.map((c, idx) => (
                  <Card key={idx} size="small" style={{ background: '#fafafa' }}>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Select
                          mode="multiple"
                          placeholder="街镇名称（可多选）"
                          value={c.towns}
                          onChange={(vals) => updateEditCategory(idx, 'towns', vals)}
                          options={(filterOptionsForEdit.towns || []).map(t => ({ label: t, value: t }))}
                          style={{ width: '100%' }}
                        />
                      </Col>
                      <Col span={12}>
                        <Select
                          mode="multiple"
                          placeholder="事件级别（可多选）"
                          value={c.levels}
                          onChange={(vals) => updateEditCategory(idx, 'levels', vals)}
                          options={(filterOptionsForEdit.levels || []).map(t => ({ label: t, value: t }))}
                          style={{ width: '100%' }}
                        />
                      </Col>
                    </Row>
                    <Row gutter={16} style={{ marginTop: 12 }}>
                      <Col span={12}>
                        <Select
                          mode="multiple"
                          placeholder="二级分类（可多选）"
                          value={c.categories}
                          onChange={(vals) => updateEditCategory(idx, 'categories', vals)}
                          options={(filterOptionsForEdit.categories || []).map(t => ({ label: t, value: t }))}
                          style={{ width: '100%' }}
                        />
                      </Col>
                      <Col span={12}>
                        <Space.Compact style={{ width: '100%' }}>
                          <DatePicker.RangePicker
                            value={c.timeRange || null}
                            onChange={(dates) => updateEditCategory(idx, 'timeRange', dates)}
                            placeholder={["开始日期", "结束日期"]}
                            style={{ width: 'calc(100% - 32px)' }}
                          />
                          <Button danger icon={<MinusCircleOutlined />} onClick={() => removeEditCategory(idx)} />
                        </Space.Compact>
                      </Col>
                    </Row>
                  </Card>
                ))}
              </Space>
            )}
          </Card>
        </Form>
      )}
    </div>
  );

  // 编辑抽屉 - 渲染第二步：AI标签识别
  const renderEditStep2 = () => (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Typography.Title level={5} style={{ margin: 0, marginBottom: 8 }}>
            <TagsOutlined style={{ marginRight: 8, color: '#52c41a' }} />
            AI标签识别
          </Typography.Title>
          <Typography.Text type="secondary">
            选择需要识别的标签，系统将在{editStep1Skipped ? '所有事件' : '第一步筛选的事件'}中自动识别并打上标签
          </Typography.Text>
        </div>
        <Button
          type={editStep2Skipped ? 'primary' : 'default'}
          onClick={handleEditSkipStep2}
        >
          {editStep2Skipped ? '取消跳过' : '跳过此步骤'}
        </Button>
      </div>

      {editStep2Skipped ? (
        <Alert
          message="已跳过AI标签识别"
          description="将不进行智能标签识别"
          type="info"
          showIcon
        />
      ) : (
        <Card>
          {editTagsLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin tip="加载标签库中..." />
            </div>
          ) : editTags.length === 0 ? (
            <Empty description="暂无可用标签，请先在标签管理中创建标签" />
          ) : (
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <Alert
                message="选择标签"
                description="选择需要AI识别的标签，AI将分析事件内容并自动打上相应标签。"
                type="info"
                showIcon
              />

              {editGroups.map(group => {
                const groupTags = editTagsByGroup[group.group_id || group.id] || [];
                if (groupTags.length === 0) return null;

                return (
                  <Card
                    key={group.group_id || group.id}
                    size="small"
                    title={
                      <Space>
                        <Typography.Text strong>{group.name}</Typography.Text>
                        <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                          ({groupTags.filter(t => editSelectedTags.includes(t.tag_id || t.id)).length}/{groupTags.length})
                        </Typography.Text>
                      </Space>
                    }
                  >
                    <Checkbox.Group
                      value={editSelectedTags}
                      onChange={setEditSelectedTags}
                      style={{ width: '100%' }}
                    >
                      <Row gutter={[16, 16]}>
                        {groupTags.map(tag => (
                          <Col span={8} key={tag.tag_id || tag.id}>
                            <Checkbox value={tag.tag_id || tag.id}>
                              <Tag color={tag.color || '#1890ff'}>
                                {tag.name}
                              </Tag>
                            </Checkbox>
                          </Col>
                        ))}
                      </Row>
                    </Checkbox.Group>
                  </Card>
                );
              })}

              {editSelectedTags.length > 0 && (
                <Alert
                  message={`已选择 ${editSelectedTags.length} 个标签`}
                  description="AI将识别这些标签的特征并自动标注事件"
                  type="success"
                  showIcon
                />
              )}
            </Space>
          )}
        </Card>
      )}
    </div>
  );

  // 编辑抽屉 - 渲染第三步：保存更新
  const renderEditStep3 = () => (
    <div>
      <Typography.Title level={5} style={{ margin: 0, marginBottom: 8 }}>
        <RocketOutlined style={{ marginRight: 8, color: '#722ed1' }} />
        保存更新
      </Typography.Title>
      <Typography.Text type="secondary" style={{ marginBottom: 24, display: 'block' }}>
        确认主题信息并保存更新
      </Typography.Text>

      <Card style={{ marginBottom: 24 }}>
        <Typography.Title level={5} style={{ marginBottom: 16 }}>配置摘要</Typography.Title>
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Card size="small" style={{ background: '#f6f8fa' }}>
              <Statistic
                title="规则筛选"
                value={editStep1Skipped ? '已跳过' : '已配置'}
                valueStyle={{ color: editStep1Skipped ? '#999' : '#52c41a', fontSize: '20px' }}
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small" style={{ background: '#f6f8fa' }}>
              <Statistic
                title="AI标签识别"
                value={editStep2Skipped ? '已跳过' : `${editSelectedTags.length} 个标签`}
                valueStyle={{ color: editStep2Skipped ? '#999' : '#1890ff', fontSize: '20px' }}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      <Form form={editStep3Form} layout="vertical">
        <Card>
          <Form.Item
            name="name"
            label={<Typography.Text strong>主题名称</Typography.Text>}
            rules={[{ required: true, message: '请输入主题名称' }]}
          >
            <Input placeholder="例如：噪音相关事件" maxLength={50} />
          </Form.Item>

          <Form.Item
            name="description"
            label={<Typography.Text strong>主题描述</Typography.Text>}
          >
            <Input.TextArea
              placeholder="可描述该主题创建逻辑和用途"
              rows={4}
              maxLength={200}
              showCount
            />
          </Form.Item>
        </Card>
      </Form>
    </div>
  );

  const editSteps = [
    {
      title: '规则筛选',
      icon: <FilterOutlined />,
      content: renderEditStep1()
    },
    {
      title: 'AI标签识别',
      icon: <TagsOutlined />,
      content: renderEditStep2()
    },
    {
      title: '保存更新',
      icon: <RocketOutlined />,
      content: renderEditStep3()
    }
  ];

  // 加载统计数据
  const loadStats = async () => {
    try {
      setStatsLoading(true);
      const params = new URLSearchParams();
      if (statsDateRange?.length === 2) {
        params.set('start_time', statsDateRange[0].format('YYYY-MM-DD'));
        params.set('end_time', statsDateRange[1].format('YYYY-MM-DD'));
      }
      const res = await fetch(`http://localhost:8000/api/topics/${topicId}/stats?${params.toString()}`);
      if (!res.ok) throw new Error('统计加载失败');
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error(e);
      message.error(e.message);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => { loadStats(); }, [topicId, statsDateRange]);

  // 由日数据聚合出月数据，并计算3月均值与简易异动
  const getMonthlyData = () => {
    const list = stats?.by_day || [];
    if (!list.length) return [];
    const groups = new Map();
    list.forEach(d => {
      const key = dayjs(d.date).format('YYYY-MM');
      groups.set(key, (groups.get(key) || 0) + (d.count || 0));
    });
    // 转为数组并按时间升序以计算均值，再倒序展示
    const arrAsc = Array.from(groups.entries())
      .map(([m, c]) => ({ date: m, count: c }))
      .sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf());
    // 3月移动平均
    for (let i = 0; i < arrAsc.length; i++) {
      const start = Math.max(0, i - 2);
      const window = arrAsc.slice(start, i + 1);
      const ma = window.reduce((s, x) => s + x.count, 0) / window.length;
      arrAsc[i].ma3 = ma;
    }
    // 简易异动：全局均值+2σ
    const mean = arrAsc.reduce((s, x) => s + x.count, 0) / arrAsc.length;
    const variance = arrAsc.reduce((s, x) => s + Math.pow(x.count - mean, 2), 0) / arrAsc.length;
    const std = Math.sqrt(variance);
    const threshold = mean + 2 * (isNaN(std) ? 0 : std);
    arrAsc.forEach(x => { x.anomaly = x.count > threshold; });
    return arrAsc;
  };

  // 构造图表数据：按时间倒序取前30个点
  const buildChartData = () => {
    const data = statsView === 'day' ? (stats?.by_day || []) : getMonthlyData();
    const sortedDesc = [...data].sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());
    return sortedDesc.slice(0, 30);
  };

  // 数据明细列定义
  const detailColumns = [
    { title: statsView === 'day' ? '日期' : '月份', dataIndex: 'date', key: 'date', width: 140 },
    { title: '数量', dataIndex: 'count', key: 'count', width: 100 },
    {
      title: statsView === 'day' ? '7日均值' : '3月均值',
      dataIndex: statsView === 'day' ? 'ma7' : 'ma3',
      key: 'ma',
      width: 120,
      render: v => (v !== null && v !== undefined) ? (typeof v === 'number' ? v.toFixed(1) : v) : '-'
    },
    {
      title: '是否异动',
      dataIndex: 'anomaly',
      key: 'anomaly',
      width: 120,
      render: v => v ? <Tag color="red">异动</Tag> : <Tag>正常</Tag>
    },
  ];

  // 加载筛选选项 - 从事件数据中提取
  useEffect(() => {
    if (events.length > 0) {
      const towns = Array.from(new Set(events.map(e => e.镇街名称).filter(Boolean)));
      const villages = Array.from(new Set(events.map(e => e.村社名称).filter(Boolean)));
      const levels = Array.from(new Set(events.map(e => e.事件级别).filter(Boolean)));
      const categories = Array.from(new Set(events.map(e => e.二级分类).filter(Boolean)));
      setFilterOptions({ towns, villages, levels, categories });
    }
  }, [events]);

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
              <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>包含关键词（回车添加）</div>
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
              <Select
                mode="tags"
                style={{ width: '100%', marginBottom: 12 }}
                value={state.include}
                onChange={(vals) => update({ include: vals })}
                open={false}
                placeholder={placeholder || '如：离婚 酒店'}
              />
              <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>排除关键词（回车添加）</div>
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
    filteredValue: columnFilters[apiParam] ? [columnFilters[apiParam]] : null,
  });

  // 简单文本搜索属性
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
            <Select.Option key={option} value={option}>{option}</Select.Option>
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

  // 处理列搜索筛选
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
        include = parsed.include;
        exclude = parsed.exclude;
      }
    }
    const display = [
      ...(include || []),
      ...((exclude || []).map(x => `-${x}`))
    ].join(' ');
    setSearchText(display);
    setSearchedColumn(dataIndex);

    const newColumnFilters = { ...columnFilters };
    if (include.length > 0 || exclude.length > 0) {
      newColumnFilters[apiParam] = JSON.stringify({ include, exclude });
    } else {
      delete newColumnFilters[apiParam];
    }
    setColumnFilters(newColumnFilters);
  };

  // 处理列筛选（多选）
  const handleColumnFilterMultiple = (selectedKeys, confirm, apiParam) => {
    confirm();
    const values = Array.isArray(selectedKeys) ? selectedKeys : [];

    const newColumnFilters = { ...columnFilters };
    if (values.length) {
      newColumnFilters[apiParam] = values;
    } else {
      delete newColumnFilters[apiParam];
    }
    setColumnFilters(newColumnFilters);
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
  };

  // 处理列筛选重置
  const handleColumnFilterReset = (clearFilters, apiParam) => {
    clearFilters();

    const newColumnFilters = { ...columnFilters };
    delete newColumnFilters[apiParam];
    setColumnFilters(newColumnFilters);
  };

  // 移除事件从主题
  const removeEventFromTopic = async (eventId) => {
    try {
      setLoading(true);
      // 模拟API调用
      const response = await fetch(`http://localhost:8000/api/topics/${topicId}/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: '手动移除',
          operator: '管理员'
        })
      });

      if (response.ok) {
        message.success('事件已从主题中移除');
        // 重新加载事件列表
        loadEvents(pagination.current, pagination.pageSize);
      } else {
        // 模拟成功 - 实际项目中删除这行
        message.success('事件已从主题中移除');
        // 从当前列表中移除该事件
        setEvents(prev => prev.filter(e => e.事件编号 !== eventId));
      }
    } catch (error) {
      console.error('移除事件失败:', error);
      // 模拟成功 - 实际项目中删除这部分
      message.success('事件已从主题中移除');
      setEvents(prev => prev.filter(e => e.事件编号 !== eventId));
    } finally {
      setLoading(false);
    }
  };

  // 处理列宽度变化
  const handleResize = (key) => (width) => {
    setColumnWidths(prev => ({
      ...prev,
      [key]: width
    }));
  };

  // 打开标签编辑弹窗
  const handleEditTags = (record) => {
    setCurrentEditEvent(record);
    // 提取标签名称（支持字符串或对象格式）
    const tagNames = (record.tags || []).map(tag =>
      typeof tag === 'string' ? tag : tag.name
    );
    setSelectedTags(tagNames);
    setTagEditModalVisible(true);
  };

  // 删除单个标签
  const handleRemoveTag = async (record, tagToRemove) => {
    try {
      const tagNameToRemove = typeof tagToRemove === 'string' ? tagToRemove : tagToRemove.name;
      const newTags = (record.tags || []).filter(tag => {
        const tagName = typeof tag === 'string' ? tag : tag.name;
        return tagName !== tagNameToRemove;
      });

      // 转换为纯字符串数组发送给后端
      const tagNames = newTags.map(tag => typeof tag === 'string' ? tag : tag.name);
      await eventAPI.updateEventTags(record.事件编号, tagNames);
      message.success('标签已删除');

      // 更新本地数据
      setEvents(events.map(e =>
        e.事件编号 === record.事件编号 ? { ...e, tags: newTags } : e
      ));
    } catch (error) {
      message.error('删除标签失败: ' + error.message);
    }
  };

  // AI 推荐标签
  const handleAIRecommend = async () => {
    if (!currentEditEvent) return;

    setAiRecommending(true);
    setAiRecommendations([]); // 清空之前的推荐
    try {
      // 模拟 AI 推荐延迟
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 根据事件描述推荐标签（Mock数据，实际应调用后端API）
      const description = currentEditEvent.事件描述 || '';
      const recommendations = [];

      // 简单的关键词匹配推荐逻辑（带理由）
      const keywordRules = {
        '噪音|扰民|吵': [
          { tag: '噪音投诉', reason: '事件描述中提到噪音/扰民相关内容' },
          { tag: '夜间扰民', reason: '可能涉及夜间噪音问题，需关注时间段' },
          { tag: '重点关注', reason: '噪音扰民易引发邻里矛盾，建议重点跟进' },
        ],
        '停车|车位': [
          { tag: '停车纠纷', reason: '事件涉及停车或车位问题' },
          { tag: '待处理', reason: '停车问题需要现场调解处理' },
        ],
        '纠纷|矛盾|争执': [
          { tag: '邻里纠纷', reason: '事件描述中包含纠纷/矛盾关键词' },
          { tag: '需调解', reason: '存在矛盾冲突，建议安排调解' },
          { tag: '持续关注', reason: '纠纷类事件可能反复，需持续跟进' },
        ],
        '垃圾|卫生|清理': [
          { tag: '环境卫生', reason: '事件涉及垃圾或卫生问题' },
          { tag: '垃圾清理', reason: '需要安排清理工作' },
          { tag: '已派单', reason: '建议派单给环卫部门处理' },
        ],
        '消防|安全|隐患': [
          { tag: '消防安全', reason: '事件涉及消防或安全隐患' },
          { tag: '隐患排查', reason: '存在安全风险，需排查处理' },
          { tag: '紧急处理', reason: '安全隐患需要优先紧急处理' },
        ],
        '道路|维修|基础设施': [
          { tag: '基础设施', reason: '涉及道路或基础设施问题' },
          { tag: '道路维修', reason: '需要进行道路维护修缮' },
        ],
        '违章|违建': [
          { tag: '违章建筑', reason: '事件涉及违章或违建问题' },
          { tag: '待拆除', reason: '违建可能需要拆除处理' },
        ],
        '交通|堵塞': [
          { tag: '交通违章', reason: '事件涉及交通相关问题' },
          { tag: '重点区域', reason: '交通问题区域需重点关注' },
        ],
      };

      // 遍历关键词进行匹配
      for (const [pattern, recs] of Object.entries(keywordRules)) {
        if (new RegExp(pattern).test(description)) {
          recommendations.push(...recs);
          break; // 只匹配第一个关键词组
        }
      }

      // 如果没有匹配到，推荐一些通用标签
      if (recommendations.length === 0) {
        recommendations.push(
          { tag: '待处理', reason: '新事件默认标记为待处理状态' },
          { tag: '重点关注', reason: '建议关注事件后续进展' }
        );
      }

      // 过滤掉已选中的标签
      const filteredRecommendations = recommendations.filter(
        rec => !selectedTags.includes(rec.tag)
      );

      setAiRecommendations(filteredRecommendations);

      if (filteredRecommendations.length > 0) {
        message.success(`AI 推荐了 ${filteredRecommendations.length} 个标签，请在下方查看`);
      } else {
        message.info('推荐的标签已全部添加');
      }
    } catch (error) {
      message.error('AI 推荐失败: ' + error.message);
    } finally {
      setAiRecommending(false);
    }
  };

  // 采用AI推荐的标签
  const handleAcceptRecommendation = (tagName) => {
    if (!selectedTags.includes(tagName)) {
      setSelectedTags([...selectedTags, tagName]);
      // 从推荐列表中移除已采用的标签
      setAiRecommendations(prev => prev.filter(rec => rec.tag !== tagName));
      message.success(`已添加标签：${tagName}`);
    }
  };

  // 采用全部AI推荐的标签
  const handleAcceptAllRecommendations = () => {
    const newTags = aiRecommendations.map(rec => rec.tag);
    const uniqueTags = Array.from(new Set([...selectedTags, ...newTags]));
    setSelectedTags(uniqueTags);
    setAiRecommendations([]);
    message.success(`已添加 ${newTags.length} 个标签`);
  };

  // 保存标签编辑
  // AI 标签发现：开始分析
  const handleStartAIDiscovery = () => {
    setAiDiscoveryDrawerVisible(true);
    setAiAnalyzing(true);
    setAiSuggestedTags([]);
    setSelectedSuggestedTags([]);

    // 模拟 AI 分析过程（3秒后返回结果）
    setTimeout(() => {
      const mockSuggestions = [
        {
          id: 1,
          tagName: '催收投诉',
          description: '涉及贷款催收方式不当、频繁骚扰等问题',
          eventCount: 8,
          confidence: 0.92,
          allEvents: [
            { id: 'NMW202505060002', desc: '#长效关注#转贷款租赁的车子被贷款公司拖走，要求归还车辆并支付拖车费用。反映催收方式不当，车辆被强行拖走造成经济损失。' },
            { id: 'WCW202505050001', desc: '#长效关注#153****0394报称其因贷款逾期遭到多次电话骚扰，催收人员态度恶劣并威胁要上门催收，严重影响正常生活。' },
            { id: 'GLW202505010001', desc: '#长效关注#米粮也有声音，来自贷款公司的催收电话每天十几个，已经严重骚扰到家人，要求停止骚扰行为。' },
            { id: 'SQW202505020003', desc: '反映某贷款平台催收人员多次拨打其家人电话进行骚扰，并在微信群中公开其个人信息，侵犯隐私权。' },
            { id: 'XCW202505030005', desc: '投诉贷款公司采用暴力催收手段，多次发送恐吓短信，威胁要到工作单位闹事，造成极大心理压力。' },
            { id: 'YHW202505040002', desc: '因贷款逾期几天就遭到催收公司频繁电话骚扰，每天接到20多个催收电话，严重影响工作和生活。' },
            { id: 'TMW202505050006', desc: '#重点关注#催收人员使用侮辱性语言进行电话催收，并威胁要曝光其个人信息，要求立即停止不当催收行为。' },
            { id: 'PJW202505060004', desc: '贷款公司在未经同意的情况下联系其紧急联系人进行催收，泄露其贷款信息，侵犯个人隐私。' },
          ]
        },
        {
          id: 2,
          tagName: '合同纠纷',
          description: '贷款合同条款理解、违约责任等争议',
          eventCount: 6,
          confidence: 0.88,
          allEvents: [
            { id: 'SQW202505310004', desc: '因为买车贷款的事情产生纠纷，认为贷款合同中存在霸王条款，要求解除合同并退还已支付的费用。' },
            { id: 'GLW202505300008', desc: '我（在长沙，手机号：187****5432）办理的汽车贷款合同中利率与口头承诺不符，要求按照原承诺执行合同。' },
            { id: 'XCW202505290012', desc: '签订贷款合同时未被充分告知违约责任条款，现因逾期产生高额违约金，认为不合理要求重新协商。' },
            { id: 'YHW202505280015', desc: '贷款合同到期后公司单方面修改还款方式，未经本人同意就从银行卡扣款，要求恢复原合同约定。' },
            { id: 'TMW202505270009', desc: '对贷款合同中的提前还款违约金条款存在异议，认为该条款不合理，要求取消提前还款的违约金。' },
            { id: 'NMW202505260011', desc: '贷款合同中约定的服务费与实际收取金额不符，怀疑存在乱收费情况，要求退还多收取的费用。' },
          ]
        },
        {
          id: 3,
          tagName: '利息争议',
          description: '对贷款利息计算、利率过高等问题的投诉',
          eventCount: 4,
          confidence: 0.85,
          allEvents: [
            { id: 'GQW202505280017', desc: '与贷款公司为贷款问题发生纠纷，认为实际年化利率超过24%，属于高利贷，要求按照法定利率重新计算。' },
            { id: 'GQW202505280016', desc: '与贷款公司为贷款问题发生争议，发现利息计算方式与合同约定不符，多收取了利息费用。' },
            { id: 'WCW202505270013', desc: '贷款时被告知年利率12%，但实际还款发现综合费率达到20%以上，要求说明各项费用明细。' },
            { id: 'PJW202505260014', desc: '申请的消费贷款实际利率远高于宣传利率，加上各种手续费后年化利率超过30%，要求降低利率。' },
          ]
        },
        {
          id: 4,
          tagName: '还款问题',
          description: '涉及提前还款、还款渠道、还款记录等问题',
          eventCount: 2,
          confidence: 0.78,
          allEvents: [
            { id: 'GLOW202505280401', desc: '在这里培训学校拱墅，付了钱后申请退款并提前还清贷款，但贷款公司一直不配合办理提前还款手续。' },
            { id: 'SQW202505270402', desc: '已按时通过银行转账还款，但贷款公司系统显示逾期，要求核实还款记录并更正逾期状态。' },
          ]
        },
      ];

      setAiSuggestedTags(mockSuggestions);
      setAiAnalyzing(false);
      message.success('AI 分析完成，发现 4 个新标签建议');
    }, 3000);
  };

  // AI 标签发现：确认添加标签
  const handleConfirmAITags = async () => {
    if (selectedSuggestedTags.length === 0) {
      message.warning('请至少选择一个标签');
      return;
    }

    try {
      // 模拟添加标签到系统
      message.loading('正在添加标签...', 1);

      setTimeout(() => {
        message.success(`成功添加 ${selectedSuggestedTags.length} 个标签到标签库`);
        setUntaggedCount(prev => Math.max(0, prev - selectedSuggestedTags.reduce((sum, id) => {
          const tag = aiSuggestedTags.find(t => t.id === id);
          return sum + (tag?.eventCount || 0);
        }, 0)));
        setAiDiscoveryDrawerVisible(false);
        setSelectedSuggestedTags([]);
      }, 1000);
    } catch (error) {
      message.error('添加标签失败');
    }
  };

  // AI 标签发现：开始编辑标签名称
  const handleStartEditTagName = (tag) => {
    setEditingTagId(tag.id);
    setEditingTagName(tag.tagName);
  };

  // AI 标签发现：保存标签名称编辑
  const handleSaveTagName = (tagId) => {
    if (!editingTagName.trim()) {
      message.warning('标签名称不能为空');
      return;
    }

    setAiSuggestedTags(prev =>
      prev.map(tag =>
        tag.id === tagId ? { ...tag, tagName: editingTagName } : tag
      )
    );
    setEditingTagId(null);
    setEditingTagName('');
    message.success('标签名称已更新');
  };

  // AI 标签发现：取消编辑标签名称
  const handleCancelEditTagName = () => {
    setEditingTagId(null);
    setEditingTagName('');
  };

  // AI 标签发现：移除事件
  const handleRemoveEventFromTag = (tagId, eventId) => {
    setAiSuggestedTags(prev =>
      prev.map(tag => {
        if (tag.id === tagId) {
          const newEvents = tag.allEvents.filter(event => event.id !== eventId);
          return {
            ...tag,
            allEvents: newEvents,
            eventCount: newEvents.length,
          };
        }
        return tag;
      })
    );
    message.success('事件已移除');
  };

  const handleSaveTagsEdit = async () => {
    if (!currentEditEvent) return;

    try {
      await eventAPI.updateEventTags(currentEditEvent.事件编号, selectedTags);
      message.success('标签更新成功');

      // 将新标签转换为对象格式（默认为人工标签）
      const newTagObjects = selectedTags.map(tagName => ({
        name: tagName,
        type: 'human' // 手动添加的标签默认为人工标签
      }));

      // 更新本地数据
      setEvents(events.map(e =>
        e.事件编号 === currentEditEvent.事件编号 ? { ...e, tags: newTagObjects } : e
      ));

      setTagEditModalVisible(false);
      setCurrentEditEvent(null);
      setSelectedTags([]);
    } catch (error) {
      message.error('更新标签失败: ' + error.message);
    }
  };

  const columns = [
    {
      title: '事件编号',
      dataIndex: '事件编号',
      key: '事件编号',
      width: columnWidths['事件编号'],
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
      onHeaderCell: () => ({
        width: columnWidths['相关'],
        onResize: handleResize('相关'),
      }),
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
      title: '标签',
      key: '标签',
      dataIndex: 'tags',
      width: columnWidths['标签'],
      onHeaderCell: () => ({
        width: columnWidths['标签'],
        onResize: handleResize('标签'),
      }),
      render: (tags, record) => {
        // 处理标签数据，支持字符串或对象格式
        const normalizedTags = (tags || []).map(tag => {
          if (typeof tag === 'string') {
            return { name: tag, type: 'unknown' };
          }
          return tag;
        });

        return (
          <Space size={[0, 8]} wrap>
            {normalizedTags.map((tag, index) => {
              // 根据标签类型设置颜色
              let color = 'default';
              let icon = '';
              if (tag.type === 'ai') {
                color = 'blue';
                icon = '🤖 '; // AI 图标
              } else if (tag.type === 'human') {
                color = 'green';
                icon = '👤 '; // 人工图标
              }

              return (
                <Tag
                  key={`${record.事件编号}-${tag.name}-${index}`}
                  color={color}
                >
                  {icon}{tag.name}
                </Tag>
              );
            })}
            <Button
              type="dashed"
              size="small"
              onClick={() => handleEditTags(record)}
            >
              {tags && tags.length > 0 ? '编辑' : '添加'}
            </Button>
          </Space>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: columnWidths['action'],
      onHeaderCell: () => ({
        width: columnWidths['action'],
        onResize: handleResize('action'),
      }),
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/events/${record.事件编号}`)}
            />
          </Tooltip>
          <Tooltip title="从主题中移除">
            <Popconfirm
              title="移除事件"
              description={`确定要将事件 ${record.事件编号} 从当前主题中移除吗？`}
              onConfirm={() => removeEventFromTopic(record.事件编号)}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      )
    }
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

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>{topic?.name || '主题详情'}</Title>
        <Button icon={<EditOutlined />} onClick={openEditDrawer}>编辑主题</Button>
      </div>

      {/* AI 标签发现提示 */}
      {untaggedCount > 0 && (
        <Alert
          message={
            <Space>
              <InfoCircleOutlined />
              <span>
                当前有 <strong style={{ color: '#ff4d4f' }}>{untaggedCount}</strong> 个事件未能分配标签
              </span>
            </Space>
          }
          description="使用 AI 分析未分类事件，自动发现潜在的新标签，帮助您更好地组织和管理事件。"
          type="warning"
          showIcon={false}
          action={
            <Button
              type="primary"
              size="small"
              icon={<RocketOutlined />}
              onClick={handleStartAIDiscovery}
            >
              AI 标签发现
            </Button>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'events',
              label: '事件列表',
              children: (
                <div>
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 14, color: '#666' }}>
            总事件数：<strong style={{ fontSize: 16, color: '#1890ff' }}>{stats?.total || 0}</strong>
          </div>
          <Button icon={<SettingOutlined />} onClick={() => setColumnModalOpen(true)}>自定义列</Button>
        </div>
        <Table
          columns={orderedColumns()}
          dataSource={events}
          rowKey="事件编号"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            pageSizeOptions: ['10', '20', '50', '100'],
            onChange: (page, size) => loadEvents(page, size)
          }}
          size="small"
          scroll={{ x: 1200 }}
          components={{
            header: {
              cell: ResizeableTitle,
            },
          }}
        />
        {/* 自定义列弹窗 */}
        <Modal
          title="自定义显示的列"
          open={columnModalOpen}
          onCancel={() => setColumnModalOpen(false)}
          footer={[
            <Button key="reset" onClick={() => {
              const defaultKeys = defaultVisibleKeys();
              setVisibleColumnKeys(defaultKeys);
              localStorage.setItem(`topic_detail_visible_columns_${topicId}`, JSON.stringify(defaultKeys));
            }}>恢复默认</Button>,
            <Button key="cancel" onClick={() => setColumnModalOpen(false)}>取消</Button>,
            <Button key="ok" type="primary" onClick={() => {
              localStorage.setItem(`topic_detail_visible_columns_${topicId}`, JSON.stringify(visibleColumnKeys));
              setColumnModalOpen(false);
            }}>确定</Button>,
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
            style={{ border: '1px dashed #d9d9d9', padding: 8, borderRadius: 4, minHeight: 48, marginTop: 8 }}
            onDragOver={(e) => e.preventDefault()}
          >
            {visibleColumnKeys.map((k, idx) => (
              <div
                key={k}
                draggable
                onDragStart={() => { dragIndexRef.current = idx; }}
                onDrop={(e) => {
                  e.preventDefault();
                  const from = dragIndexRef.current; const to = idx;
                  if (from === to || from == null) return;
                  const next = [...visibleColumnKeys];
                  const [moved] = next.splice(from, 1);
                  next.splice(to, 0, moved);
                  setVisibleColumnKeys(next);
                  dragIndexRef.current = null;
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 8px', margin: 4, border: '1px solid #e5e7eb', borderRadius: 4, background: '#fafafa', cursor: 'grab', userSelect: 'none' }}
                title="拖拽以排序"
              >
                <span style={{ color: '#999', fontSize: 12, letterSpacing: 1 }}>≡</span>
                <span>{(columns.find(c => c.key === k) || {}).title || k}</span>
              </div>
            ))}
            {visibleColumnKeys.length === 0 && (<div style={{ color: '#999', fontSize: 12 }}>未选择任何列</div>)}
          </div>
        </Modal>
                </div>
              )
            },
            {
              key: 'trend',
              label: '趋势分析',
              children: (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <RangePicker value={statsDateRange} onChange={setStatsDateRange} allowClear />
                  </div>
                  <Tabs
                    activeKey={statsView}
                    onChange={setStatsView}
                    items={[
                      { key: 'day', label: '按日统计' },
                      { key: 'month', label: '按月统计' },
                    ]}
                  />
                  <div style={{ marginTop: 16 }}>
                    <Spin spinning={statsLoading}>
                      <Line
                        data={buildChartData()}
                        xField="date"
                        yField="count"
                        height={400}
                        xAxis={{ title: null, label: { autoRotate: true } }}
                        yAxis={{ title: null, min: 0 }}
                        smooth
                        point={{ size: 3 }}
                        meta={{
                          date: { alias: statsView === 'day' ? '日期' : '月份' },
                          count: { alias: '数量' },
                        }}
                        tooltip={{
                          showMarkers: false,
                          formatter: (datum) => ({ name: '数量', value: Number(datum.count ?? 0) }),
                        }}
                      />
                    </Spin>
                  </div>
                  <div style={{ marginTop: 24 }}>
                    <Table
                      loading={statsLoading}
                      dataSource={(statsView === 'day' ? (stats?.by_day || []) : getMonthlyData()).sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf())}
                      columns={detailColumns}
                      rowKey="date"
                      pagination={{ pageSize: 20, showSizeChanger: true, showQuickJumper: true, showTotal: (total) => `共 ${total} 条` }}
                      size="small"
                    />
                  </div>
                </div>
              )
            },
            {
              key: 'tagAnalysis',
              label: '标签分析',
              children: (
                <div>
                  <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    {mockTagAnalysisData.tags.map(tag => (
                      <Col span={24} key={tag.id}>
                        <Card
                          title={
                            <Space>
                              <TagsOutlined />
                              <span>{tag.name}</span>
                              <Tag color="blue">{tag.count} 条事件</Tag>
                            </Space>
                          }
                          extra={
                            <Button
                              type="link"
                              icon={<EyeOutlined />}
                              onClick={() => {
                                setSelectedTag(tag);
                                setTagEventsModalVisible(true);
                              }}
                            >
                              查看事件列表
                            </Button>
                          }
                        >
                          <Row gutter={[16, 16]}>
                            {/* 趋势图 */}
                            <Col span={12}>
                              <div style={{ marginBottom: 8 }}>
                                <strong>趋势变化</strong>
                              </div>
                              <Line
                                data={tag.trend}
                                xField="date"
                                yField="count"
                                height={200}
                                xAxis={{ title: null, label: { autoRotate: true } }}
                                yAxis={{ title: null, min: 0 }}
                                smooth
                                point={{ size: 3 }}
                                meta={{
                                  date: { alias: '月份' },
                                  count: { alias: '数量' },
                                }}
                                tooltip={{
                                  showMarkers: false,
                                  formatter: (datum) => ({ name: '数量', value: datum.count }),
                                }}
                              />
                            </Col>
                            {/* 人员分析 */}
                            <Col span={12}>
                              <div style={{ marginBottom: 8 }}>
                                <strong>相关人员（按事件数排序）</strong>
                              </div>
                              <Table
                                dataSource={tag.persons}
                                pagination={false}
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
                                    width: 130,
                                    render: (text) => (
                                      <span style={{ fontFamily: 'monospace' }}>{text}</span>
                                    ),
                                  },
                                  {
                                    title: '角色',
                                    dataIndex: 'role',
                                    key: 'role',
                                    width: 80,
                                    render: (text) => {
                                      let color = 'default';
                                      if (text === '报警人') color = 'blue';
                                      else if (text === '对方') color = 'orange';
                                      else if (text === '当事人') color = 'green';
                                      return <Tag color={color}>{text}</Tag>;
                                    },
                                  },
                                  {
                                    title: '事件数',
                                    dataIndex: 'event_count',
                                    key: 'event_count',
                                    width: 80,
                                    align: 'center',
                                    render: (text) => (
                                      <span style={{ fontWeight: 'bold', color: '#1890ff' }}>{text}</span>
                                    ),
                                  },
                                ]}
                              />
                            </Col>
                          </Row>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </div>
              )
            },
            {
              key: 'personAnalysis',
              label: '人员分析',
              children: (
                <div>
                  {/* 人员列表 */}
                  <Card title="涉及人员列表">
                    <Table
                      dataSource={(() => {
                        // 合并所有标签的人员数据
                        const personMap = new Map();
                        mockTagAnalysisData.tags.forEach(tag => {
                          tag.persons.forEach(person => {
                            if (personMap.has(person.phone)) {
                              const existing = personMap.get(person.phone);
                              existing.event_count += person.event_count;
                              if (!existing.tags.includes(tag.name)) {
                                existing.tags.push(tag.name);
                              }
                            } else {
                              personMap.set(person.phone, {
                                ...person,
                                tags: [tag.name]
                              });
                            }
                          });
                        });
                        return Array.from(personMap.values()).sort((a, b) => b.event_count - a.event_count);
                      })()}
                      rowKey="phone"
                      pagination={{
                        pageSize: 20,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total) => `共 ${total} 人`
                      }}
                      size="small"
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
                          width: 130,
                          render: (text) => (
                            <span style={{ fontFamily: 'monospace' }}>{text}</span>
                          ),
                        },
                        {
                          title: '身份证号码',
                          dataIndex: 'idCard',
                          key: 'idCard',
                          width: 170,
                          render: (text) => (
                            <span style={{ fontFamily: 'monospace' }}>{text || '-'}</span>
                          ),
                        },
                        {
                          title: '角色',
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
                          title: '关联事件标签',
                          dataIndex: 'tags',
                          key: 'tags',
                          render: (tags) => (
                            <Space size={[4, 4]} wrap>
                              {tags.map((tag, idx) => (
                                <Tag key={idx} color="blue">{tag}</Tag>
                              ))}
                            </Space>
                          ),
                        },
                        {
                          title: '人口画像标签',
                          dataIndex: 'profileTags',
                          key: 'profileTags',
                          render: (tags) => (
                            <Space size={[4, 4]} wrap>
                              {tags?.map((tag, idx) => (
                                <Tag key={idx} color="green">{tag}</Tag>
                              ))}
                            </Space>
                          ),
                        },
                        {
                          title: '关联事件数',
                          dataIndex: 'event_count',
                          key: 'event_count',
                          width: 120,
                          align: 'center',
                          sorter: (a, b) => a.event_count - b.event_count,
                          render: (text) => (
                            <span style={{ fontWeight: 'bold', color: '#1890ff' }}>{text}</span>
                          ),
                        },
                        {
                          title: '操作',
                          key: 'action',
                          width: 100,
                          align: 'center',
                          render: (_, record) => (
                            <Button
                              type="link"
                              size="small"
                              icon={<EyeOutlined />}
                              onClick={() => {
                                setSelectedPerson(record);
                                setPersonEventDrawerVisible(true);
                              }}
                            >
                              详情
                            </Button>
                          ),
                        },
                      ]}
                    />
                  </Card>
                </div>
              )
            }
          ]}
        />
      </Card>

      {/* 标签编辑弹窗 */}
      <Modal
        title="编辑标签"
        open={tagEditModalVisible}
        onCancel={() => {
          setTagEditModalVisible(false);
          setCurrentEditEvent(null);
          setSelectedTags([]);
          setAiRecommendations([]);
        }}
        onOk={handleSaveTagsEdit}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <strong>事件编号：</strong>
          {currentEditEvent?.事件编号}
        </div>
        <div style={{ marginBottom: 16 }}>
          <strong>事件描述：</strong>
          <div style={{ marginTop: 8, padding: 8, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
            {currentEditEvent?.事件描述}
          </div>
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <strong>选择标签：</strong>
            <Button
              type="link"
              size="small"
              onClick={handleAIRecommend}
              loading={aiRecommending}
              style={{ padding: 0 }}
            >
              AI 推荐
            </Button>
          </div>
          <Select
            mode="multiple"
            style={{ width: '100%', marginTop: 8 }}
            placeholder="请选择标签"
            value={selectedTags}
            onChange={setSelectedTags}
            showSearch
            filterOption={(input, option) => {
              // 支持搜索标签名称
              const label = option?.label || option?.children || '';
              return label.toLowerCase().includes(input.toLowerCase());
            }}
            listHeight={400}
            dropdownStyle={{ maxHeight: 400 }}
          >
            {availableTags.map(group => (
              <Select.OptGroup key={group.groupName} label={group.groupName}>
                {group.tags.map(tag => (
                  <Select.Option key={tag.name} value={tag.name} label={tag.name}>
                    <span>
                      {tag.type === 'ai' ? '🤖 ' : '👤 '}
                      {tag.name}
                    </span>
                  </Select.Option>
                ))}
              </Select.OptGroup>
            ))}
          </Select>
        </div>

        {/* AI推荐结果展示区域 */}
        {aiRecommendations.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <strong style={{ color: '#1890ff' }}>AI 推荐标签：</strong>
              <Button
                type="link"
                size="small"
                onClick={handleAcceptAllRecommendations}
              >
                全部采用
              </Button>
            </div>
            <div style={{
              padding: 12,
              backgroundColor: '#f0f5ff',
              borderRadius: 6,
              border: '1px solid #d6e4ff'
            }}>
              {aiRecommendations.map((rec, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    padding: '8px 0',
                    borderBottom: index < aiRecommendations.length - 1 ? '1px solid #e8e8e8' : 'none'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <Tag color="blue" style={{ marginRight: 8 }}>
                      {rec.tag}
                    </Tag>
                    <span style={{ color: '#666', fontSize: 12 }}>
                      {rec.reason}
                    </span>
                  </div>
                  <Button
                    type="primary"
                    size="small"
                    ghost
                    onClick={() => handleAcceptRecommendation(rec.tag)}
                  >
                    采用
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* AI 标签发现抽屉 */}
      <Drawer
        title={
          <Space>
            <RocketOutlined />
            <span>AI 标签发现</span>
          </Space>
        }
        open={aiDiscoveryDrawerVisible}
        onClose={() => setAiDiscoveryDrawerVisible(false)}
        width={900}
        footer={
          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setAiDiscoveryDrawerVisible(false)}>
                取消
              </Button>
              <Button
                type="primary"
                onClick={handleConfirmAITags}
                disabled={aiAnalyzing || selectedSuggestedTags.length === 0}
              >
                确认添加 {selectedSuggestedTags.length > 0 && `(${selectedSuggestedTags.length})`}
              </Button>
            </Space>
          </div>
        }
      >
        <div>
          {/* 分析进行中 */}
          {aiAnalyzing && (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <Spin size="large" />
              <div style={{ marginTop: 24, fontSize: 16, color: '#666' }}>
                AI 正在分析未分类事件...
              </div>
              <div style={{ marginTop: 12, fontSize: 14, color: '#999' }}>
                正在根据主题"{topic?.name}"和已有标签进行智能聚类分析
              </div>
            </div>
          )}

          {/* 分析结果 */}
          {!aiAnalyzing && aiSuggestedTags.length > 0 && (
            <div>
              <Alert
                message="AI 分析完成"
                description={`发现 ${aiSuggestedTags.length} 个潜在的新标签，请选择需要添加到标签库的标签。`}
                type="success"
                showIcon
                style={{ marginBottom: 16 }}
              />

              <Checkbox.Group
                value={selectedSuggestedTags}
                onChange={setSelectedSuggestedTags}
                style={{ width: '100%' }}
              >
                <Space direction="vertical" style={{ width: '100%' }} size={16}>
                  {aiSuggestedTags.map(tag => (
                    <div
                      key={tag.id}
                      style={{
                        border: selectedSuggestedTags.includes(tag.id) ? '2px solid #1890ff' : '1px solid #d9d9d9',
                        borderRadius: 4,
                        padding: '12px',
                        background: '#fff',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 12 }}>
                        <Checkbox value={tag.id} style={{ marginRight: 12, marginTop: 4 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Space>
                              {editingTagId === tag.id ? (
                                <Space.Compact>
                                  <Input
                                    value={editingTagName}
                                    onChange={(e) => setEditingTagName(e.target.value)}
                                    style={{ width: 150 }}
                                    size="small"
                                    onPressEnter={() => handleSaveTagName(tag.id)}
                                  />
                                  <Button
                                    type="primary"
                                    size="small"
                                    icon={<CheckOutlined />}
                                    onClick={() => handleSaveTagName(tag.id)}
                                  />
                                  <Button
                                    size="small"
                                    icon={<CloseOutlined />}
                                    onClick={handleCancelEditTagName}
                                  />
                                </Space.Compact>
                              ) : (
                                <>
                                  <Tag color="blue" style={{ fontSize: 14, padding: '2px 8px' }}>
                                    {tag.tagName}
                                  </Tag>
                                  <Button
                                    type="text"
                                    size="small"
                                    icon={<EditOutlined />}
                                    onClick={() => handleStartEditTagName(tag)}
                                    title="编辑标签名称"
                                  />
                                </>
                              )}
                              <Tag color="green">
                                {tag.eventCount} 个事件
                              </Tag>
                              <Tag color="orange">
                                置信度: {(tag.confidence * 100).toFixed(0)}%
                              </Tag>
                            </Space>
                          </div>
                          <div style={{ color: '#666', marginTop: 8 }}>
                            {tag.description}
                          </div>
                        </div>
                      </div>

                      <Collapse
                        size="small"
                        defaultActiveKey={[]}
                        style={{ background: '#fafafa' }}
                      >
                        <Collapse.Panel
                          header={`关联事件列表 (${tag.eventCount} 条)`}
                          key="events"
                        >
                          <div style={{ marginTop: 8 }}>
                            {tag.allEvents?.map((event, idx) => (
                              <div
                                key={event.id}
                                style={{
                                  padding: '12px',
                                  background: idx % 2 === 0 ? '#fff' : '#f5f5f5',
                                  borderRadius: 4,
                                  marginBottom: 8,
                                  border: '1px solid #e8e8e8',
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                  <Space>
                                    <Tag color="blue" style={{ fontFamily: 'monospace', fontSize: 11 }}>
                                      {idx + 1}
                                    </Tag>
                                    <Button
                                      type="link"
                                      size="small"
                                      onClick={() => navigate(`/events/${event.id}`)}
                                      style={{ padding: 0, height: 'auto', fontFamily: 'monospace', fontSize: 12 }}
                                    >
                                      {event.id}
                                    </Button>
                                  </Space>
                                  <Popconfirm
                                    title="确认移除此事件？"
                                    description="该事件将从此标签的关联列表中移除"
                                    onConfirm={() => handleRemoveEventFromTag(tag.id, event.id)}
                                    okText="确认"
                                    cancelText="取消"
                                  >
                                    <Button
                                      type="text"
                                      danger
                                      size="small"
                                      icon={<DeleteOutlined />}
                                      title="移除事件"
                                    />
                                  </Popconfirm>
                                </div>
                                <div style={{ lineHeight: 1.6, fontSize: 13, color: '#333', paddingLeft: 8 }}>
                                  {event.desc}
                                </div>
                              </div>
                            ))}
                          </div>
                        </Collapse.Panel>
                      </Collapse>
                    </div>
                  ))}
                </Space>
              </Checkbox.Group>
            </div>
          )}

          {/* 无结果 */}
          {!aiAnalyzing && aiSuggestedTags.length === 0 && (
            <Empty
              description="暂无标签建议"
              style={{ marginTop: 60 }}
            />
          )}
        </div>
      </Drawer>

      {/* 编辑主题抽屉 */}
      <Drawer
        title="编辑主题"
        open={editDrawerVisible}
        onClose={() => setEditDrawerVisible(false)}
        width={800}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button
              onClick={prevEditStep}
              disabled={editCurrentStep === 0}
              icon={<LeftOutlined />}
            >
              上一步
            </Button>

            <Space>
              <Button onClick={() => setEditDrawerVisible(false)}>
                取消
              </Button>

              {editCurrentStep < 2 ? (
                <Button
                  type="primary"
                  onClick={nextEditStep}
                  icon={<RightOutlined />}
                >
                  下一步
                </Button>
              ) : (
                <Button
                  type="primary"
                  loading={editSubmitting}
                  onClick={handleEditSubmit}
                  icon={<CheckCircleOutlined />}
                >
                  保存更新
                </Button>
              )}
            </Space>
          </div>
        }
      >
        <Steps
          current={editCurrentStep}
          style={{ marginBottom: 32 }}
          items={editSteps.map(step => ({
            title: step.title,
            icon: step.icon
          }))}
        />

        <div style={{ minHeight: '400px' }}>
          {editSteps[editCurrentStep].content}
        </div>
      </Drawer>

      {/* 人员事件明细抽屉 */}
      <Drawer
        title={selectedPerson ? `${selectedPerson.name} - 关联事件明细` : '关联事件明细'}
        width={1200}
        open={personEventDrawerVisible}
        onClose={() => {
          setPersonEventDrawerVisible(false);
          setSelectedPerson(null);
        }}
      >
        {selectedPerson && (
          <div>
            {/* 人员信息 */}
            <Card style={{ marginBottom: 16, background: '#fafafa' }}>
              <Row gutter={[16, 16]}>
                <Col span={6}>
                  <div><strong>姓名：</strong>{selectedPerson.name}</div>
                </Col>
                <Col span={6}>
                  <div><strong>手机号：</strong><span style={{ fontFamily: 'monospace' }}>{selectedPerson.phone}</span></div>
                </Col>
                <Col span={6}>
                  <div><strong>身份证号：</strong><span style={{ fontFamily: 'monospace' }}>{selectedPerson.idCard || '-'}</span></div>
                </Col>
                <Col span={6}>
                  <div><strong>角色：</strong><Tag color={selectedPerson.role === '报警人' ? 'blue' : selectedPerson.role === '对方' ? 'orange' : 'green'}>{selectedPerson.role}</Tag></div>
                </Col>
              </Row>
              <Row gutter={[16, 16]} style={{ marginTop: 12 }}>
                <Col span={12}>
                  <div>
                    <strong>关联事件标签：</strong>
                    <Space size={[4, 4]} wrap style={{ marginLeft: 8 }}>
                      {selectedPerson.tags?.map((tag, idx) => (
                        <Tag key={idx} color="blue">{tag}</Tag>
                      ))}
                    </Space>
                  </div>
                </Col>
                <Col span={12}>
                  <div>
                    <strong>人口画像标签：</strong>
                    <Space size={[4, 4]} wrap style={{ marginLeft: 8 }}>
                      {selectedPerson.profileTags?.map((tag, idx) => (
                        <Tag key={idx} color="green">{tag}</Tag>
                      ))}
                    </Space>
                  </div>
                </Col>
              </Row>
            </Card>

            {/* 事件列表 */}
            <Table
              dataSource={events.filter(event => {
                // 过滤出与该人员相关的事件（手机号匹配）
                const reporterInfo = event.报警人信息 || '';
                return reporterInfo.includes(selectedPerson.phone);
              })}
              rowKey="事件编号"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条关联事件`
              }}
              size="small"
              scroll={{ x: 1200 }}
              columns={[
                {
                  title: '事件编号',
                  dataIndex: '事件编号',
                  key: '事件编号',
                  width: 150,
                  fixed: 'left',
                },
                {
                  title: '事件描述',
                  dataIndex: '事件描述',
                  key: '事件描述',
                  width: 250,
                  ellipsis: true,
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
                },
                {
                  title: '二级分类',
                  dataIndex: '二级分类',
                  key: '二级分类',
                  width: 120,
                },
                {
                  title: '上报时间',
                  dataIndex: '上报时间',
                  key: '上报时间',
                  width: 150,
                },
                {
                  title: '标签',
                  dataIndex: '标签',
                  key: '标签',
                  width: 200,
                  render: (tags) => (
                    <Space size={[4, 4]} wrap>
                      {tags?.map((tag, idx) => (
                        <Tag key={idx} color="blue">{tag.name}</Tag>
                      ))}
                    </Space>
                  ),
                },
              ]}
            />
          </div>
        )}
      </Drawer>

      {/* 标签事件列表Modal */}
      <Modal
        title={
          <Space>
            <TagsOutlined style={{ color: '#1890ff' }} />
            <span>{selectedTag?.name} - 事件列表</span>
            <Tag color="blue">{selectedTag?.count} 条事件</Tag>
          </Space>
        }
        open={tagEventsModalVisible}
        onCancel={() => {
          setTagEventsModalVisible(false);
          setSelectedTag(null);
        }}
        footer={[
          <Button key="close" type="primary" onClick={() => setTagEventsModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={1400}
      >
        {selectedTag && (
          <div>
            <Alert
              message={`该标签关联了 ${selectedTag.count} 个事件`}
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Table
              dataSource={events.filter(event =>
                event.标签?.some(tag => tag.name === selectedTag.name)
              )}
              rowKey={(record) => record.事件编号}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条`,
                pageSizeOptions: ['10', '20', '50'],
              }}
              scroll={{ x: 1200 }}
              size="small"
              columns={[
                {
                  title: '事件编号',
                  dataIndex: '事件编号',
                  key: '事件编号',
                  width: 150,
                  fixed: 'left',
                  render: (text) => (
                    <Button
                      type="link"
                      icon={<EyeOutlined />}
                      onClick={() => navigate(`/events/${text}`)}
                      style={{ padding: 0, fontFamily: 'monospace', fontSize: '12px' }}
                    >
                      {text}
                    </Button>
                  ),
                },
                {
                  title: '事件描述',
                  dataIndex: '事件描述',
                  key: '事件描述',
                  width: 300,
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
                  title: '村社名称',
                  dataIndex: '村社名称',
                  key: '村社名称',
                  width: 120,
                },
                {
                  title: '事件级别',
                  dataIndex: '事件级别',
                  key: '事件级别',
                  width: 100,
                  render: (text) => {
                    let color = 'default';
                    if (text?.includes('一级')) color = 'red';
                    else if (text?.includes('二级')) color = 'orange';
                    else if (text?.includes('三级')) color = 'green';
                    return <Tag color={color}>{text}</Tag>;
                  },
                },
                {
                  title: '二级分类',
                  dataIndex: '二级分类',
                  key: '二级分类',
                  width: 120,
                },
                {
                  title: '上报时间',
                  dataIndex: '上报时间',
                  key: '上报时间',
                  width: 160,
                  sorter: (a, b) => new Date(a.上报时间) - new Date(b.上报时间),
                },
                {
                  title: '处置结果',
                  dataIndex: '处置结果',
                  key: '处置结果',
                  width: 100,
                  fixed: 'right',
                  render: (text) => {
                    let color = 'default';
                    if (text === '已办结') color = 'success';
                    else if (text === '处理中') color = 'processing';
                    else if (text === '待处理') color = 'warning';
                    return <Tag color={color}>{text || '-'}</Tag>;
                  },
                },
              ]}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TopicDetail;
