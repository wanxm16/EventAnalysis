import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Space, Typography, Input, DatePicker, message, Modal, Form, Select, Radio, Divider, Spin, Tooltip } from 'antd';
import { SaveOutlined, EyeOutlined, CloudUploadOutlined, FileWordOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { reportAPI } from '../services/api';
import ReportMarkdownEditor from '../components/ReportMarkdownEditor';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkReportPlaceholders from '../plugins/remarkReportPlaceholders';
import ReportChartPreview from '../components/ReportChartPreview';

const { Title } = Typography;

const parseIndicatorDefinition = (definition) => {
  if (!definition || typeof definition !== 'string') return null;
  const match = definition.match(/^\[([A-Z_]+):([^\]|]+)(\|[^\]]+)?\]$/);
  if (!match) return null;
  const [, type, label, rawParams] = match;
  const params = {};
  const order = [];
  if (rawParams) {
    rawParams
      .slice(1)
      .split('|')
      .forEach((segment) => {
        if (!segment) return;
        const [key, ...rest] = segment.split('=');
        if (!key) return;
        const value = rest.length > 0 ? rest.join('=') : '';
        params[key] = value;
        order.push(key);
      });
  }
  return { type, label, params, order };
};

const normalizePrecision = (value, fallback = 1) => {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const buildIndicatorFormValues = (meta) => {
  const base = {
    type: 'KPI',
    indicator: undefined,
    period: '@month',
    scope: '全区',
    unit: undefined,
    precision: 1,
    label: undefined,
  };
  if (!meta) {
    return base;
  }
  const params = meta.params || {};
  const period = meta.period !== undefined ? meta.period : params.period;
  if (meta.type) base.type = meta.type;
  if (meta.code) base.indicator = meta.code;
  else if (params.code) base.indicator = params.code;
  if (meta.indicator) base.indicator = meta.indicator;
  if (meta.label) base.label = meta.label;
  if (period !== undefined) base.period = period || '';
  if (params.scope !== undefined) base.scope = params.scope;
  if (meta.scope !== undefined) base.scope = meta.scope;
  if (params.unit !== undefined) base.unit = params.unit;
  if (meta.unit !== undefined) base.unit = meta.unit;
  if (params.precision !== undefined) base.precision = normalizePrecision(params.precision, base.precision);
  if (meta.precision !== undefined) base.precision = normalizePrecision(meta.precision, base.precision);
  return base;
};

const ReportEdit = () => {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [title, setTitle] = useState('');
  const [month, setMonth] = useState(dayjs());
  const [content, setContent] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewValues, setPreviewValues] = useState([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [insertOpen, setInsertOpen] = useState(false);
  const [indicatorOptions, setIndicatorOptions] = useState([]);
  const [chartOpen, setChartOpen] = useState(false);
  const [chartOptions, setChartOptions] = useState([]);
  const [chartCatalog, setChartCatalog] = useState({});
  const [indicatorCatalog, setIndicatorCatalog] = useState({});
  const [indicatorCatalogVersion, setIndicatorCatalogVersion] = useState(0);
  const [insertForm] = Form.useForm();
  const [chartForm] = Form.useForm();
  const editorRef = useRef(null);
  const chartCatalogRef = useRef({});
  const indicatorCatalogRef = useRef({});

  useEffect(() => {
    chartCatalogRef.current = chartCatalog;
  }, [chartCatalog]);

  useEffect(() => {
    indicatorCatalogRef.current = indicatorCatalog;
  }, [indicatorCatalog]);

  const upsertChartCatalog = useCallback((items = []) => {
    if (!items || !items.length) return;
    setChartCatalog((prev) => {
      const next = { ...prev };
      items.forEach((item) => {
        if (!item) return;
        if (item.code) {
          next[item.code] = item.code;
        }
        if (item.name) {
          next[item.name] = item.code;
          next[item.name.trim()] = item.code;
        }
      });
      return next;
    });
  }, []);

  const upsertIndicatorCatalog = useCallback((items = []) => {
    if (!items || !items.length) return;
    let hasChanges = false;
    setIndicatorCatalog((prev) => {
      const next = { ...prev };
      items.forEach((item) => {
        if (!item) return;
        if (item.code) {
          if (next[item.code] !== item.code) {
            next[item.code] = item.code;
            if (prev[item.code] !== item.code) {
              hasChanges = true;
            }
          }
        }
        if (item.name) {
          const original = item.name;
          if (next[original] !== item.code) {
            next[original] = item.code;
            if (prev[original] !== item.code) {
              hasChanges = true;
            }
          }
          const trimmed = original.trim();
          if (trimmed && next[trimmed] !== item.code) {
            next[trimmed] = item.code;
            if (prev[trimmed] !== item.code) {
              hasChanges = true;
            }
          }
        }
      });
      if (!hasChanges) {
        return prev;
      }
      return next;
    });
    if (hasChanges) {
      setIndicatorCatalogVersion((prevVersion) => prevVersion + 1);
    }
  }, [setIndicatorCatalogVersion]);

  const resolveIndicatorCode = useCallback((labelOrCode) => {
    if (!labelOrCode) return '';
    const key = typeof labelOrCode === 'string' ? labelOrCode.trim() : labelOrCode;
    return indicatorCatalogRef.current[key] || '';
  }, []);

  const openInsertIndicator = useCallback(async (defaults = null) => {
    setInsertOpen(true);
    insertForm.resetFields();
    const formValues = buildIndicatorFormValues(defaults || {});
    const precisionValue = normalizePrecision(formValues.precision, 1);
    insertForm.setFieldsValue({
      type: formValues.type,
      indicator: formValues.indicator,
      period: formValues.period,
      scope: formValues.scope,
      unit: formValues.unit,
      precision: precisionValue,
    });

    if (formValues.indicator && formValues.label) {
      upsertIndicatorCatalog([{ code: formValues.indicator, name: formValues.label }]);
    }

    try {
      const res = await reportAPI.searchIndicators('', 1, 100, 'KPI');
      const items = res.items || [];
      let merged = items;
      if (formValues.indicator && formValues.label && !items.some((item) => item.code === formValues.indicator)) {
        merged = [...items, { code: formValues.indicator, name: formValues.label }];
      }
      setIndicatorOptions(merged);
      upsertIndicatorCatalog(merged);
    } catch (e) {
      message.error('指标列表加载失败');
    }
  }, [insertForm, upsertIndicatorCatalog]);

  const chartValues = useMemo(
    () => previewValues.filter(item => item?.metadata?.chart),
    [previewValues]
  );

  const indicatorValues = useMemo(
    () => previewValues.filter(item => item?.metadata?.definition),
    [previewValues]
  );

  const remarkPlugin = useMemo(() => {
    if (!chartValues.length && !indicatorValues.length) return null;
    return remarkReportPlaceholders({ chartValues, indicatorValues });
  }, [chartValues, indicatorValues]);

  const markdownComponents = useMemo(() => ({
    'chart-placeholder': ({ node }) => {
      const idx = Number(node?.data?.hProperties?.['data-idx']);
      if (Number.isNaN(idx) || idx < 0 || idx >= chartValues.length) {
        return null;
      }
      const chartSpec = chartValues[idx]?.metadata?.chart;
      return chartSpec ? <ReportChartPreview chart={chartSpec} /> : null;
    },
    'indicator-placeholder': ({ node, children }) => {
      // 在预览模式下，只显示普通文本，无交互效果
      return (
        <span style={{ color: 'inherit', textDecoration: 'none', cursor: 'default' }}>
          {children}
        </span>
      );
    },
  }), [chartValues, indicatorValues, openInsertIndicator, resolveIndicatorCode]);

  const load = async () => {
    setLoading(true);
    try {
      const r = await reportAPI.getReport(reportId);
      setReport(r);
      setTitle(r.title || '');
      setMonth(dayjs(r.month + '-01'));
      setContent(r.content_md_draft || '');
      setPreviewHtml('');
      setPreviewValues([]);
      setPreviewVisible(false);
    } catch (e) { message.error('加载失败'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [reportId]);

  useEffect(() => {
    (async () => {
      try {
        const res = await reportAPI.searchCharts('', 1, 100);
        upsertChartCatalog(res.items || []);
      } catch (e) {
        // ignore catalog preload errors
      }
    })();
  }, [upsertChartCatalog]);

  useEffect(() => {
    (async () => {
      try {
        const res = await reportAPI.searchIndicators('', 1, 200, 'KPI');
        upsertIndicatorCatalog(res.items || []);
      } catch (e) {
        // ignore indicator catalog preload errors
      }
    })();
  }, [upsertIndicatorCatalog]);

  const monthKey = useMemo(() => (month ? month.format('YYYY-MM') : null), [month]);

  useEffect(() => {
    const editorInstance = editorRef.current;
    if (!editorInstance || !editorInstance.view) return;
    const { state, view } = editorInstance;
    if (!state || !view) return;
    const tr = state.tr.setMeta('indicator:refresh', Date.now());
    tr.setMeta('addToHistory', false);
    view.dispatch(tr);
  }, [monthKey, indicatorCatalogVersion]);

  const save = async () => {
    try {
      await reportAPI.updateReport(reportId, { title, month: month.format('YYYY-MM'), content_md_draft: content });
      message.success('已保存');
    } catch (e) { message.error('保存失败'); }
  };

  const doPreview = async () => {
    try {
      const res = await reportAPI.preview(reportId, content, month.format('YYYY-MM'));
      setPreviewHtml(res.rendered_html || '');
      setPreviewValues(res.values || []);
      setPreviewVisible(true);
      message.success('已刷新预览');
    } catch (e) { message.error('预览失败'); }
  };

  const publish = async () => {
    try {
      await reportAPI.publish(reportId, month.format('YYYY-MM'));
      message.success('发布成功');
      load();
    } catch (e) { message.error('发布失败'); }
  };

  const exportDocx = async () => {
    try {
      const blob = await reportAPI.exportDocx(reportId, month.format('YYYY-MM'));
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url; link.download = `${title || '报告'}.docx`; link.click();
    } catch (e) { message.error('导出失败'); }
  };

  const openInsertChart = async () => {
    setChartOpen(true);
    chartForm.resetFields();
    chartForm.setFieldsValue({ period: '@month', scope: '全区' });
    try {
      const res = await reportAPI.searchCharts('', 1, 50);
      const items = res.items || [];
      setChartOptions(items);
      upsertChartCatalog(items);
    } catch (e) {
      message.error('图表列表加载失败');
    }
  };

  const insertAtCursor = (text) => {
    const editor = editorRef.current;
    if (editor) {
      editor.chain().focus().insertContent(text).run();
    } else {
      setContent((prev) => `${prev || ''}${text}`);
    }
  };

  const resolveChartCode = useCallback((labelOrCode) => {
    if (!labelOrCode) return '';
    const key = typeof labelOrCode === 'string' ? labelOrCode.trim() : labelOrCode;
    return chartCatalogRef.current[key] || chartCatalogRef.current[labelOrCode] || '';
  }, []);

  const fetchChartData = useCallback((payload) => reportAPI.renderChart(payload), []);

  const fetchIndicatorValue = useCallback(async ({ code, period, scope }) => {
    if (!code || !period) return null;
    try {
      console.log('fetchIndicatorValue调用:', { code, period, scope });
      const result = await reportAPI.getIndicatorValue(code, period, scope);
      console.log('fetchIndicatorValue结果:', result);
      return result;
    } catch (err) {
      console.error('fetchIndicatorValue错误:', err);
      return null;
    }
  }, []);

  const handleIndicatorPlaceholderClick = useCallback((meta) => {
    if (!meta) return;
    const resolvedCode = meta.code || resolveIndicatorCode(meta.label) || meta.label;
    openInsertIndicator({ ...meta, code: resolvedCode, indicator: resolvedCode });
  }, [openInsertIndicator, resolveIndicatorCode]);

  const confirmInsert = async () => {
    try {
      const vals = await insertForm.validateFields();
      const type = vals.type;
      const code = vals.indicator;
      const label = (indicatorOptions.find(i => i.code === code)?.name) || code;
      const entries = [];
      if (code) {
        entries.push(['code', code]);
      }
      const periodValue = vals.period || '@month';
      entries.push(['period', periodValue]);
      if (vals.scope) entries.push(['scope', vals.scope]);
      if (vals.unit) entries.push(['unit', vals.unit]);
      if (vals.precision || vals.precision === 0) entries.push(['precision', vals.precision]);

      const params = Object.fromEntries(entries);
      const paramOrder = entries.map(([key]) => key);

      const editor = editorRef.current;
      let inserted = false;
      console.log('准备插入指标:', {
        editor: !!editor,
        commandExists: !!editor?.commands?.insertIndicatorPlaceholder,
        type,
        label,
        code,
        params,
        paramOrder
      });

      if (editor?.commands?.insertIndicatorPlaceholder) {
        inserted = editor
          .chain()
          .focus()
          .insertIndicatorPlaceholder({
            type,
            label,
            code,
            params,
            paramOrder,
          })
          .run();
        console.log('插入命令执行结果:', inserted);
      }
      if (!inserted) {
        console.log('回退到文本插入模式');
        const paramString = entries.map(([key, value]) => `${key}=${value}`).join('|');
        const placeholder = `[${type}:${label}|${paramString}]`;
        insertAtCursor(placeholder);
      }
      upsertIndicatorCatalog([{ code, name: label }]);
      if (!indicatorOptions.some((item) => item.code === code)) {
        setIndicatorOptions((prev) => [...prev, { code, name: label }]);
      }
      setInsertOpen(false);
    } catch (err) {
      if (err?.errorFields) {
        return;
      }
      console.error('插入指标失败', err);
      message.error('插入指标失败，请稍后重试');
    }
  };

  const confirmChartInsert = async () => {
    try {
      const vals = await chartForm.validateFields();
      const code = vals.chart;
      const option = chartOptions.find(i => i.code === code);
      const label = option?.name || code;
      const periodValue = vals.period || '@month';
      const scopeValue = vals.scope?.trim();
      const payload = {
        code,
        period: periodValue,
        scope: scopeValue || undefined,
        month: month ? month.format('YYYY-MM') : undefined,
      };

      const res = await fetchChartData(payload);
      const rawChartSpec = res?.chart || null;
      const used = res?.period_used || (periodValue === '@month' && month ? month.format('YYYY-MM') : periodValue);
      const chartSpec = rawChartSpec
        ? {
            ...rawChartSpec,
            period: rawChartSpec.period || used || periodValue,
          }
        : null;

      const entries = [];
      entries.push(['period', periodValue]);
      if (scopeValue) entries.push(['scope', scopeValue]);
      entries.push(['code', code]);
      const params = Object.fromEntries(entries);
      const paramOrder = entries.map(([key]) => key);

      const editor = editorRef.current;
      const captionText = (vals.caption || '').trim();
      if (editor) {
        const nodes = [
          {
            type: 'chartPlaceholder',
            attrs: {
              label,
              code,
              params,
              paramOrder,
              chart: chartSpec,
            },
          },
        ];
        if (captionText) {
          nodes.push({
            type: 'paragraph',
            content: [{ type: 'text', text: captionText }],
          });
        }
        nodes.push({ type: 'paragraph' });
        editor.chain().focus().insertContent(nodes).run();
      } else {
        const paramString = entries.map(([k, v]) => `${k}=${v}`).join('|');
        const placeholder = `[CHART:${label}|${paramString}]`;
        setContent((prev) => {
          let next = prev || '';
          if (next && !next.endsWith('\n')) {
            next += '\n';
          }
          next += `${placeholder}\n\n`;
          if (captionText) {
            next += `${captionText}\n\n`;
          }
          return next;
        });
      }
      setChartOpen(false);
      upsertChartCatalog([{ code, name: label }]);
      message.success(`${label} 已插入（数据周期：${used || '未知'}）`);
    } catch (err) {
      message.error('插入图表失败，请稍后重试');
    }
  };

  return (
    <div className="page-container report-edit-page">
      <Spin spinning={loading} tip="加载中..." size="large">
        <div className="report-edit-inner">
          <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 24 }}>
            <Title level={3} style={{ margin: 0 }}>编辑报告</Title>
            <Space>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/reports')}>返回列表</Button>
              <Button icon={<SaveOutlined />} onClick={save}>保存</Button>
              <Button type="primary" icon={<EyeOutlined />} onClick={doPreview}>刷新预览</Button>
              <Button icon={<CloudUploadOutlined />} onClick={publish} disabled={report?.status==='published'}>发布固化</Button>
              <Button icon={<FileWordOutlined />} onClick={exportDocx}>导出 Word</Button>
            </Space>
          </div>

          <Card className="report-meta-card">
            <Form layout="inline" colon={false} className="report-meta-form">
              <Form.Item label="标题">
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="请输入报告标题" style={{ width: 360 }} />
              </Form.Item>
              <Form.Item label="月份">
                <DatePicker picker="month" value={month} onChange={setMonth} style={{ minWidth: 160 }} />
              </Form.Item>
            </Form>
          </Card>

          <div className="report-editor-shell">
            <div className="report-editor-surface">
              <div className="report-editor-title">正文（支持占位符 DSL）</div>
              <div className="report-editor-document">
                <ReportMarkdownEditor
                  value={content}
                  onChange={setContent}
                  onReady={editor => { editorRef.current = editor; }}
                  onInsertIndicator={openInsertIndicator}
                  onInsertChart={openInsertChart}
                  currentMonth={month ? month.format('YYYY-MM') : null}
                  resolveChartCode={resolveChartCode}
                  fetchChartData={fetchChartData}
                  resolveIndicatorCode={resolveIndicatorCode}
                  fetchIndicatorValue={fetchIndicatorValue}
                  indicatorCatalogVersion={indicatorCatalogVersion}
                  onIndicatorPlaceholderClick={handleIndicatorPlaceholderClick}
                />
              </div>
            </div>
          </div>
        </div>
      </Spin>

      <Modal
        title="报告预览"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={null}
        width={960}
        className="report-preview-modal"
      >
        {previewHtml ? (
          <div className="report-preview-content markdown-body">
            <ReactMarkdown
              remarkPlugins={remarkPlugin ? [remarkGfm, remarkPlugin] : [remarkGfm]}
              components={markdownComponents}
            >
              {previewHtml}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="report-preview-placeholder">暂无可预览的内容</div>
        )}
        {previewValues.length > 0 && (
          <div className="preview-value-list">
            <div className="preview-value-title">本次占位符取值</div>
            {previewValues.map(item => (
              <div key={item.placeholder_id} className="preview-value-item">
                <div>
                  <span className="preview-value-code">{item.code}</span>
                  <span className="preview-value-period">{item.period}</span>
                </div>
                <div className="preview-value-number">{item.value ?? '—'}{item.unit ? ` ${item.unit}` : ''}</div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal title="插入指标占位符" open={insertOpen} onCancel={() => setInsertOpen(false)} onOk={confirmInsert} okText="插入">
        <Form form={insertForm} layout="vertical" initialValues={{ type:'KPI', period:'@month', scope:'全区', precision: 1 }}>
          <Form.Item label="类型" name="type">
            <Radio.Group>
              <Radio.Button value="KPI">KPI</Radio.Button>
              <Radio.Button value="KPI_MOM_PCT">环比%</Radio.Button>
              <Radio.Button value="KPI_MOM_DIR">环比方向</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item label="指标" name="indicator" rules={[{ required: true, message:'请选择指标' }]}>
            <Select
              showSearch
              placeholder="搜索/选择指标"
              options={indicatorOptions.map(i => ({ label: `${i.name}（${i.code}）`, value: i.code }))}
              filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
            />
          </Form.Item>
          <Form.Item label="period" name="period">
            <Input placeholder="@month 或 YYYY-MM" />
          </Form.Item>
          <Form.Item label="scope（可选）" name="scope">
            <Input placeholder="全区" />
          </Form.Item>
          <Form.Item label="unit（可选）" name="unit">
            <Input placeholder="件 / %" />
          </Form.Item>
          <Form.Item label="precision（可选）" name="precision">
            <Input type="number" placeholder="小数位，如 1" />
          </Form.Item>
          <Divider style={{ margin:'8px 0' }} />
          <div style={{ color:'#999', fontSize:12 }}>示例： [KPI:重点事件数量|period=@month|scope=全区|unit=件]</div>
        </Form>
      </Modal>

      <Modal title="插入图表" open={chartOpen} onCancel={() => setChartOpen(false)} onOk={confirmChartInsert} okText="插入">
        <Form form={chartForm} layout="vertical">
          <Form.Item label="图表" name="chart" rules={[{ required: true, message:'请选择图表' }]}>
            <Select
              showSearch
              placeholder="搜索/选择图表"
              options={chartOptions.map(item => ({
                label: item.desc ? `${item.name}（${item.code}）｜${item.desc}` : `${item.name}（${item.code}）`,
                value: item.code,
              }))}
              filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
            />
          </Form.Item>
          <Form.Item label="period" name="period">
            <Input placeholder="@month 或 YYYY-MM" />
          </Form.Item>
          <Form.Item label="scope（可选）" name="scope">
            <Input placeholder="全区" />
          </Form.Item>
          <Form.Item label="备注（可选）" name="caption">
            <Input.TextArea rows={2} placeholder="可为图表添加说明，将显示在图表占位符下方" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ReportEdit;
