import { useState } from "react"
import { useTheme } from "../context/ThemeContext"
import { useAuth } from "../context/AuthContext"
import { useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"

const menu = [
    {
        label: "Dashboard",
        icon: "🏠",
        path: "/dashboard",
    },
    {
        label: "Profile",
        icon: "👤",
        path: "/profile",
    },
    {
        label: "Chat",
        icon: "👤",
        path: "/Chat",
    },
    {
        label: "Users",
        icon: "👥",
        children: [
            { label: "All Users", path: "/users" },
            { label: "Roles", path: "/roles" },
        ],
    },
]

export default function Sidebar({ onNavigate }) {
    const { themeStyles } = useTheme()
    const [open, setOpen] = useState(false)
    const [active, setActive] = useState(null)
    const { user } = useAuth()
    const [profile, setProfile] = useState(null)
    const [loadingProfile, setLoadingProfile] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        if (!user?.access_token) return

        const fetchProfile = async () => {
            try {
                const response = await fetch("http://localhost:8000/api/profile", {
                    headers: {
                        Authorization: `Bearer ${user.access_token}`,
                    },
                })

                if (!response.ok) {
                    throw new Error("Failed to fetch profile")
                }

                const data = await response.json()
                setProfile(data)
            } catch (err) {
                console.error(err)
            } finally {
                setLoadingProfile(false)
            }
        }

        fetchProfile()
    }, [user])

    const handleNavigation = (path) => {
        navigate(path)
        setOpen(false)
        if (onNavigate) {
            onNavigate(path)
        }
    }

    return (
        <>
            {/* Mobile toggle */}
            <button
                onClick={() => setOpen(true)}
                className="lg:hidden fixed top-4 left-4 z-50 px-3 py-2 bg-black text-white rounded"
            >
                ☰
            </button>

            {/* Overlay */}
            {open && (
                <div
                    onClick={() => setOpen(false)}
                    className="fixed inset-0 bg-black/40 z-40 lg:hidden"
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
          fixed top-0 left-0 h-full w-64 z-50
          transform transition-transform duration-300
          ${open ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
          ${themeStyles.cardBg} ${themeStyles.text} ${themeStyles.border}
        `}
            >
                {/* Header */}
                <div className="p-4 text-xl font-bold border-b">
                    Unified hub
                </div>

                {/* Nav */}
                <nav className="p-2 space-y-1">
                    {menu.map((item, idx) => (
                        <div key={idx}>
                            {/* Parent with children */}
                            {item.children ? (
                                <>
                                    <button
                                        onClick={() =>
                                            setActive(active === idx ? null : idx)
                                        }
                                        className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-gray-200 dark:hover:bg-neutral-700"
                                    >
                                        <span className="flex items-center gap-2">
                                            <span>{item.icon}</span>
                                            {item.label}
                                        </span>
                                        {item.children && (
                                            <span>{active === idx ? "▲" : "▼"}</span>
                                        )}
                                    </button>

                                    {/* Children */}
                                    {item.children && active === idx && (
                                        <div className="ml-6 mt-1 space-y-1 text-sm">
                                            {item.children.map((child, cidx) => (
                                                <button
                                                    key={cidx}
                                                    onClick={() => handleNavigation(child.path)}
                                                    className="w-full text-left px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-neutral-800"
                                                >
                                                    {child.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                               
                                <button
                                    onClick={() => handleNavigation(item.path)}
                                    className="w-full text-left flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-200 dark:hover:bg-neutral-700"
                                >
                                    <span>{item.icon}</span>
                                    {item.label}
                                </button>
                            )}
                        </div>
                    ))}
                </nav>

                {/* Footer */}
                <div className="absolute bottom-0 w-full p-4 border-t text-sm">
                    <button
                        onClick={() => handleNavigation("/profile")}
                        className="w-full text-left flex items-center gap-2 hover:opacity-80 transition-opacity"
                    >
                       
                        <img
                            className="w-8 h-8 rounded-full"
                            src={profile?.avatar || "https://i.pravatar.cc/100"}
                            alt="avatar"
                        />
                        <div>
                            <div className="font-medium">
                                {loadingProfile ? "Loading..." : profile?.username || "Anonymous"}
                            </div>
                            <div className="text-xs opacity-70">View Profile</div>
                        </div>
                    </button>
                </div>
            </aside>
        </>
    )
}
