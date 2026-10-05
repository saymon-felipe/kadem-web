<template>
  <div class="nexo-shell">
    <NexoHeader
      :selected-month="selectedMonth"
      :plan-label="planLabel"
      :ai-usage-label="aiUsageLabel"
      :loading="loading"
      @update:selectedMonth="selectedMonth = $event"
      @reload="reloadAll"
      @new-transaction="openTransactionForm()"
    />
    <NexoTabs :tabs="tabs" :active-tab="activeTab" :is-paid-plan="isPaidPlan" @update:activeTab="setActiveTab" />

    <div class="tab-viewport" ref="tabViewport" @scroll.passive="handleViewportScroll">
      <!-- As abas seguem montadas (o chat de IA, por exemplo, depende delas durante o reloadAll); so ficam escondidas. -->
      <DashboardSkeleton
        v-if="initialLoading"
        class="tab-skeleton"
        :variant="activeTab === 'overview' ? 'overview' : 'list'"
        :metrics="5"
        label="Carregando seus dados financeiros…"
      />
      <div class="tabs-track" :class="{ 'is-initial-loading': initialLoading }" :style="trackStyle">
        <section v-for="tab in tabs" :key="tab.id" class="tab-pane custom-scrollbar" :style="paneStyle">
          <template v-if="tab.id === 'overview'">
            <NexoOverviewTab
              :totals="totals"
              :categories="categories"
              :recent-transactions="recentTransactions"
              :macro-distribution="macroDistribution"
              :investment-summary="investmentSummary"
              :format-money="money"
              :format-signed-money="signedMoney"
              :format-short-date="shortDate"
              @view-transactions="setActiveTab('transactions')"
              @toggle-ignored="toggleIgnored"
              @delete-transaction="requestDeleteTransaction"
            />
          </template>

          <template v-else-if="tab.id === 'transactions'">
            <NexoTransactionsTab
              :is-paid-plan="isPaidPlan"
              :can-use-ai="canUseAi"
              :categorizing-ai="categorizingAi"
              :importing-csv="importingCsv"
              :loading-schema="loadingSchema"
              :csv-import-error="csvImportError"
              :csv-import-file-name="csvImportFileName"
              :csv-preview-rows="csvPreviewRows"
              :csv-import-rows="csvImportRows"
              :csv-import-totals="csvImportTotals"
              :csv-import-summary="csvImportSummary"
              :transaction-search="transactionSearch"
              :transaction-category-filter="transactionCategoryFilter"
              :transactions="filteredTransactions"
              :categories="categories"
              :categorizing-ids="categorizingIds"
              :format-money="money"
              :format-signed-money="signedMoney"
              :format-short-date="shortDate"
              :format-date-time="shortDateTime"
              :pagination-reset-key="transactionPaginationResetKey"
              @upgrade="showPlanModal = true"
              @auto-categorize="autoCategorize"
              @csv-file-change="handleCsvFileChange"
              @open-csv-preview="showCsvPreviewModal = true"
              @reset-csv="resetCsvImport"
              @confirm-csv="confirmCsvImport"
              @edit-transaction="openTransactionForm"
              @toggle-ignored="toggleIgnored"
              @delete-transaction="requestDeleteTransaction"
              @select-category="selectTransactionCategory"
              @create-category-for-transaction="openCategoryFormForTransaction"
              @update:transaction-search="transactionSearch = $event"
              @update:transaction-category-filter="transactionCategoryFilter = $event"
            />
          </template>

          <template v-else-if="tab.id === 'budget'">
            <div class="budget-summary-grid">
              <article class="budget-summary-card income">
                <span class="summary-icon"><font-awesome-icon icon="arrow-up" /></span>
                <div>
                  <small>Entradas planejadas</small>
                  <strong>{{ money(budgetSummary.plannedIncome) }}</strong>
                </div>
              </article>
              <article class="budget-summary-card expense">
                <span class="summary-icon"><font-awesome-icon icon="arrow-down" /></span>
                <div>
                  <small>Saídas planejadas</small>
                  <strong>{{ money(budgetSummary.plannedExpense) }}</strong>
                </div>
              </article>
              <article class="budget-summary-card balance">
                <span class="summary-icon"><font-awesome-icon icon="scale-balanced" /></span>
                <div>
                  <small>Saldo previsto</small>
                  <strong :class="{ negative: budgetSummary.plannedBalance < 0 }">
                    {{ money(budgetSummary.plannedBalance) }}
                  </strong>
                </div>
              </article>
              <article class="budget-summary-card unplanned">
                <span class="summary-icon"><font-awesome-icon icon="money-bill" /></span>
                <div>
                  <small>Não planejado</small>
                  <strong>{{ money(budgetSummary.unplannedExpense) }}</strong>
                </div>
              </article>
            </div>

            <section class="budget-command-bar">
              <label class="budget-month-picker" title="Mês de referência">
                <font-awesome-icon icon="calendar" />
                <input type="month" v-model="selectedMonth" @change="reloadAll" />
              </label>
              <div class="budget-inline-ai">
                <div class="ai-input-wrap">
                  <font-awesome-icon icon="wand-magic-sparkles" class="ai-field-icon" />
                  <input
                    v-model="budgetAiInlinePrompt"
                    type="text"
                    placeholder='Peça à IA: ex. "Reduzir 10% em lazer"...'
                    @keyup.enter="runInlineBudgetAi"
                  />
                </div>
                <div class="ai-actions">
                  <button
                    type="button"
                    class="ai-run-btn"
                    :disabled="!canUseAi || loadingAi"
                    @click.prevent="runInlineBudgetAi"
                    title="Aplicar ajuste com IA"
                  >
                    <font-awesome-icon :icon="loadingAi ? 'circle-notch' : 'wand-magic-sparkles'" :spin="loadingAi" />
                    <span class="btn-text">Aplicar</span>
                  </button>
                  <button
                    type="button"
                    class="ai-expand-btn"
                    :disabled="!canUseAi"
                    @click.prevent="openBudgetPlanModal"
                    title="Expandir assistente de orçamento"
                  >
                    <font-awesome-icon icon="up-right-from-square" />
                    <span class="btn-text">Expandir</span>
                  </button>
                </div>
              </div>
              <button class="primary-action compact budget-save-btn" @click="saveBudgets">
                <font-awesome-icon icon="floppy-disk" />
                <span>Salvar</span>
              </button>
            </section>

            <section class="budget-panel">
              <TransitionGroup name="budget-row" tag="div" class="budget-groups">
                <section
                  v-for="group in budgets"
                  :key="group._key"
                  class="budget-group"
                  :style="budgetGroupStyle(group)"
                >
                  <header class="budget-group-header" :style="budgetGroupHeaderStyle(group)">
                    <div class="budget-group-title">
                      <font-awesome-icon icon="folder" />
                      <MacroCategoryCombo
                        v-model="group.macro_category"
                        :categories="categories"
                        :macro-categories="macroCategories"
                        @change="selectBudgetMacro(group, $event)"
                      />
                    </div>
                    <div class="budget-group-totals">
                      <div class="total-pill">
                        <small>Planejado</small>
                        <strong>{{ money(group.planned_amount || 0) }}</strong>
                      </div>
                      <div class="total-pill">
                        <small>Executado</small>
                        <strong>{{ money(group.actual_amount || 0) }}</strong>
                      </div>
                      <div class="total-pill">
                        <small>Impacto</small>
                        <strong>{{ budgetProgress(group, "planned_amount") }}%</strong>
                      </div>
                    </div>
                    <button class="icon-btn small danger" @click="removeBudgetGroup(group)" title="Remover macro categoria">
                      <font-awesome-icon icon="trash" />
                    </button>
                  </header>

                  <div class="budget-macro-plan">
                    <label class="budget-labeled-control">
                      <span>Limite planejado da macro categoria</span>
                      <input
                        class="plain-control money-control"
                        type="text"
                        inputmode="numeric"
                        :value="group.planned_amount_display"
                        @input="updateBudgetGroupAmount($event, group)"
                      />
                    </label>
                    <div class="budget-progress macro-progress">
                      <div class="progress-info">
                        <span class="progress-label">Executado / Limite planejado</span>
                        <span class="progress-values">
                          {{ money(group.actual_amount || 0) }} / {{ money(group.planned_amount || 0) }}
                          <span class="progress-percentage">({{ budgetProgress(group, 'planned_amount') }}%)</span>
                        </span>
                      </div>
                      <div class="progress-track">
                        <i
                          class="progress-fill"
                          :style="{
                            width: budgetProgress(group, 'planned_amount') + '%',
                            backgroundColor: group.macro_color || 'var(--color-info, #355afd)'
                          }"
                        ></i>
                      </div>
                    </div>
                  </div>

                  <div v-if="group.items && group.items.length > 0" class="budget-child-head">
                    <span>Subcategoria</span>
                    <span>Meta (R$)</span>
                    <span>Progresso executado</span>
                    <span></span>
                  </div>

                  <div v-else class="budget-empty-items">
                    <small>Nenhuma subcategoria vinculada a esta macro categoria.</small>
                  </div>

                  <TransitionGroup name="budget-row" tag="div" class="budget-child-list">
                    <article v-for="item in group.items" :key="item._key" class="budget-child-row">
                      <label class="budget-labeled-control item-category">
                        <span class="mobile-field-label">Subcategoria</span>
                        <CategoryCombo
                          v-model="item.category_id"
                          :categories="availableCategoriesForMacro(group, item)"
                          placeholder="Selecionar categoria"
                          @change="syncBudgetItemType(item)"
                        />
                      </label>
                      <label class="budget-labeled-control item-amount">
                        <span class="mobile-field-label">Meta (R$)</span>
                        <input
                          class="plain-control money-control"
                          type="text"
                          inputmode="numeric"
                          :value="item.amount_display"
                          @input="updateBudgetAmount($event, item)"
                        />
                      </label>
                      <div class="budget-progress item-progress">
                        <div class="progress-info">
                          <span class="mobile-field-label">Progresso</span>
                          <span class="progress-values">
                            {{ money(item.actual_amount || 0) }} / {{ money(item.amount || 0) }}
                            <span class="progress-percentage">({{ budgetProgress(item) }}%)</span>
                          </span>
                        </div>
                        <div class="progress-track">
                          <i
                            class="progress-fill"
                            :style="{
                              width: budgetProgress(item) + '%',
                              backgroundColor: group.macro_color || 'var(--color-info, #355afd)'
                            }"
                          ></i>
                        </div>
                      </div>
                      <button
                        class="icon-btn small danger item-delete-btn"
                        @click="removeBudgetItem(group, item)"
                        title="Remover categoria"
                      >
                        <font-awesome-icon icon="trash" />
                      </button>
                    </article>
                  </TransitionGroup>

                  <button class="budget-add-item-btn" @click="addBudgetItem(group)">
                    <font-awesome-icon icon="plus" />
                    <span>Adicionar à {{ group.macro_category || "macro categoria" }}</span>
                  </button>
                </section>
              </TransitionGroup>

              <button class="budget-add-macro" @click="addBudgetGroup">
                <font-awesome-icon icon="layer-group" />
                <span>Nova macro categoria</span>
              </button>
            </section>
          </template>

          <template v-else-if="tab.id === 'investments'">
            <NexoInvestmentsTab
              :summary="investmentSummary"
              :monthly-history="investmentMonthlyHistory"
              :category-distribution="investmentCategoryDistribution"
              :goals="investmentGoals"
              :events="investmentEvents"
              :categories="categories"
              :rates="investmentRates"
              :rates-loading="loadingInvestmentRates"
              :selected-month="selectedMonth"
              :format-money="money"
              :format-signed-money="signedMoney"
              :format-short-date="shortDate"
              @save-goal="saveInvestmentGoal"
              @delete-goal="requestDeleteInvestmentGoal"
              @save-event="saveInvestmentEvent"
              @delete-event="deleteInvestmentEvent"
              @refresh-rates="loadInvestmentRates"
            />
          </template>

          <template v-else-if="tab.id === 'connections'">
            <NexoConnectionsTab
              :is-paid-plan="isPaidPlan"
              :syncing-banks="syncingBanks"
              :connections="connections"
              :format-short-date="shortDate"
              @view-transactions="setActiveTab('transactions')"
              @upgrade="showPlanModal = true"
              @sync="syncConnections"
              @connect="openPluggyWidget"
              @delete="deleteConnection"
            />
          </template>

          <template v-else-if="tab.id === 'categories'">
            <NexoCategoriesTab
              v-model:category-search="categorySearch"
              :grouped-categories="groupedCategories"
              :filtered-categories="filteredCategories"
              :type-label="typeLabel"
              :category-type-label="categoryTypeLabel"
              :budget-group-style="budgetGroupStyle"
              :budget-group-header-style="budgetGroupHeaderStyle"
              @new-macro="openMacroForm"
              @new-category="handleNewCategoryRequest"
              @edit-macro="openMacroForm"
              @delete-macro="requestDeleteMacro"
              @edit-category="openCategoryForm"
              @delete-category="requestDeleteCategory"
            />
          </template>

          <template v-else-if="tab.id === 'ai'">
            <NexoAiTab
              :can-use-ai="canUseAi"
              :usage="usage"
              :month-label="monthLabel"
              :display-insights="displayInsights"
              :loading-ai="loadingAi"
              @upgrade="showPlanModal = true"
              @generate-insights="loadInsights"
            />
          </template>
        </section>
      </div>
    </div>

    <NexoTransactionModal
      :visible="showTransactionForm"
      :form="form"
      :categories="categories"
      :goal-options="goalOptions"
      :saving="savingTransaction"
      @close="closeTransactionForm"
      @save="saveTransaction"
      @update-amount="updateTransactionAmount"
      @update-field="updateTransactionFormField"
    />

    <NexoCsvPreviewModal
      :visible="showCsvPreviewModal"
      :rows="csvPreviewRows"
      :summary="csvImportSummary"
      :categories="categories"
      :goal-options="goalOptions"
      :importing-csv="importingCsv"
      :format-money="money"
      :format-date-time="shortDateTime"
      @close="showCsvPreviewModal = false"
      @update-goal="updateCsvRowGoal"
      @confirm="confirmCsvImport"
    />

    <BaseModal
      v-model="showCategoryForm"
      :title="categoryForm.id ? 'Editar categoria' : 'Nova categoria'"
      size="md"
      @close="closeCategoryForm"
    >
      <form class="nexo-form-body" @submit.prevent="saveCategoryForm">
        <div class="nexo-field static-label">
          <label for="category-name">Nome da categoria</label>
          <input id="category-name" v-model="categoryForm.name" placeholder="" required />
        </div>
        <label class="field-caption">
          <span>Macro categoria</span>
          <MacroCategoryCombo
            v-model="categoryForm.macro_category"
            :categories="categories"
            :macro-categories="macroCategories"
            @change="onCategoryMacroChange"
          />
        </label>
        <div class="form-grid">
          <div class="nexo-field static-label select-field">
            <label for="category-type">Tipo</label>
            <select v-if="isCategoryFormInvestment" id="category-type" disabled>
              <option>{{ categoryFormInvestmentFlagLabel }}</option>
            </select>
            <select v-else id="category-type" v-model="categoryForm.type" required>
              <option value="EXPENSE">Saída</option>
              <option value="INCOME">Entrada</option>
            </select>
          </div>
          <div class="nexo-field static-label color-field">
            <label for="category-macro-color">Cor da macro</label>
            <input
              id="category-macro-color"
              v-model="categoryForm.macro_color"
              type="color"
              placeholder=""
              title="Cor da macro categoria"
              @input="onCategoryMacroColorInput"
            />
          </div>
        </div>
        <small v-if="isCategoryFormInvestment" class="field-note compact">
          <font-awesome-icon icon="circle-question" class="note-icon" />
          <span>{{ categoryFormInvestmentNote }}</span>
        </small>

        <div class="category-tone-section">
          <div class="tone-section-header">
            <div class="tone-label-group">
              <span class="tone-label">Tom da subcategoria</span>
              <small class="tone-sublabel">Tons da mesma cor da macro</small>
            </div>
            <div
              class="current-tone-preview"
              :style="{ backgroundColor: currentCategoryToneColor, color: tonePreviewTextColor }"
              :title="`Tom selecionado: ${currentCategoryToneColor}`"
            >
              <font-awesome-icon :icon="categoryForm.icon || 'tag'" class="tone-preview-icon" />
              <span class="tone-preview-hex">{{ currentCategoryToneColor }}</span>
            </div>
          </div>

          <div class="tone-chips" role="radiogroup" aria-label="Tons disponíveis da macro">
            <button
              v-for="tone in categoryTones"
              :key="tone.id"
              type="button"
              class="tone-chip"
              :class="{ active: isCurrentCategoryTone(tone.hex) }"
              :style="{ backgroundColor: tone.hex }"
              :title="`${tone.label} (${tone.hex})`"
              @click="setCategoryColor(tone.hex)"
            >
              <font-awesome-icon v-if="isCurrentCategoryTone(tone.hex)" icon="check" class="tone-check-icon" />
            </button>
          </div>

          <div class="tone-slider-group">
            <div class="tone-slider-header">
              <span>Mais escuro</span>
              <span class="tone-slider-title">Ajuste fino de luminosidade</span>
              <span>Mais claro</span>
            </div>
            <input
              type="range"
              min="15"
              max="88"
              step="1"
              :value="currentToneLightness"
              class="tone-range-slider"
              :style="toneSliderTrackStyle"
              aria-label="Ajuste fino de luminosidade do tom da subcategoria"
              @input="onToneSliderChange(Number($event.target.value))"
            />
          </div>
        </div>
        <div class="icon-picker">
          <span>Ícone da categoria</span>
          <div>
            <button
              v-for="icon in categoryIcons"
              :key="icon"
              type="button"
              class="icon-choice"
              :class="{ active: categoryForm.icon === icon }"
              @click="categoryForm.icon = icon"
            >
              <font-awesome-icon :icon="icon" />
            </button>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="text-btn" @click="closeCategoryForm">Cancelar</button>
          <button type="submit" class="primary-action" :disabled="savingCategory">
            <font-awesome-icon v-if="savingCategory" icon="circle-notch" spin />
            {{ savingCategory ? "Salvando..." : "Salvar" }}
          </button>
        </div>
      </form>
    </BaseModal>

    <BaseModal
      v-model="showMacroForm"
      :title="macroForm.id ? 'Editar macro categoria' : 'Nova macro categoria'"
      size="md"
      @close="showMacroForm = false"
    >
      <form class="nexo-form-body" @submit.prevent="saveMacroForm">
        <div class="nexo-field static-label">
          <label for="macro-name">Nome da macro categoria</label>
          <input id="macro-name" v-model="macroForm.name" placeholder="" required />
        </div>
        <div class="nexo-field static-label color-field">
          <label for="macro-color">Cor da macro categoria</label>
          <input id="macro-color" v-model="macroForm.color" type="color" placeholder="" />
        </div>
        <div class="nexo-field static-label">
          <label for="macro-investment-switch">Investimentos</label>
          <div class="switch-field">
            <FormSwitch id="macro-investment-switch" v-model="macroForm.is_investment" />
            <span>Esta macro categoria representa investimentos</span>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="text-btn" @click="showMacroForm = false">Cancelar</button>
          <button type="submit" class="primary-action" :disabled="savingMacro">
            <font-awesome-icon v-if="savingMacro" icon="circle-notch" spin />
            {{ savingMacro ? "Salvando..." : "Salvar" }}
          </button>
        </div>
      </form>
    </BaseModal>

    <BaseModal
      v-model="showBudgetAiForm"
      title="Planejamento com IA"
      size="lg"
      @close="showBudgetAiForm = false"
    >
      <form class="nexo-form-body budget-ai-wrap" @submit.prevent="submitBudgetPlan">
        <div class="budget-ai-modal-header">
          <div>
            <p class="modal-help">
              Descreva o objetivo do mês. Exemplo: reduzir lazer em 10% e reservar mais para impostos.
            </p>
          </div>
          <span>{{ budgetAiContextLabel }}</span>
        </div>

        <div ref="budgetAiChat" class="budget-ai-chat custom-scrollbar">
          <article
            v-for="message in budgetAiConversation"
            :key="message.id"
            class="budget-ai-message"
            :class="message.role"
          >
            <strong>{{ message.role === "assistant" ? "IA" : "Você" }}</strong>
            <p>{{ message.content }}</p>
          </article>
          <p v-if="budgetAiConversation.length === 0" class="empty-line">
            Nenhuma interação registrada para este mês.
          </p>
        </div>

        <div class="nexo-field static-label textarea">
          <label for="budget-ai-prompt">Mensagem para o planejamento</label>
          <textarea id="budget-ai-prompt" v-model="budgetAiPrompt" placeholder="" required></textarea>
        </div>
        <div class="modal-actions">
          <button type="button" class="text-btn" @click="showBudgetAiForm = false">Cancelar</button>
          <button type="submit" class="primary-action" :disabled="loadingAi">
            <font-awesome-icon v-if="loadingAi" icon="circle-notch" spin />
            Gerar plano
          </button>
        </div>
      </form>
    </BaseModal>

    <ConfirmationModal
      v-model="confirmDelete.visible"
      message="Confirmar exclusão"
      :description="confirmDelete.message"
      confirm-text="Excluir"
      @cancelled="closeDeleteConfirm"
      @confirmed="confirmDeleteAction"
    />

    <SubscriptionModal v-model="showPlanModal" @close="showPlanModal = false" />
    <ConfirmationModal
      v-model="confirmationState.show"
      :message="confirmationState.message"
      :confirmText="confirmationState.confirmText"
      :description="confirmationState.description"
      @cancelled="confirmationState.show = false"
      @confirmed="execute_confirmation_action"
    />
  </div>
