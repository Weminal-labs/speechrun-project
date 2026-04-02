import { useState, useCallback, useEffect } from 'react'

export interface Session {
  id: string
  title: string
  createdAt: number
}

const STORAGE_KEY = 'speechrun-sessions'
const ACTIVE_KEY = 'speechrun-active-session'

function genId(): string {
  return Math.random().toString(36).slice(2, 8) + Date.now().toString(36)
}

function load(): Session[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}

function save(s: Session[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) }

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>(() => {
    const existing = load()
    if (existing.length > 0) return existing
    const s: Session = { id: genId(), title: 'New Session', createdAt: Date.now() }
    save([s])
    return [s]
  })

  const [activeId, setActiveId] = useState<string>(() => {
    const stored = localStorage.getItem(ACTIVE_KEY)
    const existing = load()
    if (stored && existing.find((s) => s.id === stored)) return stored
    return existing[0]?.id || genId()
  })

  useEffect(() => { save(sessions) }, [sessions])
  useEffect(() => { localStorage.setItem(ACTIVE_KEY, activeId) }, [activeId])

  const createSession = useCallback(() => {
    const s: Session = { id: genId(), title: 'New Session', createdAt: Date.now() }
    setSessions((prev) => [s, ...prev])
    setActiveId(s.id)
  }, [])

  const switchSession = useCallback((id: string) => { setActiveId(id) }, [])

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== id)
      if (filtered.length === 0) {
        const s: Session = { id: genId(), title: 'New Session', createdAt: Date.now() }
        setActiveId(s.id)
        return [s]
      }
      if (id === activeId) setActiveId(filtered[0].id)
      return filtered
    })
  }, [activeId])

  const renameSession = useCallback((id: string, title: string) => {
    setSessions((prev) => prev.map((s) => s.id === id ? { ...s, title } : s))
  }, [])

  return { sessions, activeId, createSession, switchSession, deleteSession, renameSession }
}
