"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";
export type FontSize = "small" | "default" | "large";

// Tailwind sizes are rem-based, so scaling the root font size scales the whole UI.
const FONT_SIZE_SCALE: Record<FontSize, string> = {
  small: "87.5%",
  default: "",
  large: "112.5%",
};

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  toggleTheme: () => {},
  setTheme: () => {},
  fontSize: "default",
  setFontSize: () => {},
});

function applyFontSize(size: FontSize) {
  document.documentElement.style.fontSize = FONT_SIZE_SCALE[size];
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [fontSize, setFontSizeState] = useState<FontSize>("default");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("nk_theme") as Theme | null;
    if (savedTheme) {
      setThemeState(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    } else {
      // Default to dark mode for modern enterprise AI SaaS look
      setThemeState("dark");
      document.documentElement.classList.add("dark");
    }

    const savedFontSize = localStorage.getItem("nk_font_size") as FontSize | null;
    if (savedFontSize && savedFontSize in FONT_SIZE_SCALE) {
      setFontSizeState(savedFontSize);
      applyFontSize(savedFontSize);
    }
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("nk_theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  };

  const setFontSize = (size: FontSize) => {
    setFontSizeState(size);
    localStorage.setItem("nk_font_size", size);
    applyFontSize(size);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, fontSize, setFontSize }}>
      <div className={mounted ? "" : "dark"}>{children}</div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
