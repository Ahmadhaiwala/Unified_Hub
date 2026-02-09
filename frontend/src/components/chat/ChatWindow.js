import { useState, useEffect, useRef } from "react"
import { useAuth } from "../../context/AuthContext"
import { useTheme } from "../../context/ThemeContext"

export default function ChatWindow({ conversationId, friendName, onMessageSent }) {
    const { user } = useAuth()
    const { themeStyles } = useTheme()
    const [messages, setMessages] = useState([])
    const [newMessage, setNewMessage] = useState("")
    const [loading, setLoading] = useState(false)
    const [connected, setConnected] = useState(false)
    const messagesEndRef = useRef(null)
    const wsRef = useRef(null)

    useEffect(() => {
        if (conversationId && user?.access_token) {
            fetchMessages()
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

            if (data.type === "new_message") {
                const msg = data.message
                // Only add message if it's for the current conversation
                if (msg.conversation_id === conversationId) {
                    setMessages((prev) => {
                        // Check if message already exists
                        if (prev.some((m) => m.id === msg.id)) {
                            return prev
                        }
                        return [...prev, msg]
                    })

                    // Mark as read if not sent by current user
                    if (msg.sender_id !== user.user.id) {
                        markAsRead()
                    }
                }
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

    async function fetchMessages() {
        if (!conversationId || !user?.access_token) return

        try {
            const response = await fetch(
                `http://localhost:8000/api/chat/conversations/${conversationId}/messages`,
                {
                    headers: { Authorization: `Bearer ${user.access_token}` },
                }
            )

            if (response.ok) {
                const data = await response.json()
                setMessages(data)
                markAsRead()
            }
        } catch (error) {
            console.error("Failed to fetch messages:", error)
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
                <h2 className={`text-xl font-bold ${themeStyles.text}`}>{friendName}</h2>
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

            {/* Messages */}
            <div className={`flex-1 overflow-y-auto p-4 space-y-3 ${themeStyles.cardBg}`}>
                {messages.map((msg) => {
                    const isOwnMessage = msg.sender_id === user.user.id
                    return (
                        <div
                            key={msg.id}
                            className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow-md ${isOwnMessage
                                        ? "bg-blue-500 text-white"
                                        : `${themeStyles.secondbar} ${themeStyles.text} border ${themeStyles.border}`
                                    }`}
                            >
                                <p>{msg.content}</p>
                                <p className={`text-xs mt-1 ${isOwnMessage ? "text-blue-100" : "opacity-60"}`}>
                                    {new Date(msg.created_at).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </p>
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
