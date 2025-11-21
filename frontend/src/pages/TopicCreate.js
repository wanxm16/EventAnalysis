import React, { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  Space,
  Select,
  Typography,
  message,
  DatePicker,
  Switch,
  Row,
  Col,
  Steps,
  Divider,
  Alert,
  Checkbox,
  Tag,
  Spin,
  Empty,
  Modal,
  Statistic
} from 'antd';
import {
  PlusOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  RightOutlined,
  LeftOutlined,
  FilterOutlined,
  TagsOutlined,
  RocketOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { eventAPI, tagAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

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
        marginBottom: 24,
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        border: '1px solid #e8f4fd'
      }}
      bodyStyle={{
        padding: '24px',
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
          message={description}
          type="info"
          showIcon
          icon={<InfoCircleOutlined style={{ color: '#1890ff' }} />}
          style={{
            marginBottom: 20,
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
          <Divider style={{ margin: '20px 0' }} />
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
  const [currentStep, setCurrentStep] = useState(0);
  const [step1Form] = Form.useForm();
  const [step3Form] = Form.useForm();

  // 第一步：规则筛选
  const [step1Skipped, setStep1Skipped] = useState(false);
  const [categories, setCategories] = useState([{ towns: [], levels: [], categories: [], timeRange: null }]);
  const [filterOptions, setFilterOptions] = useState({ towns: [], levels: [], categories: [] });

  // 第二步：标签识别
  const [step2Skipped, setStep2Skipped] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [tags, setTags] = useState([]);
  const [groups, setGroups] = useState([]);
  const [tagsLoading, setTagsLoading] = useState(false);

  // 第三步：创建主题
  const [submitting, setSubmitting] = useState(false);
  const [taskCreated, setTaskCreated] = useState(false);
  const [taskId, setTaskId] = useState(null);

  const navigate = useNavigate();
  const { topicId } = useParams();
  const isEditMode = !!topicId;

  // 加载筛选选项
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const opts = await eventAPI.getFilterOptions();
        setFilterOptions(opts || { towns: [], levels: [], categories: [] });
      } catch (e) {
        console.error('加载筛选选项失败:', e);
      }
    };
    loadOptions();
  }, []);

  // 加载标签库
  useEffect(() => {
    const loadTags = async () => {
      setTagsLoading(true);
      try {
        const [tagsRes, groupsRes] = await Promise.all([
          tagAPI.getTags({ include_system: false }),
          tagAPI.getGroups(false)
        ]);
        setTags(tagsRes.tags || []);
        setGroups(groupsRes.groups || []);
      } catch (error) {
        message.error('加载标签库失败');
        console.error(error);
      } finally {
        setTagsLoading(false);
      }
    };
    loadTags();
  }, []);

  // 第一步：分类配置
  const addCategory = () => {
    setCategories(prev => [...prev, { towns: [], levels: [], categories: [], timeRange: null }]);
  };

  const updateCategory = (idx, field, value) => {
    setCategories(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  const removeCategory = (idx) => {
    setCategories(prev => prev.filter((_, i) => i !== idx));
  };

  // 步骤控制
  const nextStep = async () => {
    if (currentStep === 0 && !step1Skipped) {
      // 验证第一步表单
      try {
        await step1Form.validateFields();
      } catch (error) {
        return;
      }
    }

    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkipStep1 = () => {
    setStep1Skipped(!step1Skipped);
    if (!step1Skipped) {
      // 清空第一步的表单
      step1Form.resetFields();
      setCategories([]);
    }
  };

  const handleSkipStep2 = () => {
    setStep2Skipped(!step2Skipped);
    if (!step2Skipped) {
      setSelectedTags([]);
    }
  };

  // 提交创建主题
  const handleSubmit = async () => {
    try {
      const values = await step3Form.validateFields();
      setSubmitting(true);

      // 构建payload
      const parseKeywords = (v) => Array.isArray(v)
        ? v.map(s => String(s).trim()).filter(Boolean)
        : String(v || '')
            .split(/[，,\s]+/)
            .map(s => s.trim())
            .filter(Boolean);

      const step1Values = step1Skipped ? {} : step1Form.getFieldsValue();

      const payload = {
        name: values.name,
        description: values.description || '',
        // 规则筛选
        include_keywords: step1Skipped ? { description: [], result: [] } : {
          description: parseKeywords(step1Values.include_desc),
          result: parseKeywords(step1Values.include_result)
        },
        exclude_keywords: step1Skipped ? { description: [], result: [] } : {
          description: parseKeywords(step1Values.exclude_desc),
          result: parseKeywords(step1Values.exclude_result)
        },
        dedup: step1Skipped ? null : (step1Values.dedup ? 'description' : null),
        categories: step1Skipped ? [] : categories.map(c => ({
          name: null,
          keywords: [],
          towns: c.towns || [],
          levels: c.levels || [],
          categories: c.categories || [],
          start_time: c.timeRange && c.timeRange[0] ? c.timeRange[0].format('YYYY-MM-DD') : null,
          end_time: c.timeRange && c.timeRange[1] ? c.timeRange[1].format('YYYY-MM-DD') : null,
        })),
        // AI标签识别
        ai_tags: step2Skipped ? [] : selectedTags,
        enabled: true
      };

      // 模拟创建异步任务（实际应该调用后端API）
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 模拟任务ID
      const mockTaskId = `task_${Date.now()}`;
      setTaskId(mockTaskId);
      setTaskCreated(true);

      message.success('主题创建任务已提交，正在后台处理中...');

    } catch (e) {
      if (e?.errorFields) return;
      console.error(e);
      message.error('创建失败: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // 按标签组分组
  const tagsByGroup = tags.reduce((acc, tag) => {
    const groupId = tag.group_id || 'ungrouped';
    if (!acc[groupId]) {
      acc[groupId] = [];
    }
    acc[groupId].push(tag);
    return acc;
  }, {});

  // 渲染第一步：规则筛选
  const renderStep1 = () => (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={4} style={{ margin: 0, marginBottom: 8 }}>
            <FilterOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            配置筛选规则
          </Title>
          <Text type="secondary">设置事件筛选条件，精确定位目标事件集合</Text>
        </div>
        <Button
          type={step1Skipped ? 'primary' : 'default'}
          onClick={handleSkipStep1}
          style={{ borderRadius: '8px' }}
        >
          {step1Skipped ? '取消跳过' : '跳过此步骤'}
        </Button>
      </div>

      {step1Skipped ? (
        <Alert
          message="已跳过规则筛选"
          description="将对所有事件进行处理，不进行初步筛选"
          type="info"
          showIcon
          style={{ borderRadius: '8px' }}
        />
      ) : (
        <Form form={step1Form} layout="vertical" size="large">
          {/* 包含关键词配置 */}
          <KeywordGroupConfig
            title="包含关键词筛选"
            description="事件描述和处置结果之间是OR关系：满足任意一个字段的条件即可。每个字段内的多个关键词之间是OR关系：满足任意一个即可。"
            includeDescName="include_desc"
            includeResultName="include_result"
          />

          {/* 过滤关键词配置 */}
          <KeywordGroupConfig
            title="过滤关键词筛选"
            description="排除包含指定关键词的事件。事件描述和处置结果之间是OR关系：任意一个字段包含过滤关键词的事件都会被排除。"
            includeDescName="exclude_desc"
            includeResultName="exclude_result"
            excludeDescName={null}
            excludeResultName={null}
          />

          <Card style={{
            marginBottom: 24,
            borderRadius: '12px',
            border: '1px solid #e8f4fd',
            background: '#fafbfc'
          }}>
            <Title level={5} style={{ marginBottom: 16 }}>数据去重</Title>
            <Form.Item
              name="dedup"
              label="按事件描述去重"
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
            marginBottom: 24,
            borderRadius: '12px',
            border: '1px solid #e8f4fd',
            background: '#fafbfc'
          }}>
            <Title level={5} style={{ marginBottom: 16 }}>分类配置（可选）</Title>

            {categories.length === 0 ? (
              <Empty description="暂无分类配置" />
            ) : (
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
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
                    <Row gutter={16}>
                      <Col span={12}>
                        <Select
                          mode="multiple"
                          placeholder="街镇名称（可多选）"
                          value={c.towns}
                          onChange={(vals) => updateCategory(idx, 'towns', vals)}
                          options={(filterOptions.towns || []).map(t => ({ label: t, value: t }))}
                          style={{ width: '100%', borderRadius: '6px' }}
                        />
                      </Col>
                      <Col span={12}>
                        <Select
                          mode="multiple"
                          placeholder="事件级别（可多选）"
                          value={c.levels}
                          onChange={(vals) => updateCategory(idx, 'levels', vals)}
                          options={(filterOptions.levels || []).map(t => ({ label: t, value: t }))}
                          style={{ width: '100%', borderRadius: '6px' }}
                        />
                      </Col>
                    </Row>
                    <Row gutter={16} style={{ marginTop: 16 }}>
                      <Col span={12}>
                        <Select
                          mode="multiple"
                          placeholder="二级分类（可多选）"
                          value={c.categories}
                          onChange={(vals) => updateCategory(idx, 'categories', vals)}
                          options={(filterOptions.categories || []).map(t => ({ label: t, value: t }))}
                          style={{ width: '100%', borderRadius: '6px' }}
                        />
                      </Col>
                      <Col span={12}>
                        <DatePicker.RangePicker
                          value={c.timeRange || null}
                          onChange={(dates) => updateCategory(idx, 'timeRange', dates)}
                          placeholder={["开始日期", "结束日期"]}
                          style={{ width: '100%', borderRadius: '6px' }}
                        />
                      </Col>
                    </Row>
                  </Card>
                ))}
              </Space>
            )}
          </Card>
        </Form>
      )}
    </div>
  );

  // 渲染第二步：标签识别
  const renderStep2 = () => (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={4} style={{ margin: 0, marginBottom: 8 }}>
            <TagsOutlined style={{ marginRight: 8, color: '#52c41a' }} />
            AI标签识别
          </Title>
          <Text type="secondary">
            选择需要识别的标签，系统将在{step1Skipped ? '所有事件' : '第一步筛选的事件'}中自动识别并打上标签
          </Text>
        </div>
        <Button
          type={step2Skipped ? 'primary' : 'default'}
          onClick={handleSkipStep2}
          style={{ borderRadius: '8px' }}
        >
          {step2Skipped ? '取消跳过' : '跳过此步骤'}
        </Button>
      </div>

      {step2Skipped ? (
        <Alert
          message="已跳过AI标签识别"
          description="将不进行智能标签识别"
          type="info"
          showIcon
          style={{ borderRadius: '8px' }}
        />
      ) : (
        <Card style={{ borderRadius: '12px' }}>
          {tagsLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin tip="加载标签库中..." />
            </div>
          ) : tags.length === 0 ? (
            <Empty description="暂无可用标签，请先在标签管理中创建标签" />
          ) : (
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <Alert
                message="选择标签"
                description="选择需要AI识别的标签，AI将分析事件内容并自动打上相应标签。此过程可能需要较长时间，将在后台异步执行。"
                type="info"
                showIcon
                style={{ borderRadius: '8px' }}
              />

              {groups.map(group => {
                const groupTags = tagsByGroup[group.group_id || group.id] || [];
                if (groupTags.length === 0) return null;

                return (
                  <Card
                    key={group.group_id || group.id}
                    size="small"
                    title={
                      <Space>
                        <Text strong>{group.name}</Text>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          ({groupTags.filter(t => selectedTags.includes(t.tag_id || t.id)).length}/{groupTags.length})
                        </Text>
                      </Space>
                    }
                    style={{ borderRadius: '8px' }}
                  >
                    <Checkbox.Group
                      value={selectedTags}
                      onChange={setSelectedTags}
                      style={{ width: '100%' }}
                    >
                      <Row gutter={[16, 16]}>
                        {groupTags.map(tag => (
                          <Col span={6} key={tag.tag_id || tag.id}>
                            <Checkbox value={tag.tag_id || tag.id}>
                              <Tag color={tag.color || '#1890ff'} style={{ marginRight: 4 }}>
                                {tag.name}
                              </Tag>
                              {tag.description && (
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                  {tag.description}
                                </Text>
                              )}
                            </Checkbox>
                          </Col>
                        ))}
                      </Row>
                    </Checkbox.Group>
                  </Card>
                );
              })}

              {Object.keys(tagsByGroup).includes('ungrouped') && tagsByGroup['ungrouped'].length > 0 && (
                <Card
                  size="small"
                  title="未分组标签"
                  style={{ borderRadius: '8px' }}
                >
                  <Checkbox.Group
                    value={selectedTags}
                    onChange={setSelectedTags}
                    style={{ width: '100%' }}
                  >
                    <Row gutter={[16, 16]}>
                      {tagsByGroup['ungrouped'].map(tag => (
                        <Col span={6} key={tag.tag_id || tag.id}>
                          <Checkbox value={tag.tag_id || tag.id}>
                            <Tag color={tag.color || '#1890ff'}>
                              {tag.name}
                            </Tag>
                          </Checkbox>
                        </Col>
                      ))}
                    </Row>
                  </Checkbox.Group>
                </Card>
              )}

              {selectedTags.length > 0 && (
                <Alert
                  message={`已选择 ${selectedTags.length} 个标签`}
                  description="AI将识别这些标签的特征并自动标注事件"
                  type="success"
                  showIcon
                  style={{ borderRadius: '8px' }}
                />
              )}
            </Space>
          )}
        </Card>
      )}
    </div>
  );

  // 渲染第三步：创建主题
  const renderStep3 = () => (
    <div>
      <Title level={4} style={{ margin: 0, marginBottom: 8 }}>
        <RocketOutlined style={{ marginRight: 8, color: '#722ed1' }} />
        创建主题
      </Title>
      <Text type="secondary" style={{ marginBottom: 24, display: 'block' }}>
        填写主题基础信息并提交创建任务
      </Text>

      {taskCreated ? (
        <Card style={{ borderRadius: '12px', textAlign: 'center', padding: '40px 0' }}>
          <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a', marginBottom: 24 }} />
          <Title level={3}>主题创建任务已提交</Title>
          <Paragraph type="secondary" style={{ fontSize: '16px', marginBottom: 32 }}>
            任务ID: <Text code>{taskId}</Text>
          </Paragraph>
          <Alert
            message="后台处理中"
            description={
              <div>
                <p>主题创建任务正在后台处理中，这可能需要一些时间。</p>
                <p>
                  {!step1Skipped && '✓ 已应用规则筛选'}<br />
                  {!step2Skipped && `✓ 已选择 ${selectedTags.length} 个AI识别标签`}<br />
                </p>
                <p>您可以在主题列表中查看创建进度。</p>
              </div>
            }
            type="info"
            showIcon
            style={{ textAlign: 'left', borderRadius: '8px', marginBottom: 24 }}
          />
          <Space size="middle">
            <Button
              type="primary"
              onClick={() => navigate('/topics')}
              style={{ borderRadius: '8px' }}
            >
              返回主题列表
            </Button>
            <Button
              onClick={() => {
                setTaskCreated(false);
                setTaskId(null);
                setCurrentStep(0);
                step1Form.resetFields();
                step3Form.resetFields();
                setCategories([]);
                setSelectedTags([]);
                setStep1Skipped(false);
                setStep2Skipped(false);
              }}
              style={{ borderRadius: '8px' }}
            >
              创建新主题
            </Button>
          </Space>
        </Card>
      ) : (
        <>
          <Card style={{ borderRadius: '12px', marginBottom: 24 }}>
            <Title level={5} style={{ marginBottom: 16 }}>配置摘要</Title>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Card size="small" style={{ background: '#f6f8fa', borderRadius: '8px' }}>
                  <Statistic
                    title="规则筛选"
                    value={step1Skipped ? '已跳过' : '已配置'}
                    valueStyle={{ color: step1Skipped ? '#999' : '#52c41a', fontSize: '20px' }}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" style={{ background: '#f6f8fa', borderRadius: '8px' }}>
                  <Statistic
                    title="AI标签识别"
                    value={step2Skipped ? '已跳过' : `${selectedTags.length} 个标签`}
                    valueStyle={{ color: step2Skipped ? '#999' : '#1890ff', fontSize: '20px' }}
                  />
                </Card>
              </Col>
            </Row>
          </Card>

          <Form form={step3Form} layout="vertical" size="large">
            <Card style={{ borderRadius: '12px' }}>
              <Form.Item
                name="name"
                label={<Text strong>主题名称</Text>}
                rules={[{ required: true, message: '请输入主题名称' }]}
              >
                <Input
                  placeholder="例如：噪音相关事件"
                  maxLength={50}
                  style={{ borderRadius: '8px' }}
                />
              </Form.Item>

              <Form.Item
                name="description"
                label={<Text strong>主题描述</Text>}
              >
                <Input.TextArea
                  placeholder="可描述该主题创建逻辑和用途"
                  rows={4}
                  maxLength={200}
                  showCount
                  style={{ borderRadius: '8px' }}
                />
              </Form.Item>
            </Card>
          </Form>
        </>
      )}
    </div>
  );

  const steps = [
    {
      title: '规则筛选',
      icon: <FilterOutlined />,
      content: renderStep1()
    },
    {
      title: 'AI标签识别',
      icon: <TagsOutlined />,
      content: renderStep2()
    },
    {
      title: '创建主题',
      icon: <RocketOutlined />,
      content: renderStep3()
    }
  ];

  return (
    <div className="page-container">
      <div className="page-header" style={{
        marginBottom: 32,
        padding: '24px 0'
      }}>
        <Title level={2} style={{ margin: 0, marginBottom: 8 }}>
          {isEditMode ? '编辑主题' : '创建主题'}
        </Title>
        <Text type="secondary" style={{ fontSize: '16px' }}>
          通过三步向导创建主题：配置筛选规则 → AI标签识别 → 提交创建
        </Text>
      </div>

      <Card style={{ borderRadius: '16px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
        <Steps
          current={currentStep}
          style={{ marginBottom: 40 }}
          items={steps.map(step => ({
            title: step.title,
            icon: step.icon
          }))}
        />

        <div style={{ minHeight: '400px', marginBottom: 32 }}>
          {steps[currentStep].content}
        </div>

        {!taskCreated && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            paddingTop: 24,
            borderTop: '1px solid #e5e7eb'
          }}>
            <Button
              onClick={prevStep}
              disabled={currentStep === 0}
              icon={<LeftOutlined />}
              style={{ borderRadius: '8px' }}
            >
              上一步
            </Button>

            <Space>
              <Button
                onClick={() => navigate('/topics')}
                style={{ borderRadius: '8px' }}
              >
                取消
              </Button>

              {currentStep < 2 ? (
                <Button
                  type="primary"
                  onClick={nextStep}
                  icon={<RightOutlined />}
                  style={{ borderRadius: '8px' }}
                >
                  下一步
                </Button>
              ) : (
                <Button
                  type="primary"
                  loading={submitting}
                  onClick={handleSubmit}
                  icon={<RocketOutlined />}
                  style={{
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #722ed1 0%, #531dab 100%)',
                    border: 'none'
                  }}
                >
                  提交创建
                </Button>
              )}
            </Space>
          </div>
        )}
      </Card>
    </div>
  );
};

export default TopicCreate;
