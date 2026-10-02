/**
 * Autoscroll por proximidade da borda para listas arrastáveis.
 *
 * O Sortable só rola quando o ponteiro está a ~30px da borda e sempre na mesma
 * velocidade. Aqui a zona ativa é proporcional à altura do container e a
 * velocidade cresce conforme o ponteiro se aproxima da borda, continuando a
 * crescer quando ele passa para fora do container.
 */
export const DEFAULT_AUTOSCROLL = {
  zone_ratio: 0.35, // fração da altura do container usada como zona ativa
  min_zone: 90, // px
  max_zone: 200, // px
  overshoot: 0.5, // quantas zonas além da borda até chegar na velocidade máxima
  min_speed: 120, // px/s ao entrar na zona
  max_speed: 1500, // px/s
  curve: 1.6, // >1 deixa o início suave e a parte final rápida
  side_tolerance: 32, // px além das laterais do container em que ainda conta
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/**
 * Velocidade vertical (px/s) para o ponteiro em relação ao container.
 * Negativo rola para cima, positivo para baixo, 0 fora das zonas.
 *
 * @param {{x: number, y: number}|null} pointer - posição do ponteiro (viewport)
 * @param {{top: number, bottom: number, left: number, right: number, height: number}} rect
 * @param {Partial<typeof DEFAULT_AUTOSCROLL>} [options]
 * @returns {number}
 */
export const get_autoscroll_velocity = (pointer, rect, options = {}) => {
  if (!pointer || !rect || !(rect.height > 0)) return 0;

  const opts = { ...DEFAULT_AUTOSCROLL, ...options };

  if (
    pointer.x < rect.left - opts.side_tolerance ||
    pointer.x > rect.right + opts.side_tolerance
  ) {
    return 0;
  }

  // Com zone <= height / 2 as zonas de cima e de baixo nunca se sobrepõem.
  const zone = Math.min(
    clamp(rect.height * opts.zone_ratio, opts.min_zone, opts.max_zone),
    rect.height / 2
  );

  const depth_top = rect.top + zone - pointer.y;
  const depth_bottom = pointer.y - (rect.bottom - zone);
  const depth = Math.max(depth_top, depth_bottom);

  if (depth <= 0) return 0;

  const ratio = Math.min(depth / (zone * (1 + opts.overshoot)), 1);
  const speed = opts.min_speed + (opts.max_speed - opts.min_speed) * ratio ** opts.curve;

  return depth_top > 0 ? -speed : speed;
};
