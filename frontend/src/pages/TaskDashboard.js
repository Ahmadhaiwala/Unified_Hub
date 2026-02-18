import { useTheme } from "../context/ThemeContext"
import TaskList from "../components/tasks/TaskList"

export default function TaskDashboard() {
    const { themeStyles } = useTheme()

    return (
        <div className={`min-h-screen ${themeStyles.bg} p-6`}>
            <div className="max-w-7xl mx-auto">
                <TaskList />
            </div>
        </div>
    )
}
