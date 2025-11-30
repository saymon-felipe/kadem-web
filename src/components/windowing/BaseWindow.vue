<template>
    <div class="window-wrapper glass" :class="{
        'maximized': windowData.isMaximized,
        'minimized': windowData.isMinimized,
        'is-active': isActive,
        'is-dragging': isDragging,
        'is-restoring': isRestoring,
        'is-resizing': isResizing
    }" :style="windowStyle" @mousedown.left="focus">
        <div v-if="!windowData.isMaximized">
            <div class="resize-handle top" @mousedown.left.stop="startResize($event, 'top')"></div>
            <div class="resize-handle right" @mousedown.left.stop="startResize($event, 'right')"></div>
            <div class="resize-handle bottom" @mousedown.left.stop="startResize($event, 'bottom')"></div>
            <div class="resize-handle left" @mousedown.left.stop="startResize($event, 'left')"></div>
            <div class="resize-handle top-left" @mousedown.left.stop="startResize($event, 'top-left')"></div>
            <div class="resize-handle top-right" @mousedown.left.stop="startResize($event, 'top-right')"></div>
            <div class="resize-handle bottom-left" @mousedown.left.stop="startResize($event, 'bottom-left')"></div>
            <div class="resize-handle bottom-right" @mousedown.left.stop="startResize($event, 'bottom-right')"></div>
        </div>

        <header class="window-header" @mousedown.left.stop="startDrag" @dblclick.stop="handleToggleMaximize">
            <span class="window-title">{{ windowData.title }}</span>
            <div class="window-controls">
                <button class="window-control-btn minimize" @click.stop="minimize" @mousedown.stop>
                    <font-awesome-icon icon="minus" />
                </button>

                <button class="window-control-btn maximize" v-if="!isMobile" @click.stop="handleToggleMaximize"
                    @mousedown.stop>
                    <font-awesome-icon :icon="windowData.isMaximized ? 'window-restore' : 'window-maximize'" />
                </button>

                <button class="window-control-btn close" @click.stop="close" @mousedown.stop>
                    <font-awesome-icon icon="xmark" />
                </button>
            </div>
        </header>

        <main class="window-content">
            <component :is="componentMap[windowData.componentId]" />
        </main>
    </div>
</template>

<script>
import { mapState, mapActions } from 'pinia';
import { useWindowStore } from '@/stores/windows';
import { useAppStore } from '@/stores/app';
import { windowComponentMap } from './componentMap.js';

const SNAP_ZONE_SIZE = 30;
const CLICK_DRAG_THRESHOLD = 5;
const MAXIMIZED_BOTTOM_OFFSET = 0;
const HEADER_OFFSET = 82;

