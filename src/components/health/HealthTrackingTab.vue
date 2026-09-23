<template>
  <div class="tracking-tab">
    <div class="tracking-header">
      <div><span class="eyebrow">DIÁRIO PESSOAL</span><h3>Acompanhamento</h3><p>Registre como você se sente, o que come e o que acontece ao longo do dia.</p></div>
      <div class="header-actions"><button class="secondary" type="button" @click="$emit('new-tracker')"><font-awesome-icon icon="sliders" /> Configurar</button><button class="primary" type="button" @click="$emit('new-checkin')"><font-awesome-icon icon="plus" /> Check-in</button></div>
    </div>
    <p v-if="error" class="tracking-error">{{ error }}</p>

    <div v-if="!trackers.length" class="start-card">
      <font-awesome-icon icon="heart-pulse" /><h4>Monte seu diário de saúde</h4>
      <p>Crie escalas, opções, medições e campos livres. Você decide o que acompanhar.</p>
      <div class="header-actions"><button class="primary" type="button" @click="$emit('new-tracker')">Criar rastreador</button><button class="secondary" type="button" :disabled="loadingTemplate" @click="$emit('add-template')">{{ loadingTemplate ? 'Adicionando…' : 'Usar modelo Digestão & bem-estar' }}</button></div>
      <small>O modelo é opcional. Todos os campos podem ser editados ou arquivados.</small>
    </div>

    <template v-else>
      <section class="trackers-section">
        <div class="section-title"><h4>Seus rastreadores</h4><span>{{ activeTrackers.length }} ativo(s)</span></div>
        <div class="tracker-grid">
          <article v-for="tracker in activeTrackers" :key="tracker.local_key" class="tracker-card">
            <span class="group-label">{{ tracker.group || 'Bem-estar' }}</span><h5>{{ tracker.name }}</h5><p>{{ typeLabel(tracker) }}</p>
            <div class="card-actions"><button type="button" @click="$emit('edit-tracker', tracker)">Editar</button><button type="button" @click="$emit(pinned(tracker) ? 'unpin-tracker' : 'pin-tracker', tracker)">{{ pinned(tracker) ? 'Desafixar' : 'Fixar no Overview' }}</button><button type="button" @click="$emit('archive-tracker', tracker)">Arquivar</button></div>
          </article>
        </div>
        <div class="template-row"><button type="button" :disabled="loadingTemplate" @click="$emit('add-template')">{{ loadingTemplate ? 'Adicionando…' : 'Adicionar campos do modelo Digestão & bem-estar' }}</button><span v-if="archivedCount">{{ archivedCount }} arquivado(s), preservados no histórico.</span></div>
      </section>

      <HealthTrackingInsights :trackers="trackers" :checkins="checkins" />

      <section class="recent-section"><div class="section-title"><h4>Check-ins recentes</h4><span>{{ checkins.length }} registro(s)</span></div>
        <p v-if="!checkins.length" class="empty-copy">Seu primeiro check-in já aparecerá aqui e na linha do tempo geral.</p>
        <div v-else class="recent-list"><article v-for="event in checkins.slice(0, 6)" :key="event.local_key" class="recent-card"><div><time>{{ formatDate(event.occurred_at) }}</time><p>{{ preview(event) }}</p><small v-if="event.notes">{{ event.notes }}</small></div><button type="button" @click="$emit('correct-checkin', event)">Corrigir</button></article></div>
      </section>
    </template>
  </div>
</template>

<script>
import HealthTrackingInsights from "./HealthTrackingInsights.vue";

