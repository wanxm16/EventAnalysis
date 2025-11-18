import React, { useState, useEffect, useMemo } from 'react';
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
  Typography,
  Tag,
  Tooltip,
  Space
} from 'antd';
import {
  ThunderboltOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  TagsOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { TextArea } = Input;
const { Title, Text } = Typography;

const API_BASE_URL = 'http://localhost:8000';

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
  const [tagLibrary, setTagLibrary] = useState(null);
  const [tagLibraryLoading, setTagLibraryLoading] = useState(false);

  useEffect(() => {
    const fetchTagLibrary = async () => {
      setTagLibraryLoading(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/api/classify/tag-library`);
        setTagLibrary(response.data);
      } catch (error) {
        console.error('标签库加载失败:', error);
        message.warning('标签库加载失败，暂时无法展示标签说明');
      } finally {
        setTagLibraryLoading(false);
      }
    };

    fetchTagLibrary();
  }, []);

  const tagMetaMap = useMemo(() => {
    if (!tagLibrary?.groups) {
      return {};
    }
    const map = {};
    tagLibrary.groups.forEach((group) => {
      group.tags.forEach((tag) => {
        map[tag.tag_id] = {
          ...tag,
          groupName: group.name
        };
      });
    });
    return map;
  }, [tagLibrary]);

  const formatConfidence = (value = 0) => Number((value * 100).toFixed(1));

  const renderTagSuggestions = () => {
    if (!result?.tags?.length) {
      return null;
    }

    return (
      <>
        <Divider />
        <Text type="secondary">智能标签推荐：</Text>
        <div style={{ marginTop: 12, marginBottom: 4 }}>
          {result.tags.map((tag) => {
            const meta = tagMetaMap[tag.tag_id] || {};
            const percent = `${Math.round((tag.confidence || 0) * 100)}%`;
            const tooltipTitle = [
              meta.label || tag.label,
              meta.groupName ? `所属：${meta.groupName}` : null,
              `置信度：${percent}`,
              tag.reason || meta.description
            ]
              .filter(Boolean)
              .join(' | ');

            return (
              <Tooltip title={tooltipTitle} key={`${tag.tag_id}-${tag.label}`}>
                <Tag color={meta.color || 'geekblue'} style={{ marginBottom: 8 }}>
                  {meta.label || tag.label}（{percent}）
                </Tag>
              </Tooltip>
            );
          })}
        </div>
        <Text type="secondary" style={{ fontSize: 12 }}>
          标签为AI建议，可用于后续批量操作或人工确认。
        </Text>
      </>
    );
  };

  const handleClassify = async (values) => {
    setLoading(true);
    setResult(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/classify/single`, {
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
                      value={formatConfidence(result.confidence || 0)}
                      precision={1}
                      suffix="%"
                      valueStyle={{ color: (result.confidence || 0) >= 0.8 ? '#3f8600' : '#faad14' }}
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

                {renderTagSuggestions()}

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

          <Card
            title={<><TagsOutlined /> 标签参考</>}
            bordered={false}
            style={{ marginTop: 16 }}
            size="small"
          >
            {tagLibraryLoading && (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <Spin size="small" />
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary">正在加载标签库...</Text>
                </div>
              </div>
            )}

            {!tagLibraryLoading && (!tagLibrary?.groups || tagLibrary.groups.length === 0) && (
              <Alert
                type="info"
                showIcon
                message="暂无标签库"
                description="未能获取标签定义，仍可使用分类功能。"
              />
            )}

            {!tagLibraryLoading && tagLibrary?.groups?.length > 0 && (
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                {tagLibrary.groups.map((group) => (
                  <div key={group.group_id} style={{ width: '100%' }}>
                    <Text strong>{group.name}</Text>
                    {group.description && (
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>{group.description}</Text>
                      </div>
                    )}
                    <div style={{ marginTop: 8 }}>
                      {group.tags.map((tag) => (
                        <Tag color={tag.color || 'blue'} key={tag.tag_id} style={{ marginBottom: 6 }}>
                          {tag.label}
                        </Tag>
                      ))}
                    </div>
                  </div>
                ))}
              </Space>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default EventClassification;
