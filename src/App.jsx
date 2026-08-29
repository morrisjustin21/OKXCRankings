import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Rankings from './pages/Rankings.jsx'
import Admin from './pages/Admin.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-white text-gray-900">
        <nav className="border-b border-gray-200 px-6 py-3 flex justify-center">
          <div className="w-full max-w-3xl flex gap-6">
            <Link to="/" className="text-sm text-gray-600 hover:text-blue-700">
              Rankings
            </Link>
            <Link to="/admin" className="text-sm text-gray-600 hover:text-blue-700">
              Admin
            </Link>
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<Rankings />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