export default {
  name: "HealthTrackingTab",
  components: { HealthTrackingInsights },
  props: {
    trackers: { type: Array, default: () => [] }, checkins: { type: Array, default: () => [] }, widgets: { type: Array, default: () => [] },
    formatDate: { type: Function, required: true }, loadingTemplate: { type: Boolean, default: false }, error: { type: String, default: "" },
  },
  emits: ["new-tracker", "new-checkin", "edit-tracker", "archive-tracker", "pin-tracker", "unpin-tracker", "add-template", "correct-checkin"],
  computed: {
    activeTrackers() { return this.trackers.filter((tracker) => !tracker.archived); },
    archivedCount() { return this.trackers.length - this.activeTrackers.length; },
  },
  methods: {
    pinned(tracker) { return this.widgets.some((widget) => widget.object_key === tracker.local_key); },
    typeLabel(tracker) { return { SCALE: `Escala ${tracker.min_value}–${tracker.max_value}`, NUMBER: `Número${tracker.unit ? ` · ${tracker.unit}` : ''}`, SINGLE: 'Uma opção', MULTI: 'Várias opções', TAGS: 'Tags livres', TEXT: 'Texto', BOOLEAN: 'Sim ou não' }[tracker.value_type] || 'Registro'; },
    preview(event) {
      return Object.entries(event.values || {}).slice(0, 4).map(([key, value]) => {
        const tracker = this.trackers.find((item) => item.local_key === key);
        return `${tracker?.name || 'Campo'}: ${Array.isArray(value) ? value.join(', ') : value}`;
      }).join(' · ') || 'Observação livre';
    },
  },
};
</script>

<style scoped>
.tracking-tab { display: grid; gap: var(--space-5); padding-bottom: var(--space-5); }
.tracking-header, .section-title { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-3); }
.tracking-header h3 { color: var(--text-primary); margin: 2px 0; font-size: 1.16rem; }
.tracking-header p { color: var(--text-secondary); margin: 0; font-size: .83rem; }
.tracking-error { margin: 0; padding: var(--space-2); border-radius: var(--radius-xs); color: var(--color-expense); background: var(--red-high); font-size: .8rem; }
.eyebrow, .group-label { color: #e25373; font-size: .7rem; font-weight: 800; letter-spacing: .07em; text-transform: uppercase; }
.header-actions { display: flex; flex-wrap: wrap; gap: var(--space-2); }
button { border-radius: var(--radius-xs); padding: 8px 12px; font-size: .8rem; font-weight: 700; cursor: pointer; }
button:disabled { opacity: .6; cursor: wait; }
.primary { background: linear-gradient(135deg, #e25373, #8d5fd3); border: 0; color: white; }
.secondary { background: var(--surface-1); border: 1px solid var(--glass-border); color: var(--text-primary); }
.start-card, .tracker-card, .recent-card { background: var(--surface-0); border: 1px solid var(--glass-border); border-radius: var(--radius-sm); box-shadow: var(--shadow-xs); }
.start-card { display: grid; justify-items: start; gap: var(--space-2); padding: var(--space-6); color: var(--text-primary); }
.start-card > svg { color: #e25373; font-size: 1.5rem; }
.start-card h4, .start-card p { margin: 0; }.start-card p, .start-card small { color: var(--text-secondary); }
.trackers-section, .recent-section { display: grid; gap: var(--space-3); }
.section-title h4 { margin: 0; color: var(--text-primary); }.section-title span { font-size: .76rem; color: var(--text-muted); }
.tracker-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(205px, 1fr)); gap: var(--space-3); }
.tracker-card { padding: var(--space-3); display: grid; align-content: start; gap: 5px; }.tracker-card h5 { margin: 0; color: var(--text-primary); font-size: .9rem; }.tracker-card p { margin: 0; color: var(--text-muted); font-size: .75rem; }
.card-actions { display: flex; flex-wrap: wrap; gap: 3px; border-top: 1px solid var(--glass-border); margin-top: 6px; padding-top: 7px; }.card-actions button, .template-row button, .recent-card button { border: 0; background: transparent; color: #a871de; padding: 5px 7px; }.card-actions button:hover, .template-row button:hover, .recent-card button:hover { background: var(--surface-2); }
.template-row { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; }.template-row span, .empty-copy { color: var(--text-muted); font-size: .76rem; }
.recent-list { display: grid; gap: var(--space-2); }.recent-card { padding: var(--space-3); display: flex; justify-content: space-between; gap: var(--space-3); }.recent-card time { color: #e25373; font-weight: 700; font-size: .74rem; }.recent-card p { color: var(--text-primary); margin: 3px 0; font-size: .8rem; }.recent-card small { color: var(--text-muted); }
</style>
