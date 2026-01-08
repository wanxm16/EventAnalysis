import React, { useEffect, useState, useMemo } from 'react';
import { Button, Card, Modal, Space, Tag, Typography, message, Empty, Row, Col, Tooltip, Input, Drawer, Form, Select, Steps, Switch, Checkbox, Statistic, DatePicker, Alert, Tabs, Badge } from 'antd';
import { PlusOutlined, EyeOutlined, DeleteOutlined, EditOutlined, SettingOutlined, SearchOutlined, FilterOutlined, TagsOutlined, RocketOutlined, LeftOutlined, RightOutlined, CheckCircleOutlined, MinusCircleOutlined, StarOutlined, StarFilled } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { Line } from '@ant-design/plots';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Search } = Input;
const { TextArea } = Input;

const TopicList = () => {
  const [loading, setLoading] = useState(false);
  const [topics, setTopics] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  // 关注状态管理
  const [followedTopics, setFollowedTopics] = useState(new Set());

  // 编辑抽屉状态
  const [editDrawerVisible, setEditDrawerVisible] = useState(false);
  const [editingTopic, setEditingTopic] = useState(null);
  const [editCurrentStep, setEditCurrentStep] = useState(0);
  const [editStep1Form] = Form.useForm();
  const [editStep3Form] = Form.useForm();
  const [editStep1Skipped, setEditStep1Skipped] = useState(false);
  const [editStep2Skipped, setEditStep2Skipped] = useState(false);
  const [editCategories, setEditCategories] = useState([]);
  const [editSelectedTags, setEditSelectedTags] = useState([]);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const navigate = useNavigate();

  // Mock 趋势数据生成函数
  const generateMockTrend = (topicId) => {
    const trends = {
      1: { percent: 31, data: [12, 15, 14, 18, 16, 20, 18, 22, 19, 24, 21, 26] },
      2: { percent: -12, data: [25, 28, 26, 24, 22, 26, 23, 21, 19, 23, 20, 22] },
      3: { percent: 0, data: [] },
      4: { percent: -31, data: [30, 28, 32, 29, 27, 30, 28, 26, 24, 27, 25, 23] },
    };

    const defaultTrend = topicId % 2 === 0
      ? { percent: Math.floor(Math.random() * 40) - 20, data: Array.from({ length: 12 }, () => Math.floor(Math.random() * 20) + 5) }
      : { percent: Math.floor(Math.random() * 60) - 30, data: Array.from({ length: 12 }, () => Math.floor(Math.random() * 25) + 5) };

    return trends[topicId] || defaultTrend;
  };

  // Mock 统计数据生成函数
  const generateMockStats = (trendData) => {
    if (trendData.length === 0) {
      return { min: 0, avg: 0, max: 0 };
    }
    const min = Math.min(...trendData);
    const max = Math.max(...trendData);
    const avg = Math.round(trendData.reduce((a, b) => a + b, 0) / trendData.length);
    return { min, avg, max };
  };

  const loadTopics = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:8000/api/topics');
      if (!res.ok) throw new Error('加载主题失败');
      const data = await res.json();
      setTopics(data.topics || []);
    } catch (e) {
      console.error(e);
      message.error('加载主题失败: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteTopic = async (topicId, name) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定删除主题「${name}」吗？该操作不可恢复。`,
      onOk: async () => {
        try {
          const res = await fetch(`http://localhost:8000/api/topics/${topicId}`, { method: 'DELETE' });
          if (!res.ok) throw new Error('删除主题失败');
          message.success('主题已删除');
          setTopics(prev => prev.filter(t => t.id !== topicId));
        } catch (e) {
          console.error(e);
          message.error('删除主题失败: ' + e.message);
        }
      }
    });
  };

  // 关注/取消关注主题
  const handleToggleFollow = (topicId) => {
    setFollowedTopics(prev => {
      const newSet = new Set(prev);
      if (newSet.has(topicId)) {
        newSet.delete(topicId);
        message.success('已取消关注');
      } else {
        newSet.add(topicId);
        message.success('已添加关注');
      }
      return newSet;
    });
  };

  // 编辑抽屉 - 打开
  const handleOpenEditDrawer = (topic) => {
    setEditingTopic(topic);

    // 填充第一步表单数据
    editStep1Form.setFieldsValue({
      include_desc: topic.include_keywords?.description || [],
      include_result: topic.include_keywords?.result || [],
      exclude_desc: topic.exclude_keywords?.description || [],
      exclude_result: topic.exclude_keywords?.result || [],
      dedup: topic.dedup === 'description',
    });

    // 填充分类配置
    if (topic.categories && topic.categories.length > 0) {
      const cats = topic.categories.map(c => ({
        towns: c.towns || [],
        levels: c.levels || [],
        categories: c.categories || [],
        timeRange: (c.start_time && c.end_time)
          ? [dayjs(c.start_time), dayjs(c.end_time)]
          : null
      }));
      setEditCategories(cats);
    } else {
      setEditCategories([]);
    }

    // 检查是否跳过了步骤
    const hasStep1Config =
      (topic.include_keywords?.description?.length > 0) ||
      (topic.include_keywords?.result?.length > 0) ||
      (topic.exclude_keywords?.description?.length > 0) ||
      (topic.exclude_keywords?.result?.length > 0) ||
      topic.dedup ||
      (topic.categories?.length > 0);
    setEditStep1Skipped(!hasStep1Config);

    // TODO: 从后端加载AI标签配置
    setEditSelectedTags([]);
    setEditStep2Skipped(true);

    // 填充第三步表单数据
    editStep3Form.setFieldsValue({
      name: topic.name,
      description: topic.description || ''
    });

    setEditCurrentStep(0);
    setEditDrawerVisible(true);
  };

  // 编辑抽屉 - 分类管理
  const addEditCategory = () => {
    setEditCategories(prev => [...prev, { towns: [], levels: [], categories: [], timeRange: null }]);
  };

  const updateEditCategory = (idx, field, value) => {
    setEditCategories(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  const removeEditCategory = (idx) => {
    setEditCategories(prev => prev.filter((_, i) => i !== idx));
  };

  // 编辑抽屉 - 步骤控制
  const nextEditStep = async () => {
    if (editCurrentStep === 0 && !editStep1Skipped) {
      try {
        await editStep1Form.validateFields();
      } catch (error) {
        return;
      }
    }

    if (editCurrentStep < 2) {
      setEditCurrentStep(editCurrentStep + 1);
    }
  };

  const prevEditStep = () => {
    if (editCurrentStep > 0) {
      setEditCurrentStep(editCurrentStep - 1);
    }
  };

  const handleEditSkipStep1 = () => {
    setEditStep1Skipped(!editStep1Skipped);
    if (!editStep1Skipped) {
      editStep1Form.resetFields();
      setEditCategories([]);
    }
  };

  const handleEditSkipStep2 = () => {
    setEditStep2Skipped(!editStep2Skipped);
    if (!editStep2Skipped) {
      setEditSelectedTags([]);
    }
  };

  // 编辑抽屉 - 提交保存
  const handleEditSubmit = async () => {
    try {
      const values = await editStep3Form.validateFields();
      setEditSubmitting(true);

      // 构建payload
      const parseKeywords = (v) => Array.isArray(v)
        ? v.map(s => String(s).trim()).filter(Boolean)
        : String(v || '')
            .split(/[，,\s]+/)
            .map(s => s.trim())
            .filter(Boolean);

      const step1Values = editStep1Skipped ? {} : editStep1Form.getFieldsValue();

      const payload = {
        name: values.name,
        description: values.description || '',
        include_keywords: editStep1Skipped ? { description: [], result: [] } : {
          description: parseKeywords(step1Values.include_desc),
          result: parseKeywords(step1Values.include_result)
        },
        exclude_keywords: editStep1Skipped ? { description: [], result: [] } : {
          description: parseKeywords(step1Values.exclude_desc),
          result: parseKeywords(step1Values.exclude_result)
        },
        dedup: editStep1Skipped ? null : (step1Values.dedup ? 'description' : null),
        categories: editStep1Skipped ? [] : editCategories.map(c => ({
          name: null,
          keywords: [],
          towns: c.towns || [],
          levels: c.levels || [],
          categories: c.categories || [],
          start_time: c.timeRange && c.timeRange[0] ? c.timeRange[0].format('YYYY-MM-DD') : null,
          end_time: c.timeRange && c.timeRange[1] ? c.timeRange[1].format('YYYY-MM-DD') : null,
        })),
        ai_tags: editStep2Skipped ? [] : editSelectedTags,
        enabled: true
      };

      // 调用API更新主题
      const res = await fetch(`http://localhost:8000/api/topics/${editingTopic.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('更新主题失败');

      message.success('主题更新成功');
      setEditDrawerVisible(false);

      // 重新加载主题列表
      loadTopics();
    } catch (e) {
      if (e?.errorFields) return;
      console.error(e);
      message.error('更新失败: ' + (e.message || '未知错误'));
    } finally {
      setEditSubmitting(false);
    }
  };

  useEffect(() => { loadTopics(); }, []);

  // 搜索过滤主题
  const filteredTopics = useMemo(() => {
    let result = [...topics];

    // 如果在"重点关注"Tab，只显示已关注的主题
    if (activeTab === 'followed') {
      result = result.filter(topic => followedTopics.has(topic.id));
    }

    // 搜索过滤
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase().trim();

      result = result.filter(topic => {
        // 搜索主题名称
        if (topic.name?.toLowerCase().includes(searchLower)) return true;

        // 搜索描述
        if (topic.description?.toLowerCase().includes(searchLower)) return true;

        // 搜索包含关键词
        if (topic.include_keywords) {
          if (typeof topic.include_keywords === 'object' && !Array.isArray(topic.include_keywords)) {
            const { description = [], result = [] } = topic.include_keywords;
            const allIncludeKeywords = [...description, ...result];
            if (allIncludeKeywords.some(kw => kw.toLowerCase().includes(searchLower))) return true;
          } else if (Array.isArray(topic.include_keywords)) {
            if (topic.include_keywords.some(kw => kw.toLowerCase().includes(searchLower))) return true;
          }
        }

        // 搜索排除关键词
        if (topic.exclude_keywords) {
          if (typeof topic.exclude_keywords === 'object' && !Array.isArray(topic.exclude_keywords)) {
            const { description = [], result = [] } = topic.exclude_keywords;
            const allExcludeKeywords = [...description, ...result];
            if (allExcludeKeywords.some(kw => kw.toLowerCase().includes(searchLower))) return true;
          } else if (Array.isArray(topic.exclude_keywords)) {
            if (topic.exclude_keywords.some(kw => kw.toLowerCase().includes(searchLower))) return true;
          }
        }

        // 搜索精细筛选
        if (topic.fine_filters?.some(filter => filter.toLowerCase().includes(searchLower))) return true;

        return false;
      });
    }

    return result;
  }, [topics, searchText, activeTab, followedTopics]);

  // 编辑抽屉 - 渲染第一步：规则筛选
  const renderEditStep1 = () => (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Typography.Title level={5} style={{ margin: 0, marginBottom: 8 }}>
            <FilterOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            配置筛选规则
          </Typography.Title>
          <Typography.Text type="secondary">设置事件筛选条件，精确定位目标事件集合</Typography.Text>
        </div>
        <Button
          type={editStep1Skipped ? 'primary' : 'default'}
          onClick={handleEditSkipStep1}
        >
          {editStep1Skipped ? '取消跳过' : '跳过此步骤'}
        </Button>
      </div>

      {editStep1Skipped ? (
        <Alert
          message="已跳过规则筛选"
          description="将对所有事件进行处理，不进行初步筛选"
          type="info"
          showIcon
        />
      ) : (
        <Form form={editStep1Form} layout="vertical">
          <Card style={{ marginBottom: 16 }}>
            <Typography.Title level={5}>包含关键词筛选</Typography.Title>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="include_desc" label="事件描述关键词">
                  <Select mode="tags" placeholder="例如：噪音 噪声 吵闹" tokenSeparators={[',', '，', ' ']} open={false} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="include_result" label="处置结果关键词">
                  <Select mode="tags" placeholder="例如：处理完毕 已解决" tokenSeparators={[',', '，', ' ']} open={false} />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card style={{ marginBottom: 16 }}>
            <Typography.Title level={5}>过滤关键词筛选</Typography.Title>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="exclude_desc" label="排除事件描述关键词">
                  <Select mode="tags" placeholder="例如：KTV 超市 商场" tokenSeparators={[',', '，', ' ']} open={false} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="exclude_result" label="排除处置结果关键词">
                  <Select mode="tags" placeholder="例如：无需处理 已撤销" tokenSeparators={[',', '，', ' ']} open={false} />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card style={{ marginBottom: 16 }}>
            <Form.Item name="dedup" label="按事件描述去重" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Switch checkedChildren="开启" unCheckedChildren="关闭" />
            </Form.Item>
          </Card>

          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <Typography.Title level={5} style={{ margin: 0 }}>分类配置（可选）</Typography.Title>
              <Button icon={<PlusOutlined />} onClick={addEditCategory}>添加分类</Button>
            </div>

            {editCategories.length === 0 ? (
              <Empty description="暂无分类配置" />
            ) : (
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                {editCategories.map((c, idx) => (
                  <Card key={idx} size="small" style={{ background: '#fafafa' }}>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Select
                          mode="multiple"
                          placeholder="街镇名称（可多选）"
                          value={c.towns}
                          onChange={(vals) => updateEditCategory(idx, 'towns', vals)}
                          style={{ width: '100%' }}
                        />
                      </Col>
                      <Col span={12}>
                        <Select
                          mode="multiple"
                          placeholder="事件级别（可多选）"
                          value={c.levels}
                          onChange={(vals) => updateEditCategory(idx, 'levels', vals)}
                          style={{ width: '100%' }}
                        />
                      </Col>
                    </Row>
                    <Row gutter={16} style={{ marginTop: 12 }}>
                      <Col span={12}>
                        <Select
                          mode="multiple"
                          placeholder="二级分类（可多选）"
                          value={c.categories}
                          onChange={(vals) => updateEditCategory(idx, 'categories', vals)}
                          style={{ width: '100%' }}
                        />
                      </Col>
                      <Col span={12}>
                        <Space.Compact style={{ width: '100%' }}>
                          <DatePicker.RangePicker
                            value={c.timeRange || null}
                            onChange={(dates) => updateEditCategory(idx, 'timeRange', dates)}
                            placeholder={["开始日期", "结束日期"]}
                            style={{ width: 'calc(100% - 32px)' }}
                          />
                          <Button danger icon={<MinusCircleOutlined />} onClick={() => removeEditCategory(idx)} />
                        </Space.Compact>
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

  // 编辑抽屉 - 渲染第二步：AI标签识别
  const renderEditStep2 = () => (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Typography.Title level={5} style={{ margin: 0, marginBottom: 8 }}>
            <TagsOutlined style={{ marginRight: 8, color: '#52c41a' }} />
            AI标签识别
          </Typography.Title>
          <Typography.Text type="secondary">
            选择需要识别的标签，系统将在{editStep1Skipped ? '所有事件' : '第一步筛选的事件'}中自动识别并打上标签
          </Typography.Text>
        </div>
        <Button
          type={editStep2Skipped ? 'primary' : 'default'}
          onClick={handleEditSkipStep2}
        >
          {editStep2Skipped ? '取消跳过' : '跳过此步骤'}
        </Button>
      </div>

      {editStep2Skipped ? (
        <Alert
          message="已跳过AI标签识别"
          description="将不进行标签自动识别"
          type="info"
          showIcon
        />
      ) : (
        <Card>
          <Typography.Text type="secondary">AI标签识别功能暂未开放</Typography.Text>
        </Card>
      )}
    </div>
  );

  // 编辑抽屉 - 渲染第三步：保存更新
  const renderEditStep3 = () => (
    <div>
      <Typography.Title level={5} style={{ margin: 0, marginBottom: 8 }}>
        <RocketOutlined style={{ marginRight: 8, color: '#722ed1' }} />
        保存更新
      </Typography.Title>
      <Typography.Text type="secondary" style={{ marginBottom: 24, display: 'block' }}>
        确认主题信息并保存更新
      </Typography.Text>

      <Card style={{ marginBottom: 24 }}>
        <Typography.Title level={5} style={{ marginBottom: 16 }}>配置摘要</Typography.Title>
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Card size="small" style={{ background: '#f6f8fa' }}>
              <Statistic
                title="规则筛选"
                value={editStep1Skipped ? '已跳过' : '已配置'}
                valueStyle={{ color: editStep1Skipped ? '#999' : '#52c41a', fontSize: '20px' }}
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small" style={{ background: '#f6f8fa' }}>
              <Statistic
                title="AI标签识别"
                value={editStep2Skipped ? '已跳过' : `${editSelectedTags.length} 个标签`}
                valueStyle={{ color: editStep2Skipped ? '#999' : '#1890ff', fontSize: '20px' }}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      <Form form={editStep3Form} layout="vertical">
        <Card>
          <Form.Item
            name="name"
            label={<Typography.Text strong>主题名称</Typography.Text>}
            rules={[{ required: true, message: '请输入主题名称' }]}
          >
            <Input placeholder="例如：噪音相关事件" maxLength={50} />
          </Form.Item>

          <Form.Item
            name="description"
            label={<Typography.Text strong>主题描述</Typography.Text>}
          >
            <Input.TextArea
              placeholder="可描述该主题创建逻辑和用途"
              rows={4}
              maxLength={200}
              showCount
            />
          </Form.Item>
        </Card>
      </Form>
    </div>
  );

  const editSteps = [
    {
      title: '规则筛选',
      icon: <FilterOutlined />,
      content: renderEditStep1()
    },
    {
      title: 'AI标签识别',
      icon: <TagsOutlined />,
      content: renderEditStep2()
    },
    {
      title: '保存更新',
      icon: <RocketOutlined />,
      content: renderEditStep3()
    }
  ];

  // 渲染关键词标签的辅助函数
  const renderKeywordTags = (keywords, label, color) => {
    if (!keywords) return null;

    if (typeof keywords === 'object' && !Array.isArray(keywords)) {
      const { description = [], result = [] } = keywords;
      const allKeywords = [];

      if (description.length > 0) {
        allKeywords.push(...description);
      }
      if (result.length > 0) {
        allKeywords.push(...result);
      }

      if (allKeywords.length > 0) {
        return allKeywords.slice(0, 3).map((kw, idx) => (
          <Tag
            key={`${label}-${idx}`}
            color={color}
            style={{
              marginRight: 4,
              marginBottom: 4,
              border: `1px solid ${color === 'blue' ? '#1890ff' : color === 'red' ? '#ff4d4f' : '#faad14'}`,
              background: 'white'
            }}
          >
            {label}: {kw}
          </Tag>
        ));
      }
      return null;
    }

    if (Array.isArray(keywords) && keywords.length > 0) {
      return keywords.slice(0, 3).map((kw, idx) => (
        <Tag
          key={`${label}-${idx}`}
          color={color}
          style={{
            marginRight: 4,
            marginBottom: 4,
            border: `1px solid ${color === 'blue' ? '#1890ff' : color === 'red' ? '#ff4d4f' : '#faad14'}`,
            background: 'white'
          }}
        >
          {label}: {kw}
        </Tag>
      ));
    }

    return null;
  };

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
      }}>
        <Title level={3} style={{ margin: 0 }}>主题列表</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/topics/create')}
        >
          创建主题
        </Button>
      </div>

      {/* 搜索框 */}
      <div style={{ marginBottom: 24 }}>
        <Search
          placeholder="搜索主题名称、描述或关键词..."
          allowClear
          size="large"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ maxWidth: 600 }}
          prefix={<SearchOutlined />}
        />
        {searchText && (
          <div style={{ marginTop: 8, color: '#666', fontSize: '14px' }}>
            找到 <strong style={{ color: '#1890ff' }}>{filteredTopics.length}</strong> 个主题
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'all',
            label: '全部主题',
            children: topics.length === 0 ? (
              <Card style={{ textAlign: 'center', padding: '48px 24px' }}>
                <Empty description="暂无主题">
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => navigate('/topics/create')}
                  >
                    立即创建
                  </Button>
                </Empty>
              </Card>
            ) : filteredTopics.length === 0 ? (
              <Card style={{ textAlign: 'center', padding: '48px 24px' }}>
                <Empty description="没有找到匹配的主题">
                  <Button
                    type="link"
                    onClick={() => setSearchText('')}
                  >
                    清空搜索
                  </Button>
                </Empty>
              </Card>
            ) : (
              <Row gutter={[16, 16]}>
          {filteredTopics.map(topic => {
            const trend = generateMockTrend(topic.id);
            const stats = generateMockStats(trend.data);
            const hasData = trend.data.length > 0;

            return (
              <Col xs={24} sm={12} lg={8} key={topic.id}>
                <Card
                  style={{
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    height: '100%',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                  }}
                  bodyStyle={{ padding: '16px' }}
                  onClick={() => navigate(`/topics/${topic.id}`)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Header */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '8px'
                  }}>
                    <Title level={5} style={{ margin: 0, fontSize: '16px' }}>
                      {topic.name}
                    </Title>
                  </div>

                  {/* Description */}
                  <Text
                    style={{
                      color: '#666',
                      fontSize: '13px',
                      display: 'block',
                      marginBottom: '8px'
                    }}
                  >
                    {topic.description || '我是描述信息'}
                  </Text>

                  {/* Tags */}
                  <div style={{ marginBottom: '8px', minHeight: '28px' }}>
                    <Space size={[4, 4]} wrap>
                      {renderKeywordTags(topic.include_keywords, '包含', 'blue')}
                      {renderKeywordTags(topic.exclude_keywords, '排除', 'red')}
                      {topic.fine_filters?.length > 0 && (
                        <Tag
                          color="orange"
                          style={{
                            marginRight: 4,
                            marginBottom: 4,
                            border: '1px solid #faad14',
                            background: 'white'
                          }}
                        >
                          无直: {topic.fine_filters[0]}
                        </Tag>
                      )}
                    </Space>
                  </div>

                  {/* Trend info */}
                  <div style={{ marginBottom: '8px' }}>
                    <Space>
                      <Text style={{ color: '#666', fontSize: '13px' }}>事件趋势</Text>
                      {hasData && (
                        <Text
                          style={{
                            color: trend.percent > 0 ? '#ff4d4f' : trend.percent < 0 ? '#52c41a' : '#999',
                            fontSize: '13px',
                            fontWeight: 500
                          }}
                        >
                          本周 {trend.percent > 0 ? '+' : ''}{trend.percent}%
                        </Text>
                      )}
                      {!hasData && (
                        <Text style={{ color: '#999', fontSize: '13px' }}>
                          本周 0 件
                        </Text>
                      )}
                    </Space>
                  </div>

                  {/* Chart */}
                  {hasData ? (
                    <div style={{ marginBottom: '8px', height: '120px' }}>
                      <Line
                        data={trend.data.map((count, index) => ({
                          date: index,
                          count: count
                        }))}
                        xField="date"
                        yField="count"
                        height={120}
                        padding={[10, 10, 30, 30]}
                        smooth
                        color="#1890ff"
                        xAxis={{
                          label: null,
                          line: { style: { stroke: '#e8e8e8' } },
                          tickLine: null,
                          grid: null
                        }}
                        yAxis={{
                          label: null,
                          line: null,
                          tickLine: null,
                          grid: { line: { style: { stroke: '#f0f0f0', lineDash: [4, 4] } } }
                        }}
                        areaStyle={{
                          fill: 'l(270) 0:#ffffff 0.5:#e6f7ff 1:#bae7ff',
                        }}
                        point={false}
                        tooltip={false}
                      />
                      {/* Stats */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '12px',
                        color: '#999',
                        marginTop: '-20px'
                      }}>
                        <span>最低：{stats.min}</span>
                        <span>平均：{stats.avg}</span>
                        <span>最高：{stats.max}</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      height: '120px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#fafafa',
                      borderRadius: '4px',
                      marginBottom: '8px'
                    }}>
                      <Text style={{ color: '#bbb', fontSize: '13px' }}>暂无数据</Text>
                    </div>
                  )}

                  {/* Footer */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '8px',
                    borderTop: '1px solid #f0f0f0'
                  }}>
                    <Text style={{ color: '#bbb', fontSize: '12px' }}>
                      {topic.createTime || dayjs().format('YYYY-MM-DD HH:mm:ss')}
                    </Text>
                    <Space size={4}>
                      <Tooltip title="查看详情">
                        <Button
                          type="text"
                          icon={<EyeOutlined style={{ color: '#bbb', fontSize: '14px' }} />}
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/topics/${topic.id}`);
                          }}
                        />
                      </Tooltip>
                      <Tooltip title="编辑">
                        <Button
                          type="text"
                          icon={<EditOutlined style={{ color: '#bbb', fontSize: '14px' }} />}
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditDrawer(topic);
                          }}
                        />
                      </Tooltip>
                      <Tooltip title="删除">
                        <Button
                          type="text"
                          icon={<DeleteOutlined style={{ color: '#bbb', fontSize: '14px' }} />}
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTopic(topic.id, topic.name);
                          }}
                        />
                      </Tooltip>
                      <Tooltip title={followedTopics.has(topic.id) ? '已关注' : '关注'}>
                        <Button
                          type="text"
                          icon={followedTopics.has(topic.id) ? <StarFilled style={{ color: '#faad14', fontSize: '14px' }} /> : <StarOutlined style={{ color: '#bbb', fontSize: '14px' }} />}
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFollow(topic.id);
                          }}
                        />
                      </Tooltip>
                    </Space>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
            )
          },
          {
            key: 'followed',
            label: (
              <span>
                <StarFilled style={{ marginRight: 4, color: '#faad14' }} />
                重点关注
                {followedTopics.size > 0 && (
                  <Badge count={followedTopics.size} style={{ marginLeft: 8 }} />
                )}
              </span>
            ),
            children: filteredTopics.length === 0 ? (
              <Card style={{ textAlign: 'center', padding: '48px 24px' }}>
                <Empty description="暂无关注的主题">
                  <Button
                    type="link"
                    onClick={() => setActiveTab('all')}
                  >
                    查看全部主题
                  </Button>
                </Empty>
              </Card>
            ) : (
              <Row gutter={[16, 16]}>
                {filteredTopics.map(topic => {
                  const trend = generateMockTrend(topic.id);
                  const stats = generateMockStats(trend.data);
                  const hasData = trend.data.length > 0;

                  return (
                    <Col xs={24} sm={12} lg={8} key={topic.id}>
                      <Card
                        style={{
                          borderRadius: '8px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                          height: '100%',
                          cursor: 'pointer',
                          transition: 'all 0.3s',
                        }}
                        bodyStyle={{ padding: '16px' }}
                        onClick={() => navigate(`/topics/${topic.id}`)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        {/* Header */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: '8px'
                        }}>
                          <Title level={5} style={{ margin: 0, fontSize: '16px' }}>
                            {topic.name}
                          </Title>
                        </div>

                        {/* Description */}
                        <Text
                          style={{
                            color: '#666',
                            fontSize: '13px',
                            display: 'block',
                            marginBottom: '8px'
                          }}
                        >
                          {topic.description || '我是描述信息'}
                        </Text>

                        {/* Tags */}
                        <div style={{ marginBottom: '8px', minHeight: '28px' }}>
                          <Space size={[4, 4]} wrap>
                            {renderKeywordTags(topic.include_keywords, '包含', 'blue')}
                            {renderKeywordTags(topic.exclude_keywords, '排除', 'red')}
                            {topic.fine_filters?.length > 0 && (
                              <Tag
                                color="orange"
                                style={{
                                  marginRight: 4,
                                  marginBottom: 4,
                                  border: '1px solid #faad14',
                                  background: 'white'
                                }}
                              >
                                无直: {topic.fine_filters[0]}
                              </Tag>
                            )}
                          </Space>
                        </div>

                        {/* Trend info */}
                        <div style={{ marginBottom: '8px' }}>
                          <Space>
                            <Text style={{ color: '#666', fontSize: '13px' }}>事件趋势</Text>
                            {hasData && (
                              <Text
                                style={{
                                  color: trend.percent > 0 ? '#ff4d4f' : trend.percent < 0 ? '#52c41a' : '#999',
                                  fontSize: '13px',
                                  fontWeight: 500
                                }}
                              >
                                本周 {trend.percent > 0 ? '+' : ''}{trend.percent}%
                              </Text>
                            )}
                            {!hasData && (
                              <Text style={{ color: '#999', fontSize: '13px' }}>
                                本周 0 件
                              </Text>
                            )}
                          </Space>
                        </div>

                        {/* Chart */}
                        {hasData ? (
                          <div style={{ marginBottom: '8px', height: '120px' }}>
                            <Line
                              data={trend.data.map((count, index) => ({
                                date: index,
                                count: count
                              }))}
                              xField="date"
                              yField="count"
                              height={120}
                              padding={[10, 10, 30, 30]}
                              smooth
                              color="#1890ff"
                              xAxis={{
                                label: null,
                                line: { style: { stroke: '#e8e8e8' } },
                                tickLine: null,
                                grid: null
                              }}
                              yAxis={{
                                label: null,
                                line: null,
                                tickLine: null,
                                grid: { line: { style: { stroke: '#f0f0f0', lineDash: [4, 4] } } }
                              }}
                              areaStyle={{
                                fill: 'l(270) 0:#ffffff 0.5:#e6f7ff 1:#bae7ff',
                              }}
                              point={false}
                              tooltip={false}
                            />
                            {/* Stats */}
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              fontSize: '12px',
                              color: '#999',
                              marginTop: '-20px'
                            }}>
                              <span>最低：{stats.min}</span>
                              <span>平均：{stats.avg}</span>
                              <span>最高：{stats.max}</span>
                            </div>
                          </div>
                        ) : (
                          <div style={{
                            height: '120px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#fafafa',
                            borderRadius: '4px',
                            marginBottom: '8px'
                          }}>
                            <Text style={{ color: '#bbb', fontSize: '13px' }}>暂无数据</Text>
                          </div>
                        )}

                        {/* Footer */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingTop: '8px',
                          borderTop: '1px solid #f0f0f0'
                        }}>
                          <Text style={{ color: '#bbb', fontSize: '12px' }}>
                            {topic.createTime || dayjs().format('YYYY-MM-DD HH:mm:ss')}
                          </Text>
                          <Space size={4}>
                            <Tooltip title="查看详情">
                              <Button
                                type="text"
                                icon={<EyeOutlined style={{ color: '#bbb', fontSize: '14px' }} />}
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/topics/${topic.id}`);
                                }}
                              />
                            </Tooltip>
                            <Tooltip title="编辑">
                              <Button
                                type="text"
                                icon={<EditOutlined style={{ color: '#bbb', fontSize: '14px' }} />}
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditDrawer(topic);
                                }}
                              />
                            </Tooltip>
                            <Tooltip title="删除">
                              <Button
                                type="text"
                                icon={<DeleteOutlined style={{ color: '#bbb', fontSize: '14px' }} />}
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteTopic(topic.id, topic.name);
                                }}
                              />
                            </Tooltip>
                            <Tooltip title={followedTopics.has(topic.id) ? '已关注' : '关注'}>
                              <Button
                                type="text"
                                icon={followedTopics.has(topic.id) ? <StarFilled style={{ color: '#faad14', fontSize: '14px' }} /> : <StarOutlined style={{ color: '#bbb', fontSize: '14px' }} />}
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleFollow(topic.id);
                                }}
                              />
                            </Tooltip>
                          </Space>
                        </div>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            )
          }
        ]}
      />

      {/* 编辑主题抽屉 */}
      <Drawer
        title="编辑主题"
        open={editDrawerVisible}
        onClose={() => setEditDrawerVisible(false)}
        width={800}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button
              onClick={prevEditStep}
              disabled={editCurrentStep === 0}
              icon={<LeftOutlined />}
            >
              上一步
            </Button>

            <Space>
              <Button onClick={() => setEditDrawerVisible(false)}>
                取消
              </Button>

              {editCurrentStep < 2 ? (
                <Button
                  type="primary"
                  onClick={nextEditStep}
                  icon={<RightOutlined />}
                >
                  下一步
                </Button>
              ) : (
                <Button
                  type="primary"
                  loading={editSubmitting}
                  onClick={handleEditSubmit}
                  icon={<CheckCircleOutlined />}
                >
                  保存更新
                </Button>
              )}
            </Space>
          </div>
        }
      >
        <Steps
          current={editCurrentStep}
          style={{ marginBottom: 32 }}
          items={editSteps.map(step => ({
            title: step.title,
            icon: step.icon
          }))}
        />

        <div style={{ minHeight: '400px' }}>
          {editSteps[editCurrentStep].content}
        </div>
      </Drawer>
    </div>
  );
};

export default TopicList;
