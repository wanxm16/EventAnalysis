import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  message,
  Space,
  Tag,
  Popconfirm,
  Typography,
  Tree,
  Dropdown
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  DownOutlined,
  FolderOutlined,
  FolderOpenOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { TextArea } = Input;

// API 方法
const categoryTreeAPI = {
  getAll: () => fetch('http://localhost:8000/api/classify/category-trees').then(res => res.json()),
  getById: (treeId) => fetch(`http://localhost:8000/api/classify/category-trees/${treeId}`).then(res => res.json()),
  create: (payload) => fetch('http://localhost:8000/api/classify/category-trees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(res => res.json()),
  update: (treeId, payload) => fetch(`http://localhost:8000/api/classify/category-trees/${treeId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(res => res.json()),
  delete: (treeId) => fetch(`http://localhost:8000/api/classify/category-trees/${treeId}`, {
    method: 'DELETE'
  }).then(res => res.json()),
  addNode: (treeId, payload) => fetch(`http://localhost:8000/api/classify/category-trees/${treeId}/nodes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(res => res.json()),
  updateNode: (treeId, nodeId, payload) => fetch(`http://localhost:8000/api/classify/category-trees/${treeId}/nodes/${nodeId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(res => res.json()),
  deleteNode: (treeId, nodeId) => fetch(`http://localhost:8000/api/classify/category-trees/${treeId}/nodes/${nodeId}`, {
    method: 'DELETE'
  }).then(res => res.json()),
};

function CategoryTreeManagement() {
  const [trees, setTrees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [treeModalVisible, setTreeModalVisible] = useState(false);
  const [nodeModalVisible, setNodeModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [editingTree, setEditingTree] = useState(null);
  const [currentTree, setCurrentTree] = useState(null);
  const [editingNode, setEditingNode] = useState(null);
  const [selectedParentNode, setSelectedParentNode] = useState(null);
  const [treeForm] = Form.useForm();
  const [nodeForm] = Form.useForm();

  useEffect(() => {
    loadTrees();
  }, []);

  const loadTrees = async () => {
    setLoading(true);
    try {
      const response = await categoryTreeAPI.getAll();
      setTrees(response.trees || []);
    } catch (error) {
      console.error('加载分类树失败:', error);
      message.error('加载分类树失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTree = () => {
    setEditingTree(null);
    treeForm.resetFields();
    setTreeModalVisible(true);
  };

  const handleEditTree = (record) => {
    setEditingTree(record);
    treeForm.setFieldsValue({
      name: record.name,
      description: record.description
    });
    setTreeModalVisible(true);
  };

  const handleViewTree = async (record) => {
    try {
      const tree = await categoryTreeAPI.getById(record.id);
      setCurrentTree(tree);
      setViewModalVisible(true);
    } catch (error) {
      console.error('获取分类树详情失败:', error);
      message.error('获取分类树详情失败');
    }
  };

  const handleDeleteTree = async (treeId) => {
    try {
      await categoryTreeAPI.delete(treeId);
      message.success('分类树已删除');
      loadTrees();
    } catch (error) {
      console.error('删除分类树失败:', error);
      message.error('删除分类树失败');
    }
  };

  const handleTreeSubmit = async () => {
    try {
      const values = await treeForm.validateFields();

      if (editingTree) {
        await categoryTreeAPI.update(editingTree.id, values);
        message.success('分类树更新成功');
      } else {
        await categoryTreeAPI.create(values);
        message.success('分类树创建成功');
      }

      setTreeModalVisible(false);
      treeForm.resetFields();
      loadTrees();
    } catch (error) {
      if (error.errorFields) {
        message.error('请填写完整信息');
      } else {
        console.error('操作失败:', error);
        message.error(editingTree ? '更新失败' : '创建失败');
      }
    }
  };

  const handleAddNode = (parentNode = null) => {
    // 检查层级限制
    if (parentNode && parentNode.level >= 3) {
      message.warning('已达到最大层级限制（3级）');
      return;
    }

    setEditingNode(null);
    setSelectedParentNode(parentNode);
    nodeForm.resetFields();
    setNodeModalVisible(true);
  };

  const handleEditNode = (node) => {
    setEditingNode(node);
    setSelectedParentNode(null);
    nodeForm.setFieldsValue({ name: node.name });
    setNodeModalVisible(true);
  };

  const handleDeleteNode = async (node) => {
    try {
      await categoryTreeAPI.deleteNode(currentTree.id, node.id);
      message.success('节点已删除');
      // 重新加载当前树
      const updatedTree = await categoryTreeAPI.getById(currentTree.id);
      setCurrentTree(updatedTree);
      loadTrees();
    } catch (error) {
      console.error('删除节点失败:', error);
      message.error('删除节点失败');
    }
  };

  const handleNodeSubmit = async () => {
    try {
      const values = await nodeForm.validateFields();

      if (editingNode) {
        // 更新节点
        await categoryTreeAPI.updateNode(currentTree.id, editingNode.id, values);
        message.success('节点更新成功');
      } else {
        // 添加节点
        await categoryTreeAPI.addNode(currentTree.id, {
          name: values.name,
          parent_id: selectedParentNode?.id || null
        });
        message.success('节点添加成功');
      }

      setNodeModalVisible(false);
      nodeForm.resetFields();

      // 重新加载当前树
      const updatedTree = await categoryTreeAPI.getById(currentTree.id);
      setCurrentTree(updatedTree);
      loadTrees();
    } catch (error) {
      if (error.errorFields) {
        message.error('请填写节点名称');
      } else {
        console.error('操作失败:', error);
        message.error(editingNode ? '更新失败' : '添加失败');
      }
    }
  };

  // 将树数据转换为 Ant Design Tree 组件需要的格式
  const convertToTreeData = (nodes) => {
    if (!nodes || nodes.length === 0) return [];

    return nodes.map(node => ({
      title: (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>
            <Tag color={node.level === 1 ? 'blue' : node.level === 2 ? 'green' : 'orange'}>
              {node.level}级
            </Tag>
            {node.name}
          </span>
          <Space size="small" onClick={(e) => e.stopPropagation()}>
            {node.level < 3 && (
              <Button
                type="link"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => handleAddNode(node)}
              >
                添加子节点
              </Button>
            )}
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditNode(node)}
            >
              编辑
            </Button>
            <Popconfirm
              title="确认删除此节点及其所有子节点吗？"
              onConfirm={() => handleDeleteNode(node)}
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
        </div>
      ),
      key: node.id,
      icon: node.children?.length > 0 ? <FolderOpenOutlined /> : <FolderOutlined />,
      children: node.children?.length > 0 ? convertToTreeData(node.children) : undefined
    }));
  };

  const columns = [
    {
      title: '分类树名称',
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
      title: '节点数',
      dataIndex: 'node_count',
      key: 'node_count',
      width: 100,
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
      width: 220,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewTree(record)}
          >
            查看/管理
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditTree(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除此分类树吗？"
            onConfirm={() => handleDeleteTree(record.id)}
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
            <Title level={4} style={{ margin: 0 }}>分类树管理</Title>
            <Text type="secondary">创建和管理分类树，支持最多三级分类结构</Text>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreateTree}
          >
            创建分类树
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={trees}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* 创建/编辑分类树模态框 */}
      <Modal
        title={editingTree ? '编辑分类树' : '创建分类树'}
        open={treeModalVisible}
        onOk={handleTreeSubmit}
        onCancel={() => {
          setTreeModalVisible(false);
          treeForm.resetFields();
        }}
        width={600}
        okText="确定"
        cancelText="取消"
      >
        <Form
          form={treeForm}
          layout="vertical"
        >
          <Form.Item
            label="分类树名称"
            name="name"
            rules={[{ required: true, message: '请输入分类树名称' }]}
          >
            <Input placeholder="例如：81890的分类" />
          </Form.Item>

          <Form.Item
            label="描述"
            name="description"
          >
            <TextArea
              rows={3}
              placeholder="简要描述这个分类树的用途"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 查看/管理分类树模态框 */}
      <Modal
        title={`管理分类树：${currentTree?.name || ''}`}
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={900}
      >
        {currentTree && (
          <>
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">描述：</Text>
              <Text>{currentTree.description || '暂无描述'}</Text>
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">节点总数：</Text>
                <Tag color="blue">{currentTree.node_count} 个</Tag>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => handleAddNode(null)}
              >
                添加根节点
              </Button>
            </div>

            {currentTree.tree && currentTree.tree.length > 0 ? (
              <Tree
                showLine
                showIcon
                defaultExpandAll
                treeData={convertToTreeData(currentTree.tree)}
                style={{ marginTop: 16 }}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                暂无分类节点，请点击上方按钮添加根节点
              </div>
            )}
          </>
        )}
      </Modal>

      {/* 添加/编辑节点模态框 */}
      <Modal
        title={editingNode ? '编辑节点' : `添加${selectedParentNode ? '子' : '根'}节点`}
        open={nodeModalVisible}
        onOk={handleNodeSubmit}
        onCancel={() => {
          setNodeModalVisible(false);
          nodeForm.resetFields();
        }}
        width={500}
        okText="确定"
        cancelText="取消"
      >
        {selectedParentNode && (
          <div style={{ marginBottom: 16, padding: 12, background: '#f0f2f5', borderRadius: 4 }}>
            <Text type="secondary">父节点：</Text>
            <Tag color={selectedParentNode.level === 1 ? 'blue' : 'green'}>
              {selectedParentNode.level}级
            </Tag>
            <Text strong>{selectedParentNode.name}</Text>
          </div>
        )}

        <Form
          form={nodeForm}
          layout="vertical"
        >
          <Form.Item
            label="节点名称"
            name="name"
            rules={[{ required: true, message: '请输入节点名称' }]}
          >
            <Input placeholder="请输入节点名称" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default CategoryTreeManagement;
