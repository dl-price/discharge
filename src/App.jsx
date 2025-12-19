import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AppBar,
  Box,
  Button,
  Checkbox,
  CssBaseline,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControlLabel,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import ViewSidebarOutlinedIcon from "@mui/icons-material/ViewSidebarOutlined";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import LibraryAddIcon from "@mui/icons-material/LibraryAdd";

const RECENT_STORAGE_KEY = "recentTemplates";
const LAST_TEMPLATE_KEY = "lastSelectedTemplate";
const DRAWER_WIDTH = 320;
const DRAWER_COLLAPSED = 76;

const fetchJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Request failed");
  }
  return response.json();
};

const applyPresetGroups = (template, presetGroups) => {
  if (!template || !Array.isArray(template.fields)) {
    return template;
  }
  if (!presetGroups || Object.keys(presetGroups).length === 0) {
    return template;
  }
  const nextFields = template.fields.map((field) => {
    if (!field.presetGroup) {
      return field;
    }
    const group = presetGroups[field.presetGroup];
    if (!group) {
      return field;
    }
    return {
      ...group,
      ...field,
      presets: field.presets ?? group.presets,
    };
  });
  return { ...template, fields: nextFields };
};

const initializeFieldValues = (template) => {
  const nextValues = {};
  template.fields.forEach((field) => {
    if (field.type === "checkbox") {
      nextValues[field.name] = Boolean(field.default);
    } else if (field.default !== undefined) {
      nextValues[field.name] = field.default;
    } else {
      nextValues[field.name] = "";
    }
  });
  return nextValues;
};

const renderTemplateBody = (template, values) => {
  let body = template.body;
  const conditionalRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
  body = body.replace(conditionalRegex, (match, fieldName, block) => {
    const value = values[fieldName];
    if (value) {
      return block.trim();
    }
    return "";
  });

  const placeholderRegex = /\{\{(\w+)\}\}/g;
  body = body.replace(placeholderRegex, (match, fieldName) => {
    if (!(fieldName in values)) {
      return "";
    }
    const value = values[fieldName];
    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }
    return value ? String(value) : "";
  });

  return `${template.title}\n\n${body.trim()}${
    template.disclaimer ? `\n\n${template.disclaimer}` : ""
  }`;
};

const validateField = (field, value) => {
  if (!field.required) {
    return "";
  }
  if (field.type === "checkbox") {
    return value === true ? "" : "This field is required.";
  }
  if (field.type === "number") {
    return value !== "" && Number.isFinite(Number(value)) ? "" : "This field is required.";
  }
  return String(value).trim().length > 0 ? "" : "This field is required.";
};

const fallbackCopy = (text) => {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  let success = false;
  try {
    success = document.execCommand("copy");
  } catch (error) {
    success = false;
  }
  document.body.removeChild(textarea);
  return success;
};

