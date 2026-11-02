import * as THREE from "three";

const root = document.querySelector("#game");
const intro = document.querySelector("#intro");
const startButton = document.querySelector("#start-button");
const controlsHint = document.querySelector("#controls");
const sideNote = document.querySelector("#side-note");
const clockLabel = document.querySelector("#clock");
const coordinateLabel = document.querySelector("#coordinates");
const toast = document.querySelector("#toast");

const scene = new THREE.Scene();
scene.background = new THREE.Color("#91b5a6");
scene.fog = new THREE.Fog("#91b5a6", 45, 185);

const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 500);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.domElement.setAttribute("aria-label", "Świat gry 3D. Użyj WASD, aby się poruszać, i przeciągnij, aby rozejrzeć się.");
root.prepend(renderer.domElement);

const hemiLight = new THREE.HemisphereLight("#dcefdc", "#25372a", 1.05);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight("#ffe4b8", 2.25);
sunLight.position.set(-40, 65, 35);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(1024, 1024);
sunLight.shadow.camera.left = -55;
sunLight.shadow.camera.right = 55;
sunLight.shadow.camera.top = 55;
sunLight.shadow.camera.bottom = -55;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 180;
sunLight.shadow.bias = -0.00015;
scene.add(sunLight);
scene.add(sunLight.target);

const groundMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
const groundGeometry = new THREE.PlaneGeometry(420, 420, 96, 96);
groundGeometry.rotateX(-Math.PI / 2);
const groundPositions = groundGeometry.attributes.position;
const groundColors = [];
const lowGrass = new THREE.Color("#526d4a");
const highGrass = new THREE.Color("#82966a");
const clearingGrass = new THREE.Color("#9a9b68");

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function smoothstep(edge0, edge1, value) {
  const x = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
}

function groundHeight(x, z) {
  const distance = Math.hypot(x, z);
  const hills = Math.sin(x * 0.031) * Math.cos(z * 0.026) * 2.1
    + Math.sin((x + z) * 0.052) * 0.8
    + Math.cos((x - z) * 0.041) * 0.55;
  return hills * smoothstep(0, 38, distance);
}

for (let i = 0; i < groundPositions.count; i += 1) {
  const x = groundPositions.getX(i);
  const z = groundPositions.getZ(i);
  const y = groundHeight(x, z);
  groundPositions.setY(i, y);
  const grass = lowGrass.clone().lerp(highGrass, clamp((y + 2.2) / 6, 0, 0.85));
  grass.lerp(clearingGrass, (1 - smoothstep(0, 27, Math.hypot(x, z))) * 0.66);
  groundColors.push(grass.r, grass.g, grass.b);
}
groundGeometry.setAttribute("color", new THREE.Float32BufferAttribute(groundColors, 3));
groundGeometry.computeVertexNormals();
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.receiveShadow = true;
scene.add(ground);

const pathCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-95, 0, 34),
  new THREE.Vector3(-66, 0, 24),
  new THREE.Vector3(-43, 0, 12),
  new THREE.Vector3(-23, 0, 4),
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(28, 0, -7),
  new THREE.Vector3(50, 0, -17),
  new THREE.Vector3(73, 0, -27),
  new THREE.Vector3(100, 0, -43),
]);
const pathPoints = pathCurve.getPoints(180);
const pathVertices = [];
const pathIndices = [];
for (let i = 0; i < pathPoints.length; i += 1) {
  const point = pathPoints[i];
  const tangent = pathCurve.getTangent(i / (pathPoints.length - 1));
  const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize().multiplyScalar(3.1);
  for (const direction of [-1, 1]) {
    const x = point.x + side.x * direction;
    const z = point.z + side.z * direction;
    pathVertices.push(x, groundHeight(x, z) + 0.035, z);
  }
  if (i < pathPoints.length - 1) {
    const base = i * 2;
    pathIndices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
  }
}
const pathGeometry = new THREE.BufferGeometry();
pathGeometry.setAttribute("position", new THREE.Float32BufferAttribute(pathVertices, 3));
pathGeometry.setIndex(pathIndices);
pathGeometry.computeVertexNormals();
const pathMesh = new THREE.Mesh(pathGeometry, new THREE.MeshStandardMaterial({
  color: "#876f4b", roughness: 1, side: THREE.DoubleSide,
}));
pathMesh.receiveShadow = true;
scene.add(pathMesh);

const seed = { value: 58731 };
function random() {
  seed.value = (seed.value * 1664525 + 1013904223) >>> 0;
  return seed.value / 4294967296;
}

