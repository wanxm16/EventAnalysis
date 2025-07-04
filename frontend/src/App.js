import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import 'antd/dist/reset.css';

import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import EventList from './pages/EventList';
import EventDetail from './pages/EventDetail';
import ClusterDetail from './pages/ClusterDetail';
import ClusterList from './pages/ClusterList';
import PersonAnalysisList from './pages/PersonAnalysisList';
import PersonAnalysisDetail from './pages/PersonAnalysisDetail';
import StatisticsReport from './pages/StatisticsReport';

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/events" element={<EventList />} />
            <Route path="/events/:eventId" element={<EventDetail />} />
            <Route path="/cluster-list" element={<ClusterList />} />
            <Route path="/clusters/:eventUID" element={<ClusterDetail />} />
            <Route path="/person-analysis" element={<PersonAnalysisList />} />
            <Route path="/person-analysis/:phone" element={<PersonAnalysisDetail />} />
            <Route path="/statistics-report" element={<StatisticsReport />} />
          </Routes>
        </Layout>
      </Router>
    </ConfigProvider>
  );
}

export default App; 