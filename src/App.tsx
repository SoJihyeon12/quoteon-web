import { useEffect, useState } from 'react'
import AdminHomePage from './pages/AdminHomePage.tsx'
import ConsultationPage from './pages/ConsultationPage.tsx'
import LoginPage from './pages/LoginPage.tsx'
import PendingPage from './pages/PendingPage.tsx'
import QuoteListPage from './pages/QuoteListPage.tsx'
import RestrictedPage from './pages/RestrictedPage.tsx'
import SignupPage from './pages/SignupPage.tsx'

type Route = {
  pathname: string
  mode: string | null
}

function readRoute(): Route {
  const rawPath = window.location.pathname
  if (rawPath === '/') {
    return { pathname: '/login', mode: null }
  }
  if (rawPath === '/quotes/new') {
    return { pathname: '/consultation', mode: 'new' }
  }
  return {
    pathname: rawPath,
    mode: new URLSearchParams(window.location.search).get('mode'),
  }
}

export default function App() {
  const [route, setRoute] = useState(readRoute)

  useEffect(() => {
    if (window.location.pathname === '/') {
      window.history.replaceState(null, '', '/login')
    }
    if (window.location.pathname === '/quotes/new') {
      window.history.replaceState(null, '', '/consultation?mode=new')
    }

    const onPopState = () => {
      if (window.location.pathname === '/quotes/new') {
        window.history.replaceState(null, '', '/consultation?mode=new')
      }
      setRoute(readRoute())
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  if (route.pathname === '/login') {
    return <LoginPage />
  }

  if (route.pathname === '/signup') {
    return <SignupPage />
  }

  if (route.pathname === '/signup/pending') {
    return <PendingPage />
  }

  if (route.pathname === '/access-restricted') {
    return <RestrictedPage />
  }

  if (route.pathname === '/admin/dashboard') {
    return <AdminHomePage />
  }

  if (route.pathname === '/quotes/my') {
    return <QuoteListPage />
  }

  if (route.pathname === '/consultation' && route.mode === 'new') {
    return <ConsultationPage />
  }

  return null
}
