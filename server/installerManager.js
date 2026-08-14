// server/installerManager.js
// Handles downloading software to laptop, listing downloaded setup installers, and launching installers on Windows

import fs from 'fs';
import path from 'path';
import os from 'os';
import https from 'https';
import http from 'http';
import { exec, spawn } from 'child_process';

const DOWNLOADS_DIR = path.join(os.homedir(), 'Downloads');

// List downloaded installer files (.exe, .msi, .iso, .zip)
export function getDownloadedInstallers() {
  try {
    if (!fs.existsSync(DOWNLOADS_DIR)) return [];
    const files = fs.readdirSync(DOWNLOADS_DIR);
    const installers = [];
    const INSTALLER_EXTS = ['.exe', '.msi', '.iso', '.zip'];

    for (const f of files) {
      const ext = path.extname(f).toLowerCase();
      if (INSTALLER_EXTS.includes(ext)) {
        try {
          const fullPath = path.join(DOWNLOADS_DIR, f);
          const stat = fs.statSync(fullPath);
          installers.push({
            name: f,
            path: fullPath,
            ext,
            size: formatBytes(stat.size),
            sizeBytes: stat.size,
            modified: stat.mtime.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
          });
        } catch (_) {}
      }
    }
    // Sort newest first
    return installers.sort((a, b) => b.sizeBytes - a.sizeBytes);
  } catch (err) {
    return [];
  }
}

// Download a software installer URL directly into laptop's Downloads directory
export function downloadInstallerToLaptop(fileUrl, customName = null, onProgress = () => {}) {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(fileUrl);
      const filename = customName || path.basename(parsedUrl.pathname) || `installer_${Date.now()}.exe`;
      const targetPath = path.join(DOWNLOADS_DIR, filename);

      const fileStream = fs.createWriteStream(targetPath);
      const mod = fileUrl.startsWith('https') ? https : http;

      const request = (currentUrl) => {
        mod.get(currentUrl, { headers: { 'User-Agent': 'Mozilla/5.0 AetherInstaller/1.0' } }, (res) => {
          // Handle redirects (301, 302, 307)
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return request(res.headers.location);
          }
          if (res.statusCode !== 200) {
            fileStream.close();
            fs.unlink(targetPath, () => {});
            return reject(new Error(`Download failed with HTTP ${res.statusCode}`));
          }

          const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
          let receivedBytes = 0;

          res.on('data', (chunk) => {
            receivedBytes += chunk.length;
            if (totalBytes > 0) {
              const pct = Math.round((receivedBytes / totalBytes) * 100);
              onProgress({ receivedBytes, totalBytes, percent: pct });
            }
          });

          res.pipe(fileStream);

          fileStream.on('finish', () => {
            fileStream.close(() => {
              resolve({
                success: true,
                filename,
                path: targetPath,
                size: formatBytes(receivedBytes)
              });
            });
          });
        }).on('error', (err) => {
          fileStream.close();
          fs.unlink(targetPath, () => {});
          reject(err);
        });
      };

      request(fileUrl);
    } catch (err) {
      reject(err);
    }
  });
}

// Launch an installer on laptop
export function runInstallerExecutable(filePath, runAsAdmin = true) {
  return new Promise((resolve) => {
    try {
      const resolved = path.resolve(filePath);
      if (!fs.existsSync(resolved)) {
        return resolve({ success: false, error: 'File not found' });
      }

      // Launch via PowerShell Start-Process so it opens on the interactive desktop
      const verb = runAsAdmin ? '-Verb RunAs' : '';
      const cmd = `Start-Process "${resolved}" ${verb}`;
      
      exec(`powershell -NoProfile -Command "${cmd.replace(/"/g, '\\"')}"`, (err) => {
        if (err) {
          // Fallback without RunAs if user cancelled UAC prompt
          exec(`powershell -NoProfile -Command "Start-Process '${resolved.replace(/'/g, "''")}'"`, () => {});
        }
        resolve({ success: true, path: resolved, message: `Started installer: ${path.basename(resolved)}` });
      });
    } catch (err) {
      resolve({ success: false, error: err.message });
    }
  });
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
