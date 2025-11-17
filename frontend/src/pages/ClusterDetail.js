import React, { useState, useEffect } from 'react';
import {
  Card,
  Descriptions,
  Button,
  Spin,
  message,
  Timeline,
  Tag,
  Space,
  Alert,
  Row,
  Col,
  Statistic,
  Form,
  Input,
  Table,
  Modal,
  Popconfirm,
  Select,
  Tooltip,
  DatePicker,
  Switch,
} from 'antd';
import {
  ArrowLeftOutlined,
  ClusterOutlined,
  CalendarOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  UndoOutlined,
  ExclamationCircleOutlined,
  CopyOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { eventAPI } from '../services/api';

const { Option } = Select;

const ClusterDetail = () => {
  const { eventUID } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [clusterDetail, setClusterDetail] = useState(null);
  
  // Cluster编辑相关状态
  const [editMode, setEditMode] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [addEventModalVisible, setAddEventModalVisible] = useState(false);
  const [addEventForm] = Form.useForm();
  const [availableClusters, setAvailableClusters] = useState([]);
  const [operations, setOperations] = useState([]);

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  // 时间线筛选状态
  const [timelineFilters, setTimelineFilters] = useState({
    towns: [],
    eventTypes: [],
    categories: [],
    reportTimeRange: null,
    searchText: '',
  });

  // 筛选选项
  const [filterOptions, setFilterOptions] = useState({
    towns: [],
    event_types: [],
    categories: [],
  });

  // 筛选后的时间线数据
  const [filteredTimeline, setFilteredTimeline] = useState([]);

  // 去重状态
  const [dedupEnabled, setDedupEnabled] = useState(true);
  const [duplicateDetailVisible, setDuplicateDetailVisible] = useState(false);
  const [selectedDuplicateGroup, setSelectedDuplicateGroup] = useState(null);

  // 加载聚类事件详情
  const loadClusterDetail = async () => {
    setLoading(true);
    try {
      const detail = await eventAPI.getClusterDetail(eventUID);
      setClusterDetail(detail);
      setFilteredTimeline(detail.timeline || []);
    } catch (error) {
      message.error('加载聚类事件详情失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 加载筛选选项
  const loadFilterOptions = async () => {
    try {
      const options = await eventAPI.getFilterOptions();
      setFilterOptions(options);
    } catch (error) {
      console.error('加载筛选选项失败:', error);
    }
  };

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
    if (!clusterDetail || !clusterDetail.timeline) {
      setFilteredTimeline([]);
      return;
    }

    let filtered = clusterDetail.timeline;

    // 按街镇筛选
    if (filters.towns && filters.towns.length > 0) {
      filtered = filtered.filter(item =>
        filters.towns.includes(item.镇街名称)
      );
    }

    // 按事件类型筛选
    if (filters.eventTypes && filters.eventTypes.length > 0) {
      filtered = filtered.filter(item =>
        filters.eventTypes.includes(item.事件类型)
      );
    }

    // 按二级分类筛选
    if (filters.categories && filters.categories.length > 0) {
      filtered = filtered.filter(item =>
        filters.categories.includes(item.二级分类)
      );
    }

    // 按上报时间筛选
    if (filters.reportTimeRange && filters.reportTimeRange.length === 2) {
      const [start, end] = filters.reportTimeRange;
      filtered = filtered.filter(item => {
        if (!item.上报时间) return false;
        try {
          const reportTime = new Date(item.上报时间);
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

    // 按搜索文本筛选（搜索事件描述和处置结果）
    if (filters.searchText && filters.searchText.trim()) {
      const searchTerm = filters.searchText.trim().toLowerCase();
      filtered = filtered.filter(item => {
        const description = (item.事件描述 || '').toLowerCase();
        const result = (item.处置结果 || '').toLowerCase();
        return description.includes(searchTerm) || result.includes(searchTerm);
      });
    }

    setFilteredTimeline(filtered);
  };

  // 清除筛选条件
  const clearTimelineFilters = () => {
    const clearedFilters = {
      towns: [],
      eventTypes: [],
      categories: [],
      reportTimeRange: null,
      searchText: '',
    };
    setTimelineFilters(clearedFilters);
    setFilteredTimeline(clusterDetail?.timeline || []);
  };

  // 事件去重逻辑
  const deduplicateEvents = (events) => {
    if (!dedupEnabled || !events?.length) return events;

    // 按事件描述分组
    const groups = {};
    events.forEach(event => {
      const desc = (event.事件描述 || '').trim();
      if (!desc) {
        // 无描述的事件单独处理
        groups[`no_desc_${event.事件编号}`] = [event];
        return;
      }

      if (!groups[desc]) {
        groups[desc] = [];
      }
      groups[desc].push(event);
    });

    // 生成去重后的数据
    const dedupedEvents = [];
    Object.entries(groups).forEach(([description, eventsInGroup]) => {
      if (eventsInGroup.length === 1) {
        // 单个事件，直接添加
        dedupedEvents.push({
          ...eventsInGroup[0],
          isDuplicate: false,
          duplicateCount: 1,
          duplicateEvents: eventsInGroup
        });
      } else {
        // 多个重复事件，选择最早的作为代表
        const sortedEvents = eventsInGroup.sort((a, b) => {
          const timeA = parseTime(a.上报时间) || new Date(0);
          const timeB = parseTime(b.上报时间) || new Date(0);
          return timeA - timeB;
        });

        const representative = sortedEvents[0];
        dedupedEvents.push({
          ...representative,
          isDuplicate: true,
          duplicateCount: eventsInGroup.length,
          duplicateEvents: sortedEvents
        });
      }
    });

    return dedupedEvents;
  };

  // 查看重复详情
  const viewDuplicateDetail = (duplicateGroup) => {
    setSelectedDuplicateGroup(duplicateGroup);
    setDuplicateDetailVisible(true);
  };

  // ============ Cluster编辑相关方法 ============
  
  // 获取事件所属cluster信息
  const getEventClusterInfo = async (eventId) => {
    try {
      const response = await fetch(`http://localhost:8000/api/events/${eventId}/cluster`);
      if (!response.ok) {
        throw new Error('获取事件cluster信息失败');
      }
      return await response.json();
    } catch (error) {
      console.error('获取事件cluster信息失败:', error);
      return null;
    }
  };

  // 从cluster中删除事件
  const removeEventFromCluster = async (eventId) => {
    setEditLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/clusters/${eventUID}/edit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'remove_event',
          event_id: eventId,
          operator: '管理员' // 这里应该从用户上下文获取
        })
      });

      const result = await response.json();
      
      if (result.success) {
        message.success(result.message);
        // 重新加载cluster详情和操作记录
        await loadClusterDetail();
        await loadOperations();
      } else {
        message.error(result.message);
      }
    } catch (error) {
      message.error('删除事件失败: ' + error.message);
    } finally {
      setEditLoading(false);
    }
  };

  // 添加事件到cluster
  const addEventToCluster = async (eventId, targetCluster) => {
    setEditLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/clusters/${targetCluster}/edit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'add_event',
          event_id: eventId,
          operator: '管理员',
          target_cluster: targetCluster
        })
      });

      const result = await response.json();
      
      if (result.success) {
        message.success(result.message);
        // 重新加载cluster详情和操作记录
        await loadClusterDetail();
        await loadOperations();
      } else {
        message.error(result.message);
      }
    } catch (error) {
      message.error('添加事件失败: ' + error.message);
    } finally {
      setEditLoading(false);
    }
  };

  // 撤销操作
  const undoOperation = async (operationId) => {
    setEditLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/clusters/undo/${operationId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operator: '管理员'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        message.success('操作已撤销');
        // 重新加载cluster详情和操作记录
        await loadClusterDetail();
        await loadOperations();
      } else {
        message.error(result.message);
      }
    } catch (error) {
      message.error('撤销操作失败: ' + error.message);
    } finally {
      setEditLoading(false);
    }
  };

  // 加载可用的clusters列表
  const loadAvailableClusters = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/clusters?page_size=1000');
      if (response.ok) {
        const data = await response.json();
        setAvailableClusters(data.items || []);
      }
    } catch (error) {
      console.error('加载clusters列表失败:', error);
    }
  };

  // 加载操作记录
  const loadOperations = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/clusters/${eventUID}/operations`);
      if (response.ok) {
        const data = await response.json();
        setOperations(data.operations || []);
      }
    } catch (error) {
      console.error('加载操作记录失败:', error);
    }
  };

  // 处理添加事件
  const handleAddEvent = async () => {
    try {
      const values = await addEventForm.validateFields();
      const { event_id, target_cluster } = values;
      
      // 检查事件当前所属cluster
      const clusterInfo = await getEventClusterInfo(event_id);
      
      if (clusterInfo && clusterInfo.cluster_id) {
        // 显示提示信息
        Modal.confirm({
          title: '事件归属提示',
          icon: <ExclamationCircleOutlined />,
          content: (
            <div>
              <p>该事件当前属于cluster: <strong>{clusterInfo.cluster_id}</strong></p>
              {clusterInfo.cluster_description && (
                <p>描述: {clusterInfo.cluster_description}</p>
              )}
              {clusterInfo.cluster_url && (
                <p>
                  <a href={clusterInfo.cluster_url} target="_blank" rel="noopener noreferrer">
                    查看原cluster详情
                  </a>
                </p>
              )}
              <p>确认要将此事件移动到当前cluster吗？</p>
            </div>
          ),
          onOk: async () => {
            await addEventToCluster(event_id, target_cluster || eventUID);
            setAddEventModalVisible(false);
            addEventForm.resetFields();
          }
        });
      } else {
        // 事件不属于任何cluster，直接添加
        await addEventToCluster(event_id, target_cluster || eventUID);
        setAddEventModalVisible(false);
        addEventForm.resetFields();
      }
    } catch (error) {
      console.error('添加事件失败:', error);
    }
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

  // 返回列表
  const handleBack = () => {
    navigate('/events');
  };

  // 查看事件详情
  const handleViewEvent = (eventId) => {
    navigate(`/events/${eventId}`);
  };

  // 构建时间线项目
  const buildTimelineItems = () => {
    if (!filteredTimeline.length) return [];

    // 应用去重逻辑
    const eventsToDisplay = deduplicateEvents(filteredTimeline);

    return eventsToDisplay.map((item, index) => ({
      key: index,
      dot: item.办结时间 ? (
        <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '16px' }} />
      ) : (
        <ClockCircleOutlined style={{ color: '#1890ff', fontSize: '16px' }} />
      ),
      children: (
        <div style={{
          background: '#fff',
          padding: '16px 20px',
          borderRadius: '8px',
          border: '1px solid #f0f0f0',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          transition: 'all 0.3s ease',
          cursor: 'pointer',
          marginBottom: '8px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
          e.currentTarget.style.borderColor = '#1890ff';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)';
          e.currentTarget.style.borderColor = '#f0f0f0';
        }}>
          {/* 头部：事件编号和状态 */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '12px',
            paddingBottom: '12px',
            borderBottom: '1px solid #f5f5f5'
          }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <Button
                type="link"
                style={{
                  padding: 0,
                  height: 'auto',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#1890ff'
                }}
                onClick={() => handleViewEvent(item.事件编号)}
                icon={<EyeOutlined />}
              >
                {item.事件编号}
              </Button>
              <Tag
                color={item.办结时间 ? 'success' : 'processing'}
                style={{ margin: 0, fontSize: '12px' }}
              >
                {item.办结时间 ? '已办结' : '处理中'}
              </Tag>
              {item.isDuplicate && (
                <Tag
                  color="warning"
                  icon={<CopyOutlined />}
                  style={{ margin: 0, cursor: 'pointer' }}
                  onClick={() => viewDuplicateDetail(item.duplicateEvents)}
                >
                  重复 {item.duplicateCount}
                </Tag>
              )}
              {editMode && (
                <Tooltip title="从此cluster中删除事件">
                  <Popconfirm
                    title="确认删除"
                    description="确定要从此cluster中删除该事件吗？删除后将创建新的独立cluster。"
                    onConfirm={() => removeEventFromCluster(item.事件编号)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      loading={editLoading}
                    />
                  </Popconfirm>
                </Tooltip>
              )}
            </div>
            <div style={{
              fontSize: '12px',
              color: '#999',
              whiteSpace: 'nowrap',
              marginLeft: '12px'
            }}>
              {formatShortTime(item.上报时间)}
            </div>
          </div>

          {/* 事件描述 */}
          <div style={{
            marginBottom: '12px',
            padding: '10px 14px',
            background: '#fafafa',
            borderRadius: '6px',
            borderLeft: '3px solid #1890ff',
            fontSize: '14px',
            lineHeight: '1.6',
            color: '#333'
          }}>
            {item.事件描述}
          </div>

          {/* 标签信息 */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            marginBottom: '12px'
          }}>
            {item.镇街名称 && (
              <Tag color="blue" style={{ margin: 0 }}>
                {item.镇街名称}
              </Tag>
            )}
            {item.事件类型 && (
              <Tag color="orange" style={{ margin: 0 }}>
                {item.事件类型}
              </Tag>
            )}
            {item.二级分类 && (
              <Tag color="purple" style={{ margin: 0 }}>
                {item.二级分类}
              </Tag>
            )}
          </div>

          {/* 详细信息 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {item.报警人信息 && (
              <div style={{
                fontSize: '13px',
                color: '#666',
                padding: '8px 12px',
                background: '#e6f7ff',
                borderRadius: '6px',
                borderLeft: '3px solid #1890ff'
              }}>
                <span style={{ color: '#1890ff', fontWeight: 600 }}>报警人：</span>
                {item.报警人信息}
              </div>
            )}

            {item.当事人信息 && (
              <div style={{
                fontSize: '13px',
                color: '#666',
                padding: '8px 12px',
                background: '#fff7e6',
                borderRadius: '6px',
                borderLeft: '3px solid #fa8c16'
              }}>
                <span style={{ color: '#fa8c16', fontWeight: 600 }}>当事人：</span>
                {item.当事人信息}
              </div>
            )}

            {item.处置结果 && (
              <div style={{
                fontSize: '13px',
                color: '#666',
                padding: '8px 12px',
                background: '#f6ffed',
                borderRadius: '6px',
                borderLeft: '3px solid #52c41a'
              }}>
                <span style={{ color: '#52c41a', fontWeight: 600 }}>处置结果：</span>
                {item.处置结果}
              </div>
            )}

            {item.办结时间 && (
              <div style={{
                fontSize: '12px',
                color: '#52c41a',
                fontWeight: 500,
                marginTop: '4px'
              }}>
                <CheckCircleOutlined style={{ marginRight: '6px' }} />
                办结时间: {formatShortTime(item.办结时间)}
              </div>
            )}
          </div>
        </div>
      ),
    }));
  };

  useEffect(() => {
    if (eventUID) {
      loadClusterDetail();
      loadAvailableClusters();
      loadOperations();
      loadFilterOptions();
    }
  }, [eventUID]);

  // 当clusterDetail变化时，重新设置筛选数据
  useEffect(() => {
    if (clusterDetail?.timeline) {
      setFilteredTimeline(clusterDetail.timeline);
    }
  }, [clusterDetail]);

  if (loading) {
    return (
      <div className="page-container" style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>加载聚类事件详情中...</div>
      </div>
    );
  }

  if (!clusterDetail) {
    return (
      <div className="page-container">
        <Alert
          message="聚类事件未找到"
          description={`未找到EventUID为 ${eventUID} 的聚类事件，请检查UID是否正确。`}
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
      <div className="page-header" style={{
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <Space size="large">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={handleBack}
            size="large"
          >
            返回列表
          </Button>
          <div>
            <h1 className="page-title" style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>
              聚类事件详情
            </h1>
            <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
              <ClusterOutlined style={{ marginRight: '6px' }} />
              <code style={{ fontSize: '14px', fontWeight: 'bold', color: '#1890ff' }}>
                {clusterDetail.EventUID}
              </code>
            </div>
          </div>
        </Space>
      </div>

      {/* 概览信息卡片 */}
      <Card
        style={{
          marginBottom: '20px',
          borderRadius: '12px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          overflow: 'hidden'
        }}
        bodyStyle={{ padding: 0 }}
      >
        {/* 顶部统计数据区 */}
        <div style={{
          background: '#fafafa',
          padding: '24px',
          color: '#424242',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <Row gutter={16}>
            <Col xs={12} sm={6}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '4px' }}>
                  {clusterDetail.participant_count}
                </div>
                <div style={{ fontSize: '13px', opacity: 0.9 }}>
                  <UserOutlined style={{ marginRight: '4px' }} />
                  参与人数
                </div>
              </div>
            </Col>

            <Col xs={12} sm={6}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '4px' }}>
                  {dedupEnabled ? deduplicateEvents(clusterDetail.timeline || []).length : (clusterDetail.timeline?.length || 0)}
                </div>
                <div style={{ fontSize: '13px', opacity: 0.9 }}>
                  <ClusterOutlined style={{ marginRight: '4px' }} />
                  {dedupEnabled ? "去重后事件" : "事件总数"}
                </div>
                {dedupEnabled && clusterDetail.timeline?.length > 0 && deduplicateEvents(clusterDetail.timeline).length !== clusterDetail.timeline.length && (
                  <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '2px' }}>
                    原始: {clusterDetail.timeline.length} 个
                  </div>
                )}
              </div>
            </Col>

            <Col xs={12} sm={6}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '4px' }}>
                  {clusterDetail.timeline?.filter(item => item.办结时间).length || 0}
                </div>
                <div style={{ fontSize: '13px', opacity: 0.9 }}>
                  <CheckCircleOutlined style={{ marginRight: '4px' }} />
                  已办结事件
                </div>
              </div>
            </Col>

            <Col xs={12} sm={6}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '4px' }}>
                  {clusterDetail.timeline?.filter(item => !item.办结时间).length || 0}
                </div>
                <div style={{ fontSize: '13px', opacity: 0.9 }}>
                  <ClockCircleOutlined style={{ marginRight: '4px' }} />
                  处理中事件
                </div>
              </div>
            </Col>
          </Row>
        </div>

        {/* 主要内容区 */}
        <div style={{ padding: '24px' }}>
          {/* 事件描述 */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px'
            }}>
              <div style={{
                width: '4px',
                height: '18px',
                background: '#667eea',
                borderRadius: '2px'
              }} />
              <span style={{ fontSize: '15px', fontWeight: 600, color: '#333' }}>
                事件描述
              </span>
            </div>
            <div style={{
              padding: '14px 16px',
              background: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #e9ecef',
              fontSize: '14px',
              lineHeight: '1.8',
              color: '#495057'
            }}>
              {clusterDetail.Event_description}
            </div>
          </div>

          {/* 时间信息 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px'
          }}>
            <div style={{
              padding: '14px 16px',
              background: '#fff',
              border: '1px solid #e9ecef',
              borderRadius: '8px',
              transition: 'all 0.3s'
            }}>
              <div style={{
                fontSize: '12px',
                color: '#868e96',
                marginBottom: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <CalendarOutlined />
                开始时间
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#212529' }}>
                {formatTime(clusterDetail.first_report_time)}
              </div>
            </div>

            <div style={{
              padding: '14px 16px',
              background: '#fff',
              border: '1px solid #e9ecef',
              borderRadius: '8px',
              transition: 'all 0.3s'
            }}>
              <div style={{
                fontSize: '12px',
                color: '#868e96',
                marginBottom: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <CalendarOutlined />
                结束时间
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#212529' }}>
                {formatTime(clusterDetail.last_report_time)}
              </div>
            </div>

            <div style={{
              padding: '14px 16px',
              background: 'linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%)',
              border: '1px solid #ffeaa7',
              borderRadius: '8px',
              transition: 'all 0.3s'
            }}>
              <div style={{
                fontSize: '12px',
                color: '#2d3436',
                marginBottom: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <ClockCircleOutlined />
                持续时长
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#d63031' }}>
                {clusterDetail.duration_days || 0} <span style={{ fontSize: '13px', fontWeight: 500 }}>天</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 时间线筛选组件 */}
      <Card
        style={{
          marginBottom: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          background: '#fafafa'
        }}
        bodyStyle={{ padding: '20px' }}
      >
        <div style={{
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '4px',
              height: '20px',
              background: '#1890ff',
              borderRadius: '2px'
            }} />
            <span style={{ fontSize: '16px', fontWeight: 600, color: '#333' }}>
              事件筛选与搜索
            </span>
          </div>
          <Space>
            <Button
              type="primary"
              size="small"
              disabled={
                !timelineFilters.towns.length &&
                !timelineFilters.eventTypes.length &&
                !timelineFilters.categories.length &&
                !timelineFilters.reportTimeRange &&
                !timelineFilters.searchText.trim()
              }
              onClick={() => {
                message.success('筛选条件已应用');
              }}
            >
              应用筛选
            </Button>
            <Button onClick={clearTimelineFilters} size="small">
              清除筛选
            </Button>
            {filteredTimeline.length !== (clusterDetail?.timeline?.length || 0) && (
              <Tag color="blue" style={{ margin: 0 }}>
                显示 {filteredTimeline.length} / {clusterDetail?.timeline?.length || 0}
              </Tag>
            )}
          </Space>
        </div>

        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} md={6}>
            <div style={{ marginBottom: 6, fontSize: '13px', color: '#666', fontWeight: 500 }}>街镇</div>
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
            <div style={{ marginBottom: 6, fontSize: '13px', color: '#666', fontWeight: 500 }}>事件类型</div>
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
            <div style={{ marginBottom: 6, fontSize: '13px', color: '#666', fontWeight: 500 }}>二级分类</div>
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
            <div style={{ marginBottom: 6, fontSize: '13px', color: '#666', fontWeight: 500 }}>上报时间</div>
            <DatePicker.RangePicker
              value={timelineFilters.reportTimeRange}
              onChange={(dates) => handleTimelineFilterChange('reportTimeRange', dates)}
              style={{ width: '100%' }}
              placeholder={['开始', '结束']}
              showTime
              format="YYYY-MM-DD HH:mm"
            />
          </Col>
          <Col xs={24}>
            <div style={{ marginBottom: 6, fontSize: '13px', color: '#666', fontWeight: 500 }}>搜索事件描述/处置结果</div>
            <Input.Search
              placeholder="输入关键词搜索事件描述或处置结果..."
              value={timelineFilters.searchText}
              onChange={(e) => handleTimelineFilterChange('searchText', e.target.value)}
              onSearch={() => {
                if (timelineFilters.searchText.trim()) {
                  message.success('搜索条件已应用');
                }
              }}
              allowClear
              size="large"
              style={{ width: '100%' }}
            />
          </Col>
        </Row>
      </Card>

      {/* 事件时间线 */}
      <Card
        style={{
          marginBottom: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}
        bodyStyle={{ padding: '24px' }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '2px solid #f0f0f0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '4px',
                height: '24px',
                background: '#1890ff',
                borderRadius: '2px'
              }} />
              <span style={{ fontSize: '18px', fontWeight: 600, color: '#333' }}>
                <CalendarOutlined style={{ marginRight: '8px' }} />
                事件时间线
              </span>
            </div>
            {editMode && <Tag color="orange" style={{ fontSize: '13px', padding: '2px 10px' }}>编辑模式</Tag>}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              background: '#f0f0f0',
              borderRadius: '6px'
            }}>
              <span style={{ fontSize: '13px', color: '#666', fontWeight: 500 }}>事件去重</span>
              <Switch
                checked={dedupEnabled}
                onChange={setDedupEnabled}
                size="small"
              />
            </div>
          </div>

          <Space wrap>
            <Button
              type={editMode ? "default" : "primary"}
              icon={<EditOutlined />}
              onClick={() => setEditMode(!editMode)}
            >
              {editMode ? '退出编辑' : '编辑Cluster'}
            </Button>

            {editMode && (
              <>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setAddEventModalVisible(true)}
                >
                  添加事件
                </Button>

                {operations.length > 0 && (
                  <Button
                    icon={<UndoOutlined />}
                    onClick={() => undoOperation(operations[0].id)}
                    loading={editLoading}
                  >
                    撤销上次操作
                  </Button>
                )}
              </>
            )}
          </Space>
        </div>

        {filteredTimeline.length > 0 ? (
          <div style={{
            background: '#fff',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #f0f0f0'
          }}>
            <Timeline
              items={buildTimelineItems()}
              mode="left"
            />
          </div>
        ) : (
          <Alert
            message={clusterDetail?.timeline?.length > 0 ? "没有符合筛选条件的事件" : "暂无时间线数据"}
            description={clusterDetail?.timeline?.length > 0 ? "请调整筛选条件或清除筛选以查看更多事件" : "此聚类事件暂无时间线数据"}
            type="info"
            showIcon
            style={{
              borderRadius: '8px',
              border: '1px solid #91d5ff'
            }}
          />
        )}
      </Card>

      {/* 操作历史 */}
      {editMode && operations.length > 0 && (
        <Card
          style={{
            marginBottom: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
          }}
          bodyStyle={{ padding: '24px' }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '20px',
            paddingBottom: '16px',
            borderBottom: '2px solid #f0f0f0'
          }}>
            <div style={{
              width: '4px',
              height: '24px',
              background: '#fa8c16',
              borderRadius: '2px'
            }} />
            <span style={{ fontSize: '18px', fontWeight: 600, color: '#333' }}>
              <ClockCircleOutlined style={{ marginRight: '8px', color: '#fa8c16' }} />
              操作历史
            </span>
            <Tag color="orange" style={{ marginLeft: '8px' }}>
              共 {operations.length} 条记录
            </Tag>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {operations.map((record, index) => (
              <div
                key={record.id}
                style={{
                  background: index % 2 === 0 ? '#fafafa' : '#fff',
                  padding: '16px 20px',
                  borderRadius: '8px',
                  border: '1px solid #f0f0f0',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  flexWrap: 'wrap'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                  e.currentTarget.style.borderColor = '#d9d9d9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = '#f0f0f0';
                }}
              >
                {/* 操作类型 */}
                <div style={{ minWidth: '80px' }}>
                  <Tag
                    color={record.type === '删除' ? 'error' : record.type === '添加' ? 'success' : 'processing'}
                    style={{
                      fontSize: '13px',
                      padding: '4px 12px',
                      borderRadius: '6px',
                      fontWeight: 500
                    }}
                  >
                    {record.type}
                  </Tag>
                </div>

                {/* 事件ID */}
                <div style={{ minWidth: '150px' }}>
                  <div style={{ fontSize: '12px', color: '#999', marginBottom: '2px' }}>事件ID</div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#1890ff',
                    fontFamily: 'monospace'
                  }}>
                    {record.eventId}
                  </div>
                </div>

                {/* 操作时间 */}
                <div style={{ flex: '1 1 180px' }}>
                  <div style={{ fontSize: '12px', color: '#999', marginBottom: '2px' }}>操作时间</div>
                  <div style={{ fontSize: '13px', color: '#666', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ClockCircleOutlined style={{ fontSize: '12px' }} />
                    {record.timestamp}
                  </div>
                </div>

                {/* 描述 */}
                <div style={{ flex: '2 1 200px' }}>
                  <div style={{ fontSize: '12px', color: '#999', marginBottom: '2px' }}>操作描述</div>
                  <div style={{ fontSize: '13px', color: '#333', lineHeight: '1.5' }}>
                    {record.description}
                  </div>
                </div>

                {/* 撤销按钮 */}
                <div style={{ marginLeft: 'auto' }}>
                  <Button
                    type="primary"
                    danger
                    ghost
                    icon={<UndoOutlined />}
                    onClick={() => undoOperation(record.id)}
                    loading={editLoading}
                    style={{
                      borderRadius: '6px',
                      fontWeight: 500
                    }}
                  >
                    撤销操作
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}



      {/* 重复事件详情模态框 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CopyOutlined style={{ color: '#fa8c16' }} />
            <span>重复事件详情</span>
          </div>
        }
        open={duplicateDetailVisible}
        onCancel={() => {
          setDuplicateDetailVisible(false);
          setSelectedDuplicateGroup(null);
        }}
        footer={[
          <Button key="close" type="primary" onClick={() => setDuplicateDetailVisible(false)}>
            关闭
          </Button>
        ]}
        width={1000}
      >
        {selectedDuplicateGroup && (
          <div>
            <Alert
              message={`找到 ${selectedDuplicateGroup.length} 个描述相同的重复事件`}
              description="以下事件具有相同的事件描述，已自动合并显示。点击事件编号可查看详情。"
              type="info"
              showIcon
              style={{ marginBottom: 20 }}
            />

            {/* 事件描述卡片 */}
            <Card
              title={<span style={{ fontSize: '14px', fontWeight: 'bold' }}>共同描述</span>}
              size="small"
              style={{ marginBottom: 16, backgroundColor: '#fafafa' }}
            >
              <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#333' }}>
                {selectedDuplicateGroup[0]?.事件描述 || '无描述'}
              </div>
            </Card>

            {/* 事件列表 */}
            <div style={{ marginBottom: 8, fontWeight: 'bold', color: '#666' }}>
              重复事件列表 ({selectedDuplicateGroup.length} 个)
            </div>

            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {selectedDuplicateGroup.map((event, index) => (
                <Card
                  key={event.事件编号}
                  size="small"
                  style={{
                    marginBottom: 12,
                    border: index === 0 ? '2px solid #1890ff' : '1px solid #d9d9d9',
                    backgroundColor: index === 0 ? '#e6f7ff' : '#fff'
                  }}
                  title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Button
                          type="link"
                          icon={<EyeOutlined />}
                          onClick={() => handleViewEvent(event.事件编号)}
                          style={{ padding: 0, height: 'auto', fontSize: '14px', fontWeight: 'bold' }}
                        >
                          {event.事件编号}
                        </Button>
                        {index === 0 && (
                          <Tag color="blue" size="small">代表事件</Tag>
                        )}
                        <Tag
                          color={event.办结时间 ? 'green' : 'orange'}
                          size="small"
                        >
                          {event.办结时间 ? '已办结' : '处理中'}
                        </Tag>
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {formatTime(event.上报时间)}
                      </div>
                    </div>
                  }
                  extra={null}
                >
                  <Row gutter={16}>
                    <Col span={8}>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: 4 }}>镇街名称</div>
                      <div style={{ fontSize: '13px', fontWeight: '500' }}>{event.镇街名称 || '-'}</div>
                    </Col>
                    <Col span={8}>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: 4 }}>事件级别</div>
                      <div style={{ fontSize: '13px', fontWeight: '500' }}>{event.事件级别 || '-'}</div>
                    </Col>
                    <Col span={8}>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: 4 }}>二级分类</div>
                      <div style={{ fontSize: '13px', fontWeight: '500' }}>{event.二级分类 || '-'}</div>
                    </Col>
                  </Row>

                  {(event.报警人信息 || event.当事人信息 || event.处置结果) && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
                      {event.报警人信息 && (
                        <div style={{ fontSize: '12px', marginBottom: 4 }}>
                          <span style={{ color: '#1890ff', fontWeight: 'bold' }}>报警人：</span>
                          <span style={{ color: '#666' }}>{event.报警人信息}</span>
                        </div>
                      )}
                      {event.当事人信息 && (
                        <div style={{ fontSize: '12px', marginBottom: 4 }}>
                          <span style={{ color: '#fa8c16', fontWeight: 'bold' }}>当事人：</span>
                          <span style={{ color: '#666' }}>{event.当事人信息}</span>
                        </div>
                      )}
                      {event.处置结果 && (
                        <div style={{ fontSize: '12px', marginBottom: 4 }}>
                          <span style={{ color: '#52c41a', fontWeight: 'bold' }}>处置结果：</span>
                          <span style={{ color: '#666' }}>{event.处置结果}</span>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* 添加事件模态框 */}
      <Modal
        title="添加事件到Cluster"
        open={addEventModalVisible}
        onOk={handleAddEvent}
        onCancel={() => {
          setAddEventModalVisible(false);
          addEventForm.resetFields();
        }}
        confirmLoading={editLoading}
        width={600}
      >
        <Form
          form={addEventForm}
          layout="vertical"
        >
          <Form.Item
            name="event_id"
            label="事件ID"
            rules={[{ required: true, message: '请输入事件ID' }]}
          >
            <Input placeholder="请输入要添加的事件ID" />
          </Form.Item>
          
          <Form.Item
            name="target_cluster"
            label="目标Cluster"
            initialValue={eventUID}
            rules={[{ required: true, message: '请选择目标cluster' }]}
          >
            <Select placeholder="请选择目标cluster">
              {availableClusters.map(cluster => (
                <Select.Option key={cluster.EventUID} value={cluster.EventUID}>
                  {cluster.EventUID} - {cluster.cluster_description}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
        
        <Alert
          message="提示"
          description="如果事件当前属于其他cluster，系统会先显示确认对话框，告知事件的当前归属信息。"
          type="info"
          showIcon
          style={{ marginTop: 16 }}
        />
      </Modal>
    </div>
  );
};

export default ClusterDetail; 