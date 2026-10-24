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

function formatSimTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `T+${m}:${s}`;
}

// --------------------------------------------------------------------------
// IN-MEMORY OPERATIONAL STATE (ZERO APIS // PURE IN-BROWSER ENGINE)
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
        schematicPos: { x: 1280, y: 780 },
        location: 'Nehru Road, Station Perimeter, Vile Parle East, Mumbai',
        reportTime: 'T-01:45',
        lastUpdate: 'T+00:00',
        severity: 'CRITICAL',
        severityLevel: 4,
        severityLabel: '🔴 CRITICAL (Level 4)',
        verificationStatus: 'FORWARD RECON VERIFIED',
        status: 'ACTIVE_SCOUTING',
        statusLabel: 'Active Scouting',
        situationSummary: 'Reported multi-story commercial arcade slab collapse. Ground access along Station Road corridor obstructed. Unmanned scout rover deployed for internal structural reconnaissance.',
        affectedZones: 'Approach Alpha (North Tunnel), Approach Bravo (South Passage), Sector C Target Area',
        assignedTeamId: 'TEAM_VANGUARD',
        assignedTeamName: 'Team Vanguard (Recon & Hazmat)',
        responseStatus: 'ON SCENE',
        roverAssigned: 'SUGRIV-01',
        has3DScene: true,
        dataDisclaimer: 'Real-time structural sensor telemetry; unverified load-bearing estimates pending search team egress.'
      },
      {
        id: 'inc-flood-02',
        name: 'Milan Subway Flash Inundation',
        type: 'FLOOD',
        typeName: 'Flooding',
        icon: '🌊',
        lat: 19.0892,
        lng: 72.8422,
        schematicPos: { x: 1160, y: 1100 },
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
        dataDisclaimer: 'Remote hydrological sensor stream active. Sub-surface drain telemetry monitored.'
      },
      {
        id: 'inc-fire-03',
        name: 'WEH Feeder Transformer Fire',
        type: 'FIRE',
        typeName: 'Fire',
        icon: '🔥',
        lat: 19.0945,
        lng: 72.8562,
        schematicPos: { x: 1650, y: 920 },
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
        dataDisclaimer: 'Thermal satellite detection verified. Hazmat safety perimeter operational.'
      },
      {
        id: 'inc-landslide-04',
        name: 'Juhu Scheme Excavation Slope Creep',
        type: 'LANDSLIDE',
        typeName: 'Landslide',
        icon: '⛰️',
        lat: 19.1065,
        lng: 72.8345,
        schematicPos: { x: 520, y: 460 },
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
        dataDisclaimer: 'Geotechnical tiltmeter telemetry continuous. Roadway safety barrier active.'
      },
      {
        id: 'inc-fire-05',
        name: 'Airport Fuel Line Rupture & Flare',
        type: 'FIRE',
        typeName: 'Fire / Hazmat',
        icon: '🔥',
        lat: 19.0915,
        lng: 72.8585,
        schematicPos: { x: 2020, y: 1220 },
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
        dataDisclaimer: 'Pressure sensor drop telemetry verified. Airport crash tender foam units staged.'
      },
      {
        id: 'inc-collapse-06',
        name: 'Parleshwar Footbridge Truss Failure',
        type: 'COLLAPSE',
        typeName: 'Building Collapse',
        icon: '🏗️',
        lat: 19.1030,
        lng: 72.8455,
        schematicPos: { x: 1160, y: 520 },
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
        dataDisclaimer: 'Railway strain gauge telemetry active. Transit bridge approaches secured.'
      },
      {
        id: 'inc-flood-07',
        name: 'Irla Nullah Culvert Overflow Breach',
        type: 'FLOOD',
        typeName: 'Flooding',
        icon: '🌊',
        lat: 19.1010,
        lng: 72.8390,
        schematicPos: { x: 820, y: 640 },
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
        dataDisclaimer: 'Tidal level telemetry recorded. Dewatering pumps active on location.'
      },
      {
        id: 'inc-landslide-08',
        name: 'Bamanwada Retaining Wall Subsidence',
        type: 'LANDSLIDE',
        typeName: 'Landslide',
        icon: '⛰️',
        lat: 19.0965,
        lng: 72.8520,
        schematicPos: { x: 1780, y: 720 },
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
        dataDisclaimer: 'Geotechnical tilt sensor stream online. Structural evacuation zone active.'
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
        currentTaskId: null,
        capabilities: ['Confined Space Recon', 'Hazmat Assessment', 'Void Space Search']
      },
      TEAM_SENTINEL: {
        id: 'TEAM_SENTINEL',
        name: 'Team Sentinel',
        role: 'Technical Rescue & Obstacle Clearance',
        status: 'AVAILABLE',
        currentZone: 'ENTRY',
        currentTaskId: null,
        capabilities: ['Structural Shoring', 'Heavy Breach', 'Rubble Clearance']
      },
      TEAM_PHOENIX: {
        id: 'TEAM_PHOENIX',
        name: 'Team Phoenix',
        role: 'Medical Triage & Field Evacuation',
        status: 'AVAILABLE',
        currentZone: 'ENTRY',
        currentTaskId: null,
        capabilities: ['Mass Casualty Triage', 'Paramedic Extrication', 'Patient Transport']
      },
      TEAM_ATLAS: {
        id: 'TEAM_ATLAS',
        name: 'Team Atlas',
        role: 'Relief Logistics & Supply Distribution',
        status: 'AVAILABLE',
        currentZone: 'ENTRY',
        currentTaskId: null,
        capabilities: ['Humanitarian Relief', 'Water Distribution', 'Heavy Transport']
      }
    },
    observations: [],
    alerts: [
      {
        id: 'alert-milan-flood',
        incidentId: 'inc-flood-02',
        incidentName: 'Milan Subway Flash Inundation',
        zone: 'Milan Underpass Ingress',
        type: 'RAPID_INUNDATION',
        title: 'Monsoon Runoff Surge in Subway Underpass',
        severity: 'HIGH',
        source: 'HYDROLOGICAL_SENSOR',
        status: 'ACTIVE_REVIEW',
        acknowledged: false,
        acknowledgedAt: null,
        acknowledgedBy: null,
        triggeredAt: 'T-00:20',
        triggerReason: 'Water level rate of rise exceeded +0.9m/hr threshold on ultrasonic depth gauge #M-04.',
        readings: [
          { simTime: 'T-00:22', levelM: 0.8 },
          { simTime: 'T-00:20', levelM: 1.2 }
        ]
      },
      {
        id: 'alert-weh-fire',
        incidentId: 'inc-fire-03',
        incidentName: 'WEH Feeder Transformer Fire',
        zone: 'Feeder Substation Perimeter',
        type: 'HAZMAT_PLUME',
        title: 'Toxic Dense Smoke Plume near WEH Ramp',
        severity: 'HIGH',
        source: 'AIRPORT_AIR_MONITOR',
        status: 'ACTIVE_REVIEW',
        acknowledged: false,
        acknowledgedAt: null,
        acknowledgedBy: null,
        triggeredAt: 'T-00:08',
        triggerReason: 'Particulate density sensor registered PM2.5 > 350 ug/m3 with oil combustion signature.',
        readings: [
          { simTime: 'T-00:08', pm25: 380 }
        ]
      }
    ],
    priorities: [],
    tasks: [],
    reliefRequests: [
      {
        id: 'rel-101',
        incidentId: 'inc-collapse-01',
        incidentName: 'Station Road Arcade Structural Collapse',
        itemType: 'WATER',
        itemLabel: 'Potable Drinking Water',
        quantity: 1500,
        unit: 'liters',
        destination: 'Station Perimeter Evacuation Staging',
        priority: 'HIGH',
        status: 'REQUESTED',
        assignedTeamId: null,
        assignedTeamName: 'Unassigned',
        requestedAt: 'T-00:30',
        deliveredAt: null,
        notes: 'Urgent drinking water for evacuated arcade workers and response staging area.'
      },
      {
        id: 'rel-102',
        incidentId: 'inc-flood-02',
        incidentName: 'Milan Subway Flash Inundation',
        itemType: 'FIRST_AID',
        itemLabel: 'First-Aid & Trauma Kits',
        quantity: 40,
        unit: 'kits',
        destination: 'Milan North Ramp Triage Post',
        priority: 'MEDIUM',
        status: 'ASSIGNED',
        assignedTeamId: 'TEAM_ATLAS',
        assignedTeamName: 'Team Atlas (Logistics & Transport)',
        requestedAt: 'T-00:15',
        deliveredAt: null,
        notes: 'Staged for stranded motorists undergoing cold-water wading evacuation.'
      }
    ],
    incidentNotes: {
      'inc-collapse-01': [
        {
          id: 'note-init-01',
          incidentId: 'inc-collapse-01',
          author: 'Incident-Commander',
          text: 'Initial collapse perimeter secured along Nehru Road. SUGRIV-01 forward scout rover deployed at Alpha Gate.',
          simTime: 'T-01:40',
          timestamp: Date.now() - 3600000
        }
      ]
    },
    timeline: [
      {
        id: 'evt-init',
        simTime: 'T+00:00',
        type: 'SYSTEM',
        category: 'SYSTEM',
        title: 'Disaster Command System Online',
        detail: 'Regional incident monitoring initiated. Server memory operational session active.',
        source: 'SYSTEM',
        incidentId: null,
        author: 'SYSTEM',
        timestamp: Date.now()
      }
    ]
  };
}

let state = createInitialState();
let selectedIncident = state.incidents[0]; // Default selected is Building Collapse
let currentFilterType = 'ALL';
let currentFilterSeverity = 'ALL';
let currentFilterStatus = 'ALL';
let searchQuery = '';
let sessionOperatorName = 'Operator-1';
let activePanelTab = 'overview';
let activityFilter = 'ALL';
let isDirectoryOpen = false;

let simInterval = null;
let toastTimeout = null;

// 3D Scene Controller Instance
let site3D = null;
let is3DViewOpen = false;

// Google Maps Instance
let gMap = null;
let gMapMarkers = [];

// DOM References: Topbar & Filters
const simClock = document.querySelector('#sim-clock');
const filterSearch = document.querySelector('#filter-search');
const filterType = document.querySelector('#filter-type');
const filterSeverity = document.querySelector('#filter-severity');
const filterStatus = document.querySelector('#filter-status');
const btnClearFilters = document.querySelector('#btn-clear-filters');
const incidentsSummaryPill = document.querySelector('#incidents-summary-pill');

// Operator Session & Header Action Buttons
const btnSessionOperator = document.querySelector('#btn-session-operator');
const labelOperatorName = document.querySelector('#label-operator-name');
const btnOpenReportIncident = document.querySelector('#btn-open-report-incident');
const btnOpenAlertInbox = document.querySelector('#btn-open-alert-inbox');
const inboxUnreadCount = document.querySelector('#inbox-unread-count');
const btnOpenReliefDialog = document.querySelector('#btn-open-relief-dialog');
const reliefCountBadge = document.querySelector('#relief-count-badge');
const btnToggleIncidentList = document.querySelector('#btn-toggle-incident-list');
const incidentsCountBadge = document.querySelector('#incidents-count-badge');

// Incident Directory Drawer
const incidentDirectoryPanel = document.querySelector('#incident-directory-panel');
const incidentDirectoryList = document.querySelector('#incident-directory-list');
const btnCloseDirectory = document.querySelector('#btn-close-directory');

// Views & Zoom Controls
const mapViewCanvas = document.querySelector('#map-view-canvas');
const googleMapCanvas = document.querySelector('#google-map-canvas');
const schematicMapFallback = document.querySelector('#schematic-map-fallback');
const schematicRegionalSvg = document.querySelector('#schematic-regional-svg');
const schematicIncidentPins = document.querySelector('#schematic-incident-pins');
const btnZoomIn = document.querySelector('#btn-zoom-in');
const btnZoomOut = document.querySelector('#btn-zoom-out');
const btnZoomReset = document.querySelector('#btn-zoom-reset');

