import { useEffect, useState } from "react"
import { useAuth } from "../../context/AuthContext"
import { useTheme } from "../../context/ThemeContext"
import { useNavigate } from "react-router-dom"

export default function Userls() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const { user } = useAuth()
  const { themeStyles } = useTheme()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user?.access_token) return
    getAllUsers()
  }, [user])

  async function getAllUsers() {
    try {
      setLoading(true)
      const response = await fetch("http://localhost:8000/api/users", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.access_token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch users")
      }

      const data = await response.json()
      setUsers(Array.isArray(data) ? data : data.users)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const viewprofile = (userid) => {
    navigate(`/users/${userid}`)
  }

  const addfriend = async (userid) => {
    try {
      const response = await fetch(`http://localhost:8000/api/friends/${userid}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.access_token}`,
        },
      })
      if (response.ok) {
        console.log("Friend request sent to user ID:", userid)
        alert("Friend request sent!")
      } else {
        console.error("Failed to send friend request to user ID:", userid)
        alert("Failed to send friend request")
      }
    } catch (err) {
      console.error("Error sending friend request:", err)
      alert("Error sending friend request")
    }
  }

  // Filter users based on search query
  const filteredUsers = users.filter((u) => {
    const query = searchQuery.toLowerCase()
    return (
      u.username?.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query) ||
      u.bio?.toLowerCase().includes(query)
    )
  })

  if (loading) {
    return (
      <div className={`min-h-screen ${themeStyles.bg} ${themeStyles.text} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-lg">Loading users...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`min-h-screen ${themeStyles.bg} ${themeStyles.text} flex items-center justify-center`}>
        <div className="text-center">
          <p className="text-red-500 text-lg">Error: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${themeStyles.bg} ${themeStyles.text} p-6`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Discover Users</h1>
          <p className="opacity-70">Connect with other members of the community</p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-2xl">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="🔍 Search by username, email, or bio..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full px-4 py-3 border-2 ${themeStyles.border} ${themeStyles.cardBg} ${themeStyles.text} font-medium focus:outline-none focus:ring-2 focus:ring-purple-500`}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
            {searchQuery && (
              <p className="mt-2 text-sm opacity-70 font-medium">
                Found {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>

        {/* User Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((u) => (
            <div
              key={u.id}
              className={`${themeStyles.cardBg} ${themeStyles.border} rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1`}
            >
              {/* Avatar */}
              <div className="flex flex-col items-center mb-4">
                <img
                  src={u.avatar_url || `https://ui-avatars.com/api/?name=${u.username || 'User'}&size=200&background=random`}
                  alt={u.username}
                  className="w-32 h-32 rounded-full border-4 border-gray-200 dark:border-gray-700 object-cover shadow-lg mb-4"
                />
                <h2 className="text-2xl font-bold text-center">{u.username || "Anonymous"}</h2>
                {u.email && (
                  <p className="text-sm opacity-60 text-center mt-1">{u.email}</p>
                )}
              </div>

              {/* Bio */}
              {u.bio && (
                <div className="mb-4">
                  <p className="text-sm opacity-80 text-center line-clamp-3">
                    {u.bio}
                  </p>
                </div>
              )}

              {/* Metadata */}
              <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-center gap-2 text-sm opacity-60">
                  <span>📅</span>
                  <span>Joined {new Date(u.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Actions */}
              {user.user.id !== u.id && (
                <div className="flex gap-2">
                  <button
                    onClick={() => viewprofile(u.id)}
                    className="flex-1 px-4 py-2 rounded-lg font-medium bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                  >
                    👤 View Profile
                  </button>
                  <button
                    onClick={() => addfriend(u.id)}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${themeStyles.button} hover:scale-105`}
                  >
                    ➕ Add Friend
                  </button>
                </div>
              )}

              {/* Current User Badge */}
              {user.user.id === u.id && (
                <div className="text-center">
                  <span className="inline-block px-4 py-2 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                    ✨ That's You!
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredUsers.length === 0 && !searchQuery && (
          <div className="text-center py-12">
            <p className="text-xl opacity-60">No users found</p>
          </div>
        )}

        {/* Empty Search State */}
        {filteredUsers.length === 0 && searchQuery && (
          <div className="text-center py-12">
            <p className="text-xl opacity-60 mb-2">No users match "{searchQuery}"</p>
            <button
              onClick={() => setSearchQuery("")}
              className={`px-4 py-2 border-2 ${themeStyles.border} font-bold hover:bg-gray-100 dark:hover:bg-gray-800 transition-all`}
            >
              Clear Search
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