const obstacles = [];
const treeTrunkMaterial = new THREE.MeshStandardMaterial({ color: "#574334", roughness: 1 });
const treeDeep = new THREE.MeshStandardMaterial({ color: "#284a37", roughness: 1 });
const treeMid = new THREE.MeshStandardMaterial({ color: "#386046", roughness: 1 });
const treeLight = new THREE.MeshStandardMaterial({ color: "#52744c", roughness: 1 });

function makeTree(x, z, scale, hue) {
  const y = groundHeight(x, z);
  const tree = new THREE.Group();
  tree.position.set(x, y, z);
  tree.rotation.y = random() * Math.PI * 2;
  tree.scale.setScalar(scale);
  const trunkHeight = 4.3 + random() * 2.2;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.75, trunkHeight, 7), treeTrunkMaterial);
  trunk.position.y = trunkHeight / 2;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  tree.add(trunk);

  const foliageMaterials = hue % 3 === 0 ? [treeLight, treeMid, treeDeep] : [treeDeep, treeMid, treeLight];
  for (let tier = 0; tier < 3; tier += 1) {
    const radius = 3.4 - tier * 0.68 + random() * 0.35;
    const height = 4.1 - tier * 0.45;
    const crown = new THREE.Mesh(new THREE.ConeGeometry(radius, height, 7), foliageMaterials[tier]);
    crown.position.y = trunkHeight - 0.1 + tier * 1.75;
    crown.rotation.y = random() * 0.3;
    crown.castShadow = true;
    tree.add(crown);
  }
  scene.add(tree);
  obstacles.push({ x, z, radius: 1.05 * scale });
}

function distanceToPath(x, z) {
  let best = Infinity;
  for (let i = 0; i < pathPoints.length; i += 4) {
    best = Math.min(best, Math.hypot(pathPoints[i].x - x, pathPoints[i].z - z));
  }
  return best;
}

let placedTrees = 0;
let attempts = 0;
while (placedTrees < 178 && attempts < 1200) {
  attempts += 1;
  const x = (random() - 0.5) * 300;
  const z = (random() - 0.5) * 300;
  const distance = Math.hypot(x, z);
  if (distance < 24 || distance > 142 || distanceToPath(x, z) < 5.2) continue;
  if (obstacles.some((item) => Math.hypot(item.x - x, item.z - z) < 7.5)) continue;
  makeTree(x, z, 0.8 + random() * 0.7, placedTrees);
  placedTrees += 1;
}

const rockMaterials = [
  new THREE.MeshStandardMaterial({ color: "#737c6b", roughness: 1 }),
  new THREE.MeshStandardMaterial({ color: "#656f63", roughness: 1 }),
];
let placedRocks = 0;
attempts = 0;
while (placedRocks < 36 && attempts < 400) {
  attempts += 1;
  const x = (random() - 0.5) * 245;
  const z = (random() - 0.5) * 245;
  if (Math.hypot(x, z) < 17 || distanceToPath(x, z) < 4.3) continue;
  if (obstacles.some((item) => Math.hypot(item.x - x, item.z - z) < 3)) continue;
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.65 + random() * 0.9, 0), rockMaterials[placedRocks % 2]);
  rock.position.set(x, groundHeight(x, z) + 0.45, z);
  rock.rotation.set(random(), random() * Math.PI, random());
  rock.scale.set(1.2, 0.8 + random() * 0.7, 1);
  rock.castShadow = true;
  rock.receiveShadow = true;
  scene.add(rock);
  obstacles.push({ x, z, radius: 1.1 });
  placedRocks += 1;
}

const player = new THREE.Group();
const jacketMaterial = new THREE.MeshStandardMaterial({ color: "#d68152", roughness: 0.8 });
const trousersMaterial = new THREE.MeshStandardMaterial({ color: "#34463c", roughness: 1 });
const skinMaterial = new THREE.MeshStandardMaterial({ color: "#d7a47f", roughness: 0.85 });
const playerBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.48, 0.8, 4, 8), jacketMaterial);
playerBody.position.y = 1.05;
playerBody.castShadow = true;
player.add(playerBody);
const playerHead = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), skinMaterial);
playerHead.position.set(0, 1.96, -0.04);
playerHead.castShadow = true;
player.add(playerHead);
const playerPack = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.62, 0.27), trousersMaterial);
playerPack.position.set(0, 1.2, 0.44);
playerPack.castShadow = true;
player.add(playerPack);
player.position.set(0, groundHeight(0, 0), 0);
scene.add(player);

