<script setup></script>

<template>
  <div>
    <nav>
      <RouterLink to="/">Command Center</RouterLink>
      <RouterLink to="/driver">Driver Mode</RouterLink>
      <RouterLink to="/race-control">Race Control</RouterLink>
      <RouterLink to="/circuit-lab">Circuit Lab</RouterLink>
    </nav>

    <RouterView />
  </div>
</template>

<style scoped>
nav {
  display: flex;
  gap: 24px;
  padding: 20px;
  background: #111;
}

nav a {
  color: white;
  text-decoration: none;
}

nav a.router-link-active {
  color: #ff3333;
}
</style>
