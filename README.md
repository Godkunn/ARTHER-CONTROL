<div align="center">

# ⚡ AETHER CONTROL
### Enterprise-Grade Remote Cockpit & AI Agent Orchestration Platform

[![Version](https://img.shields.io/badge/version-2.4.0-00f2fe.svg?style=for-the-badge&logo=electron)](https://github.com/Godkunn/ARTHER-CONTROL)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?style=for-the-badge&logo=react)](https://react.dev)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933.svg?style=for-the-badge&logo=node.js)](https://nodejs.org)
[![C# Win32](https://img.shields.io/badge/Win32-Native_0.05ms-512BD4.svg?style=for-the-badge&logo=csharp)](https://microsoft.com)
[![License](https://img.shields.io/badge/license-MIT-green.svg?style=for-the-badge)](LICENSE)

<br/>

![AETHER CONTROL Hero Banner](./docs/images/hero_banner.jpg)

<p align="center">
  <b>AETHER CONTROL</b> turns any mobile device or secondary screen into an ultra-low latency, zero-data remote cockpit for your workstation. Monitor autonomous AI agents (Antigravity & Codex), grant 5-level system approvals, unlock your PC via phone <b>Face ID / Touch ID</b>, and control desktop windows with sub-millisecond tactile precision.
</p>

[Features](#-core-features) • [Performance Matrix](#-performance-benchmarks) • [Quick Start](#-quick-start) • [Security](#-security-architecture) • [Tech Stack](#-tech-stack)

---

</div>

## ⚡ Performance Benchmarks

| Metric | Traditional VNC / RDP | AETHER CONTROL (Native Engine) |
| :--- | :--- | :--- |
| **Input Latency** | 150ms – 300ms (High lag) | ⚡ **0.05ms (Sub-millisecond hardware dispatch)** |
| **Data Usage (USB / LAN)** | 50 – 100 MB/min | ⚡ **0 MB (Zero-Data local loopback)** |
| **Screen Frame Pipeline** | CPU Readback (High overhead) | ⚡ **In-Memory Native GDI Frame Streaming** |
| **Authentication** | Passwords only | ⚡ **WebAuthn Biometric (Face ID / Touch ID)** |
| **Agent Elevation** | Blocks execution on modal dialogs | ⚡ **Real-Time 5-Tier Mobile Approval Relay** |

<br/>

---

## 🚀 Core Features

### 🔓 1. Biometric Remote Workstation Unlock (Face ID / Touch ID)
- **Zero-Touch Unlock:** Authenticate securely using your smartphone's native Face ID, Touch ID, or fingerprint sensor via WebAuthn.
- **Automated Winlogon Dismissal:** Instantaneously wakes sleep displays, dismisses Windows lock screen covers, and injects encrypted PIN credentials in hardware space.

### 🎮 2. Sub-Millisecond Win32 Input Engine (`0.05ms`)
- **Zero Process Overhead:** Driven by a persistent compiled C# Win32 daemon (`input_daemon.exe`) that executes commands via direct standard streams with zero subprocess latency.
- **Hardware-Level Precision:** Instantaneous dispatch for cursor moves, left/right clicks, double-clicks, and smooth scroll wheel events.

### 📱 3. Tactile Multi-Touch Gesture System
- **1-to-1 Pixel Direct Touch:** Tap anywhere on mobile to trigger an instantaneous native click at that exact workstation coordinate.
- **Touch & Hold Text Selection:** Hold for 260ms and glide across the screen to highlight code in editors, drag files, or move windows.
- **2-Finger Natural Scroll:** Swipe two fingers to scroll active documents, web pages, and IDE terminals in real-time.
- **Laser HUD Reticle:** Glowing neon reticle tracks exact `(X, Y)` screen coordinates with animated tactile ripple feedback.

### 🔔 4. AI Agent & Windows UAC Approval Relay
- Automatically intercepts Windows UAC elevations, IDE execution checkpoints, and terminal script permissions.
- Relays prompts to your mobile screen with **5 granular authorization levels** (Allow Once, Always Allow, Sandbox, Deny, View Details).
- Native push notifications and auditory chimes ensure you never block autonomous agent workflows.

### 🛡️ 5. Hardware Emergency Kill Switch
- 1-tap hardware-grade panic button.
- Instantly severs and freezes all remote inputs, automated scripts, and connected tunnels in hardware isolation until manually resumed.

<br/>

![Mobile UI & Approval Relay](./docs/images/mobile_showcase.jpg)

---

## 🏛 Architecture Overview

AETHER CONTROL employs a decoupled, multi-tiered architecture that isolates the high-frequency input loop from adaptive video frame streaming:

![System Architecture](./docs/images/architecture.jpg)

```
 ┌─────────────────────────────────────────────────────────────┐
 │                      MOBILE / WEB CLIENT                    │
 │   React 19 • Touch Gestures • Laser Reticle • WebAuthn      │
 └──────────────────────────────┬──────────────────────────────┘
                                │ WebSocket (Encrypted JSON)
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │                    AETHER NODE.JS DAEMON                    │
 │    Express Server • mDNS Discovery • Zero-Data Tethering    │
 └──────────────┬──────────────────────────────┬───────────────┘
                │ IPC Stdin Stream             │ Buffer Streaming
                ▼                              ▼
 ┌─────────────────────────────┐ ┌─────────────────────────────┐
 │  NATIVE WIN32 INPUT DAEMON  │ │  IN-MEMORY GDI SCREEN ENGINE│
 │   C# / User32.dll (0.05ms)  │ │   Direct Frame Compression  │
 └─────────────────────────────┘ └─────────────────────────────┘
```

---

## ⚡ Quick Start

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Operating System**: Windows 10 / 11 (64-bit)
- **Client**: Any modern web browser (iOS Safari, Android Chrome, iPad, or Tablet)

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/Godkunn/ARTHER-CONTROL.git

# Navigate to project directory
cd ARTHER-CONTROL

# Install dependencies
npm install
```

### 2. Launching with 1-Click (`start.bat`)

Double-click the **`start.bat`** file in the root directory, or run:

```bash
npm run server
```

The terminal will automatically detect your active network interfaces and print your direct connection URLs:

```text
╔══════════════════════════════════════════════╗
║       AETHER CONTROL — DAEMON ACTIVE         ║
╠══════════════════════════════════════════════╣
║  Local:    http://localhost:3001             ║
║  LAN:      http://192.168.x.x:3001           ║
║  USB:      http://10.x.x.x:3001 (Direct USB) ║
║  mDNS:     http://aether-control.local:3001  ║
╚══════════════════════════════════════════════╝
```

---

## 🔒 Security Architecture

- **Local Isolation:** By default, all traffic stays strictly on your local subnet or direct physical USB cable. No screen data is ever transmitted to external servers.
- **Zero Cloud Storage:** Screenshots, telemetry, and clipboard data are processed in volatile memory and never written to disk.
- **Encrypted WebSockets:** All control events and authentication payloads use secure WSS / TLS encryption.
- **Hardware Isolation:** Dedicated kill switch completely freezes input pipelines on demand.

---

## 🛠 Tech Stack

- **Frontend**: React 19, Vite 8, Lucide Icons, Vanilla CSS Design System
- **Backend**: Node.js, Express, WebSocket (`ws`), Multicast DNS (`multicast-dns`)
- **Native Engine**: C# (.NET Framework 4.8 / Win32 `User32.dll` / GDI+), PowerShell Core
- **Networking**: mDNS Zero-Config, RNDIS USB Tethering, Cloudflare Zero-Trust Tunnels

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

<br/>

<div align="center">
  <sub>Built with ❤️ by <a href="https://github.com/Godkunn">Godkunn</a></sub>
</div>