export default {
    props: {
        windowData: {
            type: Object,
            required: true,
        },
    },
    data() {
        return {
            componentMap: windowComponentMap,
            isDragging: false,
            dragPosition: null,
            isRestoring: false,
            isResizing: false
        }
    },
    computed: {
        ...mapState(useWindowStore, ['activeWindowId', 'activeSnapTarget']),
        ...mapState(useAppStore, {
            isMobile: 'getIsMobile'
        }),
        isActive() {
            return this.activeWindowId === this.windowData.id;
        },
        windowStyle() {
            const position = this.isDragging ? this.dragPosition : this.windowData.position;
            const size = this.windowData.size || { width: 500, height: 400 };

            if (this.isMobile) {
                return {
                    transform: `translate(0, ${HEADER_OFFSET}px)`,
                    width: '100%',
                    height: `calc(100% - ${MAXIMIZED_BOTTOM_OFFSET}px - ${HEADER_OFFSET}px)`,
                    zIndex: this.windowData.zIndex,
                };
            }

            const styles = {
                transform: this.windowData.isMaximized ?
                    `translate(0, ${HEADER_OFFSET}px)` :
                    `translate(${position.x}px, ${position.y}px)`,

                width: this.windowData.isMaximized && !this.isRestoring ?
                    '100%' :
                    `${Math.max(size.width, 400)}px`,
                height: this.windowData.isMaximized && !this.isRestoring ?
                    `calc(100% - ${MAXIMIZED_BOTTOM_OFFSET}px - ${HEADER_OFFSET}px)` :
                    `${Math.max(size.height, 300)}px`,

                zIndex: this.windowData.zIndex,
            };
            if (this.windowData.isMinimized) {
                const headerTopOffset = 60;
                styles.transform = `translate(${this.windowData.position.x}px, ${headerTopOffset}px) scale(0.5)`;
            }
            return styles;
        }
    },
    methods: {
        ...mapActions(useWindowStore, [
            'closeWindow',
            'focusWindow',
            'minimizeWindow',
            'toggleMaximize',
            'updateWindowPosition',
            'updateWindowSize',
            'setSnapTarget',
            'applySnap',
            'clearPreviousState',
            'unMaximize'
        ]),
        close() {
            this.closeWindow(this.windowData.id);
        },
        focus() {
            if (!this.isActive) {
                this.focusWindow(this.windowData.id);
            }
        },
        minimize() {
            this.minimizeWindow(this.windowData.id);
        },
        handleToggleMaximize() {
            if (this.isMobile) return;
            this.toggleMaximize(this.windowData.id);
        },
        startDrag(event) {
            this.focus();
            const store = useWindowStore();
            const initialMouseX = event.clientX;
            const initialMouseY = event.clientY;
            let startX, startY;

            const onMouseMove = (moveEvent) => {
                const movedX = Math.abs(moveEvent.clientX - initialMouseX);
                const movedY = Math.abs(moveEvent.clientY - initialMouseY);

                if (!this.isDragging && (movedX > CLICK_DRAG_THRESHOLD || movedY > CLICK_DRAG_THRESHOLD)) {
                    this.isDragging = true;
                    let currentPosition = { ...this.windowData.position };
                    let currentSize = this.windowData.size || { width: 500, height: 400 };
                    if (this.windowData.isMaximized || this.windowData.previousPosition) {
                        this.isRestoring = true;
                        const userState = store._getOrCreateCurrentUserState();
                        const prefs = userState.windowPrefs[this.windowData.id] || {};
                        let restoredSize = this.windowData.previousSize;

                        if (this.windowData.isMaximized) {
                            restoredSize = this.unMaximize(this.windowData.id);
                        }

                        currentSize = restoredSize || prefs.size || { width: 500, height: 400 };
                        currentPosition = this.windowData.previousPosition || prefs.pos || { x: 100, y: 100 };

                        const grabPercentX = moveEvent.clientX / window.innerWidth;
                        currentPosition.x = moveEvent.clientX - (grabPercentX * currentSize.width);
                        currentPosition.y = moveEvent.clientY - 16;

                        if (!this.windowData.isMaximized) {
                            this.clearPreviousState(this.windowData.id);
                        }

                        this.updateWindowSize(this.windowData.id, currentSize);
                        this.updateWindowPosition(this.windowData.id, currentPosition);

                        this.dragPosition = { ...currentPosition };
                        setTimeout(() => {
                            this.isRestoring = false;
                        }, 200);
                    } else {
                        this.dragPosition = { ...this.windowData.position };
                    }
                    startX = moveEvent.clientX - this.dragPosition.x;
                    startY = moveEvent.clientY - this.dragPosition.y;
                }

                if (!this.isDragging) return;

                const x = moveEvent.clientX - startX;
                const y = Math.max(HEADER_OFFSET, moveEvent.clientY - startY);
                this.dragPosition = { x, y };

                const { clientX, clientY } = moveEvent;
                const { innerWidth, innerHeight } = window;

                const TOP_SNAP_ZONE_Y = SNAP_ZONE_SIZE + HEADER_OFFSET;
                const BOTTOM_SNAP_ZONE_Y = innerHeight - SNAP_ZONE_SIZE;
                const topY = HEADER_OFFSET;
                const availableHeight = innerHeight - HEADER_OFFSET - MAXIMIZED_BOTTOM_OFFSET;
                const halfHeight = availableHeight / 2;
                const fullHeight = availableHeight;
                const midY = topY + halfHeight;

                let newSnapTarget = null;

                if (clientX < SNAP_ZONE_SIZE && clientY < TOP_SNAP_ZONE_Y) {
                    newSnapTarget = { id: 'tl', x: '0', y: `${topY}px`, width: '50%', height: `${halfHeight}px`, xPx: 0, yPx: topY, widthPx: innerWidth / 2, heightPx: halfHeight };
                } else if (clientX > innerWidth - SNAP_ZONE_SIZE && clientY < TOP_SNAP_ZONE_Y) {
                    newSnapTarget = { id: 'tr', x: '50%', y: `${topY}px`, width: '50%', height: `${halfHeight}px`, xPx: innerWidth / 2, yPx: topY, widthPx: innerWidth / 2, heightPx: halfHeight };
                } else if (clientX < SNAP_ZONE_SIZE && clientY > BOTTOM_SNAP_ZONE_Y) {
                    newSnapTarget = { id: 'bl', x: '0', y: `${midY}px`, width: '50%', height: `${halfHeight}px`, xPx: 0, yPx: midY, widthPx: innerWidth / 2, heightPx: halfHeight };
                } else if (clientX > innerWidth - SNAP_ZONE_SIZE && clientY > BOTTOM_SNAP_ZONE_Y) {
                    newSnapTarget = { id: 'br', x: '50%', y: `${midY}px`, width: '50%', height: `${halfHeight}px`, xPx: innerWidth / 2, yPx: midY, widthPx: innerWidth / 2, heightPx: halfHeight };
                } else if (clientY < TOP_SNAP_ZONE_Y) {
                    newSnapTarget = { id: 'top', x: '0', y: `${topY}px`, width: '100%', height: `${fullHeight}px`, xPx: 0, yPx: topY, widthPx: innerWidth, heightPx: fullHeight };
                } else if (clientX < SNAP_ZONE_SIZE) {
                    newSnapTarget = { id: 'left', x: '0', y: `${topY}px`, width: '50%', height: `${fullHeight}px`, xPx: 0, yPx: topY, widthPx: innerWidth / 2, heightPx: fullHeight };
                } else if (clientX > innerWidth - SNAP_ZONE_SIZE) {
                    newSnapTarget = { id: 'right', x: '50%', y: `${topY}px`, width: '50%', height: `${fullHeight}px`, xPx: innerWidth / 2, yPx: topY, widthPx: innerWidth / 2, heightPx: fullHeight };
                }

                if (this.activeSnapTarget?.id !== newSnapTarget?.id) {
                    store.setSnapTarget(newSnapTarget);
                }
            };

            const onMouseUp = () => {
                try {
                    if (this.isDragging) {
                        const snapTarget = this.activeSnapTarget;
                        if (snapTarget) {
                            this.applySnap(this.windowData.id, snapTarget);
                        } else {
                            if (this.dragPosition) {
                                this.updateWindowPosition(this.windowData.id, this.dragPosition);
                            }
                        }
                    }
                } catch (e) {
                    console.error("Erro durante o onMouseUp:", e);
                } finally {
                    this.isDragging = false;
                    this.isRestoring = false;
                    this.dragPosition = null;
                    store.setSnapTarget(null);
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                }
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        },
        startResize(event, direction) {
            if (this.isMobile) return;

            this.focus();
            this.isResizing = true;
            const store = useWindowStore();
            const initialWindow = this.windowData;
            const startX = event.clientX;
            const startY = event.clientY;
            const startWidth = initialWindow.size.width;
            const startHeight = initialWindow.size.height;
            const startLeft = initialWindow.position.x;
            const startTop = initialWindow.position.y;
            const onMouseMove = (moveEvent) => {
                let newWidth = startWidth;
                let newHeight = startHeight;
                let newLeft = startLeft;
                let newTop = startTop;
                const deltaX = moveEvent.clientX - startX;
                const deltaY = moveEvent.clientY - startY;
                if (direction.includes('right')) { newWidth = startWidth + deltaX; }
                if (direction.includes('bottom')) { newHeight = startHeight + deltaY; }
                if (direction.includes('left')) { newWidth = startWidth - deltaX; newLeft = startLeft + deltaX; }
                if (direction.includes('top')) { newHeight = startHeight - deltaY; newTop = startTop + deltaY; }
                if (newWidth < 200) newWidth = 200;
                if (newHeight < 150) newHeight = 150;
                store.updateWindowSize(this.windowData.id, { width: newWidth, height: newHeight });
                store.updateWindowPosition(this.windowData.id, { x: newLeft, y: newTop });
            };
            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                this.isResizing = false;
            };
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        }
    }
}
</script>

