import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  message,
  Typography,
  Alert,
  Spin,
  Space,
  Statistic,
  Row,
  Col
} from 'antd';
import {
  TagsOutlined,
  FolderOpenOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;

function CategoryManagement() {
  const [categoryMapping, setCategoryMapping] = useState({});
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalEventTypes: 0,
    totalCategories: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 从后端加载分类映射数据
      const response = await axios.get('http://localhost:8000/api/classify/categories');
      const data = response.data;

      // 使用后端返回的映射关系
      const mapping = data.by_event_type || {};
      setCategoryMapping(mapping);

      // 计算统计信息
      const eventTypes = Object.keys(mapping);
      const allCategories = new Set();
      Object.values(mapping).forEach(categories => {
        categories.forEach(cat => allCategories.add(cat));
      });

      setStats({
        totalEventTypes: eventTypes.length,
        totalCategories: data.total || allCategories.size
      });
    } catch (error) {
      console.error('加载数据失败:', error);
      message.error('加载分类数据失败，请检查后端服务是否正常');
    } finally {
      setLoading(false);
    }
  };

  // 构建树形数据结构
  const getTreeData = () => {
    const data = [];
    Object.entries(categoryMapping).forEach(([eventType, categories], index) => {
      // 父节点：事件类型
      const parentNode = {
        key: `event-${index}`,
        eventType: eventType,
        category: '',
        categoryCount: categories.length,
        isParent: true,
        children: categories.map((category, catIndex) => ({
          key: `${eventType}-${catIndex}`,
          eventType: '',
          category: category,
          categoryCount: 0,
          isParent: false,
        })),
      };
      data.push(parentNode);
    });
    return data;
  };

  const mappingColumns = [
    {
      title: '事件类型（一级分类）',
      dataIndex: 'eventType',
      key: 'eventType',
      width: 300,
      render: (text, record) => {
        if (record.isParent) {
          return (
            <Space>
              <Tag
                color="green"
                icon={<FolderOpenOutlined />}
                style={{ fontSize: 14, padding: '4px 12px' }}
              >
                {text}
              </Tag>
              <Text type="secondary">({record.categoryCount}个二级分类)</Text>
            </Space>
          );
        }
        return null;
      },
    },
    {
      title: '二级分类',
      dataIndex: 'category',
      key: 'category',
      render: (text, record) => {
        if (!record.isParent && text) {
          return (
            <Tag color="blue" icon={<TagsOutlined />}>
              {text}
            </Tag>
          );
        }
        return null;
      },
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <TagsOutlined /> 分类配置管理
      </Title>
      <Text type="secondary">
        查看事件类型与二级分类的映射关系，系统支持145个二级分类类别
      </Text>

      <Row gutter={24} style={{ marginTop: 24, marginBottom: 24 }}>
        <Col span={12}>
          <Card>
            <Statistic
              title="事件类型总数（一级分类）"
              value={stats.totalEventTypes}
              prefix={<FolderOpenOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card>
            <Statistic
              title="二级分类总数"
              value={stats.totalCategories}
              prefix={<TagsOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="事件类型与二级分类映射关系"
        bordered={false}
      >
        <Alert
          message="说明"
          description="展开事件类型可查看该类型下的所有二级分类。每个事件在分类时，只能被分类到其对应事件类型下的二级分类中。这种限制机制可以显著提高分类准确率，避免跨类型的错误分类。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">正在加载分类数据...</Text>
            </div>
          </div>
        ) : (
          <Table
            columns={mappingColumns}
            dataSource={getTreeData()}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 个事件类型`,
            }}
            defaultExpandAllRows={false}
            bordered
          />
        )}
      </Card>

      <Card
        title="使用说明"
        bordered={false}
        style={{ marginTop: 24 }}
        size="small"
      >
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li>系统共支持29种事件类型（一级分类）</li>
          <li>每种事件类型对应20-30个二级分类，总计145个二级分类</li>
          <li>分类映射关系基于训练数据自动生成</li>
          <li>点击事件类型行可以展开查看其下的所有二级分类</li>
          <li>此映射关系确保分类预测时只在合理范围内进行，提高准确性</li>
        </ul>
      </Card>
    </div>
  );
}

export default CategoryManagement;
