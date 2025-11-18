import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, theme } from 'antd'
import {
  FileTextOutlined,
  CloudUploadOutlined,
  SettingOutlined,
  DatabaseOutlined,
  EditOutlined,
} from '@ant-design/icons'

const { Header, Content, Sider } = Layout

const menuItems = [
  {
    key: '/single',
    icon: <FileTextOutlined />,
    label: '单事件分类',
  },
  {
    key: '/batch',
    icon: <CloudUploadOutlined />,
    label: '批量分类',
  },
  {
    key: 'config',
    icon: <SettingOutlined />,
    label: '配置管理',
    children: [
      {
        key: '/categories',
        icon: <DatabaseOutlined />,
        label: '分类管理',
      },
      {
        key: '/few-shot',
        icon: <DatabaseOutlined />,
        label: 'Few-shot示例',
      },
      {
        key: '/prompts',
        icon: <EditOutlined />,
        label: '提示词管理',
      },
    ],
  },
]

const AppLayout = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const {
    token: { colorBgContainer },
  } = theme.useToken()

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key)
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div
          style={{
            height: 32,
            margin: 16,
            color: '#fff',
            fontSize: 20,
            fontWeight: 'bold',
            textAlign: 'center',
          }}
        >
          {collapsed ? '事件' : '事件分类系统'}
        </div>
        <Menu
          theme="dark"
          selectedKeys={[location.pathname]}
          mode="inline"
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: 0, background: colorBgContainer }}>
          <div style={{ padding: '0 24px', fontSize: 18, fontWeight: 'bold' }}>
            事件分类管理平台
          </div>
        </Header>
        <Content style={{ margin: '16px' }}>
          <div
            style={{
              padding: 24,
              minHeight: 360,
              background: colorBgContainer,
              borderRadius: 8,
            }}
          >
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}

export default AppLayout
