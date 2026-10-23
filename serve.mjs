import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

// ==========================================
// SUGRIV Prototype Server (In-Memory Only)
// Zero external APIs, zero databases, zero cloud
// ==========================================

const root = join(process.cwd(), 'dist');
const port = Number(process.argv[2] || 4173);
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8'
};

function formatSimTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `T+${m}:${s}`;
}

function createInitialState() {
  return {
    sim: {
      status: 'IDLE', // 'IDLE', 'RUNNING', 'PAUSED'
      elapsedSeconds: 0,
      activeScenario: null,
      scenarioStep: 0,
      thermalTicks: 0
    },
    rover: {
      id: 'SUGRIV-01',
      name: 'Sugriv Scout Rover',
      status: 'STANDBY', // 'STANDBY', 'MOVING', 'HOLD'
      connection: 'CONNECTED', // 'CONNECTED', 'DISCONNECTED'
      currentZone: 'ENTRY',
      targetZone: null,
      moving: false,
      speedMps: 0.0,
      batteryPct: 98.4,
      signalDbm: -63,
      ambientTempC: 21.5,
      spotTempC: 22.0,
      lidarDistanceM: 18.4,
      headingDeg: 45,
      coords3D: { x: -20, y: 0.5, z: 0 },
      lastReadingTime: 'T+00:00',
      isStale: false
    },
    incidents: [
      {
        id: 'inc-collapse-01',
        name: 'Sector 08 Commercial Complex Structural Collapse',
        type: 'COLLAPSE',
        typeName: 'Building Collapse',
        icon: '🏢',
        lat: 28.6139,
        lng: 77.2090,
        location: 'Sector 08 Central Commercial Block, Zone 4',
        reportTime: 'T-01:45',
        lastUpdate: 'T+00:00',
        severity: 'CRITICAL',
        severityLevel: 4,
        verificationStatus: 'UNVERIFIED_REPORT',
        status: 'ACTIVE_SCOUTING',
        statusLabel: 'Active Scouting',
        situationSummary: 'Reported partial multi-story pancake with void space entrapment risk. Primary ingress obstructed. Unmanned forward reconnaissance dispatched to verify internal passages.',
        affectedZones: 'Approach Alpha (North Tunnel), Approach Bravo (South Passage), Sector C Target Area',
        assignedTeamId: 'TEAM_VANGUARD',
        assignedTeamName: 'Team Vanguard (Recon & Hazmat)',
        responseStatus: 'ON_SCENE',
        roverAssigned: 'SUGRIV-01',
        has3DScene: true,
        dataDisclaimer: 'Simulated sensor observations; unverified structural estimates.'
      },
      {
        id: 'inc-flood-02',
        name: 'River Basin Flash Inundation',
        type: 'FLOOD',
        typeName: 'Flooding',
        icon: '🌊',
        lat: 28.6320,
        lng: 77.2180,
        location: 'River Basin Embankment, Sector 12 Lowlands',
        reportTime: 'T-02:10',
        lastUpdate: 'T-00:20',
        severity: 'HIGH',
        severityLevel: 3,
        verificationStatus: 'ESTIMATED_REMOTE',
        status: 'MONITORING',
        statusLabel: 'Monitoring',
        situationSummary: 'Storm runoff water level rising at estimated +0.8m/hr. Culvert ingress inundated. 2 perimeter roads restricted.',
        affectedZones: 'Lowland Access Arterials L-1 & L-4',
        assignedTeamId: 'TEAM_SENTINEL',
        assignedTeamName: 'Team Sentinel (Technical Rescue)',
        responseStatus: 'STAGED',
        roverAssigned: null,
        has3DScene: false,
        dataDisclaimer: 'Remote hydrological estimates only. No rover on site. 3D scene unavailable.'
      },
      {
        id: 'inc-fire-03',
        name: 'East Substation Transformer Fire',
        type: 'FIRE',
        typeName: 'Fire',
        icon: '🔥',
        lat: 28.5980,
        lng: 77.1950,
        location: 'Industrial Grid Sector 04, East Feeder',
        reportTime: 'T-00:50',
        lastUpdate: 'T-00:08',
        severity: 'HIGH',
        severityLevel: 3,
        verificationStatus: 'ESTIMATED_REMOTE',
        status: 'CONTAINMENT',
        statusLabel: 'Containment',
        situationSummary: 'Transformer bay thermal runaway with dense toxic smoke plume. Peripheral containment cordon established.',
        affectedZones: 'Substation Yard Perimeter & Grid Feeder East',
        assignedTeamId: null,
        assignedTeamName: 'Regional Hazmat Cordon Unit',
        responseStatus: 'CONTAINMENT',
        roverAssigned: null,
        has3DScene: false,
        dataDisclaimer: 'Thermal satellite detection; unverified ground confirmation. 3D scene unavailable.'
      },
      {
        id: 'inc-landslide-04',
        name: 'Bluff Cut Soil & Rock Displacement',
        type: 'LANDSLIDE',
        typeName: 'Landslide',
        icon: '⛰️',
        lat: 28.6050,
        lng: 77.2350,
        location: 'East Ridge Service Cut, Milestone 14',
        reportTime: 'T-03:20',
        lastUpdate: 'T-01:10',
        severity: 'MEDIUM',
        severityLevel: 2,
        verificationStatus: 'ESTIMATED_REMOTE',
        status: 'ASSESSMENT',
        statusLabel: 'Assessment',
        situationSummary: 'Slope displacement depositing rubble onto peripheral arterial road. Geological geotechnical sensors indicate minor creep.',
        affectedZones: 'Ridge Service Road R-2',
        assignedTeamId: null,
        assignedTeamName: 'Civil Engineering Assessment Squad',
        responseStatus: 'ASSESSMENT',
        roverAssigned: null,
        has3DScene: false,
        dataDisclaimer: 'Sensor tiltmeter estimate; ground verification pending. 3D scene unavailable.'
      }
    ],
    site: {
      zones: {
        ENTRY: { id: 'ENTRY', name: 'Entry Zone', tag: 'Alpha Gate (Staging)', type: 'staging', hazards: [] },
        CORRIDOR_NORTH: { id: 'CORRIDOR_NORTH', name: 'Approach Alpha', tag: 'North Corridor (Primary)', type: 'approach', hazards: [] },
        CORRIDOR_SOUTH: { id: 'CORRIDOR_SOUTH', name: 'Approach Bravo', tag: 'South Service Passage (Alternate)', type: 'approach', hazards: [] },
        SEARCH_ZONE: { id: 'SEARCH_ZONE', name: 'Search Zone', tag: 'Sector C Target Area', type: 'target', hazards: [] }
      },
      approaches: {
        APPROACH_ALPHA: {
          id: 'APPROACH_ALPHA',
          name: 'Approach Alpha',
          label: 'North Corridor Route',
          fromZone: 'ENTRY',
          toZone: 'SEARCH_ZONE',
          corridorZone: 'CORRIDOR_NORTH',
          distanceM: 45,
          status: 'CLEAR', // 'CLEAR', 'BLOCKED'
          blockageObservationId: null,
          statusReason: 'Initial telemetry indicates open tunnel cross-section (45m).'
        },
        APPROACH_BRAVO: {
          id: 'APPROACH_BRAVO',
          name: 'Approach Bravo',
          label: 'South Service Passage Route',
          fromZone: 'ENTRY',
          toZone: 'SEARCH_ZONE',
          corridorZone: 'CORRIDOR_SOUTH',
          distanceM: 70,
          status: 'CLEAR', // 'CLEAR', 'BLOCKED'
          blockageObservationId: null,
          statusReason: 'Secondary tunnel clear and navigable (70m).'
        }
      },
      accessSummary: {
        preferredRoute: 'APPROACH_ALPHA',
        alternativeRoute: 'APPROACH_BRAVO',
        activeRoute: 'APPROACH_ALPHA',
        primaryAccessible: true,
        alternativeAccessible: true,
        routingExplanation: 'Approach Alpha is open, unobstructed, and represents the shortest route (45m).'
      }
    },
    teams: {
      TEAM_VANGUARD: {
        id: 'TEAM_VANGUARD',
        name: 'Team Vanguard',
        role: 'Recon & Hazmat Specialists',
        status: 'AVAILABLE', // 'AVAILABLE', 'ASSIGNED', 'DEPLOYED'
        currentZone: 'ENTRY',
        currentTaskId: null
      },
      TEAM_SENTINEL: {
        id: 'TEAM_SENTINEL',
        name: 'Team Sentinel',
        role: 'Technical Rescue & Obstacle Clearance',
        status: 'AVAILABLE', // 'AVAILABLE', 'ASSIGNED', 'DEPLOYED'
        currentZone: 'ENTRY',
        currentTaskId: null
      }
    },
    observations: [],
    alerts: [],
    priorities: [],
    tasks: [],
    timeline: [
      {
        id: 'evt-init',
        simTime: 'T+00:00',
        type: 'SYSTEM',
        title: 'System Initialized',
        detail: 'In-memory operational session started. Zero external dependencies active.',
        source: 'SYSTEM'
      }
    ]
  };
}

