import { useState } from "react"
import Login from "../components/auth/Login"
import Signup from "../components/auth/Signup"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"

export default function Auth() {
  const { user } = useAuth()
  const { theme, setTheme, themeStyles, themes } = useTheme()

  const [toggle, setToggle] = useState(true)

  return (
    <div
      className={`
        min-h-screen relative flex items-center justify-center
        transition-all duration-300
        ${themeStyles.bg} ${themeStyles.text}
      `}
    >
      {/* Theme Switcher */}
      <div className="absolute top-4 right-4 flex gap-2 flex-wrap">
        {Object.keys(themes).map((key) => (
          <button
            key={key}
            onClick={() => setTheme(key)}
            className={`
              px-3 py-1 rounded-md text-xs font-medium
              transition-all duration-200 hover:scale-105
              ${theme === key
                ? themeStyles.button
                : themeStyles.themeButton}
            `}
          >
            {themes[key].name}
          </button>
        ))}
      </div>

      {/* Auth Card */}
      <div
        className={`
          w-full max-w-md rounded-2xl p-8 border
          shadow-lg transition-all duration-300
          hover:shadow-2xl hover:-translate-y-1
          ${themeStyles.cardBg} ${themeStyles.border}
        `}
      >
        {/* Title */}
        <h1 className="text-2xl font-bold text-center mb-2">
          {toggle ? "Welcome back" : "Create an account"}
        </h1>

        <p className="text-sm text-center opacity-70 mb-6">
          {toggle
            ? "Login to continue"
            : "Sign up and start building"}
        </p>

        {/* Auth Forms */}
        <div className="transition-all duration-300">
          {toggle ? <Login /> : <Signup />}
        </div>

        {/* Toggle Button */}
        <button
          onClick={() => setToggle((prev) => !prev)}
          className={`
            mt-6 w-full py-2 rounded-md text-sm font-medium
            transition-all duration-200
            hover:scale-[1.02] active:scale-95
            ${themeStyles.button}
          `}
        >
          {toggle
            ? "Don’t have an account? Sign up"
            : "Already have an account? Login"}
        </button>
      </div>
    </div>
  )
}
