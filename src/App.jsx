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
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
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
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Route, Routes, useNavigate, useParams } from "react-router-dom";

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

const applyFieldBlocks = (template, fieldBlocks) => {
  if (!template || !Array.isArray(template.blocks) || template.blocks.length === 0) {
    return template;
  }
  if (!fieldBlocks || Object.keys(fieldBlocks).length === 0) {
    return template;
  }
  const nextFields = [...template.fields];
  const blockBodies = {};

  template.blocks.forEach((blockId) => {
    const block = fieldBlocks[blockId];
    if (!block) {
      return;
    }
    const prefix = block.prefix || block.id || blockId;
    block.fields?.forEach((field) => {
      const section = field.section || block.section;
      nextFields.push({
        ...field,
        name: `${prefix}.${field.name}`,
        section,
      });
    });
    if (block.body) {
      const withPrefix = block.body
        .replace(/\{\{#if\s+(\w+)\}\}/g, `{{#if ${prefix}.$1}}`)
        .replace(/\{\{(\w+)\}\}/g, `{{${prefix}.$1}}`);
      blockBodies[prefix] = withPrefix;
    }
  });

  return { ...template, fields: nextFields, blockBodies };
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
  if (template.blockBodies) {
    Object.entries(template.blockBodies).forEach(([blockId, blockBody]) => {
      const blockRegex = new RegExp(`\\{\\{${blockId}\\}\\}`, "g");
      body = body.replace(blockRegex, blockBody);
    });
  }
  const conditionalRegex = /\{\{#if\s+([\w.]+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
  body = body.replace(conditionalRegex, (match, fieldName, block) => {
    const value = values[fieldName];
    if (value) {
      return block.replace(/^\n+/, "").replace(/\n+$/, "");
    }
    return "";
  });

  const placeholderRegex = /\{\{([\w.]+)\}\}/g;
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

  return body.trim();
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const applyAbbreviationExpansions = (text, expansions) => {
  if (!expansions || typeof expansions !== "object") {
    return text;
  }
  const entries = Object.entries(expansions)
    .filter(([key, value]) => key && value)
    .sort((a, b) => b[0].length - a[0].length);
  if (entries.length === 0) {
    return text;
  }
  return entries.reduce((result, [key, value]) => {
    const escaped = escapeRegExp(key);
    const regex = new RegExp(`(^|[^A-Za-z0-9])(${escaped})(?=$|[^A-Za-z0-9])`, "gi");
    return result.replace(regex, (match, lead, word) => {
      const replacement =
        word.toUpperCase() === word
          ? value.toUpperCase()
          : word[0] === word[0]?.toUpperCase()
          ? `${value[0]?.toUpperCase()}${value.slice(1)}`
          : value;
      return `${lead}${replacement}`;
    });
  }, text);
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

const VALID_MODES = new Set(["letters", "procedures", "notes"]);

const AppContent = () => {
  const theme = useTheme();
  const isDesktop = useMediaQuery("(min-width:1025px)");
  const searchRef = useRef(null);
  const navigate = useNavigate();
  const { mode: routeMode, id: routeId } = useParams();

  const [templatesIndex, setTemplatesIndex] = useState([]);
  const [procedureIndex, setProcedureIndex] = useState([]);
  const [noteIndex, setNoteIndex] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [fieldValues, setFieldValues] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [presetGroups, setPresetGroups] = useState({});
  const [fieldBlocks, setFieldBlocks] = useState({});
  const [templateError, setTemplateError] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [toastOpen, setToastOpen] = useState(false);
  const [presetDialogField, setPresetDialogField] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [previewTab, setPreviewTab] = useState("patient");
  const [templateMode, setTemplateMode] = useState("letters");
  const [expandAbbreviations, setExpandAbbreviations] = useState(false);
  const [abbreviationExpansions, setAbbreviationExpansions] = useState({});
  const fileInputRef = useRef(null);

  const drawerWidth = isDesktop ? (sidebarCollapsed ? DRAWER_COLLAPSED : DRAWER_WIDTH) : DRAWER_WIDTH;
  const baseUrl = import.meta.env.BASE_URL || "/";

  const activeTemplates = useMemo(() => {
    if (templateMode === "procedures") {
      return procedureIndex;
    }
    if (templateMode === "notes") {
      return noteIndex;
    }
    return templatesIndex;
  }, [noteIndex, procedureIndex, templateMode, templatesIndex]);

  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) {
      return activeTemplates;
    }
    const query = searchQuery.toLowerCase();
    return activeTemplates.filter((template) => {
      const keywordText = Array.isArray(template.keywords) ? template.keywords.join(" ") : "";
      return `${template.title} ${template.category} ${keywordText}`.toLowerCase().includes(query);
    });
  }, [activeTemplates, searchQuery]);

  const renderBody = (template, values, bodyKey) => {
    const body = template?.[bodyKey] || template?.body || template?.patientBody || "";
    return renderTemplateBody({ ...template, body }, values);
  };

  const applyImportedValues = (template, importValues) => {
    const nextValues = initializeFieldValues(template);
    if (!importValues || typeof importValues !== "object") {
      return nextValues;
    }
    const allowed = new Set(template.fields.map((field) => field.name));
    Object.entries(importValues).forEach(([key, value]) => {
      if (allowed.has(key)) {
        nextValues[key] = value;
      }
    });
    return nextValues;
  };

  const previewText = useMemo(() => {
    if (!selectedTemplate) {
      return "";
    }
    if (templateMode === "procedures") {
      return renderBody(selectedTemplate, fieldValues, "body");
    }
    const key = previewTab === "gp" ? "gpBody" : "patientBody";
    const baseText = renderBody(selectedTemplate, fieldValues, key);
    if (templateMode === "letters" && previewTab === "patient" && expandAbbreviations) {
      return applyAbbreviationExpansions(baseText, abbreviationExpansions);
    }
    return baseText;
  }, [
    selectedTemplate,
    fieldValues,
    previewTab,
    templateMode,
    expandAbbreviations,
    abbreviationExpansions,
  ]);


  useEffect(() => {
    const init = async () => {
      let groups = {};
      try {
        const [blockIndex, expansions] = await Promise.all([
          fetchJson(`${baseUrl}templates/blocks/index.json`),
          fetchJson(`${baseUrl}templates/expansions.json`),
        ]);
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
        setAbbreviationExpansions(expansions || {});
      } catch (error) {
        setPresetGroups({});
        setAbbreviationExpansions({});
      }

      try {
        const blockIndex = await fetchJson(`${baseUrl}templates/field-blocks/index.json`);
        const blockIds = Array.isArray(blockIndex) ? blockIndex : [];
        const blockData = await Promise.all(
          blockIds.map((blockId) => fetchJson(`${baseUrl}templates/field-blocks/${blockId}.json`))
        );
        const nextBlocks = blockData.reduce((accumulator, block) => {
          if (block && block.id) {
            accumulator[block.id] = block;
          }
          return accumulator;
        }, {});
        setFieldBlocks(nextBlocks);
      } catch (error) {
        setFieldBlocks({});
      }

      try {
        const [lettersData, proceduresData, notesData] = await Promise.all([
          fetchJson(`${baseUrl}templates/letters/index.json`),
          fetchJson(`${baseUrl}templates/procedures/index.json`),
          fetchJson(`${baseUrl}templates/notes/index.json`),
        ]);
        const letterList = Array.isArray(lettersData) ? lettersData : [];
        const procedureList = Array.isArray(proceduresData) ? proceduresData : [];
        const noteList = Array.isArray(notesData) ? notesData : [];
        setTemplatesIndex(letterList);
        setProcedureIndex(procedureList);
        setNoteIndex(noteList);
        const last = localStorage.getItem(LAST_TEMPLATE_KEY);
        if (last && letterList.some((template) => template.id === last)) {
          loadTemplate(last, groups, undefined, "letters");
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

  const loadTemplate = async (
    templateId,
    groups = presetGroups,
    importValues,
    modeOverride,
    skipRouteUpdate = false
  ) => {
    try {
      const mode = modeOverride || templateMode;
      const templatePath =
        mode === "procedures"
          ? `${baseUrl}templates/procedures/${templateId}.json`
          : mode === "notes"
          ? `${baseUrl}templates/notes/${templateId}.json`
          : `${baseUrl}templates/letters/${templateId}.json`;
    const template = await fetchJson(templatePath);
      const withBlocks = applyFieldBlocks(template, fieldBlocks);
      const hydrated = applyPresetGroups(withBlocks, groups);
      setSelectedTemplate(hydrated);
      setFieldValues(applyImportedValues(hydrated, importValues));
      setFieldErrors({});
      setValidationAttempted(false);
      setCopyStatus("");
      setPreviewTab("patient");
      setExpandAbbreviations(false);
      if (modeOverride) {
        setTemplateMode(modeOverride);
      }
      if (!skipRouteUpdate) {
        navigate(`/${mode}/${templateId}`);
      }
      localStorage.setItem(LAST_TEMPLATE_KEY, templateId);
      if (!isDesktop) {
        setMobileOpen(false);
      }
    } catch (error) {
      setTemplateError("Template could not be loaded. Please try another.");
    }
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

  const handleExport = () => {
    if (!selectedTemplate) {
      return;
    }
    const payload = {
      templateId: selectedTemplate.id,
      fieldValues,
      exportedAt: new Date().toISOString(),
      version: 1,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedTemplate.id}-draft.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const templateId = payload?.templateId;
      if (!templateId) {
        setCopyStatus("Import failed — missing templateId.");
        return;
      }
      const existsInLetters = templatesIndex.some((template) => template.id === templateId);
      const existsInProcedures = procedureIndex.some((template) => template.id === templateId);
      const existsInNotes = noteIndex.some((template) => template.id === templateId);
      if (!existsInLetters && !existsInProcedures && !existsInNotes) {
        setCopyStatus("Import failed — template not found.");
        return;
      }
      const mode = existsInProcedures ? "procedures" : existsInNotes ? "notes" : "letters";
      await loadTemplate(templateId, presetGroups, payload.fieldValues || {}, mode);
      setCopyStatus("Draft imported.");
    } catch (error) {
      setCopyStatus("Import failed — invalid JSON file.");
    } finally {
      event.target.value = "";
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

  useEffect(() => {
    if (!routeMode || !routeId) {
      if (routeMode && VALID_MODES.has(routeMode) && !routeId && templateMode !== routeMode) {
        setTemplateMode(routeMode);
        setSelectedTemplate(null);
        setFieldValues({});
        setFieldErrors({});
        setCopyStatus("");
        return;
      }
      return;
    }
    if (!VALID_MODES.has(routeMode)) {
      navigate("/", { replace: true });
      return;
    }
    if (selectedTemplate?.id === routeId && templateMode === routeMode) {
      return;
    }
    loadTemplate(routeId, presetGroups, undefined, routeMode, true);
  }, [routeMode, routeId, navigate, presetGroups, fieldBlocks, selectedTemplate, templateMode]);

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
            <ToggleButtonGroup
              value={templateMode}
              exclusive
              onChange={(event, value) => {
                if (value) {
                  setTemplateMode(value);
                  setSelectedTemplate(null);
                  setFieldValues({});
                  setFieldErrors({});
                  setCopyStatus("");
                  navigate(`/${value}`, { replace: true });
                }
              }}
              size="small"
              color="primary"
            >
            <ToggleButton value="letters">Letters</ToggleButton>
            <ToggleButton value="procedures">Procedures</ToggleButton>
            <ToggleButton value="notes">ED Notes</ToggleButton>
          </ToggleButtonGroup>
          <TextField
            inputRef={searchRef}
            label="Search templates"
            placeholder="Search by diagnosis, keyword, or category"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            size="small"
          />
          <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            <Typography
              variant="subtitle2"
              sx={{ mb: 1, textTransform: "uppercase", letterSpacing: 0.5 }}
            >
              {templateMode === "procedures"
                ? "All procedures"
                : templateMode === "notes"
                ? "All ED notes"
                : "All templates"}
            </Typography>
            {filteredTemplates.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No templates found.
              </Typography>
            ) : (
              <List
                dense
                disablePadding
                sx={{ flex: 1, overflow: "auto", pr: 0.5 }}
              >
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

  const isAntibioticDialog = presetDialogField?.presetGroup === "antibiotics_common";

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
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" size="small" onClick={handleImportClick}>
                  Import JSON
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleExport}
                  disabled={!selectedTemplate}
                >
                  Export JSON
                </Button>
                <Button variant="outlined" size="small" onClick={handleReset} disabled={!selectedTemplate}>
                  Reset fields
                </Button>
              </Stack>
            </Stack>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleImportFile}
              style={{ display: "none" }}
            />
            {!selectedTemplate ? (
              <Typography color="text.secondary">Select a template to begin.</Typography>
            ) : (
              <Stack gap={2}>
                {selectedTemplate.fields.some((field) => field.section) ? (
                  Object.entries(
                    selectedTemplate.fields.reduce((groups, field) => {
                      const section = field.section || "Other";
                      if (!groups[section]) {
                        groups[section] = [];
                      }
                      groups[section].push(field);
                      return groups;
                    }, {})
                  ).map(([section, fields]) => (
                    <Paper
                      key={section}
                      variant="outlined"
                      sx={{ p: 2, borderRadius: 2, borderColor: "divider" }}
                    >
                      <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600 }}>
                        {section}
                      </Typography>
                      <Box
                        sx={{
                          display: "grid",
                          gap: 2,
                          gridTemplateColumns: {
                            xs: "1fr",
                            md: "repeat(12, minmax(0, 1fr))",
                          },
                        }}
                      >
                        {fields.map((field) => {
                          const value = fieldValues[field.name];
                          const errorMessage = fieldErrors[field.name] || "";
                          const showError = Boolean(errorMessage) && (validationAttempted || value !== "");
                          const span =
                            field.width === "xs"
                              ? { xs: "1 / -1", md: "span 3" }
                              : field.width === "sm"
                              ? { xs: "1 / -1", md: "span 4" }
                              : field.width === "md"
                              ? { xs: "1 / -1", md: "span 6" }
                              : { xs: "1 / -1", md: "span 12" };

                          if (field.type === "checkbox") {
                            return (
                              <Box key={field.name} sx={{ gridColumn: span }}>
                                <FormControlLabel
                                  control={
                                    <Checkbox
                                      checked={Boolean(value)}
                                      onChange={(event) =>
                                        handleFieldChange(field, event.target.checked)
                                      }
                                    />
                                  }
                                  label={field.label}
                                />
                              </Box>
                            );
                          }

                          if (field.type === "select") {
                            return (
                              <Box key={field.name} sx={{ gridColumn: span }}>
                                <TextField
                                  select
                                  label={field.label}
                                  value={value}
                                  onChange={(event) => handleFieldChange(field, event.target.value)}
                                  required={field.required}
                                  error={showError}
                                  helperText={showError ? errorMessage : field.helpText}
                                  fullWidth
                                >
                                  <MenuItem value="">Select an option</MenuItem>
                                  {field.options.map((option) => (
                                    <MenuItem key={option} value={option}>
                                      {option}
                                    </MenuItem>
                                  ))}
                                </TextField>
                              </Box>
                            );
                          }

                          const isMultiline = field.type === "textarea";
                          const presetLabel = field.presetLabel || "Presets";
                          return (
                            <Box key={field.name} sx={{ gridColumn: span }}>
                              <Stack spacing={1}>
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
                                  fullWidth
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
                            </Box>
                          );
                        })}
                      </Box>
                    </Paper>
                  ))
                ) : (
                  selectedTemplate.fields.map((field) => {
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
                  })
                )}
              </Stack>
            )}
          </Paper>

          <Paper sx={{ p: 2, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography variant="h6">Letter preview</Typography>
              {templateMode === "letters" &&
                previewTab === "patient" &&
                Object.keys(abbreviationExpansions).length > 0 && (
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={expandAbbreviations}
                        onChange={(event) => setExpandAbbreviations(event.target.checked)}
                      />
                    }
                    label="Expand abbreviations"
                  />
                )}
            </Stack>
            {templateMode === "letters" && (
              <Tabs
                value={previewTab}
                onChange={(event, value) => setPreviewTab(value)}
                textColor="primary"
                indicatorColor="primary"
                sx={{ mb: 2 }}
              >
                <Tab label="Patient letter" value="patient" />
                <Tab label="GP letter" value="gp" />
              </Tabs>
            )}
            <Box
              sx={{
                flex: 1,
                bgcolor: "#f1f5ff",
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                p: 2,
                minHeight: 320,
                fontFamily: "inherit",
              }}
              component="div"
            >
              {templateMode === "letters" && previewTab === "patient" ? (
                <Box
                  sx={{
                    "& h1, & h2, & h3": {
                      marginTop: 0,
                    },
                    "& p": {
                      marginTop: 0,
                    },
                    "& ul, & ol": {
                      paddingLeft: "1.2rem",
                    },
                  }}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{previewText}</ReactMarkdown>
                </Box>
              ) : (
                <Box
                  component="pre"
                  sx={{
                    margin: 0,
                    whiteSpace: "pre-wrap",
                    fontFamily: "inherit",
                  }}
                >
                  {previewText}
                </Box>
              )}
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

      <Dialog
        open={Boolean(presetDialogField)}
        onClose={() => setPresetDialogField(null)}
        fullWidth
        maxWidth={isAntibioticDialog ? "lg" : "sm"}
      >
        <DialogTitle>{presetDialogField?.presetTitle || "Preset options"}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {presetDialogField?.presetDescription || "Select an option to insert into the field."}
          </Typography>
          <Box
            sx={{
              display: "grid",
              gap: 1.5,
              gridTemplateColumns: isAntibioticDialog
                ? { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" }
                : "1fr",
            }}
          >
            {presetDialogField?.presets?.map((preset) => (
              <Button
                key={preset.label || preset.value}
                variant="outlined"
                onClick={() => {
                  handleFieldChange(presetDialogField, preset.value);
                  setPresetDialogField(null);
                }}
                sx={{
                  textAlign: "left",
                  justifyContent: "flex-start",
                  whiteSpace: "normal",
                  alignItems: "flex-start",
                }}
              >
                {preset.label || preset.value}
              </Button>
            ))}
          </Box>
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

const App = () => (
  <Routes>
    <Route path="/" element={<AppContent />} />
    <Route path="/:mode" element={<AppContent />} />
    <Route path="/:mode/:id" element={<AppContent />} />
  </Routes>
);

export default App;
