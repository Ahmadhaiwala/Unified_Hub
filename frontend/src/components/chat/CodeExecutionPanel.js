import { useState } from "react"
import { useTheme } from "../../context/ThemeContext"

export default function CodeExecutionPanel({ code, language, onClose }) {
    const { themeStyles } = useTheme()
    const [executing, setExecuting] = useState(false)
    const [result, setResult] = useState(null)

    const executeCode = async () => {
        setExecuting(true)
        setResult(null)

        try {
            const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000"
            const token = localStorage.getItem("token")

            const response = await fetch(`${API_URL}/api/ai/execute-code`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    code: code,
                    language: language
                })
            })

            const data = await response.json()
            setResult(data)
        } catch (error) {
            setResult({
                success: false,
                output: "",
                error: `Failed to execute: ${error.message}`,
                language: language,
                execution_time: 0
            })
        } finally {
            setExecuting(false)
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
            onClick={onClose}
        >
            <div
                className="w-full max-w-3xl mx-4 rounded-lg shadow-2xl"
                style={{ backgroundColor: themeStyles.surface }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between p-4 border-b"
                    style={{ borderColor: themeStyles.border }}
                >
                    <div>
                        <h3
                            className="text-lg font-semibold"
                            style={{ color: themeStyles.text }}
                        >
                            Code Execution
                        </h3>
                        {language && (
                            <span
                                className="text-sm"
                                style={{ color: themeStyles.textMuted }}
                            >
                                Language: {language}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="text-2xl hover:opacity-70"
                        style={{ color: themeStyles.textMuted }}
                    >
                        ×
                    </button>
                </div>

                {/* Code Preview */}
                <div className="p-4 border-b" style={{ borderColor: themeStyles.border }}>
                    <div
                        className="text-sm font-mono p-3 rounded overflow-x-auto max-h-48 overflow-y-auto"
                        style={{ backgroundColor: themeStyles.background, color: themeStyles.text }}
                    >
                        <pre>{code}</pre>
                    </div>
                </div>

                {/* Execute Button */}
                <div className="p-4 border-b" style={{ borderColor: themeStyles.border }}>
                    <button
                        onClick={executeCode}
                        disabled={executing}
                        className="w-full py-2 px-4 rounded font-medium transition-opacity disabled:opacity-50"
                        style={{
                            backgroundColor: themeStyles.primary,
                            color: "#FFFFFF"
                        }}
                    >
                        {executing ? "⏳ Executing..." : "▶ Run Code"}
                    </button>
                </div>

                {/* Output */}
                {result && (
                    <div className="p-4">
                        {/* Success/Error Status */}
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">
                                {result.success ? "✅" : "❌"}
                            </span>
                            <span
                                className="font-medium"
                                style={{ color: result.success ? "#10B981" : "#EF4444" }}
                            >
                                {result.success ? "Success" : "Error"}
                            </span>
                            {result.execution_time > 0 && (
                                <span
                                    className="text-sm ml-auto"
                                    style={{ color: themeStyles.textMuted }}
                                >
                                    ⏱ {result.execution_time}s
                                </span>
                            )}
                        </div>

                        {/* Output */}
                        {result.output && (
                            <div className="mb-2">
                                <div
                                    className="text-sm font-medium mb-1"
                                    style={{ color: themeStyles.text }}
                                >
                                    Output:
                                </div>
                                <div
                                    className="text-sm font-mono p-3 rounded max-h-64 overflow-y-auto whitespace-pre-wrap"
                                    style={{
                                        backgroundColor: themeStyles.background,
                                        color: "#10B981"
                                    }}
                                >
                                    {result.output}
                                </div>
                            </div>
                        )}

                        {/* Error */}
                        {result.error && (
                            <div>
                                <div
                                    className="text-sm font-medium mb-1"
                                    style={{ color: themeStyles.text }}
                                >
                                    {result.success ? "Warnings:" : "Error:"}
                                </div>
                                <div
                                    className="text-sm font-mono p-3 rounded max-h-64 overflow-y-auto whitespace-pre-wrap"
                                    style={{
                                        backgroundColor: themeStyles.background,
                                        color: "#EF4444"
                                    }}
                                >
                                    {result.error}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
