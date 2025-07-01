import React from 'react';
import { Card, Row, Col, Typography, Button, Space, Statistic, Divider } from 'antd';
import { 
  UnorderedListOutlined, 
  ClusterOutlined, 
  UserOutlined, 
  QuestionCircleOutlined,
  ArrowRightOutlined,
  DatabaseOutlined,
  SearchOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph } = Typography;

const Dashboard = () => {
  const navigate = useNavigate();

  const functionCards = [
    {
      title: '事件列表',
      description: '查看、搜索和筛选所有冲突事件记录，支持多维度条件筛选',
      icon: <UnorderedListOutlined style={{ fontSize: '32px', color: '#1890ff' }} />,
      path: '/events',
      features: ['事件搜索', '多维筛选', '详情查看', '快速定位']
    },
    {
      title: '聚合事件列表',
      description: '分析关联事件聚类，发现事件之间的潜在关联性和规律',
      icon: <ClusterOutlined style={{ fontSize: '32px', color: '#52c41a' }} />,
      path: '/cluster-list',
      features: ['事件聚类', '关联分析', '时间线视图', '参与人统计']
    },
    {
      title: '人员分析',
      description: '从人员角度分析参与事件的人群特征和行为模式',
      icon: <UserOutlined style={{ fontSize: '32px', color: '#fa8c16' }} />,
      path: '/person-analysis',
      features: ['人员统计', '角色分析', '人口库搜索', '关联事件']
    },
    {
      title: '事件问答',
      description: '基于AI的智能问答系统，快速获取事件相关信息和洞察',
      icon: <QuestionCircleOutlined style={{ fontSize: '32px', color: '#722ed1' }} />,
      isExternal: true,
      url: 'http://192.168.2.63:8501/',
      features: ['智能问答', '数据洞察', '趋势分析', '决策支持']
    }
  ];

  const handleCardClick = (item) => {
    if (item.isExternal) {
      window.open(item.url, '_blank', 'noopener,noreferrer');
    } else {
      navigate(item.path);
    }
  };

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      {/* 欢迎区域 */}
      <Card style={{ marginBottom: '24px', textAlign: 'center' }}>
        <Title level={1} style={{ color: '#1890ff', marginBottom: '16px' }}>
          欢迎使用海曙区事件分析系统
        </Title>
        <Paragraph style={{ fontSize: '16px', color: '#666', maxWidth: '800px', margin: '0 auto' }}>
          本系统致力于为海曙区提供全面的事件分析和管理服务，通过数据驱动的方式帮助相关部门
          更好地了解、分析和处理各类冲突事件，提升社会治理效率和决策水平。
        </Paragraph>
      </Card>

      {/* 统计数据 */}
      <Row gutter={24} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="事件管理"
              value="多维度"
              prefix={<DatabaseOutlined />}
              suffix="分析"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="智能搜索"
              value="精准"
              prefix={<SearchOutlined />}
              suffix="定位"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="人员分析"
              value="深度"
              prefix={<TeamOutlined />}
              suffix="洞察"
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="AI问答"
              value="智能"
              prefix={<QuestionCircleOutlined />}
              suffix="服务"
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 功能模块 */}
      <Card title="核心功能模块" style={{ marginBottom: '24px' }}>
        <Row gutter={[24, 24]}>
          {functionCards.map((item, index) => (
            <Col xs={24} sm={12} lg={12} xl={6} key={index}>
              <Card
                hoverable
                style={{ height: '100%', cursor: 'pointer' }}
                onClick={() => handleCardClick(item)}
                bodyStyle={{ padding: '20px', height: '260px', display: 'flex', flexDirection: 'column' }}
              >
                <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                  {item.icon}
                </div>
                <Title level={4} style={{ textAlign: 'center', marginBottom: '10px', fontSize: '16px' }}>
                  {item.title}
                </Title>
                <Paragraph style={{ textAlign: 'center', color: '#666', marginBottom: '12px', flex: 1, fontSize: '13px' }}>
                  {item.description}
                </Paragraph>
                <div style={{ marginTop: 'auto' }}>
                  <Divider style={{ margin: '10px 0' }} />
                  <div style={{ fontSize: '11px', color: '#999' }}>
                    {item.features.map((feature, idx) => (
                      <span key={idx}>
                        {feature}
                        {idx < item.features.length - 1 ? ' • ' : ''}
                      </span>
                    ))}
                  </div>
                  <Button 
                    type="primary" 
                    icon={<ArrowRightOutlined />} 
                    style={{ width: '100%', marginTop: '10px' }}
                    size="small"
                  >
                    {item.isExternal ? '打开应用' : '进入模块'}
                  </Button>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* 系统特色 */}
      <Card title="系统特色">
        <Row gutter={[24, 16]}>
          <Col xs={24} md={8}>
            <div style={{ textAlign: 'center' }}>
              <DatabaseOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
              <Title level={4}>数据驱动决策</Title>
              <Paragraph style={{ color: '#666' }}>
                基于大数据分析技术，为管理者提供科学的决策依据和深度的事件洞察
              </Paragraph>
            </div>
          </Col>
          <Col xs={24} md={8}>
            <div style={{ textAlign: 'center' }}>
              <SearchOutlined style={{ fontSize: '48px', color: '#52c41a', marginBottom: '16px' }} />
              <Title level={4}>智能检索分析</Title>
              <Paragraph style={{ color: '#666' }}>
                支持多维度搜索和筛选，快速定位目标事件，提升工作效率
              </Paragraph>
            </div>
          </Col>
          <Col xs={24} md={8}>
            <div style={{ textAlign: 'center' }}>
              <TeamOutlined style={{ fontSize: '48px', color: '#fa8c16', marginBottom: '16px' }} />
              <Title level={4}>全面人员画像</Title>
              <Paragraph style={{ color: '#666' }}>
                构建完整的人员行为画像，深入分析参与人群的特征和模式
              </Paragraph>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default Dashboard; 