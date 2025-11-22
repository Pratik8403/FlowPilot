const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const activeWin = require("active-win");
const fs = require("fs-extra");

// iohook removed (fallback logic handled)
let iohook = null;

let mainWindow;
let overlayWindow;

let tracking = false;
let keystrokes = 0;
let mouseMoves = 0;

// State control
let state = "IDLE"; // IDLE, TRACKING, FOCUS, WARN

// FOCUS stability (hysteresis)
let focusHoldUntil = 0;
let lastOverlayBounds = null;

// Log file
const LOG_PATH = path.join(app.getPath("userData"), "logs.json");
fs.ensureFileSync(LOG_PATH);
let logs = fs.readJsonSync(LOG_PATH, { throws: false }) || [];

function saveLog(entry) {
  logs.push(entry);
  try {
    fs.writeJsonSync(LOG_PATH, logs, { spaces: 2 });
  } catch (e) {
    console.error(e);
  }
}

async function getActive() {
  try {
    return await activeWin();
  } catch (e) {
    return null;
  }
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 980,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL("http://localhost:5173");

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function createOverlayWindow() {
  overlayWindow = new BrowserWindow({
    width: 800,
    height: 600,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    focusable: false,
    resizable: false,
    hasShadow: false,
  });

  overlayWindow.setIgnoreMouseEvents(true);
  overlayWindow.loadFile(path.join(__dirname, "overlay.html"));
  overlayWindow.hide();
  console.log("overlayWindow created");
}

app.whenReady().then(() => {
  createMainWindow();
  createOverlayWindow();

  console.log("Running without iohook. Using fallback VS Code focus detection.");

  // ---------------------------- MAIN TRACKING LOOP ----------------------------
  setInterval(async () => {
    if (!tracking) return;

    const active = await getActive();
    const now = Date.now();

    // Reset per-second keystroke + mouse metrics (not used now)
    const kpm = keystrokes * 60;
    const mpm = mouseMoves * 60;
    keystrokes = 0;
    mouseMoves = 0;

    // ------------------ FALLBACK: VS CODE FOCUS DETECTION ---------------------
    if (!globalThis._fp) globalThis._fp = {};
    if (typeof globalThis._fp.activeCounter === "undefined")
      globalThis._fp.activeCounter = 0;

    const ownerName =
      (active && active.owner && (active.owner.name || "")) || "";
    const title = (active && active.title) || "";

    const isCodeApp = /code/i.test(ownerName + " " + title);

    if (isCodeApp) {
      globalThis._fp.activeCounter += 1; // counts seconds
    } else {
      globalThis._fp.activeCounter = 0;
    }

    // provisional state
    let provisionalState;
    if (globalThis._fp.activeCounter >= 5) provisionalState = "FOCUS";
    else if (globalThis._fp.activeCounter > 0) provisionalState = "TRACKING";
    else provisionalState = "WARN";

    // -------------------------- HYSTERESIS LOGIC -----------------------------
    if (focusHoldUntil > now) {
      state = "FOCUS";
    } else {
      if (provisionalState === "FOCUS") {
        state = "FOCUS";
        focusHoldUntil = now + 4000; // 4s stickiness
      } else if (provisionalState === "TRACKING") {
        state =
          state === "FOCUS" && focusHoldUntil > now ? "FOCUS" : "TRACKING";
      } else {
        // WARN needs 2 seconds stability
        if (!globalThis._fp.warnCounter) globalThis._fp.warnCounter = 0;
        globalThis._fp.warnCounter += 1;

        if (globalThis._fp.warnCounter >= 2) {
          state = "WARN";
          focusHoldUntil = 0;
        }
      }
    }

    // ------------------- SCORE (for display only) ---------------------
    let score = Math.min(100, 40 + globalThis._fp.activeCounter * 12);

    // --------------------------- OVERLAY CONTROL ------------------------------
    if (state === "FOCUS" && active && active.bounds) {
      const b = active.bounds;

      // clamp bounds to avoid negative coordinates
      const x = Math.max(0, b.x - 8);
      const y = Math.max(0, b.y - 8);
      const width = Math.max(100, b.width + 16);
      const height = Math.max(50, b.height + 16);

      const newBounds = { x, y, width, height };

      let needUpdate = true;
      if (lastOverlayBounds) {
        const dx = Math.abs(lastOverlayBounds.x - newBounds.x);
        const dy = Math.abs(lastOverlayBounds.y - newBounds.y);
        const dw = Math.abs(lastOverlayBounds.width - newBounds.width);
        const dh = Math.abs(lastOverlayBounds.height - newBounds.height);

        if (dx < 4 && dy < 4 && dw < 4 && dh < 4) needUpdate = false;
      }

      if (needUpdate) {
        try {
          overlayWindow.setBounds(newBounds);
          overlayWindow.show();
          lastOverlayBounds = newBounds;
          console.log("DEBUG overlay shown with bounds:", newBounds);
        } catch (e) {
          console.error("overlay bounds error", e);
        }
      } else {
        overlayWindow.show();
        console.log("DEBUG overlay kept shown");
      }
    } else {
      if (overlayWindow && overlayWindow.isVisible && overlayWindow.isVisible()) {
        overlayWindow.hide();
        console.log("DEBUG overlay hidden, state:", state);
      }
    }

    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send("state-change", { state, score });
    }

    saveLog({ ts: now, active: ownerName || title || null, score, state });
  }, 1000);

  console.log("FlowPilot main tracking loop running.");
});

// --------------------------- IPC EVENTS ----------------------------
ipcMain.on("start-tracking", (ev) => {
  tracking = true;
  state = "TRACKING";
  ev.reply("tracking-started");
  console.log("Tracking started");
});

ipcMain.on("stop-tracking", (ev) => {
  tracking = false;
  state = "IDLE";
  if (overlayWindow) overlayWindow.hide();
  ev.reply("tracking-stopped");
  console.log("Tracking stopped");
});

// --------------------------- APP BEHAVIOR ---------------------------
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
