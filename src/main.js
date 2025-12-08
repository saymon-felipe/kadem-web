import { createApp } from 'vue';
import { createPinia } from 'pinia';
import piniaPluginPersistedState from 'pinia-plugin-persistedstate';
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
  faEye,
  faEyeSlash,
  faWindowMaximize,
  faWindowRestore,
  faMinus,
  faXmark,
  faRightFromBracket,
  faPlus,
  faPencil,
  faArrowsRotate,
  faTrashCan,
  faCopy,
  faCog,
  faCheck,
  faCommentDots,
  faGripLines,
  faEllipsisV,
  faChevronDown,
  faChevronLeft,
  faPaperPlane,
  faEllipsisVertical,
  faUser,
  faMagnifyingGlass,
  faUsers,
  faDice,
  faThumbsUp,
  faTableCellsLarge,
  faSyncAlt,
  faClipboard,
  faMusic,
  faListCheck,
  faArrowLeft,
  faShuffle,
  faPlay,
  faPause,
  faVolumeHigh,
  faCirclePause,
  faCirclePlus,
  faListUl,
  faArrowUpRightFromSquare,
  faCircleChevronRight,
  faChevronRight,
  faChartSimple,
  faVolumeLow,
  faVolumeXmark,
  faRadio,
  faPen,
  faTrash,
  faTriangleExclamation,
  faCircleInfo,
  faLink,
  faLayerGroup,
  faDownload,
  faSpinner,
  faCircleCheck,
  faList
} from '@fortawesome/free-solid-svg-icons';

library.add(
  faForwardStep,
  faCirclePlay,
  faBackwardStep,
  faWifi,
  faGlobe,
  faEye,
  faEyeSlash,
  faWindowMaximize,
  faWindowRestore,
  faMinus,
  faXmark,
  faRightFromBracket,
  faPlus,
  faPencil,
  faArrowsRotate,
  faTrashCan,
  faCopy,
  faCog,
  faGripLines,
  faCheck,
  faCommentDots,
  faEllipsisV,
  faChevronDown,
  faChevronLeft,
  faPaperPlane,
  faEllipsisVertical,
  faUser,
  faMagnifyingGlass,
  faUsers,
  faDice,
  faThumbsUp,
  faTableCellsLarge,
  faSyncAlt,
  faClipboard,
  faMusic,
  faListCheck,
  faArrowLeft,
  faShuffle,
  faPlay,
  faPause,
  faVolumeHigh,
  faCirclePause,
  faCirclePlus,
  faListUl,
  faArrowUpRightFromSquare,
  faChevronRight,
  faChartSimple,
  faVolumeLow,
  faVolumeXmark,
  faCircleChevronRight,
  faRadio,
  faPen,
  faTrash,
  faTriangleExclamation,
  faCircleInfo,
  faLink,
  faLayerGroup,
  faDownload,
  faSpinner,
  faCircleCheck,
  faList
);

const app = createApp(App);
const pinia = createPinia();
pinia.use(piniaPluginPersistedState);

app.directive('animate-height', vAnimateHeight);

app.mixin(globalMixin);

app.use(pinia);
app.use(api);
app.use(router);

app.component('font-awesome-icon', FontAwesomeIcon);

app.mount('#app');
