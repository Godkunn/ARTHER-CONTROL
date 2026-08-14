// server/tunnelManager.js
// Cloudflare Tunnel integration with automatic LocalTunnel failsafe fallback manager
// & Public IP detection for LocalTunnel password bypass

import localtunnel from 'localtunnel';
import { spawn } from 'child_process';
import http from 'http';
import https from 'https';

let activeTunnelInfo = {
  mode: 'Initialising Tunnels...',
  url: 'http://localhost:3001',
  status: 'Initialising...',
  isCloudflareActive: false,
  isLocalTunnelActive: false,
  cloudflareUrl: null,
  localTunnelUrl: null,
  publicIp: null
};

// Prevent any unhandled process crash from tunnel errors
process.on('uncaughtException', (err) => {
  console.warn('[AETHER TUNNEL] Non-fatal Tunnel Exception:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.warn('[AETHER TUNNEL] Non-fatal Tunnel Rejection:', reason);
});

// Helper to fetch public IP for LocalTunnel bypass password
async function fetchPublicIp() {
  return new Promise((resolve) => {
    https.get('https://api.ipify.org?format=json', { timeout: 4000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.ip || null);
        } catch {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

export async function initializeTunnels(port = 3001, onTunnelUpdate = () => {}) {
  console.log(`[AETHER TUNNEL] Initialising Cloudflare & LocalTunnel dual protection for port ${port}...`);

  // Fetch public IP in background for LocalTunnel bypass info
  fetchPublicIp().then(ip => {
    if (ip) {
      activeTunnelInfo.publicIp = ip;
      onTunnelUpdate(activeTunnelInfo);
    }
  });

  // Step 1: Start LocalTunnel Failsafe Fallback
  activateLocalTunnelFallback(port, onTunnelUpdate);

  // Step 2: Attempt Cloudflare Quick Tunnel (cloudflared)
  attemptCloudflareTunnel(port, onTunnelUpdate);

  return activeTunnelInfo;
}

function attemptCloudflareTunnel(port, onTunnelUpdate) {
  try {
    const cloudflareProcess = spawn('cloudflared', ['tunnel', '--url', `http://127.0.0.1:${port}`], { shell: true });

    let cfDetected = false;

    const parseOutput = (data) => {
      if (!data) return;
      const output = data.toString();
      const match = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
      if (match && !cfDetected) {
        cfDetected = true;
        activeTunnelInfo = {
          ...activeTunnelInfo,
          mode: 'Cloudflare Tunnel (Primary)',
          url: match[0],
          cloudflareUrl: match[0],
          status: 'Protected HTTPS Active',
          isCloudflareActive: true
        };
        console.log(`\n==============================================================`);
        console.log(`🟢 CLOUDFLARE TUNNEL LIVE: ${match[0]}`);
        console.log(`==============================================================\n`);
        onTunnelUpdate(activeTunnelInfo);
      }
    };

    cloudflareProcess.stdout.on('data', parseOutput);
    cloudflareProcess.stderr.on('data', parseOutput);

    cloudflareProcess.on('error', (err) => {
      console.warn(`[AETHER TUNNEL] Direct cloudflared command error (${err.message}). Trying npx cloudflared...`);
      attemptNpxCloudflare(port, onTunnelUpdate);
    });

    cloudflareProcess.on('exit', () => {
      console.warn(`[AETHER TUNNEL] Cloudflare process exited. Retrying in 5s...`);
      setTimeout(() => attemptCloudflareTunnel(port, onTunnelUpdate), 5000);
    });

  } catch (err) {
    console.warn(`[AETHER TUNNEL] Exception in cloudflared spawn: ${err.message}`);
    attemptNpxCloudflare(port, onTunnelUpdate);
  }
}

function attemptNpxCloudflare(port, onTunnelUpdate) {
  try {
    const npxCf = spawn('npx', ['-y', 'cloudflared', 'tunnel', '--url', `http://127.0.0.1:${port}`], { shell: true });

    let cfDetected = false;

    const parseOutput = (data) => {
      if (!data) return;
      const output = data.toString();
      const match = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
      if (match && !cfDetected) {
        cfDetected = true;
        activeTunnelInfo = {
          ...activeTunnelInfo,
          mode: 'Cloudflare Tunnel (Primary)',
          url: match[0],
          cloudflareUrl: match[0],
          status: 'Protected HTTPS Active',
          isCloudflareActive: true
        };
        console.log(`\n==============================================================`);
        console.log(`🟢 CLOUDFLARE TUNNEL (npx) LIVE: ${match[0]}`);
        console.log(`==============================================================\n`);
        onTunnelUpdate(activeTunnelInfo);
      }
    };

    npxCf.stdout.on('data', parseOutput);
    npxCf.stderr.on('data', parseOutput);

  } catch (e) {
    console.warn(`[AETHER TUNNEL] npx cloudflared failed:`, e.message);
  }
}

async function activateLocalTunnelFallback(port, onTunnelUpdate) {
  try {
    const subName = `aether-control-ayush-${Math.floor(1000 + Math.random() * 9000)}`;
    const tunnel = await localtunnel({
      port: port,
      subdomain: subName
    });

    const isPrimary = !activeTunnelInfo.isCloudflareActive;

    activeTunnelInfo = {
      ...activeTunnelInfo,
      mode: isPrimary ? 'LocalTunnel (Failsafe Active)' : activeTunnelInfo.mode,
      url: isPrimary ? tunnel.url : activeTunnelInfo.url,
      localTunnelUrl: tunnel.url,
      status: 'Protected HTTPS Active',
      isLocalTunnelActive: true
    };

    console.log(`\n==============================================================`);
    console.log(`🛡️ LOCALTUNNEL FAILSAFE LIVE: ${tunnel.url}`);
    if (activeTunnelInfo.publicIp) {
      console.log(`🔑 LOCALTUNNEL PASSWORD/BYPASS IP: ${activeTunnelInfo.publicIp}`);
    }
    console.log(`==============================================================\n`);
    onTunnelUpdate(activeTunnelInfo);

    tunnel.on('close', () => {
      console.warn(`[AETHER TUNNEL] LocalTunnel closed. Reconnecting fallback in 5s...`);
      setTimeout(() => activateLocalTunnelFallback(port, onTunnelUpdate), 5000);
    });

    tunnel.on('error', (err) => {
      console.warn(`[AETHER TUNNEL] LocalTunnel connection warning:`, err.message);
    });
  } catch (err) {
    console.warn(`[AETHER TUNNEL] LocalTunnel fallback warning:`, err.message);
  }
}

export function getTunnelInfo() {
  return activeTunnelInfo;
}
