# SUGRIV: Smart Unmanned Ground Reconnaissance & Incident Verification

A zero-dependency, backend-first autonomous reconnaissance and incident verification prototype. Designed to run completely in server memory with simulated telemetry, zero external APIs, zero database, and zero cloud services.

---

## Architecture & Guarantees

- **Map-First Operational Interface**: Full-screen geographic overview with real-time incident pins, compact status filters, and dedicated incident command side panel.
- **Resilient Dual-Mode Mapping**:
  - Uses Google Maps API when a developer key is configured.
  - Automatically hooks `window.gm_authFailure` and DOM mutation observers: if an API key is rejected, unbilled, or unauthorized, it instantly and smoothly falls back to a clearly labelled **Tactical Schematic Map**.
  - Manual toggle button (`[🗺️ Tactical Schematic View]` / `[🗺️ Try Google Maps]`) allows immediate switching between map modes at any time without data loss.
- **Fictional Geographically Positioned Demo Incidents**:
  - **Sector 08 Structural Collapse**: `🔴 CRITICAL (Level 4)`, `UNVERIFIED FIELD REPORT`. Has full interactive 3D Site View.
  - **River Basin Flash Inundation**: `🟠 HIGH (Level 3)`, `ESTIMATED REMOTE DATA`. Map/telemetry only.
  - **East Substation Transformer Fire**: `🟠 HIGH (Level 3)`, `ESTIMATED REMOTE DATA`. Map/telemetry only.
  - **Sector 05 Ridge Escarpment Landslide**: `🟡 MEDIUM (Level 2)`, `ESTIMATED REMOTE DATA`. Map/telemetry only.
  - Persistent **`SIMULATED DEMO DATA`** indicator visible at all times.
- **Interactive 3D Site View (Three.js)**:
  - Labelled **`SIMULATED 3D SITE — NOT A LIVE RECONSTRUCTION`**.
  - Renders collapsed structural slabs, exposed steel rebar, named search zones (Entry, Approach Alpha, Approach Bravo, Sector C), physical blockage barricade, pulsing thermal radiometer hazard, and forward scout rover.
  - Interactive camera controls: Orbit, Pan, Zoom, Reset Camera, and **Follow Rover** mode.
  - Clickable zones and hazards displaying verification status, timestamps, and access constraints.
- **Simulated Rover Camera HUD**:
  - Toggle between global 3D orbit and mast-mounted first-person camera view.
  - Labelled **`SIMULATED ROVER CAMERA VIEW — NOT LIVE FOOTAGE`**.
  - Head-Up Display shows artificial horizon pitch/roll reticle, forward LiDAR obstacle distance, spot temperature, and link latency.
- **Server Memory Only**: All operational state (telemetry, site topology, access reasoning, alerts, tasks, overrides, and chronological timeline) is maintained in Node.js server RAM with zero database, zero file storage, and zero cloud services.
- **Decoupled Reasoning**: Physical access constraints and investigation priorities are computed separately. Completing an inspection task does not auto-resolve hazards.

---

## Run Locally

Launch the in-memory server:
```bash
node serve.mjs 4173
```
Open **`http://localhost:4173`** in your browser.

Run automated verification:
```bash
node scratch/test_workflow.mjs
```

---

## Demonstration Script for Judges

Follow this step-by-step walkthrough to demonstrate the complete incident verification workflow:

### Step 1: Start Normal Simulated Telemetry
- **What to click**: Click **`[1 Start Telemetry]`** on the top demo stepper.
- **What changes**:
  - The simulation clock starts advancing (`T+00:01`, `T+00:02`...).
  - Rover status switches from `STANDBY` to `MOVING` (speed: ~0.45 m/s).
  - Rover telemetry updates continuously (IR spot temp ~22.0°C, ambient ~21.5°C, signal, battery).
  - Pin appears in Approach Alpha corridor.
- **What to explain to judges**:
  > *"SUGRIV initiates forward scouting autonomously. The Access Engine evaluates known corridors and defaults to Approach Alpha as the optimal direct route (45m)."*

---

### Step 2: Trigger Blocked Passage & Confirm Observation
- **What to click**: Click **`[2 Trigger Blockage]`**.
- **What changes**:
  - An **UNCONFIRMED** observation appears under Active Observations: *"Rubble Collapse on Approach Alpha"*.
  - Explicit sensor reasoning is displayed: *"Forward LiDAR rangefinder detected sudden cross-sectional corridor occlusion (>85%) at Waypoint N-2"*.
  - **Notice**: Approach Alpha remains `CLEAR` until an operator verifies the obstruction.
