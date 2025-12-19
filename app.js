const state = {
  templatesIndex: [],
  selectedTemplate: null,
  fieldValues: {},
  fieldErrors: {},
  recentTemplates: [],
  searchQuery: "",
  validationAttempted: false,
};

const elements = {
  searchInput: document.getElementById("searchInput"),
  templateList: document.getElementById("templateList"),
  recentList: document.getElementById("recentList"),
  templateError: document.getElementById("templateError"),
  formContainer: document.getElementById("formContainer"),
  letterPreview: document.getElementById("letterPreview"),
  copyButton: document.getElementById("copyButton"),
  copyStatus: document.getElementById("copyStatus"),
  resetButton: document.getElementById("resetButton"),
  toast: document.getElementById("toast"),
  presetModal: document.getElementById("presetModal"),
  presetModalTitle: document.getElementById("presetModalTitle"),
  presetModalDescription: document.getElementById("presetModalDescription"),
  presetModalOptions: document.getElementById("presetModalOptions"),
  presetModalClose: document.getElementById("presetModalClose"),
};

const RECENT_STORAGE_KEY = "recentTemplates";
const LAST_TEMPLATE_KEY = "lastSelectedTemplate";

const loadTemplatesIndex = async () => {
  try {
    const response = await fetch("./templates/index.json");
    if (!response.ok) {
      throw new Error("Unable to load templates list.");
    }
    const data = await response.json();
    state.templatesIndex = Array.isArray(data) ? data : [];
    renderTemplateLists();
    restoreLastTemplate();
  } catch (error) {
    elements.templateError.textContent =
      "Templates could not be loaded. Please refresh or check your connection.";
    elements.templateError.hidden = false;
  }
};

const loadTemplate = async (templateId) => {
  try {
    const response = await fetch(`./templates/${templateId}.json`);
    if (!response.ok) {
      throw new Error("Unable to load template.");
    }
    const template = await response.json();
    state.selectedTemplate = template;
    initializeFieldValues(template);
    state.fieldErrors = {};
    state.validationAttempted = false;
    updateRecentTemplates(templateId);
    localStorage.setItem(LAST_TEMPLATE_KEY, templateId);
    renderTemplateLists();
    renderForm();
    renderPreview();
  } catch (error) {
    elements.formContainer.innerHTML =
      '<p class="error-message">Template could not be loaded. Please try another.</p>';
  }
};

const initializeFieldValues = (template) => {
  state.fieldValues = {};
  template.fields.forEach((field) => {
    if (field.type === "checkbox") {
      state.fieldValues[field.name] = Boolean(field.default);
    } else if (field.default !== undefined) {
      state.fieldValues[field.name] = field.default;
    } else {
      state.fieldValues[field.name] = "";
    }
  });
};

const updateRecentTemplates = (templateId) => {
  const next = [templateId, ...state.recentTemplates.filter((id) => id !== templateId)];
  state.recentTemplates = next.slice(0, 5);
  localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(state.recentTemplates));
  renderRecentTemplates();
};

const restoreRecentTemplates = () => {
  const stored = localStorage.getItem(RECENT_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        state.recentTemplates = parsed;
      }
    } catch (error) {
      state.recentTemplates = [];
    }
  }
  renderRecentTemplates();
};

const restoreLastTemplate = () => {
  const last = localStorage.getItem(LAST_TEMPLATE_KEY);
  if (last) {
    const exists = state.templatesIndex.some((template) => template.id === last);
    if (exists) {
      loadTemplate(last);
    }
  }
};

const matchesSearch = (template) => {
  if (!state.searchQuery.trim()) {
    return true;
  }
  const query = state.searchQuery.toLowerCase();
  const keywordText = Array.isArray(template.keywords) ? template.keywords.join(" ") : "";
  return `${template.title} ${template.category} ${keywordText}`.toLowerCase().includes(query);
};

const renderTemplateLists = () => {
  const filtered = state.templatesIndex.filter(matchesSearch);
  elements.templateList.innerHTML = "";
  if (filtered.length === 0) {
    elements.templateList.innerHTML = "<li class=\"placeholder-text\">No templates found.</li>";
    return;
  }
  filtered.forEach((template) => {
    elements.templateList.appendChild(createTemplateCard(template));
  });
};

