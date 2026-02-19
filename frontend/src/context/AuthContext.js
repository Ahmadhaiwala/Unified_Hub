import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session ?? null)
      setLoading(false)
    })

    // Listen for auth changes (including token refresh)
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event)
        
        if (event === 'TOKEN_REFRESHED') {
          console.log("Token refreshed successfully")
        }
        
        if (event === 'SIGNED_OUT') {
          console.log("User signed out")
        }
        
        setUser(session ?? null)
      }
    )

    // Set up automatic token refresh check every 5 minutes
    const refreshInterval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        // Check if token is about to expire (within 10 minutes)
        const expiresAt = session.expires_at * 1000 // Convert to milliseconds
        const now = Date.now()
        const timeUntilExpiry = expiresAt - now
        
        // If token expires in less than 10 minutes, refresh it
        if (timeUntilExpiry < 10 * 60 * 1000) {
          console.log("Token expiring soon, refreshing...")
          const { data, error } = await supabase.auth.refreshSession()
          if (error) {
            console.error("Token refresh failed:", error)
            // If refresh fails, sign out the user
            await supabase.auth.signOut()
          } else {
            console.log("Token refreshed proactively")
            setUser(data.session)
          }
        }
      }
    }, 5 * 60 * 1000) // Check every 5 minutes

    return () => {
      listener.subscription.unsubscribe()
      clearInterval(refreshInterval)
    }
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}


export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider")
  }

  return context
}
