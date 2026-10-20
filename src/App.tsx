import { useEffect, useState } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { Shell } from './components/Shell'
import { ToastProvider } from './components/Toast'
import { useSession } from './lib/hooks'
import { ensureStarterData } from './lib/repo'
import { startSyncLoop, syncNow } from './lib/sync'
import { Calendar } from './pages/Calendar'
import { CustomerView, Customers, More } from './pages/Customers'
import { Money } from './pages/Money'
import { OrderForm } from './pages/OrderForm'
import { Orders } from './pages/Orders'
import { RecipeEdit, RecipeView, Recipes } from './pages/Recipes'
import { Settings } from './pages/Settings'
import { SetPassword, SignIn } from './pages/SignIn'
import { Today } from './pages/Today'

let loopStarted = false

export default function App() {
  const session = useSession()
  const [ready, setReady] = useState(false)
  const [mustChange, setMustChange] = useState(false)

  useEffect(() => {
    if (!session) return
    setMustChange(Boolean(session.user.user_metadata?.must_change_password))
    // Show the app straight away from on-device data; sync runs in the background
    setReady(true)
    void (async () => {
      // Starter rows are safe on any device: stable ids, and the server's copy wins
      await ensureStarterData()
      if (!loopStarted) {
        loopStarted = true
        await startSyncLoop()
      } else {
        await syncNow()
      }
    })()
  }, [session])

  if (session === undefined) return null
  if (!session) return <SignIn />
  if (mustChange) return <SetPassword onDone={() => setMustChange(false)} />
  if (!ready) return null

  return (
    <ToastProvider>
      <HashRouter>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<Today />} />
            <Route path="orders" element={<Orders />} />
            <Route path="orders/new" element={<OrderForm />} />
            <Route path="orders/:id" element={<Orders />} />
            <Route path="orders/:id/edit" element={<OrderForm />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="money" element={<Money />} />
            <Route path="recipes" element={<Recipes />} />
            <Route path="recipes/new" element={<RecipeEdit />} />
            <Route path="recipes/:id" element={<RecipeView />} />
            <Route path="recipes/:id/edit" element={<RecipeEdit />} />
            <Route path="customers" element={<Customers />} />
            <Route path="customers/:id" element={<CustomerView />} />
            <Route path="settings" element={<Settings />} />
            <Route path="more" element={<More />} />
            <Route path="*" element={<Today />} />
          </Route>
        </Routes>
      </HashRouter>
    </ToastProvider>
  )
}