const renderRecentTemplates = () => {
  elements.recentList.innerHTML = "";
  const recentTemplates = state.recentTemplates
    .map((id) => state.templatesIndex.find((template) => template.id === id))
    .filter(Boolean);
  if (recentTemplates.length === 0) {
    elements.recentList.innerHTML =
      '<li class="placeholder-text">No recent templates yet.</li>';
    return;
  }
  recentTemplates.forEach((template) => {
    elements.recentList.appendChild(createTemplateCard(template));
  });
};

const createTemplateCard = (template) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "template-card";
  if (state.selectedTemplate && state.selectedTemplate.id === template.id) {
    button.classList.add("active");
  }
  button.innerHTML = `
    <strong>${template.title}</strong>
    <span>${template.category}</span>
    ${template.keywords ? `<span>${template.keywords.slice(0, 4).join(", ")}</span>` : ""}
  `;
  button.addEventListener("click", () => loadTemplate(template.id));
  return button;
};

const renderForm = () => {
  if (!state.selectedTemplate) {
    elements.formContainer.innerHTML =
      '<p class="placeholder-text">Select a template to begin.</p>';
    elements.resetButton.disabled = true;
    elements.copyButton.disabled = true;
    return;
  }

  elements.formContainer.innerHTML = "";
  state.selectedTemplate.fields.forEach((field) => {
    elements.formContainer.appendChild(renderField(field));
  });
  elements.resetButton.disabled = false;
  elements.copyButton.disabled = false;
};

const renderField = (field) => {
  const wrapper = document.createElement("div");
  wrapper.className = "form-field";
  const label = document.createElement("label");
  label.htmlFor = field.name;
  label.textContent = field.label;

  let input;
  if (field.type === "textarea") {
    input = document.createElement("textarea");
  } else if (field.type === "select") {
    input = document.createElement("select");
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Select an option";
    input.appendChild(defaultOption);
    field.options.forEach((option) => {
      const optionElement = document.createElement("option");
      optionElement.value = option;
      optionElement.textContent = option;
      input.appendChild(optionElement);
    });
  } else if (field.type === "checkbox") {
    input = document.createElement("input");
    input.type = "checkbox";
  } else {
    input = document.createElement("input");
    input.type = field.type;
  }

  input.id = field.name;
  input.name = field.name;
  input.dataset.fieldType = field.type;

  if (field.type === "checkbox") {
    input.checked = Boolean(state.fieldValues[field.name]);
  } else {
    input.value = state.fieldValues[field.name];
  }

  const updateField = () => {
    const nextValue = field.type === "checkbox" ? input.checked : input.value;
    state.fieldValues[field.name] = nextValue;
    validateField(field);
    renderPreview();
  };

  input.addEventListener("input", updateField);
  input.addEventListener("change", updateField);

  if (field.type === "checkbox") {
    const checkboxRow = document.createElement("div");
    checkboxRow.className = "checkbox-row";
    checkboxRow.appendChild(input);
    checkboxRow.appendChild(label);
    wrapper.appendChild(checkboxRow);
  } else {
    wrapper.appendChild(label);
    wrapper.appendChild(input);
    if (field.presets && field.presets.length > 0) {
      const presetButton = document.createElement("button");
      presetButton.type = "button";
      presetButton.className = "preset-button preset-button-inline";
      presetButton.textContent = field.presetLabel || "Presets";
      presetButton.addEventListener("click", () => openPresetModal(field));
      wrapper.appendChild(presetButton);
    }
  }

  if (field.helpText) {
    const help = document.createElement("p");
    help.className = "help-text";
    help.textContent = field.helpText;
    wrapper.appendChild(help);
  }

  const error = document.createElement("p");
  error.className = "error-message";
  error.dataset.errorFor = field.name;
  wrapper.appendChild(error);

  updateErrorDisplay(field.name);

  return wrapper;
};

const openPresetModal = (field) => {
  elements.presetModalTitle.textContent = field.presetTitle || "Preset options";
  elements.presetModalDescription.textContent =
    field.presetDescription || "Select an option to insert into the field.";
  elements.presetModalOptions.innerHTML = "";
  field.presets.forEach((preset) => {
    const optionButton = document.createElement("button");
    optionButton.type = "button";
    optionButton.className = "modal-option";
    optionButton.textContent = preset.label || preset.value;
    optionButton.addEventListener("click", () => {
      state.fieldValues[field.name] = preset.value;
      renderForm();
      renderPreview();
      closePresetModal();
    });
    elements.presetModalOptions.appendChild(optionButton);
  });
  elements.presetModal.hidden = false;
};

