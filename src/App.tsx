import { BrowserRouter, Navigate, Outlet, Route, Routes, useParams } from 'react-router-dom'
import { AppLayout } from './components/Layout'
import { homeOf, useSession } from './lib/session'
import type { Role } from './lib/types'
import Home from './pages/Home'
import Legal from './pages/Legal'
import Library from './pages/Library'
import Login from './pages/Login'
import MyInfo from './pages/MyInfo'
import SchoolInfo from './pages/SchoolInfo'
import Support from './pages/Support'
import DesignForm from './pages/eval/DesignForm'
import Grading, { StudentGrading } from './pages/eval/Grading'
import Report, { StudentReport } from './pages/eval/Report'
import Submissions, { ClassPdfUpload } from './pages/eval/Submissions'
import Targets from './pages/eval/Targets'
import StudentHome from './pages/student/StudentHome'
import StudentTask from './pages/student/StudentTask'

function EvalRedirect({ to }: { to: string }) {
  const { evalId } = useParams()
  return <Navigate to={`/evals/${evalId}/${to}`} replace />
}

/** 로그인하지 않았으면 로그인 화면으로, 다른 구분의 화면이면 자기 첫 화면으로 보낸다 */
function RequireRole({ roles }: { roles: Role[] }) {
  const user = useSession((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  if (!roles.includes(user.role)) return <Navigate to={homeOf(user.role)} replace />
  return <Outlet />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="login" element={<Login />} />
        <Route element={<AppLayout />}>
          {/* 선생님·학원: 같은 화면 틀을 쓰되 학원은 일부 항목이 빠진다 */}
          <Route element={<RequireRole roles={['teacher', 'academy']} />}>
            <Route index element={<Home />} />
            <Route path="my-info" element={<MyInfo />} />
            <Route path="school" element={<SchoolInfo />} />
            <Route path="library" element={<Library />} />
            <Route path="privacy" element={<Legal kind="privacy" />} />
            <Route path="terms" element={<Legal kind="terms" />} />
            <Route path="support" element={<Support />} />
            <Route path="evals/:evalId">
              <Route index element={<EvalRedirect to="targets" />} />
              <Route path="targets" element={<Targets />} />
              <Route path="design" element={<DesignForm />} />
              <Route path="submissions" element={<Submissions />} />
              <Route path="submissions/pdf" element={<ClassPdfUpload />} />
              <Route path="grading" element={<Grading />} />
              <Route path="grading/results" element={<EvalRedirect to="grading" />} />
              <Route path="grading/student/:studentId" element={<StudentGrading />} />
              <Route path="report" element={<Report />} />
              <Route path="report/student/:studentId" element={<StudentReport />} />
            </Route>
          </Route>
          {/* 학생 */}
          <Route element={<RequireRole roles={['student']} />}>
            <Route path="student" element={<StudentHome />} />
            <Route path="student/tasks/:evalId" element={<StudentTask />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
