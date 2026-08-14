// server/mockWindowsApi.js
// Mock native Windows API engine for screen capture, input dispatching, UI Automation approval detection, and file system.

let isKillSwitchActive = false;

// System state
const systemState = {
  activeWindow: "Antigravity IDE",
  cpuUsage: 28,
  ramUsage: 64,
  batteryPercent: 88,
  isCharging: true,
  volume: 75,
  isMuted: false,
  brightness: 90,
  screenResolution: { width: 1920, height: 1080 },
  streamQuality: "1080p",
  fps: 30,
  dirtyRegionsEnabled: true,
  lastMousePos: { x: 960, y: 540 },
  runningApps: [
    { id: "app-1", name: "Antigravity IDE", icon: "Code2", active: true, pid: 14208 },
    { id: "app-2", name: "Codex Terminal", icon: "Terminal", active: false, pid: 9812 },
    { id: "app-3", name: "VS Code (AETHER CONTROL)", icon: "FileCode", active: false, pid: 4410 },
    { id: "app-4", name: "Google Chrome", icon: "Globe", active: false, pid: 12044 },
    { id: "app-5", name: "File Explorer", icon: "Folder", active: false, pid: 3102 },
    { id: "app-6", name: "Task Manager", icon: "Cpu", active: false, pid: 1084 }
  ],
  clipboard: [
    { id: 'cb-1', text: 'https://github.com/aether-control/app', time: '14:48', source: 'Laptop' },
    { id: 'cb-2', text: 'npm run dev --host 0.0.0.0', time: '14:42', source: 'Laptop' },
    { id: 'cb-3', text: 'API_KEY_AETHER_PROD_8912749817', time: '14:30', source: 'Phone', masked: true },
  ],
  telemetry: {
    rssi: -58,
    latency: 24,
    bandwidth: 84.5,
    packetLoss: 0.1,
    jitter: 3,
    signalQuality: 'Excellent',
    connectionMode: 'Hotspot Tunnel'
  },
  pendingApprovals: [],
  approvalHistory: [],
  fileSystem: {
    "Desktop": [
      { name: "AETHER CONTROL", type: "folder", size: "--", modified: "Today 14:45" },
      { name: "Project_Notes.txt", type: "file", size: "14 KB", modified: "Yesterday" },
      { name: "architecture_diagram.png", type: "file", size: "2.4 MB", modified: "Aug 12" }
    ],
    "Downloads": [
      { name: "VSCodeUserSetup-x64.exe", type: "file", size: "92.4 MB", modified: "Today 14:10", downloading: true, progress: 74, speed: "8.4 MB/s" },
      { name: "Ubuntu-22.04-LTS.iso", type: "file", size: "3.6 GB", modified: "Aug 11" },
      { name: "dataset_backup.zip", type: "file", size: "480 MB", modified: "Aug 09" }
    ],
    "Documents": [
      { name: "Resume_Ayush.pdf", type: "file", size: "340 KB", modified: "Aug 01" },
      { name: "API_Credentials.env", type: "file", size: "1.2 KB", modified: "Jul 28" }
    ],
    "Projects": [
      { name: "aether-control", type: "folder", size: "--", modified: "Today" },
      { name: "aether-link", type: "folder", size: "--", modified: "Aug 10" },
      { name: "ai-copilot-agent", type: "folder", size: "--", modified: "Jul 15" }
    ]
  }
};

export function getSystemStatus() {
  return { ...systemState, isKillSwitchActive };
}

export function setKillSwitch(active) {
  isKillSwitchActive = active;
  return isKillSwitchActive;
}

export function focusWindow(appName) {
  systemState.runningApps.forEach(app => {
    app.active = (app.name === appName);
  });
  systemState.activeWindow = appName;
  return systemState.activeWindow;
}

export function handleInputEvent(event) {
  if (isKillSwitchActive) {
    return { success: false, reason: "Security Kill Switch Active" };
  }

  if (event.type === 'mouse_move' || event.type === 'mouse_click') {
    systemState.lastMousePos = { x: Math.round(event.x), y: Math.round(event.y) };
  }
  
  return { success: true, mousePos: systemState.lastMousePos };
}

export function resolveApproval(approvalId, decisionObj) {
  const index = systemState.pendingApprovals.findIndex(a => a.id === approvalId);
  if (index !== -1) {
    const approval = systemState.pendingApprovals.splice(index, 1)[0];
    const optionLabel = typeof decisionObj === 'object' ? decisionObj.label : decisionObj;
    const resolved = {
      ...approval,
      status: optionLabel.startsWith('No') ? 'DENIED' : 'APPROVED',
      selectedOption: optionLabel,
      resolvedBy: "Phone (UI Automation Relay)",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    systemState.approvalHistory.unshift(resolved);
    return resolved;
  }
  return null;
}

export function triggerSimulatedApproval(app = "Antigravity IDE") {
  const newId = `appr-${Math.floor(1000 + Math.random() * 9000)}`;
  const samplePrompts = [
    {
      app: "Antigravity IDE",
      title: "Command Execution Authorization",
      description: "Antigravity requests permission to execute `npx vite build --outDir dist`.",
      severity: "warning",
      actions: [
        { id: "opt_1", label: "1. Yes, Proceed", type: "primary" },
        { id: "opt_2", label: "2. Always allow `npx vite` in this project", type: "secondary" },
        { id: "opt_3", label: "3. Allow all commands for this session (1 hour)", type: "secondary" },
        { id: "opt_4", label: "4. Run in Background (Quiet Mode)", type: "secondary" },
        { id: "opt_5", label: "5. No, Reject & Stop", type: "danger" }
      ]
    },
    {
      app: "Antigravity IDE",
      title: "Terminal Tool Escalation",
      description: "Antigravity wants to run `python train_model.py` with GPU access.",
      severity: "high",
      actions: [
        { id: "opt_1", label: "1. Yes, Grant GPU Access", type: "primary" },
        { id: "opt_2", label: "2. Grant CPU-only mode", type: "secondary" },
        { id: "opt_3", label: "3. Run in Sandbox container", type: "secondary" },
        { id: "opt_4", label: "4. Ask again next time", type: "secondary" },
        { id: "opt_5", label: "5. No, Deny Access", type: "danger" }
      ]
    },
    {
      app: "Codex Terminal",
      title: "File Overwrite & Refactor Request",
      description: "Codex requested permission to write changes to `src/App.jsx`.",
      severity: "high",
      actions: [
        { id: "opt_1", label: "1. Yes, Apply Changes", type: "primary" },
        { id: "opt_2", label: "2. Create backup before overwrite", type: "secondary" },
        { id: "opt_3", label: "3. View Diff on Desktop first", type: "secondary" },
        { id: "opt_4", label: "4. Apply to staging branch only", type: "secondary" },
        { id: "opt_5", label: "5. No, Discard Changes", type: "danger" }
      ]
    }
  ];

  const template = samplePrompts[Math.floor(Math.random() * samplePrompts.length)];
  const newApproval = {
    id: newId,
    app: template.app,
    title: template.title,
    description: template.description,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    severity: template.severity,
    actions: template.actions
  };

  systemState.pendingApprovals.unshift(newApproval);
  return newApproval;
}

export function addClipboardItem(text, source = "Phone") {
  const newItem = {
    id: `cb-${Date.now()}`,
    text: text,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    source: source,
    masked: false
  };
  systemState.clipboard.unshift(newItem);
  return newItem;
}
