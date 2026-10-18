<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'

import { createF1Car } from './F1Car'
import { createCircuitDetails } from './CircuitDetails'
import { LapTimer } from '../simulation/LapTimer'
import { VehicleDynamics } from '../simulation/VehicleDynamics'

// State
const container = ref(null)

const speed = ref(0)
const gear = ref(1)
const driving = ref(false)

const surface = ref('ASPHALT')
const grip = ref(100)
const warning = ref('')

const lapCount = ref(0)
const currentLap = ref('00:00.000')
const bestLap = ref('--:--.---')
const lastLap = ref('--:--.---')
const lapStatus = ref('READY')

const cameraMode = ref('CHASE')
const cameraModes = ['CHASE', 'COCKPIT', 'AERIAL']

// Telemetry
const throttle = ref(0)
const brake = ref(0)
const steering = ref(0)
const speedHistory = ref([0])

const MAX_SPEED_SAMPLES = 100
const GRAPH_WIDTH = 500
const GRAPH_HEIGHT = 110
const GRAPH_MAX_SPEED = 340

let lastSpeedSampleTime = 0

const speedGraphPoints = computed(() => {
  const samples = speedHistory.value

  return samples.map((value, index) => {
    const x = samples.length === 1
      ? 0
      : (index / (samples.length - 1)) * GRAPH_WIDTH

    const y = GRAPH_HEIGHT -
      Math.min(value / GRAPH_MAX_SPEED, 1) * GRAPH_HEIGHT

    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
})

let scene
let camera
let renderer
let controls
let resizeObserver
let animationId
let car
let trackCurve
let lapTimer
let vehicle

let lastTime = 0
let simulationTime = 0
let isMounted = false

const TRACK_WIDTH = 9

const keys = {
  forward: false,
  backward: false,
  left: false,
  right: false
}

// Format lap times
function formatLapTime(seconds) {
  if (seconds === null || !Number.isFinite(seconds)) {
    return '--:--.---'
  }

  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 1000)

  return (
    `${String(minutes).padStart(2, '0')}:` +
    `${String(secs).padStart(2, '0')}.` +
    `${String(ms).padStart(3, '0')}`
  )
}

// Update lap telemetry
function updateLapHUD() {
  if (!lapTimer) return

  lapCount.value = lapTimer.laps

  currentLap.value = formatLapTime(
    lapTimer.getCurrentLapTime(simulationTime)
  )

  bestLap.value = formatLapTime(lapTimer.bestLap)
  lastLap.value = formatLapTime(lapTimer.lastLap)

  if (!lapTimer.lapStarted) {
    lapStatus.value = 'AWAITING START'
  } else if (!lapTimer.lapValid) {
    lapStatus.value = 'INVALID'
  } else {
    lapStatus.value = 'VALID'
  }
}

// Update driving input telemetry
function updateInputTelemetry() {
  throttle.value = keys.forward ? 100 : 0
  brake.value = keys.backward ? 100 : 0

  steering.value =
    (keys.right ? 100 : 0) -
    (keys.left ? 100 : 0)
}

// Record speed samples
function recordSpeed() {
  if (simulationTime - lastSpeedSampleTime < 0.15) {
    return
  }

  lastSpeedSampleTime = simulationTime

  speedHistory.value = [
    ...speedHistory.value.slice(-(MAX_SPEED_SAMPLES - 1)),
    speed.value
  ]
}

// Switch camera modes
function switchCamera() {
  const index = cameraModes.indexOf(cameraMode.value)
  cameraMode.value = cameraModes[(index + 1) % cameraModes.length]
}

// Keyboard controls
function keyDown(event) {
  const key = event.key.toLowerCase()

  if (key === 'c' && !event.repeat && driving.value) {
    switchCamera()
  }

  if (
    driving.value &&
    ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)
  ) {
    event.preventDefault()
  }

  if (!driving.value) return

  if (key === 'w' || key === 'arrowup') keys.forward = true
  if (key === 's' || key === 'arrowdown') keys.backward = true
  if (key === 'a' || key === 'arrowleft') keys.left = true
  if (key === 'd' || key === 'arrowright') keys.right = true
}

