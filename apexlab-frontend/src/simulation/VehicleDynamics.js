import * as THREE from 'three'

export class VehicleDynamics {
  constructor() {
    this.speed = 0
    this.heading = 0

    this.maxSpeed = 90
    this.acceleration = 18
    this.braking = 32

    this.trackGrip = 1
    this.grassGrip = 0.38

    this.surface = 'ASPHALT'
    this.grip = 1
  }

  update(dt, keys, distanceFromCenter, trackWidth = 9) {
    const offTrack = distanceFromCenter > trackWidth / 2

    this.surface = offTrack ? 'GRASS' : 'ASPHALT'
    this.grip = offTrack ? this.grassGrip : this.trackGrip

    // Engine acceleration
    if (keys.forward) {
      this.speed += this.acceleration * this.grip * dt
    }

    // Braking
    if (keys.backward) {
      this.speed -= this.braking * this.grip * dt
    }

    // Rolling resistance and drag
    const rollingResistance = offTrack ? 5 : 0.7

    if (!keys.forward) {
      this.speed -= rollingResistance * dt
    }

    this.speed -= this.speed * this.speed * 0.0015 * dt

    // Grass limits maximum effective speed
    const effectiveMaxSpeed = offTrack
      ? this.maxSpeed * 0.48
      : this.maxSpeed

    if (this.speed > effectiveMaxSpeed) {
      this.speed = Math.max(
        effectiveMaxSpeed,
        this.speed - 28 * dt
      )
    }

    this.speed = THREE.MathUtils.clamp(
      this.speed,
      0,
      this.maxSpeed
    )

    // Steering loses sensitivity at high speed
    if (this.speed > 0.5) {
      const steeringInput =
        (keys.left ? 1 : 0) -
        (keys.right ? 1 : 0)

      const speedRatio = this.speed / this.maxSpeed

      const steeringSensitivity = THREE.MathUtils.lerp(
        1.8,
        0.45,
        speedRatio
      )

      const lowSpeedFactor = THREE.MathUtils.clamp(
        this.speed / 10,
        0.15,
        1
      )

      this.heading +=
        steeringInput *
        steeringSensitivity *
        lowSpeedFactor *
        this.grip *
        dt
    }

    return {
      speed: this.speed,
      heading: this.heading,
      surface: this.surface,
      grip: this.grip,
      offTrack
    }
  }

  reset(heading = 0) {
    this.speed = 0
    this.heading = heading
    this.surface = 'ASPHALT'
    this.grip = 1
  }
}
