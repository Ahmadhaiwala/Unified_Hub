import { useTheme } from "../context/ThemeContext"
import TaskList from "../components/tasks/TaskList"
import ProductivityHeatmap from "../components/tasks/ProductivityHeatmap"

export default function TaskDashboard() {
    const { themeStyles } = useTheme()

    return (
        <div className={`min-h-screen ${themeStyles.cardBg} p-6`}>
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className={`text-3xl font-bold ${themeStyles.text}`}>
                        📋 Task Management
                    </h1>
                </div>

                {/* Task List */}
                <TaskList />

                {/* Productivity Heatmap */}
                <ProductivityHeatmap />
            </div>
        </div>
    )
}
