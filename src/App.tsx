import { useEffect, useState } from 'react'
import AdminHomePage from './pages/AdminHomePage.tsx'
import ConsultationPage from './pages/ConsultationPage.tsx'
import CustomerDetailPage from './pages/CustomerDetailPage.tsx'
import CustomerListPage from './pages/CustomerListPage.tsx'
import LoginPage from './pages/LoginPage.tsx'
import PendingPage from './pages/PendingPage.tsx'
import QuoteListPage from './pages/QuoteListPage.tsx'
import QuotePreviewPage from './pages/QuotePreviewPage.tsx'
import QuoteViewPage from './pages/QuoteViewPage.tsx'
import RestrictedPage from './pages/RestrictedPage.tsx'
import SignupPage from './pages/SignupPage.tsx'
import { consultationDialog } from './consultationDraft.ts'
import { customerRecordRoute } from './customerList.ts'
import { quoteIdFromViewPath } from './quoteList.ts'

type Route = {
  pathname: string
  mode: string | null
  dialog: ReturnType<typeof consultationDialog>
}

function readRoute(): Route {
  const rawPath = window.location.pathname
  if (rawPath === '/') {
    return { pathname: '/login', mode: null, dialog: null }
  }
  if (rawPath === '/quotes/new') {
    return { pathname: '/consultation', mode: 'new', dialog: null }
  }
  const params = new URLSearchParams(window.location.search)
  return {
    pathname: rawPath,
    mode: params.get('mode'),
    dialog: consultationDialog(params.get('dialog')),
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

  if (route.pathname === '/quotes/preview') {
    return <QuotePreviewPage />
  }

  const quoteId = quoteIdFromViewPath(route.pathname)
  if (quoteId !== null) {
    return <QuoteViewPage key={quoteId} quoteId={quoteId} />
  }

  if (route.pathname === '/customers' || route.pathname === '/customers/new') {
    return <CustomerListPage key={route.pathname} creating={route.pathname === '/customers/new'} />
  }

  const customerRecord = customerRecordRoute(route.pathname)
  if (customerRecord) {
    return (
      <CustomerDetailPage
        key={`${customerRecord.customerId}-${customerRecord.editing}`}
        customerId={customerRecord.customerId}
        editing={customerRecord.editing}
      />
    )
  }

  if (route.pathname === '/consultation') {
    return <ConsultationPage dialog={route.dialog} />
  }

  return null
}
