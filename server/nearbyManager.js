// server/nearbyManager.js
// AETHER CONTROL — Nearby / Direct / Zero-Data connection modes
//
//  Method 1: mDNS  → phone types "aether-control.local:3001" — no IP needed, zero internet
//  Method 2: Wi-Fi Hotspot → laptop creates its own hotspot, phone connects directly, zero internet
//  Method 3: USB Tethering → phone USB cable to laptop, phone accesses localhost via USB network
//
// None of these use the internet at all. All work offline/air-gapped.

import mdns from 'multicast-dns';
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);

// ─────────────────────────────────────────────
// mDNS — Advertise as "aether-control.local"
// ─────────────────────────────────────────────
let mdnsInstance = null;
const MDNS_SERVICE_NAME = 'aether-control';
const MDNS_HOST = `${MDNS_SERVICE_NAME}.local`;

export function startMdns(port = 3001) {
  try {
    mdnsInstance = mdns();

    // Answer queries for our hostname
    mdnsInstance.on('query', (query) => {
      query.questions.forEach(q => {
        const name = q.name?.toLowerCase() || '';
        if (name === MDNS_HOST || name === `${MDNS_SERVICE_NAME}._http._tcp.local`) {
          // Find our local IPs
          const interfaces = os.networkInterfaces();
          const ips = [];
          for (const addrs of Object.values(interfaces)) {
            for (const addr of (addrs || [])) {
              if (addr.family === 'IPv4' && !addr.internal) ips.push(addr.address);
            }
          }
          if (ips.length === 0) return;

          const answers = [
            // A record: hostname → IP
            { name: MDNS_HOST, type: 'A', ttl: 120, data: ips[0] },
            // PTR record for service discovery
            { name: '_http._tcp.local', type: 'PTR', ttl: 120, data: `${MDNS_SERVICE_NAME}._http._tcp.local` },
            // SRV record: service → host:port
            { name: `${MDNS_SERVICE_NAME}._http._tcp.local`, type: 'SRV', ttl: 120, data: { port, target: MDNS_HOST, priority: 0, weight: 0 } },
            // TXT metadata
            { name: `${MDNS_SERVICE_NAME}._http._tcp.local`, type: 'TXT', ttl: 120, data: [`path=/`, `version=2.5`, `app=AETHER CONTROL`] },
          ];
          mdnsInstance.respond({ answers });
        }
      });
    });

    // Also proactively announce ourselves every 30s
    const announce = () => {
      const interfaces = os.networkInterfaces();
      const ips = [];
      for (const addrs of Object.values(interfaces)) {
        for (const addr of (addrs || [])) {
          if (addr.family === 'IPv4' && !addr.internal) ips.push(addr.address);
        }
      }
      if (ips.length === 0) return;

      mdnsInstance.respond({
        answers: [
          { name: MDNS_HOST, type: 'A', ttl: 120, data: ips[0] },
          { name: '_http._tcp.local', type: 'PTR', ttl: 120, data: `${MDNS_SERVICE_NAME}._http._tcp.local` },
          { name: `${MDNS_SERVICE_NAME}._http._tcp.local`, type: 'SRV', ttl: 120, data: { port, target: MDNS_HOST, priority: 0, weight: 0 } },
        ]
      });
    };

    announce();
    const announceTimer = setInterval(announce, 30000);

    mdnsInstance.on('error', () => {}); // swallow errors silently

    console.log(`[AETHER NEARBY] mDNS active → http://${MDNS_HOST}:${port}`);
    return MDNS_HOST;
  } catch (err) {
    console.warn(`[AETHER NEARBY] mDNS init warning:`, err.message);
    return null;
  }
}

export function stopMdns() {
  if (mdnsInstance) {
    mdnsInstance.destroy();
    mdnsInstance = null;
  }
}

