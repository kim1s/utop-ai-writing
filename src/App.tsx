import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { AppLayout } from './components/Layout'
import Home from './pages/Home'
import Legal from './pages/Legal'
import Library from './pages/Library'
import MyInfo from './pages/MyInfo'
import SchoolInfo from './pages/SchoolInfo'
import Support from './pages/Support'
import DesignForm from './pages/eval/DesignForm'
import Grading, { StudentGrading } from './pages/eval/Grading'
import Report, { StudentReport } from './pages/eval/Report'
import Submissions, { ClassPdfUpload } from './pages/eval/Submissions'
import Targets from './pages/eval/Targets'

function EvalRedirect({ to }: { to: string }) {
  const { evalId } = useParams()
  return <Navigate to={`/evals/${evalId}/${to}`} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
