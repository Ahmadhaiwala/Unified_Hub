import { useState, useEffect } from "react"
import { useAuth } from "../../context/AuthContext"
import { useTheme } from "../../context/ThemeContext"
import { supabase } from "../../utils/supabaseClient"
import TaskItem from "./TaskItem"
import TaskForm from "./TaskForm"
import ProductivityHeatmap from "./ProductivityHeatmap"
import WeeklyTaskStats from "./WeeklyTaskStats"
import TaskOverview from "./TaskOverview"
import TaskStatistics from "./TaskStatistics"
import { ListTodo, BarChart3, Calendar } from "lucide-react"

export default function TaskList() {
    const { user } = useAuth()
    const { themeStyles } = useTheme()
    const [tasks, setTasks] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editingTask, setEditingTask] = useState(null)
    const [activeView, setActiveView] = useState("list")
    const [filters, setFilters] = useState({
        status: "",
        priority: "",
        category: "",
        search: ""
    })

    useEffect(() => {
        if (user?.user?.id) {
            fetchTasks()
            
            // Subscribe to real-time changes
            const subscription = supabase
                .channel('tasks_changes')
                .on('postgres_changes', 
                    { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${user.user.id}` },
                    (payload) => {
                        console.log('Task change:', payload)
                        fetchTasks()
                    }
                )
                .subscribe()

            return () => {
                subscription.unsubscribe()
            }
        }
    }, [user, filters])

    async function fetchTasks() {
        try {
            let query = supabase
                .from('tasks')
                .select('*')
                .eq('user_id', user.user.id)
                .order('created_at', { ascending: false })

            // Apply filters
            if (filters.status) {
                query = query.eq('status', filters.status)
            }
            if (filters.priority) {
                query = query.eq('priority', filters.priority)
            }
            if (filters.category) {
                query = query.eq('category', filters.category)
            }
            if (filters.search) {
                query = query.ilike('title', `%${filters.search}%`)
            }

            const { data, error } = await query

            if (error) throw error
            setTasks(data || [])
        } catch (error) {
            console.error("Error fetching tasks:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleTaskCreated = () => {
        setShowForm(false)
        setEditingTask(null)
        fetchTasks()
    }

    const handleTaskUpdated = () => {
        setEditingTask(null)
        fetchTasks()
    }

    const handleTaskDeleted = () => {
        fetchTasks()
    }

    const handleEdit = (task) => {
        setEditingTask(task)
        setShowForm(true)
    }

    if (loading) {
        return (
            <div className={`flex items-center justify-center h-64 ${themeStyles.text}`}>
                Loading tasks...
            </div>
        )
    }

    const views = [
        { id: "list", label: "Task List", icon: ListTodo },
        { id: "dashboard", label: "Dashboard", icon: BarChart3 },
        { id: "calendar", label: "Calendar", icon: Calendar }
    ]

    return (
        <div>
            {/* Navigation Tabs */}
            <div className={`${themeStyles.cardBg} rounded-t-lg shadow-lg px-6 pt-4`}>
                <div className="flex gap-2 border-b-2 border-gray-200 dark:border-gray-700">
                    {views.map((view) => {
                        const IconComponent = view.icon
                        return (
                            <button
                                key={view.id}
                                onClick={() => setActiveView(view.id)}
                                className={`flex items-center gap-2 px-4 py-3 font-medium transition-all ${
                                    activeView === view.id
                                        ? 'border-b-4 border-blue-600 text-blue-600 dark:text-blue-400 -mb-0.5'
                                        : `${themeStyles.accent} hover:${themeStyles.text} border-b-4 border-transparent`
                                }`}
                            >
                                <IconComponent size={20} />
                                {view.label}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Task List View */}
            {activeView === "list" && (
                <div className={`${themeStyles.cardBg} rounded-b-lg shadow-lg p-6`}>
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6">
                        <h2 className={`text-2xl font-bold ${themeStyles.text}`}>
                            📋 My Tasks
                        </h2>
                        <button
                            onClick={() => {
                                setEditingTask(null)
                                setShowForm(true)
                            }}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                            + New Task
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <input
                            type="text"
                            placeholder="🔍 Search tasks..."
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            className={`px-4 py-2 rounded-lg border ${themeStyles.input}`}
                        />
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            className={`px-4 py-2 rounded-lg border ${themeStyles.input}`}
                        >
                            <option value="">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="archived">Archived</option>
                        </select>
                        <select
                            value={filters.priority}
                            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                            className={`px-4 py-2 rounded-lg border ${themeStyles.input}`}
                        >
                            <option value="">All Priority</option>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                        </select>
                        <input
                            type="text"
                            placeholder="Category"
                            value={filters.category}
                            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                            className={`px-4 py-2 rounded-lg border ${themeStyles.input}`}
                        />
                    </div>

                    {/* Task List */}
                    {tasks.length === 0 ? (
                        <div className={`text-center py-12 ${themeStyles.accent}`}>
                            <p className="text-lg">No tasks found</p>
                            <p className="text-sm mt-2">Create your first task to get started!</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {tasks.map((task) => (
                                <TaskItem
                                    key={task.id}
                                    task={task}
                                    onEdit={handleEdit}
                                    onDelete={handleTaskDeleted}
                                    onUpdate={handleTaskUpdated}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Dashboard View */}
            {activeView === "dashboard" && (
                <div className={`${themeStyles.cardBg} rounded-b-lg shadow-lg p-6`}>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-6">
                            <ProductivityHeatmap />
                            <TaskOverview />
                        </div>
                        <div>
                            <WeeklyTaskStats />
                        </div>
                    </div>
                </div>
            )}

            {/* Calendar View */}
            {activeView === "calendar" && (
                <div className={`${themeStyles.cardBg} rounded-b-lg shadow-lg p-6`}>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                            <TaskStatistics />
                        </div>
                        <div className="space-y-6">
                            <TaskOverview />
                            <WeeklyTaskStats />
                        </div>
                    </div>
                </div>
            )}

            {/* Task Form Modal */}
            {showForm && (
                <TaskForm
                    task={editingTask}
                    onClose={() => {
                        setShowForm(false)
                        setEditingTask(null)
                    }}
                    onSuccess={handleTaskCreated}
                />
            )}
        </div>
    )
}
