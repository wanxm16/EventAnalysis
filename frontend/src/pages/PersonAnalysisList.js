import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Card, 
  Input, 
  Select, 
  Button, 
  Space, 
  Pagination, 
  message, 
  Typography, 
  Tag,
  Drawer,
  Form,
  Modal,
  Descriptions,
  Row,
  Col,
} from 'antd';
import { SearchOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const { Title } = Typography;
const { Option } = Select;

const PersonAnalysisList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchText, setSearchText] = useState('');
  const [selectedRole, setSelectedRole] = useState(null);
  const [roles, setRoles] = useState([]);

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

  // 获取角色选项
  const fetchRoles = async () => {
    try {
      const response = await api.get('/person-analysis/roles');
      setRoles(response || []);
    } catch (error) {
      console.error('获取角色选项失败:', error);
    }
  };

  // 获取人员分析数据
  const fetchData = async (page = currentPage, size = pageSize, search = searchText, role = selectedRole) => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: size,
      };
      if (search) params.search = search;
      if (role) params.role = role;

      const response = await api.get('/person-analysis', { params });
      setData(response.items || []);
      setTotal(response.total || 0);
      setCurrentPage(response.page || 1);
    } catch (error) {
      console.error('获取人员分析数据失败:', error);
      message.error('获取人员分析数据失败');
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

  // 打开搜索抽屉
  const openSearchDrawer = (record) => {
    const searchData = {
      name: record.name || '',
      phone: record.phone || '',
      id_card: record.id_card || ''
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

  // 初始化数据
  useEffect(() => {
    fetchRoles();
    fetchData();
  }, []);

  // 处理搜索
  const handleDataSearch = () => {
    setCurrentPage(1);
    fetchData(1, pageSize, searchText, selectedRole);
  };

  // 处理重置
  const handleReset = () => {
    setSearchText('');
    setSelectedRole(null);
    setCurrentPage(1);
    fetchData(1, pageSize, '', null);
  };

  // 处理分页变化
  const handlePageChange = (page, size) => {
    setCurrentPage(page);
    setPageSize(size);
    fetchData(page, size, searchText, selectedRole);
  };

  // 查看详情
  const handleViewDetail = (phone) => {
    navigate(`/person-analysis/${encodeURIComponent(phone)}`);
  };

  // 表格列配置
  const columns = [
    {
      title: '手机号码',
      dataIndex: 'phone',
      key: 'phone',
      width: 150,
      render: (text) => (
        <span style={{ fontFamily: 'monospace' }}>{text || '-'}</span>
      ),
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 120,
      render: (text) => text || '-',
    },
    {
      title: '身份证号码',
      dataIndex: 'id_card',
      key: 'id_card',
      width: 180,
      render: (text) => (
        <span style={{ fontFamily: 'monospace' }}>{text || '-'}</span>
      ),
    },
    {
      title: '主要角色',
      dataIndex: 'primary_role',
      key: 'primary_role',
      width: 100,
      render: (text) => {
        if (!text) return '-';
        let color = 'default';
        if (text === '报警人') color = 'blue';
        else if (text === '对方') color = 'orange';
        else if (text === '当事人') color = 'green';
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '事件总数',
      dataIndex: 'event_count',
      key: 'event_count',
      width: 100,
      align: 'center',
      sorter: (a, b) => a.event_count - b.event_count,
      render: (text) => (
        <span style={{ fontWeight: 'bold', color: '#1890ff' }}>{text}</span>
      ),
    },
    {
      title: '姓名候选',
      dataIndex: 'name_candidates',
      key: 'name_candidates',
      width: 200,
      ellipsis: true,
      render: (text) => text || '-',
    },
    {
      title: '身份证候选',
      dataIndex: 'id_candidates',
      key: 'id_candidates',
      width: 200,
      ellipsis: true,
      render: (text) => text || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => handleViewDetail(record.phone)}
          >
            查看详情
          </Button>
          <Button
            type="default"
            icon={<SearchOutlined />}
            size="small"
            onClick={() => openSearchDrawer(record)}
            title="搜索人口库"
          >
            人口搜索
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ marginBottom: '16px' }}>
          <Title level={3}>人员分析</Title>
          <p style={{ color: '#666', marginBottom: '24px' }}>
            从人的角度分析人员与事件之间的关联关系，按事件总数倒序排列
          </p>
        </div>

        {/* 搜索和筛选 */}
        <div style={{ marginBottom: '16px' }}>
          <Space wrap>
            <Input
              placeholder="搜索姓名或手机号"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={handleDataSearch}
              style={{ width: 200 }}
              allowClear
            />
            <Select
              placeholder="选择角色"
              value={selectedRole}
              onChange={setSelectedRole}
              style={{ width: 120 }}
              allowClear
            >
              {roles.map(role => (
                <Option key={role} value={role}>{role}</Option>
              ))}
            </Select>
            <Button type="primary" icon={<SearchOutlined />} onClick={handleDataSearch}>
              搜索
            </Button>
            <Button onClick={handleReset}>重置</Button>
          </Space>
        </div>

        {/* 数据表格 */}
        <Table
          columns={columns}
          dataSource={data}
          rowKey="phone"
          loading={loading}
          pagination={false}
          scroll={{ x: 1200 }}
          size="middle"
        />

        {/* 分页 */}
        {total > 0 && (
          <div style={{ marginTop: '16px', textAlign: 'right' }}>
            <Pagination
              current={currentPage}
              total={total}
              pageSize={pageSize}
              showSizeChanger
              showQuickJumper
              showTotal={(total, range) => 
                `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`
              }
              onChange={handlePageChange}
              onShowSizeChange={handlePageChange}
              pageSizeOptions={['10', '20', '50', '100']}
            />
          </div>
        )}
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

export default PersonAnalysisList; 