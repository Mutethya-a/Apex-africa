import * as THREE from 'three'

export function createF1Car(color = '#e63946') {
  const car = new THREE.Group()

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.45,
    roughness: 0.3
  })

  const carbonMaterial = new THREE.MeshStandardMaterial({
    color: '#111217',
    metalness: 0.2,
    roughness: 0.65
  })

  const tyreMaterial = new THREE.MeshStandardMaterial({
    color: '#101010',
    roughness: 0.95
  })

  const helmetMaterial = new THREE.MeshStandardMaterial({
    color: '#f5c542',
    metalness: 0.25,
    roughness: 0.35
  })

  function addBox(width, height, depth, material, x, y, z) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      material
    )

    mesh.position.set(x, y, z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    car.add(mesh)

    return mesh
  }

  // Main chassis
  addBox(1.35, 0.45, 4.2, bodyMaterial, 0, 0.65, 0)

  // Nose
  addBox(0.55, 0.22, 1.7, bodyMaterial, 0, 0.58, -2.4)

  // Front wing
  addBox(3.2, 0.12, 0.65, carbonMaterial, 0, 0.35, -3.05)

  // Rear wing
  addBox(2.5, 0.18, 0.6, carbonMaterial, 0, 1.35, 2.05)

  // Rear wing supports
  addBox(0.12, 0.9, 0.12, carbonMaterial, -0.65, 0.95, 2.05)
  addBox(0.12, 0.9, 0.12, carbonMaterial, 0.65, 0.95, 2.05)

  // Sidepods
  addBox(0.7, 0.45, 1.8, bodyMaterial, -0.95, 0.6, 0.3)
  addBox(0.7, 0.45, 1.8, bodyMaterial, 0.95, 0.6, 0.3)

  // Cockpit
  addBox(0.8, 0.25, 1.1, carbonMaterial, 0, 0.95, -0.2)

  // Driver helmet
  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.36, 20, 20),
    helmetMaterial
  )

  helmet.position.set(0, 1.22, -0.15)
  helmet.castShadow = true
  car.add(helmet)

  // Halo protection
  addBox(0.1, 0.1, 1.2, carbonMaterial, 0, 1.55, -0.35)
  addBox(1.0, 0.1, 0.1, carbonMaterial, 0, 1.5, 0.1)

  // Wheels
  const wheelGeometry = new THREE.CylinderGeometry(
    0.58,
    0.58,
    0.42,
    24
  )

  wheelGeometry.rotateZ(Math.PI / 2)

  const wheelPositions = [
    [-1.45, 0.58, -1.8],
    [1.45, 0.58, -1.8],
    [-1.45, 0.58, 1.45],
    [1.45, 0.58, 1.45]
  ]

  wheelPositions.forEach(([x, y, z]) => {
    const wheel = new THREE.Mesh(wheelGeometry, tyreMaterial)

    wheel.position.set(x, y, z)
    wheel.castShadow = true

    car.add(wheel)
  })

  // Rear diffuser
  addBox(1.7, 0.18, 0.7, carbonMaterial, 0, 0.35, 2.1)

  car.scale.setScalar(0.85)

  return car
}
