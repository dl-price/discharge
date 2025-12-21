import { promises as fs } from "fs";
import path from "path";

const readJson = async (filePath) => {
  const text = await fs.readFile(filePath, "utf8");
  return JSON.parse(text);
};

const writeJson = async (filePath, data) => {
  const text = JSON.stringify(data, null, 2) + "\n";
  await fs.writeFile(filePath, text, "utf8");
};

const writeText = async (filePath, text) => {
  await fs.writeFile(filePath, text, "utf8");
};

const ensureDir = async (dirPath) => {
  await fs.mkdir(dirPath, { recursive: true });
};

const readText = async (filePath) => {
  return fs.readFile(filePath, "utf8");
};

const ALLOWED_FIELD_TYPES = new Set([
  "text",
  "textarea",
  "number",
  "date",
  "select",
  "checkbox",
  "section",
]);
const REVIEW_STATUSES = new Set(["alpha", "beta", "reviewed"]);

const validateTemplate = (template, bodies, context, report, options = {}) => {
  const errors = [];
  const warnings = [];
  if (!template?.id) {
    errors.push("Missing template id.");
  }
  if (!template?.title) {
    errors.push("Missing template title.");
  }
  if (!template?.category) {
    errors.push("Missing template category.");
  }
  if (!Array.isArray(template?.fields)) {
    errors.push("Missing fields array.");
  }
  if (!Array.isArray(template?.keywords) || template.keywords.length === 0) {
    warnings.push("Missing keywords.");
  }
  if (!REVIEW_STATUSES.has(template?.reviewStatus)) {
    warnings.push('Missing or invalid reviewStatus (alpha, beta, reviewed).');
  }
  if (options.requireDisclaimer === "patient" && bodies?.patientBody) {
    if (!bodies.patientBody.includes("{{disclaimer}}")) {
      warnings.push("Missing {{disclaimer}} placeholder in patient.md.");
    }
  }

  const names = new Set();
  const validateField = (field) => {
    if (!field) {
      errors.push("Field entry is empty.");
      return;
    }
    if (!ALLOWED_FIELD_TYPES.has(field.type)) {
      errors.push(`Invalid field type${field.name ? ` for ${field.name}` : ""}: ${field.type}`);
      return;
    }
    if (field.type === "section") {
      if (!Array.isArray(field.fields)) {
        warnings.push("Section field missing fields array.");
        return;
      }
      field.fields.forEach(validateField);
      return;
    }
    if (!field.name) {
      errors.push("Field missing name.");
      return;
    }
    if (names.has(field.name)) {
      errors.push(`Duplicate field name: ${field.name}`);
    }
    names.add(field.name);
    if (field.type === "select" && (!Array.isArray(field.options) || field.options.length === 0)) {
      errors.push(`Select field missing options: ${field.name}`);
    }
  };
  (template.fields || []).forEach(validateField);

  if (errors.length || warnings.length) {
    report.push({
      context,
      errors,
      warnings,
    });
  }
};

const normalizeReviewStatus = (template) => {
  const status = template?.reviewStatus;
  if (status === "alpha" || status === "beta" || status === "reviewed") {
    return { ...template, reviewStatus: status };
  }
  return { ...template, reviewStatus: "alpha" };
};

const copyTextFile = async (srcPath, destPath) => {
  const text = await readText(srcPath);
  await writeText(destPath, text);
};

const buildLetters = async (srcRoot, destRoot, report) => {
  const entries = await fs.readdir(srcRoot, { withFileTypes: true });
  const index = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const dir = path.join(srcRoot, entry.name);
    const templatePath = path.join(dir, "template.json");
    const patientPath = path.join(dir, "patient.md");
    const gpPath = path.join(dir, "gp.md");
    const [template, patientBody, gpBody] = await Promise.all([
      readJson(templatePath),
      readText(patientPath),
      readText(gpPath),
    ]);
    validateTemplate(
      template,
      { patientBody, gpBody },
      `letters/${entry.name}`,
      report,
      { requireDisclaimer: "patient" }
    );
    const normalized = normalizeReviewStatus(template);
    normalized.patientBody = patientBody.trimEnd();
    normalized.gpBody = gpBody.trimEnd();
    const destPath = path.join(destRoot, `${entry.name}.json`);
    await writeJson(destPath, normalized);
    index.push(normalized);
  }
  const indexPath = path.join(destRoot, "index.json");
  await writeJson(
    indexPath,
    index.map((template) => ({
      id: template.id,
      title: template.title,
      category: template.category,
      keywords: template.keywords,
      version: template.version,
      lastReviewed: template.lastReviewed,
      reviewStatus: template.reviewStatus,
    }))
  );
};

