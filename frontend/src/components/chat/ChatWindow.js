import { useState, useEffect, useRef } from "react"
import { useAuth } from "../../context/AuthContext"
import { useTheme } from "../../context/ThemeContext"
import { saveConversationTitle, getConversationTitle } from "../../utils/localStorageUtils"

export default function ChatWindow({ conversationId, friendName, onMessageSent }) {
    const { user } = useAuth()
    const { themeStyles } = useTheme()
    const [messages, setMessages] = useState([])
    const [newMessage, setNewMessage] = useState("")
    const [loading, setLoading] = useState(false)
    const [connected, setConnected] = useState(false)
    const [displayName, setDisplayName] = useState(friendName || "Loading...")
    const [hasMore, setHasMore] = useState(false)
    const [loadingMore, setLoadingMore] = useState(false)
    const [totalCount, setTotalCount] = useState(0)
    const [editingMessageId, setEditingMessageId] = useState(null)
    const [editContent, setEditContent] = useState("")
    const messagesEndRef = useRef(null)
    const wsRef = useRef(null)

    useEffect(() => {
        if (conversationId && user?.access_token) {
            // Try to load cached title first
            const cachedTitle = getConversationTitle(conversationId)
            if (cachedTitle) {
                setDisplayName(cachedTitle)
            } else if (friendName) {
                setDisplayName(friendName)
                saveConversationTitle(conversationId, friendName, 'direct')
            }
            
            fetchMessages()
            fetchConversationTitle()
            connectWebSocket()
        }

        return () => {
            if (wsRef.current) {
                wsRef.current.close()
            }
        }
    }, [conversationId, user])

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    function connectWebSocket() {
        if (wsRef.current) {
            wsRef.current.close()
        }

        const ws = new WebSocket(
            `ws://localhost:8000/api/ws/chat/${user.access_token}`
        )

        ws.onopen = () => {
            console.log("WebSocket connected")
            setConnected(true)
        }

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data)
            console.log("WebSocket message received:", data)

            if (data.type === "message" && data.message.conversation_id === conversationId) {
                setMessages((prev) => [...prev, data.message])
                if (onMessageSent) {
                    onMessageSent()
                }
            } else if (data.type === "message_deleted") {
                setMessages((prev) => prev.filter(m => m.id !== data.message_id))
            } else if (data.type === "message_updated") {
                setMessages((prev) => prev.map(m => 
                    m.id === data.message.id ? data.message : m
                ))
            }
        }

        ws.onerror = (error) => {
            console.error("WebSocket error:", error)
            setConnected(false)
        }

        ws.onclose = () => {
            console.log("WebSocket disconnected")
            setConnected(false)
            // Attempt to reconnect after 3 seconds
            setTimeout(() => {
                if (conversationId && user?.access_token) {
                    connectWebSocket()
                }
            }, 3000)
        }

        wsRef.current = ws
    }

    const handleDeleteConversation = async () => {
        if (!window.confirm("Delete this entire conversation? This cannot be undone.")) {
            return
        }

        try {
            const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000"
            const response = await fetch(`${API_URL}/api/chat/conversations/${conversationId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${user.access_token}` }
            })

            if (!response.ok) throw new Error('Failed to delete conversation')

            localStorage.removeItem(`conv_title_${conversationId}`)
            alert("Conversation deleted successfully")
            window.location.reload()
        } catch (error) {
            console.error("Error deleting conversation:", error)
            alert("Failed to delete conversation")
        }
    }

    const handleDeleteMessage = async (messageId) => {
        if (!window.confirm("Delete this message?")) return

        try {
            const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000"
            const response = await fetch(`${API_URL}/api/chat/messages/${messageId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${user.access_token}` }
            })

            if (!response.ok) throw new Error('Failed to delete message')
            setMessages(prev => prev.filter(m => m.id !== messageId))
        } catch (error) {
            console.error("Error deleting message:", error)
            alert("Failed to delete message")
        }
    }

    const startEdit = (message) => {
        setEditingMessageId(message.id)
        setEditContent(message.content)
    }

    const cancelEdit = () => {
        setEditingMessageId(null)
        setEditContent("")
    }

    const handleUpdateMessage = async (messageId) => {
        if (!editContent.trim()) {
            alert("Message cannot be empty")
            return
        }

        try {
            const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000"
            const response = await fetch(`${API_URL}/api/chat/messages/${messageId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${user.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content: editContent })
            })

            if (!response.ok) throw new Error('Failed to update message')

            const result = await response.json()
            setMessages(prev => prev.map(m => m.id === messageId ? result.message : m))
            cancelEdit()
        } catch (error) {
            console.error("Error updating message:", error)
            alert("Failed to update message")
        }
    }

    async function fetchConversationTitle() {
        if (!conversationId || !user?.access_token) return

        try {
            const response = await fetch(
                `http://localhost:8000/api/chat/conversations/${conversationId}/title`,
                {
                    headers: { Authorization: `Bearer ${user.access_token}` },
                }
            )

            if (response.ok) {
                const data = await response.json()
                setDisplayName(data.title)
                saveConversationTitle(conversationId, data.title, 'direct')
            }
        } catch (error) {
            console.error("Failed to fetch conversation title:", error)
        }
    }

    async function fetchMessages(loadMore = false) {
        if (!conversationId || !user?.access_token) return

        if (loadMore) {
            setLoadingMore(true)
        }

        try {
            const offset = loadMore ? messages.length : 0
            const response = await fetch(
                `http://localhost:8000/api/chat/conversations/${conversationId}/messages?limit=20&offset=${offset}`,
                {
                    headers: { Authorization: `Bearer ${user.access_token}` },
                }
            )

            if (response.ok) {
                const data = await response.json()
                
                if (loadMore) {
                    setMessages((prev) => [...data.messages, ...prev])
                } else {
                    setMessages(data.messages)
                }
                
                setTotalCount(data.total_count)
                setHasMore(data.has_more)
                
                if (!loadMore) {
                    markAsRead()
                }
            }
        } catch (error) {
            console.error("Failed to fetch messages:", error)
        } finally {
            if (loadMore) {
                setLoadingMore(false)
            }
        }
    }

    async function markAsRead() {
        if (!conversationId || !user?.access_token) return

        try {
            await fetch(
                `http://localhost:8000/api/chat/conversations/${conversationId}/read`,
                {
                    method: "PUT",
                    headers: { Authorization: `Bearer ${user.access_token}` },
                }
            )
        } catch (error) {
            console.error("Failed to mark as read:", error)
        }
    }

    function sendMessage(e) {
        e.preventDefault()
        if (!newMessage.trim() || !conversationId || loading || !connected) return

        setLoading(true)
        try {
            // Send via WebSocket
            wsRef.current.send(
                JSON.stringify({
                    action: "send_message",
                    conversation_id: conversationId,
                    content: newMessage,
                })
            )
            setNewMessage("")

            // Notify parent that message was sent to refresh conversation list
            if (onMessageSent) {
                onMessageSent()
            }
        } catch (error) {
            console.error("Failed to send message:", error)
        } finally {
            setLoading(false)
        }
    }

    if (!conversationId) {
        return (
            <div className={`flex items-center justify-center h-full ${themeStyles.accent}`}>
                Select a conversation to start chatting
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className={`${themeStyles.secondbar} p-4 ${themeStyles.border} border-b flex justify-between items-center`}>
                <h2 className={`text-xl font-bold ${themeStyles.text}`}>{displayName}</h2>
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleDeleteConversation}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                        title="Delete conversation"
                    >
                        🗑️ Delete
                    </button>
                    <div className="flex items-center gap-2">
                        <div
                            className={`w-3 h-3 rounded-full ${connected ? "bg-green-500" : "bg-red-500"
                                }`}
                            title={connected ? "Connected" : "Disconnected"}
                        />
                        <span className={`text-sm ${themeStyles.accent}`}>
                            {connected ? "Online" : "Offline"}
                        </span>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className={`flex-1 overflow-y-auto p-4 space-y-3 ${themeStyles.cardBg}`}>
                {/* Load More Button */}
                {hasMore && (
                    <div className="flex justify-center mb-4">
                        <button
                            onClick={() => fetchMessages(true)}
                            disabled={loadingMore}
                            className={`${themeStyles.button} px-4 py-2 rounded-lg text-sm disabled:opacity-50`}
                        >
                            {loadingMore ? "Loading..." : "Load More Messages"}
                        </button>
                    </div>
                )}
                
                {messages.map((msg) => {
                    const isOwnMessage = msg.sender_id === user.user.id
                    const isEditing = editingMessageId === msg.id

                    return (
                        <div
                            key={msg.id}
                            className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                className={`max-w-[70%] rounded-lg p-3 ${isOwnMessage
                                    ? "bg-blue-600 text-white"
                                    : `${themeStyles.secondbar} ${themeStyles.text}`
                                    }`}
                            >
                                {isEditing ? (
                                    <div className="space-y-2">
                                        <input
                                            type="text"
                                            value={editContent}
                                            onChange={(e) => setEditContent(e.target.value)}
                                            className="w-full px-2 py-1 rounded bg-white text-black"
                                            autoFocus
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleUpdateMessage(msg.id)}
                                                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={cancelEdit}
                                                className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="whitespace-pre-wrap break-words">
                                            {msg.content}
                                        </div>
                                        <div className="flex items-center justify-between mt-1">
                                            <span className={`text-xs ${isOwnMessage ? "text-blue-100" : themeStyles.accent}`}>
                                                {new Date(msg.created_at).toLocaleTimeString([], {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                                {msg.updated_at && msg.updated_at !== msg.created_at && (
                                                    <span className="ml-2 italic">(edited)</span>
                                                )}
                                            </span>
                                            {isOwnMessage && !isEditing && (
                                                <div className="flex gap-2 ml-2">
                                                    <button
                                                        onClick={() => startEdit(msg)}
                                                        className="text-xs hover:underline"
                                                        title="Edit message"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteMessage(msg.id)}
                                                        className="text-xs hover:underline"
                                                        title="Delete message"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className={`${themeStyles.border} border-t p-4 ${themeStyles.cardBg}`}>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className={`flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 ${themeStyles.input}`}
                        disabled={loading || !connected}
                    />
                    <button
                        type="submit"
                        disabled={loading || !newMessage.trim() || !connected}
                        className={`${themeStyles.button} px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        Send
                    </button>
                </div>
            </form>
        </div>
    )
}
