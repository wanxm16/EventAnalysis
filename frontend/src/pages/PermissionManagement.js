import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Space,
  Tag,
  Input,
  Collapse,
  Descriptions,
  Badge,
} from 'antd';
import {
  SearchOutlined,
  SafetyOutlined,
  FolderOutlined,
  FileProtectOutlined,
} from '@ant-design/icons';

const { Panel } = Collapse;

const PermissionManagement = () => {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  // 权限数据结构
  const permissionData = [
    {
      module: '首页',
      moduleKey: 'dashboard',
      icon: '🏠',
      description: '系统首页相关权限',
      permissions: [
        {
          key: 'dashboard:view',
          name: '查看数据总览',
          description: '查看首页的数据总览、图表和统计信息',
          roles: ['系统管理员', '数据分析员', '普通用户', '只读用户'],
        },
        {
          key: 'dashboard:export',
          name: '导出报表',
          description: '导出首页的数据报表和图表',
          roles: ['系统管理员', '数据分析员'],
        },
      ],
    },
    {
      module: '事件管理',
      moduleKey: 'events',
      icon: '📋',
      description: '事件列表的增删改查权限',
      permissions: [
        {
          key: 'events:view',
          name: '查看事件列表',
          description: '查看所有事件的列表和详情',
          roles: ['系统管理员', '数据分析员', '普通用户', '只读用户'],
        },
        {
          key: 'events:create',
          name: '创建事件',
          description: '创建新的事件记录',
          roles: ['系统管理员', '普通用户'],
        },
        {
          key: 'events:edit',
          name: '编辑事件',
          description: '编辑现有事件的信息',
          roles: ['系统管理员'],
        },
        {
          key: 'events:delete',
          name: '删除事件',
          description: '删除事件记录',
          roles: ['系统管理员'],
        },
        {
          key: 'events:export',
          name: '导出事件',
          description: '导出事件数据',
          roles: ['系统管理员', '数据分析员'],
        },
      ],
    },
    {
      module: '聚合事件',
      moduleKey: 'clusters',
      icon: '🔗',
      description: '聚合事件管理权限',
      permissions: [
        {
          key: 'clusters:view',
          name: '查看聚合列表',
          description: '查看聚合事件列表',
          roles: ['系统管理员', '数据分析员', '普通用户', '只读用户'],
        },
        {
          key: 'clusters:create',
          name: '创建聚合',
          description: '创建新的聚合事件',
          roles: ['系统管理员', '数据分析员'],
        },
        {
          key: 'clusters:edit',
          name: '编辑聚合',
          description: '编辑聚合事件信息',
          roles: ['系统管理员', '数据分析员'],
        },
        {
          key: 'clusters:delete',
          name: '删除聚合',
          description: '删除聚合事件',
          roles: ['系统管理员'],
        },
      ],
    },
    {
      module: '人员分析',
      moduleKey: 'person',
      icon: '👥',
      description: '人员分析功能权限',
      permissions: [
        {
          key: 'person:view',
          name: '查看人员分析',
          description: '查看人员相关的分析数据',
          roles: ['系统管理员', '数据分析员', '普通用户', '只读用户'],
        },
        {
          key: 'person:export',
          name: '导出分析报告',
          description: '导出人员分析报告',
          roles: ['系统管理员', '数据分析员'],
        },
      ],
    },
    {
      module: '事件主题',
      moduleKey: 'topics',
      icon: '📚',
      description: '事件主题管理权限',
      permissions: [
        {
          key: 'topics:view',
          name: '查看主题',
          description: '查看事件主题列表',
          roles: ['系统管理员', '数据分析员', '普通用户', '只读用户'],
        },
        {
          key: 'topics:create',
          name: '创建主题',
          description: '创建新的事件主题',
          roles: ['系统管理员', '数据分析员'],
        },
        {
          key: 'topics:edit',
          name: '编辑主题',
          description: '编辑事件主题信息',
          roles: ['系统管理员', '数据分析员'],
        },
        {
          key: 'topics:delete',
          name: '删除主题',
          description: '删除事件主题',
          roles: ['系统管理员'],
        },
      ],
    },
    {
      module: '统计报告',
      moduleKey: 'statistics',
      icon: '📊',
      description: '统计报告功能权限',
      permissions: [
        {
          key: 'statistics:view',
          name: '查看统计',
          description: '查看统计报告和图表',
          roles: ['系统管理员', '数据分析员', '只读用户'],
        },
        {
          key: 'statistics:generate',
          name: '生成报告',
          description: '生成新的统计报告',
          roles: ['系统管理员', '数据分析员'],
        },
        {
          key: 'statistics:export',
          name: '导出报告',
          description: '导出统计报告',
          roles: ['系统管理员', '数据分析员'],
        },
      ],
    },
    {
      module: '月度报告',
      moduleKey: 'reports',
      icon: '📄',
      description: '月度报告管理权限',
      permissions: [
        {
          key: 'reports:view',
          name: '查看报告',
          description: '查看月度报告',
          roles: ['系统管理员', '数据分析员'],
        },
        {
          key: 'reports:create',
          name: '创建报告',
          description: '创建月度报告',
          roles: ['系统管理员', '数据分析员'],
        },
        {
          key: 'reports:edit',
          name: '编辑报告',
          description: '编辑月度报告',
          roles: ['系统管理员', '数据分析员'],
        },
        {
          key: 'reports:delete',
          name: '删除报告',
          description: '删除月度报告',
          roles: ['系统管理员'],
        },
      ],
    },
    {
      module: '智能分类',
      moduleKey: 'classification',
      icon: '🎯',
      description: '智能分类功能权限',
      permissions: [
        {
          key: 'classification:view',
          name: '查看分类任务',
          description: '查看分类任务列表',
          roles: ['系统管理员', '数据分析员'],
        },
        {
          key: 'classification:create',
          name: '创建分类任务',
          description: '创建新的分类任务',
          roles: ['系统管理员', '数据分析员'],
        },
        {
          key: 'classification:tree',
          name: '管理分类树',
          description: '管理分类树结构',
          roles: ['系统管理员'],
        },
        {
          key: 'classification:tags',
          name: '管理标签',
          description: '管理分类标签',
          roles: ['系统管理员'],
        },
      ],
    },
    {
      module: '系统管理',
      moduleKey: 'system',
      icon: '⚙️',
      description: '系统管理相关权限',
      permissions: [
        {
          key: 'system:users',
          name: '用户管理',
          description: '管理系统用户',
          roles: ['系统管理员'],
        },
        {
          key: 'system:roles',
          name: '角色管理',
          description: '管理系统角色',
          roles: ['系统管理员'],
        },
        {
          key: 'system:permissions',
          name: '权限管理',
          description: '查看和管理权限',
          roles: ['系统管理员'],
        },
        {
          key: 'system:logs',
          name: '操作日志',
          description: '查看系统操作日志',
          roles: ['系统管理员'],
        },
        {
          key: 'system:config',
          name: '系统配置',
          description: '系统参数配置',
          roles: ['系统管理员'],
        },
      ],
    },
  ];

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setPermissions(permissionData);
      setLoading(false);
    }, 300);
  }, []);

  // 表格列定义
  const columns = [
    {
      title: '权限名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '权限标识',
      dataIndex: 'key',
      key: 'key',
      width: 180,
      render: (key) => <Tag color="blue">{key}</Tag>,
    },
    {
      title: '权限描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '授权角色',
      dataIndex: 'roles',
      key: 'roles',
      width: 300,
      render: (roles) => (
        <Space wrap>
          {roles.map((role, index) => {
            const colors = {
              '系统管理员': 'red',
              '数据分析员': 'blue',
              '普通用户': 'green',
              '只读用户': 'default',
            };
            return (
              <Tag key={index} color={colors[role] || 'default'}>
                {role}
              </Tag>
            );
          })}
        </Space>
      ),
    },
    {
      title: '角色数',
      dataIndex: 'roles',
      key: 'roleCount',
      width: 80,
      align: 'center',
      render: (roles) => (
        <Badge count={roles.length} showZero style={{ backgroundColor: '#52c41a' }} />
      ),
    },
  ];

  // 过滤权限数据
  const filteredPermissions = permissions.map(module => ({
    ...module,
    permissions: module.permissions.filter(perm =>
      !searchText ||
      perm.name.toLowerCase().includes(searchText.toLowerCase()) ||
      perm.key.toLowerCase().includes(searchText.toLowerCase()) ||
      perm.description.toLowerCase().includes(searchText.toLowerCase())
    ),
  })).filter(module => module.permissions.length > 0);

  // 统计信息
  const totalPermissions = permissions.reduce((sum, module) => sum + module.permissions.length, 0);
  const totalModules = permissions.length;

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={
          <Space>
            <SafetyOutlined />
            <span>权限管理</span>
          </Space>
        }
        extra={
          <Space>
            <Input
              placeholder="搜索权限名称/标识/描述"
              prefix={<SearchOutlined />}
              style={{ width: 300 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Space>
        }
      >
        <Descriptions bordered size="small" column={4} style={{ marginBottom: 24 }}>
          <Descriptions.Item label="权限模块">
            <Badge count={totalModules} showZero style={{ backgroundColor: '#1890ff' }} />
          </Descriptions.Item>
          <Descriptions.Item label="权限总数">
            <Badge count={totalPermissions} showZero style={{ backgroundColor: '#52c41a' }} />
          </Descriptions.Item>
          <Descriptions.Item label="系统角色">
            <Badge count={4} showZero style={{ backgroundColor: '#faad14' }} />
          </Descriptions.Item>
          <Descriptions.Item label="权限状态">
            <Tag color="success">正常</Tag>
          </Descriptions.Item>
        </Descriptions>

        <Collapse
          defaultActiveKey={permissions.map((_, index) => index.toString())}
          expandIconPosition="start"
        >
          {filteredPermissions.map((module, index) => (
            <Panel
              header={
                <Space>
                  <span style={{ fontSize: 18 }}>{module.icon}</span>
                  <FolderOutlined />
                  <strong>{module.module}</strong>
                  <Tag color="processing">{module.moduleKey}</Tag>
                  <span style={{ color: '#999', fontSize: 12 }}>{module.description}</span>
                  <Badge
                    count={module.permissions.length}
                    showZero
                    style={{ backgroundColor: '#52c41a' }}
                  />
                </Space>
              }
              key={index.toString()}
            >
              <Table
                columns={columns}
                dataSource={module.permissions}
                rowKey="key"
                pagination={false}
                size="small"
              />
            </Panel>
          ))}
        </Collapse>

        {filteredPermissions.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
            <FileProtectOutlined style={{ fontSize: 48, marginBottom: 16 }} />
            <div>没有找到匹配的权限</div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default PermissionManagement;