// ─────────────────────────────────────────────
// Windows Hotspot — Read / Enable / Disable
// ─────────────────────────────────────────────
export async function getHotspotInfo() {
  try {
    // Read current mobile hotspot state via netsh
    const { stdout: apStatus } = await execAsync(
      `netsh wlan show hostednetwork`,
      { timeout: 5000 }
    ).catch(() => ({ stdout: '' }));

    const { stdout: settings } = await execAsync(
      `(Get-NetConnectionSharing | Where-Object {$_.SharingEnabled -eq $true}) 2>$null`,
      { shell: 'powershell.exe', timeout: 5000 }
    ).catch(() => ({ stdout: '' }));

    // Parse SSID and status from netsh output
    const ssidMatch = apStatus.match(/SSID\s*:\s*(.+)/i);
    const statusMatch = apStatus.match(/Status\s*:\s*(\w+)/i);
    const ssid = ssidMatch?.[1]?.trim() || null;
    const isRunning = statusMatch?.[1]?.toLowerCase() === 'started';

    // Try to get password
    const { stdout: profileXml } = await execAsync(
      ssid ? `netsh wlan export profile "${ssid}" key=clear folder="%TEMP%" 2>nul && type "%TEMP%\\${ssid}.xml" 2>nul` : 'echo.'
    ).catch(() => ({ stdout: '' }));
    const passMatch = profileXml.match(/<keyMaterial>(.+?)<\/keyMaterial>/i);
    const password = passMatch?.[1] || null;

    // Get our LAN IP
    const interfaces = os.networkInterfaces();
    const ips = [];
    for (const addrs of Object.values(interfaces)) {
      for (const addr of (addrs || [])) {
        if (addr.family === 'IPv4' && !addr.internal) ips.push(addr.address);
      }
    }

    // Windows Mobile Hotspot IP is typically 192.168.137.1 when hosted network is on
    const hotspotIp = '192.168.137.1';

    return {
      supported: true,
      isRunning,
      ssid,
      password,
      hotspotIp,
      serverUrl: `http://${hotspotIp}:3001`,
      lanIps: ips,
    };
  } catch (err) {
    return { supported: false, isRunning: false, error: err.message };
  }
}

export async function enableHotspot() {
  try {
    // Enable Windows Mobile Hotspot via PowerShell (Windows 10/11)
    const ps = `
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$connectionProfile = [Windows.Networking.Connectivity.NetworkInformation,Windows.Networking.Connectivity,ContentType=WindowsRuntime]::GetInternetConnectionProfile()
$tetheringManager = [Windows.Networking.NetworkOperators.NetworkOperatorTetheringManager,Windows.Networking.NetworkOperators,ContentType=WindowsRuntime]::CreateFromConnectionProfile($connectionProfile)
$tetheringManager.StartTetheringAsync()
`;
    await execAsync(`powershell -NoProfile -Command "${ps.replace(/"/g, '\\"')}"`, { timeout: 10000 });
    return { success: true };
  } catch (err) {
    // Fallback: try netsh hosted network
    try {
      await execAsync('netsh wlan set hostednetwork mode=allow', { timeout: 5000 });
      await execAsync('netsh wlan start hostednetwork', { timeout: 5000 });
      return { success: true, method: 'netsh' };
    } catch (e2) {
      return { success: false, error: e2.message };
    }
  }
}

export async function disableHotspot() {
  try {
    await execAsync('netsh wlan stop hostednetwork', { timeout: 5000 });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────
// USB Tethering Info
// ─────────────────────────────────────────────
export function getUsbTetheringInfo(port = 3001) {
  // When phone is connected via USB and USB tethering is enabled on Android,
  // an RNDIS/USB Ethernet adapter appears on Windows. The phone accesses the laptop
  // at the adapter's gateway IP, which is typically 192.168.42.x range
  // Windows assigns 192.168.42.129 or similar. The laptop listens on 0.0.0.0 so it works.

  const interfaces = os.networkInterfaces();
  const usbAdapters = [];

  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    // USB RNDIS adapters are often named "Remote NDIS" or show up as 192.168.42.x or 192.168.43.x
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        const isUsb = name.toLowerCase().includes('rndis') ||
                      name.toLowerCase().includes('android') ||
                      addr.address.startsWith('192.168.42.') ||
                      addr.address.startsWith('192.168.43.');
        if (isUsb) {
          usbAdapters.push({ name, ip: addr.address });
        }
      }
    }
  }

  const usbIp = usbAdapters[0]?.ip || null;
  return {
    detected: usbAdapters.length > 0,
    adapters: usbAdapters,
    serverUrl: usbIp ? `http://${usbIp}:${port}` : null,
    instructions: [
      '1. Connect phone to laptop via USB cable',
      '2. On Android: Settings → Network → Hotspot & Tethering → USB Tethering → ON',
      '3. A new network adapter appears on laptop',
      `4. Phone accesses laptop at the USB adapter IP`,
      '5. Zero internet data used — direct cable connection'
    ]
  };
}

export function getMdnsHost() {
  return MDNS_HOST;
}
