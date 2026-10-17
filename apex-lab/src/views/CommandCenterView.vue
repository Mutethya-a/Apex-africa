<script setup>
import { useRouter } from 'vue-router'
import {
  ArrowUpRight,
  Activity,
  Flag,
  Gauge,
  Cpu,
  MapPinned
} from 'lucide-vue-next'

const router = useRouter()

const modules = [
  {
    number: '01',
    title: 'DRIVER MODE',
    subtitle: 'ENTER THE COCKPIT',
    description: 'Experience the African Grand Prix from behind the wheel.',
    icon: Gauge,
    route: '/driver'
  },
  {
    number: '02',
    title: 'RACE CONTROL',
    subtitle: 'OWN THE PIT WALL',
    description: 'Control strategy, tyre choices, and race decisions.',
    icon: Flag,
    route: '/race-control'
  },
  {
    number: '03',
    title: 'CIRCUIT LAB',
    subtitle: 'ENGINEER THE FUTURE',
    description: 'Explore circuit design, vehicle dynamics, and performance.',
    icon: MapPinned,
    route: '/circuit-lab'
  }
]

function openModule(route) {
  router.push(route)
}
</script>

<template>
  <div class="command-center">

    <div class="topline">
      <span><Activity :size="14" /> SYSTEM ONLINE</span>
      <span>APEX AFRICA / SIMULATION PLATFORM</span>
      <span>RWANDA · CONCEPT CIRCUIT</span>
    </div>

    <section class="hero">
      <div class="hero-content">
        <div class="eyebrow">
          <span class="red-line"></span>
          THE FUTURE OF AFRICAN MOTORSPORT
        </div>

        <h1>
          APEX<br />
          <span>AFRICA<span class="dot">.</span></span>
        </h1>

        <p class="hero-description">
          Engineering the future of the African Grand Prix.
          An immersive motorsport simulation experience
          inspired by Rwanda.
        </p>

        <button class="launch-btn" @click="openModule('/driver')">
          ENTER SIMULATION
          <ArrowUpRight :size="20" />
        </button>

        <div class="hero-footer">
          <div>
            <span class="small-label">PROJECT</span>
            <strong>APEX AFRICA</strong>
          </div>
          <div>
            <span class="small-label">ENVIRONMENT</span>
            <strong>RWANDA / CONCEPT</strong>
          </div>
          <div>
            <span class="small-label">VERSION</span>
            <strong>0.1.0 ALPHA</strong>
          </div>
        </div>
      </div>

      <div class="hero-visual">
        <div class="visual-grid"></div>

        <div class="orbit orbit-one"></div>
        <div class="orbit orbit-two"></div>

        <div class="visual-center">
          <Cpu :size="72" :stroke-width="1" />
          <span>APEX SIMULATION CORE</span>
          <small>AWAITING INITIALIZATION</small>
        </div>

        <div class="visual-corner top-left">SYS / 001</div>
        <div class="visual-corner bottom-right">AFRICA / RW</div>
      </div>
    </section>

    <section class="modules-section">
      <div class="section-heading">
        <div>
          <span class="section-kicker">CHOOSE YOUR EXPERIENCE</span>
          <h2>THE SIMULATION <span>MODULES</span></h2>
        </div>

        <span class="module-count">03 AVAILABLE MODULES</span>
      </div>

      <div class="modules-grid">
        <button
          v-for="module in modules"
          :key="module.number"
          class="module-card"
          @click="openModule(module.route)"
        >
          <div class="card-top">
            <span>{{ module.number }} / APEX</span>
            <ArrowUpRight :size="22" />
          </div>

          <component :is="module.icon" :size="44" :stroke-width="1.2" />

          <div class="card-bottom">
            <span class="card-subtitle">{{ module.subtitle }}</span>
            <h3>{{ module.title }}</h3>
            <p>{{ module.description }}</p>
          </div>
        </button>
      </div>
    </section>

    <footer class="footer">
      <span>APEX AFRICA © 2026</span>
      <span>BUILT FOR THE FUTURE OF AFRICAN MOTORSPORT</span>
      <span>ENGINEERED TO INSPIRE</span>
    </footer>

  </div>
</template>

<style scoped>
.command-center {
  min-height: 100vh;
  background: #08090b;
  color: #f5f5f5;
  font-family: Arial, Helvetica, sans-serif;
}

.topline {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 15px 5%;
  border-bottom: 1px solid #242424;
  font-size: 10px;
  letter-spacing: 2px;
  color: #8d929b;
}

.topline span:first-child {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ff3838;
}

.hero {
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: 650px;
}