</template>

<script>
import { mapState } from "pinia";
import { useAuthStore } from "@/stores/auth";
import { useAiCreditsStore } from "@/stores/aiCredits";
import { usePlayerStore } from "@/stores/player";
import { financeService } from "@/services/financeService";
import { getPlanLimits } from "@/services/subscription_plans";
import { db, runDbOperation } from "@/db";
import BaseModal from "@/components/BaseModal.vue";
import SubscriptionModal from "@/components/SubscriptionModal.vue";
import ConfirmationModal from "@/components/ConfirmationModal.vue";
import FormSwitch from "@/components/FormSwitch.vue";
import DashboardSkeleton from "@/components/ui/DashboardSkeleton.vue";
import CategoryCombo from "./CategoryCombo.vue";
import MacroCategoryCombo from "./MacroCategoryCombo.vue";
import NexoHeader from "./nexo/NexoHeader.vue";
import NexoTabs from "./nexo/NexoTabs.vue";
import NexoOverviewTab from "./nexo/NexoOverviewTab.vue";
import NexoInvestmentsTab from "./nexo/NexoInvestmentsTab.vue";
import NexoTransactionsTab from "./nexo/NexoTransactionsTab.vue";
import NexoTransactionModal from "./nexo/NexoTransactionModal.vue";
import NexoCsvPreviewModal from "./nexo/NexoCsvPreviewModal.vue";
import NexoConnectionsTab from "./nexo/NexoConnectionsTab.vue";
import NexoCategoriesTab from "./nexo/NexoCategoriesTab.vue";
import NexoAiTab from "./nexo/NexoAiTab.vue";
import {
  clampToMacroTone,
  generateCategoryTones,
  hexToHsl,
  hslToHex,
  normalizeHex,
} from "@/utils/colorTones";

const NEXO_TAB_STORAGE_KEY = "kadem_nexo";

const INVESTMENT_FLOW = {
  IN: "INVESTMENT_IN",
  OUT: "INVESTMENT_OUT",
};

const pluggyWidgetUrl = "https://cdn.pluggy.ai/pluggy-connect/latest/pluggy-connect.js";
const includePluggySandbox =
  import.meta.env.VITE_PLUGGY_INCLUDE_SANDBOX === "true" ||
  (!import.meta.env.PROD && import.meta.env.VITE_PLUGGY_INCLUDE_SANDBOX !== "false");

