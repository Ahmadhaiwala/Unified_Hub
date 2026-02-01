import { useState } from "react"
import { useAuth } from "../../context/AuthContext"
import { useTheme } from "../../context/ThemeContext"

export default function CreateGroupModal({ onClose, onGroupCreated }) {
    const { user } = useAuth()
    const { themeStyles } = useTheme()
    const [groupName, setGroupName] = useState("")
    const [description, setDescription] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    async function handleSubmit(e) {
        e.preventDefault()
        if (!groupName.trim()) {
            setError("Group name is required")
            return
        }

        setLoading(true)
        setError("")

        try {
            const response = await fetch("http://localhost:8000/api/chatgroups", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${user.access_token}`,
                },
                body: JSON.stringify({
                    name: groupName,
                    description: description || "",
                }),
            })

            if (response.ok) {
                const newGroup = await response.json()
                console.log("Group created:", newGroup)
                onGroupCreated()
                onClose()
            } else {
                const data = await response.json()
                setError(data.detail || "Failed to create group")
            }
        } catch (error) {
            console.error("Error creating group:", error)
            setError("Failed to create group. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`${themeStyles.cardBg} rounded-lg shadow-xl max-w-md w-full p-6`}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className={`text-2xl font-bold ${themeStyles.text}`}>
                        Create New Group
                    </h2>
                    <button
                        onClick={onClose}
                        className={`${themeStyles.accent} hover:${themeStyles.text} text-2xl`}
                    >
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className={`block text-sm font-medium mb-2 ${themeStyles.text}`}>
                            Group Name *
                        </label>
                        <input
                            type="text"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            placeholder="Enter group name"
                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${themeStyles.input}`}
                            required
                            maxLength={50}
                        />
                    </div>

                    <div>
                        <label className={`block text-sm font-medium mb-2 ${themeStyles.text}`}>
                            Description (Optional)
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Enter group description"
                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${themeStyles.input}`}
                            rows={3}
                            maxLength={200}
                        />
                    </div>

                    <div className="flex gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className={`flex-1 px-4 py-2 border rounded-lg ${themeStyles.border} ${themeStyles.text} hover:${themeStyles.secondbar}`}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !groupName.trim()}
                            className={`flex-1 px-4 py-2 rounded-lg ${themeStyles.button} disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {loading ? "Creating..." : "Create Group"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
