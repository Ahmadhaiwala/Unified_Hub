import { useTheme } from "../context/ThemeContext"

export default function Loading({ text = "Loading..." }) {
    const { themeStyles } = useTheme()

    return (
        <div
            className={`min-h-screen flex flex-col items-center justify-center gap-4
      ${themeStyles.bg} ${themeStyles.text}`}
        >
          
            <div
                className={`h-12 w-12 rounded-full border-4 border-t-transparent animate-spin
        ${themeStyles.border}`}
            />

          
            <p className="text-sm opacity-80">{text}</p>
        </div>
    )
}