let state = createInitialState();
let simTimer = null;

// Recompute access constraints strictly based on verified obstructions
function recalculateAccess() {
  const alphaBlockage = state.observations.find(
    o => o.type === 'BLOCKED_PASSAGE' && 
         (o.zone === 'CORRIDOR_NORTH' || o.approach === 'APPROACH_ALPHA') && 
         o.verification === 'CONFIRMED' && 
         !o.resolved
  );

  const bravoBlockage = state.observations.find(
    o => o.type === 'BLOCKED_PASSAGE' && 
         (o.zone === 'CORRIDOR_SOUTH' || o.approach === 'APPROACH_BRAVO') && 
         o.verification === 'CONFIRMED' && 
         !o.resolved
  );

  const alpha = state.site.approaches.APPROACH_ALPHA;
  const bravo = state.site.approaches.APPROACH_BRAVO;

  if (alphaBlockage) {
    alpha.status = 'BLOCKED';
    alpha.blockageObservationId = alphaBlockage.id;
    alpha.statusReason = `Impassable due to confirmed blockage (${alphaBlockage.id}): ${alphaBlockage.title}`;
  } else {
    alpha.status = 'CLEAR';
    alpha.blockageObservationId = null;
    const pendingAlpha = state.observations.find(
      o => o.type === 'BLOCKED_PASSAGE' && 
           (o.zone === 'CORRIDOR_NORTH' || o.approach === 'APPROACH_ALPHA') && 
           o.verification === 'UNCONFIRMED' && 
           !o.resolved
    );
    alpha.statusReason = pendingAlpha 
      ? `Caution: Unverified obstacle report (${pendingAlpha.id}) pending operator confirmation.`
      : 'Open corridor, optimal direct path (45m).';
  }

  if (bravoBlockage) {
    bravo.status = 'BLOCKED';
    bravo.blockageObservationId = bravoBlockage.id;
    bravo.statusReason = `Impassable due to confirmed blockage (${bravoBlockage.id}): ${bravoBlockage.title}`;
  } else {
    bravo.status = 'CLEAR';
    bravo.blockageObservationId = null;
    bravo.statusReason = 'Clear alternate approach corridor (70m).';
  }

  const alphaOk = alpha.status === 'CLEAR';
  const bravoOk = bravo.status === 'CLEAR';
  const summary = state.site.accessSummary;

  summary.primaryAccessible = alphaOk;
  summary.alternativeAccessible = bravoOk;

  if (alphaOk) {
    summary.activeRoute = 'APPROACH_ALPHA';
    summary.routingExplanation = 'Approach Alpha is unobstructed and represents the shortest route (45m).';
  } else if (bravoOk) {
    summary.activeRoute = 'APPROACH_BRAVO';
    summary.routingExplanation = 'Approach Alpha is BLOCKED by confirmed blockage. Rerouted via alternative known approach: Approach Bravo (70m).';
  } else {
    summary.activeRoute = 'NONE';
    summary.routingExplanation = 'CRITICAL: Both approaches are blocked. Target zone is currently inaccessible.';
  }

  // Update rover movement route if rover was using Alpha
  if (!alphaOk && state.rover.currentZone === 'CORRIDOR_NORTH') {
    state.rover.status = 'HOLD';
    state.rover.moving = false;
    state.rover.speedMps = 0;
  }
}

