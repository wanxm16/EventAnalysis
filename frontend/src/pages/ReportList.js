import React, { useEffect, useState } from 'react';
import { Button, Card, Space, Table, Typography, Modal, Form, Input, DatePicker, message } from 'antd';
import { PlusOutlined, EditOutlined, EyeOutlined, FileWordOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { reportAPI } from '../services/api';

const { Title } = Typography;

const ReportList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();

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
      form.resetFields();
      form.setFieldsValue({
        month: dayjs(),
      });
    }
  }, [createOpen, form]);

  const resetModalState = () => {
    form.resetFields();
  };

  const handleModalCancel = () => {
    resetModalState();
    setCreateOpen(false);
  };

  const columns = [
    { title: '标题', dataIndex: 'title', key: 'title', render: (t, r) => <Button type="link" onClick={() => navigate(`/reports/${r.id}/edit`)}>{t}</Button> },
    { title: '月份', dataIndex: 'month', key: 'month', width: 120 },
    { title: '更新时间', dataIndex: 'updated_at', key: 'updated_at', width: 180 },
    { title: '操作', key: 'op', width: 200, render: (_, r) => (
      <Space>
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => navigate(`/reports/${r.id}/edit`)}>编辑</Button>
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={async () => {
          try {
            const prev = await reportAPI.preview(r.id, r.content_md_draft || '', r.month);
            const win = window.open('', '_blank');
            win.document.write(`<html><head><title>预览-${r.title}</title></head><body style="padding:16px;font-family:sans-serif">${prev.rendered_html.replace(/\n/g,'<br/>')}</body></html>`);
          } catch (e) {
            message.error('预览失败');
          }
        }}>预览</Button>
        <Button type="link" size="small" icon={<FileWordOutlined />} onClick={async () => {
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
      await reportAPI.createReport({
        title: vals.title,
        month: vals.month.format('YYYY-MM'),
        content_md_draft: '',
        schedule_type: 'manual',
        schedule_day: null,
        template_id: null,
        template_name: null,
      });
      message.success('报告创建成功');
      resetModalState();
      setCreateOpen(false);
      load();
    } catch (e) {
      message.error('创建失败，请重试');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>报告列表</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>新建报告</Button>
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
        <Form form={form} layout="vertical">
          <Form.Item label="标题" name="title" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="例如：10月份全区矛盾纠纷等重点事件追踪报告" />
          </Form.Item>
          <Form.Item label="报告月份" name="month" rules={[{ required: true, message: '请选择月份' }]}>
            <DatePicker picker="month" style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ReportList;
