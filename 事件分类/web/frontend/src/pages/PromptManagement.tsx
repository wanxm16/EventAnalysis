import { useState, useEffect } from 'react'
import {
  Card,
  Typography,
  Alert,
  Descriptions,
  Tag,
  Space,
  Button,
  Divider,
} from 'antd'
import { EditOutlined, InfoCircleOutlined } from '@ant-design/icons'
import { getPromptTemplates } from '../services/api'

const { Title, Paragraph, Text } = Typography

const PromptManagement = () => {
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const data = await getPromptTemplates()
      setTemplates(data.templates)
    } catch (error) {
      console.error('加载提示词模板失败', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>
        提示词模板管理
      </Title>

      <Alert
        message="关于提示词工程"
        description={
          <div>
            <Paragraph>
              提示词（Prompt）是与大语言模型交互的关键，高质量的提示词能够显著提升分类准确度。
              本系统使用精心设计的提示词模板来引导模型进行事件分类。
            </Paragraph>
            <Paragraph style={{ marginBottom: 0 }}>
              <strong>核心组成部分：</strong>
            </Paragraph>
            <ul style={{ marginBottom: 0 }}>
              <li>任务说明：明确告知模型需要完成的分类任务</li>
              <li>Few-shot 示例：提供每个分类的典型案例</li>
              <li>分类规则：针对易混淆分类的特殊处理规则</li>
              <li>输出格式：规范模型的输出格式要求</li>
            </ul>
          </div>
        }
        type="info"
        icon={<InfoCircleOutlined />}
        showIcon
        style={{ marginBottom: 24 }}
      />

      {templates.map((template, index) => (
        <Card
          key={index}
          title={template.name}
          extra={
            <Button type="link" icon={<EditOutlined />} disabled>
              编辑模板
            </Button>
          }
          style={{ marginBottom: 24 }}
        >
          <Descriptions column={1} bordered>
            <Descriptions.Item label="模板说明">
              {template.description}
            </Descriptions.Item>
            <Descriptions.Item label="变量参数">
              <Space wrap>
                {template.variables?.map((variable: string) => (
                  <Tag key={variable} color="blue">
                    {variable}
                  </Tag>
                ))}
              </Space>
            </Descriptions.Item>
          </Descriptions>
        </Card>
      ))}

      <Card title="当前提示词结构说明">
        <Paragraph>
          <Text strong>1. 任务定义阶段</Text>
        </Paragraph>
        <Paragraph style={{ paddingLeft: 20 }}>
          明确告知模型这是一个事件二级分类任务，并说明输入字段和输出要求。
        </Paragraph>

        <Divider />

        <Paragraph>
          <Text strong>2. Few-shot 示例阶段</Text>
        </Paragraph>
        <Paragraph style={{ paddingLeft: 20 }}>
          根据事件类型动态选择 3-5 个最相关的示例，每个示例包含：
          <ul>
            <li>事件描述</li>
            <li>事件类型</li>
            <li>区县和镇街信息（如有）</li>
            <li>正确的二级分类</li>
          </ul>
        </Paragraph>

        <Divider />

        <Paragraph>
          <Text strong>3. 分类规则强化阶段</Text>
        </Paragraph>
        <Paragraph style={{ paddingLeft: 20 }}>
          针对高频混淆对添加强制规则：
          <ul>
            <li>
              <Tag color="red">优化5</Tag> 街面秩序 vs 市容环境（强制关键词检查）
            </li>
            <li>
              <Tag color="orange">优化6</Tag> 储存危险物品（自动关键词触发）
            </li>
            <li>
              <Tag color="orange">优化7</Tag> 经济纠纷决策树（4级优先级系统）
            </li>
          </ul>
        </Paragraph>

        <Divider />

        <Paragraph>
          <Text strong>4. 输出格式要求</Text>
        </Paragraph>
        <Paragraph style={{ paddingLeft: 20 }}>
          要求模型严格按照 JSON 格式输出，包含分类结果和置信度（0-100）。
        </Paragraph>

        <Divider />

        <Alert
          message="提示词优化建议"
          description={
            <ul style={{ marginBottom: 0 }}>
              <li>定期分析错误案例，针对性地调整规则强度</li>
              <li>对于长尾分类，增加更多 Few-shot 示例</li>
              <li>使用明确的关键词触发机制，减少模型判断的模糊性</li>
              <li>保持提示词简洁明了，避免冗余信息干扰模型判断</li>
            </ul>
          }
          type="warning"
          showIcon
          style={{ marginTop: 16 }}
        />
      </Card>

      <Card title="提示词示例预览" style={{ marginTop: 24 }}>
        <Paragraph>
          <Text code>系统提示词模板结构：</Text>
        </Paragraph>
        <pre
          style={{
            background: '#f5f5f5',
            padding: 16,
            borderRadius: 4,
            overflow: 'auto',
          }}
        >
          {`你是一个专业的事件分类助手，负责将社区事件进行二级分类。

【输入信息】
- 事件描述: {event_description}
- 事件类型: {event_type}
- 区县名称: {district}
- 镇街名称: {street}

【可选分类】
{valid_categories}

【Few-shot 示例】
{few_shot_examples}

【特殊分类规则】
{classification_rules}

【输出要求】
请严格按照以下 JSON 格式输出：
{
  "category": "分类名称",
  "confidence": 85
}`}
        </pre>
      </Card>
    </div>
  )
}

export default PromptManagement