// Recompute response priorities (SEPARATE from access constraints)
function recalculatePriorities() {
  const priorities = [];

  // 1. Check for thermal hazards
  const activeThermalAlert = state.alerts.find(a => a.type === 'THERMAL_ANOMALY' && a.status !== 'RESOLVED');
  const thermalObservation = state.observations.find(o => o.type === 'THERMAL_HOTSPOT' && !o.resolved);

  if (activeThermalAlert || (thermalObservation && state.rover.spotTempC > 45)) {
    const isDismissed = activeThermalAlert && activeThermalAlert.status === 'DISMISSED';
    const hasAssignedTask = state.tasks.some(t => t.targetZone === 'SEARCH_ZONE' && t.status === 'ASSIGNED');
    
    priorities.push({
      id: 'prio-thermal',
      rank: 1,
      title: 'Investigate Elevated Thermal Spot in Search Zone',
      zone: 'SEARCH_ZONE',
      urgency: 'HIGH',
      recommendedTeam: 'TEAM_VANGUARD',
      assigned: hasAssignedTask,
      rationale: isDismissed
        ? 'Alert dismissed by operator, but live sensor reading remains hot (>50°C). Active fire/explosion hazard must be investigated.'
        : `Active thermal spike (current: ${state.rover.spotTempC.toFixed(1)}°C) in Sector C target area. Potential flashover or equipment fire risk.`
    });
  }

  // 2. Check for confirmed or unconfirmed blockages
  const unconfirmedBlock = state.observations.find(o => o.type === 'BLOCKED_PASSAGE' && o.verification === 'UNCONFIRMED' && !o.resolved);
  const confirmedBlock = state.observations.find(o => o.type === 'BLOCKED_PASSAGE' && o.verification === 'CONFIRMED' && !o.resolved);

  if (unconfirmedBlock) {
    priorities.push({
      id: 'prio-verify-block',
      rank: priorities.length + 1,
      title: `Verify Passage Obstacle on ${state.site.zones[unconfirmedBlock.zone]?.name || unconfirmedBlock.zone}`,
      zone: unconfirmedBlock.zone,
      urgency: 'MEDIUM',
      recommendedTeam: null,
      assigned: false,
      rationale: `Sensor reported >85% occlusion at ${unconfirmedBlock.zone}. Operator confirmation required before rerouting or tasking rescue units.`
    });
  } else if (confirmedBlock) {
    const hasClearanceTask = state.tasks.some(t => t.targetZone === confirmedBlock.zone && t.status === 'ASSIGNED');
    priorities.push({
      id: 'prio-clear-block',
      rank: priorities.length + 1,
      title: `Clear Obstacle on ${state.site.zones[confirmedBlock.zone]?.name || confirmedBlock.zone}`,
      zone: confirmedBlock.zone,
      urgency: state.site.accessSummary.alternativeAccessible ? 'MEDIUM' : 'CRITICAL',
      recommendedTeam: 'TEAM_SENTINEL',
      assigned: hasClearanceTask,
      rationale: state.site.accessSummary.alternativeAccessible
        ? 'Approach Alpha is impassable. Clearing rubble restores primary direct ingress and redundancy.'
        : 'CRITICAL: Sole remaining approach is blocked. Immediate obstacle breaching required.'
    });
  }

  state.priorities = priorities;
}

