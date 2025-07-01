import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Timeline, Button, Typography, message, Spin, Tag, Empty } from 'antd';
import { ArrowLeftOutlined, CalendarOutlined, UserOutlined, PhoneOutlined, IdcardOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const { Title, Text } = Typography;

const PersonAnalysisDetail = () => {
  const { phone } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [personData, setPersonData] = useState(null);

  // 获取人员详情
  const fetchPersonDetail = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/person-analysis/${encodeURIComponent(phone)}`);
      setPersonData(response);
    } catch (error) {
      console.error('获取人员详情失败:', error);
      message.error('获取人员详情失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (phone) {
      fetchPersonDetail();
    }
  }, [phone]);

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
    if (!personData?.events) return [];
    
    return personData.events.map((event, index) => ({
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

      {/* 关联事件时间线 */}
      <Card>
        <Title level={3}>
          <CalendarOutlined style={{ marginRight: '8px' }} />
          关联事件时间线
        </Title>
        
        {personData.events && personData.events.length > 0 ? (
          <Timeline
            items={buildTimelineItems()}
            mode="left"
            style={{ marginTop: '24px' }}
          />
        ) : (
          <Empty 
            description="暂无关联事件"
            style={{ margin: '40px 0' }}
          />
        )}
      </Card>
    </div>
  );
};

export default PersonAnalysisDetail; 