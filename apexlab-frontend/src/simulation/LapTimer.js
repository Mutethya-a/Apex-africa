
export class LapTimer {
  constructor(trackCurve) {
    this.trackCurve = trackCurve
    this.trackWidth = 9

    this.samples = []

    for (let i = 0; i < 600; i++) {
      const t = i / 600
      const point = trackCurve.getPointAt(t)

      this.samples.push({
        progress: t,
        x: point.x,
        z: point.z
      })
    }

    this.reset()
  }

  getProgress(position) {
    let closestProgress = 0
    let closestDistanceSq = Infinity

    for (const sample of this.samples) {
      const dx = position.x - sample.x
      const dz = position.z - sample.z

      const distanceSq = dx * dx + dz * dz

      if (distanceSq < closestDistanceSq) {
        closestDistanceSq = distanceSq
        closestProgress = sample.progress
      }
    }

    return {
      progress: closestProgress,
      distance: Math.sqrt(closestDistanceSq)
    }
  }

  update(position, elapsedTime, isMoving) {
    const { progress, distance } = this.getProgress(position)

    const offTrack = distance > this.trackWidth / 2

    // Leaving the track invalidates the current lap.
    if (offTrack && this.lapStarted) {
      this.lapValid = false
    }

    if (this.lastProgress === null) {
      this.lastProgress = progress
      return
    }

    if (!isMoving) {
      this.lastProgress = progress
      return
    }

    const previous = this.lastProgress

    // Forward progress, allowing the 1 -> 0 wraparound.
    const forwardDelta = (progress - previous + 1) % 1

    // Ignore jumps or backwards travel.
    const validMovement =
      forwardDelta > 0 &&
      forwardDelta < 0.06

    const crossedForward =
      previous > 0.95 &&
      progress < 0.05 &&
      validMovement

    if (!validMovement) {
      if (this.lapStarted) {
        this.lapValid = false
      }

      this.lastProgress = progress
      return
    }

    // Begin the first timed lap at the start/finish line.
    if (!this.lapStarted && crossedForward && !offTrack) {
      this.lapStarted = true
      this.currentLapStart = elapsedTime
      this.nextCheckpoint = 0
      this.lapValid = true

      this.lastProgress = progress
      return
    }

    // Validate checkpoints in sequence.
    if (
      this.lapStarted &&
      this.nextCheckpoint < this.checkpoints.length
    ) {
      const checkpoint = this.checkpoints[this.nextCheckpoint]

      if (previous < checkpoint && progress >= checkpoint) {
        this.nextCheckpoint++
      }
    }

    // Finish a lap.
    if (this.lapStarted && crossedForward) {
      const lapTime = elapsedTime - this.currentLapStart

      const completedAllCheckpoints =
        this.nextCheckpoint === this.checkpoints.length

      if (
        lapTime > 5 &&
        this.lapValid &&
        completedAllCheckpoints &&
        !offTrack
      ) {
        this.laps++
        this.lastLap = lapTime
        this.lastLapValid = true

        if (this.bestLap === null || lapTime < this.bestLap) {
          this.bestLap = lapTime
        }
      } else {
        this.lastLapValid = false
      }

      // Begin a new lap.
      this.currentLapStart = elapsedTime
      this.nextCheckpoint = 0
      this.lapValid = !offTrack
    }

    this.lastProgress = progress
  }

  getCurrentLapTime(elapsedTime) {
    if (!this.lapStarted || this.currentLapStart === null) {
      return 0
    }

    return Math.max(0, elapsedTime - this.currentLapStart)
  }

  reset() {
    this.laps = 0
    this.currentLapStart = null
    this.lastLap = null
    this.bestLap = null

    this.checkpoints = [0.25, 0.5, 0.75]
    this.nextCheckpoint = 0

    this.lastProgress = null
    this.lapStarted = false
    this.lapValid = true
    this.lastLapValid = null
  }
}
