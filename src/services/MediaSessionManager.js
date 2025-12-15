/**
 * src/services/MediaSessionManager.js
 * Gerenciador centralizado para a API Media Session.
 * Responsável por integrar o player com os controles nativos do SO (Tela de bloqueio, Teclado, etc).
 */

class MediaSessionManager {
  constructor() {
    this.has_media_session = "mediaSession" in navigator;
  }

  /**
   * Define os metadados da música atual (Título, Artista, Capa).
   * @param {Object} music - Objeto da música (deve conter title, channel/artist, thumbnail).
   */
  set_metadata(music) {
    if (!this.has_media_session || !music) return;

    // Garante que a imagem esteja em uma estrutura aceita ou usa uma vazia
    const artwork = music.thumbnail
      ? [
        {
          src: music.thumbnail,
          sizes: "512x512",
          type: "image/png",
        },
      ]
      : [];

    navigator.mediaSession.metadata = new MediaMetadata({
      title: music.title || "Kadem Player",
      artist: music.channel || music.artist || "Desconhecido",
      album: "Kadem Queue",
      artwork: artwork,
    });
  }

  /**
   * Define o estado de reprodução (playing/paused).
   * @param {Boolean} is_playing
   */
  set_playback_state(is_playing) {
    if (!this.has_media_session) return;
    navigator.mediaSession.playbackState = is_playing ? "playing" : "paused";
  }

  /**
   * Define os handlers para as ações de mídia (Play, Pause, Next, Prev, Seek).
   * @param {Object} handlers - Objeto contendo funções de callback { onPlay, onPause, onNext, onPrev, onSeek }.
   */
  set_action_handlers(handlers) {
    if (!this.has_media_session) return;

    const action_map = [
      ["play", handlers.onPlay],
      ["pause", handlers.onPause],
      ["previoustrack", handlers.onPrev],
      ["nexttrack", handlers.onNext],
      ["seekto", handlers.onSeek],
    ];

    action_map.forEach(([action, handler]) => {
      try {
        if (handler) {
          navigator.mediaSession.setActionHandler(action, handler);
        } else {
          navigator.mediaSession.setActionHandler(action, null);
        }
      } catch (error) {
        console.warn(`MediaSession action '${action}' não suportada neste navegador.`);
      }
    });
  }
  set_position_state(state) {
    if (!this.has_media_session || !state) return;

    if (
      typeof state.duration !== 'number' ||
      typeof state.position !== 'number' ||
      isNaN(state.duration) ||
      isNaN(state.position) ||
      state.duration <= 0 ||
      state.position < 0 ||
      state.position > state.duration
    ) {
      return;
    }

    try {
      navigator.mediaSession.setPositionState({
        duration: state.duration,
        playbackRate: state.playbackRate || 1,
        position: state.position,
      });
    } catch (error) {
      // Ignora erros de arredondamento
    }
  }
}

export default new MediaSessionManager();