<style scoped>
.window-wrapper {
    position: absolute;
    box-shadow: var(--boxshadow-default);
    overflow: hidden;
    pointer-events: auto;
    width: 98%;
    height: 90%;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1),
        opacity 0.2s ease,
        transform 0.2s ease;
}

.window-wrapper.is-resizing {
    transition: none !important;
}

.window-wrapper.is-restoring {
    transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
        width 0.2s cubic-bezier(0.4, 0, 0.2, 1),
        height 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.window-wrapper.is-dragging {
    transition: none;
    user-select: none;
    z-index: 9999 !important;
}

.window-wrapper.is-dragging .window-content {
    pointer-events: none;
}

.window-wrapper.maximized {
    border-radius: 0;
    border: none;
}

.window-wrapper.minimized {
    opacity: 0;
    pointer-events: none;
}

.window-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3);
    cursor: grab;
    user-select: none;
    border-bottom: 1px solid var(--dark-yellow);
}

.window-header:active {
    cursor: grabbing;
}

.window-title {
    font-weight: bold;
    font-size: var(--fontsize-sm);
    color: var(--deep-blue);
}

.window-controls {
    display: flex;
    gap: var(--space-2);
    height: 100%;
}

.window-control-btn {
    background: none;
    border: none;
    width: 46px;
    height: 30px;
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: background-color 0.2s;
    color: var(--deep-blue);
    display: grid;
    place-items: center;
}