const App = () => {
  const theme = useTheme();
  const isDesktop = useMediaQuery("(min-width:1025px)");
  const searchRef = useRef(null);

  const [templatesIndex, setTemplatesIndex] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [fieldValues, setFieldValues] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [recentTemplates, setRecentTemplates] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [presetGroups, setPresetGroups] = useState({});
  const [templateError, setTemplateError] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [toastOpen, setToastOpen] = useState(false);
  const [presetDialogField, setPresetDialogField] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const drawerWidth = isDesktop ? (sidebarCollapsed ? DRAWER_COLLAPSED : DRAWER_WIDTH) : DRAWER_WIDTH;
  const baseUrl = import.meta.env.BASE_URL || "/";

  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) {
      return templatesIndex;
    }
    const query = searchQuery.toLowerCase();
    return templatesIndex.filter((template) => {
      const keywordText = Array.isArray(template.keywords) ? template.keywords.join(" ") : "";
      return `${template.title} ${template.category} ${keywordText}`.toLowerCase().includes(query);
    });
  }, [templatesIndex, searchQuery]);

  const recentTemplateObjects = useMemo(() => {
    return recentTemplates
      .map((id) => templatesIndex.find((template) => template.id === id))
      .filter(Boolean);
  }, [recentTemplates, templatesIndex]);

  const previewText = useMemo(() => {
    if (!selectedTemplate) {
      return "";
    }
    return renderTemplateBody(selectedTemplate, fieldValues);
  }, [selectedTemplate, fieldValues]);

  useEffect(() => {
    const init = async () => {
      let groups = {};
      try {
        const blockIndex = await fetchJson(`${baseUrl}templates/blocks/index.json`);
        const blockIds = Array.isArray(blockIndex) ? blockIndex : [];
        const blockData = await Promise.all(
          blockIds.map((blockId) => fetchJson(`${baseUrl}templates/blocks/${blockId}.json`))
        );
        groups = blockData.reduce((accumulator, block) => {
          if (block && block.id) {
            accumulator[block.id] = block;
          }
          return accumulator;
        }, {});
        setPresetGroups(groups);
      } catch (error) {
        setPresetGroups({});
      }

      try {
        const indexData = await fetchJson(`${baseUrl}templates/index.json`);
        const list = Array.isArray(indexData) ? indexData : [];
        setTemplatesIndex(list);
        const storedRecent = localStorage.getItem(RECENT_STORAGE_KEY);
        if (storedRecent) {
          try {
            const parsed = JSON.parse(storedRecent);
            if (Array.isArray(parsed)) {
              setRecentTemplates(parsed);
            }
          } catch (error) {
            setRecentTemplates([]);
          }
        }
        const last = localStorage.getItem(LAST_TEMPLATE_KEY);
        if (last && list.some((template) => template.id === last)) {
          loadTemplate(last, groups);
        }
      } catch (error) {
        setTemplateError(
          "Templates could not be loaded. Please refresh or check your connection."
        );
      }
    };

    init();
  }, [baseUrl]);

  useEffect(() => {
    if (isDesktop) {
      setMobileOpen(false);
    }
  }, [isDesktop]);

  useEffect(() => {
    const handleKeydown = (event) => {
      if (event.key === "Escape" && presetDialogField) {
        setPresetDialogField(null);
        return;
      }
      if (event.key === "Escape" && !isDesktop) {
        setMobileOpen(false);
        return;
      }
      if (event.key === "/" && document.activeElement !== searchRef.current) {
        event.preventDefault();
        if (!isDesktop) {
          setMobileOpen(true);
        }
        searchRef.current?.focus();
        return;
      }
      if (event.key === "Enter" && document.activeElement === searchRef.current) {
        if (filteredTemplates[0]) {
          loadTemplate(filteredTemplates[0].id);
        }
      }
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        if (selectedTemplate) {
          handleCopy();
        }
      }
    };
    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [filteredTemplates, presetDialogField, isDesktop, selectedTemplate]);

  const loadTemplate = async (templateId, groups = presetGroups) => {
    try {
      const template = await fetchJson(`${baseUrl}templates/${templateId}.json`);
      const hydrated = applyPresetGroups(template, groups);
      setSelectedTemplate(hydrated);
      setFieldValues(initializeFieldValues(hydrated));
      setFieldErrors({});
      setValidationAttempted(false);
      setCopyStatus("");
      updateRecentTemplates(templateId);
      localStorage.setItem(LAST_TEMPLATE_KEY, templateId);
      if (!isDesktop) {
        setMobileOpen(false);
      }
    } catch (error) {
      setTemplateError("Template could not be loaded. Please try another.");
    }
  };

  const updateRecentTemplates = (templateId) => {
    setRecentTemplates((prev) => {
      const next = [templateId, ...prev.filter((id) => id !== templateId)].slice(0, 5);
      localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const handleFieldChange = (field, value) => {
    setFieldValues((prev) => ({ ...prev, [field.name]: value }));
    const error = validateField(field, value);
    setFieldErrors((prev) => ({ ...prev, [field.name]: error }));
  };

  const validateAllFields = () => {
    if (!selectedTemplate) {
      return false;
    }
    setValidationAttempted(true);
    const nextErrors = {};
    let isValid = true;
    selectedTemplate.fields.forEach((field) => {
      const error = validateField(field, fieldValues[field.name]);
      if (error) {
        isValid = false;
      }
      nextErrors[field.name] = error;
    });
    setFieldErrors(nextErrors);
    return isValid;
  };

  const handleCopy = async () => {
    if (!selectedTemplate) {
      return;
    }
    if (!validateAllFields()) {
      setCopyStatus("Please complete required fields before copying.");
      return;
    }
    try {
      await navigator.clipboard.writeText(previewText);
      setCopyStatus("Copied to clipboard.");
      setToastOpen(true);
    } catch (error) {
      const fallbackSuccess = fallbackCopy(previewText);
      if (fallbackSuccess) {
        setCopyStatus("Copied to clipboard.");
        setToastOpen(true);
      } else {
        setCopyStatus("Copy failed — select the letter and copy manually.");
      }
    }
  };

  const handleReset = () => {
    if (!selectedTemplate) {
      return;
    }
    setFieldValues(initializeFieldValues(selectedTemplate));
    setFieldErrors({});
    setValidationAttempted(false);
    setCopyStatus("");
  };

  const handleDrawerToggle = () => {
    if (isDesktop) {
      setSidebarCollapsed((prev) => !prev);
    } else {
      setMobileOpen((prev) => !prev);
    }
  };


  const drawerContent = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: sidebarCollapsed ? "center" : "space-between",
          px: 2,
          py: 1.5,
        }}
      >
        {!sidebarCollapsed && (
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Templates
          </Typography>
        )}
        <IconButton onClick={handleDrawerToggle} size="small" aria-label="Toggle templates">
          {sidebarCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </IconButton>
      </Box>
      <Divider />
      {!sidebarCollapsed && (
        <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            inputRef={searchRef}
            label="Search templates"
            placeholder="Search by diagnosis, keyword, or category"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            size="small"
          />
          <Box>
            <Typography
              variant="subtitle2"
              sx={{ mb: 1, textTransform: "uppercase", letterSpacing: 0.5 }}
            >
              Recent templates
            </Typography>
            {recentTemplateObjects.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No recent templates yet.
              </Typography>
            ) : (
              <List dense disablePadding>
                {recentTemplateObjects.map((template) => (
                  <ListItem key={template.id} disablePadding>
                    <ListItemButton
                      selected={selectedTemplate?.id === template.id}
                      onClick={() => loadTemplate(template.id)}
                    >
                      <ListItemText primary={template.title} secondary={template.category} />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <Typography
              variant="subtitle2"
              sx={{ mb: 1, textTransform: "uppercase", letterSpacing: 0.5 }}
            >
              All templates
            </Typography>
            {filteredTemplates.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No templates found.
              </Typography>
            ) : (
              <List dense disablePadding sx={{ maxHeight: 360, overflow: "auto" }}>
                {filteredTemplates.map((template) => (
                  <ListItem key={template.id} disablePadding>
                    <ListItemButton
                      selected={selectedTemplate?.id === template.id}
                      onClick={() => loadTemplate(template.id)}
                    >
                      <ListItemText
                        primary={template.title}
                        secondary={[template.category, ...template.keywords?.slice(0, 3)]
                          .filter(Boolean)
                          .join(" • ")}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
          {templateError && <Alert severity="error">{templateError}</Alert>}
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (themeValue) => themeValue.zIndex.drawer + 1,
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          borderBottom: `1px solid ${theme.palette.divider}`,
          ...(isDesktop && {
            width: `calc(100% - ${drawerWidth}px)`,
            ml: `${drawerWidth}px`,
          }),
        }}
      >
        <Toolbar sx={{ gap: 2 }}>
          <IconButton edge="start" color="inherit" onClick={handleDrawerToggle}>
            {isDesktop ? <ViewSidebarOutlinedIcon /> : <MenuIcon />}
          </IconButton>
          <Typography variant="h6" sx={{ flex: 1, fontWeight: 600 }}>
            ED Discharge Letter Generator
          </Typography>
          <Button variant="contained" onClick={handleCopy} disabled={!selectedTemplate}>
            Copy to Clipboard
          </Button>
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isDesktop ? "permanent" : "temporary"}
        open={isDesktop ? true : mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
          },
        }}
      >
        <Toolbar />
        {drawerContent}
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 3 } }}>
        <Toolbar />
        <Alert severity="warning" sx={{ mb: 3 }}>
          Do not enter patient identifiers unless approved by your organisation. This tool is designed to
          avoid storing patient data.
        </Alert>

        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
          <Paper sx={{ p: 2, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography variant="h6">Clinician inputs</Typography>
              <Button variant="outlined" size="small" onClick={handleReset} disabled={!selectedTemplate}>
                Reset fields
              </Button>
            </Stack>
            {!selectedTemplate ? (
              <Typography color="text.secondary">Select a template to begin.</Typography>
            ) : (
              <Stack gap={2}>
                {selectedTemplate.fields.map((field) => {
                  const value = fieldValues[field.name];
                  const errorMessage = fieldErrors[field.name] || "";
                  const showError = Boolean(errorMessage) && (validationAttempted || value !== "");

                  if (field.type === "checkbox") {
                    return (
                      <FormControlLabel
                        key={field.name}
                        control={
                          <Checkbox
                            checked={Boolean(value)}
                            onChange={(event) => handleFieldChange(field, event.target.checked)}
                          />
                        }
                        label={field.label}
                      />
                    );
                  }

                  if (field.type === "select") {
                    return (
                      <TextField
                        key={field.name}
                        select
                        label={field.label}
                        value={value}
                        onChange={(event) => handleFieldChange(field, event.target.value)}
                        required={field.required}
                        error={showError}
                        helperText={showError ? errorMessage : field.helpText}
                      >
                        <MenuItem value="">Select an option</MenuItem>
                        {field.options.map((option) => (
                          <MenuItem key={option} value={option}>
                            {option}
                          </MenuItem>
                        ))}
                      </TextField>
                    );
                  }

                  const isMultiline = field.type === "textarea";
                  const presetLabel = field.presetLabel || "Presets";
                  return (
                    <Stack key={field.name} spacing={1}>
                      <TextField
                        label={field.label}
                        value={value}
                        onChange={(event) => handleFieldChange(field, event.target.value)}
                        required={field.required}
                        error={showError}
                        helperText={showError ? errorMessage : field.helpText}
                        type={field.type === "textarea" ? "text" : field.type}
                        multiline={isMultiline}
                        minRows={isMultiline ? 4 : undefined}
                      />
                      {field.presets?.length > 0 && (
                        <Button
                          variant="contained"
                          color="secondary"
                          size="small"
                          onClick={() => setPresetDialogField(field)}
                          sx={{ alignSelf: "flex-start" }}
                          startIcon={<LibraryAddIcon />}
                        >
                          {`Insert ${presetLabel.toLowerCase()}`}
                        </Button>
                      )}
                    </Stack>
                  );
                })}
              </Stack>
            )}
          </Paper>

          <Paper sx={{ p: 2, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography variant="h6">Letter preview</Typography>
            </Stack>
            <Box
              sx={{
                flex: 1,
                bgcolor: "#f1f5ff",
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                p: 2,
                minHeight: 320,
                whiteSpace: "pre-wrap",
                fontFamily: "inherit",
              }}
              component="pre"
            >
              {previewText}
            </Box>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 1, minHeight: 22 }}
            >
              {copyStatus}
            </Typography>
          </Paper>
        </Box>
      </Box>

      <Dialog open={Boolean(presetDialogField)} onClose={() => setPresetDialogField(null)} fullWidth>
        <DialogTitle>{presetDialogField?.presetTitle || "Preset options"}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {presetDialogField?.presetDescription || "Select an option to insert into the field."}
          </Typography>
          <Stack spacing={1}>
            {presetDialogField?.presets?.map((preset) => (
              <Button
                key={preset.label || preset.value}
                variant="outlined"
                onClick={() => {
                  handleFieldChange(presetDialogField, preset.value);
                  setPresetDialogField(null);
                }}
                sx={{ textAlign: "left", justifyContent: "flex-start" }}
              >
                {preset.label || preset.value}
              </Button>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPresetDialogField(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toastOpen}
        autoHideDuration={2200}
        onClose={() => setToastOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity="success" onClose={() => setToastOpen(false)} sx={{ width: "100%" }}>
          Copied ✓
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default App;
