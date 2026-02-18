import { useState, useEffect } from "react"
import { useAuth } from "../../context/AuthContext"
import { useTheme } from "../../context/ThemeContext"
import { supabase } from "../../utils/supabaseClient"
import { Calendar, TrendingUp } from "lucide-react"

export default function WeeklyTaskStats() {
    const { user } = useAuth()
    const { themeStyles } = useTheme()
    const [weeklyStats, setWeeklyStats] = useState([])
    const [loading, setLoading] = useState(true)
    const [totalCompleted, setTotalCompleted] = useState(0)

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    useEffect(() => {
        if (user?.user?.id) {
            fetchWeeklyStats()
        }
    }, [user])

    const fetchWeeklyStats = async () => {
        try {
            // Get start of current week (Sunday)
            const now = new Date()
            const startOfWeek = new Date(now)
            startOfWeek.setDate(now.getDate() - now.getDay())
            startOfWeek.setHours(0, 0, 0, 0)

            // Get end of week (Saturday)
            const endOfWeek = new Date(startOfWeek)
            endOfWeek.setDate(startOfWeek.getDate() + 6)
            endOfWeek.setHours(23, 59, 59, 999)

            // Fetch completed tasks for this week
            const { data, error } = await supabase
                .from('task_history')
                .select('created_at, action')
                .eq('user_id', user.user.id)
                .eq('action', 'completed')
                .gte('created_at', startOfWeek.toISOString())
                .lte('created_at', endOfWeek.toISOString())

            if (error) throw error

            // Group by day of week
            const stats = Array(7).fill(0).map((_, idx) => ({
                day: dayNames[idx],
                dayIndex: idx,
                count: 0
            }))

            data.forEach(item => {
                const date = new Date(item.created_at)
                const dayIndex = date.getDay()
                stats[dayIndex].count++
            })

            setWeeklyStats(stats)
            setTotalCompleted(data.length)
        } catch (error) {
            console.error("Error fetching weekly stats:", error)
        } finally {
            setLoading(false)
        }
    }

    const maxCount = Math.max(...weeklyStats.map(s => s.count), 1)
    const mostProductiveDay = weeklyStats.reduce((max, stat) => 
        stat.count > max.count ? stat : max, 
        { day: 'None', count: 0 }
    )

    if (loading) {
        return (
            <div className={`${themeStyles.cardBg} border-4 ${themeStyles.border} p-6`}>
                <div className="animate-pulse">
                    <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
                    <div className="space-y-2">
                        {[1, 2, 3, 4, 5, 6, 7].map(i => (
                            <div key={i} className="h-8 bg-gray-300 dark:bg-gray-700 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className={`${themeStyles.cardBg} border-4 ${themeStyles.border} p-6`}>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-black uppercase flex items-center gap-2">
                    <Calendar size={24} />
                    This Week's Tasks
                </h2>
                <div className="text-right">
                    <p className="text-3xl font-black text-blue-600 dark:text-blue-400">
                        {totalCompleted}
                    </p>
                    <p className="text-xs opacity-70">Completed</p>
                </div>
            </div>

            {/* Weekly Bar Chart */}
            <div className="space-y-2 mb-4">
                {weeklyStats.map((stat) => {
                    const today = new Date().getDay()
                    const isToday = stat.dayIndex === today
                    const percentage = maxCount > 0 ? (stat.count / maxCount) * 100 : 0

                    return (
                        <div key={stat.day} className="flex items-center gap-3">
                            <div className={`w-12 text-sm font-bold ${isToday ? 'text-blue-600 dark:text-blue-400' : themeStyles.text}`}>
                                {stat.day}
                            </div>
                            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-8 relative overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                        isToday 
                                            ? 'bg-blue-600' 
                                            : 'bg-green-500'
                                    }`}
                                    style={{ width: `${percentage}%` }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className={`text-sm font-bold ${
                                        percentage > 30 ? 'text-white' : themeStyles.text
                                    }`}>
                                        {stat.count > 0 ? stat.count : ''}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Most Productive Day */}
            {mostProductiveDay.count > 0 && (
                <div className={`${themeStyles.secondbar} rounded-lg p-3 flex items-center gap-2`}>
                    <TrendingUp size={20} className="text-green-500" />
                    <div>
                        <p className="text-sm font-medium">Most Productive Day</p>
                        <p className="text-lg font-bold text-green-600 dark:text-green-400">
                            {mostProductiveDay.day} ({mostProductiveDay.count} tasks)
                        </p>
                    </div>
                </div>
            )}

            {totalCompleted === 0 && (
                <div className="text-center py-4 opacity-70">
                    <p className="text-sm">No tasks completed this week yet.</p>
                    <p className="text-xs mt-1">Start completing tasks to see your weekly progress!</p>
                </div>
            )}
        </div>
    )
}
