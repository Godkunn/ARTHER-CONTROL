// server/powerManager.js
// Prevents Windows from sleeping, keeps display awake, and provides screen-wake capabilities

import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const helperPs1 = path.join(__dirname, 'win32_helper.ps1');

// Keep system and display awake using PowerShell Win32 API
export function enableKeepAwake() {
  try {
    exec(`powershell -NoProfile -ExecutionPolicy Bypass -File "${helperPs1}" -Action keepawake`, () => {});
    console.log('[AETHER POWER] Keep-Awake enabled (Display & System keep-alive active)');
  } catch (err) {
    console.warn('[AETHER POWER] Keep-Awake warning:', err.message);
  }
}

// Wake display by simulating hardware mouse event and monitor power on command
export function wakeDisplay() {
  return new Promise((resolve) => {
    exec(`powershell -NoProfile -ExecutionPolicy Bypass -File "${helperPs1}" -Action wake`, (err, stdout) => {
      if (err) resolve({ success: false, error: err.message });
      else resolve({ success: true, output: stdout.trim() });
    });
  });
}

// Dispatch physical mouse click
export function dispatchMouseClick(px, py, button = 'left') {
  return new Promise((resolve) => {
    // px, py are 0.0 to 1.0. Pass to powershell
    exec(`powershell -NoProfile -ExecutionPolicy Bypass -File "${helperPs1}" -Action click -Px ${px.toFixed(4)} -Py ${py.toFixed(4)} -Button ${button}`, (err) => {
      resolve(!err);
    });
  });
}

// Dispatch mouse scroll / wheel
export function dispatchMouseScroll(deltaY = 120, px = -1, py = -1) {
  return new Promise((resolve) => {
    const pxArg = px >= 0 ? `-Px ${px.toFixed(4)}` : '';
    const pyArg = py >= 0 ? `-Py ${py.toFixed(4)}` : '';
    exec(`powershell -NoProfile -ExecutionPolicy Bypass -File "${helperPs1}" -Action scroll -Y ${Math.round(deltaY)} ${pxArg} ${pyArg}`, (err) => {
      resolve(!err);
    });
  });
}

// Dispatch mouse position move
export function dispatchMouseMove(px, py) {
  return new Promise((resolve) => {
    exec(`powershell -NoProfile -ExecutionPolicy Bypass -File "${helperPs1}" -Action move -Px ${px.toFixed(4)} -Py ${py.toFixed(4)}`, (err) => {
      resolve(!err);
    });
  });
}
