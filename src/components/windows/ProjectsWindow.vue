<template>
  <div class="projects-window-content">
    <Teleport :to="teleport_target" :disabled="!is_teleport_ready">
      <div class="workspace-tabs-bar">
        <div
          ref="tabsScrollArea"
          class="tabs-scroll-area custom-scrollbar-none"
          @wheel.passive="handle_tabs_wheel"
        >
          <div class="tabs-track">
            <div
              ref="tabsList"
              class="workspace-tabs"
              :class="{ 'is-committing-reorder': is_reorder_committing }"
              role="tablist"
              aria-label="Abas de projetos"
            >
              <div
                v-for="(tab, index) in workspace_tabs"
                :key="tab.id"
                :ref="(el) => set_tab_el(el, tab.id)"
                class="workspace-tab"
                :class="{
                  'is-active': tab.id === active_workspace_tab_id,
                  'is-closing': closing_tab_ids.includes(tab.id),
                  'is-entering': entering_tab_ids.includes(tab.id),
                  'is-dragging': dragging_tab_id === tab.id,
                }"
                :style="get_tab_drag_style(tab.id, index)"
                @mousedown="on_tab_mousedown($event, tab, index)"
                @contextmenu.prevent.stop="open_tab_context_menu($event, tab)"
                @dblclick.stop
              >
                <button
                  :id="`project-tab-${tab.id}`"
                  type="button"
                  class="tab-main-btn"
                  role="tab"
                  :aria-selected="tab.id === active_workspace_tab_id"
                  :aria-controls="`project-panel-${tab.id}`"
                  :tabindex="tab.id === active_workspace_tab_id ? 0 : -1"
                  :title="tab_title(tab)"
                  @click="handle_tab_click(tab.id)"
                  @keydown="handle_tab_keydown($event, tab.id)"
                >
                  <span class="tab-leading-icon">
                    <img
                      v-if="tab_project(tab)?.image"
                      :src="tab_project(tab).image"
                      alt=""
                      class="tab-thumb"
                    />
                    <font-awesome-icon
                      v-else-if="tab.project_local_id"
                      icon="table-cells-large"
                      class="tab-icon"
                    />
                    <font-awesome-icon
                      v-else
                      icon="layer-group"
                      class="tab-icon"
                    />
                  </span>

                  <span class="tab-name">{{ tab_title(tab) }}</span>

                  <span
                    v-if="tab_status(tab)"
                    class="tab-status-dot"
                    :class="tab_status(tab)"
                    :title="tab_status_label(tab)"
                  />
                </button>

                <button
                  v-if="workspace_tabs.length > 1"
                  type="button"
                  class="close-tab"
                  :aria-label="`Fechar aba ${tab_title(tab)}`"
                  title="Fechar aba"
                  @mousedown.stop
                  @click.stop="close_tab(tab.id)"
                >
                  <font-awesome-icon icon="xmark" />
                </button>
              </div>
            </div>

            <button
              type="button"
              class="btn-new-tab"
              title="Nova aba"
              aria-label="Nova aba"
              @click.stop="handle_open_tab"
              @mousedown.stop
              @dblclick.stop
            >
              <font-awesome-icon icon="plus" />
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Menu de Contexto para as abas (botão direito: Duplicar / Fechar) -->
    <Teleport to="body">
      <Transition name="popup-anim">
        <ContextMenu
          v-if="tab_context_menu.isOpen"
          :options="tab_context_menu_options"
          :x="tab_context_menu.x"
          :y="tab_context_menu.y"
          @menu-click="handle_tab_context_action"
        />
      </Transition>
    </Teleport>

    <div class="workspace-panels">
      <ProjectsWindowSkeleton v-if="loading" />
      <template v-else>
        <ProjectWorkspaceTab
          v-for="tab in stable_workspace_panels"
          :key="tab.id"
          v-show="tab.id === active_workspace_tab_id"
          :id="`project-panel-${tab.id}`"
          class="workspace-panel-tab"
          :class="{
            'panel-active': tab.id === active_workspace_tab_id,
            'panel-entering': tab.id === animating_panel_tab_id,
          }"
          role="tabpanel"
          :aria-labelledby="`project-tab-${tab.id}`"
          :active="tab.id === active_workspace_tab_id"
          :interactive="workspace_interactive"
          @focus-window="focus_workspace_window"
          :projects="projects"
          :project_local_id="tab.project_local_id"
          @project-selected="selectWorkspaceTabProject(tab.id, $event)"
        />
      </template>
    </div>
  </div>
