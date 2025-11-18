import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from 'antd'
import AppLayout from './components/Layout/AppLayout'
import SingleClassify from './pages/SingleClassify'
import BatchClassify from './pages/BatchClassify'
import CategoryManagement from './pages/CategoryManagement'
import FewShotManagement from './pages/FewShotManagement'
import PromptManagement from './pages/PromptManagement'

function App() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Navigate to="/single" replace />} />
        <Route path="single" element={<SingleClassify />} />
        <Route path="batch" element={<BatchClassify />} />
        <Route path="categories" element={<CategoryManagement />} />
        <Route path="few-shot" element={<FewShotManagement />} />
        <Route path="prompts" element={<PromptManagement />} />
      </Route>
    </Routes>
  )
}

export default App
