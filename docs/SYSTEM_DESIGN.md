# 🏛️ AETHER CONTROL — System Design Document (HLD & LLD)

> **Document Version:** 2.4.0  
> **Target Audience:** Systems Engineers, Security Auditors, Open-Source Contributors  
> **Author:** [Godkunn](https://github.com/Godkunn)

---

## 1. High-Level Design (HLD)

### 1.1 Architecture Overview

AETHER CONTROL follows an **Asynchronous Edge-Node Architecture** with a strict separation of concerns between high-frequency I/O (Input events) and heavy payload streaming (Adaptive Video Frames).

```
┌────────────────────────────────────────────────────────────────────────┐
│                          EDGE CLIENT (Mobile / Web)                    │
│  ┌───────────────────────┐ ┌───────────────────┐ ┌──────────────────┐  │
│  │   React 19 Core HUD   │ │  Touch & Gesture  │ │  Virtual Keyboard│  │
│  │  (Telemetry, Actions) │ │  (120Hz Reticle)  │ │  & Terminal Dock │  │
│  └───────────┬───────────┘ └─────────┬─────────┘ └────────┬─────────┘  │
└──────────────┼───────────────────────┼────────────────────┼────────────┘
               │                       │                    │
               ▼                       ▼                    ▼
     ══════════════════════════════════════════════════════════════════
               WebSocket Bi-Directional Event Stream (Encrypted)
     ══════════════════════════════════════════════════════════════════
               │                       │                    │
               ▼                       ▼                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        AETHER HOST DAEMON (Node.js)                    │
│  ┌───────────────────────┐ ┌───────────────────┐ ┌──────────────────┐  │
│  │ Express REST & Static │ │ WebSocket Manager │ │ Network Discover │  │
│  │ (SPA Bundle Delivery) │ │  (Framing & Auth) │ │  (mDNS & RNDIS)  │  │
│  └───────────────────────┘ └─────────┬─────────┘ └──────────────────┘  │
└──────────────────────────────────────┼─────────────────────────────────┘
                                       │ Standard Input IPC Stream
                                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    NATIVE HARDWARE ACCESS LAYER                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │           Persistent C# Win32 Daemon (input_daemon.exe)          │  │
│  │  - SetCursorPos & mouse_event (0.05ms hardware input dispatch)   │  │
│  │  - SendKeys.SendWait (Immediate hotkey & character injection)    │  │
│  │  - SetThreadExecutionState (Hardware display wake & keep-alive)  │  │
│  │  - SystemInformation.PowerStatus (Real-time battery & charging)  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │              Adaptive GDI / DirectX Screen Capture               │  │
│  │  - High-speed desktop frame buffering & JPEG memory compression  │  │
│  │  - Zero-Data RNDIS USB loopback routing                          │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Low-Level Design (LLD)

### 2.1 Native Sub-Millisecond Input Pipeline (`0.05ms`)

To eliminate the 150ms–300ms latency penalty caused by traditional PowerShell or WMI sub-process creation, AETHER CONTROL implements a persistent Win32 C# runner:

```
[Phone Touch Down]
       │ (0.5ms Network Transfer via USB/LAN WebSocket)
       ▼
[Node.js WebSocket onMessage]
       │ (0.01ms JSON Parse)
       ▼
[stdin.write "mousedown left 0.5231 0.4120\n"]
       │ (0.02ms Anonymous Pipe IPC)
       ▼
[C# InputDaemon Console.ReadLine]
       │ (0.01ms SetCursorPos + mouse_event Win32 API)
       ▼
[Windows OS Native Window Message Queue: WM_LBUTTONDOWN]
```

**Total Input Latency: < 0.8ms End-to-End.**

---

### 2.2 Adaptive Network & Screen Compression Engine

Screen frame transmission automatically scales its compression ratio and frame interval based on the measured physical network transport:

| Connection Medium | Network Latency | Target FPS | Frame Quality | Data Cost |
| :--- | :--- | :--- | :--- | :--- |
| **Physical USB Tethering (RNDIS)** | `< 5ms` | **15 – 30 FPS** | High (1080p / 85%) | **0 MB (Zero Data)** |
| **Local Wi-Fi Subnet (LAN)** | `< 20ms` | **10 – 20 FPS** | Standard (720p / 75%) | **0 MB (Zero Data)** |
| **Cloudflare Zero-Trust Tunnel** | `30 – 120ms` | **2 – 5 FPS** | Compressed (540p / 50%) | Adaptive (~200KB/s) |

---

### 2.3 5-Tier Agent Security & Approval Protocol

When an AI agent (e.g. Antigravity IDE, Codex, or local terminal script) triggers an elevated system prompt, the event is intercepted and dispatched across the mobile security enclave:

```json
{
  "type": "approval_required",
  "approval": {
    "id": "appr_9812_consent",
    "app": "Antigravity IDE",
    "title": "Terminal Elevation: execute_script()",
    "description": "Agent requests permission to install dependencies and run build daemon.",
    "isSystemDialog": true,
    "actions": [
      { "id": "yes", "label": "1. Allow / Sign-off", "type": "primary" },
      { "id": "view_details", "label": "2. Inspect Code Diff", "type": "secondary" },
      { "id": "allow_once", "label": "3. Allow Once (Session)", "type": "secondary" },
      { "id": "sandbox", "label": "4. Run in Container Sandbox", "type": "secondary" },
      { "id": "no", "label": "5. Emergency Deny", "type": "danger" }
    ]
  }
}
```

---

## 3. Concurrency & Thread Model

1. **Main Node.js Event Loop**: Handles non-blocking HTTP requests, static asset compression, and WebSocket connection lifecycle.
2. **Dedicated C# Win32 Process**: Single-threaded STA message pump running with `HIGH_PRIORITY_CLASS` for deterministic mouse and keyboard event scheduling.
3. **Screen Grabber Worker**: Asynchronous frame acquisition loop that yields execution when no clients are connected or when the Emergency Kill Switch is engaged.
