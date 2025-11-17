import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  message,
  Spin,
  Alert,
  Divider,
  Row,
  Col,
  Statistic,
  Typography
} from 'antd';
import {
  ThunderboltOutlined,
  FileTextOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { TextArea } = Input;
const { Title, Text } = Typography;

const EVENT_TYPES = [
  '矛盾纠纷',
  '城市管理',
  '消防安全',
  '安全生产',
  '食品安全',
  '环境保护',
  '交通管理',
  '其他'
];

function EventClassification() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleClassify = async (values) => {
    setLoading(true);
    setResult(null);

    try {
      const response = await axios.post('http://localhost:8000/api/classify/single', {
        event_description: values.event_description,
        event_type: values.event_type,
        district: values.district || '',
        street: values.street || ''
      });

      setResult(response.data);
      message.success('分类成功！');
    } catch (error) {
      console.error('分类失败:', error);
      message.error(error.response?.data?.detail || '分类失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    form.resetFields();
    setResult(null);
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <ThunderboltOutlined /> 智能事件分类
      </Title>
      <Text type="secondary">
        基于千问大模型的事件二级分类预测系统，支持145个二级分类类别
      </Text>

      <Divider />

      <Row gutter={24}>
        <Col span={14}>
          <Card
            title={<><FileTextOutlined /> 事件信息</>}
            bordered={false}
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={handleClassify}
              initialValues={{
                event_type: '矛盾纠纷'
              }}
            >
              <Form.Item
                label="事件描述"
                name="event_description"
                rules={[
                  { required: true, message: '请输入事件描述' },
                  { min: 10, message: '事件描述至少10个字符' }
                ]}
              >
                <TextArea
                  rows={6}
                  placeholder="请详细描述事件内容，描述越详细分类越准确&#10;&#10;示例：居民反映小区业主房子涉嫌违建，要求相关部门处理"
                  showCount
                  maxLength={500}
                />
              </Form.Item>

              <Form.Item
                label="事件类型（一级分类）"
                name="event_type"
                rules={[{ required: true, message: '请选择事件类型' }]}
              >
                <Select
                  placeholder="请选择事件类型"
                  options={EVENT_TYPES.map(type => ({ label: type, value: type }))}
                />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="区县名称"
                    name="district"
                  >
                    <Input placeholder="例如：海曙区" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="镇街名称"
                    name="street"
                  >
                    <Input placeholder="例如：高桥镇" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  icon={<ThunderboltOutlined />}
                  size="large"
                  block
                >
                  开始智能分类
                </Button>
              </Form.Item>

              <Form.Item>
                <Button onClick={handleReset} block>
                  重置表单
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col span={10}>
          <Card
            title={<><CheckCircleOutlined /> 分类结果</>}
            bordered={false}
          >
            {loading && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Spin size="large" />
                <div style={{ marginTop: 16 }}>
                  <Text type="secondary">正在分类中...</Text>
                </div>
              </div>
            )}

            {!loading && !result && (
              <Alert
                message="等待分类"
                description="请在左侧填写事件信息后点击「开始智能分类」按钮"
                type="info"
                showIcon
              />
            )}

            {!loading && result && (
              <div>
                <Alert
                  message="分类完成"
                  description={
                    <div>
                      <Text>分类结果已生成，请查看下方详情</Text>
                    </div>
                  }
                  type="success"
                  showIcon
                  style={{ marginBottom: 16 }}
                />

                <Row gutter={16}>
                  <Col span={24}>
                    <Statistic
                      title="预测分类（二级分类）"
                      value={result.predicted_category}
                      valueStyle={{ color: '#3f8600', fontSize: 24, fontWeight: 'bold' }}
                    />
                  </Col>
                </Row>

                <Divider />

                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic
                      title="置信度"
                      value={result.confidence}
                      precision={2}
                      suffix="%"
                      valueStyle={{ color: result.confidence >= 0.8 ? '#3f8600' : '#faad14' }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="分类时间"
                      value={new Date(result.timestamp).toLocaleTimeString('zh-CN')}
                      valueStyle={{ fontSize: 16 }}
                    />
                  </Col>
                </Row>

                {result.reasoning && (
                  <>
                    <Divider />
                    <div>
                      <Text type="secondary">分类依据：</Text>
                      <div style={{ marginTop: 8, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
                        <Text>{result.reasoning}</Text>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </Card>

          <Card
            title="使用说明"
            bordered={false}
            style={{ marginTop: 16 }}
            size="small"
          >
            <ul style={{ paddingLeft: 20, margin: 0 }}>
              <li>事件描述越详细，分类结果越准确</li>
              <li>建议描述长度在20-200字之间</li>
              <li>系统支持145个二级分类类别</li>
              <li>根据事件类型自动限定分类范围</li>
              <li>分类结果仅供参考，最终以人工审核为准</li>
            </ul>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default EventClassification;
