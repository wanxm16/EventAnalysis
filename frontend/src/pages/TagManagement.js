import React, { useEffect, useMemo, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  Space,
  message,
  Row,
  Col,
  Statistic,
  Divider,
  InputNumber,
  Empty
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { tagAPI } from '../services/api';

const DEFAULT_COLOR_PRESETS = ['#1890ff', '#13c2c2', '#fa541c', '#722ed1', '#faad14', '#2f54eb'];

const TagManagement = () => {
  const [tags, setTags] = useState([]);
  const [tagStats, setTagStats] = useState({});
  const [tagFilters, setTagFilters] = useState({
    group_id: undefined,
    search: undefined
  });
  const [groups, setGroups] = useState([]);
  const [tagLoading, setTagLoading] = useState(false);
  const [groupLoading, setGroupLoading] = useState(false);
  const [tagModalVisible, setTagModalVisible] = useState(false);
  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);
  const [tagSubmitting, setTagSubmitting] = useState(false);
  const [groupSubmitting, setGroupSubmitting] = useState(false);
  const [tagForm] = Form.useForm();
  const [groupForm] = Form.useForm();

  const loadGroups = async () => {
    setGroupLoading(true);
    try {
      const response = await tagAPI.getGroups(false);
      setGroups(response.groups || []);
    } catch (error) {
      message.error(error.response?.data?.detail || '获取标签组失败');
    } finally {
      setGroupLoading(false);
    }
  };

  const loadTags = async () => {
    setTagLoading(true);
    try {
      const response = await tagAPI.getTags({
        group_id: tagFilters.group_id,
        search: tagFilters.search,
        include_system: false
      });
      setTags(response.tags || []);
      setTagStats(response.stats || {});
    } catch (error) {
      message.error(error.response?.data?.detail || '获取标签失败');
    } finally {
      setTagLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    loadTags();
  }, [tagFilters.group_id, tagFilters.search]);

  const handleFilterChange = (key, value) => {
    setTagFilters((prev) => ({
      ...prev,
      [key]: value === undefined || value === '' ? undefined : value
    }));
  };

  const handleSearch = (value) => {
    setTagFilters((prev) => ({ ...prev, search: value || undefined }));
  };

  const groupOptions = useMemo(() => (
    groups.map((group) => ({
      value: group.group_id || group.id,
      label: group.name
    }))
  ), [groups]);

  const openTagModal = (record = null) => {
    setEditingTag(record);
    if (record) {
      tagForm.setFieldsValue({
        label: record.label,
        group_id: record.group_id,
        color: record.color,
        description: record.description
      });
    } else {
      const defaultGroupId = groups[0] ? (groups[0].group_id || groups[0].id) : undefined;
      tagForm.setFieldsValue({
        label: '',
        group_id: defaultGroupId,
        color: '#1890ff',
        description: ''
      });
    }
    setTagModalVisible(true);
  };

  const openGroupModal = (record = null) => {
    setEditingGroup(record);
    if (record) {
      groupForm.setFieldsValue({
        name: record.name,
        group_id: record.group_id,
        description: record.description,
        max_tags: record.max_tags,
        order: record.order
      });
    } else {
      groupForm.setFieldsValue({
        name: '',
        group_id: '',
        description: '',
        max_tags: 20,
        order: 300
      });
    }
    setGroupModalVisible(true);
  };

  const handleSubmitTag = async () => {
    try {
      const values = await tagForm.validateFields();
      setTagSubmitting(true);
      if (editingTag) {
        await tagAPI.updateTag(editingTag.tag_id, values);
        message.success('标签更新成功');
      } else {
        if (!values.group_id) {
          message.warning('请先选择标签组');
          return;
        }
        await tagAPI.createTag(values);
        message.success('标签创建成功');
      }
      setTagModalVisible(false);
      setEditingTag(null);
      tagForm.resetFields();
      loadTags();
      loadGroups();
    } catch (error) {
      if (error?.errorFields) {
        return;
      }
      message.error(error.response?.data?.detail || '保存标签失败');
    } finally {
      setTagSubmitting(false);
    }
  };

  const handleSubmitGroup = async () => {
    try {
      const values = await groupForm.validateFields();
      setGroupSubmitting(true);
      if (editingGroup) {
        await tagAPI.updateGroup(editingGroup.group_id, values);
        message.success('标签组更新成功');
      } else {
        await tagAPI.createGroup(values);
        message.success('标签组创建成功');
      }
      setGroupModalVisible(false);
      setEditingGroup(null);
      groupForm.resetFields();
      loadGroups();
    } catch (error) {
      if (error?.errorFields) {
        return;
      }
      message.error(error.response?.data?.detail || '保存标签组失败');
    } finally {
      setGroupSubmitting(false);
    }
  };

  const refreshAll = () => {
    loadTags();
    loadGroups();
  };

  const tagColumns = [
    {
      title: '标签名称',
      dataIndex: 'label',
      key: 'label',
      width: 200,
      render: (label, record) => (
        <Tag color={record.color || 'blue'}>{label}</Tag>
      )
    },
    {
      title: '标签组',
      dataIndex: 'group_name',
      width: 160,
      render: (text) => text || '-'
    },
    {
      title: '描述',
      dataIndex: 'description',
      ellipsis: true
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_, record) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            size="small"
            disabled={!record.editable}
            onClick={() => openTagModal(record)}
          >
            编辑
          </Button>
        </Space>
      )
    }
  ];

  const groupColumns = [
    {
      title: '标签组',
      dataIndex: 'name',
      key: 'name',
      render: (name) => <span>{name}</span>
    },
    {
      title: '标签数量',
      dataIndex: 'tag_count',
      render: (count, record) => (
        <span>{record.active_tag_count || 0} / {record.max_tags || count || '-'}</span>
      )
    },
    {
      title: '描述',
      dataIndex: 'description',
      ellipsis: true
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Button
          icon={<EditOutlined />}
          size="small"
          disabled={record.source === 'system'}
          onClick={() => openGroupModal(record)}
        >
          编辑
        </Button>
      )
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openTagModal()}>
              新建标签
            </Button>
            <Button icon={<PlusOutlined />} onClick={() => openGroupModal()}>
              新建标签组
            </Button>
            <Button icon={<ReloadOutlined />} onClick={refreshAll}>
              刷新
            </Button>
          </Space>
        </Col>
      </Row>

      <Card>
        <Row gutter={16}>
          <Col span={12}>
            <Statistic title="标签总数" value={tagStats.total || 0} />
          </Col>
          <Col span={12}>
            <Statistic title="标签组数量" value={groups.length} />
          </Col>
        </Row>

        <Divider />

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <Select
              placeholder="选择标签组"
              allowClear
              options={groupOptions}
              value={tagFilters.group_id}
              onChange={(value) => handleFilterChange('group_id', value)}
              style={{ width: '100%' }}
              loading={groupLoading}
            />
          </Col>
        </Row>

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <Input.Search placeholder="搜索标签名称或描述" onSearch={handleSearch} allowClear />
          </Col>
        </Row>

        <Table
          rowKey="tag_id"
          columns={tagColumns}
          dataSource={tags}
          loading={tagLoading}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          locale={{ emptyText: <Empty description="暂无标签" /> }}
        />
      </Card>

      <Divider />

      <Card title="标签组管理">
        <Table
          rowKey={(record) => record.group_id || record.id}
          columns={groupColumns}
          dataSource={groups}
          loading={groupLoading}
          pagination={false}
          locale={{ emptyText: <Empty description="暂无标签组" /> }}
        />
      </Card>

      <Modal
        title={editingTag ? '编辑标签' : '新建标签'}
        open={tagModalVisible}
        onCancel={() => { setTagModalVisible(false); tagForm.resetFields(); setEditingTag(null); }}
        onOk={handleSubmitTag}
        confirmLoading={tagSubmitting}
        destroyOnClose
      >
        <Form form={tagForm} layout="vertical">
          <Form.Item
            label="标签名称"
            name="label"
            rules={[{ required: true, message: '请输入标签名称' }]}
          >
            <Input maxLength={20} placeholder="输入标签名称" />
          </Form.Item>
          <Form.Item
            label="所属标签组"
            name="group_id"
            rules={[{ required: true, message: '请选择标签组' }]}
          >
            <Select
              options={groupOptions}
              placeholder="请选择标签组"
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item label="颜色" name="color">
            <Select
              placeholder="选择颜色"
              options={DEFAULT_COLOR_PRESETS.map((color) => ({
                value: color,
                label: (
                  <Space>
                    <span style={{ display: 'inline-block', width: 16, height: 16, background: color, borderRadius: 4 }} />
                    <span>{color}</span>
                  </Space>
                )
              }))}
            />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={3} placeholder="标签说明，便于审核和推荐" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingGroup ? '编辑标签组' : '新建标签组'}
        open={groupModalVisible}
        onCancel={() => { setGroupModalVisible(false); groupForm.resetFields(); setEditingGroup(null); }}
        onOk={handleSubmitGroup}
        confirmLoading={groupSubmitting}
        destroyOnClose
      >
        <Form form={groupForm} layout="vertical">
          <Form.Item
            label="标签组名称"
            name="name"
            rules={[{ required: true, message: '请输入标签组名称' }]}
          >
            <Input maxLength={20} placeholder="例如：业务标签" disabled={editingGroup?.source === 'system'} />
          </Form.Item>
          <Form.Item label="标签组ID" name="group_id">
            <Input placeholder="可留空自动生成" disabled={!!editingGroup} />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={3} placeholder="说明该标签组的使用场景" />
          </Form.Item>
          <Form.Item label="最大自定义标签数" name="max_tags">
            <InputNumber min={1} max={99} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="排序权重" name="order">
            <InputNumber min={1} max={999} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TagManagement;
