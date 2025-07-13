import React from 'react';
import { Layout as AntLayout, Menu, Typography, Button, Space } from 'antd';
import { HomeOutlined, UnorderedListOutlined, ClusterOutlined, UserOutlined, BarChartOutlined, CommentOutlined, LogoutOutlined } from '@ant-design/icons';
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
      key: '/dashboard',
      icon: <HomeOutlined />,
      label: '首页',
    },
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
      key: '/ai-chat',
      icon: <CommentOutlined />,
      label: '事件问答',
    },
    {
      key: '/statistics-report',
      icon: <BarChartOutlined />,
      label: '统计报告',
    },
  ];

  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

  return (
    <AntLayout>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          background: '#fff',
          borderBottom: '1px solid #f0f0f0',
          padding: '0 24px',
        }}
      >
        <Title level={4} style={{ margin: 0, marginRight: 24, color: '#1890ff', lineHeight: '1.2', textAlign: 'center', fontSize: '16px' }}>
          海曙区社会治理中心<br />事件分析系统
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
      
      <Content style={{ minHeight: 'calc(100vh - 134px)' }}>
        {children}
      </Content>
      
      <Footer style={{ textAlign: 'center', background: '#f0f2f5' }}>
        海曙区社会治理中心事件分析系统 ©2025 杭州量之技术支持
      </Footer>
    </AntLayout>
  );
};

export default Layout; 