import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Statistic, Progress, Typography, Table, Alert, Divider, Tag, Space, Badge, Select, DatePicker, Spin, Tabs, Button
} from 'antd';
import { Line, Column, Pie, Area } from '@ant-design/plots';
import dayjs from 'dayjs';
import {
  DatabaseOutlined,
  UserOutlined,
  ClusterOutlined,
  PieChartOutlined,
  TrophyOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  AppstoreOutlined,
  FireOutlined,
  ClockCircleOutlined,
  BellOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import api from '../services/api';

const { Title, Paragraph, Text } = Typography;
const { TabPane } = Tabs;

const StatisticsReport = () => {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);
  const [filterOptions, setFilterOptions] = useState({ towns: [], levels: [] });
  const [selectedTowns, setSelectedTowns] = useState([]);
  const [selectedLevels, setSelectedLevels] = useState([]);
  const [dateRange, setDateRange] = useState([dayjs().subtract(11, 'month').startOf('month'), dayjs().endOf('month')]);
  const [monthly, setMonthly] = useState({ monthly_total: [], by_town: [], by_level: [] });
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [topicsData, setTopicsData] = useState([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  
  // 获取统计数据
  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true);
        const response = await api.get('/statistics/report');
        setReportData(response);
        setError(null);
      } catch (err) {
        console.error('获取统计数据失败:', err);
        setError('获取统计数据失败，请稍后重试');
        // 使用默认数据作为fallback
        setReportData({
          report_date: "数据加载失败",
          core_stats: {
            total_events: 0,
            located_events: 0,
            cluster_sets: 0,
            clustered_events: 0,
            total_persons: 0,
            dual_credentials: 0,
            phone_only: 0
          },
          rates: {
            event_coverage_rate: 0,
            cluster_efficiency: 0,
            dual_credentials_rate: 0,
            phone_only_rate: 0
          }
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
    // 载入筛选选项
    (async () => {
      try {
        const opts = await api.get('/filter-options');
        setFilterOptions({ towns: opts.towns || [], levels: opts.levels || [] });
      } catch {}
    })();
  }, []);

  const loadMonthly = async () => {
    try {
      setMonthlyLoading(true);
      const params = {
        start_time: dateRange?.[0]?.startOf('month').format('YYYY-MM-DD'),
        end_time: dateRange?.[1]?.endOf('month').format('YYYY-MM-DD'),
      };
      if (selectedTowns.length) params.towns = selectedTowns.join(',');
      if (selectedLevels.length) params.levels = selectedLevels.join(',');
      const res = await api.get('/statistics/monthly', { params });
      setMonthly(res || { monthly_total: [], by_town: [], by_level: [] });
    } catch (e) {
      console.error('加载月度统计失败:', e);
    } finally {
      setMonthlyLoading(false);
    }
  };

  useEffect(() => {
    loadMonthly();
    if (activeTab === 'topics') {
      loadTopicsData();
    }
  }, [JSON.stringify(selectedTowns), JSON.stringify(selectedLevels), JSON.stringify(dateRange), activeTab]);

  const loadTopicsData = async () => {
    try {
      setTopicsLoading(true);
      const response = await api.get('/topics');
      const topics = response.topics || [];

      // 为每个主题获取统计数据
      const topicsWithStats = await Promise.all(
        topics.slice(0, 10).map(async (topic) => {
          try {
            const params = {
              start_time: dateRange?.[0]?.format('YYYY-MM-DD'),
              end_time: dateRange?.[1]?.format('YYYY-MM-DD')
            };
            const statsRes = await api.get(`/topics/${topic.id}/stats`, { params });
            return {
              ...topic,
              total: statsRes.total || 0,
              trend: statsRes.by_day || []
            };
          } catch (e) {
            return { ...topic, total: 0, trend: [] };
          }
        })
      );

      setTopicsData(topicsWithStats.sort((a, b) => b.total - a.total));
    } catch (e) {
      console.error('加载主题数据失败:', e);
    } finally {
      setTopicsLoading(false);
    }
  };

  // 如果还在加载中，显示加载状态
  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Title level={2}>数据统计报告</Title>
        <div style={{ marginTop: '50px' }}>加载中...</div>
      </div>
    );
  }

  // 月度图表数据
  const monthlyTrendDesc = [...(monthly.monthly_total || [])].sort((a,b)=>dayjs(b.month).valueOf()-dayjs(a.month).valueOf()).slice(0,30);

  // 获取数据
  const coreData = reportData ? {
    totalEvents: reportData.core_stats.total_events,
    locatedEvents: reportData.core_stats.located_events,
    clusterSets: reportData.core_stats.cluster_sets,
    clusteredEvents: reportData.core_stats.clustered_events,
    totalPersons: reportData.core_stats.total_persons,
    dualCredentials: reportData.core_stats.dual_credentials,
    phoneOnly: reportData.core_stats.phone_only
  } : {
    totalEvents: 0,
    locatedEvents: 0,
    clusterSets: 0,
    clusteredEvents: 0,
    totalPersons: 0,
    dualCredentials: 0,
    phoneOnly: 0
  };

  // 使用后端计算的比例
  const rates = reportData ? reportData.rates : {
    event_coverage_rate: 0,
    cluster_efficiency: 0,
    dual_credentials_rate: 0,
    phone_only_rate: 0
  };
  
  const eventCoverageRate = rates.event_coverage_rate.toFixed(2);
  const dualCredentialsRate = rates.dual_credentials_rate.toFixed(1);
  const phoneOnlyRate = rates.phone_only_rate.toFixed(1);
  const clusterCoverageRate = ((coreData.clusteredEvents / coreData.totalEvents) * 100).toFixed(1);
  const avgClusterSize = rates.cluster_efficiency.toFixed(1);

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

  // 技术指标数据 - 动态计算状态
  const getIndicatorStatus = (current, target, isPercentage = true) => {
    const currentVal = isPercentage ? parseFloat(current) : current;
    const targetVal = isPercentage ? parseFloat(target) : target;
    
    if (currentVal >= targetVal) return { status: 'success', color: '#52c41a' };
    if (currentVal >= targetVal * 0.8) return { status: 'warning', color: '#fa8c16' };
    return { status: 'error', color: '#f5222d' };
  };

  const techIndicators = [
    {
      key: '1',
      indicator: '事件覆盖率',
      current: eventCoverageRate + '%',
      target: '95%',
      direction: '提升人员信息采集',
      status: getIndicatorStatus(eventCoverageRate, 95),
      description: '已定位事件占总事件的比例'
    },
    {
      key: '2',
      indicator: '双证齐全率',
      current: dualCredentialsRate + '%',
      target: '70%',
      direction: '身份信息补全',
      status: getIndicatorStatus(dualCredentialsRate, 70),
      description: '同时拥有手机号和身份证的人员比例'
    },
    {
      key: '3',
      indicator: '聚类效率',
      current: avgClusterSize,
      target: '3.5',
      direction: '算法优化',
      status: getIndicatorStatus(parseFloat(avgClusterSize), 3.5, false),
      description: '平均每个聚类包含的事件数量'
    },
    {
      key: '4',
      indicator: '聚类覆盖率',
      current: clusterCoverageRate + '%',
      target: '35%',
      direction: '关联性挖掘',
      status: getIndicatorStatus(clusterCoverageRate, 35),
      description: '被聚类的事件占总事件的比例'
    }
  ];

  const techColumns = [
    {
      title: '指标',
      dataIndex: 'indicator',
      key: 'indicator',
      width: '25%',
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>{record.description}</Text>
        </div>
      )
    },
    {
      title: '当前值',
      dataIndex: 'current',
      key: 'current',
      align: 'center',
      width: '20%',
      render: (text, record) => (
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            fontSize: '18px', 
            fontWeight: 'bold', 
            color: record.status.color 
          }}>
            {text}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.status.status === 'success' ? '✓ 达标' : 
             record.status.status === 'warning' ? '⚠ 接近' : '✗ 待改进'}
          </div>
        </div>
      )
    },
    {
      title: '目标值',
      dataIndex: 'target',
      key: 'target',
      align: 'center',
      width: '20%',
      render: (text) => (
        <div style={{ 
          fontSize: '16px', 
          fontWeight: 'bold', 
          color: '#52c41a',
          textAlign: 'center'
        }}>
          {text}
        </div>
      )
    },
    {
      title: '改进方向',
      dataIndex: 'direction',
      key: 'direction',
      width: '35%',
      render: (text, record) => (
        <div>
          <Tag color={record.status.status === 'success' ? 'green' : 'orange'}>
            {text}
          </Tag>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            {record.status.status === 'success' ? '已达标，持续优化' : 
             record.status.status === 'warning' ? '接近目标，加强改进' : '需要重点关注'}
          </div>
        </div>
      )
    }
  ];

  // 计算关键指标
  const calculateTrends = () => {
    if (!monthly.monthly_total || monthly.monthly_total.length < 2) return {};

    const sortedData = [...monthly.monthly_total].sort((a, b) => dayjs(a.month).valueOf() - dayjs(b.month).valueOf());
    const current = sortedData[sortedData.length - 1]?.count || 0;
    const previous = sortedData[sortedData.length - 2]?.count || 0;
    const changeRate = previous === 0 ? 0 : ((current - previous) / previous * 100);

    return {
      currentMonth: current,
      previousMonth: previous,
      changeRate: changeRate.toFixed(1),
      isIncrease: changeRate > 0
    };
  };

  const trends = calculateTrends();

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      {/* 页面头部 */}
      <Card style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} style={{ color: '#1890ff', marginBottom: '8px' }}>
              <PieChartOutlined style={{ marginRight: '12px' }} />
              社会治理事件统计分析
            </Title>
            <Text type="secondary" style={{ fontSize: '14px' }}>
              数据范围：{dateRange?.[0]?.format('YYYY年MM月')} - {dateRange?.[1]?.format('YYYY年MM月')}
              | 生成时间: {reportData ? reportData.report_date : '加载中...'}
            </Text>
          </div>
          <div>
            <Space>
              <DatePicker.RangePicker
                picker="month"
                value={dateRange}
                onChange={(v) => setDateRange(v)}
                allowClear={false}
                style={{ marginRight: 8 }}
              />
              <Select
                mode="multiple"
                placeholder="筛选镇街"
                value={selectedTowns}
                onChange={setSelectedTowns}
                style={{ minWidth: 150 }}
                allowClear
                options={(filterOptions.towns || []).map(t => ({ label: t, value: t }))}
              />
              <Select
                mode="multiple"
                placeholder="筛选级别"
                value={selectedLevels}
                onChange={setSelectedLevels}
                style={{ minWidth: 120 }}
                allowClear
                options={(filterOptions.levels || []).map(t => ({ label: t, value: t }))}
              />
              <Button icon={<ReloadOutlined />} onClick={() => window.location.reload()}>刷新</Button>
            </Space>
          </div>
        </div>
        {error && (
          <div style={{ marginTop: '12px' }}>
            <Alert message={error} type="warning" showIcon />
          </div>
        )}
      </Card>

      {/* 多标签页内容 */}
      <Tabs activeKey={activeTab} onChange={setActiveTab} style={{ background: 'white', padding: '16px', borderRadius: '8px' }}>
        {/* 总览仪表板 */}
        <TabPane tab={<span><DatabaseOutlined />总览仪表板</span>} key="overview">
          <Spin spinning={monthlyLoading}>
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
                    title="本月事件"
                    value={trends.currentMonth}
                    prefix={<CalendarOutlined />}
                    valueStyle={{ color: trends.isIncrease ? '#f5222d' : '#52c41a' }}
                    suffix={
                      <span>
                        条
                        <Tag color={trends.isIncrease ? 'red' : 'green'}>
                          {trends.isIncrease ? '↑' : '↓'} {Math.abs(trends.changeRate)}%
                        </Tag>
                      </span>
                    }
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
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="聚类集合"
                    value={coreData.clusterSets}
                    prefix={<ClusterOutlined />}
                    valueStyle={{ color: '#fa8c16' }}
                    suffix="个"
                  />
                </Card>
              </Col>
            </Row>

            {/* 月度趋势图 */}
            <Card title="📈 事件趋势分析" style={{ marginBottom: 24 }}>
              <Area
                data={monthlyTrendDesc}
                xField="month"
                yField="count"
                height={300}
                smooth
                point={{ size: 4 }}
                color="#1890ff"
                areaStyle={{ fill: 'l(270) 0:#ffffff 0.5:#7ec2f3 1:#1890ff' }}
                meta={{
                  month: { alias: '月份' },
                  count: { alias: '事件数量' }
                }}
                annotations={[
                  {
                    type: 'text',
                    position: ['95%', '10%'],
                    content: `环比${trends.isIncrease ? '上升' : '下降'} ${Math.abs(trends.changeRate)}%`,
                    style: {
                      fill: trends.isIncrease ? '#f5222d' : '#52c41a',
                      fontSize: 12,
                      fontWeight: 'bold'
                    }
                  }
                ]}
              />
            </Card>

            {/* 分布分析 */}
            <Row gutter={24} style={{ marginBottom: 24 }}>
              <Col xs={24} lg={12}>
                <Card title="🗺️ 镇街分布情况">
                  <Column
                    data={[...(monthly.by_town || [])].slice(-6)}
                    isStack
                    xField="month"
                    yField="count"
                    seriesField="town"
                    height={280}
                    meta={{ month: { alias: '月份' }, count: { alias: '数量' }, town: { alias: '镇街' } }}
                  />
                </Card>
              </Col>
              <Col xs={24} lg={12}>
                <Card title="⚡ 事件级别分布">
                  <Column
                    data={[...(monthly.by_level || [])].slice(-6)}
                    isStack
                    xField="month"
                    yField="count"
                    seriesField="level"
                    height={280}
                    meta={{ month: { alias: '月份' }, count: { alias: '数量' }, level: { alias: '级别' } }}
                  />
                </Card>
              </Col>
            </Row>
          </Spin>
        </TabPane>

        {/* 区域分析 */}
        <TabPane tab={<span><EnvironmentOutlined />区域分析</span>} key="region">
          <Spin spinning={monthlyLoading}>
            {(() => {
              // 计算镇街聚合数据，避免重复计算
              const townData = (monthly.by_town || []).reduce((acc, item) => {
                const existing = acc.find(x => x.town === item.town);
                if (existing) {
                  existing.count += item.count;
                } else {
                  acc.push({ town: item.town, count: item.count });
                }
                return acc;
              }, []).sort((a, b) => b.count - a.count);

              const maxCount = townData.length > 0 ? Math.max(...townData.map(x => x.count)) : 0;
              const topTownData = townData.slice(0, 8);
              const topTotal = topTownData.reduce((sum, item) => sum + (item.count || 0), 0) || 1;

              return (
                <Row gutter={24}>
                  <Col xs={24} lg={16}>
                    <Card title="镇街事件分布" style={{ marginBottom: 24 }}>
                      <Column
                        data={townData}
                        xField="town"
                        yField="count"
                        height={350}
                        meta={{ town: { alias: '镇街' }, count: { alias: '事件总数' } }}
                        color={(datum) => {
                          if (maxCount === 0) return '#52c41a';
                          const ratio = datum.count / maxCount;
                          if (ratio > 0.8) return '#f5222d';
                          if (ratio > 0.6) return '#fa8c16';
                          if (ratio > 0.4) return '#fadb14';
                          return '#52c41a';
                        }}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} lg={8}>
                    <Card title="区域事件占比" style={{ marginBottom: 24 }}>
                      <Pie
                        data={topTownData}
                        angleField="count"
                        colorField="town"
                        radius={0.8}
                        height={300}
                        label={{
                          content: (datum) => {
                            const value = typeof datum?.count === 'number' ? datum.count : 0;
                            let percent = 0;
                            if (typeof datum?.percent === 'number') {
                              percent = datum.percent * 100;
                            } else if (topTotal > 0) {
                              percent = (value / topTotal) * 100;
                            }
                            const label = datum?.town || datum?.color || '';
                            return `${label}：${percent.toFixed(1)}%`;
                          },
                          layout: [
                            { type: 'limit-in-shape' },
                            { type: 'adjust-color' }
                          ]
                        }}
                        meta={{
                          town: { alias: '镇街' },
                          count: { alias: '事件数量' }
                        }}
                      />
                    </Card>
                  </Col>
                </Row>
              );
            })()}
          </Spin>
        </TabPane>

        {/* 事件主题分析 */}
        <TabPane tab={<span><FireOutlined />主题热点</span>} key="topics">
          <Spin spinning={topicsLoading}>
            <Row gutter={24}>
              <Col xs={24} lg={16}>
                <Card title="主题事件统计" style={{ marginBottom: 24 }}>
                  <Column
                    data={topicsData.slice(0, 10)}
                    xField="name"
                    yField="total"
                    height={350}
                    meta={{ name: { alias: '主题' }, total: { alias: '事件数量' } }}
                    color="#1890ff"
                    label={{
                      position: 'top',
                      style: {
                        fill: '#000',
                        fontSize: 12
                      }
                    }}
                  />
                </Card>
              </Col>
              <Col xs={24} lg={8}>
                <Card title="主题概览" style={{ marginBottom: 24 }}>
                  <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                    {topicsData.map((topic, index) => (
                      <div key={topic.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 0',
                        borderBottom: index < topicsData.length - 1 ? '1px solid #f0f0f0' : 'none'
                      }}>
                        <div>
                          <Text strong>{topic.name}</Text>
                          <br/>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {topic.enabled ? '启用中' : '已禁用'}
                          </Text>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1890ff' }}>
                            {topic.total}
                          </Text>
                          <br/>
                          <Text type="secondary" style={{ fontSize: 12 }}>事件</Text>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </Col>
            </Row>
          </Spin>
        </TabPane>

        {/* 处置效率分析 */}
        <TabPane tab={<span><ClockCircleOutlined />处置效率</span>} key="efficiency">
          <Card title="📊 数据质量分析" style={{ marginBottom: '24px' }}>
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

          {/* 技术指标 */}
          <Card title="📋 技术指标" style={{ marginBottom: '24px' }}>
            <Table
              columns={techColumns}
              dataSource={techIndicators}
              pagination={false}
              size="middle"
            />
          </Card>
        </TabPane>

        {/* 决策分析 */}
        <TabPane tab={<span><BellOutlined />决策支持</span>} key="decision">
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
                {/* 动态生成的建议 */}
                {parseFloat(eventCoverageRate) < 95 && (
                  <div style={{ marginBottom: '16px' }}>
                    <Badge status={parseFloat(eventCoverageRate) > 85 ? "warning" : "error"} />
                    <Text strong style={{ marginLeft: '8px' }}>提升人员定位率</Text>
                    <ul style={{ marginTop: '8px', paddingLeft: '24px' }}>
                      <li>当前覆盖率{eventCoverageRate}%，还有{(coreData.totalEvents - coreData.locatedEvents).toLocaleString()}个事件未定位到人员</li>
                      <li>目标：提升至95%以上，缺口{(coreData.totalEvents * 0.95 - coreData.locatedEvents).toFixed(0)}个事件</li>
                      <li>建议：加强事件记录中联系方式的采集和验证</li>
                    </ul>
                  </div>
                )}

                {parseFloat(dualCredentialsRate) < 70 && (
                  <div style={{ marginBottom: '16px' }}>
                    <Badge status={parseFloat(dualCredentialsRate) > 50 ? "warning" : "error"} />
                    <Text strong style={{ marginLeft: '8px' }}>身份信息补全</Text>
                    <ul style={{ marginTop: '8px', paddingLeft: '24px' }}>
                      <li>当前{coreData.phoneOnly.toLocaleString()}人仅有手机号，占{phoneOnlyRate}%</li>
                      <li>目标：双证齐全率达到70%，需补全约{(coreData.totalPersons * 0.7 - coreData.dualCredentials).toFixed(0)}人身份信息</li>
                      <li>建议：通过公安系统核验补充身份证信息</li>
                    </ul>
                  </div>
                )}
              </Col>
              <Col xs={24} md={12}>
                {parseFloat(avgClusterSize) < 3.5 && (
                  <div style={{ marginBottom: '16px' }}>
                    <Badge status={parseFloat(avgClusterSize) > 2.5 ? "warning" : "error"} />
                    <Text strong style={{ marginLeft: '8px' }}>深化聚类分析</Text>
                    <ul style={{ marginTop: '8px', paddingLeft: '24px' }}>
                      <li>当前平均聚类大小{avgClusterSize}，聚类效率有待提升</li>
                      <li>已有{coreData.clusterSets.toLocaleString()}个事件簇，包含{coreData.clusteredEvents.toLocaleString()}个事件</li>
                      <li>建议：优化聚类算法参数，提高关联识别准确率</li>
                    </ul>
                  </div>
                )}

                <div style={{ marginBottom: '16px' }}>
                  <Badge status="processing" />
                  <Text strong style={{ marginLeft: '8px' }}>预警机制建设</Text>
                  <ul style={{ marginTop: '8px', paddingLeft: '24px' }}>
                    <li>基于{coreData.clusterSets.toLocaleString()}个聚类事件识别重复报警</li>
                    <li>对涉及{coreData.totalPersons.toLocaleString()}人的事件建立档案</li>
                    <li>建议：设置多次报警阈值预警，重点关注高频人员</li>
                  </ul>
                </div>

                {parseFloat(eventCoverageRate) >= 95 && parseFloat(dualCredentialsRate) >= 70 && (
                  <div style={{ marginBottom: '16px' }}>
                    <Badge status="success" />
                    <Text strong style={{ marginLeft: '8px' }}>数据质量优秀</Text>
                    <ul style={{ marginTop: '8px', paddingLeft: '24px' }}>
                      <li>事件覆盖率和身份信息完整度均达标</li>
                      <li>建议：保持现有数据采集标准，关注数据实时性</li>
                    </ul>
                  </div>
                )}
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
        </TabPane>
      </Tabs>

      {/* 报告信息 */}
      <Card style={{ marginTop: '24px', textAlign: 'center', background: '#fafafa' }}>
        <Divider />
        <Space direction="vertical" size="small">
          <Text><strong>报告生成</strong>: 海曙区社会治理中心事件分析系统</Text>
          <Text><strong>统计日期</strong>: {reportData ? reportData.report_date : '加载中...'}</Text>
          <Text style={{ fontSize: '12px', color: '#999' }}>©2025 杭州量之技术支持</Text>
        </Space>
      </Card>
    </div>
  );
};

export default StatisticsReport; 
