import { useAuth } from "../context/AuthContext"
import { useEffect, useState } from "react"
import { useTheme } from "../context/ThemeContext"
import { useNavigate } from "react-router-dom"

export default function Home() {
  const { user, loading } = useAuth()
  const { themeStyles } = useTheme()
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null)
  const [friends, setFriends] = useState([])
  const [groups, setGroups] = useState([])
  const [stats, setStats] = useState({
    friendsCount: 0,
    pendingRequests: 0,
    groupsCount: 0
  })

  useEffect(() => {
    if (user?.access_token) {
      fetchDashboardData()
    }
  }, [user?.access_token])

  const fetchDashboardData = async () => {
    try {
      // Fetch profile
      const profileRes = await fetch("http://localhost:8000/api/profile", {
        headers: { Authorization: `Bearer ${user.access_token}` }
      })
      if (profileRes.ok) {
        const profileData = await profileRes.json()
        setProfile(profileData)
      }

      // Fetch friends
      const friendsRes = await fetch("http://localhost:8000/api/friends", {
        headers: { Authorization: `Bearer ${user.access_token}` }
      })
      if (friendsRes.ok) {
        const friendsData = await friendsRes.json()
        setFriends(friendsData)
        // Friends API returns array of accepted friends (no status field)
        const friendsCount = friendsData.length || 0
        setStats(prev => ({ ...prev, friendsCount, pendingRequests: 0 }))
      }

      // Fetch groups
      const groupsRes = await fetch("http://localhost:8000/api/chatgroups", {
        headers: { Authorization: `Bearer ${user.access_token}` }
      })
      if (groupsRes.ok) {
        const groupsData = await groupsRes.json()
        // API returns { count: X, groups: [...] }
        const groupsList = groupsData.groups || []
        const groupsCount = groupsData.count || groupsList.length || 0
        setGroups(groupsList)
        setStats(prev => ({ ...prev, groupsCount }))
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err)
    }
  }

  if (loading) return <div className={`min-h-screen ${themeStyles.bg} flex items-center justify-center`}><p>Loading...</p></div>

  const quickActions = [
    { label: "Discover Users", icon: "🔍", path: "/users", color: "bg-purple-500" },
    { label: "My Friends", icon: "👥", path: "/friends", color: "bg-blue-500" },
    { label: "Start Chat", icon: "💬", path: "/chat", color: "bg-green-500" },
    { label: "My Profile", icon: "👤", path: "/profile", color: "bg-orange-500" },
  ]

  const pendingRequests = [] // Friends API returns accepted friends only, no pending requests

  return (
    <div className={`min-h-screen ${themeStyles.bg} ${themeStyles.text} p-6`}>
      <div className="max-w-7xl mx-auto">

        {/* Welcome Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <img src="/logo-unified.svg" alt="Unified Hub" className="w-16 h-16" />
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tight">
                Welcome Back{profile?.username ? `, ${profile.username}` : ''}!
              </h1>
              <p className="text-lg opacity-70 mt-1">Here's what's happening in your hub</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className={`${themeStyles.cardBg} border-4 ${themeStyles.border} p-6 hover:scale-105 transition-transform cursor-pointer`} onClick={() => navigate('/friends')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold uppercase opacity-70 mb-1">Friends</p>
                <p className="text-4xl font-black">{stats.friendsCount}</p>
              </div>
              <div className="text-5xl">👥</div>
            </div>
          </div>

          <div className={`${themeStyles.cardBg} border-4 ${themeStyles.border} p-6 hover:scale-105 transition-transform cursor-pointer`} onClick={() => navigate('/friends')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold uppercase opacity-70 mb-1">Pending Requests</p>
                <p className="text-4xl font-black">{stats.pendingRequests}</p>
              </div>
              <div className="text-5xl">📬</div>
            </div>
          </div>

          <div className={`${themeStyles.cardBg} border-4 ${themeStyles.border} p-6 hover:scale-105 transition-transform cursor-pointer`} onClick={() => navigate('/chat')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold uppercase opacity-70 mb-1">Groups</p>
                <p className="text-4xl font-black">{stats.groupsCount}</p>
              </div>
              <div className="text-5xl">💬</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Main Content - Left Column */}
          <div className="lg:col-span-2 space-y-8">

            {/* Pending Friend Requests */}
            {pendingRequests.length > 0 && (
              <div className={`${themeStyles.cardBg} border-4 ${themeStyles.border} p-6`}>
                <h2 className="text-2xl font-black uppercase mb-4 flex items-center gap-2">
                  <span>📬</span> Friend Requests
                </h2>
                <div className="space-y-3">
                  {pendingRequests.slice(0, 3).map((request) => (
                    <div key={request.id} className={`border-2 ${themeStyles.border} p-4 flex items-center justify-between`}>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-xl">
                          {request.sender?.username?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-bold">{request.sender?.username || 'User'}</p>
                          <p className="text-sm opacity-70">Wants to be your friend</p>
                        </div>
                      </div>
                      <button className={`px-4 py-2 border-2 ${themeStyles.border} font-bold hover:bg-green-500 hover:text-white transition-all`}>
                        Accept
                      </button>
                    </div>
                  ))}
                  {pendingRequests.length > 3 && (
                    <button
                      onClick={() => navigate('/friends')}
                      className={`w-full py-2 border-2 ${themeStyles.border} font-bold hover:bg-gray-800 hover:text-white transition-all`}
                    >
                      View All {pendingRequests.length} Requests
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Recent Groups */}
            <div className={`${themeStyles.cardBg} border-4 ${themeStyles.border} p-6`}>
              <h2 className="text-2xl font-black uppercase mb-4 flex items-center gap-2">
                <span>💬</span> Your Groups
              </h2>
              {groups.length > 0 ? (
                <div className="space-y-3">
                  {groups.slice(0, 4).map((group) => (
                    <div
                      key={group.id}
                      className={`border-2 ${themeStyles.border} p-4 hover:bg-gray-800 dark:hover:bg-gray-800 hover:text-white cursor-pointer transition-all`}
                      onClick={() => navigate('/chat')}
                    >
                      <p className="font-bold text-lg">{group.name}</p>
                      <p className="text-sm opacity-70">{group.description || 'No description'}</p>
                    </div>
                  ))}
                  {groups.length > 4 && (
                    <button
                      onClick={() => navigate('/chat')}
                      className={`w-full py-2 border-2 ${themeStyles.border} font-bold hover:bg-gray-800 hover:text-white transition-all`}
                    >
                      View All {groups.length} Groups
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 opacity-70">
                  <p className="mb-4">You're not in any groups yet</p>
                  <button
                    onClick={() => navigate('/chat')}
                    className={`px-6 py-3 border-2 ${themeStyles.border} font-bold hover:bg-purple-600 hover:text-white transition-all`}
                  >
                    Create Your First Group
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Right Column */}
          <div className="space-y-8">

            {/* Quick Actions */}
            <div className={`${themeStyles.cardBg} border-4 ${themeStyles.border} p-6`}>
              <h2 className="text-2xl font-black uppercase mb-4">Quick Actions</h2>
              <div className="space-y-3">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => navigate(action.path)}
                    className={`w-full border-2 ${themeStyles.border} p-4 font-bold hover:bg-gray-800 hover:text-white transition-all flex items-center gap-3`}
                  >
                    <span className="text-2xl">{action.icon}</span>
                    <span>{action.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Activity Feed Placeholder */}
            <div className={`${themeStyles.cardBg} border-4 ${themeStyles.border} p-6`}>
              <h2 className="text-2xl font-black uppercase mb-4">Recent Activity</h2>
              <div className="space-y-4 opacity-70 text-sm">
                <div className="flex gap-3">
                  <span>✨</span>
                  <p>Welcome to Unified Hub! Start by discovering users or creating a group.</p>
                </div>
                <div className="flex gap-3">
                  <span>🎯</span>
                  <p>Connect with friends to collaborate on assignments and projects.</p>
                </div>
                <div className="flex gap-3">
                  <span>💡</span>
                  <p>Use the AI chat feature to get help with your questions.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
