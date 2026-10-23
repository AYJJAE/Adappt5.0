// ==========================================================================
// SUGRIV Map-First Disaster Command Interface
// Core Application Controller & Live State Engine
// ==========================================================================

import { createSite3D } from './site3d.js';

// Configuration: API Key management
let GOOGLE_MAPS_API_KEY = "";

// 1. Check URL parameters (?key=... or ?gmap_key=...)
try {
  const urlParams = new URLSearchParams(window.location.search);
  const paramKey = urlParams.get('key') || urlParams.get('gmap_key');
  if (paramKey) GOOGLE_MAPS_API_KEY = paramKey.trim();
} catch {}

// 2. Check local config file
if (!GOOGLE_MAPS_API_KEY) {
  try {
    const localConfig = await import('./config.local.js');
    if (localConfig?.config?.googleMapsApiKey && !localConfig.config.googleMapsApiKey.includes('YOUR_')) {
      GOOGLE_MAPS_API_KEY = localConfig.config.googleMapsApiKey.trim();
    }
  } catch {}
}

// 3. Check server config endpoint (/api/config)
if (!GOOGLE_MAPS_API_KEY) {
  try {
    const res = await fetch('/api/config');
    const data = await res.json();
    if (data?.googleMapsApiKey) GOOGLE_MAPS_API_KEY = data.googleMapsApiKey.trim();
  } catch {}
}

function formatSimTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `T+${m}:${s}`;
}

// --------------------------------------------------------------------------
// IN-MEMORY SIMULATION STATE
// --------------------------------------------------------------------------
function createInitialState() {
  return {
    sim: {
      status: 'IDLE', // 'IDLE', 'RUNNING', 'PAUSED'
      elapsedSeconds: 0,
      speedMultiplier: 1,
      activeScenario: null,
      thermalTicks: 0,
      autoDemoRunning: false
    },
    rover: {
      id: 'SUGRIV-01',
      name: 'Sugriv Scout Rover',
      status: 'STANDBY', // 'STANDBY', 'MOVING', 'HOLD'
      connection: 'CONNECTED', // 'CONNECTED', 'DISCONNECTED'
      currentZone: 'ENTRY',
      coords3D: { x: -20, y: 0.5, z: 0 },
      headingDeg: 45,
      moving: false,
      speedMps: 0.0,
      batteryPct: 98.4,
      signalDbm: -63,
      ambientTempC: 21.5,
      spotTempC: 22.0,
      lidarDistanceM: 18.4,
      lastReadingTime: 'T+00:00',
      isStale: false
    },
    incidents: [
      {
        id: 'inc-collapse-01',
        name: 'Station Road Arcade Structural Collapse',
        type: 'COLLAPSE',
        typeName: 'Building Collapse',
        icon: '🏢',
        lat: 19.0988,
        lng: 72.8468,
        schematicPos: { x: 440, y: 270 },
        location: 'Nehru Road, Station Perimeter, Vile Parle East, Mumbai',
        reportTime: 'T-01:45',
        lastUpdate: 'T+00:00',
        severity: 'CRITICAL',
        severityLevel: 4,
        severityLabel: '🔴 CRITICAL (Level 4)',
        verificationStatus: 'UNVERIFIED FIELD REPORT',
        status: 'ACTIVE_SCOUTING',
        statusLabel: 'Active Scouting',
        situationSummary: 'Reported multi-story commercial arcade slab collapse. Ground access along Station Road corridor obstructed. Unmanned scout rover deployed for internal structural reconnaissance.',
        affectedZones: 'Approach Alpha (North Tunnel), Approach Bravo (South Passage), Sector C Target Area',
        assignedTeamId: 'TEAM_VANGUARD',
        assignedTeamName: 'Team Vanguard (Recon & Hazmat)',
        responseStatus: 'ON SCENE',
        roverAssigned: 'SUGRIV-01',
        has3DScene: true,
        dataDisclaimer: 'Simulated sensor observations; unverified structural estimates. No official casualty count confirmed.'
      },
      {
        id: 'inc-flood-02',
        name: 'Milan Subway Flash Inundation',
        type: 'FLOOD',
        typeName: 'Flooding',
        icon: '🌊',
        lat: 19.0892,
        lng: 72.8422,
        schematicPos: { x: 620, y: 170 },
        location: 'Milan Subway Arterial Underpass, Vile Parle / Santacruz Link',
        reportTime: 'T-02:10',
        lastUpdate: 'T-00:20',
        severity: 'HIGH',
        severityLevel: 3,
        severityLabel: '🟠 HIGH (Level 3)',
        verificationStatus: 'ESTIMATED REMOTE DATA',
        status: 'MONITORING',
        statusLabel: 'Monitoring',
        situationSummary: 'Monsoon stormwater runoff inundating subway underpass at +0.9m/hr. Vehicular transit restricted across arterial link.',
        affectedZones: 'Subway Ingress Arterials & Lowland Drain Channels',
        assignedTeamId: 'TEAM_SENTINEL',
        assignedTeamName: 'Team Sentinel (Technical Rescue)',
        responseStatus: 'STAGED',
        roverAssigned: null,
        has3DScene: false,
        dataDisclaimer: 'Remote hydrological estimates only. No rover on site. 3D scene unavailable.'
      },
      {
        id: 'inc-fire-03',
        name: 'WEH Feeder Transformer Fire',
        type: 'FIRE',
        typeName: 'Fire',
        icon: '🔥',
        lat: 19.0945,
        lng: 72.8562,
        schematicPos: { x: 260, y: 440 },
        location: 'Western Express Highway Junction, Vile Parle East, Mumbai',
        reportTime: 'T-00:50',
        lastUpdate: 'T-00:08',
        severity: 'HIGH',
        severityLevel: 3,
        severityLabel: '🟠 HIGH (Level 3)',
        verificationStatus: 'ESTIMATED REMOTE DATA',
        status: 'CONTAINMENT',
        statusLabel: 'Containment',
        situationSummary: 'Electrical substation transformer thermal runaway with heavy toxic smoke plume near domestic airport boundary. Perimeter cordon active.',
        affectedZones: 'WEH Service Road & Feeder Substation Perimeter',
        assignedTeamId: null,
        assignedTeamName: 'Regional Hazmat Cordon Unit',
        responseStatus: 'CONTAINMENT',
        roverAssigned: null,
        has3DScene: false,
        dataDisclaimer: 'Thermal satellite detection; unverified ground confirmation. 3D scene unavailable.'
      },
      {
        id: 'inc-landslide-04',
        name: 'Juhu Scheme Excavation Slope Creep',
        type: 'LANDSLIDE',
        typeName: 'Landslide',
        icon: '⛰️',
        lat: 19.1065,
        lng: 72.8345,
        schematicPos: { x: 740, y: 410 },
        location: 'Juhu Scheme 10th Road Extension, Vile Parle West, Mumbai',
        reportTime: 'T-03:20',
        lastUpdate: 'T-01:10',
        severity: 'MEDIUM',
        severityLevel: 2,
        severityLabel: '🟡 MEDIUM (Level 2)',
        verificationStatus: 'ESTIMATED REMOTE DATA',
        status: 'ASSESSMENT',
        statusLabel: 'Assessment',
        situationSummary: 'Deep excavation retaining wall deformation and soil displacement encroaching upon western service lane. Geotechnical tiltmeters active.',
        affectedZones: 'Western Service Lane & Adjacent Drainage Culvert',
        assignedTeamId: null,
        assignedTeamName: 'Civil Engineering Assessment Squad',
        responseStatus: 'ASSESSMENT',
        roverAssigned: null,
        has3DScene: false,
        dataDisclaimer: 'Sensor tiltmeter estimate; ground verification pending. 3D scene unavailable.'
      },
      {
        id: 'inc-fire-05',
        name: 'Airport Fuel Line Rupture & Flare',
        type: 'FIRE',
        typeName: 'Fire / Hazmat',
        icon: '🔥',
        lat: 19.0915,
        lng: 72.8585,
        schematicPos: { x: 190, y: 520 },
        location: 'Domestic Airport Cargo Gate 4, Vile Parle East, Mumbai',
        reportTime: 'T-00:25',
        lastUpdate: 'T-00:03',
        severity: 'CRITICAL',
        severityLevel: 4,
        severityLabel: '🔴 CRITICAL (Level 4)',
        verificationStatus: 'ESTIMATED REMOTE DATA',
        status: 'CONTAINMENT',
        statusLabel: 'Containment',
        situationSummary: 'Underground pressurized fuel line breach triggering high-intensity surface flare adjacent to perimeter taxiway. Emergency foam suppression units deployed.',
        affectedZones: 'Cargo Access Road & Eastern Perimeter Cordon',
        assignedTeamId: 'TEAM_SENTINEL',
        assignedTeamName: 'Team Sentinel (Technical Rescue)',
        responseStatus: 'ON SCENE',
        roverAssigned: null,
        has3DScene: false,
        dataDisclaimer: 'Emergency beacon trigger; sensor verification in progress. 3D scene unavailable.'
      },
      {
        id: 'inc-collapse-06',
        name: 'Parleshwar Footbridge Truss Failure',
        type: 'COLLAPSE',
        typeName: 'Building Collapse',
        icon: '🏗️',
        lat: 19.1030,
        lng: 72.8455,
        schematicPos: { x: 470, y: 140 },
        location: 'Parleshwar Overbridge, Western Railway Line, Vile Parle East',
        reportTime: 'T-01:10',
        lastUpdate: 'T-00:15',
        severity: 'HIGH',
        severityLevel: 3,
        severityLabel: '🟠 HIGH (Level 3)',
        verificationStatus: 'UNVERIFIED FIELD REPORT',
        status: 'ASSESSMENT',
        statusLabel: 'Assessment',
        situationSummary: 'Structural fatigue failure along pedestrian transit truss. Deck misalignment detected by railway strain gauges. Ingress sealed.',
        affectedZones: 'Footbridge East Approach & Platform Stairway 2',
        assignedTeamId: null,
        assignedTeamName: 'Civil Engineering Assessment Squad',
        responseStatus: 'ASSESSMENT',
        roverAssigned: null,
        has3DScene: false,
        dataDisclaimer: 'Railway strain sensor telemetry; field verification staged. 3D scene unavailable.'
      },
      {
        id: 'inc-flood-07',
        name: 'Irla Nullah Culvert Overflow Breach',
        type: 'FLOOD',
        typeName: 'Flooding',
        icon: '🌊',
        lat: 19.1010,
        lng: 72.8390,
        schematicPos: { x: 570, y: 340 },
        location: 'Irla Bridge Culvert, Vile Parle West, Mumbai',
        reportTime: 'T-01:30',
        lastUpdate: 'T-00:12',
        severity: 'HIGH',
        severityLevel: 3,
        severityLabel: '🟠 HIGH (Level 3)',
        verificationStatus: 'ESTIMATED REMOTE DATA',
        status: 'MONITORING',
        statusLabel: 'Monitoring',
        situationSummary: 'Debris buildup in tidal culvert generating 0.7m backflow inundation across market lanes. High-capacity dewatering pumps en route.',
        affectedZones: 'Irla Market Approach Lanes 1 & 3',
        assignedTeamId: 'TEAM_VANGUARD',
        assignedTeamName: 'Team Vanguard (Recon & Hazmat)',
        responseStatus: 'STAGED',
        roverAssigned: null,
        has3DScene: false,
        dataDisclaimer: 'Hydrological gauge telemetry; remote assessment only. 3D scene unavailable.'
      },
      {
        id: 'inc-landslide-08',
        name: 'Bamanwada Retaining Wall Subsidence',
        type: 'LANDSLIDE',
        typeName: 'Landslide',
        icon: '⛰️',
        lat: 19.0965,
        lng: 72.8520,
        schematicPos: { x: 330, y: 350 },
        location: 'Bamanwada Hillock Perimeter, Vile Parle East, Mumbai',
        reportTime: 'T-02:40',
        lastUpdate: 'T-00:45',
        severity: 'MEDIUM',
        severityLevel: 2,
        severityLabel: '🟡 MEDIUM (Level 2)',
        verificationStatus: 'ESTIMATED REMOTE DATA',
        status: 'ASSESSMENT',
        statusLabel: 'Assessment',
        situationSummary: 'Soil saturation causing 15m masonry retaining wall deflection onto access lane. Geological tilt sensors active.',
        affectedZones: 'Hillock Service Lane North',
        assignedTeamId: null,
        assignedTeamName: 'Civil Engineering Assessment Squad',
        responseStatus: 'ASSESSMENT',
        roverAssigned: null,
        has3DScene: false,
        dataDisclaimer: 'Geotechnical tilt sensor estimate; ground inspection pending. 3D scene unavailable.'
      }
    ],
    site: {
      zones: {
        ENTRY: { id: 'ENTRY', name: 'Alpha Gate', tag: 'Entry Point (Staging)', type: 'staging' },
        CORRIDOR_NORTH: { id: 'CORRIDOR_NORTH', name: 'Approach Alpha', tag: 'North Corridor', type: 'approach' },
        CORRIDOR_SOUTH: { id: 'CORRIDOR_SOUTH', name: 'Approach Bravo', tag: 'South Bypass Passage', type: 'approach' },
        SEARCH_ZONE: { id: 'SEARCH_ZONE', name: 'Sector C', tag: 'Primary Search Zone', type: 'target' }
      },
      approaches: {
        APPROACH_ALPHA: {
          id: 'APPROACH_ALPHA',
          name: 'Approach Alpha',
          label: 'North Tunnel Route',
          status: 'CLEAR',
          distanceM: 45,
          statusReason: 'Open corridor, optimal direct path (45m).'
        },
        APPROACH_BRAVO: {
          id: 'APPROACH_BRAVO',
          name: 'Approach Bravo',
          label: 'South Service Passage',
          status: 'CLEAR',
          distanceM: 70,
          statusReason: 'Clear alternate approach corridor (70m).'
        }
      },
      accessSummary: {
        activeRoute: 'APPROACH_ALPHA',
        routingExplanation: 'Approach Alpha is unobstructed and represents the shortest route (45m).'
      }
    },
    teams: {
      TEAM_VANGUARD: {
        id: 'TEAM_VANGUARD',
        name: 'Team Vanguard',
        role: 'Recon & Hazmat Specialists',
        status: 'AVAILABLE',
        currentZone: 'ENTRY',
        currentTaskId: null
      },
      TEAM_SENTINEL: {
        id: 'TEAM_SENTINEL',
        name: 'Team Sentinel',
        role: 'Technical Rescue & Obstacle Clearance',
        status: 'AVAILABLE',
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
        title: 'Disaster Command System Online',
        detail: 'Regional incident monitoring initiated. Server memory operational session active.',
        source: 'SYSTEM'
      }
    ]
  };
}

