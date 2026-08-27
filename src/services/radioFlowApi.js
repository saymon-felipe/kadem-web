import { watch } from "vue";
import { usePlayerStore } from "@/stores/player";
import { useRadioStore } from "@/stores/radio";
import { useWindowStore } from "@/stores/windows";

const RADIO_FLOW_WINDOW = {
  id: "productivity",
  title: "Produtividade",
  componentId: "ProductivityWindow",
};

const player_store = () => usePlayerStore();
const radio_store = () => useRadioStore();
const window_store = () => useWindowStore();

const state_snapshot = () => {
  const player = player_store();
  const radio = radio_store();

  return {
    current_music: player.current_music,
    current_playlist: player.current_playlist,
    is_playing: player.is_playing,
    is_loading: player.is_loading,
    playback_position: player.playback_position,
    duration: player.get_duration(),
    volume: player.volume,
    is_shuffle: player.is_shuffle,
    queue: [...player.queue],
    playlists: [...radio.playlists],
  };
};

/**
 * Public frontend API for Radio Flow.
 *
 * Widgets and automations should use this facade for commands instead of
 * accessing the player, radio, or window stores directly.
 */
export const radioFlowApi = {
  get_state: state_snapshot,

  subscribe(listener, { immediate = true } = {}) {
    return watch(state_snapshot, listener, { deep: true, immediate });
  },

  open({ focus = false } = {}) {
    const player = player_store();
    const windows = window_store();
    const has_productivity_window = !!windows.currentUserWindows.productivity;

    if (!has_productivity_window || focus) {
      windows.openWindow({
        ...RADIO_FLOW_WINDOW,
        start_minimized: !focus,
      });
    }

    player.setActiveApp("radio_flow");
  },

  focus() {
    return radioFlowApi.open({ focus: true });
  },

  close() {
    window_store().closeWindow(RADIO_FLOW_WINDOW.id);
  },

  async play() {
    const player = player_store();
    if (!player.current_music || player.is_playing) return !!player.is_playing;

    const is_ready = await player.wait_for_player_ready();
    if (!is_ready || player.is_playing) return !!player.is_playing;

    await player.toggle_play();
    return player.is_playing;
  },

  async pause() {
    const player = player_store();
    if (player.is_playing) await player.toggle_play();
    return player.is_playing;
  },

  async toggle() {
    return player_store().is_playing ? radioFlowApi.pause() : radioFlowApi.play();
  },

  next() {
    return player_store().next();
  },

  previous() {
    return player_store().prev();
  },

  seek(seconds) {
    return player_store().seek_to(seconds);
  },

  get_current_time() {
    return player_store().get_current_time();
  },

  get_duration() {
    return player_store().get_duration();
  },

  update_playback_position(seconds, options) {
    return player_store().update_playback_position(seconds, options);
  },

  set_volume(value, options) {
    return player_store().set_volume(value, options);
  },

  play_track(track, playlist = null, options = {}) {
    return player_store().play_track(track, playlist, options);
  },

  play_playlist(playlist, tracks, start_track = null) {
    return player_store().play_playlist_context(playlist, tracks, start_track);
  },

  set_current_playlist(playlist) {
    return player_store().setCurrentPlaylist(playlist);
  },

  set_viewed_playlist(id) {
    return player_store().setViewedPlaylistId(id);
  },

  set_shuffle(enabled) {
    const player = player_store();
    const next_value = !!enabled;
    if (player.is_shuffle !== next_value) player.toggle_shuffle();
    return player.is_shuffle;
  },

  toggle_shuffle() {
    return player_store().toggle_shuffle();
  },

  queue: {
    add(track) {
      return player_store().add_to_queue(track);
    },
    remove(index) {
      return player_store().remove_from_queue(index);
    },
    replace(tracks) {
      return player_store().set_queue(tracks);
    },
    clear() {
      return player_store().set_queue([]);
    },
  },

  playlists: {
    refresh() {
      return radio_store().pullPlaylists();
    },
    load_local() {
      return radio_store()._loadFromDB();
    },
    create(name, cover = "") {
      return radio_store().createPlaylist(name, cover);
    },
    rename(playlist, name) {
      return radio_store().renamePlaylist(playlist, name);
    },
    remove(local_id, server_id) {
      return radio_store().deletePlaylist(local_id, server_id);
    },
    add_track(playlist, track) {
      return radio_store().addTrackToPlaylist(playlist, track);
    },
    remove_track(track) {
      return radio_store().removeTrackFromPlaylist(track);
    },
    set_cover(playlist_id, cover) {
      return radio_store().update_playlist_cover(playlist_id, cover);
    },
    download(playlist, options) {
      return radio_store().downloadPlaylist(playlist, options);
    },
    download_track(track, options) {
      return radio_store().downloadTrack(track, options);
    },
  },
};
