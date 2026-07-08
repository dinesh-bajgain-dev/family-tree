import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { TreeDashboardPage } from './pages/TreeDashboardPage'
import { TreeViewPage } from './pages/TreeViewPage'
import { MemberProfilePage } from './pages/MemberProfilePage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/trees" replace />} />
          <Route path="/trees" element={<TreeDashboardPage />} />
          <Route path="/trees/:treeId" element={<TreeViewPage />} />
          <Route path="/trees/:treeId/members/:memberId" element={<MemberProfilePage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
