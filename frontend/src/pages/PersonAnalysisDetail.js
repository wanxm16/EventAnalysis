import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Timeline, Button, Typography, message, Spin, Tag, Empty, Select, DatePicker, Row, Col, Space } from 'antd';
import { ArrowLeftOutlined, CalendarOutlined, UserOutlined, PhoneOutlined, IdcardOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const { Title, Text } = Typography;
const { Option } = Select;

const PersonAnalysisDetail = () => {
  const { phone } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [personData, setPersonData] = useState(null);

  // 时间线筛选状态
  const [timelineFilters, setTimelineFilters] = useState({
    towns: [],
    eventTypes: [],
    categories: [],
    reportTimeRange: null,
  });

  // 筛选选项
  const [filterOptions, setFilterOptions] = useState({
    towns: [],
    event_types: [],
    categories: [],
  });

  // 筛选后的事件数据
  const [filteredEvents, setFilteredEvents] = useState([]);

  // 获取人员详情
  const fetchPersonDetail = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/person-analysis/${encodeURIComponent(phone)}`);
      setPersonData(response);
      setFilteredEvents(response.events || []);
    } catch (error) {
      console.error('获取人员详情失败:', error);
      message.error('获取人员详情失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载筛选选项
  const loadFilterOptions = async () => {
    try {
      const response = await api.get('/filter-options');
      setFilterOptions(response);
    } catch (error) {
      console.error('加载筛选选项失败:', error);
    }
  };

  useEffect(() => {
    if (phone) {
      fetchPersonDetail();
      loadFilterOptions();
    }
  }, [phone]);

  // 当personData变化时，重新设置筛选数据
  useEffect(() => {
    if (personData?.events) {
      setFilteredEvents(personData.events);
    }
  }, [personData]);

  // 处理时间线筛选
  const handleTimelineFilterChange = (filterType, values) => {
    const newTimelineFilters = {
      ...timelineFilters,
      [filterType]: values
    };
    setTimelineFilters(newTimelineFilters);
    applyFilters(newTimelineFilters);
  };

  // 应用筛选条件
  const applyFilters = (filters) => {
    if (!personData || !personData.events) {
      setFilteredEvents([]);
      return;
    }

    let filtered = personData.events;

    // 按街镇筛选
    if (filters.towns && filters.towns.length > 0) {
      filtered = filtered.filter(event =>
        filters.towns.includes(event.镇街名称)
      );
    }

    // 按事件类型筛选
    if (filters.eventTypes && filters.eventTypes.length > 0) {
      filtered = filtered.filter(event =>
        filters.eventTypes.includes(event.事件类型)
      );
    }

    // 按二级分类筛选
    if (filters.categories && filters.categories.length > 0) {
      filtered = filtered.filter(event =>
        filters.categories.includes(event.二级分类)
      );
    }

    // 按上报时间筛选
    if (filters.reportTimeRange && filters.reportTimeRange.length === 2) {
      const [start, end] = filters.reportTimeRange;
      filtered = filtered.filter(event => {
        if (!event.上报时间) return false;
        try {
          const reportTime = new Date(event.上报时间);
          const startTime = start ? start.toDate() : null;
          const endTime = end ? end.toDate() : null;

          if (startTime && reportTime < startTime) return false;
          if (endTime && reportTime > endTime) return false;
          return true;
        } catch {
          return false;
        }
      });
    }

    setFilteredEvents(filtered);
  };

  // 清除筛选条件
  const clearTimelineFilters = () => {
    const clearedFilters = {
      towns: [],
      eventTypes: [],
      categories: [],
      reportTimeRange: null,
    };
    setTimelineFilters(clearedFilters);
    setFilteredEvents(personData?.events || []);
  };

  // 返回列表
  const handleBack = () => {
    navigate('/person-analysis');
  };

  // 查看事件详情
  const handleViewEvent = (eventId) => {
    navigate(`/events/${eventId}`);
  };

  // 解析特殊时间格式 (如 "26/5/25 8:20")
  const parseTime = (timeStr) => {
    if (!timeStr) return null;
    
    try {
      // 先尝试标准解析
      let date = new Date(timeStr);
      if (!isNaN(date.getTime())) {
        return date;
      }
      
      // 处理特殊格式 "26/5/25 8:20" 或 "5/8/25 4:11"
      const match = timeStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})\s+(\d{1,2}):(\d{2})$/);
      if (match) {
        const [, day, month, year, hour, minute] = match;
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

  // 格式化时间
  const formatTime = (timeStr) => {
    if (!timeStr) return '-';
    const date = parseTime(timeStr);
    if (!date) return timeStr;
    
    try {
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return timeStr;
    }
  };

  // 格式化简短时间
  const formatShortTime = (timeStr) => {
    if (!timeStr) return '-';
    const date = parseTime(timeStr);
    if (!date) return timeStr;
    
    try {
      return date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return timeStr;
    }
  };

  // 获取角色标签颜色
  const getRoleColor = (role) => {
    switch (role) {
      case '报警人': return 'blue';
      case '对方': return 'orange';
      case '当事人': return 'green';
      default: return 'default';
    }
  };

  // 构建时间线项目
  const buildTimelineItems = () => {
    if (!filteredEvents.length) return [];

    return filteredEvents.map((event, index) => ({
      key: index,
      dot: event.办结时间 && event.办结时间 !== 'None' ? (
        <CheckCircleOutlined style={{ color: '#52c41a' }} />
      ) : (
        <ClockCircleOutlined style={{ color: '#1890ff' }} />
      ),
      children: (
        <div className="timeline-item">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <strong 
                style={{ cursor: 'pointer' }}
                onClick={() => handleViewEvent(event.事件编号)}
              >
                {event.事件编号}
              </strong>
              <Tag 
                color={event.办结时间 && event.办结时间 !== 'None' ? 'green' : 'blue'} 
                style={{ marginLeft: 8 }}
              >
                {event.办结时间 && event.办结时间 !== 'None' ? '已办结' : '处理中'}
              </Tag>
              {event.role && (
                <Tag 
                  color={getRoleColor(event.role)} 
                  style={{ marginLeft: 8 }}
                >
                  {event.role}
                </Tag>
              )}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {formatShortTime(event.上报时间)}
            </div>
          </div>
          
          <div style={{ marginBottom: 8, lineHeight: '1.5' }}>
            {event.事件描述}
          </div>

          {/* 基本信息展示 */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: 4 }}>
              {event.镇街名称 && (
                <Tag color="blue" style={{ margin: 0, fontSize: '11px' }}>
                  <strong>街镇:</strong> {event.镇街名称}
                </Tag>
              )}
              {event.事件类型 && (
                <Tag color="orange" style={{ margin: 0, fontSize: '11px' }}>
                  <strong>类型:</strong> {event.事件类型}
                </Tag>
              )}
              {event.二级分类 && (
                <Tag color="purple" style={{ margin: 0, fontSize: '11px' }}>
                  <strong>分类:</strong> {event.二级分类}
                </Tag>
              )}
            </div>
            {event.上报时间 && (
              <div style={{ fontSize: '11px', color: '#666', marginBottom: 4 }}>
                <strong>上报时间:</strong> {formatTime(event.上报时间)}
              </div>
            )}
          </div>

          {event.处置结果 && event.处置结果 !== 'None' && (
            <div style={{ fontSize: '12px', color: '#666', padding: '4px 8px', background: '#f5f5f5', borderRadius: '4px', marginBottom: 4 }}>
              <strong>处置结果:</strong> {event.处置结果}
            </div>
          )}
          
          {event.办结时间 && event.办结时间 !== 'None' && (
            <div style={{ fontSize: '12px', color: '#52c41a', marginTop: 4 }}>
              办结时间: {formatShortTime(event.办结时间)}
            </div>
          )}
        </div>
      ),
    }));
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!personData) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <Empty description="未找到人员信息" />
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <Button type="primary" onClick={handleBack}>
              返回列表
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* 返回按钮 */}
      <div style={{ marginBottom: '16px' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
          返回人员分析列表
        </Button>
      </div>

      {/* 人员基本信息 */}
      <Card style={{ marginBottom: '16px' }}>
        <Title level={3}>
          <UserOutlined style={{ marginRight: '8px' }} />
          人员信息
        </Title>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="手机号码" span={1}>
            <Text copyable style={{ fontFamily: 'monospace' }}>
              <PhoneOutlined style={{ marginRight: '8px' }} />
              {personData.phone}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="姓名" span={1}>
            {personData.name || '未知'}
          </Descriptions.Item>
          <Descriptions.Item label="身份证号码" span={1}>
            <Text copyable style={{ fontFamily: 'monospace' }}>
              <IdcardOutlined style={{ marginRight: '8px' }} />
              {personData.id_card || '未知'}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="主要角色" span={1}>
            {personData.primary_role ? (
              <Tag color={getRoleColor(personData.primary_role)}>
                {personData.primary_role}
              </Tag>
            ) : '未知'}
          </Descriptions.Item>
          <Descriptions.Item label="关联事件总数" span={1}>
            <Text strong style={{ color: '#1890ff', fontSize: '16px' }}>
              {personData.event_count} 个事件
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="姓名候选" span={1}>
            <Text type="secondary">
              {personData.name_candidates || '无'}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="身份证候选" span={2}>
            <Text type="secondary" style={{ fontFamily: 'monospace' }}>
              {personData.id_candidates || '无'}
            </Text>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 时间线筛选组件 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col span={24}>
            <div style={{ marginBottom: 8, fontWeight: 'bold', color: '#1890ff' }}>
              事件时间线筛选
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div style={{ marginBottom: 4, fontSize: '12px', color: '#666' }}>街镇</div>
            <Select
              mode="multiple"
              placeholder="选择街镇"
              value={timelineFilters.towns}
              onChange={(values) => handleTimelineFilterChange('towns', values)}
              style={{ width: '100%' }}
              allowClear
              showSearch
              maxTagCount="responsive"
            >
              {filterOptions.towns.map(town => (
                <Option key={town} value={town}>{town}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div style={{ marginBottom: 4, fontSize: '12px', color: '#666' }}>事件类型</div>
            <Select
              mode="multiple"
              placeholder="选择事件类型"
              value={timelineFilters.eventTypes}
              onChange={(values) => handleTimelineFilterChange('eventTypes', values)}
              style={{ width: '100%' }}
              allowClear
              showSearch
              maxTagCount="responsive"
            >
              {filterOptions.event_types.map(type => (
                <Option key={type} value={type}>{type}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div style={{ marginBottom: 4, fontSize: '12px', color: '#666' }}>二级分类</div>
            <Select
              mode="multiple"
              placeholder="选择二级分类"
              value={timelineFilters.categories}
              onChange={(values) => handleTimelineFilterChange('categories', values)}
              style={{ width: '100%' }}
              allowClear
              showSearch
              maxTagCount="responsive"
            >
              {filterOptions.categories.map(category => (
                <Option key={category} value={category}>{category}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div style={{ marginBottom: 4, fontSize: '12px', color: '#666' }}>上报时间</div>
            <DatePicker.RangePicker
              value={timelineFilters.reportTimeRange}
              onChange={(dates) => handleTimelineFilterChange('reportTimeRange', dates)}
              style={{ width: '100%' }}
              placeholder={['开始时间', '结束时间']}
              showTime
              format="YYYY-MM-DD HH:mm"
            />
          </Col>
          <Col xs={24} sm={24} md={24}>
            <Space>
              <Button
                type="primary"
                disabled={
                  !timelineFilters.towns.length &&
                  !timelineFilters.eventTypes.length &&
                  !timelineFilters.categories.length &&
                  !timelineFilters.reportTimeRange
                }
                onClick={() => {
                  message.success('筛选条件已应用');
                }}
              >
                应用筛选
              </Button>
              <Button onClick={clearTimelineFilters}>
                清除筛选
              </Button>
              {filteredEvents.length !== (personData?.events?.length || 0) && (
                <span style={{ color: '#666', fontSize: '12px' }}>
                  显示 {filteredEvents.length} / {personData?.events?.length || 0} 个事件
                </span>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 关联事件时间线 */}
      <Card>
        <Title level={3}>
          <CalendarOutlined style={{ marginRight: '8px' }} />
          关联事件时间线
        </Title>

        {filteredEvents && filteredEvents.length > 0 ? (
          <Timeline
            items={buildTimelineItems()}
            mode="left"
            style={{ marginTop: '24px' }}
          />
        ) : (
          <Empty
            description={personData?.events?.length > 0 ? "没有符合筛选条件的事件" : "暂无关联事件"}
            style={{ margin: '40px 0' }}
          />
        )}
      </Card>
    </div>
  );
};

export default PersonAnalysisDetail; 