import React, { useEffect, useState } from 'react';
import { Button, Card, Form, Input, Space, Select, Typography, message, DatePicker, Switch, Row, Col, Divider, Alert, Tabs, Spin } from 'antd';
import { PlusOutlined, InfoCircleOutlined, RobotOutlined, SettingOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { eventAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

// AI创建主题组件
const AITopicCreator = ({ onGenerate, loading }) => {
  const [aiForm] = Form.useForm();
  const [examples, setExamples] = useState([{ positive: '', negative: '', explanation: '' }]);

  // 预设示例模板
  const exampleTemplates = [
    {
      name: '噪音投诉事件',
      description: '筛选所有关于噪音投诉的事件，包括邻居噪音、施工噪音、商户噪音等，但排除交通噪音和娱乐场所噪音',
      examples: [
        {
          positive: '邻居家装修噪音过大，影响正常休息，请相关部门处理',
          negative: 'KTV音响声音过大，影响周边居民休息',
          explanation: '住宅区装修噪音应该被包含，但娱乐场所噪音需要排除'
        },
        {
          positive: '楼上住户深夜制造噪音，严重影响楼下居民睡眠',
          negative: '主干道车辆噪音过大，建议设置隔音屏障',
          explanation: '邻居噪音应该包含，但交通噪音应该排除'
        }
      ]
    },
    {
      name: '停车问题事件',
      description: '筛选所有与停车相关的问题，包括违规停车、停车位不足、占用公共空间停车等',
      examples: [
        {
          positive: '小区门口有车辆乱停放，阻挡行人通行，请处理',
          negative: '停车场收费过高，希望政府进行价格监管',
          explanation: '违规停车行为应该包含，但停车收费问题不属于此类'
        },
        {
          positive: '有车辆长期占用消防通道停车，存在安全隐患',
          negative: '建议在商业区增设更多停车位',
          explanation: '违规占用通道应该包含，但建议类的不算违规事件'
        }
      ]
    },
    {
      name: '环境卫生事件',
      description: '筛选环境卫生相关问题，包括垃圾堆放、卫生清洁、污水排放等问题',
      examples: [
        {
          positive: '小区垃圾桶长期未清理，垃圾堆积严重，影响环境',
          negative: '希望增加垃圾分类宣传，提高居民分类意识',
          explanation: '垃圾清理问题应该包含，但宣传建议类不算环境问题'
        },
        {
          positive: '发现有人在河边倾倒污水，污染水源',
          negative: '建议在公园设置更多垃圾桶，方便游客使用',
          explanation: '污染行为应该包含，但设施建议不属于环境问题'
        }
      ]
    }
  ];

  // 使用预设模板
  const applyTemplate = (template) => {
    aiForm.setFieldsValue({
      description: template.description
    });
    setExamples(template.examples);
    message.success(`已使用"${template.name}"模板`);
  };

  const addExample = () => {
    setExamples(prev => [...prev, { positive: '', negative: '', explanation: '' }]);
  };

  const updateExample = (index, field, value) => {
    setExamples(prev => prev.map((ex, i) => i === index ? { ...ex, [field]: value } : ex));
  };

  const removeExample = (index) => {
    if (examples.length > 1) {
      setExamples(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleAIGenerate = async () => {
    try {
      const values = await aiForm.validateFields();
      const cleanExamples = examples.filter(ex => ex.positive.trim() || ex.negative.trim());

      if (cleanExamples.length === 0) {
        message.warning('请至少提供一个示例');
        return;
      }

      onGenerate({
        description: values.description,
        examples: cleanExamples,
        requirements: values.requirements
      });
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const aiContent = (
    <div>
      <Card style={{ margin: '24px 0', borderRadius: '12px' }}>
        <Alert
          message="快速开始"
          description="您可以选择使用预设模板快速开始，或者自定义描述您的主题需求"
          type="info"
          showIcon
          style={{ marginBottom: 24, borderRadius: '8px' }}
        />

        <div style={{ marginBottom: 24 }}>
          <Text strong style={{ fontSize: '16px', color: '#1f2937', marginBottom: 12, display: 'block' }}>
            选择预设模板（可选）
          </Text>
          <Row gutter={[16, 16]}>
            {exampleTemplates.map((template, index) => (
              <Col span={8} key={index}>
                <Card
                  size="small"
                  hoverable
                  onClick={() => applyTemplate(template)}
                  style={{
                    borderRadius: '8px',
                    border: '1px solid #d9d9d9',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                  bodyStyle={{ padding: '12px 16px' }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <Text strong style={{ color: '#1890ff', fontSize: '14px' }}>
                      {template.name}
                    </Text>
                    <div style={{
                      marginTop: 6,
                      fontSize: '12px',
                      color: '#666',
                      height: '36px',
                      overflow: 'hidden',
                      lineHeight: '18px'
                    }}>
                      {template.description.length > 40
                        ? template.description.substring(0, 40) + '...'
                        : template.description
                      }
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </div>

        <Form.Item
          name="description"
          label={
            <Text strong style={{ fontSize: '16px', color: '#1f2937' }}>
              主题描述
            </Text>
          }
          rules={[{ required: true, message: '请输入主题描述' }]}
          extra="请详细描述您想要创建的主题，包括主要特征和筛选目标"
        >
          <Input.TextArea
            placeholder="例如：我想要筛选出所有关于噪音投诉的事件，包括商户、邻居、施工等产生的噪音问题，但要排除交通噪音和KTV等娱乐场所的投诉"
            rows={4}
            maxLength={500}
            showCount
            style={{ borderRadius: '8px', fontSize: '14px' }}
          />
        </Form.Item>

        <Form.Item
          name="requirements"
          label={
            <Text strong style={{ fontSize: '16px', color: '#1f2937' }}>
              特殊要求（可选）
            </Text>
          }
          extra="您可以提出任何特殊的筛选要求或限制条件"
        >
          <Input.TextArea
            placeholder="例如：只包含三级事件，只关注南门街道的事件，排除已关闭的事件等"
            rows={2}
            maxLength={200}
            showCount
            style={{ borderRadius: '8px', fontSize: '14px' }}
          />
        </Form.Item>
      </Card>

      <Card style={{ margin: '24px 0', borderRadius: '12px' }}>
        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ fontSize: '16px', color: '#1f2937' }}>
            提供示例（Few-shot）
          </Text>
          <div style={{ marginTop: 8, color: '#666', fontSize: '14px' }}>
            请提供一些正面和负面的事件描述示例，帮助AI更好地理解您的筛选意图
          </div>
        </div>

        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {examples.map((example, index) => (
            <Card
              key={index}
              size="small"
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text strong>示例 {index + 1}</Text>
                  {examples.length > 1 && (
                    <Button
                      type="text"
                      danger
                      size="small"
                      onClick={() => removeExample(index)}
                    >
                      删除
                    </Button>
                  )}
                </div>
              }
              style={{ borderRadius: '8px' }}
            >
              <Row gutter={16}>
                <Col span={11}>
                  <div style={{ marginBottom: 8 }}>
                    <Text strong style={{ color: '#52c41a' }}>✓ 正面示例（应该包含的事件）</Text>
                  </div>
                  <Input.TextArea
                    value={example.positive}
                    onChange={(e) => updateExample(index, 'positive', e.target.value)}
                    placeholder="例如：邻居装修噪音过大，影响正常休息，请处理"
                    rows={3}
                    style={{ borderRadius: '6px' }}
                  />
                </Col>
                <Col span={2} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Divider type="vertical" style={{ height: '100%' }} />
                </Col>
                <Col span={11}>
                  <div style={{ marginBottom: 8 }}>
                    <Text strong style={{ color: '#ff4d4f' }}>✗ 负面示例（应该排除的事件）</Text>
                  </div>
                  <Input.TextArea
                    value={example.negative}
                    onChange={(e) => updateExample(index, 'negative', e.target.value)}
                    placeholder="例如：KTV音响声音过大，影响周边居民"
                    rows={3}
                    style={{ borderRadius: '6px' }}
                  />
                </Col>
              </Row>
              <div style={{ marginTop: 12 }}>
                <Text strong>说明（可选）：</Text>
                <Input
                  value={example.explanation}
                  onChange={(e) => updateExample(index, 'explanation', e.target.value)}
                  placeholder="解释为什么这个示例应该被包含或排除..."
                  style={{ marginTop: 4, borderRadius: '6px' }}
                />
              </div>
            </Card>
          ))}

          <Button
            type="dashed"
            onClick={addExample}
            icon={<PlusOutlined />}
            style={{ width: '100%', borderRadius: '8px' }}
          >
            添加更多示例
          </Button>
        </Space>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Button
            type="primary"
            loading={loading}
            onClick={handleAIGenerate}
            icon={<RobotOutlined />}
            size="large"
            style={{
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #722ed1 0%, #531dab 100%)',
              border: 'none',
              padding: '12px 32px',
              height: 'auto'
            }}
          >
            生成主题规则
          </Button>
        </div>
      </Card>
    </div>
  );

  return (
    <div>
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <RobotOutlined style={{ color: '#1890ff', fontSize: '20px' }} />
            <Text strong style={{ fontSize: '18px' }}>AI智能创建主题</Text>
          </div>
        }
        extra={
          <Text type="secondary">让AI帮您自动生成筛选规则</Text>
        }
        style={{ borderRadius: '16px', marginBottom: 24 }}
      >
        <Form form={aiForm} layout="vertical">
          {aiContent}
        </Form>
      </Card>
    </div>
  );
};

// 生成结果展示组件
const AIGenerationResult = ({ result, onAccept, onRegenerate, loading }) => {
  if (!result) return null;

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ThunderboltOutlined style={{ color: '#52c41a', fontSize: '20px' }} />
          <Text strong style={{ fontSize: '18px' }}>AI生成结果</Text>
        </div>
      }
      style={{ borderRadius: '16px', marginBottom: 24 }}
    >
      <Alert
        message="AI已为您生成以下主题规则"
        description="请仔细检查生成的规则是否符合您的需求，您可以接受使用或重新生成"
        type="success"
        showIcon
        style={{ marginBottom: 24, borderRadius: '8px' }}
      />

      <div style={{ background: '#fafafa', padding: 20, borderRadius: '8px', marginBottom: 20 }}>
        <Title level={5} style={{ color: '#1890ff', marginBottom: 16 }}>生成的主题信息</Title>

        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Text strong>主题名称：</Text>
            <Text style={{ marginLeft: 8 }}>{result.name}</Text>
          </Col>
          <Col span={24}>
            <Text strong>描述：</Text>
            <Text style={{ marginLeft: 8 }}>{result.description}</Text>
          </Col>
        </Row>

        {result.include_keywords && (result.include_keywords.description?.length > 0 || result.include_keywords.result?.length > 0) && (
          <div style={{ marginTop: 20 }}>
            <Text strong style={{ color: '#52c41a' }}>包含关键词：</Text>
            <div style={{ marginTop: 8, marginLeft: 16 }}>
              {result.include_keywords.description?.length > 0 && (
                <div>
                  <Text>事件描述：</Text>
                  <Space wrap style={{ marginLeft: 8 }}>
                    {result.include_keywords.description.map((keyword, index) => (
                      <span key={index} style={{
                        background: '#f6ffed',
                        border: '1px solid #b7eb8f',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '12px'
                      }}>
                        {keyword}
                      </span>
                    ))}
                  </Space>
                </div>
              )}
              {result.include_keywords.result?.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <Text>处置结果：</Text>
                  <Space wrap style={{ marginLeft: 8 }}>
                    {result.include_keywords.result.map((keyword, index) => (
                      <span key={index} style={{
                        background: '#f6ffed',
                        border: '1px solid #b7eb8f',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '12px'
                      }}>
                        {keyword}
                      </span>
                    ))}
                  </Space>
                </div>
              )}
            </div>
          </div>
        )}

        {result.exclude_keywords && (result.exclude_keywords.description?.length > 0 || result.exclude_keywords.result?.length > 0) && (
          <div style={{ marginTop: 20 }}>
            <Text strong style={{ color: '#ff4d4f' }}>排除关键词：</Text>
            <div style={{ marginTop: 8, marginLeft: 16 }}>
              {result.exclude_keywords.description?.length > 0 && (
                <div>
                  <Text>事件描述：</Text>
                  <Space wrap style={{ marginLeft: 8 }}>
                    {result.exclude_keywords.description.map((keyword, index) => (
                      <span key={index} style={{
                        background: '#fff2f0',
                        border: '1px solid #ffccc7',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '12px'
                      }}>
                        {keyword}
                      </span>
                    ))}
                  </Space>
                </div>
              )}
              {result.exclude_keywords.result?.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <Text>处置结果：</Text>
                  <Space wrap style={{ marginLeft: 8 }}>
                    {result.exclude_keywords.result.map((keyword, index) => (
                      <span key={index} style={{
                        background: '#fff2f0',
                        border: '1px solid #ffccc7',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '12px'
                      }}>
                        {keyword}
                      </span>
                    ))}
                  </Space>
                </div>
              )}
            </div>
          </div>
        )}

        {result.reasoning && (
          <div style={{ marginTop: 20 }}>
            <Text strong style={{ color: '#1890ff' }}>AI推理过程：</Text>
            <div style={{
              marginTop: 8,
              padding: 12,
              background: '#e6f7ff',
              borderRadius: '6px',
              fontSize: '13px',
              lineHeight: '1.6'
            }}>
              {result.reasoning}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
        <Button
          onClick={onRegenerate}
          loading={loading}
          icon={<RobotOutlined />}
          style={{ borderRadius: '8px' }}
        >
          重新生成
        </Button>
        <Button
          type="primary"
          onClick={onAccept}
          style={{
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
            border: 'none'
          }}
        >
          接受并使用此规则
        </Button>
      </div>
    </Card>
  );
};

// 字段级关键词输入组件
const FieldKeywordInput = ({ name, label, placeholder, tooltip }) => {
  return (
    <Form.Item 
      name={name} 
      label={
        <Text strong style={{ fontSize: '14px', color: '#1f2937' }}>
          {label}
        </Text>
      }
      tooltip={tooltip}
      style={{ marginBottom: 16 }}
    >
      <Select
        mode="tags"
        placeholder={placeholder}
        tokenSeparators={[',', '，', ' ']}
        open={false}
        style={{ 
          width: '100%',
          borderRadius: '8px',
          fontSize: '14px'
        }}
        size="large"
      />
    </Form.Item>
  );
};

// 关键词组配置组件
const KeywordGroupConfig = ({ title, description, includeDescName, includeResultName, excludeDescName, excludeResultName }) => {
  return (
    <Card 
      title={
        <Text strong style={{ 
          color: '#1890ff', 
          fontSize: '16px',
          fontWeight: 600
        }}>
          {title}
        </Text>
      }
      style={{ 
        marginBottom: 32,
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        border: '1px solid #e8f4fd'
      }}
      bodyStyle={{ 
        padding: '24px 32px',
        background: '#fafbfc'
      }}
      headStyle={{
        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
        borderRadius: '12px 12px 0 0',
        borderBottom: '1px solid #e8f4fd'
      }}
    >
      {description && (
        <Alert
          message={
            <Paragraph style={{ 
              margin: 0, 
              fontSize: '14px',
              color: '#374151',
              lineHeight: '1.6'
            }}>
              {description}
            </Paragraph>
          }
          type="info"
          showIcon
          icon={<InfoCircleOutlined style={{ color: '#1890ff' }} />}
          style={{ 
            marginBottom: 24,
            borderRadius: '8px',
            border: '1px solid #bae7ff',
            background: '#f6ffed'
          }}
        />
      )}
      
      <Row gutter={24}>
        <Col span={12}>
          <FieldKeywordInput
            name={includeDescName}
            label="事件描述关键词"
            placeholder="例如：噪音 噪声 吵闹"
            tooltip="在事件描述中包含这些关键词的任意一个"
          />
        </Col>
        <Col span={12}>
          <FieldKeywordInput
            name={includeResultName}
            label="处置结果关键词"
            placeholder="例如：处理完毕 已解决"
            tooltip="在处置结果中包含这些关键词的任意一个"
          />
        </Col>
      </Row>
      
      {excludeDescName && (
        <>
          <Divider style={{ 
            margin: '24px 0',
            borderColor: '#d1d5db'
          }} />
          <Row gutter={24}>
            <Col span={12}>
              <FieldKeywordInput
                name={excludeDescName}
                label="排除事件描述关键词"
                placeholder="例如：KTV 超市 商场"
                tooltip="排除在事件描述中包含这些关键词的事件"
              />
            </Col>
            <Col span={12}>
              <FieldKeywordInput
                name={excludeResultName}
                label="排除处置结果关键词"
                placeholder="例如：无需处理 已撤销"
                tooltip="排除在处置结果中包含这些关键词的事件"
              />
            </Col>
          </Row>
        </>
      )}
    </Card>
  );
};

const TopicCreate = () => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [filterOptions, setFilterOptions] = useState({ towns: [], levels: [], categories: [] });
  const [activeTab, setActiveTab] = useState('manual');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const navigate = useNavigate();
  const { topicId } = useParams();
  const isEditMode = !!topicId;
  
  // 加载主题数据（编辑模式）
  useEffect(() => {
    const loadTopic = async () => {
      if (!isEditMode) return;

      try {
        setLoading(true);
        const res = await fetch(`http://localhost:8000/api/topics/${topicId}`);
        if (!res.ok) throw new Error('加载主题失败');
        const topic = await res.json();

        // 填充表单数据
        form.setFieldsValue({
          name: topic.name,
          description: topic.description || '',
          include_desc: topic.include_keywords?.description || [],
          include_result: topic.include_keywords?.result || [],
          exclude_desc: topic.exclude_keywords?.description || [],
          exclude_result: topic.exclude_keywords?.result || [],
          dedup: topic.dedup === 'description'
        });

        // 填充分类数据
        if (topic.categories && topic.categories.length > 0) {
          const cats = topic.categories.map(c => ({
            towns: c.towns || [],
            levels: c.levels || [],
            categories: c.categories || [],
            timeRange: (c.start_time || c.end_time)
              ? [
                  c.start_time ? dayjs(c.start_time) : null,
                  c.end_time ? dayjs(c.end_time) : null
                ]
              : null
          }));
          setCategories(cats);
        }
      } catch (e) {
        console.error(e);
        message.error('加载主题失败: ' + e.message);
        navigate('/topics');
      } finally {
        setLoading(false);
      }
    };

    loadTopic();
  }, [topicId, isEditMode, form, navigate]);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const opts = await eventAPI.getFilterOptions();
        setFilterOptions(opts || { towns: [], levels: [], categories: [] });
      } catch (e) {
        // ignore
      }
    };
    loadOptions();
  }, []);

  const addCategory = () => {
    setCategories(prev => [...prev, { towns: [], levels: [], categories: [], timeRange: null }]);
  };

  const updateCategory = (idx, field, value) => {
    setCategories(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  const removeCategory = (idx) => {
    setCategories(prev => prev.filter((_, i) => i !== idx));
  };

  // AI生成主题规则
  const handleAIGenerate = async (aiData) => {
    setAiGenerating(true);
    try {
      // 模拟AI API调用
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 模拟AI生成的结果
      const mockResult = generateMockAIResult(aiData);
      setAiResult(mockResult);
    } catch (error) {
      message.error('AI生成失败: ' + error.message);
    } finally {
      setAiGenerating(false);
    }
  };

  // 接受AI生成的结果
  const handleAcceptAIResult = () => {
    if (!aiResult) return;

    // 将AI结果设置到表单中
    form.setFieldsValue({
      name: aiResult.name,
      description: aiResult.description,
      include_desc: aiResult.include_keywords?.description || [],
      include_result: aiResult.include_keywords?.result || [],
      exclude_desc: aiResult.exclude_keywords?.description || [],
      exclude_result: aiResult.exclude_keywords?.result || [],
      dedup: true
    });

    // 切换到手动编辑模式
    setActiveTab('manual');
    message.success('AI生成的规则已应用，您可以继续编辑');
  };

  // 生成模拟AI结果
  const generateMockAIResult = (aiData) => {
    const { description, examples, requirements } = aiData;

    // 基于示例分析生成关键词（这里是模拟逻辑）
    const positiveTexts = examples.map(ex => ex.positive).filter(Boolean).join(' ');
    const negativeTexts = examples.map(ex => ex.negative).filter(Boolean).join(' ');

    // 模拟关键词提取
    const includeDescKeywords = extractKeywords(positiveTexts, '噪音 噪声 吵闹 装修 施工');
    const excludeDescKeywords = extractKeywords(negativeTexts, 'KTV 酒吧 交通 马路');

    const reasoning = `基于您的描述"${description}"和提供的示例，AI分析了以下内容：
1. 从正面示例中提取了关键词：${includeDescKeywords.join('、')}
2. 从负面示例中识别了需要排除的关键词：${excludeDescKeywords.join('、')}
3. 根据特殊要求"${requirements || '无'}"进行了相应调整
4. 应用了事件描述去重策略以避免重复事件`;

    return {
      name: generateTopicName(description),
      description: description,
      include_keywords: {
        description: includeDescKeywords,
        result: []
      },
      exclude_keywords: {
        description: excludeDescKeywords,
        result: []
      },
      reasoning: reasoning
    };
  };

  // 辅助函数：从文本中提取关键词（模拟）
  const extractKeywords = (text, defaultKeywords) => {
    if (!text) return defaultKeywords.split(' ');

    const keywords = [];

    // 扩展的关键词词典
    const keywordDict = {
      '噪音': ['噪音', '噪声', '吵闹', '声音', '音响', '响声'],
      '装修': ['装修', '施工', '敲击', '钻孔', '电钻', '砸墙'],
      '停车': ['停车', '泊车', '车辆', '汽车', '机动车', '私家车'],
      '垃圾': ['垃圾', '废物', '污染', '脏乱', '异味', '臭味'],
      '占道': ['占道', '堵塞', '阻挡', '妨碍', '通道'],
      '违规': ['违规', '违法', '不当', '擅自'],
      'KTV': ['KTV', '酒吧', '夜店', '娱乐', '酒店'],
      '交通': ['交通', '马路', '道路', '车道', '高速']
    };

    // 分析文本中包含的关键词类别
    Object.keys(keywordDict).forEach(category => {
      keywordDict[category].forEach(word => {
        if (text.includes(word) && !keywords.includes(word)) {
          keywords.push(word);
        }
      });
    });

    return keywords.length > 0 ? keywords : defaultKeywords.split(' ');
  };

  // 辅助函数：生成主题名称
  const generateTopicName = (description) => {
    if (description.includes('噪音') || description.includes('噪声')) {
      return '噪音相关事件';
    } else if (description.includes('垃圾') || description.includes('卫生')) {
      return '环境卫生事件';
    } else if (description.includes('停车') || description.includes('车辆')) {
      return '停车相关事件';
    } else {
      return 'AI生成主题';
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const parseKeywords = (v) => Array.isArray(v)
        ? v.map(s => String(s).trim()).filter(Boolean)
        : String(v || '')
            .split(/[，,\s]+/)
            .map(s => s.trim())
            .filter(Boolean);

      const payload = {
        name: values.name,
        description: values.description || '',
        // 新的关键词结构
        include_keywords: {
          description: parseKeywords(values.include_desc),
          result: parseKeywords(values.include_result)
        },
        exclude_keywords: {
          description: parseKeywords(values.exclude_desc),
          result: parseKeywords(values.exclude_result)
        },
        // 去掉精筛（第四道）
        fine_filters: [],
        // 去重：仅"按事件描述去重"开关，默认开
        dedup: values.dedup ? 'description' : null,
        categories: categories.map(c => ({
          name: null,
          keywords: [],
          towns: c.towns || [],
          levels: c.levels || [],
          categories: c.categories || [],
          start_time: c.timeRange && c.timeRange[0] ? c.timeRange[0].format('YYYY-MM-DD') : null,
          end_time: c.timeRange && c.timeRange[1] ? c.timeRange[1].format('YYYY-MM-DD') : null,
        })),
        enabled: true
      };

      const url = isEditMode
        ? `http://localhost:8000/api/topics/${topicId}`
        : 'http://localhost:8000/api/topics';

      const res = await fetch(url, {
        method: isEditMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(isEditMode ? '更新主题失败' : '创建主题失败');
      const topic = await res.json();
      message.success(isEditMode ? '主题更新成功' : '主题创建成功');
      navigate(`/topics/${topic.id}`);
    } catch (e) {
      if (e?.errorFields) return; // 表单校验错误
      console.error(e);
      message.error((isEditMode ? '更新失败: ' : '创建失败: ') + e.message);
    } finally {
      setSaving(false);
    }
  };

  const tabItems = [
    {
      key: 'ai',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <RobotOutlined />
          <span>AI智能创建</span>
        </div>
      ),
      children: (
        <div>
          <AITopicCreator
            onGenerate={handleAIGenerate}
            loading={aiGenerating}
          />
          <AIGenerationResult
            result={aiResult}
            onAccept={handleAcceptAIResult}
            onRegenerate={() => setAiResult(null)}
            loading={aiGenerating}
          />
        </div>
      )
    },
    {
      key: 'manual',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SettingOutlined />
          <span>手动配置规则</span>
        </div>
      ),
      children: (
        <Form form={form} layout="vertical" size="large">
          <div style={{ marginBottom: 32 }}>
            <Title level={4} style={{ 
              color: '#374151',
              marginBottom: 24,
              fontSize: '18px'
            }}>
              基础信息
            </Title>
            
            <Form.Item 
              name="name" 
              label={
                <Text strong style={{ fontSize: '14px', color: '#1f2937' }}>
                  主题名称
                </Text>
              }
              rules={[{ required: true, message: '请输入主题名称' }]}
              style={{ marginBottom: 20 }}
            > 
              <Input 
                placeholder="例如：噪音相关事件" 
                maxLength={50}
                style={{ 
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
            </Form.Item>

            <Form.Item 
              name="description" 
              label={
                <Text strong style={{ fontSize: '14px', color: '#1f2937' }}>
                  描述
                </Text>
              }
              style={{ marginBottom: 0 }}
            > 
              <Input.TextArea 
                placeholder="可描述该主题创建逻辑和用途" 
                rows={3} 
                maxLength={200}
                style={{ 
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
            </Form.Item>
          </div>

          {/* 包含关键词配置 */}
          <KeywordGroupConfig
            title="第一道：包含关键词筛选"
            description="事件描述和处置结果之间是AND关系：必须同时满足两个字段的条件（如果都配置了关键词）。每个字段内的多个关键词之间是OR关系：满足任意一个即可。"
            includeDescName="include_desc"
            includeResultName="include_result"
          />

          {/* 过滤关键词配置 */}
          <KeywordGroupConfig
            title="第二道：过滤关键词筛选"
            description="排除包含指定关键词的事件。事件描述和处置结果之间是OR关系：任意一个字段包含过滤关键词的事件都会被排除。每个字段内的多个关键词之间是OR关系：包含任意一个即被排除。"
            includeDescName="exclude_desc"
            includeResultName="exclude_result"
            excludeDescName={null}
            excludeResultName={null}
          />

          <Card style={{
            marginBottom: 32,
            borderRadius: '12px',
            border: '1px solid #e8f4fd',
            background: '#fafbfc'
          }}>
            <Title level={4} style={{ 
              color: '#374151',
              marginBottom: 16,
              fontSize: '16px'
            }}>
              第三道：数据去重
            </Title>
            <Form.Item 
              name="dedup" 
              label={
                <Text strong style={{ fontSize: '14px', color: '#1f2937' }}>
                  按事件描述去重
                </Text>
              }
              valuePropName="checked" 
              initialValue={true}
              style={{ marginBottom: 0 }}
            >
              <Switch 
                checkedChildren="开启"
                unCheckedChildren="关闭"
              />
            </Form.Item>
          </Card>

          <Card style={{
            marginBottom: 32,
            borderRadius: '12px',
            border: '1px solid #e8f4fd',
            background: '#fafbfc'
          }}>
            <Title level={4} style={{ 
              color: '#374151',
              marginBottom: 24,
              fontSize: '16px'
            }}>
              分类配置（可选）
            </Title>
            <Form.Item style={{ marginBottom: 0 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                {categories.map((c, idx) => (
                  <Card 
                    key={idx} 
                    size="small" 
                    style={{ 
                      background: '#ffffff',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}
                  >
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '1fr 1fr', 
                        gap: 16 
                      }}>
                        <Select
                          mode="multiple"
                          placeholder="街镇名称（可多选）"
                          value={c.towns}
                          onChange={(vals) => updateCategory(idx, 'towns', vals)}
                          options={(filterOptions.towns || []).map(t => ({ label: t, value: t }))}
                          style={{ borderRadius: '6px' }}
                        />
                        <Select
                          mode="multiple"
                          placeholder="事件级别（可多选）"
                          value={c.levels}
                          onChange={(vals) => updateCategory(idx, 'levels', vals)}
                          options={(filterOptions.levels || []).map(t => ({ label: t, value: t }))}
                          style={{ borderRadius: '6px' }}
                        />
                        <Select
                          mode="multiple"
                          placeholder="二级分类（可多选）"
                          value={c.categories}
                          onChange={(vals) => updateCategory(idx, 'categories', vals)}
                          options={(filterOptions.categories || []).map(t => ({ label: t, value: t }))}
                          style={{ borderRadius: '6px' }}
                        />
                        <DatePicker.RangePicker
                          value={c.timeRange || null}
                          onChange={(dates) => updateCategory(idx, 'timeRange', dates)}
                          placeholder={["开始日期", "结束日期"]}
                          style={{ borderRadius: '6px' }}
                        />
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <Button 
                          danger 
                          size="small" 
                          onClick={() => removeCategory(idx)}
                          style={{ borderRadius: '6px' }}
                        >
                          删除分类
                        </Button>
                      </div>
                    </Space>
                  </Card>
                ))}
                <Button 
                  onClick={addCategory}
                  icon={<PlusOutlined />}
                  style={{ 
                    borderRadius: '8px',
                    borderStyle: 'dashed'
                  }}
                >
                  添加分类
                </Button>
              </Space>
            </Form.Item>
          </Card>

          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 16,
            paddingTop: 24,
            borderTop: '1px solid #e5e7eb'
          }}>
            <Button
              onClick={() => navigate('/topics')}
              style={{
                borderRadius: '8px',
                padding: '8px 24px',
                height: 'auto'
              }}
            >
              取消
            </Button>
            <Button
              type="primary"
              loading={saving}
              onClick={handleSubmit}
              style={{
                borderRadius: '8px',
                padding: '8px 24px',
                height: 'auto',
                background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
                border: 'none'
              }}
            >
              {isEditMode ? '更新主题' : '保存主题'}
            </Button>
          </div>
        </Form>
      )
    }
  ];

  if (loading) {
    return (
      <div className="page-container" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px'
      }}>
        <Spin size="large" tip="加载主题数据中..." />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
        padding: '24px 0'
      }}>
        <div>
          <Title level={2} style={{
            margin: 0,
            color: '#1f2937',
            fontSize: '28px',
            fontWeight: 600
          }}>
            {isEditMode ? '编辑主题' : '创建主题'}
          </Title>
          <Paragraph style={{
            margin: '8px 0 0 0',
            color: '#6b7280',
            fontSize: '16px'
          }}>
            {isEditMode
              ? '修改主题的配置规则和筛选条件'
              : '选择创建方式：使用AI智能生成规则，或手动配置详细规则'
            }
          </Paragraph>
        </div>
      </div>

      <Card style={{
        borderRadius: '16px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        border: '1px solid #e5e7eb'
      }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="large"
          style={{ minHeight: '600px' }}
        />
      </Card>
    </div>
  );
};

export default TopicCreate;
