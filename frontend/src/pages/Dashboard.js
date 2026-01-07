import React, { useState, useMemo } from 'react';
import { Card, Row, Col, Statistic, Button, Tag, Table, Drawer, Space, Typography, Select, DatePicker, Cascader } from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  FileTextOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
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
  const [selectedEventType, setSelectedEventType] = useState('all');
  const [selectedStreet, setSelectedStreet] = useState('all');

  // 数据总览筛选条件
  const [overviewTimeRange, setOverviewTimeRange] = useState(null);
  const [overviewStreet, setOverviewStreet] = useState('all');

  // 态势分析筛选条件 - 使用级联选择器,默认矛盾纠纷的全部
  const [situationCategory, setSituationCategory] = useState(['disputes']); // 默认矛盾纠纷(只选一级)

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
    { id: 1, name: '债务纠纷', totalCount: 2847, monthlyNew: 287, dailyNew: 45 },
    { id: 2, name: '停车纠纷', totalCount: 2165, monthlyNew: 198, dailyNew: 38 },
    { id: 3, name: '噪音投诉', totalCount: 1654, monthlyNew: 156, dailyNew: 32 },
    { id: 4, name: '物业纠纷', totalCount: 1823, monthlyNew: 145, dailyNew: 28 },
    { id: 5, name: '邻里纠纷', totalCount: 2456, monthlyNew: 132, dailyNew: 25 },
    { id: 6, name: '劳务纠纷', totalCount: 1234, monthlyNew: 98, dailyNew: 22 },
    { id: 7, name: '环境污染', totalCount: 1123, monthlyNew: 87, dailyNew: 18 },
    { id: 8, name: '租房纠纷', totalCount: 1432, monthlyNew: 76, dailyNew: 15 },
    { id: 9, name: '消防安全', totalCount: 876, monthlyNew: 65, dailyNew: 12 },
    { id: 10, name: '交通违章', totalCount: 765, monthlyNew: 54, dailyNew: 10 },
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

  // Mock数据 - 态势分析（按分类和级别）
  const situationTrendData = useMemo(() => {
    // 基础日期数据
    const dates = [
      '12-06', '12-07', '12-08', '12-09', '12-10', '12-11', '12-12',
      '12-13', '12-14', '12-15', '12-16', '12-17', '12-18', '12-19'
    ];

    // 生成不同分类和级别的数据
    const generateData = (baseValues) => {
      return dates.map((date, index) => ({
        date,
        level1: baseValues.level1[index],
        level2: baseValues.level2[index],
        level3: baseValues.level3[index],
        level4: baseValues.level4[index],
      }));
    };

    return {
      disputes: generateData({
        level1: [38, 35, 40, 37, 42, 39, 44, 41, 45, 43, 47, 45, 50, 48],
        level2: [28, 30, 32, 29, 35, 31, 36, 33, 38, 35, 40, 37, 42, 39],
        level3: [45, 42, 48, 44, 51, 47, 53, 49, 55, 52, 58, 54, 60, 57],
        level4: [15, 18, 16, 20, 17, 19, 18, 21, 19, 22, 20, 23, 21, 24],
      }),
      cityManagement: generateData({
        level1: [45, 42, 48, 51, 47, 53, 49, 55, 52, 58, 54, 60, 57, 62],
        level2: [35, 33, 38, 40, 37, 42, 39, 44, 41, 46, 43, 48, 45, 50],
        level3: [52, 49, 55, 58, 54, 60, 56, 62, 59, 65, 61, 67, 64, 69],
        level4: [20, 22, 19, 24, 21, 26, 23, 28, 25, 30, 27, 32, 29, 34],
      }),
      publicSafety: generateData({
        level1: [12, 15, 13, 16, 14, 17, 15, 18, 16, 19, 17, 20, 18, 21],
        level2: [8, 10, 9, 11, 10, 12, 11, 13, 12, 14, 13, 15, 14, 16],
        level3: [18, 20, 19, 22, 20, 24, 22, 26, 24, 28, 26, 30, 28, 32],
        level4: [5, 6, 5, 7, 6, 8, 7, 9, 8, 10, 9, 11, 10, 12],
      }),
      environment: generateData({
        level1: [22, 25, 23, 28, 25, 30, 27, 32, 29, 34, 31, 36, 33, 38],
        level2: [18, 20, 19, 22, 20, 24, 22, 26, 24, 28, 26, 30, 28, 32],
        level3: [30, 32, 31, 34, 32, 36, 34, 38, 36, 40, 38, 42, 40, 44],
        level4: [10, 12, 11, 13, 12, 14, 13, 15, 14, 16, 15, 17, 16, 18],
      }),
      publicService: generateData({
        level1: [25, 28, 26, 30, 28, 32, 30, 34, 32, 36, 34, 38, 36, 40],
        level2: [20, 22, 21, 24, 22, 26, 24, 28, 26, 30, 28, 32, 30, 34],
        level3: [35, 37, 36, 39, 37, 41, 39, 43, 41, 45, 43, 47, 45, 49],
        level4: [12, 14, 13, 15, 14, 16, 15, 17, 16, 18, 17, 19, 18, 20],
      }),
    };
  }, []);

  // 根据筛选条件生成图表数据
  const situationChartData = useMemo(() => {
    // 获取一级分类(数组第一个元素)
    const primaryCategory = situationCategory && situationCategory.length > 0 ? situationCategory[0] : 'disputes';
    const categoryData = situationTrendData[primaryCategory] || [];
    const result = [];

    // 聚合所有级别的数据,显示总趋势
    categoryData.forEach(item => {
      const totalCount = item.level1 + item.level2 + item.level3 + item.level4;
      result.push({
        date: item.date,
        count: totalCount,
      });
    });

    return result;
  }, [situationCategory, situationTrendData]);

  // Mock数据 - 预测预警
  const predictionData = useMemo(() => ({
    // 1. 重复报警
    repeatEvents: {
      dailyNew: 5,
      weeklyNew: 23,
      monthlyNew: 89,
      list: [
        { id: 1, event: '南门街道某小区停车纠纷', times: 5, firstTime: '2025-11-20', lastTime: '2025-12-19', status: '处理中', street: '南门街道' },
        { id: 2, event: '望城街道某工地噪音投诉', times: 4, firstTime: '2025-11-25', lastTime: '2025-12-18', status: '已解决', street: '望城街道' },
        { id: 3, event: '古林镇某楼栋邻里纠纷', times: 4, firstTime: '2025-11-28', lastTime: '2025-12-17', status: '处理中', street: '古林镇' },
        { id: 4, event: '石碶街道某小区物业纠纷', times: 3, firstTime: '2025-12-01', lastTime: '2025-12-16', status: '已解决', street: '石碶街道' },
        { id: 5, event: '高桥镇某商户债务纠纷', times: 3, firstTime: '2025-12-05', lastTime: '2025-12-15', status: '处理中', street: '高桥镇' },
      ]
    },
    // 2. 重点人员报警
    keyPerson: {
      dailyAlarm: 3,
      weeklyAlarm: 18,
      monthlyAlarm: 67,
      list: [
        { id: 1, name: '张某某', phone: '138****0001', events: 8, types: '债务、邻里', riskLevel: '高', lastTime: '2025-12-19', street: '南门街道' },
        { id: 2, name: '李某', phone: '139****0002', events: 7, types: '停车、噪音', riskLevel: '高', lastTime: '2025-12-18', street: '望城街道' },
        { id: 3, name: '王某某', phone: '137****0003', events: 6, types: '物业、邻里', riskLevel: '中', lastTime: '2025-12-17', street: '古林镇' },
        { id: 4, name: '赵某', phone: '136****0004', events: 6, types: '债务、劳务', riskLevel: '中', lastTime: '2025-12-16', street: '石碶街道' },
        { id: 5, name: '钱某某', phone: '135****0005', events: 5, types: '租房、物业', riskLevel: '低', lastTime: '2025-12-15', street: '高桥镇' },
      ]
    },
    // 3. 多人一事预警（事件簇）
    multiPersonEvent: {
      dailyNew: 2,
      weeklyNew: 12,
      monthlyNew: 45,
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
      minors: 23,
      disputes: 45,
      publicSafety: 12,
    },
    closedLoop: {
      phased: 34,
      simplified: 28,
      false: 8,
    }
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
            width: graphMode === 'count' ? `${Math.sqrt(centerTopic.count) / 2}px` : '120px',
            height: graphMode === 'count' ? `${Math.sqrt(centerTopic.count) / 2}px` : '120px',
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
            {graphMode === 'count' ? centerTopic.count : `${centerTopic.trend > 0 ? '+' : ''}${centerTopic.trend}%`}
          </div>
          <div style={{ fontSize: 11, opacity: 0.9 }}>
            {graphMode === 'count' ? '事件数' : '环比'}
          </div>
        </div>

        {/* 周围主题（圆形分布） */}
        {surroundingTopics.map((topic, index) => {
          const angle = (360 / surroundingTopics.length) * index;
          const radius = 180;
          const x = Math.cos((angle - 90) * Math.PI / 180) * radius;
          const y = Math.sin((angle - 90) * Math.PI / 180) * radius;

          const size = graphMode === 'count'
            ? Math.max(60, Math.min(100, Math.sqrt(topic.count) / 3))
            : 80;

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
                {graphMode === 'count' ? topic.count : `${topic.trend > 0 ? '+' : ''}${topic.trend}%`}
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
        extra={
          <Space>
            <span style={{ fontSize: 14, color: '#666' }}>时间范围：</span>
            <RangePicker
              style={{ width: 240 }}
              placeholder={['开始日期', '结束日期']}
              value={overviewTimeRange}
              onChange={setOverviewTimeRange}
              format="YYYY-MM-DD"
            />
            <span style={{ fontSize: 14, color: '#666', marginLeft: 8 }}>街镇：</span>
            <Select
              style={{ width: 140 }}
              placeholder="选择街镇"
              value={overviewStreet}
              onChange={setOverviewStreet}
              options={streetOptions}
            />
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        {/* 筛选条件提示 */}
        {(overviewTimeRange || overviewStreet !== 'all') && (
          <div style={{ marginBottom: 16, padding: '8px 12px', background: '#e6f7ff', borderRadius: 4, border: '1px solid #91d5ff' }}>
            <Space size={4}>
              <Text style={{ fontSize: 13, color: '#1890ff' }}>当前筛选条件：</Text>
              {overviewTimeRange && (
                <Tag color="blue" closable onClose={() => setOverviewTimeRange(null)}>
                  {overviewTimeRange[0].format('YYYY-MM-DD')} ~ {overviewTimeRange[1].format('YYYY-MM-DD')}
                </Tag>
              )}
              {overviewStreet !== 'all' && (
                <Tag color="blue" closable onClose={() => setOverviewStreet('all')}>
                  {streetOptions.find(opt => opt.value === overviewStreet)?.label}
                </Tag>
              )}
            </Space>
          </div>
        )}
        <Row gutter={16} style={{ marginBottom: 24 }}>
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
                title="同比增长"
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
                title="环比增长"
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
        title={<span style={{ fontSize: 18, fontWeight: 600 }}>⚠️ 预测预警</span>}
        extra={<Text type="secondary" style={{ fontSize: 12 }}>数据更新时间：{dayjs().subtract(1, 'day').format('YYYY-MM-DD')}</Text>}
        className="prediction-card"
        style={{ marginBottom: 24 }}
      >
        <Row gutter={[16, 16]}>
          {/* 1. 重复报警 */}
          <Col span={8}>
            <Card
              className="warning-card"
              hoverable
              style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', height: '100%' }}
              onClick={() => handleWarningClick('repeatEvents')}
            >
              <div style={{ textAlign: 'center', color: 'white' }}>
                <WarningOutlined style={{ fontSize: 28, marginBottom: 8 }} />
                <div style={{ fontSize: 15, marginBottom: 8, fontWeight: 500 }}>重复报警</div>
                <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: 12 }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 'bold' }}>{predictionData.repeatEvents.dailyNew}</div>
                    <div style={{ opacity: 0.9 }}>当日新增</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 'bold' }}>{predictionData.repeatEvents.weeklyNew}</div>
                    <div style={{ opacity: 0.9 }}>本周新增</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 'bold' }}>{predictionData.repeatEvents.monthlyNew}</div>
                    <div style={{ opacity: 0.9 }}>本月新增</div>
                  </div>
                </div>
              </div>
            </Card>
          </Col>

          {/* 2. 重点人员报警 */}
          <Col span={8}>
            <Card
              className="warning-card"
              hoverable
              style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', height: '100%' }}
              onClick={() => handleWarningClick('keyPerson')}
            >
              <div style={{ textAlign: 'center', color: 'white' }}>
                <WarningOutlined style={{ fontSize: 28, marginBottom: 8 }} />
                <div style={{ fontSize: 15, marginBottom: 8, fontWeight: 500 }}>重点人员报警</div>
                <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: 12 }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 'bold' }}>{predictionData.keyPerson.dailyAlarm}</div>
                    <div style={{ opacity: 0.9 }}>当日报警</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 'bold' }}>{predictionData.keyPerson.weeklyAlarm}</div>
                    <div style={{ opacity: 0.9 }}>本周报警</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 'bold' }}>{predictionData.keyPerson.monthlyAlarm}</div>
                    <div style={{ opacity: 0.9 }}>当月报警</div>
                  </div>
                </div>
              </div>
            </Card>
          </Col>

          {/* 3. 多人一事预警 */}
          <Col span={8}>
            <Card
              className="warning-card"
              hoverable
              style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', height: '100%' }}
              onClick={() => handleWarningClick('multiPersonEvent')}
            >
              <div style={{ textAlign: 'center', color: 'white' }}>
                <WarningOutlined style={{ fontSize: 28, marginBottom: 8 }} />
                <div style={{ fontSize: 15, marginBottom: 8, fontWeight: 500 }}>多人一事预警</div>
                <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: 12 }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 'bold' }}>{predictionData.multiPersonEvent.dailyNew}</div>
                    <div style={{ opacity: 0.9 }}>当日新增</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 'bold' }}>{predictionData.multiPersonEvent.weeklyNew}</div>
                    <div style={{ opacity: 0.9 }}>本周新增</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 'bold' }}>{predictionData.multiPersonEvent.monthlyNew}</div>
                    <div style={{ opacity: 0.9 }}>当月新增</div>
                  </div>
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
              <Space>
                <Button
                  type={graphMode === 'count' ? 'primary' : 'default'}
                  size="small"
                  onClick={() => setGraphMode('count')}
                >
                  数据量
                </Button>
                <Button
                  type={graphMode === 'trend' ? 'primary' : 'default'}
                  size="small"
                  onClick={() => setGraphMode('trend')}
                >
                  环比涨幅
                </Button>
              </Space>
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
              <Space align="center">
                <Text style={{ fontSize: 13, color: '#666', minWidth: 80 }}>事件分类：</Text>
                <Cascader
                  style={{ width: 350 }}
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
                  xField="date"
                  yField="count"
                  height={360}
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
          <Card title={<span style={{ fontSize: 18, fontWeight: 600 }}>🔄 闭环监测</span>} className="closed-loop-card" style={{ height: '100%' }}>
            {/* 统计概览 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <div style={{ textAlign: 'center', padding: '16px 0', background: '#f6ffed', borderRadius: 8 }}>
                  <div style={{ fontSize: 28, fontWeight: 'bold', color: '#52c41a' }}>87.5%</div>
                  <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>本周闭环率</div>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ textAlign: 'center', padding: '16px 0', background: '#e6f7ff', borderRadius: 8 }}>
                  <div style={{ fontSize: 28, fontWeight: 'bold', color: '#1890ff' }}>70</div>
                  <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>本周办结</div>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ textAlign: 'center', padding: '16px 0', background: '#fff7e6', borderRadius: 8 }}>
                  <div style={{ fontSize: 28, fontWeight: 'bold', color: '#fa8c16' }}>10</div>
                  <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>待办结</div>
                </div>
              </Col>
            </Row>

            {/* 办结类型分布 */}
            <div style={{ padding: '16px', background: '#fafafa', borderRadius: 8 }}>
              <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 16 }}>
                办结类型分布（根据文本解析标准提供）
              </Text>
              <Space direction="vertical" style={{ width: '100%' }} size={16}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text><CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />阶段性办结</Text>
                    <Text strong style={{ color: '#52c41a' }}>{closedLoopData.closedLoop.phased} 件</Text>
                  </div>
                  <div style={{ background: '#f0f0f0', borderRadius: 4, height: 8 }}>
                    <div style={{ background: '#52c41a', borderRadius: 4, height: 8, width: '48%' }} />
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text><ClockCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />简化性办结</Text>
                    <Text strong style={{ color: '#faad14' }}>{closedLoopData.closedLoop.simplified} 件</Text>
                  </div>
                  <div style={{ background: '#f0f0f0', borderRadius: 4, height: 8 }}>
                    <div style={{ background: '#faad14', borderRadius: 4, height: 8, width: '40%' }} />
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text><WarningOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />虚假性办结</Text>
                    <Text strong style={{ color: '#ff4d4f' }}>{closedLoopData.closedLoop.false} 件</Text>
                  </div>
                  <div style={{ background: '#f0f0f0', borderRadius: 4, height: 8 }}>
                    <div style={{ background: '#ff4d4f', borderRadius: 4, height: 8, width: '12%' }} />
                  </div>
                </div>
              </Space>
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
        width={1000}
        onClose={() => setWarningDrawerVisible(false)}
        open={warningDrawerVisible}
      >
        {/* 1. 重复报警详情 */}
        {warningType === 'repeatEvents' && (
          <>
            <Card size="small" style={{ marginBottom: 16, background: '#f0f5ff', border: '1px solid #adc6ff' }}>
              <Row gutter={24}>
                <Col span={6}>
                  <Statistic title="当日新增" value={predictionData.repeatEvents.dailyNew} suffix="件" valueStyle={{ color: '#667eea' }} />
                </Col>
                <Col span={6}>
                  <Statistic title="本周新增" value={predictionData.repeatEvents.weeklyNew} suffix="件" valueStyle={{ color: '#667eea' }} />
                </Col>
                <Col span={6}>
                  <Statistic title="本月新增" value={predictionData.repeatEvents.monthlyNew} suffix="件" valueStyle={{ color: '#667eea' }} />
                </Col>
                <Col span={6}>
                  <Statistic title="平均重复次数" value={3.8} suffix="次" />
                </Col>
              </Row>
            </Card>
            <Table
              dataSource={predictionData.repeatEvents.list}
              pagination={{ pageSize: 10 }}
              size="small"
              rowKey="id"
            >
              <Table.Column title="事件名称" dataIndex="event" key="event" width={200} />
              <Table.Column title="重复次数" dataIndex="times" key="times" width={100} sorter={(a, b) => a.times - b.times}
                render={(times) => <Tag color="red">{times} 次</Tag>}
              />
              <Table.Column title="所属街镇" dataIndex="street" key="street" width={100}
                filters={streetOptions.filter(s => s.value !== 'all').map(s => ({ text: s.label, value: s.label }))}
                onFilter={(value, record) => record.street === value}
              />
              <Table.Column title="首次发生" dataIndex="firstTime" key="firstTime" width={120} />
              <Table.Column title="最近发生" dataIndex="lastTime" key="lastTime" width={120} sorter={(a, b) => new Date(a.lastTime) - new Date(b.lastTime)} />
              <Table.Column title="处理状态" dataIndex="status" key="status" width={100}
                filters={[
                  { text: '处理中', value: '处理中' },
                  { text: '已解决', value: '已解决' },
                ]}
                onFilter={(value, record) => record.status === value}
                render={(status) => (
                  <Tag color={status === '已解决' ? 'green' : 'blue'}>{status}</Tag>
                )}
              />
              <Table.Column title="操作" key="action" width={80}
                render={() => <Button type="link" size="small">详情</Button>}
              />
            </Table>
          </>
        )}

        {/* 2. 重点人员报警详情 */}
        {warningType === 'keyPerson' && (
          <>
            <Card size="small" style={{ marginBottom: 16, background: '#e6fffb', border: '1px solid #87e8de' }}>
              <Row gutter={24}>
                <Col span={6}>
                  <Statistic title="当日报警" value={predictionData.keyPerson.dailyAlarm} suffix="次" valueStyle={{ color: '#13c2c2' }} />
                </Col>
                <Col span={6}>
                  <Statistic title="本周报警" value={predictionData.keyPerson.weeklyAlarm} suffix="次" valueStyle={{ color: '#13c2c2' }} />
                </Col>
                <Col span={6}>
                  <Statistic title="当月报警" value={predictionData.keyPerson.monthlyAlarm} suffix="次" valueStyle={{ color: '#13c2c2' }} />
                </Col>
                <Col span={6}>
                  <Statistic title="涉及人员" value={5} suffix="人" valueStyle={{ color: '#cf1322' }} />
                </Col>
              </Row>
            </Card>
            <Table
              dataSource={predictionData.keyPerson.list}
              pagination={{ pageSize: 10 }}
              size="small"
              rowKey="id"
            >
              <Table.Column title="姓名" dataIndex="name" key="name" width={100} />
              <Table.Column title="联系电话" dataIndex="phone" key="phone" width={120} />
              <Table.Column title="事件数量" dataIndex="events" key="events" width={100} sorter={(a, b) => a.events - b.events}
                render={(count) => <Tag color="volcano">{count} 件</Tag>}
              />
              <Table.Column title="主要类型" dataIndex="types" key="types" width={120} />
              <Table.Column title="风险等级" dataIndex="riskLevel" key="riskLevel" width={100}
                filters={[
                  { text: '高', value: '高' },
                  { text: '中', value: '中' },
                  { text: '低', value: '低' },
                ]}
                onFilter={(value, record) => record.riskLevel === value}
                render={(level) => (
                  <Tag color={level === '高' ? 'red' : level === '中' ? 'orange' : 'green'}>{level}</Tag>
                )}
              />
              <Table.Column title="所属街镇" dataIndex="street" key="street" width={100} />
              <Table.Column title="最近报警" dataIndex="lastTime" key="lastTime" width={120} />
              <Table.Column title="操作" key="action" width={80}
                render={() => <Button type="link" size="small">详情</Button>}
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
                  <Statistic title="当日新增" value={predictionData.multiPersonEvent.dailyNew} suffix="个" valueStyle={{ color: '#fa8c16' }} />
                </Col>
                <Col span={6}>
                  <Statistic title="本周新增" value={predictionData.multiPersonEvent.weeklyNew} suffix="个" valueStyle={{ color: '#fa8c16' }} />
                </Col>
                <Col span={6}>
                  <Statistic title="当月新增" value={predictionData.multiPersonEvent.monthlyNew} suffix="个" valueStyle={{ color: '#fa8c16' }} />
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