export default {
  name: "KademNexo",
  components: {
    BaseModal,
    SubscriptionModal,
    ConfirmationModal,
    FormSwitch,
    DashboardSkeleton,
    CategoryCombo,
    MacroCategoryCombo,
    NexoHeader,
    NexoTabs,
    NexoOverviewTab,
    NexoInvestmentsTab,
    NexoTransactionsTab,
    NexoTransactionModal,
    NexoCsvPreviewModal,
    NexoConnectionsTab,
    NexoCategoriesTab,
    NexoAiTab,
  },
  data() {
    const today = new Date().toISOString().slice(0, 10);
    const tabs = [
      { id: "overview", label: "Visão", icon: "chart-simple" },
      { id: "transactions", label: "Movimentos", icon: "list" },
      { id: "budget", label: "Orçamento", icon: "clipboard" },
      { id: "investments", label: "Investimentos", icon: "money-bill" },
      { id: "connections", label: "Conexões", icon: "link" },
      { id: "categories", label: "Categorias", icon: "layer-group" },
      { id: "ai", label: "IA", icon: "crown", pro: true },
    ];
    // Reabre na aba em que o usuario estava antes do F5.
    const savedTab = usePlayerStore().active_app_tabs?.[NEXO_TAB_STORAGE_KEY];
    return {
      activeTab: tabs.some((tab) => tab.id === savedTab) ? savedTab : "overview",
      selectedMonth: new Date().toISOString().slice(0, 7),
      loading: false,
      hasLoadedOnce: false,
      syncingBanks: false,
      loadingAi: false,
      importingCsv: false,
      loadingSchema: false,
      showTransactionForm: false,
      savingTransaction: false,
      savingCategory: false,
      savingMacro: false,
      showCategoryForm: false,
      showMacroForm: false,
      showBudgetAiForm: false,
      showPlanModal: false,
      totals: { income: 0, expense: 0, balance: 0 },
      transactions: [],
      recentTransactions: [],
      categories: [],
      macroCategories: [],
      categorySearch: "",
      transactionSearch: "",
      transactionCategoryFilter: "",
      pendingCategorySelection: null,
      budgets: [],
      connections: [],
      macroDistribution: [],
      investmentSummary: {
        month_invested: 0,
        month_withdrawn: 0,
        month_net: 0,
        total_invested: 0,
        total_yield: 0,
        total_withdrawn: 0,
        total_adjustments: 0,
        estimated_balance: 0,
      },
      investmentMonthlyHistory: [],
      investmentCategoryDistribution: [],
      investmentGoals: [],
      investmentEvents: [],
      investmentsRequestId: 0,
      investmentRates: [],
      loadingInvestmentRates: false,
      usage: {},
      insights: [],
      budgetAiPrompt: "",
      budgetAiInlinePrompt: "",
      budgetAiConversation: [],
      budgetAiContextSummary: "",
      categoryForm: {
        id: null,
        name: "",
        macro_category: "Geral",
        macro_color: "#999999",
        color: "#999999",
        investment_flow_type: null,
        type: "EXPENSE",
        icon: "tag",
      },
      macroForm: {
        id: null,
        original_id: null,
        name: "",
        color: "#999999",
        is_investment: false,
      },
      confirmDelete: {
        visible: false,
        type: null,
        payload: null,
        message: "",
      },
      confirmationState: {
        show: false,
        message: "",
        confirmText: "Confirmar",
        description: "",
        action: null,
      },
      categoryIcons: [
        "tag",
        "basket-shopping",
        "house",
        "car",
        "briefcase",
        "money-bill",
        "screwdriver-wrench",
        "utensils",
        "heart-pulse",
        "graduation-cap",
        "plane",
        "receipt",
      ],
      form: {
        id: null,
        type: "EXPENSE",
        description: "",
        observation: "",
        amount: 0,
        amount_display: "",
        category_id: null,
        goal_id: null,
        original_goal_id: null,
        transaction_date: today,
      },
      csvImportError: "",
      csvImportFileName: "",
      csvRawRows: [],
      csvPreviewRows: [],
      csvImportRows: [],
      csvSkippedRows: 0,
      showCsvPreviewModal: false,
      categorizingAi: false,
      categorizingIds: [],
      tabs,
    };
  },
  computed: {
    ...mapState(useAuthStore, ["user"]),
    activeTabIndex() {
      return Math.max(
        0,
        this.tabs.findIndex((tab) => tab.id === this.activeTab),
      );
    },
    // So a primeira carga troca a tela por esqueleto; trocar de mes ou recarregar mantem o conteudo visivel.
    // `loading` so vira true no mounted, entao ele sozinho deixaria o primeiro frame mostrar os valores zerados.
    initialLoading() {
      return !this.hasLoadedOnce;
    },
    trackStyle() {
      const step = 100 / this.tabs.length;
      return {
        width: `${this.tabs.length * 100}%`,
        transform: `translateX(-${this.activeTabIndex * step}%)`,
      };
    },
    paneStyle() {
      const size = `${100 / this.tabs.length}%`;
      return {
        width: size,
        flexBasis: size,
        flexShrink: 0,
        maxWidth: size,
      };
    },
    categoryTargetMacro() {
      return this.findMacroByName(this.categoryForm.macro_category);
    },
    isCategoryFormInvestment() {
      return Boolean(this.categoryTargetMacro?.is_investment);
    },
    // Metas no formato que o CategoryCombo (combo personalizado do Nexo) entende.
    goalOptions() {
      const horizons = { SHORT: "Curto prazo", MEDIUM: "Médio prazo", LONG: "Longo prazo" };
      return this.investmentGoals.map((goal) => ({
        id: goal.id,
        name: goal.name,
        macro_category: horizons[goal.horizon] || "",
        color: goal.color || "#355AFD",
        icon: "clipboard",
      }));
    },
    categoryFormIsInvestmentOut() {
      return this.categoryForm.investment_flow_type === INVESTMENT_FLOW.OUT;
    },
    categoryFormInvestmentFlagLabel() {
      return this.categoryFormIsInvestmentOut ? "Saída (resgate)" : "Entrada (aporte)";
    },
    categoryFormInvestmentNote() {
      const name = String(this.categoryForm.name || "").trim() || "nome da categoria";
      if (this.categoryFormIsInvestmentOut) {
        return "Esta é a categoria de saída (resgate) criada junto com a categoria de entrada correspondente.";
      }
      const twin = `${name} (Saída)`;
      return this.categoryForm.id
        ? `A categoria "${twin}" acompanha o nome e o ícone desta categoria.`
        : `Categorias de investimento são de entrada (aporte). Ao salvar, criamos também "${twin}" para os resgates.`;
    },
    currentCategoryToneColor() {
      const macroColor = this.categoryForm?.macro_color || this.categoryTargetMacro?.color || "#999999";
      if (!this.categoryForm?.color) {
        return macroColor;
      }
      return clampToMacroTone(this.categoryForm.color, macroColor);
    },
    categoryTones() {
      const macroColor = this.categoryForm?.macro_color || this.categoryTargetMacro?.color || "#999999";
      return generateCategoryTones(macroColor);
    },
    currentToneLightness() {
      const hex = this.currentCategoryToneColor;
      const hsl = hexToHsl(hex);
      return hsl.l;
    },
    tonePreviewTextColor() {
      return this.currentToneLightness > 65 ? "#1e293b" : "#ffffff";
    },
    toneSliderTrackStyle() {
      const macroColor = normalizeHex(this.categoryForm?.macro_color || this.categoryTargetMacro?.color || "#999999");
      const hsl = hexToHsl(macroColor);
      if (hsl.s < 12) {
        return {
          background: "linear-gradient(to right, #1e293b, #64748b, #cbd5e1, #f8fafc)",
        };
      }
      const s = Math.max(25, hsl.s);
      const dark = hslToHex(hsl.h, s, 18);
      const mid = hslToHex(hsl.h, s, 50);
      const light = hslToHex(hsl.h, Math.min(s, 70), 86);
      return {
        background: `linear-gradient(to right, ${dark}, ${mid}, ${light})`,
      };
    },
    limits() {
      return getPlanLimits(this.user?.plan_tier || "free");
    },
    isPaidPlan() {
      return Boolean(this.user?.plan_tier && this.user.plan_tier !== "free");
    },
    canUseAi() {
      return this.isPaidPlan && Number(this.limits?.finance_ai_monthly_credits || this.limits?.ai_monthly_credits || 0) > 0;
    },
    planLabel() {
      const labels = { free: "Free", pro: "Pro", enterprise: "Enterprise" };
      return labels[this.user?.plan_tier] || "Free";
    },
    aiUsageLabel() {
      if (!this.canUseAi) return "IA bloqueada";
      const remaining = this.usage.remaining_credits ?? this.limits?.finance_ai_monthly_credits ?? 0;
      return `${remaining} créditos IA`;
    },
    budgetAiContextLabel() {
      const total = this.budgetAiConversation.length;
      if (!total) return "Sem histórico";
      return `${total} ${total === 1 ? "interação" : "interações"} neste mês`;
    },
    monthLabel() {
      const [year, month] = this.selectedMonth.split("-").map(Number);
      return new Date(year, month - 1, 1).toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      });
    },
    budgetSummary() {
      const summary = this.budgets.reduce(
        (acc, group) => {
          (group.items || []).forEach((item) => {
            const category = this.findCategory(item.category_id);
            const amount = Number(item.amount || 0);
            if ((category?.type || item.type) === "INCOME") acc.plannedIncome += amount;
            else acc.plannedExpense += amount;
          });
          return acc;
        },
        { plannedIncome: 0, plannedExpense: 0 },
      );

      const plannedBalance = summary.plannedIncome - summary.plannedExpense;
      const unplannedExpense = Math.max(0, Number(this.totals.expense || 0) - summary.plannedExpense);

      return {
        ...summary,
        plannedBalance,
        unplannedExpense,
      };
    },
    csvImportTotals() {
      if (!Array.isArray(this.csvImportRows)) return { income: 0, expense: 0 };
      return this.csvImportRows.reduce(
        (acc, row) => {
          if (!row) return acc;
          const amount = Number(row.amount || 0);
          if (row.type === "INCOME") acc.income += amount;
          else acc.expense += amount;
          return acc;
        },
        { income: 0, expense: 0 },
      );
    },
    csvImportSummary() {
      const rows = Array.isArray(this.csvPreviewRows) ? this.csvPreviewRows : [];
      const summary = {
        total: rows.length,
        ready: 0,
        duplicates: 0,
        duplicateExact: 0,
        duplicateLegacy: 0,
        duplicateLegacyConflict: 0,
        duplicateFile: 0,
        skipped: Number(this.csvSkippedRows || 0),
        months: [],
        importMonths: [],
        outsideSelectedMonth: 0,
        selectedMonthLabel: this.monthLabelFromKey(this.selectedMonth, "long"),
      };
      const monthsMap = new Map();
      const importMonthsMap = new Map();

      rows.forEach((row) => {
        if (!row) return;

        if (row.csv_status === "new") summary.ready += 1;
        else summary.duplicates += 1;

        if (row.csv_status === "duplicate_exact") summary.duplicateExact += 1;
        if (row.csv_status === "duplicate_legacy") summary.duplicateLegacy += 1;
        if (row.csv_status === "duplicate_legacy_conflict") summary.duplicateLegacyConflict += 1;
        if (row.csv_status === "duplicate_file") summary.duplicateFile += 1;

        const monthKey = String(row.transaction_date || "").slice(0, 7);
        if (!monthKey) return;
        monthsMap.set(monthKey, (monthsMap.get(monthKey) || 0) + 1);
        if (row.csv_status === "new") {
          importMonthsMap.set(monthKey, (importMonthsMap.get(monthKey) || 0) + 1);
          if (monthKey !== this.selectedMonth) summary.outsideSelectedMonth += 1;
        }
      });

      summary.months = [...monthsMap.entries()]
        .sort((left, right) => right[0].localeCompare(left[0]))
        .map(([key, count]) => ({
          key,
          count,
          label: this.monthLabelFromKey(key),
          is_selected: key === this.selectedMonth,
        }));

      summary.importMonths = [...importMonthsMap.entries()]
        .sort((left, right) => right[0].localeCompare(left[0]))
        .map(([key, count]) => ({ key, count, label: this.monthLabelFromKey(key, "long") }));

      return summary;
    },
    transactionPaginationResetKey() {
      return [this.selectedMonth, this.transactionSearch, this.transactionCategoryFilter].join("|");
    },
    filteredTransactions() {
      const normalizedSearch = this.normalize(this.transactionSearch);

      return this.transactions
        .filter((transaction) => {
          return (
            this.matchesTransactionCategoryFilter(transaction) &&
            this.matchesTransactionSearch(transaction, normalizedSearch)
          );
        })
        .map((transaction) =>
          transaction.goal_id
            ? { ...transaction, goal_name: this.goalName(transaction.goal_id) || transaction.goal_name }
            : transaction,
        );
    },
    filteredCategories() {
      const term = this.normalize(this.categorySearch);
      if (!term) return this.categories;
      return this.categories.filter((category) =>
        this.normalize(`${category.name} ${category.macro_category} ${this.typeLabel(category.type)}`).includes(term),
      );
    },
    groupedCategories() {
      const groups = new Map();
      this.macroCategories.forEach((macro) => {
        groups.set(macro?.name, { ...macro, items: [] });
      });

      this.filteredCategories.forEach((category) => {
        const canonicalMacro = this.macroCategories.find(
          (macro) => this.sameId(macro.id, category.macro_category_id),
        ) || this.macroCategories.find(
          (macro) => this.sameId(macro.local_key, category.macro_category_id),
        ) || this.macroCategories.find(
          (macro) => this.normalize(macro?.name) === this.normalize(category.macro_category),
        );
        const macroName = canonicalMacro?.name || category.macro_category || "Geral";
        if (!groups.has(macroName)) {
          groups.set(macroName, {
            ...canonicalMacro,
            id: canonicalMacro?.id || category.macro_category_id || null,
            name: macroName,
            color: canonicalMacro?.color || category.macro_color || category.color || "#999999",
            is_investment: Boolean(canonicalMacro?.is_investment ?? category.is_investment),
            items: [],
          });
        }
        groups.get(macroName).items.push({
          ...category,
          macro_category: macroName,
          macro_category_id: canonicalMacro?.id || category.macro_category_id,
          macro_color: canonicalMacro?.color || category.macro_color,
          color: category.color || canonicalMacro?.color || "#999999",
          is_investment: Boolean(canonicalMacro?.is_investment ?? category.is_investment),
        });
      });

      return [...groups.values()]
        .map((group) => ({
          ...group,
          items: group.items.slice().sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
        }))
        .filter((group) => group.items.length > 0 || !this.categorySearch)
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    },
    displayInsights() {
      return this.insights.map((insight) => {
        const title = insight.title || "Insight";
        const description = insight.description || (typeof insight === "string" ? insight : "");
        const normalizedTitle = this.normalize(title);
        const normalizedDescription = this.normalize(description);

        if (normalizedTitle.includes("sem transacoes") && normalizedDescription.includes("nao ha registros")) {
          return { title: "Movimentação do mês", description };
        }

        if (normalizedTitle && normalizedTitle === normalizedDescription) {
          return { title, description: "" };
        }

        return { title, description };
      });
    },
  },
  methods: {
    normalize(value) {
      return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
    },
    sameId(left, right) {
      return String(left || "") === String(right || "");
    },
    setActiveTab(tabId) {
      this.activeTab = tabId;
      this.$nextTick(() => {
        if (this.$refs.tabViewport) {
          this.$refs.tabViewport.scrollLeft = 0;
        }
      });
      if (tabId === "transactions") {
        this.loadTransactions();
      }
      if (tabId === "investments") {
        this.loadInvestments();
        this.loadInvestmentRates();
      }
    },
    handleViewportScroll() {
      if (this.$refs.tabViewport && this.$refs.tabViewport.scrollLeft !== 0) {
        this.$refs.tabViewport.scrollLeft = 0;
      }
    },
    money(value) {
      try {
        const num = Number(value || 0);
        return (Number.isFinite(num) ? num : 0).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        });
      } catch {
        return "R$ 0,00";
      }
    },
    parseMoneyInput(rawValue) {
      const digits = String(rawValue || "").replace(/\D/g, "");
      return Number(digits || 0) / 100;
    },
    moneyInput(value) {
      return this.money(value || 0);
    },
    parseDisplayDate(value) {
      if (!value) return null;
      if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

      const raw = String(value || "").trim();
      if (!raw) return null;

      let candidate = raw;
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        candidate = `${raw}T00:00:00`;
      } else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(raw)) {
        candidate = raw.replace(" ", "T");
      }

      const parsed = new Date(candidate);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    },
    calendarDateParts(value) {
      const raw = String(value || "").trim();
      const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/);
      if (match) {
        return {
          day: match[3],
          month: match[2],
          time: match[4] ? `${match[4]}:${match[5]}` : "",
        };
      }

      const date = this.parseDisplayDate(value);
      if (!date) return null;
      return {
        day: String(date.getDate()).padStart(2, "0"),
        month: String(date.getMonth() + 1).padStart(2, "0"),
        time: `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`,
      };
    },
    signedMoney(transaction) {
      const prefix = transaction.type === "EXPENSE" ? "-" : "+";
      return `${prefix} ${this.money(transaction.amount)}`;
    },
    shortDate(value) {
      if (!value) return "--";
      try {
        const parts = this.calendarDateParts(value);
        return parts ? `${parts.day}/${parts.month}` : "--";
      } catch {
        return "--";
      }
    },
    shortDateTime(value) {
      if (!value) return "--";
      try {
        const parts = this.calendarDateParts(value);
        if (!parts) return "--";

        const date = `${parts.day}/${parts.month}`;
        return parts.time && parts.time !== "00:00" ? `${date} ${parts.time}` : date;
      } catch {
        return "--";
      }
    },
    monthLabelFromKey(monthKey, monthFormat = "short") {
      const [year, month] = String(monthKey || "")
        .split("-")
        .map(Number);
      if (!year || !month) return monthKey || "--";
      return new Date(year, month - 1, 1).toLocaleDateString("pt-BR", {
        month: monthFormat,
        year: "numeric",
      });
    },
    typeLabel(type) {
      const labels = { EXPENSE: "Saída", INCOME: "Entrada" };
      return labels[type] || "Não definido";
    },
    budgetProgress(budget, plannedKey = "amount") {
      const planned = Number(budget[plannedKey] || 0);
      if (!planned) return 0;
      return Math.min(100, Math.round((Number(budget.actual_amount || 0) / planned) * 100));
    },
    budgetGroupStyle(group) {
      return {
        "--budget-macro-color": group.macro_color || "#999999",
        "--budget-macro-soft": this.hexToRgba(group.macro_color || "#999999", 0.13),
        "--budget-macro-border": this.hexToRgba(group.macro_color || "#999999", 0.28),
      };
    },
    budgetGroupHeaderStyle(group) {
      return {
        background: this.hexToRgba(group.macro_color || "#999999", 0.12),
        borderColor: this.hexToRgba(group.macro_color || "#999999", 0.22),
      };
    },
    hexToRgba(hex, alpha = 1) {
      const normalized = String(hex || "#999999").replace("#", "");
      const safe =
        normalized.length === 3
          ? normalized
              .split("")
              .map((char) => char + char)
              .join("")
          : normalized.padEnd(6, "9").slice(0, 6);
      const value = Number.parseInt(safe, 16);
      const r = (value >> 16) & 255;
      const g = (value >> 8) & 255;
      const b = value & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    },
    budgetAiStorageKey() {
      return `kadem:nexo:budget-ai:${this.user.id || "local"}:${this.selectedMonth}`;
    },
    loadBudgetAiConversation() {
      try {
        const raw = localStorage.getItem(this.budgetAiStorageKey());
        const parsed = raw ? JSON.parse(raw) : {};
        this.budgetAiConversation = Array.isArray(parsed.messages) ? parsed.messages : [];
        this.budgetAiContextSummary = parsed.summary || "";
      } catch {
        this.budgetAiConversation = [];
        this.budgetAiContextSummary = "";
      }
    },
    saveBudgetAiConversation() {
      const messages = this.budgetAiConversation.slice(-12);
      this.budgetAiConversation = messages;
      this.budgetAiContextSummary = messages
        .slice(-6)
        .map((message) => `${message.role === "assistant" ? "IA" : "Você"}: ${message.content}`)
        .join("\n");
      localStorage.setItem(
        this.budgetAiStorageKey(),
        JSON.stringify({ messages, summary: this.budgetAiContextSummary }),
      );
    },
    appendBudgetAiMessage(role, content) {
      this.budgetAiConversation.push({
        id: `${Date.now()}-${Math.random()}`,
        role,
        content,
        created_at: new Date().toISOString(),
      });
      this.saveBudgetAiConversation();
      this.scrollToBottomOfChat();
    },
    async reloadAll() {
      this.loading = true;
      try {
        await Promise.all([
          this.loadDashboard(),
          this.loadTransactions(),
          this.loadMacroCategories(),
          this.loadCategories(),
          this.loadBudgets(),
          this.loadInvestments(),
          this.loadInvestmentRates(),
          this.loadConnections(),
          this.loadUsage(),
        ]);
        this.loadBudgetAiConversation();
      } finally {
        this.loading = false;
        this.hasLoadedOnce = true;
      }
    },
    async loadDashboard() {
      const { data } = await financeService.getDashboard({ month: this.selectedMonth });
      this.totals = data.totals || { income: 0, expense: 0, balance: 0 };
      this.recentTransactions = data.transactions || data.recent_transactions || [];
      this.macroDistribution = data.macro_distribution || [];
      this.investmentSummary = {
        ...this.investmentSummary,
        ...data.investment_summary,
      };
    },
    async loadTransactions() {
      const { data } = await financeService.listTransactions({
        month: this.selectedMonth,
        limit: 1000,
      });
      this.transactions = data || [];
    },
    async loadCategories() {
      const { data } = await financeService.getCategories();
      this.categories = data || [];
    },
    async loadMacroCategories() {
      const { data } = await financeService.getMacroCategories();
      this.macroCategories = data || [];
    },
    async loadInvestments() {
      const requestId = (this.investmentsRequestId = (this.investmentsRequestId || 0) + 1);
      const { data } = await financeService.getInvestments({ month: this.selectedMonth });
      if (requestId !== this.investmentsRequestId) return;
      this.investmentSummary = data.summary || {
        month_invested: 0,
        month_withdrawn: 0,
        month_net: 0,
        total_invested: 0,
        total_yield: 0,
        total_withdrawn: 0,
        total_adjustments: 0,
        estimated_balance: 0,
      };
      this.investmentMonthlyHistory = data.monthly_history || [];
      this.investmentCategoryDistribution = data.category_distribution || [];
      this.investmentGoals = data.goals || [];
      this.investmentEvents = data.events || [];
    },
    async loadInvestmentRates() {
      this.loadingInvestmentRates = true;
      try {
        const { data } = await financeService.getInvestmentRates();
        this.investmentRates = data.rates || [];
      } finally {
        this.loadingInvestmentRates = false;
      }
    },
    async loadBudgets() {
      const { data } = await financeService.getBudgets({ month: this.selectedMonth });
      this.budgets = (data || []).map((group) => this.hydrateBudgetGroup(group));
    },
    hydrateBudgetGroup(group) {
      return {
        ...group,
        _key: group._key || group.macro_category_id || `macro-${Date.now()}-${Math.random()}`,
        macro_category_id: group.macro_category_id || null,
        macro_category: group.macro_category || "Geral",
        macro_color: group.macro_color || "#999999",
        planned_amount: Number(group.planned_amount || 0),
        planned_amount_display: this.moneyInput(group.planned_amount || 0),
        actual_amount: Number(group.actual_amount || 0),
        items: (group.items || []).map((item) => this.hydrateBudgetItem(item)),
      };
    },
    hydrateBudgetItem(item) {
      const category = this.findCategory(item.category_id);
      return {
        ...item,
        _key: item._key || item.id || `item-${Date.now()}-${Math.random()}`,
        amount: Number(item.amount || 0),
        amount_display: this.moneyInput(item.amount || 0),
        actual_amount: Number(item.actual_amount || 0),
        type: item.type || category?.type || "EXPENSE",
      };
    },
    async loadConnections() {
      if (!this.isPaidPlan) return;
      const { data } = await financeService.getConnections();
      this.connections = data || [];
    },
    async loadUsage() {
      if (!this.canUseAi) {
        this.usage = {};
        return;
      }
      const usage = await useAiCreditsStore().fetchUsage(true);
      this.usage = usage || {};
    },
    async refreshTransactionDrivenViews({ includeTransactions = true } = {}) {
      const loaders = [this.loadDashboard(), this.loadBudgets(), this.loadInvestments()];
      if (includeTransactions) {
        loaders.push(this.loadTransactions());
      }
      await Promise.all(loaders);
    },
    openTransactionForm(transaction = null) {
      if (transaction && typeof transaction.preventDefault === "function") {
        transaction = null;
      }

      const currentTransaction = transaction || {};
      const amount = Number(currentTransaction.amount || 0);
      const type = currentTransaction.type === "INCOME" ? "INCOME" : "EXPENSE";

      this.form = {
        id: currentTransaction.id || currentTransaction.local_id || null,
        type,
        description: currentTransaction.description || "",
        observation: currentTransaction.observation || "",
        amount,
        amount_display: transaction ? this.moneyInput(amount) : "",
        category_id: currentTransaction.category_id || null,
        goal_id: currentTransaction.goal_id || null,
        // lembra se ja tinha meta: so assim a edicao sabe que precisa mandar goal_id: null para desvincular
        original_goal_id: currentTransaction.goal_id || null,
        transaction_date: String(currentTransaction.transaction_date || new Date().toISOString().slice(0, 10)).slice(
          0,
          10,
        ),
      };
      this.showTransactionForm = true;
    },
    closeTransactionForm() {
      this.showTransactionForm = false;
    },
    isInvestmentCategory(category) {
      return [INVESTMENT_FLOW.IN, INVESTMENT_FLOW.OUT].includes(category?.investment_flow_type);
    },
    goalName(goalId) {
      if (!goalId) return "";
      const goal = this.investmentGoals.find(
        (item) => this.sameId(item.id, goalId) || this.sameId(item.local_key, goalId),
      );
      return goal?.name || "";
    },
    updateTransactionFormField({ field, value }) {
      this.form[field] = value;
      // categoria comum nao carrega meta
      if (field === "category_id" && !this.isInvestmentCategory(this.findCategory(value))) {
        this.form.goal_id = null;
      }
    },
    updateTransactionAmount(event) {
      const value = this.parseMoneyInput(event.target.value);
      this.form.amount = value;
      this.form.amount_display = this.moneyInput(value);
      event.target.value = this.form.amount_display;
    },
    async saveTransaction() {
      // O envio ao servidor pode demorar; sem esta trava um segundo clique em "Salvar" criava o lancamento de novo.
      if (this.savingTransaction) return;
      this.savingTransaction = true;

      const { goal_id: formGoalId, original_goal_id: originalGoalId, ...formFields } = this.form;
      const payload = {
        ...formFields,
        observation: this.form.observation || null,
        amount: Number(this.form.amount || 0),
      };
      // goal_id so viaja quando ha meta (ou quando uma meta existente foi removida): assim um lancamento
      // sem meta continua com o mesmo payload de antes.
      const goalId = this.isInvestmentCategory(this.findCategory(payload.category_id)) ? formGoalId : null;
      if (goalId) payload.goal_id = goalId;
      else if (this.form.id && originalGoalId) payload.goal_id = null;
      let result;
      try {
        // O lancamento ja esta salvo localmente quando esta chamada volta; o modal fecha nesse ponto e o
        // envio ao servidor segue em segundo plano (`result.synced`).
        result = this.form.id
          ? await financeService.updateTransaction(this.form.id, payload, { waitForSync: false })
          : await financeService.createTransaction(payload, { waitForSync: false });
        if (result.data) this.upsertTransactionInList(result.data);
        this.closeTransactionForm();
      } finally {
        this.savingTransaction = false;
      }
      await result.synced;
      await this.refreshTransactionDrivenViews();
    },
    // A linha da previa e a de importacao sao o mesmo objeto (filterCsvDuplicates), mas atualizamos as
    // duas listas explicitamente para nao depender disso.
    updateCsvRowGoal({ line, goalId }) {
      [this.csvPreviewRows, this.csvImportRows].forEach((rows) => {
        const row = rows.find((item) => item.csv_line_number === line);
        if (row) row.goal_id = goalId || null;
      });
    },
    resetCsvImport() {
      this.csvImportError = "";
      this.csvImportFileName = "";
      this.csvRawRows = [];
      this.csvPreviewRows = [];
      this.csvImportRows = [];
      this.csvSkippedRows = 0;
      this.showCsvPreviewModal = false;
      this.loadingSchema = false;
    },
    async loadLocalTransactionsForMemory() {
      return runDbOperation(() => db.finance_transactions.toArray(), {
        userMessage:
          "O armazenamento local esta inconsistente. Redefina o armazenamento local para baixar uma copia nova dos seus dados.",
      });
    },
    async handleCsvFileChange(event) {
      if (!this.isPaidPlan) {
        this.showPlanModal = true;
        return;
      }
      const [file] = event.target.files || [];
      if (!file) return;
      this.csvImportError = "";
      this.csvImportFileName = file.name;
      this.csvRawRows = [];
      this.csvPreviewRows = [];
      this.csvImportRows = [];
      this.showCsvPreviewModal = false;
      this.loadingSchema = true;

      try {
        const text = await file.text();
        const clean = String(text || "")
          .replace(/^\uFEFF/, "")
          .trim();
        const delimiter = this.detectCsvDelimiter(clean);
        const parsedRows = this.parseCsvDocument(clean, delimiter);
        const normalizedRows = this.normalizeParsedCsvRows(parsedRows, delimiter);
        const meaningfulRows = normalizedRows.filter((row) => row.some((cell) => String(cell || "").trim()));
        if (meaningfulRows.length < 2) {
          throw new Error("O CSV precisa ter cabeçalho e pelo menos uma linha.");
        }

        const header = meaningfulRows[0].map((cell) => this.cleanCsvCell(cell));
        const samples = meaningfulRows.slice(1, 4).map((row) => row.map((cell) => this.cleanCsvCell(cell)));

        // Check local storage cache for this header to save credits and ensure determinism
        const cacheKey = `kadem:nexo:csv-schema:${header.map((cell) => this.normalizeKey(cell)).join("|")}`;
        let schema = null;
        schema = this.resolveKnownCsvSchema(header);
        if (!schema) {
          try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
              schema = JSON.parse(cached);
              console.log("[CSV Import] Reusing cached schema:", schema);
            }
          } catch (err) {
            console.warn("[CSV Import] Failed to read cached schema:", err);
          }
        }

        if (!schema) {
          // Send to backend for schema analysis
          try {
            const response = await financeService.analyzeCsvSchema({ header, samples });
            schema = response.data;
          } finally {
            // O backend registra o consumo antes da análise, inclusive se o provedor falhar.
            await this.loadUsage();
          }
          if (!schema || !schema.dateColumn || !schema.descriptionColumn || !schema.amountColumn) {
            throw new Error("A IA não conseguiu determinar o esquema de colunas deste CSV.");
          }
          // Save to cache
          try {
            localStorage.setItem(cacheKey, JSON.stringify(schema));
            console.log("[CSV Import] Cached new schema:", schema);
          } catch (err) {
            console.warn("[CSV Import] Failed to cache schema:", err);
          }
        }

        this.csvRawRows = meaningfulRows;
        await this.parseCsvWithSchemaEnhanced(meaningfulRows, schema);
      } catch (error) {
        this.csvPreviewRows = [];
        this.csvImportRows = [];
        this.csvImportError = error?.response?.data?.message || error.message || "Não foi possível processar o CSV.";
      } finally {
        this.loadingSchema = false;
      }
    },
    cleanCsvCell(val) {
      if (typeof val !== "string") return "";
      let clean = val.trim();
      // Remove enclosing quotes
      while ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
        clean = clean.substring(1, clean.length - 1).trim();
      }
      // Remove any leftover outer quotes or weird trailing quotes
      clean = clean.replace(/^['"]|['"]$/g, "").trim();
      return clean;
    },
    normalizeKey(key) {
      return String(key || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .trim();
    },
    findColumnIndex(headers, columnName, fallbackPatterns) {
      if (!columnName) {
        for (const pattern of fallbackPatterns) {
          const normPattern = this.normalizeKey(pattern);
          const idx = headers.findIndex((h) => this.normalizeKey(h).includes(normPattern));
          if (idx !== -1) return idx;
        }
        return -1;
      }

      const normTarget = this.normalizeKey(columnName);

      // 1. Exact match
      let idx = headers.findIndex((h) => this.normalizeKey(h) === normTarget);
      if (idx !== -1) return idx;

      // 2. Substring match
      idx = headers.findIndex((h) => {
        const normH = this.normalizeKey(h);
        return normH.includes(normTarget) || normTarget.includes(normH);
      });
      if (idx !== -1) return idx;

      // 3. Fallback keywords match
      for (const pattern of fallbackPatterns) {
        const normPattern = this.normalizeKey(pattern);
        idx = headers.findIndex((h) => this.normalizeKey(h).includes(normPattern));
        if (idx !== -1) return idx;
      }

      return -1;
    },
    resolveKnownCsvSchema(headers = []) {
      const normalizedHeaders = headers.map((header) => this.normalizeKey(header));
      const required = ["data", "hora", "tipo", "origemdestino", "valor"];
      const hasKnownShape = required.every((item) => normalizedHeaders.includes(item));
      if (!hasKnownShape) return null;

      const resolveColumn = (normalizedKey) =>
        headers.find((header) => this.normalizeKey(header) === normalizedKey) || normalizedKey;

      return {
        dateColumn: resolveColumn("data"),
        timeColumn: resolveColumn("hora"),
        typeColumn: resolveColumn("tipo"),
        descriptionColumn: resolveColumn("origemdestino"),
        amountColumn: resolveColumn("valor"),
        observationColumn: resolveColumn("formadepagamento"),
        incomePatterns: ["recebido", "resgatado", "estorno", "deposito", "credito"],
        expensePatterns: ["enviado", "guardado", "pagamento", "compra", "debito", "tarifa"],
        defaultPositiveType: "INCOME",
      };
    },
    async parseCsvWithSchema(parsedRows, schema, fallbackDelimiter = null) {
      const delimiter = schema.delimiter || fallbackDelimiter || ",";
      const rawHeaders = (parsedRows[0] || []).map((header) => this.cleanCsvCell(header));

      // Find indices of columns
      const dateIdx = this.findColumnIndex(rawHeaders, schema.dateColumn, [
        "data",
        "date",
        "dia",
        "periodo",
        "lançamento",
      ]);
      const descIdx = this.findColumnIndex(rawHeaders, schema.descriptionColumn, [
        "descricao",
        "description",
        "historico",
        "origem",
        "destino",
        "estabelecimento",
        "detalhe",
        "nome",
        "texto",
      ]);
      const amountIdx = this.findColumnIndex(rawHeaders, schema.amountColumn, [
        "valor",
        "amount",
        "quantia",
        "monto",
        "total",
        "saldo",
        "pago",
      ]);
      const typeIdx = schema.typeColumn
        ? this.findColumnIndex(rawHeaders, schema.typeColumn, ["tipo", "type", "categoria", "operacao", "movimento"])
        : -1;

      if (dateIdx === -1 || descIdx === -1 || amountIdx === -1) {
        throw new Error("Não foi possível mapear as colunas essenciais do CSV com o esquema detectado.");
      }

      // Build local history category memory on the fly
      const localTxs = await this.loadLocalTransactionsForMemory();
      const normalizeDesc = (desc) => {
        return String(desc || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      };
      const freqMap = {};
      for (const tx of localTxs) {
        if (tx.category_id && !tx.is_ignored) {
          const norm = normalizeDesc(tx.description);
          if (norm) {
            if (!freqMap[norm]) freqMap[norm] = {};
            const cid = String(tx.category_id);
            freqMap[norm][cid] = (freqMap[norm][cid] || 0) + 1;
          }
        }
      }
      const descriptionMemory = {};
      for (const norm in freqMap) {
        let maxCount = 0;
        let bestId = null;
        for (const cid in freqMap[norm]) {
          if (freqMap[norm][cid] > maxCount) {
            maxCount = freqMap[norm][cid];
            bestId = cid;
          }
        }
        if (bestId) {
          descriptionMemory[norm] = bestId;
        }
      }

      const rows = [];
      let skipped = 0;

      const normFn = this.normalize;
      // Standard keywords for Brazilian Portuguese banking to guarantee determinism
      const stdIncome = ["recebido", "resgatado", "credito", "entrada", "estorno", "rendimento", "deposito", "salario"];
      const stdExpense = ["pago", "enviado", "compra", "debito", "saida", "pagamento", "tarifa", "iof", "juros"];

      for (let index = 1; index < parsedRows.length; index += 1) {
        const values = (parsedRows[index] || []).map((val) => this.cleanCsvCell(val));
        if (!values.some((value) => value)) continue;

        const rawDate = dateIdx >= 0 ? values[dateIdx] : "";
        const rawDesc = descIdx >= 0 ? values[descIdx] : "";
        const rawAmount = amountIdx >= 0 ? values[amountIdx] : "";
        const rawType = typeIdx >= 0 ? values[typeIdx] : "";

        const date = this.parseCsvDate(rawDate);
        const description = rawDesc;
        const parsedAmount = this.parseCsvSignedAmount(rawAmount);

        if (!date || !description || !parsedAmount.amount) {
          skipped += 1;
          continue;
        }

        let type = null;
        if (parsedAmount.negative) {
          type = "EXPENSE";
        } else {
          const normalizedTypeVal = normFn(rawType || "");
          const normalizedDesc = normFn(description || "");

          const isIncomePattern = (str) => {
            if (!str) return false;
            const norm = normFn(str);
            const patterns = [...(schema.incomePatterns || []), ...stdIncome];
            return patterns.some((pat) => {
              const normPat = normFn(pat);
              return norm.includes(normPat);
            });
          };

          const isExpensePattern = (str) => {
            if (!str) return false;
            const norm = normFn(str);
            const patterns = [...(schema.expensePatterns || []), ...stdExpense];
            return patterns.some((pat) => {
              const normPat = normFn(pat);
              return norm.includes(normPat);
            });
          };

          if (isIncomePattern(normalizedTypeVal) || isIncomePattern(normalizedDesc)) {
            type = "INCOME";
          } else if (isExpensePattern(normalizedTypeVal) || isExpensePattern(normalizedDesc)) {
            type = "EXPENSE";
          } else {
            type = schema.defaultPositiveType || "EXPENSE";
          }
        }

        // Try mapping category from memory first
        const normDescVal = normalizeDesc(description);
        let categoryId = descriptionMemory[normDescVal] || null;

        // Fall back to name matching if not found in memory
        if (!categoryId) {
          const category = this.findCategoryByName(description, type);
          categoryId = category?.id || null;
        }

        rows.push({
          description: description.slice(0, 255) || `Movimento CSV ${index + 1}`,
          amount: parsedAmount.amount,
          type,
          category_id: categoryId,
          transaction_date: date,
          status: "PAID",
          source: "IMPORT",
        });
      }

      this.csvImportRows = rows;
      this.csvSkippedRows = skipped;

      if (!rows.length) {
        this.csvImportError = "Nenhum movimento válido foi encontrado no CSV.";
      } else if (skipped) {
        this.csvImportError = `${skipped} linha(s) sem data, descrição ou valor foram ignoradas.`;
      } else {
        this.csvImportError = "";
      }
    },
    async parseCsvWithSchemaEnhanced(parsedRows, schema) {
      const rawHeaders = (parsedRows[0] || []).map((header) => this.cleanCsvCell(header));

      const dateIdx = this.findColumnIndex(rawHeaders, schema.dateColumn, [
        "data",
        "date",
        "dia",
        "periodo",
        "lançamento",
      ]);
      const timeIdx = schema.timeColumn
        ? this.findColumnIndex(rawHeaders, schema.timeColumn, ["hora", "time", "horario"])
        : -1;
      const descIdx = this.findColumnIndex(rawHeaders, schema.descriptionColumn, [
        "descricao",
        "description",
        "historico",
        "origem",
        "destino",
        "estabelecimento",
        "detalhe",
        "nome",
        "texto",
      ]);
      const amountIdx = this.findColumnIndex(rawHeaders, schema.amountColumn, [
        "valor",
        "amount",
        "quantia",
        "monto",
        "total",
        "saldo",
        "pago",
      ]);
      const typeIdx = schema.typeColumn
        ? this.findColumnIndex(rawHeaders, schema.typeColumn, ["tipo", "type", "categoria", "operacao", "movimento"])
        : -1;
      const observationIdx = schema.observationColumn
        ? this.findColumnIndex(rawHeaders, schema.observationColumn, [
            "forma",
            "pagamento",
            "observacao",
            "nota",
            "obs",
          ])
        : -1;

      if (dateIdx === -1 || descIdx === -1 || amountIdx === -1) {
        throw new Error("Não foi possível mapear as colunas essenciais do CSV com o esquema detectado.");
      }

      const localTxs = await this.loadLocalTransactionsForMemory();
      const freqMap = {};
      for (const tx of localTxs) {
        if (tx.category_id && !tx.is_ignored) {
          const norm = this.normalizeCsvSignatureText(tx.description);
          if (norm) {
            if (!freqMap[norm]) freqMap[norm] = {};
            const cid = String(tx.category_id);
            freqMap[norm][cid] = (freqMap[norm][cid] || 0) + 1;
          }
        }
      }

      const descriptionMemory = {};
      for (const norm in freqMap) {
        let maxCount = 0;
        let bestId = null;
        for (const cid in freqMap[norm]) {
          if (freqMap[norm][cid] > maxCount) {
            maxCount = freqMap[norm][cid];
            bestId = cid;
          }
        }
        if (bestId) descriptionMemory[norm] = bestId;
      }

      const rows = [];
      let skipped = 0;
      const normFn = this.normalize;
      const stdIncome = ["recebido", "resgatado", "credito", "entrada", "estorno", "rendimento", "deposito", "salario"];
      const stdExpense = [
        "pago",
        "enviado",
        "compra",
        "debito",
        "saida",
        "pagamento",
        "guardado",
        "tarifa",
        "iof",
        "juros",
      ];

      for (let index = 1; index < parsedRows.length; index += 1) {
        const values = (parsedRows[index] || []).map((val) => this.cleanCsvCell(val));
        if (!values.some((value) => value)) continue;

        const rawDate = dateIdx >= 0 ? values[dateIdx] : "";
        const rawTime = timeIdx >= 0 ? values[timeIdx] : "";
        const rawDesc = descIdx >= 0 ? values[descIdx] : "";
        const rawAmount = amountIdx >= 0 ? values[amountIdx] : "";
        const rawType = typeIdx >= 0 ? values[typeIdx] : "";
        const rawObservation = observationIdx >= 0 ? values[observationIdx] : "";

        const transactionDate = this.parseCsvDateTime(rawDate, rawTime);
        const description = rawDesc;
        const parsedAmount = this.parseCsvSignedAmount(rawAmount);

        if (!transactionDate || !description || !parsedAmount.amount) {
          skipped += 1;
          continue;
        }

        let type = null;
        if (parsedAmount.negative) {
          type = "EXPENSE";
        } else {
          const normalizedTypeVal = normFn(rawType || "");
          const normalizedDesc = normFn(description || "");
          const normalizedObservation = normFn(rawObservation || "");

          const isIncomePattern = (str) => {
            if (!str) return false;
            const patterns = [...(schema.incomePatterns || []), ...stdIncome];
            return patterns.some((pat) => normFn(str).includes(normFn(pat)));
          };

          const isExpensePattern = (str) => {
            if (!str) return false;
            const patterns = [...(schema.expensePatterns || []), ...stdExpense];
            return patterns.some((pat) => normFn(str).includes(normFn(pat)));
          };

          if (isIncomePattern(normalizedTypeVal) || isIncomePattern(normalizedDesc)) {
            type = "INCOME";
          } else if (
            isExpensePattern(normalizedTypeVal) ||
            isExpensePattern(normalizedDesc) ||
            isExpensePattern(normalizedObservation)
          ) {
            type = "EXPENSE";
          } else {
            type = schema.defaultPositiveType || "INCOME";
          }
        }

        const normDescVal = this.normalizeCsvSignatureText(description);
        let categoryId = descriptionMemory[normDescVal] || null;

        if (!categoryId) {
          const category = this.findCategoryByName(description, type);
          categoryId = category?.id || null;
        }

        const observation = this.buildCsvObservation(rawType, rawObservation);
        rows.push({
          csv_line_number: index + 1,
          csv_original_type: rawType || null,
          csv_counterparty: description,
          csv_payment_method: rawObservation || null,
          csv_status: "new",
          csv_duplicate_match_id: null,
          description: description.slice(0, 255) || `Movimento CSV ${index + 1}`,
          observation: observation ? observation.slice(0, 255) : null,
          amount: parsedAmount.amount,
          type,
          category_id: categoryId,
          transaction_date: transactionDate,
          status: "PAID",
          source: "IMPORT",
        });
      }

      const { previewRows, importRows } = this.filterCsvDuplicates(rows, localTxs);
      this.csvPreviewRows = previewRows;
      this.csvImportRows = importRows;
      this.csvSkippedRows = skipped;

      if (!previewRows.length) {
        this.csvImportError = "Nenhum movimento válido foi encontrado no CSV.";
      } else if (skipped > 0) {
        this.csvImportError = `${skipped} linha(s) sem data, descrição ou valor foram ignoradas.`;
      } else {
        this.csvImportError = "";
      }
    },
    parseCsvTime(rawValue) {
      const raw = String(rawValue || "").trim();
      if (!raw) return "";

      const match = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
      if (!match) return "";

      const hour = match[1].padStart(2, "0");
      const minute = match[2].padStart(2, "0");
      const second = (match[3] || "00").padStart(2, "0");
      return `${hour}:${minute}:${second}`;
    },
    parseCsvDateTime(rawDateValue, rawTimeValue) {
      const date = this.parseCsvDate(rawDateValue);
      if (!date) return "";

      const time = this.parseCsvTime(rawTimeValue);
      return time ? `${date} ${time}` : date;
    },
    buildCsvObservation(rawType, rawObservation) {
      const parts = [];
      if (rawType) parts.push(`Tipo: ${rawType}`);
      if (rawObservation) parts.push(`Forma: ${rawObservation}`);
      return parts.join(" | ");
    },
    normalizeCsvSignatureText(value) {
      return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    },
    csvAmountKey(value) {
      const amount = Number(value || 0);
      return Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
    },
    csvDateOnly(value) {
      return String(value || "").slice(0, 10);
    },
    normalizeCsvDateTimeSignature(value) {
      const raw = String(value || "").trim();
      const match = raw.match(/^(\d{4}-\d{2}-\d{2})(?:[T\s](\d{1,2}):(\d{2}))?/);

      if (!match) return raw;
      if (!match[2]) return match[1];

      return `${match[1]} ${match[2].padStart(2, "0")}:${match[3]}`;
    },
    csvHasMeaningfulTime(value) {
      const raw = String(value || "").trim();
      if (!raw || raw.length <= 10) return false;
      const time = raw.slice(11, 19);
      return Boolean(time) && time !== "00:00:00";
    },
    buildCsvExactKey(row = {}) {
      return [
        this.normalizeCsvDateTimeSignature(row.transaction_date),
        String(row.type || ""),
        this.csvAmountKey(row.amount),
        this.normalizeCsvSignatureText(row.description),
        this.normalizeCsvSignatureText(row.observation),
      ].join("|");
    },
    buildCsvLegacyKey(row = {}) {
      return [
        this.csvDateOnly(row.transaction_date),
        this.csvAmountKey(row.amount),
        this.normalizeCsvSignatureText(row.description),
      ].join("|");
    },
    consumeCandidate(map, key) {
      const list = map.get(key);
      if (!Array.isArray(list) || list.length === 0) return null;
      const [candidate] = list.splice(0, 1);
      if (list.length === 0) map.delete(key);
      return candidate;
    },
    buildTransactionCandidateMaps(localTransactions = []) {
      const exactMap = new Map();
      const legacyMap = new Map();

      localTransactions.forEach((transaction) => {
        const candidate = {
          id: transaction.id || transaction.local_id || null,
          type: String(transaction.type || ""),
          source: String(transaction.source || ""),
          hasMeaningfulTime: this.csvHasMeaningfulTime(transaction.transaction_date),
          description: transaction.description,
          observation: transaction.observation,
          amount: transaction.amount,
          transaction_date: transaction.transaction_date,
        };

        const exactKey = this.buildCsvExactKey(candidate);
        if (!exactMap.has(exactKey)) exactMap.set(exactKey, []);
        exactMap.get(exactKey).push(candidate);

        if (
          candidate.source === "IMPORT" &&
          !candidate.hasMeaningfulTime &&
          this.normalizeCsvSignatureText(candidate.description)
        ) {
          const legacyKey = this.buildCsvLegacyKey(candidate);
          if (!legacyMap.has(legacyKey)) legacyMap.set(legacyKey, []);
          legacyMap.get(legacyKey).push(candidate);
        }
      });

      return { exactMap, legacyMap };
    },
    filterCsvDuplicates(rows = [], localTransactions = []) {
      const { exactMap, legacyMap } = this.buildTransactionCandidateMaps(localTransactions);
      const fileMap = new Map();
      const previewRows = [];
      const importRows = [];

      rows.forEach((row) => {
        const nextRow = { ...row, csv_status: "new", csv_duplicate_match_id: null };
        const exactKey = this.buildCsvExactKey(nextRow);
        const legacyKey = this.buildCsvLegacyKey(nextRow);

        if (fileMap.has(exactKey)) {
          nextRow.csv_status = "duplicate_file";
          nextRow.csv_duplicate_match_id = fileMap.get(exactKey);
          previewRows.push(nextRow);
          return;
        }

        const exactCandidate = this.consumeCandidate(exactMap, exactKey);
        if (exactCandidate) {
          nextRow.csv_status = "duplicate_exact";
          nextRow.csv_duplicate_match_id = exactCandidate.id;
          fileMap.set(exactKey, exactCandidate.id || exactKey);
          previewRows.push(nextRow);
          return;
        }

        const legacyCandidate = this.consumeCandidate(legacyMap, legacyKey);
        if (legacyCandidate) {
          nextRow.csv_status = legacyCandidate.type === nextRow.type ? "duplicate_legacy" : "duplicate_legacy_conflict";
          nextRow.csv_duplicate_match_id = legacyCandidate.id;
          fileMap.set(exactKey, legacyCandidate.id || exactKey);
          previewRows.push(nextRow);
          return;
        }

        fileMap.set(exactKey, exactKey);
        previewRows.push(nextRow);
        importRows.push(nextRow);
      });

      const sortRows = (collection) =>
        collection.sort((left, right) => {
          const dateCompare = String(right.transaction_date || "").localeCompare(String(left.transaction_date || ""));
          if (dateCompare !== 0) return dateCompare;
          return Number(right.csv_line_number || 0) - Number(left.csv_line_number || 0);
        });

      return {
        previewRows: sortRows(previewRows),
        importRows: sortRows(importRows),
      };
    },
    detectCsvDelimiter(content) {
      const options = [";", ",", "\t"];
      const lines = content.split(/\r?\n/).slice(0, 15);
      return options
        .map((delimiter) => {
          let count = 0;
          for (const line of lines) {
            const directCount = this.countCsvDelimiters(line, delimiter);
            count += directCount || this.countCsvDelimiters(this.unwrapCsvEnvelope(line), delimiter);
          }
          return { delimiter, count };
        })
        .sort((a, b) => b.count - a.count)[0].delimiter;
    },
    countCsvDelimiters(line, delimiter) {
      let count = 0;
      let quoted = false;

      for (let index = 0; index < line.length; index += 1) {
        const char = line[index];
        const next = line[index + 1];

        if (char === '"' && quoted && next === '"') {
          index += 1;
        } else if (char === '"') {
          quoted = !quoted;
        } else if (char === delimiter && !quoted) {
          count += 1;
        }
      }

      return count;
    },
    unwrapCsvEnvelope(line) {
      const value = String(line || "").trim();
      if (!value.startsWith('"') || !value.endsWith('"')) return value;
      return value.slice(1, -1).replace(/""/g, '"');
    },
    parseCsvDocument(content, delimiter) {
      const rows = [];
      let currentRow = [];
      let currentValue = "";
      let quoted = false;

      const pushValue = () => {
        currentRow.push(currentValue);
        currentValue = "";
      };

      const pushRow = () => {
        pushValue();
        rows.push(currentRow);
        currentRow = [];
      };

      for (let index = 0; index < content.length; index += 1) {
        const char = content[index];
        const next = content[index + 1];

        if (char === '"' && quoted && next === '"') {
          currentValue += '"';
          index += 1;
        } else if (char === '"') {
          quoted = !quoted;
        } else if (!quoted && char === delimiter) {
          pushValue();
        } else if (!quoted && (char === "\n" || char === "\r")) {
          if (char === "\r" && next === "\n") {
            index += 1;
          }
          pushRow();
        } else {
          currentValue += char;
        }
      }

      if (currentValue.length > 0 || currentRow.length > 0) {
        pushRow();
      }

      return rows;
    },
    normalizeParsedCsvRows(rows, delimiter) {
      const safeRows = Array.isArray(rows) ? rows : [];
      const meaningfulRows = safeRows.filter((row) => Array.isArray(row) && row.some((cell) => String(cell || "").trim()));
      if (!meaningfulRows.length) return safeRows;

      const shouldNormalize = meaningfulRows.every((row) => this.isWrappedCsvRow(row, delimiter));
      if (!shouldNormalize) return safeRows;

      return safeRows.map((row) => this.expandWrappedCsvRow(row, delimiter));
    },
    isWrappedCsvRow(row, delimiter) {
      if (!Array.isArray(row) || row.length !== 1) return false;

      const value = String(row[0] || "").trim();
      if (!value || !value.includes(delimiter)) return false;

      return this.splitCsvLine(value, delimiter).length > 1;
    },
    expandWrappedCsvRow(row, delimiter) {
      if (!this.isWrappedCsvRow(row, delimiter)) return row;
      return this.splitCsvLine(String(row[0] || ""), delimiter);
    },
    splitCsvLine(line, delimiter) {
      const values = [];
      let current = "";
      let quoted = false;

      for (let index = 0; index < line.length; index += 1) {
        const char = line[index];
        const next = line[index + 1];

        if (char === '"' && quoted && next === '"') {
          current += '"';
          index += 1;
        } else if (char === '"') {
          quoted = !quoted;
        } else if (char === delimiter && !quoted) {
          values.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }

      values.push(current.trim());
      return values;
    },
    parseCsvSignedAmount(rawValue) {
      const raw = String(rawValue || "").trim();
      if (!raw) return { amount: 0, negative: false };

      const negative = /[-\u2212\u2013\u2014]/.test(raw) || (raw.includes("(") && raw.includes(")"));
      let normalized = raw
        .replace(/\s/g, "")
        .replace(/[R$()]/g, "")
        .replace(/[^0-9,.-]/g, "");
      const lastComma = normalized.lastIndexOf(",");
      const lastDot = normalized.lastIndexOf(".");

      if (lastComma > -1 && lastDot > -1) {
        normalized =
          lastComma > lastDot ? normalized.replace(/\./g, "").replace(",", ".") : normalized.replace(/,/g, "");
      } else if (lastComma > -1) {
        normalized = normalized.replace(",", ".");
      }

      const amount = Math.abs(Number(normalized || 0));
      return { amount: Number.isFinite(amount) ? amount : 0, negative };
    },
    parseCsvDate(rawValue) {
      const raw = String(rawValue || "").trim();
      if (!raw) return "";

      const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

      const brMatch = raw.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
      if (brMatch) {
        const year = brMatch[3].length === 2 ? `20${brMatch[3]}` : brMatch[3];
        return `${year}-${brMatch[2].padStart(2, "0")}-${brMatch[1].padStart(2, "0")}`;
      }

      const parsed = new Date(raw);
      if (Number.isNaN(parsed.getTime())) return "";
      return parsed.toISOString().slice(0, 10);
    },
    findCategoryByName(name, type) {
      const normalized = this.normalize(name);
      if (!normalized) return null;
      return (
        this.categories.find(
          (category) => this.normalize(category.name) === normalized && (!type || category.type === type),
        ) || this.categories.find((category) => this.normalize(category.name) === normalized)
      );
    },
    async confirmCsvImport(showMonth = null) {
      if (this.importingCsv || !this.csvImportRows.length) return;
      this.importingCsv = true;
      this.csvImportError = "";
      try {
        const cleanRows = this.csvImportRows.map((row) => ({
          description: String(row.description || ""),
          observation: row.observation ? String(row.observation) : null,
          amount: Number(row.amount || 0),
          type: String(row.type || "EXPENSE"),
          category_id: row.category_id || null,
          ...(row.goal_id ? { goal_id: row.goal_id } : {}),
          transaction_date: String(row.transaction_date),
          status: "PAID",
          source: "IMPORT",
        }));
        await financeService.createTransactionsBatch(cleanRows);
        if (typeof showMonth === "string" && cleanRows.some((row) => row.transaction_date.startsWith(`${showMonth}-`))) {
          this.selectedMonth = showMonth;
        }
        this.resetCsvImport();
        await this.refreshTransactionDrivenViews();
      } catch (error) {
        this.csvImportError = error?.response?.data?.message || error.message || "Não foi possível importar o CSV.";
      } finally {
        this.importingCsv = false;
      }
    },

    transactionKey(transaction) {
      return transaction.id || transaction.local_id || null;
    },
    categoryKey(category) {
      return category?.server_id || category?.id || category?.local_key || category?.local_id || null;
    },
    macroKey(macro) {
      const resolved = this.resolveMacroRecord(macro) || macro || {};
      return (
        resolved.server_id ||
        resolved.id ||
        resolved.local_key ||
        resolved.local_id ||
        resolved.macro_category_id ||
        macro?.server_id ||
        macro?.id ||
        macro?.local_key ||
        macro?.local_id ||
        macro?.macro_category_id ||
        null
      );
    },
    transactionMatches(transaction, id) {
      return this.sameId(transaction.id, id) || this.sameId(transaction.local_id, id);
    },
    transactionBelongsToSelectedMonth(transaction) {
      return String(transaction.transaction_date || "").startsWith(this.selectedMonth);
    },
    enrichTransactionForList(transaction = {}) {
      const category = this.findCategory(transaction.category_id);
      if (!category) return transaction;

      return {
        ...transaction,
        category_id: category.id,
        category_name: category.name,
        macro_category: category.macro_category,
        macro_category_id: category.macro_category_id,
        category_icon: category.icon,
        category_color: category.color || category.macro_color || "#999999",
      };
    },
    sortTransactionsList() {
      this.transactions = [...this.transactions].sort((a, b) => {
        const dateCompare = String(b.transaction_date || "").localeCompare(String(a.transaction_date || ""));
        if (dateCompare !== 0) return dateCompare;

        const isNumericA = a.id && Number.isFinite(Number(a.id));
        const isNumericB = b.id && Number.isFinite(Number(b.id));

        if (isNumericA && isNumericB) return Number(b.id) - Number(a.id);
        if (!isNumericA && isNumericB) return -1;
        if (isNumericA && !isNumericB) return 1;
        return (b.local_id || 0) - (a.local_id || 0);
      });
    },
    upsertTransactionInList(transaction) {
      const next = this.enrichTransactionForList(transaction);
      const key = this.transactionKey(next);
      const withoutCurrent = this.transactions.filter((item) => !this.transactionMatches(item, key));

      if (this.transactionBelongsToSelectedMonth(next)) {
        this.transactions = [next, ...withoutCurrent];
        this.sortTransactionsList();
      } else {
        this.transactions = withoutCurrent;
      }
    },
    removeTransactionFromList(id) {
      this.transactions = this.transactions.filter((transaction) => !this.transactionMatches(transaction, id));
      this.recentTransactions = this.recentTransactions.filter(
        (transaction) => !this.transactionMatches(transaction, id),
      );
    },
    investmentGoalKey(goal) {
      return goal.id || goal.local_id || null;
    },
    investmentGoalMatches(goal, id) {
      return this.sameId(goal.id, id) || this.sameId(goal.local_id, id);
    },
    upsertInvestmentGoalInList(goal) {
      const key = this.investmentGoalKey(goal);
      const withoutCurrent = this.investmentGoals.filter((item) => !this.investmentGoalMatches(item, key));
      this.investmentGoals = [...withoutCurrent, goal];
    },
    removeInvestmentGoalFromList(id) {
      this.investmentGoals = this.investmentGoals.filter((goal) => !this.investmentGoalMatches(goal, id));
    },
    matchesTransactionCategoryFilter(transaction) {
      if (!this.transactionCategoryFilter) return true;
      if (this.transactionCategoryFilter === "__uncategorized__") {
        return !transaction.category_id;
      }

      const category = this.findCategory(transaction.category_id);
      return (
        this.sameId(transaction.category_id, this.transactionCategoryFilter) ||
        this.sameId(this.categoryKey(category), this.transactionCategoryFilter)
      );
    },
    buildTransactionSearchText(transaction) {
      const amount = Math.abs(Number(transaction.amount || 0));
      const category = this.findCategory(transaction.category_id);
      const amountBr = Number.isFinite(amount)
        ? amount.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        : "";
      const amountFixed = Number.isFinite(amount) ? amount.toFixed(2) : "";
      const amountInteger = Number.isFinite(amount) ? String(Math.trunc(amount)) : "";
      const amountDigits = Number.isFinite(amount) ? String(Math.round(amount * 100)) : "";

      return this.normalize(
        [
          transaction.title,
          transaction.description,
          transaction.observation,
          transaction.category_name,
          category?.name,
          this.typeLabel(transaction.type),
          amountBr,
          amountFixed,
          amountInteger,
          amountDigits,
        ]
          .filter(Boolean)
          .join(" "),
      );
    },
    matchesTransactionSearch(transaction, normalizedSearch) {
      if (!normalizedSearch) return true;
      return this.buildTransactionSearchText(transaction).includes(normalizedSearch);
    },
    async selectTransactionCategory(transaction, categoryId, options = {}) {
      const category = this.findCategory(categoryId);
      const update = { category_id: categoryId || null };
      const originalType = transaction.original_type || options.originalType || transaction.type;

      if (!categoryId && transaction.original_type) {
        update.type = transaction.original_type;
        update.original_type = null;
      }

      if (category?.type) {
        update.type = category.type;
        if (originalType) {
          update.original_type = originalType;
        }
      }

      await this.updateTransaction(this.transactionKey(transaction), update);
    },
    resolveSavedCategory(savedCategory) {
      if (!savedCategory) return null;
      const savedName = this.normalize(savedCategory.name);
      const savedMacro = this.normalize(savedCategory.macro_category);

      return (
        this.categories.find(
          (category) =>
            this.sameId(category.id, savedCategory.id) ||
            this.sameId(category.local_id, savedCategory.local_id) ||
            (this.normalize(category.name) === savedName &&
              this.normalize(category.macro_category) === savedMacro &&
              category.type === savedCategory.type),
        ) || savedCategory
      );
    },
    async applyPendingCategorySelection(savedCategory) {
      if (!this.pendingCategorySelection) return;
      const pending = this.pendingCategorySelection;
      const category = this.resolveSavedCategory(savedCategory);
      const transaction = this.transactions.find(
        (item) =>
          this.transactionMatches(item, pending.transactionId) ||
          this.transactionMatches(item, pending.transactionLocalId),
      );

      if (transaction && category.id) {
        await this.selectTransactionCategory(transaction, category.id, {
          originalType: pending.originalType,
        });
      }

      this.pendingCategorySelection = null;
    },
    applyTransactionPatch(id, data) {
      this.transactions = this.transactions.map((transaction) =>
        this.transactionMatches(transaction, id)
          ? this.enrichTransactionForList({ ...transaction, ...data })
          : transaction,
      );
      this.recentTransactions = this.recentTransactions.map((transaction) =>
        this.transactionMatches(transaction, id)
          ? this.enrichTransactionForList({ ...transaction, ...data })
          : transaction,
      );
    },
    async updateTransaction(id, data) {
      this.applyTransactionPatch(id, data);
      const { data: local } = await financeService.updateTransaction(id, data);
      if (local) {
        this.upsertTransactionInList(local);
      }
      await this.refreshTransactionDrivenViews();
    },
    async toggleIgnored(transaction) {
      const transactionId = this.transactionKey(transaction);
      if (!transactionId) return;
      const nextIgnored = !transaction.is_ignored;
      this.applyTransactionPatch(transactionId, { is_ignored: nextIgnored });
      await this.updateTransaction(transactionId, { is_ignored: nextIgnored });
    },
    async deleteTransaction(id) {
      await financeService.deleteTransaction(id);
      this.removeTransactionFromList(id);
      await this.refreshTransactionDrivenViews();
    },
    findCategory(categoryId) {
      return this.categories.find(
        (category) =>
          this.sameId(category.id, categoryId) ||
          this.sameId(category.local_id, categoryId) ||
          this.sameId(category.local_key, categoryId),
      );
    },
    findMacroByName(name) {
      return this.macroCategories.find((macro) => this.normalize(macro?.name) === this.normalize(name));
    },
    resolveMacroRecord(macro = null) {
      if (!macro) return null;

      const candidates = [macro.id, macro.original_id, macro.local_key, macro.local_id, macro.macro_category_id].filter(
        Boolean,
      );

      for (const candidate of candidates) {
        const found = this.macroCategories.find(
          (current) =>
            this.sameId(current.id, candidate) ||
            this.sameId(current.local_key, candidate) ||
            this.sameId(current.local_id, candidate),
        );
        if (found) return found;
      }

      return this.findMacroByName(macro.name);
    },
    categoriesForMacro(group) {
      return this.categories.filter(
        (category) => this.normalize(category.macro_category) === this.normalize(group.macro_category),
      );
    },
    availableCategoriesForMacro(group, currentItem) {
      const allCategoriesForMacro = this.categoriesForMacro(group);
      const usedCategoryIds = new Set();
      this.budgets.forEach((g) => {
        (g.items || []).forEach((item) => {
          if (item.category_id && item.category_id !== currentItem.category_id) {
            usedCategoryIds.add(String(item.category_id));
          }
        });
      });
      return allCategoriesForMacro.filter((category) => !usedCategoryIds.has(String(category.id)));
    },
    nextBudgetCategoryId(group) {
      const used = new Set();
      this.budgets.forEach((g) => {
        (g.items || []).forEach((item) => {
          if (item.category_id) used.add(String(item.category_id));
        });
      });
      const candidate = this.categoriesForMacro(group).find((category) => !used.has(String(category.id)));
      return candidate?.id || null;
    },
    nextBudgetMacro() {
      const used = new Set(this.budgets.map((group) => String(group.macro_category_id || "")).filter(Boolean));
      return this.macroCategories.find((macro) => !used.has(String(macro.id))) || null;
    },
    addBudgetGroup() {
      const group = this.hydrateBudgetGroup({
        _key: `local-macro-${Date.now()}`,
        macro_category_id: null,
        macro_category: "",
        macro_color: "#999999",
        planned_amount: 0,
        actual_amount: 0,
        items: [],
      });
      this.budgets.push(group);
    },
    removeBudgetGroup(group) {
      this.budgets = this.budgets.filter((item) => item._key !== group._key);
    },
    selectBudgetMacro(group, macroName) {
      const macro = this.findMacroByName(macroName);
      group.macro_category_id = macro.id || null;
      group.macro_category = macroName;
      group.macro_color = macro?.color || group.macro_color || "#999999";
      group.items = [];
    },
    addBudgetItem(group) {
      const categoryId = this.nextBudgetCategoryId(group);
      const category = this.findCategory(categoryId);
      group.items.push(
        this.hydrateBudgetItem({
          _key: `local-item-${Date.now()}-${Math.random()}`,
          category_id: categoryId,
          type: category?.type || "EXPENSE",
          amount: 0,
          actual_amount: 0,
        }),
      );
    },
    removeBudgetItem(group, item) {
      group.items = group.items.filter((current) => current._key !== item._key);
    },
    syncBudgetItemType(item) {
      item.type = this.findCategory(item.category_id)?.type || item.type || "EXPENSE";
    },
    updateBudgetGroupAmount(event, group) {
      const value = this.parseMoneyInput(event.target.value);
      group.planned_amount = value;
      group.planned_amount_display = this.moneyInput(value);
      event.target.value = group.planned_amount_display;
    },
    updateBudgetAmount(event, budget) {
      const value = this.parseMoneyInput(event.target.value);
      budget.amount = value;
      budget.amount_display = this.moneyInput(value);
      event.target.value = budget.amount_display;
    },
    async saveBudgets() {
      const groups = this.budgets
        .filter((group) => group.macro_category_id)
        .map((group) => ({
          macro_category_id: group.macro_category_id,
          macro_category: group.macro_category,
          macro_color: group.macro_color,
          planned_amount: Number(group.planned_amount || 0),
          actual_amount: Number(group.actual_amount || 0),
          items: group.items
            .filter((item) => item.category_id && Number(item.amount) >= 0)
            .map((item) => ({
              category_id: item.category_id,
              amount: Number(item.amount || 0),
              actual_amount: Number(item.actual_amount || 0),
              type: this.findCategory(item.category_id)?.type || item.type || "EXPENSE",
            })),
        }));

      await financeService.saveBudgets({ month: this.selectedMonth, groups });
      await this.loadBudgets();
    },
    openCategoryForm(category = null, pendingSelection = null) {
      this.pendingCategorySelection = pendingSelection;
      const currentCategory = category || {};
      const macro = this.findMacroByName(currentCategory.macro_category || "Geral");
      const macroColor = currentCategory.macro_color || macro?.color || currentCategory.color || "#999999";
      const initialColor = currentCategory.color
        ? clampToMacroTone(currentCategory.color, macroColor)
        : macroColor;

      this.categoryForm = {
        id: currentCategory.id || null,
        name: currentCategory.name || "",
        macro_category: currentCategory.macro_category || (macro?.name || "Geral"),
        macro_color: macroColor,
        color: initialColor,
        investment_flow_type: currentCategory.investment_flow_type || null,
        type: currentCategory.type || "EXPENSE",
        icon: currentCategory.icon || "tag",
      };
      if (this.isCategoryFormInvestment && !this.categoryFormIsInvestmentOut) {
        this.categoryForm.type = "EXPENSE";
      }
      this.showCategoryForm = true;
    },
    categoryTypeLabel(category) {
      if (category?.investment_flow_type === INVESTMENT_FLOW.IN) return "Entrada (aporte)";
      if (category?.investment_flow_type === INVESTMENT_FLOW.OUT) return "Saída (resgate)";
      return this.typeLabel(category?.type);
    },
    openCategoryFormForTransaction(transaction, suggestedName = "") {
      const defaultMacro = this.macroCategories[0]?.name || "Geral";
      const macro = this.findMacroByName(defaultMacro);
      const macroColor = macro?.color || "#999999";
      this.openCategoryForm(
        {
          name: suggestedName,
          macro_category: defaultMacro,
          macro_color: macroColor,
          color: macroColor,
          type: transaction.type || "EXPENSE",
          icon: "tag",
        },
        {
          transactionId: transaction.id,
          transactionLocalId: transaction.local_id,
          originalType: transaction.original_type || transaction.type,
        },
      );
    },
    handleNewCategoryRequest(group = null) {
      if (group?.name) {
        this.openCategoryForm({
          name: "",
          macro_category: group.name,
          macro_color: group.color || "#999999",
          color: group.color || "#999999",
          type: "EXPENSE",
          icon: "tag",
        });
        return;
      }
      this.openCategoryForm();
    },
    closeCategoryForm() {
      this.showCategoryForm = false;
      this.pendingCategorySelection = null;
    },
    onCategoryMacroChange(macroName) {
      const macro = this.findMacroByName(macroName);
      if (macro?.color) {
        this.categoryForm.macro_color = macro?.color;
      }
      const targetMacroColor = this.categoryForm.macro_color || macro?.color || "#999999";
      this.categoryForm.color = clampToMacroTone(
        this.categoryForm.color || targetMacroColor,
        targetMacroColor,
      );
      if (this.isCategoryFormInvestment && !this.categoryFormIsInvestmentOut) {
        this.categoryForm.type = "EXPENSE";
      }
    },
    setCategoryColor(hex) {
      const macroColor = this.categoryForm?.macro_color || "#999999";
      this.categoryForm.color = clampToMacroTone(hex, macroColor);
    },
    onToneSliderChange(lightness) {
      const macroColor = normalizeHex(this.categoryForm?.macro_color || "#999999");
      const hsl = hexToHsl(macroColor);
      const l = Math.max(15, Math.min(88, lightness));
      let newHex;
      if (hsl.s < 12) {
        newHex = hslToHex(0, 0, l);
      } else {
        const s = Math.max(25, Math.min(95, hsl.s));
        newHex = hslToHex(hsl.h, s, l);
      }
      this.categoryForm.color = newHex;
    },
    isCurrentCategoryTone(hex) {
      const current = normalizeHex(this.currentCategoryToneColor);
      return current === normalizeHex(hex);
    },
    onCategoryMacroColorInput() {
      if (this.categoryForm.macro_color) {
        this.categoryForm.color = clampToMacroTone(
          this.categoryForm.color || this.categoryForm.macro_color,
          this.categoryForm.macro_color,
        );
      }
    },
    async saveCategoryForm() {
      if (this.savingCategory) return;
      this.savingCategory = true;
      try {
        await this.persistCategoryForm();
      } finally {
        this.savingCategory = false;
      }
    },
    async persistCategoryForm() {
      const payload = { ...this.categoryForm };
      // null nao passa na validacao do backend; ausente significa "deixa o servidor decidir".
      if (!payload.investment_flow_type) delete payload.investment_flow_type;
      const macroColor = payload.macro_color || "#999999";
      payload.color = clampToMacroTone(payload.color || macroColor, macroColor);

      let savedCategory = null;
      if (payload.id) {
        const { data } = await financeService.updateCategory(payload.id, payload);
        savedCategory = data;
      } else {
        const { data } = await financeService.createCategory(payload);
        savedCategory = data;
      }
      this.showCategoryForm = false;
      await Promise.all([
        this.loadMacroCategories(),
        this.loadCategories(),
        this.loadDashboard(),
        this.loadInvestments(),
      ]);
      await this.applyPendingCategorySelection(savedCategory);
    },
    openMacroForm(macro = null) {
      const currentMacro = macro || {};
      const resolvedMacro = this.resolveMacroRecord(currentMacro) || currentMacro;
      const resolvedId =
        resolvedMacro.id || resolvedMacro.local_key || resolvedMacro.local_id || currentMacro.macro_category_id || null;

      this.macroForm = {
        id: resolvedId,
        original_id: resolvedId,
        name: resolvedMacro.name || "",
        color: resolvedMacro.color || "#999999",
        is_investment: Boolean(resolvedMacro.is_investment),
      };
      this.showMacroForm = true;
    },
    async saveMacroForm() {
      if (this.savingMacro) return;
      this.savingMacro = true;
      try {
        await this.persistMacroForm();
      } finally {
        this.savingMacro = false;
      }
    },
    async persistMacroForm() {
      const macroId = this.macroForm.original_id || this.macroForm.id || null;
      const payload = {
        name: this.macroForm.name,
        color: this.macroForm.color,
        is_investment: this.macroForm.is_investment,
      };

      if (macroId) {
        await financeService.updateMacroCategory(macroId, payload);
      } else {
        await financeService.createMacroCategory(payload);
      }
      this.showMacroForm = false;
      await Promise.all([
        this.loadMacroCategories(),
        this.loadCategories(),
        this.loadBudgets(),
        this.loadDashboard(),
        this.loadInvestments(),
      ]);
    },
    async saveInvestmentGoal(goal) {
      let savedGoal = null;
      if (goal.id) {
        const { data } = await financeService.updateInvestmentGoal(goal.id, goal);
        savedGoal = data;
      } else {
        const { data } = await financeService.createInvestmentGoal(goal);
        savedGoal = data;
      }
      if (savedGoal) this.upsertInvestmentGoalInList(savedGoal);
      await this.loadInvestments();
    },
    requestDeleteInvestmentGoal(goal) {
      const goalId = this.investmentGoalKey(goal);
      if (!goalId) return;
      this.openConfirmation({
        message: `Excluir a meta "${goal.name}"`,
        description: "Esta ação arquivará a meta e não poderá ser desfeita.",
        confirmText: "Excluir",
        action: async () => {
          await this.deleteInvestmentGoal(goal);
        },
      });
    },
    async deleteInvestmentGoal(goal) {
      const goalId = this.investmentGoalKey(goal);
      if (!goalId) return;
      this.removeInvestmentGoalFromList(goalId);
      await financeService.deleteInvestmentGoal(goalId);
      await this.loadInvestments();
    },
    async saveInvestmentEvent(event) {
      if (event.id) {
        await financeService.updateInvestmentEvent(event.id, event);
      } else {
        await financeService.createInvestmentEvent(event);
      }
      await this.loadInvestments();
    },
    async deleteInvestmentEvent(event) {
      const eventId = event.id || event.local_id;
      if (!eventId) return;
      await financeService.deleteInvestmentEvent(eventId);
      await this.loadInvestments();
    },
    openConfirmation({ description, message, confirmText, action }) {
      this.confirmationState = {
        show: true,
        message: message,
        confirmText: confirmText || "Confirmar",
        action: action,
        description: description || "",
      };
    },
    async execute_confirmation_action() {
      if (this.confirmationState.action) {
        try {
          await this.confirmationState.action();
        } catch (err) {
          console.error("Erro ao executar ação confirmada:", err);
        }
      }
      this.confirmationState.show = false;
    },
    requestDeleteTransaction(transaction) {
      this.openConfirmation({
        message: `Excluir o lançamento "${transaction.description}"`,
        description: `Esta ação excluirá o lançamento no valor de ${this.money(transaction.amount)} e não poderá ser desfeita.`,
        confirmText: "Excluir",
        action: async () => {
          const transactionId = this.transactionKey(transaction);
          if (!transactionId) return;
          await this.deleteTransaction(transactionId);
        },
      });
    },
    requestDeleteCategory(category) {
      this.confirmDelete = {
        visible: true,
        type: "category",
        payload: category,
        message: `Excluir a categoria "${category.name}"? Os lançamentos vinculados ficarão sem categoria.`,
      };
    },
    requestDeleteMacro(macro) {
      this.confirmDelete = {
        visible: true,
        type: "macro",
        payload: macro,
        message: `Excluir a macro categoria "${macro?.name}"? As categorias filhas devem ser movidas antes para evitar perda de organização.`,
      };
    },
    closeDeleteConfirm() {
      this.confirmDelete = { visible: false, type: null, payload: null, message: "" };
    },
    async confirmDeleteAction() {
      const { type, payload } = this.confirmDelete;
      if (type === "category") {
        const categoryId = this.categoryKey(payload);
        if (categoryId) await financeService.deleteCategory(categoryId);
      }
      if (type === "macro") {
        const macroId = this.macroKey(payload);
        if (macroId) await financeService.deleteMacroCategory(macroId);
      }
      this.closeDeleteConfirm();
      await Promise.all([
        this.loadMacroCategories(),
        this.loadCategories(),
        this.loadBudgets(),
        this.loadDashboard(),
        this.loadInvestments(),
      ]);
    },
    loadPluggyScript() {
      if (document.querySelector(`script[src="${pluggyWidgetUrl}"]`)) return Promise.resolve();
      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = pluggyWidgetUrl;
        script.async = true;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    },
    async openPluggyWidget() {
      await this.loadPluggyScript();
      if (!window.PluggyConnect) throw new Error("Pluggy Connect indisponível.");

      const { data } = await financeService.getConnectToken();
      const widget = new window.PluggyConnect({
        connectToken: data.accessToken,
        includeSandbox: includePluggySandbox,
        onSuccess: async (itemData) => {
          await financeService.saveConnection(itemData);
          await this.reloadAll();
        },
      });
      widget.init();
    },
    async syncConnections() {
      this.syncingBanks = true;
      try {
        await financeService.syncConnections();
        await this.reloadAll();
      } finally {
        this.syncingBanks = false;
      }
    },
    async deleteConnection(itemId) {
      await financeService.deleteConnection(itemId);
      await this.loadConnections();
    },
    async autoCategorize() {
      if (!this.canUseAi) {
        this.showPlanModal = true;
        return;
      }

      this.categorizingAi = true;
      this.categorizingIds = [];

      try {
        // 1. Identify all uncategorized transactions currently on the screen/dashboard
        const targetTransactions = this.transactions.filter((t) => !t.category_id && !t.is_ignored);

        if (targetTransactions.length === 0) {
          // No items to categorize
          return;
        }

        // Helper to normalize transaction descriptions for matching
        const normalizeDesc = (desc) => {
          return String(desc || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Remove accents/diacritics
            .replace(/[^a-z0-9]/g, " ") // Replace special characters and punctuation with spaces
            .replace(/\s+/g, " ") // Collapse multiple spaces
            .trim();
        };

        // 2. Fetch all local transactions from Dexie database to build the description category frequency map
        const localTxs = await this.loadLocalTransactionsForMemory();
        const freqMap = {}; // normalizedDesc -> { categoryId -> count }
        for (const tx of localTxs) {
          // If transaction has an active, valid category and is not ignored
          if (tx.category_id && !tx.is_ignored) {
            const norm = normalizeDesc(tx.description);
            if (norm) {
              if (!freqMap[norm]) freqMap[norm] = {};
              const catId = String(tx.category_id);
              freqMap[norm][catId] = (freqMap[norm][catId] || 0) + 1;
            }
          }
        }

        // Select the most frequent category for each normalized description
        const descriptionMemory = {};
        for (const norm in freqMap) {
          let maxCount = 0;
          let bestCatId = null;
          for (const catId in freqMap[norm]) {
            if (freqMap[norm][catId] > maxCount) {
              maxCount = freqMap[norm][catId];
              bestCatId = catId;
            }
          }
          if (bestCatId) {
            descriptionMemory[norm] = bestCatId;
          }
        }

        // 3. Separate transactions into those resolvable locally and those requiring AI
        const localMatchUpdates = [];
        const remainingIds = [];

        for (const tx of targetTransactions) {
          const norm = normalizeDesc(tx.description);
          const matchedCategoryId = descriptionMemory[norm];
          if (matchedCategoryId) {
            localMatchUpdates.push({ id: tx.id, category_id: matchedCategoryId });
          } else {
            remainingIds.push(tx.id);
          }
        }

        // 4. Update locally resolved transactions immediately
        if (localMatchUpdates.length > 0) {
          console.log(`[CategorizeMemory] Resolving ${localMatchUpdates.length} transactions locally from memory...`);
          for (const update of localMatchUpdates) {
            await financeService.updateTransaction(update.id, { category_id: update.category_id });
          }
        }

        // 5. Send remaining transactions to the AI backend if any exist
        if (remainingIds.length > 0) {
          console.log(
            `[CategorizeMemory] Requesting AI categorization for ${remainingIds.length} unknown transactions...`,
          );
          this.categorizingIds = [...remainingIds];
          await financeService.autoCategorize({ transaction_ids: remainingIds });
        } else {
          console.log(
            `[CategorizeMemory] All ${localMatchUpdates.length} transactions resolved from history! Bypassed AI call.`,
          );
        }

        await Promise.all([this.refreshTransactionDrivenViews(), this.loadUsage()]);
      } catch (err) {
        console.error("Erro na categorização:", err);
      } finally {
        this.categorizingIds = [];
        this.categorizingAi = false;
      }
    },
    openBudgetPlanModal() {
      if (!this.canUseAi) {
        this.showPlanModal = true;
        return;
      }
      this.loadBudgetAiConversation();
      this.budgetAiPrompt = this.budgetAiInlinePrompt.trim();
      this.showBudgetAiForm = true;
    },
    async runInlineBudgetAi() {
      if (!this.canUseAi) {
        this.showPlanModal = true;
        return;
      }
      this.budgetAiPrompt = this.budgetAiInlinePrompt.trim() || "Organizar meu orçamento mensal";
      await this.submitBudgetPlan();
    },
    async waitForBudgetPlanJob(jobId) {
      const startedAt = Date.now();
      const timeoutMs = 240000;
      const delayMs = 10000;

      while (Date.now() - startedAt < timeoutMs) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        const { data } = await financeService.getBudgetPlanJob(jobId);

        if (data?.status === "COMPLETED") return data.result || {};
        if (data?.status === "FAILED") throw new Error(data.error_message || "Não foi possível gerar o planejamento financeiro.");
      }

      throw new Error("O planejamento ainda está sendo gerado. Tente consultar novamente em alguns instantes.");
    },
    async submitBudgetPlan() {
      if (!this.budgetAiPrompt.trim()) return;
      this.loadingAi = true;
      try {
        const requestText = this.budgetAiPrompt.trim();
        this.appendBudgetAiMessage("user", requestText);
        const response = await financeService.generateBudgetPlan({
          month: this.selectedMonth,
          text: requestText,
          conversation_summary: this.budgetAiContextSummary,
        });
        let data = response.data?.result || response.data || {};
        if (response.data?.job_id && response.data?.status !== "COMPLETED") {
          this.appendBudgetAiMessage("assistant", "Estou gerando seu planejamento. Isso pode levar alguns instantes.");
          data = await this.waitForBudgetPlanJob(response.data.job_id);
        }
        if (Array.isArray(data.groups) && data.groups.length > 0) {
          this.budgets = data.groups.map((group) => {
            const macro = this.macroCategories.find((item) => this.sameId(item.id, group.macro_category_id));
            return this.hydrateBudgetGroup({
              ...group,
              _key: `ai-macro-${group.macro_category_id}-${Math.random()}`,
              macro_category: macro?.name || "Geral",
              macro_color: macro?.color || "#999999",
              actual_amount: 0,
              items: (group.items || []).map((item) => ({
                ...item,
                type: this.findCategory(item.category_id)?.type || item.type || "EXPENSE",
                actual_amount: 0,
              })),
            });
          });
        } else {
          const byMacro = new Map();
          (data.budgets || []).forEach((budget) => {
            const category = this.findCategory(budget.category_id);
            if (!category?.macro_category_id) return;
            if (!byMacro.has(category.macro_category_id)) {
              byMacro.set(category.macro_category_id, {
                macro_category_id: category.macro_category_id,
                macro_category: category.macro_category,
                macro_color: category.macro_color || category.color,
                planned_amount: 0,
                actual_amount: 0,
                items: [],
              });
            }
            const group = byMacro.get(category.macro_category_id);
            group.planned_amount += Number(budget.amount || 0);
            group.items.push({ ...budget, type: category.type, actual_amount: 0 });
          });
          this.budgets = [...byMacro.values()].map((group) => this.hydrateBudgetGroup(group));
        }
        const insightText =
          Array.isArray(data.insights) && data.insights.length > 0
            ? data.insights.slice(0, 2).join(" ")
            : "Plano gerado para o mês com base no seu pedido.";
        this.appendBudgetAiMessage("assistant", insightText);
        this.budgetAiInlinePrompt = "";
        this.budgetAiPrompt = "";
        this.showBudgetAiForm = false;
        await this.loadUsage();
      } catch (err) {
        const message = err?.response?.data?.message || err.message || "Não foi possível gerar o planejamento financeiro.";
        console.error("Erro ao gerar planejamento financeiro:", err);
        this.appendBudgetAiMessage("assistant", message);
      } finally {
        this.loadingAi = false;
      }
    },
    async loadInsights() {
      this.loadingAi = true;
      try {
        const { data } = await financeService.getInsights({ month: this.selectedMonth });
        this.insights = data || [];
        await this.loadUsage();
      } catch (err) {
        console.error("Erro ao carregar insights:", err);
      } finally {
        this.loadingAi = false;
      }
    },
    scrollToBottomOfChat() {
      this.$nextTick(() => {
        const chatContainer = this.$refs.budgetAiChat;
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      });
    },
  },
  mounted() {
    this.reloadAll();
    if (this.$refs.tabViewport) {
      this.$refs.tabViewport.scrollLeft = 0;
    }
    document.addEventListener("keydown", this.handleGlobalKeydown);
  },
  beforeUnmount() {
    document.removeEventListener("keydown", this.handleGlobalKeydown);
  },
  watch: {
    activeTab(tabId) {
      usePlayerStore().setActiveAppTab(NEXO_TAB_STORAGE_KEY, tabId);
    },
    showBudgetAiForm(val) {
      if (val) {
        this.scrollToBottomOfChat();
      }
    },
  },
};
</script>

<style scoped>
.nexo-shell {
  container-type: inline-size;
  container-name: nexo-shell;
  flex: 1 1 0%;
  height: 100%;
  min-height: 0;
  color: var(--text-primary);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  overflow: hidden;
}
.panel-title,
.inline-actions,
.modal-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.panel-title h3 {
  margin: 0;
}

.empty-line,
.modal-help,
.panel-title span {
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
}

.primary-action,
.text-btn,
.icon-btn {
  border: none;
  cursor: pointer;
  color: var(--text-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 40px;
  border-radius: var(--radius-sm);
  font-weight: 600;
  transition:
    transform var(--transition-fast),
    background var(--transition-fast),
    box-shadow var(--transition-fast),
    filter var(--transition-fast);
}

.primary-action {
  background: var(--deep-blue-gradient-right);
  color: var(--white);
  padding: 0 var(--space-4);
}

.primary-action:hover {
  transform: translateY(-1px);
  filter: brightness(1.08);
}

.primary-action:active,
.text-btn:active,
.icon-btn:active,
.segmented button:active {
  transform: scale(0.97);
}

.primary-action.compact {
  min-height: 36px;
}

.text-btn {
  background: transparent;
  padding: 0 var(--space-3);
}

.text-btn:hover,
.icon-btn:hover {
  background: var(--dark-yellow-2);
}

.icon-btn {
  width: 40px;
  background: var(--surface-2);
  color: var(--text-primary);
}

.icon-btn.small {
  width: 34px;
  min-height: 34px;
}

.icon-btn.danger:hover {
  background: var(--red-high);
  color: var(--red);
}

button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.tab-viewport {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  position: relative;
  width: 100%;
}

.tabs-track {
  display: flex;
  height: 100%;
  will-change: transform;
  transition: transform 0.28s cubic-bezier(0.2, 0.9, 0.25, 1);
}

.tabs-track.is-initial-loading {
  visibility: hidden;
}

.tab-skeleton {
  position: absolute;
  inset: 0;
  z-index: 1;
  padding: var(--space-1) var(--space-2) var(--space-5) 0;
  pointer-events: none;
}

.tab-pane {
  height: 100%;
  min-width: 0;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  padding: var(--space-1) var(--space-2) var(--space-5) 0;
  box-sizing: border-box;
  flex-shrink: 0;
}

.panel,
.budget-row {
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  transition:
    background var(--transition-base),
    border-color var(--transition-base);
}

.panel {
  padding: var(--space-5);
  min-height: 0;
}

.panel-title {
  margin-bottom: var(--space-5);
  align-items: flex-start;
  flex-wrap: wrap;
}

.panel-title > div {
  display: grid;
  gap: var(--space-1);
}

.inline-actions {
  display: flex !important;
  gap: var(--space-3) !important;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.budget-groups,
.budget-child-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.budget-row,
.row-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

.budget-panel {
  display: grid;
  gap: var(--space-4);
  overflow: visible;
}

.budget-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.budget-summary-card {
  min-height: 76px;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-card);
  transition: background var(--transition-base), transform var(--transition-fast);
}

.budget-summary-card:hover {
  background: var(--surface-1);
}

.budget-summary-card .summary-icon {
  width: 44px;
  height: 44px;
  min-width: 44px;
  border-radius: var(--radius-sm);
  display: grid;
  place-items: center;
  background: rgba(31, 39, 76, 0.1);
  font-size: 1.05rem;
  flex-shrink: 0;
}

.budget-summary-card.income .summary-icon {
  color: #2e9b62;
  background: rgba(46, 155, 98, 0.13);
}

.budget-summary-card.expense .summary-icon {
  color: var(--red);
  background: rgba(208, 57, 57, 0.12);
}

.budget-summary-card.balance .summary-icon {
  color: #008fa3;
  background: rgba(0, 143, 163, 0.12);
}

.budget-summary-card.unplanned .summary-icon {
  color: #b77900;
  background: rgba(183, 121, 0, 0.13);
}

.budget-summary-card div {
  display: grid;
  gap: var(--space-1);
  min-width: 0;
}

.budget-summary-card small,
.budget-child-head span {
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.budget-summary-card strong {
  font-size: var(--fontsize-sm);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.budget-command-bar {
  display: grid;
  grid-template-columns: minmax(180px, 220px) minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-card);
}

.budget-month-picker {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  height: 42px;
  min-height: 42px;
  box-sizing: border-box;
  border-radius: var(--radius-sm);
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  padding: 0 var(--space-3);
  transition: background var(--transition-base), border-color var(--transition-fast), box-shadow var(--transition-fast);
  cursor: pointer;
}

.budget-month-picker:focus-within {
  border-color: var(--deep-blue);
  background: var(--surface-0);
  box-shadow: 0 0 0 3px rgba(53, 90, 253, 0.14);
}

.budget-month-picker svg {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.budget-month-picker input {
  min-width: 0;
  width: 100%;
  height: 100%;
  border: none;
  outline: none;
  box-shadow: none;
  background: transparent;
  color: var(--text-primary);
  font-size: var(--fontsize-xs);
  font-weight: 600;
  font-family: inherit;
  padding: 0;
  cursor: pointer;
}

.budget-inline-ai {
  display: flex;
  align-items: stretch;
  height: 42px;
  min-height: 42px;
  box-sizing: border-box;
  border-radius: var(--radius-sm);
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  padding: 0;
  transition: background var(--transition-base), border-color var(--transition-fast), box-shadow var(--transition-fast);
  overflow: hidden;
}

.budget-inline-ai:focus-within {
  border-color: var(--ai-accent, #7059f6);
  background: var(--surface-0);
  box-shadow: 0 0 0 3px rgba(112, 89, 246, 0.14);
}

.budget-inline-ai .ai-input-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0 var(--space-3);
}

.budget-inline-ai .ai-field-icon {
  color: var(--ai-accent, #7059f6);
  font-size: 0.95rem;
  flex-shrink: 0;
}

.budget-inline-ai input {
  min-width: 0;
  width: 100%;
  height: 100%;
  border: none;
  outline: none;
  box-shadow: none;
  background: transparent;
  color: var(--text-primary);
  font-size: var(--fontsize-xs);
  font-family: inherit;
  padding: 0;
  box-sizing: border-box;
}

.budget-inline-ai input::placeholder {
  color: var(--text-muted);
}

.budget-inline-ai .ai-actions {
  display: flex;
  align-items: stretch;
  flex-shrink: 0;
}

.budget-inline-ai .ai-run-btn {
  height: 100%;
  border: none;
  border-radius: 0;
  background: var(--deep-blue-gradient-right);
  color: var(--white);
  padding: 0 var(--space-3);
  cursor: pointer;
  font-weight: 700;
  font-size: var(--fontsize-xs);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  transition: filter var(--transition-fast);
  white-space: nowrap;
}

.budget-inline-ai .ai-run-btn:hover:not(:disabled) {
  filter: brightness(1.15);
}

.budget-inline-ai .ai-run-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.budget-inline-ai .ai-expand-btn {
  height: 100%;
  border: none;
  border-left: 1px solid var(--glass-border);
  border-radius: 0;
  background: var(--surface-2);
  color: var(--text-secondary);
  padding: 0 var(--space-3);
  cursor: pointer;
  font-weight: 600;
  font-size: var(--fontsize-xs);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  transition: background var(--transition-fast), color var(--transition-fast);
  white-space: nowrap;
}

.budget-inline-ai .ai-expand-btn:hover:not(:disabled) {
  background: var(--surface-3);
  color: var(--text-primary);
}

.budget-inline-ai .ai-expand-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.budget-save-btn {
  height: 42px;
  min-height: 42px;
  box-sizing: border-box;
  padding: 0 var(--space-4);
  font-size: var(--fontsize-xs);
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  white-space: nowrap;
}

.budget-group {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  background: var(--surface-0);
  border: 1px solid var(--budget-macro-border, var(--glass-border));
  box-shadow: var(--shadow-card);
  overflow: visible;
  transition: background var(--transition-base), border-color var(--transition-fast);
}

.budget-group-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto 42px;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  background: var(--budget-macro-soft, var(--surface-1));
}

.budget-group-title {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.budget-group-title > svg {
  color: var(--budget-macro-color, var(--gray-100));
  font-size: 1.1rem;
  flex-shrink: 0;
}

.budget-group-totals {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.budget-group-totals .total-pill {
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: var(--surface-0);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-xs, 4px);
  border: 1px solid var(--glass-border);
  text-align: right;
  min-width: 80px;
}

.budget-group-totals .total-pill small {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
  white-space: nowrap;
}

.budget-group-totals .total-pill strong {
  font-size: var(--fontsize-xs);
  font-weight: 700;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.budget-group-header .icon-btn.danger,
.budget-child-row .icon-btn.danger {
  width: 42px;
  height: 42px;
  min-height: 42px;
  min-width: 42px;
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  flex-shrink: 0;
}

.budget-macro-plan {
  display: grid;
  grid-template-columns: minmax(0, 320px) minmax(0, 1fr);
  gap: var(--space-4);
  align-items: end;
  padding: var(--space-2) 0 var(--space-3);
}

.budget-child-head {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) 160px minmax(180px, 1fr) 42px;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  align-items: center;
}

.budget-empty-items {
  padding: var(--space-3);
  text-align: center;
  color: var(--text-muted);
  font-size: var(--fontsize-xs);
  background: var(--surface-1);
  border-radius: var(--radius-sm);
  border: 1px dashed var(--glass-border);
}

.budget-child-row {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) 160px minmax(180px, 1fr) 42px;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  align-items: center;
  transition: background var(--transition-base), border-color var(--transition-fast);
}

.budget-child-row:hover {
  border-color: rgba(53, 90, 253, 0.28);
}

.mobile-field-label {
  display: none;
}

.budget-labeled-control {
  display: grid;
  gap: var(--space-1);
  min-width: 0;
}

.budget-labeled-control span {
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
  font-weight: 600;
}

.plain-control {
  height: 42px;
  min-height: 42px;
  box-sizing: border-box;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  background: var(--surface-0);
  color: var(--text-primary);
  padding: 0 var(--space-3);
  box-shadow: none;
  outline: none;
  font-size: var(--fontsize-xs);
  font-family: inherit;
  transition:
    border-color var(--transition-fast),
    background var(--transition-base),
    box-shadow var(--transition-fast);
}

.plain-control:focus {
  border-color: var(--deep-blue);
  background: var(--surface-1);
  box-shadow: 0 0 0 3px rgba(53, 90, 253, 0.14);
}

.money-control {
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.budget-progress {
  display: grid;
  gap: var(--space-1);
  min-width: 0;
}

.budget-progress .progress-info {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
  min-width: 0;
}

.budget-progress .progress-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-secondary);
  letter-spacing: 0.03em;
}

.budget-progress .progress-values {
  font-size: var(--fontsize-xs);
  font-weight: 600;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.budget-progress .progress-percentage {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-secondary);
  margin-left: 2px;
}

.budget-progress .progress-track {
  width: 100%;
  height: 8px;
  background: var(--surface-2);
  border-radius: var(--radius-pill, 999px);
  overflow: hidden;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.08);
}

.budget-progress.macro-progress .progress-track {
  height: 10px;
}

.budget-progress .progress-fill {
  display: block;
  height: 100%;
  border-radius: var(--radius-pill, 999px);
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-width: 0;
  max-width: 100%;
}

.budget-row-enter-active,
.budget-row-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.budget-row-enter-from {
  opacity: 0;
  transform: translateY(-8px) scale(0.99);
}

.budget-row-leave-to {
  opacity: 0;
  transform: translateX(12px) scale(0.98);
}

.budget-row-move {
  transition: transform 0.22s ease;
}

.budget-add-item-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  width: 100%;
  height: 40px;
  min-height: 40px;
  margin-top: var(--space-2);
  border: 1px dashed var(--glass-border);
  border-radius: var(--radius-sm);
  background: var(--surface-1);
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
  font-weight: 600;
  cursor: pointer;
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast),
    transform var(--transition-fast);
}

.budget-add-item-btn:hover {
  background: var(--surface-2);
  color: var(--deep-blue);
  border-color: var(--deep-blue);
  transform: translateY(-1px);
}

.budget-add-macro {
  min-height: 48px;
  width: 100%;
  border: 1.5px dashed var(--glass-border);
  border-radius: var(--radius-md);
  background: var(--surface-1);
  color: var(--text-secondary);
  cursor: pointer;
  font-weight: 600;
  font-size: var(--fontsize-xs);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  transition:
    background var(--transition-fast),
    color var(--transition-fast),
    border-color var(--transition-fast),
    transform var(--transition-fast);
}

.budget-add-macro:hover {
  background: var(--surface-2);
  color: var(--deep-blue);
  border-color: var(--deep-blue);
  transform: translateY(-1px);
}

.budget-ai-modal {
  width: min(820px, 94vw);
  max-height: min(760px, 92vh);
}

.budget-ai-modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
}