const deerBodyMaterial = new THREE.MeshStandardMaterial({ color: "#a96b3e", roughness: 1 });
const deerLightMaterial = new THREE.MeshStandardMaterial({ color: "#ddbd91", roughness: 1 });
const deerDarkMaterial = new THREE.MeshStandardMaterial({ color: "#5e3d2c", roughness: 1 });
const eyeMaterial = new THREE.MeshStandardMaterial({ color: "#211c18", roughness: 0.5 });

function makeLeg(deer, x, z) {
  const pivot = new THREE.Group();
  pivot.position.set(x, 0.72, z);
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.72, 6), deerDarkMaterial);
  leg.position.y = -0.32;
  leg.castShadow = true;
  pivot.add(leg);
  deer.add(pivot);
  return pivot;
}

function makeDeer(x, z, antlers = false) {
  const animal = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.72, 12, 10), deerBodyMaterial);
  body.scale.set(1.42, 0.83, 0.75);
  body.position.set(0, 1.13, 0);
  body.castShadow = true;
  animal.add(body);
  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 8), deerLightMaterial);
  chest.scale.set(0.8, 1.4, 0.8);
  chest.position.set(0, 1.34, -0.46);
  animal.add(chest);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 0.82, 8), deerBodyMaterial);
  neck.position.set(0, 1.57, -0.56);
  neck.rotation.x = -0.28;
  neck.castShadow = true;
  animal.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.29, 10, 8), deerBodyMaterial);
  head.scale.set(0.85, 0.92, 1.2);
  head.position.set(0, 1.98, -0.86);
  head.castShadow = true;
  animal.add(head);
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), deerLightMaterial);
  muzzle.position.set(0, 1.84, -1.08);
  animal.add(muzzle);
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.095, 0.38, 5), deerBodyMaterial);
    ear.position.set(side * 0.23, 2.19, -0.76);
    ear.rotation.z = side * 0.65;
    animal.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), eyeMaterial);
    eye.position.set(side * 0.24, 2.02, -0.99);
    animal.add(eye);
  }
  if (antlers) {
    for (const side of [-1, 1]) {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.045, 0.58, 5), deerLightMaterial);
      stem.position.set(side * 0.18, 2.31, -0.82);
      stem.rotation.z = side * 0.36;
      animal.add(stem);
      const tine = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.026, 0.28, 5), deerLightMaterial);
      tine.position.set(side * 0.31, 2.48, -0.82);
      tine.rotation.z = side * 0.62;
      animal.add(tine);
    }
  }
  const legs = [
    makeLeg(animal, -0.36, -0.34),
    makeLeg(animal, 0.36, -0.34),
    makeLeg(animal, -0.36, 0.36),
    makeLeg(animal, 0.36, 0.36),
  ];
  animal.position.set(x, groundHeight(x, z), z);
  scene.add(animal);
  const targetAngle = random() * Math.PI * 2;
  return {
    mesh: animal,
    legs,
    target: new THREE.Vector3(x + Math.cos(targetAngle) * 14, 0, z + Math.sin(targetAngle) * 14),
    speed: 1.15 + random() * 0.45,
    phase: random() * Math.PI * 2,
  };
}

const deer = [
  makeDeer(-26, -30, true),
  makeDeer(42, 35, false),
  makeDeer(-70, 55, false),
];

const starsGeometry = new THREE.BufferGeometry();
const starPositions = [];
for (let i = 0; i < 420; i += 1) {
  const theta = random() * Math.PI * 2;
  const elevation = random() * Math.PI * 0.48 + 0.05;
  const radius = 175;
  starPositions.push(
    Math.cos(theta) * Math.cos(elevation) * radius,
    Math.sin(elevation) * radius + 18,
    Math.sin(theta) * Math.cos(elevation) * radius,
  );
}
starsGeometry.setAttribute("position", new THREE.Float32BufferAttribute(starPositions, 3));
const starsMaterial = new THREE.PointsMaterial({ color: "#edf0da", size: 0.8, transparent: true, opacity: 0, sizeAttenuation: false });
const stars = new THREE.Points(starsGeometry, starsMaterial);
scene.add(stars);

const sunOrb = new THREE.Mesh(new THREE.SphereGeometry(4.5, 16, 12), new THREE.MeshBasicMaterial({ color: "#ffe0a1" }));
const moonOrb = new THREE.Mesh(new THREE.SphereGeometry(3.1, 16, 12), new THREE.MeshBasicMaterial({ color: "#e1ebed" }));
scene.add(sunOrb, moonOrb);

