import { useEffect, useState } from 'react'
import AuthPage from './pages/AuthPage'
import Workspace from './pages/Workspace'
import { logout } from './services/auth'
import ResetPasswordPage from './pages/ResetPasswordPage'

export default function App() {
  const [authenticated, setAuthenticated] = useState(()=>Boolean(localStorage.getItem('accessToken')))
  const [resetToken,setResetToken]=useState(()=>new URLSearchParams(window.location.search).get('token'))
  useEffect(()=>{const expired=()=>setAuthenticated(false);window.addEventListener('auth:expired',expired);return()=>window.removeEventListener('auth:expired',expired)},[])
  const handleLogout=async()=>{await logout();setAuthenticated(false)}
  if(!authenticated&&resetToken)return <ResetPasswordPage token={resetToken} onDone={()=>{setResetToken(null);window.history.replaceState({},'',window.location.pathname)}}/>
  return authenticated ? <Workspace onLogout={handleLogout} /> : <AuthPage onSuccess={() => setAuthenticated(true)} />
}
