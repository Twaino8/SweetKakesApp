import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

interface ToastMsg {
  text: string
  undo?: () => void
}

const Ctx = createContext<(t: ToastMsg) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<ToastMsg | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const show = useCallback((t: ToastMsg) => {
    setMsg(t)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setMsg(null), t.undo ? 6000 : 3000)
  }, [])
  return (
    <Ctx.Provider value={show}>
      {children}
      {msg && (
        <div className="toast" role="status">
          <span>{msg.text}</span>
          {msg.undo && (
            <button
              onClick={() => {
                msg.undo?.()
                setMsg(null)
              }}
            >
              Undo
            </button>
          )}
        </div>
      )}
    </Ctx.Provider>
  )
}

export const useToast = () => useContext(Ctx)
