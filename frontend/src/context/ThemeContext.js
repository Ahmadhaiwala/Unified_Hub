import React, { createContext, useContext, useState, useEffect } from 'react';

const themes = {

  light: {
    name: 'Editorial Light',
    properties: {
      bg: 'bg-[#e5e5e5] min-h-screen text-black',
      secondbar: 'bg-[#d9d9d9] border-b-2 border-black',
      cardBg: 'bg-white border-2 border-black',
      text: 'text-black',
      accent: 'text-purple-600',
      border: 'border-black',
      sectionAccent: 'border-l-4 border-black pl-4',

      section: 'bg-[#f5f5f5] border-2 border-black p-6',
      heading: 'text-black font-extrabold tracking-tight',

      cardSoft: 'bg-white border-2 border-black p-5',

      button: `
        bg-white
        border-2 border-black
        px-5 py-2
        font-bold
        uppercase
        tracking-wide
        hover:bg-black hover:text-white
        transition
      `,

      input: `
        bg-white
        border-2 border-black
        px-4 py-2
        text-black
        focus:outline-none
      `,

      themeButton: `
        bg-purple-400
        border-2 border-black
        text-black
        px-3 py-1
        font-bold
      `,
    },
  },

  dark: {
    name: 'Editorial Dark',
    properties: {
      bg: 'bg-black min-h-screen text-white',
      secondbar: 'bg-neutral-900 border-b-2 border-white',
      cardBg: 'bg-neutral-900 border-2 border-white',
      text: 'text-white',
      accent: 'text-pink-400',
      border: 'border-white',
      sectionAccent: 'border-l-4 border-white pl-4',

      section: 'bg-neutral-900 border-2 border-white p-6',
      heading: 'text-white font-extrabold tracking-tight',

      cardSoft: 'bg-neutral-900 border-2 border-white p-5',

      button: `
        bg-white
        text-black
        border-2 border-white
        px-5 py-2
        font-bold
        uppercase
        hover:bg-pink-500 hover:text-white
        transition
      `,

      input: `
        bg-neutral-900
        border-2 border-white
        px-4 py-2
        text-white
        focus:outline-none
      `,

      themeButton: `
        bg-pink-500
        border-2 border-white
        text-white
        px-3 py-1
        font-bold
      `,
    },
  },
};


const interactions = {
  buttonBase: 'inline-flex items-center justify-center gap-2 px-6 py-3 font-semibold transition-all duration-300 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none',
  glowSweep: 'relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-700',
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
    button: `${interactions.buttonBase} ${interactions.glowSweep} ${baseProps.button}`,
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
