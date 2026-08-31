import { useState } from 'react'
import AuthPage from './pages/AuthPage'
import Workspace from './pages/Workspace'

export default function App() {
  const [authenticated, setAuthenticated] = useState(false)
  return authenticated ? <Workspace onLogout={() => setAuthenticated(false)} /> : <AuthPage onSuccess={() => setAuthenticated(true)} />
}
