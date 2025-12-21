import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { useMediaQuery } from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import App from "./App.jsx";
import "./index.css";

const THEME_PREFERENCE_KEY = "themePreference";

const getDesignTokens = (mode) => ({
  palette: {
    mode,
    ...(mode === "light"
      ? {
          primary: {
            main: "#1f9d55",
            contrastText: "#ffffff",
          },
          secondary: {
            main: "#00bfa6",
            contrastText: "#00302b",
          },
          info: {
            main: "#2f9bff",
          },
          success: {
            main: "#2e7d32",
          },
          warning: {
            main: "#ffb020",
          },
          background: {
            default: "#f4f7fb",
            paper: "#ffffff",
          },
          text: {
            primary: "#10213f",
            secondary: "#51607a",
          },
        }
      : {
          primary: {
            main: "#4fd18b",
            contrastText: "#0b1a12",
          },
          secondary: {
            main: "#2dd4bf",
            contrastText: "#041f1b",
          },
          info: {
            main: "#5aa7ff",
          },
          success: {
            main: "#3ddc84",
          },
          warning: {
            main: "#f6c45f",
          },
          background: {
            default: "#0c1424",
            paper: "#141f35",
          },
          text: {
            primary: "#eef4ff",
            secondary: "#a6b4cc",
          },
          divider: "rgba(255, 255, 255, 0.12)",
        }),
  },
  shape: {
    borderRadius: 14,
  },
  typography: {
    fontFamily: "'Space Grotesk', 'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif",
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        ":root": {
          colorScheme: mode,
        },
        body: {
          background:
            mode === "light"
              ? "radial-gradient(circle at top left, #eaf4ff 0%, #f4f7fb 45%, #eefaf7 100%)"
              : "radial-gradient(circle at top left, #1a2440 0%, #0c1424 50%, #0f1b2e 100%)",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          border:
            mode === "light"
              ? "1px solid rgba(26, 115, 232, 0.12)"
              : "1px solid rgba(90, 167, 255, 0.2)",
          boxShadow:
            mode === "light"
              ? "0 16px 32px rgba(16, 33, 63, 0.08)"
              : "0 18px 36px rgba(5, 10, 20, 0.55)",
        },
      },
    },
  },
});

const getStoredPreference = () => {
  if (typeof window === "undefined") {
    return "system";
  }
  try {
    return localStorage.getItem(THEME_PREFERENCE_KEY) || "system";
  } catch (error) {
    return "system";
  }
};

const Root = () => {
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const [themePreference, setThemePreference] = useState(getStoredPreference);
  const mode = themePreference === "system" ? (prefersDarkMode ? "dark" : "light") : themePreference;
  const theme = useMemo(() => createTheme(getDesignTokens(mode)), [mode]);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_PREFERENCE_KEY, themePreference);
    } catch (error) {
      // Ignore storage failures (private browsing, disabled storage, etc).
    }
  }, [themePreference]);

  const handleToggleColorMode = () => {
    setThemePreference((previous) => {
      if (previous === "system") {
        return prefersDarkMode ? "light" : "dark";
      }
      return previous === "dark" ? "light" : "dark";
    });
  };

  return (
    <ThemeProvider theme={theme}>
      <HashRouter>
        <App
          onToggleColorMode={handleToggleColorMode}
          themePreference={themePreference}
        />
      </HashRouter>
    </ThemeProvider>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
