import React, { useEffect, useState, useMemo } from 'react';
import { Button, Card, Modal, Space, Tag, Typography, message, Empty, Row, Col, Tooltip, Input } from 'antd';
import { PlusOutlined, EyeOutlined, DeleteOutlined, EditOutlined, SettingOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { Line } from '@ant-design/plots';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Search } = Input;

const TopicList = () => {
  const [loading, setLoading] = useState(false);
  const [topics, setTopics] = useState([]);
  const [searchText, setSearchText] = useState('');
  const navigate = useNavigate();

  // Mock 趋势数据生成函数
  const generateMockTrend = (topicId) => {
    const trends = {
      1: { percent: 31, data: [12, 15, 14, 18, 16, 20, 18, 22, 19, 24, 21, 26] },
      2: { percent: -12, data: [25, 28, 26, 24, 22, 26, 23, 21, 19, 23, 20, 22] },
      3: { percent: 0, data: [] },
      4: { percent: -31, data: [30, 28, 32, 29, 27, 30, 28, 26, 24, 27, 25, 23] },
    };

    const defaultTrend = topicId % 2 === 0
      ? { percent: Math.floor(Math.random() * 40) - 20, data: Array.from({ length: 12 }, () => Math.floor(Math.random() * 20) + 5) }
      : { percent: Math.floor(Math.random() * 60) - 30, data: Array.from({ length: 12 }, () => Math.floor(Math.random() * 25) + 5) };

    return trends[topicId] || defaultTrend;
  };

  // Mock 统计数据生成函数
  const generateMockStats = (trendData) => {
    if (trendData.length === 0) {
      return { min: 0, avg: 0, max: 0 };
    }
    const min = Math.min(...trendData);
    const max = Math.max(...trendData);
    const avg = Math.round(trendData.reduce((a, b) => a + b, 0) / trendData.length);
    return { min, avg, max };
  };

  const loadTopics = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:8000/api/topics');
      if (!res.ok) throw new Error('加载主题失败');
      const data = await res.json();
      setTopics(data.topics || []);
    } catch (e) {
      console.error(e);
      message.error('加载主题失败: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteTopic = async (topicId, name) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定删除主题「${name}」吗？该操作不可恢复。`,
      onOk: async () => {
        try {
          const res = await fetch(`http://localhost:8000/api/topics/${topicId}`, { method: 'DELETE' });
          if (!res.ok) throw new Error('删除主题失败');
          message.success('主题已删除');
          setTopics(prev => prev.filter(t => t.id !== topicId));
        } catch (e) {
          console.error(e);
          message.error('删除主题失败: ' + e.message);
        }
      }
    });
  };

  useEffect(() => { loadTopics(); }, []);

  // 搜索过滤主题
  const filteredTopics = useMemo(() => {
    if (!searchText.trim()) return topics;

    const searchLower = searchText.toLowerCase().trim();

    return topics.filter(topic => {
      // 搜索主题名称
      if (topic.name?.toLowerCase().includes(searchLower)) return true;

      // 搜索描述
      if (topic.description?.toLowerCase().includes(searchLower)) return true;

      // 搜索包含关键词
      if (topic.include_keywords) {
        if (typeof topic.include_keywords === 'object' && !Array.isArray(topic.include_keywords)) {
          const { description = [], result = [] } = topic.include_keywords;
          const allIncludeKeywords = [...description, ...result];
          if (allIncludeKeywords.some(kw => kw.toLowerCase().includes(searchLower))) return true;
        } else if (Array.isArray(topic.include_keywords)) {
          if (topic.include_keywords.some(kw => kw.toLowerCase().includes(searchLower))) return true;
        }
      }

      // 搜索排除关键词
      if (topic.exclude_keywords) {
        if (typeof topic.exclude_keywords === 'object' && !Array.isArray(topic.exclude_keywords)) {
          const { description = [], result = [] } = topic.exclude_keywords;
          const allExcludeKeywords = [...description, ...result];
          if (allExcludeKeywords.some(kw => kw.toLowerCase().includes(searchLower))) return true;
        } else if (Array.isArray(topic.exclude_keywords)) {
          if (topic.exclude_keywords.some(kw => kw.toLowerCase().includes(searchLower))) return true;
        }
      }

      // 搜索精细筛选
      if (topic.fine_filters?.some(filter => filter.toLowerCase().includes(searchLower))) return true;

      return false;
    });
  }, [topics, searchText]);

  // 渲染关键词标签的辅助函数
  const renderKeywordTags = (keywords, label, color) => {
    if (!keywords) return null;

    if (typeof keywords === 'object' && !Array.isArray(keywords)) {
      const { description = [], result = [] } = keywords;
      const allKeywords = [];

      if (description.length > 0) {
        allKeywords.push(...description);
      }
      if (result.length > 0) {
        allKeywords.push(...result);
      }

      if (allKeywords.length > 0) {
        return allKeywords.slice(0, 3).map((kw, idx) => (
          <Tag
            key={`${label}-${idx}`}
            color={color}
            style={{
              marginRight: 4,
              marginBottom: 4,
              border: `1px solid ${color === 'blue' ? '#1890ff' : color === 'red' ? '#ff4d4f' : '#faad14'}`,
              background: 'white'
            }}
          >
            {label}: {kw}
          </Tag>
        ));
      }
      return null;
    }

    if (Array.isArray(keywords) && keywords.length > 0) {
      return keywords.slice(0, 3).map((kw, idx) => (
        <Tag
          key={`${label}-${idx}`}
          color={color}
          style={{
            marginRight: 4,
            marginBottom: 4,
            border: `1px solid ${color === 'blue' ? '#1890ff' : color === 'red' ? '#ff4d4f' : '#faad14'}`,
            background: 'white'
          }}
        >
          {label}: {kw}
        </Tag>
      ));
    }

    return null;
  };

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
      }}>
        <Title level={3} style={{ margin: 0 }}>主题列表</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/topics/create')}
        >
          创建主题
        </Button>
      </div>

      {/* 搜索框 */}
      <div style={{ marginBottom: 24 }}>
        <Search
          placeholder="搜索主题名称、描述或关键词..."
          allowClear
          size="large"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ maxWidth: 600 }}
          prefix={<SearchOutlined />}
        />
        {searchText && (
          <div style={{ marginTop: 8, color: '#666', fontSize: '14px' }}>
            找到 <strong style={{ color: '#1890ff' }}>{filteredTopics.length}</strong> 个主题
          </div>
        )}
      </div>

      {topics.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '48px 24px' }}>
          <Empty description="暂无主题">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/topics/create')}
            >
              立即创建
            </Button>
          </Empty>
        </Card>
      ) : filteredTopics.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '48px 24px' }}>
          <Empty description="没有找到匹配的主题">
            <Button
              type="link"
              onClick={() => setSearchText('')}
            >
              清空搜索
            </Button>
          </Empty>
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {filteredTopics.map(topic => {
            const trend = generateMockTrend(topic.id);
            const stats = generateMockStats(trend.data);
            const hasData = trend.data.length > 0;

            return (
              <Col xs={24} sm={12} lg={8} key={topic.id}>
                <Card
                  style={{
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    height: '100%',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                  }}
                  bodyStyle={{ padding: '16px' }}
                  onClick={() => navigate(`/topics/${topic.id}`)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Header */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '8px'
                  }}>
                    <Title level={5} style={{ margin: 0, fontSize: '16px' }}>
                      {topic.name}
                    </Title>
                  </div>

                  {/* Description */}
                  <Text
                    style={{
                      color: '#666',
                      fontSize: '13px',
                      display: 'block',
                      marginBottom: '8px'
                    }}
                  >
                    {topic.description || '我是描述信息'}
                  </Text>

                  {/* Tags */}
                  <div style={{ marginBottom: '8px', minHeight: '28px' }}>
                    <Space size={[4, 4]} wrap>
                      {renderKeywordTags(topic.include_keywords, '包含', 'blue')}
                      {renderKeywordTags(topic.exclude_keywords, '排除', 'red')}
                      {topic.fine_filters?.length > 0 && (
                        <Tag
                          color="orange"
                          style={{
                            marginRight: 4,
                            marginBottom: 4,
                            border: '1px solid #faad14',
                            background: 'white'
                          }}
                        >
                          无直: {topic.fine_filters[0]}
                        </Tag>
                      )}
                    </Space>
                  </div>

                  {/* Trend info */}
                  <div style={{ marginBottom: '8px' }}>
                    <Space>
                      <Text style={{ color: '#666', fontSize: '13px' }}>事件趋势</Text>
                      {hasData && (
                        <Text
                          style={{
                            color: trend.percent > 0 ? '#ff4d4f' : trend.percent < 0 ? '#52c41a' : '#999',
                            fontSize: '13px',
                            fontWeight: 500
                          }}
                        >
                          本周 {trend.percent > 0 ? '+' : ''}{trend.percent}%
                        </Text>
                      )}
                      {!hasData && (
                        <Text style={{ color: '#999', fontSize: '13px' }}>
                          本周 0 件
                        </Text>
                      )}
                    </Space>
                  </div>

                  {/* Chart */}
                  {hasData ? (
                    <div style={{ marginBottom: '8px', height: '120px' }}>
                      <Line
                        data={trend.data.map((count, index) => ({
                          date: index,
                          count: count
                        }))}
                        xField="date"
                        yField="count"
                        height={120}
                        padding={[10, 10, 30, 30]}
                        smooth
                        color="#1890ff"
                        xAxis={{
                          label: null,
                          line: { style: { stroke: '#e8e8e8' } },
                          tickLine: null,
                          grid: null
                        }}
                        yAxis={{
                          label: null,
                          line: null,
                          tickLine: null,
                          grid: { line: { style: { stroke: '#f0f0f0', lineDash: [4, 4] } } }
                        }}
                        areaStyle={{
                          fill: 'l(270) 0:#ffffff 0.5:#e6f7ff 1:#bae7ff',
                        }}
                        point={false}
                        tooltip={false}
                      />
                      {/* Stats */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '12px',
                        color: '#999',
                        marginTop: '-20px'
                      }}>
                        <span>最低：{stats.min}</span>
                        <span>平均：{stats.avg}</span>
                        <span>最高：{stats.max}</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      height: '120px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#fafafa',
                      borderRadius: '4px',
                      marginBottom: '8px'
                    }}>
                      <Text style={{ color: '#bbb', fontSize: '13px' }}>暂无数据</Text>
                    </div>
                  )}

                  {/* Footer */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '8px',
                    borderTop: '1px solid #f0f0f0'
                  }}>
                    <Text style={{ color: '#bbb', fontSize: '12px' }}>
                      {topic.createTime || dayjs().format('YYYY-MM-DD HH:mm:ss')}
                    </Text>
                    <Space size={4}>
                      <Tooltip title="查看详情">
                        <Button
                          type="text"
                          icon={<EyeOutlined style={{ color: '#bbb', fontSize: '14px' }} />}
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/topics/${topic.id}`);
                          }}
                        />
                      </Tooltip>
                      <Tooltip title="编辑">
                        <Button
                          type="text"
                          icon={<EditOutlined style={{ color: '#bbb', fontSize: '14px' }} />}
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/topics/${topic.id}`);
                          }}
                        />
                      </Tooltip>
                      <Tooltip title="删除">
                        <Button
                          type="text"
                          icon={<DeleteOutlined style={{ color: '#bbb', fontSize: '14px' }} />}
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTopic(topic.id, topic.name);
                          }}
                        />
                      </Tooltip>
                    </Space>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </div>
  );
};

export default TopicList;
