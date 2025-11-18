import { useState } from 'react'
import {
  Card,
  Upload,
  Button,
  Progress,
  Table,
  Space,
  Alert,
  Statistic,
  Row,
  Col,
  message,
  Tag,
  Typography,
} from 'antd'
import {
  InboxOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import type { UploadProps } from 'antd'
import {
  uploadBatchFile,
  getBatchTaskStatus,
  type BatchTaskStatus,
} from '../services/api'

const { Dragger } = Upload
const { Text, Title } = Typography

const BatchClassify = () => {
  const [taskStatus, setTaskStatus] = useState<BatchTaskStatus | null>(null)
  const [polling, setPolling] = useState(false)
  const [uploading, setUploading] = useState(false)

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    accept: '.csv',
    beforeUpload: async (file) => {
      const isCSV = file.name.endsWith('.csv')
      if (!isCSV) {
        message.error('只能上传 CSV 文件！')
        return false
      }

      const isLt10M = file.size / 1024 / 1024 < 10
      if (!isLt10M) {
        message.error('文件大小不能超过 10MB！')
        return false
      }

      setUploading(true)
      try {
        const response = await uploadBatchFile(file)
        message.success('文件上传成功，开始处理...')
        startPolling(response.task_id)
      } catch (error: any) {
        message.error(error.message || '上传失败')
      } finally {
        setUploading(false)
      }

      return false // 阻止自动上传
    },
  }

  const startPolling = (taskId: string) => {
    setPolling(true)
    const timer = setInterval(async () => {
      try {
        const status = await getBatchTaskStatus(taskId)
        setTaskStatus(status)

        if (status.status === 'completed' || status.status === 'failed') {
          clearInterval(timer)
          setPolling(false)
          if (status.status === 'completed') {
            message.success('批量分类完成！')
          } else {
            message.error('批量分类失败')
          }
        }
      } catch (error) {
        clearInterval(timer)
        setPolling(false)
        message.error('获取任务状态失败')
      }
    }, 2000)
  }

  const handleDownload = () => {
    if (!taskStatus?.results) return

    const results = taskStatus.results
    const headers = [
      '序号',
      '事件描述',
      '事件类型',
      '预测分类',
      '置信度',
      '原始分类',
    ]

    const csvContent = [
      headers.join(','),
      ...results.map((r) =>
        [
          r.index + 1,
          `"${r.event_description.replace(/"/g, '""')}"`,
          r.event_type,
          r.predicted_category,
          r.confidence,
          r.original_category || '',
        ].join(',')
      ),
    ].join('\n')

    const blob = new Blob(['\ufeff' + csvContent], {
      type: 'text/csv;charset=utf-8;',
    })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `分类结果_${taskStatus.task_id}.csv`
    link.click()
  }

  const getStatusTag = (status: string) => {
    const statusMap = {
      pending: { color: 'default', icon: <ClockCircleOutlined />, text: '等待中' },
      processing: { color: 'processing', icon: <SyncOutlined spin />, text: '处理中' },
      completed: { color: 'success', icon: <CheckCircleOutlined />, text: '已完成' },
      failed: { color: 'error', icon: <ClockCircleOutlined />, text: '失败' },
    }
    const config = statusMap[status as keyof typeof statusMap] || statusMap.pending
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    )
  }

  const columns = [
    {
      title: '序号',
      dataIndex: 'index',
      key: 'index',
      width: 80,
      render: (index: number) => index + 1,
    },
    {
      title: '事件描述',
      dataIndex: 'event_description',
      key: 'event_description',
      ellipsis: true,
      width: 300,
    },
    {
      title: '事件类型',
      dataIndex: 'event_type',
      key: 'event_type',
      width: 120,
    },
    {
      title: '预测分类',
      dataIndex: 'predicted_category',
      key: 'predicted_category',
      width: 150,
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: '置信度',
      dataIndex: 'confidence',
      key: 'confidence',
      width: 100,
      render: (confidence: number) => {
        const color =
          confidence >= 80 ? '#52c41a' : confidence >= 60 ? '#faad14' : '#ff4d4f'
        return (
          <Text style={{ color, fontWeight: 'bold' }}>{confidence.toFixed(2)}%</Text>
        )
      },
      sorter: (a: any, b: any) => a.confidence - b.confidence,
    },
    {
      title: '原始分类',
      dataIndex: 'original_category',
      key: 'original_category',
      width: 150,
      render: (text: string) => text || '-',
    },
    {
      title: '匹配',
      key: 'match',
      width: 80,
      render: (_: any, record: any) => {
        if (!record.original_category) return '-'
        const match = record.predicted_category === record.original_category
        return match ? (
          <Tag color="success">正确</Tag>
        ) : (
          <Tag color="error">错误</Tag>
        )
      },
    },
  ]

  const calculateAccuracy = () => {
    if (!taskStatus?.results) return 0
    const withOriginal = taskStatus.results.filter((r) => r.original_category)
    if (withOriginal.length === 0) return 0
    const correct = withOriginal.filter(
      (r) => r.predicted_category === r.original_category
    ).length
    return (correct / withOriginal.length) * 100
  }

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>
        批量文件分类
      </Title>

      <Row gutter={24}>
        <Col span={24}>
          <Card title="文件上传" style={{ marginBottom: 24 }}>
            <Alert
              message="使用说明"
              description={
                <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
                  <li>支持 CSV 格式文件，文件大小不超过 10MB</li>
                  <li>
                    必需列：事件描述、事件类型（可选列：区县名称、镇街名称、二级分类）
                  </li>
                  <li>上传后系统将自动进行批量分类，请耐心等待</li>
                </ul>
              }
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Dragger {...uploadProps} disabled={uploading || polling}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
              <p className="ant-upload-hint">仅支持 CSV 格式文件</p>
            </Dragger>
          </Card>
        </Col>

        {taskStatus && (
          <>
            <Col span={24}>
              <Card title="处理进度" style={{ marginBottom: 24 }}>
                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col span={6}>
                    <Statistic title="任务状态" value="" prefix={getStatusTag(taskStatus.status)} />
                  </Col>
                  <Col span={6}>
                    <Statistic title="总数" value={taskStatus.total} />
                  </Col>
                  <Col span={6}>
                    <Statistic title="已处理" value={taskStatus.processed} />
                  </Col>
                  <Col span={6}>
                    <Statistic title="成功" value={taskStatus.success_count} />
                  </Col>
                </Row>

                <Progress
                  percent={
                    taskStatus.total > 0
                      ? Math.round((taskStatus.processed / taskStatus.total) * 100)
                      : 0
                  }
                  status={
                    taskStatus.status === 'completed'
                      ? 'success'
                      : taskStatus.status === 'failed'
                      ? 'exception'
                      : 'active'
                  }
                />

                {taskStatus.status === 'completed' && taskStatus.results && (
                  <Row gutter={16} style={{ marginTop: 16 }}>
                    <Col span={12}>
                      <Statistic
                        title="准确率"
                        value={calculateAccuracy()}
                        precision={2}
                        suffix="%"
                        valueStyle={{
                          color: calculateAccuracy() >= 60 ? '#52c41a' : '#faad14',
                        }}
                      />
                    </Col>
                    <Col span={12} style={{ textAlign: 'right' }}>
                      <Button
                        type="primary"
                        icon={<DownloadOutlined />}
                        onClick={handleDownload}
                      >
                        下载结果
                      </Button>
                    </Col>
                  </Row>
                )}
              </Card>
            </Col>

            {taskStatus.status === 'completed' && taskStatus.results && (
              <Col span={24}>
                <Card title={`分类结果 (共 ${taskStatus.results.length} 条)`}>
                  <Table
                    columns={columns}
                    dataSource={taskStatus.results}
                    rowKey="index"
                    pagination={{
                      pageSize: 20,
                      showSizeChanger: true,
                      showTotal: (total) => `共 ${total} 条记录`,
                    }}
                    scroll={{ x: 1200 }}
                  />
                </Card>
              </Col>
            )}
          </>
        )}
      </Row>
    </div>
  )
}

export default BatchClassify