</template>

<script>
import { mapState, mapActions } from "pinia";
import { useProjectStore } from "@/stores/projects";
import { useWindowStore } from "@/stores/windows";
import ProjectWorkspaceTab from "../projects/ProjectWorkspaceTab.vue";
import ProjectsWindowSkeleton from "../projects/ProjectsWindowSkeleton.vue";
import ContextMenu from "../ContextMenu.vue";

export default {
  name: "ProjectsWindow",
  components: { ProjectWorkspaceTab, ProjectsWindowSkeleton, ContextMenu },
  props: {
    windowId: {
      type: String,
      default: "projects",
    },
  },
  data() {
    return {
      loading: true,
      is_teleport_ready: false,
      tab_context_menu: {
        isOpen: false,
        x: 0,
        y: 0,
      },
      context_target_tab: null,
      closing_tab_ids: [],
      entering_tab_ids: [],
      animating_panel_tab_id: null,
      tab_elements: {},
      // Controle de arraste estilo abas de navegador (travado no eixo X)
      dragging_tab_id: null,
      drag_index: -1,
      drag_target_index: -1,
      drag_current_delta: 0,
      drag_is_settling: false,
      is_reorder_committing: false,
      drag_shift_offsets: {},
    };
  },
  computed: {
    ...mapState(useProjectStore, ["projects", "workspace_tabs", "active_workspace_tab_id"]),
    ...mapState(useWindowStore, ["currentUserWindows", "activeWindowId"]),
    workspace_interactive() {
      return !this.currentUserWindows.projects || this.activeWindowId === "projects";
    },
    stable_workspace_panels() {
      return [...this.workspace_tabs].sort((a, b) => a.id.localeCompare(b.id));
    },
    teleport_target() {
      return `#window-header-tabs-${this.windowId}`;
    },
    tab_context_menu_options() {
      const canClose = this.workspace_tabs.length > 1;
      return [
        {
          label: "Duplicar",
          action: "duplicate",
          icon: "copy",
        },
        {
          label: "Fechar",
          action: "close",
          icon: "xmark",
          disabled: !canClose,
        },
      ];
    },
  },
  watch: {
    active_workspace_tab_id(newId, oldId) {
      if (newId && newId !== oldId) {
        this.animating_panel_tab_id = newId;
        setTimeout(() => {
          if (this.animating_panel_tab_id === newId) {
            this.animating_panel_tab_id = null;
          }
        }, 240);
      }
    },
  },
  methods: {
    ...mapActions(useProjectStore, [
      "selectWorkspaceTabProject",
      "_loadProjectsFromDB",
      "ensureWorkspaceTabs",
      "openWorkspaceTab",
      "duplicateWorkspaceTab",
      "activateWorkspaceTab",
      "closeWorkspaceTab",
      "reorderWorkspaceTabs",
    ]),
    ...mapActions(useWindowStore, ["focusWindow"]),
    check_teleport_target() {
      if (typeof document !== "undefined") {
        this.is_teleport_ready = !!document.querySelector(this.teleport_target);
        if (!this.is_teleport_ready) {
          this.$nextTick(() => {
            this.is_teleport_ready = !!document.querySelector(this.teleport_target);
          });
        }
      }
    },
    open_tab_context_menu(event, tab) {
      this.focus_workspace_window();
      this.context_target_tab = tab;

      const menuWidth = 160;
      const menuHeight = 90;

      let x = event.clientX;
      let y = event.clientY;

      if (typeof window !== "undefined") {
        if (x + menuWidth > window.innerWidth - 8) {
          x = Math.max(8, window.innerWidth - menuWidth - 8);
        }
        if (x < 8) {
          x = 8;
        }

        if (y + menuHeight > window.innerHeight - 8) {
          y = Math.max(8, y - menuHeight);
        }
      }

      const newMenu = {
        isOpen: true,
        x: Math.round(x),
        y: Math.round(y),
      };

      if (this.tab_context_menu.isOpen) {
        this.tab_context_menu.isOpen = false;
        this.$nextTick(() => {
          this.tab_context_menu = newMenu;
        });
      } else {
        this.tab_context_menu = newMenu;
      }
    },
    close_tab_context_menu() {
      if (this.tab_context_menu.isOpen) {
        this.tab_context_menu.isOpen = false;
        this.context_target_tab = null;
      }
    },
    on_window_contextmenu(event) {
      if (event.target.closest(".workspace-tab")) return;
      this.close_tab_context_menu();
    },
    on_window_keydown(event) {
      if (event.key === "Escape") {
        this.close_tab_context_menu();
      }
    },
    handle_tab_context_action(action) {
      const target = this.context_target_tab;
      this.close_tab_context_menu();
      if (!target) return;

      if (action === "duplicate") {
        this.handle_duplicate_tab(target);
      } else if (action === "close") {
        this.close_tab(target.id);
      }
    },
    focus_workspace_window() {
      if (this.currentUserWindows.projects && !this.workspace_interactive) this.focusWindow("projects");
    },
    set_tab_el(el, id) {
      if (el) {
        this.tab_elements[id] = el;
      } else {
        delete this.tab_elements[id];
      }
    },
    tab_project(tab) {
      if (!tab.project_local_id) return null;
      return this.projects.find((project) => String(project.localId) === String(tab.project_local_id)) || null;
    },
    tab_title(tab) {
      return this.tab_project(tab)?.name || "Projetos";
    },
    tab_status(tab) {
      const proj = this.tab_project(tab);
      if (!proj || !proj.status) return null;
      const status_map = {
        em_andamento: "bg-green",
        em_risco: "bg-red",
        em_espera: "bg-yellow",
        cancelado: "bg-gray",
      };
      return status_map[proj.status] || null;
    },
    tab_status_label(tab) {
      const proj = this.tab_project(tab);
      if (!proj || !proj.status) return "";
      const label_map = {
        em_andamento: "Em Andamento",
        em_risco: "Em Risco",
        em_espera: "Em Espera",
        cancelado: "Cancelado",
      };
      return label_map[proj.status] || proj.status;
    },
    handle_open_tab() {
      this.close_tab_context_menu();
      const tab = this.openWorkspaceTab();
      if (tab?.id) {
        this.entering_tab_ids.push(tab.id);
        setTimeout(() => {
          this.entering_tab_ids = this.entering_tab_ids.filter((id) => id !== tab.id);
        }, 250);
      }
      this.focus_active_tab();
    },
    handle_duplicate_tab(targetTab = null) {
      this.close_tab_context_menu();
      const tabToDuplicate = targetTab || this.workspace_tabs.find((t) => t.id === this.active_workspace_tab_id);
      const project_local_id = tabToDuplicate?.project_local_id ?? this.active_project_id;
      const tab = this.openWorkspaceTab(project_local_id);
      if (tab?.id) {
        this.entering_tab_ids.push(tab.id);
        setTimeout(() => {
          this.entering_tab_ids = this.entering_tab_ids.filter((id) => id !== tab.id);
        }, 250);
      }
      this.focus_active_tab();
    },
    close_tab(id) {
      this.close_tab_context_menu();
      if (this.workspace_tabs.length <= 1) return;
      if (this.closing_tab_ids.includes(id)) return;
      this.closing_tab_ids.push(id);
      setTimeout(() => {
        this.closeWorkspaceTab(id);
        this.closing_tab_ids = this.closing_tab_ids.filter((tabId) => tabId !== id);
        this.focus_active_tab();
      }, 180);
    },
    handle_tab_click(id) {
      this.close_tab_context_menu();
      if (this.dragging_tab_id || this.drag_is_settling || this.is_reorder_committing) return;
      this.focus_workspace_window();
      if (this.active_workspace_tab_id === id) return;
      this.activateWorkspaceTab(id);
      this.focus_active_tab();
    },
    handle_tabs_wheel(event) {
      const container = this.$refs.tabsScrollArea;
      if (!container) return;
      if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
        container.scrollLeft += event.deltaY;
      }
    },
    focus_active_tab() {
      this.$nextTick(() => {
        const button = this.$el.querySelector('[role="tab"][aria-selected="true"]');
        button?.focus();
        button?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
      });
    },
    handle_tab_keydown(event, id) {
      const index = this.workspace_tabs.findIndex((tab) => tab.id === id);
      let next_index;
      if (event.key === "ArrowRight") next_index = (index + 1) % this.workspace_tabs.length;
      if (event.key === "ArrowLeft") next_index = (index - 1 + this.workspace_tabs.length) % this.workspace_tabs.length;
      if (event.key === "Home") next_index = 0;
      if (event.key === "End") next_index = this.workspace_tabs.length - 1;
      if (next_index !== undefined) {
        event.preventDefault();
        this.activateWorkspaceTab(this.workspace_tabs[next_index].id);
        this.focus_active_tab();
      } else if (event.key === "Delete") {
        event.preventDefault();
        this.close_tab(id);
      }
    },

    // --- Arraste travado no eixo X estilo Abas de Navegador ---
    on_tab_mousedown(event, tab, index) {
      if (event.button !== 0) return;
      if (event.target.closest(".close-tab")) return;
      if (this.drag_is_settling || this.is_reorder_committing) return;

      event.stopPropagation();
      this.close_tab_context_menu();
      this.focus_workspace_window();

      const tabElements = this.workspace_tabs.map((t) => this.tab_elements[t.id]).filter(Boolean);
      if (tabElements.length !== this.workspace_tabs.length) {
        this.handle_tab_click(tab.id);
        return;
      }

      if (this.workspace_tabs.length <= 1) {
        this.handle_tab_click(tab.id);
        return;
      }

      const startX = event.clientX;
      let hasMoved = false;

      const tabsRects = tabElements.map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          left: rect.left,
          right: rect.right,
          width: rect.width,
          center: rect.left + rect.width / 2,
        };
      });

      const gap = tabsRects.length > 1 ? Math.max(0, tabsRects[1].left - tabsRects[0].right) : 6;
      const dragTabWidth = tabsRects[index].width;
      const minDelta = tabsRects[0].left - tabsRects[index].left;
      const maxDelta = tabsRects[tabsRects.length - 1].right - tabsRects[index].right;

      const cleanup = () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
        window.removeEventListener("keydown", onKeyDown);
        document.body.style.userSelect = "";
      };

      const onKeyDown = (keyEvent) => {
        if (keyEvent.key === "Escape" && hasMoved) {
          cleanup();
          this.drag_is_settling = true;
          this.drag_current_delta = 0;
          this.drag_shift_offsets = {};
          setTimeout(() => {
            this.reset_drag_state();
          }, 180);
        }
      };

      const onMouseMove = (moveEvent) => {
        const deltaX = moveEvent.clientX - startX;
        if (!hasMoved) {
          if (Math.abs(deltaX) > 4) {
            hasMoved = true;
            this.dragging_tab_id = tab.id;
            this.drag_index = index;
            this.drag_target_index = index;
            document.body.style.userSelect = "none";
          } else {
            return;
          }
        }

        const clampedDelta = Math.max(minDelta, Math.min(deltaX, maxDelta));
        this.drag_current_delta = clampedDelta;

        const currentCenter = tabsRects[index].center + clampedDelta;

        // Determina o índice de destino avaliando os pontos médios entre abas adjacentes
        let targetIndex = 0;
        for (let i = 0; i < tabsRects.length - 1; i++) {
          const midpoint = (tabsRects[i].center + tabsRects[i + 1].center) / 2;
          if (currentCenter > midpoint) {
            targetIndex = i + 1;
          }
        }

        this.drag_target_index = targetIndex;

        // Deslocamento das abas vizinhas para abrir espaço com precisão
        const shiftAmount = dragTabWidth + gap;
        const newShifts = {};
        for (let i = 0; i < this.workspace_tabs.length; i++) {
          const curTab = this.workspace_tabs[i];
          if (i === index) continue;

          let shift = 0;
          if (index < targetIndex) {
            if (i > index && i <= targetIndex) {
              shift = -shiftAmount;
            }
          } else if (index > targetIndex) {
            if (i >= targetIndex && i < index) {
              shift = shiftAmount;
            }
          }
          newShifts[curTab.id] = shift;
        }
        this.drag_shift_offsets = newShifts;
      };

      const onMouseUp = () => {
        cleanup();

        if (!hasMoved) {
          this.handle_tab_click(tab.id);
          return;
        }

        const fromIndex = this.drag_index;
        const toIndex = this.drag_target_index;

        if (fromIndex === toIndex) {
          this.drag_is_settling = true;
          this.drag_current_delta = 0;
          setTimeout(() => {
            this.reset_drag_state();
          }, 180);
          return;
        }

        let finalLandingDelta = 0;
        if (fromIndex < toIndex) {
          finalLandingDelta = tabsRects[toIndex].right - tabsRects[fromIndex].right;
        } else {
          finalLandingDelta = tabsRects[toIndex].left - tabsRects[fromIndex].left;
        }

        this.drag_is_settling = true;
        this.drag_current_delta = finalLandingDelta;

        setTimeout(() => {
          this.is_reorder_committing = true;

          const newTabs = [...this.workspace_tabs];
          const [movedTab] = newTabs.splice(fromIndex, 1);
          newTabs.splice(toIndex, 0, movedTab);
          this.reorderWorkspaceTabs(newTabs);

          this.reset_drag_state();

          this.$nextTick(() => {
            if (this.$refs.tabsList) {
              void this.$refs.tabsList.offsetHeight;
            }
            requestAnimationFrame(() => {
              this.is_reorder_committing = false;
            });
          });
        }, 180);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
      window.addEventListener("keydown", onKeyDown);
    },

    get_tab_drag_style(tabId, index) {
      if (this.is_reorder_committing) {
        return {
          transform: "none",
          transition: "none",
        };
      }

      if (this.dragging_tab_id === tabId) {
        const transition = this.drag_is_settling
          ? "transform 0.18s cubic-bezier(0.2, 0, 0, 1)"
          : "none";
        return {
          transform: `translateX(${this.drag_current_delta}px)`,
          transition,
          zIndex: 30,
        };
      }

      const shift = this.drag_shift_offsets[tabId] || 0;
      return {
        transform: shift ? `translateX(${shift}px)` : "none",
        transition: this.dragging_tab_id
          ? "transform 0.22s cubic-bezier(0.2, 0, 0, 1)"
          : "none",
        zIndex: 1,
      };
    },

    reset_drag_state() {
      this.dragging_tab_id = null;
      this.drag_index = -1;
      this.drag_target_index = -1;
      this.drag_current_delta = 0;
      this.drag_is_settling = false;
      this.drag_shift_offsets = {};
    },
  },
  beforeUnmount() {
    document.body.style.userSelect = "";
    if (typeof window !== "undefined") {
      window.removeEventListener("click", this.close_tab_context_menu);
      window.removeEventListener("contextmenu", this.on_window_contextmenu);
      window.removeEventListener("keydown", this.on_window_keydown);
    }
  },
  async mounted() {
    this.ensureWorkspaceTabs();
    this.check_teleport_target();
    this.entering_tab_ids = this.workspace_tabs.map((t) => t.id);
    setTimeout(() => {
      this.entering_tab_ids = [];
    }, 250);
    if (this.projects.length === 0) await this._loadProjectsFromDB();
    this.loading = false;
    if (typeof window !== "undefined") {
      window.addEventListener("click", this.close_tab_context_menu);
      window.addEventListener("contextmenu", this.on_window_contextmenu);
      window.addEventListener("keydown", this.on_window_keydown);
    }
  },
};
</script>