const closePresetModal = () => {
  elements.presetModal.hidden = true;
};

const validateField = (field) => {
  const value = state.fieldValues[field.name];
  let isValid = true;
  if (field.required) {
    if (field.type === "checkbox") {
      isValid = value === true;
    } else if (field.type === "number") {
      isValid = value !== "" && Number.isFinite(Number(value));
    } else {
      isValid = String(value).trim().length > 0;
    }
  }
  state.fieldErrors[field.name] = isValid ? "" : "This field is required.";
  updateErrorDisplay(field.name);
  return isValid;
};

const validateAllFields = () => {
  if (!state.selectedTemplate) {
    return false;
  }
  state.validationAttempted = true;
  const results = state.selectedTemplate.fields.map((field) => validateField(field));
  return results.every(Boolean);
};

const updateErrorDisplay = (fieldName) => {
  const errorMessage = state.fieldErrors[fieldName];
  const errorElement = elements.formContainer.querySelector(
    `[data-error-for="${fieldName}"]`
  );
  if (errorElement) {
    errorElement.textContent = errorMessage;
  }
};

const renderPreview = () => {
  if (!state.selectedTemplate) {
    elements.letterPreview.textContent = "";
    return;
  }
  const rendered = renderTemplateBody(state.selectedTemplate, state.fieldValues);
  elements.letterPreview.textContent = rendered;
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

  return `${template.title}\n\n${body.trim()}${template.disclaimer ? `\n\n${template.disclaimer}` : ""}`;
};

const showToast = (message) => {
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    elements.toast.hidden = true;
  }, 2200);
};

const copyToClipboard = async () => {
  if (!state.selectedTemplate) {
    return;
  }
  const isValid = validateAllFields();
  if (!isValid) {
    elements.copyStatus.textContent = "Please complete required fields before copying.";
    return;
  }
  const letterText = renderTemplateBody(state.selectedTemplate, state.fieldValues);
  try {
    await navigator.clipboard.writeText(letterText);
    elements.copyStatus.textContent = "Copied to clipboard.";
    showToast("Copied ✓");
  } catch (error) {
    const fallbackSuccess = fallbackCopy(letterText);
    if (fallbackSuccess) {
      elements.copyStatus.textContent = "Copied to clipboard.";
      showToast("Copied ✓");
    } else {
      elements.copyStatus.textContent =
        "Copy failed — select the letter and copy manually.";
    }
  }
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

const resetFields = () => {
  if (!state.selectedTemplate) {
    return;
  }
  initializeFieldValues(state.selectedTemplate);
  state.fieldErrors = {};
  state.validationAttempted = false;
  renderForm();
  renderPreview();
  elements.copyStatus.textContent = "";
};

const handleKeydown = (event) => {
  if (event.key === "Escape" && !elements.presetModal.hidden) {
    closePresetModal();
    return;
  }

  if (event.key === "/" && document.activeElement !== elements.searchInput) {
    event.preventDefault();
    elements.searchInput.focus();
    return;
  }

  if (event.key === "Enter" && document.activeElement === elements.searchInput) {
    const firstTemplate = elements.templateList.querySelector(".template-card");
    if (firstTemplate) {
      firstTemplate.click();
    }
  }

  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    if (state.selectedTemplate) {
      copyToClipboard();
    }
  }
};

const init = () => {
  restoreRecentTemplates();
  loadTemplatesIndex();

  elements.searchInput.addEventListener("input", (event) => {
    state.searchQuery = event.target.value;
    renderTemplateLists();
  });

  elements.copyButton.addEventListener("click", copyToClipboard);
  elements.resetButton.addEventListener("click", resetFields);
  elements.presetModalClose.addEventListener("click", closePresetModal);
  elements.presetModal.addEventListener("click", (event) => {
    if (event.target === elements.presetModal) {
      closePresetModal();
    }
  });

  document.addEventListener("keydown", handleKeydown);
};

init();
