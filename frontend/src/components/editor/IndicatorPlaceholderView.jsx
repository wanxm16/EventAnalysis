import React, { useEffect, useMemo, useState } from 'react';
import { Tooltip } from 'antd';
import { NodeViewWrapper } from '@tiptap/react';

const buildDefinition = (type, label, params = {}, order = []) => {
  const entries = [];
  const ordered = order && order.length ? order : Object.keys(params || {});
  ordered.forEach((key) => {
    const value = params[key];
    if (value !== undefined && value !== null && value !== '') {
      entries.push(`${key}=${value}`);
    }
  });
  Object.keys(params || {}).forEach((key) => {
    if (ordered.includes(key)) return;
    const value = params[key];
    if (value !== undefined && value !== null && value !== '') {
      entries.push(`${key}=${value}`);
    }
  });
  const paramString = entries.length ? `|${entries.join('|')}` : '';
  return `[${type}:${label}${paramString}]`;
};

const getPrevPeriod = (period) => {
  if (!period || typeof period !== 'string') return null;
  const parts = period.split('-');
  if (parts.length < 2) return null;
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
  const date = new Date(year, month - 1, 1);
  date.setMonth(date.getMonth() - 1);
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${y}-${m}`;
};

const formatNumber = (value, precision) => {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  if (typeof value !== 'number') return value;
  if (Number.isInteger(value)) return value;
  if (precision !== undefined && precision !== null && !Number.isNaN(Number(precision))) {
    const p = Number(precision);
    try {
      return Number(value.toFixed(p));
    } catch (err) {
      return value;
    }
  }
  return value;
};

const IndicatorPlaceholderView = ({ node, extension, editor, updateAttributes }) => {
  const { type = 'KPI', label = '', params = {}, paramOrder = [] } = node.attrs || {};
  const [displayText, setDisplayText] = useState('—');
  const [loading, setLoading] = useState(false);

  const definition = useMemo(
    () => buildDefinition(type, label, params, paramOrder),
    [type, label, params, paramOrder]
  );

  const paramsKey = useMemo(() => JSON.stringify(params || {}), [params]);
  const paramOrderKey = useMemo(() => JSON.stringify(paramOrder || []), [paramOrder]);
  const currentMonth = extension.options?.getCurrentMonth ? extension.options.getCurrentMonth() : null;
  const monthKey = currentMonth || '';
  const catalogVersion = extension.options?.getCatalogVersion ? extension.options.getCatalogVersion() : 0;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { getCurrentMonth, resolveIndicatorCode, fetchIndicatorValue } = extension.options || {};
      console.log('load函数执行:', {
        fetchIndicatorValueExists: !!fetchIndicatorValue,
        label,
        extensionOptions: extension.options
      });

      if (!fetchIndicatorValue || !label) {
        console.log('提前返回，原因：', {
          noFetchFunction: !fetchIndicatorValue,
          noLabel: !label
        });
        setDisplayText('—');
        return;
      }

      const currentMonth = getCurrentMonth ? getCurrentMonth() : null;
      const attrCode = (node.attrs.code || '').trim();
      const paramsCodeRaw = (params && params.code ? String(params.code) : '').trim();
      const hasCodeInParams = params && Object.prototype.hasOwnProperty.call(params, 'code');
      const resolvedFromCatalog = resolveIndicatorCode ? resolveIndicatorCode(label) : '';

      let targetCode = resolvedFromCatalog || attrCode || paramsCodeRaw || '';
      if (!targetCode && label) {
        targetCode = label;
      }

      console.log('Code解析过程:', {
        resolvedFromCatalog,
        attrCode,
        paramsCodeRaw,
        finalTargetCode: targetCode,
        label
      });

      if (resolvedFromCatalog && updateAttributes) {
        const attrNeedsUpdate = attrCode !== resolvedFromCatalog;
        const paramNeedsUpdate = !hasCodeInParams || paramsCodeRaw !== resolvedFromCatalog;
        if (attrNeedsUpdate || paramNeedsUpdate) {
          console.log('准备更新属性:', {
            resolvedFromCatalog,
            attrNeedsUpdate,
            paramNeedsUpdate
          });

          const nextAttrs = {};
          if (attrNeedsUpdate) {
            nextAttrs.code = resolvedFromCatalog;
          }
          if (paramNeedsUpdate) {
            const nextParams = { ...params, code: resolvedFromCatalog };
            const orderArray = Array.isArray(paramOrder) ? [...paramOrder] : [];
            if (!orderArray.includes('code')) {
              orderArray.unshift('code');
            }
            nextAttrs.params = nextParams;
            nextAttrs.paramOrder = orderArray;
          }
          if (Object.keys(nextAttrs).length > 0) {
            console.log('更新属性:', nextAttrs);
            updateAttributes(nextAttrs);
            targetCode = resolvedFromCatalog;
            console.log('更新后的targetCode:', targetCode);
          }
        }
      }

      const code = targetCode;
      console.log('最终code检查:', {
        code,
        targetCode,
        codeExists: !!code
      });

      if (!code) {
        console.log('代码为空，提前返回');
        setDisplayText('—');
        return;
      }

      const rawPeriod = params.period || '@month';
      const actualPeriod = rawPeriod === '@month' ? currentMonth : rawPeriod;
      const scope = params.scope || undefined;
      const precision = params.precision !== undefined && params.precision !== null && params.precision !== ''
        ? Number(params.precision)
        : undefined;
      if (!actualPeriod) {
        setDisplayText('—');
        return;
      }

      setLoading(true);
      try {
        let rendered = '—';
        console.log('准备调用API:', {
          type,
          code,
          actualPeriod,
          scope,
          precision
        });

        if (type === 'KPI' || type === 'click') {
          const res = await fetchIndicatorValue({ code, period: actualPeriod, scope });
          console.log('API调用结果:', res);

          if (res && res.value !== null && res.value !== undefined) {
            let value = res.value;
            value = formatNumber(value, precision);
            console.log('格式化后的值:', value);
            if (value !== null && value !== undefined) {
              rendered = String(value);
            }
          }
        } else if (type === 'KPI_MOM_PCT' || type === 'KPI_MOM_DIR') {
          const current = await fetchIndicatorValue({ code, period: actualPeriod, scope });
          const prevPeriod = getPrevPeriod(actualPeriod);
          const previous = prevPeriod ? await fetchIndicatorValue({ code, period: prevPeriod, scope }) : null;
          const currVal = current?.value;
          const prevVal = previous?.value;

          if (currVal === null || currVal === undefined || !previous || prevVal === null || prevVal === undefined || prevVal === 0) {
            rendered = '—';
          } else {
            const change = ((currVal - prevVal) / prevVal) * 100;
            if (type === 'KPI_MOM_PCT') {
              const formatted = formatNumber(change, precision === undefined ? 1 : precision);
              rendered = formatted === null || formatted === undefined ? '—' : `${formatted}%`;
            } else {
              if (change > 0) rendered = '上升';
              else if (change < 0) rendered = '下降';
              else rendered = '持平';
            }
          }
        } else {
          rendered = '—';
        }

        if (!cancelled) {
          console.log('设置最终显示文本:', rendered);
          setDisplayText(rendered);
        }
      } catch (err) {
        console.error('API调用出错:', err);
        if (!cancelled) {
          setDisplayText('—');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [extension.options, label, monthKey, node.attrs.code, paramsKey, paramOrderKey, type, updateAttributes, catalogVersion]);

  const handleClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const { onPlaceholderClick, resolveIndicatorCode } = extension.options || {};
    if (!onPlaceholderClick) return;
    const resolved = resolveIndicatorCode ? resolveIndicatorCode(label) : '';
    const fallbackCode = resolved || label;
    const payload = {
      type,
      label,
      params,
      paramOrder,
      definition,
      code: node.attrs.code || fallbackCode,
    };
    onPlaceholderClick(payload);
  };

  const classNames = ['report-indicator-placeholder'];
  if (!editor?.isEditable) {
    classNames.push('report-indicator-placeholder--readonly');
  }

  const content = loading ? '...' : displayText;

  // 调试信息
  console.log('IndicatorPlaceholder Debug:', {
    label,
    type,
    params,
    displayText,
    loading,
    definition,
    nodeAttrs: node.attrs,
    extensionOptions: extension.options,
    fetchIndicatorValueExists: !!extension.options?.fetchIndicatorValue,
    currentMonth
  });

  return (
    <NodeViewWrapper as="span" className="report-indicator-node">
      <Tooltip title={definition} color="#1677ff">
        <span className={classNames.join(' ')} onClick={handleClick}>
          {content}
        </span>
      </Tooltip>
    </NodeViewWrapper>
  );
};

export default IndicatorPlaceholderView;