.budget-ai-modal-header h3 {
  margin: 0;
}

.budget-ai-modal-header > span {
  flex: 0 0 auto;
  border-radius: 999px;
  background: rgba(31, 39, 76, 0.08);
  color: var(--gray-100);
  font-size: var(--fontsize-xs);
  font-weight: 800;
  padding: var(--space-2) var(--space-3);
}

.budget-ai-chat {
  min-height: 180px;
  max-height: 260px;
  display: grid;
  align-content: start;
  gap: var(--space-3);
  overflow-y: auto;
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  transition: background var(--transition-base);
}

.budget-ai-message {
  max-width: 78%;
  display: grid;
  gap: var(--space-1);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  transition: background var(--transition-base);
}

.budget-ai-message.user {
  justify-self: end;
  background: var(--surface-2);
}

.budget-ai-message strong,
.budget-ai-message p {
  margin: 0;
}

.budget-ai-message p {
  white-space: pre-wrap;
  line-height: 1.45;
}

.nexo-form-body {
  --nexo-form-gap: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--nexo-form-gap);
}

/* rotulo -> controle */
.nexo-form-body .nexo-field.static-label,
.nexo-form-body .field-caption,
.nexo-form-body .icon-picker {
  gap: var(--space-3);
}

.nexo-form-body .form-grid {
  gap: var(--nexo-form-gap);
}

