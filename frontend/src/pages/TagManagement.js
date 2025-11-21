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
  Empty,
  Typography,
  Tabs,
  Badge
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  TagsOutlined,
  FolderOutlined
} from '@ant-design/icons';
import { tagAPI } from '../services/api';

const { Text } = Typography;

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
  const [activeTab, setActiveTab] = useState('tags');
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
        description: record.description
      });
    } else {
      const defaultGroupId = groups[0] ? (groups[0].group_id || groups[0].id) : undefined;
      tagForm.setFieldsValue({
        label: '',
        group_id: defaultGroupId,
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
        description: record.description
      });
    } else {
      groupForm.setFieldsValue({
        name: '',
        group_id: '',
        description: ''
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
      title: '标签',
      dataIndex: 'label',
      key: 'label',
      width: 200,
      render: (label) => <Text>{label}</Text>
    },
    {
      title: '所属标签组',
      dataIndex: 'group_name',
      width: 160,
      render: (text) => text || '-'
    },
    {
      title: '描述',
      dataIndex: 'description',
      ellipsis: true,
      render: (text) => <Text type="secondary">{text || '-'}</Text>
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          icon={<EditOutlined />}
          size="small"
          disabled={!record.editable}
          onClick={() => openTagModal(record)}
        >
          编辑
        </Button>
      )
    }
  ];

  const groupColumns = [
    {
      title: '标签组名称',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <Space>
          <Text strong>{name}</Text>
          {record.source === 'system' && (
            <Tag color="blue">系统</Tag>
          )}
        </Space>
      )
    },
    {
      title: '标签数量',
      dataIndex: 'tag_count',
      width: 120,
      render: (count, record) => (
        <Badge
          count={record.active_tag_count || 0}
          showZero
          color="#52c41a"
        />
      )
    },
    {
      title: '描述',
      dataIndex: 'description',
      ellipsis: true,
      render: (text) => <Text type="secondary">{text || '-'}</Text>
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
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

  const tabItems = [
    {
      key: 'tags',
      label: (
        <span>
          <TagsOutlined />
          标签管理
        </span>
      ),
      children: (
        <div>
          {/* 筛选区域 */}
          <div style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={8}>
                <Select
                  placeholder="选择标签组筛选"
                  allowClear
                  options={groupOptions}
                  value={tagFilters.group_id}
                  onChange={(value) => handleFilterChange('group_id', value)}
                  style={{ width: '100%' }}
                  loading={groupLoading}
                />
              </Col>
              <Col span={8}>
                <Input.Search
                  placeholder="搜索标签名称或描述"
                  onSearch={handleSearch}
                  allowClear
                />
              </Col>
            </Row>
          </div>

          {/* 标签表格 */}
          <Table
            rowKey="tag_id"
            columns={tagColumns}
            dataSource={tags}
            loading={tagLoading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 个标签`
            }}
            locale={{ emptyText: <Empty description="暂无标签数据" /> }}
          />
        </div>
      )
    },
    {
      key: 'groups',
      label: (
        <span>
          <FolderOutlined />
          标签组管理
        </span>
      ),
      children: (
        <Table
          rowKey={(record) => record.group_id || record.id}
          columns={groupColumns}
          dataSource={groups}
          loading={groupLoading}
          pagination={false}
          locale={{ emptyText: <Empty description="暂无标签组数据" /> }}
        />
      )
    }
  ];

  return (
    <div className="page-container">
      {/* 页面标题 */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title" style={{ margin: 0 }}>
          <TagsOutlined style={{ marginRight: 8 }} />
          标签管理
        </h1>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openTagModal()}
          >
            新建标签
          </Button>
          <Button
            icon={<PlusOutlined />}
            onClick={() => openGroupModal()}
          >
            新建标签组
          </Button>
        </Space>
      </div>

      {/* 内容区域 */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
        />
      </Card>

      {/* 新建/编辑标签对话框 */}
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
            <Input maxLength={20} placeholder="输入标签名称，如：噪音投诉" />
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
          <Form.Item label="标签描述" name="description">
            <Input.TextArea
              rows={3}
              placeholder="描述该标签的使用场景和识别特征"
              showCount
              maxLength={200}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 新建/编辑标签组对话框 */}
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
            <Input
              maxLength={20}
              placeholder="例如：噪音"
              disabled={editingGroup?.source === 'system'}
            />
          </Form.Item>
          <Form.Item label="标签组ID" name="group_id">
            <Input
              placeholder="可留空自动生成"
              disabled={!!editingGroup}
            />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea
              rows={3}
              placeholder="说明该标签组的使用场景"
              showCount
              maxLength={200}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TagManagement;