// Side Panel Elements
const incidentSidePanel = document.querySelector('#incident-side-panel');
const incidentEmptyState = document.querySelector('#incident-empty-state');
const incidentActiveContainer = document.querySelector('#incident-active-container');
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

// Verification & Lifecycle Controls
const panelVerificationBar = document.querySelector('#panel-verification-bar');
const btnPanelVerifyInc = document.querySelector('#btn-panel-verify-inc');
const btnPanelRejectInc = document.querySelector('#btn-panel-reject-inc');
const panelLifecycleSelect = document.querySelector('#panel-lifecycle-select');

// Tabs & Tab Panes
const tabBtnOverview = document.querySelector('#tab-btn-overview');
const tabBtnTasks = document.querySelector('#tab-btn-tasks');
const tabBtnRelief = document.querySelector('#tab-btn-relief');
const tabBtnHistory = document.querySelector('#tab-btn-history');
const tabPaneOverview = document.querySelector('#tab-pane-overview');
const tabPaneTasks = document.querySelector('#tab-pane-tasks');
const tabPaneRelief = document.querySelector('#tab-pane-relief');
const tabPaneHistory = document.querySelector('#tab-pane-history');
const panelTasksCount = document.querySelector('#panel-tasks-count');
const panelReliefCount = document.querySelector('#panel-relief-count');
const panelHistoryCount = document.querySelector('#panel-history-count');

// Tasks Pane
const panelTasksList = document.querySelector('#panel-tasks-list');
const btnPanelCreateTask = document.querySelector('#btn-panel-create-task');

// Relief Pane
const panelReliefList = document.querySelector('#panel-relief-list');
const btnPanelCreateRelief = document.querySelector('#btn-panel-create-relief');

// History & Notes Pane
const inputIncidentNote = document.querySelector('#input-incident-note');
const btnPanelPostNote = document.querySelector('#btn-panel-post-note');
const filterIncidentActivity = document.querySelector('#filter-incident-activity');
const panelActivityFeed = document.querySelector('#panel-activity-feed');

// Backend Status & About Dialog
const backendStatusPill = document.querySelector('#backend-status-pill');
const btnAboutDemo = document.querySelector('#btn-about-demo');
const aboutDemoDialog = document.querySelector('#about-demo-dialog');
const btnCloseAboutDialog = document.querySelector('#btn-close-about-dialog');
const btnAckAboutDialog = document.querySelector('#btn-ack-about-dialog');
const taskTeamWarning = document.querySelector('#task-team-warning');
const btnSubmitTask = document.querySelector('#btn-submit-task');

// 3D Viewport
const site3DView = document.querySelector('#site-3d-view');
const site3DTitle = document.querySelector('#site-3d-title');
const btnReturnToMap = document.querySelector('#btn-return-to-map');
const btnFloatingBackToMap = document.querySelector('#btn-floating-back-to-map');
const btnCamOrbit = document.querySelector('#btn-cam-orbit');
const btnCamRover = document.querySelector('#btn-cam-rover');
const btnCamFollow = document.querySelector('#btn-cam-follow');
const followStateText = document.querySelector('#follow-state-text');
const btnCamReset = document.querySelector('#btn-cam-reset');
const threeContainer = document.querySelector('#three-container');
const roverHudOverlay = document.querySelector('#rover-hud-overlay');
const btnHudRoverStop = document.querySelector('#btn-hud-rover-stop');
const hudSpotTemp = document.querySelector('#hud-spot-temp');
const hudLidarRange = document.querySelector('#hud-lidar-range');
const hudConnHealth = document.querySelector('#hud-conn-health');
const hudSimTime = document.querySelector('#hud-sim-time');
const threeNavHint = document.querySelector('#three-nav-hint');
const btnHudCamCenter = document.querySelector('#btn-hud-cam-center');
const btnHudResumeRoute = document.querySelector('#btn-hud-resume-route');
const btnPtzUp = document.querySelector('#btn-ptz-up');
const btnPtzDown = document.querySelector('#btn-ptz-down');
const btnPtzLeft = document.querySelector('#btn-ptz-left');
const btnPtzRight = document.querySelector('#btn-ptz-right');
const btnPtzReset = document.querySelector('#btn-ptz-reset');
const btnPtzZoomIn = document.querySelector('#btn-ptz-zoom-in');
const btnPtzZoomOut = document.querySelector('#btn-ptz-zoom-out');
const btnDriveFwd = document.querySelector('#btn-drive-fwd');
const btnDriveRev = document.querySelector('#btn-drive-rev');
const btnDriveLeft = document.querySelector('#btn-drive-left');
const btnDriveRight = document.querySelector('#btn-drive-right');

// Guided Demo Banner
const btnTopbarGuidedDemo = document.querySelector('#btn-topbar-guided-demo');
const guidedDemoBanner = document.querySelector('#guided-demo-banner');
const demoStepBadge = document.querySelector('#demo-step-badge');
const demoStepText = document.querySelector('#demo-step-text');
const btnNextDemoStep = document.querySelector('#btn-next-demo-step');
const btnCancelDemo = document.querySelector('#btn-cancel-demo');

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
const btnRoverStop = document.querySelector('#btn-rover-stop');
const btnPlayPause = document.querySelector('#btn-play-pause');
const btnToggleConn = document.querySelector('#btn-toggle-conn');
const btnReset = document.querySelector('#btn-reset');
const spd1x = document.querySelector('#spd-1x');
const spd2x = document.querySelector('#spd-2x');
const spd5x = document.querySelector('#spd-5x');

// FEATURE MODALS
// Report Incident Dialog
const reportIncidentDialog = document.querySelector('#report-incident-dialog');
const reportIncidentForm = document.querySelector('#report-incident-form');
const reportTitle = document.querySelector('#report-title');
const reportType = document.querySelector('#report-type');
const reportLocation = document.querySelector('#report-location');
const reportSeverity = document.querySelector('#report-severity');
const reportLat = document.querySelector('#report-lat');
const reportLng = document.querySelector('#report-lng');
const reportTime = document.querySelector('#report-time');
const reportDescription = document.querySelector('#report-description');
const btnCloseReportDialog = document.querySelector('#btn-close-report-dialog');
const btnCancelReport = document.querySelector('#btn-cancel-report');
const btnPickReportCoords = document.querySelector('#btn-pick-report-coords');
let isPickingReportCoords = false;

// Central Alert Inbox Dialog
const alertInboxDialog = document.querySelector('#alert-inbox-dialog');
const inboxFilterIncident = document.querySelector('#inbox-filter-incident');
const inboxFilterType = document.querySelector('#inbox-filter-type');
const inboxFilterAck = document.querySelector('#inbox-filter-ack');
const inboxAlertsList = document.querySelector('#inbox-alerts-list');
const btnCloseInboxDialog = document.querySelector('#btn-close-inbox-dialog');
const btnCloseInboxBottom = document.querySelector('#btn-close-inbox-bottom');

// Create Task Dialog
const createTaskDialog = document.querySelector('#create-task-dialog');
const createTaskForm = document.querySelector('#create-task-form');
const createTaskTitle = document.querySelector('#create-task-title');
const createTaskZone = document.querySelector('#create-task-zone');
const createTaskPriority = document.querySelector('#create-task-priority');
const createTaskTeam = document.querySelector('#create-task-team');
const createTaskDesc = document.querySelector('#create-task-desc');
const teamCapabilityHint = document.querySelector('#team-capability-hint');
const modalTaskIncidentName = document.querySelector('#modal-task-incident-name');
const btnCloseCreateTask = document.querySelector('#btn-close-create-task');
const btnCancelCreateTask = document.querySelector('#btn-cancel-create-task');

// Add Relief Dialog
const addReliefDialog = document.querySelector('#add-relief-dialog');
const addReliefForm = document.querySelector('#add-relief-form');
const reliefItemType = document.querySelector('#relief-item-type');
const reliefPriority = document.querySelector('#relief-priority');
const reliefQty = document.querySelector('#relief-qty');
const reliefUnit = document.querySelector('#relief-unit');
const reliefDest = document.querySelector('#relief-dest');
const reliefNotes = document.querySelector('#relief-notes');
const modalReliefIncidentName = document.querySelector('#modal-relief-incident-name');
const btnCloseAddRelief = document.querySelector('#btn-close-add-relief');
const btnCancelAddRelief = document.querySelector('#btn-cancel-add-relief');

// Global Relief Dialog
const globalReliefDialog = document.querySelector('#global-relief-dialog');
const globalReliefList = document.querySelector('#global-relief-list');
const btnCloseGlobalRelief = document.querySelector('#btn-close-global-relief');
const btnCloseGlobalReliefBottom = document.querySelector('#btn-close-global-relief-bottom');

// Operator Name Dialog
const operatorNameDialog = document.querySelector('#operator-name-dialog');
const operatorNameForm = document.querySelector('#operator-name-form');
const inputOperatorDisplayName = document.querySelector('#input-operator-display-name');
const btnCloseOperatorDialog = document.querySelector('#btn-close-operator-dialog');
const btnCancelOperatorDialog = document.querySelector('#btn-cancel-operator-dialog');

// Legacy 3D Modals
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
  if (!toastBox) return;
  toastTitle.textContent = title;
  toastMsg.textContent = msg;
  toastBox.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toastBox.classList.remove('show'), 3200);
}

// --------------------------------------------------------------------------
// BACKEND SERVER MEMORY SYNCHRONIZATION
// --------------------------------------------------------------------------
let isBackendConnected = true;

function updateBackendStatusUI(connected) {
  isBackendConnected = connected;
  if (!backendStatusPill) return;
  if (connected) {
    backendStatusPill.className = 'backend-status-pill connected';
    backendStatusPill.textContent = '● Server Connected';
    backendStatusPill.title = 'Connected to server memory session.';
  } else {
    backendStatusPill.className = 'backend-status-pill disconnected';
    backendStatusPill.textContent = '⚠️ Backend Disconnected';
    backendStatusPill.title = 'Disconnected. Operating in local in-memory fallback mode.';
  }
}

async function syncWithServer() {
  try {
    const res = await fetch('/api/state');
    if (res.ok) {
      const body = await res.json();
      const serverState = body.state || body;
      if (serverState && serverState.incidents && serverState.rover) {
        // Hydrate from server memory
        state.sim = serverState.sim || state.sim;
        state.rover = serverState.rover || state.rover;
        state.site = serverState.site || state.site;
        state.teams = serverState.teams || state.teams;
        state.incidents = serverState.incidents || state.incidents;
        state.observations = serverState.observations || state.observations;
        state.alerts = serverState.alerts || state.alerts;
        state.priorities = serverState.priorities || state.priorities;
        state.tasks = serverState.tasks || state.tasks;
        state.reliefRequests = serverState.reliefRequests || state.reliefRequests || [];
        state.incidentNotes = serverState.incidentNotes || state.incidentNotes || {};
        if (serverState.timeline) state.timeline = serverState.timeline;

        if (selectedIncident) {
          const match = state.incidents.find(i => i.id === selectedIncident.id);
          selectedIncident = match || state.incidents[0];
        }
      }
      updateBackendStatusUI(true);
      renderUI();
    } else {
      updateBackendStatusUI(false);
    }
  } catch {
    updateBackendStatusUI(false);
  }
}

