<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { createF1Car } from './F1Car'
import { createCircuitDetails } from './CircuitDetails'

const container = ref(null)
const speed = ref(0)
const gear = ref(1)
const driving = ref(false)

let scene
let camera
let renderer
let controls
let animationId
let resizeObserver
let car
let trackCurve
let lastTime = 0
let isMounted = false

const keys = {
  forward: false,
  backward: false,
  left: false,
  right: false
}

const physics = {
  speed: 0,
  heading: 0,
  acceleration: 18,
  braking: 32,
  drag: 0.012,
  maxSpeed: 90,
  steering: 1.7
}

// KEYBOARD CONTROLS

function keyDown(event) {
  const key = event.key.toLowerCase()

  if (
    driving.value &&
    ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)
  ) {
    event.preventDefault()
  }

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
}

//reset car
// RESET CAR
// ========================================

function resetCar() {
  if (!car || !trackCurve) return

  const start = trackCurve.getPointAt(0)
  const tangent = trackCurve.getTangentAt(0)

  car.position.copy(start)
  car.position.y += 0.1

  physics.heading = Math.atan2(
    -tangent.x,
    -tangent.z
  )

  car.rotation.y = physics.heading

  physics.speed = 0
  speed.value = 0
  gear.value = 1
}

//driving mode

function toggleDriving() {
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

//road geometryyyyy

function createTrack(curve) {
  const trackSegments = 500
  const trackWidth = 9

  const vertices = []
  const indices = []

  for (let i = 0; i <= trackSegments; i++) {
    const t = i / trackSegments

    const position = curve.getPointAt(t)
    const tangent = curve.getTangentAt(t)

    // Perpendicular direction in XZ plane
    const normal = new THREE.Vector3(
      tangent.z,
      0,
      -tangent.x
    ).normalize()

    const left = position.clone().addScaledVector(
      normal,
      trackWidth / 2
    )

    const right = position.clone().addScaledVector(
      normal,
      -trackWidth / 2
    )

    vertices.push(left.x, left.y, left.z)
    vertices.push(right.x, right.y, right.z)

    if (i < trackSegments) {
      const a = i * 2
      const b = a + 1
      const c = a + 2
      const d = a + 3

      indices.push(a, c, b)
      indices.push(b, c, d)
    }
  }

  const trackGeometry = new THREE.BufferGeometry()

  trackGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(vertices, 3)
  )

  trackGeometry.setIndex(indices)
  trackGeometry.computeVertexNormals()

  const track = new THREE.Mesh(
    trackGeometry,
    new THREE.MeshStandardMaterial({
      color: '#303238',
      side: THREE.DoubleSide,
      roughness: 0.85,
      depthWrite: true
    })
  )

  track.receiveShadow = true

  return track
}

// ========================================
// INITIALIZE THREE.JS
// ========================================

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

  // ========================================
  // CAMERA CONTROLS
  // ========================================

  controls = new OrbitControls(
    camera,
    renderer.domElement
  )

  controls.enableDamping = true
  controls.maxPolarAngle = Math.PI / 2.15
  controls.minDistance = 10
  controls.maxDistance = 160
  controls.target.set(0, 0, 0)

  // ========================================
  // LIGHTING
  // ========================================

  const ambientLight = new THREE.AmbientLight(
    0xffffff,
    1.3
  )

  scene.add(ambientLight)

  const sun = new THREE.DirectionalLight(
    0xffffff,
    2.5
  )

  sun.position.set(40, 80, 30)
  sun.castShadow = true

  sun.shadow.mapSize.width = 2048
  sun.shadow.mapSize.height = 2048

  sun.shadow.camera.left = -100
  sun.shadow.camera.right = 100
  sun.shadow.camera.top = 100
  sun.shadow.camera.bottom = -100

  scene.add(sun)

  // ========================================
  // TERRAIN - FIXED
  // ========================================

  const terrainGeometry = new THREE.PlaneGeometry(
    250,
    250,
    80,
    80
  )

  terrainGeometry.rotateX(-Math.PI / 2)

  const positions = terrainGeometry.attributes.position

  // Keep terrain below the road so it
  // cannot hide sections of the circuit.
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

  // ========================================
  // RWANDA CONCEPT CIRCUIT
  // ========================================

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
  ].map(([x, z]) => {
    return new THREE.Vector3(x, 0.4, z)
  })

  trackCurve = new THREE.CatmullRomCurve3(
    points,
    true,
    'centripetal'
  )

  // Create continuous road
  const track = createTrack(trackCurve)
  scene.add(track)

  // Grand Prix circuit infrastructure
