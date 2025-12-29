<template>
  <Transition name="slide-over-root">
    <div v-if="modelValue" class="modal-overlay" @click.self="requestClose">
      <div class="modal-content glass" :class="{ 'wide-mode': step === 1 }">
        <header class="modal-header">
          <div class="header-text">
            <h2>Planos & Assinatura</h2>
            <p class="subtitle" v-if="step === 1">
              Selecione o plano ideal para sua produtividade.
            </p>
          </div>
          <button class="close-btn" @click="requestClose">
            <font-awesome-icon icon="times" />
          </button>
        </header>

        <div v-if="step === 1" class="step-content pricing-view">
          <div class="plans-grid">
            <div
              v-for="plan in available_plans"
              :key="plan.id"
              class="plan-card"
              :class="{
                'is-current': user_plan_tier === plan.id,
                'is-selected':
                  selected_plan_id === plan.id &&
                  (user_plan_tier !== plan.id || is_canceled_plan),
                'is-interactive': user_plan_tier !== plan.id && !is_canceled_plan,
              }"
              @click="handle_card_selection(plan.id)"
            >
              <div class="card-header">
                <h3 class="plan-title">{{ plan.name }}</h3>

                <div class="price-wrapper">
                  <span class="currency" v-if="plan.price > 0">R$</span>
                  <span class="amount" v-if="plan.priceInt > 0">{{ plan.priceInt }}</span>
                  <span class="cents" v-if="plan.price > 0">,{{ plan.priceCents }}</span>
                  <span class="period" v-if="plan.price > 0">/mês</span>
                  <span class="amount free-text" v-else>Grátis</span>
                </div>

                <span v-if="user_plan_tier === plan.id" class="status-badge current">
                  <font-awesome-icon icon="check-circle" /> Atual
                </span>
                <span
                  v-else-if="selected_plan_id === plan.id"
                  class="status-badge selected"
                >
                  Selecionado
                </span>
              </div>

              <ul class="features-list">
                <li v-for="(feature, idx) in plan.features" :key="idx">
                  <font-awesome-icon icon="check" class="check-icon" />
                  <span>{{ feature }}</span>
                </li>
              </ul>

              <div class="card-action">
                <button
                  v-if="user_plan_tier === plan.id"
                  class="btn-plan current"
                  :class="is_canceled_plan ? 'is-canceled' : ''"
                  :disabled="!is_canceled_plan"
                >
                  {{ is_canceled_plan ? "Assinar novamente" : "Seu Plano" }}
                </button>
                <button
                  v-else
                  class="btn-plan select-btn"
                  :class="{ 'btn-selected': selected_plan_id === plan.id }"
                >
                  {{ selected_plan_id === plan.id ? "Confirmar" : "Selecionar" }}
                </button>
              </div>
            </div>
          </div>

          <div
            class="action-footer"
            v-if="
              selected_plan_id &&
              (selected_plan_id !== user_plan_tier || is_canceled_plan)
            "
          >
            <div class="selection-info">
              <span
                >Você selecionou:
                <strong>{{ get_plan_name(selected_plan_id) }}</strong></span
              >
            </div>

            <button
              class="btn-proceed"
              @click="go_to_checkout"
              :disabled="!connection.connected"
              :title="
                !connection.connected ? 'Conecte-se à internet para prosseguir' : ''
              "
            >
              <span v-if="connection.connected">
                {{
                  selected_plan_id == "free"
                    ? "Deixar de ser premium"
                    : "Prosseguir para Pagamento"
                }}
                <font-awesome-icon icon="arrow-right" />
              </span>
              <span v-else><font-awesome-icon icon="wifi" /> Sem Conexão</span>
            </button>
          </div>

          <div class="footer-info" v-else>
            <a
              v-if="user_plan_tier !== 'free'"
              href="#"
              @click.prevent="request_cancel"
              class="cancel-link-sm"
              :style="is_canceled_plan ? 'text-decoration: none; cursor: default;' : ''"
            >
              {{
                is_canceled_plan
                  ? "Sua assinatura acaba em " +
                    format_date(user.subscription_expires_at, "LLL")
                  : "Cancelar Assinatura"
              }}
            </a>
          </div>
        </div>

        <div v-if="step === 2" class="step-content checkout-view">
          <div class="checkout-container">
            <div class="checkout-header">
              <button class="back-link" @click="step = 1">
                <font-awesome-icon icon="arrow-left" /> Alterar Plano
              </button>
              <h3>Finalizar Assinatura</h3>
            </div>

            <div class="cpf-form glass-panel">
              <div class="summary-row">
                <span>Plano escolhido:</span>
                <strong class="highlight-text">{{
                  get_plan_name(selected_plan_id)
                }}</strong>
              </div>

              <p class="desc">
                Para regularização fiscal e emissão de nota, informe o CPF do titular da
                conta.
              </p>

              <div class="form-group">
                <input
                  type="text"
                  v-model="cpf_input"
                  placeholder=" "
                  maxlength="14"
                  @focusout="check_cpf"
                  @input="format_cpf"
                  :class="{ error: cpf_error }"
                  ref="cpfInput"
                  id="cpfInput"
                  :disabled="bill_sended"
                />
                <label for="cpfInput">CPF do Titular (000.000.000-00)</label>
              </div>
              <span class="msg" :class="error ? 'error' : 'success'">{{ msg }}</span>

              <div class="secure-badge">
                <font-awesome-icon icon="lock" /> Ambiente Seguro
              </div>

              <button
                class="btn btn-primary"
                @click="handle_checkout"
                :disabled="loading || cpf_input.length < 14 || bill_sended"
              >
                <span v-if="loading">
                  <font-awesome-icon icon="circle-notch" spin /> Processando...
                </span>
                <span v-else> Ir Para Pagamento </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
  <ConfirmationModal
    v-model="show_cancel_modal"
    :message="cancel_message"
    :description="cancel_description"
    :confirmText="confirm_text"
    @cancelled="show_cancel_modal = false"
    @confirmed="confirm_cancellation"
  />
