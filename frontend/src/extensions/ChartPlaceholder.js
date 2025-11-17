import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import ChartPlaceholderView from '../components/editor/ChartPlaceholderView';

const RULE_NAME = 'chart_placeholder';

const encodeParamData = (params = {}, order = []) => {
  try {
    return encodeURIComponent(JSON.stringify({ params, order }));
  } catch (error) {
    return encodeURIComponent(JSON.stringify({ params: {}, order: [] }));
  }
};

const parseParamData = (value) => {
  if (!value) return { params: {}, order: [] };
  try {
    const decoded = JSON.parse(decodeURIComponent(value));
    const params = decoded?.params && typeof decoded.params === 'object' ? decoded.params : {};
    const order = Array.isArray(decoded?.order) ? decoded.order : [];
    return { params, order };
  } catch (error) {
    return { params: {}, order: [] };
  }
};

const parseParamsString = (paramParts) => {
  const params = {};
  const order = [];
  paramParts
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const [key, ...rest] = part.split('=');
      if (!key) return;
      const value = rest.length > 0 ? rest.join('=') : '';
      params[key] = value;
      order.push(key);
    });
  return { params, order };
};

const escapeHtml = (input = '') =>
  input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const ChartPlaceholder = Node.create({
  name: 'chartPlaceholder',

  group: 'block',

  atom: true,

  selectable: true,

  draggable: false,

  addAttributes() {
    return {
      label: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-label') || '',
        renderHTML: (attributes) => ({ 'data-label': attributes.label || '' }),
      },
      code: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-code') || '',
        renderHTML: (attributes) => ({ 'data-code': attributes.code || '' }),
      },
      params: {
        default: {},
        parseHTML: (element) => parseParamData(element.getAttribute('data-param-json')).params,
        renderHTML: (attributes) => ({
          'data-param-json': encodeParamData(attributes.params, attributes.paramOrder),
        }),
      },
      paramOrder: {
        default: [],
        parseHTML: (element) => parseParamData(element.getAttribute('data-param-json')).order,
        renderHTML: () => ({}),
      },
      chart: {
        default: null,
        parseHTML: () => null,
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-node-type="chart-placeholder"]',
      },
      {
        tag: 'chart-placeholder',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const attrs = { ...HTMLAttributes };
    delete attrs.chart;
    return ['div', mergeAttributes({ 'data-node-type': 'chart-placeholder', class: 'report-chart-node' }, attrs)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ChartPlaceholderView);
  },

  addCommands() {
    return {
      insertChartPlaceholder:
        (attrs) => ({ chain }) =>
          chain()
            .insertContent({
              type: this.name,
              attrs,
            })
            .run(),
    };
  },

  addStorage() {
    return {
      markdown: {
        serialize(state, node) {
          const label = node.attrs.label || '';
          const params = node.attrs.params || {};
          const order = (node.attrs.paramOrder && node.attrs.paramOrder.length
            ? node.attrs.paramOrder
            : Object.keys(params)) || [];

          const parts = [];
          order.forEach((key) => {
            const value = params[key];
            if (value === undefined || value === null || value === '') {
              return;
            }
            parts.push(`${key}=${value}`);
          });

          const extraKeys = Object.keys(params).filter((key) => !order.includes(key));
          extraKeys.forEach((key) => {
            const value = params[key];
            if (value === undefined || value === null || value === '') {
              return;
            }
            parts.push(`${key}=${value}`);
          });

          const paramString = parts.length ? `|${parts.join('|')}` : '';
          state.ensureNewLine();
          state.write(`[CHART:${label}${paramString}]`);
          state.ensureNewLine();
          state.closeBlock(node);
        },
        parse: {
          setup(markdownit) {
            if (markdownit.__chartPlaceholderSetup) {
              return;
            }
            markdownit.__chartPlaceholderSetup = true;

            markdownit.block.ruler.before('paragraph', RULE_NAME, (state, startLine, endLine, silent) => {
              const pos = state.bMarks[startLine] + state.tShift[startLine];
              const max = state.eMarks[startLine];

              if (pos >= max) return false;
              if (state.src.charCodeAt(pos) !== 91 /* [ */) {
                return false;
              }

              const lineText = state.src.slice(pos, max);
              const match = lineText.match(/^\[([A-Z_]+):([^\]]+)\]$/);
              if (!match) {
                return false;
              }
              const [, placeholderType, body] = match;
              if (placeholderType !== 'CHART') {
                return false;
              }
              if (!silent) {
                const [labelPart, ...paramParts] = body.split('|');
                const label = labelPart.trim();
                const { params, order } = parseParamsString(paramParts);
                const token = state.push(RULE_NAME, 'chart_placeholder', 0);
                token.meta = {
                  label,
                  params,
                  order,
                };
                token.map = [startLine, startLine + 1];
              }
              state.line = startLine + 1;
              return true;
            });

            markdownit.renderer.rules[RULE_NAME] = (tokens, idx) => {
              const { label, params, order } = tokens[idx].meta || {};
              const code = params?.code || '';
              const payload = encodeParamData(params, order || []);
              return `<chart-placeholder data-node-type="chart-placeholder" data-label="${escapeHtml(
                label || '',
              )}" data-code="${escapeHtml(code || '')}" data-param-json="${payload}"></chart-placeholder>`;
            };
          },
        },
      },
    };
  },
});

export default ChartPlaceholder;
