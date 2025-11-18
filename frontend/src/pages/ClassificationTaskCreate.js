import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Radio,
  Select,
  Upload,
  Button,
  message,
  Steps,
  Space,
  Typography,
  Alert,
  Table
} from 'antd';
import {
  UploadOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CheckOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import eventAPI, { taskAPI, tagAPI } from '../services/api';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

function ClassificationTaskCreate() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [taskType, setTaskType] = useState('classify');
  const [categories, setCategories] = useState([]);
  const [tagLibrary, setTagLibrary] = useState({ tags: [], groups: [] });
  const [taskId, setTaskId] = useState(null);
  const [fileList, setFileList] = useState([]);
  const [uploadPreview, setUploadPreview] = useState(null);

  useEffect(() => {
    loadCategories();
    loadTagLibrary();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await eventAPI.getCategories();
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('加载分类列表失败:', error);
    }
  };

  const loadTagLibrary = async () => {
    try {
      const response = await tagAPI.getTagLibrary();
      setTagLibrary(response.data || { tags: [], groups: [] });
    } catch (error) {
      console.error('加载标签库失败:', error);
      setTagLibrary({ tags: [], groups: [] });
    }
  };

  const handleStep1Next = async () => {
    try {
      const values = await form.validateFields(['name', 'task_type', 'category_ids', 'tag_ids']);

      setLoading(true);
      const payload = {
        name: values.name,
        task_type: values.task_type,
        category_ids: values.task_type === 'classify' ? values.category_ids : null,
        tag_ids: values.task_type === 'tag' ? values.tag_ids : null,
        created_by: 'admin'
      };

      const response = await taskAPI.createTask(payload);
      setTaskId(response.data.id);
      message.success('任务创建成功');
      setCurrent(1);
    } catch (error) {
      if (error.errorFields) {
        message.error('请填写完整的任务信息');
      } else {
        console.error('创建任务失败:', error);
        message.error('创建任务失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file) => {
    if (!taskId) {
      message.error('请先创建任务');
      return false;
    }

    setLoading(true);
    try {
      const response = await taskAPI.uploadFile(taskId, file);

      if (response.data.success) {
        message.success('文件上传成功');
        setUploadPreview(response.data.preview);
        setFileList([file]);
        setCurrent(2);
      } else {
        message.error(response.data.error || '文件上传失败');
      }
    } catch (error) {
      console.error('上传文件失败:', error);
      message.error(error.response?.data?.detail || '上传文件失败');
    } finally {
      setLoading(false);
    }

    return false; // 阻止自动上传
  };

  const handleStartTask = async () => {
    if (!taskId) {
      message.error('任务不存在');
      return;
    }

    setLoading(true);
    try {
      await taskAPI.startTask(taskId);
      message.success('任务已启动，正在后台处理...');
      setTimeout(() => {
        navigate(`/event-classification/tasks/${taskId}`);
      }, 1500);
    } catch (error) {
      console.error('启动任务失败:', error);
      message.error(error.response?.data?.detail || '启动任务失败');
    } finally {
      setLoading(false);
    }
  };

  const previewColumns = [
    {
      title: '事件标题',
      dataIndex: '事件标题',
      key: '事件标题',
      width: 200
    },
    {
      title: '事件描述',
      dataIndex: '事件描述',
      key: '事件描述',
      ellipsis: true
    }
  ];

  const steps = [
    {
      title: '基本信息',
      content: (
        <Form form={form} layout="vertical" style={{ maxWidth: 600 }}>
          <Form.Item
            label="任务名称"
            name="name"
            rules={[{ required: true, message: '请输入任务名称' }]}
          >
            <Input placeholder="例如：10月份事件分类任务" />
          </Form.Item>

          <Form.Item
            label="任务类型"
            name="task_type"
            rules={[{ required: true, message: '请选择任务类型' }]}
            initialValue="classify"
          >
            <Radio.Group onChange={(e) => setTaskType(e.target.value)}>
              <Radio value="classify">分类任务</Radio>
              <Radio value="tag">打标任务</Radio>
            </Radio.Group>
          </Form.Item>

          {taskType === 'classify' ? (
            <Form.Item
              label="选择分类"
              name="category_ids"
              rules={[{ required: true, message: '请选择至少一个分类' }]}
            >
              <Select
                mode="multiple"
                placeholder="请选择要识别的分类（可多选）"
                showSearch
                filterOption={(input, option) =>
                  option.children.toLowerCase().includes(input.toLowerCase())
                }
              >
                {categories.map((cat) => (
                  <Select.Option key={cat.id} value={cat.id}>
                    {cat.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          ) : (
            <Form.Item
              label="选择标签"
              name="tag_ids"
              rules={[{ required: true, message: '请选择至少一个标签' }]}
            >
              <Select
                mode="multiple"
                placeholder="请选择要识别的标签"
                showSearch
                filterOption={(input, option) =>
                  option.children.toLowerCase().includes(input.toLowerCase())
                }
              >
                {(tagLibrary?.tags || []).map((tag) => (
                  <Select.Option key={tag.id} value={tag.id}>
                    {tag.label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Alert
            message="提示"
            description="请准备包含以下列的Excel文件：事件标题、事件描述。可选列：事件ID"
            type="info"
            showIcon
            style={{ marginTop: 16 }}
          />
        </Form>
      )
    },
    {
      title: '上传数据',
      content: (
        <div style={{ maxWidth: 600 }}>
          <Paragraph>
            请上传包含事件数据的Excel文件。文件必须包含以下列：
          </Paragraph>
          <ul>
            <li><Text strong>事件标题</Text>：事件的标题</li>
            <li><Text strong>事件描述</Text>：事件的详细描述</li>
            <li><Text type="secondary">事件ID（可选）</Text>：事件的唯一标识符</li>
          </ul>

          <Upload
            fileList={fileList}
            beforeUpload={handleFileUpload}
            onRemove={() => {
              setFileList([]);
              setUploadPreview(null);
            }}
            accept=".xlsx,.xls"
            maxCount={1}
          >
            <Button icon={<UploadOutlined />} loading={loading}>
              选择Excel文件
            </Button>
          </Upload>

          {uploadPreview && uploadPreview.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <Title level={5}>数据预览（前5条）</Title>
              <Table
                columns={previewColumns}
                dataSource={uploadPreview}
                rowKey={(_, idx) => idx}
                pagination={false}
                size="small"
              />
            </div>
          )}
        </div>
      )
    },
    {
      title: '确认启动',
      content: (
        <div style={{ maxWidth: 600 }}>
          <Alert
            message="准备就绪"
            description="任务配置完成，点击启动按钮开始处理。任务将在后台异步执行，您可以在任务列表中查看进度。"
            type="success"
            showIcon
            style={{ marginBottom: 24 }}
          />

          <Card title="任务信息" size="small">
            <p><Text strong>任务名称：</Text>{form.getFieldValue('name')}</p>
            <p>
              <Text strong>任务类型：</Text>
              {form.getFieldValue('task_type') === 'classify' ? '分类任务' : '打标任务'}
            </p>
            {form.getFieldValue('task_type') === 'classify' ? (
              <p>
                <Text strong>目标分类：</Text>
                {form.getFieldValue('category_ids')?.map(catId =>
                  categories.find(c => c.id === catId)?.name
                ).join(', ')}
              </p>
            ) : (
              <p>
                <Text strong>目标标签：</Text>
                {form.getFieldValue('tag_ids')?.map(tagId =>
                  (tagLibrary?.tags || []).find(t => t.id === tagId)?.label
                ).join(', ')}
              </p>
            )}
            <p><Text strong>数据条数：</Text>{uploadPreview?.length || 0} 条（预览）</p>
          </Card>
        </div>
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Title level={3}>创建分类任务</Title>

        <Steps current={current} style={{ marginBottom: 32 }}>
          {steps.map(item => (
            <Step key={item.title} title={item.title} />
          ))}
        </Steps>

        <div style={{ marginTop: 24, minHeight: 400 }}>
          {steps[current].content}
        </div>

        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => {
              if (current === 0) {
                navigate('/event-classification/tasks');
              } else {
                setCurrent(current - 1);
              }
            }}
          >
            {current === 0 ? '返回列表' : '上一步'}
          </Button>

          <Space>
            {current < steps.length - 1 && (
              <Button
                type="primary"
                onClick={current === 0 ? handleStep1Next : () => setCurrent(current + 1)}
                loading={loading}
                icon={<ArrowRightOutlined />}
                disabled={current === 1 && !uploadPreview}
              >
                下一步
              </Button>
            )}
            {current === steps.length - 1 && (
              <Button
                type="primary"
                onClick={handleStartTask}
                loading={loading}
                icon={<CheckOutlined />}
              >
                启动任务
              </Button>
            )}
          </Space>
        </div>
      </Card>
    </div>
  );
}

export default ClassificationTaskCreate;
