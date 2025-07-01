import React, { useState, useEffect } from 'react';
import {
  Card,
  Descriptions,
  Button,
  Spin,
  message,
  Tag,
  Space,
  Alert,
} from 'antd';
import {
  ArrowLeftOutlined,
  ClusterOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { eventAPI } from '../services/api';

const EventDetail = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [eventDetail, setEventDetail] = useState(null);

  // 加载事件详情
  const loadEventDetail = async () => {
    setLoading(true);
    try {
      const detail = await eventAPI.getEventDetail(eventId);
      setEventDetail(detail);
    } catch (error) {
      message.error('加载事件详情失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 解析特殊时间格式 (如 "31/5/25 19:47")
  const parseTime = (timeStr) => {
    if (!timeStr) return null;
    
    try {
      // 先尝试标准解析
      let date = new Date(timeStr);
      if (!isNaN(date.getTime())) {
        return date;
      }
      
      // 处理特殊格式 "dd/m/yy h:mm" 或 "d/m/yy h:mm"
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

  // 获取事件级别颜色
  const getLevelColor = (level) => {
    if (level?.includes('一级')) return 'red';
    if (level?.includes('二级')) return 'orange';
    if (level?.includes('三级')) return 'blue';
    return 'default';
  };

  // 跳转到聚类事件详情
  const handleViewCluster = () => {
    if (eventDetail?.EventUID) {
      navigate(`/clusters/${eventDetail.EventUID}`);
    }
  };

  // 返回列表
  const handleBack = () => {
    navigate('/events');
  };

  useEffect(() => {
    if (eventId) {
      loadEventDetail();
    }
  }, [eventId]);

  if (loading) {
    return (
      <div className="page-container" style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>加载事件详情中...</div>
      </div>
    );
  }

  if (!eventDetail) {
    return (
      <div className="page-container">
        <Alert
          message="事件未找到"
          description={`未找到事件编号为 ${eventId} 的事件，请检查事件编号是否正确。`}
          type="warning"
          showIcon
          action={
            <Button onClick={handleBack}>
              返回列表
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* 页面头部 */}
      <div className="page-header">
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={handleBack}
          >
            返回列表
          </Button>
          <h1 className="page-title">事件详情</h1>
        </Space>
      </div>

      {/* 相关事件提醒 */}
      {eventDetail.related_events_count > 0 && (
        <Alert
          message="聚类事件提醒"
          description={
            <Space>
              <span>
                该事件属于聚类事件，还有 {eventDetail.related_events_count} 个相关事件。
              </span>
              <Button
                type="link"
                icon={<ClusterOutlined />}
                onClick={handleViewCluster}
                style={{ padding: 0 }}
              >
                查看聚类事件详情
              </Button>
            </Space>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 事件基本信息 */}
      <Card
        title={
          <Space>
            <CalendarOutlined />
            基本信息
          </Space>
        }
        className="detail-card"
      >
        <Descriptions column={2} bordered>
          <Descriptions.Item label="事件编号" span={2}>
            <strong>{eventDetail.事件编号}</strong>
          </Descriptions.Item>
          
          <Descriptions.Item label="事件描述" span={2}>
            {eventDetail.事件描述}
          </Descriptions.Item>
          
          <Descriptions.Item label="镇街名称">
            {eventDetail.镇街名称}
          </Descriptions.Item>
          
          <Descriptions.Item label="村社名称">
            {eventDetail.村社名称 || '-'}
          </Descriptions.Item>
          
          <Descriptions.Item label="事件级别">
            <Tag color={getLevelColor(eventDetail.事件级别)}>
              {eventDetail.事件级别}
            </Tag>
          </Descriptions.Item>
          
          <Descriptions.Item label="二级分类">
            <Tag>{eventDetail.二级分类}</Tag>
          </Descriptions.Item>
          
          <Descriptions.Item label="上报时间">
            {formatTime(eventDetail.上报时间)}
          </Descriptions.Item>
          
          <Descriptions.Item label="办结时间">
            {formatTime(eventDetail.办结时间)}
          </Descriptions.Item>
          
          <Descriptions.Item label="处置结果" span={2}>
            {eventDetail.处置结果 || '-'}
          </Descriptions.Item>
          
          <Descriptions.Item label="报警人信息" span={2}>
            {eventDetail.报警人信息 ? (
              <div style={{ whiteSpace: 'pre-line', lineHeight: '1.5' }}>
                {eventDetail.报警人信息}
              </div>
            ) : '-'}
          </Descriptions.Item>
          
          <Descriptions.Item label="当事人信息" span={2}>
            {eventDetail.当事人信息 ? (
              <div style={{ whiteSpace: 'pre-line', lineHeight: '1.5' }}>
                {eventDetail.当事人信息}
              </div>
            ) : '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 聚类信息 */}
      {eventDetail.EventUID && eventDetail.related_events_count > 0 && (
        <Card
          title={
            <Space>
              <ClusterOutlined />
              聚类信息
            </Space>
          }
          className="detail-card"
        >
          <Descriptions column={1} bordered>
            <Descriptions.Item label="聚类事件ID">
              <Space>
                <code>{eventDetail.EventUID}</code>
                <Button
                  type="primary"
                  size="small"
                  onClick={handleViewCluster}
                >
                  查看详情
                </Button>
              </Space>
            </Descriptions.Item>
            
            <Descriptions.Item label="聚类事件总数">
              {eventDetail.sequence_total} 个事件
            </Descriptions.Item>
            
            <Descriptions.Item label="相关事件数量">
              {eventDetail.related_events_count} 个相关事件
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      {/* 操作按钮 */}
      <Card>
        <Space>
          <Button onClick={handleBack}>
            返回列表
          </Button>
          {eventDetail.EventUID && eventDetail.related_events_count > 0 && (
            <Button
              type="primary"
              icon={<ClusterOutlined />}
              onClick={handleViewCluster}
            >
              查看聚类事件详情
            </Button>
          )}
        </Space>
      </Card>
    </div>
  );
};

export default EventDetail; 