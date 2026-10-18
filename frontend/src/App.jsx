import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Top from './pages/Top'
import Login from './pages/Login'
import Register from './pages/Register'
import Chat from './pages/Chat'
import ProtectedRoute from './components/ProtectedRoute'

const App = () => {
  return (
    <BrowserRouter>
      <div className='body'>
        <Routes>
          {/* Public routes */}
          <Route path="/"         element={<Top />} />
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected route — redirect to /login if not authenticated */}
          <Route path="/chat" element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          } />

          {/* Redirect /home to /chat */}
          <Route path="/home" element={<Navigate to="/chat" replace />} />

          {/* Fallback to landing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App