function addTimelineEvent(type, title, detail, source = 'SYSTEM') {
  state.timeline.unshift({
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    simTime: formatSimTime(state.sim.elapsedSeconds),
    type,
    title,
    detail,
    source,
    timestamp: Date.now()
  });
  if (state.timeline.length > 50) state.timeline.pop();
}

// Main Simulation Tick (1 Hz when running)
function simulationTick() {
  if (state.sim.status !== 'RUNNING') return;

  state.sim.elapsedSeconds += 1;
  const simTime = formatSimTime(state.sim.elapsedSeconds);

  // If rover connection is lost: freeze telemetry, mark stale, stop movement
  if (state.rover.connection === 'DISCONNECTED') {
    state.rover.isStale = true;
    state.rover.moving = false;
    state.rover.speedMps = 0;
    return;
  }

  // Normal connected telemetry tick
  state.rover.isStale = false;
  state.rover.lastReadingTime = simTime;

  // Battery consumption
  if (state.rover.moving) {
    state.rover.batteryPct = Math.max(5, +(state.rover.batteryPct - 0.04).toFixed(1));
  } else {
    state.rover.batteryPct = Math.max(5, +(state.rover.batteryPct - 0.005).toFixed(1));
  }

  // Fluctuate signal slightly
  state.rover.signalDbm = Math.min(-58, Math.max(-78, state.rover.signalDbm + (Math.random() > 0.5 ? 1 : -1)));

  // If moving, advance rover along active route
  if (state.rover.moving) {
    const activeRoute = state.site.accessSummary.activeRoute;
    const hasBlockage = state.observations.some(o => o.type === 'BLOCKED_PASSAGE' && !o.resolved);
    
    if (activeRoute === 'APPROACH_ALPHA' && state.rover.currentZone === 'ENTRY') {
      state.rover.currentZone = 'CORRIDOR_NORTH';
      state.rover.coords3D = { x: 0, y: 0.5, z: -10 };
      state.rover.headingDeg = 90;
      state.rover.lidarDistanceM = hasBlockage ? 0.85 : 14.2;
      addTimelineEvent('TELEMETRY', 'Rover Position Update', 'SUGRIV-01 entered Approach Alpha (North Corridor)', 'SIMULATED_SENSOR');
    } else if (activeRoute === 'APPROACH_BRAVO' && (state.rover.currentZone === 'ENTRY' || state.rover.currentZone === 'CORRIDOR_NORTH')) {
      state.rover.currentZone = 'CORRIDOR_SOUTH';
      state.rover.coords3D = { x: 0, y: 0.5, z: 10 };
      state.rover.headingDeg = 90;
      state.rover.lidarDistanceM = 21.4;
      addTimelineEvent('TELEMETRY', 'Rover Position Update', 'SUGRIV-01 traversing Approach Bravo (South Service Passage)', 'SIMULATED_SENSOR');
    } else if (state.rover.currentZone === 'CORRIDOR_SOUTH' || state.rover.currentZone === 'CORRIDOR_NORTH') {
      state.rover.currentZone = 'SEARCH_ZONE';
      state.rover.coords3D = { x: 20, y: 0.5, z: 0 };
      state.rover.headingDeg = 0;
      state.rover.lidarDistanceM = 8.2;
      state.rover.status = 'STANDBY';
      state.rover.moving = false;
      state.rover.speedMps = 0;
      addTimelineEvent('TELEMETRY', 'Waypoint Reached', 'SUGRIV-01 arrived at Sector C Search Zone', 'SIMULATED_SENSOR');
    }
  }

  // Thermal anomaly simulation logic
  if (state.sim.activeScenario === 'THERMAL_SURGE' || state.rover.currentZone === 'SEARCH_ZONE') {
    state.sim.thermalTicks += 1;
    // Gradually ramp spot temperature
    if (state.rover.spotTempC < 118) {
      state.rover.spotTempC = +(state.rover.spotTempC + (state.sim.thermalTicks < 5 ? 7.2 : 12.8)).toFixed(1);
    }
    state.rover.ambientTempC = +(21.5 + (state.rover.spotTempC - 22) * 0.15).toFixed(1);

    // Record temperature reading
    const tempReading = {
      simTime,
      spotTempC: state.rover.spotTempC,
      ambientTempC: state.rover.ambientTempC
    };

    // Check if alert should trigger (sustained temperature > 50°C for >= 3 cycles)
    if (state.rover.spotTempC >= 50.0) {
      let existingAlert = state.alerts.find(a => a.type === 'THERMAL_ANOMALY');
      if (!existingAlert) {
        existingAlert = {
          id: 'alert-therm-01',
          type: 'THERMAL_ANOMALY',
          title: 'Sustained High Thermal Gradient',
          severity: 'HIGH',
          zone: 'SEARCH_ZONE',
          source: 'SIMULATED_SENSOR',
          status: 'ACTIVE_REVIEW', // 'ACTIVE_REVIEW', 'DISMISSED', 'RESOLVED'
          triggeredAt: simTime,
          triggerReason: 'Sustained spot temperature exceeded safety threshold (>50.0°C for >= 3 consecutive cycles) on Narrow-FOV Thermal Radiometer.',
          readings: [
            { simTime: formatSimTime(Math.max(0, state.sim.elapsedSeconds - 2)), temp: 42.1 },
            { simTime: formatSimTime(Math.max(0, state.sim.elapsedSeconds - 1)), temp: 58.4 },
            { simTime, temp: state.rover.spotTempC }
          ],
          affectedZone: 'Sector C Target Area'
        };
        state.alerts.unshift(existingAlert);
        addTimelineEvent(
          'ALERT',
          'Thermal Hazard Alert Generated',
          `Sustained rising spot temp: ${state.rover.spotTempC}°C detected in Search Zone (Review Alert created).`,
          'SIMULATED_SENSOR'
        );
      } else if (existingAlert.status === 'ACTIVE_REVIEW') {
        existingAlert.readings.push({ simTime, temp: state.rover.spotTempC });
        if (existingAlert.readings.length > 8) existingAlert.readings.shift();
      }
    }
  }

  recalculateAccess();
  recalculatePriorities();
}

