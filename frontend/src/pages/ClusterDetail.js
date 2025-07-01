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
  Divider,
  Drawer,
  Form,
  Input,
  Table,
  Modal,
} from 'antd';
import {
  ArrowLeftOutlined,
  ClusterOutlined,
  CalendarOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  SearchOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { eventAPI } from '../services/api';

const ClusterDetail = () => {
  const { eventUID } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [clusterDetail, setClusterDetail] = useState(null);
  
  // 人口搜索相关状态
  const [searchDrawerVisible, setSearchDrawerVisible] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [personDetailVisible, setPersonDetailVisible] = useState(false);
  const [searchForm] = Form.useForm();
  
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

  // 人口搜索API调用
  const searchPeople = async (searchData, page = 1) => {
    try {
      setSearchLoading(true);
      const response = await fetch('http://localhost:8000/api/people/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...searchData,
          page,
          page_size: pagination.pageSize
        })
      });
      
      if (!response.ok) {
        throw new Error('搜索失败');
      }
      
      const data = await response.json();
      setSearchResults(data.items);
      setPagination({
        ...pagination,
        current: data.page,
        total: data.total
      });
    } catch (error) {
      message.error('搜索失败: ' + error.message);
    } finally {
      setSearchLoading(false);
    }
  };
  
  // 获取人员详情
  const fetchPersonDetail = async (personId) => {
    try {
      const response = await fetch(`http://localhost:8000/api/people/${personId}`);
      if (!response.ok) {
        throw new Error('获取人员详情失败');
      }
      const data = await response.json();
      setSelectedPerson(data);
      setPersonDetailVisible(true);
    } catch (error) {
      message.error('获取人员详情失败: ' + error.message);
    }
  };
  
  // 解析报警人信息
  const parseCallerInfo = (callerInfo) => {
    if (!callerInfo) return {};
    
    const parts = callerInfo.split('|').map(part => part.trim());
    const info = {};
    
    parts.forEach(part => {
      if (part.includes('姓名:')) {
        info.name = part.split('姓名:')[1].trim();
      } else if (part.includes('电话:')) {
        info.phone = part.split('电话:')[1].trim();
      } else if (part.includes('身份证:')) {
        info.idCard = part.split('身份证:')[1].trim();
      }
    });
    
    return info;
  };
  
  // 解析当事人信息
  const parseInvolvedPartiesInfo = (partiesInfo) => {
    if (!partiesInfo) return {};
    
    const parts = partiesInfo.split('|').map(part => part.trim());
    const info = {};
    
    parts.forEach(part => {
      if (part.includes('角色:')) {
        info.role = part.split('角色:')[1].trim();
      } else if (part.includes('姓名:')) {
        info.name = part.split('姓名:')[1].trim();
      } else if (part.includes('电话:')) {
        info.phone = part.split('电话:')[1].trim();
      } else if (part.includes('身份证:')) {
        info.idCard = part.split('身份证:')[1].trim();
      }
    });
    
    return info;
  };
  
  // 打开搜索抽屉
  const openSearchDrawer = (personInfo, personType = 'caller') => {
    let personData = {};
    
    if (personType === 'caller') {
      personData = parseCallerInfo(personInfo);
    } else if (personType === 'party') {
      personData = parseInvolvedPartiesInfo(personInfo);
    }
    
    const searchData = {
      name: personData.name || '',
      phone: personData.phone || '',
      id_card: personData.idCard || ''
    };
    
    searchForm.setFieldsValue(searchData);
    setSearchDrawerVisible(true);
    setSearchResults([]);
    
    // 自动触发搜索
    if (searchData.name || searchData.phone || searchData.id_card) {
      searchPeople(searchData);
    }
  };
  
  // 执行搜索
  const handleSearch = () => {
    const searchData = searchForm.getFieldsValue();
    searchPeople(searchData);
  };
  
  // 分页处理
  const handleTableChange = (page) => {
    const searchData = searchForm.getFieldsValue();
    searchPeople(searchData, page.current);
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
            <div style={{ fontSize: '12px', color: '#666', padding: '4px 8px', background: '#e6f7ff', borderRadius: '4px', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <strong style={{ color: '#1890ff' }}>报警人:</strong> {item.报警人信息}
              </div>
              <Button
                type="link"
                size="small"
                icon={<SearchOutlined />}
                onClick={() => openSearchDrawer(item.报警人信息, 'caller')}
                style={{ padding: '0 4px', height: 'auto', minWidth: 'auto' }}
                title="搜索报警人信息"
              >
                搜索
              </Button>
            </div>
          )}
          
          {/* 当事人信息 */}
          {item.当事人信息 && (
            <div style={{ fontSize: '12px', color: '#666', padding: '4px 8px', background: '#fff7e6', borderRadius: '4px', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <strong style={{ color: '#fa8c16' }}>当事人:</strong> {item.当事人信息}
              </div>
              <Button
                type="link"
                size="small"
                icon={<SearchOutlined />}
                onClick={() => openSearchDrawer(item.当事人信息, 'party')}
                style={{ padding: '0 4px', height: 'auto', minWidth: 'auto' }}
                title="搜索当事人信息"
              >
                搜索
              </Button>
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
          <Space>
            <CalendarOutlined />
            事件时间线
          </Space>
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

      {/* 操作按钮 */}
      <Card>
        <Space>
          <Button onClick={handleBack}>
            返回列表
          </Button>
          <Button 
            type="primary" 
            onClick={() => window.print()}
            disabled={!clusterDetail}
          >
            打印报告
          </Button>
        </Space>
      </Card>

      {/* 人口搜索抽屉 */}
      <Drawer
        title="人口信息搜索"
        placement="right"
        width={800}
        onClose={() => setSearchDrawerVisible(false)}
        open={searchDrawerVisible}
      >
        <Form
          form={searchForm}
          layout="vertical"
          style={{ marginBottom: 16 }}
        >
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="name" label="姓名">
                <Input placeholder="请输入姓名" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="phone" label="电话号码">
                <Input placeholder="请输入电话号码" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="id_card" label="身份证号">
                <Input placeholder="请输入身份证号" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item>
            <Button type="primary" onClick={handleSearch} loading={searchLoading}>
              搜索
            </Button>
          </Form.Item>
        </Form>

        <Table
          columns={[
            {
              title: '姓名',
              dataIndex: 'name_cn',
              key: 'name_cn',
              width: 120,
            },
            {
              title: '身份证号码',
              dataIndex: 'id_card_no',
              key: 'id_card_no',
              width: 180,
            },
            {
              title: '电话号码',
              dataIndex: 'mobile_phone',
              key: 'mobile_phone',
              width: 150,
            },
            {
              title: '性别',
              dataIndex: 'gender',
              key: 'gender',
              width: 80,
            },
            {
              title: '出生日期',
              dataIndex: 'birth_date',
              key: 'birth_date',
              width: 120,
            },
            {
              title: '操作',
              key: 'action',
              width: 80,
              render: (_, record) => (
                <Button
                  type="link"
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => fetchPersonDetail(record.person_id)}
                >
                  详情
                </Button>
              ),
            },
          ]}
          dataSource={searchResults}
          loading={searchLoading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          onChange={handleTableChange}
          rowKey="person_id"
          size="small"
          scroll={{ x: 700 }}
        />
      </Drawer>

      {/* 人员详情弹窗 */}
      <Modal
        title="人员详情"
        open={personDetailVisible}
        onCancel={() => setPersonDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setPersonDetailVisible(false)}>
            关闭
          </Button>
        ]}
        width={600}
      >
        {selectedPerson && (
          <Descriptions column={2} bordered>
            <Descriptions.Item label="姓名" span={2}>
              {selectedPerson.name_cn}
            </Descriptions.Item>
            <Descriptions.Item label="身份证号码" span={2}>
              {selectedPerson.id_card_no}
            </Descriptions.Item>
            <Descriptions.Item label="电话号码">
              {selectedPerson.mobile_phone}
            </Descriptions.Item>
            <Descriptions.Item label="性别">
              {selectedPerson.gender}
            </Descriptions.Item>
            <Descriptions.Item label="出生日期">
              {selectedPerson.birth_date}
            </Descriptions.Item>
            <Descriptions.Item label="人员ID">
              {selectedPerson.person_id}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default ClusterDetail; 