</template>

<script>
import { mapState, mapActions } from "pinia";
import { useAuthStore } from "@/stores/auth";
import { api } from "@/plugins/api";
import { useUtilsStore } from "@/stores/utils";
import ConfirmationModal from "./ConfirmationModal.vue";

export default {
  name: "SubscriptionModal",
  emits: ["close"],
  props: {
    modelValue: { type: Boolean, default: false },
  },
  components: {
    ConfirmationModal,
  },
  data() {
    return {
      loading: false,
      step: 1,
      cpf_input: "",
      cpf_error: false,
      selected_plan_id: null,
      show_cancel_modal: false,
      cancel_message: "Deseja realmente cancelar sua assinatura?",
      cancel_description:
        "Você retornará ao plano <strong>Free</strong> assim que o período atual da assinatura acabar.",
      confirm_text: "Confirmar Cancelamento",
      msg: "",
      error: false,
      bill_sended: false,
    };
  },
  computed: {
    ...mapState(useAuthStore, ["user"]),
    ...mapState(useUtilsStore, ["connection"]),

    user_plan_tier() {
      return this.user.plan_tier || "free";
    },

    is_canceled_plan() {
      return this.user.subscription_status == "canceled";
    },

    available_plans() {
      return [
        {
          id: "free",
          name: "Kadem Free",
          price: 0,
          priceInt: "00",
          priceCents: "00",
          features: [
            "Limite de 3 Projetos",
            "Até 3 membros/projeto",
            "Radio Flow (Online apenas)",
          ],
        },
        {
          id: "pro",
          name: "Kadem Pro",
          price: 29.9,
          priceInt: "29",
          priceCents: "90",
          features: [
            "Até 7 Projetos",
            "Até 5 membros/projeto",
            "Radio Flow (Online/Offline)",
            "Sync Prioritário",
          ],
        },
        {
          id: "enterprise",
          name: "Enterprise",
          price: 159.9,
          priceInt: "159",
          priceCents: "90",
          features: [
            "Projetos Ilimitados",
            "Membros Ilimitados",
            "Acesso Total Offline",
            "Suporte Prioritário 24/7",
          ],
        },
      ];
    },
  },
  methods: {
    ...mapActions(useAuthStore, ["syncProfile"]),

    requestClose() {
      this.resetState();
      this.$emit("close");
    },

    get_plan_name(id) {
      const p = this.available_plans.find((x) => x.id === id);
      return p ? p.name : "";
    },

    handle_card_selection(plan_id) {
      if (this.user_plan_tier === plan_id && !this.is_canceled_plan) return;

      this.selected_plan_id = null;

      this.$nextTick(() => {
        this.selected_plan_id = plan_id;
      });
    },

    go_to_checkout() {
      if (!this.selected_plan_id) return;

      if (this.selected_plan_id == "free") {
        if (this.is_canceled_plan) {
          this.cancel_message = "Você já cancelou a assinatura!";
          this.confirm_text = "Ok";
          this.show_cancel_modal = true;
        } else {
          this.request_cancel();
        }

        return;
      }

      this.step = 2;
      this.$nextTick(() => {
        if (this.$refs.cpfInput) this.$refs.cpfInput.focus();
      });
    },

    format_cpf() {
      let v = this.cpf_input.replace(/\D/g, "");
      if (v.length > 11) v = v.substring(0, 11);

      v = v.replace(/(\d{3})(\d)/, "$1.$2");
      v = v.replace(/(\d{3})(\d)/, "$1.$2");
      v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");

      this.cpf_input = v;
      this.msg = "";
    },

    check_cpf() {
      const raw_cpf = this.cpf_input.replace(/\D/g, "");

      if (raw_cpf.length !== 11) {
        this.msg = "CPF inválido";
        this.error = true;
        return;
      }
    },

    async handle_checkout() {
      const raw_cpf = this.cpf_input.replace(/\D/g, "");

      this.check_cpf();

      this.loading = true;
      try {
        await api.post("/subscriptions/checkout", {
          plan_tier: this.selected_plan_id,
          cpf: raw_cpf,
        });

        this.error = false;
        this.msg = "Fatura enviada para seu e-mail.";
        this.bill_sended = true;
      } catch (error) {
        this.cpf_error = error.response?.data?.message || "Erro ao iniciar checkout.";
      } finally {
        this.loading = false;
        setTimeout(() => {
          this.requestClose();
        }, 5000);
      }
    },

    request_cancel() {
      if (this.is_canceled_plan) return;

      this.cancel_message = "Deseja realmente cancelar sua assinatura?";
      this.confirm_text = "Confirmar Cancelamento";

      this.show_cancel_modal = true;
    },

    resetState() {
      this.loading = false;
      this.step = 1;
      this.cpf_input = "";
      this.cpf_error = false;
      this.selected_plan_id = null;
      this.show_cancel_modal = false;
      this.error = false;
      this.msg = "";
      this.bill_sended = false;
    },

    async confirm_cancellation() {
      this.show_cancel_modal = false;

      if (this.is_canceled_plan) return;

      this.loading = true;

      try {
        await api.post("/subscriptions/cancel");

        this.syncProfile();
      } catch (error) {
        console.error("Erro ao cancelar:", error);
        const msg =
          error.response?.data?.error ||
          "Não foi possível cancelar a assinatura. Tente novamente ou contate o suporte.";
        alert(msg);
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  z-index: 10000;
  animation: fadeIn 0.2s ease-out;
}

.modal-content {
  background: #ffffff;
  width: 95%;
  max-width: 450px;
  border-radius: var(--radius-lg);
  padding: 0;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: var(--deep-blue);
  transition: max-width 0.4s cubic-bezier(0.25, 1, 0.5, 1);
  overflow: hidden;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-content.wide-mode {
  max-width: 1050px;
  background: #f8fafc;
}

.modal-header {
  padding: var(--space-5);
  background: white;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.modal-header h2 {
  font-size: 1.6rem;
  font-weight: 800;
  margin: 0;
  color: var(--gray-800);
}
.subtitle {
  font-size: 1rem;
  color: var(--text-gray);
  margin: 6px 0 0 0;
  font-weight: 500;
}
.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.5rem;
  color: var(--gray-400);
}
.close-btn:hover {
  color: var(--deep-blue);
}

.step-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--space-4);
  padding: var(--space-5);
  overflow-y: auto;
  overflow-x: hidden;
}

.plan-card {
  background: white;
  border: 2px solid transparent;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  border-radius: var(--radius-md);
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  transition: all 0.2s ease-in-out;
  position: relative;
  cursor: default;
}

.plan-card.is-interactive {
  cursor: pointer;
  border-color: #e2e8f0;
}

.plan-card.is-interactive:hover {
  border-color: #fcd34d;
  transform: translateY(-4px);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.plan-card.is-selected {
  border-color: #d4af37 !important;
  background-color: #fffbeb;
  transform: scale(1.02);
  box-shadow: 0 0 0 4px rgba(212, 175, 55, 0.2);
  z-index: 2;
}

.plan-card.is-current {
  border-color: var(--deep-blue) !important;
  background-color: #f1f5f9;
  opacity: 1;
}

.card-header {
  text-align: center;
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-4);
  border-bottom: 2px dashed #e2e8f0;
}

.plan-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--gray-800);
  margin-bottom: var(--space-2);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.price-wrapper {
  color: var(--gray-800);
  margin: var(--space-3) 0;
}
.currency {
  font-size: 1.1rem;
  font-weight: 600;
  vertical-align: top;
}
.amount {
  font-size: 3rem;
  font-weight: 900;
  line-height: 1;
  letter-spacing: -1px;
}
.free-text {
  font-size: 2.5rem;
  color: var(--deep-blue);
}
.cents {
  font-size: 1.2rem;
  font-weight: 700;
}
.period {
  color: var(--text-gray);
  font-size: 0.9rem;
  font-weight: 600;
}

.form-group input {
  margin: var(--space-5) 0;
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  margin-top: 10px;
}
.status-badge.current {
  background: var(--deep-blue);
  color: white;
}
.status-badge.selected {
  background: #d4af37;
  color: white;
}

.features-list {
  list-style: none;
  padding: 0;
  margin: 0 0 var(--space-5) 0;
  flex-grow: 1;
}
.features-list li {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 12px;
  font-size: 0.95rem;
  color: var(--text-gray);
  font-weight: 500;
}
.check-icon {
  color: var(--green);
  font-size: 1rem;
}
.plan-card.core .check-icon {
  color: var(--gray-400);
}

.card-action {
  margin-top: auto;
}
.btn-plan {
  width: 100%;
  padding: 12px;
  border-radius: var(--radius-md);
  font-weight: 700;
  border: none;
  font-size: 0.9rem;
  text-transform: uppercase;
}
.btn-plan.current {
  background: #cbd5e1;
  color: var(--gray-400);
  cursor: not-allowed;

  &.is-canceled {
    background: white !important;
    border: 2px solid var(--deep-blue) !important;
    color: var(--deep-blue) !important;
    cursor: pointer !important;
  }
}
.btn-plan.select-btn {
  background: white;
  border: 2px solid var(--deep-blue);
  color: var(--deep-blue);
  cursor: pointer;
  transition: all 0.2s;
}
.btn-plan.btn-selected {
  background: #d4af37;
  border-color: #d4af37;
  color: white;
}

.msg {
  transform: translateY(-10px);
  display: inline-block;
}

.action-footer {
  background: white;
  border-top: 1px solid #e2e8f0;
  padding: var(--space-4) var(--space-5);
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.05);
  animation: slide-up 0.3s ease;
}

