import { useState, useEffect } from "react"
import { useAuth } from "../../context/AuthContext"
import { useTheme } from "../../context/ThemeContext"

export default function FriendListForChat({ onSelectFriend }) {
    const { user } = useAuth()
    const { themeStyles } = useTheme()
    const [friends, setFriends] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (user?.access_token) {
            fetchFriends()
        }
    }, [user])

    async function fetchFriends() {
        try {
            setLoading(true)
            const response = await fetch("http://localhost:8000/api/friends", {
                headers: { Authorization: `Bearer ${user.access_token}` },
            })

            if (response.ok) {
                const data = await response.json()
                setFriends(data.friends || data || [])
            }
        } catch (error) {
            console.error("Failed to fetch friends:", error)
        } finally {
            setLoading(false)
        }
    }

    async function startConversation(friendId, friendName) {
        try {
            console.log("Starting conversation with:", friendId, friendName)
            // Create or get conversation with this friend
            const response = await fetch(
                `http://localhost:8000/api/chat/conversations/${friendId}`,
                {
                    method: "POST",
                    headers: { Authorization: `Bearer ${user.access_token}` },
                }
            )

            console.log("Start conversation response:", response.status)

            if (response.ok) {
                const conversation = await response.json()
                console.log("Conversation created:", conversation)
                // Call the parent handler with conversation ID and friend name
                onSelectFriend(conversation.id, friendName)
            } else {
                const errorText = await response.text()
                console.error("Failed to create conversation:", response.status, errorText)
            }
        } catch (error) {
            console.error("Failed to start conversation:", error)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className={themeStyles.accent}>Loading friends...</p>
            </div>
        )
    }

    return (
        <div className="h-full overflow-y-auto">
            <div className={`${themeStyles.secondbar} p-4 ${themeStyles.border} border-b`}>
                <h2 className={`text-xl font-bold ${themeStyles.text}`}>Select a Friend to Chat</h2>
            </div>

            <div className={`divide-y ${themeStyles.border}`}>
                {friends.length === 0 ? (
                    <div className={`p-8 text-center ${themeStyles.accent}`}>
                        <p className="mb-2">No friends yet!</p>
                        <p className="text-sm">Add friends first to start chatting.</p>
                    </div>
                ) : (
                    friends.map((friend) => (
                        <div
                            key={friend.friend_id}
                            onClick={() => startConversation(friend.friend_id, friend.name)}
                            className={`p-4 hover:${themeStyles.secondbar} cursor-pointer transition-colors ${themeStyles.text}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 ${themeStyles.accent.replace('text-', 'bg-')} text-white rounded-full flex items-center justify-center font-bold`}>
                                    {friend.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-semibold">{friend.name}</h3>
                                    <p className={`text-sm ${themeStyles.accent}`}>Click to start chatting</p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