const keys = new Set();
const playerPosition = new THREE.Vector3(0, groundHeight(0, 0), 0);
const cameraLookTarget = new THREE.Vector3();
const cameraOffsetTarget = new THREE.Vector3();
let cameraYaw = 0;
let cameraPitch = 0.36;
let moving = false;
let elapsed = 0;
let started = false;
let lastToastAt = 0;
let toastTimeout;
let activePointer = null;
let lastPointer = { x: 0, y: 0 };
const touchInput = new THREE.Vector2();
let touchStart = null;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toast.classList.remove("visible"), 2600);
}

startButton.addEventListener("click", () => {
  started = true;
  intro.classList.add("hidden");
  sideNote.classList.add("hidden");
  controlsHint.classList.add("visible");
  showToast("Witaj w dolinie. Ruszaj własnym tempem.");
  renderer.domElement.focus();
});

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
    event.preventDefault();
    keys.add(key);
  }
});
window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
window.addEventListener("blur", () => keys.clear());

renderer.domElement.addEventListener("pointerdown", (event) => {
  activePointer = event.pointerId;
  lastPointer = { x: event.clientX, y: event.clientY };
  touchStart = event.pointerType === "touch" ? { x: event.clientX, y: event.clientY } : null;
  if (event.pointerType === "touch") touchInput.set(0, 0);
  renderer.domElement.setPointerCapture(event.pointerId);
});
renderer.domElement.addEventListener("pointermove", (event) => {
  if (activePointer !== event.pointerId) return;
  const dx = event.clientX - lastPointer.x;
  const dy = event.clientY - lastPointer.y;
  if (touchStart) {
    touchInput.set(
      clamp((event.clientX - touchStart.x) / 55, -1, 1),
      clamp((event.clientY - touchStart.y) / 55, -1, 1),
    );
  } else if (started && event.buttons) {
    cameraYaw -= dx * 0.0045;
    cameraPitch = clamp(cameraPitch + dy * 0.003, 0.12, 0.92);
  }
  lastPointer = { x: event.clientX, y: event.clientY };
});
function releasePointer(event) {
  if (activePointer !== event.pointerId) return;
  activePointer = null;
  touchStart = null;
  touchInput.set(0, 0);
}
renderer.domElement.addEventListener("pointerup", releasePointer);
renderer.domElement.addEventListener("pointercancel", releasePointer);

function updateWorld(delta) {
  elapsed += delta;
  const timeOfDay = (0.31 + elapsed / 115) % 1;
  const angle = timeOfDay * Math.PI * 2 - Math.PI / 2;
  const daylight = clamp((Math.sin(angle) + 0.12) / 1.12, 0.055, 1);
  const twilight = 1 - clamp(Math.abs(daylight - 0.48) / 0.42, 0, 1);

  const daySky = new THREE.Color("#91b5a6");
  const duskSky = new THREE.Color("#d48769");
  const nightSky = new THREE.Color("#132832");
  const sky = nightSky.clone().lerp(daySky, daylight).lerp(duskSky, twilight * 0.42);
  scene.background.copy(sky);
  scene.fog.color.copy(sky).lerp(new THREE.Color("#526c4e"), 0.26);
  scene.fog.near = 38 + daylight * 16;
  scene.fog.far = 150 + daylight * 48;
  sunLight.intensity = 0.13 + daylight * 2.15;
  hemiLight.intensity = 0.24 + daylight * 0.9;
  sunLight.color.set(daylight < 0.23 ? "#a9c3e6" : "#ffe3b2");
  sunLight.position.set(Math.cos(angle) * 85, Math.max(-10, Math.sin(angle) * 90), 34);
  sunLight.target.position.set(playerPosition.x, 0, playerPosition.z);
  sunOrb.position.set(Math.cos(angle) * 130, Math.sin(angle) * 92 + 45, -120);
  moonOrb.position.set(-sunOrb.position.x, -sunOrb.position.y + 90, 80);
  sunOrb.material.color.set(daylight > 0.35 ? "#ffe4ae" : "#e69c78");
  sunOrb.visible = daylight > 0.12;
  moonOrb.visible = daylight < 0.46;
  starsMaterial.opacity = clamp((0.4 - daylight) * 2.5, 0, 0.86);

  const totalMinutes = Math.floor(timeOfDay * 24 * 60);
  const hour = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const minute = String(totalMinutes % 60).padStart(2, "0");
  clockLabel.textContent = `${hour}:${minute}`;

  if (started) updatePlayer(delta);
  updateDeer(delta);
  renderer.render(scene, camera);
}