.selection-info {
  font-size: 1.1rem;
  color: var(--gray-400);
}
.selection-info strong {
  color: var(--deep-blue);
  font-weight: 800;
}

.btn-proceed {
  background: var(--deep-blue);
  color: white;
  padding: 12px 24px;
  border-radius: var(--radius-md);
  font-weight: 700;
  font-size: 1rem;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: background 0.2s;
}
.btn-proceed:hover {
  background: #1e293b;
}
.btn-proceed:disabled {
  background: #94a3b8;
  color: #f1f5f9;
  cursor: not-allowed;
  opacity: 1;
}

.checkout-view {
  justify-content: center;
  align-items: center;
  background: #f1f5f9;
  padding: var(--space-4);
}
.checkout-container {
  width: 100%;
  max-width: 400px;
  animation: slide-in 0.3s ease;
}
.checkout-header {
  display: flex;
  align-items: center;
  margin-bottom: var(--space-4);
  gap: 15px;
}
.back-link {
  background: white;
  border: 1px solid #cbd5e1;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  color: var(--deep-blue);
  font-weight: 600;
  display: flex;
  gap: 6px;
  align-items: center;
}
.glass-panel {
  background: white;
  padding: var(--space-5);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
.summary-row {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e2e8f0;
  font-size: 1.1rem;
  display: flex;
  justify-content: space-between;
}
.highlight-text {
  color: #d4af37;
  font-weight: 800;
}

.footer-info {
  padding: var(--space-4);
  text-align: center;
}
.cancel-link-sm {
  color: var(--gray-400);
  font-weight: 600;
  text-decoration: underline;
}

.secure-badge {
  margin-bottom: var(--space-5);
}

@keyframes slide-up {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}
@keyframes slide-in {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@media (max-width: 768px) {
  .action-footer {
    flex-direction: column;
    gap: 15px;
    text-align: center;
  }
  .btn-proceed {
    width: 100%;
    justify-content: center;
  }
}
</style>
