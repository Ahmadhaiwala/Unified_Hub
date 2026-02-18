import { useAuth } from "../../context/AuthContext"
import { useTheme } from "../../context/ThemeContext"
import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import CompactHeatmap from "../tasks/CompactHeatmap"

export default function UserProfile() {
    const { userId } = useParams()
    const { user } = useAuth()
    const { themeStyles } = useTheme()
    const navigate = useNavigate()
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [sendingRequest, setSendingRequest] = useState(false)

    useEffect(() => {
        fetchUserProfile()
    }, [userId, user?.access_token])

    const fetchUserProfile = async () => {
        if (!user?.access_token || !userId) {
            setError("No access token or user ID available")
            setLoading(false)
            return
        }

        try {
            setLoading(true)
            // Fetch all users and find the specific one
            const response = await fetch("http://localhost:8000/api/users", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${user.access_token}`,
                },
            })

            if (!response.ok) {
                throw new Error("Failed to fetch user profile")
            }

            const users = await response.json()
            const userProfile = Array.isArray(users)
                ? users.find(u => u.id === userId)
                : users.users?.find(u => u.id === userId)

            if (!userProfile) {
                throw new Error("User not found")
            }

            setProfile(userProfile)
        } catch (err) {
            setError(err.message)
            console.error("User profile fetch error:", err)
        } finally {
            setLoading(false)
        }
    }

    const handleAddFriend = async () => {
        try {
            setSendingRequest(true)
            const response = await fetch(`http://localhost:8000/api/friends/${userId}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${user.access_token}`,
                },
            })

            if (response.ok) {
                alert("Friend request sent!")
            } else {
                alert("Failed to send friend request")
            }
        } catch (err) {
            console.error("Error sending friend request:", err)
            alert("Error sending friend request")
        } finally {
            setSendingRequest(false)
        }
    }

    const handleSendMessage = () => {
        // Navigate to chat with this user
        navigate(`/chat?userId=${userId}`)
    }

    const handleGoBack = () => {
        navigate(-1)
    }

    if (loading) {
        return (
            <div className={`flex items-center justify-center min-h-screen ${themeStyles.bg}`}>
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className={`text-lg ${themeStyles.text}`}>Loading profile...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className={`flex items-center justify-center min-h-screen ${themeStyles.bg}`}>
                <div className="text-center">
                    <p className="text-red-500 text-lg mb-4">Error: {error}</p>
                    <button
                        onClick={handleGoBack}
                        className={`px-6 py-2 rounded-lg font-medium ${themeStyles.button}`}
                    >
                        ← Go Back
                    </button>
                </div>
            </div>
        )
    }

    const isOwnProfile = user.user.id === userId

    return (
        <div className={`min-h-screen ${themeStyles.bg} ${themeStyles.text}`}>
            <div className="max-w-4xl mx-auto p-6">
                {/* Back Button */}
                <button
                    onClick={handleGoBack}
                    className="mb-6 flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity"
                >
                    <span>←</span>
                    <span>Back</span>
                </button>

                {/* Profile Header */}
                <div className={`${themeStyles.cardBg} ${themeStyles.border} rounded-lg p-8 mb-6 shadow-lg`}>
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                        {/* Avatar */}
                        <img
                            src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.username || 'User'}&size=200&background=random`}
                            alt={profile?.username}
                            className="w-40 h-40 rounded-full border-4 border-gray-200 dark:border-gray-700 object-cover shadow-lg"
                        />

                        {/* Profile Info */}
                        <div className="flex-1 text-center md:text-left">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                                <div>
                                    <h1 className="text-4xl font-bold mb-2">
                                        {profile?.username || "User"}
                                    </h1>
                                    {profile?.email && (
                                        <p className="text-lg opacity-70">{profile.email}</p>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                {!isOwnProfile && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleAddFriend}
                                            disabled={sendingRequest}
                                            className={`px-6 py-2 rounded-lg font-medium transition-all ${themeStyles.button} hover:scale-105 disabled:opacity-50`}
                                        >
                                            {sendingRequest ? "Sending..." : "➕ Add Friend"}
                                        </button>
                                        <button
                                            onClick={handleSendMessage}
                                            className="px-6 py-2 rounded-lg font-medium bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                                        >
                                            💬 Message
                                        </button>
                                    </div>
                                )}

                                {isOwnProfile && (
                                    <span className="inline-block px-4 py-2 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                                        ✨ This is you!
                                    </span>
                                )}
                            </div>

                            {/* Bio */}
                            {profile?.bio && (
                                <div className="mt-4">
                                    <h3 className="text-sm font-semibold opacity-70 mb-2">About</h3>
                                    <p className="text-base opacity-90">{profile.bio}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Additional Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Personal Info */}
                    <div className={`${themeStyles.cardBg} ${themeStyles.border} rounded-lg p-6 shadow-lg`}>
                        <h2 className="text-xl font-bold mb-4">Information</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm opacity-70">Username</label>
                                <p className="font-medium">{profile?.username || "N/A"}</p>
                            </div>
                            {profile?.phone && (
                                <div>
                                    <label className="text-sm opacity-70">Phone</label>
                                    <p className="font-medium">{profile.phone}</p>
                                </div>
                            )}
                            {profile?.location && (
                                <div>
                                    <label className="text-sm opacity-70">Location</label>
                                    <p className="font-medium">{profile.location}</p>
                                </div>
                            )}
                            <div>
                                <label className="text-sm opacity-70">Member Since</label>
                                <p className="font-medium">
                                    {profile?.created_at
                                        ? new Date(profile.created_at).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })
                                        : "N/A"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Activity / Stats */}
                    <div className={`${themeStyles.cardBg} ${themeStyles.border} rounded-lg p-6 shadow-lg`}>
                        <h2 className="text-xl font-bold mb-4">Activity</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm opacity-70">Status</label>
                                <span className="inline-block mt-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                                    {profile?.is_active ? "Active" : "Inactive"}
                                </span>
                            </div>
                            {profile?.role && (
                                <div>
                                    <label className="text-sm opacity-70">Role</label>
                                    <p className="font-medium capitalize">{profile.role}</p>
                                </div>
                            )}
                            <div>
                                <label className="text-sm opacity-70">Last Updated</label>
                                <p className="font-medium">
                                    {profile?.updated_at
                                        ? new Date(profile.updated_at).toLocaleDateString()
                                        : "N/A"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Productivity Heatmap */}
                <CompactHeatmap userId={userId} />
            </div>
        </div>
    )
}
