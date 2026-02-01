import { useState, useEffect, useRef } from "react"
import { useAuth } from "../../context/AuthContext"
import { useTheme } from "../../context/ThemeContext"

export default function GroupChatWindow({ groupId, groupName, onMessageSent }) {
    const { user } = useAuth()
    const { themeStyles } = useTheme()
    const [messages, setMessages] = useState([])
    const [newMessage, setNewMessage] = useState("")
    const [loading, setLoading] = useState(false)
    const [connected, setConnected] = useState(false)
    const [members, setMembers] = useState([])
    const messagesEndRef = useRef(null)
    const wsRef = useRef(null)

    useEffect(() => {
        if (groupId && user?.access_token) {
            fetchMessages()
            fetchMembers()
            connectWebSocket()
        }

        return () => {
            if (wsRef.current && groupId) {
                // Leave group before disconnecting
                wsRef.current.send(
                    JSON.stringify({
                        action: "leave_group",
                        group_id: groupId,
                    })
                )
            }
        }
    }, [groupId, user])

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    function connectWebSocket() {
        if (!user?.access_token) return

        // Reuse existing WebSocket or create new one
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            const ws = new WebSocket(
                `ws://localhost:8000/api/ws/chat/${user.access_token}`
            )

            ws.onopen = () => {
                console.log("WebSocket connected")
                setConnected(true)

                // Join the group
                ws.send(
                    JSON.stringify({
                        action: "join_group",
                        group_id: groupId,
                    })
                )
            }

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data)

                if (data.type === "new_group_message") {
                    const msg = data.message
                    // Only add message if it's for the current group
                    if (msg.group_id === groupId) {
                        setMessages((prev) => {
                            // Check if message already exists
                            if (prev.some((m) => m.id === msg.id)) {
                                return prev
                            }
                            return [...prev, msg]
                        })
                    }
                } else if (data.type === "group_joined") {
                    console.log("Successfully joined group:", data.group_id)
                } else if (data.type === "user_typing") {
                    // Handle typing indicator
                    console.log("User typing:", data.user_id)
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
                    if (groupId && user?.access_token) {
                        connectWebSocket()
                    }
                }, 3000)
            }

            wsRef.current = ws
        } else {
            // WebSocket already open, just join the group
            wsRef.current.send(
                JSON.stringify({
                    action: "join_group",
                    group_id: groupId,
                })
            )
        }
    }

    async function fetchMessages() {
        if (!groupId || !user?.access_token) return

        try {
            const response = await fetch(
                `http://localhost:8000/api/chatgroups/${groupId}/messages`,
                {
                    headers: { Authorization: `Bearer ${user.access_token}` },
                }
            )

            if (response.ok) {
                const data = await response.json()
                setMessages(data.messages || [])
            }
        } catch (error) {
            console.error("Failed to fetch messages:", error)
        }
    }

    async function fetchMembers() {
        if (!groupId || !user?.access_token) return

        try {
            const response = await fetch(
                `http://localhost:8000/api/chatgroups/${groupId}/members`,
                {
                    headers: { Authorization: `Bearer ${user.access_token}` },
                }
            )

            if (response.ok) {
                const data = await response.json()
                setMembers(data.members || [])
            }
        } catch (error) {
            console.error("Failed to fetch members:", error)
        }
    }

    function sendMessage(e) {
        e.preventDefault()
        if (!newMessage.trim() || !groupId || loading || !connected) return

        setLoading(true)
        try {
            // Send via WebSocket
            wsRef.current.send(
                JSON.stringify({
                    action: "send_group_message",
                    group_id: groupId,
                    content: newMessage,
                })
            )
            setNewMessage("")

            // Notify parent that message was sent
            if (onMessageSent) {
                onMessageSent()
            }
        } catch (error) {
            console.error("Failed to send message:", error)
        } finally {
            setLoading(false)
        }
    }

    if (!groupId) {
        return (
            <div className={`flex items-center justify-center h-full ${themeStyles.accent}`}>
                Select a group to start chatting
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className={`${themeStyles.secondbar} p-4 ${themeStyles.border} border-b flex justify-between items-center`}>
                <div>
                    <h2 className={`text-xl font-bold ${themeStyles.text}`}>{groupName}</h2>
                    <p className={`text-sm ${themeStyles.accent}`}>
                        {members.length} member{members.length !== 1 ? "s" : ""}
                    </p>
                </div>
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
                                {!isOwnMessage && (
                                    <p className="text-xs font-semibold mb-1 opacity-70">
                                        User {msg.sender_id.slice(0, 8)}
                                    </p>
                                )}
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