function startSimLoop() {
  if (simTimer) clearInterval(simTimer);
  simTimer = setInterval(simulationTick, 1000);
}
startSimLoop();

async function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function jsonResponse(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(data));
}

// HTTP Server
createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // -------------------------------------------------------------
  // API ROUTING
  // -------------------------------------------------------------
  if (pathname.startsWith('/api/')) {
    // GET /api/state
    if (request.method === 'GET' && pathname === '/api/state') {
      recalculateAccess();
      recalculatePriorities();
      return jsonResponse(response, 200, { ok: true, state });
    }

    // GET /api/config
    if (request.method === 'GET' && pathname === '/api/config') {
      const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || "";
      return jsonResponse(response, 200, { ok: true, googleMapsApiKey });
    }

    // POST /api/sim/control (play, pause, reset, disconnect, reconnect)
    if (request.method === 'POST' && pathname === '/api/sim/control') {
      const body = await parseBody(request);
      const action = body.action;

      if (action === 'play') {
        state.sim.status = 'RUNNING';
        if (state.rover.connection === 'CONNECTED' && state.rover.status === 'STANDBY') {
          state.rover.status = 'MOVING';
          state.rover.moving = true;
          state.rover.speedMps = 0.45;
        }
        addTimelineEvent('SIM_CONTROL', 'Simulation Started/Resumed', 'Simulation clock and sensor loops active.', 'OPERATOR_INPUT');
      } else if (action === 'pause') {
        state.sim.status = 'PAUSED';
        addTimelineEvent('SIM_CONTROL', 'Simulation Paused', 'Simulation time and scripted events frozen.', 'OPERATOR_INPUT');
      } else if (action === 'reset') {
        state = createInitialState();
        addTimelineEvent('SIM_CONTROL', 'Session Reset', 'All session state, alerts, tasks, overrides, and histories cleared.', 'OPERATOR_INPUT');
      } else if (action === 'disconnect') {
        state.rover.connection = 'DISCONNECTED';
        state.rover.moving = false;
        state.rover.speedMps = 0.0;
        state.rover.isStale = true;
        addTimelineEvent('SIM_CONTROL', 'Rover Connection Lost', 'Telemetry frozen; rover halted; stale telemetry indicators active.', 'SIMULATED_SENSOR');
      } else if (action === 'reconnect') {
        state.rover.connection = 'CONNECTED';
        state.rover.isStale = false;
        // Recovery must resume telemetry without resuming movement
        state.rover.moving = false;
        state.rover.speedMps = 0.0;
        state.rover.status = 'STANDBY';
        addTimelineEvent('SIM_CONTROL', 'Rover Connection Restored', 'Telemetry link restored; movement remains stopped per safety protocol.', 'OPERATOR_INPUT');
      }

      recalculateAccess();
      recalculatePriorities();
      return jsonResponse(response, 200, { ok: true, state });
    }

    // POST /api/sim/trigger (scenario triggers for demonstrator)
    if (request.method === 'POST' && pathname === '/api/sim/trigger') {
      const body = await parseBody(request);
      const event = body.event;
      const simTime = formatSimTime(state.sim.elapsedSeconds);

      if (event === 'start_telemetry') {
        state.sim.status = 'RUNNING';
        state.rover.connection = 'CONNECTED';
        state.rover.status = 'MOVING';
        state.rover.moving = true;
        state.rover.speedMps = 0.45;
        state.rover.isStale = false;
        addTimelineEvent('TELEMETRY', 'Rover Telemetry Started', 'Normal scouting underway towards Approach Alpha.', 'SIMULATED_SENSOR');
      } else if (event === 'trigger_blockage') {
        // Step b: Trigger a blocked-passage observation
        const obsId = 'obs-block-01';
        let obs = state.observations.find(o => o.id === obsId);
        if (!obs) {
          obs = {
            id: obsId,
            type: 'BLOCKED_PASSAGE',
            title: 'Rubble Collapse on Approach Alpha',
            zone: 'CORRIDOR_NORTH',
            approach: 'APPROACH_ALPHA',
            source: 'SIMULATED_SENSOR',
            verification: 'UNCONFIRMED', // Do not automatically confirm!
            timestamp: simTime,
            reading: 'LiDAR Cross-Section Occlusion: 88.5%',
            triggerReason: 'Forward LiDAR rangefinder detected sudden cross-sectional corridor occlusion (>85%) at Waypoint N-2.',
            affectedApproach: 'Approach Alpha (North Corridor Route)',
            resolved: false,
            operatorNote: null
          };
          state.observations.unshift(obs);
          addTimelineEvent(
            'OBSERVATION',
            'Blocked Passage Detected (Unconfirmed)',
            'LiDAR detected 88.5% occlusion on Approach Alpha. Awaiting operator confirmation.',
            'SIMULATED_SENSOR'
          );
        }
      } else if (event === 'trigger_thermal') {
        // Step e: Trigger sustained rising spot temperature in search zone
        state.sim.activeScenario = 'THERMAL_SURGE';
        state.sim.thermalTicks = 0;
        if (state.rover.currentZone !== 'SEARCH_ZONE') {
          state.rover.currentZone = 'SEARCH_ZONE';
        }
        state.rover.spotTempC = 28.5;
        // Create an observation entry as well
        const obsId = 'obs-therm-01';
        let obs = state.observations.find(o => o.id === obsId);
        if (!obs) {
          obs = {
            id: obsId,
            type: 'THERMAL_HOTSPOT',
            title: 'High Thermal Gradient Detected',
            zone: 'SEARCH_ZONE',
            approach: null,
            source: 'SIMULATED_SENSOR',
            verification: 'UNCONFIRMED',
            timestamp: simTime,
            reading: 'Infrared Spot: Rapid rise > 28°C',
            triggerReason: 'Narrow-FOV infrared sensor detected rapid thermal rise above ambient baseline.',
            affectedApproach: 'Sector C Target Area',
            resolved: false,
            operatorNote: null
          };
          state.observations.unshift(obs);
          addTimelineEvent(
            'OBSERVATION',
            'Thermal Anomaly Initiated',
            'Sustained temperature spike triggered in Sector C Search Zone.',
            'SIMULATED_SENSOR'
          );
        }
      }

      recalculateAccess();
      recalculatePriorities();
      return jsonResponse(response, 200, { ok: true, state });
    }

    // POST /api/observation/confirm (Step c: Operator confirms blockage)
    if (request.method === 'POST' && pathname === '/api/observation/confirm') {
      const body = await parseBody(request);
      const obs = state.observations.find(o => o.id === body.id);
      if (!obs) return jsonResponse(response, 404, { ok: false, error: 'Observation not found' });

      obs.verification = 'CONFIRMED';
      obs.confirmedAt = formatSimTime(state.sim.elapsedSeconds);
      obs.operatorNote = body.notes || 'Confirmed by operator visual/telemetry check.';

      addTimelineEvent(
        'CONFIRMATION',
        `Observation Confirmed: ${obs.title}`,
        `Operator confirmed ${obs.id}. Reason: ${obs.operatorNote}`,
        'OPERATOR_INPUT'
      );

      // Step d: Recalculate access immediately upon confirmation!
      recalculateAccess();
      recalculatePriorities();

      addTimelineEvent(
        'ACCESS_UPDATE',
        'Access Recalculated',
        state.site.accessSummary.routingExplanation,
        'SYSTEM'
      );

      return jsonResponse(response, 200, { ok: true, state });
    }

    // POST /api/observation/resolve (Resolving a confirmed blockage updates access)
    if (request.method === 'POST' && pathname === '/api/observation/resolve') {
      const body = await parseBody(request);
      const obs = state.observations.find(o => o.id === body.id);
      if (!obs) return jsonResponse(response, 404, { ok: false, error: 'Observation not found' });

      obs.resolved = true;
      obs.resolvedAt = formatSimTime(state.sim.elapsedSeconds);
      obs.resolutionNotes = body.notes || 'Debris cleared and verified passable.';

      addTimelineEvent(
        'HAZARD_RESOLVED',
        `Obstacle Resolved: ${obs.title}`,
        `Operator marked ${obs.id} as cleared. Corridor access restored.`,
        'OPERATOR_INPUT'
      );

      recalculateAccess();
      recalculatePriorities();

      addTimelineEvent(
        'ACCESS_UPDATE',
        'Access Restored',
        state.site.accessSummary.routingExplanation,
        'SYSTEM'
      );

      return jsonResponse(response, 200, { ok: true, state });
    }

    // POST /api/alert/dismiss (Dismissing does NOT make active sensor condition disappear)
    if (request.method === 'POST' && pathname === '/api/alert/dismiss') {
      const body = await parseBody(request);
      const alert = state.alerts.find(a => a.id === body.id);
      if (!alert) return jsonResponse(response, 404, { ok: false, error: 'Alert not found' });

      alert.status = 'DISMISSED';
      alert.dismissedAt = formatSimTime(state.sim.elapsedSeconds);

      addTimelineEvent(
        'ALERT',
        `Alert Dismissed: ${alert.title}`,
        `Alert ${alert.id} dismissed by operator. Active sensor condition remains hot.`,
        'OPERATOR_INPUT'
      );

      recalculatePriorities();
      return jsonResponse(response, 200, { ok: true, state });
    }

    // POST /api/alert/resolve (Explicitly resolving alert after hazard is neutralized)
    if (request.method === 'POST' && pathname === '/api/alert/resolve') {
      const body = await parseBody(request);
      const alert = state.alerts.find(a => a.id === body.id);
      if (!alert) return jsonResponse(response, 404, { ok: false, error: 'Alert not found' });

      alert.status = 'RESOLVED';
      alert.resolvedAt = formatSimTime(state.sim.elapsedSeconds);
      state.rover.spotTempC = 22.2;
      state.sim.activeScenario = null;

      addTimelineEvent(
        'HAZARD_RESOLVED',
        `Hazard Resolved: ${alert.title}`,
        `Operator marked hazard resolved: ${body.reason || 'Thermal hazard neutralized'}.`,
        'OPERATOR_INPUT'
      );

      recalculatePriorities();
      return jsonResponse(response, 200, { ok: true, state });
    }

    // POST /api/task/assign (Step h: Let operator assign an inspection task)
    if (request.method === 'POST' && pathname === '/api/task/assign') {
      const body = await parseBody(request);
      const { title, targetZone, teamId, linkedHazardId, overrideReason } = body;

      const team = state.teams[teamId];
      if (!team) return jsonResponse(response, 400, { ok: false, error: 'Invalid response team specified' });

      const isOverride = Boolean(overrideReason && overrideReason.trim());
      const taskId = `task-${Date.now().toString().slice(-4)}`;

      const newTask = {
        id: taskId,
        title: title || 'Inspection Task',
        targetZone: targetZone || 'SEARCH_ZONE',
        targetZoneName: state.site.zones[targetZone]?.name || targetZone,
        teamId,
        teamName: team.name,
        linkedHazardId: linkedHazardId || null,
        status: 'ASSIGNED', // 'ASSIGNED', 'COMPLETED'
        assignedAt: formatSimTime(state.sim.elapsedSeconds),
        completedAt: null,
        isOverride,
        overrideReason: isOverride ? overrideReason.trim() : null,
        notes: null
      };

      state.tasks.unshift(newTask);
      team.status = 'ASSIGNED';
      team.currentTaskId = taskId;
      team.currentZone = targetZone;

      addTimelineEvent(
        'TASK_ASSIGNED',
        `Task Assigned: ${newTask.title}`,
        `${team.name} assigned to ${newTask.targetZoneName}.${isOverride ? ` [OPERATOR OVERRIDE: ${overrideReason}]` : ''}`,
        'OPERATOR_INPUT'
      );

      recalculatePriorities();
      return jsonResponse(response, 200, { ok: true, state });
    }

    // POST /api/task/complete (Step i: Complete the task and preserve sequence in timeline)
    // "Completing a task must NOT automatically resolve its linked hazard."
    if (request.method === 'POST' && pathname === '/api/task/complete') {
      const body = await parseBody(request);
      const task = state.tasks.find(t => t.id === body.id);
      if (!task) return jsonResponse(response, 404, { ok: false, error: 'Task not found' });

      task.status = 'COMPLETED';
      task.completedAt = formatSimTime(state.sim.elapsedSeconds);
      task.notes = body.notes || 'Inspection completed on site by team.';

      const team = state.teams[task.teamId];
      if (team) {
        team.status = 'AVAILABLE';
        team.currentTaskId = null;
      }

      addTimelineEvent(
        'TASK_COMPLETED',
        `Task Completed: ${task.title}`,
        `Team completed mission inspection on ${task.targetZoneName}. Note: Linked hazard remains active until verified/resolved separately.`,
        'OPERATOR_INPUT'
      );

      recalculatePriorities();
      return jsonResponse(response, 200, { ok: true, state });
    }

    // POST /api/rover/move
    if (request.method === 'POST' && pathname === '/api/rover/move') {
      const body = await parseBody(request);
      if (state.rover.connection === 'DISCONNECTED') {
        return jsonResponse(response, 400, { ok: false, error: 'Cannot command rover while disconnected' });
      }
      state.rover.status = 'MOVING';
      state.rover.moving = true;
      state.rover.speedMps = 0.45;
      if (body.targetZone) state.rover.targetZone = body.targetZone;

      addTimelineEvent('TELEMETRY', 'Rover Movement Commanded', `Manual command: Advance towards ${body.targetZone || 'target'}`, 'OPERATOR_INPUT');
      return jsonResponse(response, 200, { ok: true, state });
    }

    return jsonResponse(response, 404, { ok: false, error: 'API endpoint not found' });
  }

  // -------------------------------------------------------------
  // STATIC FILE SERVING FOR FRONTEND
  // -------------------------------------------------------------
  try {
    const requested = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const filePath = normalize(join(root, requested));

    if (!filePath.startsWith(root)) throw new Error('Invalid path');
    if (!(await stat(filePath)).isFile()) throw new Error('Not found');

    response.writeHead(200, { 'Content-Type': contentTypes[extname(filePath)] || 'application/octet-stream' });
    response.end(await readFile(filePath));
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`SUGRIV Prototype server running at http://localhost:${port}`);
});
