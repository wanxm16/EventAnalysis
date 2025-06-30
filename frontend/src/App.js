import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import 'antd/dist/reset.css';

import Layout from './components/Layout';
import EventList from './pages/EventList';
import EventDetail from './pages/EventDetail';
import ClusterDetail from './pages/ClusterDetail';

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<EventList />} />
            <Route path="/events" element={<EventList />} />
            <Route path="/events/:eventId" element={<EventDetail />} />
            <Route path="/clusters/:eventUID" element={<ClusterDetail />} />
          </Routes>
        </Layout>
      </Router>
    </ConfigProvider>
  );
}

export default App; 