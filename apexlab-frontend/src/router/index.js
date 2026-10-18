import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'CommandCenter',
    component: () => import('../views/CommandCenterView.vue')
  },
  {
    path: '/driver',
    name: 'DriverMode',
    component: () => import('../views/DriverModeView.vue')
  },
  {
    path: '/race-control',
    name: 'RaceControl',
    component: () => import('../views/RaceControlView.vue')
  },
  {
    path: '/circuit-lab',
    name: 'CircuitLab',
    component: () => import('../views/CircuitLabView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
