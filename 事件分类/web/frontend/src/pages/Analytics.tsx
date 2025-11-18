import { useState, useEffect } from 'react'
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Typography,
  Space,
  Button,
  Alert,
  message,
} from 'antd'
import {
  ReloadOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { getAnalyticsSummary, type AnalyticsSummary } from '../services/api'

const { Title, Text } = Typography

const COLORS = [
  '#1890ff',
  '#52c41a',
  '#faad14',
  '#f5222d',
  '#722ed1',
  '#13c2c2',
  '#eb2f96',
  '#fa8c16',
]

const Analytics = () => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    setLoading(true)
    try {
      const data = await getAnalyticsSummary()
      setSummary(data)
    } catch (error: any) {
      if (error.message === '暂无预测数据') {
        message.info('暂无分析数据，请先进行分类预测')
      } else {
        message.error('加载分析数据失败')
      }
    } finally {
      setLoading(false)
    }
  }

  const getDistributionChartData = () => {
    if (!summary?.category_distribution) return []

    return Object.entries(summary.category_distribution)
      .map(([category, count]) => ({
        category,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15) // 只显示前15个
  }

  const getPieChartData = () => {
    if (!summary?.category_distribution) return []

    const data = Object.entries(summary.category_distribution)
      .map(([category, count]) => ({
        name: category,
        value: count,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8) // 只显示前8个

    // 其余归为"其他"
    const total = Object.values(summary.category_distribution).reduce((a, b) => a + b, 0)
    const top8Total = data.reduce((sum, item) => sum + item.value, 0)
    if (total > top8Total) {
      data.push({
        name: '其他',
        value: total - top8Total,
      })
    }

    return data
  }

  const getTopCategoriesTableData = () => {
    if (!summary?.category_distribution) return []

    return Object.entries(summary.category_distribution)
      .map(([category, count]) => ({
        key: category,
        category,
        count,
        percentage: ((count / summary.total_predictions) * 100).toFixed(2),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
  }

  const tableColumns = [
    {
      title: '排名',
      key: 'rank',
      width: 80,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: '分类名称',
      dataIndex: 'category',
      key: 'category',
    },
    {
      title: '预测数量',
      dataIndex: 'count',
      key: 'count',
      sorter: (a: any, b: any) => a.count - b.count,
      render: (count: number) => <Text strong>{count}</Text>,
    },
    {
      title: '占比',
      dataIndex: 'percentage',
      key: 'percentage',
      sorter: (a: any, b: any) => parseFloat(a.percentage) - parseFloat(b.percentage),
      render: (percentage: string) => `${percentage}%`,
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          分类结果分析
        </Title>
        <Button icon={<ReloadOutlined />} onClick={loadAnalytics} loading={loading}>
          刷新数据
        </Button>
      </div>

      {summary ? (
        <>
          <Row gutter={24} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="总预测数"
                  value={summary.total_predictions}
                  suffix="条"
                  prefix={<CheckCircleOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="准确率"
                  value={summary.accuracy ? (summary.accuracy * 100).toFixed(2) : '-'}
                  suffix={summary.accuracy ? '%' : ''}
                  valueStyle={{
                    color: summary.accuracy && summary.accuracy >= 0.6 ? '#3f8600' : '#cf1322',
                  }}
                  prefix={
                    summary.accuracy && summary.accuracy >= 0.6 ? (
                      <ArrowUpOutlined />
                    ) : (
                      <ArrowDownOutlined />
                    )
                  }
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="平均置信度"
                  value={summary.avg_confidence ? (summary.avg_confidence * 100).toFixed(2) : '-'}
                  suffix={summary.avg_confidence ? '%' : ''}
                  valueStyle={{
                    color: summary.avg_confidence && summary.avg_confidence >= 0.8 ? '#3f8600' : '#faad14',
                  }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="分类数量"
                  value={Object.keys(summary.category_distribution).length}
                  suffix="类"
                />
              </Card>
            </Col>
          </Row>

          {!summary.accuracy && (
            <Alert
              message="提示"
              description="当前数据不包含真实标签，无法计算准确率。如需查看准确率，请确保数据中包含真实分类列。"
              type="info"
              showIcon
              style={{ marginBottom: 24 }}
            />
          )}

          <Row gutter={24} style={{ marginBottom: 24 }}>
            <Col span={16}>
              <Card title="分类分布柱状图（Top 15）">
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={getDistributionChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="category"
                      angle={-45}
                      textAnchor="end"
                      height={120}
                      interval={0}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#1890ff" name="预测数量" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col span={8}>
              <Card title="分类占比饼图（Top 8）">
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={getPieChartData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {getPieChartData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>

          <Card title="分类详细统计（Top 20）">
            <Table
              columns={tableColumns}
              dataSource={getTopCategoriesTableData()}
              pagination={false}
            />
          </Card>

          <Card title="数据更新时间" style={{ marginTop: 24 }}>
            <Text type="secondary">
              最后更新: {new Date(summary.last_updated).toLocaleString('zh-CN')}
            </Text>
          </Card>
        </>
      ) : (
        <Card>
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Text type="secondary">暂无分析数据，请先进行分类预测</Text>
          </div>
        </Card>
      )}
    </div>
  )
}

export default Analytics
