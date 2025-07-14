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
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { eventAPI } from '../services/api';

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

  // 加载聚类事件详情
  const loadClusterDetail = async () => {
    setLoading(true);
    try {
      const detail = await eventAPI.getClusterDetail(eventUID);
      setClusterDetail(detail);
    } catch (error) {
      message.error('加载聚类事件详情失败: ' + error.message);
    } finally {
      setLoading(false);
    }
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
    if (!clusterDetail?.timeline) return [];
    
    return clusterDetail.timeline.map((item, index) => ({
      key: index,
      dot: item.办结时间 ? (
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
                onClick={() => handleViewEvent(item.事件编号)}
              >
                {item.事件编号}
              </strong>
              <Tag 
                color={item.办结时间 ? 'green' : 'blue'} 
                style={{ marginLeft: 8 }}
              >
                {item.办结时间 ? '已办结' : '处理中'}
              </Tag>
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
                      style={{ marginLeft: 8 }}
                      loading={editLoading}
                    />
                  </Popconfirm>
                </Tooltip>
              )}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {formatShortTime(item.上报时间)}
            </div>
          </div>
          
          <div style={{ marginBottom: 8, lineHeight: '1.5' }}>
            {item.事件描述}
          </div>
          
          {/* 报警人信息 */}
          {item.报警人信息 && (
            <div style={{ fontSize: '12px', color: '#666', padding: '4px 8px', background: '#e6f7ff', borderRadius: '4px', marginBottom: 4 }}>
              <strong style={{ color: '#1890ff' }}>报警人:</strong> {item.报警人信息}
            </div>
          )}
          
          {/* 当事人信息 */}
          {item.当事人信息 && (
            <div style={{ fontSize: '12px', color: '#666', padding: '4px 8px', background: '#fff7e6', borderRadius: '4px', marginBottom: 4 }}>
              <strong style={{ color: '#fa8c16' }}>当事人:</strong> {item.当事人信息}
            </div>
          )}
          
          {item.处置结果 && (
            <div style={{ fontSize: '12px', color: '#666', padding: '4px 8px', background: '#f5f5f5', borderRadius: '4px' }}>
              <strong>处置结果:</strong> {item.处置结果}
            </div>
          )}
          
          {item.办结时间 && (
            <div style={{ fontSize: '12px', color: '#52c41a', marginTop: 4 }}>
              办结时间: {formatShortTime(item.办结时间)}
            </div>
          )}
        </div>
      ),
    }));
  };

  useEffect(() => {
    if (eventUID) {
      loadClusterDetail();
      loadAvailableClusters();
      loadOperations();
    }
  }, [eventUID]);

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
      <div className="page-header">
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={handleBack}
          >
            返回列表
          </Button>
          <h1 className="page-title">聚类事件详情</h1>
        </Space>
      </div>

      {/* 基本信息 */}
      <Card
        title={
          <Space>
            <ClusterOutlined />
            聚类事件基本信息
          </Space>
        }
        className="detail-card"
      >
        <Descriptions column={1} bordered>
          <Descriptions.Item label="聚类事件ID">
            <code style={{ fontSize: '16px', fontWeight: 'bold' }}>
              {clusterDetail.EventUID}
            </code>
          </Descriptions.Item>
          
          <Descriptions.Item label="事件描述">
            {clusterDetail.Event_description}
          </Descriptions.Item>
          
          <Descriptions.Item label="时间范围">
            <Space direction="vertical" size="small">
              <div>
                <strong>开始时间:</strong> {formatTime(clusterDetail.first_report_time)}
              </div>
              <div>
                <strong>结束时间:</strong> {formatTime(clusterDetail.last_report_time)}
              </div>
            </Space>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 统计信息 */}
      <Card
        title={
          <Space>
            <CalendarOutlined />
            统计信息
          </Space>
        }
        className="detail-card"
      >
        <Row gutter={24}>
          <Col span={6}>
            <div className="stat-item">
              <Statistic
                title="参与人数"
                value={clusterDetail.participant_count}
                prefix={<UserOutlined />}
                suffix="人"
                valueStyle={{ color: '#1890ff' }}
              />
            </div>
          </Col>
          
          <Col span={6}>
            <div className="stat-item">
              <Statistic
                title="事件总数"
                value={clusterDetail.timeline?.length || 0}
                prefix={<ClusterOutlined />}
                suffix="个"
                valueStyle={{ color: '#52c41a' }}
              />
            </div>
          </Col>
          
          <Col span={6}>
            <div className="stat-item">
              <Statistic
                title="持续时间"
                value={clusterDetail.duration_days || 0}
                prefix={<ClockCircleOutlined />}
                suffix="天"
                precision={2}
                valueStyle={{ color: '#fa8c16' }}
              />
            </div>
          </Col>
          
          <Col span={6}>
            <div className="stat-item">
              <Statistic
                title="已办结事件"
                value={clusterDetail.timeline?.filter(item => item.办结时间).length || 0}
                prefix={<CheckCircleOutlined />}
                suffix="个"
                valueStyle={{ color: '#722ed1' }}
              />
            </div>
          </Col>
        </Row>
      </Card>

      {/* 事件时间线 */}
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <CalendarOutlined />
              事件时间线
              {editMode && <Tag color="orange">编辑模式</Tag>}
            </Space>
            
            <Space>
              <Button
                type={editMode ? "default" : "primary"}
                icon={<EditOutlined />}
                onClick={() => setEditMode(!editMode)}
                size="small"
              >
                {editMode ? '退出编辑' : '编辑Cluster'}
              </Button>
              
              {editMode && (
                <>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setAddEventModalVisible(true)}
                    size="small"
                  >
                    添加事件
                  </Button>
                  
                  {operations.length > 0 && (
                    <Button
                      icon={<UndoOutlined />}
                      onClick={() => undoOperation(operations[0].id)}
                      loading={editLoading}
                      size="small"
                    >
                      撤销上次操作
                    </Button>
                  )}
                </>
              )}
            </Space>
          </div>
        }
        className="detail-card"
      >
        {clusterDetail.timeline && clusterDetail.timeline.length > 0 ? (
          <Timeline
            items={buildTimelineItems()}
            mode="left"
          />
        ) : (
          <Alert
            message="暂无时间线数据"
            type="info"
            showIcon
          />
        )}
      </Card>

      {/* 操作历史 */}
      {editMode && operations.length > 0 && (
        <Card
          title="操作历史"
          className="detail-card"
        >
          <Table
            dataSource={operations}
            columns={[
              {
                title: '操作类型',
                dataIndex: 'type',
                key: 'type',
                width: 100,
                render: (type) => (
                  <Tag color={type === '删除' ? 'red' : 'blue'}>{type}</Tag>
                )
              },
              {
                title: '事件ID',
                dataIndex: 'eventId',
                key: 'eventId',
                width: 150,
              },
              {
                title: '操作时间',
                dataIndex: 'timestamp',
                key: 'timestamp',
                width: 180,
              },
              {
                title: '描述',
                dataIndex: 'description',
                key: 'description',
              },
              {
                title: '操作',
                key: 'action',
                width: 100,
                render: (_, record) => (
                  <Button
                    size="small"
                    icon={<UndoOutlined />}
                    onClick={() => undoOperation(record.id)}
                    loading={editLoading}
                  >
                    撤销
                  </Button>
                )
              }
            ]}
            pagination={false}
            size="small"
            rowKey="id"
          />
        </Card>
      )}



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