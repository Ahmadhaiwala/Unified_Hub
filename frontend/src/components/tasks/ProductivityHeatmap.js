import { useState, useEffect } from "react"
import { useAuth } from "../../context/AuthContext"
import { useTheme } from "../../context/ThemeContext"
import { supabase } from "../../utils/supabaseClient"

export default function ProductivityHeatmap() {
    const { user } = useAuth()
    const { themeStyles } = useTheme()
    const [year, setYear] = useState(new Date().getFullYear())
    const [heatmapData, setHeatmapData] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (user?.user?.id) {
            fetchHeatmapData()
        }
    }, [user, year])

    async function fetchHeatmapData() {
        try {
            const startDate = new Date(year, 0, 1).toISOString()
            const endDate = new Date(year, 11, 31, 23, 59, 59).toISOString()

            // Fetch task history for the year
            const { data: history, error } = await supabase
                .from('task_history')
                .select('*')
                .eq('user_id', user.user.id)
                .gte('created_at', startDate)
                .lte('created_at', endDate)
                .order('created_at', { ascending: true })

            if (error) throw error

            // Aggregate by date
            const dailyStats = {}
            history.forEach(record => {
                const dateStr = record.created_at.split('T')[0]
                
                if (!dailyStats[dateStr]) {
                    dailyStats[dateStr] = {
                        date: dateStr,
                        tasks_completed: 0,
                        tasks_created: 0,
                        time_spent: 0
                    }
                }

                if (record.action === 'completed') {
                    dailyStats[dateStr].tasks_completed += 1
                    dailyStats[dateStr].time_spent += record.time_spent || 0
                } else if (record.action === 'created') {
                    dailyStats[dateStr].tasks_created += 1
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

            const totalCompleted = Object.values(dailyStats).reduce((sum, day) => sum + day.tasks_completed, 0)
            const totalTime = Object.values(dailyStats).reduce((sum, day) => sum + day.time_spent, 0)

            setHeatmapData({
                daily_stats: Object.values(dailyStats),
                current_streak: currentStreak,
                longest_streak: longestStreak,
                total_tasks_completed: totalCompleted,
                total_time_spent: totalTime
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
        if (count === 0) return "bg-gray-100"
        if (count <= 2) return "bg-green-200"
        if (count <= 4) return "bg-green-400"
        if (count <= 6) return "bg-green-600"
        return "bg-green-800"
    }

    function generateHeatmapGrid() {
        const startDate = new Date(year, 0, 1)
        const endDate = new Date(year, 11, 31)
        const weeks = []
        let currentWeek = []
        
        // Start from the first day of the year
        let currentDate = new Date(startDate)
        
        // Pad the beginning with empty cells
        const startDay = currentDate.getDay()
        for (let i = 0; i < startDay; i++) {
            currentWeek.push(null)
        }

        while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split('T')[0]
            const dayData = heatmapData?.daily_stats.find(d => d.date === dateStr)
            const count = dayData?.tasks_completed || 0

            currentWeek.push({
                date: dateStr,
                count: count,
                display: currentDate.getDate()
            })

            if (currentWeek.length === 7) {
                weeks.push(currentWeek)
                currentWeek = []
            }

            currentDate.setDate(currentDate.getDate() + 1)
        }

        // Pad the end
        if (currentWeek.length > 0) {
            while (currentWeek.length < 7) {
                currentWeek.push(null)
            }
            weeks.push(currentWeek)
        }

        return weeks
    }

    if (loading) {
        return <div className={`p-6 ${themeStyles.text}`}>Loading heatmap...</div>
    }

    const weeks = heatmapData ? generateHeatmapGrid() : []

    return (
        <div className={`${themeStyles.cardBg} rounded-lg shadow-lg p-6`}>
            <div className="flex justify-between items-center mb-6">
                <h2 className={`text-2xl font-bold ${themeStyles.text}`}>
                    📊 Productivity Heatmap
                </h2>
                <select
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value))}
                    className={`px-3 py-2 rounded-lg border ${themeStyles.input}`}
                >
                    {[2024, 2025, 2026].map(y => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>
            </div>

            {/* Stats */}
            {heatmapData && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className={`${themeStyles.secondbar} p-4 rounded-lg`}>
                        <p className={`text-sm ${themeStyles.accent}`}>Current Streak</p>
                        <p className={`text-2xl font-bold ${themeStyles.text}`}>
                            {heatmapData.current_streak} days
                        </p>
                    </div>
                    <div className={`${themeStyles.secondbar} p-4 rounded-lg`}>
                        <p className={`text-sm ${themeStyles.accent}`}>Longest Streak</p>
                        <p className={`text-2xl font-bold ${themeStyles.text}`}>
                            {heatmapData.longest_streak} days
                        </p>
                    </div>
                    <div className={`${themeStyles.secondbar} p-4 rounded-lg`}>
                        <p className={`text-sm ${themeStyles.accent}`}>Total Completed</p>
                        <p className={`text-2xl font-bold ${themeStyles.text}`}>
                            {heatmapData.total_tasks_completed}
                        </p>
                    </div>
                    <div className={`${themeStyles.secondbar} p-4 rounded-lg`}>
                        <p className={`text-sm ${themeStyles.accent}`}>Time Spent</p>
                        <p className={`text-2xl font-bold ${themeStyles.text}`}>
                            {Math.round(heatmapData.total_time_spent / 60)}h
                        </p>
                    </div>
                </div>
            )}

            {/* Heatmap Grid */}
            <div className="overflow-x-auto">
                <div className="inline-block min-w-full">
                    <div className="flex gap-1">
                        {weeks.map((week, weekIdx) => (
                            <div key={weekIdx} className="flex flex-col gap-1">
                                {week.map((day, dayIdx) => (
                                    <div
                                        key={dayIdx}
                                        className={`w-3 h-3 rounded-sm ${
                                            day ? getIntensityColor(day.count) : "bg-transparent"
                                        }`}
                                        title={day ? `${day.date}: ${day.count} tasks` : ""}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-2 mt-4">
                <span className={`text-sm ${themeStyles.accent}`}>Less</span>
                <div className="w-3 h-3 bg-gray-100 rounded-sm" />
                <div className="w-3 h-3 bg-green-200 rounded-sm" />
                <div className="w-3 h-3 bg-green-400 rounded-sm" />
                <div className="w-3 h-3 bg-green-600 rounded-sm" />
                <div className="w-3 h-3 bg-green-800 rounded-sm" />
                <span className={`text-sm ${themeStyles.accent}`}>More</span>
            </div>
        </div>
    )
}