let state = createInitialState();
let selectedIncident = state.incidents[0]; // Default selected is Building Collapse
let currentFilterType = 'ALL';
let currentFilterSeverity = 'ALL';
let currentFilterStatus = 'ALL';

let simInterval = null;
let toastTimeout = null;

// 3D Scene Controller Instance
let site3D = null;
let is3DViewOpen = false;

// Google Maps Instance
let gMap = null;
let gMapMarkers = [];

// DOM References
const simClock = document.querySelector('#sim-clock');
const filterType = document.querySelector('#filter-type');
const filterSeverity = document.querySelector('#filter-severity');
const filterStatus = document.querySelector('#filter-status');
const incidentsSummaryPill = document.querySelector('#incidents-summary-pill');

// Views & Zoom Controls
const mapViewCanvas = document.querySelector('#map-view-canvas');
const googleMapCanvas = document.querySelector('#google-map-canvas');
const schematicMapFallback = document.querySelector('#schematic-map-fallback');
const schematicRegionalSvg = document.querySelector('#schematic-regional-svg');
const schematicIncidentPins = document.querySelector('#schematic-incident-pins');
const btnZoomIn = document.querySelector('#btn-zoom-in');
const btnZoomOut = document.querySelector('#btn-zoom-out');
const btnZoomReset = document.querySelector('#btn-zoom-reset');

// Side Panel
const incidentSidePanel = document.querySelector('#incident-side-panel');
const btnCloseSidePanel = document.querySelector('#btn-close-side-panel');
const panelIncidentType = document.querySelector('#panel-incident-type');
const panelIncidentName = document.querySelector('#panel-incident-name');
const panelSeverity = document.querySelector('#panel-severity');
const panelVerification = document.querySelector('#panel-verification');
const panelStatus = document.querySelector('#panel-status');
const panelLocation = document.querySelector('#panel-location');
const panelReportTime = document.querySelector('#panel-report-time');
const panelLastUpdate = document.querySelector('#panel-last-update');
const panelSummary = document.querySelector('#panel-summary');
const panelDisclaimer = document.querySelector('#panel-disclaimer');
const panelAffected = document.querySelector('#panel-affected');
const panelTeamName = document.querySelector('#panel-team-name');
const panelTeamStatus = document.querySelector('#panel-team-status');
const panelRoverConn = document.querySelector('#panel-rover-conn');
const panelRoverId = document.querySelector('#panel-rover-id');
const panelRoverZone = document.querySelector('#panel-rover-zone');
const panelRoverTemp = document.querySelector('#panel-rover-temp');
const panelRoverLidar = document.querySelector('#panel-rover-lidar');
const btnOpen3DSite = document.querySelector('#btn-open-3d-site');
const site3DUnavailableMsg = document.querySelector('#site-3d-unavailable-msg');