function keyUp(event) {
  const key = event.key.toLowerCase()

  if (key === 'w' || key === 'arrowup') keys.forward = false
  if (key === 's' || key === 'arrowdown') keys.backward = false
  if (key === 'a' || key === 'arrowleft') keys.left = false
  if (key === 'd' || key === 'arrowright') keys.right = false
}

function resetKeys() {
  Object.keys(keys).forEach(key => {
    keys[key] = false
  })

  throttle.value = 0
  brake.value = 0
  steering.value = 0
}

// Reset car and simulation
function resetCar() {
  if (!car || !trackCurve) return

  const start = trackCurve.getPointAt(0)
  const tangent = trackCurve.getTangentAt(0)

  const heading = Math.atan2(
    -tangent.x,
    -tangent.z
  )

  car.position.copy(start)
  car.position.y += 0.1
  car.rotation.y = heading

  vehicle?.reset(heading)
  lapTimer?.reset()

  simulationTime = 0
  lastSpeedSampleTime = 0

  speed.value = 0
  gear.value = 1
  surface.value = 'ASPHALT'
  grip.value = 100
  warning.value = ''

  lapCount.value = 0
  currentLap.value = '00:00.000'
  bestLap.value = '--:--.---'
  lastLap.value = '--:--.---'
  lapStatus.value = 'READY'

  speedHistory.value = [0]

  resetKeys()
}

// Toggle driving mode
function toggleDriving() {
  if (!car) return

  driving.value = !driving.value
  resetKeys()

  if (controls) {
    controls.enabled = !driving.value

    if (!driving.value) {
      controls.target.copy(car.position)
      controls.update()
    }
  }
}

// Generate circuit road
function createTrack(curve) {
  const segments = 500
  const vertices = []
  const indices = []

  for (let i = 0; i <= segments; i++) {
    const t = i / segments

    const position = curve.getPointAt(t)
    const tangent = curve.getTangentAt(t)

    const normal = new THREE.Vector3(
      tangent.z,
      0,
      -tangent.x
    ).normalize()

    const left = position.clone().addScaledVector(
      normal,
      TRACK_WIDTH / 2
    )

    const right = position.clone().addScaledVector(
      normal,
      -TRACK_WIDTH / 2
    )

    vertices.push(left.x, left.y, left.z)
    vertices.push(right.x, right.y, right.z)

    if (i < segments) {
      const a = i * 2
      const b = a + 1
      const c = a + 2
      const d = a + 3

      indices.push(a, c, b)
      indices.push(b, c, d)
    }
  }

  const geometry = new THREE.BufferGeometry()

  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(vertices, 3)
  )

  geometry.setIndex(indices)
  geometry.computeVertexNormals()

  const road = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color: '#303238',
      side: THREE.DoubleSide,
      roughness: 0.85
    })
  )

  road.receiveShadow = true

  return road
}

