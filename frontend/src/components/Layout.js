import React from 'react';
import { Layout as AntLayout, Menu, Typography, Button, Space } from 'antd';
import { HomeOutlined, UnorderedListOutlined, ClusterOutlined, UserOutlined, BarChartOutlined, LogoutOutlined, BookOutlined, FileTextOutlined, AuditOutlined, ThunderboltOutlined, SafetyOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const { Header, Content, Footer } = AntLayout;
const { Title } = Typography;

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { username, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    {
      key: '/events',
      icon: <UnorderedListOutlined />,
      label: '事件列表',
    },
    {
      key: '/cluster-list',
      icon: <ClusterOutlined />,
      label: '聚合事件列表',
    },
    {
      key: '/person-analysis',
      icon: <UserOutlined />,
      label: '人员分析',
    },
    {
      key: '/topics',
      icon: <BookOutlined />,
      label: '事件主题',
    },
    {
      key: '/statistics-report',
      icon: <BarChartOutlined />,
      label: '统计报告',
    },
    {
      key: 'reports-submenu',
      icon: <FileTextOutlined />,
      label: '月度报告',
      children: [
        {
          key: '/reports',
          label: '报告列表',
        },
        {
          key: '/reports/examples',
          label: '示例文档',
        },
        {
          key: '/reports/prompts',
          label: 'Prompt配置',
        },
      ],
    },
    {
      key: '/operation-logs',
      icon: <AuditOutlined />,
      label: '操作日志',
    },
    {
      key: 'classification-submenu',
      icon: <ThunderboltOutlined />,
      label: '智能分类',
      children: [
        {
          key: '/event-classification/tasks',
          label: '分类任务',
        },
        {
          key: '/event-classification/category-trees',
          label: '分类树管理',
        },
        {
          key: '/event-classification/tags',
          label: '标签管理',
        },
      ],
    },
    {
      key: 'system-submenu',
      icon: <SafetyOutlined />,
      label: '系统管理',
      children: [
        {
          key: '/system/users',
          label: '用户管理',
        },
        {
          key: '/system/roles',
          label: '角色管理',
        },
      ],
    },
  ];

  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

  return (
    <AntLayout>
      <Header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          background: '#fff',
          borderBottom: '1px solid #f0f0f0',
          padding: '0 24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <Title
          level={4}
          style={{
            margin: 0,
            marginRight: 24,
            color: '#1890ff',
            lineHeight: '1.2',
            fontSize: '20px',
            cursor: 'pointer',
            userSelect: 'none'
          }}
          onClick={() => navigate('/dashboard')}
        >
          海治通
        </Title>
        <Menu
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ flex: 1, border: 'none' }}
        />
        <Space>
          <span>欢迎，{username}</span>
          <Button 
            type="text" 
            icon={<LogoutOutlined />} 
            onClick={handleLogout}
          >
            退出
          </Button>
        </Space>
      </Header>
      
      <Content style={{
        paddingTop: '64px',
        background: '#f5f5f5'
      }}>
        {children}
      </Content>

      <Footer style={{ textAlign: 'center', background: '#f5f5f5', padding: '8px 50px' }}>
        海治通 ©2025 杭州量之技术支持
      </Footer>
    </AntLayout>
  );
};

export default Layout; 
