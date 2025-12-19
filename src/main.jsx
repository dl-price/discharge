import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import App from "./App.jsx";
import "./index.css";

const theme = createTheme({
  palette: {
    mode: "light",
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
        body: {
          background:
            "radial-gradient(circle at top left, #eaf4ff 0%, #f4f7fb 45%, #eefaf7 100%)",
        },
        
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          border: "1px solid rgba(26, 115, 232, 0.12)",
          boxShadow: "0 16px 32px rgba(16, 33, 63, 0.08)",
        },
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
