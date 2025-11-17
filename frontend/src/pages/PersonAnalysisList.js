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
  const [selectedTags, setSelectedTags] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);


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
  const fetchData = async (page = currentPage, size = pageSize, search = searchText, role = selectedRole, tags = selectedTags) => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: size,
      };
      if (search) params.search = search;
      if (role) params.role = role;
      if (tags && tags.length > 0) params.tags = tags.join(',');

      const response = await api.get('/person-analysis', { params });
      setData(response.items || []);
      setTotal(response.total || 0);
      setCurrentPage(response.page || 1);

      // 提取所有可用标签
      if (response.items && page === 1) {
        const allTags = new Set();
        response.items.forEach(item => {
          if (item.population_tags && Array.isArray(item.population_tags)) {
            item.population_tags.forEach(tag => allTags.add(tag));
          }
        });
        setAvailableTags(Array.from(allTags).sort());
      }
    } catch (error) {
      console.error('获取人员分析数据失败:', error);
      message.error('获取人员分析数据失败');
    } finally {
      setLoading(false);
    }
  };


  // 初始化数据
  useEffect(() => {
    fetchRoles();
    fetchData();
  }, []);

  // 处理搜索
  const handleDataSearch = () => {
    setCurrentPage(1);
    fetchData(1, pageSize, searchText, selectedRole, selectedTags);
  };

  // 处理重置
  const handleReset = () => {
    setSearchText('');
    setSelectedRole(null);
    setSelectedTags([]);
    setCurrentPage(1);
    fetchData(1, pageSize, '', null, []);
  };

  // 处理分页变化
  const handlePageChange = (page, size) => {
    setCurrentPage(page);
    setPageSize(size);
    fetchData(page, size, searchText, selectedRole, selectedTags);
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
      title: '人口标签',
      dataIndex: 'population_tags',
      key: 'population_tags',
      width: 200,
      render: (tags) => {
        if (!tags || !Array.isArray(tags) || tags.length === 0) {
          return <span style={{ color: '#999' }}>-</span>;
        }
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {tags.map((tag, index) => (
              <Tag key={index} color="blue" style={{ fontSize: '11px', margin: 0 }}>
                {tag}
              </Tag>
            ))}
          </div>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <Button
          type="primary"
          icon={<EyeOutlined />}
          size="small"
          onClick={() => handleViewDetail(record.phone)}
        >
          查看详情
        </Button>
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
            <Select
              mode="multiple"
              placeholder="选择人口标签"
              value={selectedTags}
              onChange={setSelectedTags}
              style={{ width: 200 }}
              allowClear
              maxTagCount="responsive"
            >
              {availableTags.map(tag => (
                <Option key={tag} value={tag}>{tag}</Option>
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

    </div>
  );
};

export default PersonAnalysisList; 