<style scoped>
.projects-window-content {
  color: var(--text-primary);
  height: 100%;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
}

/* Barra de Abas no Header (estilo Google Chrome) */
.workspace-tabs-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-width: 0;
  height: 100%;
  background: transparent;
  border: none;
  padding: 0;
  box-sizing: border-box;
}

/* Área rolável de abas */
.tabs-scroll-area {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
  scroll-behavior: smooth;
}

.tabs-scroll-area::-webkit-scrollbar {
  display: none;
}

.tabs-track {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: max-content;
}

.workspace-tabs {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 2px 0;
  position: relative;
}

/* Aba Individual com Animação de Entrada e Arraste Fluido */
.workspace-tab {
  display: inline-flex;
  align-items: center;
  position: relative;
  height: 32px;
  min-width: 120px;
  max-width: 220px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(0, 0, 0, 0.06);
  color: var(--text-secondary);
  transition:
    background 0.2s cubic-bezier(0.2, 0, 0, 1),
    border-color 0.2s cubic-bezier(0.2, 0, 0, 1),
    color 0.2s cubic-bezier(0.2, 0, 0, 1),
    box-shadow 0.2s ease;
  user-select: none;
  box-sizing: border-box;
  will-change: transform;
  cursor: grab;
}

.workspace-tab.is-entering {
  animation: tab-enter 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

.workspace-tabs.is-committing-reorder .workspace-tab {
  transition: none !important;
  animation: none !important;
}

.workspace-tab:active {
  cursor: grabbing;
}

@keyframes tab-enter {
  0% {
    opacity: 0;
    transform: scale(0.92) translateY(2px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* Animação Suave ao Fechar */
.workspace-tab.is-closing {
  animation: tab-exit 0.18s cubic-bezier(0.4, 0, 1, 1) forwards !important;
  pointer-events: none;
}

@keyframes tab-exit {
  0% {
    opacity: 1;
    transform: scale(1);
    max-width: 220px;
    margin-right: 0;
  }
  100% {
    opacity: 0;
    transform: scale(0.82) translateY(-4px);
    max-width: 0;
    padding-left: 0;
    padding-right: 0;
    margin-right: -6px;
    border-width: 0;
  }
}

/* Estilo durante o arraste tipo aba de navegador (sólido, elevado, sem esmaecimento) */
.workspace-tab.is-dragging {
  cursor: grabbing !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45), 0 2px 6px rgba(0, 0, 0, 0.25) !important;
  opacity: 1 !important;
  transform-origin: center center;
}

[data-theme="dark"] .workspace-tab.is-dragging,
:root:not([data-theme="light"]) .workspace-tab.is-dragging {
  background: linear-gradient(180deg, rgba(48, 60, 110, 0.95) 0%, rgba(32, 40, 78, 0.98) 100%) !important;
  border-color: rgba(140, 170, 255, 0.5) !important;
}

[data-theme="light"] .workspace-tab.is-dragging {
  background: #ffffff !important;
  border-color: rgba(53, 90, 253, 0.45) !important;
}

[data-theme="dark"] .workspace-tab,
:root:not([data-theme="light"]) .workspace-tab {
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.07);
  color: rgba(220, 226, 245, 0.7);
}

.workspace-tab:hover {
  background: rgba(0, 0, 0, 0.06);
  border-color: rgba(0, 0, 0, 0.12);
  color: var(--text-primary);
  transform: translateY(-1px);
}

[data-theme="dark"] .workspace-tab:hover,
:root:not([data-theme="light"]) .workspace-tab:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.14);
  color: #ffffff;
}

