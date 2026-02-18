import { useState, useEffect } from "react"
import { useAuth } from "../../context/AuthContext"
import { useTheme } from "../../context/ThemeContext"
import { supabase } from "../../utils/supabaseClient"
import { TrendingUp, PieChart, BarChart3, Target, Clock, CheckCircle2 } from "lucide-react"

export default function TaskStatistics() {
    const { user } = useAuth()
    const { themeStyles } = useTheme()
    const [stats, setStats] = useState({
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        completionRate: 0,
        avgCompletionTime: 0,
        priorityBreakdown: { urgent: 0, high: 0, medium: 0, low: 0 },
        statusBreakdown: { pending: 0, in_progress: 0, completed: 0, archived: 0 },
        categoryBreakdown: {},
        monthlyTrend: []
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (user?.user?.id) {
            fetchStatistics()
        }
    }, [user])

    const fetchStatistics = async () => {
        try {
            // Fetch all tasks
            const { data: tasks, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('user_id', user.user.id)

            if (error) throw error

            // Calculate statistics
            const totalTasks = tasks.length
            const completedTasks = tasks.filter(t => t.status === 'completed').length
            const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length
            const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

            // Priority breakdown
            const priorityBreakdown = {
                urgent: tasks.filter(t => t.priority === 'urgent').length,
                high: tasks.filter(t => t.priority === 'high').length,
                medium: tasks.filter(t => t.priority === 'medium').length,
                low: tasks.filter(t => t.priority === 'low').length
            }

            // Status breakdown
            const statusBreakdown = {
                pending: tasks.filter(t => t.status === 'pending').length,
                in_progress: tasks.filter(t => t.status === 'in_progress').length,
                completed: tasks.filter(t => t.status === 'completed').length,
                archived: tasks.filter(t => t.status === 'archived').length
            }

            // Category breakdown
            const categoryBreakdown = {}
            tasks.forEach(task => {
                if (task.category) {
                    categoryBreakdown[task.category] = (categoryBreakdown[task.category] || 0) + 1
                }
            })

            // Monthly trend (last 6 months)
            const monthlyTrend = []
            for (let i = 5; i >= 0; i--) {
                const date = new Date()
                date.setMonth(date.getMonth() - i)
                const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
                const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)

                const monthTasks = tasks.filter(t => {
                    const createdAt = new Date(t.created_at)
                    return createdAt >= monthStart && createdAt <= monthEnd
                })

                const monthCompleted = monthTasks.filter(t => t.status === 'completed').length

                monthlyTrend.push({
                    month: date.toLocaleDateString('en-US', { month: 'short' }),
                    created: monthTasks.length,
                    completed: monthCompleted
                })
            }

            // Average completion time
            const completedWithDuration = tasks.filter(t => t.status === 'completed' && t.actual_duration)
            const avgCompletionTime = completedWithDuration.length > 0
                ? Math.round(completedWithDuration.reduce((sum, t) => sum + (t.actual_duration || 0), 0) / completedWithDuration.length)
                : 0

            setStats({
                totalTasks,
                completedTasks,
                pendingTasks,
                completionRate,
                avgCompletionTime,
                priorityBreakdown,
                statusBreakdown,
                categoryBreakdown,
                monthlyTrend
            })
        } catch (error) {
            console.error("Error fetching statistics:", error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="animate-pulse space-y-6">
                <div className="h-32 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
                <div className="h-64 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
            </div>
        )
    }

    const maxMonthlyValue = Math.max(...stats.monthlyTrend.map(m => Math.max(m.created, m.completed)), 1)

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className={`${themeStyles.cardBg} border-2 ${themeStyles.border} rounded-lg p-4`}>
                    <div className="flex items-center justify-between mb-2">
                        <Target size={24} className="text-blue-500" />
                        <span className="text-3xl font-black text-blue-600 dark:text-blue-400">
                            {stats.totalTasks}
                        </span>
                    </div>
                    <p className={`text-sm font-medium ${themeStyles.text}`}>Total Tasks</p>
                </div>

                <div className={`${themeStyles.cardBg} border-2 ${themeStyles.border} rounded-lg p-4`}>
                    <div className="flex items-center justify-between mb-2">
                        <CheckCircle2 size={24} className="text-green-500" />
                        <span className="text-3xl font-black text-green-600 dark:text-green-400">
                            {stats.completedTasks}
                        </span>
                    </div>
                    <p className={`text-sm font-medium ${themeStyles.text}`}>Completed</p>
                </div>

                <div className={`${themeStyles.cardBg} border-2 ${themeStyles.border} rounded-lg p-4`}>
                    <div className="flex items-center justify-between mb-2">
                        <Clock size={24} className="text-orange-500" />
                        <span className="text-3xl font-black text-orange-600 dark:text-orange-400">
                            {stats.pendingTasks}
                        </span>
                    </div>
                    <p className={`text-sm font-medium ${themeStyles.text}`}>Pending</p>
                </div>

                <div className={`${themeStyles.cardBg} border-2 ${themeStyles.border} rounded-lg p-4`}>
                    <div className="flex items-center justify-between mb-2">
                        <TrendingUp size={24} className="text-purple-500" />
                        <span className="text-3xl font-black text-purple-600 dark:text-purple-400">
                            {stats.completionRate}%
                        </span>
                    </div>
                    <p className={`text-sm font-medium ${themeStyles.text}`}>Completion Rate</p>
                </div>
            </div>

            {/* Monthly Trend Chart */}
            <div className={`${themeStyles.cardBg} border-2 ${themeStyles.border} rounded-lg p-6`}>
                <div className="flex items-center gap-2 mb-6">
                    <BarChart3 size={24} className="text-blue-500" />
                    <h3 className={`text-xl font-bold ${themeStyles.text}`}>
                        6-Month Trend
                    </h3>
                </div>

                <div className="space-y-4">
                    {stats.monthlyTrend.map((month, idx) => (
                        <div key={idx}>
                            <div className="flex items-center justify-between mb-2">
                                <span className={`text-sm font-medium ${themeStyles.text} w-12`}>
                                    {month.month}
                                </span>
                                <div className="flex-1 flex gap-2">
                                    {/* Created bar */}
                                    <div className="flex-1">
                                        <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-6 relative overflow-hidden">
                                            <div
                                                className="bg-blue-500 h-full rounded-full transition-all duration-500"
                                                style={{ width: `${(month.created / maxMonthlyValue) * 100}%` }}
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="text-xs font-bold text-white">
                                                    {month.created > 0 ? month.created : ''}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-center mt-1 opacity-70">Created</p>
                                    </div>

                                    {/* Completed bar */}
                                    <div className="flex-1">
                                        <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-6 relative overflow-hidden">
                                            <div
                                                className="bg-green-500 h-full rounded-full transition-all duration-500"
                                                style={{ width: `${(month.completed / maxMonthlyValue) * 100}%` }}
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="text-xs font-bold text-white">
                                                    {month.completed > 0 ? month.completed : ''}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-center mt-1 opacity-70">Completed</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Priority & Status Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Priority Breakdown */}
                <div className={`${themeStyles.cardBg} border-2 ${themeStyles.border} rounded-lg p-6`}>
                    <div className="flex items-center gap-2 mb-4">
                        <PieChart size={24} className="text-red-500" />
                        <h3 className={`text-xl font-bold ${themeStyles.text}`}>
                            Priority Breakdown
                        </h3>
                    </div>

                    <div className="space-y-3">
                        {Object.entries(stats.priorityBreakdown).map(([priority, count]) => {
                            const percentage = stats.totalTasks > 0 ? (count / stats.totalTasks) * 100 : 0
                            const colors = {
                                urgent: 'bg-red-500',
                                high: 'bg-orange-500',
                                medium: 'bg-yellow-500',
                                low: 'bg-green-500'
                            }

                            return (
                                <div key={priority}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={`text-sm font-medium ${themeStyles.text} capitalize`}>
                                            {priority}
                                        </span>
                                        <span className={`text-sm font-bold ${themeStyles.text}`}>
                                            {count} ({Math.round(percentage)}%)
                                        </span>
                                    </div>
                                    <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                                        <div
                                            className={`${colors[priority]} h-full rounded-full transition-all duration-500`}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Status Breakdown */}
                <div className={`${themeStyles.cardBg} border-2 ${themeStyles.border} rounded-lg p-6`}>
                    <div className="flex items-center gap-2 mb-4">
                        <Target size={24} className="text-blue-500" />
                        <h3 className={`text-xl font-bold ${themeStyles.text}`}>
                            Status Breakdown
                        </h3>
                    </div>

                    <div className="space-y-3">
                        {Object.entries(stats.statusBreakdown).map(([status, count]) => {
                            const percentage = stats.totalTasks > 0 ? (count / stats.totalTasks) * 100 : 0
                            const colors = {
                                pending: 'bg-gray-500',
                                in_progress: 'bg-blue-500',
                                completed: 'bg-green-500',
                                archived: 'bg-purple-500'
                            }

                            return (
                                <div key={status}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={`text-sm font-medium ${themeStyles.text} capitalize`}>
                                            {status.replace('_', ' ')}
                                        </span>
                                        <span className={`text-sm font-bold ${themeStyles.text}`}>
                                            {count} ({Math.round(percentage)}%)
                                        </span>
                                    </div>
                                    <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                                        <div
                                            className={`${colors[status]} h-full rounded-full transition-all duration-500`}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Category Breakdown */}
            {Object.keys(stats.categoryBreakdown).length > 0 && (
                <div className={`${themeStyles.cardBg} border-2 ${themeStyles.border} rounded-lg p-6`}>
                    <div className="flex items-center gap-2 mb-4">
                        <PieChart size={24} className="text-purple-500" />
                        <h3 className={`text-xl font-bold ${themeStyles.text}`}>
                            Category Distribution
                        </h3>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {Object.entries(stats.categoryBreakdown)
                            .sort((a, b) => b[1] - a[1])
                            .map(([category, count]) => {
                                const percentage = stats.totalTasks > 0 ? Math.round((count / stats.totalTasks) * 100) : 0
                                return (
                                    <div key={category} className={`${themeStyles.secondbar} rounded-lg p-4 text-center`}>
                                        <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
                                            {count}
                                        </p>
                                        <p className={`text-sm font-medium ${themeStyles.text} mt-1`}>
                                            {category}
                                        </p>
                                        <p className="text-xs opacity-70 mt-1">
                                            {percentage}% of total
                                        </p>
                                    </div>
                                )
                            })}
                    </div>
                </div>
            )}
        </div>
    )
}