.window-control-btn svg {
    width: 12px;
    height: 12px;
}

.window-control-btn.minimize:hover,
.window-control-btn.maximize:hover {
    background: rgba(0, 0, 0, 0.1);
}

.window-control-btn.close:hover {
    background: var(--red);
    color: var(--white);
}

.window-content {
    padding: var(--space-3);
    height: calc(100% - 47px);
    width: 100%;
    overflow: auto;
    container-type: inline-size;
    container-name: window-viewport;
}

.resize-handle {
    position: absolute;
    z-index: 10;
}

.resize-handle.top {
    top: -5px;
    left: 5px;
    right: 5px;
    height: 10px;
    cursor: ns-resize;
}

.resize-handle.right {
    top: 5px;
    bottom: 5px;
    right: -5px;
    width: 10px;
    cursor: ew-resize;
}

.resize-handle.bottom {
    bottom: -5px;
    left: 5px;
    right: 5px;
    height: 10px;
    cursor: ns-resize;
}

.resize-handle.left {
    top: 5px;
    bottom: 5px;
    left: -5px;
    width: 10px;
    cursor: ew-resize;
}

.resize-handle.top-left {
    top: -5px;
    left: -5px;
    width: 10px;
    height: 10px;
    cursor: nwse-resize;
}

.resize-handle.top-right {
    top: -5px;
    right: -5px;
    width: 10px;
    height: 10px;
    cursor: nesw-resize;
}

.resize-handle.bottom-left {
    bottom: -5px;
    left: -5px;
    width: 10px;
    height: 10px;
    cursor: nesw-resize;
}

.resize-handle.bottom-right {
    bottom: -5px;
    right: -5px;
    width: 10px;
    height: 10px;
    cursor: nwse-resize;
}

@media (max-width: 768px) {

    .window-header,
    .resize-handle {
        cursor: default !important;
    }
}
</style>