import * as THREE from 'three'

export class CornerAnalyzer {
  constructor(trackCurve) {
    this.trackCurve = trackCurve

    this.sampleCount = 500
    this.trackLength = trackCurve.getLength()

    this.corners = []
    this.samples = []

    this.generateSamples()
    this.detectCorners()
  }

  // Sample the circuit geometry
  generateSamples() {
    for (let i = 0; i < this.sampleCount; i++) {
      const progress = i / this.sampleCount

      const position = this.trackCurve.getPointAt(progress)
      const tangent = this.trackCurve.getTangentAt(progress)

      this.samples.push({
        progress,
        position,
        tangent
      })
    }
  }

  // Calculate curvature at a track position
  calculateCurvature(index) {
    const offset = 5

    const previous = this.samples[
      (index - offset + this.sampleCount) % this.sampleCount
    ]

    const next = this.samples[
      (index + offset) % this.sampleCount
    ]

    const dot = THREE.MathUtils.clamp(
      previous.tangent.dot(next.tangent),
      -1,
      1
    )

    const angle = Math.acos(dot)

    const distance = previous.position.distanceTo(
      next.position
    )

    if (distance === 0) return 0

    return angle / distance
  }

  // Identify corners along the circuit
  detectCorners() {
    const candidates = []

    for (let i = 0; i < this.sampleCount; i++) {
      const curvature = this.calculateCurvature(i)

      if (curvature > 0.012) {
        candidates.push({
          index: i,
          progress: this.samples[i].progress,
          curvature
        })
      }
    }

    // Group nearby corner samples
    const groups = []

    for (const candidate of candidates) {
      const lastGroup = groups[groups.length - 1]

      if (
        lastGroup &&
        candidate.index - lastGroup[lastGroup.length - 1].index <= 6
      ) {
        lastGroup.push(candidate)
      } else {
        groups.push([candidate])
      }
    }

    // Merge corner groups crossing the start line
    if (groups.length > 1) {
      const first = groups[0]
      const last = groups[groups.length - 1]

      const wrapGap =
        first[0].index +
        this.sampleCount -
        last[last.length - 1].index

      if (wrapGap <= 6) {
        groups[0] = [...last, ...first]
        groups.pop()
      }
    }

    // Select the strongest curvature point in each corner
    const detected = groups.map(group => {
      const apex = group.reduce((strongest, sample) =>
        sample.curvature > strongest.curvature
          ? sample
          : strongest
      )

      return {
        progress: apex.progress,
        curvature: apex.curvature,
        position: this.samples[apex.index].position.clone()
      }
    })

    detected.sort((a, b) => a.progress - b.progress)

    this.corners = detected.map((corner, index) => {
      const suggestedSpeed = this.calculateSuggestedSpeed(
        corner.curvature
      )

      return {
        id: index + 1,
        name: `TURN ${index + 1}`,
        progress: corner.progress,
        curvature: corner.curvature,
        position: corner.position,
        suggestedSpeed,
        brakingDistance: this.calculateBrakingDistance(
          suggestedSpeed
        )
      }
    })
  }

  // Estimate corner-entry speed in km/h
  calculateSuggestedSpeed(curvature) {
    const gripAcceleration = 9

    const speedMetersPerSecond = Math.sqrt(
      gripAcceleration / Math.max(curvature, 0.001)
    )

    const speedKmH = speedMetersPerSecond * 3.6

    return Math.round(
      THREE.MathUtils.clamp(speedKmH, 45, 180)
    )
  }

  // Estimate braking distance from a reference approach speed
  calculateBrakingDistance(targetSpeed, approachSpeed = 220) {
    const initialSpeed = approachSpeed / 3.6
    const finalSpeed = targetSpeed / 3.6

    const deceleration = 12

    const distance =
      (initialSpeed ** 2 - finalSpeed ** 2) /
      (2 * deceleration)

    return Math.max(0, Math.round(distance))
  }

  // Find the upcoming corner from lap progress
  getNextCorner(currentProgress) {
    if (this.corners.length === 0) return null

    let nextCorner = this.corners.find(
      corner => corner.progress > currentProgress
    )

    if (!nextCorner) {
      nextCorner = this.corners[0]
    }

    const progressDifference =
      (nextCorner.progress - currentProgress + 1) % 1

    return {
      ...nextCorner,
      distance: Math.round(
        progressDifference * this.trackLength
      )
    }
  }

  // Generate basic race engineer guidance
  getGuidance(currentProgress, currentSpeed) {
    const corner = this.getNextCorner(currentProgress)

    if (!corner) {
      return {
        message: 'TRACK CLEAR',
        level: 'normal',
        corner: null
      }
    }

    const speedDifference =
      currentSpeed - corner.suggestedSpeed

    if (
      corner.distance <= corner.brakingDistance &&
      speedDifference > 15
    ) {
      return {
        message: `BRAKE FOR ${corner.name}`,
        level: 'danger',
        corner
      }
    }

    if (corner.distance < 35 && speedDifference > 0) {
      return {
        message: `REDUCE SPEED — ${corner.name}`,
        level: 'warning',
        corner
      }
    }

    if (corner.distance < 65) {
      return {
        message: `${corner.name} APPROACHING`,
        level: 'info',
        corner
      }
    }

    return {
      message: 'TRACK CLEAR',
      level: 'normal',
      corner
    }
  }

  // Return detected corners for circuit visualization
  getCorners() {
    return this.corners
  }
}
