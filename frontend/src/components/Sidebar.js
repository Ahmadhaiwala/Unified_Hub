import { useState } from "react"
import { useAuth } from "../context/AuthContext"
import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Home, Users, MessageCircle, CheckSquare, Search, LogOut, User } from "lucide-react"

const menu = [
  {
    label: "Home",
    icon: Home,
    path: "/",
  },
  {
    label: "Friends",
    icon: Users,
    path: "/friends",
  },
  {
    label: "Chat",
    icon: MessageCircle,
    path: "/chat",
  },
  {
    label: "Tasks",
    icon: CheckSquare,
    path: "/tasks",
  },
  
  {
    label: "Discover Users",
    icon: Search,
    path: "/users",
  },
]

export default function Sidebar({ onNavigate }) {
  const { logout } = useAuth()
  const [open, setOpen] = useState(false)
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
    bg-gray-900
    text-white
  `}
      >
        {/* HEADER */}
        <div className="p-6 flex items-center gap-3">
          <img src="/logo-unified.svg" alt="Unified Hub" className="w-10 h-10" />
          <div className="text-xl font-bold">
            Unified Hub
          </div>
        </div>

        {/* MENU */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menu.map((item, idx) => {
            const IconComponent = item.icon
            return (
              <button
                key={idx}
                onClick={() => handleNavigation(item.path)}
                className={`
          w-full flex items-center gap-3
          px-4 py-3
          rounded-lg
          font-medium text-sm
          bg-gray-800
          hover:bg-blue-600
          text-white
          transition-all duration-200
        `}
              >
                <IconComponent size={20} />
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* FOOTER PROFILE */}
        <div className="p-3 space-y-2">
          <button
            onClick={() => handleNavigation("/profile")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg font-medium hover:bg-gray-800 transition-all text-white"
          >
            {profile?.avatar_url ? (
              <img
                className="w-10 h-10 rounded-full object-cover"
                src={profile.avatar_url}
                alt="avatar"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                <User size={20} />
              </div>
            )}
            <div className="text-left flex-1">
              <div className="font-medium">{loadingProfile ? "Loading..." : profile?.username || "Anonymous"}</div>
              <div className="text-xs opacity-60">View Profile</div>
            </div>
          </button>

          <button
            onClick={logout}
            className="w-full px-4 py-2 rounded-lg font-medium bg-red-600 hover:bg-red-700 text-white transition-all flex items-center justify-center gap-2"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>


    </>
  )
}