// Initialize Three.js scene
onMounted(async () => {
  isMounted = true

  const { OrbitControls } = await import(
    'three/addons/controls/OrbitControls.js'
  )

  if (!isMounted || !container.value) return

  const width = container.value.clientWidth
  const height = container.value.clientHeight

  scene = new THREE.Scene()
  scene.background = new THREE.Color('#080e12')
  scene.fog = new THREE.Fog('#080e12', 100, 220)

  camera = new THREE.PerspectiveCamera(
    65,
    width / height,
    0.1,
    500
  )

  camera.position.set(0, 55, 80)

  renderer = new THREE.WebGLRenderer({
    antialias: true
  })

  renderer.setSize(width, height)
  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, 2)
  )

  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  container.value.appendChild(renderer.domElement)

  // Camera controls
  controls = new OrbitControls(
    camera,
    renderer.domElement
  )

  controls.enableDamping = true
  controls.maxPolarAngle = Math.PI / 2.15
  controls.minDistance = 10
  controls.maxDistance = 160
  controls.target.set(0, 0, 0)

  // Lighting
  scene.add(new THREE.AmbientLight(0xffffff, 1.3))

  const sun = new THREE.DirectionalLight(
    0xffffff,
    2.5
  )

  sun.position.set(40, 80, 30)
  sun.castShadow = true

  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.left = -100
  sun.shadow.camera.right = 100
  sun.shadow.camera.top = 100
  sun.shadow.camera.bottom = -100

  scene.add(sun)

  // Terrain
  const terrainGeometry = new THREE.PlaneGeometry(
    250,
    250,
    80,
    80
  )

  terrainGeometry.rotateX(-Math.PI / 2)

  const positions = terrainGeometry.attributes.position

  for (let i = 0; i < positions.count; i++) {
    positions.setY(i, -1)
  }

  terrainGeometry.computeVertexNormals()

  const terrain = new THREE.Mesh(
    terrainGeometry,
    new THREE.MeshStandardMaterial({
      color: '#244b36',
      roughness: 1
    })
  )

  terrain.receiveShadow = true
  scene.add(terrain)

  // Rwanda-inspired circuit
  const points = [
    [-40, -12],
    [-35, -35],
    [-10, -45],
    [20, -40],
    [45, -20],
    [35, 0],
    [45, 25],
    [15, 40],
    [-15, 35],
    [-35, 20],
    [-45, 5]
  ].map(([x, z]) => new THREE.Vector3(x, 0.4, z))

  trackCurve = new THREE.CatmullRomCurve3(
    points,
    true,
    'centripetal'
  )

  // Road and circuit infrastructure
  scene.add(createTrack(trackCurve))
  scene.add(
    createCircuitDetails(trackCurve, TRACK_WIDTH)
  )

  // Racing line
  const racingLinePoints = trackCurve
    .getPoints(500)
    .map(point => {
      const raised = point.clone()
      raised.y += 0.06
      return raised
    })

  const racingLine = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(
      racingLinePoints
    ),
    new THREE.LineBasicMaterial({
      color: '#ff3333'
    })
  )

  scene.add(racingLine)

  // Initialize car and simulation systems
  car = createF1Car('#ff2525')
  scene.add(car)

  vehicle = new VehicleDynamics()
  lapTimer = new LapTimer(trackCurve)

  resetCar()

  // Responsive resizing
  resizeObserver = new ResizeObserver(() => {
    if (!container.value) return

    const w = container.value.clientWidth
    const h = container.value.clientHeight

    if (!w || !h) return

    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
  })

  resizeObserver.observe(container.value)

  // Event listeners
  window.addEventListener('keydown', keyDown)
  window.addEventListener('keyup', keyUp)
  window.addEventListener('blur', resetKeys)

  // Animation loop
  const animate = (time) => {
    animationId = requestAnimationFrame(animate)

    const dt = Math.min(
      (time - (lastTime || time)) / 1000,
      0.05
    )

    lastTime = time

    if (driving.value) {
      simulationTime += dt

      // Update input telemetry
      updateInputTelemetry()

      // Calculate track position and vehicle dynamics
      const trackInfo = lapTimer.getProgress(
        car.position
      )

      const state = vehicle.update(
        dt,
        keys,
        trackInfo.distance,
        TRACK_WIDTH
      )

      car.rotation.y = state.heading

      // Move car
      car.position.x -=
        Math.sin(state.heading) *
        state.speed *
        dt

      car.position.z -=
        Math.cos(state.heading) *
        state.speed *
        dt

      // Detect track limits
      const newTrackInfo = lapTimer.getProgress(
        car.position
      )

      const offTrack =
        newTrackInfo.distance > TRACK_WIDTH / 2

      surface.value = offTrack ? 'GRASS' : 'ASPHALT'

      grip.value = Math.round(
        offTrack
          ? vehicle.grassGrip * 100
          : vehicle.trackGrip * 100
      )

      // Update lap timing
      lapTimer.update(
        car.position,
        simulationTime,
        state.speed > 1
      )

      updateLapHUD()

      // Race engineer warnings
      if (offTrack) {
        warning.value = 'TRACK LIMITS EXCEEDED'
      } else if (
        lapTimer.lapStarted &&
        !lapTimer.lapValid
      ) {
        warning.value = 'LAP INVALIDATED'
      } else {
        warning.value = ''
      }

      // Camera modes
      const heading = state.heading

      const forward = new THREE.Vector3(
        -Math.sin(heading),
        0,
        -Math.cos(heading)
      )

      const desiredCamera = car.position.clone()
      const lookTarget = car.position.clone()

      camera.up.set(0, 1, 0)

      if (cameraMode.value === 'CHASE') {
        desiredCamera.addScaledVector(forward, -14)
        desiredCamera.y += 6

        lookTarget.addScaledVector(forward, 8)
        lookTarget.y += 1.5

        camera.position.lerp(desiredCamera, 0.08)
        camera.lookAt(lookTarget)
      }

      if (cameraMode.value === 'COCKPIT') {
        desiredCamera.addScaledVector(forward, 0.5)
        desiredCamera.y += 1.5

        lookTarget.addScaledVector(forward, 25)
        lookTarget.y += 1.4

        camera.position.lerp(desiredCamera, 0.35)
        camera.lookAt(lookTarget)
      }

      if (cameraMode.value === 'AERIAL') {
        desiredCamera.addScaledVector(forward, -5)
        desiredCamera.y += 35

        lookTarget.addScaledVector(forward, 5)

        camera.position.lerp(desiredCamera, 0.08)
        camera.lookAt(lookTarget)
      }

      // Speedometer and gear
      speed.value = Math.round(state.speed * 3.6)

      gear.value = Math.min(
        8,
        Math.max(
          1,
          Math.floor(speed.value / 45) + 1
        )
      )

      // Record speed history
      recordSpeed()
    } else {
      controls.update()
    }

    renderer.render(scene, camera)
  }

  animationId = requestAnimationFrame(animate)
})

