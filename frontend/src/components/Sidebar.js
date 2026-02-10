import { useState } from "react"
import { useTheme } from "../context/ThemeContext"
import { useAuth } from "../context/AuthContext"
import { useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"

const menu = [

  {
    label: "Friends",
    icon: "👤",
    path: "/friends",
  },
  {
    label: "Chat",
    icon: "💬",
    path: "/chat",
  },
  {
    label: "Discover Users",
    icon: "🔍",
    path: "/users",
  },
]

export default function Sidebar({ onNavigate }) {
  const { logout } = useAuth()
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

      <aside
        className={`
    w-64 h-screen flex flex-col
    fixed lg:static top-0 left-0 z-50
    transform transition-transform duration-300
    ${open ? "translate-x-0" : "-translate-x-full"}
    lg:translate-x-0
    border-r-2
    ${themeStyles.cardBg} ${themeStyles.text} ${themeStyles.border}
  `}
      >
        {/* HEADER */}
        <div className="p-4 border-b-2 border-current flex items-center gap-3">
          <img src="/logo-unified.svg" alt="Unified Hub" className="w-12 h-12" />
          <div className="text-lg font-extrabold uppercase tracking-wide">
            UNIFIED<br />HUB
          </div>
        </div>

        {/* MENU */}
        <nav className="flex-1 p-4 space-y-3 overflow-y-auto">
          {menu.map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleNavigation(item.path)}
              className={`
          w-full flex items-center gap-3
          px-4 py-2
          border-2 border-current
          font-bold uppercase text-sm tracking-wide
          hover:bg-black hover:text-white
          transition
        `}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* FOOTER PROFILE */}
        <div className="p-4 border-t-2 border-current">
          <button
            onClick={() => handleNavigation("/profile")}
            className="w-full flex items-center gap-3 border-2 border-current p-2 font-bold hover:bg-black hover:text-white transition"
          >
            {profile?.avatar_url ? (
              <img
                className="w-10 h-10 rounded-full border-2 border-current object-cover"
                src={profile.avatar_url}
                alt="avatar"
              />
            ) : (
              <div className="w-10 h-10 rounded-full border-2 border-current bg-purple-600 text-white flex items-center justify-center font-bold">
                {profile?.username?.[0]?.toUpperCase() || "?"}
              </div>
            )}
            <div className="text-left">
              <div>{loadingProfile ? "Loading..." : profile?.username || "Anonymous"}</div>
              <div className="text-xs opacity-70">PROFILE</div>
            </div>
          </button>

          <button
            onClick={logout}
            className="mt-4 w-full border-2 border-current py-2 font-bold uppercase hover:bg-black hover:text-white transition"
          >
            LOGOUT
          </button>
        </div>
      </aside>


    </>
  )
}
