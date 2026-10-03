<template>
  <div class="otp">
    <label v-if="label" :for="inputId" class="otp-label">{{ label }}</label>

    <div class="otp-field">
      <!-- Um único input real (invisível) por cima das caixas: colar, autopreenchimento do SMS/e-mail
           (one-time-code), Backspace no celular e leitor de tela funcionam sem tratamento por caixa.
           As caixas só desenham o que está digitado. Sem maxlength de propósito: o navegador cortaria
           um código colado com espaço ("123 456") antes de a limpeza rodar. -->
      <input
        :id="inputId"
        ref="input"
        class="otp-input"
        type="text"
        inputmode="numeric"
        pattern="[0-9]*"
        autocomplete="one-time-code"
        autocapitalize="off"
        autocorrect="off"
        spellcheck="false"
        :aria-label="label ? undefined : ariaLabel"
        :value="modelValue"
        @input="onInput"
        @focus="moveCaretToEnd"
        @click="moveCaretToEnd"
        @keydown.enter="$emit('enter')"
      />

      <div class="otp-slots" aria-hidden="true">
        <span
          v-for="(slot, index) in slots"
          :key="index"
          class="otp-slot"
          :class="{
            'is-filled': slot !== '',
            'is-active': index === activeIndex,
            'has-gap': groupSize > 0 && (index + 1) % groupSize === 0 && index < length - 1,
          }"
        >
          {{ slot }}
        </span>
      </div>
    </div>
  </div>
</template>

<script>
import { digitsOnly } from "@/utils/otp_code";

let sequence = 0;

// Campo de código numérico de uso único (app autenticador e código por e-mail). Só aceita dígitos.
// Uso: <OtpInput v-model="code" label="Código de 6 dígitos" @enter="confirm" />
export default {
  name: "OtpInput",
  props: {
    modelValue: { type: String, default: "" },
    length: { type: Number, default: 6 },
    // Rótulo visível acima das caixas; sem ele, `ariaLabel` dá o nome acessível ao campo.
    label: { type: String, default: "" },
    ariaLabel: { type: String, default: "Código de verificação" },
    // Separa as caixas de N em N (123 456). 0 desliga.
    groupSize: { type: Number, default: 3 },
  },
  emits: ["update:modelValue", "enter"],
  data() {
    sequence += 1;
    return { inputId: `otp-input-${sequence}` };
  },
  computed: {
    slots() {
      return Array.from({ length: this.length }, (_, index) => this.modelValue[index] || "");
    },
    // Caixa que recebe o próximo dígito; com o código completo fica na última.
    activeIndex() {
      return Math.min(this.modelValue.length, this.length - 1);
    },
  },
  methods: {
    focus() {
      this.$refs.input?.focus();
    },
    onInput(event) {
      const input = event.target;
      const next = digitsOnly(input.value, this.length);

      // O DOM é mexido à mão porque, se o texto limpo for igual ao estado atual (digitou "["), o Vue não
      // tem o que repintar e o caractere inválido ficaria no campo.
      if (input.value !== next) input.value = next;
      if (next !== this.modelValue) this.$emit("update:modelValue", next);
    },
    // Edição sempre no fim: o Backspace apaga o último dígito e o texto novo entra depois do último.
    // Roda na hora e de novo no próximo ciclo, porque ao focar com o mouse o navegador posiciona o cursor
    // depois do evento. O tamanho é lido a cada chamada: um valor guardado ficaria velho se o usuário
    // (ou o autopreenchimento) digitar nesse meio tempo.
    moveCaretToEnd(event) {
      const input = event.target;
      const snap = () => input.setSelectionRange?.(input.value.length, input.value.length);

      snap();
      setTimeout(snap, 0);
    },
  },
};
</script>

<style scoped>
.otp {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  width: 100%;
  max-width: 22rem;
  margin: var(--space-3) auto;
}

.otp-label {
  font-size: var(--fontsize-xs);
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
}

.otp-field {
  position: relative;
}

.otp-slots {
  display: flex;
  gap: var(--space-3);
  pointer-events: none;
}

.otp-slot {
  position: relative;
  flex: 1 1 0;
  min-width: 0;
  height: 56px;
  display: grid;
  place-items: center;
  border: 1.5px solid var(--otp-border);
  border-radius: var(--radius-sm);
  background: var(--surface-0);
  color: var(--text-primary);
  font-size: 1.5rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  box-shadow: var(--shadow-xs);
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast),
    background var(--transition-fast);
}

.otp-slot.has-gap {
  margin-right: var(--space-4);
}

.otp-slot.is-filled {
  border-color: var(--otp-border-filled);
}

/* Cursor piscando na caixa que recebe o próximo dígito. */
.otp-field:focus-within .otp-slot.is-active {
  border-color: var(--blue);
  box-shadow: 0 0 0 3px var(--otp-focus-ring);
}

.otp-field:focus-within .otp-slot.is-active:not(.is-filled)::after {
  content: "";
  width: 2px;
  height: 1.6rem;
  border-radius: 1px;
  background: var(--blue);
  animation: otp-caret 1.1s steps(1) infinite;
}

/* O input cobre as caixas inteiras: qualquer toque abre o teclado e colar/autopreencher cai nele.
   A classe repetida sobe a especificidade acima dos estilos globais de input (incluindo o tema escuro). */
.otp-input.otp-input {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  padding: 0;
  border: none;
  border-radius: var(--radius-sm);
  outline: none;
  background: transparent;
  box-shadow: none;
  color: transparent;
  caret-color: transparent;
  opacity: 0;
  /* 16px+ evita o zoom automático do iOS ao focar. */
  font-size: 16px !important;
  cursor: text;
}

.otp-input.otp-input:focus {
  outline: none;
}

@keyframes otp-caret {
  50% {
    opacity: 0;
  }
}

@media (max-width: 380px) {
  .otp-slots {
    gap: var(--space-2);
  }

  .otp-slot {
    height: 50px;
    font-size: 1.3rem;
  }

  .otp-slot.has-gap {
    margin-right: var(--space-3);
  }
}

@media (prefers-reduced-motion: reduce) {
  .otp-field:focus-within .otp-slot.is-active:not(.is-filled)::after {
    animation: none;
  }
}
</style>