const buildProcedures = async (srcRoot, destRoot, report) => {
  const entries = await fs.readdir(srcRoot, { withFileTypes: true });
  const index = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const dir = path.join(srcRoot, entry.name);
    const templatePath = path.join(dir, "template.json");
    const bodyPath = path.join(dir, "body.md");
    const [template, body] = await Promise.all([
      readJson(templatePath),
      readText(bodyPath),
    ]);
    validateTemplate(template, { body }, `procedures/${entry.name}`, report);
    const normalized = normalizeReviewStatus(template);
    normalized.body = body.trimEnd();
    const destPath = path.join(destRoot, `${entry.name}.json`);
    await writeJson(destPath, normalized);
    index.push(normalized);
  }
  const indexPath = path.join(destRoot, "index.json");
  await writeJson(
    indexPath,
    index.map((template) => ({
      id: template.id,
      title: template.title,
      category: template.category,
      keywords: template.keywords,
      version: template.version,
      lastReviewed: template.lastReviewed,
      reviewStatus: template.reviewStatus,
    }))
  );
};

const buildNotes = async (srcRoot, destRoot, report) => {
  const entries = await fs.readdir(srcRoot, { withFileTypes: true });
  const index = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const dir = path.join(srcRoot, entry.name);
    const templatePath = path.join(dir, "template.json");
    const bodyPath = path.join(dir, "body.md");
    const [template, body] = await Promise.all([readJson(templatePath), readText(bodyPath)]);
    validateTemplate(template, { body }, `notes/${entry.name}`, report);
    const normalized = normalizeReviewStatus(template);
    normalized.body = body.trimEnd();
    const destPath = path.join(destRoot, `${entry.name}.json`);
    await writeJson(destPath, normalized);
    index.push(normalized);
  }
  const indexPath = path.join(destRoot, "index.json");
  await writeJson(
    indexPath,
    index.map((template) => ({
      id: template.id,
      title: template.title,
      category: template.category,
      keywords: template.keywords,
      version: template.version,
      lastReviewed: template.lastReviewed,
      reviewStatus: template.reviewStatus,
    }))
  );
};

const buildFieldBlocks = async (srcRoot, destRoot) => {
  const entries = await fs.readdir(srcRoot, { withFileTypes: true });
  const index = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const dir = path.join(srcRoot, entry.name);
    const templatePath = path.join(dir, "template.json");
    const bodyPath = path.join(dir, "body.md");
    const [template, body] = await Promise.all([readJson(templatePath), readText(bodyPath)]);
    template.body = body.trimEnd();
    const destPath = path.join(destRoot, `${entry.name}.json`);
    await writeJson(destPath, template);
    if (template.id) {
      index.push(template.id);
    }
  }
  const indexPath = path.join(destRoot, "index.json");
  await writeJson(indexPath, index);
};

const main = async () => {
  const srcLetters = path.join("templates-src", "letters");
  const srcProcedures = path.join("templates-src", "procedures");
  const srcNotes = path.join("templates-src", "notes");
  const srcFieldBlocks = path.join("templates-src", "field-blocks");
  const srcDisclaimer = path.join("templates-src", "disclaimer.md");
  const destLetters = path.join("public", "templates", "letters");
  const destProcedures = path.join("public", "templates", "procedures");
  const destNotes = path.join("public", "templates", "notes");
  const destFieldBlocks = path.join("public", "templates", "field-blocks");
  const destDisclaimer = path.join("public", "templates", "disclaimer.md");
  const strict = process.argv.includes("--strict");
  const report = [];

  await Promise.all([
    ensureDir(destLetters),
    ensureDir(destProcedures),
    ensureDir(destNotes),
    ensureDir(destFieldBlocks),
  ]);

  await buildLetters(srcLetters, destLetters, report);
  await buildProcedures(srcProcedures, destProcedures, report);
  await buildNotes(srcNotes, destNotes, report);
  await buildFieldBlocks(srcFieldBlocks, destFieldBlocks);
  await copyTextFile(srcDisclaimer, destDisclaimer);

  const warnings = report.filter((item) => item.warnings.length > 0);
  const errors = report.filter((item) => item.errors.length > 0);
  if (warnings.length > 0) {
    console.warn("Template validation warnings:");
    warnings.forEach((item) => {
      item.warnings.forEach((warning) => {
        console.warn(`- ${item.context}: ${warning}`);
      });
    });
  }
  if (errors.length > 0) {
    console.error("Template validation errors:");
    errors.forEach((item) => {
      item.errors.forEach((error) => {
        console.error(`- ${item.context}: ${error}`);
      });
    });
  }
  if (errors.length > 0 || (strict && warnings.length > 0)) {
    throw new Error("Template validation failed.");
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