// Cleanup
onBeforeUnmount(() => {
  isMounted = false

  cancelAnimationFrame(animationId)

  window.removeEventListener('keydown', keyDown)
  window.removeEventListener('keyup', keyUp)
  window.removeEventListener('blur', resetKeys)

  resizeObserver?.disconnect()
  controls?.dispose()

  scene?.traverse(object => {
    object.geometry?.dispose()

    if (object.material) {
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material]

      materials.forEach(material => material.dispose())
    }
  })

  renderer?.dispose()
  renderer?.domElement?.remove()
})
</script>

<template>
  <div class="simulator">
    <div ref="container" class="circuit-container"></div>

    <!-- Race engineer warning -->
    <div v-if="warning" class="engineer-warning">
      ⚠ {{ warning }}
    </div>

    <!-- Live telemetry -->
    <div class="hud">
      <div class="hud-item">
        <span class="hud-label">SPEED</span>
        <strong>{{ speed }}</strong>
        <small>KM/H</small>
      </div>

      <div class="hud-item">
        <span class="hud-label">GEAR</span>
        <strong>{{ gear }}</strong>
      </div>

      <div class="hud-item">
        <span class="hud-label">SURFACE</span>
        <strong
          class="small-value"
          :class="{ danger: surface === 'GRASS' }"
        >
          {{ surface }}
        </strong>
      </div>

      <div class="hud-item">
        <span class="hud-label">TYRE GRIP</span>
        <strong>{{ grip }}%</strong>
      </div>

      <div class="hud-item">
        <span class="hud-label">LAPS</span>
        <strong>{{ lapCount }}</strong>
      </div>

      <div class="hud-item">
        <span class="hud-label">CURRENT LAP</span>
        <strong class="lap-time">{{ currentLap }}</strong>
      </div>

      <div class="hud-item">
        <span class="hud-label">LAST LAP</span>
        <strong class="lap-time">{{ lastLap }}</strong>
      </div>

      <div class="hud-item">
        <span class="hud-label">BEST LAP</span>
        <strong class="lap-time best-lap">{{ bestLap }}</strong>
      </div>

      <div class="hud-item">
        <span class="hud-label">LAP STATUS</span>
        <strong
          class="small-value"
          :class="{
            danger: lapStatus === 'INVALID',
            valid: lapStatus === 'VALID'
          }"
        >
          {{ lapStatus }}
        </strong>
      </div>
    </div>

    <!-- Driving input telemetry -->
    <div class="telemetry-panel">
      <div class="telemetry-heading">
        <span>DRIVER INPUT TELEMETRY</span>
        <span class="live-label">● LIVE DATA</span>
      </div>

      <div class="input-grid">
        <div class="input-meter">
          <div class="meter-heading">
            <span>THROTTLE</span>
            <strong>{{ throttle }}%</strong>
          </div>

          <div class="meter-track">
            <div
              class="meter-fill throttle-fill"
              :style="{ width: `${throttle}%` }"
            ></div>
          </div>
        </div>

        <div class="input-meter">
          <div class="meter-heading">
            <span>BRAKE</span>
            <strong>{{ brake }}%</strong>
          </div>

          <div class="meter-track">
            <div
              class="meter-fill brake-fill"
              :style="{ width: `${brake}%` }"
            ></div>
          </div>
        </div>
      </div>

      <!-- Steering indicator -->
      <div class="steering-section">
        <div class="meter-heading">
          <span>STEERING INPUT</span>
          <strong>
            {{ steering < 0 ? 'LEFT' : steering > 0 ? 'RIGHT' : 'CENTER' }}
          </strong>
        </div>

        <div class="steering-track">
          <div class="steering-center"></div>
          <div
            class="steering-marker"
            :style="{ left: `${50 + steering / 2}%` }"
          ></div>
        </div>

        <div class="steering-labels">
          <span>LEFT</span>
          <span>CENTER</span>
          <span>RIGHT</span>
        </div>
      </div>

      <!-- Speed history graph -->
      <div class="speed-chart">
        <div class="telemetry-heading">
          <span>SPEED HISTORY</span>
          <span class="chart-unit">KM/H</span>
        </div>

        <div class="chart-wrapper">
          <div class="chart-labels">
            <span>340</span>
            <span>170</span>
            <span>0</span>
          </div>

          <svg
            class="chart-svg"
            viewBox="0 0 500 110"
            preserveAspectRatio="none"
            aria-label="Live speed history graph"
          >
            <line
              x1="0"
              y1="0"
              x2="500"
              y2="0"
              class="chart-gridline"
            />
            <line
              x1="0"
              y1="55"
              x2="500"
              y2="55"
              class="chart-gridline"
            />
            <line
              x1="0"
              y1="110"
              x2="500"
              y2="110"
              class="chart-gridline"
            />

            <polyline
              :points="speedGraphPoints"
              fill="none"
              stroke="#ff3434"
              stroke-width="2.5"
              stroke-linejoin="round"
              stroke-linecap="round"
              vector-effect="non-scaling-stroke"
            />
          </svg>
        </div>

        <div class="chart-footer">
          <span>RECENT DRIVING SESSION</span>
          <span>LIVE SPEED: {{ speed }} KM/H</span>
        </div>
      </div>
    </div>

    <!-- Driving controls -->
    <div class="controls-panel">
      <button class="drive-button" @click="toggleDriving">
        {{ driving ? 'EXIT DRIVING MODE' : 'START DRIVING' }}
      </button>

      <button class="reset-button" @click="resetCar">
        RESET CAR
      </button>

      <button class="reset-button" @click="switchCamera">
        CAMERA: {{ cameraMode }}
      </button>

      <span>W / ↑ ACCELERATE</span>
      <span>S / ↓ BRAKE</span>
      <span>A D / ← → STEER</span>
      <span>C / SWITCH CAMERA</span>
    </div>
  </div>
