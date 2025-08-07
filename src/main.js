//import { createApp } from 'vue'
//import './style.css'
//import App from './App.vue'
//createApp(App).mount('#app')

import { createApp } from 'vue';
import './style.css'; // Atau file CSS global Anda
import App from './App.vue'; // Atau komponen utama Anda

// Jika Anda ingin GeospatialApp menjadi komponen utama
import GeospatialApp from './components/GeospatialApp.vue';

createApp(GeospatialApp).mount('#app');