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

            const response = await axios.post(
                `${API_URL}/api/ai/chat`,
                {
                    message: userMessage,
                    group_id: groupId
                },
                {
                    headers: {
                        Authorization: `Bearer ${user.access_token}`,
                        "Content-Type": "application/json"
                    }
                }
            )

            // Add AI response to UI
            const aiMsg = {
                sender: "ai",
                content: response.data.response,
                timestamp: response.data.timestamp
            }
            setMessages(prev => [...prev, aiMsg])

            // Check for AI suggested actions (reminder intent detection)
            if (response.data.suggested_action?.type === 'create_reminder') {
                console.log('🤖 AI detected reminder intent!', response.data.suggested_action)
                setReminderSuggestion(response.data.suggested_action.data)
                setShowReminderModal(true)
            }

        } catch (err) {
            console.error("AI Chat Error:", err)
            setError(err.response?.data?.detail || "Failed to get AI response")

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
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
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
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-3">
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
                                        <div className="whitespace-pre-wrap break-words">{msg.content}</div>
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
