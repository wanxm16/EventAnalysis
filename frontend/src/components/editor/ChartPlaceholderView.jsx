import React, { useEffect, useMemo, useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { Empty, Spin } from 'antd';
import ReportChartPreview from '../ReportChartPreview';

const parseParams = (params) => {
  if (!params || typeof params !== 'object') return {};
  return params;
};

const ChartPlaceholderView = ({ node, extension, updateAttributes }) => {
  const label = node.attrs.label || '';
  const params = useMemo(() => parseParams(node.attrs.params), [node.attrs.params]);
  const chartSpec = node.attrs.chart || null;
  const codeAttr = node.attrs.code || params.code || '';

  const [loading, setLoading] = useState(!chartSpec);
  const [error, setError] = useState(null);

  const fetchChartData = extension?.options?.fetchChartData;
  const resolveChartCode = extension?.options?.resolveChartCode;
  const getCurrentMonth = extension?.options?.getCurrentMonth;

  useEffect(() => {
    let cancelled = false;

    if (chartSpec) {
      setLoading(false);
      setError(null);
      if (!params.code && codeAttr) {
        updateAttributes({ params: { ...params, code: codeAttr } });
      }
      return () => {
        cancelled = true;
      };
    }

    if (!fetchChartData) {
      setLoading(false);
      setError('缺少图表数据加载函数');
      return () => {
        cancelled = true;
      };
    }

    let effectiveCode = params.code || codeAttr;
    if (!effectiveCode && resolveChartCode) {
      effectiveCode = resolveChartCode(label);
    }

    if (!effectiveCode) {
      setLoading(false);
      setError('未找到对应的图表编码');
      return () => {
        cancelled = true;
      };
    }

    const payload = {
      code: effectiveCode,
      period: params.period || '@month',
      scope: params.scope || undefined,
    };

    const currentMonth = getCurrentMonth?.();
    if (currentMonth && payload.period === '@month') {
      payload.month = currentMonth;
    } else if (currentMonth && !payload.month) {
      payload.month = currentMonth;
    }

    setLoading(true);
    setError(null);

    fetchChartData(payload)
      .then((result) => {
        if (cancelled) return;
        const fetchedChart = result?.chart || null;
        const periodUsed = result?.period_used;
        const nextChart = fetchedChart
          ? {
              ...fetchedChart,
              period: fetchedChart.period || periodUsed || payload.period,
            }
          : null;

        const updates = {};
        if (!params.code || params.code !== effectiveCode || node.attrs.code !== effectiveCode) {
          updates.code = effectiveCode;
          updates.params = { ...params, code: effectiveCode };
          if (!Array.isArray(node.attrs.paramOrder) || !node.attrs.paramOrder.includes('code')) {
            updates.paramOrder = [...(node.attrs.paramOrder || []), 'code'];
          }
        }
        if (nextChart) {
          updates.chart = nextChart;
        }

        if (Object.keys(updates).length > 0) {
          updateAttributes(updates);
        }

        if (!nextChart) {
          setError('暂无图表数据');
        }

        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || '图表加载失败');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [chartSpec, codeAttr, label, params, fetchChartData, resolveChartCode, getCurrentMonth, updateAttributes]);

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className="report-chart-node__loading">
          <Spin size="small" />
          <span className="report-chart-node__loading-text">图表加载中...</span>
        </div>
      );
    }

    if (chartSpec) {
      return <ReportChartPreview chart={chartSpec} />;
    }

    return (
      <div className="report-chart-node__empty">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={error || '暂无数据'}
        />
      </div>
    );
  }, [chartSpec, loading, error]);

  return (
    <NodeViewWrapper className="report-chart-node">
      {content}
      {!loading && error && chartSpec && (
        <div className="report-chart-node__error">{error}</div>
      )}
    </NodeViewWrapper>
  );
};

export default ChartPlaceholderView;