/* Aba Ativa */
.workspace-tab.is-active {
  background: #ffffff;
  border-color: rgba(53, 90, 253, 0.35);
  color: var(--deep-blue);
  box-shadow: 0 2px 8px rgba(31, 39, 76, 0.08);
  transform: none;
}

[data-theme="dark"] .workspace-tab.is-active,
:root:not([data-theme="light"]) .workspace-tab.is-active {
  background: linear-gradient(180deg, rgba(38, 48, 88, 0.85) 0%, rgba(24, 30, 58, 0.95) 100%);
  border: 1px solid rgba(120, 150, 255, 0.38);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.16);
  color: #ffffff;
}

/* Indicador de linha inferior na aba ativa */
.workspace-tab.is-active::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 12px;
  right: 12px;
  height: 2px;
  border-radius: 2px 2px 0 0;
  background: var(--blue);
  box-shadow: 0 0 6px rgba(53, 90, 253, 0.4);
}

[data-theme="dark"] .workspace-tab.is-active::after,
:root:not([data-theme="light"]) .workspace-tab.is-active::after {
  background: linear-gradient(90deg, #355AFD, #8b5cf6);
  box-shadow: 0 0 8px rgba(53, 90, 253, 0.6);
}

/* Botão principal dentro da aba */
.tab-main-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0 8px 0 10px;
  background: transparent;
  border: 0;
  color: inherit;
  font: inherit;
  cursor: inherit;
  border-radius: 8px 0 0 8px;
  outline: none;
  text-align: left;
}

