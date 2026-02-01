import { useState, useEffect } from "react"
import { useAuth } from "../../context/AuthContext"
import { useTheme } from "../../context/ThemeContext"

export default function ConversationList({ onSelectConversation, selectedConversationId, refreshTrigger }) {
    const { user } = useAuth()
    const { themeStyles } = useTheme()
    const [conversations, setConversations] = useState([])

    useEffect(() => {
        if (user?.access_token) {
            fetchConversations()
            // Poll for conversation list updates every 5 seconds
            const interval = setInterval(fetchConversations, 5000)
            return () => clearInterval(interval)
        }
    }, [user, refreshTrigger])

    async function fetchConversations() {
        if (!user?.access_token) return

        try {
            console.log("Fetching conversations...")
            const response = await fetch("http://localhost:8000/api/chat/conversations", {
                headers: { Authorization: `Bearer ${user.access_token}` },
            })

            console.log("Response status:", response.status)

            if (response.ok) {
                const data = await response.json()
                console.log("Conversations data:", data)
                console.log("Conversations array:", data.conversations)
                console.log("Conversations length:", data.conversations?.length)
                setConversations(data.conversations || [])
            } else {
                const errorText = await response.text()
                console.error("Failed to fetch conversations:", response.status, errorText)
            }
        } catch (error) {
            console.error("Failed to fetch conversations:", error)
        }
    }

    return (
        <div className={`${themeStyles.border} border-r h-full overflow-y-auto`}>
            <div className={`${themeStyles.secondbar} p-4 ${themeStyles.border} border-b`}>
                <h2 className={`text-xl font-bold ${themeStyles.text}`}>Messages</h2>
                <p className={`text-xs ${themeStyles.accent}`}>({conversations.length} conversations)</p>
            </div>

            <div className={`divide-y ${themeStyles.border}`}>
                {conversations.length === 0 ? (
                    <div className={`p-4 ${themeStyles.accent} text-center`}>
                        <p>No conversations yet.</p>
                        <p className="text-sm mt-2">Start chatting with a friend!</p>
                    </div>
                ) : (
                    conversations.map((conv) => (
                        <div
                            key={conv.id}
                            onClick={() => onSelectConversation(conv.id, conv.participant.username)}
                            className={`p-4 cursor-pointer transition-colors ${themeStyles.text} ${selectedConversationId === conv.id
                                    ? `${themeStyles.secondbar} border-l-4 ${themeStyles.accent.replace('text-', 'border-')}`
                                    : `hover:${themeStyles.secondbar}`
                                }`}
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold">{conv.participant.username}</h3>
                                        {conv.unread_count > 0 && (
                                            <span className={`${themeStyles.accent.replace('text-', 'bg-')} text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center`}>
                                                {conv.unread_count}
                                            </span>
                                        )}
                                    </div>
                                    {conv.last_message && (
                                        <p className={`text-sm ${themeStyles.accent} truncate mt-1`}>
                                            {conv.last_message.content}
                                        </p>
                                    )}
                                </div>
                                {conv.last_message && (
                                    <span className={`text-xs ${themeStyles.accent} ml-2`}>
                                        {new Date(conv.last_message.created_at).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