// 3D Viewport
const site3DView = document.querySelector('#site-3d-view');
const btnReturnToMap = document.querySelector('#btn-return-to-map');
const btnFloatingBackToMap = document.querySelector('#btn-floating-back-to-map');
const btnCamOrbit = document.querySelector('#btn-cam-orbit');
const btnCamRover = document.querySelector('#btn-cam-rover');
const btnCamFollow = document.querySelector('#btn-cam-follow');
const followStateText = document.querySelector('#follow-state-text');
const btnCamReset = document.querySelector('#btn-cam-reset');
const threeContainer = document.querySelector('#three-container');
const roverHudOverlay = document.querySelector('#rover-hud-overlay');
const hudSpotTemp = document.querySelector('#hud-spot-temp');
const hudLidarRange = document.querySelector('#hud-lidar-range');
const hudConnHealth = document.querySelector('#hud-conn-health');
const hudSimTime = document.querySelector('#hud-sim-time');

const threeObjectFlyout = document.querySelector('#three-object-flyout');
const flyoutTitle = document.querySelector('#flyout-title');
const flyoutContent = document.querySelector('#flyout-content');
const btnCloseFlyout = document.querySelector('#btn-close-flyout');

// 3D Dock Columns
const dockActiveRoute = document.querySelector('#dock-active-route');
const dockObservationsList = document.querySelector('#dock-observations-list');
const dockPrioritiesList = document.querySelector('#dock-priorities-list');
const dockTasksList = document.querySelector('#dock-tasks-list');

// Demo Dock
const demoDockCard = document.querySelector('#demo-dock-card');
const btnToggleDemoDock = document.querySelector('#btn-toggle-demo-dock');
const btnCollapseDock = document.querySelector('#btn-collapse-dock');
const btnStep1 = document.querySelector('#btn-step-1');
const btnStep2 = document.querySelector('#btn-step-2');
const btnStep3 = document.querySelector('#btn-step-3');
const btnAutoDemo = document.querySelector('#btn-auto-demo');
const btnPlayPause = document.querySelector('#btn-play-pause');
const btnToggleConn = document.querySelector('#btn-toggle-conn');
const btnReset = document.querySelector('#btn-reset');
const spd1x = document.querySelector('#spd-1x');
const spd2x = document.querySelector('#spd-2x');
const spd5x = document.querySelector('#spd-5x');

// Modals
const assignTaskDialog = document.querySelector('#assign-task-dialog');
const assignTaskForm = document.querySelector('#assign-task-form');
const taskTitleInput = document.querySelector('#task-title-input');
const taskZoneSelect = document.querySelector('#task-zone-select');
const taskTeamSelect = document.querySelector('#task-team-select');
const taskOverrideInput = document.querySelector('#task-override-input');
const btnCloseModal = document.querySelector('#btn-close-modal');
const btnCancelTask = document.querySelector('#btn-cancel-task');

const actionDialog = document.querySelector('#action-dialog');
const actionForm = document.querySelector('#action-form');
const actionDialogTitle = document.querySelector('#action-dialog-title');
const actionDialogDesc = document.querySelector('#action-dialog-desc');
const actionNotesInput = document.querySelector('#action-notes-input');
const btnCloseAction = document.querySelector('#btn-close-action');
const btnCancelAction = document.querySelector('#btn-cancel-action');
let activeActionConfig = null;

// Toast
const toastBox = document.querySelector('#toast-box');
const toastTitle = document.querySelector('#toast-title');
const toastMsg = document.querySelector('#toast-msg');

function showToast(title, msg) {
  toastTitle.textContent = title;
  toastMsg.textContent = msg;
  toastBox.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toastBox.classList.remove('show'), 3200);
}

