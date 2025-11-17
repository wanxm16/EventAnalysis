import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import IndicatorPlaceholderView from '../components/editor/IndicatorPlaceholderView';

const RULE_NAME = 'indicator_placeholder';
const ALLOWED_TYPES = new Set(['KPI', 'KPI_MOM_PCT', 'KPI_MOM_DIR', 'click', 'CHART']);

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

const parseParamsString = (paramParts = []) => {
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

const IndicatorPlaceholder = Node.create({
  name: 'indicatorPlaceholder',

  inline: true,

  group: 'inline',

  atom: true,

  selectable: false,

  draggable: false,

  addAttributes() {
    return {
      type: {
        default: 'KPI',
        parseHTML: (element) => element.getAttribute('data-type') || 'KPI',
        renderHTML: (attributes) => ({ 'data-type': attributes.type || 'KPI' }),
      },
      label: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-label') || '',
        renderHTML: (attributes) => ({ 'data-label': attributes.label || '' }),
      },
      code: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-code') || '',
        renderHTML: (attributes) => (attributes.code ? { 'data-code': attributes.code } : {}),
      },
      params: {
        default: {},
        parseHTML: (element) => parseParamData(element.getAttribute('data-param-json')).params,
        renderHTML: (attributes) => ({ 'data-param-json': encodeParamData(attributes.params, attributes.paramOrder) }),
      },
      paramOrder: {
        default: [],
        parseHTML: (element) => parseParamData(element.getAttribute('data-param-json')).order,
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-node-type="indicator-placeholder"]',
      },
      {
        tag: 'indicator-placeholder',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes({ 'data-node-type': 'indicator-placeholder', class: 'report-indicator-placeholder' }, HTMLAttributes),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(IndicatorPlaceholderView);
  },

  addCommands() {
    return {
      insertIndicatorPlaceholder:
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
    const extension = this;
    return {
      markdown: {
        serialize(state, node) {
          const type = node.attrs.type || 'KPI';
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
          state.write(`[${type}:${label}${paramString}]`);
        },
        parse: {
          setup(markdownit) {
            if (markdownit.__indicatorPlaceholderSetup) {
              return;
            }
            markdownit.__indicatorPlaceholderSetup = true;

            markdownit.inline.ruler.before('emphasis', RULE_NAME, (state, silent) => {
              const start = state.pos;
              if (state.src.charCodeAt(start) !== 91 /* [ */) {
                return false;
              }
              const match = state.src.slice(start).match(/^\[([A-Za-z_]+):([^\]|]+)(\|[^\]]+)?\]/);
              console.log('Markdown解析尝试:', {
                text: state.src.slice(start, start + 50),
                match: match,
                start,
                charCode: state.src.charCodeAt(start)
              });
              if (!match) {
                return false;
              }
              const [, placeholderType, labelPart, paramPart] = match;
              console.log('解析结果:', { placeholderType, labelPart, paramPart });
              if (!ALLOWED_TYPES.has(placeholderType)) {
                console.log('类型不在允许列表中:', placeholderType, 'ALLOWED_TYPES:', Array.from(ALLOWED_TYPES));
                return false;
              }
              if (!silent) {
                const paramsRaw = paramPart ? paramPart.slice(1).split('|') : [];
                const { params, order } = parseParamsString(paramsRaw);
                const token = state.push(RULE_NAME, '', 0);
                token.meta = {
                  type: placeholderType,
                  label: labelPart.trim(),
                  params,
                  order,
                };
              }
              state.pos += match[0].length;
              return true;
            });

            markdownit.renderer.rules[RULE_NAME] = (tokens, idx) => {
              const { type, label, params, order } = tokens[idx].meta || {};
              const resolve = extension?.options?.resolveIndicatorCode;
              const code = params?.code || (resolve ? resolve(label) : '');
              const payload = encodeParamData(params, order || []);
              const attrs = [
                'data-node-type="indicator-placeholder"',
                `data-type="${escapeHtml(type || 'KPI')}"`,
                `data-label="${escapeHtml(label || '')}"`,
                `data-param-json="${payload}"`,
              ];
              if (code) {
                attrs.push(`data-code="${escapeHtml(code)}"`);
              }
              return `<indicator-placeholder ${attrs.join(' ')}></indicator-placeholder>`;
            };
          },
        },
      },
    };
  },
});

export default IndicatorPlaceholder;
