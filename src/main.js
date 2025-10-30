import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './assets/styles/main.css';
import api from "./plugins/api.js";
import globalMixin from "./assets/scripts/global";
import { library } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import vAnimateHeight from './directives/v-animate-height.js';

import {
    faForwardStep,
    faCirclePlay,
    faBackwardStep,
    faWifi,
    faGlobe,
    faEye
} from '@fortawesome/free-solid-svg-icons';

library.add(
    faForwardStep,
    faCirclePlay,
    faBackwardStep,
    faWifi,
    faGlobe,
    faEye
);

const app = createApp(App);
const pinia = createPinia();

app.directive('animate-height', vAnimateHeight);

app.mixin(globalMixin);

app.use(pinia);
app.use(api);
app.use(router);

app.component('font-awesome-icon', FontAwesomeIcon);

app.mount('#app');
