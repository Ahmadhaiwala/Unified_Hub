import Navbar from "./Navbar"
import { useTheme } from "../../context/ThemeContext"
import { useAuth } from "../../context/AuthContext"
import Sidebar from "../Sidebar"
import { Outlet } from "react-router-dom"

// src/components/layout/AppLayout.js
export default function AppLayout() {
    const { logout } = useAuth()
    const { theme, setTheme, themeStyles, themes } = useTheme()

    return (
        <div className={`min-h-screen flex ${themeStyles.bg} ${themeStyles.text}`}>
            <Sidebar />

            <div className="flex-1 flex flex-col lg:ml-0">
                <Navbar />

                {/* Theme buttons - positioned in navbar area */}
                <div className="absolute top-4 right-4 flex gap-2 flex-wrap z-10">
                    {Object.keys(themes).map((key) => (
                        <button
                            key={key}
                            onClick={() => setTheme(key)}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-200
                  hover:scale-105
                  ${theme === key ? themeStyles.button : themeStyles.themeButton}`}
                        >
                            {themes[key].name}
                        </button>
                    ))}
                </div>

                <main className="flex-1 overflow-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}