async function postServerAction(endpoint, payload = {}) {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      updateBackendStatusUI(true);
      if (data && data.state) {
        const s = data.state;
        state.sim = s.sim || state.sim;
        state.rover = s.rover || state.rover;
        state.site = s.site || state.site;
        state.teams = s.teams || state.teams;
        state.incidents = s.incidents || state.incidents;
        state.observations = s.observations || state.observations;
        state.alerts = s.alerts || state.alerts;
        state.priorities = s.priorities || state.priorities;
        state.tasks = s.tasks || state.tasks;
        state.reliefRequests = s.reliefRequests || state.reliefRequests || [];
        state.incidentNotes = s.incidentNotes || state.incidentNotes || {};
        if (s.timeline) state.timeline = s.timeline;
      }
      return { ok: true, data };
    } else {
      updateBackendStatusUI(false);
      return { ok: false, error: data.error || 'Server error', data };
    }
  } catch (err) {
    updateBackendStatusUI(false);
    return { ok: false, error: err.message };
  }
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

    gMap.addListener('click', (e) => {
      if (isPickingReportCoords) {
        isPickingReportCoords = false;
        const lat = e.latLng.lat().toFixed(4);
        const lng = e.latLng.lng().toFixed(4);
        if (reportLat) reportLat.value = lat;
        if (reportLng) reportLng.value = lng;
        if (reportIncidentDialog) reportIncidentDialog.showModal();
        showToast('Coordinates Selected', `Selected Position: [${lat}, ${lng}]`);
      }
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
  const q = (searchQuery || '').trim().toLowerCase();
  return state.incidents.filter(inc => {
    const matchSearch = !q ||
      (inc.name && inc.name.toLowerCase().includes(q)) ||
      (inc.location && inc.location.toLowerCase().includes(q)) ||
      (inc.typeName && inc.typeName.toLowerCase().includes(q));

    const matchType = currentFilterType === 'ALL' || inc.type === currentFilterType;
    const matchSeverity = currentFilterSeverity === 'ALL' || inc.severity === currentFilterSeverity;
    const matchStatus = currentFilterStatus === 'ALL' ||
      inc.status === currentFilterStatus ||
      inc.lifecycleStatus === currentFilterStatus ||
      inc.responseStatus === currentFilterStatus;

    return matchSearch && matchType && matchSeverity && matchStatus;
  });
}

function clearFilters() {
  searchQuery = '';
  currentFilterType = 'ALL';
  currentFilterSeverity = 'ALL';
  currentFilterStatus = 'ALL';
  if (filterSearch) filterSearch.value = '';
  if (filterType) filterType.value = 'ALL';
  if (filterSeverity) filterSeverity.value = 'ALL';
  if (filterStatus) filterStatus.value = 'ALL';
  if (gMap) renderGoogleMapsPins();
  renderSchematicPins();
  renderIncidentDirectory();
  showToast('Filters Cleared', 'Displaying all incidents.');
}

function renderIncidentDirectory() {
  if (!incidentDirectoryList) return;
  const filtered = getFilteredIncidents();
  if (incidentsCountBadge) incidentsCountBadge.textContent = filtered.length;

  if (filtered.length === 0) {
    incidentDirectoryList.innerHTML = `
      <div class="empty-directory-state">
        <div style="font-size:24px;">🔍</div>
        <strong>No Incidents Found</strong>
        <span>No incidents match active search query or filters.</span>
        <button class="btn btn-xs btn-outline btn-empty-clear" type="button" style="margin-top:6px;">✕ Clear Filters</button>
      </div>
    `;
    const btnEmptyClear = incidentDirectoryList.querySelector('.btn-empty-clear');
    if (btnEmptyClear) btnEmptyClear.addEventListener('click', clearFilters);
    return;
  }

  incidentDirectoryList.innerHTML = filtered.map(inc => {
    const isSel = selectedIncident && selectedIncident.id === inc.id;
    const sevClass = (inc.severity || 'HIGH').toLowerCase();
    const verBadge = inc.verificationStatus === 'UNVERIFIED' 
      ? '<span class="badge-state pending" style="font-size:9px;">UNVERIFIED</span>'
      : '<span class="badge-state completed" style="font-size:9px;">VERIFIED</span>';
    return `
      <div class="directory-item ${isSel ? 'active' : ''}" data-id="${inc.id}">
        <div class="directory-item-head">
          <strong class="directory-item-title">${inc.icon || '⚠️'} ${inc.name}</strong>
          <span class="badge-severity ${sevClass}" style="font-size:9px;padding:1px 5px;">${inc.severity}</span>
        </div>
        <div class="directory-item-loc">📍 ${inc.location}</div>
        <div class="directory-item-tags">
          ${verBadge}
          <span class="badge-state assigned" style="font-size:9px;">${inc.lifecycleStatus || inc.status || 'REPORTED'}</span>
          <span style="font-size:10px;color:var(--text-muted);margin-left:auto;">${inc.reportTime || 'T+00:00'}</span>
        </div>
      </div>
    `;
  }).join('');

  incidentDirectoryList.querySelectorAll('.directory-item').forEach(el => {
    el.addEventListener('click', () => {
      const inc = state.incidents.find(i => i.id === el.dataset.id);
      if (inc) selectIncident(inc);
    });
  });
}

function renderGoogleMapsPins() {
  if (!gMap) return;

  gMapMarkers.forEach(m => m.setMap(null));
  gMapMarkers = [];

  const filtered = getFilteredIncidents();
  incidentsSummaryPill.textContent = `${filtered.length} Fictional Incident${filtered.length === 1 ? '' : 's'} Displayed${searchQuery || currentFilterType !== 'ALL' || currentFilterSeverity !== 'ALL' || currentFilterStatus !== 'ALL' ? ' (Filtered)' : ''}`;

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

  renderIncidentDirectory();
}

function renderSchematicPins() {
  if (!schematicIncidentPins) return;
  const filtered = getFilteredIncidents();
  incidentsSummaryPill.textContent = `${filtered.length} Fictional Incident${filtered.length === 1 ? '' : 's'} Displayed (Schematic)${searchQuery || currentFilterType !== 'ALL' || currentFilterSeverity !== 'ALL' || currentFilterStatus !== 'ALL' ? ' (Filtered)' : ''}`;

  let html = '';
  filtered.forEach(inc => {
    const isSelected = selectedIncident && selectedIncident.id === inc.id;
    const col = inc.severity === 'CRITICAL' ? '#f85149' : (inc.severity === 'HIGH' ? '#d29922' : '#e3b341');

    html += `
      <g class="schematic-pin ${isSelected ? 'is-selected' : ''}" data-id="${inc.id}" transform="translate(${inc.schematicPos.x}, ${inc.schematicPos.y})">
        <circle class="ring" cx="0" cy="0" r="24" fill="${col}" opacity="0.3" />
        <circle class="pin-circle" cx="0" cy="0" r="18" fill="#111a24" stroke="${col}" stroke-width="${isSelected ? '4' : '2'}" />
        <text x="0" y="6" text-anchor="middle" font-size="16">${inc.icon}</text>
        <rect x="-75" y="24" width="150" height="22" rx="4" fill="rgba(17,26,36,0.94)" stroke="#243548" />
        <text x="0" y="39" text-anchor="middle" fill="#fff" font-size="10.5" font-weight="700">${inc.typeName}</text>
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

  renderIncidentDirectory();
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
  schematicZoom = Math.max(0.35, Math.min(6.0, schematicZoom));
  const w = 2400 / schematicZoom;
  const h = 1600 / schematicZoom;
  const cx = 1200 - schematicPanX;
  const cy = 800 - schematicPanY;
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

  schematicRegionalSvg.addEventListener('click', (e) => {
    if (isPickingReportCoords) {
      isPickingReportCoords = false;
      const pt = schematicRegionalSvg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const svgP = pt.matrixTransform(schematicRegionalSvg.getScreenCTM().inverse());
      const calcLng = (72.8300 + (Math.max(0, Math.min(2400, svgP.x)) / 2400) * 0.0300).toFixed(4);
      const calcLat = (19.1100 - (Math.max(0, Math.min(1600, svgP.y)) / 1600) * 0.0300).toFixed(4);
      if (reportLat) reportLat.value = calcLat;
      if (reportLng) reportLng.value = calcLng;
      if (reportIncidentDialog) reportIncidentDialog.showModal();
      showToast('Coordinates Selected', `Tactical Position: [${calcLat}, ${calcLng}]`);
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
    schematicPanX = 1200 - inc.schematicPos.x;
    schematicPanY = 800 - inc.schematicPos.y;
    if (schematicZoom < 1.1) {
      schematicZoom = 1.35;
    }
    applySchematicTransform();
  }

  updatePinSelectionUI();
  renderIncidentDirectory();
}

function renderIncidentPanel(inc) {
  if (!inc) {
    if (incidentEmptyState) incidentEmptyState.classList.remove('hidden');
    if (incidentActiveContainer) incidentActiveContainer.classList.add('hidden');
    return;
  }

  if (incidentEmptyState) incidentEmptyState.classList.add('hidden');
  if (incidentActiveContainer) incidentActiveContainer.classList.remove('hidden');

  panelIncidentType.textContent = inc.typeName || inc.type;
  panelIncidentName.textContent = inc.name;

  panelSeverity.textContent = inc.severityLabel || `${inc.severity} (Level ${inc.severityLevel || 3})`;
  panelSeverity.className = `badge-severity ${(inc.severity || 'HIGH').toLowerCase()}`;

  panelVerification.textContent = inc.verificationStatus || 'UNVERIFIED';
  panelStatus.textContent = inc.lifecycleStatus || inc.statusLabel || inc.status || 'REPORTED';

  // Verification Controls Bar
  if (panelVerificationBar) {
    if (inc.verificationStatus === 'UNVERIFIED') {
      panelVerificationBar.style.display = 'flex';
    } else {
      panelVerificationBar.style.display = 'none';
    }
  }

  // Response Lifecycle dropdown
  if (panelLifecycleSelect) {
    panelLifecycleSelect.value = inc.lifecycleStatus || inc.status || 'REPORTED';
  }

  panelLocation.textContent = inc.location;
  panelReportTime.textContent = inc.reportTime;
  panelLastUpdate.textContent = inc.lastUpdate;
  panelSummary.textContent = inc.situationSummary;
  panelDisclaimer.textContent = `⚠ ${inc.dataDisclaimer || 'Simulated sensor observations'}`;
  panelAffected.textContent = inc.affectedZones;

  panelTeamName.textContent = inc.assignedTeamName || 'Unassigned';
  panelTeamStatus.textContent = inc.responseStatus || 'STAGED';

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

  // 3D Scene Action availability (Station Road Arcade Collapse only)
  if (inc.has3DScene) {
    btnOpen3DSite.classList.remove('hidden');
    btnOpen3DSite.disabled = false;
    site3DUnavailableMsg.classList.add('hidden');
  } else {
    btnOpen3DSite.classList.add('hidden');
    site3DUnavailableMsg.classList.remove('hidden');
  }

  // Update tabs counts
  const tasksForInc = (state.tasks || []).filter(t => t.incidentId === inc.id);
  const reliefForInc = (state.reliefRequests || []).filter(r => r.incidentId === inc.id);
  const activityForInc = getIncidentActivity(inc.id);

  if (panelTasksCount) panelTasksCount.textContent = tasksForInc.length;
  if (panelReliefCount) panelReliefCount.textContent = reliefForInc.length;
  if (panelHistoryCount) panelHistoryCount.textContent = activityForInc.length;

  // Render tab content
  renderIncidentTasks(inc.id);
  renderIncidentRelief(inc.id);
  renderIncidentActivity(inc.id);
}

function renderIncidentTasks(incidentId) {
  if (!panelTasksList) return;
  const tasks = (state.tasks || []).filter(t => t.incidentId === incidentId);

  if (tasks.length === 0) {
    panelTasksList.innerHTML = `
      <div class="empty-state" style="padding:20px;text-align:center;">
        No active tasks linked to this incident.
        <div style="margin-top:6px;">
          <button class="btn btn-xs btn-primary" id="btn-tasks-empty-create">+ Create First Task</button>
        </div>
      </div>
    `;
    const btnEmpty = panelTasksList.querySelector('#btn-tasks-empty-create');
    if (btnEmpty) btnEmpty.addEventListener('click', openCreateTaskDialog);
    return;
  }

  panelTasksList.innerHTML = tasks.map(task => {
    const statusClass = (task.status || 'PENDING').toLowerCase();
    const isCompleted = task.status === 'COMPLETED';
    const isAssigned = task.status === 'ASSIGNED';
    const isPending = task.status === 'PENDING';
    const isInProgress = task.status === 'IN_PROGRESS';

    return `
      <div class="task-card">
        <div class="card-top-row">
          <strong class="card-title">${task.title}</strong>
          <span class="badge-state ${statusClass}">${task.status}</span>
        </div>
        <div class="task-desc">${task.description || 'Inspection & field response task'}</div>
        <div class="task-meta-row">
          <span>🎯 Zone: <b>${task.targetZoneName || task.targetZone}</b></span>
          <span>👥 Team: <b>${task.teamName || 'Unassigned'}</b></span>
          <span>⚡ Priority: <b>${task.priority || 'MEDIUM'}</b></span>
        </div>
        ${task.notes ? `<div style="font-size:10.5px;color:var(--text-muted);font-style:italic;">Notes: ${task.notes}</div>` : ''}
        <div class="task-action-btns">
          ${isPending ? `
            <button class="btn btn-xs btn-primary btn-task-assign-now" data-id="${task.id}">Assign Team Vanguard</button>
          ` : ''}
          ${isAssigned ? `
            <button class="btn btn-xs btn-outline btn-task-start" data-id="${task.id}">▶ Mark In Progress</button>
            <button class="btn btn-xs btn-success btn-task-complete" data-id="${task.id}">✓ Complete Task</button>
          ` : ''}
          ${isInProgress ? `
            <button class="btn btn-xs btn-success btn-task-complete" data-id="${task.id}">✓ Complete Task</button>
          ` : ''}
          ${isCompleted ? `
            <span style="font-size:10.5px;color:#3fb950;">✓ Completed at ${task.completedAt || 'T+00:00'} (Hazard preserved)</span>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  panelTasksList.querySelectorAll('.btn-task-assign-now').forEach(btn => {
    btn.addEventListener('click', async () => {
      const res = await postServerAction('/api/task/status', {
        id: btn.dataset.id,
        status: 'ASSIGNED',
        teamId: 'TEAM_VANGUARD',
        operatorName: sessionOperatorName
      });
      if (res.ok) {
        showToast('Team Assigned', 'Team Vanguard assigned to task.');
        renderUI();
      } else {
        showToast('Assignment Rejected', res.error || 'Team busy. Conflict prevented.');
      }
    });
  });

  panelTasksList.querySelectorAll('.btn-task-start').forEach(btn => {
    btn.addEventListener('click', async () => {
      const res = await postServerAction('/api/task/status', {
        id: btn.dataset.id,
        status: 'IN_PROGRESS',
        operatorName: sessionOperatorName
      });
      if (res.ok) {
        showToast('Task In Progress', 'Team has begun execution.');
        renderUI();
      }
    });
  });

  panelTasksList.querySelectorAll('.btn-task-complete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const res = await postServerAction('/api/task/status', {
        id: btn.dataset.id,
        status: 'COMPLETED',
        notes: 'Task objectives completed by response unit.',
        operatorName: sessionOperatorName
      });
      if (res.ok) {
        showToast('Task Completed', 'Team freed to AVAILABLE. Note: Hazard condition preserved.');
        renderUI();
      }
    });
  });
}

function renderIncidentRelief(incidentId) {
  if (!panelReliefList) return;
  const requests = (state.reliefRequests || []).filter(r => r.incidentId === incidentId);

  if (requests.length === 0) {
    panelReliefList.innerHTML = `
      <div class="empty-state" style="padding:20px;text-align:center;">
        No relief requests logged for this incident.
        <div style="margin-top:6px;">
          <button class="btn btn-xs btn-primary" id="btn-relief-empty-create">+ Request Relief Supplies</button>
        </div>
      </div>
    `;
    const btnEmpty = panelReliefList.querySelector('#btn-relief-empty-create');
    if (btnEmpty) btnEmpty.addEventListener('click', openAddReliefDialog);
    return;
  }

  panelReliefList.innerHTML = requests.map(req => {
    const statusClass = (req.status || 'REQUESTED').toLowerCase();
    const isRequested = req.status === 'REQUESTED';
    const isAssigned = req.status === 'ASSIGNED';
    const isDelivered = req.status === 'DELIVERED';

    return `
      <div class="relief-card">
        <div class="card-top-row">
          <strong class="card-title">${req.itemLabel} (${req.quantity} ${req.unit})</strong>
          <span class="badge-state ${statusClass}">${req.status}</span>
        </div>
        <div class="relief-desc">📍 Destination: <b>${req.destination}</b></div>
        <div class="task-meta-row">
          <span>Priority: <b>${req.priority}</b></span>
          <span>Assigned Team: <b>${req.assignedTeamName || 'Unassigned'}</b></span>
          <span>Logged: <b>${req.requestedAt}</b></span>
        </div>
        ${req.notes ? `<div style="font-size:10.5px;color:var(--text-muted);font-style:italic;">Notes: ${req.notes}</div>` : ''}
        <div class="task-action-btns">
          ${isRequested ? `
            <button class="btn btn-xs btn-primary btn-relief-assign" data-id="${req.id}">🚚 Assign Team Atlas (Logistics)</button>
          ` : ''}
          ${isAssigned ? `
            <button class="btn btn-xs btn-success btn-relief-deliver" data-id="${req.id}">✓ Confirm Delivered</button>
          ` : ''}
          ${isDelivered ? `
            <span style="font-size:10.5px;color:#3fb950;">✓ Delivered at ${req.deliveredAt || 'T+00:00'} [Simulated]</span>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  panelReliefList.querySelectorAll('.btn-relief-assign').forEach(btn => {
    btn.addEventListener('click', async () => {
      const res = await postServerAction('/api/relief/status', {
        id: btn.dataset.id,
        status: 'ASSIGNED',
        assignedTeamId: 'TEAM_ATLAS',
        operatorName: sessionOperatorName
      });
      if (res.ok) {
        showToast('Relief Assigned', 'Assigned to Team Atlas (Logistics).');
        renderUI();
      }
    });
  });

  panelReliefList.querySelectorAll('.btn-relief-deliver').forEach(btn => {
    btn.addEventListener('click', async () => {
      const res = await postServerAction('/api/relief/status', {
        id: btn.dataset.id,
        status: 'DELIVERED',
        operatorName: sessionOperatorName
      });
      if (res.ok) {
        showToast('Relief Delivered', 'Supplies marked delivered at staging point.');
        renderUI();
      }
    });
  });
}

function getIncidentActivity(incidentId) {
  const events = (state.timeline || []).filter(e => e.incidentId === incidentId || (!e.incidentId && incidentId === 'inc-collapse-01' && (e.type === 'OBSERVATION' || e.type === 'CONFIRMATION')));
  const notes = (state.incidentNotes && state.incidentNotes[incidentId]) || [];

  const combined = [
    ...events.map(e => ({
      id: e.id,
      simTime: e.simTime,
      category: e.category || e.type,
      author: e.author || e.source || 'SYSTEM',
      title: e.title,
      detail: e.detail,
      timestamp: e.timestamp || 0
    })),
    ...notes.map(n => ({
      id: n.id,
      simTime: n.simTime,
      category: 'NOTE',
      author: n.author || 'Operator',
      title: `Operator Note by ${n.author}`,
      detail: n.text,
      timestamp: n.timestamp || 0
    }))
  ];

  combined.sort((a, b) => b.timestamp - a.timestamp);
  return combined;
}

function renderIncidentActivity(incidentId) {
  if (!panelActivityFeed) return;
  const allAct = getIncidentActivity(incidentId);

  const filter = filterIncidentActivity ? filterIncidentActivity.value : 'ALL';
  const filtered = allAct.filter(act => {
    if (filter === 'ALL') return true;
    const cat = (act.category || '').toUpperCase();
    if (filter === 'NOTE') return cat.includes('NOTE');
    if (filter === 'TASK') return cat.includes('TASK');
    if (filter === 'RELIEF') return cat.includes('RELIEF');
    if (filter === 'VERIFICATION') return cat.includes('VERIFICATION') || cat.includes('CONFIRM');
    if (filter === 'REPORT') return cat.includes('REPORT');
    if (filter === 'SYSTEM') return cat.includes('SYSTEM') || cat.includes('TELEMETRY');
    return true;
  });

  if (filtered.length === 0) {
    panelActivityFeed.innerHTML = `<div class="empty-state" style="padding:20px;text-align:center;">No activity logged for this incident matching filter.</div>`;
    return;
  }

  panelActivityFeed.innerHTML = filtered.map(item => {
    const catClass = (item.category || 'SYSTEM').toLowerCase().replace('_', '-');
    return `
      <div class="activity-item category-${catClass}">
        <div class="activity-item-head">
          <span class="activity-item-author">👤 ${item.author}</span>
          <span>${item.simTime}</span>
        </div>
        <div class="activity-item-title">${item.title}</div>
        <div class="activity-item-detail">${item.detail}</div>
      </div>
    `;
  }).join('');
}

function renderAlertInbox() {
  const alerts = state.alerts || [];

  // Update badge count
  const unackCount = alerts.filter(a => !a.acknowledged).length;
  if (inboxUnreadCount) {
    inboxUnreadCount.textContent = unackCount;
    inboxUnreadCount.style.display = unackCount > 0 ? 'inline-block' : 'none';
  }

  // Populate incident filter dropdown if empty
  if (inboxFilterIncident && inboxFilterIncident.options.length <= 1) {
    state.incidents.forEach(inc => {
      const opt = document.createElement('option');
      opt.value = inc.id;
      opt.textContent = `${inc.icon || '🏢'} ${inc.name}`;
      inboxFilterIncident.appendChild(opt);
    });
  }

  if (!inboxAlertsList) return;

  // Filter values
  const incFilter = inboxFilterIncident ? inboxFilterIncident.value : 'ALL';
  const typeFilter = inboxFilterType ? inboxFilterType.value : 'ALL';
  const ackFilter = inboxFilterAck ? inboxFilterAck.value : 'UNACK';

  const filtered = alerts.filter(alert => {
    const matchInc = incFilter === 'ALL' || alert.incidentId === incFilter;
    const matchType = typeFilter === 'ALL' || alert.type === typeFilter;
    const matchAck = ackFilter === 'ALL' || 
      (ackFilter === 'UNACK' && !alert.acknowledged) || 
      (ackFilter === 'ACK' && alert.acknowledged);
    return matchInc && matchType && matchAck;
  });

  if (filtered.length === 0) {
    inboxAlertsList.innerHTML = `
      <div class="empty-state" style="padding:40px 20px;text-align:center;">
        <div style="font-size:28px;margin-bottom:8px;">📬</div>
        <strong>No Alerts Matching Current Filter</strong>
        <p style="font-size:12px;color:var(--text-muted);margin-top:4px;">All ongoing hazards and notifications are either acknowledged or filtered out.</p>
      </div>
    `;
    return;
  }

  inboxAlertsList.innerHTML = filtered.map(a => {
    const isAck = a.acknowledged;
    return `
      <div class="alert-inbox-card ${isAck ? 'acknowledged' : 'unacknowledged'}">
        <div class="alert-card-head">
          <div style="display:flex;align-items:center;gap:6px;">
            <span class="badge-severity ${(a.severity || 'HIGH').toLowerCase()}" style="font-size:9.5px;padding:2px 6px;">${a.severity || 'HIGH'}</span>
            <strong class="alert-card-title">${a.title}</strong>
          </div>
          <span style="font-size:11px;font-family:var(--font-mono);color:#58a6ff;">${a.triggeredAt}</span>
        </div>
        <div class="alert-card-meta">
          <span>🏢 Incident: <b>${a.incidentName || a.incidentId || 'General'}</b></span>
          <span>📍 Zone: <b>${a.zone || 'Target Area'}</b></span>
          <span>📡 Source: <b>${a.source || 'SIMULATED_SENSOR'}</b></span>
        </div>
        <div class="alert-card-reason">
          <b>Trigger:</b> ${a.triggerReason}
        </div>
        <div class="alert-card-footer">
          <div>
            ${isAck ? `
              <span style="font-size:11px;color:#3fb950;font-weight:600;">✓ Acknowledged by ${a.acknowledgedBy || 'Operator'} at ${a.acknowledgedAt || ''}</span>
            ` : `
              <button class="btn btn-xs btn-primary btn-ack-alert" data-id="${a.id}">✓ Acknowledge Alert</button>
            `}
          </div>
          ${a.incidentId ? `
            <button class="btn btn-xs btn-outline btn-view-alert-inc" data-id="${a.incidentId}">🔍 View Incident Details</button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  inboxAlertsList.querySelectorAll('.btn-ack-alert').forEach(btn => {
    btn.addEventListener('click', async () => {
      const res = await postServerAction('/api/alert/acknowledge', {
        id: btn.dataset.id,
        operatorName: sessionOperatorName
      });
      if (res.ok) {
        showToast('Alert Acknowledged', 'Operator receipt logged. Hazard condition remains monitored.');
        renderAlertInbox();
        renderUI();
      }
    });
  });

  inboxAlertsList.querySelectorAll('.btn-view-alert-inc').forEach(btn => {
    btn.addEventListener('click', () => {
      const inc = state.incidents.find(i => i.id === btn.dataset.id);
      if (inc) {
        selectIncident(inc);
        if (alertInboxDialog) alertInboxDialog.close();
      }
    });
  });
}

function renderGlobalRelief() {
  const reqs = state.reliefRequests || [];
  if (reliefCountBadge) reliefCountBadge.textContent = reqs.length;
  if (!globalReliefList) return;

  if (reqs.length === 0) {
    globalReliefList.innerHTML = `<div class="empty-state" style="padding:40px 20px;text-align:center;">No relief requests recorded in session.</div>`;
    return;
  }

  globalReliefList.innerHTML = reqs.map(req => {
    const statusClass = (req.status || 'REQUESTED').toLowerCase();
    const isRequested = req.status === 'REQUESTED';
    const isAssigned = req.status === 'ASSIGNED';
    const isDelivered = req.status === 'DELIVERED';

    return `
      <div class="relief-card" style="margin-bottom:8px;">
        <div class="card-top-row">
          <strong class="card-title">${req.itemLabel} (${req.quantity} ${req.unit})</strong>
          <span class="badge-state ${statusClass}">${req.status}</span>
        </div>
        <div class="relief-desc">
          🏢 <b>${req.incidentName || req.incidentId}</b> — 📍 Destination: <b>${req.destination}</b>
        </div>
        <div class="task-meta-row">
          <span>Priority: <b>${req.priority}</b></span>
          <span>Assigned: <b>${req.assignedTeamName || 'Unassigned'}</b></span>
          <span>Time: <b>${req.requestedAt}</b></span>
        </div>
        <div class="task-action-btns">
          ${isRequested ? `
            <button class="btn btn-xs btn-primary btn-global-relief-assign" data-id="${req.id}">🚚 Assign Team Atlas</button>
          ` : ''}
          ${isAssigned ? `
            <button class="btn btn-xs btn-success btn-global-relief-deliver" data-id="${req.id}">✓ Confirm Delivered</button>
          ` : ''}
          ${isDelivered ? `
            <span style="font-size:10.5px;color:#3fb950;">✓ Delivered at ${req.deliveredAt || 'T+00:00'} [Simulated]</span>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  globalReliefList.querySelectorAll('.btn-global-relief-assign').forEach(btn => {
    btn.addEventListener('click', async () => {
      const res = await postServerAction('/api/relief/status', {
        id: btn.dataset.id,
        status: 'ASSIGNED',
        assignedTeamId: 'TEAM_ATLAS',
        operatorName: sessionOperatorName
      });
      if (res.ok) {
        showToast('Relief Assigned', 'Assigned to Team Atlas.');
        renderGlobalRelief();
        renderUI();
      }
    });
  });

  globalReliefList.querySelectorAll('.btn-global-relief-deliver').forEach(btn => {
    btn.addEventListener('click', async () => {
      const res = await postServerAction('/api/relief/status', {
        id: btn.dataset.id,
        status: 'DELIVERED',
        operatorName: sessionOperatorName
      });
      if (res.ok) {
        showToast('Relief Delivered', 'Supplies marked delivered.');
        renderGlobalRelief();
        renderUI();
      }
    });
  });
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

  if (site3DTitle) {
    site3DTitle.textContent = `${selectedIncident.name} — Site Workspace`;
  }

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

  if (selectedIncident) {
    renderIncidentPanel(selectedIncident);
    updatePinSelectionUI();
  }
}

function handle3DObjectClick(objData) {
  threeObjectFlyout.classList.remove('hidden');
  flyoutTitle.textContent = objData.name || 'Object Details';

  let html = '';
  if (objData.isZone) {
    const zone = state.site.zones[objData.id];
    const isNorthBlocked = objData.id === 'CORRIDOR_NORTH' && state.site.approaches.APPROACH_ALPHA.status === 'BLOCKED';
    html += `
      <div><b>Zone:</b> ${zone ? zone.name : objData.name} (${objData.tag || ''})</div>
      <div><b>Type:</b> ${zone ? zone.type.toUpperCase() : 'SEARCH AREA'}</div>
      <div><b>Access Status:</b> <span class="badge ${isNorthBlocked ? 'blocked' : 'clear'}">${isNorthBlocked ? 'BLOCKED' : 'CLEAR'}</span></div>
      <div><b>Rover Position:</b> ${state.rover.currentZone === objData.id ? 'Present (SUGRIV-01)' : 'Not in zone'}</div>
      <div><b>Assigned Tasks:</b> ${state.tasks.filter(t => t.targetZone === objData.id && t.status === 'ASSIGNED').length} active</div>
    `;
  } else if (objData.isHazard) {
    if (objData.id === 'hazard-block-01') {
      const obs = state.observations.find(o => o.id === 'obs-block-01' || o.type === 'BLOCKED_PASSAGE');
      if (obs && !obs.resolved) {
        html += `
          <div><b>Hazard:</b> ${obs.title}</div>
          <div><b>Verification:</b> <span class="badge ${obs.verification.toLowerCase()}">${obs.verification}</span></div>
          <div><b>Sensor Reading:</b> ${obs.reading || 'LiDAR Occlusion >85%'}</div>
          <div><b>Trigger Reason:</b> ${obs.triggerReason || 'Corridor blockage detected'}</div>
          <div><b>Affected Approach:</b> Approach Alpha (North Tunnel)</div>
          <div style="margin-top: 10px; display: flex; gap: 8px;">
            ${obs.verification === 'UNCONFIRMED' ? `
              <button class="btn btn-xs btn-primary btn-flyout-confirm" data-id="${obs.id}">✓ Confirm</button>
              <button class="btn btn-xs btn-outline btn-flyout-dismiss" data-id="${obs.id}">✕ Dismiss</button>
            ` : `
              <button class="btn btn-xs btn-outline btn-flyout-resolve" data-id="${obs.id}">Clear Rubble</button>
            `}
          </div>
        `;
      } else {
        html += `
          <div><b>Hazard:</b> Approach Alpha Obstacle</div>
          <div><b>Status:</b> Resolved / Corridor Clear</div>
        `;
      }
    } else if (objData.id === 'hazard-thermal-01') {
      const alert = state.alerts.find(a => a.type === 'THERMAL_ANOMALY');
      html += `
        <div><b>Hazard:</b> Elevated Thermal Hotspot (Sector C)</div>
        <div><b>Current Spot Temp:</b> <span style="color:#f85149;font-weight:700;">${state.rover.spotTempC.toFixed(1)} °C</span></div>
        <div><b>Rule:</b> RULE-THERM-04 (Sustained spot >50°C for >=3 cycles)</div>
        <div><b>Status:</b> ${alert ? alert.status : 'ACTIVE MONITORING'}</div>
        <div style="margin-top:6px; font-size:11px; color:#8b949e;">Note: Localized thermal anomaly only. Not modeled as spreading fire or structural collapse.</div>
        <div style="margin-top: 10px;">
          <button class="btn btn-xs btn-primary btn-flyout-assign-thermal">Assign Inspection Task</button>
        </div>
      `;
    }
  }

  flyoutContent.innerHTML = html;

  // Flyout action handlers
  const btnFlyConfirm = flyoutContent.querySelector('.btn-flyout-confirm');
  if (btnFlyConfirm) {
    btnFlyConfirm.addEventListener('click', () => {
      confirmBlockageObservation(btnFlyConfirm.dataset.id);
      threeObjectFlyout.classList.add('hidden');
    });
  }
  const btnFlyDismiss = flyoutContent.querySelector('.btn-flyout-dismiss');
  if (btnFlyDismiss) {
    btnFlyDismiss.addEventListener('click', () => {
      dismissBlockageObservation(btnFlyDismiss.dataset.id);
      threeObjectFlyout.classList.add('hidden');
    });
  }
  const btnFlyResolve = flyoutContent.querySelector('.btn-flyout-resolve');
  if (btnFlyResolve) {
    btnFlyResolve.addEventListener('click', () => {
      openActionDialog('Clear Rubble', 'Confirm obstacle removal on Approach Alpha:', (notes) => {
        resolveBlockageObservation(btnFlyResolve.dataset.id, notes);
      });
      threeObjectFlyout.classList.add('hidden');
    });
  }
  const btnFlyAssignThermal = flyoutContent.querySelector('.btn-flyout-assign-thermal');
  if (btnFlyAssignThermal) {
    btnFlyAssignThermal.addEventListener('click', () => {
      openAssignTaskDialog('Thermal Anomaly Inspection', 'SEARCH_ZONE', 'TEAM_VANGUARD');
      threeObjectFlyout.classList.add('hidden');
    });
  }
}

function openAssignTaskDialog(title, zone, team) {
  taskTitleInput.value = title || 'Inspection Task';
  taskZoneSelect.value = zone || 'SEARCH_ZONE';
  taskTeamSelect.value = team || 'TEAM_VANGUARD';
  taskOverrideInput.value = '';

  const availableTeams = Object.values(state.teams).filter(t => t.status === 'AVAILABLE');
  if (taskTeamWarning) {
    if (availableTeams.length === 0) {
      taskTeamWarning.classList.remove('hidden');
    } else {
      taskTeamWarning.classList.add('hidden');
    }
  }

  assignTaskDialog.showModal();
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
            <button class="btn btn-xs btn-outline btn-dismiss-obs" data-id="${obs.id}">✕ Dismiss</button>
          ` : `
            <button class="btn btn-xs btn-outline btn-resolve-obs" data-id="${obs.id}">Clear Rubble</button>
          `}
        </div>
      </article>
    `).join('');

    dockObservationsList.querySelectorAll('.btn-confirm-obs').forEach(btn => {
      btn.addEventListener('click', () => confirmBlockageObservation(btn.dataset.id));
    });
    dockObservationsList.querySelectorAll('.btn-dismiss-obs').forEach(btn => {
      btn.addEventListener('click', () => dismissBlockageObservation(btn.dataset.id));
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
        openAssignTaskDialog(btn.dataset.title, btn.dataset.zone, btn.dataset.team);
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
    alpha.statusReason = 'Suggested direct route (45m). Not guaranteed safe — subject to secondary collapse hazards.';
  }

  const alphaOk = alpha.status === 'CLEAR';
  const summary = state.site.accessSummary;

  if (alphaOk) {
    summary.activeRoute = 'APPROACH_ALPHA';
    summary.routingExplanation = 'Approach Alpha is unobstructed. Suggested direct ingress route (45m); not guaranteed safe — subject to secondary collapse hazards.';
  } else {
    summary.activeRoute = 'APPROACH_BRAVO';
    summary.routingExplanation = 'Approach Alpha is BLOCKED by confirmed rubble. Alternative perimeter bypass evaluated: Approach Bravo bypass (70m). Evaluated viable for ingress.';
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

  if (labelOperatorName) labelOperatorName.textContent = sessionOperatorName;

  // Side Panel Details (if open)
  if (selectedIncident) renderIncidentPanel(selectedIncident);

  // Sync directory, inbox, and global relief
  renderIncidentDirectory();
  renderAlertInbox();
  renderGlobalRelief();

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

function addTimelineEvent(type, title, detail, source = 'SYSTEM', incidentId = null, category = 'SYSTEM', author = null) {
  state.timeline.unshift({
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    simTime: formatSimTime(state.sim.elapsedSeconds),
    type,
    category: category || type,
    title,
    detail,
    source,
    incidentId: incidentId || (selectedIncident ? selectedIncident.id : null),
    author: author || sessionOperatorName || 'SYSTEM',
    timestamp: Date.now()
  });
  if (state.timeline.length > 100) state.timeline.pop();
}

function switchPanelTab(tabName) {
  activePanelTab = tabName;
  [tabBtnOverview, tabBtnTasks, tabBtnRelief, tabBtnHistory].forEach(btn => {
    if (btn) btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  [tabPaneOverview, tabPaneTasks, tabPaneRelief, tabPaneHistory].forEach(pane => {
    if (pane) pane.classList.toggle('active', pane.id === `tab-pane-${tabName}`);
  });
  if (selectedIncident) {
    if (tabName === 'tasks') renderIncidentTasks(selectedIncident.id);
    if (tabName === 'relief') renderIncidentRelief(selectedIncident.id);
    if (tabName === 'history') renderIncidentActivity(selectedIncident.id);
  }
}

function openCreateTaskDialog() {
  if (!createTaskDialog) return;
  if (modalTaskIncidentName) modalTaskIncidentName.textContent = selectedIncident ? selectedIncident.name : 'All Incidents';
  if (createTaskTitle) createTaskTitle.value = '';
  if (createTaskZone) createTaskZone.value = selectedIncident?.affectedZones?.split(',')[0]?.trim() || 'Sector A';
  if (createTaskPriority) createTaskPriority.value = 'HIGH';
  if (createTaskTeam) createTaskTeam.value = '';
  if (createTaskDesc) createTaskDesc.value = '';
  updateTeamCapabilityHint();
  createTaskDialog.showModal();
}

function updateTeamCapabilityHint() {
  if (!teamCapabilityHint || !createTaskTeam) return;
  const teamId = createTaskTeam.value;
  if (!teamId) {
    teamCapabilityHint.textContent = 'Team can be assigned now or kept Pending.';
    return;
  }
  const team = state.teams[teamId];
  if (team) {
    const isAvail = team.status === 'AVAILABLE';
    const caps = (team.capabilities || []).join(', ');
    teamCapabilityHint.innerHTML = `
      Status: <span class="badge-state ${isAvail ? 'completed' : 'pending'}">${team.status}</span>
      · Capabilities: <i>${caps}</i>
      ${!isAvail ? ' · <span style="color:#f85149;font-weight:700;">⚠ Conflict: Team currently busy</span>' : ''}
    `;
  }
}

function openAddReliefDialog() {
  if (!addReliefDialog) return;
  if (modalReliefIncidentName) modalReliefIncidentName.textContent = selectedIncident ? selectedIncident.name : 'General Dispatch';
  if (reliefDest && selectedIncident) reliefDest.value = selectedIncident.location;
  if (reliefNotes) reliefNotes.value = '';
  addReliefDialog.showModal();
}

async function postIncidentNote() {
  if (!inputIncidentNote || !selectedIncident) return;
  const text = inputIncidentNote.value.trim();
  if (!text) return;

  const res = await postServerAction('/api/incident/note', {
    incidentId: selectedIncident.id,
    text,
    author: sessionOperatorName
  });

  if (res.ok) {
    inputIncidentNote.value = '';
    showToast('Note Recorded', `Note posted by ${sessionOperatorName}.`);
    renderIncidentActivity(selectedIncident.id);
    renderUI();
  }
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
  addTimelineEvent('TELEMETRY', 'Rover Deployed', 'SUGRIV-01 forward ingress initiated towards Approach Alpha.', 'FORWARD_LIDAR');
  showToast('Phase 1: Ingress Recon', 'SUGRIV-01 scouting along Approach Alpha corridor.');
  renderUI();
}

function triggerBlockedPassage() {
  const obsId = 'obs-block-01';
  let obs = state.observations.find(o => o.id === obsId);
  if (!obs) {
    obs = {
      id: obsId,
      type: 'BLOCKED_PASSAGE',
      title: 'Structural Occlusion on Approach Alpha',
      zone: 'CORRIDOR_NORTH',
      approach: 'APPROACH_ALPHA',
      source: 'FORWARD_LIDAR',
      verification: 'UNCONFIRMED',
      timestamp: formatSimTime(state.sim.elapsedSeconds),
      reading: 'LiDAR Cross-Section Occlusion: 88.5%',
      triggerReason: 'Forward LiDAR rangefinder detected sudden cross-sectional corridor occlusion (>85%) at Waypoint N-2.',
      affectedApproach: 'Approach Alpha (North Tunnel)',
      resolved: false
    };
    state.observations.unshift(obs);
    state.rover.lidarDistanceM = 0.85;
    addTimelineEvent('OBSERVATION', 'Corridor Occlusion Detected', 'Forward LiDAR detected 88.5% obstacle occlusion on Approach Alpha.', 'FORWARD_LIDAR');
  }
  recalculateAccess();
  recalculatePriorities();
  renderUI();
  postServerAction('/api/sim/trigger', { event: 'trigger_blockage' });
  showToast('Phase 2: Occlusion Alert', 'Corridor blockage detected on Approach Alpha (Unconfirmed).');
}

function confirmBlockageObservation(id) {
  const obs = state.observations.find(o => o.id === id);
  if (!obs) return;

  obs.verification = 'CONFIRMED';
  obs.confirmedAt = formatSimTime(state.sim.elapsedSeconds);

  addTimelineEvent('CONFIRMATION', `Obstacle Confirmed: ${obs.title}`, `Operator confirmed ${obs.id}. Approach Alpha sealed.`, 'OPERATOR_INPUT');

  recalculateAccess();
  recalculatePriorities();
  renderUI();
  postServerAction('/api/observation/confirm', { id, notes: 'Operator confirmed via UI' });
  showToast('Obstacle Confirmed', 'Access recalculated: Approach Alpha restricted. Rerouted to Bravo bypass.');

  if (guidedDemoActive && guidedDemoStep === 2) {
    advanceGuidedDemo();
  }
}

function dismissBlockageObservation(id) {
  const obs = state.observations.find(o => o.id === id);
  if (!obs) return;

  obs.resolved = true;
  obs.dismissed = true;
  obs.verification = 'DISMISSED';
  obs.resolvedAt = formatSimTime(state.sim.elapsedSeconds);

  addTimelineEvent('OBSERVATION_DISMISSED', `Observation Dismissed: ${obs.title}`, 'Operator dismissed reading as sensor dust interference.', 'OPERATOR_INPUT');

  recalculateAccess();
  recalculatePriorities();
  renderUI();
  postServerAction('/api/observation/dismiss', { id });
  showToast('Observation Dismissed', 'Sensor artifact cleared. Approach Alpha remains open.');
}

function resolveBlockageObservation(id, notes) {
  const obs = state.observations.find(o => o.id === id);
  if (!obs) return;

  obs.resolved = true;
  obs.resolvedAt = formatSimTime(state.sim.elapsedSeconds);
  addTimelineEvent('HAZARD_RESOLVED', `Obstacle Cleared: ${obs.title}`, notes || 'Operator verified rubble cleared.', 'OPERATOR_INPUT');

  recalculateAccess();
  recalculatePriorities();
  renderUI();
  postServerAction('/api/observation/resolve', { id, notes });
  showToast('Obstacle Cleared', 'Passage restored to Approach Alpha.');
}

function stopRover() {
  state.rover.moving = false;
  state.rover.speedMps = 0.0;
  state.rover.status = 'STANDBY';
  if (site3D) site3D.stopManualDriving();
  addTimelineEvent('ROVER_CONTROL', 'Rover Emergency Halt', 'Operator triggered STOP. Vehicle halted immediately.', 'OPERATOR_INPUT');
  renderUI();
  postServerAction('/api/rover/stop', {});
  showToast('Rover Halted', 'SUGRIV-01 emergency stop activated. Movement halted.');
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
      source: 'OPTICAL_IR',
      verification: 'UNCONFIRMED',
      timestamp: formatSimTime(state.sim.elapsedSeconds),
      triggerReason: 'Narrow-FOV infrared radiometer detected rapid thermal rise above ambient baseline.',
      resolved: false
    };
    state.observations.unshift(obs);
    addTimelineEvent('OBSERVATION', 'Thermal Anomaly Active', 'Sustained temperature spike triggered in Sector C.', 'OPTICAL_IR');
  }

  recalculateAccess();
  recalculatePriorities();
  renderUI();
  postServerAction('/api/sim/trigger', { event: 'trigger_thermal' });
  showToast('Phase 3: Thermal Anomaly', 'Thermal spike active in Sector C Target Area.');
}

function assignTask(title, targetZone, teamId, overrideReason) {
  const team = state.teams[teamId];
  if (!team) return;

  const isOverride = Boolean(overrideReason && overrideReason.trim());
  const taskId = `task-${Date.now().toString().slice(-4)}`;

  const newTask = {
    id: taskId,
    incidentId: selectedIncident ? selectedIncident.id : 'inc-collapse-01',
    title: title || 'Inspection Task',
    targetZone: targetZone || 'SEARCH_ZONE',
    targetZoneName: state.site.zones[targetZone]?.name || targetZone,
    teamId,
    teamName: team.name,
    status: 'ASSIGNED',
    priority: 'HIGH',
    assignedAt: formatSimTime(state.sim.elapsedSeconds),
    isOverride,
    overrideReason: isOverride ? overrideReason.trim() : null
  };

  state.tasks.unshift(newTask);
  team.status = 'ASSIGNED';
  team.currentTaskId = taskId;

  addTimelineEvent('TASK_ASSIGNED', `Task Assigned: ${newTask.title}`, `${team.name} dispatched to ${newTask.targetZoneName}.`, 'OPERATOR_INPUT', newTask.incidentId, 'TASK');

  recalculatePriorities();
  renderUI();
  postServerAction('/api/task/assign', { title, targetZone, teamId, overrideReason });
  showToast('Task Dispatched', `${title} dispatched to ${team.name}.`);

  if (guidedDemoActive && guidedDemoStep === 4) {
    advanceGuidedDemo();
  }
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

  addTimelineEvent('TASK_COMPLETED', `Task Completed: ${task.title}`, `Field inspection concluded. Hazard remains under monitoring.`, 'OPERATOR_INPUT', task.incidentId, 'TASK');

  recalculatePriorities();
  renderUI();
  postServerAction('/api/task/complete', { id });
  showToast('Task Completed', 'Inspection concluded. Hazard remains monitored per protocol.');
}

function toggleConnection() {
  if (state.rover.connection === 'CONNECTED') {
    state.rover.connection = 'DISCONNECTED';
    state.rover.moving = false;
    state.rover.speedMps = 0.0;
    state.rover.isStale = true;
    addTimelineEvent('MISSION_CONTROL', 'RF Link Disconnected', 'Telemetry frozen; rover halted; link warning active.', 'FORWARD_LIDAR');
    postServerAction('/api/sim/control', { action: 'disconnect' });
    showToast('RF Link Lost', 'Telemetry frozen at last known packet.');
  } else {
    state.rover.connection = 'CONNECTED';
    state.rover.isStale = false;
    state.rover.moving = false;
    state.rover.speedMps = 0.0;
    state.rover.status = 'STANDBY';
    addTimelineEvent('MISSION_CONTROL', 'RF Link Restored', 'Telemetry reconnected; rover held on standby.', 'OPERATOR_INPUT');
    postServerAction('/api/sim/control', { action: 'reconnect' });
    showToast('RF Link Restored', 'Live telemetry resumed.');
  }
  recalculateAccess();
  recalculatePriorities();
  renderUI();
}

// --------------------------------------------------------------------------
// AUTOMATED TACTICAL MISSION SEQUENCE
// --------------------------------------------------------------------------
let guidedDemoActive = false;
let guidedDemoStep = 0;
let guidedDemoTimer = null;
let guidedDemoPaused = false;
let guidedDemoRemainingMs = 0;
let guidedDemoStepStartTime = 0;
let guidedDemoStepDuration = 0;

function setGuidedDemoTimeout(fn, delayMs) {
  if (guidedDemoTimer) clearTimeout(guidedDemoTimer);
  guidedDemoStepStartTime = Date.now();
  guidedDemoStepDuration = delayMs;
  guidedDemoRemainingMs = delayMs;
  guidedDemoPaused = false;
  guidedDemoTimer = setTimeout(() => {
    guidedDemoTimer = null;
    fn();
  }, delayMs);
}

function startGuidedDemo() {
  if (guidedDemoActive) {
    showToast('Sequence Active', 'Mission sequence is currently executing.');
    return;
  }
  guidedDemoActive = true;
  guidedDemoStep = 0;
  if (guidedDemoBanner) guidedDemoBanner.classList.remove('hidden');

  advanceGuidedDemo();
}

function advanceGuidedDemo() {
  if (!guidedDemoActive) return;
  if (guidedDemoTimer) {
    clearTimeout(guidedDemoTimer);
    guidedDemoTimer = null;
  }

  guidedDemoStep += 1;

  if (guidedDemoStep === 1) {
    if (demoStepBadge) demoStepBadge.textContent = 'PHASE 1 OF 5: INGRESS RECON';
    if (demoStepText) demoStepText.textContent = 'Station Road Arcade Collapse selected. 3D LiDAR site reconstruction active. Ingressing SUGRIV-01 along Approach Alpha...';
    selectIncident(state.incidents[0]);
    open3DSiteView();
    startNormalTelemetry();
    setGuidedDemoTimeout(() => advanceGuidedDemo(), 3200);
  } else if (guidedDemoStep === 2) {
    triggerBlockedPassage();
    if (demoStepBadge) demoStepBadge.textContent = 'PHASE 2 OF 5: OCCLUSION DETECTED';
    if (demoStepText) demoStepText.textContent = 'Forward LiDAR detected 88.5% occlusion on Approach Alpha. Click "✓ Confirm" on observation card to verify.';
  } else if (guidedDemoStep === 3) {
    if (demoStepBadge) demoStepBadge.textContent = 'PHASE 3 OF 5: REROUTED TO BRAVO';
    if (demoStepText) demoStepText.textContent = 'Approach Alpha restricted. Active route rerouted via Approach Bravo bypass (70m). Advancing into Sector C...';
    if (state.rover.currentZone !== 'CORRIDOR_SOUTH') {
      state.rover.currentZone = 'CORRIDOR_SOUTH';
      state.rover.coords3D = { x: 0, y: 0.5, z: 10 };
      renderUI();
    }
    setGuidedDemoTimeout(() => advanceGuidedDemo(), 3500);
  } else if (guidedDemoStep === 4) {
    triggerThermalAnomaly();
    if (demoStepBadge) demoStepBadge.textContent = 'PHASE 4 OF 5: THERMAL SPIKE (RULE-THERM-04)';
    if (demoStepText) demoStepText.textContent = 'Sustained temperature spike (>50°C) in Sector C triggered RULE-THERM-04. Click "Assign Task" under Investigation Priorities.';
  } else if (guidedDemoStep === 5) {
    if (demoStepBadge) demoStepBadge.textContent = 'PHASE 5 OF 5: SQUAD DISPATCHED';
    if (demoStepText) demoStepText.textContent = 'Team Vanguard dispatched to Sector C target area. Hazard remains monitored. Mission sequence concluded.';
    if (btnNextDemoStep) btnNextDemoStep.textContent = 'Restart Sequence ↺';
    setGuidedDemoTimeout(() => {
      if (demoStepBadge) demoStepBadge.textContent = 'Tactical Sequence Concluded';
      if (demoStepText) demoStepText.textContent = 'Operations live. You may inspect 3D zones, issue commands, or reset mission.';
    }, 6000);
  } else {
    resetSimulation();
    startGuidedDemo();
  }
}

function cancelGuidedDemo() {
  if (guidedDemoTimer) {
    clearTimeout(guidedDemoTimer);
    guidedDemoTimer = null;
  }
  guidedDemoActive = false;
  guidedDemoStep = 0;
  if (btnNextDemoStep) btnNextDemoStep.textContent = 'Next Phase ➡';
  if (guidedDemoBanner) guidedDemoBanner.classList.add('hidden');
  showToast('Mission Sequence Dismissed', 'Interface in manual tactical command.');
}

function resetSimulation() {
  cancelGuidedDemo();
  clearFilters();
  state = createInitialState();
  selectedIncident = state.incidents[0];
  if (site3D) site3D.resetCamera();
  addTimelineEvent('MISSION_CONTROL', 'Session Reset', 'All mission state, tasks, relief, overrides, and logs cleared.', 'OPERATOR_INPUT');
  postServerAction('/api/sim/control', { action: 'reset' });
  renderUI();
  showToast('Session Reset', 'Demo data restored across all views; session records cleared.');
}

async function runAutoDemo() {
  startGuidedDemo();
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

  const chosenTeam = state.teams[teamId];
  if (chosenTeam && chosenTeam.status !== 'AVAILABLE' && !overrideReason) {
    showToast('Override Required', `${chosenTeam.name} is currently deployed. Operator override rationale is required.`);
    taskOverrideInput.focus();
    return;
  }

  assignTaskDialog.close();
  assignTask(title, targetZone, teamId, overrideReason);
});

// About This Demo Dialog Handlers
if (btnAboutDemo && aboutDemoDialog) {
  btnAboutDemo.addEventListener('click', () => aboutDemoDialog.showModal());
}
if (btnCloseAboutDialog && aboutDemoDialog) {
  btnCloseAboutDialog.addEventListener('click', () => aboutDemoDialog.close());
}
if (btnAckAboutDialog && aboutDemoDialog) {
  btnAckAboutDialog.addEventListener('click', () => aboutDemoDialog.close());
}

// --------------------------------------------------------------------------
// EVENT LISTENERS & FILTERING
// --------------------------------------------------------------------------
if (filterSearch) {
  filterSearch.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    if (gMap) renderGoogleMapsPins();
    renderSchematicPins();
    renderIncidentDirectory();
  });
}

if (btnClearFilters) {
  btnClearFilters.addEventListener('click', clearFilters);
}

if (filterType) {
  filterType.addEventListener('change', (e) => {
    currentFilterType = e.target.value;
    if (gMap) renderGoogleMapsPins();
    renderSchematicPins();
    renderIncidentDirectory();
  });
}

if (filterSeverity) {
  filterSeverity.addEventListener('change', (e) => {
    currentFilterSeverity = e.target.value;
    if (gMap) renderGoogleMapsPins();
    renderSchematicPins();
    renderIncidentDirectory();
  });
}

if (filterStatus) {
  filterStatus.addEventListener('change', (e) => {
    currentFilterStatus = e.target.value;
    if (gMap) renderGoogleMapsPins();
    renderSchematicPins();
    renderIncidentDirectory();
  });
}

// Incident Directory Toggle
if (btnToggleIncidentList) {
  btnToggleIncidentList.addEventListener('click', () => {
    isDirectoryOpen = !isDirectoryOpen;
    incidentDirectoryPanel.classList.toggle('hidden', !isDirectoryOpen);
    renderIncidentDirectory();
  });
}
if (btnCloseDirectory) {
  btnCloseDirectory.addEventListener('click', () => {
    isDirectoryOpen = false;
    incidentDirectoryPanel.classList.add('hidden');
  });
}

// Operator Session Display Name Handlers
if (btnSessionOperator && operatorNameDialog) {
  btnSessionOperator.addEventListener('click', () => {
    if (inputOperatorDisplayName) inputOperatorDisplayName.value = sessionOperatorName;
    operatorNameDialog.showModal();
  });
}
if (operatorNameForm && operatorNameDialog) {
  operatorNameForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = inputOperatorDisplayName?.value?.trim();
    if (val) {
      sessionOperatorName = val;
      if (labelOperatorName) labelOperatorName.textContent = val;
      showToast('Session Name Saved', `Active session identifier: ${val}`);
    }
    operatorNameDialog.close();
  });
}
if (btnCloseOperatorDialog && operatorNameDialog) {
  btnCloseOperatorDialog.addEventListener('click', () => operatorNameDialog.close());
}
if (btnCancelOperatorDialog && operatorNameDialog) {
  btnCancelOperatorDialog.addEventListener('click', () => operatorNameDialog.close());
}

// FEATURE 2: Manual Incident Reporting Handlers
if (btnOpenReportIncident && reportIncidentDialog) {
  btnOpenReportIncident.addEventListener('click', () => {
    if (reportIncidentForm) reportIncidentForm.reset();
    if (reportLat) reportLat.value = (19.0980 + (Math.random() - 0.5) * 0.01).toFixed(4);
    if (reportLng) reportLng.value = (72.8450 + (Math.random() - 0.5) * 0.01).toFixed(4);
    if (reportTime) reportTime.value = formatSimTime(state.sim.elapsedSeconds);
    reportIncidentDialog.showModal();
  });
}
if (btnCloseReportDialog && reportIncidentDialog) {
  btnCloseReportDialog.addEventListener('click', () => reportIncidentDialog.close());
}
if (btnCancelReport && reportIncidentDialog) {
  btnCancelReport.addEventListener('click', () => {
    isPickingReportCoords = false;
    reportIncidentDialog.close();
  });
}
if (btnPickReportCoords && reportIncidentDialog) {
  btnPickReportCoords.addEventListener('click', () => {
    isPickingReportCoords = true;
    reportIncidentDialog.close();
    showToast('Location Picker Active', 'Click anywhere on the tactical map to set coordinates.');
  });
}
if (reportIncidentForm && reportIncidentDialog) {
  reportIncidentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = reportTitle?.value?.trim();
    const type = reportType?.value;
    const location = reportLocation?.value?.trim();
    const reportedSeverity = reportSeverity?.value;
    const lat = Number(reportLat?.value) || 19.0980;
    const lng = Number(reportLng?.value) || 72.8450;
    const observedTime = reportTime?.value?.trim() || formatSimTime(state.sim.elapsedSeconds);
    const description = reportDescription?.value?.trim() || 'Manual field report dispatched.';

    if (!title || !location) {
      showToast('Validation Error', 'Title and location are required.');
      return;
    }

    reportIncidentDialog.close();

    const res = await postServerAction('/api/incident/report', {
      title,
      type,
      location,
      reportedSeverity,
      description,
      observedTime,
      lat,
      lng,
      operatorName: sessionOperatorName
    });

    if (res.ok) {
      showToast('Incident Reported', `${title} logged as UNVERIFIED field report.`);
      if (res.data && res.data.incident) {
        selectIncident(res.data.incident);
      }
      if (gMap) renderGoogleMapsPins();
      renderSchematicPins();
      renderIncidentDirectory();
      renderAlertInbox();
      renderUI();
    } else {
      showToast('Reporting Failed', res.error || 'Failed to submit report.');
    }
  });
}

// Side Panel Verification Handlers
if (btnPanelVerifyInc) {
  btnPanelVerifyInc.addEventListener('click', async () => {
    if (!selectedIncident) return;
    const res = await postServerAction('/api/incident/verify', {
      id: selectedIncident.id,
      verificationStatus: 'VERIFIED',
      operatorName: sessionOperatorName,
      notes: 'Verified by operator ground check.'
    });
    if (res.ok) {
      selectedIncident.verificationStatus = 'VERIFIED';
      showToast('Incident Verified', `${selectedIncident.name} ground truth verified.`);
      renderIncidentPanel(selectedIncident);
      renderUI();
    }
  });
}

if (btnPanelRejectInc) {
  btnPanelRejectInc.addEventListener('click', async () => {
    if (!selectedIncident) return;
    const res = await postServerAction('/api/incident/verify', {
      id: selectedIncident.id,
      verificationStatus: 'REJECTED',
      operatorName: sessionOperatorName,
      notes: 'Rejected as false or duplicate report.'
    });
    if (res.ok) {
      selectedIncident.verificationStatus = 'REJECTED';
      showToast('Incident Rejected', `${selectedIncident.name} marked as rejected report.`);
      renderIncidentPanel(selectedIncident);
      renderUI();
    }
  });
}

// Side Panel Lifecycle Selector
if (panelLifecycleSelect) {
  panelLifecycleSelect.addEventListener('change', async (e) => {
    if (!selectedIncident) return;
    const newLifecycle = e.target.value;
    const res = await postServerAction('/api/incident/lifecycle', {
      id: selectedIncident.id,
      lifecycleStatus: newLifecycle,
      operatorName: sessionOperatorName
    });
    if (res.ok) {
      selectedIncident.lifecycleStatus = newLifecycle;
      selectedIncident.status = newLifecycle;
      selectedIncident.statusLabel = newLifecycle.charAt(0) + newLifecycle.slice(1).toLowerCase();
      showToast('Lifecycle Updated', `${selectedIncident.name} transitioned to ${newLifecycle}.`);
      renderIncidentPanel(selectedIncident);
      renderUI();
    }
  });
}

// Side Panel Tabs Navigation
if (tabBtnOverview) tabBtnOverview.addEventListener('click', () => switchPanelTab('overview'));
if (tabBtnTasks) tabBtnTasks.addEventListener('click', () => switchPanelTab('tasks'));
if (tabBtnRelief) tabBtnRelief.addEventListener('click', () => switchPanelTab('relief'));
if (tabBtnHistory) tabBtnHistory.addEventListener('click', () => switchPanelTab('history'));

// FEATURE 3: Create Task Modal Handlers
if (btnPanelCreateTask) btnPanelCreateTask.addEventListener('click', openCreateTaskDialog);
if (btnCloseCreateTask && createTaskDialog) btnCloseCreateTask.addEventListener('click', () => createTaskDialog.close());
if (btnCancelCreateTask && createTaskDialog) btnCancelCreateTask.addEventListener('click', () => createTaskDialog.close());
if (createTaskTeam) createTaskTeam.addEventListener('change', updateTeamCapabilityHint);

if (createTaskForm && createTaskDialog) {
  createTaskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = createTaskTitle?.value?.trim();
    const targetZone = createTaskZone?.value?.trim();
    const priority = createTaskPriority?.value;
    const teamId = createTaskTeam?.value || null;
    const description = createTaskDesc?.value?.trim();

    if (!title || !targetZone) {
      showToast('Validation Error', 'Task title and target zone are required.');
      return;
    }

    if (teamId) {
      const team = state.teams[teamId];
      if (team && team.status !== 'AVAILABLE') {
        showToast('Assignment Rejected', `${team.name} is currently busy (status: ${team.status}). Active conflict prevented.`);
        return;
      }
    }

    createTaskDialog.close();

    const res = await postServerAction('/api/task/create', {
      incidentId: selectedIncident ? selectedIncident.id : 'inc-collapse-01',
      title,
      description,
      targetZone,
      priority,
      teamId,
      operatorName: sessionOperatorName
    });

    if (res.ok) {
      showToast('Task Created', `Task "${title}" created.`);
      renderUI();
    } else {
      showToast('Task Creation Error', res.error || 'Failed to dispatch task.');
    }
  });
}

// FEATURE 4: Relief Requests Handlers
if (btnPanelCreateRelief) btnPanelCreateRelief.addEventListener('click', openAddReliefDialog);
if (btnCloseAddRelief && addReliefDialog) btnCloseAddRelief.addEventListener('click', () => addReliefDialog.close());
if (btnCancelAddRelief && addReliefDialog) btnCancelAddRelief.addEventListener('click', () => addReliefDialog.close());

if (addReliefForm && addReliefDialog) {
  addReliefForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const itemType = reliefItemType?.value;
    const priority = reliefPriority?.value;
    const quantity = Number(reliefQty?.value) || 100;
    const unit = reliefUnit?.value?.trim() || 'units';
    const destination = reliefDest?.value?.trim() || (selectedIncident ? selectedIncident.location : 'General Site');
    const notes = reliefNotes?.value?.trim();

    addReliefDialog.close();

    const res = await postServerAction('/api/relief/create', {
      incidentId: selectedIncident ? selectedIncident.id : 'inc-collapse-01',
      itemType,
      quantity,
      unit,
      destination,
      priority,
      notes,
      operatorName: sessionOperatorName
    });

    if (res.ok) {
      showToast('Relief Logged', `Relief request for ${quantity} ${unit} logged [Simulated].`);
      renderGlobalRelief();
      renderAlertInbox();
      renderUI();
    } else {
      showToast('Request Failed', res.error || 'Failed to log relief request.');
    }
  });
}

if (btnOpenReliefDialog && globalReliefDialog) {
  btnOpenReliefDialog.addEventListener('click', () => {
    renderGlobalRelief();
    globalReliefDialog.showModal();
  });
}
if (btnCloseGlobalRelief && globalReliefDialog) {
  btnCloseGlobalRelief.addEventListener('click', () => globalReliefDialog.close());
}
if (btnCloseGlobalReliefBottom && globalReliefDialog) {
  btnCloseGlobalReliefBottom.addEventListener('click', () => globalReliefDialog.close());
}

// FEATURE 5: Central Alert Inbox Handlers
if (btnOpenAlertInbox && alertInboxDialog) {
  btnOpenAlertInbox.addEventListener('click', () => {
    renderAlertInbox();
    alertInboxDialog.showModal();
  });
}
if (btnCloseInboxDialog && alertInboxDialog) {
  btnCloseInboxDialog.addEventListener('click', () => alertInboxDialog.close());
}
if (btnCloseInboxBottom && alertInboxDialog) {
  btnCloseInboxBottom.addEventListener('click', () => alertInboxDialog.close());
}
if (inboxFilterIncident) inboxFilterIncident.addEventListener('change', renderAlertInbox);
if (inboxFilterType) inboxFilterType.addEventListener('change', renderAlertInbox);
if (inboxFilterAck) inboxFilterAck.addEventListener('change', renderAlertInbox);

// FEATURE 6: Incident Notes & Activity History Handlers
if (btnPanelPostNote) btnPanelPostNote.addEventListener('click', postIncidentNote);
if (inputIncidentNote) {
  inputIncidentNote.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') postIncidentNote();
  });
}
if (filterIncidentActivity) {
  filterIncidentActivity.addEventListener('change', () => {
    if (selectedIncident) renderIncidentActivity(selectedIncident.id);
  });
}

// Side Panel Close
btnCloseSidePanel.addEventListener('click', () => {
  incidentSidePanel.classList.add('closed');
});

// 3D Scene Navigation
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
  if (threeNavHint) {
    threeNavHint.innerHTML = '<span>Left-click: <b>Rotate</b></span> | <span>Right-click / Shift: <b>Pan</b></span> | <span>Scroll: <b>Zoom</b></span> | <span>Click zone/rubble for inspection</span>';
  }
  if (site3D) site3D.setCameraMode('orbit');
});

btnCamRover.addEventListener('click', () => {
  btnCamRover.className = 'btn btn-sm btn-primary';
  btnCamOrbit.className = 'btn btn-sm btn-outline';
  roverHudOverlay.classList.remove('hidden');
  if (threeNavHint) {
    threeNavHint.innerHTML = '<span>Left-click Drag: <b>Look / Pan-Tilt Mast</b></span> | <span>Scroll: <b>Zoom (1x-4x)</b></span> | <span>W,A,S,D / Arrows: <b>Drive Rover</b></span> | <span>C: <b>Center Mast</b></span>';
  }
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

// Interactive HUD Mast Camera & Drive Controls
if (btnHudCamCenter) btnHudCamCenter.addEventListener('click', () => { if (site3D) site3D.centerMastCamera(); });
if (btnHudResumeRoute) btnHudResumeRoute.addEventListener('click', () => { if (site3D) site3D.resumeRoute(); });

// PTZ Gimbal Controls
if (btnPtzUp) btnPtzUp.addEventListener('click', () => { if (site3D) site3D.nudgeMast(0, 0.12); });
if (btnPtzDown) btnPtzDown.addEventListener('click', () => { if (site3D) site3D.nudgeMast(0, -0.12); });
if (btnPtzLeft) btnPtzLeft.addEventListener('click', () => { if (site3D) site3D.nudgeMast(0.15, 0); });
if (btnPtzRight) btnPtzRight.addEventListener('click', () => { if (site3D) site3D.nudgeMast(-0.15, 0); });
if (btnPtzReset) btnPtzReset.addEventListener('click', () => { if (site3D) site3D.centerMastCamera(); });
if (btnPtzZoomIn) btnPtzZoomIn.addEventListener('click', () => { if (site3D) site3D.zoomRover(-5); });
if (btnPtzZoomOut) btnPtzZoomOut.addEventListener('click', () => { if (site3D) site3D.zoomRover(5); });

// Rover Drive Controls
if (btnDriveFwd) btnDriveFwd.addEventListener('click', () => { if (site3D) site3D.driveRover(2.2, 0); });
if (btnDriveRev) btnDriveRev.addEventListener('click', () => { if (site3D) site3D.driveRover(-2.2, 0); });
if (btnDriveLeft) btnDriveLeft.addEventListener('click', () => { if (site3D) site3D.driveRover(0, 0.3); });
if (btnDriveRight) btnDriveRight.addEventListener('click', () => { if (site3D) site3D.driveRover(0, -0.3); });

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
    if (guidedDemoActive && guidedDemoTimer) {
      clearTimeout(guidedDemoTimer);
      guidedDemoTimer = null;
      guidedDemoRemainingMs = Math.max(500, guidedDemoStepDuration - (Date.now() - guidedDemoStepStartTime));
      guidedDemoPaused = true;
    }
  } else {
    state.sim.status = 'RUNNING';
    btnPlayPause.textContent = '⏸ Pause';
    if (guidedDemoActive && guidedDemoPaused) {
      setGuidedDemoTimeout(() => advanceGuidedDemo(), guidedDemoRemainingMs);
    }
  }
  renderUI();
});

btnToggleConn.addEventListener('click', toggleConnection);
btnReset.addEventListener('click', resetSimulation);

spd1x.addEventListener('click', () => updateSimulationSpeed(1));
spd2x.addEventListener('click', () => updateSimulationSpeed(2));
spd5x.addEventListener('click', () => updateSimulationSpeed(5));

// Guided Demo & Emergency Stop Controls
if (btnTopbarGuidedDemo) btnTopbarGuidedDemo.addEventListener('click', startGuidedDemo);
if (btnNextDemoStep) btnNextDemoStep.addEventListener('click', advanceGuidedDemo);
if (btnCancelDemo) btnCancelDemo.addEventListener('click', cancelGuidedDemo);
if (btnHudRoverStop) btnHudRoverStop.addEventListener('click', stopRover);
if (btnRoverStop) btnRoverStop.addEventListener('click', stopRover);

// Initialize application
initMapExperience();
await syncWithServer();
if (!selectedIncident) selectedIncident = state.incidents[0];
selectIncident(selectedIncident);
updateSimulationSpeed(1);
renderUI();