// --------------------------------------------------------------------------
// GOOGLE MAPS / SCHEMATIC FALLBACK INITIALIZATION
// --------------------------------------------------------------------------
const DARK_TACTICAL_MAP_STYLE = [
  { "elementType": "geometry", "stylers": [{ "color": "#090e13" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#090e13" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#8b949e" }] },
  { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#58a6ff" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#79c0ff" }] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#111a24" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#182635" }] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#213348" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#233951" }] },
  { "featureType": "transit", "elementType": "geometry", "stylers": [{ "color": "#14202d" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#05080d" }] }
];

// Register global Google Maps auth failure hook immediately
window.gm_authFailure = function() {
  console.warn('[SUGRIV] Google Maps Authentication Failed (gm_authFailure triggered). Falling back to Tactical Schematic Map.');
  showSchematicFallback('Google Maps API key rejected or Maps JavaScript API not enabled. Active: Tactical Schematic Map.');
  showToast('Maps Auth Error', 'Falling back to Tactical Schematic Map');
};

let currentMapMode = 'GOOGLE';
const btnToggleMapMode = document.querySelector('#btn-toggle-map-mode');
const schematicBannerDesc = document.querySelector('#schematic-banner-desc');

function initMapExperience() {
  const btnConfigApiKey = document.querySelector('#btn-config-api-key');
  const apiKeyDialog = document.querySelector('#api-key-dialog');
  const apiKeyForm = document.querySelector('#api-key-form');
  const inputGmapsKey = document.querySelector('#input-gmaps-key');
  const btnCloseKeyDialog = document.querySelector('#btn-close-key-dialog');
  const btnCancelKeyDialog = document.querySelector('#btn-cancel-key-dialog');

  if (btnConfigApiKey && apiKeyDialog) {
    btnConfigApiKey.addEventListener('click', () => {
      if (inputGmapsKey) inputGmapsKey.value = GOOGLE_MAPS_API_KEY || '';
      apiKeyDialog.showModal();
    });
  }

  if (btnCloseKeyDialog && apiKeyDialog) {
    btnCloseKeyDialog.addEventListener('click', () => apiKeyDialog.close());
  }

  if (btnCancelKeyDialog && apiKeyDialog) {
    btnCancelKeyDialog.addEventListener('click', () => apiKeyDialog.close());
  }

  if (apiKeyForm && apiKeyDialog) {
    apiKeyForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const newKey = inputGmapsKey?.value?.trim() || '';
      apiKeyDialog.close();

      if (!newKey) {
        GOOGLE_MAPS_API_KEY = '';
        showToast('Key Cleared', 'Switched to Tactical Schematic Map');
        showSchematicFallback('Google Maps API key omitted. Active: Tactical Schematic Map.');
        return;
      }

      GOOGLE_MAPS_API_KEY = newKey;
      showToast('Key Applied', 'Attempting to load Google Maps...');
      loadGoogleMaps(GOOGLE_MAPS_API_KEY);
    });
  }

  if (btnToggleMapMode) {
    btnToggleMapMode.addEventListener('click', () => {
      if (currentMapMode === 'SCHEMATIC') {
        showGoogleMap();
      } else {
        showSchematicFallback('Tactical Schematic Map selected by operator.');
      }
    });
  }

  if (GOOGLE_MAPS_API_KEY && GOOGLE_MAPS_API_KEY.length > 10) {
    loadGoogleMaps(GOOGLE_MAPS_API_KEY);
  } else {
    showSchematicFallback('Google Maps API key not configured. Active: Tactical Schematic Map.');
  }
}

function showSchematicFallback(reason = 'Tactical Schematic Map Active.') {
  currentMapMode = 'SCHEMATIC';
  googleMapCanvas.classList.add('hidden');
  schematicMapFallback.classList.remove('hidden');
  if (schematicBannerDesc) {
    schematicBannerDesc.textContent = reason;
  }
  if (btnToggleMapMode) {
    btnToggleMapMode.textContent = '🗺️ Try Google Maps';
    btnToggleMapMode.title = 'Switch back to Google Maps';
  }
  renderSchematicPins();
}

function showGoogleMap() {
  if (!GOOGLE_MAPS_API_KEY) {
    showToast('No API Key', 'Google Maps API key is not configured.');
    return;
  }
  currentMapMode = 'GOOGLE';
  schematicMapFallback.classList.add('hidden');
  googleMapCanvas.classList.remove('hidden');
  if (btnToggleMapMode) {
    btnToggleMapMode.textContent = '🗺️ Switch to Schematic';
    btnToggleMapMode.title = 'Switch to Tactical Schematic fallback map';
  }

  if (gMap) {
    google.maps.event.trigger(gMap, 'resize');
    if (selectedIncident && selectedIncident.lat && selectedIncident.lng) {
      gMap.panTo({ lat: selectedIncident.lat, lng: selectedIncident.lng });
    }
    renderGoogleMapsPins();
  } else {
    loadGoogleMaps(GOOGLE_MAPS_API_KEY);
  }
}

function loadGoogleMaps(apiKey) {
  let keyToUse = apiKey.trim();
  // Fix common typo if copied with lowercase 'l' instead of uppercase 'I'
  if (keyToUse.startsWith('AlzaSy')) {
    keyToUse = 'AIzaSy' + keyToUse.slice(6);
  }

  if (window.google && window.google.maps) {
    onGoogleMapsReady();
    return;
  }
  window.onGoogleMapsReady = onGoogleMapsReady;
  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(keyToUse)}&callback=onGoogleMapsReady`;
  script.async = true;
  script.defer = true;
  script.onerror = () => {
    console.warn('Google Maps script failed to load. Falling back to schematic map.');
    showSchematicFallback('Google Maps script network request failed. Active: Tactical Schematic Map.');
  };
  document.head.appendChild(script);
}

function onGoogleMapsReady() {
  try {
    currentMapMode = 'GOOGLE';
    schematicMapFallback.classList.add('hidden');
    googleMapCanvas.classList.remove('hidden');

    gMap = new google.maps.Map(googleMapCanvas, {
      zoom: 14,
      center: { lat: 19.0998, lng: 72.8441 },
      mapTypeId: 'roadmap',
      styles: DARK_TACTICAL_MAP_STYLE,
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false
    });

    renderGoogleMapsPins();
    monitorGoogleMapsErrors();
  } catch (err) {
    console.warn('Google Maps initialization failed:', err);
    showSchematicFallback('Google Maps initialization failed. Active: Tactical Schematic Map.');
  }
}

function monitorGoogleMapsErrors() {
  // MutationObserver to catch immediate DOM error injection from Google Maps
  const errorObserver = new MutationObserver(() => {
    const hasErrContainer = googleMapCanvas.querySelector('.gm-err-container') ||
      googleMapCanvas.querySelector('.gm-err-message');
    const hasErrText = googleMapCanvas.textContent && 
      (googleMapCanvas.textContent.includes("This page didn't load Google Maps correctly") ||
       googleMapCanvas.textContent.includes("Google Maps JavaScript API error"));
    if (hasErrContainer || hasErrText) {
      console.warn('[SUGRIV] Google Maps error dialog detected in DOM. Auto-falling back to Tactical Schematic Map.');
      errorObserver.disconnect();
      showSchematicFallback('Google Maps could not authenticate (Invalid Key / Referer / API Disabled). Active: Tactical Schematic Map.');
      showToast('Maps Error', 'Switched to Tactical Schematic Map');
    }
  });
  errorObserver.observe(googleMapCanvas, { childList: true, subtree: true, characterData: true });

  // Fallback timeout check
  setTimeout(() => {
    if (currentMapMode === 'GOOGLE') {
      const hasErrContainer = googleMapCanvas.querySelector('.gm-err-container') ||
        googleMapCanvas.querySelector('.gm-err-message');
      const hasErrText = googleMapCanvas.textContent && 
        googleMapCanvas.textContent.includes("This page didn't load Google Maps correctly");
      if (hasErrContainer || hasErrText) {
        console.warn('[SUGRIV] Delayed check detected Google Maps error. Auto-falling back.');
        showSchematicFallback('Google Maps could not authenticate. Active: Tactical Schematic Map.');
      }
    }
    errorObserver.disconnect();
  }, 2500);
}

function getFilteredIncidents() {
  return state.incidents.filter(inc => {
    const matchType = currentFilterType === 'ALL' || inc.type === currentFilterType;
    const matchSeverity = currentFilterSeverity === 'ALL' || inc.severity === currentFilterSeverity;
    const matchStatus = currentFilterStatus === 'ALL' || inc.status === currentFilterStatus;
    return matchType && matchSeverity && matchStatus;
  });
}

function renderGoogleMapsPins() {
  if (!gMap) return;

  gMapMarkers.forEach(m => m.setMap(null));
  gMapMarkers = [];

  const filtered = getFilteredIncidents();
  incidentsSummaryPill.textContent = `${filtered.length} Fictional Incidents Displayed`;

  filtered.forEach(inc => {
    const isSelected = selectedIncident && selectedIncident.id === inc.id;
    const marker = new google.maps.Marker({
      position: { lat: inc.lat, lng: inc.lng },
      map: gMap,
      title: inc.name,
      zIndex: isSelected ? 999 : 1,
      label: {
        text: inc.icon,
        fontSize: isSelected ? '24px' : '18px'
      }
    });

    marker.incidentId = inc.id;

    marker.addListener('click', () => {
      selectIncident(inc);
    });

    gMapMarkers.push(marker);
  });
}

function renderSchematicPins() {
  if (!schematicIncidentPins) return;
  const filtered = getFilteredIncidents();
  incidentsSummaryPill.textContent = `${filtered.length} Fictional Incidents Displayed (Schematic)`;

  let html = '';
  filtered.forEach(inc => {
    const isSelected = selectedIncident && selectedIncident.id === inc.id;
    const col = inc.severity === 'CRITICAL' ? '#f85149' : (inc.severity === 'HIGH' ? '#d29922' : '#e3b341');

    html += `
      <g class="schematic-pin ${isSelected ? 'is-selected' : ''}" data-id="${inc.id}" transform="translate(${inc.schematicPos.x}, ${inc.schematicPos.y})">
        <circle class="ring" cx="0" cy="0" r="14" fill="${col}" opacity="0.3" />
        <circle class="pin-circle" cx="0" cy="0" r="14" fill="#111a24" stroke="${col}" stroke-width="${isSelected ? '3.5' : '1.5'}" />
        <text x="0" y="5" text-anchor="middle" font-size="14">${inc.icon}</text>
        <rect x="-60" y="18" width="120" height="20" rx="3" fill="rgba(17,26,36,0.92)" stroke="#243548" />
        <text x="0" y="32" text-anchor="middle" fill="#fff" font-size="9" font-weight="700">${inc.typeName}</text>
      </g>
    `;
  });

  schematicIncidentPins.innerHTML = html;

  schematicIncidentPins.querySelectorAll('.schematic-pin').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const inc = state.incidents.find(i => i.id === el.dataset.id);
      if (inc) selectIncident(inc);
    });
  });
}

function updatePinSelectionUI() {
  if (schematicIncidentPins) {
    schematicIncidentPins.querySelectorAll('.schematic-pin').forEach(el => {
      const isSel = selectedIncident && el.dataset.id === selectedIncident.id;
      el.classList.toggle('is-selected', isSel);
      const circle = el.querySelector('.pin-circle');
      if (circle) {
        circle.setAttribute('stroke-width', isSel ? '3.5' : '1.5');
      }
    });
  }

  if (gMapMarkers && gMapMarkers.length > 0) {
    gMapMarkers.forEach(m => {
      const isSel = selectedIncident && m.incidentId === selectedIncident.id;
      if (m.setZIndex) m.setZIndex(isSel ? 999 : 1);
    });
  }
}

// --------------------------------------------------------------------------
// MAP ZOOM & PAN CONTROLS (Google Maps & Tactical Schematic SVG)
// --------------------------------------------------------------------------
let schematicZoom = 1.0;
let schematicPanX = 0;
let schematicPanY = 0;
let isPanningSchematic = false;
let panStartX = 0;
let panStartY = 0;

function applySchematicTransform() {
  if (!schematicRegionalSvg) return;
  schematicZoom = Math.max(0.6, Math.min(4.5, schematicZoom));
  const w = 1000 / schematicZoom;
  const h = 600 / schematicZoom;
  const cx = 500 - schematicPanX;
  const cy = 300 - schematicPanY;
  const minX = cx - w / 2;
  const minY = cy - h / 2;
  schematicRegionalSvg.setAttribute('viewBox', `${minX} ${minY} ${w} ${h}`);
}

function zoomIn() {
  if (gMap && !googleMapCanvas.classList.contains('hidden')) {
    gMap.setZoom(gMap.getZoom() + 1);
  } else {
    schematicZoom *= 1.25;
    applySchematicTransform();
  }
}

function zoomOut() {
  if (gMap && !googleMapCanvas.classList.contains('hidden')) {
    gMap.setZoom(gMap.getZoom() - 1);
  } else {
    schematicZoom /= 1.25;
    applySchematicTransform();
  }
}

function resetZoom() {
  if (gMap && !googleMapCanvas.classList.contains('hidden')) {
    gMap.setZoom(14);
    gMap.setCenter({ lat: 19.0998, lng: 72.8441 });
  }
  schematicZoom = 1.0;
  schematicPanX = 0;
  schematicPanY = 0;
  applySchematicTransform();
}

// Interactive Wheel Zoom & Click-and-Drag Pan on Tactical SVG Map
if (schematicRegionalSvg) {
  schematicRegionalSvg.style.cursor = 'grab';

  schematicRegionalSvg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.87;
    schematicZoom *= factor;
    applySchematicTransform();
  }, { passive: false });

  schematicRegionalSvg.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('.schematic-pin')) return;
    isPanningSchematic = true;
    panStartX = e.clientX;
    panStartY = e.clientY;
    schematicRegionalSvg.style.cursor = 'grabbing';
  });

  window.addEventListener('mousemove', (e) => {
    if (!isPanningSchematic) return;
    const dx = (e.clientX - panStartX) / schematicZoom;
    const dy = (e.clientY - panStartY) / schematicZoom;
    panStartX = e.clientX;
    panStartY = e.clientY;
    schematicPanX += dx;
    schematicPanY += dy;
    applySchematicTransform();
  });

  window.addEventListener('mouseup', () => {
    if (isPanningSchematic) {
      isPanningSchematic = false;
      if (schematicRegionalSvg) schematicRegionalSvg.style.cursor = 'grab';
    }
  });
}

// --------------------------------------------------------------------------
// INCIDENT SELECTION & SIDE PANEL
// --------------------------------------------------------------------------
function selectIncident(inc) {
  selectedIncident = inc;
  renderIncidentPanel(inc);
  incidentSidePanel.classList.remove('closed');

  if (gMap && inc.lat && inc.lng) {
    gMap.panTo({ lat: inc.lat, lng: inc.lng });
  }

  if (inc.schematicPos && schematicMapFallback && !schematicMapFallback.classList.contains('hidden')) {
    if (schematicZoom > 1.0) {
      schematicPanX = 500 - inc.schematicPos.x;
      schematicPanY = 300 - inc.schematicPos.y;
      applySchematicTransform();
    }
  }

  // Smooth UI highlight without recreating DOM nodes
  updatePinSelectionUI();
}

function renderIncidentPanel(inc) {
  if (!inc) return;

  panelIncidentType.textContent = inc.typeName;
  panelIncidentName.textContent = inc.name;

  panelSeverity.textContent = inc.severityLabel;
  panelSeverity.className = `badge-severity ${inc.severity.toLowerCase()}`;

  panelVerification.textContent = inc.verificationStatus;
  panelStatus.textContent = inc.statusLabel;

  panelLocation.textContent = inc.location;
  panelReportTime.textContent = inc.reportTime;
  panelLastUpdate.textContent = inc.lastUpdate;
  panelSummary.textContent = inc.situationSummary;
  panelDisclaimer.textContent = `⚠ ${inc.dataDisclaimer}`;
  panelAffected.textContent = inc.affectedZones;

  panelTeamName.textContent = inc.assignedTeamName || 'Unassigned';
  panelTeamStatus.textContent = inc.responseStatus;

  if (inc.roverAssigned) {
    panelRoverConn.textContent = state.rover.connection;
    panelRoverConn.className = `conn-pill ${state.rover.connection === 'CONNECTED' ? '' : 'disconnected'}`;
    panelRoverId.textContent = state.rover.id;
    panelRoverZone.textContent = state.site.zones[state.rover.currentZone]?.name || state.rover.currentZone;
    panelRoverTemp.textContent = `${state.rover.spotTempC.toFixed(1)} °C`;
    panelRoverLidar.textContent = `${state.rover.lidarDistanceM.toFixed(1)} m`;
  } else {
    panelRoverConn.textContent = 'NO ROVER';
    panelRoverConn.className = 'conn-pill disconnected';
    panelRoverId.textContent = 'None';
    panelRoverZone.textContent = '—';
    panelRoverTemp.textContent = '—';
    panelRoverLidar.textContent = '—';
  }

  // 3D Scene Action availability
  if (inc.has3DScene) {
    btnOpen3DSite.classList.remove('hidden');
    site3DUnavailableMsg.classList.add('hidden');
  } else {
    btnOpen3DSite.classList.add('hidden');
    site3DUnavailableMsg.classList.remove('hidden');
  }
}

// --------------------------------------------------------------------------
// 3D SITE VIEW (THREE.JS INTEGRATION)
// --------------------------------------------------------------------------
function open3DSiteView() {
  if (!selectedIncident || !selectedIncident.has3DScene) return;

  is3DViewOpen = true;
  site3DView.classList.remove('hidden');
  document.body.classList.remove('mode-map');
  document.body.classList.add('mode-3d');

  if (!site3D) {
    site3D = createSite3D(threeContainer, {
      onObjectClick: handle3DObjectClick
    });
  }

  site3D.updateFromState(state);
  site3D.resize();
  render3DDock();
  showToast('3D Site View Opened', 'Interactive 3D reconstruction for building-collapse active.');
}

function close3DSiteView() {
  is3DViewOpen = false;
  site3DView.classList.add('hidden');
  document.body.classList.remove('mode-3d');
  document.body.classList.add('mode-map');
  threeObjectFlyout.classList.add('hidden');
}

function handle3DObjectClick(objData) {
  threeObjectFlyout.classList.remove('hidden');
  flyoutTitle.textContent = objData.name || 'Object Details';

  let html = '';
  if (objData.isZone) {
    const zone = state.site.zones[objData.id];
    html += `
      <div><b>Type:</b> Search Zone (${objData.tag})</div>
      <div><b>Access Status:</b> ${objData.id === 'CORRIDOR_NORTH' && state.site.approaches.APPROACH_ALPHA.status === 'BLOCKED' ? 'BLOCKED' : 'CLEAR'}</div>
      <div><b>Rover Position:</b> ${state.rover.currentZone === objData.id ? 'Present (SUGRIV-01)' : 'Not in zone'}</div>
      <div><b>Assigned Tasks:</b> ${state.tasks.filter(t => t.targetZone === objData.id && t.status === 'ASSIGNED').length} active</div>
    `;
  } else if (objData.isHazard) {
    html += `
      <div><b>Hazard Type:</b> ${objData.type}</div>
      <div><b>Timestamp:</b> ${formatSimTime(state.sim.elapsedSeconds)}</div>
      <div><b>Verification:</b> Verified by Forward Telemetry</div>
      <div><b>Risk Assessment:</b> High Priority Investigation Required</div>
    `;
  }

  flyoutContent.innerHTML = html;
}

function render3DDock() {
  const s = state;

  // Active Route
  dockActiveRoute.textContent = s.site.accessSummary.activeRoute === 'APPROACH_ALPHA' 
    ? 'VIA ALPHA (PRIMARY)' 
    : 'VIA BRAVO (BYPASS)';

  // Observations List
  const activeObs = s.observations.filter(o => !o.resolved);
  if (activeObs.length === 0) {
    dockObservationsList.innerHTML = `<div class="empty-state">No unverified observations. Path clear.</div>`;
  } else {
    dockObservationsList.innerHTML = activeObs.map(obs => `
      <article class="item-card ${obs.verification === 'CONFIRMED' ? 'confirmed' : 'unconfirmed'}">
        <div class="item-top">
          <strong class="item-title">${obs.title}</strong>
          <span class="item-badge ${obs.verification.toLowerCase()}">${obs.verification}</span>
        </div>
        <div class="item-reason">${obs.triggerReason}</div>
        <div class="item-actions">
          ${obs.verification === 'UNCONFIRMED' ? `
            <button class="btn btn-xs btn-primary btn-confirm-obs" data-id="${obs.id}">✓ Confirm</button>
          ` : `
            <button class="btn btn-xs btn-outline btn-resolve-obs" data-id="${obs.id}">Clear Rubble</button>
          `}
        </div>
      </article>
    `).join('');

    dockObservationsList.querySelectorAll('.btn-confirm-obs').forEach(btn => {
      btn.addEventListener('click', () => confirmBlockageObservation(btn.dataset.id));
    });
    dockObservationsList.querySelectorAll('.btn-resolve-obs').forEach(btn => {
      btn.addEventListener('click', () => {
        openActionDialog('Clear Rubble', 'Confirm obstacle removal on Approach Alpha:', (notes) => {
          resolveBlockageObservation(btn.dataset.id, notes);
        });
      });
    });
  }

  // Priorities List (Decoupled from Access!)
  if (!s.priorities || s.priorities.length === 0) {
    dockPrioritiesList.innerHTML = `<div class="empty-state">No urgent investigation tasks prioritized.</div>`;
  } else {
    dockPrioritiesList.innerHTML = s.priorities.map(p => `
      <article class="item-card">
        <div class="item-top">
          <strong class="item-title">Priority #${p.rank}: ${p.title}</strong>
          <span class="item-badge high">${p.urgency}</span>
        </div>
        <div class="item-reason">${p.rationale}</div>
        <div class="item-actions">
          <button class="btn btn-xs ${p.assigned ? 'btn-outline' : 'btn-primary'} btn-dock-assign-prio"
            data-zone="${p.zone}" data-title="${p.title}" data-team="${p.recommendedTeam || 'TEAM_VANGUARD'}"
            ${p.assigned ? 'disabled' : ''}>
            ${p.assigned ? '✓ Assigned' : 'Assign Task'}
          </button>
        </div>
      </article>
    `).join('');

    dockPrioritiesList.querySelectorAll('.btn-dock-assign-prio').forEach(btn => {
      btn.addEventListener('click', () => {
        taskTitleInput.value = btn.dataset.title;
        taskZoneSelect.value = btn.dataset.zone;
        taskTeamSelect.value = btn.dataset.team;
        taskOverrideInput.value = '';
        assignTaskDialog.showModal();
      });
    });
  }

  // Tasks List
  if (!s.tasks || s.tasks.length === 0) {
    dockTasksList.innerHTML = `<div class="empty-state">No active field tasks assigned.</div>`;
  } else {
    dockTasksList.innerHTML = s.tasks.map(t => `
      <article class="item-card">
        <div class="item-top">
          <strong class="item-title">${t.title}</strong>
          <span class="item-badge ${t.status === 'COMPLETED' ? 'confirmed' : 'unconfirmed'}">${t.status}</span>
        </div>
        <div class="item-reason">${t.teamName} · Zone: ${t.targetZoneName}</div>
        ${t.status !== 'COMPLETED' ? `
          <div class="item-actions">
            <button class="btn btn-xs btn-primary btn-complete-task" data-id="${t.id}">Complete Task</button>
          </div>
        ` : ''}
      </article>
    `).join('');

    dockTasksList.querySelectorAll('.btn-complete-task').forEach(btn => {
      btn.addEventListener('click', () => completeTask(btn.dataset.id));
    });
  }
}

// --------------------------------------------------------------------------
// REASONING & ACCESS RECALCULATION
// --------------------------------------------------------------------------
function recalculateAccess() {
  const alphaBlockage = state.observations.find(
    o => o.type === 'BLOCKED_PASSAGE' && 
         (o.zone === 'CORRIDOR_NORTH' || o.approach === 'APPROACH_ALPHA') && 
         o.verification === 'CONFIRMED' && 
         !o.resolved
  );

  const alpha = state.site.approaches.APPROACH_ALPHA;
  const bravo = state.site.approaches.APPROACH_BRAVO;

  if (alphaBlockage) {
    alpha.status = 'BLOCKED';
    alpha.statusReason = `Impassable due to confirmed blockage: ${alphaBlockage.title}`;
  } else {
    alpha.status = 'CLEAR';
    alpha.statusReason = 'Open corridor, optimal direct path (45m).';
  }

  const alphaOk = alpha.status === 'CLEAR';
  const summary = state.site.accessSummary;

  if (alphaOk) {
    summary.activeRoute = 'APPROACH_ALPHA';
    summary.routingExplanation = 'Approach Alpha is unobstructed and represents the shortest route (45m).';
  } else {
    summary.activeRoute = 'APPROACH_BRAVO';
    summary.routingExplanation = 'Approach Alpha is BLOCKED by confirmed rubble. Rerouted via alternative known approach: Approach Bravo (70m).';
  }

  if (!alphaOk && state.rover.currentZone === 'CORRIDOR_NORTH') {
    state.rover.status = 'HOLD';
    state.rover.moving = false;
    state.rover.speedMps = 0;
  }
}

function recalculatePriorities() {
  const priorities = [];

  const activeThermalAlert = state.alerts.find(a => a.type === 'THERMAL_ANOMALY' && a.status !== 'RESOLVED');
  if (activeThermalAlert || state.rover.spotTempC > 45) {
    const hasAssignedTask = state.tasks.some(t => t.targetZone === 'SEARCH_ZONE' && t.status === 'ASSIGNED');
    priorities.push({
      id: 'prio-thermal',
      rank: 1,
      title: 'Investigate Elevated Thermal Spot in Sector C',
      zone: 'SEARCH_ZONE',
      urgency: 'HIGH',
      recommendedTeam: 'TEAM_VANGUARD',
      assigned: hasAssignedTask,
      rationale: `Active thermal spike (${state.rover.spotTempC.toFixed(1)}°C) in Sector C target area. Potential combustion risk.`
    });
  }

  const unconfirmedBlock = state.observations.find(o => o.type === 'BLOCKED_PASSAGE' && o.verification === 'UNCONFIRMED' && !o.resolved);
  const confirmedBlock = state.observations.find(o => o.type === 'BLOCKED_PASSAGE' && o.verification === 'CONFIRMED' && !o.resolved);

  if (unconfirmedBlock) {
    priorities.push({
      id: 'prio-verify-block',
      rank: priorities.length + 1,
      title: 'Verify Passage Obstacle on Approach Alpha',
      zone: unconfirmedBlock.zone,
      urgency: 'MEDIUM',
      recommendedTeam: null,
      assigned: false,
      rationale: 'Forward LiDAR detected >85% occlusion at Approach Alpha. Operator confirmation required.'
    });
  } else if (confirmedBlock) {
    const hasClearanceTask = state.tasks.some(t => t.targetZone === confirmedBlock.zone && t.status === 'ASSIGNED');
    priorities.push({
      id: 'prio-clear-block',
      rank: priorities.length + 1,
      title: 'Clear Obstacle on Approach Alpha',
      zone: confirmedBlock.zone,
      urgency: 'MEDIUM',
      recommendedTeam: 'TEAM_SENTINEL',
      assigned: hasClearanceTask,
      rationale: 'Approach Alpha is impassable. Clearing rubble restores primary direct ingress and redundancy.'
    });
  }

  state.priorities = priorities;
}

// --------------------------------------------------------------------------
// SIMULATION TICK
// --------------------------------------------------------------------------
function simulationTick() {
  if (state.sim.status !== 'RUNNING') return;

  state.sim.elapsedSeconds += 1;
  const simTime = formatSimTime(state.sim.elapsedSeconds);

  if (state.rover.connection === 'DISCONNECTED') {
    state.rover.isStale = true;
    state.rover.moving = false;
    state.rover.speedMps = 0;
    renderUI();
    return;
  }

  state.rover.isStale = false;
  state.rover.lastReadingTime = simTime;

  // Battery decay
  if (state.rover.moving) {
    state.rover.batteryPct = Math.max(5, +(state.rover.batteryPct - 0.03).toFixed(1));
  } else {
    state.rover.batteryPct = Math.max(5, +(state.rover.batteryPct - 0.005).toFixed(1));
  }

  // RF noise
  state.rover.signalDbm = Math.min(-58, Math.max(-76, state.rover.signalDbm + (Math.random() > 0.5 ? 1 : -1)));

  // Spatial movement along active route
  if (state.rover.moving) {
    const activeRoute = state.site.accessSummary.activeRoute;
    const hasBlockage = state.observations.some(o => o.type === 'BLOCKED_PASSAGE' && !o.resolved);

    if (activeRoute === 'APPROACH_ALPHA') {
      if (state.rover.currentZone === 'ENTRY') {
        state.rover.currentZone = 'CORRIDOR_NORTH';
        state.rover.coords3D = { x: 0, y: 0.5, z: -10 };
        state.rover.headingDeg = 90;
        state.rover.lidarDistanceM = hasBlockage ? 0.85 : 14.2;
        addTimelineEvent('TELEMETRY', 'Rover Position Update', 'SUGRIV-01 entered Approach Alpha (North Corridor)', 'SIMULATED_SENSOR');
      } else if (state.rover.currentZone === 'CORRIDOR_NORTH') {
        state.rover.currentZone = 'SEARCH_ZONE';
        state.rover.coords3D = { x: 20, y: 0.5, z: 0 };
        state.rover.headingDeg = 0;
        state.rover.lidarDistanceM = 8.2;
        state.rover.status = 'STANDBY';
        state.rover.moving = false;
        state.rover.speedMps = 0;
        addTimelineEvent('TELEMETRY', 'Waypoint Reached', 'SUGRIV-01 arrived at Sector C Target Area', 'SIMULATED_SENSOR');
      }
    } else if (activeRoute === 'APPROACH_BRAVO') {
      if (state.rover.currentZone === 'ENTRY' || state.rover.currentZone === 'CORRIDOR_NORTH') {
        state.rover.currentZone = 'CORRIDOR_SOUTH';
        state.rover.coords3D = { x: 0, y: 0.5, z: 10 };
        state.rover.headingDeg = 90;
        state.rover.lidarDistanceM = 21.4;
        addTimelineEvent('TELEMETRY', 'Rover Position Update', 'SUGRIV-01 traversing Approach Bravo bypass', 'SIMULATED_SENSOR');
      } else if (state.rover.currentZone === 'CORRIDOR_SOUTH') {
        state.rover.currentZone = 'SEARCH_ZONE';
        state.rover.coords3D = { x: 20, y: 0.5, z: 0 };
        state.rover.headingDeg = 0;
        state.rover.lidarDistanceM = 8.2;
        state.rover.status = 'STANDBY';
        state.rover.moving = false;
        state.rover.speedMps = 0;
        addTimelineEvent('TELEMETRY', 'Waypoint Reached', 'SUGRIV-01 arrived at Sector C via bypass', 'SIMULATED_SENSOR');
      }
    }
  }

  // Thermal anomaly simulation
  if (state.sim.activeScenario === 'THERMAL_SURGE' || state.rover.currentZone === 'SEARCH_ZONE') {
    state.sim.thermalTicks += 1;
    if (state.rover.spotTempC < 118) {
      state.rover.spotTempC = +(state.rover.spotTempC + (state.sim.thermalTicks < 4 ? 6.5 : 11.2)).toFixed(1);
    }
    state.rover.ambientTempC = +(21.5 + (state.rover.spotTempC - 22) * 0.15).toFixed(1);

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
          status: 'ACTIVE_REVIEW',
          triggeredAt: simTime,
          triggerReason: 'Sustained spot temperature exceeded safety threshold (>50.0°C for >= 3 consecutive cycles) on Narrow-FOV Thermal Radiometer.'
        };
        state.alerts.unshift(existingAlert);
        addTimelineEvent('ALERT', 'Thermal Hazard Alert', `Sustained rising spot temp: ${state.rover.spotTempC}°C detected in Sector C.`, 'SIMULATED_SENSOR');
      }
    }
  }

  recalculateAccess();
  recalculatePriorities();
  renderUI();
}

function updateSimulationSpeed(multiplier) {
  state.sim.speedMultiplier = multiplier;
  [spd1x, spd2x, spd5x].forEach(btn => btn.classList.remove('active'));
  if (multiplier === 1) spd1x.classList.add('active');
  if (multiplier === 2) spd2x.classList.add('active');
  if (multiplier === 5) spd5x.classList.add('active');

  if (simInterval) clearInterval(simInterval);
  simInterval = setInterval(simulationTick, Math.round(1000 / multiplier));
}

// --------------------------------------------------------------------------
// UI RENDER LOOP
// --------------------------------------------------------------------------
function renderUI() {
  const s = state;

  // Clock
  const m = Math.floor(s.sim.elapsedSeconds / 60).toString().padStart(2, '0');
  const sec = (s.sim.elapsedSeconds % 60).toString().padStart(2, '0');
  simClock.textContent = `T+${m}:${sec} · ${s.sim.status}`;

  // Side Panel Telemetry (if open)
  if (selectedIncident) renderIncidentPanel(selectedIncident);

  // Rover HUD
  hudSpotTemp.textContent = `${s.rover.spotTempC.toFixed(1)} °C`;
  hudSpotTemp.style.color = s.rover.spotTempC > 45 ? '#f85149' : '#3fb950';
  hudLidarRange.textContent = s.rover.lidarDistanceM < 2.0 
    ? `${s.rover.lidarDistanceM.toFixed(1)} m (OBSTACLE DETECTED)` 
    : `${s.rover.lidarDistanceM.toFixed(1)} m (CLEAR)`;
  hudLidarRange.style.color = s.rover.lidarDistanceM < 2.0 ? '#f85149' : '#3fb950';

  hudConnHealth.textContent = s.rover.connection === 'CONNECTED' 
    ? `CONNECTED (${s.rover.signalDbm} dBm)` 
    : 'DISCONNECTED (STALE)';
  hudConnHealth.style.color = s.rover.connection === 'CONNECTED' ? '#3fb950' : '#f85149';
  hudSimTime.textContent = `T+${m}:${sec}`;

  // Update 3D Scene
  if (site3D && is3DViewOpen) {
    site3D.updateFromState(s);
    render3DDock();
  }
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

// --------------------------------------------------------------------------
// SCENARIO ACTION HANDLERS
// --------------------------------------------------------------------------
function startNormalTelemetry() {
  state.sim.status = 'RUNNING';
  state.rover.connection = 'CONNECTED';
  state.rover.status = 'MOVING';
  state.rover.moving = true;
  state.rover.speedMps = 0.45;
  state.rover.isStale = false;
  addTimelineEvent('TELEMETRY', 'Rover Telemetry Started', 'Normal scouting underway towards Approach Alpha.', 'SIMULATED_SENSOR');
  showToast('Demo Step 1', 'Rover telemetry started. Advancing along Approach Alpha.');
  renderUI();
}

function triggerBlockedPassage() {
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
      verification: 'UNCONFIRMED',
      timestamp: formatSimTime(state.sim.elapsedSeconds),
      reading: 'LiDAR Cross-Section Occlusion: 88.5%',
      triggerReason: 'Forward LiDAR rangefinder detected sudden cross-sectional corridor occlusion (>85%) at Waypoint N-2.',
      affectedApproach: 'Approach Alpha (North Tunnel)',
      resolved: false
    };
    state.observations.unshift(obs);
    state.rover.lidarDistanceM = 0.85;
    addTimelineEvent('OBSERVATION', 'Blocked Passage (Unconfirmed)', 'LiDAR detected 88.5% occlusion on Approach Alpha.', 'SIMULATED_SENSOR');
  }
  recalculateAccess();
  recalculatePriorities();
  renderUI();
  showToast('Demo Step 2', 'LiDAR obstacle observation triggered (Unconfirmed).');
}

function confirmBlockageObservation(id) {
  const obs = state.observations.find(o => o.id === id);
  if (!obs) return;

  obs.verification = 'CONFIRMED';
  obs.confirmedAt = formatSimTime(state.sim.elapsedSeconds);

  addTimelineEvent('CONFIRMATION', `Observation Confirmed: ${obs.title}`, `Operator confirmed ${obs.id}.`, 'OPERATOR_INPUT');
  recalculateAccess();
  recalculatePriorities();
  renderUI();
  showToast('Observation Confirmed', 'Access recalculation complete. Approach Alpha is BLOCKED. Rerouted to Bravo.');
}

function resolveBlockageObservation(id, notes) {
  const obs = state.observations.find(o => o.id === id);
  if (!obs) return;

  obs.resolved = true;
  obs.resolvedAt = formatSimTime(state.sim.elapsedSeconds);
  addTimelineEvent('HAZARD_RESOLVED', `Obstacle Cleared: ${obs.title}`, 'Operator verified rubble cleared.', 'OPERATOR_INPUT');
  recalculateAccess();
  recalculatePriorities();
  renderUI();
  showToast('Obstacle Cleared', 'Access restored to Approach Alpha.');
}

function triggerThermalAnomaly() {
  state.sim.activeScenario = 'THERMAL_SURGE';
  state.sim.thermalTicks = 0;
  if (state.rover.currentZone !== 'SEARCH_ZONE') {
    state.rover.currentZone = 'SEARCH_ZONE';
    state.rover.coords3D = { x: 20, y: 0.5, z: 0 };
  }
  state.rover.spotTempC = 28.5;

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
      timestamp: formatSimTime(state.sim.elapsedSeconds),
      triggerReason: 'Narrow-FOV infrared sensor detected rapid thermal rise above ambient baseline.',
      resolved: false
    };
    state.observations.unshift(obs);
    addTimelineEvent('OBSERVATION', 'Thermal Anomaly Initiated', 'Sustained temperature spike triggered in Sector C.', 'SIMULATED_SENSOR');
  }

  recalculateAccess();
  recalculatePriorities();
  renderUI();
  showToast('Demo Step 3', 'Thermal surge active in Sector C Target Area.');
}

function assignTask(title, targetZone, teamId, overrideReason) {
  const team = state.teams[teamId];
  if (!team) return;

  const isOverride = Boolean(overrideReason && overrideReason.trim());
  const taskId = `task-${Date.now().toString().slice(-4)}`;

  const newTask = {
    id: taskId,
    title: title || 'Inspection Task',
    targetZone: targetZone || 'SEARCH_ZONE',
    targetZoneName: state.site.zones[targetZone]?.name || targetZone,
    teamId,
    teamName: team.name,
    status: 'ASSIGNED',
    assignedAt: formatSimTime(state.sim.elapsedSeconds),
    isOverride,
    overrideReason: isOverride ? overrideReason.trim() : null
  };

  state.tasks.unshift(newTask);
  team.status = 'ASSIGNED';
  team.currentTaskId = taskId;

  addTimelineEvent('TASK_ASSIGNED', `Task Assigned: ${newTask.title}`, `${team.name} assigned to ${newTask.targetZoneName}.`, 'OPERATOR_INPUT');
  recalculatePriorities();
  renderUI();
  showToast('Task Assigned', `${title} dispatched to ${team.name}.`);
}

function completeTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;

  task.status = 'COMPLETED';
  task.completedAt = formatSimTime(state.sim.elapsedSeconds);

  const team = state.teams[task.teamId];
  if (team) {
    team.status = 'AVAILABLE';
    team.currentTaskId = null;
  }

  addTimelineEvent('TASK_COMPLETED', `Task Completed: ${task.title}`, `Inspection concluded. Note: Linked hazard remains active until neutralized.`, 'OPERATOR_INPUT');
  recalculatePriorities();
  renderUI();
  showToast('Task Completed', 'Inspection complete. Linked hazard remains active per safety protocol.');
}

function toggleConnection() {
  if (state.rover.connection === 'CONNECTED') {
    state.rover.connection = 'DISCONNECTED';
    state.rover.moving = false;
    state.rover.speedMps = 0.0;
    state.rover.isStale = true;
    addTimelineEvent('SIM_CONTROL', 'Rover Connection Lost', 'Telemetry frozen; rover halted; stale telemetry indicators active.', 'SIMULATED_SENSOR');
    showToast('Link Lost', 'Telemetry frozen at last known packet.');
  } else {
    state.rover.connection = 'CONNECTED';
    state.rover.isStale = false;
    state.rover.moving = false;
    state.rover.speedMps = 0.0;
    state.rover.status = 'STANDBY';
    addTimelineEvent('SIM_CONTROL', 'Rover Connection Restored', 'Telemetry link restored; movement remains stopped.', 'OPERATOR_INPUT');
    showToast('Link Restored', 'Telemetry resumed.');
  }
  recalculateAccess();
  recalculatePriorities();
  renderUI();
}

function resetSimulation() {
  state = createInitialState();
  selectedIncident = state.incidents[0];
  if (site3D) site3D.resetCamera();
  addTimelineEvent('SIM_CONTROL', 'Session Reset', 'All session state, alerts, tasks, overrides, and histories cleared.', 'OPERATOR_INPUT');
  renderUI();
  showToast('Session Reset', 'All simulation state and audit logs reset.');
}

async function runAutoDemo() {
  if (state.sim.autoDemoRunning) return;
  state.sim.autoDemoRunning = true;
  showToast('Auto Demo Started', 'Executing full connected scenario step-by-step...');

  startNormalTelemetry();
  await new Promise(r => setTimeout(r, 2200));

  triggerBlockedPassage();
  await new Promise(r => setTimeout(r, 2500));

  const obs = state.observations.find(o => o.type === 'BLOCKED_PASSAGE');
  if (obs) confirmBlockageObservation(obs.id);
  await new Promise(r => setTimeout(r, 2500));

  triggerThermalAnomaly();
  await new Promise(r => setTimeout(r, 3000));

  assignTask('Thermal Anomaly Inspection', 'SEARCH_ZONE', 'TEAM_VANGUARD', '');
  await new Promise(r => setTimeout(r, 2500));

  const task = state.tasks.find(t => t.status === 'ASSIGNED');
  if (task) completeTask(task.id);

  state.sim.autoDemoRunning = false;
  showToast('Auto Demo Complete', 'Full workflow demonstration completed successfully!');
}

// --------------------------------------------------------------------------
// MODAL DIALOGS
// --------------------------------------------------------------------------
function openActionDialog(title, desc, callback) {
  actionDialogTitle.textContent = title;
  actionDialogDesc.textContent = desc;
  actionNotesInput.value = '';
  activeActionConfig = callback;
  actionDialog.showModal();
}

actionForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const notes = actionNotesInput.value.trim() || 'Operator confirmed';
  actionDialog.close();
  if (activeActionConfig) {
    activeActionConfig(notes);
    activeActionConfig = null;
  }
});

btnCloseAction.addEventListener('click', () => actionDialog.close());
btnCancelAction.addEventListener('click', () => actionDialog.close());

btnCloseModal.addEventListener('click', () => assignTaskDialog.close());
btnCancelTask.addEventListener('click', () => assignTaskDialog.close());

assignTaskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = taskTitleInput.value.trim();
  const targetZone = taskZoneSelect.value;
  const teamId = taskTeamSelect.value;
  const overrideReason = taskOverrideInput.value.trim();

  assignTaskDialog.close();
  assignTask(title, targetZone, teamId, overrideReason);
});

// --------------------------------------------------------------------------
// EVENT LISTENERS & FILTERING
// --------------------------------------------------------------------------
filterType.addEventListener('change', (e) => {
  currentFilterType = e.target.value;
  if (gMap) renderGoogleMapsPins();
  renderSchematicPins();
});

filterSeverity.addEventListener('change', (e) => {
  currentFilterSeverity = e.target.value;
  if (gMap) renderGoogleMapsPins();
  renderSchematicPins();
});

filterStatus.addEventListener('change', (e) => {
  currentFilterStatus = e.target.value;
  if (gMap) renderGoogleMapsPins();
  renderSchematicPins();
});

btnCloseSidePanel.addEventListener('click', () => {
  incidentSidePanel.classList.add('closed');
});

btnOpen3DSite.addEventListener('click', open3DSiteView);
btnReturnToMap.addEventListener('click', close3DSiteView);
if (btnFloatingBackToMap) {
  btnFloatingBackToMap.addEventListener('click', close3DSiteView);
}

// Global Escape Key to return from 3D View to Map
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && is3DViewOpen) {
    close3DSiteView();
  }
});

// Map Zoom Controls
if (btnZoomIn) btnZoomIn.addEventListener('click', zoomIn);
if (btnZoomOut) btnZoomOut.addEventListener('click', zoomOut);
if (btnZoomReset) btnZoomReset.addEventListener('click', resetZoom);

btnCamOrbit.addEventListener('click', () => {
  btnCamOrbit.className = 'btn btn-sm btn-primary';
  btnCamRover.className = 'btn btn-sm btn-outline';
  roverHudOverlay.classList.add('hidden');
  if (site3D) site3D.setCameraMode('orbit');
});

btnCamRover.addEventListener('click', () => {
  btnCamRover.className = 'btn btn-sm btn-primary';
  btnCamOrbit.className = 'btn btn-sm btn-outline';
  roverHudOverlay.classList.remove('hidden');
  if (site3D) site3D.setCameraMode('rover');
});

let isFollowOn = false;
btnCamFollow.addEventListener('click', () => {
  isFollowOn = !isFollowOn;
  followStateText.textContent = isFollowOn ? 'ON' : 'OFF';
  btnCamFollow.className = `btn btn-xs ${isFollowOn ? 'btn-primary' : 'btn-outline'}`;
  if (site3D) site3D.setFollowRover(isFollowOn);
});

btnCamReset.addEventListener('click', () => {
  if (site3D) site3D.resetCamera();
});

btnCloseFlyout.addEventListener('click', () => {
  threeObjectFlyout.classList.add('hidden');
});

// Demo Dock
btnToggleDemoDock.addEventListener('click', () => {
  demoDockCard.classList.toggle('collapsed');
});

btnCollapseDock.addEventListener('click', () => {
  demoDockCard.classList.toggle('collapsed');
});

btnStep1.addEventListener('click', startNormalTelemetry);
btnStep2.addEventListener('click', triggerBlockedPassage);
btnStep3.addEventListener('click', triggerThermalAnomaly);
btnAutoDemo.addEventListener('click', runAutoDemo);

btnPlayPause.addEventListener('click', () => {
  if (state.sim.status === 'RUNNING') {
    state.sim.status = 'PAUSED';
    btnPlayPause.textContent = '▶ Play';
  } else {
    state.sim.status = 'RUNNING';
    btnPlayPause.textContent = '⏸ Pause';
  }
  renderUI();
});

btnToggleConn.addEventListener('click', toggleConnection);
btnReset.addEventListener('click', resetSimulation);

spd1x.addEventListener('click', () => updateSimulationSpeed(1));
spd2x.addEventListener('click', () => updateSimulationSpeed(2));
spd5x.addEventListener('click', () => updateSimulationSpeed(5));

// Initialize application
initMapExperience();
selectIncident(selectedIncident);
updateSimulationSpeed(1);
renderUI();
