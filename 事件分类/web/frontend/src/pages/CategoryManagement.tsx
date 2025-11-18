import { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  message,
  Typography,
  Divider,
  Alert,
} from 'antd'
import { PlusOutlined, EditOutlined } from '@ant-design/icons'
import {
  getCategories,
  getEventTypes,
  getCategoryMapping,
  addCategory,
  type CategoryConfig,
} from '../services/api'

const { Title, Text } = Typography

const CategoryManagement = () => {
  const [categories, setCategories] = useState<string[]>([])
  const [eventTypes, setEventTypes] = useState<string[]>([])
  const [categoryMapping, setCategoryMapping] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [categoriesData, eventTypesData, mappingData] = await Promise.all([
        getCategories(),
        getEventTypes(),
        getCategoryMapping(),
      ])
      setCategories(categoriesData.categories)
      setEventTypes(eventTypesData.event_types)
      setCategoryMapping(mappingData)
    } catch (error) {
      message.error('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  const handleAddCategory = () => {
    form.resetFields()
    setModalVisible(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const categoryConfig: CategoryConfig = {
        category_name: values.category_name,
        event_types: values.event_types,
        enabled: true,
      }
      await addCategory(categoryConfig)
      message.success('分类添加成功')
      setModalVisible(false)
      loadData()
    } catch (error: any) {
      if (error.message) {
        message.error(error.message)
      }
    }
  }

  // 构建树形数据结构
  const getTreeData = () => {
    const data: any[] = []
    Object.entries(categoryMapping).forEach(([eventType, categories], index) => {
      // 父节点：事件类型
      const parentNode = {
        key: `event-${index}`,
        eventType: eventType,
        category: '',
        categoryCount: categories.length,
        isParent: true,
        children: categories.map((category, catIndex) => ({
          key: `${eventType}-${catIndex}`,
          eventType: '',
          category: category,
          categoryCount: 0,
          isParent: false,
        })),
      }
      data.push(parentNode)
    })
    return data
  }

  const mappingColumns = [
    {
      title: '事件类型',
      dataIndex: 'eventType',
      key: 'eventType',
      width: 250,
      render: (text: string, record: any) => {
        if (record.isParent) {
          return (
            <Space>
              <Tag color="green" style={{ fontSize: 14, padding: '4px 12px' }}>
                {text}
              </Tag>
              <Text type="secondary">({record.categoryCount}个分类)</Text>
            </Space>
          )
        }
        return null
      },
    },
    {
      title: '二级分类',
      dataIndex: 'category',
      key: 'category',
      render: (text: string, record: any) => {
        if (!record.isParent && text) {
          return <Tag color="blue">{text}</Tag>
        }
        return null
      },
    },
  ]

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>
        分类配置管理
      </Title>

      <Card
        title="事件类型与二级分类映射关系（树形结构）"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddCategory}>
            新增分类
          </Button>
        }
      >
        <Alert
          message="说明"
          description="展开事件类型可查看该类型下的所有二级分类。每个事件在分类时，只能被分类到其对应事件类型下的二级分类中。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Table
          columns={mappingColumns}
          dataSource={getTreeData()}
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 个事件类型`,
          }}
          defaultExpandAllRows={false}
          bordered
        />
      </Card>

      <Modal
        title="新增分类"
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        okText="确定"
        cancelText="取消"
        width={600}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            label="分类名称"
            name="category_name"
            rules={[{ required: true, message: '请输入分类名称' }]}
          >
            <Input placeholder="请输入新的二级分类名称" />
          </Form.Item>

          <Form.Item
            label="关联事件类型"
            name="event_types"
            rules={[{ required: true, message: '请选择至少一个事件类型' }]}
          >
            <Select
              mode="multiple"
              placeholder="选择可以归属到此分类的事件类型"
              optionFilterProp="children"
            >
              {eventTypes.map((type) => (
                <Select.Option key={type} value={type}>
                  {type}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Divider />

          <Text type="secondary">
            说明：新增分类后需要手动配置 Few-shot 示例和更新提示词模板，以便模型能够正确识别新分类
          </Text>
        </Form>
      </Modal>
    </div>
  )
}

export default CategoryManagement
