import { watch } from "fs";
import path from "path";
import { buildTemplates } from "./build-templates.js";

const WATCH_ROOT = path.join("templates-src");
const DEBOUNCE_MS = 150;

let debounceTimer = null;
let isRunning = false;
let queued = false;

const runBuild = async () => {
  if (isRunning) {
    queued = true;
    return;
  }
  isRunning = true;
  try {
    await buildTemplates();
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[templates] built at ${timestamp}`);
  } catch (error) {
    console.error("[templates] build failed");
    console.error(error);
  } finally {
    isRunning = false;
    if (queued) {
      queued = false;
      runBuild();
    }
  }
};

const scheduleBuild = () => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(runBuild, DEBOUNCE_MS);
};

runBuild();

watch(
  WATCH_ROOT,
  { recursive: true },
  (_eventType, filename) => {
    if (!filename) {
      return;
    }
    const normalized = filename.toString();
    if (normalized.startsWith(".")) {
      return;
    }
    scheduleBuild();
  }
);

console.log(`[templates] watching ${WATCH_ROOT}`);
