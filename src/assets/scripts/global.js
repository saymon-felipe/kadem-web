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
    }
  },
  created() {

  }
}