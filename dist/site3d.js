// ==========================================================================
// SUGRIV 3D Interactive Site Environment (Three.js)
// Detailed interactive 3D scene for Sector 08 Commercial Building Collapse
// ==========================================================================

export function createSite3D(container, options = {}) {
  const THREE = window.THREE;
  if (!THREE) {
    console.error('Three.js library is not loaded');
    return null;
  }

  const width = container.clientWidth || 800;
  const height = container.clientHeight || 500;

  // Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x090e13);
  scene.fog = new THREE.FogExp2(0x090e13, 0.012);

  // Cameras
  // 1. Orbit Inspection Camera
  const orbitCamera = new THREE.PerspectiveCamera(50, width / height, 0.5, 300);
  const defaultCamPos = { x: 30, y: 25, z: 35 };
  orbitCamera.position.set(defaultCamPos.x, defaultCamPos.y, defaultCamPos.z);

  // 2. Rover Mast Virtual Camera (First-person perspective)
  const roverCamera = new THREE.PerspectiveCamera(65, width / height, 0.2, 200);

  let activeCamera = orbitCamera;
  let isRoverView = false;
  let followRover = false;

  // Orbit Control State
  let target = new THREE.Vector3(0, 2, 0);
  let spherical = { radius: 52, theta: 0.8, phi: 1.1 };
  let isDragging = false;
  let isPanning = false;
  let prevMouse = { x: 0, y: 0 };

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.innerHTML = '';
  container.appendChild(renderer.domElement);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0x243548, 1.2);
  scene.add(ambientLight);

  const moonLight = new THREE.DirectionalLight(0xa5c6e8, 1.4);
  moonLight.position.set(20, 45, 20);
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.width = 1024;
  moonLight.shadow.mapSize.height = 1024;
  scene.add(moonLight);

  const fillLight = new THREE.DirectionalLight(0x388bfd, 0.4);
  fillLight.position.set(-25, 20, -25);
  scene.add(fillLight);

  // Ground Terrain Grid
  const gridHelper = new THREE.GridHelper(90, 45, 0x243548, 0x162230);
  gridHelper.position.y = 0.02;
  scene.add(gridHelper);

  const groundGeo = new THREE.PlaneGeometry(120, 120);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x0c131a,
    roughness: 0.9,
    metalness: 0.1
  });
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);

  // Interactable Objects Array for Raycasting
  const interactables = [];

  // -------------------------------------------------------------------------
  // COLLAPSED BUILDING REMAINS & RUBBLE ARCHITECTURE
  // -------------------------------------------------------------------------
  const rubbleGroup = new THREE.Group();
  scene.add(rubbleGroup);

  const slabMat = new THREE.MeshStandardMaterial({ color: 0x3d4a58, roughness: 0.85, metalness: 0.15 });
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x516173, roughness: 0.7 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x8c3b2b, roughness: 0.5, metalness: 0.7 });
  const rubbleMat = new THREE.MeshStandardMaterial({ color: 0x273340, roughness: 0.95 });

  // Tilted Concrete Floor Slabs
  function createSlab(w, d, h, x, y, z, rx, ry, rz) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, slabMat);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    rubbleGroup.add(mesh);
    return mesh;
  }

  // Tilted floor sections representing structural collapse
  createSlab(16, 12, 0.8, -6, 3.5, -4, 0.18, 0.05, 0.22);
  createSlab(14, 14, 0.8, 6, 2.8, -5, -0.15, 0.25, -0.18);
  createSlab(18, 10, 0.7, 12, 4.2, 6, 0.12, -0.15, -0.2);
  createSlab(12, 8, 0.6, -10, 2.0, 8, -0.2, 0.1, 0.15);

  // Concrete Pillar Stumps
  function createPillar(h, x, z, angle = 0) {
    const geo = new THREE.CylinderGeometry(0.7, 0.8, h, 8);
    const mesh = new THREE.Mesh(geo, pillarMat);
    mesh.position.set(x, h / 2, z);
    mesh.rotation.z = angle;
    mesh.castShadow = true;
    rubbleGroup.add(mesh);
  }
  createPillar(6, -12, -8, 0.1);
  createPillar(4.5, -4, -14, -0.15);
  createPillar(5.2, 8, -12, 0.2);
  createPillar(3.8, 16, 4, -0.25);
  createPillar(5.0, 4, 14, 0.05);

  // Steel I-Beams
  function createIBeam(len, x, y, z, rx, ry, rz) {
    const geo = new THREE.BoxGeometry(0.4, 0.6, len);
    const mesh = new THREE.Mesh(geo, steelMat);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    mesh.castShadow = true;
    rubbleGroup.add(mesh);
  }
  createIBeam(14, -2, 4.5, -3, 0.3, 0.5, 0.4);
  createIBeam(16, 8, 3.8, 2, -0.2, 0.8, -0.5);
  createIBeam(12, -8, 2.5, 5, 0.5, -0.2, 0.6);

  // Debris Clusters
  for (let i = 0; i < 40; i++) {
    const sz = 0.4 + Math.random() * 1.2;
    const geo = new THREE.DodecahedronGeometry(sz, 0);
    const mesh = new THREE.Mesh(geo, rubbleMat);
    const ang = Math.random() * Math.PI * 2;
    const dist = 4 + Math.random() * 24;
    mesh.position.set(Math.cos(ang) * dist, sz / 2, Math.sin(ang) * dist);
    mesh.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    mesh.castShadow = true;
    rubbleGroup.add(mesh);
  }

  // -------------------------------------------------------------------------
  // NAMED SEARCH ZONES & FLOATING 3D LABELS
  // -------------------------------------------------------------------------
  const zonesGroup = new THREE.Group();
  scene.add(zonesGroup);

  function createZoneMarker(id, name, tag, x, z, colorHex) {
    const group = new THREE.Group();
    group.position.set(x, 0.05, z);

    // Glowing base ring
    const ringGeo = new THREE.RingGeometry(2.8, 3.3, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    group.add(ringMesh);

    // Center pad
    const padGeo = new THREE.CircleGeometry(2.7, 32);
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x111a24,
      roughness: 0.8,
      transparent: true,
      opacity: 0.85
    });
    const padMesh = new THREE.Mesh(padGeo, padMat);
    padMesh.rotation.x = -Math.PI / 2;
    group.add(padMesh);

    // Zone Pillar Beacon Light
    const beaconGeo = new THREE.CylinderGeometry(0.1, 0.1, 4, 8);
    const beaconMat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.4 });
    const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
    beaconMesh.position.y = 2;
    group.add(beaconMesh);

    group.userData = {
      isZone: true,
      id,
      name,
      tag
    };
    interactables.push(group);
    zonesGroup.add(group);
    return group;
  }

  const zoneEntry = createZoneMarker('ENTRY', 'Alpha Gate', 'Entry Point (Staging)', -20, 0, 0x2f81f7);
  const zoneAlpha = createZoneMarker('CORRIDOR_NORTH', 'Approach Alpha', 'North Corridor Passage', 0, -10, 0x238636);
  const zoneBravo = createZoneMarker('CORRIDOR_SOUTH', 'Approach Bravo', 'South Service Passage', 0, 10, 0x388bfd);
  const zoneSearch = createZoneMarker('SEARCH_ZONE', 'Sector C', 'Primary Search Target Area', 20, 0, 0xf85149);

  // -------------------------------------------------------------------------
  // DYNAMIC APPROACH ROUTE SPLINE
  // -------------------------------------------------------------------------
  let routeLineMesh = null;
  function updateRouteSpline(activeRoute, isBlocked) {
    if (routeLineMesh) scene.remove(routeLineMesh);

    let curvePoints;
    let color;
    if (activeRoute === 'APPROACH_ALPHA') {
      curvePoints = [
        new THREE.Vector3(-20, 0.3, 0),
        new THREE.Vector3(-10, 0.4, -6),
        new THREE.Vector3(0, 0.4, -10),
        new THREE.Vector3(10, 0.4, -6),
        new THREE.Vector3(20, 0.3, 0)
      ];
      color = isBlocked ? 0xf85149 : 0x3fb950;
    } else {
      // Approach Bravo Bypass
      curvePoints = [
        new THREE.Vector3(-20, 0.3, 0),
        new THREE.Vector3(-10, 0.4, 6),
        new THREE.Vector3(0, 0.4, 10),
        new THREE.Vector3(10, 0.4, 6),
        new THREE.Vector3(20, 0.3, 0)
      ];
      color = 0x388bfd;
    }

    const curve = new THREE.CatmullRomCurve3(curvePoints);
    const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.22, 8, false);
    const tubeMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.85,
      wireframe: isBlocked
    });
    routeLineMesh = new THREE.Mesh(tubeGeo, tubeMat);
    scene.add(routeLineMesh);
  }
  updateRouteSpline('APPROACH_ALPHA', false);

  // -------------------------------------------------------------------------
  // RECORDED HAZARDS: 3D THERMAL HOTSPOT & BLOCKED PASSAGE
  // -------------------------------------------------------------------------
  // 1. Thermal Hotspot in Sector C
  const thermalGroup = new THREE.Group();
  thermalGroup.position.set(20, 1.8, 0);

  const heatSphereGeo = new THREE.SphereGeometry(2.4, 24, 24);
  const heatSphereMat = new THREE.MeshBasicMaterial({
    color: 0xf85149,
    transparent: true,
    opacity: 0.45,
    wireframe: true
  });
  const heatSphereMesh = new THREE.Mesh(heatSphereGeo, heatSphereMat);
  thermalGroup.add(heatSphereMesh);

  const heatPointLight = new THREE.PointLight(0xf85149, 1.8, 22);
  thermalGroup.add(heatPointLight);

  thermalGroup.userData = {
    isHazard: true,
    id: 'hazard-thermal-01',
    name: 'Sector C Thermal Hotspot',
    type: 'HIGH THERMAL GRADIENT'
  };
  interactables.push(thermalGroup);
  scene.add(thermalGroup);

  // 2. Rubble Blockage Obstacle at Approach Alpha (drops down when triggered)
  const blockageGroup = new THREE.Group();
  blockageGroup.position.set(0, 0, -10);

  const blockGeo = new THREE.BoxGeometry(4.5, 3.2, 3.5);
  const blockMat = new THREE.MeshStandardMaterial({
    color: 0x4d2828,
    roughness: 0.9,
    metalness: 0.1
  });
  const blockMesh = new THREE.Mesh(blockGeo, blockMat);
  blockMesh.position.y = 1.6;
  blockMesh.castShadow = true;
  blockageGroup.add(blockMesh);

  // Warning barrier stripe
  const stripeGeo = new THREE.BoxGeometry(4.6, 0.4, 0.4);
  const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffdf5d });
  const stripeMesh = new THREE.Mesh(stripeGeo, stripeMat);
  stripeMesh.position.set(0, 1.8, 1.8);
  blockageGroup.add(stripeMesh);

  blockageGroup.userData = {
    isHazard: true,
    id: 'hazard-block-01',
    name: 'Approach Alpha Rubble Collapse',
    type: 'BLOCKED PASSAGE'
  };
  interactables.push(blockageGroup);
  blockageGroup.visible = false; // Initially hidden until triggered
  scene.add(blockageGroup);

  // -------------------------------------------------------------------------
  // 3D ROVER MESH WITH SPOTLIGHTS & SCANNER
  // -------------------------------------------------------------------------
  const roverGroup = new THREE.Group();
  roverGroup.position.set(-20, 0.5, 0);

  // Chassis
  const chassisGeo = new THREE.BoxGeometry(2.4, 0.8, 1.6);
  const chassisMat = new THREE.MeshStandardMaterial({ color: 0x1b293a, roughness: 0.4, metalness: 0.6 });
  const chassisMesh = new THREE.Mesh(chassisGeo, chassisMat);
  chassisMesh.castShadow = true;
  roverGroup.add(chassisMesh);

  // 4 Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 16);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x080c10, roughness: 0.9 });
  const wheelPositions = [
    [-0.9, -0.2, 0.95],
    [0.9, -0.2, 0.95],
    [-0.9, -0.2, -0.95],
    [0.9, -0.2, -0.95]
  ];
  wheelPositions.forEach(([wx, wy, wz]) => {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(wx, wy, wz);
    wheel.castShadow = true;
    roverGroup.add(wheel);
  });

  // Sensor Mast
  const mastGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8);
  const mastMat = new THREE.MeshStandardMaterial({ color: 0x58a6ff, metalness: 0.8 });
  const mastMesh = new THREE.Mesh(mastGeo, mastMat);
  mastMesh.position.set(0.6, 0.9, 0);
  roverGroup.add(mastMesh);

  // Rotating LiDAR puck
  const lidarGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.25, 12);
  const lidarMat = new THREE.MeshBasicMaterial({ color: 0x3fb950 });
  const lidarPuck = new THREE.Mesh(lidarGeo, lidarMat);
  lidarPuck.position.set(0.6, 1.55, 0);
  roverGroup.add(lidarPuck);

  // Headlights
  const headlight1 = new THREE.SpotLight(0xffffff, 2.5, 30, Math.PI / 6, 0.4);
  headlight1.position.set(1.2, 0.4, 0.5);
  const headlightTarget1 = new THREE.Object3D();
  headlightTarget1.position.set(6, 0.2, 0.5);
  scene.add(headlightTarget1);
  headlight1.target = headlightTarget1;
  roverGroup.add(headlight1);

  const headlight2 = new THREE.SpotLight(0xffffff, 2.5, 30, Math.PI / 6, 0.4);
  headlight2.position.set(1.2, 0.4, -0.5);
  const headlightTarget2 = new THREE.Object3D();
  headlightTarget2.position.set(6, 0.2, -0.5);
  scene.add(headlightTarget2);
  headlight2.target = headlightTarget2;
  roverGroup.add(headlight2);

  scene.add(roverGroup);

  // Position virtual roverCamera onto rover mast
  roverGroup.add(roverCamera);
  roverCamera.position.set(0.7, 1.4, 0);
  roverCamera.rotation.y = -Math.PI / 2; // Look forward (+X direction)

  // -------------------------------------------------------------------------
  // INTERACTIVE ORBIT CAMERA CONTROLS
  // -------------------------------------------------------------------------
  function updateOrbitCamera() {
    spherical.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, spherical.phi));
    spherical.radius = Math.max(8, Math.min(120, spherical.radius));

    const x = target.x + spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
    const y = target.y + spherical.radius * Math.cos(spherical.phi);
    const z = target.z + spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);

    orbitCamera.position.set(x, y, z);
    orbitCamera.lookAt(target);
  }
  updateOrbitCamera();

  const dom = renderer.domElement;

  dom.addEventListener('mousedown', (e) => {
    isDragging = true;
    isPanning = e.button === 2 || e.shiftKey;
    prevMouse = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
    isPanning = false;
  });

  dom.addEventListener('contextmenu', (e) => e.preventDefault());

  dom.addEventListener('mousemove', (e) => {
    if (!isDragging || isRoverView) return;

    const dx = e.clientX - prevMouse.x;
    const dy = e.clientY - prevMouse.y;
    prevMouse = { x: e.clientX, y: e.clientY };

    if (isPanning) {
      // Pan camera
      const panSpeed = spherical.radius * 0.0015;
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(orbitCamera.quaternion);
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(orbitCamera.quaternion);
      target.addScaledVector(right, -dx * panSpeed);
      target.addScaledVector(up, dy * panSpeed);
    } else {
      // Orbit rotate
      spherical.theta -= dx * 0.006;
      spherical.phi -= dy * 0.006;
    }
    updateOrbitCamera();
  });

  dom.addEventListener('wheel', (e) => {
    if (isRoverView) return;
    spherical.radius += e.deltaY * 0.05;
    updateOrbitCamera();
  }, { passive: true });

  // Raycaster for Clicking 3D Objects
  const raycaster = new THREE.Raycaster();
  const mouseVec = new THREE.Vector2();

  dom.addEventListener('click', (e) => {
    const rect = dom.getBoundingClientRect();
    mouseVec.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseVec.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouseVec, activeCamera);
    const hits = raycaster.intersectObjects(interactables, true);
    if (hits.length > 0) {
      let topObj = hits[0].object;
      while (topObj.parent && !topObj.userData?.name) {
        topObj = topObj.parent;
      }
      if (topObj.userData && options.onObjectClick) {
        options.onObjectClick(topObj.userData);
      }
    }
  });

  // Handle Resize
  function handleResize() {
    const w = container.clientWidth || 800;
    const h = container.clientHeight || 500;
    orbitCamera.aspect = w / h;
    orbitCamera.updateProjectionMatrix();
    roverCamera.aspect = w / h;
    roverCamera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', handleResize);

  // -------------------------------------------------------------------------
  // ANIMATION LOOP
  // -------------------------------------------------------------------------
  let clock = new THREE.Clock();
  let animId = null;

  function animate() {
    animId = requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const time = clock.getElapsedTime();

    // Rotate lidar puck
    lidarPuck.rotation.y += 6 * delta;

    // Pulse thermal hazard
    const pulse = 1 + 0.12 * Math.sin(time * 3);
    heatSphereMesh.scale.set(pulse, pulse, pulse);
    heatPointLight.intensity = 1.4 + 0.6 * Math.sin(time * 3);

    // Follow Rover
    if (followRover && !isRoverView) {
      target.lerp(new THREE.Vector3(roverGroup.position.x, 2, roverGroup.position.z), 0.08);
      updateOrbitCamera();
    }

    renderer.render(scene, activeCamera);
  }
  animate();

  // -------------------------------------------------------------------------
  // PUBLIC CONTROLLER API
  // -------------------------------------------------------------------------
  return {
    setCameraMode(mode) {
      if (mode === 'rover') {
        isRoverView = true;
        activeCamera = roverCamera;
      } else {
        isRoverView = false;
        activeCamera = orbitCamera;
        updateOrbitCamera();
      }
    },

    setFollowRover(enabled) {
      followRover = Boolean(enabled);
    },

    resetCamera() {
      target.set(0, 2, 0);
      spherical = { radius: 52, theta: 0.8, phi: 1.1 };
      updateOrbitCamera();
    },

    updateFromState(s) {
      if (!s) return;

      // Update Rover Position in 3D scene
      const activeRoute = s.site.accessSummary.activeRoute;
      let targetX = -20;
      let targetZ = 0;
      let heading = 0; // facing +X (towards search)

      if (s.rover.currentZone === 'ENTRY') {
        targetX = -20;
        targetZ = 0;
        heading = activeRoute === 'APPROACH_ALPHA' ? -Math.PI / 4 : Math.PI / 4;
      } else if (s.rover.currentZone === 'CORRIDOR_NORTH') {
        targetX = 0;
        targetZ = -10;
        heading = 0;
      } else if (s.rover.currentZone === 'CORRIDOR_SOUTH') {
        targetX = 0;
        targetZ = 10;
        heading = 0;
      } else if (s.rover.currentZone === 'SEARCH_ZONE') {
        targetX = 20;
        targetZ = 0;
        heading = 0;
      }

      // Smooth lerp rover position
      roverGroup.position.x += (targetX - roverGroup.position.x) * 0.15;
      roverGroup.position.z += (targetZ - roverGroup.position.z) * 0.15;
      roverGroup.rotation.y = heading;

      // Obstacle Barrier (Approach Alpha)
      const hasBlockage = s.observations.some(o => o.type === 'BLOCKED_PASSAGE' && !o.resolved);
      const isConfirmed = s.observations.some(o => o.type === 'BLOCKED_PASSAGE' && o.verification === 'CONFIRMED' && !o.resolved);
      blockageGroup.visible = hasBlockage;
      blockMesh.material.color.setHex(isConfirmed ? 0xf85149 : 0x8c622b);

      // Route Spline Update
      updateRouteSpline(activeRoute, isConfirmed);

      // Heat Anomaly in Sector C
      const hasHeat = s.rover.spotTempC > 45 || s.alerts.some(a => a.type === 'THERMAL_ANOMALY' && a.status !== 'RESOLVED');
      thermalGroup.visible = hasHeat;
      if (hasHeat) {
        const heatFrac = Math.min(1.8, Math.max(0.4, (s.rover.spotTempC - 20) / 50));
        heatSphereMesh.scale.set(heatFrac, heatFrac, heatFrac);
      }
    },

    resize() {
      handleResize();
    },

    dispose() {
      if (animId) cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    }
  };
}
