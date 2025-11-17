const toText = (node) => {
  if (!node) return '';
  if (typeof node.value === 'string') return node.value;
  if (Array.isArray(node.children)) {
    return node.children.map(toText).join('');
  }
  return '';
};

const isEmptyParagraph = (node) => node && node.type === 'paragraph' && !toText(node).trim();

const isFallbackParagraph = (node) => {
  if (!node || node.type !== 'paragraph') return false;
  const text = toText(node).trim();
  return text.startsWith('提示：') || text.startsWith('_提示');
};

const buildIndicatorNode = (valueText, indicator) => ({
  type: 'indicatorPlaceholder',
  data: {
    hName: 'indicator-placeholder',
    hProperties: {
      'data-definition': indicator.metadata?.definition || '',
      'data-placeholder-id': indicator.placeholder_id || '',
      'data-type': indicator.metadata?.type || '',
      'data-unit': indicator.unit || '',
      'data-value': valueText,
    },
  },
  children: [{ type: 'text', value: valueText }],
});

const processChartBlocks = (tree, chartValues) => {
  if (!Array.isArray(tree.children) || !chartValues.length) return;
  const nodes = tree.children;
  let chartIndex = 0;
  for (let i = 0; i < nodes.length && chartIndex < chartValues.length; i += 1) {
    const node = nodes[i];
    if (node?.type !== 'blockquote') {
      continue;
    }
    const text = toText(node).trim();
    if (!text.startsWith('图表：')) {
      continue;
    }
    const placeholder = {
      type: 'chartPlaceholder',
      data: {
        hName: 'chart-placeholder',
        hProperties: { 'data-idx': chartIndex },
      },
      children: [],
    };
    nodes.splice(i, 1, placeholder);
    while (nodes[i + 1] && isEmptyParagraph(nodes[i + 1])) {
      nodes.splice(i + 1, 1);
    }
    if (isFallbackParagraph(nodes[i + 1])) {
      nodes.splice(i + 1, 1);
    }
    if (nodes[i + 1]?.type === 'table') {
      nodes.splice(i + 1, 1);
    }
    while (nodes[i + 1] && isEmptyParagraph(nodes[i + 1])) {
      nodes.splice(i + 1, 1);
    }
    chartIndex += 1;
  }
};

const processIndicatorValues = (node, indicatorValues, state) => {
  if (!node || state.index >= indicatorValues.length) return;
  if (!Array.isArray(node.children)) return;

  for (let i = 0; i < node.children.length && state.index < indicatorValues.length; i += 1) {
    const child = node.children[i];
    if (child.type === 'text') {
      const indicator = indicatorValues[state.index];
      const rendered = indicator.metadata?.rendered;
      const fallbackValue = indicator.value;
      const valueText = rendered != null ? String(rendered) : fallbackValue != null ? String(fallbackValue) : '';
      if (!valueText) {
        state.index += 1;
        continue;
      }
      const text = child.value;
      const pos = text.indexOf(valueText);
      if (pos === -1) {
        // 如果在当前文本节点中找不到指标值，继续查找下一个指标
        state.index += 1;
        // 重新开始当前循环，用下一个指标再试一次当前文本节点
        i -= 1;
        continue;
      }
      const before = text.slice(0, pos);
      const after = text.slice(pos + valueText.length);
      const replacement = [];
      if (before) {
        replacement.push({ type: 'text', value: before });
      }
      replacement.push(buildIndicatorNode(valueText, indicator));
      if (after) {
        replacement.push({ type: 'text', value: after });
      }
      node.children.splice(i, 1, ...replacement);
      i += replacement.length - 1;
      state.index += 1;
    } else {
      processIndicatorValues(child, indicatorValues, state);
    }
  }
};

export default function remarkReportPlaceholders({ chartValues = [], indicatorValues = [] } = {}) {
  const hasCharts = Array.isArray(chartValues) && chartValues.length > 0;
  const hasIndicators = Array.isArray(indicatorValues) && indicatorValues.length > 0;

  if (!hasCharts && !hasIndicators) {
    return () => () => {};
  }

  return () => (tree) => {
    if (!tree) return;
    if (hasCharts) {
      processChartBlocks(tree, chartValues);
    }
    if (hasIndicators) {
      const state = { index: 0 };
      processIndicatorValues(tree, indicatorValues, state);
    }
  };
}
