import { useState, useEffect, useRef } from "react"
import { useAuth } from "../../context/AuthContext"
import { useTheme } from "../../context/ThemeContext"
import GroupMembersModal from "./GroupMembersModal"
import AttachmentDisplay, { FileUploadButton, FilePreview } from "./AttachmentDisplay"
import GroupAIChatPanel from "./GroupAIChatPanel"
import { saveConversationTitle, getConversationTitle } from "../../utils/localStorageUtils"

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
    const [showAIChat, setShowAIChat] = useState(false)
    const [displayName, setDisplayName] = useState(groupName || "Loading...")
    const [hasMore, setHasMore] = useState(false)
    const [loadingMore, setLoadingMore] = useState(false)
    const [totalCount, setTotalCount] = useState(0)
    const [isAdmin, setIsAdmin] = useState(false)
    const [groupAvatar, setGroupAvatar] = useState(null)
    const [groupData, setGroupData] = useState(null)
    const [showEditGroupModal, setShowEditGroupModal] = useState(false)
    const [editGroupName, setEditGroupName] = useState("")
    const [editGroupDescription, setEditGroupDescription] = useState("")
    const [editGroupAvatar, setEditGroupAvatar] = useState("")
    const [editingMessageId, setEditingMessageId] = useState(null)
    const [editMessageContent, setEditMessageContent] = useState("")
    const messagesEndRef = useRef(null)
    const wsRef = useRef(null)
    const typingTimeoutRef = useRef(null)
    const typingIndicatorTimeouts = useRef(new Map())
    const fileInputRef = useRef(null)

    useEffect(() => {
        if (groupId && user?.access_token) {
            // Try to load cached title first
            const cachedTitle = getConversationTitle(groupId)
            if (cachedTitle) {
                setDisplayName(cachedTitle)
            } else if (groupName) {
                setDisplayName(groupName)
                saveConversationTitle(groupId, groupName, 'group')
            }
            
            fetchMessages()
            fetchMembers()
            fetchGroupDetails()
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
                } else if (data.type === "message_deleted" && data.group_id === groupId) {
                    // Handle message deletion in real-time
                    setMessages((prev) => prev.filter(m => m.id !== data.message_id))
                } else if (data.type === "group_updated" && data.group_id === groupId) {
                    // Handle group updates in real-time
                    if (data.group) {
                        setDisplayName(data.group.name)
                        setGroupAvatar(data.group.avatar_url)
                        setGroupData(data.group)
                        // Optionally, trigger a callback for parent component to update group list
                        onGroupUpdated(data.group)
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

    async function fetchMessages(loadMore = false) {
        if (!groupId || !user?.access_token) return

        if (loadMore) {
            setLoadingMore(true)
        }

        try {
            const offset = loadMore ? messages.length : 0
            const response = await fetch(
                `http://localhost:8000/api/chatgroups/${groupId}/messages?limit=20&offset=${offset}`,
                {
                    headers: { Authorization: `Bearer ${user.access_token}` },
                }
            )

            if (response.ok) {
                const data = await response.json()
                console.log("=== RAW API RESPONSE ===")
                console.log("Full data object:", data)
                console.log("Messages count:", data.messages?.length)
                console.log("========================")

                if (loadMore) {
                    setMessages((prev) => [...data.messages, ...prev])
                } else {
                    setMessages(data.messages || [])
                    // Save group name to cache
                    if (groupName) {
                        saveConversationTitle(groupId, groupName, 'group')
                    }
                }
                
                setTotalCount(data.total_count || 0)
                setHasMore(data.has_more || false)
            }
        } catch (error) {
            console.error("Failed to fetch messages:", error)
        } finally {
            if (loadMore) {
                setLoadingMore(false)
            }
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

    async function fetchGroupDetails() {
        if (!groupId || !user?.access_token) return

        try {
            const response = await fetch(
                `http://localhost:8000/api/chatgroups/${groupId}`,
                {
                    headers: { Authorization: `Bearer ${user.access_token}` },
                }
            )

            if (response.ok) {
                const data = await response.json()
                setGroupData(data)
                setGroupAvatar(data.avatar_url)
                
                // Check if current user is admin
                if (data.created_by === user.user.id) {
                    setIsAdmin(true)
                }
            }
        } catch (error) {
            console.error("Failed to fetch group details:", error)
        }
    }

    const handleDeleteMessage = async (messageId) => {
        if (!window.confirm("Delete this message?")) return

        try {
            const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000"
            const response = await fetch(`${API_URL}/api/chatgroups/${groupId}/messages/${messageId}`, {
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

    const handleEditMessage = async (messageId) => {
        if (!editMessageContent.trim()) {
            alert("Message cannot be empty")
            return
        }

        try {
            const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000"
            const response = await fetch(`${API_URL}/api/chatgroups/${groupId}/messages/${messageId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${user.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content: editMessageContent })
            })

            if (!response.ok) throw new Error('Failed to edit message')
            
            const updatedMessage = await response.json()
            setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: editMessageContent } : m))
            setEditingMessageId(null)
            setEditMessageContent("")
        } catch (error) {
            console.error("Error editing message:", error)
            alert("Failed to edit message")
        }
    }

    const startEditMessage = (msg) => {
        setEditingMessageId(msg.id)
        setEditMessageContent(msg.content)
    }

    const cancelEditMessage = () => {
        setEditingMessageId(null)
        setEditMessageContent("")
    }

    const openEditGroupModal = () => {
        setEditGroupName(displayName)
        setEditGroupDescription(groupData?.description || "")
        setEditGroupAvatar(groupAvatar || "")
        setShowEditGroupModal(true)
    }

    const handleUpdateGroup = async () => {
        if (!editGroupName.trim()) {
            alert("Group name cannot be empty")
            return
        }

        try {
            const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000"
            const response = await fetch(`${API_URL}/api/chatgroups/${groupId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${user.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: editGroupName,
                    description: editGroupDescription,
                    avatar_url: editGroupAvatar
                })
            })

            if (!response.ok) throw new Error('Failed to update group')

            const result = await response.json()
            
            // Update local state
            setDisplayName(result.group.name)
            setGroupAvatar(result.group.avatar_url)
            setGroupData(result.group)
            setShowEditGroupModal(false)
            
            alert("Group updated successfully!")
        } catch (error) {
            console.error("Error updating group:", error)
            alert("Failed to update group")
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

            // Fetch messages to ensure UI is updated (fallback in case WebSocket is slow)
            setTimeout(() => fetchMessages(), 500)
        } catch (error) {
            console.error("Failed to send message:", error)
        } finally {
            setLoading(false)
        }
    }

    function handleFileSelect(e) {
        const file = e.target.files?.[0]
        if (file) {
            setSelectedFile(file)
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
        <div className="flex h-full">
            {/* Main Chat Area */}
            <div className="flex flex-col flex-1">
                {/* Header */}
                <div className={`${themeStyles.secondbar} p-4 ${themeStyles.border} border-b`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {/* Group Avatar */}
                            {groupAvatar ? (
                                <img 
                                    src={groupAvatar} 
                                    alt={displayName}
                                    className="w-12 h-12 rounded-full object-cover border-2 border-blue-500"
                                />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center border-2 border-blue-500">
                                    <span className="text-white text-xl font-bold">
                                        {displayName?.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            )}
                            
                            <div>
                                <h2 className={`text-xl font-bold ${themeStyles.text}`}>
                                    {displayName}
                                </h2>
                                <button
                                    onClick={() => setShowMembersModal(true)}
                                    className={`text-sm ${themeStyles.accent} hover:underline cursor-pointer`}
                                >
                                    {members.length} member{members.length !== 1 ? "s" : ""} - Click to manage
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {isAdmin && (
                                <button
                                    onClick={openEditGroupModal}
                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                                    title="Edit group"
                                >
                                    ⚙️ Edit
                                </button>
                            )}
                            <button
                                onClick={() => window.location.href = `/assignments/${groupId}`}
                                className="px-3 py-1 rounded-lg text-sm font-medium transition-colors bg-green-600 text-white hover:bg-green-700"
                                title="View Question Poles"
                            >
                                📚 Question Poles
                            </button>
                            <button
                                onClick={() => setShowAIChat(!showAIChat)}
                                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${showAIChat
                                    ? "bg-blue-600 text-white"
                                    : `${themeStyles.button}`
                                    }`}
                                title="Toggle AI Assistant"
                            >
                            🤖 AI
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
                        const senderName = msg.sender_username || "Unknown"
                        const hasAttachment = msg.content?.startsWith("📎")

                        return (
                            <div
                                key={msg.id}
                                className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`max-w-xs lg:max-w-md ${hasAttachment ? "" : "px-4 py-2"} rounded-lg shadow-md ${isOwnMessage
                                        ? "bg-blue-500 text-white"
                                        : `${themeStyles.secondbar} ${themeStyles.text} border ${themeStyles.border}`
                                        }`}
                                >
                                    {!isOwnMessage && (
                                        <p className={`text-xs font-semibold mb-1 opacity-70 ${hasAttachment ? "px-4 pt-2" : ""}`}>
                                            {senderName}
                                        </p>
                                    )}
                                    
                                    {/* Attachment Display */}
                                    {msg.attachment ? (
                                        <div className={isOwnMessage ? "p-2" : "px-4 pb-2"}>
                                            <AttachmentDisplay
                                                attachment={msg.attachment}
                                                onDownload={handleDownloadAttachment}
                                                onDelete={() => handleDeleteAttachment(msg.attachment.id)}
                                                canDelete={msg.sender_id === user.user.id}
                                            />
                                        </div>
                                    ) : editingMessageId === msg.id ? (
                                        <div className="space-y-2">
                                            <input
                                                type="text"
                                                value={editMessageContent}
                                                onChange={(e) => setEditMessageContent(e.target.value)}
                                                className={`w-full px-2 py-1 rounded ${isOwnMessage ? "bg-blue-600 text-white" : `${themeStyles.input}`} text-sm`}
                                                autoFocus
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleEditMessage(msg.id)}
                                                    className={`px-2 py-1 text-xs rounded ${isOwnMessage ? "bg-green-600 hover:bg-green-700" : "bg-green-500 hover:bg-green-600"} text-white`}
                                                >
                                                    ✓ Save
                                                </button>
                                                <button
                                                    onClick={cancelEditMessage}
                                                    className={`px-2 py-1 text-xs rounded ${isOwnMessage ? "bg-gray-600 hover:bg-gray-700" : "bg-gray-500 hover:bg-gray-600"} text-white`}
                                                >
                                                    ✕ Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <p>{msg.content}</p>
                                            <div className="flex items-center justify-between mt-1">
                                                <p className={`text-xs ${isOwnMessage ? "text-blue-100" : "opacity-60"}`}>
                                                    {new Date(msg.created_at).toLocaleTimeString([], {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </p>
                                                {isOwnMessage && (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => startEditMessage(msg)}
                                                            className={`text-xs px-2 py-1 rounded ${isOwnMessage ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-500 hover:bg-gray-600"} transition`}
                                                            title="Edit message"
                                                        >
                                                            ✏️
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteMessage(msg.id)}
                                                            className={`text-xs px-2 py-1 rounded ${isOwnMessage ? "bg-red-600 hover:bg-red-700" : "bg-red-500 hover:bg-red-600"} transition`}
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
                    
                    {/* Typing Indicator */}
                    {renderTypingIndicator()}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input Form */}
                <form
                    onSubmit={sendMessage}
                    className={`${themeStyles.secondbar} p-4 ${themeStyles.border} border-t`}
                >
                    {selectedFile && (
                        <div className={`mb-2 p-2 ${themeStyles.cardBg} rounded flex items-center justify-between`}>
                            <span className={`text-sm ${themeStyles.text}`}>
                                📎 {selectedFile.name}
                            </span>
                            <button
                                type="button"
                                onClick={() => setSelectedFile(null)}
                                className="text-red-500 hover:text-red-700"
                            >
                                ✕
                            </button>
                        </div>
                    )}
                    <div className="flex gap-2">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className={`${themeStyles.button} px-3 py-2 rounded-lg`}
                            title="Attach file"
                        >
                            📎
                        </button>
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

                {/* Edit Group Modal */}
                {showEditGroupModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className={`${themeStyles.cardBg} p-6 rounded-lg shadow-xl max-w-md w-full mx-4`}>
                            <h3 className={`text-xl font-bold ${themeStyles.text} mb-4`}>Edit Group</h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className={`block text-sm font-medium ${themeStyles.text} mb-1`}>
                                        Group Name
                                    </label>
                                    <input
                                        type="text"
                                        value={editGroupName}
                                        onChange={(e) => setEditGroupName(e.target.value)}
                                        className={`w-full px-3 py-2 rounded ${themeStyles.secondbar} ${themeStyles.text} border ${themeStyles.border}`}
                                        placeholder="Enter group name"
                                    />
                                </div>
                                
                                <div>
                                    <label className={`block text-sm font-medium ${themeStyles.text} mb-1`}>
                                        Description
                                    </label>
                                    <textarea
                                        value={editGroupDescription}
                                        onChange={(e) => setEditGroupDescription(e.target.value)}
                                        className={`w-full px-3 py-2 rounded ${themeStyles.secondbar} ${themeStyles.text} border ${themeStyles.border}`}
                                        placeholder="Enter description"
                                        rows={3}
                                    />
                                </div>
                                
                                <div>
                                    <label className={`block text-sm font-medium ${themeStyles.text} mb-1`}>
                                        Avatar URL
                                    </label>
                                    <input
                                        type="text"
                                        value={editGroupAvatar}
                                        onChange={(e) => setEditGroupAvatar(e.target.value)}
                                        className={`w-full px-3 py-2 rounded ${themeStyles.secondbar} ${themeStyles.text} border ${themeStyles.border}`}
                                        placeholder="Enter avatar URL"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={handleUpdateGroup}
                                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                >
                                    Save Changes
                                </button>
                                <button
                                    onClick={() => setShowEditGroupModal(false)}
                                    className={`flex-1 px-4 py-2 ${themeStyles.button} rounded-lg transition-colors`}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* AI Chat Panel */}
            {showAIChat && (
                <GroupAIChatPanel groupId={groupId} groupName={displayName} isExpanded={true} />
            )}

            {/* Members Modal */}
            {showMembersModal && (
                <GroupMembersModal
                    groupId={groupId}
                    groupName={displayName}
                    onClose={() => setShowMembersModal(false)}
                    onGroupDeleted={onGroupDeleted}
                    onGroupUpdated={onGroupUpdated}
                    onGroupLeft={onGroupLeft}
                />
            )}
        </div>
    )
}

