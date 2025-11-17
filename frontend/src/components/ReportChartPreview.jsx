import React from 'react';
import { Column } from '@ant-design/plots';

const ReportChartPreview = ({ chart }) => {
  if (!chart) return null;

  const {
    title,
    period,
    data = [],
    type = 'column',
    xField = 'name',
    yField = 'value',
    unit,
    note,
  } = chart;

  const valueSuffix = unit ? (unit === '%' ? unit : ` ${unit}`) : '';
  const parseValue = (datum) => {
    if (!datum || typeof datum !== 'object') return undefined;
    if (datum[yField] !== undefined) return datum[yField];
    if (datum.value !== undefined) return datum.value;
    if (datum.y !== undefined) return datum.y;
    if (datum.data && typeof datum.data === 'object') {
      if (datum.data[yField] !== undefined) return datum.data[yField];
      if (datum.data.value !== undefined) return datum.data.value;
    }
    return undefined;
  };

  const formatValueText = (raw) => {
    if (raw === null || raw === undefined || raw === '') return '—';
    const numeric = Number(raw);
    if (!Number.isNaN(numeric)) {
      return valueSuffix ? `${numeric}${valueSuffix}` : numeric;
    }
    const str = String(raw);
    return valueSuffix && !str.includes(valueSuffix) ? `${str}${valueSuffix}` : str;
  };

  const normalizedData = Array.isArray(data)
    ? data.map((item, index) => {
        const raw = item?.[yField] ?? item?.value;
        const numeric = Number(raw);
        const result = {
          ...item,
          [yField]: Number.isNaN(numeric) ? raw : numeric,
        };

        // 调试前几个数据项
        if (index < 3) {
          console.log(`图表数据[${index}]:`, {
            原始项: item,
            raw值: raw,
            numeric值: numeric,
            最终项: result
          });
        }

        return result;
      })
    : [];

  console.log('图表配置:', { xField, yField, data, normalizedData });

  const escape = (s) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  const config = {
    data: normalizedData,
    xField,
    yField,
    padding: [20, 20, 40, 50],
    autoFit: true,
    appendPadding: 16,
    meta: {
      [yField]: {
        formatter: (v) => formatValueText(v),
      },
      [xField]: {
        formatter: (v) => v,
      },
    },
    label: {
      position: 'top',
      style: {
        fill: '#1f1f1f',
      },
      formatter: (datum) => {
        const val = formatValueText(parseValue(datum));
        return val;
      },
    },
    tooltip: {
      showMarkers: false,
      shared: false,
      customContent: (title, items) => {
        console.log('Tooltip触发:', { title, items });

        if (!items || !items.length) return '';

        const item = items[0];
        const datum = item?.data;

        console.log('Item数据:', { item, datum });

        // 获取数值和名称
        const value = datum?.[yField] ?? item?.value;
        const nameText = datum?.[xField] ?? item?.name ?? title;

        console.log('最终数据:', { value, nameText, yField, xField });

        const valueText = formatValueText(value);

        return `<div style="padding:6px 8px;"><div style="display:flex;gap:8px;align-items:center;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#1677ff"></span><span>${escape(nameText)}</span><span style="margin-left:12px;color:#333;font-weight:500;">${escape(valueText)}</span></div></div>`;
      },
    },
    columnStyle: {
      radius: [4, 4, 0, 0],
    },
    interactions: [{ type: 'active-region' }],
  };

  const ChartComponent = type === 'column' ? Column : Column;

  return (
    <div className="report-chart-preview">
      <div className="report-chart-preview__header">
        <span className="report-chart-preview__title">图表：{title}</span>
        {period && <span className="report-chart-preview__period">（{period}）</span>}
      </div>
      <div className="report-chart-preview__body">
        <ChartComponent {...config} />
      </div>
      {note && <div className="report-chart-preview__note">{note}</div>}
    </div>
  );
};

export default ReportChartPreview;
