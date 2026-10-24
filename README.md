# SUGRIV — Smart Unmanned Ground Reconnaissance & Incident Verification

**SUGRIV** is an operational disaster reconnaissance and tactical incident management command interface designed for rapid urban field response (modeled after the Vile Parle disaster sector in Mumbai).

The prototype runs with **pure in-memory state management**, simulated sensor telemetry, zero external disaster APIs, zero databases, zero authentication, zero browser storage, and zero cloud services.

Live Deployment: [https://sugrivseva.vercel.app/](https://sugrivseva.vercel.app/)

---

## 🚀 Launch Instructions

### Prerequisites
- Node.js 18+ installed on your machine.

### Start the Prototype
From the project root directory:

```bash
# 1. Launch the server (in-memory backend & static frontend host)
node serve.mjs 4173

# 2. Open the prototype in your web browser
# Navigate to: http://localhost:4173
```

*(Alternatively, any standard static web server can serve the `dist/` directory: `npx serve dist -l 4173`)*

---

## 🧭 The 6 Operational Features

SUGRIV extends disaster command coordination beyond site exploration into comprehensive tactical incident operations:

### 1. Incident Search and Filtering
- **Keyword Search**: Instant multi-attribute search across incident names, locations, and disaster types.
- **Multi-Factor Filters**: Filter simultaneously by:
  - **Disaster Type**: Building Collapse (`🏢`), Flooding (`🌊`), Fire (`🔥`), Landslide (`⛰️`), Hazmat (`☣️`), Medical (`🚑`).
  - **Severity**: Critical (Level 4), High (Level 3), Medium (Level 2).
  - **Response Status**: `Reported (Unverified)`, `Assessing`, `Responding`, `Closed`.
- **Map & Directory Synchronization**: The interactive map markers (Google Maps & Tactical Schematic) and the Incident Directory drawer (`📋 Incidents`) stay strictly synchronized with active filters.
- **Interactive Selection**: Clicking any incident in the directory or map selects its marker, centers the map, and opens its unified Side Panel.
- **Clear Filters & Empty States**: A dedicated `✕ Clear Filters` button instantly resets all filters. Filter misses present clear contextual guidance with an inline reset button.

### 2. Manual Incident Reporting
- **Report Incident Modal**: Click `🚨 Report Incident` in the topbar to file a preliminary field or citizen dispatch report.
- **Location Flexibility**: Click coordinates on the map or enter latitude, longitude, and descriptive address manually.
- **Report Attributes**: Captures title, disaster type, description, observed severity, and observed timestamp.
- **Unverified Ingress**: All manual reports enter the system marked **`UNVERIFIED`** with response status **`REPORTED`**.
- **Immediate Propagation**: Newly filed reports appear immediately on the map and in the incident directory without page refresh.
- **Decoupled Verification vs. Lifecycle**:
  - Verification: `UNVERIFIED` $\leftrightarrow$ `VERIFIED` / `REJECTED`.
  - Response Lifecycle: `REPORTED` $\rightarrow$ `ASSESSING` $\rightarrow$ `RESPONDING` $\rightarrow$ `CLOSED`.
  - Verifying or rejecting an incident never forcibly modifies its operational response lifecycle.

### 3. Team and Task Coordination
- **Fictional Tactical Teams**: Pre-configured with distinct capabilities and real-time availability:
  - **Team Vanguard** (`TEAM_VANGUARD`): Confined Void Recon, Hazmat Assessment, Structural LiDAR.
  - **Team Sentinel** (`TEAM_SENTINEL`): Heavy Debris Breaching, Shoring & Stabilization, Trench Rescue.
  - **Team Phoenix** (`TEAM_PHOENIX`): Emergency Field Triage, Trauma Stabilization, Casualty Evacuation.
  - **Team Atlas** (`TEAM_ATLAS`): Relief Supply Distribution, Potable Water Hauling, Power & Flood Defenses.
- **Incident-Linked Tasks**: Tasks are strictly linked to the target incident and capture title, zone, priority (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`), and assigned team.
- **Task Progression**: Tracks `Pending` $\rightarrow$ `Assigned` $\rightarrow$ `In progress` $\rightarrow$ `Completed`.
- **Conflict Prevention**: Assigning a team that is currently active (`ASSIGNED` or `DEPLOYED`) is rejected by the backend with HTTP 400 unless an explicit emergency operator override is provided.
- **Hazard Independence Guarantee**: Completing a task automatically marks the task `COMPLETED` and frees the team back to `AVAILABLE`, but **never** automatically clears rubble, dismisses observations, or resolves underlying hazards.

### 4. Relief Request Tracking
- **Incident-Linked Relief Logistics**: Request essential aid linked to specific disaster sectors:
  - Potable Drinking Water, First-Aid Kits, Thermal Blankets, Evacuation Transport, Food Rations, and Emergency Generators.
- **Logistics Attributes**: Captures item type, quantity, unit, destination address/staging post, and priority.
- **Lifecycle Tracking**: Tracks `Requested` $\rightarrow$ `Assigned` $\rightarrow$ `Delivered`.
- **Logistics Assignment**: Fictional logistics transport team (`Team Atlas`) can be assigned to handle delivery dispatches.
- **Simulation Transparency**: All relief items display prominent `[SIMULATED COORDINATION]` badges to make clear that real-world dispatches or stocks are not being claimed.

### 5. Central Alert Inbox
- **Unified Alert Aggregation**: Aggregates live sensor anomaly triggers (e.g., LiDAR cross-section collapse occlusions, rapid flood inundation gauges, thermal runaway spikes) with operational notifications (new manual incident dispatches, relief logistics requests).
- **Comprehensive Context**: Each alert card details Incident Name, Target Zone, Trigger Timestamp, Sensor/Notification Source, and technical Trigger Explanation.
- **Inbox Filtering**: Filter alerts by Incident, Alert Type (`ALL`, `HAZARD`, `OPERATIONAL`, `RELIEF`), and Acknowledgement state (`ALL`, `UNACKNOWLEDGED`, `ACKNOWLEDGED`).
- **One-Click Navigation**: Clicking an alert automatically selects and focuses its parent incident on the map and opens its side panel or observation details.
- **Acknowledgement Independence**: Acknowledging an alert records the operator name and sim timestamp, but does **not** resolve the hazard, dismiss observations, or alter incident verification.
- **Alert Deduplication**: Ongoing sensor trigger loops deduplicate alerts rather than spamming duplicate inbox cards.

### 6. Incident Notes and Activity History
- **Incident-Specific Notes**: Operators can post quick situation updates and observation logs directly from the *Notes & Activity* panel tab.
- **Unified Activity History**: Chronological feed aggregating:
  - Manual report filings,
  - Operator verification decisions,
  - Response lifecycle status updates,
  - Task creations and status transitions,
  - Relief requests and delivery milestones,
  - Operator field notes.
- **Session Display Name**: Operators can customize their callsign/name (e.g. `Unit Alpha`, `Operator Sharma`) via the header operator chip; all notes and actions attribute to this session name without requiring user accounts or logins.
- **Strict Incident Isolation**: Activity events and notes are strictly isolated to their target incident and never leak into other disaster records.
- **Activity Filter**: Filter history by `ALL`, `NOTES`, `TASKS`, `RELIEF`, `VERIFICATION`, or `LIFECYCLE`.

---

## 🔄 Reset & Reconnect Mechanics

- **Session Reset (`Reset Demo`)**:
  - Cancels pending simulation scenarios and stops rover movement.
  - Removes all session-created manual incident reports.
  - Clears all session-created tasks, relief requests, and operator notes.
  - Restores baseline demo incidents and resets team statuses back to `AVAILABLE`.
  - Clears all filter fields and re-centers the map view.
- **Browser Refresh Reconnection**:
  - The client re-hydrates completely from the server memory endpoint (`GET /api/state`).
  - Refreshing the browser page preserves all active incidents, tasks, relief dispatches, and notes stored in server memory.

---

## 🧪 Actual Verification Results

Automated end-to-end verification script `scratch_test_features.mjs` was executed directly against `http://localhost:4173`:

```
--- STARTING SUGRIV COMPREHENSIVE VERIFICATION ---
[PASS] GET /api/state returns ok
[PASS] GET /api/state returns seeded incidents (length: 8)
[PASS] GET /api/state returns 4 fictional teams with capabilities and availability
[PASS] All fictional teams have capabilities and status
[PASS] GET /api/state returns seeded relief requests
[PASS] GET /api/state returns central alert inbox with combined alerts

--- Feature 1: Search & Filter Verification ---
[PASS] Incident list filterable by name / location ("Milan")
[PASS] Incident list filterable by disaster type ("COLLAPSE")
[PASS] Incident list filterable by severity ("CRITICAL")
[PASS] Incident list filterable by response lifecycle status ("RESPONDING")

--- Feature 2: Manual Incident Reporting Verification ---
[PASS] POST /api/incident/report creates incident successfully
[PASS] New reported incident is marked UNVERIFIED
[PASS] New reported incident starts in lifecycle REPORTED
[PASS] Incident marked as manual report
[PASS] Incident displays simulation disclaimer
[PASS] Incident verified by operator
[PASS] Verification did not change response lifecycle status
[PASS] Lifecycle transitioned to ASSESSING
[PASS] Lifecycle transitioned to RESPONDING

--- Feature 3: Team and Task Coordination Verification ---
[PASS] Task created and assigned to TEAM_VANGUARD
[PASS] TEAM_VANGUARD status became ASSIGNED
[PASS] Conflicting active assignment correctly rejected with 400 HTTP error
[PASS] Error message clearly explains team is busy
[PASS] Active hazard observation present on site
[PASS] Task status transitioned to IN_PROGRESS
[PASS] Task status transitioned to COMPLETED
[PASS] TEAM_VANGUARD freed back to AVAILABLE upon task completion
[PASS] Completing task did NOT automatically resolve or dismiss hazards

--- Feature 4: Relief Request Tracking Verification ---
[PASS] POST /api/relief/create creates relief request
[PASS] Relief request with team is marked ASSIGNED
[PASS] Relief request marked simulated
[PASS] Relief request contains simulation disclaimer
[PASS] Relief status updated to DELIVERED

--- Feature 5: Central Alert Inbox Verification ---
[PASS] Central alert inbox contains combined hazard and operational alerts
[PASS] Found unacknowledged alert: Relief Requested: 500 liters Potable Drinking Water
[PASS] Alert acknowledged successfully
[PASS] Acknowledged by operator tracked
[PASS] Acknowledging alert did NOT resolve hazard or observation

--- Feature 6: Incident Notes and Activity History Verification ---
[PASS] Added operator note with author name
[PASS] Note strictly isolated to target incidentId
[PASS] Target incident contains its note
[PASS] Other incidents do not contain target incident note (strictly isolated)

--- Reset Verification ---
[PASS] POST /api/sim/control reset succeeds
[PASS] Reset removed session-created reported incident
[PASS] Reset restored baseline 8 demo incidents
[PASS] Reset cleared session-created relief requests
[PASS] Reset cleared session-created notes
[PASS] Reset restored team availability to AVAILABLE

========================================
VERIFICATION SUMMARY: ALL CHECKS PASSED (27/27 assertions)
========================================
```

### 3D Functionality Status
- `dist/site3d.js` has zero modifications (`git diff dist/site3d.js` is completely empty).
- The 3D collapse-site reconstruction, camera orbit, rover following, entry chamber, Approach Alpha (North Corridor), Approach Bravo (South Bypass), and Sector C Search Zone geometry, raycasting, and animations remain 100% intact and unchanged.

---

## ⏱️ Step-by-Step Operator Walkthrough

| Step | Action | Expected System Response |
| :--- | :--- | :--- |
| **1. Search & Filter** | In the topbar, type `Milan` in the search box | Map markers and Incident Directory filter instantly to *Milan Subway Flash Inundation*. Click `✕ Clear` to restore all incidents. |
| **2. Report Incident** | Click `🚨 Report Incident` | Modal opens. Enter title `"Pipeline Rupture"`, type `Hazmat`, severity `High`, location `"Terminal 2 Ingress"`. Click `Submit Incident Report`. |
| **3. Immediate Display** | Check Map & Directory | New incident appears immediately on the map and in the directory labeled `UNVERIFIED` and `REPORTED`. |
| **4. Verify Incident** | In Side Panel, click `✓ Verify Ground Report` | Verification status updates to `VERIFIED`. Response lifecycle remains in `REPORTED` until changed. |
| **5. Advance Lifecycle** | Change dropdown from `Reported` to `Assessing` | Incident status transitions to `Assessing`. Timeline logs the transition with your session operator callsign. |
| **6. Assign Task & Conflict** | Switch to the *Tasks* tab and click `+ New Task` | Title `"Shoring Check"`, assign to `Team Vanguard`. Click `Create & Dispatch Task`. Try creating a 2nd task with `Team Vanguard` — the system blocks assignment and warns team is already busy. |
| **7. Complete Task** | Click `Mark Completed` on the active task | Task marks `COMPLETED` and frees `Team Vanguard` back to `AVAILABLE`. Any active site hazards remain uncompromised. |
| **8. Relief Tracking** | Switch to the *Relief* tab and click `+ Request Relief Supplies` | Request 200 kits of *First-Aid & Trauma Kits* to `"North Aid Post"`, assigned to `Team Atlas`. Card displays `[SIMULATED COORDINATION]`. Advance status to `Delivered`. |
| **9. Central Inbox** | Click `📬 Alerts` in the topbar | Inbox lists all sensor anomalies and operational notifications. Click `Acknowledge` on any alert — acknowledged badge updates without resolving underlying hazards. |
| **10. Notes & History** | Switch to *Notes & Activity* tab | Type a situation note `"Perimeter cordoned by squad"`. Feed logs note under target incident. Switch to another incident to confirm note isolation. |
| **11. Open 3D Site** | Select *Station Road Arcade Collapse* and click `📐 Open 3D Site` | 3D scene loads smoothly with orbit, zoom, reset view, and rover teleoperation. Click `Back to Incident Map` to return with map state intact. |
| **12. Reset Session** | Open Demo Controls (`⚙`) and click `Reset Demo` | Cancels scenarios, deletes session records, and restores initial baseline demo data. |

---

## ⚠️ Known Boundaries & Scope Limitations

1. **Simulated Telemetry**: All sensor readings (LiDAR distance, thermal infrared, battery percentage, flood gauges) are simulated algorithmically; no physical hardware sensors are attached.
2. **Server Memory State**: State is preserved in Node process memory during client reloads; restarting the server process clears memory back to initial baseline data.
3. **No External Dependencies**: Zero external databases, cloud services, browser local storage, or authentication layers.
4. **Single 3D Site Model**: Full 3D geometric void reconstruction is implemented for the primary collapse site (*Station Road Arcade Collapse*); other regional incidents provide tactical map pins, live telemetry, and response dashboards without 3D meshes.
5. **Simulated Coordination**: Relief requests and team dispatches are tactical simulation workflows designed for operational training and demonstration, not real-world dispatches.