.hero-content {
  padding: 95px 8% 55px 10%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.eyebrow {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 11px;
  font-weight: bold;
  letter-spacing: 3px;
  color: #aaa;
}

.red-line {
  width: 28px;
  height: 2px;
  background: #ff3434;
}

h1 {
  font-size: clamp(75px, 9vw, 150px);
  line-height: 0.82;
  letter-spacing: -8px;
  font-weight: 900;
  margin: 45px 0 30px;
}

h1 > span {
  color: #ff3434;
}

.dot {
  color: #fff;
}

.hero-description {
  max-width: 450px;
  font-size: 16px;
  line-height: 1.9;
  color: #999fa8;
}

.launch-btn {
  display: flex;
  align-items: center;
  gap: 45px;
  background: #f33434;
  color: white;
  border: none;
  padding: 20px 25px;
  margin-top: 35px;
  font-weight: 800;
  font-size: 12px;
  letter-spacing: 2px;
  cursor: pointer;
  transition: 0.3s;
}

.launch-btn:hover {
  background: #fff;
  color: #08090b;
  transform: translateY(-3px);
}

.hero-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 40px;
  margin-top: auto;
  padding-top: 70px;
}

.hero-footer div {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.small-label {
  font-size: 9px;
  letter-spacing: 2px;
  color: #777;
}

.hero-footer strong {
  font-size: 11px;
  letter-spacing: 1px;
}

.hero-visual {
  position: relative;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  border-left: 1px solid #202020;
  background:
    radial-gradient(circle, #251014 0%, #0a0b0e 60%);
}

.visual-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(#ffffff07 1px, transparent 1px),
    linear-gradient(90deg, #ffffff07 1px, transparent 1px);
  background-size: 45px 45px;
}

.orbit {
  position: absolute;
  border: 1px solid #ff34343a;
  border-radius: 50%;
  animation: rotate 20s linear infinite;
}

.orbit-one {
  width: 370px;
  height: 370px;
  border-top: 2px solid #ff3434;
}

.orbit-two {
  width: 520px;
  height: 520px;
  border-bottom: 1px solid #ff3434;
  animation-direction: reverse;
}

.visual-center {
  z-index: 2;
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 20px;
  color: #ff3434;
}

.visual-center span {
  font-size: 12px;
  letter-spacing: 3px;
  color: white;
}

.visual-center small {
  font-size: 9px;
  letter-spacing: 2px;
  color: #777;
}

.visual-corner {
  position: absolute;
  font-size: 10px;
  letter-spacing: 2px;
  color: #777;
}

.top-left {
  top: 30px;
  left: 30px;
}

.bottom-right {
  bottom: 30px;
  right: 30px;
}

.modules-section {
  padding: 85px 5%;
  border-top: 1px solid #222;
}

.section-heading {
  display: flex;
  justify-content: space-between;
  align-items: end;
  margin-bottom: 40px;
}

.section-kicker {
  font-size: 10px;
  letter-spacing: 3px;
  color: #ff3434;
}

h2 {
  font-size: clamp(30px, 4vw, 55px);
  letter-spacing: -2px;
  margin: 15px 0 0;
}

h2 span {
  color: #ff3434;
}

.module-count {
  color: #777;
  font-size: 10px;
  letter-spacing: 2px;
}

.modules-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
}

.module-card {
  background: #101216;
  color: white;
  border: 1px solid #292b31;
  min-height: 330px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  cursor: pointer;
  transition: 0.3s;
}

.module-card:hover {
  background: #1b1115;
  border-color: #ff3434;
  transform: translateY(-6px);
}

.card-top {
  display: flex;
  justify-content: space-between;
  width: 100%;
  color: #777;
  font-size: 10px;
  letter-spacing: 2px;
  margin-bottom: 50px;
}

.module-card > svg {
  color: #ff3434;
}

.card-bottom {
  margin-top: auto;
}

.card-subtitle {
  color: #ff3434;
  font-size: 10px;
  letter-spacing: 2px;
}

h3 {
  font-size: 26px;
  margin: 12px 0;
}

.card-bottom p {
  font-size: 13px;
  color: #999;
  line-height: 1.7;
}

.footer {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 25px 5%;
  border-top: 1px solid #242424;
  font-size: 9px;
  letter-spacing: 2px;
  color: #777;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 900px) {
  .hero {
    grid-template-columns: 1fr;
  }

  .hero-content {
    padding: 80px 6%;
  }

  .hero-visual {
    min-height: 450px;
    border-left: none;
  }

  .modules-grid {
    grid-template-columns: 1fr;
  }

  .section-heading,
  .footer,
  .topline {
    flex-wrap: wrap;
  }

  h1 {
    letter-spacing: -4px;
  }
}
</style>
