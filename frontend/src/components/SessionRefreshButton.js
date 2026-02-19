import { useState } from "react"
import { supabase } from "../lib/supabase"
import { useTheme } from "../context/ThemeContext"

export default function SessionRefreshButton() {
    const [refreshing, setRefreshing] = useState(false)
    const [message, setMessage] = useState("")
    const { themeStyles } = useTheme()

    const handleRefresh = async () => {
        setRefreshing(true)
        setMessage("")
        
        try {
            const { data, error } = await supabase.auth.refreshSession()
            
            if (error) {
                setMessage("Failed to refresh session. Please log in again.")
                console.error("Session refresh error:", error)
                
                // If refresh fails, sign out
                setTimeout(async () => {
                    await supabase.auth.signOut()
                    window.location.href = "/login"
                }, 2000)
            } else {
                setMessage("Session refreshed successfully!")
                console.log("Session refreshed:", data.session)
                
                // Clear message after 3 seconds
                setTimeout(() => setMessage(""), 3000)
            }
        } catch (error) {
            setMessage("Error refreshing session")
            console.error("Refresh error:", error)
        } finally {
            setRefreshing(false)
        }
    }

    return (
        <div className="flex items-center gap-2">
            <button
                onClick={handleRefresh}
                disabled={refreshing}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    refreshing 
                        ? "opacity-50 cursor-not-allowed" 
                        : "hover:opacity-80"
                } bg-blue-600 text-white`}
                title="Refresh your session if you're experiencing authentication errors"
            >
                {refreshing ? "Refreshing..." : "🔄 Refresh Session"}
            </button>
            {message && (
                <span className={`text-sm ${
                    message.includes("successfully") 
                        ? "text-green-500" 
                        : "text-red-500"
                }`}>
                    {message}
                </span>
            )}
        </div>
    )
}