.nexo-form-body .icon-picker > div {
  gap: var(--space-3);
}

/* a nota explica o campo logo acima: fica perto dele, nao no meio do respiro entre campos */
.nexo-form-body .field-note.compact {
  margin-top: calc(var(--space-3) - var(--nexo-form-gap));
}

.nexo-form-body .modal-actions {
  margin-top: var(--space-3);
}

.modal-help {
  margin: 0;
}

.nexo-field {
  margin: 0;
  min-width: 0;
}

.nexo-field input,
.nexo-field select,
.nexo-field textarea {
  width: 100%;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  box-shadow: none !important;
  background: var(--surface-1);
  color: var(--text-primary);
  padding: 0 var(--space-4) !important;
  outline: none;
  transition:
    border-color var(--transition-fast),
    background var(--transition-base);
}

.nexo-field input:focus,
.nexo-field select:focus,
.nexo-field textarea:focus {
  border-color: var(--deep-blue);
  box-shadow: 0 0 0 3px rgba(31, 39, 76, 0.08) !important;
}

.nexo-field input,
.nexo-field select {
  height: 42px !important;
  min-height: 42px !important;
  font-size: var(--fontsize-sx, 0.875rem);
}

.nexo-field textarea {
  min-height: 130px;
  padding: var(--space-3) var(--space-4) !important;
  resize: vertical;
}

