import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  Space,
  Tag,
  Popconfirm,
  Typography,
  Descriptions
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { categorySetAPI, eventAPI } from '../services/api';

const { Title, Text } = Typography;
const { TextArea } = Input;

function CategorySetManagement() {
  const [sets, setSets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editingSet, setEditingSet] = useState(null);
  const [currentSet, setCurrentSet] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadSets();
    loadCategories();
  }, []);

  const loadSets = async () => {
    setLoading(true);
    try {
      const response = await categorySetAPI.getAll();
      setSets(response.sets || []);
    } catch (error) {
      console.error('加载分类集合失败:', error);
      message.error('加载分类集合失败');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await eventAPI.getCategories();
      setCategories(response.categories || []);
    } catch (error) {
      console.error('加载分类列表失败:', error);
    }
  };

  const handleCreate = () => {
    setEditingSet(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingSet(record);
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      categories: record.categories
    });
    setModalVisible(true);
  };

  const handleView = async (record) => {
    setCurrentSet(record);
    setDetailModalVisible(true);
  };

  const handleDelete = async (setId) => {
    try {
      await categorySetAPI.delete(setId);
      message.success('分类集合已删除');
      loadSets();
    } catch (error) {
      console.error('删除分类集合失败:', error);
      message.error('删除分类集合失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (editingSet) {
        // 更新
        await categorySetAPI.update(editingSet.id, values);
        message.success('分类集合更新成功');
      } else {
        // 创建
        await categorySetAPI.create(values);
        message.success('分类集合创建成功');
      }

      setModalVisible(false);
      form.resetFields();
      loadSets();
    } catch (error) {
      if (error.errorFields) {
        message.error('请填写完整信息');
      } else {
        console.error('操作失败:', error);
        message.error(editingSet ? '更新失败' : '创建失败');
      }
    }
  };

  const columns = [
    {
      title: '集合名称',
      dataIndex: 'name',
      key: 'name',
      width: 200
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text) => text || '-'
    },
    {
      title: '包含分类数',
      dataIndex: 'category_count',
      key: 'category_count',
      width: 120,
      render: (count) => <Tag color="blue">{count} 个</Tag>
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (time) => new Date(time).toLocaleString('zh-CN')
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 180,
      render: (time) => new Date(time).toLocaleString('zh-CN')
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
          >
            查看
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除此分类集合吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确认"
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
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>分类集合管理</Title>
            <Text type="secondary">创建和管理分类集合，便于批量选择分类</Text>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            创建分类集合
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={sets}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* 创建/编辑模态框 */}
      <Modal
        title={editingSet ? '编辑分类集合' : '创建分类集合'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        width={700}
        okText="确定"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            label="集合名称"
            name="name"
            rules={[{ required: true, message: '请输入集合名称' }]}
          >
            <Input placeholder="例如：消防安全相关、交通类事件" />
          </Form.Item>

          <Form.Item
            label="描述"
            name="description"
          >
            <TextArea
              rows={3}
              placeholder="简要描述这个分类集合的用途"
            />
          </Form.Item>

          <Form.Item
            label="选择分类"
            name="categories"
            rules={[{ required: true, message: '请至少选择一个分类' }]}
          >
            <Select
              mode="multiple"
              placeholder="选择要包含的分类"
              showSearch
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
              style={{ width: '100%' }}
            >
              {categories.map((cat) => (
                <Select.Option key={cat} value={cat}>
                  {cat}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 查看详情模态框 */}
      <Modal
        title="分类集合详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={700}
      >
        {currentSet && (
          <>
            <Descriptions bordered column={1}>
              <Descriptions.Item label="集合名称">
                {currentSet.name}
              </Descriptions.Item>
              <Descriptions.Item label="描述">
                {currentSet.description || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="包含分类数">
                {currentSet.category_count} 个
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {new Date(currentSet.created_at).toLocaleString('zh-CN')}
              </Descriptions.Item>
              <Descriptions.Item label="更新时间">
                {new Date(currentSet.updated_at).toLocaleString('zh-CN')}
              </Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: 16 }}>
              <Title level={5}>包含的分类：</Title>
              <div style={{ marginTop: 8 }}>
                {currentSet.categories.map((cat, idx) => (
                  <Tag key={idx} color="blue" style={{ marginBottom: 8 }}>
                    {cat}
                  </Tag>
                ))}
              </div>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

export default CategorySetManagement;
