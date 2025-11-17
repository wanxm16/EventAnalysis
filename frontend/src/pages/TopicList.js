import React, { useEffect, useState } from 'react';
import { Button, Card, Modal, Space, Tag, Typography, message, Empty, Row, Col, Tooltip, Drawer, Form, Input, Select, Switch, DatePicker, Alert, Divider } from 'antd';
import { PlusOutlined, BarChartOutlined, EyeOutlined, DeleteOutlined, EditOutlined, CalendarOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { eventAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title, Paragraph, Text } = Typography;

const TopicList = () => {
  const [loading, setLoading] = useState(false);
  const [topics, setTopics] = useState([]);
  const navigate = useNavigate();

  // 编辑抽屉相关状态
  const [editDrawerVisible, setEditDrawerVisible] = useState(false);
  const [editForm] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [editingTopicId, setEditingTopicId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [filterOptions, setFilterOptions] = useState({ towns: [], levels: [], categories: [] });

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

  // 加载筛选选项
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const opts = await eventAPI.getFilterOptions();
        setFilterOptions(opts || { towns: [], levels: [], categories: [] });
      } catch (e) {
        console.error('加载筛选选项失败:', e);
      }
    };
    loadFilterOptions();
  }, []);

  useEffect(() => { loadTopics(); }, []);

  // 打开编辑抽屉
  const openEditDrawer = async (topicId) => {
    try {
      setEditingTopicId(topicId);

      // 加载主题数据
      const res = await fetch(`http://localhost:8000/api/topics/${topicId}`);
      if (!res.ok) throw new Error('加载主题失败');
      const topic = await res.json();

      // 填充表单数据
      editForm.setFieldsValue({
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
      } else {
        setCategories([]);
      }

      setEditDrawerVisible(true);
    } catch (e) {
      console.error(e);
      message.error('加载主题失败: ' + e.message);
    }
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    try {
      const values = await editForm.validateFields();
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
        include_keywords: {
          description: parseKeywords(values.include_desc),
          result: parseKeywords(values.include_result)
        },
        exclude_keywords: {
          description: parseKeywords(values.exclude_desc),
          result: parseKeywords(values.exclude_result)
        },
        fine_filters: [],
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

      const res = await fetch(`http://localhost:8000/api/topics/${editingTopicId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('更新主题失败');

      message.success('主题更新成功');
      setEditDrawerVisible(false);
      setEditingTopicId(null);

      // 重新加载主题列表
      await loadTopics();
    } catch (e) {
      if (e?.errorFields) return; // 表单校验错误
      console.error(e);
      message.error('更新失败: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  // 分类管理函数
  const addCategory = () => {
    setCategories(prev => [...prev, { towns: [], levels: [], categories: [], timeRange: null }]);
  };

  const updateCategory = (idx, field, value) => {
    setCategories(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  const removeCategory = (idx) => {
    setCategories(prev => prev.filter((_, i) => i !== idx));
  };

  // 渲染关键词标签的辅助函数
  const renderKeywordTags = (keywords, label, color) => {
    if (!keywords) return null;
    
    // 处理新的字段级关键词结构
    if (typeof keywords === 'object' && !Array.isArray(keywords)) {
      const { description = [], result = [] } = keywords;
      const allKeywords = [];
      
      if (description.length > 0) {
        allKeywords.push(`描述:${description.join('、')}`);
      }
      if (result.length > 0) {
        allKeywords.push(`结果:${result.join('、')}`);
      }
      
      if (allKeywords.length > 0) {
        return (
          <Tag color={color} style={{ marginBottom: 4 }}>
            {label}: {allKeywords.join(' | ')}
          </Tag>
        );
      }
      return null;
    }
    
    // 兼容旧的数组格式
    if (Array.isArray(keywords) && keywords.length > 0) {
      return (
        <Tag color={color} style={{ marginBottom: 4 }}>
          {label}: {keywords.join('、')}
        </Tag>
      );
    }
    
    return null;
  };

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
            主题列表
          </Title>
          <Paragraph style={{ 
            margin: '8px 0 0 0', 
            color: '#6b7280',
            fontSize: '16px'
          }}>
            管理和监控您的事件主题，查看统计数据和详细信息
          </Paragraph>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={() => navigate('/topics/create')}
          size="large"
          style={{
            borderRadius: '8px',
            padding: '8px 24px',
            height: 'auto',
            background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
            border: 'none'
          }}
        >
          创建主题
        </Button>
      </div>

      {topics.length === 0 ? (
        <Card style={{
          borderRadius: '16px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          border: '1px solid #e5e7eb',
          textAlign: 'center',
          padding: '48px 24px'
        }}>
          <Empty 
            description={
              <div>
                <Text style={{ fontSize: '16px', color: '#6b7280' }}>暂无主题</Text>
                <br />
                <Text style={{ fontSize: '14px', color: '#9ca3af' }}>创建您的第一个主题来开始事件筛选</Text>
              </div>
            }
          >
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => navigate('/topics/create')}
              size="large"
              style={{
                borderRadius: '8px',
                padding: '8px 24px',
                height: 'auto',
                marginTop: '16px'
              }}
            >
              立即创建
            </Button>
          </Empty>
        </Card>
      ) : (
        <Row gutter={[24, 24]}>
          {topics.map(topic => (
            <Col xs={24} lg={12} xl={8} key={topic.id}>
              <Card 
                loading={loading}
                style={{
                  borderRadius: '16px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                  border: '1px solid #e5e7eb',
                  height: '100%',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                hoverable
                onClick={() => navigate(`/topics/${topic.id}`)}
                bodyStyle={{ padding: '24px' }}
              >
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  height: '100%'
                }}>
                  {/* Header */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '8px'
                    }}>
                      <Title 
                        level={4} 
                        style={{ 
                          margin: 0,
                          fontSize: '18px',
                          fontWeight: 600,
                          color: '#1f2937',
                          flex: 1,
                          marginRight: '12px'
                        }}
                        ellipsis={{ tooltip: topic.name }}
                      >
                        {topic.name}
                      </Title>
                      <Tag 
                        color={topic.enabled ? 'success' : 'default'}
                        style={{
                          borderRadius: '6px',
                          fontSize: '12px',
                          padding: '2px 8px'
                        }}
                      >
                        {topic.enabled ? '启用' : '停用'}
                      </Tag>
                    </div>
                    
                    {topic.description && (
                      <Text 
                        style={{ 
                          color: '#6b7280',
                          fontSize: '14px',
                          lineHeight: '1.5'
                        }}
                        ellipsis={{ tooltip: topic.description }}
                      >
                        {topic.description}
                      </Text>
                    )}
                  </div>

                  {/* Keywords Section */}
                  <div style={{ flex: 1, marginBottom: '16px' }}>
                    <Space size={[8, 8]} wrap>
                      {renderKeywordTags(topic.include_keywords, '包含', 'blue')}
                      {renderKeywordTags(topic.exclude_keywords, '排除', 'red')}
                      {topic.fine_filters?.length > 0 && (
                        <Tag color="purple" style={{ marginBottom: 4 }}>
                          精筛: {topic.fine_filters.join('、')}
                        </Tag>
                      )}
                      {topic.dedup && (
                        <Tag color="orange" style={{ marginBottom: 4 }}>
                          去重: {topic.dedup === 'description' ? '按描述' : topic.dedup}
                        </Tag>
                      )}
                    </Space>
                  </div>

                  {/* Footer */}
                  <div style={{ 
                    borderTop: '1px solid #f0f0f0',
                    paddingTop: '16px'
                  }}>
                    <div style={{ 
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CalendarOutlined style={{ color: '#9ca3af', fontSize: '14px' }} />
                        <Text 
                          style={{ 
                            color: '#9ca3af',
                            fontSize: '12px'
                          }}
                        >
                          {topic.createTime}
                        </Text>
                      </div>
                      
                      <Space size="small">
                        <Tooltip title="查看详情">
                          <Button
                            type="text"
                            icon={<EyeOutlined />}
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/topics/${topic.id}`);
                            }}
                            style={{ borderRadius: '6px' }}
                          />
                        </Tooltip>
                        <Tooltip title="编辑">
                          <Button
                            type="text"
                            icon={<EditOutlined />}
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditDrawer(topic.id);
                            }}
                            style={{ borderRadius: '6px' }}
                          />
                        </Tooltip>
                        <Tooltip title="统计分析">
                          <Button
                            type="text"
                            icon={<BarChartOutlined />}
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/topics/${topic.id}/stats`);
                            }}
                            style={{ borderRadius: '6px' }}
                          />
                        </Tooltip>
                        <Tooltip title="删除">
                          <Button
                            type="text"
                            icon={<DeleteOutlined />}
                            size="small"
                            danger
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTopic(topic.id, topic.name);
                            }}
                            style={{ borderRadius: '6px' }}
                          />
                        </Tooltip>
                      </Space>
                    </div>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* 编辑抽屉 */}
      <Drawer
        title="编辑主题"
        width={720}
        open={editDrawerVisible}
        onClose={() => {
          setEditDrawerVisible(false);
          setEditingTopicId(null);
        }}
        extra={
          <Space>
            <Button onClick={() => {
              setEditDrawerVisible(false);
              setEditingTopicId(null);
            }}>
              取消
            </Button>
            <Button type="primary" loading={saving} onClick={handleSaveEdit}>
              保存
            </Button>
          </Space>
        }
      >
        <Form form={editForm} layout="vertical">
          {/* 基础信息 */}
          <div style={{ marginBottom: 24 }}>
            <Title level={5} style={{ marginBottom: 16 }}>基础信息</Title>

            <Form.Item
              name="name"
              label={<Text strong>主题名称</Text>}
              rules={[{ required: true, message: '请输入主题名称' }]}
            >
              <Input placeholder="例如：噪音相关事件" maxLength={50} />
            </Form.Item>

            <Form.Item
              name="description"
              label={<Text strong>描述</Text>}
            >
              <Input.TextArea
                placeholder="可描述该主题创建逻辑和用途"
                rows={3}
                maxLength={200}
              />
            </Form.Item>
          </div>

          {/* 包含关键词 */}
          <Card size="small" title="第一道：包含关键词筛选" style={{ marginBottom: 16 }}>
            <Alert
              message="事件描述和处置结果之间是AND关系：必须同时满足两个字段的条件（如果都配置了关键词）"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="include_desc"
                  label={<Text strong>事件描述关键词</Text>}
                >
                  <Select
                    mode="tags"
                    placeholder="例如：噪音 噪声 吵闹"
                    tokenSeparators={[',', '，', ' ']}
                    open={false}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="include_result"
                  label={<Text strong>处置结果关键词</Text>}
                >
                  <Select
                    mode="tags"
                    placeholder="例如：处理完毕 已解决"
                    tokenSeparators={[',', '，', ' ']}
                    open={false}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* 排除关键词 */}
          <Card size="small" title="第二道：过滤关键词筛选" style={{ marginBottom: 16 }}>
            <Alert
              message="排除包含指定关键词的事件"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="exclude_desc"
                  label={<Text strong>排除事件描述关键词</Text>}
                >
                  <Select
                    mode="tags"
                    placeholder="例如：KTV 超市 商场"
                    tokenSeparators={[',', '，', ' ']}
                    open={false}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="exclude_result"
                  label={<Text strong>排除处置结果关键词</Text>}
                >
                  <Select
                    mode="tags"
                    placeholder="例如：无需处理 已撤销"
                    tokenSeparators={[',', '，', ' ']}
                    open={false}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* 去重设置 */}
          <Card size="small" title="第三道：数据去重" style={{ marginBottom: 16 }}>
            <Form.Item
              name="dedup"
              label={<Text strong>按事件描述去重</Text>}
              valuePropName="checked"
              initialValue={true}
            >
              <Switch checkedChildren="开启" unCheckedChildren="关闭" />
            </Form.Item>
          </Card>

          {/* 分类配置 */}
          <Card size="small" title="分类配置（可选）" style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              {categories.map((c, idx) => (
                <Card key={idx} size="small" style={{ background: '#fafafa' }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Select
                          mode="multiple"
                          placeholder="街镇名称（可多选）"
                          value={c.towns}
                          onChange={(vals) => updateCategory(idx, 'towns', vals)}
                          options={(filterOptions.towns || []).map(t => ({ label: t, value: t }))}
                          style={{ width: '100%' }}
                        />
                      </Col>
                      <Col span={12}>
                        <Select
                          mode="multiple"
                          placeholder="事件级别（可多选）"
                          value={c.levels}
                          onChange={(vals) => updateCategory(idx, 'levels', vals)}
                          options={(filterOptions.levels || []).map(t => ({ label: t, value: t }))}
                          style={{ width: '100%' }}
                        />
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Select
                          mode="multiple"
                          placeholder="二级分类（可多选）"
                          value={c.categories}
                          onChange={(vals) => updateCategory(idx, 'categories', vals)}
                          options={(filterOptions.categories || []).map(t => ({ label: t, value: t }))}
                          style={{ width: '100%' }}
                        />
                      </Col>
                      <Col span={12}>
                        <DatePicker.RangePicker
                          value={c.timeRange || null}
                          onChange={(dates) => updateCategory(idx, 'timeRange', dates)}
                          placeholder={["开始日期", "结束日期"]}
                          style={{ width: '100%' }}
                        />
                      </Col>
                    </Row>
                    <Button danger size="small" onClick={() => removeCategory(idx)}>
                      删除分类
                    </Button>
                  </Space>
                </Card>
              ))}
              <Button
                onClick={addCategory}
                icon={<PlusOutlined />}
                style={{ width: '100%', borderStyle: 'dashed' }}
              >
                添加分类
              </Button>
            </Space>
          </Card>
        </Form>
      </Drawer>
    </div>
  );
};

export default TopicList;