const circuitDetails = createCircuitDetails(trackCurve, 9)
scene.add(circuitDetails)


  // RACING LINE
  const linePoints = trackCurve.getPoints(500)

  const lineGeometry = new THREE.BufferGeometry()
    .setFromPoints(
      linePoints.map(point =>
        point.clone().add(
          new THREE.Vector3(0, 0.06, 0)
        )
      )
    )

  const racingLine = new THREE.LineLoop(
    lineGeometry,
    new THREE.LineBasicMaterial({
      color: '#ff3333'
    })
  )

  scene.add(racingLine)

  // F1 CAR

  car = createF1Car('#ff2525')
  scene.add(car)

  resetCar()

  // RESPONSIVE RESIZING

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

  window.addEventListener('keydown', keyDown)
  window.addEventListener('keyup', keyUp)
  window.addEventListener('blur', resetKeys)
 
//LOPPPP THAT'S ANIMATED
  const animate = (time) => {
    animationId = requestAnimationFrame(animate)

    const dt = Math.min(
      (time - (lastTime || time)) / 1000,
      0.05
    )

    lastTime = time

    if (driving.value) {

      // Acceleration
      if (keys.forward) {
        physics.speed += physics.acceleration * dt
      }

      // Braking
      if (keys.backward) {
        physics.speed -= physics.braking * dt
      }

      // Aerodynamic drag and rolling resistance
      physics.speed -=
        physics.speed * physics.drag * dt * 60

      physics.speed = THREE.MathUtils.clamp(
        physics.speed,
        0,
        physics.maxSpeed
      )

      // Steering
      if (physics.speed > 0.5) {
        const steeringInput =
          (keys.left ? 1 : 0) -
          (keys.right ? 1 : 0)

        const speedFactor = THREE.MathUtils.clamp(
          physics.speed / 20,
          0.2,
          1
        )

        physics.heading +=
          steeringInput *
          physics.steering *
          speedFactor *
          dt
      }

      car.rotation.y = physics.heading

      // Move car
      car.position.x -=
        Math.sin(physics.heading) *
        physics.speed *
        dt

      car.position.z -=
        Math.cos(physics.heading) *
        physics.speed *
        dt

      //CHASE CAMERAAAAAA
      const cameraOffset = new THREE.Vector3(
        0,
        6,
        14
      )

      cameraOffset.applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        physics.heading
      )

      const desiredCamera = car.position
        .clone()
        .add(cameraOffset)

      camera.position.lerp(
        desiredCamera,
        0.08
      )

      const lookTarget = car.position.clone()
      lookTarget.y += 1.5

      camera.lookAt(lookTarget)

      //SPEEDOMETER

      speed.value = Math.round(
        physics.speed * 3.6
      )

      gear.value = Math.min(
        8,
        Math.max(
          1,
          Math.floor(speed.value / 45) + 1
        )
      )

    } else {
      controls.update()
    }

    renderer.render(scene, camera)
  }

  animationId = requestAnimationFrame(animate)
})

//CLEANUP
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

      materials.forEach(material => {
        material.dispose()
      })
    }
  })

  renderer?.dispose()
  renderer?.domElement?.remove()
})
</script>

<template>
  <div class="simulator">

    <div
      ref="container"
      class="circuit-container"
    ></div>

    <!-- LIVE TELEMETRY -->
    <div class="hud">

      <div>
        <span class="hud-label">SPEED</span>
        <strong>{{ speed }}</strong>
        <small>KM/H</small>
      </div>

      <div>
        <span class="hud-label">GEAR</span>
        <strong>{{ gear }}</strong>
      </div>

      <div>
        <span class="hud-label">MODE</span>
        <strong class="mode">
          {{ driving ? 'DRIVE' : 'VIEW' }}
        </strong>
      </div>

    </div>

    <!-- CONTROLS -->
    <div class="controls-panel">

      <button @click="toggleDriving">
        {{
          driving
            ? 'EXIT DRIVING MODE'
            : 'START DRIVING'
        }}
      </button>

      <button @click="resetCar">
        RESET CAR
      </button>

      <span>W / ↑ ACCELERATE</span>
      <span>S / ↓ BRAKE</span>
      <span>A D / ← → STEER</span>

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

.hud {
  display: flex;
  gap: 60px;
  background: #101216;
  padding: 25px 35px;
  border: 1px solid #292929;
}

.hud > div {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.hud-label {
  color: #777;
  font-size: 10px;
  letter-spacing: 2px;
}

.hud strong {
  font-size: 34px;
  font-weight: 900;
}

.hud small {
  font-size: 10px;
  color: #ff3434;
}

.hud .mode {
  font-size: 22px;
  color: #ff3434;
}

.controls-panel {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
  padding: 20px 0;
}

.controls-panel button {
  background: #ff3434;
  color: white;
  border: none;
  padding: 15px 20px;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  transition: 0.2s;
}

.controls-panel button:hover {
  background: #d92828;
}

.controls-panel button:nth-child(2) {
  background: #24262c;
}

.controls-panel button:nth-child(2):hover {
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
    gap: 25px;
    padding: 20px;
  }

  .hud strong {
    font-size: 26px;
  }

  .controls-panel {
    gap: 12px;
  }
}
</style>
