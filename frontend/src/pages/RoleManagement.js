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
  Tree,
  message,
  Popconfirm,
  Descriptions,
  Badge,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  TeamOutlined,
  SafetyOutlined,
} from '@ant-design/icons';

const RoleManagement = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [form] = Form.useForm();

  // 权限树结构
  const permissionTree = [
    {
      title: '首页',
      key: 'dashboard',
      children: [
        { title: '查看数据总览', key: 'dashboard:view' },
        { title: '导出报表', key: 'dashboard:export' },
      ],
    },
    {
      title: '事件管理',
      key: 'events',
      children: [
        { title: '查看事件列表', key: 'events:view' },
        { title: '创建事件', key: 'events:create' },
        { title: '编辑事件', key: 'events:edit' },
        { title: '删除事件', key: 'events:delete' },
        { title: '导出事件', key: 'events:export' },
      ],
    },
    {
      title: '聚合事件',
      key: 'clusters',
      children: [
        { title: '查看聚合列表', key: 'clusters:view' },
        { title: '创建聚合', key: 'clusters:create' },
        { title: '编辑聚合', key: 'clusters:edit' },
        { title: '删除聚合', key: 'clusters:delete' },
      ],
    },
    {
      title: '人员分析',
      key: 'person',
      children: [
        { title: '查看人员分析', key: 'person:view' },
        { title: '导出分析报告', key: 'person:export' },
      ],
    },
    {
      title: '事件主题',
      key: 'topics',
      children: [
        { title: '查看主题', key: 'topics:view' },
        { title: '创建主题', key: 'topics:create' },
        { title: '编辑主题', key: 'topics:edit' },
        { title: '删除主题', key: 'topics:delete' },
      ],
    },
    {
      title: '统计报告',
      key: 'statistics',
      children: [
        { title: '查看统计', key: 'statistics:view' },
        { title: '生成报告', key: 'statistics:generate' },
        { title: '导出报告', key: 'statistics:export' },
      ],
    },
    {
      title: '月度报告',
      key: 'reports',
      children: [
        { title: '查看报告', key: 'reports:view' },
        { title: '创建报告', key: 'reports:create' },
        { title: '编辑报告', key: 'reports:edit' },
        { title: '删除报告', key: 'reports:delete' },
      ],
    },
    {
      title: '智能分类',
      key: 'classification',
      children: [
        { title: '查看分类任务', key: 'classification:view' },
        { title: '创建分类任务', key: 'classification:create' },
        { title: '管理分类树', key: 'classification:tree' },
        { title: '管理标签', key: 'classification:tags' },
      ],
    },
    {
      title: '系统管理',
      key: 'system',
      children: [
        { title: '用户管理', key: 'system:users' },
        { title: '角色管理', key: 'system:roles' },
        { title: '权限管理', key: 'system:permissions' },
        { title: '操作日志', key: 'system:logs' },
        { title: '系统配置', key: 'system:config' },
      ],
    },
  ];

  // 加载角色数据（模拟）
  const loadRoles = () => {
    setLoading(true);
    setTimeout(() => {
      const mockRoles = [
        {
          id: 1,
          name: '系统管理员',
          code: 'admin',
          description: '拥有系统所有权限',
          permissions: [
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
          userCount: 1,
          status: true,
          createdAt: '2025-01-01 10:00:00',
        },
        {
          id: 2,
          name: '数据分析员',
          code: 'analyst',
          description: '负责数据分析和报告生成',
          permissions: [
            'dashboard', 'dashboard:view', 'dashboard:export',
            'events', 'events:view', 'events:export',
            'clusters', 'clusters:view',
            'person', 'person:view', 'person:export',
            'topics', 'topics:view',
            'statistics', 'statistics:view', 'statistics:generate', 'statistics:export',
            'reports', 'reports:view', 'reports:create', 'reports:edit',
            'classification', 'classification:view',
          ],
          userCount: 3,
          status: true,
          createdAt: '2025-01-05 11:00:00',
        },
        {
          id: 3,
          name: '普通用户',
          code: 'user',
          description: '基本的查看和操作权限',
          permissions: [
            'dashboard', 'dashboard:view',
            'events', 'events:view', 'events:create',
            'clusters', 'clusters:view',
            'person', 'person:view',
            'topics', 'topics:view',
          ],
          userCount: 5,
          status: true,
          createdAt: '2025-01-10 09:30:00',
        },
        {
          id: 4,
          name: '只读用户',
          code: 'viewer',
          description: '只能查看，无编辑权限',
          permissions: [
            'dashboard', 'dashboard:view',
            'events', 'events:view',
            'clusters', 'clusters:view',
            'person', 'person:view',
            'topics', 'topics:view',
            'statistics', 'statistics:view',
          ],
          userCount: 2,
          status: true,
          createdAt: '2025-01-15 14:00:00',
        },
      ];
      setRoles(mockRoles);
      setLoading(false);
    }, 500);
  };

  useEffect(() => {
    loadRoles();
  }, []);

  // 打开添加/编辑对话框
  const handleOpenModal = (role = null) => {
    setEditingRole(role);
    setModalVisible(true);
    if (role) {
      form.setFieldsValue({
        name: role.name,
        code: role.code,
        description: role.description,
      });
      setSelectedPermissions(role.permissions);
    } else {
      form.resetFields();
      setSelectedPermissions([]);
    }
  };

  // 关闭对话框
  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingRole(null);
    form.resetFields();
    setSelectedPermissions([]);
  };

  // 保存角色
  const handleSaveRole = async () => {
    try {
      const values = await form.validateFields();

      if (selectedPermissions.length === 0) {
        message.error('请至少选择一个权限');
        return;
      }

      console.log('保存角色:', { ...values, permissions: selectedPermissions });

      if (editingRole) {
        // 编辑角色
        setRoles(roles.map(r => r.id === editingRole.id ? {
          ...r,
          ...values,
          permissions: selectedPermissions,
        } : r));
        message.success('角色更新成功');
      } else {
        // 添加角色
        const newRole = {
          id: roles.length + 1,
          ...values,
          permissions: selectedPermissions,
          userCount: 0,
          status: true,
          createdAt: new Date().toLocaleString('zh-CN'),
        };
        setRoles([...roles, newRole]);
        message.success('角色添加成功');
      }
      handleCloseModal();
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 删除角色
  const handleDeleteRole = (roleId) => {
    const role = roles.find(r => r.id === roleId);
    if (role.userCount > 0) {
      message.error('该角色下还有用户，无法删除');
      return;
    }
    setRoles(roles.filter(r => r.id !== roleId));
    message.success('角色删除成功');
  };

  // 权限树选择
  const handlePermissionCheck = (checkedKeys) => {
    setSelectedPermissions(checkedKeys);
  };

  // 表格列定义
  const columns = [
    {
      title: '角色名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      filteredValue: searchText ? [searchText] : null,
      onFilter: (value, record) => {
        return record.name.toLowerCase().includes(value.toLowerCase()) ||
               record.code.toLowerCase().includes(value.toLowerCase());
      },
    },
    {
      title: '角色编码',
      dataIndex: 'code',
      key: 'code',
      width: 120,
    },
    {
      title: '角色描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '权限数量',
      dataIndex: 'permissions',
      key: 'permissionCount',
      width: 100,
      render: (permissions) => (
        <Tag color="blue">{permissions.length}</Tag>
      ),
    },
    {
      title: '用户数',
      dataIndex: 'userCount',
      key: 'userCount',
      width: 100,
      render: (count) => (
        <Badge count={count} showZero style={{ backgroundColor: '#52c41a' }} />
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color={status ? 'success' : 'default'}>
          {status ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenModal(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除该角色吗？"
            description={record.userCount > 0 ? '该角色下还有用户，无法删除' : undefined}
            onConfirm={() => handleDeleteRole(record.id)}
            okText="确定"
            cancelText="取消"
            disabled={record.userCount > 0}
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              disabled={record.userCount > 0}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 展开行渲染
  const expandedRowRender = (record) => {
    const permissionGroups = {};
    record.permissions.forEach(perm => {
      const parts = perm.split(':');
      const module = parts[0];
      if (!permissionGroups[module]) {
        permissionGroups[module] = [];
      }
      if (parts.length > 1) {
        permissionGroups[module].push(perm);
      }
    });

    return (
      <Descriptions bordered size="small" column={1}>
        <Descriptions.Item label="权限详情">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.keys(permissionGroups).map(module => (
              <div key={module} style={{ marginBottom: 8 }}>
                <Tag color="processing">{module}</Tag>
                {permissionGroups[module].map(perm => (
                  <Tag key={perm} style={{ margin: '2px' }}>
                    {perm.split(':')[1]}
                  </Tag>
                ))}
              </div>
            ))}
          </div>
        </Descriptions.Item>
      </Descriptions>
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={
          <Space>
            <TeamOutlined />
            <span>角色管理</span>
          </Space>
        }
        extra={
          <Space>
            <Input
              placeholder="搜索角色名称/编码"
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
              添加角色
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={roles}
          rowKey="id"
          loading={loading}
          expandable={{
            expandedRowRender,
            expandIcon: ({ expanded, onExpand, record }) => (
              <SafetyOutlined
                style={{ cursor: 'pointer', marginRight: 8 }}
                onClick={e => onExpand(record, e)}
              />
            ),
          }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      <Modal
        title={editingRole ? '编辑角色' : '添加角色'}
        open={modalVisible}
        onOk={handleSaveRole}
        onCancel={handleCloseModal}
        width={700}
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="角色名称"
            rules={[{ required: true, message: '请输入角色名称' }]}
          >
            <Input placeholder="请输入角色名称" />
          </Form.Item>

          <Form.Item
            name="code"
            label="角色编码"
            rules={[
              { required: true, message: '请输入角色编码' },
              { pattern: /^[a-z_]{2,20}$/, message: '角色编码只能包含小写字母和下划线，长度2-20位' },
            ]}
          >
            <Input placeholder="请输入角色编码" disabled={!!editingRole} />
          </Form.Item>

          <Form.Item
            name="description"
            label="角色描述"
          >
            <Input.TextArea
              placeholder="请输入角色描述"
              rows={3}
            />
          </Form.Item>

          <Form.Item
            label="权限配置"
            required
          >
            <div style={{ border: '1px solid #d9d9d9', borderRadius: 4, padding: 12, maxHeight: 400, overflow: 'auto' }}>
              <Tree
                checkable
                defaultExpandAll
                checkedKeys={selectedPermissions}
                onCheck={handlePermissionCheck}
                treeData={permissionTree}
              />
            </div>
            <div style={{ marginTop: 8, color: '#999', fontSize: 12 }}>
              已选择 {selectedPermissions.length} 个权限
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RoleManagement;
