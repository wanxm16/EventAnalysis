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
  Typography,
  Drawer,
  Form,
  Input,
  Table,
  Modal,
  Divider
} from 'antd';
import {
  ArrowLeftOutlined,
  ClusterOutlined,
  CalendarOutlined,
  SearchOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { eventAPI } from '../services/api';

const { Title, Text } = Typography;

const EventDetail = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

  // 获取事件详情
  const fetchEventDetail = async () => {
    try {
      setLoading(true);
      const detail = await eventAPI.getEventDetail(eventId);
      setEvent(detail);
    } catch (error) {
      console.error('获取事件详情失败:', error);
      setError(error.message);
      message.error('获取事件详情失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) {
      fetchEventDetail();
    }
  }, [eventId]);
  
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
    if (!callerInfo) return [];
    
    const callers = callerInfo.split(';').map(caller => caller.trim());
    return callers.map(caller => {
      const parts = caller.split('|').map(part => part.trim());
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
    });
  };
  
  // 解析当事人信息（包含角色信息）
  const parseInvolvedPartiesInfo = (partiesInfo) => {
    if (!partiesInfo) return [];
    
    const parties = partiesInfo.split(';').map(party => party.trim());
    return parties.map(party => {
      const parts = party.split('|').map(part => part.trim());
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
    });
  };
  
  // 打开搜索抽屉 - 支持报警人和当事人
  const openSearchDrawer = (personInfo, personType = 'caller') => {
    let personData = {};
    
    if (personType === 'caller') {
      personData = parseCallerInfo(personInfo)[0] || {};
    } else if (personType === 'party') {
      // 如果是当事人信息，personInfo应该是单个当事人的信息
      personData = personInfo || {};
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
  
  // 渲染报警人信息（带搜索按钮）
  const renderCallerInfo = (callerInfo) => {
    if (!callerInfo) return '-';
    
    const callers = parseCallerInfo(callerInfo);
    
    return (
      <div>
        {callers.map((caller, index) => (
          <div key={index} style={{ marginBottom: index < callers.length - 1 ? 8 : 0 }}>
            <span style={{ lineHeight: '1.5' }}>
              {Object.entries(caller).map(([key, value]) => {
                const labels = { name: '姓名', phone: '电话', idCard: '身份证' };
                return `${labels[key]}: ${value}`;
              }).join(' | ')}
            </span>
            <Button
              type="link"
              size="small"
              icon={<SearchOutlined />}
              onClick={() => openSearchDrawer(callerInfo, 'caller')}
              style={{ marginLeft: 8 }}
            >
              搜索
            </Button>
          </div>
        ))}
      </div>
    );
  };
  
  // 渲染当事人信息（带搜索按钮）
  const renderInvolvedPartiesInfo = (partiesInfo) => {
    if (!partiesInfo) return '-';
    
    const parties = parseInvolvedPartiesInfo(partiesInfo);
    
    return (
      <div>
        {parties.map((party, index) => (
          <div key={index} style={{ marginBottom: index < parties.length - 1 ? 8 : 0 }}>
            <span style={{ lineHeight: '1.5' }}>
              {Object.entries(party).map(([key, value]) => {
                const labels = { role: '角色', name: '姓名', phone: '电话', idCard: '身份证' };
                return `${labels[key]}: ${value}`;
              }).join(' | ')}
            </span>
            <Button
              type="link"
              size="small"
              icon={<SearchOutlined />}
              onClick={() => openSearchDrawer(party, 'party')}
              style={{ marginLeft: 8 }}
            >
              搜索
            </Button>
          </div>
        ))}
      </div>
    );
  };
  
  // 搜索结果表格列配置
  const searchColumns = [
    {
      title: '姓名',
      dataIndex: 'name_cn',
      key: 'name_cn',
      width: 100,
    },
    {
      title: '身份证号码',
      dataIndex: 'id_card_no',
      key: 'id_card_no',
      width: 150,
    },
    {
      title: '电话号码',
      dataIndex: 'mobile_phone',
      key: 'mobile_phone',
      width: 130,
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
  ];

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
    if (event?.EventUID) {
      navigate(`/clusters/${event.EventUID}`);
    }
  };

  // 返回列表
  const handleBack = () => {
    navigate('/events');
  };

  if (loading) {
    return (
      <div className="page-container" style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>加载事件详情中...</div>
      </div>
    );
  }

  if (!event) {
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
      {event.related_events_count > 0 && (
        <Alert
          message="聚类事件提醒"
          description={
            <Space>
              <span>
                该事件属于聚类事件，还有 {event.related_events_count} 个相关事件。
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
            <strong>{event.事件编号}</strong>
          </Descriptions.Item>
          
          <Descriptions.Item label="事件描述" span={2}>
            {event.事件描述}
          </Descriptions.Item>
          
          <Descriptions.Item label="镇街名称">
            {event.镇街名称}
          </Descriptions.Item>
          
          <Descriptions.Item label="村社名称">
            {event.村社名称 || '-'}
          </Descriptions.Item>
          
          <Descriptions.Item label="事件级别">
            <Tag color={getLevelColor(event.事件级别)}>
              {event.事件级别}
            </Tag>
          </Descriptions.Item>
          
          <Descriptions.Item label="二级分类">
            <Tag>{event.二级分类}</Tag>
          </Descriptions.Item>
          
          <Descriptions.Item label="上报时间">
            {formatTime(event.上报时间)}
          </Descriptions.Item>
          
          <Descriptions.Item label="办结时间">
            {formatTime(event.办结时间)}
          </Descriptions.Item>
          
          <Descriptions.Item label="处置结果" span={2}>
            {event.处置结果 || '-'}
          </Descriptions.Item>
          
          <Descriptions.Item label="报警人信息" span={2}>
            {renderCallerInfo(event.报警人信息)}
          </Descriptions.Item>
          
          <Descriptions.Item label="当事人信息" span={2}>
            {renderInvolvedPartiesInfo(event.当事人信息)}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 聚类信息 */}
      {event.EventUID && event.related_events_count > 0 && (
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
                <code>{event.EventUID}</code>
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
              {event.sequence_total} 个事件
            </Descriptions.Item>
            
            <Descriptions.Item label="相关事件数量">
              {event.related_events_count} 个相关事件
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
          {event.EventUID && event.related_events_count > 0 && (
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

      {/* 搜索抽屉 */}
      <Drawer
        title="搜索人员"
        width={500}
        open={searchDrawerVisible}
        onClose={() => {
          setSearchDrawerVisible(false);
          searchForm.resetFields();
        }}
      >
        <Form
          form={searchForm}
          layout="vertical"
          onFinish={handleSearch}
        >
          <Form.Item
            label="姓名"
            name="name"
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="电话"
            name="phone"
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="身份证号码"
            name="id_card"
          >
            <Input />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={searchLoading}>
              搜索
            </Button>
          </Form.Item>
        </Form>

        {searchLoading && (
          <div style={{ marginTop: 16 }}>
            <Spin />
          </div>
        )}

        {searchResults.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <Table
              columns={searchColumns}
              dataSource={searchResults}
              rowKey="person_id"
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                total: pagination.total,
                onChange: handleTableChange
              }}
            />
          </div>
        )}
      </Drawer>

      {/* 人员详情弹窗 */}
      {personDetailVisible && selectedPerson && (
        <Modal
          title="人员详情"
          open={personDetailVisible}
          onCancel={() => setPersonDetailVisible(false)}
          footer={null}
        >
          <Descriptions column={1} bordered>
            <Descriptions.Item label="人员ID">
              {selectedPerson.person_id}
            </Descriptions.Item>
            <Descriptions.Item label="姓名">
              {selectedPerson.name_cn}
            </Descriptions.Item>
            <Descriptions.Item label="身份证号码">
              {selectedPerson.id_card_no}
            </Descriptions.Item>
            <Descriptions.Item label="手机号码">
              {selectedPerson.mobile_phone}
            </Descriptions.Item>
            <Descriptions.Item label="性别">
              {selectedPerson.gender || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="出生日期">
              {selectedPerson.birth_date || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="户口省份">
              {selectedPerson.hukou_province || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="户口城市">
              {selectedPerson.hukou_city || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="户口县区">
              {selectedPerson.hukou_county || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="居住省份">
              {selectedPerson.reside_province || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="居住城市">
              {selectedPerson.reside_city || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="居住县区">
              {selectedPerson.reside_county || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="最高学历">
              {selectedPerson.highest_education || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="雇主名称">
              {selectedPerson.employer_name || '-'}
            </Descriptions.Item>
          </Descriptions>
        </Modal>
      )}
    </div>
  );
};

export default EventDetail; 