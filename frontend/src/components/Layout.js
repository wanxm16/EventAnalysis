import React from 'react';
import { Layout as AntLayout, Menu, Typography } from 'antd';
import { HomeOutlined, UnorderedListOutlined, ClusterOutlined, UserOutlined, QuestionCircleOutlined, BarChartOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';

const { Header, Content, Footer } = AntLayout;
const { Title } = Typography;

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/',
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
      key: 'qa-external',
      icon: <QuestionCircleOutlined />,
      label: '事件问答',
    },
    {
      key: '/statistics-report',
      icon: <BarChartOutlined />,
      label: '统计报告',
    },
  ];

  const handleMenuClick = ({ key }) => {
    if (key === 'qa-external') {
      // 在新窗口打开外部链接
      window.open('http://192.168.2.63:8501/', '_blank', 'noopener,noreferrer');
    } else {
      navigate(key);
    }
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
        <Title level={3} style={{ margin: 0, marginRight: 24, color: '#1890ff' }}>
          海曙区事件分析系统
        </Title>
        <Menu
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ flex: 1, border: 'none' }}
        />
      </Header>
      
      <Content style={{ minHeight: 'calc(100vh - 134px)' }}>
        {children}
      </Content>
      
      <Footer style={{ textAlign: 'center', background: '#f0f2f5' }}>
        海曙区事件分析系统 ©2024 Created by AI Assistant
      </Footer>
    </AntLayout>
  );
};

export default Layout; 