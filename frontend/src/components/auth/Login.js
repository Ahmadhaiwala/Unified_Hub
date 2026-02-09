import { useState } from "react"
import { supabase } from "../../lib/supabase"
import { useTheme } from "../../context/ThemeContext"

export default function Login() {
    const { themeStyles } = useTheme()

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const handleLogin = async (e) => {
        e.preventDefault()
        setError("")
        setLoading(true)

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        setLoading(false)

        if (error) {
            setError(error.message)
        }
    }

    const loginWithProvider = async (provider) => {
        await supabase.auth.signInWithOAuth({
            provider,
        })
    }

    return (
        <div>
  <h2 className="text-2xl font-bold mb-4">
    Login
  </h2>

  {error && (
    <p className="text-red-500 text-sm mb-3">
      {error}
    </p>
  )}

  <form onSubmit={handleLogin} className="space-y-4">
    <input
      type="email"
      placeholder="Email"
      className={`w-full px-3 py-2 rounded-md border ${themeStyles.input}`}
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      required
    />

    <input
      type="password"
      placeholder="Password"
      className={`w-full px-3 py-2 rounded-md border ${themeStyles.input}`}
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      required
    />

    <button
      type="submit"
      disabled={loading}
      className={`w-full py-2 rounded-md transition ${themeStyles.button}`}
    >
      {loading ? "Logging in..." : "Login"}
    </button>
  </form>

  <div className="mt-4 space-y-2">
    <button
      onClick={() => loginWithProvider("google")}
      className={`w-full py-2 rounded-md border ${themeStyles.themeButton}`}
    >
      Continue with Google
    </button>

    <button
      onClick={() => loginWithProvider("github")}
      className={`w-full py-2 rounded-md border ${themeStyles.themeButton}`}
    >
      Continue with GitHub
    </button>
  </div>
</div>

    )
}
