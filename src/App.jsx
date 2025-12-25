import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AppBar,
  Box,
  Button,
  ButtonGroup,
  Checkbox,
  Chip,
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
  Tooltip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import ViewSidebarOutlinedIcon from "@mui/icons-material/ViewSidebarOutlined";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import LibraryAddIcon from "@mui/icons-material/LibraryAdd";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Route, Routes, useNavigate, useParams } from "react-router-dom";

const LAST_TEMPLATE_KEY = "lastSelectedTemplate";
const TEMPLATE_VALUES_KEY = "templateValues";
const DRAWER_WIDTH = 320;
const DRAWER_COLLAPSED = 76;
const REVIEW_BADGES = {
  alpha: { label: "Alpha", color: "#b71c1c" },
  beta: { label: "Beta", color: "#ef6c00" },
  reviewed: { label: "Reviewed", color: "#2e7d32" },
};

const fetchJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Request failed");
  }
  return response.json();
};

const fetchText = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Request failed");
  }
  return response.text();
};

const getRepeatableSectionKey = (section) => {
  if (!section?.repeatable) {
    return null;
  }
  if (section.name) {
    return section.name;
  }
  const blocks = Array.isArray(section.blocks) ? section.blocks : [];
  if (blocks.length === 1) {
    return blocks[0];
  }
  return null;
};

const getDefaultFieldValue = (field) => {
  if (field.type === "checkbox") {
    return Boolean(field.default);
  }
  if (field.type === "select" && field.multiple) {
    if (Array.isArray(field.default)) {
      return field.default;
    }
    if (field.default !== undefined) {
      return [field.default];
    }
    return [];
  }
  if (field.default !== undefined) {
    return field.default;
  }
  return "";
};

const buildRepeatableEntry = (fields) =>
  (fields || []).reduce((entry, field) => {
    if (!field || field.type === "section") {
      return entry;
    }
    entry[field.name] = getDefaultFieldValue(field);
    return entry;
  }, {});

const buildRepeatableEntryForSection = (section) => {
  if (!section) {
    return {};
  }
  const baseFields = section.repeatableFields || section.fields || [];
  const entry = buildRepeatableEntry(baseFields);
  if (Array.isArray(section.blockOptionDefs) && section.blockOptionDefs.length > 0) {
    const selectorName = section.blockSelectorName || "blockId";
    if (!(selectorName in entry)) {
      entry[selectorName] = "";
    }
  }
  return entry;
};

const getTemplateStorageKey = (mode, templateId) =>
  mode && templateId ? `${TEMPLATE_VALUES_KEY}:${mode}:${templateId}` : null;

const collectTopLevelValueKeys = (template) => {
  const keys = new Set();
  const visitField = (field) => {
    if (!field) {
      return;
    }
    if (field.type === "section") {
      if (field.repeatable && field.repeatableKey) {
        keys.add(field.repeatableKey);
        return;
      }
      (field.fields || []).forEach(visitField);
      return;
    }
    keys.add(field.name);
  };
  (template?.fields || []).forEach(visitField);
  return keys;
};

