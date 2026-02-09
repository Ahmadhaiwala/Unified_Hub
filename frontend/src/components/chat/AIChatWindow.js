import { useState, useEffect, useRef } from "react"
import { useTheme } from "../../context/ThemeContext"
import { useAuth } from "../../context/AuthContext"
import axios from "axios"
import CodeExecutionPanel from "./CodeExecutionPanel"

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000"

export default function AIChatWindow({ groupId = null, groupName = null }) {
    const { themeStyles } = useTheme()
    const { user } = useAuth()
    const [messages, setMessages] = useState([])
    const [inputMessage, setInputMessage] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [codeToExecute, setCodeToExecute] = useState(null)
    const messagesEndRef = useRef(null)

    // Auto-scroll to bottom when new messages arrive
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    // Load chat history on mount or when groupId changes
    useEffect(() => {
        loadChatHistory()
    }, [user?.access_token, groupId])

    async function loadChatHistory() {
        try {
            if (!user?.access_token) return

            const url = groupId
                ? `${API_URL}/api/ai/chat/history?limit=20&group_id=${groupId}`
                : `${API_URL}/api/ai/chat/history?limit=20`

            const response = await axios.get(url, {
                headers: { Authorization: `Bearer ${user.access_token}` }
            })

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

    function detectCodeBlocks(content) {
        // Detect code blocks with ```language or just ```
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
        const matches = []
        let match

        while ((match = codeBlockRegex.exec(content)) !== null) {
            matches.push({
                language: match[1] || null,
                code: match[2].trim(),
                fullMatch: match[0]
            })
        }

        return matches
    }

    function formatTimestamp(timestamp) {
        const date = new Date(timestamp)
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    function renderMessageContent(content) {
        const codeBlocks = detectCodeBlocks(content)

        if (codeBlocks.length === 0) {
            return <div className="whitespace-pre-wrap break-words">{content}</div>
        }

        // Split content by code blocks and render
        const parts = []
        let lastIndex = 0

        codeBlocks.forEach((block, i) => {
            const blockIndex = content.indexOf(block.fullMatch, lastIndex)

            // Add text before code block
            if (blockIndex > lastIndex) {
                parts.push(
                    <div key={`text-${i}`} className="whitespace-pre-wrap break-words mb-2">
                        {content.substring(lastIndex, blockIndex)}
                    </div>
                )
            }

            // Add code block with run button
            parts.push(
                <div key={`code-${i}`} className="my-2">
                    <div
                        className="font-mono text-sm p-3 rounded overflow-x-auto"
                        style={{ backgroundColor: themeStyles.background }}
                    >
                        <pre>{block.code}</pre>
                    </div>
                    <button
                        onClick={() => setCodeToExecute({ code: block.code, language: block.language })}
                        className="mt-2 px-3 py-1 text-sm rounded bg-green-600 hover:bg-green-700 text-white transition-colors"
                    >
                        ▶ Run Code{block.language ? ` (${block.language})` : ''}
                    </button>
                </div>
            )

            lastIndex = blockIndex + block.fullMatch.length
        })

        // Add remaining text
        if (lastIndex < content.length) {
            parts.push(
                <div key="text-end" className="whitespace-pre-wrap break-words">
                    {content.substring(lastIndex)}
                </div>
            )
        }

        return <>{parts}</>
    }

    function formatTimestamp(timestamp) {
        const date = new Date(timestamp)
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    return (
        <div className={`flex flex-col h-full ${themeStyles.cardBg}`}>
            {/* Header */}
            <div className={`px-6 py-4 ${themeStyles.secondbar} ${themeStyles.border} border-b`}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <span className="text-white text-lg">🤖</span>
                    </div>
                    <div>
                        <h3 className={`font-semibold ${themeStyles.text}`}>AI Assistant</h3>
                        <p className={`text-sm ${themeStyles.accent}`}>
                            {isLoading ? "Typing..." : groupName ? `Chatting about ${groupName}` : "Ready to help"}
                        </p>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4">
                            <span className="text-4xl">🤖</span>
                        </div>
                        <h4 className={`text-lg font-semibold ${themeStyles.text} mb-2`}>
                            AI Assistant
                        </h4>
                        <p className={`${themeStyles.accent} max-w-md`}>
                            Ask me anything! I can help you with assignments, answer questions,
                            or just have a conversation.
                        </p>
                    </div>
                ) : (
                    messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                className={`max-w-[70%] rounded-lg p-3 ${msg.sender === "user"
                                    ? "bg-blue-600 text-white"
                                    : msg.isError
                                        ? "bg-red-500 text-white"
                                        : `${themeStyles.secondbar} ${themeStyles.text}`
                                    }`}
                            >
                                {renderMessageContent(msg.content)}
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
                <div className="px-6 py-2">
                    <div className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm">
                        {error}
                    </div>
                </div>
            )}

            {/* Input Area */}
            <div className={`p-4 ${themeStyles.secondbar} ${themeStyles.border} border-t`}>
                <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder="Ask me anything..."
                        disabled={isLoading}
                        className={`flex-1 px-4 py-2 rounded-lg ${themeStyles.input} ${themeStyles.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !inputMessage.trim()}
                        className={`px-6 py-2 rounded-lg font-medium transition-colors ${isLoading || !inputMessage.trim()
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-700"
                            } text-white`}
                    >
                        {isLoading ? "..." : "Send"}
                    </button>
                </form>
            </div>

            {/* Code Execution Panel */}
            {codeToExecute && (
                <CodeExecutionPanel
                    code={codeToExecute.code}
                    language={codeToExecute.language}
                    onClose={() => setCodeToExecute(null)}
                />
            )}
        </div>
    )
}
