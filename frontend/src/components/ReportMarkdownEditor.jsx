import React, { useEffect, useRef } from 'react';
import { Button, Select, Space, Tooltip } from 'antd';
import {
  AlignCenterOutlined,
  AlignLeftOutlined,
  AlignRightOutlined,
  BlockOutlined,
  BoldOutlined,
  CodeOutlined,
  ItalicOutlined,
  PlusOutlined,
  LinkOutlined,
  OrderedListOutlined,
  StrikethroughOutlined,
  UnderlineOutlined,
  UnorderedListOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';
import ChartPlaceholder from '../extensions/ChartPlaceholder';
import IndicatorPlaceholder from '../extensions/IndicatorPlaceholder';

const headingOptions = [
  { label: '正文', value: 0 },
  { label: '标题 1', value: 1 },
  { label: '标题 2', value: 2 },
  { label: '标题 3', value: 3 },
  { label: '标题 4', value: 4 },
];

const ToolbarDivider = () => <span className="report-rich-editor__divider" />;

const ToolbarButton = ({ icon, active, onClick, title, disabled = false }) => (
  <Tooltip title={title}>
    <Button
      size="small"
      type={active ? 'primary' : 'text'}
      icon={icon}
      onClick={onClick}
      disabled={disabled}
    />
  </Tooltip>
);

const ReportMarkdownEditor = ({
  value,
  onChange,
  onReady,
  onInsertIndicator,
  onInsertChart,
  currentMonth,
  resolveChartCode,
  fetchChartData,
  resolveIndicatorCode,
  fetchIndicatorValue,
  indicatorCatalogVersion,
  onIndicatorPlaceholderClick,
}) => {
  const monthRef = useRef(currentMonth || null);
  const resolveChartCodeRef = useRef(resolveChartCode);
  const fetchChartDataRef = useRef(fetchChartData);
  const resolveIndicatorCodeRef = useRef(resolveIndicatorCode);
  const fetchIndicatorValueRef = useRef(fetchIndicatorValue);
  const indicatorClickRef = useRef(onIndicatorPlaceholderClick);
  const catalogVersionRef = useRef(indicatorCatalogVersion ?? 0);

  useEffect(() => {
    monthRef.current = currentMonth || null;
  }, [currentMonth]);

  useEffect(() => {
    resolveChartCodeRef.current = resolveChartCode;
  }, [resolveChartCode]);

  useEffect(() => {
    fetchChartDataRef.current = fetchChartData;
  }, [fetchChartData]);

  useEffect(() => {
    resolveIndicatorCodeRef.current = resolveIndicatorCode;
  }, [resolveIndicatorCode]);

  useEffect(() => {
    fetchIndicatorValueRef.current = fetchIndicatorValue;
  }, [fetchIndicatorValue]);

  useEffect(() => {
    indicatorClickRef.current = onIndicatorPlaceholderClick;
  }, [onIndicatorPlaceholderClick]);

  useEffect(() => {
    catalogVersionRef.current = indicatorCatalogVersion ?? 0;
  }, [indicatorCatalogVersion]);

  const editor = useEditor({
    extensions: [
      IndicatorPlaceholder.configure({
        getCurrentMonth: () => monthRef.current,
        resolveIndicatorCode: (label) => (resolveIndicatorCodeRef.current ? resolveIndicatorCodeRef.current(label) : ''),
        fetchIndicatorValue: (payload) =>
          (fetchIndicatorValueRef.current ? fetchIndicatorValueRef.current(payload) : Promise.resolve(null)),
        getCatalogVersion: () => catalogVersionRef.current,
        onPlaceholderClick: (meta) => {
          if (indicatorClickRef.current) {
            indicatorClickRef.current(meta);
          }
        },
      }),
      ChartPlaceholder.configure({
        getCurrentMonth: () => monthRef.current,
        resolveChartCode: (label) => (resolveChartCodeRef.current ? resolveChartCodeRef.current(label) : ''),
        fetchChartData: (payload) =>
          fetchChartDataRef.current ? fetchChartDataRef.current(payload) : Promise.resolve(null),
      }),
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
        bulletList: {
          keepAttributes: true,
          keepMarks: true,
        },
        orderedList: {
          keepAttributes: true,
          keepMarks: true,
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder: '请输入正文内容，可通过工具栏进行排版，也可粘贴 Word 内容',
      }),
      Markdown.configure({
        html: true,
      }),
    ],
    content: value || '',
    onUpdate: ({ editor: instance }) => {
      if (!onChange) return;
      const markdown = instance.storage?.markdown?.getMarkdown?.();
      onChange(markdown ?? instance.getText());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.storage?.markdown?.getMarkdown?.() ?? '';
    const nextVal = value || '';
    if (current !== nextVal) {
      setTimeout(() => {
        editor.commands.setContent(nextVal, false, {
          parseOptions: { preserveWhitespace: 'full' },
        });
      }, 0);
    }
  }, [value, editor]);

  useEffect(() => {
    if (!onReady) return;
    onReady(editor || null);
    return () => onReady(null);
  }, [editor, onReady]);

  const setHeading = (level) => {
    if (!editor) return;
    if (level === 0) {
      editor.chain().focus().setParagraph().run();
      return;
    }
    editor.chain().focus().toggleHeading({ level }).run();
  };

  const activeHeading = () => {
    if (!editor) return 0;
    const level = headingOptions.find((opt) => opt.value && editor.isActive('heading', { level: opt.value }));
    return level ? level.value : 0;
  };

  const canToggleBold = editor ? editor.can().chain().focus().toggleBold().run() : false;
  const canToggleItalic = editor ? editor.can().chain().focus().toggleItalic().run() : false;

  return (
    <div className="report-rich-editor">
      <div className="report-rich-editor__toolbar">
        <div className="report-rich-editor__toolbar-left">
          <Space size={4} wrap>
            <Select
              size="small"
              value={activeHeading()}
              style={{ width: 100 }}
              onChange={setHeading}
              options={headingOptions}
            />
          <ToolbarButton
            icon={<BoldOutlined />}
            title="加粗"
            active={editor?.isActive('bold')}
            onClick={() => editor?.chain().focus().toggleBold().run()}
            disabled={!canToggleBold}
          />
          <ToolbarButton
            icon={<ItalicOutlined />}
            title="斜体"
            active={editor?.isActive('italic')}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            disabled={!canToggleItalic}
          />
          <ToolbarButton
            icon={<UnderlineOutlined />}
            title="下划线"
            active={editor?.isActive('underline')}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
          />
          <ToolbarButton
            icon={<StrikethroughOutlined />}
            title="删除线"
            active={editor?.isActive('strike')}
            onClick={() => editor?.chain().focus().toggleStrike().run()}
          />
          <ToolbarDivider />
          <ToolbarButton
            icon={<OrderedListOutlined />}
            title="有序列表"
            active={editor?.isActive('orderedList')}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          />
          <ToolbarButton
            icon={<UnorderedListOutlined />}
            title="无序列表"
            active={editor?.isActive('bulletList')}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          />
          <ToolbarButton
            icon={<BlockOutlined />}
            title="引用"
            active={editor?.isActive('blockquote')}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          />
          <ToolbarButton
            icon={<CodeOutlined />}
            title="代码块"
            active={editor?.isActive('codeBlock')}
            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
          />
          <ToolbarDivider />
          <ToolbarButton
            icon={<AlignLeftOutlined />}
            title="左对齐"
            active={editor?.isActive({ textAlign: 'left' })}
            onClick={() => editor?.chain().focus().setTextAlign('left').run()}
          />
          <ToolbarButton
            icon={<AlignCenterOutlined />}
            title="居中"
            active={editor?.isActive({ textAlign: 'center' })}
            onClick={() => editor?.chain().focus().setTextAlign('center').run()}
          />
          <ToolbarButton
            icon={<AlignRightOutlined />}
            title="右对齐"
            active={editor?.isActive({ textAlign: 'right' })}
            onClick={() => editor?.chain().focus().setTextAlign('right').run()}
          />
          <ToolbarDivider />
          <ToolbarButton
            icon={<LinkOutlined />}
            title="插入链接"
            active={editor?.isActive('link')}
            onClick={() => {
              const url = window.prompt('请输入链接地址');
              if (!url) {
                editor?.chain().focus().extendMarkRange('link').unsetLink().run();
                return;
              }
              editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
            }}
          />
          </Space>
        </div>
        {(onInsertIndicator || onInsertChart) && (
          <div className="report-rich-editor__toolbar-actions">
            <Space size={6}>
              {onInsertChart && (
                <Button size="small" icon={<BarChartOutlined />} onClick={onInsertChart}>
                  插入图表
                </Button>
              )}
              {onInsertIndicator && (
                <Button size="small" icon={<PlusOutlined />} type="primary" onClick={onInsertIndicator}>
                  插入指标
                </Button>
              )}
            </Space>
          </div>
        )}
      </div>
      <div className="report-rich-editor__body">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default ReportMarkdownEditor;