</template>

<style scoped>
.simulator {
  background: #08090b;
  width: 100%;
}

.circuit-container {
  width: 100%;
  height: 600px;
  overflow: hidden;
  background: #080e12;
  border: 1px solid #292929;
}

.engineer-warning {
  background: #531818;
  border: 1px solid #ff3434;
  color: #fff;
  padding: 15px 25px;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 2px;
  text-align: center;
  animation: warningPulse 1.2s infinite;
}

@keyframes warningPulse {
  0%, 100% {
    background: #531818;
  }

  50% {
    background: #871d1d;
  }
}

.hud {
  display: flex;
  flex-wrap: wrap;
  gap: 30px 45px;
  background: #101216;
  padding: 25px 35px;
  border: 1px solid #292929;
}

.hud-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 90px;
}

.hud-label {
  color: #777;
  font-size: 10px;
  letter-spacing: 2px;
}

.hud strong {
  font-size: 34px;
  font-weight: 900;
  color: #fff;
}

.hud small {
  font-size: 10px;
  color: #ff3434;
}

.hud .lap-time {
  font-size: 22px;
  font-family: monospace;
}

.hud .best-lap {
  color: #b96bff;
}

.hud .small-value {
  font-size: 17px;
}

.hud .danger {
  color: #ff3434;
}

