/**
 * main.ts
 *
 * Bootstraps Vuetify and other plugins then mounts the App`
 */

// Components
import App from './App.vue'

// Composables
import { createApp } from 'vue'

// Plugins
import { registerPlugins } from '@/plugins'

// Store
import store from './store/store';
import router from './router';
import Vue3Toastify, { type ToastContainerOptions } from 'vue3-toastify';
import PrimeVue from 'primevue/config';

const app = createApp(App)

registerPlugins(app)

app.use(store);
app.use(router)
app.use(PrimeVue, {
    unstyled: true
});
app.use(Vue3Toastify, {
    autoClose: 3000,
} as ToastContainerOptions);
app.mount('#app')
