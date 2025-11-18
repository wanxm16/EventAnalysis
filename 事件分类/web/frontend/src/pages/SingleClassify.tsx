import { useState, useEffect } from 'react'
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Space,
  Alert,
  Statistic,
  Row,
  Col,
  Modal,
  message,
  Spin,
} from 'antd'
import { CheckCircleOutlined, SendOutlined, ReloadOutlined } from '@ant-design/icons'
import {
  classifySingleEvent,
  getEventTypes,
  submitFeedback,
  getCategories,
  type SingleEventRequest,
  type SingleEventResponse,
} from '../services/api'

const { TextArea } = Input

const SingleClassify = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SingleEventResponse | null>(null)
  const [eventTypes, setEventTypes] = useState<string[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false)
  const [feedbackForm] = Form.useForm()

  useEffect(() => {
    loadEventTypes()
    loadCategories()
  }, [])

  const loadEventTypes = async () => {
    try {
      const data = await getEventTypes()
      setEventTypes(data.event_types)
    } catch (error) {
      message.error('加载事件类型失败')
    }
  }

  const loadCategories = async () => {
    try {
      const data = await getCategories()
      setCategories(data.categories)
    } catch (error) {
      message.error('加载分类列表失败')
    }
  }

  const handleClassify = async (values: SingleEventRequest) => {
    setLoading(true)
    try {
      const response = await classifySingleEvent(values)
      setResult(response)
      message.success('分类成功！')
    } catch (error: any) {
      message.error(error.message || '分类失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    form.resetFields()
    setResult(null)
  }

  const handleFeedback = () => {
    if (!result) return
    const formValues = form.getFieldsValue()
    feedbackForm.setFieldsValue({
      event_description: formValues.event_description,
      event_type: formValues.event_type,
      predicted_category: result.predicted_category,
      confidence: result.confidence,
    })
    setFeedbackModalVisible(true)
  }

  const handleSubmitFeedback = async () => {
    try {
      const values = await feedbackForm.validateFields()
      await submitFeedback(values)
      message.success('反馈提交成功，感谢您的贡献！')
      setFeedbackModalVisible(false)
      feedbackForm.resetFields()
    } catch (error: any) {
      if (error.message) {
        message.error(error.message)
      }
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return '#52c41a'
    if (confidence >= 0.6) return '#faad14'
    return '#ff4d4f'
  }

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>单事件实时分类</h1>

      <Row gutter={24}>
        <Col span={12}>
          <Card title="事件信息输入" bordered={false}>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleClassify}
              initialValues={{
                district: '',
                street: '',
              }}
            >
              <Form.Item
                label="事件描述"
                name="event_description"
                rules={[{ required: true, message: '请输入事件描述' }]}
              >
                <TextArea
                  rows={6}
                  placeholder="请详细描述事件内容..."
                  showCount
                  maxLength={1000}
                />
              </Form.Item>

              <Form.Item
                label="事件类型"
                name="event_type"
                rules={[{ required: true, message: '请选择事件类型' }]}
              >
                <Select
                  placeholder="请选择事件类型"
                  showSearch
                  optionFilterProp="children"
                >
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

              <Form.Item>
                <Space>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SendOutlined />}
                    loading={loading}
                  >
                    开始分类
                  </Button>
                  <Button icon={<ReloadOutlined />} onClick={handleReset}>
                    重置
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col span={12}>
          <Card title="分类结果" bordered={false}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <Spin size="large" tip="正在分类中..." />
              </div>
            ) : result ? (
              <div>
                <Alert
                  message="分类完成"
                  description={
                    <div>
                      <p style={{ fontSize: 16, marginTop: 12 }}>
                        <strong>预测分类：</strong>
                        <span style={{ color: '#1890ff', fontSize: 18, marginLeft: 8 }}>
                          {result.predicted_category}
                        </span>
                      </p>
                      {result.reasoning && (
                        <p style={{ fontSize: 14, marginTop: 16, color: '#595959' }}>
                          <strong>分类依据：</strong>
                          <span style={{ marginLeft: 8 }}>{result.reasoning}</span>
                        </p>
                      )}
                    </div>
                  }
                  type="success"
                  icon={<CheckCircleOutlined />}
                  showIcon
                  style={{ marginBottom: 24 }}
                />

                <Row gutter={16} style={{ marginBottom: 24 }}>
                  <Col span={12}>
                    <Statistic
                      title="置信度"
                      value={result.confidence}
                      precision={2}
                      valueStyle={{ color: getConfidenceColor(result.confidence) }}
                      suffix="%"
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="分类时间"
                      value={new Date(result.timestamp).toLocaleString('zh-CN')}
                      valueStyle={{ fontSize: 14 }}
                    />
                  </Col>
                </Row>

                <Alert
                  message="置信度说明"
                  description={
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      <li>≥80%：高置信度，分类结果可靠</li>
                      <li>60%-80%：中等置信度，建议人工核验</li>
                      <li>&lt;60%：低置信度，需要人工审核</li>
                    </ul>
                  }
                  type="info"
                  style={{ marginBottom: 24 }}
                />

                <Button type="default" onClick={handleFeedback} block>
                  分类结果有误？点击反馈
                </Button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
                填写左侧表单并提交后，分类结果将在此显示
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        title="分类结果反馈"
        open={feedbackModalVisible}
        onOk={handleSubmitFeedback}
        onCancel={() => setFeedbackModalVisible(false)}
        okText="提交反馈"
        cancelText="取消"
      >
        <Form form={feedbackForm} layout="vertical">
          <Form.Item label="事件描述" name="event_description">
            <TextArea rows={3} disabled />
          </Form.Item>

          <Form.Item label="事件类型" name="event_type">
            <Input disabled />
          </Form.Item>

          <Form.Item label="系统预测分类" name="predicted_category">
            <Input disabled />
          </Form.Item>

          <Form.Item label="置信度" name="confidence">
            <Input disabled suffix="%" />
          </Form.Item>

          <Form.Item
            label="正确分类"
            name="correct_category"
            rules={[{ required: true, message: '请选择正确的分类' }]}
          >
            <Select placeholder="请选择正确的分类" showSearch>
              {categories.map((cat) => (
                <Select.Option key={cat} value={cat}>
                  {cat}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default SingleClassify
