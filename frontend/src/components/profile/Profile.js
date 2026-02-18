import { useAuth } from "../../context/AuthContext"
import { useTheme } from "../../context/ThemeContext"
import { useEffect, useState, useRef } from "react"
import CompactHeatmap from "../tasks/CompactHeatmap"

export default function Profile() {
  const { user } = useAuth()
  const { themeStyles } = useTheme()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [updateError, setUpdateError] = useState(null)
  const [updateSuccess, setUpdateSuccess] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [groupCount, setGroupCount] = useState(0)
  const [friendCount, setFriendCount] = useState(0)
  const fileInputRef = useRef(null)
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    bio: "",
    avatar_url: "",
  })

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.access_token) {
        setError("No access token available")
        setLoading(false)
        return
      }

      try {
        // Fetch profile
        console.log("🔍 Fetching profile data...")
        const response = await fetch("http://localhost:8000/api/profile", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.access_token}`,
          },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch profile")
        }

        const data = await response.json()
        console.log("✅ Profile data received:", data)
        setProfile(data)
        setFormData({
          username: data?.username || "",
          email: user?.email || data?.email || "",
          bio: data?.bio || "",
          avatar_url: data?.avatar_url || "",
        })
        setPhotoPreview(data?.avatar_url || null)

        // Fetch groups count
        console.log("🔍 Fetching groups...")
        const groupsRes = await fetch("http://localhost:8000/api/chatgroups", {
          headers: { Authorization: `Bearer ${user.access_token}` }
        })
        console.log("Groups response status:", groupsRes.status)
        if (groupsRes.ok) {
          const groupsData = await groupsRes.json()
          console.log("✅ Groups data:", groupsData)
          // API returns { count: X, groups: [...] }
          const count = groupsData.count || groupsData.groups?.length || 0
          console.log("📊 Groups count:", count)
          setGroupCount(count)
        } else {
          console.error("❌ Failed to fetch groups:", groupsRes.status)
        }

        // Fetch friends count
        console.log("🔍 Fetching friends...")
        const friendsRes = await fetch("http://localhost:8000/api/friends", {
          headers: { Authorization: `Bearer ${user.access_token}` }
        })
        console.log("Friends response status:", friendsRes.status)
        if (friendsRes.ok) {
          const friendsData = await friendsRes.json()
          console.log("✅ Friends data:", friendsData)
          // API returns array of friends (already accepted)
          const count = friendsData.length || 0
          console.log("📊 Friends count:", count)
          setFriendCount(count)
        } else {
          console.error("❌ Failed to fetch friends:", friendsRes.status)
        }
      } catch (err) {
        setError(err.message)
        console.error("❌ Profile fetch error:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [user?.access_token])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleEditClick = () => {
    setIsEditing(true)
    setUpdateError(null)
    setUpdateSuccess(false)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setFormData({
      username: profile?.username || "",
      email: user?.email || "",
      bio: profile?.bio || "",
      avatar_url: profile?.avatar_url || "",
    })
    setPhotoPreview(profile?.avatar_url || null)
    setUpdateError(null)
    setUpdateSuccess(false)
  }

  const handlePhotoClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUpdateError('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUpdateError('Image size should be less than 5MB')
      return
    }

    setUploadingPhoto(true)
    setUpdateError(null)

    try {
      // Convert to base64
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result
        setPhotoPreview(base64String)
        setFormData(prev => ({
          ...prev,
          avatar_url: base64String
        }))
        setUploadingPhoto(false)
      }
      reader.onerror = () => {
        setUpdateError('Failed to read image file')
        setUploadingPhoto(false)
      }
      reader.readAsDataURL(file)
    } catch (err) {
      setUpdateError('Failed to process image')
      setUploadingPhoto(false)
    }
  }

  const handleUpdateProfile = async () => {
    if (!user?.access_token) {
      setUpdateError("No access token available")
      return
    }

    setUpdating(true)
    setUpdateError(null)

    try {
      const response = await fetch("http://localhost:8000/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.access_token}`,
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          bio: formData.bio,
          avatar_url: formData.avatar_url,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Failed to update profile")
      }

      const updatedData = await response.json()
      setProfile(updatedData)
      setIsEditing(false)
      setUpdateSuccess(true)
      setTimeout(() => setUpdateSuccess(false), 3000)
    } catch (err) {
      setUpdateError(err.message)
      console.error("Profile update error:", err)
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${themeStyles.bg}`}>
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-4">
            <div className="absolute inset-0 border-4 border-blue-200 dark:border-blue-900 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className={`text-lg font-bold ${themeStyles.text}`}>Loading your profile...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${themeStyles.bg}`}>
        <div className={`${themeStyles.cardBg} border-4 border-red-500 p-8 rounded-xl text-center`}>
          <div className="text-6xl mb-4">❌</div>
          <p className={`text-lg text-red-500 font-bold`}>Error: {error}</p>
        </div>
      </div>
    )
  }

  const accountAge = profile?.created_at
    ? Math.floor((new Date() - new Date(profile.created_at)) / (1000 * 60 * 60 * 24))
    : 0

  return (
    <div className={`min-h-screen ${themeStyles.bg} ${themeStyles.text} p-6`}>
      <div className="max-w-7xl mx-auto">

        {/* Success Message with Animation */}
        {updateSuccess && (
          <div className="mb-6 p-4 bg-green-600 text-white rounded-xl font-bold flex items-center gap-3 animate-fade-in shadow-lg">
            <span className="text-2xl animate-bounce">✓</span>
            <span>Profile updated successfully!</span>
          </div>
        )}

        {/* Error Message */}
        {updateError && (
          <div className="mb-6 p-4 bg-red-600 text-white rounded-xl font-bold flex items-center gap-3 animate-fade-in shadow-lg">
            <span className="text-2xl">✗</span>
            <span>Error: {updateError}</span>
          </div>
        )}

        {/* Profile Header Card with Animation */}
        <div className={`${themeStyles.cardBg} border-4 ${themeStyles.border} rounded-2xl p-8 mb-8 shadow-2xl animate-slide-up transition-all duration-300`}>
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">

            {/* Avatar Section with Cool Hover Effect */}
            <div className="relative group">
              <div className="relative">
                <img
                  src={photoPreview || profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.username || 'User'}&size=200&background=random`}
                  alt="avatar"
                  className="w-40 h-40 rounded-full border-4 border-gray-300 dark:border-gray-700 object-cover shadow-2xl transform group-hover:scale-105 transition-transform duration-300"
                />
                <button
                  onClick={handlePhotoClick}
                  disabled={uploadingPhoto}
                  className="absolute inset-0 w-40 h-40 rounded-full bg-black bg-opacity-0 hover:bg-opacity-60 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer"
                >
                  {uploadingPhoto ? (
                    <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-white"></div>
                  ) : (
                    <div className="text-center">
                      <span className="text-white text-4xl block mb-1">📷</span>
                      <span className="text-white text-xs font-bold">Change Photo</span>
                    </div>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className={`text-5xl font-black mb-2 ${themeStyles.text} animate-fade-in`}>
                {profile?.username || "User"}
              </h1>
              <p className="text-xl opacity-70 mb-1">{user?.email}</p>
              {!isEditing ? (
                <p className="text-lg opacity-80 mt-4 italic">
                  "{profile?.bio || "No bio added yet. Add one to tell others about yourself!"}"
                </p>
              ) : (
                <div className="mt-4">
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    placeholder="Tell us about yourself..."
                    className={`w-full px-4 py-3 border-2 ${themeStyles.border} ${themeStyles.cardBg} rounded-xl font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/50 transition-all`}
                    rows="3"
                  />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              {!isEditing ? (
                <button
                  onClick={handleEditClick}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl hover:scale-105 hover:shadow-lg transition-all duration-300 flex items-center gap-2"
                >
                  <span>✏️</span>
                  <span>Edit Profile</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={handleUpdateProfile}
                    disabled={updating}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl hover:scale-105 hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <span>{updating ? "⏳" : "💾"}</span>
                    <span>{updating ? "Saving..." : "Save Changes"}</span>
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={updating}
                    className="px-6 py-3 bg-gray-500 text-white font-bold rounded-xl hover:scale-105 hover:shadow-lg transition-all duration-300 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards with Animations */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Friends Count */}
          <div className={`${themeStyles.cardBg} border-4 ${themeStyles.border} rounded-2xl p-6 hover:scale-105 hover:shadow-xl transition-all duration-300 animate-slide-up cursor-pointer group`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-4xl group-hover:scale-125 transition-transform duration-300">👥</span>
              <div className="text-right">
                <p className="text-3xl font-black text-blue-600 dark:text-blue-400">
                  {friendCount}
                </p>
                <p className="text-xs font-bold uppercase opacity-70">Friends</p>
              </div>
            </div>
          </div>

          {/* Groups Count */}
          <div className={`${themeStyles.cardBg} border-4 ${themeStyles.border} rounded-2xl p-6 hover:scale-105 hover:shadow-xl transition-all duration-300 animate-slide-up cursor-pointer group`} style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-4xl group-hover:scale-125 transition-transform duration-300">💬</span>
              <div className="text-right">
                <p className="text-3xl font-black text-green-600 dark:text-green-400">
                  {groupCount}
                </p>
                <p className="text-xs font-bold uppercase opacity-70">Groups</p>
              </div>
            </div>
          </div>

          {/* Account Age */}
          <div className={`${themeStyles.cardBg} border-4 ${themeStyles.border} rounded-2xl p-6 hover:scale-105 hover:shadow-xl transition-all duration-300 animate-slide-up cursor-pointer group`} style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-4xl group-hover:scale-125 transition-transform duration-300">📅</span>
              <div className="text-right">
                <p className="text-3xl font-black text-blue-600 dark:text-blue-400">
                  {accountAge}
                </p>
                <p className="text-xs font-bold uppercase opacity-70">Days</p>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className={`${themeStyles.cardBg} border-4 ${themeStyles.border} rounded-2xl p-6 hover:scale-105 hover:shadow-xl transition-all duration-300 animate-slide-up cursor-pointer group`} style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-4xl group-hover:scale-125 transition-transform duration-300">✨</span>
              <div className="text-right">
                <p className="text-2xl font-black text-green-600 dark:text-green-400">
                  Active
                </p>
                <p className="text-xs font-bold uppercase opacity-70">Status</p>
              </div>
            </div>
          </div>
        </div>

        {/* Productivity Heatmap */}
        <div className="mb-8">
          <CompactHeatmap />
        </div>

        {/* Profile Details Section */}
        {!isEditing ? (
          <div className="mb-8">

            {/* Personal Information Card */}
            <div className={`${themeStyles.cardBg} border-4 ${themeStyles.border} rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 animate-fade-in`}>
              <h2 className="text-2xl font-black uppercase mb-6 flex items-center gap-2 border-b-4 border-current pb-3">
                <span>👤</span>
                <span>Personal Info</span>
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all">
                  <span className="text-2xl">📧</span>
                  <div>
                    <label className="text-sm font-bold uppercase opacity-70 block">Email</label>
                    <p className="font-medium text-lg">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all">
                  <span className="text-2xl">🏷️</span>
                  <div>
                    <label className="text-sm font-bold uppercase opacity-70 block">Username</label>
                    <p className="font-medium text-lg">{profile?.username || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all">
                  <span className="text-2xl">💭</span>
                  <div className="flex-1">
                    <label className="text-sm font-bold uppercase opacity-70 block">Bio</label>
                    <p className="font-medium italic">{profile?.bio || "No bio added"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Edit Mode Form */
          <div className={`${themeStyles.cardBg} border-4 ${themeStyles.border} rounded-2xl p-8 shadow-xl mb-8 animate-fade-in`}>
            <h2 className="text-3xl font-black uppercase mb-6 flex items-center gap-3 border-b-4 border-current pb-4">
              <span>✏️</span>
              <span>Edit Profile</span>
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold uppercase mb-3 opacity-70">Username</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border-2 ${themeStyles.border} ${themeStyles.cardBg} rounded-xl font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/50 transition-all`}
                  placeholder="Enter username"
                />
              </div>
              <div>
                <label className="block text-sm font-bold uppercase mb-3 opacity-70">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border-2 ${themeStyles.border} ${themeStyles.cardBg} rounded-xl font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/50 transition-all`}
                  placeholder="Enter email"
                />
              </div>
              <div>
                <label className="block text-sm font-bold uppercase mb-3 opacity-70">Bio</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border-2 ${themeStyles.border} ${themeStyles.cardBg} rounded-xl font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/50 transition-all`}
                  placeholder="Tell us about yourself..."
                  rows="4"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
        .animate-slide-up {
          animation: slide-up 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
