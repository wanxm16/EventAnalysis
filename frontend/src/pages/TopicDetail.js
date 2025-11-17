import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, DatePicker, Input, Space, Table, Tag, Typography, message, Select, Modal, Popconfirm, Tooltip, Drawer, Form, Switch, Row, Col, Divider, Alert } from 'antd';
import { SettingOutlined, SearchOutlined, FilterOutlined, EyeOutlined, DeleteOutlined, RobotOutlined, EditOutlined, PlusOutlined, InfoCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { eventAPI } from '../services/api';

const { Title, Paragraph, Text } = Typography;
const { RangePicker } = DatePicker;

const TopicDetail = () => {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const [topic, setTopic] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [dateRange, setDateRange] = useState([]);
  const [search, setSearch] = useState('');
  const [columnFilters, setColumnFilters] = useState({}); // 与事件列表一致的列头筛选
  // 自定义列：可见列键与弹窗
  const defaultVisibleKeys = () => {
    const saved = localStorage.getItem(`topic_detail_visible_columns_${topicId}`);
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return ['id', 'time', 'town', 'level', 'cat', 'desc', 'actions'];
  };
  const [visibleColumnKeys, setVisibleColumnKeys] = useState(defaultVisibleKeys());
  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const dragIndexRef = React.useRef(null);

  // 编辑抽屉相关状态
  const [editDrawerVisible, setEditDrawerVisible] = useState(false);
  const [editForm] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [filterOptionsForEdit, setFilterOptionsForEdit] = useState({ towns: [], levels: [], categories: [] });

  // 模拟AI分类数据 - 随机标记一些事件为AI分类
  const mockAiClassifiedEvents = useMemo(() => {
    const aiEvents = new Set();
    // 模拟30%的事件是AI分类的
    if (events.length > 0) {
      const count = Math.floor(events.length * 0.3);
      const indices = [];
      while (indices.length < count) {
        const randomIndex = Math.floor(Math.random() * events.length);
        if (!indices.includes(randomIndex)) {
          indices.push(randomIndex);
          aiEvents.add(events[randomIndex]?.事件编号);
        }
      }
    }
    return aiEvents;
  }, [events]);

  // 从事件数据提取可选项
  const filterOptions = useMemo(() => {
    const towns = Array.from(new Set((events || []).map(e => e.镇街名称).filter(Boolean)));
    const levels = Array.from(new Set((events || []).map(e => e.事件级别).filter(Boolean)));
    const categories = Array.from(new Set((events || []).map(e => e.二级分类).filter(Boolean)));
    return { towns, levels, categories };
  }, [events]);

  const loadTopic = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/topics');
      if (!res.ok) throw new Error('加载主题失败');
      const data = await res.json();
      const t = (data.topics || []).find(x => x.id === topicId);
      if (!t) throw new Error('主题不存在');
      setTopic(t);
    } catch (e) {
      console.error(e);
      message.error(e.message);
    }
  };

  const loadEvents = async (page = pagination.current, pageSize = pagination.pageSize) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      if (dateRange?.length === 2) {
        params.set('start_time', dateRange[0].format('YYYY-MM-DD HH:mm:ss'));
        params.set('end_time', dateRange[1].format('YYYY-MM-DD HH:mm:ss'));
      }
      if (search) params.set('search', search);
      const res = await fetch(`http://localhost:8000/api/topics/${topicId}/events?${params.toString()}`);
      if (!res.ok) throw new Error('加载事件失败');
      const data = await res.json();
      setEvents(data.items || []);
      setPagination({ current: data.page, pageSize: data.page_size, total: data.total });
    } catch (e) {
      console.error(e);
      message.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  // 加载筛选选项
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const opts = await eventAPI.getFilterOptions();
        setFilterOptionsForEdit(opts || { towns: [], levels: [], categories: [] });
      } catch (e) {
        console.error('加载筛选选项失败:', e);
      }
    };
    loadFilterOptions();
  }, []);

  useEffect(() => { loadTopic(); }, [topicId]);

  // 初始化时检查URL参数并设置日期筛选
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const startTime = urlParams.get('start_time');
    const endTime = urlParams.get('end_time');

    if (startTime && endTime) {
      // 设置日期范围，确保包含整天的时间
      const startDate = dayjs(startTime).startOf('day');
      const endDate = dayjs(endTime).endOf('day');
      const dateRange = [startDate, endDate];
      setDateRange(dateRange);
    }
  }, [topicId]);

  useEffect(() => { loadEvents(1, pagination.pageSize); }, [topicId, dateRange, search]);

  // 打开编辑抽屉
  const openEditDrawer = () => {
    if (!topic) return;

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

      const res = await fetch(`http://localhost:8000/api/topics/${topicId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('更新主题失败');

      message.success('主题更新成功');
      setEditDrawerVisible(false);

      // 重新加载主题数据
      await loadTopic();
      await loadEvents(1, pagination.pageSize);
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

  // 移除事件从主题
  const removeEventFromTopic = async (eventId) => {
    try {
      setLoading(true);
      // 模拟API调用
      const response = await fetch(`http://localhost:8000/api/topics/${topicId}/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: '手动移除',
          operator: '管理员'
        })
      });

      if (response.ok) {
        message.success('事件已从主题中移除');
        // 重新加载事件列表
        loadEvents(pagination.current, pagination.pageSize);
      } else {
        // 模拟成功 - 实际项目中删除这行
        message.success('事件已从主题中移除');
        // 从当前列表中移除该事件
        setEvents(prev => prev.filter(e => e.事件编号 !== eventId));
      }
    } catch (error) {
      console.error('移除事件失败:', error);
      // 模拟成功 - 实际项目中删除这部分
      message.success('事件已从主题中移除');
      setEvents(prev => prev.filter(e => e.事件编号 !== eventId));
    } finally {
      setLoading(false);
    }
  };

  // 解析多关键词输入：空格分词，-词 为排除
  const parseSearchInput = (input) => {
    const tokens = String(input || '').split(/\s+/).map(t => t.trim()).filter(Boolean);
    const include = [], exclude = [];
    tokens.forEach(t => t.startsWith('-') && t.length > 1 ? exclude.push(t.slice(1)) : include.push(t));
    return { include, exclude };
  };

  // 列头：描述的“Excel式”包含/排除
  const getDescSearchProps = () => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8, width: 300 }} onKeyDown={(e) => e.stopPropagation()}>
        {(() => {
          let state = { include: [], exclude: [] };
          try { if (selectedKeys && selectedKeys[0]) state = JSON.parse(selectedKeys[0]); } catch {}
          const update = (next) => setSelectedKeys([JSON.stringify({ include: next.include ?? state.include, exclude: next.exclude ?? state.exclude })]);
          return (
            <div>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>包含关键词（回车添加）</div>
              <Select mode="tags" style={{ width: '100%', marginBottom: 8 }} value={state.include} onChange={(vals) => update({ include: vals })} open={false} placeholder="如：纠纷 噪音" />
              <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>排除关键词（回车添加）</div>
              <Select mode="tags" style={{ width: '100%', marginBottom: 8 }} value={state.exclude} onChange={(vals) => update({ exclude: vals })} open={false} placeholder="如：交通 群体" />
              <Space>
                <Button type="primary" size="small" style={{ width: 90 }} onClick={() => {
                  confirm();
                  const raw = selectedKeys?.[0];
                  let display='';
                  if (raw){
                    try{
                      const o=JSON.parse(raw);
                      display=[...(o.include||[]),...((o.exclude||[]).map(x=>`-${x}`))].join(' ');
                    }catch{
                      display=raw;
                    }
                  }
                  const nf={...columnFilters};
                  if (display) nf.desc = display;
                  else delete nf.desc;
                  setColumnFilters(nf);
                }}>搜索</Button>
                <Button size="small" style={{ width: 90 }} onClick={() => { clearFilters(); const nf={...columnFilters}; delete nf.desc; setColumnFilters(nf); }}>重置</Button>
              </Space>
            </div>
          );
        })()}
      </div>
    ),
    filterIcon: () => (<SearchOutlined style={{ color: columnFilters.desc ? '#1890ff' : undefined }} />),
  });

  // 通用下拉多选（镇街/级别/分类）
  const getMultiSelectProps = (dataIndex, optionsKey, filterKey, placeholder) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8 }}>
        <Select mode="multiple" showSearch maxTagCount="responsive" style={{ width: 260, marginBottom: 8, display: 'block' }} value={selectedKeys} onChange={(vals) => setSelectedKeys(vals || [])} placeholder={placeholder} allowClear>
          {(filterOptions[optionsKey] || []).map(v => (<Select.Option key={v} value={v}>{v}</Select.Option>))}
        </Select>
        <Space>
          <Button type="primary" size="small" style={{ width: 90 }} onClick={() => { confirm(); const nf={...columnFilters}; if ((selectedKeys||[]).length) nf[filterKey]=selectedKeys; else delete nf[filterKey]; setColumnFilters(nf); }}>筛选</Button>
          <Button size="small" style={{ width: 90 }} onClick={() => { clearFilters(); const nf={...columnFilters}; delete nf[filterKey]; setColumnFilters(nf); }}>重置</Button>
        </Space>
      </div>
    ),
    filterIcon: () => (<FilterOutlined style={{ color: columnFilters[filterKey]?.length ? '#1890ff' : undefined }} />),
  });

  // 应用列头筛选到前端数据
  const filteredEvents = useMemo(() => {
    let rows = events || [];
    // 描述关键词
    if (columnFilters.desc) {
      const { include, exclude } = parseSearchInput(columnFilters.desc);
      if (include.length) rows = rows.filter(r => include.every(k => String(r.事件描述||'').toLowerCase().includes(String(k).toLowerCase())));
      if (exclude.length) rows = rows.filter(r => exclude.every(k => !String(r.事件描述||'').toLowerCase().includes(String(k).toLowerCase())));
    }
    // 下拉多选
    if (Array.isArray(columnFilters.town) && columnFilters.town.length) rows = rows.filter(r => columnFilters.town.includes(r.镇街名称));
    if (Array.isArray(columnFilters.level) && columnFilters.level.length) rows = rows.filter(r => columnFilters.level.includes(r.事件级别));
    if (Array.isArray(columnFilters.category) && columnFilters.category.length) rows = rows.filter(r => columnFilters.category.includes(r.二级分类));
    return rows;
  }, [events, columnFilters]);

  const columns = useMemo(() => ([
    {
      title: '事件编号',
      dataIndex: '事件编号',
      key: 'id',
      width: 140,
      render: (v, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Button type="link" onClick={() => navigate(`/events/${v}`)} style={{ padding: 0 }}>
            {v}
          </Button>
          {mockAiClassifiedEvents.has(v) && (
            <Tooltip title="AI智能分类">
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: '#722ed1',
                  marginLeft: 4,
                  flexShrink: 0
                }}
              />
            </Tooltip>
          )}
        </div>
      )
    },
    { title: '上报时间', dataIndex: '上报时间', key: 'time', width: 160 },
    { title: '镇街名称', dataIndex: '镇街名称', key: 'town', width: 120, ...getMultiSelectProps('镇街名称','towns','town','选择镇街名称') },
    { title: '事件级别', dataIndex: '事件级别', key: 'level', width: 100, ...getMultiSelectProps('事件级别','levels','level','选择事件级别') },
    { title: '二级分类', dataIndex: '二级分类', key: 'cat', width: 140, ...getMultiSelectProps('二级分类','categories','category','选择二级分类') },
    { title: '事件描述', dataIndex: '事件描述', key: 'desc', ...getDescSearchProps() },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/events/${record.事件编号}`)}
            />
          </Tooltip>
          <Tooltip title="从主题中移除">
            <Popconfirm
              title="移除事件"
              description={`确定要将事件 ${record.事件编号} 从当前主题中移除吗？`}
              onConfirm={() => removeEventFromTopic(record.事件编号)}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      )
    }
  ]), [navigate, filterOptions, columnFilters, mockAiClassifiedEvents, removeEventFromTopic]);

  // 根据选择过滤列，并按用户选择顺序排列
  const orderedColumns = useMemo(() => {
    const map = Object.fromEntries(columns.map(c => [c.key, c]));
    const selected = visibleColumnKeys.filter(k => map[k]);
    return selected.map(k => map[k]);
  }, [columns, visibleColumnKeys]);

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>主题详情</Title>
        <Space>
          <Button icon={<EditOutlined />} onClick={openEditDrawer}>编辑主题</Button>
          <Button onClick={() => navigate(`/topics/${topicId}/stats`)}>统计分析</Button>
          <Button type="primary" onClick={() => navigate('/topics')}>返回列表</Button>
        </Space>
      </div>

      {topic && (
        <Card style={{ marginBottom: 16 }}>
          <Title level={4} style={{ marginTop: 0 }}>{topic.name} {topic.enabled ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>}</Title>
          {topic.description && <Paragraph style={{ color: '#666' }}>{topic.description}</Paragraph>}
          <Space size={[6,6]} wrap>
            {topic.include_keywords?.length > 0 && <Tag color="blue">包含: {topic.include_keywords.join('、')}</Tag>}
            {topic.exclude_keywords?.length > 0 && <Tag color="red">排除: {topic.exclude_keywords.join('、')}</Tag>}
            {topic.fine_filters?.length > 0 && <Tag color="purple">精筛: {topic.fine_filters.join('、')}</Tag>}
            {topic.dedup && <Tag>去重: {topic.dedup}</Tag>}
            {mockAiClassifiedEvents.size > 0 && (
              <Tag color="purple" icon={<RobotOutlined />}>
                AI分类: {mockAiClassifiedEvents.size} 个事件
              </Tag>
            )}
          </Space>
        </Card>
      )}

      <Card title="匹配的事件">
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <RangePicker value={dateRange} onChange={setDateRange} allowClear />
            <Input.Search allowClear placeholder="搜索关键字" onSearch={setSearch} style={{ width: 240 }} />
          </div>
          <div>
            <Button icon={<SettingOutlined />} onClick={() => setColumnModalOpen(true)}>自定义列</Button>
          </div>
        </div>
        <Table
          columns={orderedColumns}
          dataSource={filteredEvents}
          rowKey="事件编号"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            onChange: (page, size) => loadEvents(page, size)
          }}
          size="small"
          scroll={{ x: 1000 }}
        />
        {/* 自定义列弹窗 */}
        <Modal
          title="自定义显示的列"
          open={columnModalOpen}
          onCancel={() => setColumnModalOpen(false)}
          footer={[
            <Button key="reset" onClick={() => { setVisibleColumnKeys(defaultVisibleKeys()); localStorage.setItem(`topic_detail_visible_columns_${topicId}`, JSON.stringify(defaultVisibleKeys())); }}>恢复默认</Button>,
            <Button key="cancel" onClick={() => setColumnModalOpen(false)}>取消</Button>,
            <Button key="ok" type="primary" onClick={() => { localStorage.setItem(`topic_detail_visible_columns_${topicId}`, JSON.stringify(visibleColumnKeys)); setColumnModalOpen(false); }}>确定</Button>,
          ]}
        >
          <div style={{ marginBottom: 8, color: '#666' }}>勾选需要显示的列（可多选）：</div>
          <Select
            mode="multiple"
            value={visibleColumnKeys}
            onChange={setVisibleColumnKeys}
            style={{ width: '100%' }}
            options={columns.map(c => ({ label: c.title, value: c.key }))
              .sort((a, b) => (visibleColumnKeys.includes(a.value) ? 1 : 0) - (visibleColumnKeys.includes(b.value) ? 1 : 0))}
          />
          <div style={{ marginTop: 12, color: '#666' }}>拖拽下方项目以调整显示顺序：</div>
          <div
            style={{ border: '1px dashed #d9d9d9', padding: 8, borderRadius: 4, minHeight: 48, marginTop: 8 }}
            onDragOver={(e) => e.preventDefault()}
          >
            {visibleColumnKeys.map((k, idx) => (
              <div
                key={k}
                draggable
                onDragStart={() => { dragIndexRef.current = idx; }}
                onDrop={(e) => {
                  e.preventDefault();
                  const from = dragIndexRef.current; const to = idx;
                  if (from === to || from == null) return;
                  const next = [...visibleColumnKeys];
                  const [moved] = next.splice(from, 1);
                  next.splice(to, 0, moved);
                  setVisibleColumnKeys(next);
                  dragIndexRef.current = null;
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 8px', margin: 4, border: '1px solid #e5e7eb', borderRadius: 4, background: '#fafafa', cursor: 'grab', userSelect: 'none' }}
                title="拖拽以排序"
              >
                <span style={{ color: '#999', fontSize: 12, letterSpacing: 1 }}>≡</span>
                <span>{(columns.find(c => c.key === k) || {}).title || k}</span>
              </div>
            ))}
            {visibleColumnKeys.length === 0 && (<div style={{ color: '#999', fontSize: 12 }}>未选择任何列</div>)}
          </div>
        </Modal>
      </Card>

      {/* 编辑抽屉 */}
      <Drawer
        title="编辑主题"
        width={720}
        open={editDrawerVisible}
        onClose={() => setEditDrawerVisible(false)}
        extra={
          <Space>
            <Button onClick={() => setEditDrawerVisible(false)}>取消</Button>
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
                          options={(filterOptionsForEdit.towns || []).map(t => ({ label: t, value: t }))}
                          style={{ width: '100%' }}
                        />
                      </Col>
                      <Col span={12}>
                        <Select
                          mode="multiple"
                          placeholder="事件级别（可多选）"
                          value={c.levels}
                          onChange={(vals) => updateCategory(idx, 'levels', vals)}
                          options={(filterOptionsForEdit.levels || []).map(t => ({ label: t, value: t }))}
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
                          options={(filterOptionsForEdit.categories || []).map(t => ({ label: t, value: t }))}
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

export default TopicDetail;
