import moment from 'moment/min/moment-with-locales';

moment.locale('pt-br');

export default {
  data() {
    return {
      responseType: "",
      response: "",
      loading: false
    }
  },
  methods: {
    setResponse(type, msg, loading) {
      this.loading = loading;
      this.responseType = type;
      this.response = msg;
    },
    resetResponse() {
      this.responseType = "";
      this.response = "";
    },
    sanitizeHtml(str) {
      if (!str || str.trim() == "") return "";

      const allowedTags = ['b', 'i', 'p', 'br'];
      const regex = new RegExp(`<\/?(?!${allowedTags.join('|')})[^>]*>`, 'gi');
      const withBreaks = str.replace(/\n/g, '<br>');
      const sanitized = withBreaks.replace(regex, '');

      return sanitized;
    },
    format_seconds_to_time: (seconds) => {
      if (!seconds) return '0:00';

      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);

      const m_str = h > 0 ? m.toString().padStart(2, '0') : m.toString();
      const s_str = s.toString().padStart(2, '0');

      return h > 0 ? `${h}:${m_str}:${s_str}` : `${m_str}:${s_str}`;
    },
    format_total_duration_verbose: (seconds) => {
      if (!seconds) return '0 minutos';

      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);

      if (h > 0) return `${h}h ${m}m`;
      return `${m}:${Math.floor(seconds % 60).toString().padStart(2, '0')} minutos`;
    },
    format_date: (date, format) => {
      return moment(date).locale("pt-br").format(format || "LLLL");
    }
  },
  created() {

  }
}
