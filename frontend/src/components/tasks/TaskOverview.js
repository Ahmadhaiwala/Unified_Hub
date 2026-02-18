import { useState, useEffect } from "react"
import { useAuth } from "../../context/AuthContext"
import { useTheme } from "../../context/ThemeContext"
import { supabase } from "../../utils/supabaseClient"
import { AlertCircle, Clock, CheckCircle, Calendar } from "lucide-react"

export default function TaskOverview() {
    const { user } = useAuth()
    const { themeStyles } = useTheme()
    const [stats, setStats] = useState({
        overdue: [],
        today: [],
        tomorrow: [],
        upcoming: [],
        completed: 0
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (user?.user?.id) {
            fetchTaskStats()
        }
    }, [user])

    const fetchTaskStats = async () => {
        try {
            const now = new Date()
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            const tomorrow = new Date(today)
            tomorrow.setDate(tomorrow.getDate() + 1)
            const nextWeek = new Date(today)
            nextWeek.setDate(nextWeek.getDate() + 7)

            // Fetch all pending and in_progress tasks
            const { data: tasks, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('user_id', user.user.id)
                .in('status', ['pending', 'in_progress'])
                .order('due_date', { ascending: true })

            if (error) throw error

            // Categorize tasks
            const overdue = []
            const todayTasks = []
            const tomorrowTasks = []
            const upcomingTasks = []

            tasks.forEach(task => {
                if (!task.due_date) {
                    upcomingTasks.push(task)
                    return
                }

                const dueDate = new Date(task.due_date)
                const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())

                if (dueDateOnly < today) {
                    overdue.push(task)
                } else if (dueDateOnly.getTime() === today.getTime()) {
                    todayTasks.push(task)
                } else if (dueDateOnly.getTime() === tomorrow.getTime()) {
                    tomorrowTasks.push(task)
                } else if (dueDateOnly < nextWeek) {
                    upcomingTasks.push(task)
                }
            })

            // Get completed tasks count for today
            const { data: completedToday, error: completedError } = await supabase
                .from('task_history')
                .select('id', { count: 'exact' })
                .eq('user_id', user.user.id)
                .eq('action', 'completed')
                .gte('created_at', today.toISOString())

            if (completedError) throw completedError

            setStats({
                overdue,
                today: todayTasks,
                tomorrow: tomorrowTasks,
                upcoming: upcomingTasks,
                completed: completedToday?.length || 0
            })
        } catch (error) {
            console.error("Error fetching task stats:", error)
        } finally {
            setLoading(false)
        }
    }

    const formatTime = (dateString) => {
        if (!dateString) return null
        const date = new Date(dateString)
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    }

    const TaskCard = ({ task, showTime = false }) => (
        <div className={`p-3 rounded-lg border ${themeStyles.border} ${themeStyles.secondbar} hover:shadow-md transition-all`}>
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                    <h4 className={`font-medium ${themeStyles.text} text-sm`}>{task.title}</h4>
                    {showTime && task.due_date && (
                        <p className="text-xs opacity-70 mt-1">
                            <Clock size={12} className="inline mr-1" />
                            {formatTime(task.due_date)}
                        </p>
                    )}
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                    task.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                    task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                }`}>
                    {task.priority}
                </span>
            </div>
        </div>
    )

    if (loading) {
        return (
            <div className={`${themeStyles.cardBg} border-4 ${themeStyles.border} p-6`}>
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-1/3"></div>
                    <div className="space-y-2">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-16 bg-gray-300 dark:bg-gray-700 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    const totalPending = stats.overdue.length + stats.today.length + stats.tomorrow.length + stats.upcoming.length

    return (
        <div className={`${themeStyles.cardBg} border-4 ${themeStyles.border} p-6`}>
            <h2 className="text-2xl font-black uppercase mb-4 flex items-center gap-2">
                <Calendar size={24} />
                Task Overview
            </h2>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className={`${themeStyles.secondbar} rounded-lg p-3 text-center`}>
                    <p className="text-2xl font-black text-green-600 dark:text-green-400">
                        {stats.completed}
                    </p>
                    <p className="text-xs opacity-70">Completed Today</p>
                </div>
                <div className={`${themeStyles.secondbar} rounded-lg p-3 text-center`}>
                    <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
                        {totalPending}
                    </p>
                    <p className="text-xs opacity-70">Pending Tasks</p>
                </div>
            </div>

            {/* Overdue Tasks */}
            {stats.overdue.length > 0 && (
                <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertCircle size={18} className="text-red-500" />
                        <h3 className="font-bold text-red-600 dark:text-red-400">
                            Overdue ({stats.overdue.length})
                        </h3>
                    </div>
                    <div className="space-y-2">
                        {stats.overdue.slice(0, 3).map(task => (
                            <TaskCard key={task.id} task={task} showTime />
                        ))}
                        {stats.overdue.length > 3 && (
                            <p className="text-xs text-center opacity-70 py-2">
                                +{stats.overdue.length - 3} more overdue tasks
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Today's Tasks */}
            {stats.today.length > 0 && (
                <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock size={18} className="text-blue-500" />
                        <h3 className="font-bold text-blue-600 dark:text-blue-400">
                            Today ({stats.today.length})
                        </h3>
                    </div>
                    <div className="space-y-2">
                        {stats.today.slice(0, 3).map(task => (
                            <TaskCard key={task.id} task={task} showTime />
                        ))}
                        {stats.today.length > 3 && (
                            <p className="text-xs text-center opacity-70 py-2">
                                +{stats.today.length - 3} more tasks today
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Tomorrow's Tasks */}
            {stats.tomorrow.length > 0 && (
                <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Calendar size={18} className="text-orange-500" />
                        <h3 className="font-bold text-orange-600 dark:text-orange-400">
                            Tomorrow ({stats.tomorrow.length})
                        </h3>
                    </div>
                    <div className="space-y-2">
                        {stats.tomorrow.slice(0, 2).map(task => (
                            <TaskCard key={task.id} task={task} showTime />
                        ))}
                        {stats.tomorrow.length > 2 && (
                            <p className="text-xs text-center opacity-70 py-2">
                                +{stats.tomorrow.length - 2} more tasks tomorrow
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Upcoming Tasks */}
            {stats.upcoming.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle size={18} className="text-gray-500" />
                        <h3 className="font-bold opacity-70">
                            This Week ({stats.upcoming.length})
                        </h3>
                    </div>
                    <div className="space-y-2">
                        {stats.upcoming.slice(0, 2).map(task => (
                            <TaskCard key={task.id} task={task} />
                        ))}
                        {stats.upcoming.length > 2 && (
                            <p className="text-xs text-center opacity-70 py-2">
                                +{stats.upcoming.length - 2} more upcoming tasks
                            </p>
                        )}
                    </div>
                </div>
            )}

            {totalPending === 0 && stats.completed === 0 && (
                <div className="text-center py-8 opacity-70">
                    <CheckCircle size={48} className="mx-auto mb-3 text-green-500" />
                    <p className="text-sm">No pending tasks!</p>
                    <p className="text-xs mt-1">Create a new task to get started.</p>
                </div>
            )}
        </div>
    )
}
