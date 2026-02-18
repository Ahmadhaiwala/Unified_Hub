import { useState, useEffect } from "react"
import { useAuth } from "../../context/AuthContext"
import { useTheme } from "../../context/ThemeContext"

export default function GroupChatList({ onSelectGroup, selectedGroupId, refreshTrigger }) {
    const { user } = useAuth()
    const { themeStyles } = useTheme()
    const [groups, setGroups] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (user?.access_token) {
            fetchGroups()
        }
    }, [user, refreshTrigger])

    async function fetchGroups() {
        if (!user?.access_token) return

        try {
            const response = await fetch("http://localhost:8000/api/chatgroups", {
                headers: { Authorization: `Bearer ${user.access_token}` },
            })

            if (response.ok) {
                const data = await response.json()
                setGroups(data.groups || [])
            } else {
                console.error("Failed to fetch groups")
            }
        } catch (error) {
            console.error("Error fetching groups:", error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className={`p-4 ${themeStyles.text}`}>
                Loading groups...
            </div>
        )
    }

    if (groups.length === 0) {
        return (
            <div className={`p-4 ${themeStyles.accent} text-center`}>
                No groups yet. Create one to get started!
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full overflow-y-auto">
            <div className={`p-4 ${themeStyles.secondbar} ${themeStyles.border} border-b`}>
                <h2 className={`text-xl font-bold ${themeStyles.text}`}>Groups</h2>
            </div>

            <div className="flex-1 overflow-y-auto">
                {groups.map((group) => (
                    <div
                        key={group.id}
                        onClick={() => onSelectGroup(group.id, group.name)}
                        className={`p-4 cursor-pointer border-b transition-colors ${selectedGroupId === group.id
                                ? themeStyles.secondbar
                                : themeStyles.cardBg
                            } ${themeStyles.border} hover:${themeStyles.secondbar}`}
                    >
                        <div className="flex justify-between items-start gap-3">
                            {/* Group Avatar */}
                            {group.avatar_url ? (
                                <img 
                                    src={group.avatar_url} 
                                    alt={group.name}
                                    className="w-12 h-12 rounded-full object-cover border-2 border-purple-500 flex-shrink-0"
                                />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center border-2 border-purple-500 flex-shrink-0">
                                    <span className="text-white text-lg font-bold">
                                        {group.name?.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            )}
                            
                            <div className="flex-1">
                                <h3 className={`font-semibold ${themeStyles.text}`}>
                                    {group.name}
                                </h3>
                                {group.description && (
                                    <p className={`text-sm ${themeStyles.accent} line-clamp-1`}>
                                        {group.description}
                                    </p>
                                )}
                                <p className={`text-xs ${themeStyles.accent} mt-1`}>
                                    {new Date(group.created_at).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