.nexo-field label {
  color: var(--black);
}

[data-theme="dark"] .nexo-field label {
  color: var(--gray-400);
}

.nexo-field.static-label {
  display: grid;
  gap: var(--space-1);
}

.nexo-field.static-label label,
.field-caption > span,
.icon-picker > span {
  position: static;
  transform: none;
  font-size: var(--fontsize-xs);
  color: var(--text-secondary);
  font-weight: 600;
  padding-left: var(--space-1);
}

.field-caption,
.icon-picker {
  display: grid;
  gap: var(--space-2);
}

.field-note {
  color: var(--text-secondary);
  font-size: 0.72rem;
  padding-left: var(--space-1);
  line-height: 1.35;
  display: inline-flex;
  align-items: flex-start;
  gap: var(--space-2);
}

.field-note.compact {
  margin-top: calc(var(--space-3) * -0.4);
  padding-left: 0;
}

.note-icon {
  margin-top: 0.08rem;
  font-size: 0.7rem;
  opacity: 0.9;
}

.switch-field {
  min-height: 50px;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 0 var(--space-1);
  color: var(--text-primary);
}

.switch-field span {
  font-size: var(--fontsize-sm);
  line-height: 1.4;
}

.color-field input {
  padding: var(--space-2) var(--space-3) !important;
}

