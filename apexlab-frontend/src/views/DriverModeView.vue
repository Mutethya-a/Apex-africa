<script setup>
import RwandaCircuit from '../components/RwandaCircuit.vue'
</script>

<template>
  <main class="driver-mode">
    <div class="header">
      <span class="eyebrow">APEX AFRICA / SIMULATION</span>
      <h1>RWANDA <span>CIRCUIT</span></h1>
      <p>
        Explore our conceptual African Grand Prix circuit
        in an interactive 3D environment.
      </p>
    </div>

    <RwandaCircuit />

    <div class="instructions">
      <span>DRAG TO ROTATE</span>
      <span>SCROLL TO ZOOM</span>
      <span>RIGHT-CLICK + DRAG TO PAN</span>
    </div>
  </main>
</template>

<style scoped>
.driver-mode {
  min-height: 100vh;
  background: #08090b;
  color: white;
  padding: 45px 5%;
}

.eyebrow {
  color: #ff3434;
  font-size: 11px;
  letter-spacing: 3px;
}

h1 {
  font-size: clamp(36px, 6vw, 75px);
  letter-spacing: -3px;
  margin: 15px 0;
}

h1 span {
  color: #ff3434;
}

.header p {
  color: #999;
  margin-bottom: 35px;
}

.instructions {
  display: flex;
  gap: 35px;
  flex-wrap: wrap;
  padding: 20px 0;
  color: #777;
  font-size: 10px;
  letter-spacing: 2px;
}
</style>
