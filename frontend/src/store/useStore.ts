import { create } from 'zustand'

interface User {
  id: number
  email: string
  first_name: string | null
  last_name: string | null
  organization_id: number
  organization_name: string | null
  roles: string[]
  is_active: boolean
  is_verified: boolean
}

interface StoreState {
  user: User | null
  token: string | null
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  logout: () => void
  selectedDateRange: { start: Date; end: Date }
  setDateRange: (start: Date, end: Date) => void
}

export const useStore = create<StoreState>((set) => ({
  user: null,
  token: null,
  setUser: (user) => set({ user }),
  setToken: (token) => {
    set({ token })
    if (token) {
      localStorage.setItem('token', token)
    } else {
      localStorage.removeItem('token')
    }
  },
  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, token: null })
  },
  selectedDateRange: {
    start: new Date(new Date().setDate(new Date().getDate() - 30)),
    end: new Date(),
  },
  setDateRange: (start, end) => set({ selectedDateRange: { start, end } }),
}))

