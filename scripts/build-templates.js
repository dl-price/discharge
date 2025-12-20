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

const ensureDir = async (dirPath) => {
  await fs.mkdir(dirPath, { recursive: true });
};

const readText = async (filePath) => {
  return fs.readFile(filePath, "utf8");
};

const buildLetters = async (srcRoot, destRoot) => {
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
    template.patientBody = patientBody.trimEnd();
    template.gpBody = gpBody.trimEnd();
    const destPath = path.join(destRoot, `${entry.name}.json`);
    await writeJson(destPath, template);
    index.push(template);
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
    }))
  );
};

const buildProcedures = async (srcRoot, destRoot) => {
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
    template.body = body.trimEnd();
    const destPath = path.join(destRoot, `${entry.name}.json`);
    await writeJson(destPath, template);
    index.push(template);
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
    }))
  );
};

const buildNotes = async (srcRoot, destRoot) => {
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
    index.push(template);
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
  const destLetters = path.join("public", "templates", "letters");
  const destProcedures = path.join("public", "templates", "procedures");
  const destNotes = path.join("public", "templates", "notes");
  const destFieldBlocks = path.join("public", "templates", "field-blocks");

  await Promise.all([
    ensureDir(destLetters),
    ensureDir(destProcedures),
    ensureDir(destNotes),
    ensureDir(destFieldBlocks),
  ]);

  await buildLetters(srcLetters, destLetters);
  await buildProcedures(srcProcedures, destProcedures);
  await buildNotes(srcNotes, destNotes);
  await buildFieldBlocks(srcFieldBlocks, destFieldBlocks);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
