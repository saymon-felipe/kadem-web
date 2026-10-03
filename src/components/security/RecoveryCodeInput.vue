<template>
  <div class="form-group">
    <input
      :id="id"
      ref="input"
      class="recovery-code-input"
      type="text"
      inputmode="text"
      autocomplete="one-time-code"
      autocapitalize="characters"
      autocorrect="off"
      spellcheck="false"
      placeholder=" "
      :value="modelValue"
      @input="onInput"
      @keydown.enter="$emit('enter')"
    />
    <label :for="id">{{ label }}</label>
  </div>
</template>

<script>
import { formatRecoveryCode } from "@/utils/otp_code";

// Código de backup do 2FA (XXXXX-XXXXX). Só letras e números, em maiúsculas, com o hífen no lugar certo.
export default {
  name: "RecoveryCodeInput",
  props: {
    modelValue: { type: String, default: "" },
    id: { type: String, required: true },
    label: { type: String, default: "Código de backup" },
  },
  emits: ["update:modelValue", "enter"],
  methods: {
    focus() {
      this.$refs.input?.focus();
    },
    onInput(event) {
      const input = event.target;
      const next = formatRecoveryCode(input.value);

      // Mesmo motivo do OtpInput: se o texto limpo for igual ao estado, o Vue não repinta e o caractere inválido ficaria.
      if (input.value !== next) input.value = next;
      if (next !== this.modelValue) this.$emit("update:modelValue", next);
    },
  },
};
</script>

<style scoped>
.recovery-code-input {
  letter-spacing: 0.2em;
  font-weight: 600;
  text-align: center;
  text-transform: uppercase;
  font-variant-numeric: tabular-nums;
}
</style>