- **What to click next**: In the observation card, click **`[✓ Confirm Blockage]`**.
- **What changes**:
  - Status switches to **CONFIRMED**.
  - Access Engine instantly triggers recalculation: Approach Alpha turns red (`BLOCKED`).
  - Active Route switches to **Approach Bravo (South Service Passage - 70m)**.
  - The Access Reasoning panel visibly explains: *"Approach Alpha is impassable due to confirmed blockage obs-block-01. Rerouted via alternative known approach: Approach Bravo (70m)."*
- **What to explain to judges**:
  > *"Per safety protocol, sensor anomalies do not automatically redirect missions or lock out passages. Only upon operator confirmation does the Access Engine dynamically re-evaluate physical topology and route teams through verified alternative corridors."*

---

### Step 3: Trigger Thermal Anomaly in Search Zone
- **What to click**: Click **`[3 Trigger Thermal Anomaly]`**.
- **What changes**:
  - Rover telemetry indicates a sustained rapid temperature spike in Sector C Target Area (28°C → 50°C+).
  - Once threshold is sustained (>50°C for ≥3 consecutive readings), a **HIGH Severity Review Alert** triggers.
  - The alert displays timestamped historical readings, exact sensor source (Narrow-FOV Thermal Radiometer), and reason for escalation.
  - In the separate **Investigation & Action Priorities** card, **Priority #1** appears: *"Investigate Elevated Thermal Spot in Search Zone"*, recommending Team Vanguard (Hazmat).
- **What to explain to judges**:
  > *"The system decouples physical route accessibility from mission response priorities. While Approach Bravo handles physical access, the thermal anomaly takes top investigative priority based on live sensor readings."*

---

### Step 4: Operator Task Assignment & Override
- **What to click**: In Priority #1, click **`[Assign Inspection Task]`** (or click `[+ Create Task]`).
- **What changes**:
  - Modal opens pre-populated with *Team Vanguard* and *Search Zone*.
  - (Optional) Enter an Operator Override rationale or dispatch directly.
  - Click **`[Dispatch Task]`**.
  - Team Vanguard status becomes `ASSIGNED`.
  - Inspection Task appears with time, target zone, and any operator override rationale clearly tagged.
- **What to explain to judges**:
  > *"Operators maintain final command authority. Overrides are prominently recorded with operator rationale in the permanent audit trail."*

---

### Step 5: Complete Task (Preserve Hazard State)
- **What to click**: In the Inspection Task card, click **`[Complete Inspection Task]`**.
- **What changes**:
  - Task status changes to `COMPLETED`. Team Vanguard returns to `AVAILABLE`.
  - **Critical Rule**: The Thermal Hazard Alert and Hotspot remain ACTIVE. Completing an inspection task does *not* automatically resolve the danger.
  - Chronological event is committed to the in-memory Mission Timeline.
- **What to explain to judges**:
  > *"A completed inspection simply means units surveyed the site; it does not magically extinguish or resolve the hazard. The hazard alert stays active until explicitly neutralized by the operator."*

---

### Step 6: Test Fault Tolerance (Connection Loss & Recovery)
- **What to click**: Click **`[⚡ Drop Conn]`**.
- **What changes**:
  - Rover status becomes `DISCONNECTED`.
  - Banner alerts: **`⚠ STALE TELEMETRY`**.
  - Movement immediately halts (speed drops to 0.00 m/s), readings freeze at last known packet.
- **What to click next**: Click **`[🔌 Reconnect]`**.
- **What changes**:
  - Telemetry resumes live ticking, stale banner clears.
  - Movement remains safely halted until operator issues a new advance command.
- **What to explain to judges**:
  > *"On link failure, dead-reckoning movement stops to prevent runaway collisions, and stale data is prominently flagged. Upon recovery, telemetry resumes without uncommanded movement."*

---

### Step 7: Clear Obstacle & Reset Session
- **What to click**: In the Blockage observation, click **`[Clear / Resolve Obstacle]`** and confirm.
  - Approach Alpha access is immediately recalculated and restored as the primary route.
- **What to click**: Click **`[↺ Reset]`**.
  - All alerts, tasks, overrides, telemetry histories, and simulation clocks are wiped clean in server memory.
