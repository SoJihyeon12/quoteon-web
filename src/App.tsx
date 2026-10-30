import { useEffect, useState } from 'react'
import AdminCategoryPage from './pages/AdminCategoryPage.tsx'
import AdminProductDetailPage from './pages/AdminProductDetailPage.tsx'
import AdminProductFormPage from './pages/AdminProductFormPage.tsx'
import AdminProductListPage from './pages/AdminProductListPage.tsx'
import AdminDashboardPage from './pages/AdminDashboardPage.tsx'
import AdminHomePage from './pages/AdminHomePage.tsx'
import AdminMemberEditPage from './pages/AdminMemberEditPage.tsx'
import AdminMemberListPage from './pages/AdminMemberListPage.tsx'
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
import { adminProductIdFromDetailPath, adminProductIdFromEditPath, memberIdFromEditPath } from './adminMenu.ts'
import { consultationDialog } from './consultationDraft.ts'
import { consultationCustomerId, customerRecordRoute } from './customerList.ts'
import { quoteIdFromViewPath } from './quoteList.ts'
import { quoteWorkbenchQuoteId } from './quoteWorkbench.ts'

type Route = {
  pathname: string
  mode: string | null
  dialog: ReturnType<typeof consultationDialog>
  customerId: number | null
  workbenchQuoteId: number | null
}

function readRoute(): Route {
  const rawPath = window.location.pathname
  if (rawPath === '/') {
    return { pathname: '/login', mode: null, dialog: null, customerId: null, workbenchQuoteId: null }
  }
  if (rawPath === '/quotes/new') {
    return { pathname: '/consultation', mode: 'new', dialog: null, customerId: null, workbenchQuoteId: null }
  }
  const params = new URLSearchParams(window.location.search)
  return {
    pathname: rawPath,
    mode: params.get('mode'),
    dialog: consultationDialog(params.get('dialog')),
    customerId: consultationCustomerId(params.get('customerId')),
    workbenchQuoteId: quoteWorkbenchQuoteId(params.get('quoteId')),
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
    return <AdminDashboardPage />
  }

  if (route.pathname === '/admin/categories') {
    return <AdminCategoryPage />
  }

  if (route.pathname === '/admin/products/new') {
    return <AdminProductFormPage productId={null} />
  }

  const productEditId = adminProductIdFromEditPath(route.pathname)
  if (productEditId !== null) {
    return <AdminProductFormPage key={`edit-${productEditId}`} productId={productEditId} />
  }

  const productId = adminProductIdFromDetailPath(route.pathname)
  if (productId !== null) {
    return <AdminProductDetailPage key={productId} productId={productId} />
  }

  if (route.pathname === '/admin/products') {
    return <AdminProductListPage />
  }

  if (route.pathname === '/admin/members/pending') {
    return <AdminHomePage />
  }

  if (route.pathname === '/admin/members') {
    return <AdminMemberListPage />
  }

  const memberEditId = memberIdFromEditPath(route.pathname)
  if (memberEditId !== null) {
    return <AdminMemberEditPage key={memberEditId} memberId={memberEditId} />
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
    return (
      <ConsultationPage
        key={`${route.mode ?? 'new'}-${route.workbenchQuoteId ?? 0}-${route.customerId ?? 0}`}
        dialog={route.dialog}
        customerId={route.workbenchQuoteId === null ? route.customerId : null}
        quoteId={route.workbenchQuoteId}
        mode={route.mode}
      />
    )
  }

  return null
}
