import { useState } from "react"
import { useAuth } from "../../context/AuthContext"
import { useTheme } from "../../context/ThemeContext"
import { supabase } from "../../utils/supabaseClient"

export default function TaskItem({ task, onEdit, onDelete, onUpdate }) {
    const { user } = useAuth()
    const { themeStyles } = useTheme()
    const [updating, setUpdating] = useState(false)

    const priorityColors = {
        low: "bg-blue-500",
        medium: "bg-yellow-500",
        high: "bg-orange-500",
        urgent: "bg-red-500"
    }

    const statusLabels = {
        pending: "Pending",
        in_progress: "In Progress",
        completed: "Completed",
        archived: "Archived"
    }

    const handleStatusToggle = async () => {
        setUpdating(true)
        try {
            const newStatus = task.status === "completed" ? "pending" : 
                             task.status === "pending" ? "in_progress" :
                             task.status === "in_progress" ? "completed" : "pending"

            const updateData = { status: newStatus }
            if (newStatus === "completed") {
                updateData.completed_at = new Date().toISOString()
            }

            const { error } = await supabase
                .from('tasks')
                .update(updateData)
                .eq('id', task.id)
                .eq('user_id', user.user.id)

            if (error) throw error
            onUpdate()
        } catch (error) {
            console.error("Error updating task:", error)
            alert("Failed to update task")
        } finally {
            setUpdating(false)
        }
    }

    const handleDelete = async () => {
        if (!window.confirm("Delete this task?")) return

        try {
            const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', task.id)
                .eq('user_id', user.user.id)

            if (error) throw error
            onDelete()
        } catch (error) {
            console.error("Error deleting task:", error)
            alert("Failed to delete task")
        }
    }

    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "completed"
    const dueDate = task.due_date ? new Date(task.due_date) : null

    return (
        <div className={`${themeStyles.secondbar} rounded-lg p-4 border ${themeStyles.border} hover:shadow-md transition-shadow ${task.status === "completed" ? "opacity-60" : ""}`}>
            <div className="flex items-start gap-4">
                {/* Status Checkbox */}
                <button
                    onClick={handleStatusToggle}
                    disabled={updating}
                    className={`mt-1 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                        task.status === "completed"
                            ? "bg-green-500 border-green-500"
                            : "border-gray-400 hover:border-purple-500"
                    }`}
                >
                    {task.status === "completed" && (
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    )}
                </button>

                {/* Task Content */}
                <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <h3 className={`text-lg font-semibold ${themeStyles.text} ${task.status === "completed" ? "line-through" : ""}`}>
                                {task.title}
                            </h3>
                            {task.description && (
                                <p className={`text-sm ${themeStyles.accent} mt-1`}>
                                    {task.description}
                                </p>
                            )}
                        </div>

                        {/* Priority Badge */}
                        <div className={`w-3 h-3 rounded-full ${priorityColors[task.priority]} flex-shrink-0`} title={task.priority} />
                    </div>

                    {/* Meta Information */}
                    <div className="flex flex-wrap items-center gap-3 mt-3">
                        {/* Status Badge */}
                        <span className={`px-2 py-1 text-xs rounded-full ${
                            task.status === "completed" ? "bg-green-100 text-green-800" :
                            task.status === "in_progress" ? "bg-blue-100 text-blue-800" :
                            task.status === "archived" ? "bg-purple-100 text-purple-800" :
                            "bg-gray-100 text-gray-800"
                        }`}>
                            {statusLabels[task.status]}
                        </span>

                        {/* Category */}
                        {task.category && (
                            <span className={`px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800`}>
                                📁 {task.category}
                            </span>
                        )}

                        {/* Due Date */}
                        {dueDate && (
                            <span className={`px-2 py-1 text-xs rounded-full ${
                                isOverdue ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"
                            }`}>
                                📅 {dueDate.toLocaleDateString()}
                                {isOverdue && " (Overdue)"}
                            </span>
                        )}

                        {/* Duration */}
                        {task.estimated_duration && (
                            <span className={`px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800`}>
                                ⏱️ {task.estimated_duration}m
                            </span>
                        )}

                        {/* Tags */}
                        {task.tags && task.tags.length > 0 && (
                            <div className="flex gap-1">
                                {task.tags.map((tag, idx) => (
                                    <span key={idx} className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-3">
                        <button
                            onClick={() => onEdit(task)}
                            className="px-3 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                        >
                            ✏️ Edit
                        </button>
                        <button
                            onClick={handleDelete}
                            className="px-3 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                        >
                            🗑️ Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
