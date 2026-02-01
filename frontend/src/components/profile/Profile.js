import { useAuth } from "../../context/AuthContext"
import { useTheme } from "../../context/ThemeContext"
import { useEffect, useState, useRef } from "react"

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
        setProfile(data)
        setFormData({
          username: data?.username || "",
          email: user?.email || "",
          bio: data?.bio || "",
          avatar_url: data?.avatar_url || "",
        })
        setPhotoPreview(data?.avatar_url || null)
      } catch (err) {
        setError(err.message)
        console.error("Profile fetch error:", err)
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
        <p className={`text-lg ${themeStyles.text}`}>Loading profile...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${themeStyles.bg}`}>
        <p className={`text-lg text-red-500`}>Error: {error}</p>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${themeStyles.bg} ${themeStyles.text}`}>
      <div className="max-w-4xl mx-auto p-6">
        {/* Success Message */}
        {updateSuccess && (
          <div className="mb-4 p-4 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 rounded-lg">
            ✓ Profile updated successfully!
          </div>
        )}

        {/* Profile Header */}
        <div className={`${themeStyles.cardBg} ${themeStyles.border} rounded-lg p-8 mb-6 shadow-lg`}>
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              {/* Avatar with Upload */}
              <div className="relative group">
                <img
                  src={photoPreview || profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.username || 'User'}&size=200&background=random`}
                  alt="avatar"
                  className="w-32 h-32 rounded-full border-4 border-gray-200 dark:border-gray-700 object-cover shadow-lg"
                />
                <button
                  onClick={handlePhotoClick}
                  disabled={uploadingPhoto}
                  className="absolute inset-0 w-32 h-32 rounded-full bg-black bg-opacity-0 hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer"
                >
                  {uploadingPhoto ? (
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  ) : (
                    <span className="text-white text-3xl">📷</span>
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
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  {profile?.username || "User"} {profile?.last_name || ""}
                </h1>
                {!isEditing ? (
                  <>
                    <p className="opacity-70">{profile?.username || user?.email}</p>
                    <p className="text-sm opacity-60 mt-2">{profile?.bio || "No bio added yet"}</p>
                  </>
                ) : (
                  <div className="mt-2 space-y-2">
                    <input
                      type="text"
                      name="bio"
                      value={formData.bio}
                      onChange={handleInputChange}
                      placeholder="Add a bio..."
                      className="w-full px-3 py-1 rounded text-sm bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600"
                    />
                  </div>
                )}
              </div>
            </div>
            <div>
              {!isEditing ? (
                <button
                  onClick={handleEditClick}
                  className={`px-6 py-2 rounded-lg font-medium transition-all ${themeStyles.button} hover:scale-105`}
                >
                  ✏️ Edit Profile
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleCancel}
                    disabled={updating}
                    className="px-4 py-2 rounded-lg font-medium bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateProfile}
                    disabled={updating}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${themeStyles.button} disabled:opacity-50`}
                  >
                    {updating ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {updateError && (
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100 rounded-lg">
            ✗ Error: {updateError}
          </div>
        )}

        {/* Profile Details */}
        {!isEditing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Info */}
            <div className={`${themeStyles.cardBg} ${themeStyles.border} rounded-lg p-6 shadow-lg`}>
              <h2 className="text-xl font-bold mb-4">Personal Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm opacity-70">Email</label>
                  <p className="font-medium">{user.email}</p>
                </div>
                <div>
                  <label className="text-sm opacity-70">Username</label>
                  <p className="font-medium">{profile?.username || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm opacity-70">Phone</label>
                  <p className="font-medium">{profile?.phone || "Not provided"}</p>
                </div>
                <div>
                  <label className="text-sm opacity-70">Location</label>
                  <p className="font-medium">{profile?.location || "Not provided"}</p>
                </div>
              </div>
            </div>

            {/* Account Info */}
            <div className={`${themeStyles.cardBg} ${themeStyles.border} rounded-lg p-6 shadow-lg`}>
              <h2 className="text-xl font-bold mb-4">Account Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm opacity-70">Account Created</label>
                  <p className="font-medium">
                    {profile?.created_at
                      ? new Date(profile.created_at).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm opacity-70">Last Updated</label>
                  <p className="font-medium">
                    {profile?.updated_at
                      ? new Date(profile.updated_at).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm opacity-70">Role</label>
                  <p className="font-medium">{profile?.role || "User"}</p>
                </div>
                <div>
                  <label className="text-sm opacity-70">Status</label>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                    {profile?.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Edit Mode Form */
          <div className={`${themeStyles.cardBg} ${themeStyles.border} rounded-lg p-6 shadow-lg`}>
            <h2 className="text-xl font-bold mb-6">Edit Profile Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Username</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Bio</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Tell us about yourself..."
                  rows="4"
                />
              </div>
            </div>
          </div>
        )}

        {/* Full Profile Data */}
        {profile && (
          <div className={`${themeStyles.cardBg} ${themeStyles.border} rounded-lg p-6 shadow-lg mt-6`}>
            <h2 className="text-xl font-bold mb-4">Full Profile Data</h2>
            <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto text-xs">
              {JSON.stringify(profile, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
