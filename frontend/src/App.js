import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import 'antd/dist/reset.css';

import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import RootRoute from './components/RootRoute';
import ServiceMonitor from './components/ServiceMonitor';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EventList from './pages/EventList';
import EventDetail from './pages/EventDetail';
import ClusterDetail from './pages/ClusterDetail';
import ClusterList from './pages/ClusterList';
import PersonAnalysisList from './pages/PersonAnalysisList';
import PersonAnalysisDetail from './pages/PersonAnalysisDetail';
import StatisticsReport from './pages/StatisticsReport';
import AIChatPage from './pages/AIChatPage';

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <AuthProvider>
        <ServiceMonitor />
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
            <Route path="/ai-chat" element={
              <ProtectedRoute>
                <Layout>
                  <AIChatPage />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/statistics-report" element={
              <ProtectedRoute>
                <Layout>
                  <StatisticsReport />
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