.workspace-tab:has(.close-tab:only-child) .tab-main-btn,
.workspace-tab:not(:has(.close-tab)) .tab-main-btn {
  border-radius: 8px;
  padding-right: 12px;
}

.tab-main-btn:focus-visible {
  outline: 2px solid var(--blue);
  outline-offset: -2px;
}

/* Ícone / Miniatura do Projeto */
.tab-leading-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 16px;
  height: 16px;
}

.tab-thumb {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  object-fit: cover;
}

.tab-icon {
  font-size: 0.78rem;
  opacity: 0.8;
  color: currentColor;
  transition: color 0.15s ease;
}

.workspace-tab.is-active .tab-icon {
  opacity: 1;
  color: #5b82ff;
}

/* Nome do Projeto */
.tab-name {
  display: block;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.8125rem;
  letter-spacing: 0.01em;
  font-weight: 500;
}

.workspace-tab.is-active .tab-name {
  font-weight: 600;
}

/* Ponto de status do projeto */
.tab-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-left: 2px;
}

.tab-status-dot.bg-green {
  background: #10b981;
  box-shadow: 0 0 5px rgba(16, 185, 129, 0.6);
}

.tab-status-dot.bg-red {
  background: #ef4444;
  box-shadow: 0 0 5px rgba(239, 68, 68, 0.6);
}

