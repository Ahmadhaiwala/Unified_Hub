import { useState, useEffect, useRef } from "react"
import { useAuth } from "../../context/AuthContext"
import { useTheme } from "../../context/ThemeContext"
import GroupMembersModal from "./GroupMembersModal"
import AttachmentDisplay, { FileUploadButton, FilePreview } from "./AttachmentDisplay"

export default function GroupChatWindow({ groupId, groupName, onMessageSent, onGroupDeleted, onGroupUpdated, onGroupLeft }) {
    const { user } = useAuth()
    const { themeStyles } = useTheme()
    const [messages, setMessages] = useState([])
    const [newMessage, setNewMessage] = useState("")
    const [loading, setLoading] = useState(false)
    const [connected, setConnected] = useState(false)
    const [members, setMembers] = useState([])
    const [showMembersModal, setShowMembersModal] = useState(false)
    const [selectedFile, setSelectedFile] = useState(null)
    const [uploadingFile, setUploadingFile] = useState(false)
    const [typingUsers, setTypingUsers] = useState(new Set())
    const messagesEndRef = useRef(null)
    const wsRef = useRef(null)
    const typingTimeoutRef = useRef(null)
    const typingIndicatorTimeouts = useRef(new Map())

    useEffect(() => {
        if (groupId && user?.access_token) {
            fetchMessages()
            fetchMembers()
            connectWebSocket()
        }

        return () => {
            if (wsRef.current && groupId) {
                // Only send leave_group if WebSocket is still open
                if (wsRef.current.readyState === WebSocket.OPEN) {
                    wsRef.current.send(
                        JSON.stringify({
                            action: "leave_group",
                            group_id: groupId,
                        })
                    )
                }
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
                    console.log("Received new group message:", msg)
                    if (msg.attachment) {
                        console.log("Message has attachment:", msg.attachment)
                    }
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
                    if (data.user_id !== user.user.id && data.group_id === groupId) {
                        handleTypingEvent(data.user_id)
                    }
                } else if (data.type === "member_added") {
                    // Refresh members list
                    if (data.group_id === groupId) {
                        fetchMembers()
                    }
                } else if (data.type === "member_removed") {
                    // Refresh members list
                    if (data.group_id === groupId) {
                        fetchMembers()
                    }
                } else if (data.type === "document_uploaded") {
                    // Refresh messages to show new attachment
                    if (data.group_id === groupId) {
                        fetchMessages()
                    }
                } else if (data.type === "document_deleted") {
                    // Refresh messages
                    if (data.group_id === groupId) {
                        fetchMessages()
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

    function handleTypingEvent(userId) {
        setTypingUsers((prev) => {
            const newSet = new Set(prev)
            newSet.add(userId)
            return newSet
        })

        // Clear existing timeout for this user
        if (typingIndicatorTimeouts.current.has(userId)) {
            clearTimeout(typingIndicatorTimeouts.current.get(userId))
        }

        // Set new timeout to remove user from typing
        const timeout = setTimeout(() => {
            setTypingUsers((prev) => {
                const newSet = new Set(prev)
                newSet.delete(userId)
                return newSet
            })
            typingIndicatorTimeouts.current.delete(userId)
        }, 3000)

        typingIndicatorTimeouts.current.set(userId, timeout)
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
                console.log("=== RAW API RESPONSE ===")
                console.log("Full data object:", data)
                console.log("Messages count:", data.messages?.length)
                console.log("First message (if exists):", data.messages?.[0])
                console.log("========================")

                console.log("Fetched messages:", data.messages)
                // Log messages with attachments
                let attachmentCount = 0
                data.messages?.forEach(msg => {
                    if (msg.attachment) {
                        attachmentCount++
                        console.log("✅ Message with attachment:", msg)
                    }
                })
                console.log(`Total messages with attachments: ${attachmentCount}`)

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

    function handleTyping() {
        if (!wsRef.current || !connected) return

        // Send typing event (debounced)
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current)
        }

        // Send typing indicator
        wsRef.current.send(
            JSON.stringify({
                action: "typing_in_group",
                group_id: groupId,
            })
        )

        // Reset typing timeout
        typingTimeoutRef.current = setTimeout(() => {
            // User stopped typing
        }, 3000)
    }

    async function uploadFile() {
        if (!selectedFile) return

        setUploadingFile(true)
        try {
            const formData = new FormData()
            formData.append("file", selectedFile)

            const response = await fetch(
                `http://localhost:8000/api/chatgroups/${groupId}/attachments`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${user.access_token}`,
                    },
                    body: formData,
                }
            )

            if (response.ok) {
                const attachment = await response.json()

                // Send message with attachment
                wsRef.current.send(
                    JSON.stringify({
                        action: "send_group_message",
                        group_id: groupId,
                        content: `📎 ${selectedFile.name}`,
                        attachment_id: attachment.id,
                    })
                )

                setSelectedFile(null)
                fetchMessages()

                if (onMessageSent) {
                    onMessageSent()
                }
            } else {
                const error = await response.json()
                alert(error.detail || "Failed to upload file")
            }
        } catch (error) {
            console.error("Failed to upload file:", error)
            alert("Failed to upload file")
        } finally {
            setUploadingFile(false)
        }
    }

    function sendMessage(e) {
        e.preventDefault()

        // If file is selected, upload it instead
        if (selectedFile) {
            uploadFile()
            return
        }

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

    async function downloadAttachment(attachment) {
        try {
            const response = await fetch(
                `http://localhost:8000/api/chatgroups/${groupId}/attachments/${attachment.id}`,
                {
                    headers: { Authorization: `Bearer ${user.access_token}` },
                }
            )

            if (response.ok) {
                const data = await response.json()
                // Open download URL in new tab
                window.open(data.download_url, "_blank")
            }
        } catch (error) {
            console.error("Failed to download:", error)
            throw error
        }
    }

    async function deleteAttachment(attachmentId) {
        try {
            const response = await fetch(
                `http://localhost:8000/api/chatgroups/${groupId}/attachments/${attachmentId}`,
                {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${user.access_token}` },
                }
            )

            if (response.ok) {
                fetchMessages()
            }
        } catch (error) {
            console.error("Failed to delete:", error)
            throw error
        }
    }

    // Wrapper functions for AttachmentDisplay component
    async function handleDownloadAttachment(attachment) {
        return downloadAttachment(attachment)
    }

    async function handleDeleteAttachment(attachmentId) {
        return deleteAttachment(attachmentId)
    }

    // Render typing indicator
    function renderTypingIndicator() {
        if (typingUsers.size === 0) return null

        const typingUserIds = Array.from(typingUsers)
        const typingMembers = members.filter(m => typingUserIds.includes(m.user_id))

        let text = ""
        if (typingMembers.length === 1) {
            text = `${typingMembers[0].username || "User"} is typing...`
        } else if (typingMembers.length === 2) {
            text = `${typingMembers[0].username || "User"} and ${typingMembers[1].username || "User"} are typing...`
        } else if (typingMembers.length > 2) {
            text = "Several people are typing..."
        }

        return (
            <div className={`px-4 py-2 ${themeStyles.accent} text-sm italic`}>
                <span className="animate-pulse">{text}</span>
            </div>
        )
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
                <div className="flex-1">
                    <h2 className={`text-xl font-bold ${themeStyles.text}`}>{groupName}</h2>
                    <button
                        onClick={() => setShowMembersModal(true)}
                        className={`text-sm ${themeStyles.accent} hover:underline cursor-pointer`}
                    >
                        {members.length} member{members.length !== 1 ? "s" : ""} - Click to manage
                    </button>
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
                    const hasAttachment = msg.content?.startsWith("📎")

                    // DEBUG: Log each message to see what we have
                    console.log("Rendering message:", {
                        id: msg.id,
                        content: msg.content,
                        hasAttachmentObject: !!msg.attachment,
                        attachment: msg.attachment
                    })

                    return (
                        <div
                            key={msg.id}
                            className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                className={`max-w-xs lg:max-w-md ${hasAttachment ? "" : "px-4 py-2"
                                    } rounded-lg shadow-md ${isOwnMessage
                                        ? "bg-blue-500 text-white"
                                        : `${themeStyles.secondbar} ${themeStyles.text} border ${themeStyles.border}`
                                    }`}
                            >
                                {!isOwnMessage && (
                                    <p className={`text-xs font-semibold mb-1 opacity-70 ${hasAttachment ? "px-4 pt-2" : ""}`}>
                                        {members.find(m => m.user_id === msg.sender_id)?.username ||
                                            `User ${msg.sender_id.slice(0, 8)}`}
                                    </p>
                                )}

                                {/* Check if message has attachment data */}
                                {msg.attachment ? (
                                    <div className={isOwnMessage ? "p-2" : "px-4 pb-2"}>
                                        <AttachmentDisplay
                                            attachment={msg.attachment}
                                            onDownload={handleDownloadAttachment}
                                            onDelete={() => handleDeleteAttachment(msg.attachment.id)}
                                            canDelete={msg.sender_id === user.user.id}
                                        />
                                    </div>
                                ) : hasAttachment ? (
                                    <div className={hasAttachment && !isOwnMessage ? "px-4 pb-2" : hasAttachment && isOwnMessage ? "p-2" : ""}>
                                        {/* Fallback for old attachment format */}
                                        <p className={!isOwnMessage ? "" : ""}>{msg.content}</p>
                                        <p className={`text-xs mt-1 ${isOwnMessage ? "text-blue-100" : "opacity-60"}`}>
                                            {new Date(msg.created_at).toLocaleTimeString([], {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <p>{msg.content}</p>
                                        <p className={`text-xs mt-1 ${isOwnMessage ? "text-blue-100" : "opacity-60"}`}>
                                            {new Date(msg.created_at).toLocaleTimeString([], {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>
                    )
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Typing Indicator */}
            {renderTypingIndicator()}

            {/* File Preview */}
            {selectedFile && (
                <div className="px-4 pb-2">
                    <FilePreview
                        file={selectedFile}
                        onRemove={() => setSelectedFile(null)}
                    />
                </div>
            )}

            {/* Input */}
            <form onSubmit={sendMessage} className={`${themeStyles.border} border-t p-4 ${themeStyles.cardBg}`}>
                <div className="flex gap-2">
                    <FileUploadButton
                        onFileSelect={setSelectedFile}
                        disabled={loading || !connected || uploadingFile}
                    />

                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => {
                            setNewMessage(e.target.value)
                            handleTyping()
                        }}
                        placeholder="Type a message..."
                        className={`flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 ${themeStyles.input}`}
                        disabled={loading || !connected || selectedFile !== null}
                    />
                    <button
                        type="submit"
                        disabled={loading || (!newMessage.trim() && !selectedFile) || !connected || uploadingFile}
                        className={`${themeStyles.button} px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {uploadingFile ? "Uploading..." : selectedFile ? "Upload" : "Send"}
                    </button>
                </div>
            </form>

            {/* Members Modal */}
            {showMembersModal && (
                <GroupMembersModal
                    groupId={groupId}
                    groupName={groupName}
                    onClose={() => {
                        setShowMembersModal(false)
                        fetchMembers() // Refresh members after modal closes
                    }}
                    onGroupDeleted={onGroupDeleted}
                    onGroupUpdated={onGroupUpdated}
                    onGroupLeft={onGroupLeft}
                />
            )}
        </div>
    )
}
