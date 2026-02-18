import { useState, useEffect, useRef } from "react"
import { useTheme } from "../../context/ThemeContext"
import { useAuth } from "../../context/AuthContext"
import axios from "axios"
import ReminderSuggestionModal from "../modals/ReminderSuggestionModal"

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000"

export default function GroupAIChatPanel({ groupId, groupName, isExpanded, onToggle }) {
    const { themeStyles } = useTheme()
    const { user } = useAuth()
    const [messages, setMessages] = useState([])
    const [inputMessage, setInputMessage] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [reminderSuggestion, setReminderSuggestion] = useState(null)
    const [showReminderModal, setShowReminderModal] = useState(false)
    const messagesEndRef = useRef(null)

    // Auto-scroll to bottom when new messages arrive
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    // Load chat history when group changes or panel is expanded
    useEffect(() => {
        if (isExpanded && groupId) {
            loadChatHistory()
        }
    }, [groupId, isExpanded, user?.access_token])

    async function loadChatHistory() {
        try {
            if (!user?.access_token || !groupId) return

            const response = await axios.get(
                `${API_URL}/api/ai/chat/history?limit=20&group_id=${groupId}`,
                {
                    headers: { Authorization: `Bearer ${user.access_token}` }
                }
            )

            if (response.data && response.data.messages) {
                setMessages(response.data.messages)
            }
        } catch (err) {
            console.error("Failed to load chat history:", err)
        }
    }

    async function handleSendMessage(e) {
        e.preventDefault()

        if (!inputMessage.trim()) return

        const userMessage = inputMessage.trim()
        setInputMessage("")
        setError("")

        // Add user message to UI immediately
        const newUserMsg = {
            sender: "user",
            content: userMessage,
            timestamp: new Date().toISOString()
        }
        setMessages(prev => [...prev, newUserMsg])
        setIsLoading(true)

        try {
            if (!user?.access_token) {
                setError("Please login to use AI chat")
                setIsLoading(false)
                return
            }

            // Add placeholder for AI response
            const aiMsgIndex = messages.length + 1
            const aiMsg = {
                sender: "ai",
                content: "",
                timestamp: new Date().toISOString(),
                isStreaming: true
            }
            setMessages(prev => [...prev, aiMsg])

            // Use streaming endpoint
            const response = await fetch(
                `${API_URL}/api/ai/chat/stream`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${user.access_token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: userMessage,
                        group_id: groupId
                    })
                }
            )

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ""

            while (true) {
                const { done, value } = await reader.read()
                
                if (done) {
                    console.log("Stream complete")
                    break
                }

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                
                // Keep the last incomplete line in the buffer
                buffer = lines.pop() || ""

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6))
                            
                            if (data.error) {
                                setError(data.content)
                                setMessages(prev => {
                                    const updated = [...prev]
                                    updated[aiMsgIndex] = {
                                        ...updated[aiMsgIndex],
                                        content: data.content,
                                        isError: true,
                                        isStreaming: false
                                    }
                                    return updated
                                })
                                break
                            }
                            
                            if (data.done) {
                                setMessages(prev => {
                                    const updated = [...prev]
                                    updated[aiMsgIndex] = {
                                        ...updated[aiMsgIndex],
                                        isStreaming: false,
                                        timestamp: data.timestamp || new Date().toISOString()
                                    }
                                    return updated
                                })
                            } else if (data.content) {
                                setMessages(prev => {
                                    const updated = [...prev]
                                    updated[aiMsgIndex] = {
                                        ...updated[aiMsgIndex],
                                        content: updated[aiMsgIndex].content + data.content
                                    }
                                    return updated
                                })
                            }
                        } catch (parseError) {
                            console.error("Failed to parse SSE data:", parseError)
                        }
                    }
                }
            }

        } catch (err) {
            console.error("AI Chat Error:", err)
            setError(err.message || "Failed to get AI response")

            // Add error message to chat
            const errorMsg = {
                sender: "ai",
                content: "Sorry, I encountered an error. Please try again.",
                timestamp: new Date().toISOString(),
                isError: true
            }
            setMessages(prev => [...prev, errorMsg])
        } finally {
            setIsLoading(false)
        }
    }

    function formatTimestamp(timestamp) {
        const date = new Date(timestamp)
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    return (
        <div
            className={`${themeStyles.secondbar} ${themeStyles.border} border-l flex flex-col transition-all duration-300 ease-in-out ${isExpanded ? 'w-96' : 'w-12'
                }`}
        >
            {/* Toggle Button */}
            {!isExpanded && (
                <button
                    onClick={onToggle}
                    className={`h-full flex items-center justify-center ${themeStyles.text} hover:bg-opacity-80 transition-colors`}
                    title="Open AI Assistant"
                >
                    <span className="transform -rotate-90 whitespace-nowrap text-sm font-medium">
                        🤖 AI
                    </span>
                </button>
            )}

            {/* Expanded Panel */}
            {isExpanded && (
                <>
                    {/* Header */}
                    <div className={`px-4 py-3 ${themeStyles.border} border-b flex items-center justify-between`}>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                                <span className="text-white">🤖</span>
                            </div>
                            <div>
                                <h4 className={`font-semibold text-sm ${themeStyles.text}`}>AI Assistant</h4>
                                <p className={`text-xs ${themeStyles.accent}`}>
                                    {groupName}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onToggle}
                            className={`p-1 ${themeStyles.accent} hover:${themeStyles.text} transition-colors`}
                            title="Close AI Assistant"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-3">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center px-4">
                                <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center mb-3">
                                    <span className="text-2xl">🤖</span>
                                </div>
                                <p className={`text-sm ${themeStyles.accent}`}>
                                    Ask me anything about {groupName}!
                                </p>
                            </div>
                        ) : (
                            messages.map((msg, index) => (
                                <div
                                    key={index}
                                    className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                                >
                                    <div
                                        className={`max-w-[85%] rounded-lg p-2 text-sm ${msg.sender === "user"
                                            ? "bg-blue-600 text-white"
                                            : msg.isError
                                                ? "bg-red-500 text-white"
                                                : `${themeStyles.cardBg} ${themeStyles.text} border ${themeStyles.border}`
                                            }`}
                                    >
                                        <div className="whitespace-pre-wrap break-words">
                                            {msg.content}
                                            {msg.isStreaming && (
                                                <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse">|</span>
                                            )}
                                        </div>
                                        <div
                                            className={`text-xs mt-1 ${msg.sender === "user" ? "text-blue-100" : themeStyles.accent
                                                }`}
                                        >
                                            {formatTimestamp(msg.timestamp)}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="px-3 py-2">
                            <div className="bg-red-500 text-white px-3 py-1 rounded text-xs">
                                {error}
                            </div>
                        </div>
                    )}

                    {/* Input Area */}
                    <div className={`p-3 ${themeStyles.border} border-t`}>
                        <form onSubmit={handleSendMessage} className="flex flex-col gap-2">
                            <input
                                type="text"
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                placeholder="Ask AI..."
                                disabled={isLoading}
                                className={`px-3 py-2 text-sm rounded-lg ${themeStyles.input} ${themeStyles.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !inputMessage.trim()}
                                className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${isLoading || !inputMessage.trim()
                                    ? "bg-gray-400 cursor-not-allowed"
                                    : "bg-blue-600 hover:bg-blue-700"
                                    } text-white`}
                            >
                                {isLoading ? "..." : "Send"}
                            </button>
                        </form>
                    </div>
                </>
            )}

            {/* Reminder Suggestion Modal */}
            {showReminderModal && (
                <ReminderSuggestionModal
                    suggestion={reminderSuggestion}
                    groupId={groupId}
                    onConfirm={(reminderData) => {
                        console.log('✅ Reminder created:', reminderData)
                        setShowReminderModal(false)
                        setReminderSuggestion(null)
                        // Show success message in chat
                        const successMsg = {
                            sender: "ai",
                            content: `✅ Reminder "${reminderData.title}" created successfully!`,
                            timestamp: new Date().toISOString()
                        }
                        setMessages(prev => [...prev, successMsg])
                    }}
                    onCancel={() => {
                        console.log('❌ Reminder creation cancelled')
                        setShowReminderModal(false)
                        setReminderSuggestion(null)
                    }}
                />
            )}
        </div>
    )
}
