import * as THREE from 'three'

export function createCircuitDetails(curve, trackWidth = 9) {
  const group = new THREE.Group()

  const segments = 500
  const up = new THREE.Vector3(0, 1, 0)

  const red = new THREE.MeshStandardMaterial({
    color: '#e63338',
    roughness: 0.9,
    side: THREE.DoubleSide
  })

  const white = new THREE.MeshStandardMaterial({
    color: '#f5f5f5',
    roughness: 0.9,
    side: THREE.DoubleSide
  })

  const barrierMaterial = new THREE.MeshStandardMaterial({
    color: '#a9b0b7',
    metalness: 0.55,
    roughness: 0.45
  })

  function getNormal(t) {
    const tangent = curve.getTangentAt(t)

    return new THREE.Vector3(
      tangent.z,
      0,
      -tangent.x
    ).normalize()
  }

  function getPosition(t, offset = 0) {
    const position = curve.getPointAt(t)
    const normal = getNormal(t)

    return position.addScaledVector(normal, offset)
  }

  // ========================================
  // RED AND WHITE KERBS
  // ========================================

  const kerbWidth = 0.85
  const kerbHeight = 0.07

  for (let i = 0; i < segments; i++) {
    const t1 = i / segments
    const t2 = (i + 1) / segments

    const material = Math.floor(i / 5) % 2 === 0
      ? red
      : white

    for (const side of [-1, 1]) {
      const offset = side * (trackWidth / 2 + kerbWidth / 2)

      const p1 = getPosition(t1, offset)
      const p2 = getPosition(t2, offset)

      const length = p1.distanceTo(p2)
      const midpoint = p1.clone().add(p2).multiplyScalar(0.5)

      const kerb = new THREE.Mesh(
        new THREE.BoxGeometry(
          kerbWidth,
          kerbHeight,
          length + 0.04
        ),
        material
      )

      kerb.position.copy(midpoint)
      kerb.position.y = 0.46

      const direction = p2.clone().sub(p1)
      kerb.rotation.y = Math.atan2(direction.x, direction.z)

      kerb.receiveShadow = true
      group.add(kerb)
    }
  }

  // ========================================
  // SAFETY BARRIERS
  // ========================================

  const barrierDistance = trackWidth / 2 + 3

  for (let i = 0; i < segments; i += 3) {
    const t1 = i / segments
    const t2 = Math.min((i + 3) / segments, 1)

    for (const side of [-1, 1]) {
      const offset = side * barrierDistance

      const p1 = getPosition(t1, offset)
      const p2 = getPosition(t2, offset)

      const direction = p2.clone().sub(p1)
      const length = direction.length()

      const barrier = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 1.1, length + 0.15),
        barrierMaterial
      )

      barrier.position.copy(
        p1.clone().add(p2).multiplyScalar(0.5)
      )

      barrier.position.y = 0.95
      barrier.rotation.y = Math.atan2(direction.x, direction.z)

      barrier.castShadow = true
      barrier.receiveShadow = true

      group.add(barrier)
    }
  }

  // ========================================
  // START / FINISH LINE
  // ========================================

  const start = curve.getPointAt(0)
  const tangent = curve.getTangentAt(0)

  const startGroup = new THREE.Group()

  const squareSize = 0.75
  const columns = Math.floor(trackWidth / squareSize)
  const rows = 2

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const material = (row + col) % 2 === 0
        ? white
        : new THREE.MeshStandardMaterial({
            color: '#111111',
            side: THREE.DoubleSide
          })

      const square = new THREE.Mesh(
        new THREE.PlaneGeometry(squareSize, squareSize),
        material
      )

      square.rotation.x = -Math.PI / 2

      square.position.set(
        (col - (columns - 1) / 2) * squareSize,
        0.015,
        (row - (rows - 1) / 2) * squareSize
      )

      startGroup.add(square)
    }
  }

  startGroup.position.copy(start)
  startGroup.position.y = 0.48
  startGroup.rotation.y = Math.atan2(-tangent.x, -tangent.z)

  group.add(startGroup)

  // ========================================
  // STARTING GRID MARKINGS
  // ========================================

  const gridMaterial = new THREE.MeshBasicMaterial({
    color: '#eeeeee',
    side: THREE.DoubleSide
  })

  for (let i = 0; i < 10; i++) {
    // Grid positions behind the start line
    const t = (1 - (i + 1) * 0.008 + 1) % 1
    const laneOffset = i % 2 === 0 ? -1.8 : 1.8

    const position = getPosition(t, laneOffset)
    const direction = curve.getTangentAt(t)

    const gridMark = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 0.15),
      gridMaterial
    )

    gridMark.rotation.x = -Math.PI / 2
    gridMark.rotation.z = 0

    gridMark.position.copy(position)
    gridMark.position.y = 0.49

    // Align markings across the track
    gridMark.rotation.set(
      -Math.PI / 2,
      0,
      Math.atan2(direction.x, direction.z)
    )

    group.add(gridMark)
  }

  return group
}
