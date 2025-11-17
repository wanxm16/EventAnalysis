import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, DatePicker, Space, Table, Tag, Typography, message, Spin, Tabs } from 'antd';
import { Line } from '@ant-design/plots';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const TopicStats = () => {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState([]);
  const [view, setView] = useState('day'); // 'day' | 'month'

  const loadStats = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateRange?.length === 2) {
        params.set('start_time', dateRange[0].format('YYYY-MM-DD'));
        params.set('end_time', dateRange[1].format('YYYY-MM-DD'));
      }
      const res = await fetch(`http://localhost:8000/api/topics/${topicId}/stats?${params.toString()}`);
      if (!res.ok) throw new Error('统计加载失败');
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error(e);
      message.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStats(); }, [topicId]);
  useEffect(() => { loadStats(); }, [dateRange]);

  const handleViewEvents = (date) => {
    if (view === 'day') {
      // 对于日期视图，导航到主题详情页面并设置日期筛选
      const startDate = dayjs(date).format('YYYY-MM-DD');
      const endDate = dayjs(date).format('YYYY-MM-DD');
      navigate(`/topics/${topicId}?start_time=${startDate}&end_time=${endDate}`);
    } else {
      // 对于月份视图，设置整月的筛选范围
      const month = dayjs(date);
      const startDate = month.startOf('month').format('YYYY-MM-DD');
      const endDate = month.endOf('month').format('YYYY-MM-DD');
      navigate(`/topics/${topicId}?start_time=${startDate}&end_time=${endDate}`);
    }
  };

  const columns = [
    { title: view === 'day' ? '日期' : '月份', dataIndex: 'date', key: 'date', width: 140 },
    { title: '数量', dataIndex: 'count', key: 'count', width: 100 },
    { title: view === 'day' ? '7日均值' : '3月均值', dataIndex: view === 'day' ? 'ma7' : 'ma3', key: 'ma', width: 120, render: v => (v !== null && v !== undefined) ? (typeof v === 'number' ? v.toFixed(1) : v) : '-' },
    { title: '是否异动', dataIndex: 'anomaly', key: 'anomaly', width: 120, render: v => v ? <Tag color="red">异动</Tag> : <Tag>正常</Tag> },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          onClick={() => handleViewEvents(record.date)}
        >
          查看事件
        </Button>
      )
    },
  ];

  // 构造图表数据：按时间倒序取前30个点
  const buildChartData = () => {
    const data = view === 'day' ? (stats?.by_day || []) : getMonthlyData();
    const sortedDesc = [...data].sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());
    return sortedDesc.slice(0, 30);
  };

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

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>主题统计</Title>
        <Space>
          <Button onClick={() => navigate(`/topics/${topicId}`)}>返回详情</Button>
          <Button type="primary" onClick={() => navigate('/topics')}>返回列表</Button>
        </Space>
      </div>

      <Card title="统计趋势" extra={<RangePicker value={dateRange} onChange={setDateRange} allowClear />}> 
        <div style={{ marginBottom: 12 }}>总事件数：{stats?.total || 0}</div>
        <Tabs activeKey={view} onChange={setView} items={[
          { key: 'day', label: '按日统计' },
          { key: 'month', label: '按月统计' },
        ]} />
        {/* 折线图：倒序取30个点 */}
        <div style={{ marginBottom: 16 }}>
          <Spin spinning={loading}>
            <Line
              data={buildChartData()}
              xField="date"
              yField="count"
              height={260}
              xAxis={{ title: null, label: { autoRotate: true } }}
              yAxis={{ title: null, min: 0 }}
              smooth
              point={{ size: 3 }}
              meta={{
                date: { alias: view === 'day' ? '日期' : '月份' },
                count: { alias: '数量' },
              }}
              tooltip={{
                showMarkers: false,
                formatter: (datum) => ({ name: '数量', value: Number(datum.count ?? 0) }),
              }}
            />
          </Spin>
        </div>
        {/* 表格：日期/月份倒序 */}
        <Table
          loading={loading}
          dataSource={(view === 'day' ? (stats?.by_day || []) : getMonthlyData()).sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf())}
          columns={columns}
          rowKey="date"
          pagination={{ pageSize: 20 }}
          size="small"
        />
      </Card>
    </div>
  );
};

export default TopicStats;