.tab-status-dot.bg-yellow {
  background: #f59e0b;
  box-shadow: 0 0 5px rgba(245, 158, 11, 0.6);
}

.tab-status-dot.bg-gray {
  background: #9ca3af;
}

/* Botão Fechar Aba */
.close-tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  margin-right: 6px;
  border: 0;
  background: transparent;
  color: inherit;
  opacity: 0;
  border-radius: 50%;
  cursor: pointer;
  flex-shrink: 0;
  font-size: 0.6875rem;
  transition: opacity 0.15s ease, background-color 0.15s ease, transform 0.15s ease;
  outline: none;
  pointer-events: none;
}

.workspace-tab:hover .close-tab {
  opacity: 0.75;
  pointer-events: auto;
}

.workspace-tab.is-active:hover .close-tab {
  opacity: 0.85;
}

.close-tab:hover {
  background: rgba(214, 74, 46, 0.2);
  color: #ff6b6b !important;
  opacity: 1 !important;
  transform: scale(1.15);
}

.close-tab:focus-visible {
  outline: 2px solid var(--red);
  opacity: 1;
  pointer-events: auto;
}

/* Botão Nova Aba (+) */
.btn-new-tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 7px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(0, 0, 0, 0.03);
  color: var(--text-secondary);
  cursor: pointer;
  flex-shrink: 0;
  font-size: 0.75rem;
  transition: all 0.18s cubic-bezier(0.2, 0, 0, 1);
  outline: none;
}

