import React, { useEffect, useState } from 'react';
import { Button, Card, Space, Table, Tag, Typography, Modal, Form, Input, DatePicker, message, Select, Radio } from 'antd';
import { PlusOutlined, EditOutlined, EyeOutlined, CloudUploadOutlined, FileWordOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { reportAPI } from '../services/api';

const { Title } = Typography;

const REPORT_TEMPLATES = [
  {
    id: 'sample_monthly_overview',
    name: '月度事件追踪报告（示例模板）',
    description: '包含重点事件图表、核查情况、退回分析等固定段落。',
    titleFormat: '\${monthLabel}全区矛盾纠纷等重点事件追踪报告',
    content: `# 宁波市海曙区社会治理中心

---

## \${monthLabel}全区矛盾纠纷等重点事件追踪报告

（\${year}年\${monthShort}）

\${monthShort}以来，区社会治理中心不断强化线上线下事件实质闭环，现将该月情况报告如下。

1. 线下矛调功能区工作情况

略

[CHART:各街道事件数量柱状图|period=@month|scope=全区|code=CHART_EVT_STREET_BAR]

二、线上平台重点事件闭环情况

区社治中心追踪监测“141”平台重点事件 [click:重点事件数量|code=KPI_EVT_MAJOR|period=@month|scope=全区|precision=1] 件，环比下降 5.2%，退回核查闭环 [click:退回核查闭环件数|code=KPI_EVT_RET_CLOSED|period=@month|scope=全区|precision=1] 件，环比上升112.5%，其中扬言、极端类事件9件，环比下降18%。

（一）重点核查情况

1. 公共安全类事件。追踪监测170件，环比下降8%，其中警网融合事件37件。

2.涉未成年人类事件。追踪监测涉未成年人事件145件，环比下降17.6%，其中警网融合11件、非警务分流48件。

3.矛盾纠纷类事件。追踪监测矛盾纠纷类、治安隐患类、信访维稳类事件4999件，环比下降4.5%，其中非警务分流 3894件、警网融合754件，退回68件。

（二）退回事件分析

1.退回类型分析。区中心退回68件主要为阶段性闭环38件，占比55.9%，过简闭环28件、错误办理2件。经督促，退回事件已重新闭环。

2.退回分布情况。集士港、南门、石碶退回较多，分别为11件、11件、10件，白云、鄞江、龙观工作较好，没有退回事件。

（三）典型闭环事件

1.阶段性闭环。8月14日公安110警情：当事人亲属在第一医院治疗用药后死亡，想找药厂方处理。

民警现场处置：引导家属到医患办联系厂家，厂方回复当事人明天派领导到宁波协商处理事宜。因当事人住在月湖辖区宾馆，公安现场处置后将该事件推送社区进行后续关注。

**初次办结意见：**综治工作人员已联系相关部门进一步跟进处理。**二次闭环意见：**经与医患办、属地民警了解，厂方领导对涉事家属送去悼念物品，在双方沟通下，报警人稳定情绪，达成一致，收下物品，纠纷化解。

2.过简闭环。8月20日公安110警情：章水镇一起邻里纠纷，当事人因历史建房纠纷，目前赤水村造房子可能会再次引发纠纷，希望镇、村两级密切关注。

**初次办结意见：**双方村民正在协商。**二次闭环意见：**村干部、网格员已与双方当事人进行沟通，了解双方诉求及情绪动态，上门做安抚工作，同时联系镇平安法治办、司法所提供法律咨询和支持，在处理本次潜在纠纷的同时，村干部也尝试同步化解其遗留历史隔阂，引导双方依法依规解决问题，共建和谐邻里关系。

三、全市涉我区重点事件闭环情况

本月，根据市委副书记张丽批示要求，市社会治理中心对平台未办结的存在安全问题的井盖破损缺失问题进行了梳理督办，涉我区此类未闭环事件共27件，截至目前，已全部闭环。

附件：1.区社会治理中心矛调功能区受理情况表

2.全市闭环处置清单平台事件处置情况`,
  },
];

const getDayOptions = () => Array.from({ length: 28 }).map((_, idx) => ({ value: idx + 1, label: `${idx + 1}号` }));

const DEFAULT_SCHEDULE_DAY = 5;
const DAY_OPTIONS = getDayOptions();

const ReportList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();
  const [titleAuto, setTitleAuto] = useState(true);
  const [contentAuto, setContentAuto] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState(REPORT_TEMPLATES[0]?.id || null);
  const selectedTemplate = REPORT_TEMPLATES.find((tpl) => tpl.id === selectedTemplateId);

  const ensureMonthValue = (value) => {
    if (!value) return null;
    if (dayjs.isDayjs && dayjs.isDayjs(value)) return value;
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed : null;
  };

  const buildReplacements = (monthValue) => {
    const base = ensureMonthValue(monthValue) || dayjs();
    const prev = base.subtract(1, 'month');
    return {
      monthLabel: `${prev.format('M')}月份`,
      monthShort: `${prev.format('M')}月`,
      year: prev.format('YYYY'),
      targetYear: base.format('YYYY'),
      targetMonth: base.format('MM'),
    };
  };

  const interpolateTemplate = (pattern, replacements) => {
    if (!pattern) return '';
    return pattern.replace(/\$\{(\w+)\}/g, (_, key) => (replacements[key] !== undefined ? replacements[key] : ''));
  };

  const applyTemplateDefaults = (monthValue, template) => {
    if (!template) return { title: '', content: '' };
    const replacements = buildReplacements(monthValue);
    return {
      title: interpolateTemplate(template.titleFormat, replacements),
      content: interpolateTemplate(template.content, replacements),
    };
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await reportAPI.listReports();
      setReports(res.items || []);
    } catch (e) {
      console.error(e);
      message.error('加载报告列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (createOpen) {
      const defaultMonth = dayjs();
      const defaultTemplate = REPORT_TEMPLATES[0];
      form.resetFields();
      const { title, content } = applyTemplateDefaults(defaultMonth, defaultTemplate);
      form.setFieldsValue({
        month: defaultMonth,
        scheduleType: 'monthly',
        scheduleDay: DEFAULT_SCHEDULE_DAY,
        templateId: defaultTemplate?.id,
        title,
        content,
      });
      setTitleAuto(true);
      setContentAuto(true);
      setSelectedTemplateId(defaultTemplate?.id || null);
    }
  }, [createOpen, form]);

  const handleValuesChange = (changedValues, allValues) => {
    if (Object.prototype.hasOwnProperty.call(changedValues, 'title')) {
      setTitleAuto(false);
    }
    if (Object.prototype.hasOwnProperty.call(changedValues, 'content')) {
      setContentAuto(false);
    }
    if (Object.prototype.hasOwnProperty.call(changedValues, 'templateId')) {
      setSelectedTemplateId(changedValues.templateId);
    }
    if (Object.prototype.hasOwnProperty.call(changedValues, 'scheduleType')) {
      if (changedValues.scheduleType === 'monthly' && !allValues.scheduleDay) {
        form.setFieldsValue({ scheduleDay: DEFAULT_SCHEDULE_DAY });
      }
      if (changedValues.scheduleType === 'manual') {
        form.setFieldsValue({ scheduleDay: undefined });
      }
    }

    const monthValue = changedValues.month || allValues.month;
    const templateId = changedValues.templateId || allValues.templateId;
    const template = REPORT_TEMPLATES.find((t) => t.id === templateId);
    if (template && monthValue) {
      const replacements = buildReplacements(monthValue);
      if (titleAuto && (Object.prototype.hasOwnProperty.call(changedValues, 'month') || Object.prototype.hasOwnProperty.call(changedValues, 'templateId'))) {
        const nextTitle = interpolateTemplate(template.titleFormat, replacements);
        form.setFieldsValue({ title: nextTitle });
      }
      if (contentAuto && (Object.prototype.hasOwnProperty.call(changedValues, 'month') || Object.prototype.hasOwnProperty.call(changedValues, 'templateId'))) {
        const nextContent = interpolateTemplate(template.content, replacements);
        form.setFieldsValue({ content: nextContent });
      }
    }
  };

  const resetModalState = () => {
    form.resetFields();
    setTitleAuto(true);
    setContentAuto(true);
    setSelectedTemplateId(REPORT_TEMPLATES[0]?.id || null);
  };

  const handleModalCancel = () => {
    resetModalState();
    setCreateOpen(false);
  };

  const columns = [
    { title: '标题', dataIndex: 'title', key: 'title', render: (t, r) => <Button type="link" onClick={() => navigate(`/reports/${r.id}/edit`)}>{t}</Button> },
    { title: '月份', dataIndex: 'month', key: 'month', width: 120 },
    {
      title: '生成配置',
      dataIndex: 'schedule_type',
      key: 'schedule',
      width: 160,
      render: (_, r) => {
        if (r.schedule_type === 'monthly') {
          return `每月${r.schedule_day || '-'}日`;
        }
        return '手动';
      },
    },
    { title: '状态', dataIndex: 'status', key: 'status', width: 120, render: v => v === 'published' ? <Tag color="green">已发布</Tag> : <Tag>草稿</Tag> },
    { title: '更新时间', dataIndex: 'updated_at', key: 'updated_at', width: 180 },
    { title: '操作', key: 'op', width: 260, render: (_, r) => (
      <Space>
        <Button icon={<EditOutlined />} onClick={() => navigate(`/reports/${r.id}/edit`)}>编辑</Button>
        <Button icon={<EyeOutlined />} onClick={async () => {
          try {
            const prev = await reportAPI.preview(r.id, r.content_md_draft || '', r.month);
            const win = window.open('', '_blank');
            win.document.write(`<html><head><title>预览-${r.title}</title></head><body style="padding:16px;font-family:sans-serif">${prev.rendered_html.replace(/\n/g,'<br/>')}</body></html>`);
          } catch (e) {
            message.error('预览失败');
          }
        }}>预览</Button>
        <Button icon={<CloudUploadOutlined />} disabled={r.status==='published'} onClick={async () => {
          try { await reportAPI.publish(r.id, r.month); message.success('发布成功'); load(); } catch (e) { message.error('发布失败'); }
        }}>发布</Button>
        <Button icon={<FileWordOutlined />} onClick={async () => {
          try {
            const blob = await reportAPI.exportDocx(r.id, r.month);
            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement('a');
            link.href = url; link.download = `${r.title || '报告'}.docx`; link.click();
          } catch (e) { message.error('导出失败'); }
        }}>导出</Button>
      </Space>
    )}
  ];

  const createReport = async () => {
    try {
      const vals = await form.validateFields();
      const template = REPORT_TEMPLATES.find((t) => t.id === vals.templateId);
      const scheduleDay = vals.scheduleType === 'monthly'
        ? (vals.scheduleDay !== undefined && vals.scheduleDay !== null ? Number(vals.scheduleDay) : null)
        : null;

      await reportAPI.createReport({
        title: vals.title,
        month: vals.month.format('YYYY-MM'),
        content_md_draft: vals.content || '',
        schedule_type: vals.scheduleType || null,
        schedule_day: scheduleDay,
        template_id: vals.templateId || null,
        template_name: template?.name || null,
      });
      message.success('已创建草稿');
      resetModalState();
      setCreateOpen(false);
      load();
    } catch (e) {}
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>报告列表</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>新建报告</Button>
        </Space>
      </div>
      <Card>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={reports}
          columns={columns}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal title="新建报告" open={createOpen} onCancel={handleModalCancel} onOk={createReport} okText="创建">
        <Form form={form} layout="vertical" onValuesChange={handleValuesChange}>
          <Form.Item label="标题" name="title" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="例如：8月份全区矛盾纠纷等重点事件追踪报告" />
          </Form.Item>
          <Form.Item label="报告月份" name="month" rules={[{ required: true, message: '请选择月份' }]}>
            <DatePicker picker="month" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="生成周期" name="scheduleType" rules={[{ required: true, message: '请选择生成周期' }]}> 
            <Radio.Group>
              <Radio.Button value="monthly">每月</Radio.Button>
              <Radio.Button value="manual">手动创建</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.scheduleType !== cur.scheduleType}>
            {({ getFieldValue }) => (
              getFieldValue('scheduleType') === 'monthly' ? (
                <Form.Item label="每月生成日" name="scheduleDay" rules={[{ required: true, message: '请选择生成日' }]}>
                  <Select options={DAY_OPTIONS} placeholder="请选择生成日" />
                </Form.Item>
              ) : null
            )}
          </Form.Item>
          <Form.Item label="模板" name="templateId" rules={[{ required: true, message: '请选择模板' }]}> 
            <Select options={REPORT_TEMPLATES.map((tpl) => ({ value: tpl.id, label: tpl.name }))} placeholder="请选择模板" />
          </Form.Item>
          {selectedTemplate && (
            <div style={{ marginTop: -8, marginBottom: 16, color: '#666' }}>
              {selectedTemplate.description}
            </div>
          )}
          <Form.Item label="初始化内容" name="content">
            <Input.TextArea rows={6} placeholder="可粘贴模板或占位符 DSL，如 [KPI:重点事件数量|period=@month|unit=件]" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ReportList;