const applyPresetGroupsToFields = (fields, presetGroups) =>
  fields.map((field) => {
    if (field.type === "section") {
      const next = {
        ...field,
        fields: applyPresetGroupsToFields(field.fields || [], presetGroups),
      };
      if (field.repeatableFields) {
        next.repeatableFields = applyPresetGroupsToFields(field.repeatableFields, presetGroups);
      }
      if (Array.isArray(field.blockOptionDefs)) {
        next.blockOptionDefs = field.blockOptionDefs.map((option) => ({
          ...option,
          fields: applyPresetGroupsToFields(option.fields || [], presetGroups),
        }));
      }
      return next;
    }
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

const applyPresetGroups = (template, presetGroups) => {
  if (!template || !Array.isArray(template.fields)) {
    return template;
  }
  if (!presetGroups || Object.keys(presetGroups).length === 0) {
    return template;
  }
  return { ...template, fields: applyPresetGroupsToFields(template.fields, presetGroups) };
};

const applyFieldBlocks = (template, fieldBlocks) => {
  if (!template || !Array.isArray(template.fields)) {
    return template;
  }
  if (!fieldBlocks || Object.keys(fieldBlocks).length === 0) {
    return template;
  }

  const blockBodies = {};
  const getBlock = (blockId) => fieldBlocks[blockId];
  const prefixFor = (block, blockId) => block.prefix || block.id || blockId;
  const buildBlockFields = (blockId, options = { prefixFields: true, addBody: true }) => {
    const block = getBlock(blockId);
    if (!block) {
      return [];
    }
    const prefix = prefixFor(block, blockId);
    if (block.body && options.addBody !== false) {
      const withPrefix = block.body
        .replace(/\{\{#if\s+(\w+)\}\}/g, `{{#if ${prefix}.$1}}`)
        .replace(/\{\{(\w+)\}\}/g, `{{${prefix}.$1}}`);
      blockBodies[prefix] = withPrefix;
    }
    return (block.fields || []).map((field) => ({
      ...field,
      name: options.prefixFields ? `${prefix}.${field.name}` : field.name,
    }));
  };

  const addBlockBodies = (blockIds) => {
    blockIds.forEach((blockId) => {
      const block = getBlock(blockId);
      if (!block) {
        return;
      }
      const prefix = prefixFor(block, blockId);
      if (!blockBodies[prefix] && block.body) {
        const withPrefix = block.body
          .replace(/\{\{#if\s+(\w+)\}\}/g, `{{#if ${prefix}.$1}}`)
          .replace(/\{\{(\w+)\}\}/g, `{{${prefix}.$1}}`);
        blockBodies[prefix] = withPrefix;
      }
    });
  };

  const normalizeBlockOption = (option) => {
    if (typeof option === "string") {
      return { id: option, label: option };
    }
    if (option && typeof option === "object") {
      const id = option.id || option.value;
      return id ? { id, label: option.label || id } : null;
    }
    return null;
  };

  const applyBlocksToFields = (fields) =>
    fields.map((field) => {
      if (field.type !== "section") {
        return field;
      }
      const sectionBlocks = Array.isArray(field.blocks) ? field.blocks : [];
      const sectionBlockOptions = Array.isArray(field.blockOptions) ? field.blockOptions : [];
      addBlockBodies(sectionBlocks);
      const blockOptionDefs =
        sectionBlockOptions.length > 0
          ? sectionBlockOptions
              .map(normalizeBlockOption)
              .filter(Boolean)
              .map((option) => {
                const block = getBlock(option.id);
                if (!block) {
                  return null;
                }
                const prefix = prefixFor(block, option.id);
                return {
                  id: option.id,
                  label: option.label || block.title || option.id,
                  prefix,
                  body: block.body,
                  fields: buildBlockFields(option.id, { prefixFields: true, addBody: false }),
                };
              })
              .filter(Boolean)
          : [];
      if (field.repeatable) {
        const repeatableKey = getRepeatableSectionKey(field);
        const injected = sectionBlocks.flatMap((blockId) =>
          buildBlockFields(blockId, { prefixFields: false })
        );
        const repeatableFields = [...(field.fields || []), ...injected];
        return {
          ...field,
          repeatableKey,
          repeatableFields,
          blockOptionDefs,
          blockSelectorName: field.blockSelectorName || "blockId",
          blockSelectorLabel: field.blockSelectorLabel || "Exam type",
        };
      }
      const injected = sectionBlocks.flatMap((blockId) => buildBlockFields(blockId));
      const nextSectionFields = [...(field.fields || []), ...injected];
      return {
        ...field,
        fields: applyBlocksToFields(nextSectionFields),
        blockOptionDefs,
        blockSelectorName: field.blockSelectorName || "blockId",
        blockSelectorLabel: field.blockSelectorLabel || "Exam type",
      };
    });

  const templateBlocks = Array.isArray(template.blocks) ? template.blocks : [];
  addBlockBodies(templateBlocks);
  const topLevelFields = applyBlocksToFields(template.fields);
  const injectedTop = templateBlocks.flatMap((blockId) => buildBlockFields(blockId));

  return {
    ...template,
    fields: [...topLevelFields, ...injectedTop],
    blockBodies,
  };
};

const flattenFields = (fields) =>
  fields.flatMap((field) =>
    field.type === "section" ? flattenFields(field.fields || []) : [field]
  );

const initializeFieldValues = (template) => {
  const nextValues = {};
  const seedField = (field) => {
    if (!field) {
      return;
    }
    if (field.type === "section") {
      if (field.repeatable && field.repeatableKey) {
        nextValues[field.repeatableKey] = [buildRepeatableEntryForSection(field)];
        return;
      }
      (field.fields || []).forEach(seedField);
      return;
    }
    if (field.repeatable) {
      nextValues[field.name] = [getDefaultFieldValue(field)];
      return;
    }
    nextValues[field.name] = getDefaultFieldValue(field);
  };
  (template.fields || []).forEach(seedField);
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
  const placeholderRegex = /\{\{([^}]+)\}\}/g;
  const resolveValue = (scopeValues, key) => {
    if (key in scopeValues) {
      return scopeValues[key];
    }
    if (!key.includes(".")) {
      return undefined;
    }
    const parts = key.split(".");
    let current = scopeValues;
    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    return current;
  };
  const normalizeBulletLines = (value) => {
    if (value === null || value === undefined) {
      return [];
    }
    if (Array.isArray(value)) {
      return value.flatMap((entry) => String(entry).replace(/\r\n/g, "\n").split("\n"));
    }
    return String(value).replace(/\r\n/g, "\n").split("\n");
  };

  const formatBullets = (value, indent = 0) => {
    const lines = normalizeBulletLines(value);
    const indentText = " ".repeat(Math.max(0, Number(indent) || 0));
    const entries = lines
      .filter((line) => line.trim())
      .map((line) => {
        const leading = line.match(/^[ \t]*/)?.[0] || "";
        const extraIndent = leading.replace(/\t/g, "  ");
        return `${indentText}${extraIndent}- ${line.trimStart()}`;
      });
    return entries.join("\n");
  };
  const replacePlaceholders = (text, contextValues = {}) => {
    const scopeValues = { ...values, ...contextValues };
    return text.replace(placeholderRegex, (match, token) => {
      const trimmed = token.trim();
      if (!trimmed || trimmed.startsWith("/")) {
        return match;
      }
      const parts = trimmed.split(/\s+/);
      if (parts[0] === "#bullets") {
        const fieldName = parts[1];
        const indentArg = parts[2];
        if (!fieldName) {
          return "";
        }
        const value = resolveValue(scopeValues, fieldName);
        if (value === undefined) {
          return "";
        }
        const indent =
          indentArg && indentArg.startsWith("indent=")
            ? Number(indentArg.slice("indent=".length))
            : Number(indentArg);
        return formatBullets(value, indent);
      }
      if (trimmed.startsWith("#")) {
        return match;
      }
      const fieldName = trimmed;
      const value = resolveValue(scopeValues, fieldName);
      if (value === undefined) {
        return "";
      }
      if (typeof value === "boolean") {
        return value ? "Yes" : "No";
      }
      if (Array.isArray(value)) {
        return value.filter((entry) => String(entry).trim()).join(", ");
      }
      return value ? String(value) : "";
    });
  };

  const tokenizeExpression = (expr) => {
    const tokens = [];
    let i = 0;
    while (i < expr.length) {
      const char = expr[i];
      if (/\s/.test(char)) {
        i += 1;
        continue;
      }
      if (char === "(" || char === ")" || char === "!" || char === "+" || char === "-" || char === "*" || char === "/") {
        tokens.push({ type: "op", value: char });
        i += 1;
        continue;
      }
      if (expr.startsWith("&&", i) || expr.startsWith("||", i)) {
        tokens.push({ type: "op", value: expr.slice(i, i + 2) });
        i += 2;
        continue;
      }
      if (
        expr.startsWith(">=", i) ||
        expr.startsWith("<=", i) ||
        expr.startsWith("==", i) ||
        expr.startsWith("!=", i)
      ) {
        tokens.push({ type: "op", value: expr.slice(i, i + 2) });
        i += 2;
        continue;
      }
      if (char === ">" || char === "<") {
        tokens.push({ type: "op", value: char });
        i += 1;
        continue;
      }
      if (char === "'" || char === "\"") {
        const quote = char;
        let j = i + 1;
        let value = "";
        while (j < expr.length) {
          if (expr[j] === "\\" && j + 1 < expr.length) {
            value += expr[j + 1];
            j += 2;
            continue;
          }
          if (expr[j] === quote) {
            break;
          }
          value += expr[j];
          j += 1;
        }
        if (j >= expr.length) {
          return null;
        }
        tokens.push({ type: "string", value });
        i = j + 1;
        continue;
      }
      const numberMatch = expr.slice(i).match(/^\d+(\.\d+)?/);
      if (numberMatch) {
        tokens.push({ type: "number", value: Number(numberMatch[0]) });
        i += numberMatch[0].length;
        continue;
      }
      const wordMatch = expr.slice(i).match(/^@?[\w.]+/);
      if (wordMatch) {
        const word = wordMatch[0];
        if (word === "true" || word === "false") {
          tokens.push({ type: "boolean", value: word === "true" });
        } else {
          tokens.push({ type: "identifier", value: word });
        }
        i += word.length;
        continue;
      }
      return null;
    }
    return tokens;
  };

  const evalExpression = (expr, options = { coerceBoolean: true }, scopeValues = values) => {
    const tokens = tokenizeExpression(expr);
    if (!tokens || tokens.length === 0) {
      return false;
    }
    let position = 0;
    const peek = () => tokens[position];
    const consume = () => tokens[position++];
    const toNumberIfPossible = (value) => {
      if (typeof value === "number") {
        return value;
      }
      if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
        return Number(value);
      }
      return null;
    };
    const toBoolean = (value) => {
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return Boolean(value);
    };
    const normalizeComparison = (left, right) => {
      const leftNumber = toNumberIfPossible(left);
      const rightNumber = toNumberIfPossible(right);
      if (leftNumber !== null && rightNumber !== null) {
        return [leftNumber, rightNumber];
      }
      return [left, right];
    };
    const parsePrimary = () => {
      const token = consume();
      if (!token) {
        return undefined;
      }
      if (token.type === "op" && token.value === "(") {
        const value = parseOr();
        if (peek()?.type === "op" && peek().value === ")") {
          consume();
        }
        return value;
      }
      if (token.type === "number" || token.type === "string" || token.type === "boolean") {
        return token.value;
      }
      if (token.type === "identifier") {
        return resolveValue(scopeValues, token.value);
      }
      return undefined;
    };
    const parseUnary = () => {
      if (peek()?.type === "op" && (peek().value === "!" || peek().value === "-")) {
        const operator = consume().value;
        const value = parseUnary();
        if (operator === "!") {
          return options.coerceBoolean ? !toBoolean(value) : !value;
        }
        const numberValue = toNumberIfPossible(value);
        return numberValue === null ? undefined : -numberValue;
      }
      return parsePrimary();
    };
    const parseMulDiv = () => {
      let value = parseUnary();
      while (peek()?.type === "op" && (peek().value === "*" || peek().value === "/")) {
        const operator = consume().value;
        const right = parseUnary();
        const leftNumber = toNumberIfPossible(value);
        const rightNumber = toNumberIfPossible(right);
        if (leftNumber === null || rightNumber === null) {
          value = undefined;
          continue;
        }
        value = operator === "*" ? leftNumber * rightNumber : leftNumber / rightNumber;
      }
      return value;
    };
    const parseAddSub = () => {
      let value = parseMulDiv();
      while (peek()?.type === "op" && (peek().value === "+" || peek().value === "-")) {
        const operator = consume().value;
        const right = parseMulDiv();
        const leftNumber = toNumberIfPossible(value);
        const rightNumber = toNumberIfPossible(right);
        if (leftNumber === null || rightNumber === null) {
          value = undefined;
          continue;
        }
        value = operator === "+" ? leftNumber + rightNumber : leftNumber - rightNumber;
      }
      return value;
    };
    const parseComparison = () => {
      let value = parseAddSub();
      while (peek()?.type === "op" && [">", "<", ">=", "<=", "==", "!="].includes(peek().value)) {
        const operator = consume().value;
        const right = parseAddSub();
        const [leftValue, rightValue] = normalizeComparison(value, right);
        switch (operator) {
          case ">":
            value = leftValue > rightValue;
            break;
          case "<":
            value = leftValue < rightValue;
            break;
          case ">=":
            value = leftValue >= rightValue;
            break;
          case "<=":
            value = leftValue <= rightValue;
            break;
          case "==":
            value = leftValue == rightValue;
            break;
          case "!=":
            value = leftValue != rightValue;
            break;
          default:
            break;
        }
      }
      return value;
    };
    const parseAnd = () => {
      let value = parseComparison();
      while (peek()?.type === "op" && peek().value === "&&") {
        consume();
        if (options.coerceBoolean) {
          const right = parseComparison();
          value = toBoolean(value) && toBoolean(right);
        } else {
          value = value && parseComparison();
        }
      }
      return value;
    };
    const parseOr = () => {
      let value = parseAnd();
      while (peek()?.type === "op" && peek().value === "||") {
        consume();
        if (options.coerceBoolean) {
          const right = parseAnd();
          value = toBoolean(value) || toBoolean(right);
        } else {
          value = value || parseAnd();
        }
      }
      return value;
    };
    const result = parseOr();
    return options.coerceBoolean ? toBoolean(result) : result;
  };

  const applyCalcExpressions = (text, scopeValues) => {
    const calcRegex = /\{\{\s*calc\s+([^}]+)\}\}/g;
    return text.replace(calcRegex, (match, expression) => {
      const value = evalExpression(expression, { coerceBoolean: false }, scopeValues);
      if (value === undefined || value === null || Number.isNaN(value)) {
        return "";
      }
      const numericValue = typeof value === "number" ? value : Number(value);
      if (Number.isNaN(numericValue)) {
        return "";
      }
      return String(Math.round(numericValue));
    });
  };

  body = applyCalcExpressions(body, values);

  const parseTemplate = (text) => {
    const root = { type: "root", children: [] };
    const stack = [root];
    const tokenRegex = /\{\{#if\s+[^}]+\}\}|\{\{\/if\}\}|\{\{#each\s+[^}]+\}\}|\{\{\/each\}\}/g;
    let lastIndex = 0;
    let match;
    while ((match = tokenRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        stack[stack.length - 1].children.push({
          type: "text",
          value: text.slice(lastIndex, match.index),
        });
      }
      const token = match[0];
      if (token.startsWith("{{#if")) {
        const expr = token.slice(5, -2).trim();
        const node = { type: "if", expr, children: [] };
        stack[stack.length - 1].children.push(node);
        stack.push(node);
      } else if (token.startsWith("{{#each")) {
        const expr = token.slice(7, -2).trim();
        const node = { type: "each", expr, children: [] };
        stack[stack.length - 1].children.push(node);
        stack.push(node);
      } else if (token === "{{/if}}") {
        if (stack.length > 1 && stack[stack.length - 1].type === "if") {
          stack.pop();
        } else {
          stack[0].children.push({ type: "text", value: token });
        }
      } else if (token === "{{/each}}") {
        if (stack.length > 1 && stack[stack.length - 1].type === "each") {
          stack.pop();
        } else {
          stack[0].children.push({ type: "text", value: token });
        }
      }
      lastIndex = match.index + token.length;
    }
    if (lastIndex < text.length) {
      stack[stack.length - 1].children.push({
        type: "text",
        value: text.slice(lastIndex),
      });
    }
    return root.children;
  };

  const renderNodes = (nodes, contextValues = {}) =>
    nodes
      .map((node) => {
        if (node.type === "text") {
          return replacePlaceholders(node.value, contextValues);
        }
        if (node.type === "if") {
          return evalExpression(node.expr, { coerceBoolean: true }, { ...values, ...contextValues })
            ? renderNodes(node.children, contextValues)
            : "\u0000";
        }
        if (node.type === "each") {
          const collection = resolveValue({ ...values, ...contextValues }, node.expr);
          if (!Array.isArray(collection) || collection.length === 0) {
            return "\u0000";
          }
          return collection
            .map((entry, index) =>
              renderNodes(node.children, { ...contextValues, this: entry, "@index": index })
            )
            .join("");
        }
        return "";
      })
      .join("");

  const renderTemplateFragment = (text, contextValues = {}) => {
    const withCalc = applyCalcExpressions(text, { ...values, ...contextValues });
    return renderNodes(parseTemplate(withCalc), contextValues);
  };

  const collectRepeatableBlockSections = (fields, collected = []) => {
    fields.forEach((field) => {
      if (!field || field.type !== "section") {
        return;
      }
      if (field.repeatable && Array.isArray(field.blockOptionDefs) && field.blockOptionDefs.length) {
        collected.push(field);
      }
      collectRepeatableBlockSections(field.fields || [], collected);
    });
    return collected;
  };

  const renderRepeatableBlockSections = (text) => {
    if (!template?.fields) {
      return text;
    }
    const sections = collectRepeatableBlockSections(template.fields);
    return sections.reduce((current, section) => {
      const repeatableKey = section.repeatableKey;
      if (!repeatableKey) {
        return current;
      }
      const placeholder = section.repeatablePlaceholder || repeatableKey;
      const placeholderRegex = new RegExp(`\\{\\{${escapeRegExp(placeholder)}\\}\\}`, "g");
      const entries = Array.isArray(values[repeatableKey]) ? values[repeatableKey] : [];
      const selectorName = section.blockSelectorName || "blockId";
      const rendered = entries
        .map((entry) => {
          const blockId = entry?.[selectorName];
          if (!blockId) {
            return "";
          }
          const blockOption = section.blockOptionDefs.find((option) => option.id === blockId);
          if (!blockOption || !blockOption.body) {
            return "";
          }
          const prefix = blockOption.prefix || blockOption.id;
          const prefixKey = `${prefix}.`;
          const entryValues = Object.entries(entry || {}).reduce((acc, [key, value]) => {
            if (key.startsWith(prefixKey)) {
              acc[key.slice(prefixKey.length)] = value;
            }
            return acc;
          }, {});
          return renderTemplateFragment(blockOption.body, entryValues).trim();
        })
        .filter(Boolean)
        .join("\n\n");
      return current.replace(placeholderRegex, rendered);
    }, text);
  };

  body = renderRepeatableBlockSections(body);

  let output = renderNodes(parseTemplate(body));
  output = output.replace(/\r?\n[ \t]*\u0000[ \t]*\r?\n/g, "\n");
  output = output.replace(/^[ \t]*\u0000[ \t]*\r?\n/g, "");
  output = output.replace(/\r?\n[ \t]*\u0000[ \t]*$/g, "");
  output = output.replace(/\u0000/g, "");
  return output;
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
  if (field.type === "select" && field.multiple) {
    return Array.isArray(value) && value.length > 0 ? "" : "This field is required.";
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

const AppContent = ({ onToggleColorMode, themePreference }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";
  const isDesktop = useMediaQuery("(min-width:1025px)");
  const searchRef = useRef(null);
  const previewMarkdownRef = useRef(null);
  const selectedTemplateModeRef = useRef(null);
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
  const [toastMessage, setToastMessage] = useState("");
  const [toastSeverity, setToastSeverity] = useState("success");
  const [presetDialogField, setPresetDialogField] = useState(null);
  const [presetDialogTarget, setPresetDialogTarget] = useState(null);
  const [presetDialogValue, setPresetDialogValue] = useState("");
  const [presetQuery, setPresetQuery] = useState("");
  const [presetDialogSelected, setPresetDialogSelected] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [previewTab, setPreviewTab] = useState("patient");
  const [templateMode, setTemplateMode] = useState("letters");
  const [expandAbbreviations, setExpandAbbreviations] = useState(false);
  const [abbreviationExpansions, setAbbreviationExpansions] = useState({});
  const [previewMode, setPreviewMode] = useState("side");
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [fieldBlocksReady, setFieldBlocksReady] = useState(false);
  const [disclaimerText, setDisclaimerText] = useState("");
  const [reviewFilter, setReviewFilter] = useState("beta");
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
    const statusMatches = (template) => {
      const status = template.reviewStatus || "alpha";
      if (reviewFilter === "reviewed") {
        return status === "reviewed";
      }
      if (reviewFilter === "beta") {
        return status === "beta" || status === "reviewed";
      }
      return true;
    };
    const filteredByStatus = activeTemplates.filter(statusMatches);
    if (!searchQuery.trim()) {
      return filteredByStatus;
    }
    const query = searchQuery.toLowerCase();
    return filteredByStatus.filter((template) => {
      const keywordText = Array.isArray(template.keywords) ? template.keywords.join(" ") : "";
      return `${template.title} ${template.category} ${keywordText}`.toLowerCase().includes(query);
    });
  }, [activeTemplates, searchQuery, reviewFilter]);

  const renderBody = (template, values, bodyKey) => {
    const body = template?.[bodyKey] || template?.body || template?.patientBody || "";
    return renderTemplateBody({ ...template, body }, { ...values, disclaimer: disclaimerText });
  };

const applyImportedValues = (template, importValues) => {
  const nextValues = initializeFieldValues(template);
  if (!importValues || typeof importValues !== "object") {
    return nextValues;
  }
  const allowed = collectTopLevelValueKeys(template);
  Object.entries(importValues).forEach(([key, value]) => {
    if (allowed.has(key)) {
      nextValues[key] = value;
    }
  });
  return nextValues;
};

const loadPersistedValues = (template, mode) => {
  if (!template?.id || !mode) {
    return null;
  }
  const key = getTemplateStorageKey(mode, template.id);
  if (!key) {
    return null;
  }
  const stored = localStorage.getItem(key);
  if (!stored) {
    return null;
  }
  try {
    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    const allowed = collectTopLevelValueKeys(template);
    return Object.entries(parsed).reduce((acc, [fieldName, value]) => {
      if (allowed.has(fieldName)) {
        acc[fieldName] = value;
      }
      return acc;
    }, {});
  } catch (error) {
    return null;
  }
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
    disclaimerText,
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
        const disclaimer = await fetchText(`${baseUrl}templates/disclaimer.md`);
        setDisclaimerText(disclaimer.trimEnd());
      } catch (error) {
        setDisclaimerText("");
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
      } finally {
        setFieldBlocksReady(true);
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
        setPresetDialogTarget(null);
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

  useEffect(() => {
    if (!presetDialogField) {
      return;
    }
    setPresetQuery("");
    setPresetDialogSelected(null);
    const timer = setTimeout(() => {
      presetSearchRef.current?.focus();
    }, 0);
    return () => clearTimeout(timer);
  }, [presetDialogField]);

  const loadTemplate = async (
    templateId,
    groups = presetGroups,
    importValues,
    modeOverride,
    skipRouteUpdate = false
  ) => {
    try {
      const mode = modeOverride || templateMode;
      selectedTemplateModeRef.current = mode;
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
      const baseValues = applyImportedValues(hydrated, importValues);
      const persistedValues = importValues ? null : loadPersistedValues(hydrated, mode);
      setFieldValues({ ...baseValues, ...(persistedValues || {}) });
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

  const appendTextValue = (currentValue, nextValue) => {
    const current = String(currentValue ?? "");
    if (!current.trim()) {
      return nextValue;
    }
    return `${current.trimEnd()}\n${nextValue}`;
  };

  const appendLineValue = (currentValue, nextValue) => {
    const current = String(currentValue ?? "");
    const normalized = current.replace(/\r\n/g, "\n");
    const lines = normalized
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.includes(nextValue)) {
      return current;
    }
    if (!normalized.trim()) {
      return nextValue;
    }
    return `${normalized.trimEnd()}\n${nextValue}`;
  };

  const appendCommaValue = (currentValue, nextValue) => {
    const current = String(currentValue ?? "");
    const parts = current
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.includes(nextValue)) {
      return current;
    }
    return parts.length > 0 ? `${parts.join(", ")}, ${nextValue}` : nextValue;
  };

  const appendPresetValue = (field, value, target = null) => {
    setFieldValues((prev) => {
      if (target?.kind === "field") {
        const currentEntries = Array.isArray(prev[target.fieldName])
          ? [...prev[target.fieldName]]
          : [];
        const entryValue = appendTextValue(currentEntries[target.index], value);
        currentEntries[target.index] = entryValue;
        return { ...prev, [target.fieldName]: currentEntries };
      }
      if (target?.kind === "section") {
        const currentEntries = Array.isArray(prev[target.repeatableKey])
          ? [...prev[target.repeatableKey]]
          : [];
        const entry = { ...(currentEntries[target.index] || {}) };
        entry[target.fieldName] = appendTextValue(entry[target.fieldName], value);
        currentEntries[target.index] = entry;
        return { ...prev, [target.repeatableKey]: currentEntries };
      }
      const current = prev[field.name];
      return { ...prev, [field.name]: appendTextValue(current, value) };
    });
    setFieldErrors((prev) => {
      if (target?.kind === "field") {
        const nextErrors = Array.isArray(prev[target.fieldName])
          ? [...prev[target.fieldName]]
          : [];
        nextErrors[target.index] = "";
        return { ...prev, [target.fieldName]: nextErrors };
      }
      if (target?.kind === "section") {
        const nextErrors = Array.isArray(prev[target.repeatableKey])
          ? [...prev[target.repeatableKey]]
          : [];
        const entryErrors = { ...(nextErrors[target.index] || {}) };
        entryErrors[target.fieldName] = "";
        nextErrors[target.index] = entryErrors;
        return { ...prev, [target.repeatableKey]: nextErrors };
      }
      return { ...prev, [field.name]: "" };
    });
  };
  const appendQuickOption = (field, option) => {
    setFieldValues((prev) => {
      const current = String(prev[field.name] ?? "");
      if (field.type === "textarea") {
        const next = appendLineValue(current, option);
        return { ...prev, [field.name]: next };
      }
      const next = appendCommaValue(current, option);
      return { ...prev, [field.name]: next };
    });
    setFieldErrors((prev) => ({ ...prev, [field.name]: "" }));
  };

  const appendQuickOptionToRepeatableField = (field, index, option) => {
    setFieldValues((prev) => {
      const currentEntries = Array.isArray(prev[field.name]) ? [...prev[field.name]] : [];
      const currentValue = currentEntries[index] ?? "";
      const nextValue =
        field.type === "textarea"
          ? appendLineValue(currentValue, option)
          : appendCommaValue(currentValue, option);
      currentEntries[index] = nextValue;
      return { ...prev, [field.name]: currentEntries };
    });
    setFieldErrors((prev) => {
      const nextErrors = Array.isArray(prev[field.name]) ? [...prev[field.name]] : [];
      nextErrors[index] = "";
      return { ...prev, [field.name]: nextErrors };
    });
  };

  const appendQuickOptionToRepeatableSection = (repeatableKey, field, index, option) => {
    setFieldValues((prev) => {
      const currentEntries = Array.isArray(prev[repeatableKey]) ? [...prev[repeatableKey]] : [];
      const entry = { ...(currentEntries[index] || {}) };
      const nextValue =
        field.type === "textarea"
          ? appendLineValue(entry[field.name], option)
          : appendCommaValue(entry[field.name], option);
      entry[field.name] = nextValue;
      currentEntries[index] = entry;
      return { ...prev, [repeatableKey]: currentEntries };
    });
    setFieldErrors((prev) => {
      const nextErrors = Array.isArray(prev[repeatableKey]) ? [...prev[repeatableKey]] : [];
      const entryErrors = { ...(nextErrors[index] || {}) };
      entryErrors[field.name] = "";
      nextErrors[index] = entryErrors;
      return { ...prev, [repeatableKey]: nextErrors };
    });
  };

  const handleRepeatableFieldChange = (field, index, value) => {
    setFieldValues((prev) => {
      const currentEntries = Array.isArray(prev[field.name]) ? [...prev[field.name]] : [];
      currentEntries[index] = value;
      return { ...prev, [field.name]: currentEntries };
    });
    const error = validateField(field, value);
    setFieldErrors((prev) => {
      const nextErrors = Array.isArray(prev[field.name]) ? [...prev[field.name]] : [];
      nextErrors[index] = error;
      return { ...prev, [field.name]: nextErrors };
    });
  };

  const addRepeatableFieldEntry = (field) => {
    setFieldValues((prev) => {
      const currentEntries = Array.isArray(prev[field.name]) ? [...prev[field.name]] : [];
      currentEntries.push(getDefaultFieldValue(field));
      return { ...prev, [field.name]: currentEntries };
    });
    setFieldErrors((prev) => {
      const nextErrors = Array.isArray(prev[field.name]) ? [...prev[field.name]] : [];
      nextErrors.push("");
      return { ...prev, [field.name]: nextErrors };
    });
  };

  const removeRepeatableFieldEntry = (field, index) => {
    setFieldValues((prev) => {
      const currentEntries = Array.isArray(prev[field.name]) ? [...prev[field.name]] : [];
      currentEntries.splice(index, 1);
      return { ...prev, [field.name]: currentEntries };
    });
    setFieldErrors((prev) => {
      const nextErrors = Array.isArray(prev[field.name]) ? [...prev[field.name]] : [];
      nextErrors.splice(index, 1);
      return { ...prev, [field.name]: nextErrors };
    });
  };

  const handleRepeatableSectionFieldChange = (repeatableKey, field, index, value) => {
    setFieldValues((prev) => {
      const currentEntries = Array.isArray(prev[repeatableKey]) ? [...prev[repeatableKey]] : [];
      const entry = { ...(currentEntries[index] || {}) };
      entry[field.name] = value;
      currentEntries[index] = entry;
      return { ...prev, [repeatableKey]: currentEntries };
    });
    const error = validateField(field, value);
    setFieldErrors((prev) => {
      const nextErrors = Array.isArray(prev[repeatableKey]) ? [...prev[repeatableKey]] : [];
      const entryErrors = { ...(nextErrors[index] || {}) };
      entryErrors[field.name] = error;
      nextErrors[index] = entryErrors;
      return { ...prev, [repeatableKey]: nextErrors };
    });
  };

  const handleRepeatableSectionBlockChange = (section, index, nextBlockId) => {
    if (!section?.repeatableKey) {
      return;
    }
    const selectorName = section.blockSelectorName || "blockId";
    const blockOptions = Array.isArray(section.blockOptionDefs) ? section.blockOptionDefs : [];
    const selectedBlock = blockOptions.find((option) => option.id === nextBlockId);
    const optionPrefixes = blockOptions.map((option) => `${option.prefix || option.id}.`);
    setFieldValues((prev) => {
      const currentEntries = Array.isArray(prev[section.repeatableKey])
        ? [...prev[section.repeatableKey]]
        : [];
      const entry = { ...(currentEntries[index] || {}) };
      Object.keys(entry).forEach((key) => {
        if (optionPrefixes.some((prefix) => key.startsWith(prefix))) {
          delete entry[key];
        }
      });
      entry[selectorName] = nextBlockId;
      (selectedBlock?.fields || []).forEach((field) => {
        if (!(field.name in entry)) {
          entry[field.name] = getDefaultFieldValue(field);
        }
      });
      currentEntries[index] = entry;
      return { ...prev, [section.repeatableKey]: currentEntries };
    });
    setFieldErrors((prev) => {
      const nextErrors = Array.isArray(prev[section.repeatableKey])
        ? [...prev[section.repeatableKey]]
        : [];
      const entryErrors = { ...(nextErrors[index] || {}) };
      Object.keys(entryErrors).forEach((key) => {
        if (optionPrefixes.some((prefix) => key.startsWith(prefix))) {
          delete entryErrors[key];
        }
      });
      entryErrors[selectorName] = "";
      nextErrors[index] = entryErrors;
      return { ...prev, [section.repeatableKey]: nextErrors };
    });
  };

  const addRepeatableSectionEntry = (section) => {
    if (!section?.repeatableKey) {
      return;
    }
    setFieldValues((prev) => {
      const currentEntries = Array.isArray(prev[section.repeatableKey])
        ? [...prev[section.repeatableKey]]
        : [];
      currentEntries.push(buildRepeatableEntryForSection(section));
      return { ...prev, [section.repeatableKey]: currentEntries };
    });
    setFieldErrors((prev) => {
      const nextErrors = Array.isArray(prev[section.repeatableKey])
        ? [...prev[section.repeatableKey]]
        : [];
      nextErrors.push({});
      return { ...prev, [section.repeatableKey]: nextErrors };
    });
  };

  const removeRepeatableSectionEntry = (section, index) => {
    if (!section?.repeatableKey) {
      return;
    }
    setFieldValues((prev) => {
      const currentEntries = Array.isArray(prev[section.repeatableKey])
        ? [...prev[section.repeatableKey]]
        : [];
      currentEntries.splice(index, 1);
      return { ...prev, [section.repeatableKey]: currentEntries };
    });
    setFieldErrors((prev) => {
      const nextErrors = Array.isArray(prev[section.repeatableKey])
        ? [...prev[section.repeatableKey]]
        : [];
      nextErrors.splice(index, 1);
      return { ...prev, [section.repeatableKey]: nextErrors };
    });
  };
  const formatNestedPresetValue = (medLabel, option) => {
    if (!medLabel) {
      return option;
    }
    const lowerMed = medLabel.toLowerCase();
    const lowerOption = option.toLowerCase();
    if (lowerOption.startsWith(lowerMed)) {
      return option;
    }
    return `${medLabel} ${option}`.trim();
  };
  const presetSearchRef = useRef(null);
  const filteredPresets = useMemo(() => {
    if (!presetDialogField?.presets?.length) {
      return [];
    }
    const query = presetQuery.trim().toLowerCase();
    if (!query) {
      return presetDialogField.presets;
    }
    return presetDialogField.presets.filter((preset) => {
      const label = (preset.label || preset.value || "").toLowerCase();
      return label.includes(query);
    });
  }, [presetDialogField, presetQuery]);
  const hasNestedPresets = useMemo(
    () => presetDialogField?.presets?.some((preset) => Array.isArray(preset.options)) ?? false,
    [presetDialogField]
  );
  const selectedPresetOptions = useMemo(() => {
    if (!presetDialogSelected?.options) {
      return [];
    }
    return presetDialogSelected.options;
  }, [presetDialogSelected]);

  const validateAllFields = () => {
    if (!selectedTemplate) {
      return false;
    }
    setValidationAttempted(true);
    const nextErrors = {};
    let isValid = true;
    const validateFields = (fields, values) => {
      fields.forEach((field) => {
        if (!field) {
          return;
        }
        if (field.type === "section") {
          if (field.repeatable && field.repeatableKey) {
            const entries = Array.isArray(values[field.repeatableKey])
              ? values[field.repeatableKey]
              : [];
            const entryErrors = entries.map((entry) => {
              const errors = {};
              const baseFields = field.repeatableFields || [];
              let blockFields = [];
              if (Array.isArray(field.blockOptionDefs) && field.blockOptionDefs.length > 0) {
                const selectorName = field.blockSelectorName || "blockId";
                const selectedBlock = field.blockOptionDefs.find(
                  (option) => option.id === entry?.[selectorName]
                );
                if (!selectedBlock) {
                  errors[selectorName] = "Select an exam type.";
                  isValid = false;
                } else {
                  blockFields = selectedBlock.fields || [];
                }
              }
              [...baseFields, ...blockFields].forEach((entryField) => {
                const error = validateField(entryField, entry?.[entryField.name]);
                if (error) {
                  isValid = false;
                }
                errors[entryField.name] = error;
              });
              return errors;
            });
            nextErrors[field.repeatableKey] = entryErrors;
            return;
          }
          validateFields(field.fields || [], values);
          return;
        }
        if (field.repeatable) {
          const entries = Array.isArray(values[field.name]) ? values[field.name] : [];
          const entryErrors = entries.map((entryValue) => {
            const error = validateField(field, entryValue);
            if (error) {
              isValid = false;
            }
            return error;
          });
          if (field.required && entries.length === 0) {
            isValid = false;
          }
          nextErrors[field.name] = entryErrors;
          return;
        }
        const error = validateField(field, values[field.name]);
        if (error) {
          isValid = false;
        }
        nextErrors[field.name] = error;
      });
    };
    validateFields(selectedTemplate.fields || [], fieldValues);
    setFieldErrors(nextErrors);
    return isValid;
  };

  const handleCopy = async () => {
    if (!selectedTemplate) {
      return;
    }
    if (!validateAllFields()) {
      const message = "Please complete required fields before copying.";
      setCopyStatus(message);
      setToastMessage(message);
      setToastSeverity("error");
      setToastOpen(true);
      return;
    }
    const hasFormattedPreview =
      templateMode === "letters" && previewTab === "patient" && previewMarkdownRef.current;
    const htmlContent = hasFormattedPreview
      ? `<div>${previewMarkdownRef.current.innerHTML}</div>`
      : "";
    try {
      if (hasFormattedPreview && window.ClipboardItem) {
        const plainBlob = new Blob([previewText], { type: "text/plain" });
        const htmlBlob = new Blob([htmlContent], { type: "text/html" });
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/plain": plainBlob,
            "text/html": htmlBlob,
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(previewText);
      }
      setCopyStatus("Copied to clipboard.");
      setToastMessage("Copied to clipboard.");
      setToastSeverity("success");
      setToastOpen(true);
    } catch (error) {
      const fallbackSuccess = fallbackCopy(previewText);
      if (fallbackSuccess) {
        setCopyStatus("Copied to clipboard.");
        setToastMessage("Copied to clipboard.");
        setToastSeverity("success");
        setToastOpen(true);
      } else {
        const message = "Copy failed — select the letter and copy manually.";
        setCopyStatus(message);
        setToastMessage(message);
        setToastSeverity("error");
        setToastOpen(true);
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
    const mode = selectedTemplateModeRef.current || templateMode;
    const key = getTemplateStorageKey(mode, selectedTemplate.id);
    if (key) {
      localStorage.removeItem(key);
    }
  };

  useEffect(() => {
    if (!selectedTemplate?.id) {
      return;
    }
    const mode = selectedTemplateModeRef.current || templateMode;
    const key = getTemplateStorageKey(mode, selectedTemplate.id);
    if (!key) {
      return;
    }
    try {
      localStorage.setItem(key, JSON.stringify(fieldValues));
    } catch (error) {
      // Ignore storage errors (quota, disabled, etc.).
    }
  }, [fieldValues, selectedTemplate?.id, templateMode]);

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
    if (!fieldBlocksReady) {
      return;
    }
    if (selectedTemplate?.id === routeId && templateMode === routeMode) {
      return;
    }
    loadTemplate(routeId, presetGroups, undefined, routeMode, true);
  }, [
    routeMode,
    routeId,
    navigate,
    presetGroups,
    fieldBlocks,
    fieldBlocksReady,
    selectedTemplate,
    templateMode,
  ]);

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
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Review status
            </Typography>
            <ToggleButtonGroup
              value={reviewFilter}
              exclusive
              onChange={(event, value) => {
                if (value) {
                  setReviewFilter(value);
                }
              }}
              size="small"
              color="primary"
            >
              <ToggleButton value="alpha">Alpha</ToggleButton>
              <ToggleButton value="beta">Beta</ToggleButton>
              <ToggleButton value="reviewed">Reviewed</ToggleButton>
            </ToggleButtonGroup>
          </Box>
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
                      <Box sx={{ display: "flex", alignItems: "center", width: "100%", gap: 1 }}>
                        <ListItemText
                          primary={template.title}
                          secondary={[template.category, ...template.keywords?.slice(0, 3)]
                            .filter(Boolean)
                            .join(" • ")}
                        />
                        <Chip
                          size="small"
                          label={
                            REVIEW_BADGES[template.reviewStatus]?.label ||
                            REVIEW_BADGES.alpha.label
                          }
                          sx={{
                            bgcolor:
                              REVIEW_BADGES[template.reviewStatus]?.color ||
                              REVIEW_BADGES.alpha.color,
                            color: "common.white",
                            height: 20,
                            fontWeight: 600,
                          }}
                        />
                      </Box>
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
  const renderPreviewContent = () => (
    <>
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
          bgcolor:
            theme.palette.mode === "dark"
              ? "rgba(20, 31, 53, 0.9)"
              : "rgba(241, 245, 255, 0.9)",
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
            ref={previewMarkdownRef}
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
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, minHeight: 22 }}>
        {copyStatus}
      </Typography>
    </>
  );
  const renderQuickOptions = (field, onSelect) => {
    if (!field.quickOptions?.length || (field.type !== "text" && field.type !== "textarea")) {
      return null;
    }
    return (
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        {field.quickOptions.map((option) => (
          <Chip
            key={option}
            label={option}
            size="small"
            variant="outlined"
            onClick={() => onSelect(option)}
          />
        ))}
      </Stack>
    );
  };

  const renderSelectInput = ({ field, value, onChange, showError, errorMessage, fullWidth }) => {
    const isMultiSelect = field.multiple === true;
    const options = Array.isArray(field.options) ? field.options : [];
    const optionValue = (option) =>
      option && typeof option === "object" ? option.value ?? option.id ?? option.label : option;
    const optionLabel = (option) =>
      option && typeof option === "object" ? option.label ?? option.value ?? option.id : option;
    const valueToLabel = options.reduce((acc, option) => {
      const key = optionValue(option);
      if (key !== undefined) {
        acc[key] = optionLabel(option);
      }
      return acc;
    }, {});
    const selectValue = isMultiSelect
      ? Array.isArray(value)
        ? value
        : value
        ? [value]
        : []
      : value ?? "";
    return (
      <TextField
        select
        label={field.label}
        value={selectValue}
        onChange={(event) => {
          const nextValue = event.target.value;
          if (isMultiSelect && typeof nextValue === "string") {
            onChange(nextValue.split(","));
          } else {
            onChange(nextValue);
          }
        }}
        required={field.required}
        error={showError}
        helperText={showError ? errorMessage : field.helpText}
        fullWidth={fullWidth}
        SelectProps={{
          multiple: isMultiSelect,
          displayEmpty: isMultiSelect,
          renderValue: isMultiSelect
            ? (selected) =>
                Array.isArray(selected) && selected.length > 0
                  ? selected.map((item) => valueToLabel[item] || item).join(", ")
                  : "Select options"
            : undefined,
        }}
      >
        {!isMultiSelect && <MenuItem value="">Select an option</MenuItem>}
        {options.map((option) => {
          const key = optionValue(option);
          const label = optionLabel(option);
          if (key === undefined) {
            return null;
          }
          return (
            <MenuItem key={key} value={key}>
              {isMultiSelect && <Checkbox checked={selectValue.includes(key)} />}
              <ListItemText primary={label} />
            </MenuItem>
          );
        })}
      </TextField>
    );
  };

  const getFieldWrapperStyle = (field, layout, columns) => {
    const span =
      field.width === "xs"
        ? { xs: "1 / -1", md: "span 3" }
        : field.width === "sm"
        ? { xs: "1 / -1", md: "span 4" }
        : field.width === "md"
        ? { xs: "1 / -1", md: "span 6" }
        : { xs: "1 / -1", md: "span 12" };
    const isInline = layout === "inline";
    const useColumns = !isInline && columns && columns >= 2;
    const inlineStyle = isInline
      ? field.type === "textarea"
        ? { flexBasis: "100%" }
        : {
            flex: "1 1 160px",
            minWidth: 140,
            maxWidth:
              field.width === "xs"
                ? 140
                : field.width === "sm"
                ? 180
                : field.width === "md"
                ? 220
                : 320,
          }
      : undefined;
    return isInline ? inlineStyle : useColumns ? { gridColumn: "auto" } : { gridColumn: span };
  };

  const renderRepeatableField = (field, wrapperStyle) => {
    const entries = Array.isArray(fieldValues[field.name]) ? fieldValues[field.name] : [];
    const entryErrors = Array.isArray(fieldErrors[field.name]) ? fieldErrors[field.name] : [];
    const isMultiline = field.type === "textarea";
    const presetLabel = field.presetLabel || "Presets";
    const emptyState = field.repeatableEmptyState || "No entries yet.";
    return (
      <Box key={field.name} sx={wrapperStyle}>
        <Stack spacing={2}>
          {entries.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              {emptyState}
            </Typography>
          )}
          {entries.map((entryValue, index) => {
            const errorMessage = entryErrors[index] || "";
            const showError =
              Boolean(errorMessage) &&
              (validationAttempted ||
                (Array.isArray(entryValue) ? entryValue.length > 0 : entryValue !== ""));
            return (
              <Stack key={`${field.name}-${index}`} spacing={1}>
                {field.type === "checkbox" ? (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={Boolean(entryValue)}
                        onChange={(event) =>
                          handleRepeatableFieldChange(field, index, event.target.checked)
                        }
                      />
                    }
                    label={`${field.label} ${index + 1}`}
                  />
                ) : field.type === "select" ? (
                  renderSelectInput({
                    field: { ...field, label: `${field.label} ${index + 1}` },
                    value: entryValue,
                    onChange: (nextValue) => handleRepeatableFieldChange(field, index, nextValue),
                    showError,
                    errorMessage,
                    fullWidth: true,
                  })
                ) : (
                  <TextField
                    label={`${field.label} ${index + 1}`}
                    value={entryValue}
                    onChange={(event) =>
                      handleRepeatableFieldChange(field, index, event.target.value)
                    }
                    required={field.required}
                    error={showError}
                    helperText={showError ? errorMessage : field.helpText}
                    type={field.type === "textarea" ? "text" : field.type}
                    multiline={isMultiline}
                    minRows={isMultiline ? 4 : undefined}
                    fullWidth
                  />
                )}
                {renderQuickOptions(field, (option) =>
                  appendQuickOptionToRepeatableField(field, index, option)
                )}
                {field.presets?.length > 0 && (
                  <Button
                    variant="contained"
                    color="secondary"
                    size="small"
                    onClick={() => {
                      setPresetDialogField(field);
                      setPresetDialogTarget({ kind: "field", fieldName: field.name, index });
                    }}
                    sx={{ alignSelf: "flex-start" }}
                    startIcon={<LibraryAddIcon />}
                  >
                    {`Insert ${presetLabel.toLowerCase()}`}
                  </Button>
                )}
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => removeRepeatableFieldEntry(field, index)}
                  sx={{ alignSelf: "flex-start" }}
                >
                  Remove
                </Button>
              </Stack>
            );
          })}
          <Button
            variant="outlined"
            size="small"
            onClick={() => addRepeatableFieldEntry(field)}
            sx={{ alignSelf: "flex-start" }}
          >
            Add another
          </Button>
        </Stack>
      </Box>
    );
  };

  const renderField = (field, layout, columns) => {
    const value = fieldValues[field.name];
    const errorMessage = fieldErrors[field.name] || "";
    const showError =
      Boolean(errorMessage) &&
      (validationAttempted || (Array.isArray(value) ? value.length > 0 : value !== ""));
    const wrapperStyle = getFieldWrapperStyle(field, layout, columns);

    if (field.repeatable) {
      return renderRepeatableField(field, wrapperStyle);
    }

    if (field.type === "checkbox") {
      return (
        <Box key={field.name} sx={wrapperStyle}>
          <FormControlLabel
            control={
              <Checkbox
                checked={Boolean(value)}
                onChange={(event) => handleFieldChange(field, event.target.checked)}
              />
            }
            label={field.label}
          />
        </Box>
      );
    }

    if (field.type === "select") {
      return (
        <Box key={field.name} sx={wrapperStyle}>
          {renderSelectInput({
            field,
            value,
            onChange: (nextValue) => handleFieldChange(field, nextValue),
            showError,
            errorMessage,
            fullWidth: true,
          })}
        </Box>
      );
    }

    const isMultiline = field.type === "textarea";
    const presetLabel = field.presetLabel || "Presets";
    return (
      <Box key={field.name} sx={wrapperStyle}>
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
          {renderQuickOptions(field, (option) => appendQuickOption(field, option))}
          {field.presets?.length > 0 && (
            <Button
              variant="contained"
              color="secondary"
              size="small"
              onClick={() => {
                setPresetDialogField(field);
                setPresetDialogTarget(null);
              }}
              sx={{ alignSelf: "flex-start" }}
              startIcon={<LibraryAddIcon />}
            >
              {`Insert ${presetLabel.toLowerCase()}`}
            </Button>
          )}
        </Stack>
      </Box>
    );
  };

  const renderSectionFields = (fields, section) => {
    const layout = section.layout || "grid";
    const columns = Number.isFinite(section.columns) ? section.columns : null;
    const isInline = layout === "inline";
    const useColumns = !isInline && columns && columns >= 2;
    if (section.repeatable && section.repeatableKey) {
      const sectionFields = section.repeatableFields || fields;
      const entries = Array.isArray(fieldValues[section.repeatableKey])
        ? fieldValues[section.repeatableKey]
        : [];
      const entryErrors = Array.isArray(fieldErrors[section.repeatableKey])
        ? fieldErrors[section.repeatableKey]
        : [];
      const emptyState = section.repeatableEmptyState || "No entries yet.";
      const blockOptions = Array.isArray(section.blockOptionDefs) ? section.blockOptionDefs : [];
      const selectorName = section.blockSelectorName || "blockId";
      const selectorLabel = section.blockSelectorLabel || "Exam type";
      const selectorField = {
        name: selectorName,
        label: selectorLabel,
        type: "select",
        options: blockOptions.map((option) => ({
          value: option.id,
          label: option.label || option.id,
        })),
        required: blockOptions.length > 0,
      };
      return (
        <>
          {section.label && (
            <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600 }}>
              {section.label}
            </Typography>
          )}
          <Stack spacing={2}>
            {entries.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                {emptyState}
              </Typography>
            )}
            {entries.map((entry, index) => (
              <Paper key={`${section.repeatableKey}-${index}`} variant="outlined" sx={{ p: 2 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography variant="subtitle2">{`${section.label} ${index + 1}`}</Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => removeRepeatableSectionEntry(section, index)}
                  >
                    Remove
                  </Button>
                </Stack>
                {blockOptions.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    {renderSelectInput({
                      field: selectorField,
                      value: entry?.[selectorName] ?? "",
                      onChange: (nextValue) =>
                        handleRepeatableSectionBlockChange(section, index, nextValue),
                      showError: Boolean(entryErrors[index]?.[selectorName]) && validationAttempted,
                      errorMessage: entryErrors[index]?.[selectorName],
                      fullWidth: true,
                    })}
                  </Box>
                )}
                <Box
                  sx={{
                    display: isInline ? "flex" : "grid",
                    flexWrap: isInline ? "wrap" : "initial",
                    gap: 2,
                    gridTemplateColumns: useColumns
                      ? { xs: "1fr", md: `repeat(${columns}, minmax(0, 1fr))` }
                      : {
                          xs: "1fr",
                          md: "repeat(12, minmax(0, 1fr))",
                        },
                  }}
                >
                  {(blockOptions.length > 0
                    ? [
                        ...sectionFields,
                        ...(
                          blockOptions.find((option) => option.id === entry?.[selectorName])
                            ?.fields || []
                        ),
                      ]
                    : sectionFields
                  ).map((field) => {
                    const wrapperStyle = getFieldWrapperStyle(field, layout, columns);
                    const entryValue = entry?.[field.name];
                    const fieldError = entryErrors[index]?.[field.name] || "";
                    const showError =
                      Boolean(fieldError) &&
                      (validationAttempted ||
                        (Array.isArray(entryValue) ? entryValue.length > 0 : entryValue !== ""));
                    if (field.type === "checkbox") {
                      return (
                        <Box key={`${field.name}-${index}`} sx={wrapperStyle}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={Boolean(entryValue)}
                                onChange={(event) =>
                                  handleRepeatableSectionFieldChange(
                                    section.repeatableKey,
                                    field,
                                    index,
                                    event.target.checked
                                  )
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
                        <Box key={`${field.name}-${index}`} sx={wrapperStyle}>
                          {renderSelectInput({
                            field,
                            value: entryValue,
                            onChange: (nextValue) =>
                              handleRepeatableSectionFieldChange(
                                section.repeatableKey,
                                field,
                                index,
                                nextValue
                              ),
                            showError,
                            errorMessage: fieldError,
                            fullWidth: true,
                          })}
                        </Box>
                      );
                    }
                    const isMultiline = field.type === "textarea";
                    const presetLabel = field.presetLabel || "Presets";
                    return (
                      <Box key={`${field.name}-${index}`} sx={wrapperStyle}>
                        <Stack spacing={1}>
                          <TextField
                            label={field.label}
                            value={entryValue ?? ""}
                            onChange={(event) =>
                              handleRepeatableSectionFieldChange(
                                section.repeatableKey,
                                field,
                                index,
                                event.target.value
                              )
                            }
                            required={field.required}
                            error={showError}
                            helperText={showError ? fieldError : field.helpText}
                            type={field.type === "textarea" ? "text" : field.type}
                            multiline={isMultiline}
                            minRows={isMultiline ? 4 : undefined}
                            fullWidth
                          />
                          {renderQuickOptions(field, (option) =>
                            appendQuickOptionToRepeatableSection(
                              section.repeatableKey,
                              field,
                              index,
                              option
                            )
                          )}
                          {field.presets?.length > 0 && (
                            <Button
                              variant="contained"
                              color="secondary"
                              size="small"
                              onClick={() => {
                                setPresetDialogField(field);
                                setPresetDialogTarget({
                                  kind: "section",
                                  repeatableKey: section.repeatableKey,
                                  fieldName: field.name,
                                  index,
                                });
                              }}
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
            ))}
            <Button
              variant="outlined"
              size="small"
              onClick={() => addRepeatableSectionEntry(section)}
              sx={{ alignSelf: "flex-start" }}
            >
              Add another
            </Button>
          </Stack>
        </>
      );
    }
    return (
      <>
        {section.label && (
          <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600 }}>
            {section.label}
          </Typography>
        )}
        <Box
          sx={{
            display: isInline ? "flex" : "grid",
            flexWrap: isInline ? "wrap" : "initial",
            gap: 2,
            gridTemplateColumns: useColumns
              ? { xs: "1fr", md: `repeat(${columns}, minmax(0, 1fr))` }
              : {
                  xs: "1fr",
                  md: "repeat(12, minmax(0, 1fr))",
                },
          }}
        >
          {fields.map((field) => renderField(field, layout, columns))}
        </Box>
      </>
    );
  };

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
          <ButtonGroup variant="outlined" size="small" sx={{ mr: 1 }}>
            <Button
              onClick={() => setPreviewMode("side")}
              variant={previewMode === "side" ? "contained" : "outlined"}
            >
              Side
            </Button>
            <Button
              onClick={() => setPreviewMode("hidden")}
              variant={previewMode === "hidden" ? "contained" : "outlined"}
            >
              Hidden
            </Button>
            <Button
              onClick={() => {
                setPreviewMode("dialog");
                setPreviewDialogOpen(true);
              }}
              variant={previewMode === "dialog" ? "contained" : "outlined"}
            >
              Dialog
            </Button>
          </ButtonGroup>
          {previewMode === "dialog" && (
            <Button variant="outlined" onClick={() => setPreviewDialogOpen(true)}>
              Open preview
            </Button>
          )}
          <Tooltip
            title={
              themePreference === "system"
                ? "System theme (toggle to override)"
                : "Toggle dark mode"
            }
          >
            <IconButton color="inherit" onClick={onToggleColorMode} aria-label="Toggle dark mode">
              {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>
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

        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns:
              previewMode === "side" ? { xs: "1fr", md: "1fr 1fr" } : "1fr",
          }}
        >
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
                {selectedTemplate.fields.some((field) => field.type === "section") ? (
                  <>
                    {(() => {
                      const blocks = [];
                      let currentFields = [];
                      selectedTemplate.fields.forEach((field) => {
                        if (field.type === "section") {
                          if (currentFields.length > 0) {
                            blocks.push({
                              key: `group-${blocks.length}`,
                              section: { label: "" },
                              fields: currentFields,
                            });
                            currentFields = [];
                          }
                          blocks.push({
                            key: field.label || `section-${blocks.length}`,
                            section: field,
                            fields: field.repeatableFields || flattenFields(field.fields || []),
                          });
                          return;
                        }
                        currentFields.push(field);
                      });
                      if (currentFields.length > 0) {
                        blocks.push({
                          key: `group-${blocks.length}`,
                          section: { label: "" },
                          fields: currentFields,
                        });
                      }
                      return blocks.map((block) => (
                        <Paper
                          key={block.key}
                          variant="outlined"
                          sx={{ p: 2, borderRadius: 2, borderColor: "divider" }}
                        >
                          {renderSectionFields(block.fields, block.section)}
                        </Paper>
                      ));
                    })()}
                  </>
                ) : selectedTemplate.fields.some((field) => field.section) ? (
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
                      {renderSectionFields(fields, { label: section })}
                    </Paper>
                  ))
                ) : (
                  selectedTemplate.fields.map((field) => {
                    const value = fieldValues[field.name];
                    const errorMessage = fieldErrors[field.name] || "";
                    const showError =
                      Boolean(errorMessage) &&
                      (validationAttempted ||
                        (Array.isArray(value) ? value.length > 0 : value !== ""));

                    if (field.repeatable) {
                      return renderRepeatableField(field, {});
                    }

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
                        <Box key={field.name}>
                          {renderSelectInput({
                            field,
                            value,
                            onChange: (nextValue) => handleFieldChange(field, nextValue),
                            showError,
                            errorMessage,
                            fullWidth: true,
                          })}
                        </Box>
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
                        {renderQuickOptions(field, (option) => appendQuickOption(field, option))}
                        {field.presets?.length > 0 && (
                          <Button
                            variant="contained"
                            color="secondary"
                            size="small"
                            onClick={() => {
                              setPresetDialogField(field);
                              setPresetDialogTarget(null);
                            }}
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

          {previewMode === "side" && (
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
              {renderPreviewContent()}
            </Paper>
          )}
        </Box>
      </Box>

      <Dialog
        open={Boolean(presetDialogField)}
        onClose={() => {
          setPresetDialogField(null);
          setPresetDialogTarget(null);
          setPresetDialogValue("");
          setPresetQuery("");
          setPresetDialogSelected(null);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.stopPropagation();
            const topPreset = filteredPresets[0];
            if (!presetDialogField) {
              return;
            }
              if (hasNestedPresets) {
                if (!presetDialogSelected && topPreset) {
                  setPresetDialogSelected(topPreset);
                  return;
                }
                const topOption = selectedPresetOptions[0];
                if (topOption) {
                const medLabel = presetDialogSelected?.label || presetDialogSelected?.value || "";
                appendPresetValue(
                  presetDialogField,
                  formatNestedPresetValue(medLabel, topOption),
                  presetDialogTarget
                );
                setPresetDialogValue(topOption);
                presetSearchRef.current?.focus();
              }
              return;
            }
            if (topPreset) {
              const value = topPreset.value || topPreset.label;
              appendPresetValue(presetDialogField, value, presetDialogTarget);
              setPresetDialogValue(value);
              presetSearchRef.current?.focus();
            }
          }
        }}
        fullWidth
        maxWidth={isAntibioticDialog ? "lg" : "sm"}
      >
        <DialogTitle>{presetDialogField?.presetTitle || "Preset options"}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {presetDialogField?.presetDescription || "Select an option to insert into the field."}
          </Typography>
          <TextField
            inputRef={presetSearchRef}
            label="Search presets"
            value={presetQuery}
            onChange={(event) => setPresetQuery(event.target.value)}
            size="small"
            fullWidth
            sx={{ mb: 2 }}
          />
          {hasNestedPresets ? (
            <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" },
              }}
            >
              <Box
                sx={{
                  display: "grid",
                  gap: 1.5,
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                }}
              >
                {filteredPresets.map((preset) => (
                  <Button
                    key={preset.label || preset.value}
                    variant={
                      presetDialogSelected?.value === preset.value ||
                      presetDialogSelected?.label === preset.label
                        ? "contained"
                        : "outlined"
                    }
                    onClick={() => {
                      setPresetDialogSelected(preset);
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
              <Box
                sx={{
                  borderLeft: { md: "1px solid" },
                  borderColor: { md: "divider" },
                  pl: { md: 2 },
                  minHeight: 140,
                }}
              >
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {presetDialogSelected?.label || presetDialogSelected?.value || "Choose a medication"}
                </Typography>
                <Stack spacing={1}>
                  {selectedPresetOptions.map((option) => (
                    <Button
                      key={option}
                      variant="outlined"
                      onClick={() => {
                        if (!presetDialogField || !presetDialogSelected) {
                          return;
                        }
                        const medLabel = presetDialogSelected.label || presetDialogSelected.value || "";
                        appendPresetValue(presetDialogField, formatNestedPresetValue(medLabel, option));
                        setPresetDialogValue(option);
                        presetSearchRef.current?.focus();
                      }}
                      sx={{ justifyContent: "flex-start" }}
                    >
                      {option}
                    </Button>
                  ))}
                  {selectedPresetOptions.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      Select a medication to see options.
                    </Typography>
                  )}
                </Stack>
              </Box>
            </Box>
          ) : (
            <Box
              sx={{
                display: "grid",
                gap: 1.5,
                gridTemplateColumns: isAntibioticDialog
                  ? { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" }
                  : "1fr",
              }}
            >
              {filteredPresets.map((preset) => (
                <Button
                  key={preset.label || preset.value}
                  variant={
                    presetDialogValue === (preset.value || preset.label) ? "contained" : "outlined"
                  }
                  onClick={() => {
                    const value = preset.value || preset.label;
                    appendPresetValue(presetDialogField, value, presetDialogTarget);
                    setPresetDialogValue(value);
                    presetSearchRef.current?.focus();
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
          )}
          {filteredPresets.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              No matches.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              if (presetDialogField) {
                if (presetDialogTarget?.kind === "field") {
                  handleRepeatableFieldChange(
                    presetDialogField,
                    presetDialogTarget.index,
                    ""
                  );
                } else if (presetDialogTarget?.kind === "section") {
                  handleRepeatableSectionFieldChange(
                    presetDialogTarget.repeatableKey,
                    presetDialogField,
                    presetDialogTarget.index,
                    ""
                  );
                } else {
                  handleFieldChange(presetDialogField, "");
                }
              }
            }}
          >
            Clear
          </Button>
          <Button
            onClick={() => {
              setPresetDialogField(null);
              setPresetDialogTarget(null);
              setPresetDialogValue("");
              setPresetQuery("");
              setPresetDialogSelected(null);
            }}
          >
            Done
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toastOpen}
        autoHideDuration={3200}
        onClose={() => setToastOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          variant="filled"
          severity={toastSeverity}
          onClose={() => setToastOpen(false)}
          sx={{
            width: "100%",
            fontSize: "0.95rem",
            fontWeight: 600,
            letterSpacing: 0.2,
            boxShadow: 6,
            alignItems: "center",
          }}
        >
          {toastMessage}
        </Alert>
      </Snackbar>

      <Dialog
        open={previewDialogOpen && previewMode === "dialog"}
        onClose={() => setPreviewDialogOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Letter preview</DialogTitle>
        <DialogContent dividers>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
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
          {renderPreviewContent()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialogOpen(false)}>Close</Button>
          <Button variant="contained" onClick={handleCopy} disabled={!selectedTemplate}>
            Copy to Clipboard
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const App = ({ onToggleColorMode, themePreference }) => (
  <Routes>
    <Route
      path="/"
      element={<AppContent onToggleColorMode={onToggleColorMode} themePreference={themePreference} />}
    />
    <Route
      path="/:mode"
      element={<AppContent onToggleColorMode={onToggleColorMode} themePreference={themePreference} />}
    />
    <Route
      path="/:mode/:id"
      element={<AppContent onToggleColorMode={onToggleColorMode} themePreference={themePreference} />}
    />
  </Routes>
);

export default App;
