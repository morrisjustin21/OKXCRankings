import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Rankings from './pages/Rankings.jsx'
import Admin from './pages/Admin.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-900 text-gray-100">
        <nav className="border-b border-gray-800 px-6 py-3 flex justify-center print:hidden">
          <div className="w-full max-w-3xl flex gap-6">
            <Link to="/" className="text-sm text-gray-400 hover:text-red-400">
              Rankings
            </Link>
            <Link to="/admin" className="text-sm text-gray-400 hover:text-red-400">
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