.category-tone-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.04);
}

.tone-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.tone-label-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tone-label {
  font-size: var(--fontsize-xs);
  font-weight: 600;
  color: var(--text-primary);
}

.tone-sublabel {
  font-size: 0.72rem;
  color: var(--text-muted);
}

.current-tone-preview {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast),
    transform var(--transition-fast);
}

.tone-preview-icon {
  font-size: 0.75rem;
}

.tone-preview-hex {
  font-family: monospace;
}

.tone-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.tone-chip {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.4);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  transition:
    transform var(--transition-fast),
    box-shadow var(--transition-fast),
    border-color var(--transition-fast);
  padding: 0;
}

.tone-chip:hover {
  transform: translateY(-2px) scale(1.08);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.25);
  border-color: rgba(255, 255, 255, 0.85);
}

.tone-chip.active {
  border-color: #ffffff;
  transform: scale(1.15);
  box-shadow:
    0 0 0 2px var(--surface-1),
    0 0 0 4px var(--color-info),
    0 4px 10px rgba(0, 0, 0, 0.35);
}

.tone-check-icon {
  font-size: 0.72rem;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8));
  color: #ffffff;
}

.tone-slider-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tone-slider-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.72rem;
  color: var(--text-muted);
}

.tone-slider-title {
  font-weight: 500;
  color: var(--text-secondary);
}

