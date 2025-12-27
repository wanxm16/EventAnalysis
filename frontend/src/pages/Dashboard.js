import React, { useState, useMemo } from 'react';
import { Card, Row, Col, Statistic, Button, Tag, Table, Drawer, Space, Typography } from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  FileTextOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import { Line } from '@ant-design/plots';
import './Dashboard.css';

const { Title, Text, Paragraph } = Typography;

const Dashboard = () => {
  const [issueDrawerVisible, setIssueDrawerVisible] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [situationView, setSituationView] = useState('level');
  const [issueView, setIssueView] = useState('graph'); // 'graph' or 'list'
  const [graphMode, setGraphMode] = useState('count'); // 'count' or 'trend'
  const [warningDrawerVisible, setWarningDrawerVisible] = useState(false);
  const [warningType, setWarningType] = useState(null);

  // Mock数据 - 数据总览
  const overviewData = useMemo(() => ({
    totalEvents: 12345,
    monthEvents: 1234,
    growth: 12,
    dataSources: 8,
    monthlyTrend: [
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
    ],
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
  }), []);

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

  // Mock数据 - 态势分析
  const levelTrendData = useMemo(() => ({
    cityManagement: [
      { date: '12-06', count: 45 },
      { date: '12-07', count: 42 },
      { date: '12-08', count: 48 },
      { date: '12-09', count: 51 },
      { date: '12-10', count: 47 },
      { date: '12-11', count: 53 },
      { date: '12-12', count: 49 },
      { date: '12-13', count: 55 },
      { date: '12-14', count: 52 },
      { date: '12-15', count: 58 },
      { date: '12-16', count: 54 },
      { date: '12-17', count: 60 },
      { date: '12-18', count: 57 },
      { date: '12-19', count: 62 },
    ],
    disputes: [
      { date: '12-06', count: 38 },
      { date: '12-07', count: 35 },
      { date: '12-08', count: 40 },
      { date: '12-09', count: 37 },
      { date: '12-10', count: 42 },
      { date: '12-11', count: 39 },
      { date: '12-12', count: 44 },
      { date: '12-13', count: 41 },
      { date: '12-14', count: 45 },
      { date: '12-15', count: 43 },
      { date: '12-16', count: 47 },
      { date: '12-17', count: 45 },
      { date: '12-18', count: 50 },
      { date: '12-19', count: 48 },
    ],
  }), []);

  // Mock数据 - 预测预警
  const predictionData = useMemo(() => ({
    repeatEvents: {
      count: 23,
      list: [
        { id: 1, event: '南门街道停车纠纷', times: 5, lastTime: '2025-12-19', status: '处理中' },
        { id: 2, event: '望城街道噪音投诉', times: 4, lastTime: '2025-12-18', status: '已解决' },
        { id: 3, event: '古林镇邻里纠纷', times: 4, lastTime: '2025-12-17', status: '处理中' },
        { id: 4, event: '石碶街道物业纠纷', times: 3, lastTime: '2025-12-16', status: '已解决' },
        { id: 5, event: '高桥镇债务纠纷', times: 3, lastTime: '2025-12-15', status: '处理中' },
      ]
    },
    multiLocation: {
      count: 15,
      list: [
        { id: 1, location: '南门街道某小区', events: 12, types: '停车、噪音、物业', lastTime: '2025-12-19' },
        { id: 2, location: '望城街道商业区', events: 10, types: '停车、环境', lastTime: '2025-12-18' },
        { id: 3, location: '古林镇老旧小区', events: 9, types: '噪音、设施', lastTime: '2025-12-17' },
        { id: 4, location: '石碶街道工业园', events: 8, types: '环境、交通', lastTime: '2025-12-16' },
        { id: 5, location: '高桥镇农贸市场', events: 7, types: '环境、卫生', lastTime: '2025-12-15' },
      ]
    },
    multiPerson: {
      count: 18,
      list: [
        { id: 1, name: '张某', phone: '138****0001', events: 8, types: '债务、邻里', lastTime: '2025-12-19' },
        { id: 2, name: '李某', phone: '139****0002', events: 7, types: '停车、噪音', lastTime: '2025-12-18' },
        { id: 3, name: '王某', phone: '137****0003', events: 6, types: '物业、邻里', lastTime: '2025-12-17' },
        { id: 4, name: '赵某', phone: '136****0004', events: 6, types: '债务、劳务', lastTime: '2025-12-16' },
        { id: 5, name: '钱某', phone: '135****0005', events: 5, types: '租房、物业', lastTime: '2025-12-15' },
      ]
    },
    multiPersonEvent: {
      count: 12,
      list: [
        { id: 1, event: '某小区停车位纠纷', persons: 15, desc: '多位业主反映', lastTime: '2025-12-19' },
        { id: 2, event: '某工地噪音扰民', persons: 12, desc: '周边居民投诉', lastTime: '2025-12-18' },
        { id: 3, event: '某公司工资拖欠', persons: 10, desc: '多名员工反映', lastTime: '2025-12-17' },
        { id: 4, event: '某楼盘质量问题', persons: 9, desc: '多位业主投诉', lastTime: '2025-12-16' },
        { id: 5, event: '某商场消费纠纷', persons: 8, desc: '多名消费者反映', lastTime: '2025-12-15' },
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
        style={{ marginBottom: 24 }}
      >
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
                title="数据来源"
                value={overviewData.dataSources}
                suffix="个"
                prefix={<DatabaseOutlined />}
                valueStyle={{ color: '#faad14' }}
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

        <div className="data-sources">
          <Text type="secondary" style={{ fontSize: 13 }}>
            数据来源：
            {overviewData.sources.map((source, index) => (
              <Tag key={index} color="blue" style={{ margin: '0 4px' }}>
                {source.name} ({source.count})
              </Tag>
            ))}
          </Text>
        </div>
      </Card>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card
            title={<span style={{ fontSize: 18, fontWeight: 600 }}>🔍 问题聚焦</span>}
            extra={
              <Space>
                <Button
                  type={issueView === 'graph' ? 'primary' : 'default'}
                  size="small"
                  onClick={() => setIssueView('graph')}
                >
                  知识图谱
                </Button>
                <Button
                  type={issueView === 'list' ? 'primary' : 'default'}
                  size="small"
                  onClick={() => setIssueView('list')}
                >
                  高频热点
                </Button>
                {issueView === 'graph' && (
                  <>
                    <span style={{ margin: '0 8px', color: '#999' }}>|</span>
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
                  </>
                )}
              </Space>
            }
            className="issue-cluster-card"
            style={{ height: '100%' }}
          >
            {issueView === 'graph' ? (
              <div style={{ height: 480, position: 'relative' }}>
                {renderKnowledgeGraph()}
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 16 }}>
                  <Text strong style={{ fontSize: 14 }}>高频热点 TOP 10</Text>
                </div>
                <Table
                  dataSource={hotTopics}
                  size="small"
                  pagination={false}
                  rowKey="id"
                  scroll={{ y: 400 }}
                  columns={[
                {
                  title: '排名',
                  dataIndex: 'rank',
                  key: 'rank',
                  width: 60,
                  align: 'center',
                  render: (rank) => (
                    <Tag color={rank <= 3 ? 'red' : 'blue'}>{rank}</Tag>
                  ),
                },
                {
                  title: '主题名称',
                  dataIndex: 'name',
                  key: 'name',
                  width: 120,
                  render: (name, record) => (
                    <Button type="link" onClick={() => handleTopicClick(record)} style={{ padding: 0 }}>
                      {name}
                    </Button>
                  ),
                },
                {
                  title: '事件数',
                  dataIndex: 'count',
                  key: 'count',
                  width: 100,
                  align: 'right',
                  render: (count) => (
                    <Text strong style={{ color: '#1890ff' }}>{count}</Text>
                  ),
                },
                {
                  title: '趋势',
                  dataIndex: 'trend',
                  key: 'trend',
                  width: 80,
                  align: 'center',
                  render: (trend) => (
                    <Tag
                      color={trend > 0 ? 'red' : trend < 0 ? 'green' : 'default'}
                      icon={trend > 0 ? <ArrowUpOutlined /> : trend < 0 ? <ArrowDownOutlined /> : null}
                    >
                      {trend > 0 ? '+' : ''}{trend}%
                    </Tag>
                  ),
                },
              ]}
            />
              </>
            )}
          </Card>
        </Col>

        <Col span={12}>
          <Card
            title={<span style={{ fontSize: 18, fontWeight: 600 }}>📈 态势分析</span>}
            extra={
              <Space>
                <Button
                  type={situationView === 'level' ? 'primary' : 'default'}
                  size="small"
                  onClick={() => setSituationView('level')}
                >
                  级别
                </Button>
                <Button
                  type={situationView === 'category' ? 'primary' : 'default'}
                  size="small"
                  onClick={() => setSituationView('category')}
                >
                  类别
                </Button>
              </Space>
            }
            className="situation-card"
            style={{ height: '100%' }}
          >
            {situationView === 'level' ? (
              <div>
                <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 12 }}>
                  一级分类趋势对比
                </Text>
                <Line
                  data={[
                    ...levelTrendData.cityManagement.map(d => ({ ...d, type: '城市管理' })),
                    ...levelTrendData.disputes.map(d => ({ ...d, type: '矛盾纠纷' })),
                  ]}
                  xField="date"
                  yField="count"
                  seriesField="type"
                  height={380}
                  smooth
                  color={['#1890ff', '#52c41a']}
                  point={{ size: 3, shape: 'circle' }}
                  legend={{ position: 'top' }}
                  xAxis={{ label: { style: { fontSize: 11 } } }}
                  yAxis={{
                    label: { style: { fontSize: 11 } },
                    grid: { line: { style: { stroke: '#f0f0f0', lineDash: [4, 4] } } }
                  }}
                />
              </div>
            ) : (
              <div>
                <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 12 }}>
                  类别趋势分析
                </Text>
                <Line
                  data={levelTrendData.cityManagement}
                  xField="date"
                  yField="count"
                  height={380}
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
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card
            title={<span style={{ fontSize: 18, fontWeight: 600 }}>⚠️ 预测预警</span>}
            className="prediction-card"
          >
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Card
                  className="warning-card"
                  hoverable
                  style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                  onClick={() => handleWarningClick('repeatEvents')}
                >
                  <div style={{ textAlign: 'center', color: 'white' }}>
                    <WarningOutlined style={{ fontSize: 32, marginBottom: 8 }} />
                    <div style={{ fontSize: 16, marginBottom: 4 }}>一事多次</div>
                    <div style={{ fontSize: 24, fontWeight: 'bold' }}>{predictionData.repeatEvents.count} 件</div>
                    <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>重复事件预警</div>
                  </div>
                </Card>
              </Col>
              <Col span={12}>
                <Card
                  className="warning-card"
                  hoverable
                  style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}
                  onClick={() => handleWarningClick('multiLocation')}
                >
                  <div style={{ textAlign: 'center', color: 'white' }}>
                    <WarningOutlined style={{ fontSize: 32, marginBottom: 8 }} />
                    <div style={{ fontSize: 16, marginBottom: 4 }}>一地多事</div>
                    <div style={{ fontSize: 24, fontWeight: 'bold' }}>{predictionData.multiLocation.count} 个</div>
                    <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>区域聚集预警</div>
                  </div>
                </Card>
              </Col>
              <Col span={12}>
                <Card
                  className="warning-card"
                  hoverable
                  style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}
                  onClick={() => handleWarningClick('multiPerson')}
                >
                  <div style={{ textAlign: 'center', color: 'white' }}>
                    <WarningOutlined style={{ fontSize: 32, marginBottom: 8 }} />
                    <div style={{ fontSize: 16, marginBottom: 4 }}>一人多事</div>
                    <div style={{ fontSize: 24, fontWeight: 'bold' }}>{predictionData.multiPerson.count} 人</div>
                    <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>重点人员预警</div>
                  </div>
                </Card>
              </Col>
              <Col span={12}>
                <Card
                  className="warning-card"
                  hoverable
                  style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}
                  onClick={() => handleWarningClick('multiPersonEvent')}
                >
                  <div style={{ textAlign: 'center', color: 'white' }}>
                    <WarningOutlined style={{ fontSize: 32, marginBottom: 8 }} />
                    <div style={{ fontSize: 16, marginBottom: 4 }}>多人一事</div>
                    <div style={{ fontSize: 24, fontWeight: 'bold' }}>{predictionData.multiPersonEvent.count} 件</div>
                    <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>重点事件预警</div>
                  </div>
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>

        <Col span={12}>
          <Card title={<span style={{ fontSize: 18, fontWeight: 600 }}>🔄 闭环监测</span>} className="closed-loop-card">
            <Card size="small" style={{ marginBottom: 16, background: '#e6f7ff', border: '1px solid #91d5ff' }}>
              <div style={{ padding: '8px 0' }}>
                <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 12 }}>每日监测量</Text>
                <Space direction="vertical" style={{ width: '100%' }} size={8}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text>• 涉未成年人：</Text>
                    <Tag color="orange" style={{ fontSize: 14, padding: '2px 12px' }}>{closedLoopData.daily.minors} 件</Tag>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text>• 涉矛盾纠纷：</Text>
                    <Tag color="blue" style={{ fontSize: 14, padding: '2px 12px' }}>{closedLoopData.daily.disputes} 件</Tag>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text>• 涉公共安全：</Text>
                    <Tag color="red" style={{ fontSize: 14, padding: '2px 12px' }}>{closedLoopData.daily.publicSafety} 件</Tag>
                  </div>
                </Space>
              </div>
            </Card>

            <Card size="small" style={{ background: '#f6ffed', border: '1px solid #b7eb8f' }}>
              <div style={{ padding: '8px 0' }}>
                <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 8 }}>
                  闭环监测（根据文本解析标准提供）
                </Text>
                <Space direction="vertical" style={{ width: '100%' }} size={8}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text><CheckCircleOutlined style={{ color: '#52c41a', marginRight: 4 }} />阶段性办结：</Text>
                    <Tag color="success" style={{ fontSize: 14, padding: '2px 12px' }}>{closedLoopData.closedLoop.phased} 件</Tag>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text><ClockCircleOutlined style={{ color: '#faad14', marginRight: 4 }} />简化性办结：</Text>
                    <Tag color="warning" style={{ fontSize: 14, padding: '2px 12px' }}>{closedLoopData.closedLoop.simplified} 件</Tag>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text><WarningOutlined style={{ color: '#ff4d4f', marginRight: 4 }} />虚假性办结：</Text>
                    <Tag color="error" style={{ fontSize: 14, padding: '2px 12px' }}>{closedLoopData.closedLoop.false} 件</Tag>
                  </div>
                </Space>
              </div>
            </Card>
          </Card>
        </Col>
      </Row>

      <Card className="footer-slogan" style={{ background: 'linear-gradient(135deg, #1890ff 0%, #36cfc9 100%)', border: 'none', textAlign: 'center', padding: '32px 0' }}>
        <Title level={2} style={{ color: 'white', margin: 0 }}>🌊 数据瞰海曙  治理促卓越</Title>
      </Card>

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
                data={levelTrendData.cityManagement}
                xField="date"
                yField="count"
                height={250}
                smooth
                color="#1890ff"
                point={{ size: 4, shape: 'circle' }}
                areaStyle={{ fill: 'l(270) 0:#ffffff 0.5:#e6f7ff 1:#bae7ff' }}
              />
              <div style={{ marginTop: 12, textAlign: 'center' }}>
                <Text type="secondary">
                  本月共计 <Text strong style={{ color: '#1890ff' }}>{selectedIssue.count}</Text> 件，
                  趋势<Tag color={selectedIssue.trend > 0 ? 'red' : selectedIssue.trend < 0 ? 'green' : 'default'} style={{ marginLeft: 4 }}>
                    {selectedIssue.trend > 0 ? '↑' : selectedIssue.trend < 0 ? '↓' : ''}{selectedIssue.trend > 0 ? '+' : ''}{selectedIssue.trend}%
                  </Tag>
                </Text>
              </div>
            </Card>
          </div>
        )}
      </Drawer>

      <Drawer
        title={`预警详情 - ${warningType === 'repeatEvents' ? '一事多次' : warningType === 'multiLocation' ? '一地多事' : warningType === 'multiPerson' ? '一人多事' : '多人一事'}`}
        placement="right"
        width={900}
        onClose={() => setWarningDrawerVisible(false)}
        open={warningDrawerVisible}
      >
        {warningType === 'repeatEvents' && (
          <Table
            dataSource={predictionData.repeatEvents.list}
            pagination={{ pageSize: 10 }}
            size="small"
          >
            <Table.Column title="事件名称" dataIndex="event" key="event" sorter={(a, b) => a.event.localeCompare(b.event)} />
            <Table.Column title="重复次数" dataIndex="times" key="times" sorter={(a, b) => a.times - b.times}
              render={(times) => <Tag color="red">{times} 次</Tag>}
            />
            <Table.Column title="最近发生时间" dataIndex="lastTime" key="lastTime" sorter={(a, b) => new Date(a.lastTime) - new Date(b.lastTime)} />
            <Table.Column title="处理状态" dataIndex="status" key="status"
              filters={[
                { text: '处理中', value: '处理中' },
                { text: '已完成', value: '已完成' },
              ]}
              onFilter={(value, record) => record.status === value}
              render={(status) => (
                <Tag color={status === '已完成' ? 'green' : status === '处理中' ? 'blue' : 'orange'}>
                  {status}
                </Tag>
              )}
            />
            <Table.Column title="操作" key="action"
              render={(_, record) => (
                <Button type="link" size="small">查看详情</Button>
              )}
            />
          </Table>
        )}

        {warningType === 'multiLocation' && (
          <Table
            dataSource={predictionData.multiLocation.list}
            pagination={{ pageSize: 10 }}
            size="small"
          >
            <Table.Column title="地点" dataIndex="location" key="location" sorter={(a, b) => a.location.localeCompare(b.location)} />
            <Table.Column title="事件数量" dataIndex="eventCount" key="eventCount" sorter={(a, b) => a.eventCount - b.eventCount}
              render={(count) => <Tag color="orange">{count} 件</Tag>}
            />
            <Table.Column title="主要类型" dataIndex="mainType" key="mainType"
              filters={[
                { text: '市容市貌', value: '市容市貌' },
                { text: '交通秩序', value: '交通秩序' },
                { text: '环境卫生', value: '环境卫生' },
              ]}
              onFilter={(value, record) => record.mainType === value}
            />
            <Table.Column title="最近发生时间" dataIndex="lastTime" key="lastTime" sorter={(a, b) => new Date(a.lastTime) - new Date(b.lastTime)} />
            <Table.Column title="操作" key="action"
              render={(_, record) => (
                <Button type="link" size="small">查看详情</Button>
              )}
            />
          </Table>
        )}

        {warningType === 'multiPerson' && (
          <Table
            dataSource={predictionData.multiPerson.list}
            pagination={{ pageSize: 10 }}
            size="small"
          >
            <Table.Column title="姓名" dataIndex="name" key="name" sorter={(a, b) => a.name.localeCompare(b.name)} />
            <Table.Column title="联系电话" dataIndex="phone" key="phone" />
            <Table.Column title="事件数量" dataIndex="eventCount" key="eventCount" sorter={(a, b) => a.eventCount - b.eventCount}
              render={(count) => <Tag color="volcano">{count} 件</Tag>}
            />
            <Table.Column title="主要类型" dataIndex="mainType" key="mainType"
              filters={[
                { text: '物业投诉', value: '物业投诉' },
                { text: '环境卫生', value: '环境卫生' },
                { text: '噪音扰民', value: '噪音扰民' },
              ]}
              onFilter={(value, record) => record.mainType === value}
            />
            <Table.Column title="最近发生时间" dataIndex="lastTime" key="lastTime" sorter={(a, b) => new Date(a.lastTime) - new Date(b.lastTime)} />
            <Table.Column title="操作" key="action"
              render={(_, record) => (
                <Button type="link" size="small">查看详情</Button>
              )}
            />
          </Table>
        )}

        {warningType === 'multiPersonEvent' && (
          <Table
            dataSource={predictionData.multiPersonEvent.list}
            pagination={{ pageSize: 10 }}
            size="small"
          >
            <Table.Column title="事件名称" dataIndex="event" key="event" sorter={(a, b) => a.event.localeCompare(b.event)} />
            <Table.Column title="涉及人数" dataIndex="personCount" key="personCount" sorter={(a, b) => a.personCount - b.personCount}
              render={(count) => <Tag color="purple">{count} 人</Tag>}
            />
            <Table.Column title="事件描述" dataIndex="description" key="description"
              ellipsis={{ showTitle: false }}
              render={(text) => <span title={text}>{text}</span>}
            />
            <Table.Column title="最近发生时间" dataIndex="lastTime" key="lastTime" sorter={(a, b) => new Date(a.lastTime) - new Date(b.lastTime)} />
            <Table.Column title="操作" key="action"
              render={(_, record) => (
                <Button type="link" size="small">查看详情</Button>
              )}
            />
          </Table>
        )}
      </Drawer>
    </div>
  );
};

export default Dashboard;
