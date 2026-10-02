// Atraso anti-flash compartilhado por KademSkeletonGroup e KademLoader.
//
// Cada indicador de carregamento so aparece depois de `appear_delay` ms, para que cargas rapidas
// nao piquem. Mas quando um indicador JA VISIVEL e trocado por outro (ex.: esqueleto da janela
// enquanto o chunk baixa -> esqueleto dos dados da propria tela), o segundo nao pode repetir o
// atraso: a tela ficaria em branco entre os dois. Por isso, se algum indicador acabou de sair
// da tela, o proximo entra na hora.
const CONTINUITY_WINDOW_MS = 400;

let last_visible_end = -Infinity;

const resolve_appear_delay = (base_delay) =>
  performance.now() - last_visible_end < CONTINUITY_WINDOW_MS ? 0 : base_delay;

export const loadingContinuity = {
  props: {
    appear_delay: { type: Number, default: 140 },
  },
  data() {
    return {
      delay_ms: resolve_appear_delay(this.appear_delay),
      was_visible: false,
    };
  },
  mounted() {
    this.reveal_timer = setTimeout(() => {
      this.was_visible = true;
    }, this.delay_ms);
  },
  beforeUnmount() {
    clearTimeout(this.reveal_timer);
    if (this.was_visible) last_visible_end = performance.now();
  },
};
