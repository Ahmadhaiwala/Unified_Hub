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
        start_time: "",
        end_time: "",
        estimated_duration: "",
        is_recurring: false,
        recurrence_pattern: null
    })

    useEffect(() => {
        if (task) {
            // Extract time from due_date if it exists
            let startTime = ""
            let endTime = ""
            let dueDate = ""
            
            if (task.due_date) {
                const date = new Date(task.due_date)
                dueDate = date.toISOString().split("T")[0]
                startTime = date.toTimeString().slice(0, 5)
            }
            
            setFormData({
                title: task.title || "",
                description: task.description || "",
                status: task.status || "pending",
                priority: task.priority || "medium",
                category: task.category || "",
                tags: task.tags || [],
                due_date: dueDate,
                start_time: startTime,
                end_time: endTime,
                estimated_duration: task.estimated_duration || "",
                is_recurring: task.is_recurring || false,
                recurrence_pattern: task.recurrence_pattern || null
            })
        }
    }, [task])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        try {
            // Combine date and time if both are provided
            let dueDateTime = null
            if (formData.due_date) {
                if (formData.start_time) {
                    dueDateTime = new Date(`${formData.due_date}T${formData.start_time}`).toISOString()
                } else {
                    dueDateTime = new Date(formData.due_date).toISOString()
                }
            }

            const payload = {
                title: formData.title,
                description: formData.description,
                status: formData.status,
                priority: formData.priority,
                category: formData.category,
                tags: formData.tags,
                user_id: user.user.id,
                estimated_duration: formData.estimated_duration ? parseInt(formData.estimated_duration) : null,
                due_date: dueDateTime,
                is_recurring: formData.is_recurring,
                recurrence_pattern: formData.is_recurring ? formData.recurrence_pattern : null
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

    const handleRecurringChange = (checked) => {
        if (checked) {
            setFormData({
                ...formData,
                is_recurring: true,
                recurrence_pattern: {
                    type: 'daily',
                    days: [1, 2, 3, 4, 5, 6] // Monday to Saturday
                }
            })
        } else {
            setFormData({
                ...formData,
                is_recurring: false,
                recurrence_pattern: null
            })
        }
    }

    const toggleDay = (day) => {
        if (!formData.recurrence_pattern) return
        
        const days = formData.recurrence_pattern.days || []
        const newDays = days.includes(day)
            ? days.filter(d => d !== day)
            : [...days, day].sort((a, b) => a - b)
        
        setFormData({
            ...formData,
            recurrence_pattern: {
                ...formData.recurrence_pattern,
                days: newDays
            }
        })
    }

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

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

                        {/* Time Range */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={`block text-sm font-medium ${themeStyles.text} mb-1`}>
                                    Start Time
                                </label>
                                <input
                                    type="time"
                                    value={formData.start_time}
                                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                    className={`w-full px-3 py-2 rounded-lg border ${themeStyles.input}`}
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium ${themeStyles.text} mb-1`}>
                                    End Time
                                </label>
                                <input
                                    type="time"
                                    value={formData.end_time}
                                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
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

                        {/* Recurring Task */}
                        <div className="border-t pt-4">
                            <div className="flex items-center gap-2 mb-3">
                                <input
                                    type="checkbox"
                                    id="is_recurring"
                                    checked={formData.is_recurring}
                                    onChange={(e) => handleRecurringChange(e.target.checked)}
                                    className="w-4 h-4"
                                />
                                <label htmlFor="is_recurring" className={`text-sm font-medium ${themeStyles.text}`}>
                                    Make this a recurring daily task
                                </label>
                            </div>

                            {formData.is_recurring && (
                                <div>
                                    <label className={`block text-sm font-medium ${themeStyles.text} mb-2`}>
                                        Select Days
                                    </label>
                                    <div className="flex gap-2 flex-wrap">
                                        {dayNames.map((day, idx) => {
                                            const isSelected = formData.recurrence_pattern?.days?.includes(idx)
                                            return (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => toggleDay(idx)}
                                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                                        isSelected
                                                            ? 'bg-blue-600 text-white'
                                                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                                    }`}
                                                >
                                                    {day}
                                                </button>
                                            )
                                        })}
                                    </div>
                                    <p className={`text-xs ${themeStyles.accent} mt-2`}>
                                        Task will repeat on selected days each week
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
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