function updatePlayer(delta) {
  const forwardInput = (keys.has("w") || keys.has("arrowup") ? 1 : 0)
    - (keys.has("s") || keys.has("arrowdown") ? 1 : 0)
    - touchInput.y;
  const sideInput = (keys.has("d") || keys.has("arrowright") ? 1 : 0)
    - (keys.has("a") || keys.has("arrowleft") ? 1 : 0)
    + touchInput.x;
  const input = new THREE.Vector2(sideInput, forwardInput);
  if (input.lengthSq() > 1) input.normalize();

  const forward = new THREE.Vector3(Math.sin(cameraYaw), 0, -Math.cos(cameraYaw));
  const right = new THREE.Vector3(Math.cos(cameraYaw), 0, Math.sin(cameraYaw));
  const movement = forward.multiplyScalar(input.y).add(right.multiplyScalar(input.x));
  moving = movement.lengthSq() > 0.001;

  if (moving) {
    movement.normalize();
    const step = 7.2 * delta;
    const nextX = playerPosition.x + movement.x * step;
    const nextZ = playerPosition.z + movement.z * step;
    const blockedX = obstacles.some((item) => Math.hypot(item.x - nextX, item.z - playerPosition.z) < item.radius + 0.55);
    const blockedZ = obstacles.some((item) => Math.hypot(item.x - playerPosition.x, item.z - nextZ) < item.radius + 0.55);
    if (!blockedX) playerPosition.x = nextX;
    if (!blockedZ) playerPosition.z = nextZ;
    player.rotation.y = Math.atan2(movement.x, movement.z) + Math.PI;
  }

  const terrain = groundHeight(playerPosition.x, playerPosition.z);
  const walkingBob = moving ? Math.sin(elapsed * 11) * 0.055 : 0;
  playerPosition.y = terrain + walkingBob;
  player.position.set(playerPosition.x, playerPosition.y, playerPosition.z);

  const followDistance = 10.5;
  cameraOffsetTarget.set(
    playerPosition.x + Math.sin(cameraYaw) * followDistance * Math.cos(cameraPitch),
    playerPosition.y + 3.25 + Math.sin(cameraPitch) * followDistance,
    playerPosition.z + Math.cos(cameraYaw) * followDistance * Math.cos(cameraPitch),
  );
  camera.position.lerp(cameraOffsetTarget, 1 - Math.exp(-5.6 * delta));
  cameraLookTarget.set(playerPosition.x, playerPosition.y + 1.2, playerPosition.z);
  camera.lookAt(cameraLookTarget);

  coordinateLabel.textContent = `${Math.round(playerPosition.x)}, ${Math.round(playerPosition.z)}`;
  if (Math.floor(elapsed * 2) !== Math.floor((elapsed - delta) * 2)) {
    const nearbyDeer = deer.some((animal) => animal.mesh.position.distanceTo(playerPosition) < 12);
    if (nearbyDeer && performance.now() - lastToastAt > 7000) {
      showToast("Cicho… sarna pasie się niedaleko.");
      lastToastAt = performance.now();
    }
  }
}

function updateDeer(delta) {
  for (const animal of deer) {
    const position = animal.mesh.position;
    const toTarget = new THREE.Vector3(animal.target.x - position.x, 0, animal.target.z - position.z);
    if (toTarget.length() < 2.6 || Math.hypot(animal.target.x, animal.target.z) > 120) {
      const angle = random() * Math.PI * 2;
      const radius = 12 + random() * 26;
      animal.target.set(
        clamp(position.x + Math.cos(angle) * radius, -112, 112),
        0,
        clamp(position.z + Math.sin(angle) * radius, -112, 112),
      );
    }
    const walking = toTarget.lengthSq() > 1;
    if (walking) {
      toTarget.normalize();
      position.x += toTarget.x * animal.speed * delta;
      position.z += toTarget.z * animal.speed * delta;
      animal.mesh.rotation.y = Math.atan2(toTarget.x, toTarget.z) + Math.PI;
    }
    position.y = groundHeight(position.x, position.z) + Math.sin(elapsed * 2 + animal.phase) * 0.025;
    const gait = walking ? Math.sin(elapsed * 7 + animal.phase) * 0.38 : Math.sin(elapsed * 1.1 + animal.phase) * 0.035;
    animal.legs.forEach((leg, index) => {
      leg.rotation.x = gait * (index % 2 === 0 ? 1 : -1);
    });
  }
}

let previousTime = performance.now();
function animate(now) {
  requestAnimationFrame(animate);
  const delta = Math.min((now - previousTime) / 1000, 0.04);
  previousTime = now;
  updateWorld(delta);
}
requestAnimationFrame(animate);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
});
