import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Space,
  Tag,
  Modal,
  Form,
  Select,
  Switch,
  message,
  Popconfirm,
  Row,
  Col,
  Drawer,
  Descriptions,
  Badge,
  Avatar,
  Typography,
  Collapse,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  UserOutlined,
  LockOutlined,
  EyeOutlined,
  MailOutlined,
  PhoneOutlined,
  ClockCircleOutlined,
  SafetyOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';

const { Option } = Select;
const { Title, Text } = Typography;
const { Panel } = Collapse;

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [selectedUserForDetail, setSelectedUserForDetail] = useState(null);
  const [form] = Form.useForm();

  // 模拟角色数据
  const roles = [
    { id: 1, name: '系统管理员', value: 'admin' },
    { id: 2, name: '数据分析员', value: 'analyst' },
    { id: 3, name: '普通用户', value: 'user' },
    { id: 4, name: '只读用户', value: 'viewer' },
  ];

  // 角色权限映射
  const rolePermissionsMap = {
    admin: [
      'dashboard', 'dashboard:view', 'dashboard:export',
      'events', 'events:view', 'events:create', 'events:edit', 'events:delete', 'events:export',
      'clusters', 'clusters:view', 'clusters:create', 'clusters:edit', 'clusters:delete',
      'person', 'person:view', 'person:export',
      'topics', 'topics:view', 'topics:create', 'topics:edit', 'topics:delete',
      'statistics', 'statistics:view', 'statistics:generate', 'statistics:export',
      'reports', 'reports:view', 'reports:create', 'reports:edit', 'reports:delete',
      'classification', 'classification:view', 'classification:create', 'classification:tree', 'classification:tags',
      'system', 'system:users', 'system:roles', 'system:permissions', 'system:logs', 'system:config',
    ],
    analyst: [
      'dashboard', 'dashboard:view', 'dashboard:export',
      'events', 'events:view', 'events:export',
      'clusters', 'clusters:view',
      'person', 'person:view', 'person:export',
      'topics', 'topics:view',
      'statistics', 'statistics:view', 'statistics:generate', 'statistics:export',
      'reports', 'reports:view', 'reports:create', 'reports:edit',
      'classification', 'classification:view',
    ],
    user: [
      'dashboard', 'dashboard:view',
      'events', 'events:view', 'events:create',
      'clusters', 'clusters:view',
      'person', 'person:view',
      'topics', 'topics:view',
    ],
    viewer: [
      'dashboard', 'dashboard:view',
      'events', 'events:view',
      'clusters', 'clusters:view',
      'person', 'person:view',
      'topics', 'topics:view',
      'statistics', 'statistics:view',
    ],
  };

  // 完整的权限数据结构
  const allPermissions = [
    {
      module: '首页',
      moduleKey: 'dashboard',
      icon: '🏠',
      permissions: [
        { key: 'dashboard:view', name: '查看数据总览', description: '查看首页的数据总览、图表和统计信息' },
        { key: 'dashboard:export', name: '导出报表', description: '导出首页的数据报表和图表' },
      ],
    },
    {
      module: '事件管理',
      moduleKey: 'events',
      icon: '📋',
      permissions: [
        { key: 'events:view', name: '查看事件列表', description: '查看所有事件的列表和详情' },
        { key: 'events:create', name: '创建事件', description: '创建新的事件记录' },
        { key: 'events:edit', name: '编辑事件', description: '编辑现有事件的信息' },
        { key: 'events:delete', name: '删除事件', description: '删除事件记录' },
        { key: 'events:export', name: '导出事件', description: '导出事件数据' },
      ],
    },
    {
      module: '聚合事件',
      moduleKey: 'clusters',
      icon: '🔗',
      permissions: [
        { key: 'clusters:view', name: '查看聚合列表', description: '查看聚合事件列表' },
        { key: 'clusters:create', name: '创建聚合', description: '创建新的聚合事件' },
        { key: 'clusters:edit', name: '编辑聚合', description: '编辑聚合事件信息' },
        { key: 'clusters:delete', name: '删除聚合', description: '删除聚合事件' },
      ],
    },
    {
      module: '人员分析',
      moduleKey: 'person',
      icon: '👥',
      permissions: [
        { key: 'person:view', name: '查看人员分析', description: '查看人员相关的分析数据' },
        { key: 'person:export', name: '导出分析报告', description: '导出人员分析报告' },
      ],
    },
    {
      module: '事件主题',
      moduleKey: 'topics',
      icon: '📚',
      permissions: [
        { key: 'topics:view', name: '查看主题', description: '查看事件主题列表' },
        { key: 'topics:create', name: '创建主题', description: '创建新的事件主题' },
        { key: 'topics:edit', name: '编辑主题', description: '编辑事件主题信息' },
        { key: 'topics:delete', name: '删除主题', description: '删除事件主题' },
      ],
    },
    {
      module: '统计报告',
      moduleKey: 'statistics',
      icon: '📊',
      permissions: [
        { key: 'statistics:view', name: '查看统计', description: '查看统计报告和图表' },
        { key: 'statistics:generate', name: '生成报告', description: '生成新的统计报告' },
        { key: 'statistics:export', name: '导出报告', description: '导出统计报告' },
      ],
    },
    {
      module: '月度报告',
      moduleKey: 'reports',
      icon: '📄',
      permissions: [
        { key: 'reports:view', name: '查看报告', description: '查看月度报告' },
        { key: 'reports:create', name: '创建报告', description: '创建月度报告' },
        { key: 'reports:edit', name: '编辑报告', description: '编辑月度报告' },
        { key: 'reports:delete', name: '删除报告', description: '删除月度报告' },
      ],
    },
    {
      module: '智能分类',
      moduleKey: 'classification',
      icon: '🎯',
      permissions: [
        { key: 'classification:view', name: '查看分类任务', description: '查看分类任务列表' },
        { key: 'classification:create', name: '创建分类任务', description: '创建新的分类任务' },
        { key: 'classification:tree', name: '管理分类树', description: '管理分类树结构' },
        { key: 'classification:tags', name: '管理标签', description: '管理分类标签' },
      ],
    },
    {
      module: '系统管理',
      moduleKey: 'system',
      icon: '⚙️',
      permissions: [
        { key: 'system:users', name: '用户管理', description: '管理系统用户' },
        { key: 'system:roles', name: '角色管理', description: '管理系统角色' },
        { key: 'system:permissions', name: '权限管理', description: '查看和管理权限' },
        { key: 'system:logs', name: '操作日志', description: '查看系统操作日志' },
        { key: 'system:config', name: '系统配置', description: '系统参数配置' },
      ],
    },
  ];

  // 获取角色名称
  const getRoleName = (roleValue) => {
    const role = roles.find(r => r.value === roleValue);
    return role ? role.name : roleValue;
  };

  // 获取角色颜色
  const getRoleColor = (roleValue) => {
    const colors = {
      admin: 'red',
      analyst: 'blue',
      user: 'green',
      viewer: 'default',
    };
    return colors[roleValue] || 'default';
  };

  // 计算用户权限
  const getUserPermissions = (user) => {
    if (!user || !user.roles) return [];

    const userPerms = new Set();
    user.roles.forEach(role => {
      const perms = rolePermissionsMap[role] || [];
      perms.forEach(p => userPerms.add(p));
    });

    return allPermissions.map(module => {
      const modulePerms = module.permissions.filter(p => userPerms.has(p.key));
      return {
        ...module,
        permissions: modulePerms,
        hasAccess: userPerms.has(module.moduleKey),
      };
    }).filter(m => m.permissions.length > 0 || m.hasAccess);
  };

  // 加载用户数据（模拟）
  const loadUsers = () => {
    setLoading(true);
    setTimeout(() => {
      const mockUsers = [
        {
          id: 1,
          username: 'admin',
          name: '管理员',
          email: 'admin@example.com',
          phone: '13800138000',
          roles: ['admin'],
          status: true,
          createdAt: '2025-01-01 10:00:00',
          lastLogin: '2025-12-27 09:00:00',
        },
        {
          id: 2,
          username: 'analyst1',
          name: '张分析',
          email: 'analyst1@example.com',
          phone: '13800138001',
          roles: ['analyst'],
          status: true,
          createdAt: '2025-01-05 14:30:00',
          lastLogin: '2025-12-27 08:30:00',
        },
        {
          id: 3,
          username: 'user1',
          name: '李用户',
          email: 'user1@example.com',
          phone: '13800138002',
          roles: ['user'],
          status: true,
          createdAt: '2025-01-10 09:15:00',
          lastLogin: '2025-12-26 16:45:00',
        },
        {
          id: 4,
          username: 'viewer1',
          name: '王观察',
          email: 'viewer1@example.com',
          phone: '13800138003',
          roles: ['viewer'],
          status: false,
          createdAt: '2025-01-15 11:20:00',
          lastLogin: '2025-12-20 10:00:00',
        },
      ];
      setUsers(mockUsers);
      setLoading(false);
    }, 500);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // 打开添加/编辑对话框
  const handleOpenModal = (user = null) => {
    setEditingUser(user);
    setModalVisible(true);
    if (user) {
      form.setFieldsValue(user);
    } else {
      form.resetFields();
    }
  };

  // 关闭对话框
  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingUser(null);
    form.resetFields();
  };

  // 保存用户
  const handleSaveUser = async () => {
    try {
      const values = await form.validateFields();
      console.log('保存用户:', values);

      if (editingUser) {
        // 编辑用户
        setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...values } : u));
        message.success('用户更新成功');
      } else {
        // 添加用户
        const newUser = {
          id: users.length + 1,
          ...values,
          status: true,
          createdAt: new Date().toLocaleString('zh-CN'),
          lastLogin: '-',
        };
        setUsers([...users, newUser]);
        message.success('用户添加成功');
      }
      handleCloseModal();
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 删除用户
  const handleDeleteUser = (userId) => {
    setUsers(users.filter(u => u.id !== userId));
    message.success('用户删除成功');
  };

  // 切换用户状态
  const handleToggleStatus = (userId, status) => {
    setUsers(users.map(u => u.id === userId ? { ...u, status } : u));
    message.success(`用户已${status ? '启用' : '禁用'}`);
  };

  // 重置密码
  const handleResetPassword = (user) => {
    Modal.confirm({
      title: '重置密码',
      content: `确定要重置用户 ${user.name} 的密码吗？新密码将发送至用户邮箱。`,
      onOk: () => {
        message.success('密码重置成功，新密码已发送至用户邮箱');
      },
    });
  };

  // 表格列定义
  const columns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 120,
      filteredValue: searchText ? [searchText] : null,
      onFilter: (value, record) => {
        return record.username.toLowerCase().includes(value.toLowerCase()) ||
               record.name.toLowerCase().includes(value.toLowerCase()) ||
               record.email.toLowerCase().includes(value.toLowerCase());
      },
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 100,
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 180,
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      width: 120,
    },
    {
      title: '角色',
      dataIndex: 'roles',
      key: 'roles',
      width: 150,
      render: (roles) => (
        <>
          {roles.map(role => (
            <Tag key={role} color={getRoleColor(role)}>
              {getRoleName(role)}
            </Tag>
          ))}
        </>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status, record) => (
        <Switch
          checked={status}
          onChange={(checked) => handleToggleStatus(record.id, checked)}
          checkedChildren="启用"
          unCheckedChildren="禁用"
        />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
    },
    {
      title: '最后登录',
      dataIndex: 'lastLogin',
      key: 'lastLogin',
      width: 150,
    },
    {
      title: '操作',
      key: 'action',
      width: 250,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedUserForDetail(record);
              setDetailDrawerVisible(true);
            }}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenModal(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            icon={<LockOutlined />}
            onClick={() => handleResetPassword(record)}
          >
            重置密码
          </Button>
          <Popconfirm
            title="确定要删除该用户吗？"
            onConfirm={() => handleDeleteUser(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={
          <Space>
            <UserOutlined />
            <span>用户管理</span>
          </Space>
        }
        extra={
          <Space>
            <Input
              placeholder="搜索用户名/姓名/邮箱"
              prefix={<SearchOutlined />}
              style={{ width: 250 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleOpenModal()}
            >
              添加用户
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          scroll={{ x: 1400 }}
        />
      </Card>

      <Modal
        title={editingUser ? '编辑用户' : '添加用户'}
        open={modalVisible}
        onOk={handleSaveUser}
        onCancel={handleCloseModal}
        width={600}
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ status: true }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="username"
                label="用户名"
                rules={[
                  { required: true, message: '请输入用户名' },
                  { pattern: /^[a-zA-Z0-9_]{3,20}$/, message: '用户名只能包含字母、数字和下划线，长度3-20位' },
                ]}
              >
                <Input placeholder="请输入用户名" disabled={!!editingUser} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="name"
                label="姓名"
                rules={[{ required: true, message: '请输入姓名' }]}
              >
                <Input placeholder="请输入姓名" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="email"
                label="邮箱"
                rules={[
                  { required: true, message: '请输入邮箱' },
                  { type: 'email', message: '请输入有效的邮箱地址' },
                ]}
              >
                <Input placeholder="请输入邮箱" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="phone"
                label="手机号"
                rules={[
                  { required: true, message: '请输入手机号' },
                  { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' },
                ]}
              >
                <Input placeholder="请输入手机号" />
              </Form.Item>
            </Col>
          </Row>

          {!editingUser && (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="password"
                  label="密码"
                  rules={[
                    { required: true, message: '请输入密码' },
                    { min: 6, message: '密码至少6位' },
                  ]}
                >
                  <Input.Password placeholder="请输入密码" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="confirmPassword"
                  label="确认密码"
                  dependencies={['password']}
                  rules={[
                    { required: true, message: '请确认密码' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('password') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error('两次输入的密码不一致'));
                      },
                    }),
                  ]}
                >
                  <Input.Password placeholder="请再次输入密码" />
                </Form.Item>
              </Col>
            </Row>
          )}

          <Form.Item
            name="roles"
            label="角色"
            rules={[{ required: true, message: '请选择至少一个角色' }]}
          >
            <Select
              mode="multiple"
              placeholder="请选择角色"
              style={{ width: '100%' }}
            >
              {roles.map(role => (
                <Option key={role.value} value={role.value}>
                  {role.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
            valuePropName="checked"
          >
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 用户详情抽屉 */}
      <Drawer
        title={
          <Space>
            <UserOutlined />
            <span>用户详情</span>
          </Space>
        }
        placement="right"
        width={800}
        onClose={() => {
          setDetailDrawerVisible(false);
          setSelectedUserForDetail(null);
        }}
        open={detailDrawerVisible}
      >
        {selectedUserForDetail && (
          <div>
            {/* 用户头像和基本信息 */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid #f0f0f0' }}>
              <Avatar
                size={64}
                icon={<UserOutlined />}
                style={{ backgroundColor: '#1890ff', marginRight: 16 }}
              />
              <div style={{ flex: 1 }}>
                <Title level={4} style={{ margin: 0, marginBottom: 8 }}>
                  {selectedUserForDetail.name}
                  {selectedUserForDetail.status ? (
                    <Tag color="success" style={{ marginLeft: 12 }}>启用</Tag>
                  ) : (
                    <Tag color="default" style={{ marginLeft: 12 }}>禁用</Tag>
                  )}
                </Title>
                <Space size="middle">
                  <Text type="secondary">
                    <UserOutlined /> {selectedUserForDetail.username}
                  </Text>
                  <Text type="secondary">
                    <MailOutlined /> {selectedUserForDetail.email}
                  </Text>
                </Space>
              </div>
            </div>

            {/* 详细信息 */}
            <Descriptions bordered column={1} size="small" style={{ marginBottom: 24 }}>
              <Descriptions.Item label="用户ID">{selectedUserForDetail.id}</Descriptions.Item>
              <Descriptions.Item label="用户名">{selectedUserForDetail.username}</Descriptions.Item>
              <Descriptions.Item label="姓名">{selectedUserForDetail.name}</Descriptions.Item>
              <Descriptions.Item label="邮箱">
                <MailOutlined /> {selectedUserForDetail.email}
              </Descriptions.Item>
              <Descriptions.Item label="手机号">
                <PhoneOutlined /> {selectedUserForDetail.phone}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                {selectedUserForDetail.status ? (
                  <Badge status="success" text="启用" />
                ) : (
                  <Badge status="default" text="禁用" />
                )}
              </Descriptions.Item>
              <Descriptions.Item label="角色">
                <Space>
                  {selectedUserForDetail.roles.map(role => (
                    <Tag key={role} color={getRoleColor(role)}>
                      {getRoleName(role)}
                    </Tag>
                  ))}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="权限数量">
                <Badge
                  count={getUserPermissions(selectedUserForDetail).reduce((sum, m) => sum + m.permissions.length, 0)}
                  showZero
                  style={{ backgroundColor: '#52c41a' }}
                />
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                <ClockCircleOutlined /> {selectedUserForDetail.createdAt}
              </Descriptions.Item>
              <Descriptions.Item label="最后登录">
                <ClockCircleOutlined /> {selectedUserForDetail.lastLogin}
              </Descriptions.Item>
            </Descriptions>

            {/* 权限详情 */}
            <Card
              size="small"
              title={
                <Space>
                  <SafetyOutlined />
                  <span>用户权限详情</span>
                  <Badge
                    count={getUserPermissions(selectedUserForDetail).reduce((sum, m) => sum + m.permissions.length, 0)}
                    showZero
                    style={{ backgroundColor: '#1890ff' }}
                  />
                </Space>
              }
            >
              {(() => {
                const userPermissions = getUserPermissions(selectedUserForDetail);
                const permissionColumns = [
                  {
                    title: '权限名称',
                    dataIndex: 'name',
                    key: 'name',
                    width: 120,
                  },
                  {
                    title: '权限标识',
                    dataIndex: 'key',
                    key: 'key',
                    width: 150,
                    render: (key) => <Tag color="blue">{key}</Tag>,
                  },
                  {
                    title: '权限描述',
                    dataIndex: 'description',
                    key: 'description',
                  },
                  {
                    title: '状态',
                    key: 'status',
                    width: 60,
                    align: 'center',
                    render: () => <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />,
                  },
                ];

                return userPermissions.length > 0 ? (
                  <Collapse
                    defaultActiveKey={userPermissions.map((_, index) => index.toString())}
                    expandIconPosition="start"
                    size="small"
                  >
                    {userPermissions.map((module, index) => (
                      <Panel
                        header={
                          <Space>
                            <span style={{ fontSize: 16 }}>{module.icon}</span>
                            <strong>{module.module}</strong>
                            <Tag color="processing">{module.moduleKey}</Tag>
                            <Badge
                              count={module.permissions.length}
                              showZero
                              style={{ backgroundColor: '#52c41a' }}
                            />
                          </Space>
                        }
                        key={index.toString()}
                      >
                        {module.permissions.length > 0 ? (
                          <Table
                            columns={permissionColumns}
                            dataSource={module.permissions}
                            rowKey="key"
                            pagination={false}
                            size="small"
                          />
                        ) : (
                          <Text type="secondary">该模块下暂无权限</Text>
                        )}
                      </Panel>
                    ))}
                  </Collapse>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                    <CloseCircleOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                    <div>该用户暂无任何权限</div>
                  </div>
                );
              })()}
            </Card>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default UserManagement;
