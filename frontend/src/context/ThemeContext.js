import React, { createContext, useContext, useState, useEffect } from 'react';

const themes = {

  light: {
    name: 'Modern Light',
    properties: {
      bg: 'bg-white min-h-screen text-gray-900',
      secondbar: 'bg-gray-50 border-b border-gray-200',
      cardBg: 'bg-white shadow-lg rounded-xl border border-gray-200',
      text: 'text-gray-900',
      accent: 'text-gray-600',
      border: 'border-gray-200',
      sectionAccent: 'border-l-4 border-blue-500 pl-4',

      section: 'bg-white rounded-xl p-6 shadow-md border border-gray-200',
      heading: 'text-gray-900 font-bold tracking-tight',

      cardSoft: 'bg-gray-50 rounded-xl p-5 shadow-sm border border-gray-200',

      button: `
        bg-blue-600
        text-white
        px-6 py-2.5
        rounded-lg
        font-semibold
        shadow-md
        hover:bg-blue-700
        hover:shadow-lg
        active:scale-95
        transition-all
        duration-200
      `,

      input: `
        bg-white
        border border-gray-300
        rounded-lg
        px-4 py-2.5
        text-gray-900
        placeholder-gray-400
        focus:outline-none
        focus:ring-2
        focus:ring-blue-500
        focus:border-transparent
        transition-all
      `,

      themeButton: `
        bg-gray-900
        text-white
        px-4 py-2
        rounded-lg
        font-semibold
        shadow-md
        hover:bg-gray-800
        transition-all
      `,
    },
  },

  dark: {
    name: 'Modern Dark',
    properties: {
      bg: 'bg-gray-950 min-h-screen text-white',
      secondbar: 'bg-gray-900 border-b border-gray-800',
      cardBg: 'bg-gray-900 shadow-2xl rounded-xl border border-gray-800',
      text: 'text-white',
      accent: 'text-gray-400',
      border: 'border-gray-800',
      sectionAccent: 'border-l-4 border-blue-500 pl-4',

      section: 'bg-gray-900 rounded-xl p-6 shadow-xl border border-gray-800',
      heading: 'text-white font-bold tracking-tight',

      cardSoft: 'bg-gray-800 rounded-xl p-5 shadow-lg border border-gray-700',

      button: `
        bg-blue-600
        text-white
        px-6 py-2.5
        rounded-lg
        font-semibold
        shadow-lg
        hover:bg-blue-700
        hover:shadow-xl
        active:scale-95
        transition-all
        duration-200
      `,

      input: `
        bg-gray-800
        border border-gray-700
        rounded-lg
        px-4 py-2.5
        text-white
        placeholder-gray-500
        focus:outline-none
        focus:ring-2
        focus:ring-blue-500
        focus:border-transparent
        transition-all
      `,

      themeButton: `
        bg-gray-700
        text-white
        px-4 py-2
        rounded-lg
        font-semibold
        shadow-md
        hover:bg-gray-600
        transition-all
      `,
    },
  },
};


const interactions = {
  buttonBase: 'inline-flex items-center justify-center gap-2 px-6 py-3 font-semibold transition-all duration-300 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none',
};

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem('social-theme');
    return stored && themes[stored] ? stored : 'light';
  });

  useEffect(() => {
    localStorage.setItem('social-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const baseProps = themes[theme]?.properties || themes.light.properties;

  // Merge button interactions automatically
  const themeStyles = {
    ...baseProps,
    button: `${interactions.buttonBase} ${baseProps.button}`,
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themeStyles, themes, interactions }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
