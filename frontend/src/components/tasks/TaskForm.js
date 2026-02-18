import { useState, useEffect } from "react"
import { useAuth } from "../../context/AuthContext"
import { useTheme } from "../../context/ThemeContext"
import { supabase } from "../../utils/supabaseClient"

export default function TaskForm({ task, onClose, onSuccess }) {
    const { user } = useAuth()
    const { themeStyles } = useTheme()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        status: "pending",
        priority: "medium",
        category: "",
        tags: [],
        due_date: "",
        estimated_duration: "",
        is_recurring: false
    })

    useEffect(() => {
        if (task) {
            setFormData({
                title: task.title || "",
                description: task.description || "",
                status: task.status || "pending",
                priority: task.priority || "medium",
                category: task.category || "",
                tags: task.tags || [],
                due_date: task.due_date ? task.due_date.split("T")[0] : "",
                estimated_duration: task.estimated_duration || "",
                is_recurring: task.is_recurring || false
            })
        }
    }, [task])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        try {
            const payload = {
                ...formData,
                user_id: user.user.id,
                estimated_duration: formData.estimated_duration ? parseInt(formData.estimated_duration) : null,
                due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null
            }

            let result
            if (task) {
                // Update existing task
                result = await supabase
                    .from('tasks')
                    .update(payload)
                    .eq('id', task.id)
                    .eq('user_id', user.user.id)
                    .select()
            } else {
                // Create new task
                result = await supabase
                    .from('tasks')
                    .insert([payload])
                    .select()
            }

            if (result.error) throw result.error
            onSuccess()
        } catch (error) {
            console.error("Error saving task:", error)
            alert(error.message || "Failed to save task")
        } finally {
            setLoading(false)
        }
    }

    const handleTagInput = (e) => {
        if (e.key === "Enter" && e.target.value.trim()) {
            e.preventDefault()
            const newTag = e.target.value.trim()
            if (!formData.tags.includes(newTag)) {
                setFormData({ ...formData, tags: [...formData.tags, newTag] })
            }
            e.target.value = ""
        }
    }

    const removeTag = (tagToRemove) => {
        setFormData({
            ...formData,
            tags: formData.tags.filter(tag => tag !== tagToRemove)
        })
    }

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black bg-opacity-50 z-40"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                <div
                    className={`${themeStyles.cardBg} rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className={`${themeStyles.secondbar} p-4 border-b ${themeStyles.border} sticky top-0 z-10`}>
                        <div className="flex justify-between items-center">
                            <h2 className={`text-xl font-bold ${themeStyles.text}`}>
                                {task ? "Edit Task" : "Create New Task"}
                            </h2>
                            <button
                                onClick={onClose}
                                className={`${themeStyles.accent} hover:${themeStyles.text} text-2xl`}
                            >
                                ×
                            </button>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        {/* Title */}
                        <div>
                            <label className={`block text-sm font-medium ${themeStyles.text} mb-1`}>
                                Title *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className={`w-full px-3 py-2 rounded-lg border ${themeStyles.input}`}
                                placeholder="Enter task title"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className={`block text-sm font-medium ${themeStyles.text} mb-1`}>
                                Description
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className={`w-full px-3 py-2 rounded-lg border ${themeStyles.input}`}
                                placeholder="Enter task description"
                                rows={3}
                            />
                        </div>

                        {/* Status & Priority */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={`block text-sm font-medium ${themeStyles.text} mb-1`}>
                                    Status
                                </label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    className={`w-full px-3 py-2 rounded-lg border ${themeStyles.input}`}
                                >
                                    <option value="pending">Pending</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="completed">Completed</option>
                                    <option value="archived">Archived</option>
                                </select>
                            </div>
                            <div>
                                <label className={`block text-sm font-medium ${themeStyles.text} mb-1`}>
                                    Priority
                                </label>
                                <select
                                    value={formData.priority}
                                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                    className={`w-full px-3 py-2 rounded-lg border ${themeStyles.input}`}
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                    <option value="urgent">Urgent</option>
                                </select>
                            </div>
                        </div>

                        {/* Category & Due Date */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={`block text-sm font-medium ${themeStyles.text} mb-1`}>
                                    Category
                                </label>
                                <input
                                    type="text"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className={`w-full px-3 py-2 rounded-lg border ${themeStyles.input}`}
                                    placeholder="e.g., Work, Personal"
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium ${themeStyles.text} mb-1`}>
                                    Due Date
                                </label>
                                <input
                                    type="date"
                                    value={formData.due_date}
                                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                    className={`w-full px-3 py-2 rounded-lg border ${themeStyles.input}`}
                                />
                            </div>
                        </div>

                        {/* Estimated Duration */}
                        <div>
                            <label className={`block text-sm font-medium ${themeStyles.text} mb-1`}>
                                Estimated Duration (minutes)
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={formData.estimated_duration}
                                onChange={(e) => setFormData({ ...formData, estimated_duration: e.target.value })}
                                className={`w-full px-3 py-2 rounded-lg border ${themeStyles.input}`}
                                placeholder="e.g., 30"
                            />
                        </div>

                        {/* Tags */}
                        <div>
                            <label className={`block text-sm font-medium ${themeStyles.text} mb-1`}>
                                Tags (Press Enter to add)
                            </label>
                            <input
                                type="text"
                                onKeyDown={handleTagInput}
                                className={`w-full px-3 py-2 rounded-lg border ${themeStyles.input}`}
                                placeholder="Type and press Enter"
                            />
                            {formData.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {formData.tags.map((tag, idx) => (
                                        <span
                                            key={idx}
                                            className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-1"
                                        >
                                            #{tag}
                                            <button
                                                type="button"
                                                onClick={() => removeTag(tag)}
                                                className="hover:text-red-600"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                                {loading ? "Saving..." : task ? "Update Task" : "Create Task"}
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className={`flex-1 px-4 py-2 ${themeStyles.button} rounded-lg transition-colors`}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    )
}