.tone-range-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 10px;
  border-radius: 6px;
  outline: none;
  cursor: pointer;
  border: 1px solid var(--glass-border);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2);
}

.tone-range-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #ffffff;
  border: 2px solid var(--color-info);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
  cursor: grab;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}

.tone-range-slider::-webkit-slider-thumb:active {
  cursor: grabbing;
  transform: scale(1.2);
}

.tone-range-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #ffffff;
  border: 2px solid var(--color-info);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
  cursor: grab;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}

.tone-range-slider::-moz-range-thumb:active {
  cursor: grabbing;
  transform: scale(1.2);
}

.icon-picker > div {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
  gap: var(--space-2);
}

.icon-choice {
  height: 40px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  background: var(--surface-1);
  color: var(--text-muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
  transition:
    transform var(--transition-fast),
    background var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.icon-choice:hover {
  background: var(--surface-2);
  color: var(--text-primary);
  border-color: var(--gray-400);
  transform: translateY(-1px);
}

.icon-choice.active {
  background: var(--color-info);
  border-color: var(--color-info);
  color: #ffffff !important;
  box-shadow: 0 0 0 2px var(--surface-1), 0 0 0 4px var(--color-info), 0 4px 12px rgba(53, 90, 253, 0.35);
  transform: scale(1.05);
}

.icon-choice.active:hover {
  background: var(--color-info);
  color: #ffffff !important;
  border-color: var(--color-info);
  filter: brightness(1.08);
}

.icon-choice:active {
  transform: scale(0.96);
}

.segmented {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
  padding: var(--space-2);
  background: var(--surface-2);
  border-radius: var(--radius-sm);
}

.segmented button {
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  height: 38px;
  cursor: pointer;
  font-weight: 600;
  transition:
    transform var(--transition-fast),
    background var(--transition-fast),
    box-shadow var(--transition-fast);
}

.segmented button:hover,
.segmented button.active {
  background: var(--surface-0);
  box-shadow: var(--shadow-card);
  color: var(--text-primary);
}

.segmented .expense-toggle.active {
  color: var(--red);
  background: rgba(255, 230, 230, 0.95);
}

.segmented .income-toggle.active {
  color: #2e9b62;
  background: rgba(225, 247, 233, 0.95);
}

.danger-action {
  background: linear-gradient(135deg, var(--red), #b42525);
}

.confirm-modal p {
  margin: 0;
  color: var(--gray-100);
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
  align-items: start;
}

/* Animação dos modais do Nexo - usa a mesma do SideModal global (floating-modal) */
/* Definida em SideModal.vue e main.css, reutilizada aqui sem redeclaração */

@container (max-width: 820px) {
  .budget-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-2);
  }

  .budget-summary-card {
    min-height: 64px;
    padding: var(--space-2) var(--space-3);
    gap: var(--space-3);
  }

  .budget-summary-card .summary-icon {
    width: 38px;
    height: 38px;
    min-width: 38px;
    font-size: 0.95rem;
  }

  .budget-command-bar {
    grid-template-columns: 1fr auto;
    gap: var(--space-2);
    padding: var(--space-3);
  }

  .budget-month-picker {
    grid-column: 1;
    width: 100%;
  }

  .budget-save-btn {
    grid-column: 2;
  }

  .budget-inline-ai {
    grid-column: 1 / -1;
    width: 100%;
  }

  .budget-macro-plan {
    grid-template-columns: 1fr;
    gap: var(--space-2);
  }

  .budget-child-head {
    display: none;
  }

  .mobile-field-label {
    display: block;
    color: var(--text-secondary);
    font-size: 0.72rem;
    font-weight: 600;
  }

  .budget-group-header {
    grid-template-columns: 1fr 42px;
    gap: var(--space-2);
    padding: var(--space-3);
  }

  .budget-group-title {
    grid-column: 1;
  }

  .budget-group-header .icon-btn.danger {
    grid-column: 2;
    width: 42px;
    height: 42px;
  }

  .budget-group-totals {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-2);
    width: 100%;
    border-top: 1px solid var(--glass-border);
    padding-top: var(--space-2);
    margin-top: var(--space-1);
  }

  .budget-group-totals .total-pill {
    text-align: center;
    padding: var(--space-1) var(--space-2);
    min-width: 0;
  }

  .budget-child-row {
    grid-template-columns: 1fr 42px;
    gap: var(--space-2);
    padding: var(--space-3);
  }

  .budget-child-row .item-category {
    grid-column: 1 / -1;
  }

  .budget-child-row .item-amount {
    grid-column: 1;
  }

  .budget-child-row .item-delete-btn {
    grid-column: 2;
    align-self: end;
    width: 42px;
    height: 42px;
  }

  .budget-child-row .item-progress {
    grid-column: 1 / -1;
    margin-top: var(--space-1);
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .panel {
    padding: var(--space-4);
  }

  .budget-ai-modal-header {
    display: grid;
    gap: var(--space-2);
  }

  .budget-ai-message {
    max-width: 100%;
  }

  .tab-pane {
    padding: var(--space-1) 0 var(--space-4) 0;
  }
}

@container (max-width: 600px) {
  .nexo-shell {
    gap: var(--space-2);
  }

  .budget-command-bar {
    padding: var(--space-2);
  }

  .budget-add-macro {
    min-height: 44px;
    font-size: var(--fontsize-xs);
  }
}

@container (max-width: 480px) {
  .tab-pane {
    padding: var(--space-1) var(--space-1) var(--space-4) var(--space-1);
  }

  .budget-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-2);
  }

  .budget-summary-card {
    min-height: 58px;
    padding: var(--space-2);
    gap: var(--space-2);
  }

  .budget-summary-card .summary-icon {
    width: 34px;
    height: 34px;
    min-width: 34px;
    font-size: 0.85rem;
  }

  .budget-summary-card small {
    font-size: 0.65rem;
  }

  .budget-summary-card strong {
    font-size: var(--fontsize-xs);
  }

  .budget-inline-ai .btn-text {
    display: none;
  }

  .budget-group {
    padding: var(--space-3);
    gap: var(--space-2);
  }

  .budget-group-header {
    padding: var(--space-2);
  }

  .budget-child-row {
    padding: var(--space-2);
  }

  .budget-group-totals {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-1);
  }

  .budget-group-totals .total-pill {
    padding: 3px 4px;
  }

  .budget-group-totals .total-pill small {
    font-size: 0.6rem;
  }

  .budget-group-totals .total-pill strong {
    font-size: 0.75rem;
  }

  .modal-actions {
    flex-direction: column-reverse;
    width: 100%;
    gap: var(--space-2);
  }

  .modal-actions button {
    width: 100%;
    min-height: 44px;
  }

  .budget-ai-modal {
    width: min(820px, 96vw);
    max-height: min(760px, 90vh);
  }
}

@media (max-width: 820px) {
  .budget-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-2);
  }

  .budget-summary-card {
    min-height: 64px;
    padding: var(--space-2) var(--space-3);
    gap: var(--space-3);
  }

  .budget-summary-card .summary-icon {
    width: 38px;
    height: 38px;
    min-width: 38px;
    font-size: 0.95rem;
  }

  .budget-command-bar {
    grid-template-columns: 1fr auto;
    gap: var(--space-2);
    padding: var(--space-3);
  }

  .budget-month-picker {
    grid-column: 1;
    width: 100%;
  }

  .budget-save-btn {
    grid-column: 2;
  }

  .budget-inline-ai {
    grid-column: 1 / -1;
    width: 100%;
  }

  .budget-macro-plan {
    grid-template-columns: 1fr;
    gap: var(--space-2);
  }

  .budget-child-head {
    display: none;
  }

  .mobile-field-label {
    display: block;
    color: var(--text-secondary);
    font-size: 0.72rem;
    font-weight: 600;
  }

  .budget-group-header {
    grid-template-columns: 1fr 42px;
    gap: var(--space-2);
    padding: var(--space-3);
  }

  .budget-group-title {
    grid-column: 1;
  }

  .budget-group-header .icon-btn.danger {
    grid-column: 2;
    width: 42px;
    height: 42px;
  }

  .budget-group-totals {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-2);
    width: 100%;
    border-top: 1px solid var(--glass-border);
    padding-top: var(--space-2);
    margin-top: var(--space-1);
  }

  .budget-group-totals .total-pill {
    text-align: center;
    padding: var(--space-1) var(--space-2);
    min-width: 0;
  }

  .budget-child-row {
    grid-template-columns: 1fr 42px;
    gap: var(--space-2);
    padding: var(--space-3);
  }

  .budget-child-row .item-category {
    grid-column: 1 / -1;
  }

  .budget-child-row .item-amount {
    grid-column: 1;
  }

  .budget-child-row .item-delete-btn {
    grid-column: 2;
    align-self: end;
    width: 42px;
    height: 42px;
  }

  .budget-child-row .item-progress {
    grid-column: 1 / -1;
    margin-top: var(--space-1);
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .panel {
    padding: var(--space-4);
  }

  .budget-ai-modal-header {
    display: grid;
    gap: var(--space-2);
  }

  .budget-ai-message {
    max-width: 100%;
  }

  .tab-pane {
    padding: var(--space-1) 0 var(--space-4) 0;
  }
}

@media (max-width: 600px) {
  .nexo-shell {
    gap: var(--space-2);
  }

  .budget-command-bar {
    padding: var(--space-2);
  }

  .budget-add-macro {
    min-height: 44px;
    font-size: var(--fontsize-xs);
  }
}

@media (max-width: 480px) {
  .tab-pane {
    padding: var(--space-1) var(--space-1) var(--space-4) var(--space-1);
  }

  .budget-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-2);
  }

  .budget-summary-card {
    min-height: 58px;
    padding: var(--space-2);
    gap: var(--space-2);
  }

  .budget-summary-card .summary-icon {
    width: 34px;
    height: 34px;
    min-width: 34px;
    font-size: 0.85rem;
  }

  .budget-summary-card small {
    font-size: 0.65rem;
  }

  .budget-summary-card strong {
    font-size: var(--fontsize-xs);
  }

  .budget-inline-ai .btn-text {
    display: none;
  }

  .budget-group {
    padding: var(--space-3);
    gap: var(--space-2);
  }

  .budget-group-header {
    padding: var(--space-2);
  }

  .budget-child-row {
    padding: var(--space-2);
  }

  .budget-group-totals {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-1);
  }

  .budget-group-totals .total-pill {
    padding: 3px 4px;
  }

  .budget-group-totals .total-pill small {
    font-size: 0.6rem;
  }

  .budget-group-totals .total-pill strong {
    font-size: 0.75rem;
  }

  .modal-actions {
    flex-direction: column-reverse;
    width: 100%;
    gap: var(--space-2);
  }

  .modal-actions button {
    width: 100%;
    min-height: 44px;
  }

  .budget-ai-modal {
    width: min(820px, 96vw);
    max-height: min(760px, 90vh);
  }
}
</style>
