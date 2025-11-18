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
  Collapse,
  Statistic,
  Row,
  Col,
} from 'antd'
import { PlusOutlined, EyeOutlined } from '@ant-design/icons'
import {
  getFewShotExamples,
  getCategoryExamples,
  addFewShotExample,
  getCategories,
  getEventTypes,
  type FewShotExample,
} from '../services/api'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input
const { Panel } = Collapse

const FewShotManagement = () => {
  const [allExamples, setAllExamples] = useState<Record<string, FewShotExample[]>>({})
  const [categories, setCategories] = useState<string[]>([])
  const [eventTypes, setEventTypes] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [categoryExamples, setCategoryExamples] = useState<FewShotExample[]>([])
  const [form] = Form.useForm()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [examplesData, categoriesData, eventTypesData] = await Promise.all([
        getFewShotExamples(),
        getCategories(),
        getEventTypes(),
      ])
      setAllExamples(examplesData)
      setCategories(categoriesData.categories)
      setEventTypes(eventTypesData.event_types)
    } catch (error) {
      message.error('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  const handleAddExample = () => {
    form.resetFields()
    setModalVisible(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const example: FewShotExample = {
        category: values.category,
        event_description: values.event_description,
        event_type: values.event_type,
        district: values.district || '',
        street: values.street || '',
      }
      await addFewShotExample(example)
      message.success('示例添加成功')
      setModalVisible(false)
      loadData()
    } catch (error: any) {
      if (error.message) {
        message.error(error.message)
      }
    }
  }

  const handleViewDetails = async (category: string) => {
    setSelectedCategory(category)
    setLoading(true)
    try {
      const data = await getCategoryExamples(category)
      setCategoryExamples(data.examples)
      setDetailModalVisible(true)
    } catch (error) {
      message.error('加载示例详情失败')
    } finally {
      setLoading(false)
    }
  }

  const getSummaryData = () => {
    return Object.entries(allExamples).map(([category, examples]) => ({
      key: category,
      category,
      count: examples.length,
    }))
  }

  const summaryColumns = [
    {
      title: '序号',
      key: 'index',
      width: 80,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: '分类名称',
      dataIndex: 'category',
      key: 'category',
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: '示例数量',
      dataIndex: 'count',
      key: 'count',
      sorter: (a: any, b: any) => a.count - b.count,
      render: (count: number) => (
        <Text strong style={{ fontSize: 16 }}>
          {count}
        </Text>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: any) => (
        <Space size="middle">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetails(record.category)}
          >
            查看详情
          </Button>
        </Space>
      ),
    },
  ]

  const detailColumns = [
    {
      title: '序号',
      key: 'index',
      width: 60,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: '事件描述',
      dataIndex: '事件描述',
      key: '事件描述',
      ellipsis: true,
      width: 300,
    },
    {
      title: '事件类型',
      dataIndex: '事件类型',
      key: '事件类型',
      width: 120,
    },
    {
      title: '区县',
      dataIndex: '区县名称',
      key: '区县名称',
      width: 100,
      render: (text: string) => text || '-',
    },
    {
      title: '镇街',
      dataIndex: '镇街名称',
      key: '镇街名称',
      width: 100,
      render: (text: string) => text || '-',
    },
  ]

  const getTotalExamples = () => {
    return Object.values(allExamples).reduce((sum, examples) => sum + examples.length, 0)
  }

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>
        Few-shot 示例管理
      </Title>

      <Row gutter={24} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="总分类数"
              value={Object.keys(allExamples).length}
              suffix="个"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="总示例数" value={getTotalExamples()} suffix="条" />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="平均示例数"
              value={
                Object.keys(allExamples).length > 0
                  ? (getTotalExamples() / Object.keys(allExamples).length).toFixed(1)
                  : 0
              }
              suffix="条/分类"
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="分类示例统计"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddExample}>
            新增示例
          </Button>
        }
      >
        <Table
          columns={summaryColumns}
          dataSource={getSummaryData()}
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 个分类`,
          }}
        />
      </Card>

      <Modal
        title="新增 Few-shot 示例"
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        okText="确定"
        cancelText="取消"
        width={700}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            label="目标分类"
            name="category"
            rules={[{ required: true, message: '请选择分类' }]}
          >
            <Select placeholder="选择要添加示例的分类" showSearch>
              {categories.map((cat) => (
                <Select.Option key={cat} value={cat}>
                  {cat}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="事件描述"
            name="event_description"
            rules={[{ required: true, message: '请输入事件描述' }]}
          >
            <TextArea
              rows={4}
              placeholder="输入具体的事件描述，越详细越好..."
              showCount
              maxLength={500}
            />
          </Form.Item>

          <Form.Item
            label="事件类型"
            name="event_type"
            rules={[{ required: true, message: '请选择事件类型' }]}
          >
            <Select placeholder="选择事件类型" showSearch>
              {eventTypes.map((type) => (
                <Select.Option key={type} value={type}>
                  {type}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="区县名称" name="district">
                <Input placeholder="可选" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="镇街名称" name="street">
                <Input placeholder="可选" />
              </Form.Item>
            </Col>
          </Row>

          <Text type="secondary">
            提示：Few-shot 示例用于帮助模型理解各个分类的特征，示例质量直接影响分类准确度
          </Text>
        </Form>
      </Modal>

      <Modal
        title={`分类示例详情 - ${selectedCategory}`}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={1000}
      >
        <Table
          columns={detailColumns}
          dataSource={categoryExamples}
          rowKey={(_, index) => index?.toString() || '0'}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `共 ${total} 条示例`,
          }}
        />
      </Modal>
    </div>
  )
}

export default FewShotManagement
