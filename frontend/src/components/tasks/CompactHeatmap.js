import { useState, useEffect } from "react"
import { useAuth } from "../../context/AuthContext"
import { useTheme } from "../../context/ThemeContext"
import { supabase } from "../../utils/supabaseClient"

export default function CompactHeatmap({ userId }) {
    const { user } = useAuth()
    const { themeStyles } = useTheme()
    const [year, setYear] = useState(new Date().getFullYear())
    const [heatmapData, setHeatmapData] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (user?.user?.id || userId) {
            fetchHeatmapData()
        }
    }, [user, userId, year])

    async function fetchHeatmapData() {
        try {
            const targetUserId = userId || user.user.id
            const startDate = new Date(year, 0, 1).toISOString()
            const endDate = new Date(year, 11, 31, 23, 59, 59).toISOString()

            const { data: history, error } = await supabase
                .from('task_history')
                .select('*')
                .eq('user_id', targetUserId)
                .gte('created_at', startDate)
                .lte('created_at', endDate)
                .order('created_at', { ascending: true })

            if (error) throw error

            // Aggregate by date
            const dailyStats = {}
            history.forEach(record => {
                const dateStr = record.created_at.split('T')[0]
                
                if (!dailyStats[dateStr]) {
                    dailyStats[dateStr] = { date: dateStr, count: 0 }
                }

                if (record.action === 'completed') {
                    dailyStats[dateStr].count += 1
                }
            })

            // Calculate streaks
            const sortedDates = Object.keys(dailyStats).sort()
            let currentStreak = 0
            let longestStreak = 0
            let tempStreak = 0
            const today = new Date().toISOString().split('T')[0]

            sortedDates.forEach((dateStr, i) => {
                if (i === 0 || isConsecutiveDay(sortedDates[i-1], dateStr)) {
                    tempStreak += 1
                } else {
                    tempStreak = 1
                }
                
                longestStreak = Math.max(longestStreak, tempStreak)
                
                if (dateStr === today) {
                    currentStreak = tempStreak
                }
            })

            const totalCompleted = Object.values(dailyStats).reduce((sum, day) => sum + day.count, 0)

            setHeatmapData({
                daily_stats: Object.values(dailyStats),
                current_streak: currentStreak,
                longest_streak: longestStreak,
                total_tasks_completed: totalCompleted
            })
        } catch (error) {
            console.error("Error fetching heatmap data:", error)
        } finally {
            setLoading(false)
        }
    }

    function isConsecutiveDay(date1, date2) {
        const d1 = new Date(date1)
        const d2 = new Date(date2)
        const diffTime = Math.abs(d2 - d1)
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return diffDays === 1
    }

    function getIntensityColor(count) {
        if (count === 0) return "bg-gray-200 dark:bg-gray-700"
        if (count <= 2) return "bg-green-200 dark:bg-green-800"
        if (count <= 4) return "bg-green-400 dark:bg-green-600"
        if (count <= 6) return "bg-green-600 dark:bg-green-500"
        return "bg-green-800 dark:bg-green-400"
    }

    function generateCompactGrid() {
        const startDate = new Date(year, 0, 1)
        const endDate = new Date(year, 11, 31)
        const weeks = []
        let currentWeek = []
        
        let currentDate = new Date(startDate)
        const startDay = currentDate.getDay()
        
        for (let i = 0; i < startDay; i++) {
            currentWeek.push(null)
        }

        while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split('T')[0]
            const dayData = heatmapData?.daily_stats.find(d => d.date === dateStr)
            const count = dayData?.count || 0

            currentWeek.push({ date: dateStr, count: count })

            if (currentWeek.length === 7) {
                weeks.push(currentWeek)
                currentWeek = []
            }

            currentDate.setDate(currentDate.getDate() + 1)
        }

        if (currentWeek.length > 0) {
            while (currentWeek.length < 7) {
                currentWeek.push(null)
            }
            weeks.push(currentWeek)
        }

        return weeks
    }

    if (loading) {
        return (
            <div className={`${themeStyles.cardBg} border-4 ${themeStyles.border} rounded-2xl p-6 animate-pulse`}>
                <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
        )
    }

    const weeks = heatmapData ? generateCompactGrid() : []

    return (
        <div className={`${themeStyles.cardBg} border-4 ${themeStyles.border} rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 animate-fade-in`}>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-black uppercase flex items-center gap-2">
                    <span>📊</span>
                    <span>Activity Heatmap</span>
                </h2>
                <select
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value))}
                    className={`px-3 py-1 rounded-lg border-2 ${themeStyles.border} ${themeStyles.cardBg} text-sm font-bold`}
                >
                    {[2024, 2025, 2026].map(y => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>
            </div>

            {/* Stats Row */}
            {heatmapData && (
                <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
                            {heatmapData.current_streak}
                        </p>
                        <p className="text-xs font-bold uppercase opacity-70">Current Streak</p>
                    </div>
                    <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
                            {heatmapData.longest_streak}
                        </p>
                        <p className="text-xs font-bold uppercase opacity-70">Best Streak</p>
                    </div>
                    <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <p className="text-2xl font-black text-green-600 dark:text-green-400">
                            {heatmapData.total_tasks_completed}
                        </p>
                        <p className="text-xs font-bold uppercase opacity-70">Completed</p>
                    </div>
                </div>
            )}

            {/* Compact Heatmap Grid */}
            <div className="overflow-x-auto pb-2">
                <div className="inline-block min-w-full">
                    <div className="flex gap-1.5 justify-center">
                        {weeks.map((week, weekIdx) => (
                            <div key={weekIdx} className="flex flex-col gap-1.5">
                                {week.map((day, dayIdx) => (
                                    <div
                                        key={dayIdx}
                                        className={`w-4 h-4 rounded transition-all hover:scale-125 hover:z-10 cursor-pointer ${
                                            day ? getIntensityColor(day.count) : "bg-transparent"
                                        }`}
                                        title={day ? `${day.date}: ${day.count} tasks completed` : ""}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-2 mt-4 text-xs font-medium">
                <span className={`${themeStyles.accent}`}>Less</span>
                <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="w-4 h-4 bg-green-200 dark:bg-green-800 rounded" />
                <div className="w-4 h-4 bg-green-400 dark:bg-green-600 rounded" />
                <div className="w-4 h-4 bg-green-600 dark:bg-green-500 rounded" />
                <div className="w-4 h-4 bg-green-800 dark:bg-green-400 rounded" />
                <span className={`${themeStyles.accent}`}>More</span>
            </div>
        </div>
    )
}
