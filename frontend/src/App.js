import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import 'antd/dist/reset.css';

import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import RootRoute from './components/RootRoute';
// import ServiceMonitor from './components/ServiceMonitor';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EventList from './pages/EventList';
import EventDetail from './pages/EventDetail';
import ClusterDetail from './pages/ClusterDetail';
import ClusterList from './pages/ClusterList';
import PersonAnalysisList from './pages/PersonAnalysisList';
import PersonAnalysisDetail from './pages/PersonAnalysisDetail';
import StatisticsReport from './pages/StatisticsReport';
import ReportList from './pages/ReportList';
import ReportEdit from './pages/ReportEdit';
// 已移除：AIChatPage
import TopicList from './pages/TopicList';
import TopicCreate from './pages/TopicCreate';
import TopicDetail from './pages/TopicDetail';
import TopicStats from './pages/TopicStats';
import OperationLogList from './pages/OperationLogList';

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <AuthProvider>
        {/* <ServiceMonitor /> 暂时禁用，避免与AI聊天冲突 */}
        <Router>
          <Routes>
            <Route path="/" element={<RootRoute />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/events" element={
              <ProtectedRoute>
                <Layout>
                  <EventList />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/events/:eventId" element={
              <ProtectedRoute>
                <Layout>
                  <EventDetail />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/cluster-list" element={
              <ProtectedRoute>
                <Layout>
                  <ClusterList />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/clusters/:eventUID" element={
              <ProtectedRoute>
                <Layout>
                  <ClusterDetail />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/person-analysis" element={
              <ProtectedRoute>
                <Layout>
                  <PersonAnalysisList />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/person-analysis/:phone" element={
              <ProtectedRoute>
                <Layout>
                  <PersonAnalysisDetail />
                </Layout>
              </ProtectedRoute>
            } />
            {/* 已移除：AI问答路由 */}
            <Route path="/statistics-report" element={
              <ProtectedRoute>
                <Layout>
                  <StatisticsReport />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute>
                <Layout>
                  <ReportList />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/reports/:reportId/edit" element={
              <ProtectedRoute>
                <Layout>
                  <ReportEdit />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/topics" element={
              <ProtectedRoute>
                <Layout>
                  <TopicList />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/topics/create" element={
              <ProtectedRoute>
                <Layout>
                  <TopicCreate />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/topics/:topicId/edit" element={
              <ProtectedRoute>
                <Layout>
                  <TopicCreate />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/topics/:topicId" element={
              <ProtectedRoute>
                <Layout>
                  <TopicDetail />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/topics/:topicId/stats" element={
              <ProtectedRoute>
                <Layout>
                  <TopicStats />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/operation-logs" element={
              <ProtectedRoute>
                <Layout>
                  <OperationLogList />
                </Layout>
              </ProtectedRoute>
            } />
          </Routes>
        </Router>
      </AuthProvider>
    </ConfigProvider>
  );
}

export default App; 
