import React from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Progress, 
  Typography, 
  Table, 
  Alert, 
  Divider,
  Tag,
  Space,
  Badge
} from 'antd';
import { 
  DatabaseOutlined, 
  UserOutlined, 
  ClusterOutlined, 
  PieChartOutlined,
  TrophyOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

const StatisticsReport = () => {
  
  // 核心数据
  const coreData = {
    totalEvents: 5799,
    locatedEvents: 4643,
    clusterSets: 679,
    clusteredEvents: 1503,
    totalPersons: 5068,
    dualCredentials: 2357,
    phoneOnly: 2711
  };

  // 计算比例
  const eventCoverageRate = ((coreData.locatedEvents / coreData.totalEvents) * 100).toFixed(2);
  const dualCredentialsRate = ((coreData.dualCredentials / coreData.totalPersons) * 100).toFixed(1);
  const phoneOnlyRate = ((coreData.phoneOnly / coreData.totalPersons) * 100).toFixed(1);
  const clusterCoverageRate = ((coreData.clusteredEvents / coreData.totalEvents) * 100).toFixed(1);
  const avgClusterSize = (coreData.clusteredEvents / coreData.clusterSets).toFixed(1);

  // 事件数据表格
  const eventDataColumns = [
    {
      title: '数据项',
      dataIndex: 'item',
      key: 'item',
      width: 200,
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: '数量',
      dataIndex: 'count',
      key: 'count',
      width: 120,
      align: 'center',
      render: (text) => <Text style={{ fontSize: '16px', color: '#1890ff' }}>{text}</Text>
    },
    {
      title: '说明',
      dataIndex: 'description',
      key: 'description',
    }
  ];

  const eventData = [
    {
      key: '1',
      item: '总事件数',
      count: '5,799',
      description: '原始数据中的所有冲突事件记录'
    },
    {
      key: '2',
      item: '可定位人员的事件',
      count: '4,643',
      description: '经过事件抽取后中能够定位到电话或身份证号码的事件'
    },
    {
      key: '3',
      item: '聚类集合数',
      count: '679',
      description: '通过算法对事件进行聚类，一共获得 679 个集合'
    },
    {
      key: '4',
      item: '聚类包含的事件总数',
      count: '1,503',
      description: '所有聚类事件包含的原始事件数量'
    }
  ];

  // 人员数据表格
  const personDataColumns = [
    {
      title: '人员类型',
      dataIndex: 'type',
      key: 'type',
      width: 150,
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: '数量',
      dataIndex: 'count',
      key: 'count',
      width: 120,
      align: 'center',
      render: (text) => <Text style={{ fontSize: '16px', color: '#1890ff' }}>{text}</Text>
    },
    {
      title: '占比',
      dataIndex: 'percentage',
      key: 'percentage',
      width: 100,
      align: 'center',
      render: (text) => <Tag color="blue">{text}</Tag>
    },
    {
      title: '说明',
      dataIndex: 'description',
      key: 'description',
    }
  ];

  const personData = [
    {
      key: '1',
      type: '总涉及人员',
      count: '5,068',
      percentage: '100%',
      description: '通过抽取后的信息去重'
    },
    {
      key: '2',
      type: '双证齐全',
      count: '2,357',
      percentage: '46.5%',
      description: '既有手机号又有身份证的人员'
    },
    {
      key: '3',
      type: '仅有手机号',
      count: '2,711',
      percentage: '53.5%',
      description: '只有手机号码的人员'
    }
  ];

  // 技术指标数据
  const techIndicators = [
    {
      key: '1',
      indicator: '事件覆盖率',
      current: eventCoverageRate + '%',
      target: '80%',
      direction: '提升人员信息采集'
    },
    {
      key: '2',
      indicator: '双证齐全率',
      current: dualCredentialsRate + '%',
      target: '60%',
      direction: '身份信息补全'
    },
    {
      key: '3',
      indicator: '聚类覆盖率',
      current: clusterCoverageRate + '%',
      target: '30%',
      direction: '算法优化'
    },
    {
      key: '4',
      indicator: '平均聚类大小',
      current: avgClusterSize,
      target: '3.0',
      direction: '关联性挖掘'
    }
  ];

  const techColumns = [
    {
      title: '指标',
      dataIndex: 'indicator',
      key: 'indicator',
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: '当前值',
      dataIndex: 'current',
      key: 'current',
      align: 'center',
      render: (text) => <Badge count={text} style={{ backgroundColor: '#1890ff' }} />
    },
    {
      title: '目标值',
      dataIndex: 'target',
      key: 'target',
      align: 'center',
      render: (text) => <Badge count={text} style={{ backgroundColor: '#52c41a' }} />
    },
    {
      title: '改进方向',
      dataIndex: 'direction',
      key: 'direction',
    }
  ];

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      {/* 页面头部 */}
      <Card style={{ marginBottom: '24px', textAlign: 'center' }}>
        <Title level={1} style={{ color: '#1890ff', marginBottom: '8px' }}>
          <PieChartOutlined style={{ marginRight: '12px' }} />
          海曙区事件分析系统 - 数据统计报告
        </Title>
        <Text type="secondary" style={{ fontSize: '16px' }}>
          生成时间: 2025年7月1日
        </Text>
      </Card>

      {/* 核心指标卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总事件数"
              value={coreData.totalEvents}
              prefix={<DatabaseOutlined />}
              valueStyle={{ color: '#1890ff' }}
              suffix="条"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="可定位事件"
              value={coreData.locatedEvents}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#52c41a' }}
              suffix="条"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="聚类集合数"
              value={coreData.clusterSets}
              prefix={<ClusterOutlined />}
              valueStyle={{ color: '#fa8c16' }}
              suffix="个"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="涉及人员"
              value={coreData.totalPersons}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#722ed1' }}
              suffix="人"
            />
          </Card>
        </Col>
      </Row>

      {/* 数据质量分析 */}
      <Card title="📈 数据质量分析" style={{ marginBottom: '24px' }}>
        <Row gutter={24}>
          <Col xs={24} md={12}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <Text strong style={{ fontSize: '16px' }}>事件覆盖率</Text>
              <Progress
                type="circle"
                percent={parseFloat(eventCoverageRate)}
                format={() => `${eventCoverageRate}%`}
                style={{ display: 'block', margin: '16px 0' }}
                strokeColor="#1890ff"
              />
              <Text type="secondary">
                约三分之二的事件能够定位到具体人员信息
              </Text>
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <Text strong style={{ fontSize: '16px' }}>聚类效率</Text>
              <Progress
                type="circle"
                percent={parseFloat(clusterCoverageRate)}
                format={() => `${clusterCoverageRate}%`}
                style={{ display: 'block', margin: '16px 0' }}
                strokeColor="#52c41a"
              />
              <Text type="secondary">
                平均每个聚类包含 {avgClusterSize} 个相关事件
              </Text>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 核心数据统计 */}
      <Row gutter={24} style={{ marginBottom: '24px' }}>
        <Col xs={24} lg={12}>
          <Card title="📊 事件数据概览">
            <Table
              columns={eventDataColumns}
              dataSource={eventData}
              pagination={false}
              size="middle"
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="👥 人员数据统计">
            <Table
              columns={personDataColumns}
              dataSource={personData}
              pagination={false}
              size="middle"
            />
          </Card>
        </Col>
      </Row>

      {/* 关键发现 */}
      <Card title="🔍 关键发现" style={{ marginBottom: '24px' }}>
        <Row gutter={24}>
          <Col xs={24} md={8}>
            <Alert
              message="数据完整性"
              description={
                <div>
                  <div style={{ marginBottom: '8px' }}>
                    <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '4px' }} />
                    <Text strong>优秀</Text>: 人员身份信息完整度达到100%
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '4px' }} />
                    <Text strong>良好</Text>: 事件人员定位覆盖率达到{eventCoverageRate}%
                  </div>
                  <div>
                    <WarningOutlined style={{ color: '#fa8c16', marginRight: '4px' }} />
                    <Text strong>待改进</Text>: 仍有{(100 - parseFloat(eventCoverageRate)).toFixed(2)}%的事件无法定位到具体人员
                  </div>
                </div>
              }
              type="info"
              style={{ marginBottom: '16px' }}
            />
          </Col>
          <Col xs={24} md={8}>
            <Alert
              message="人员身份特征"
              description={
                <div>
                  <div style={{ marginBottom: '8px' }}>
                    <Text strong>手机号为主要标识</Text>: {phoneOnlyRate}%的人员仅通过手机号识别
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <Text strong>双重验证</Text>: {dualCredentialsRate}%的人员具备双重身份验证信息
                  </div>
                  <div>
                    <Text strong>身份证缺失</Text>: 无纯身份证记录，说明手机号是主要追踪方式
                  </div>
                </div>
              }
              type="success"
              style={{ marginBottom: '16px' }}
            />
          </Col>
          <Col xs={24} md={8}>
            <Alert
              message="事件关联性"
              description={
                <div>
                  <div style={{ marginBottom: '8px' }}>
                    <Text strong>低聚合度</Text>: 平均每个聚类仅包含{avgClusterSize}个事件
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <Text strong>潜在价值</Text>: {coreData.clusterSets}个聚类可能代表{coreData.clusterSets}个重复或相关的事件模式
                  </div>
                  <div>
                    <Text strong>分析空间</Text>: {(100 - parseFloat(clusterCoverageRate)).toFixed(1)}%的事件为独立事件，可能存在未发现的关联
                  </div>
                </div>
              }
              type="warning"
              style={{ marginBottom: '16px' }}
            />
          </Col>
        </Row>
      </Card>

      {/* 业务洞察 */}
      <Card title="💡 业务洞察" style={{ marginBottom: '24px' }}>
        <Title level={4}>数据驱动的管理建议</Title>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <div style={{ marginBottom: '16px' }}>
              <Badge status="processing" />
              <Text strong style={{ marginLeft: '8px' }}>提升人员定位率</Text>
              <ul style={{ marginTop: '8px', paddingLeft: '24px' }}>
                <li>加强事件记录中人员信息的采集</li>
                <li>目标：将{eventCoverageRate}%的覆盖率提升至80%以上</li>
              </ul>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <Badge status="processing" />
              <Text strong style={{ marginLeft: '8px' }}>深化聚类分析</Text>
              <ul style={{ marginTop: '8px', paddingLeft: '24px' }}>
                <li>优化聚类算法，发现更多潜在关联</li>
                <li>分析独立事件中的隐藏模式</li>
              </ul>
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div style={{ marginBottom: '16px' }}>
              <Badge status="processing" />
              <Text strong style={{ marginLeft: '8px' }}>身份信息补全</Text>
              <ul style={{ marginTop: '8px', paddingLeft: '24px' }}>
                <li>对{coreData.phoneOnly.toLocaleString()}个仅有手机号的人员补充身份证信息</li>
                <li>提升双证齐全率至60%以上</li>
              </ul>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <Badge status="processing" />
              <Text strong style={{ marginLeft: '8px' }}>预警机制建设</Text>
              <ul style={{ marginTop: '8px', paddingLeft: '24px' }}>
                <li>基于{coreData.clusterSets}个聚类事件建立预警模型</li>
                <li>识别高风险人员和区域</li>
              </ul>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 技术指标 */}
      <Card title="📋 技术指标" style={{ marginBottom: '24px' }}>
        <Table
          columns={techColumns}
          dataSource={techIndicators}
          pagination={false}
          size="middle"
        />
      </Card>

      {/* 报告信息 */}
      <Card>
        <div style={{ textAlign: 'center', color: '#666' }}>
          <Divider />
          <Space direction="vertical" size="small">
            <Text><strong>报告生成</strong>: 海曙区事件分析系统</Text>
            <Text><strong>数据源</strong>: raw_conflict.csv, info_merge.csv, conflict_event.csv, phone_master_index.csv</Text>
            <Text><strong>统计日期</strong>: 2025年7月1日</Text>
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default StatisticsReport; 