[data-theme="dark"] .btn-new-tab,
:root:not([data-theme="light"]) .btn-new-tab {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(220, 226, 245, 0.65);
}

.btn-new-tab:hover {
  background: rgba(53, 90, 253, 0.15);
  border-color: rgba(53, 90, 253, 0.4);
  color: var(--blue);
  transform: scale(1.08);
  box-shadow: 0 2px 8px rgba(53, 90, 253, 0.2);
}

[data-theme="dark"] .btn-new-tab:hover,
:root:not([data-theme="light"]) .btn-new-tab:hover {
  background: rgba(53, 90, 253, 0.25);
  border-color: rgba(99, 133, 255, 0.5);
  color: #ffffff;
  box-shadow: 0 2px 10px rgba(53, 90, 253, 0.35);
}

.btn-new-tab:focus-visible {
  outline: 2px solid var(--blue);
}

@media (max-width: 1100px) {
  .workspace-tab {
    min-width: 80px;
    max-width: 150px;
  }
}

/* Painéis de workspace e Animação de Troca de Conteúdo */
.workspace-panels {
  position: relative;
  flex: 1;
  min-height: 0;
}

.workspace-panel-tab {
  will-change: opacity, transform;
}

.workspace-panel-tab.panel-entering {
  animation: panel-fade-in 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes panel-fade-in {
  0% {
    opacity: 0;
    transform: translateY(6px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .workspace-tab,
  .workspace-tab.is-closing,
  .workspace-panel-tab.panel-entering {
    animation: none !important;
    transition: none !important;
  }
}
</style>
