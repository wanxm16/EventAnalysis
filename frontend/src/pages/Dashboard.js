import React, { useState, useMemo } from 'react';
import { Card, Row, Col, Statistic, Button, Tag, Table, Drawer, Space, Typography, Select, DatePicker, Cascader, Tooltip, Tabs, Alert } from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  FileTextOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  QuestionCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { Line } from '@ant-design/plots';
import './Dashboard.css';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

const Dashboard = () => {
  const [issueDrawerVisible, setIssueDrawerVisible] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [graphMode, setGraphMode] = useState('count'); // 'count' or 'trend'
  const [warningDrawerVisible, setWarningDrawerVisible] = useState(false);
  const [warningType, setWarningType] = useState(null);
  const [repeatEventsTab, setRepeatEventsTab] = useState('daily');
  const [keyPersonTab, setKeyPersonTab] = useState('daily');
  const [closedLoopTab, setClosedLoopTab] = useState('weekly'); // 默认本周
  const [selectedEventType, setSelectedEventType] = useState('all');
  const [selectedStreet, setSelectedStreet] = useState('all');

  // 数据总览筛选条件
  const [overviewTimeRange, setOverviewTimeRange] = useState(null);
  const [overviewStreet, setOverviewStreet] = useState('all');

  // 态势分析筛选条件 - 使用级联选择器,默认矛盾纠纷的全部
  const [situationCategory, setSituationCategory] = useState(['disputes']); // 默认矛盾纠纷(只选一级)
  const [situationTimeRange, setSituationTimeRange] = useState([dayjs().subtract(11, 'month').startOf('month'), dayjs()]); // 默认12个月

  // 街镇选项数据
  const streetOptions = [
    { label: '全部街镇', value: 'all' },
    { label: '南门街道', value: 'nanmen' },
    { label: '望城街道', value: 'wangcheng' },
    { label: '古林镇', value: 'gulin' },
    { label: '石碶街道', value: 'shiqi' },
    { label: '高桥镇', value: 'gaoqiao' },
    { label: '集士港镇', value: 'jishigang' },
    { label: '横街镇', value: 'hengjie' },
    { label: '鄞江镇', value: 'yinjiang' },
    { label: '洞桥镇', value: 'dongqiao' },
    { label: '章水镇', value: 'zhangshui' },
    { label: '龙观乡', value: 'longguan' },
  ];

  // 事件分类级联选项 - 一级分类和二级分类
  const categoryOptions = [
    {
      label: '矛盾纠纷',
      value: 'disputes',
      children: [
        { label: '债务纠纷', value: 'debt' },
        { label: '邻里纠纷', value: 'neighbor' },
        { label: '停车纠纷', value: 'parking' },
        { label: '物业纠纷', value: 'property' },
        { label: '租房纠纷', value: 'rental' },
        { label: '劳务纠纷', value: 'labor' },
      ],
    },
    {
      label: '城市管理',
      value: 'cityManagement',
      children: [
        { label: '市容市貌', value: 'cityAppearance' },
        { label: '交通秩序', value: 'traffic' },
        { label: '环境卫生', value: 'sanitation' },
        { label: '违章建筑', value: 'illegalConstruction' },
        { label: '占道经营', value: 'streetVending' },
      ],
    },
    {
      label: '公共安全',
      value: 'publicSafety',
      children: [
        { label: '消防安全', value: 'fire' },
        { label: '治安隐患', value: 'security' },
        { label: '交通安全', value: 'trafficSafety' },
        { label: '食品安全', value: 'foodSafety' },
      ],
    },
    {
      label: '生态环境',
      value: 'environment',
      children: [
        { label: '环境污染', value: 'pollution' },
        { label: '噪音扰民', value: 'noise' },
        { label: '垃圾处理', value: 'waste' },
        { label: '水质污染', value: 'waterPollution' },
      ],
    },
    {
      label: '民生服务',
      value: 'publicService',
      children: [
        { label: '政务服务', value: 'government' },
        { label: '社会保障', value: 'socialSecurity' },
        { label: '教育问题', value: 'education' },
        { label: '医疗卫生', value: 'healthcare' },
      ],
    },
  ];

  // Mock数据 - 数据总览
  const overviewData = useMemo(() => {
    const monthlyTrend = [
      { month: '1月', count: 1050 },
      { month: '2月', count: 980 },
      { month: '3月', count: 1120 },
      { month: '4月', count: 1080 },
      { month: '5月', count: 1150 },
      { month: '6月', count: 1090 },
      { month: '7月', count: 1200 },
      { month: '8月', count: 1180 },
      { month: '9月', count: 1250 },
      { month: '10月', count: 1220 },
      { month: '11月', count: 1300 },
      { month: '12月', count: 1234 },
    ];

    // 计算环比增长（当月与上月对比）
    const currentMonthCount = monthlyTrend[monthlyTrend.length - 1].count;
    const lastMonthCount = monthlyTrend[monthlyTrend.length - 2].count;
    const monthOnMonthGrowth = ((currentMonthCount - lastMonthCount) / lastMonthCount * 100).toFixed(1);

    return {
      totalEvents: 12345,
      monthEvents: 1234,
      growth: 12,
      monthOnMonthGrowth: parseFloat(monthOnMonthGrowth),
      monthlyTrend,
      sources: [
        { name: '12345热线', count: 3456 },
        { name: '市长信箱', count: 2345 },
        { name: '网格系统', count: 2134 },
        { name: '信访系统', count: 1890 },
        { name: '政务服务', count: 1234 },
        { name: '智慧城管', count: 987 },
        { name: '社会治理', count: 543 },
        { name: '其他渠道', count: 756 },
      ]
    };
  }, []);

  // Mock数据 - 每日检测（主题增量排行）
  const dailyTopicData = useMemo(() => [
    { id: 1, name: '债务纠纷', totalCount: 2847, monthlyNew: 287, weeklyNew: 89, dailyNew: 45 },
    { id: 2, name: '停车纠纷', totalCount: 2165, monthlyNew: 198, weeklyNew: 72, dailyNew: 38 },
    { id: 3, name: '噪音投诉', totalCount: 1654, monthlyNew: 156, weeklyNew: 58, dailyNew: 32 },
    { id: 4, name: '物业纠纷', totalCount: 1823, monthlyNew: 145, weeklyNew: 52, dailyNew: 28 },
    { id: 5, name: '邻里纠纷', totalCount: 2456, monthlyNew: 132, weeklyNew: 48, dailyNew: 25 },
    { id: 6, name: '劳务纠纷', totalCount: 1234, monthlyNew: 98, weeklyNew: 35, dailyNew: 22 },
    { id: 7, name: '环境污染', totalCount: 1123, monthlyNew: 87, weeklyNew: 30, dailyNew: 18 },
    { id: 8, name: '租房纠纷', totalCount: 1432, monthlyNew: 76, weeklyNew: 26, dailyNew: 15 },
    { id: 9, name: '消防安全', totalCount: 876, monthlyNew: 65, weeklyNew: 22, dailyNew: 12 },
    { id: 10, name: '交通违章', totalCount: 765, monthlyNew: 54, weeklyNew: 18, dailyNew: 10 },
  ], []);

  // Mock数据 - 问题聚焦
  const hotTopics = useMemo(() => [
    { id: 1, name: '债务纠纷', count: 2847, trend: 15, rank: 1, analysis: '债务纠纷类事件持续高发，主要集中在贷款催收、合同纠纷等领域。本月共计287件，较上月增长15%。主要涉及街道：南门街道（78件）、望城街道（65件）、古林镇（54件）。建议加强金融消费者权益保护宣传，完善矛盾纠纷调解机制。' },
    { id: 2, name: '邻里纠纷', count: 2456, trend: -8, rank: 2, analysis: '邻里纠纷呈下降趋势，主要涉及噪音扰民、停车纠纷等问题。本月共计198件，较上月下降8%。主要涉及街道：望城街道（52件）、南门街道（45件）、石碶街道（38件）。社区调解工作成效显著。' },
    { id: 3, name: '停车纠纷', count: 2165, trend: 5, rank: 3, analysis: '停车纠纷略有上升，主要集中在老旧小区和商业区。本月共计156件，较上月增长5%。主要涉及街道：古林镇（45件）、高桥镇（38件）、南门街道（32件）。建议增加公共停车位供给。' },
    { id: 4, name: '物业纠纷', count: 1823, trend: 3, rank: 4, analysis: '物业纠纷保持稳定，主要涉及物业费收取、设施维护等问题。' },
    { id: 5, name: '噪音投诉', count: 1654, trend: -12, rank: 5, analysis: '噪音投诉大幅下降，整治工作取得明显成效。' },
    { id: 6, name: '租房纠纷', count: 1432, trend: 8, rank: 6, analysis: '租房纠纷有所上升，主要涉及租金、押金等问题。' },
    { id: 7, name: '劳务纠纷', count: 1234, trend: 2, rank: 7, analysis: '劳务纠纷基本稳定，主要涉及工资拖欠等问题。' },
    { id: 8, name: '环境污染', count: 1123, trend: -5, rank: 8, analysis: '环境污染投诉有所下降，环保工作持续推进。' },
    { id: 9, name: '食品安全', count: 987, trend: 0, rank: 9, analysis: '食品安全投诉保持平稳。' },
    { id: 10, name: '交通违章', count: 876, trend: -3, rank: 10, analysis: '交通违章投诉略有下降。' },
  ], []);

  // Mock数据 - 态势分析（按分类，月度数据）
  const situationTrendData = useMemo(() => {
    // 生成12个月的月度数据
    const generateMonthlyData = (baseValues) => {
      const months = [];
      for (let i = 11; i >= 0; i--) {
        const month = dayjs().subtract(i, 'month');
        months.push({
          month: month.format('YYYY-MM'),
          monthLabel: month.format('M月'),
          count: baseValues[11 - i],
        });
      }
      return months;
    };

    return {
      disputes: generateMonthlyData([320, 350, 380, 340, 390, 420, 450, 410, 470, 490, 520, 540]),
      cityManagement: generateMonthlyData([280, 310, 290, 320, 350, 330, 370, 390, 410, 380, 420, 450]),
      publicSafety: generateMonthlyData([120, 140, 130, 150, 160, 145, 170, 180, 165, 190, 200, 210]),
      environment: generateMonthlyData([180, 200, 190, 220, 240, 230, 260, 250, 280, 290, 310, 320]),
      publicService: generateMonthlyData([150, 170, 160, 180, 200, 190, 210, 230, 220, 250, 260, 280]),
    };
  }, []);

  // 根据筛选条件生成图表数据
  const situationChartData = useMemo(() => {
    // 获取一级分类(数组第一个元素)
    const primaryCategory = situationCategory && situationCategory.length > 0 ? situationCategory[0] : 'disputes';
    const categoryData = situationTrendData[primaryCategory] || [];

    // 根据时间范围筛选数据
    if (situationTimeRange && situationTimeRange[0] && situationTimeRange[1]) {
      const startMonth = situationTimeRange[0].format('YYYY-MM');
      const endMonth = situationTimeRange[1].format('YYYY-MM');
      return categoryData.filter(item => item.month >= startMonth && item.month <= endMonth);
    }

    return categoryData;
  }, [situationCategory, situationTrendData, situationTimeRange]);

  // Mock数据 - 预测预警
  const predictionData = useMemo(() => ({
    // 1. 重复报警
    repeatEvents: {
      dailyNew: 5,
      weeklyNew: 23,
      monthlyNew: 89,
      dailyList: [
        { id: 1, eventId: 'BYW202505220001', description: '快递送货客户要求各种拖理由投诉退款，有纠纷', tags: ['高频事件', '紧急处理', '已解决'], street: '白云街道', village: '云峰村', level: '三级事件', subCategory: '治安隐患纠纷', reportTime: '2025/05/31 23:42', reporterInfo: '电话: 159****8968 | 身份证: 5137*', relatedEvents: '-', result: '镇街科室: 到御都会，当...' },
        { id: 2, eventId: 'DQIW202505150001', description: '给人送货，运费不给我，有纠纷', tags: ['噪音投诉', '夜间扰民', '待跟进'], street: '洞桥镇', village: '洞桥村', level: '三级事件', subCategory: '公共秩序纠纷', reportTime: '2025/05/31 23:42', reporterInfo: '电话: 130****5445 | 身份证: 3412*', relatedEvents: '-', result: '镇街科室: 因对方开垃圾...' },
        { id: 3, eventId: 'NMW202505200001', description: '小区停车位被长期占用，多次沟通无果', tags: ['停车纠纷', '重点关注'], street: '南门街道', village: '南门社区', level: '四级事件', subCategory: '公共秩序纠纷', reportTime: '2025/05/31 23:34', reporterInfo: '电话: 180****3936', relatedEvents: '-', result: '区县职能部门: 电话联系...' },
        { id: 4, eventId: 'WCW202505180001', description: '楼上住户深夜噪音扰民，影响休息', tags: ['基础设施', '道路维修', '已派单'], street: '望城街道', village: '望城社区', level: '二级事件', subCategory: '家庭婚姻纠纷', reportTime: '2025/05/31 22:53', reporterInfo: '电话: 135****5611', relatedEvents: '-', result: '村社区: 出警途中联系报...' },
        { id: 5, eventId: 'GLW202505170001', description: '物业不作为，公共设施损坏长期不修', tags: ['环境卫生', '垃圾清理'], street: '古林镇', village: '古林村', level: '二级事件', subCategory: '家庭婚姻纠纷', reportTime: '2025/05/31 22:40', reporterInfo: '电话: 130****5212', relatedEvents: '-', result: '村社区: 社区网格员和民...' },
      ],
      weeklyList: [
        { id: 1, eventId: 'BYW202505220001', description: '快递送货客户要求各种拖理由投诉退款，有纠纷', tags: ['高频事件', '紧急处理', '已解决'], street: '白云街道', village: '云峰村', level: '三级事件', subCategory: '治安隐患纠纷', reportTime: '2025/05/31 23:42', reporterInfo: '电话: 159****8968 | 身份证: 5137*', relatedEvents: '-', result: '镇街科室: 到御都会，当...' },
        { id: 2, eventId: 'DQIW202505150001', description: '给人送货，运费不给我，有纠纷', tags: ['噪音投诉', '夜间扰民', '待跟进'], street: '洞桥镇', village: '洞桥村', level: '三级事件', subCategory: '公共秩序纠纷', reportTime: '2025/05/31 23:42', reporterInfo: '电话: 130****5445 | 身份证: 3412*', relatedEvents: '-', result: '镇街科室: 因对方开垃圾...' },
        { id: 3, eventId: 'NMW202505200001', description: '小区停车位被长期占用，多次沟通无果', tags: ['停车纠纷', '重点关注'], street: '南门街道', village: '南门社区', level: '四级事件', subCategory: '公共秩序纠纷', reportTime: '2025/05/31 23:34', reporterInfo: '电话: 180****3936', relatedEvents: '-', result: '区县职能部门: 电话联系...' },
        { id: 4, eventId: 'WCW202505180001', description: '楼上住户深夜噪音扰民，影响休息', tags: ['基础设施', '道路维修', '已派单'], street: '望城街道', village: '望城社区', level: '二级事件', subCategory: '家庭婚姻纠纷', reportTime: '2025/05/31 22:53', reporterInfo: '电话: 135****5611', relatedEvents: '-', result: '村社区: 出警途中联系报...' },
        { id: 5, eventId: 'GLW202505170001', description: '物业不作为，公共设施损坏长期不修', tags: ['环境卫生', '垃圾清理'], street: '古林镇', village: '古林村', level: '二级事件', subCategory: '家庭婚姻纠纷', reportTime: '2025/05/31 22:40', reporterInfo: '电话: 130****5212', relatedEvents: '-', result: '村社区: 社区网格员和民...' },
        { id: 6, eventId: 'SQW202505160001', description: '邻居装修噪音过大，多次协商无果', tags: ['邻里纠纷', '看调解'], street: '石碶街道', village: '石碶社区', level: '三级事件', subCategory: '消费纠纷', reportTime: '2025/05/31 22:35', reporterInfo: '电话: 158****6994', relatedEvents: '-', result: '镇街科室: 到现场经了解...' },
        { id: 7, eventId: 'GQW202505140001', description: '商铺占道经营影响通行', tags: ['消防安全', '隐患排查'], street: '高桥镇', village: '高桥村', level: '四级事件', subCategory: '债务纠纷', reportTime: '2025/05/31 22:12', reporterInfo: '电话: 131****0695', relatedEvents: '-', result: '区县职能部门: 江汇城20...' },
      ],
      monthlyList: [
        { id: 1, eventId: 'BYW202505220001', description: '快递送货客户要求各种拖理由投诉退款，有纠纷', tags: ['高频事件', '紧急处理', '已解决'], street: '白云街道', village: '云峰村', level: '三级事件', subCategory: '治安隐患纠纷', reportTime: '2025/05/31 23:42', reporterInfo: '电话: 159****8968 | 身份证: 5137*', relatedEvents: '-', result: '镇街科室: 到御都会，当...' },
        { id: 2, eventId: 'DQIW202505150001', description: '给人送货，运费不给我，有纠纷', tags: ['噪音投诉', '夜间扰民', '待跟进'], street: '洞桥镇', village: '洞桥村', level: '三级事件', subCategory: '公共秩序纠纷', reportTime: '2025/05/31 23:42', reporterInfo: '电话: 130****5445 | 身份证: 3412*', relatedEvents: '-', result: '镇街科室: 因对方开垃圾...' },
        { id: 3, eventId: 'NMW202505200001', description: '小区停车位被长期占用，多次沟通无果', tags: ['停车纠纷', '重点关注'], street: '南门街道', village: '南门社区', level: '四级事件', subCategory: '公共秩序纠纷', reportTime: '2025/05/31 23:34', reporterInfo: '电话: 180****3936', relatedEvents: '-', result: '区县职能部门: 电话联系...' },
        { id: 4, eventId: 'WCW202505180001', description: '楼上住户深夜噪音扰民，影响休息', tags: ['基础设施', '道路维修', '已派单'], street: '望城街道', village: '望城社区', level: '二级事件', subCategory: '家庭婚姻纠纷', reportTime: '2025/05/31 22:53', reporterInfo: '电话: 135****5611', relatedEvents: '-', result: '村社区: 出警途中联系报...' },
        { id: 5, eventId: 'GLW202505170001', description: '物业不作为，公共设施损坏长期不修', tags: ['环境卫生', '垃圾清理'], street: '古林镇', village: '古林村', level: '二级事件', subCategory: '家庭婚姻纠纷', reportTime: '2025/05/31 22:40', reporterInfo: '电话: 130****5212', relatedEvents: '-', result: '村社区: 社区网格员和民...' },
        { id: 6, eventId: 'SQW202505160001', description: '邻居装修噪音过大，多次协商无果', tags: ['邻里纠纷', '看调解'], street: '石碶街道', village: '石碶社区', level: '三级事件', subCategory: '消费纠纷', reportTime: '2025/05/31 22:35', reporterInfo: '电话: 158****6994', relatedEvents: '-', result: '镇街科室: 到现场经了解...' },
        { id: 7, eventId: 'GQW202505140001', description: '商铺占道经营影响通行', tags: ['消防安全', '隐患排查'], street: '高桥镇', village: '高桥村', level: '四级事件', subCategory: '债务纠纷', reportTime: '2025/05/31 22:12', reporterInfo: '电话: 131****0695', relatedEvents: '-', result: '区县职能部门: 江汇城20...' },
        { id: 8, eventId: 'JSW202505100001', description: '工地施工扬尘污染严重', tags: ['环境污染', '重点关注'], street: '集士港镇', village: '集士港村', level: '一级事件', subCategory: '环境污染', reportTime: '2025/05/25 08:00', reporterInfo: '电话: 139****1234', relatedEvents: '-', result: '处理中' },
        { id: 9, eventId: 'HJW202505080001', description: '河道垃圾堆积影响环境', tags: ['环境卫生', '已解决'], street: '横街镇', village: '横街村', level: '二级事件', subCategory: '环境卫生', reportTime: '2025/05/20 11:20', reporterInfo: '电话: 138****5678', relatedEvents: '-', result: '已办结' },
        { id: 10, eventId: 'YJW202505050001', description: '农田灌溉水渠堵塞', tags: ['基础设施', '待处理'], street: '鄞江镇', village: '鄞江村', level: '三级事件', subCategory: '基础设施', reportTime: '2025/05/15 14:50', reporterInfo: '电话: 137****9012', relatedEvents: '-', result: '部分办结' },
      ],
    },
    // 2. 重点人员报警
    keyPerson: {
      dailyAlarm: 3,
      weeklyAlarm: 18,
      monthlyAlarm: 67,
      dailyList: [
        { id: 1, eventId: 'ZMM202501080001', description: '张某某再次投诉邻居噪音扰民问题', tags: ['高频事件', '紧急处理'], street: '南门街道', village: '南门社区', level: '三级事件', subCategory: '治安隐患纠纷', reportTime: '2026/01/08 09:15', reporterInfo: '电话: 138****0001', relatedEvents: '-', result: '镇街科室: 到御都会，当...', personName: '张某某', riskLevel: '高' },
        { id: 2, eventId: 'LM202501080002', description: '李某反映停车位被占用，要求处理', tags: ['停车纠纷', '重点关注'], street: '望城街道', village: '望城社区', level: '四级事件', subCategory: '公共秩序纠纷', reportTime: '2026/01/08 10:30', reporterInfo: '电话: 139****0002', relatedEvents: '-', result: '区县职能部门: 电话联系...', personName: '李某', riskLevel: '高' },
        { id: 3, eventId: 'WMM202501080003', description: '王某某投诉物业不作为，公共区域卫生差', tags: ['环境卫生', '垃圾清理'], street: '古林镇', village: '古林村', level: '二级事件', subCategory: '家庭婚姻纠纷', reportTime: '2026/01/08 14:20', reporterInfo: '电话: 137****0003', relatedEvents: '-', result: '村社区: 社区网格员和民...', personName: '王某某', riskLevel: '中' },
      ],
      weeklyList: [
        { id: 1, eventId: 'ZMM202501080001', description: '张某某再次投诉邻居噪音扰民问题', tags: ['高频事件', '紧急处理'], street: '南门街道', village: '南门社区', level: '三级事件', subCategory: '治安隐患纠纷', reportTime: '2026/01/08 09:15', reporterInfo: '电话: 138****0001', relatedEvents: '-', result: '镇街科室: 到御都会，当...', personName: '张某某', riskLevel: '高' },
        { id: 2, eventId: 'LM202501080002', description: '李某反映停车位被占用，要求处理', tags: ['停车纠纷', '重点关注'], street: '望城街道', village: '望城社区', level: '四级事件', subCategory: '公共秩序纠纷', reportTime: '2026/01/08 10:30', reporterInfo: '电话: 139****0002', relatedEvents: '-', result: '区县职能部门: 电话联系...', personName: '李某', riskLevel: '高' },
        { id: 3, eventId: 'WMM202501080003', description: '王某某投诉物业不作为，公共区域卫生差', tags: ['环境卫生', '垃圾清理'], street: '古林镇', village: '古林村', level: '二级事件', subCategory: '家庭婚姻纠纷', reportTime: '2026/01/08 14:20', reporterInfo: '电话: 137****0003', relatedEvents: '-', result: '村社区: 社区网格员和民...', personName: '王某某', riskLevel: '中' },
        { id: 4, eventId: 'ZM202501060001', description: '赵某多次投诉工资拖欠问题', tags: ['劳务纠纷', '待跟进'], street: '石碶街道', village: '石碶社区', level: '一级事件', subCategory: '劳务纠纷', reportTime: '2026/01/06 11:00', reporterInfo: '电话: 136****0004', relatedEvents: '-', result: '已办结', personName: '赵某', riskLevel: '中' },
        { id: 5, eventId: 'ZMM202501050001', description: '张某某与邻居因装修问题发生争执', tags: ['邻里纠纷', '需调解'], street: '南门街道', village: '南门社区', level: '二级事件', subCategory: '邻里纠纷', reportTime: '2026/01/05 16:45', reporterInfo: '电话: 138****0001', relatedEvents: '-', result: '已办结', personName: '张某某', riskLevel: '高' },
        { id: 6, eventId: 'LM202501040001', description: '李某投诉小区门禁损坏无人维修', tags: ['物业纠纷', '持续关注'], street: '望城街道', village: '望城社区', level: '三级事件', subCategory: '物业纠纷', reportTime: '2026/01/04 09:30', reporterInfo: '电话: 139****0002', relatedEvents: '-', result: '已办结', personName: '李某', riskLevel: '高' },
      ],
      monthlyList: [
        { id: 1, eventId: 'ZMM202501080001', description: '张某某再次投诉邻居噪音扰民问题', tags: ['高频事件', '紧急处理'], street: '南门街道', village: '南门社区', level: '三级事件', subCategory: '治安隐患纠纷', reportTime: '2026/01/08 09:15', reporterInfo: '电话: 138****0001', relatedEvents: '-', result: '镇街科室: 到御都会，当...', personName: '张某某', riskLevel: '高' },
        { id: 2, eventId: 'LM202501080002', description: '李某反映停车位被占用，要求处理', tags: ['停车纠纷', '重点关注'], street: '望城街道', village: '望城社区', level: '四级事件', subCategory: '公共秩序纠纷', reportTime: '2026/01/08 10:30', reporterInfo: '电话: 139****0002', relatedEvents: '-', result: '区县职能部门: 电话联系...', personName: '李某', riskLevel: '高' },
        { id: 3, eventId: 'WMM202501080003', description: '王某某投诉物业不作为，公共区域卫生差', tags: ['环境卫生', '垃圾清理'], street: '古林镇', village: '古林村', level: '二级事件', subCategory: '家庭婚姻纠纷', reportTime: '2026/01/08 14:20', reporterInfo: '电话: 137****0003', relatedEvents: '-', result: '村社区: 社区网格员和民...', personName: '王某某', riskLevel: '中' },
        { id: 4, eventId: 'ZM202501060001', description: '赵某多次投诉工资拖欠问题', tags: ['劳务纠纷', '待跟进'], street: '石碶街道', village: '石碶社区', level: '一级事件', subCategory: '劳务纠纷', reportTime: '2026/01/06 11:00', reporterInfo: '电话: 136****0004', relatedEvents: '-', result: '已办结', personName: '赵某', riskLevel: '中' },
        { id: 5, eventId: 'ZMM202501050001', description: '张某某与邻居因装修问题发生争执', tags: ['邻里纠纷', '需调解'], street: '南门街道', village: '南门社区', level: '二级事件', subCategory: '邻里纠纷', reportTime: '2026/01/05 16:45', reporterInfo: '电话: 138****0001', relatedEvents: '-', result: '已办结', personName: '张某某', riskLevel: '高' },
        { id: 6, eventId: 'LM202501040001', description: '李某投诉小区门禁损坏无人维修', tags: ['物业纠纷', '持续关注'], street: '望城街道', village: '望城社区', level: '三级事件', subCategory: '物业纠纷', reportTime: '2026/01/04 09:30', reporterInfo: '电话: 139****0002', relatedEvents: '-', result: '已办结', personName: '李某', riskLevel: '高' },
        { id: 7, eventId: 'QMM202512280001', description: '钱某某反映租房押金退还问题', tags: ['租房纠纷', '已解决'], street: '高桥镇', village: '高桥村', level: '二级事件', subCategory: '租房纠纷', reportTime: '2025/12/28 15:00', reporterInfo: '电话: 135****0005', relatedEvents: '-', result: '已办结', personName: '钱某某', riskLevel: '低' },
        { id: 8, eventId: 'WMM202512250001', description: '王某某投诉电梯故障长期未修', tags: ['物业纠纷', '已派单'], street: '古林镇', village: '古林村', level: '一级事件', subCategory: '物业纠纷', reportTime: '2025/12/25 10:20', reporterInfo: '电话: 137****0003', relatedEvents: '-', result: '已办结', personName: '王某某', riskLevel: '中' },
        { id: 9, eventId: 'ZMM202512200001', description: '张某某投诉楼上漏水问题', tags: ['邻里纠纷', '需调解'], street: '南门街道', village: '南门社区', level: '二级事件', subCategory: '邻里纠纷', reportTime: '2025/12/20 08:30', reporterInfo: '电话: 138****0001', relatedEvents: '-', result: '已办结', personName: '张某某', riskLevel: '高' },
        { id: 10, eventId: 'LM202512180001', description: '李某反映垃圾清运不及时', tags: ['环境卫生', '已解决'], street: '望城街道', village: '望城社区', level: '三级事件', subCategory: '环境卫生', reportTime: '2025/12/18 14:00', reporterInfo: '电话: 139****0002', relatedEvents: '-', result: '已办结', personName: '李某', riskLevel: '高' },
      ],
    },
    // 3. 多人一事预警（事件簇）
    multiPersonEvent: {
      dailyActive: 5,     // 当日活跃：当日有新事件加入的事件集合数
      weeklyActive: 18,   // 本周活跃：本周有新事件加入的事件集合数
      monthlyActive: 45,  // 本月活跃：本月有新事件加入的事件集合数
      list: [
        { id: 1, event: '某小区停车位纠纷', persons: 15, personsTrend: 5, category: '物业纠纷', desc: '多位业主反映车位不足', lastTime: '2025-12-19', street: '南门街道', riskLevel: '高' },
        { id: 2, event: '某工地噪音扰民', persons: 12, personsTrend: 3, category: '环境污染', desc: '周边居民投诉夜间施工', lastTime: '2025-12-18', street: '望城街道', riskLevel: '高' },
        { id: 3, event: '某公司工资拖欠', persons: 10, personsTrend: 2, category: '劳务纠纷', desc: '多名员工反映欠薪', lastTime: '2025-12-17', street: '古林镇', riskLevel: '高' },
        { id: 4, event: '某楼盘质量问题', persons: 9, personsTrend: 0, category: '物业纠纷', desc: '多位业主投诉房屋漏水', lastTime: '2025-12-16', street: '石碶街道', riskLevel: '中' },
        { id: 5, event: '某商场消费纠纷', persons: 8, personsTrend: -1, category: '消费纠纷', desc: '多名消费者反映退款难', lastTime: '2025-12-15', street: '高桥镇', riskLevel: '中' },
      ]
    },
  }), []);

  // Mock数据 - 闭环监测
  const closedLoopData = useMemo(() => ({
    daily: {
      closed: 12,
      pending: 1,
      phased: 5,
      simplified: 4,
      false: 3,
      trend: [
        { time: '00:00', count: 0 },
        { time: '04:00', count: 1 },
        { time: '08:00', count: 3 },
        { time: '12:00', count: 6 },
        { time: '16:00', count: 9 },
        { time: '20:00', count: 11 },
        { time: '24:00', count: 12 },
      ],
    },
    weekly: {
      closed: 70,
      pending: 10,
      phased: 34,
      simplified: 28,
      false: 8,
      trend: [
        { time: '周一', count: 8 },
        { time: '周二', count: 12 },
        { time: '周三', count: 10 },
        { time: '周四', count: 15 },
        { time: '周五', count: 11 },
        { time: '周六', count: 7 },
        { time: '周日', count: 7 },
      ],
    },
    monthly: {
      closed: 287,
      pending: 50,
      phased: 142,
      simplified: 98,
      false: 47,
      trend: [
        { time: '第1周', count: 65 },
        { time: '第2周', count: 72 },
        { time: '第3周', count: 78 },
        { time: '第4周', count: 72 },
      ],
    },
  }), []);

  const handleTopicClick = (topic) => {
    setSelectedIssue(topic);
    setIssueDrawerVisible(true);
  };

  const handleWarningClick = (type) => {
    setWarningType(type);
    setWarningDrawerVisible(true);
  };

  // 渲染知识图谱（圆形布局）
  const renderKnowledgeGraph = () => {
    const centerTopic = hotTopics[0]; // 主题1作为中心
    const surroundingTopics = hotTopics.slice(1, 8); // 周围6-7个主题

    return (
      <div className="knowledge-graph-container">
        {/* 中心主题 */}
        <div
          className="center-topic"
          onClick={() => handleTopicClick(centerTopic)}
          style={{
            cursor: 'pointer',
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '120px',
            height: '120px',
            maxWidth: '150px',
            maxHeight: '150px',
            minWidth: '100px',
            minHeight: '100px',
            background: 'linear-gradient(135deg, #1890ff 0%, #36cfc9 100%)',
            borderRadius: '50%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 4px 16px rgba(24, 144, 255, 0.4)',
            transition: 'all 0.3s',
            zIndex: 10,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 4 }}>{centerTopic.name}</div>
          <div style={{ fontSize: 20, fontWeight: 'bold' }}>
            {`${centerTopic.trend > 0 ? '+' : ''}${centerTopic.trend}%`}
          </div>
          <div style={{ fontSize: 11, opacity: 0.9 }}>
            环比
          </div>
        </div>

        {/* 周围主题（圆形分布） */}
        {surroundingTopics.map((topic, index) => {
          const angle = (360 / surroundingTopics.length) * index;
          const radius = 180;
          const x = Math.cos((angle - 90) * Math.PI / 180) * radius;
          const y = Math.sin((angle - 90) * Math.PI / 180) * radius;

          const size = 80;

          return (
            <div
              key={topic.id}
              className="surrounding-topic"
              onClick={() => handleTopicClick(topic)}
              style={{
                cursor: 'pointer',
                position: 'absolute',
                left: `calc(50% + ${x}px)`,
                top: `calc(50% + ${y}px)`,
                transform: 'translate(-50%, -50%)',
                width: `${size}px`,
                height: `${size}px`,
                background: topic.trend > 0
                  ? 'linear-gradient(135deg, #ff4d4f 0%, #ff7a45 100%)'
                  : topic.trend < 0
                  ? 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)'
                  : 'linear-gradient(135deg, #faad14 0%, #ffc53d 100%)',
                borderRadius: '50%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                transition: 'all 0.3s',
                fontSize: 12,
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: 2, textAlign: 'center', padding: '0 4px' }}>
                {topic.name}
              </div>
              <div style={{ fontSize: 14, fontWeight: 'bold' }}>
                {`${topic.trend > 0 ? '+' : ''}${topic.trend}%`}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="dashboard-container">
      <Card
        className="overview-card"
        title={<span style={{ fontSize: 18, fontWeight: 600 }}>📊 数据总览</span>}
        style={{ marginBottom: 24 }}
        extra={
          <Space>
            <span style={{ fontSize: 14, color: '#666' }}>选择月份：</span>
            <RangePicker
              picker="month"
              style={{ width: 220 }}
              placeholder={['开始月份', '结束月份']}
              value={overviewTimeRange}
              onChange={setOverviewTimeRange}
              format="YYYY-MM"
            />
          </Space>
        }
      >
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card className="stat-card" hoverable>
              <Statistic
                title="事件总量"
                value={overviewData.totalEvents}
                prefix={<FileTextOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className="stat-card" hoverable>
              <Statistic
                title="本月事件"
                value={overviewData.monthEvents}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className="stat-card" hoverable>
              <Statistic
                title="本月同比增长"
                value={overviewData.growth}
                suffix="%"
                prefix={overviewData.growth > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                valueStyle={{ color: overviewData.growth > 0 ? '#cf1322' : '#3f8600' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className="stat-card" hoverable>
              <Statistic
                title="本月环比增长"
                value={overviewData.monthOnMonthGrowth}
                suffix="%"
                prefix={overviewData.monthOnMonthGrowth > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                valueStyle={{ color: overviewData.monthOnMonthGrowth > 0 ? '#cf1322' : '#3f8600' }}
              />
            </Card>
          </Col>
        </Row>

        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ fontSize: 14, marginBottom: 8, display: 'block' }}>
            月度变化趋势
          </Text>
          <Line
            data={overviewData.monthlyTrend}
            xField="month"
            yField="count"
            height={280}
            smooth
            color="#1890ff"
            point={{ size: 4, shape: 'circle' }}
            areaStyle={{ fill: 'l(270) 0:#ffffff 0.5:#e6f7ff 1:#bae7ff' }}
            xAxis={{ label: { style: { fontSize: 12 } } }}
            yAxis={{
              label: { style: { fontSize: 12 } },
              grid: { line: { style: { stroke: '#f0f0f0', lineDash: [4, 4] } } }
            }}
          />
        </div>
      </Card>

      <Card
        title={<span style={{ fontSize: 16, fontWeight: 600 }}>预测预警</span>}
        extra={<Text type="secondary" style={{ fontSize: 12 }}>数据更新时间：{dayjs().subtract(1, 'day').format('YYYY-MM-DD')}</Text>}
        className="prediction-card"
        style={{ marginBottom: 24 }}
        styles={{ body: { padding: 16 } }}
      >
        <Row gutter={[16, 16]}>
          {/* 1. 重复报警 */}
          <Col span={8}>
            <Card
              className="warning-card"
              hoverable
              style={{ background: '#fff', height: '100%', borderRadius: 8 }}
              styles={{ body: { padding: '16px 20px' } }}
              onClick={() => handleWarningClick('repeatEvents')}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                  <FileTextOutlined style={{ fontSize: 16, color: '#fff' }} />
                </div>
                <span style={{ fontSize: 15, fontWeight: 500, color: '#1f2937' }}>重复报警</span>
                <Tooltip title="重复报警：同一事件被多次重复上报的预警提醒">
                  <QuestionCircleOutlined style={{ fontSize: 14, color: '#9ca3af', marginLeft: 6, cursor: 'help' }} />
                </Tooltip>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>当日新增</div>
                  <div style={{ fontSize: 24, fontWeight: 600, color: '#1f2937' }}>{predictionData.repeatEvents.dailyNew}</div>
                </div>
                <div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>本周新增</div>
                  <div style={{ fontSize: 24, fontWeight: 600, color: '#1f2937' }}>{predictionData.repeatEvents.weeklyNew}</div>
                </div>
                <div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>本月新增</div>
                  <div style={{ fontSize: 24, fontWeight: 600, color: '#1f2937' }}>{predictionData.repeatEvents.monthlyNew}</div>
                </div>
              </div>
            </Card>
          </Col>

          {/* 2. 重点人员报警 */}
          <Col span={8}>
            <Card
              className="warning-card"
              hoverable
              style={{ background: '#fff', height: '100%', borderRadius: 8 }}
              styles={{ body: { padding: '16px 20px' } }}
              onClick={() => handleWarningClick('keyPerson')}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F97316', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                  <WarningOutlined style={{ fontSize: 16, color: '#fff' }} />
                </div>
                <span style={{ fontSize: 15, fontWeight: 500, color: '#1f2937' }}>重点人员报警</span>
                <Tooltip title="重点人员报警：已标记的重点人员产生新事件的预警提醒">
                  <QuestionCircleOutlined style={{ fontSize: 14, color: '#9ca3af', marginLeft: 6, cursor: 'help' }} />
                </Tooltip>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>当日报警</div>
                  <div style={{ fontSize: 24, fontWeight: 600, color: '#1f2937' }}>{predictionData.keyPerson.dailyAlarm}</div>
                </div>
                <div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>本周报警</div>
                  <div style={{ fontSize: 24, fontWeight: 600, color: '#1f2937' }}>{predictionData.keyPerson.weeklyAlarm}</div>
                </div>
                <div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>当月报警</div>
                  <div style={{ fontSize: 24, fontWeight: 600, color: '#1f2937' }}>{predictionData.keyPerson.monthlyAlarm}</div>
                </div>
              </div>
            </Card>
          </Col>

          {/* 3. 多人一事预警 */}
          <Col span={8}>
            <Card
              className="warning-card"
              hoverable
              style={{ background: '#fff', height: '100%', borderRadius: 8 }}
              styles={{ body: { padding: '16px 20px' } }}
              onClick={() => handleWarningClick('multiPersonEvent')}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                  <DatabaseOutlined style={{ fontSize: 16, color: '#fff' }} />
                </div>
                <span style={{ fontSize: 15, fontWeight: 500, color: '#1f2937' }}>多人一事预警</span>
                <Tooltip title="活跃事件集合：在统计周期内有新事件加入的事件集合数量">
                  <QuestionCircleOutlined style={{ fontSize: 14, color: '#9ca3af', marginLeft: 6, cursor: 'help' }} />
                </Tooltip>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>当日活跃</div>
                  <div style={{ fontSize: 24, fontWeight: 600, color: '#1f2937' }}>{predictionData.multiPersonEvent.dailyActive}</div>
                </div>
                <div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>本周活跃</div>
                  <div style={{ fontSize: 24, fontWeight: 600, color: '#1f2937' }}>{predictionData.multiPersonEvent.weeklyActive}</div>
                </div>
                <div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>本月活跃</div>
                  <div style={{ fontSize: 24, fontWeight: 600, color: '#1f2937' }}>{predictionData.multiPersonEvent.monthlyActive}</div>
                </div>
              </div>
            </Card>
          </Col>

        </Row>
      </Card>

      {/* 每日检测 + 问题聚焦 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card
            title={<span style={{ fontSize: 18, fontWeight: 600 }}>📅 每日检测</span>}
            extra={<Text type="secondary" style={{ fontSize: 12 }}>数据更新时间：{dayjs().subtract(1, 'day').format('YYYY-MM-DD')}</Text>}
            style={{ height: '100%' }}
          >
            <Table
              dataSource={dailyTopicData}
              size="small"
              pagination={false}
              rowKey="id"
              scroll={{ y: 380 }}
              columns={[
                {
                  title: '排名',
                  key: 'rank',
                  width: 60,
                  align: 'center',
                  render: (_, __, index) => (
                    <Tag color={index < 3 ? 'red' : index < 6 ? 'orange' : 'default'}>{index + 1}</Tag>
                  ),
                },
                {
                  title: '事件主题',
                  dataIndex: 'name',
                  key: 'name',
                  width: 120,
                  render: (name) => (
                    <Button type="link" style={{ padding: 0 }}>{name}</Button>
                  ),
                },
                {
                  title: '事件总数',
                  dataIndex: 'totalCount',
                  key: 'totalCount',
                  width: 90,
                  align: 'right',
                  render: (count) => <Text strong>{count.toLocaleString()}</Text>,
                },
                {
                  title: '当月新增',
                  dataIndex: 'monthlyNew',
                  key: 'monthlyNew',
                  width: 90,
                  align: 'right',
                  render: (count) => <Text style={{ color: '#52c41a' }}>+{count}</Text>,
                },
                {
                  title: '本周新增',
                  dataIndex: 'weeklyNew',
                  key: 'weeklyNew',
                  width: 90,
                  align: 'right',
                  render: (count) => <Text style={{ color: '#faad14' }}>+{count}</Text>,
                },
                {
                  title: '当日新增',
                  dataIndex: 'dailyNew',
                  key: 'dailyNew',
                  width: 90,
                  align: 'right',
                  render: (count) => <Text strong style={{ color: '#1890ff' }}>+{count}</Text>,
                },
              ]}
            />
          </Card>
        </Col>

        <Col span={12}>
          <Card
            title={<span style={{ fontSize: 18, fontWeight: 600 }}>🔍 问题聚焦</span>}
            extra={
              <Button
                type="primary"
                size="small"
              >
                环比涨幅
              </Button>
            }
            className="issue-cluster-card"
            style={{ height: '100%' }}
          >
            <div style={{ height: 400, position: 'relative' }}>
              {renderKnowledgeGraph()}
            </div>
          </Card>
        </Col>
      </Row>

      {/* 态势分析 + 闭环监测 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card
            title={<span style={{ fontSize: 18, fontWeight: 600 }}>📈 态势分析</span>}
            className="situation-card"
            style={{ height: '100%' }}
          >
            {/* 筛选器 */}
            <div style={{ marginBottom: 16, padding: '12px', background: '#fafafa', borderRadius: 4 }}>
              <Space align="center" wrap>
                <Text style={{ fontSize: 13, color: '#666' }}>选择月份：</Text>
                <RangePicker
                  picker="month"
                  style={{ width: 220 }}
                  placeholder={['开始月份', '结束月份']}
                  value={situationTimeRange}
                  onChange={setSituationTimeRange}
                  format="YYYY-MM"
                />
                <Text style={{ fontSize: 13, color: '#666', marginLeft: 16 }}>事件分类：</Text>
                <Cascader
                  style={{ width: 280 }}
                  options={categoryOptions}
                  value={situationCategory}
                  onChange={setSituationCategory}
                  placeholder="请选择事件分类"
                  changeOnSelect
                  showSearch
                  displayRender={(labels) => {
                    if (labels.length === 1) {
                      return `${labels[0]} - 全部`;
                    }
                    return labels.join(' / ');
                  }}
                />
              </Space>
            </div>

            {/* 图表 */}
            <div>
              <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 12 }}>
                {(() => {
                  const primaryCategory = situationCategory && situationCategory.length > 0 ? situationCategory[0] : 'disputes';
                  const categoryLabel = categoryOptions.find(opt => opt.value === primaryCategory)?.label || '矛盾纠纷';
                  if (situationCategory && situationCategory.length === 2) {
                    // 选择了二级分类
                    const secondaryLabel = categoryOptions
                      .find(opt => opt.value === primaryCategory)
                      ?.children?.find(child => child.value === situationCategory[1])?.label;
                    return `${categoryLabel} - ${secondaryLabel}趋势`;
                  }
                  return `${categoryLabel} - 事件级别趋势`;
                })()}
              </Text>
              {situationChartData.length > 0 ? (
                <Line
                  data={situationChartData}
                  xField="monthLabel"
                  yField="count"
                  height={360}
                  smooth
                  color="#1890ff"
                  point={{ size: 4, shape: 'circle' }}
                  areaStyle={{ fill: 'l(270) 0:#ffffff 0.5:#e6f7ff 1:#bae7ff' }}
                  xAxis={{ label: { style: { fontSize: 12 } } }}
                  yAxis={{
                    label: { style: { fontSize: 11 } },
                    grid: { line: { style: { stroke: '#f0f0f0', lineDash: [4, 4] } } }
                  }}
                />
              ) : (
                <div style={{
                  height: 360,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#999'
                }}>
                  暂无数据
                </div>
              )}
            </div>
          </Card>
        </Col>

        <Col span={12}>
          <Card
            title={<span style={{ fontSize: 18, fontWeight: 600 }}>🔄 闭环监测</span>}
            className="closed-loop-card"
            style={{ height: '100%' }}
            extra={
              <Space>
                <Button
                  type={closedLoopTab === 'daily' ? 'primary' : 'default'}
                  size="small"
                  onClick={() => setClosedLoopTab('daily')}
                >
                  当日
                </Button>
                <Button
                  type={closedLoopTab === 'weekly' ? 'primary' : 'default'}
                  size="small"
                  onClick={() => setClosedLoopTab('weekly')}
                >
                  本周
                </Button>
                <Button
                  type={closedLoopTab === 'monthly' ? 'primary' : 'default'}
                  size="small"
                  onClick={() => setClosedLoopTab('monthly')}
                >
                  本月
                </Button>
              </Space>
            }
          >
            {/* 统计概览 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <div style={{ textAlign: 'center', padding: '16px 0', background: '#e6f7ff', borderRadius: 8 }}>
                  <div style={{ fontSize: 28, fontWeight: 'bold', color: '#1890ff' }}>{closedLoopData[closedLoopTab].closed}</div>
                  <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>{closedLoopTab === 'daily' ? '当日' : closedLoopTab === 'weekly' ? '本周' : '本月'}办结</div>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ textAlign: 'center', padding: '16px 0', background: '#fff7e6', borderRadius: 8 }}>
                  <div style={{ fontSize: 28, fontWeight: 'bold', color: '#fa8c16' }}>{closedLoopData[closedLoopTab].pending}</div>
                  <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>待办结</div>
                </div>
              </Col>
            </Row>

            {/* 办结类型分布 */}
            <div style={{ padding: '16px', background: '#fafafa', borderRadius: 8, marginBottom: 16 }}>
              <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 16 }}>
                办结类型分布（根据文本解析标准提供）
              </Text>
              {(() => {
                const currentData = closedLoopData[closedLoopTab];
                const total = currentData.phased + currentData.simplified + currentData.false;
                const phasedPercent = total > 0 ? (currentData.phased / total * 100).toFixed(0) : 0;
                const simplifiedPercent = total > 0 ? (currentData.simplified / total * 100).toFixed(0) : 0;
                const falsePercent = total > 0 ? (currentData.false / total * 100).toFixed(0) : 0;
                return (
                  <Space direction="vertical" style={{ width: '100%' }} size={16}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <Text><CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />阶段性办结</Text>
                        <Text strong style={{ color: '#52c41a' }}>{currentData.phased} 件</Text>
                      </div>
                      <div style={{ background: '#f0f0f0', borderRadius: 4, height: 8 }}>
                        <div style={{ background: '#52c41a', borderRadius: 4, height: 8, width: `${phasedPercent}%` }} />
                      </div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <Text><ClockCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />简化性办结</Text>
                        <Text strong style={{ color: '#faad14' }}>{currentData.simplified} 件</Text>
                      </div>
                      <div style={{ background: '#f0f0f0', borderRadius: 4, height: 8 }}>
                        <div style={{ background: '#faad14', borderRadius: 4, height: 8, width: `${simplifiedPercent}%` }} />
                      </div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <Text><WarningOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />虚假性办结</Text>
                        <Text strong style={{ color: '#ff4d4f' }}>{currentData.false} 件</Text>
                      </div>
                      <div style={{ background: '#f0f0f0', borderRadius: 4, height: 8 }}>
                        <div style={{ background: '#ff4d4f', borderRadius: 4, height: 8, width: `${falsePercent}%` }} />
                      </div>
                    </div>
                  </Space>
                );
              })()}
            </div>

            {/* 办结趋势图 */}
            <div style={{ padding: '16px', background: '#fafafa', borderRadius: 8 }}>
              <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 12 }}>
                {closedLoopTab === 'daily' ? '今日办结趋势' : closedLoopTab === 'weekly' ? '本周办结趋势' : '本月办结趋势'}
              </Text>
              <Line
                data={closedLoopData[closedLoopTab].trend}
                xField="time"
                yField="count"
                height={140}
                smooth
                color="#1890ff"
                point={{ size: 3, shape: 'circle' }}
                areaStyle={{ fill: 'l(270) 0:#ffffff 0.5:#e6f7ff 1:#bae7ff' }}
                xAxis={{ label: { style: { fontSize: 11 } } }}
                yAxis={{
                  label: { style: { fontSize: 11 } },
                  grid: { line: { style: { stroke: '#f0f0f0', lineDash: [4, 4] } } }
                }}
              />
            </div>
          </Card>
        </Col>
      </Row>

      <Drawer
        title={`主题分析 - ${selectedIssue?.name}`}
        placement="right"
        width={720}
        onClose={() => setIssueDrawerVisible(false)}
        open={issueDrawerVisible}
      >
        {selectedIssue && (
          <div>
            <Card size="small" style={{ marginBottom: 16, background: '#f0f2f5' }} title="AI 分析摘要（200字）">
              <Paragraph style={{ fontSize: 14, lineHeight: 1.8 }}>{selectedIssue.analysis}</Paragraph>
            </Card>
            <Card size="small" title="趋势图">
              <Line
                data={(() => {
                  // 生成自然月数据（本月完整月份 + 上月完整月份）
                  const currentMonthDays = dayjs().daysInMonth();
                  const today = dayjs().date();
                  const lastMonthDays = dayjs().subtract(1, 'month').daysInMonth();
                  const maxDays = Math.max(currentMonthDays, lastMonthDays);

                  const chartData = [];

                  // 按日期交替添加数据，确保上月在前
                  for (let i = 1; i <= maxDays; i++) {
                    // 上月数据
                    if (i <= lastMonthDays) {
                      chartData.push({
                        date: `${i}日`,
                        count: Math.floor(25 + Math.random() * 18 + i * 1.2),
                        type: '上月'
                      });
                    }
                    // 本月数据
                    if (i <= currentMonthDays) {
                      chartData.push({
                        date: `${i}日`,
                        count: i <= today ? Math.floor(30 + Math.random() * 20 + i * 1.5) : null,
                        type: '本月'
                      });
                    }
                  }

                  return chartData;
                })()}
                xField="date"
                yField="count"
                seriesField="type"
                height={280}
                smooth
                style={{
                  lineWidth: 2,
                  stroke: (d) => d.type === '上月' ? '#999999' : '#1890ff',
                  lineDash: (d) => d.type === '上月' ? [6, 4] : [0, 0],
                }}
                point={{
                  size: 4,
                  shape: 'circle',
                  style: {
                    fill: (d) => d.type === '上月' ? '#999999' : '#1890ff',
                    stroke: (d) => d.type === '上月' ? '#999999' : '#1890ff',
                  },
                }}
                legend={{
                  position: 'top-right',
                  color: {
                    itemMarker: 'circle',
                  },
                }}
                xAxis={{
                  label: { style: { fontSize: 11 } }
                }}
                yAxis={{
                  label: { style: { fontSize: 11 } },
                  grid: { line: { style: { stroke: '#f0f0f0', lineDash: [4, 4] } } }
                }}
              />
              <div style={{ marginTop: 16, textAlign: 'center', fontSize: 14 }}>
                本月共计 <Text strong style={{ color: '#1890ff', fontSize: 18 }}>{selectedIssue.count}</Text> 件事件，
                环比{selectedIssue.trend >= 0 ? '上涨' : '下降'} <Text strong style={{ color: selectedIssue.trend >= 0 ? '#cf1322' : '#3f8600', fontSize: 18 }}>{Math.abs(selectedIssue.trend)}%</Text>
              </div>
            </Card>
          </div>
        )}
      </Drawer>

      <Drawer
        title={`预警详情 - ${
          warningType === 'repeatEvents' ? '重复报警' :
          warningType === 'keyPerson' ? '重点人员报警' :
          warningType === 'multiPersonEvent' ? '多人一事预警' : ''
        }`}
        placement="right"
        width={1200}
        onClose={() => setWarningDrawerVisible(false)}
        open={warningDrawerVisible}
      >
        {/* 1. 重复报警详情 */}
        {warningType === 'repeatEvents' && (
          <>
            <Tabs
              activeKey={repeatEventsTab}
              onChange={setRepeatEventsTab}
              items={[
                {
                  key: 'daily',
                  label: <span>当日新增 <Tag color="red">{predictionData.repeatEvents.dailyNew}</Tag></span>,
                },
                {
                  key: 'weekly',
                  label: <span>本周新增 <Tag color="orange">{predictionData.repeatEvents.weeklyNew}</Tag></span>,
                },
                {
                  key: 'monthly',
                  label: <span>本月新增 <Tag color="blue">{predictionData.repeatEvents.monthlyNew}</Tag></span>,
                },
              ]}
            />
            <Table
              dataSource={
                repeatEventsTab === 'daily' ? predictionData.repeatEvents.dailyList :
                repeatEventsTab === 'weekly' ? predictionData.repeatEvents.weeklyList :
                predictionData.repeatEvents.monthlyList
              }
              pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 条记录` }}
              size="small"
              rowKey="id"
              scroll={{ x: 1400 }}
            >
              <Table.Column title="事件编号" dataIndex="eventId" key="eventId" width={150}
                render={(eventId) => <Button type="link" style={{ padding: 0 }}>{eventId}</Button>}
              />
              <Table.Column title="事件描述" dataIndex="description" key="description" width={180} ellipsis />
              <Table.Column title="标签" dataIndex="tags" key="tags" width={160}
                render={(tags) => (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {tags?.map((tag, index) => (
                      <Tag key={index} color={
                        tag.includes('高频') || tag.includes('紧急') ? 'red' :
                        tag.includes('重点') || tag.includes('关注') ? 'orange' :
                        tag.includes('已解决') || tag.includes('已办') ? 'green' :
                        'blue'
                      } style={{ margin: 0 }}>{tag}</Tag>
                    ))}
                  </div>
                )}
              />
              <Table.Column title="镇街名称" dataIndex="street" key="street" width={90}
                filters={streetOptions.filter(s => s.value !== 'all').map(s => ({ text: s.label, value: s.label }))}
                onFilter={(value, record) => record.street === value}
              />
              <Table.Column title="村社名称" dataIndex="village" key="village" width={90} />
              <Table.Column title="事件级别" dataIndex="level" key="level" width={90}
                render={(level) => <Tag color="blue">{level}</Tag>}
              />
              <Table.Column title="二级分类" dataIndex="subCategory" key="subCategory" width={110} />
              <Table.Column title="上报时间" dataIndex="reportTime" key="reportTime" width={140}
                sorter={(a, b) => new Date(a.reportTime) - new Date(b.reportTime)}
              />
              <Table.Column title="报案人信息" dataIndex="reporterInfo" key="reporterInfo" width={150} />
              <Table.Column title="相关事件" dataIndex="relatedEvents" key="relatedEvents" width={80} />
              <Table.Column title="处置结果" dataIndex="result" key="result" width={160} ellipsis />
              <Table.Column title="操作" key="action" width={60} fixed="right"
                render={() => <Button type="link" size="small" style={{ padding: 0 }}>详情</Button>}
              />
            </Table>
          </>
        )}

        {/* 2. 重点人员报警详情 */}
        {warningType === 'keyPerson' && (
          <>
            <Tabs
              activeKey={keyPersonTab}
              onChange={setKeyPersonTab}
              items={[
                {
                  key: 'daily',
                  label: <span>当日报警 <Tag color="red">{predictionData.keyPerson.dailyAlarm}</Tag></span>,
                },
                {
                  key: 'weekly',
                  label: <span>本周报警 <Tag color="orange">{predictionData.keyPerson.weeklyAlarm}</Tag></span>,
                },
                {
                  key: 'monthly',
                  label: <span>本月报警 <Tag color="blue">{predictionData.keyPerson.monthlyAlarm}</Tag></span>,
                },
              ]}
            />
            <Table
              dataSource={
                keyPersonTab === 'daily' ? predictionData.keyPerson.dailyList :
                keyPersonTab === 'weekly' ? predictionData.keyPerson.weeklyList :
                predictionData.keyPerson.monthlyList
              }
              pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 条记录` }}
              size="small"
              rowKey="id"
              scroll={{ x: 1400 }}
            >
              <Table.Column title="事件编号" dataIndex="eventId" key="eventId" width={150}
                render={(eventId) => <Button type="link" style={{ padding: 0 }}>{eventId}</Button>}
              />
              <Table.Column title="事件描述" dataIndex="description" key="description" width={180} ellipsis />
              <Table.Column title="标签" dataIndex="tags" key="tags" width={160}
                render={(tags) => (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {tags?.map((tag, index) => (
                      <Tag key={index} color={
                        tag.includes('高频') || tag.includes('紧急') ? 'red' :
                        tag.includes('重点') || tag.includes('关注') ? 'orange' :
                        tag.includes('已解决') || tag.includes('已办') ? 'green' :
                        'blue'
                      } style={{ margin: 0 }}>{tag}</Tag>
                    ))}
                  </div>
                )}
              />
              <Table.Column title="镇街名称" dataIndex="street" key="street" width={90}
                filters={streetOptions.filter(s => s.value !== 'all').map(s => ({ text: s.label, value: s.label }))}
                onFilter={(value, record) => record.street === value}
              />
              <Table.Column title="村社名称" dataIndex="village" key="village" width={90} />
              <Table.Column title="事件级别" dataIndex="level" key="level" width={90}
                render={(level) => <Tag color="blue">{level}</Tag>}
              />
              <Table.Column title="二级分类" dataIndex="subCategory" key="subCategory" width={110} />
              <Table.Column title="上报时间" dataIndex="reportTime" key="reportTime" width={140}
                sorter={(a, b) => new Date(a.reportTime) - new Date(b.reportTime)}
              />
              <Table.Column title="报案人信息" dataIndex="reporterInfo" key="reporterInfo" width={150} />
              <Table.Column title="相关事件" dataIndex="relatedEvents" key="relatedEvents" width={80} />
              <Table.Column title="处置结果" dataIndex="result" key="result" width={160} ellipsis />
              <Table.Column title="操作" key="action" width={60} fixed="right"
                render={() => <Button type="link" size="small" style={{ padding: 0 }}>详情</Button>}
              />
            </Table>
          </>
        )}

        {/* 3. 多人一事预警详情 */}
        {warningType === 'multiPersonEvent' && (
          <>
            <Card size="small" style={{ marginBottom: 16, background: '#fff7e6', border: '1px solid #ffd591' }}>
              <Row gutter={24}>
                <Col span={6}>
                  <Statistic title="当日活跃" value={predictionData.multiPersonEvent.dailyActive} suffix="个" valueStyle={{ color: '#fa8c16' }} />
                </Col>
                <Col span={6}>
                  <Statistic title="本周活跃" value={predictionData.multiPersonEvent.weeklyActive} suffix="个" valueStyle={{ color: '#fa8c16' }} />
                </Col>
                <Col span={6}>
                  <Statistic title="本月活跃" value={predictionData.multiPersonEvent.monthlyActive} suffix="个" valueStyle={{ color: '#fa8c16' }} />
                </Col>
                <Col span={6}>
                  <Statistic title="涉及总人数" value={54} suffix="人" />
                </Col>
              </Row>
            </Card>
            <Table
              dataSource={predictionData.multiPersonEvent.list}
              pagination={{ pageSize: 10 }}
              size="small"
              rowKey="id"
            >
              <Table.Column title="事件名称" dataIndex="event" key="event" width={180} />
              <Table.Column title="涉及人数" dataIndex="persons" key="persons" width={100} sorter={(a, b) => a.persons - b.persons}
                render={(count) => <Tag color="purple">{count} 人</Tag>}
              />
              <Table.Column title="人数变化" dataIndex="personsTrend" key="personsTrend" width={100}
                render={(trend) => (
                  <span style={{ color: trend > 0 ? '#cf1322' : trend < 0 ? '#3f8600' : '#666' }}>
                    {trend > 0 ? '+' : ''}{trend}
                    {trend > 0 && <ArrowUpOutlined style={{ marginLeft: 4 }} />}
                    {trend < 0 && <ArrowDownOutlined style={{ marginLeft: 4 }} />}
                  </span>
                )}
              />
              <Table.Column title="事件分类" dataIndex="category" key="category" width={100}
                filters={[
                  { text: '物业纠纷', value: '物业纠纷' },
                  { text: '环境污染', value: '环境污染' },
                  { text: '劳务纠纷', value: '劳务纠纷' },
                  { text: '消费纠纷', value: '消费纠纷' },
                ]}
                onFilter={(value, record) => record.category === value}
              />
              <Table.Column title="事件描述" dataIndex="desc" key="desc" width={160} ellipsis />
              <Table.Column title="风险等级" dataIndex="riskLevel" key="riskLevel" width={100}
                render={(level) => (
                  <Tag color={level === '高' ? 'red' : level === '中' ? 'orange' : 'green'}>{level}</Tag>
                )}
              />
              <Table.Column title="所属街镇" dataIndex="street" key="street" width={100} />
              <Table.Column title="操作" key="action" width={80}
                render={() => <Button type="link" size="small">详情</Button>}
              />
            </Table>
          </>
        )}

      </Drawer>
    </div>
  );
};

export default Dashboard;