.hud .valid {
  color: #4ade80;
}

.telemetry-panel {
  padding: 28px 35px;
  background: #0c0f13;
  border: 1px solid #292929;
  border-top: none;
}

.telemetry-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  color: #ddd;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 2px;
}

.live-label {
  color: #4ade80;
  font-size: 10px;
}

.input-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 30px;
  margin-top: 28px;
}

.input-meter {
  min-width: 0;
}

.meter-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.meter-heading span {
  font-size: 10px;
  letter-spacing: 2px;
  color: #999;
}

.meter-heading strong {
  font-size: 14px;
  color: #fff;
  font-family: monospace;
}

.meter-track {
  height: 12px;
  background: #252930;
  border-radius: 3px;
  overflow: hidden;
}

.meter-fill {
  height: 100%;
  transition: width 0.08s linear;
}

.throttle-fill {
  background: #22c55e;
}

.brake-fill {
  background: #ef4444;
}

.steering-section {
  margin-top: 30px;
}

.steering-track {
  height: 12px;
  position: relative;
  background: #252930;
  border-radius: 3px;
}

.steering-center {
  position: absolute;
  width: 2px;
  height: 20px;
  background: #777;
  left: 50%;
  top: -4px;
  transform: translateX(-50%);
}

.steering-marker {
  position: absolute;
  top: 50%;
  width: 15px;
  height: 20px;
  background: #ff3434;
  border-radius: 3px;
  transform: translate(-50%, -50%);
  transition: left 0.08s linear;
}

.steering-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 12px;
  font-size: 9px;
  letter-spacing: 1px;
  color: #777;
}

.speed-chart {
  margin-top: 35px;
  padding-top: 25px;
  border-top: 1px solid #292929;
}

.chart-unit {
  font-size: 10px;
  color: #777;
}

.chart-wrapper {
  display: flex;
  align-items: stretch;
  gap: 12px;
  height: 150px;
  margin-top: 20px;
}

.chart-labels {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  color: #777;
  font-size: 10px;
  font-family: monospace;
  padding-bottom: 2px;
}

.chart-svg {
  flex: 1;
  width: 100%;
  height: 100%;
  overflow: visible;
  background: #10151b;
  border: 1px solid #242a32;
}

.chart-gridline {
  stroke: #343a42;
  stroke-width: 1;
  stroke-dasharray: 5 5;
}

.chart-footer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;
  font-size: 9px;
  letter-spacing: 1px;
  color: #777;
}

.controls-panel {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
  padding: 20px 0;
}

.controls-panel button {
  border: none;
  padding: 15px 20px;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  transition: background 0.2s;
}

.drive-button {
  background: #ff3434;
  color: #fff;
}

.drive-button:hover {
  background: #d92828;
}

.reset-button {
  background: #24262c;
  color: #fff;
}

.reset-button:hover {
  background: #383b43;
}

.controls-panel span {
  font-size: 10px;
  letter-spacing: 1px;
  color: #999;
}

@media (max-width: 768px) {
  .circuit-container {
    height: 450px;
  }

  .hud {
    gap: 20px;
    padding: 20px;
  }

  .hud strong {
    font-size: 26px;
  }

  .hud .lap-time {
    font-size: 18px;
  }

  .telemetry-panel {
    padding: 20px;
  }

  .input-grid {
    grid-template-columns: 1fr;
    gap: 22px;
  }

  .controls-panel {
    gap: 12px;
  }

  .chart-footer {
    flex-wrap: wrap;
  }
}
</style>
