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
    <NexoTabs
      :tabs="tabs"
      :active-tab="activeTab"
      :is-paid-plan="isPaidPlan"
      @update:activeTab="setActiveTab"
    />

    <div class="tab-viewport">
      <div class="tabs-track" :style="trackStyle">
        <section
          v-for="tab in tabs"
          :key="tab.id"
          class="tab-pane custom-scrollbar"
          :style="paneStyle"
        >
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
              :csv-import-rows="csvImportRows"
              :csv-import-totals="csvImportTotals"
              :transaction-search="transactionSearch"
              :transaction-category-filter="transactionCategoryFilter"
              :transactions="filteredTransactions"
              :categories="categories"
              :categorizing-ids="categorizingIds"
              :format-money="money"
              :format-signed-money="signedMoney"
              :format-short-date="shortDate"
              @upgrade="showPlanModal = true"
              @auto-categorize="autoCategorize"
              @csv-file-change="handleCsvFileChange"
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
              <label class="budget-month-picker">
                <font-awesome-icon icon="calendar" />
                <input type="month" v-model="selectedMonth" @change="reloadAll" />
              </label>
              <label class="budget-inline-ai">
                <span>Pedido rápido para IA</span>
                <input
                  v-model="budgetAiInlinePrompt"
                  type="text"
                  placeholder='IA: "Reduzir 10% em lazer"'
                  @keyup.enter="runInlineBudgetAi"
                />
                <button
                  type="button"
                  :disabled="!canUseAi || loadingAi"
                  @click.prevent="runInlineBudgetAi"
                >
                  <font-awesome-icon
                    :icon="loadingAi ? 'circle-notch' : 'wand-magic-sparkles'"
                    :spin="loadingAi"
                  />
                  IA
                </button>
                <button
                  type="button"
                  class="ghost-inline-button"
                  :disabled="!canUseAi"
                  @click.prevent="openBudgetPlanModal"
                >
                  Expandir
                </button>
              </label>
              <button class="primary-action compact" @click="saveBudgets">
                <font-awesome-icon icon="floppy-disk" />
                Salvar
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
                      <div>
                        <small>Planejado</small>
                        <strong>{{ money(group.planned_amount || 0) }}</strong>
                      </div>
                      <div>
                        <small>Executado</small>
                        <strong>{{ money(group.actual_amount || 0) }}</strong>
                      </div>
                      <div>
                        <small>Impacto total</small>
                        <strong>{{ budgetProgress(group, 'planned_amount') }}%</strong>
                      </div>
                    </div>
                    <button
                      class="icon-btn small danger"
                      @click="removeBudgetGroup(group)"
                      title="Remover macro"
                    >
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
                      <span
                        >{{ money(group.actual_amount || 0) }} /
                        {{ money(group.planned_amount || 0) }}</span
                      >
                      <div>
                        <i :style="{ width: budgetProgress(group, 'planned_amount') + '%' }"></i>
                      </div>
                    </div>
                  </div>

                  <div class="budget-child-head">
                    <span>Subcategoria</span>
                    <span>Meta (R$)</span>
                    <span>Progresso executado</span>
                    <span></span>
                  </div>

                  <TransitionGroup name="budget-row" tag="div" class="budget-child-list">
                    <article v-for="item in group.items" :key="item._key" class="budget-child-row">
                      <label class="budget-labeled-control">
                        <span>Subcategoria</span>
                        <CategoryCombo
                          v-model="item.category_id"
                          :categories="availableCategoriesForMacro(group, item)"
                          placeholder="Selecionar categoria"
                          @change="syncBudgetItemType(item)"
                        />
                      </label>
                      <label class="budget-labeled-control">
                        <span>Limite da categoria</span>
                        <input
                          class="plain-control money-control"
                          type="text"
                          inputmode="numeric"
                          :value="item.amount_display"
                          @input="updateBudgetAmount($event, item)"
                        />
                      </label>
                      <div class="budget-progress">
                        <span
                          >{{ money(item.actual_amount || 0) }} /
                          {{ money(item.amount || 0) }}</span
                        >
                        <div>
                          <i :style="{ width: budgetProgress(item) + '%' }"></i>
                        </div>
                      </div>
                      <button
                        class="icon-btn small danger"
                        @click="removeBudgetItem(group, item)"
                        title="Remover categoria"
                      >
                        <font-awesome-icon icon="trash" />
                      </button>
                    </article>
                  </TransitionGroup>

                  <button class="text-btn add-row" @click="addBudgetItem(group)">
                    <font-awesome-icon icon="plus" />
                    Adicionar à {{ group.macro_category || 'macro categoria' }}
                  </button>
                </section>
              </TransitionGroup>

              <button class="budget-add-macro" @click="addBudgetGroup">
                <font-awesome-icon icon="layer-group" />
                Nova macro categoria
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
              @delete-goal="deleteInvestmentGoal"
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
      @close="closeTransactionForm"
      @save="saveTransaction"
      @update-amount="updateTransactionAmount"
      @update-field="updateTransactionFormField"
    />

    <Transition name="slide-over-root">
      <div v-if="showCategoryForm" class="modal-wrapper-fixed">
        <div class="modal-overlay" @click.self="closeCategoryForm"></div>
        <form class="modal-content nexo-modal glass" @submit.prevent="saveCategoryForm">
          <h3>{{ categoryForm.id ? 'Editar categoria' : 'Nova categoria' }}</h3>
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
              <select id="category-type" v-model="categoryForm.type" :disabled="isCategoryFormInvestment" required>
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
              />
            </div>
          </div>
          <small v-if="isCategoryFormInvestment" class="field-note compact">
            <font-awesome-icon icon="circle-question" class="note-icon" />
            <span>Categorias de investimento são sempre do tipo saída.</span>
          </small>
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
            <button type="submit" class="primary-action">Salvar</button>
          </div>
        </form>
      </div>
    </Transition>

    <Transition name="slide-over-root">
      <div v-if="showMacroForm" class="modal-wrapper-fixed">
        <div class="modal-overlay" @click.self="showMacroForm = false"></div>
        <form class="modal-content nexo-modal glass" @submit.prevent="saveMacroForm">
          <h3>{{ macroForm.id ? 'Editar macro categoria' : 'Nova macro categoria' }}</h3>
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
            <button type="submit" class="primary-action">Salvar</button>
          </div>
        </form>
      </div>
    </Transition>

    <Transition name="slide-over-root">
      <div v-if="showBudgetAiForm" class="modal-wrapper-fixed">
        <div class="modal-overlay" @click.self="showBudgetAiForm = false"></div>
        <form
          class="modal-content nexo-modal budget-ai-modal glass"
          @submit.prevent="submitBudgetPlan"
        >
          <div class="budget-ai-modal-header">
            <div>
              <h3>Planejamento com IA</h3>
              <p class="modal-help">
                Descreva o objetivo do mês. Exemplo: reduzir lazer em 10% e reservar mais para
                impostos.
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
              <strong>{{ message.role === 'assistant' ? 'IA' : 'Você' }}</strong>
              <p>{{ message.content }}</p>
            </article>
            <p v-if="budgetAiConversation.length === 0" class="empty-line">
              Nenhuma interação registrada para este mês.
            </p>
          </div>

          <div class="nexo-field static-label textarea">
            <label for="budget-ai-prompt">Mensagem para o planejamento</label>
            <textarea
              id="budget-ai-prompt"
              v-model="budgetAiPrompt"
              placeholder=""
              required
            ></textarea>
          </div>
          <div class="modal-actions">
            <button type="button" class="text-btn" @click="showBudgetAiForm = false">
              Cancelar
            </button>
            <button type="submit" class="primary-action" :disabled="loadingAi">
              <font-awesome-icon v-if="loadingAi" icon="circle-notch" spin />
              Gerar plano
            </button>
          </div>
        </form>
      </div>
    </Transition>

    <Transition name="slide-over-root">
      <div v-if="confirmDelete.visible" class="modal-wrapper-fixed">
        <div class="modal-overlay" @click.self="closeDeleteConfirm"></div>
        <div class="modal-content nexo-modal confirm-modal glass">
          <h3>Confirmar exclusão</h3>
          <p>{{ confirmDelete.message }}</p>
          <div class="modal-actions">
            <button type="button" class="text-btn" @click="closeDeleteConfirm">Cancelar</button>
            <button type="button" class="primary-action danger-action" @click="confirmDeleteAction">
              Excluir
            </button>
          </div>
        </div>
      </div>
    </Transition>

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
import { mapState } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { financeService } from '@/services/financeService'
import { getPlanLimits } from '@/services/subscription_plans'
import { db } from '@/db'
import SubscriptionModal from '@/components/SubscriptionModal.vue'
import ConfirmationModal from '@/components/ConfirmationModal.vue'
import FormSwitch from '@/components/FormSwitch.vue'
import CategoryCombo from './CategoryCombo.vue'
import MacroCategoryCombo from './MacroCategoryCombo.vue'
import NexoHeader from './nexo/NexoHeader.vue'
import NexoTabs from './nexo/NexoTabs.vue'
import NexoOverviewTab from './nexo/NexoOverviewTab.vue'
import NexoInvestmentsTab from './nexo/NexoInvestmentsTab.vue'
import NexoTransactionsTab from './nexo/NexoTransactionsTab.vue'
import NexoTransactionModal from './nexo/NexoTransactionModal.vue'
import NexoConnectionsTab from './nexo/NexoConnectionsTab.vue'
import NexoCategoriesTab from './nexo/NexoCategoriesTab.vue'
import NexoAiTab from './nexo/NexoAiTab.vue'

const pluggyWidgetUrl = 'https://cdn.pluggy.ai/pluggy-connect/latest/pluggy-connect.js'
const includePluggySandbox =
  import.meta.env.VITE_PLUGGY_INCLUDE_SANDBOX === 'true' ||
  (!import.meta.env.PROD && import.meta.env.VITE_PLUGGY_INCLUDE_SANDBOX !== 'false')

export default {
  name: 'KademNexo',
  components: {
    SubscriptionModal,
    ConfirmationModal,
    FormSwitch,
    CategoryCombo,
    MacroCategoryCombo,
    NexoHeader,
    NexoTabs,
    NexoOverviewTab,
    NexoInvestmentsTab,
    NexoTransactionsTab,
    NexoTransactionModal,
    NexoConnectionsTab,
    NexoCategoriesTab,
    NexoAiTab,
  },
  data() {
    const today = new Date().toISOString().slice(0, 10)
    return {
      activeTab: 'overview',
      selectedMonth: new Date().toISOString().slice(0, 7),
      loading: false,
      syncingBanks: false,
      loadingAi: false,
      importingCsv: false,
      loadingSchema: false,
      showTransactionForm: false,
      showCategoryForm: false,
      showMacroForm: false,
      showBudgetAiForm: false,
      showPlanModal: false,
      totals: { income: 0, expense: 0, balance: 0 },
      transactions: [],
      recentTransactions: [],
      categories: [],
      macroCategories: [],
      categorySearch: '',
      transactionSearch: '',
      transactionCategoryFilter: '',
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
      investmentRates: [],
      loadingInvestmentRates: false,
      usage: {},
      insights: [],
      budgetAiPrompt: '',
      budgetAiInlinePrompt: '',
      budgetAiConversation: [],
      budgetAiContextSummary: '',
      categoryForm: {
        id: null,
        name: '',
        macro_category: 'Geral',
        macro_color: '#999999',
        type: 'EXPENSE',
        icon: 'tag',
      },
      macroForm: {
        id: null,
        original_id: null,
        name: '',
        color: '#999999',
        is_investment: false,
      },
      confirmDelete: {
        visible: false,
        type: null,
        payload: null,
        message: '',
      },
      confirmationState: {
        show: false,
        message: '',
        confirmText: 'Confirmar',
        description: '',
        action: null,
      },
      categoryIcons: [
        'tag',
        'basket-shopping',
        'house',
        'car',
        'briefcase',
        'money-bill',
        'screwdriver-wrench',
        'utensils',
        'heart-pulse',
        'graduation-cap',
        'plane',
        'receipt',
      ],
      form: {
        id: null,
        type: 'EXPENSE',
        description: '',
        observation: '',
        amount: 0,
        amount_display: '',
        category_id: null,
        transaction_date: today,
      },
      csvImportError: '',
      csvImportFileName: '',
      csvRawRows: [],
      csvImportRows: [],
      csvSkippedRows: 0,
      categorizingAi: false,
      categorizingIds: [],
      tabs: [
        { id: 'overview', label: 'Visão', icon: 'chart-simple' },
        { id: 'transactions', label: 'Movimentos', icon: 'list' },
        { id: 'budget', label: 'Orçamento', icon: 'clipboard' },
        { id: 'investments', label: 'Investimentos', icon: 'money-bill' },
        { id: 'connections', label: 'Conexões', icon: 'link' },
        { id: 'categories', label: 'Categorias', icon: 'layer-group' },
        { id: 'ai', label: 'IA', icon: 'crown', pro: true },
      ],
    }
  },
  computed: {
    ...mapState(useAuthStore, ['user']),
    activeTabIndex() {
      return Math.max(
        0,
        this.tabs.findIndex((tab) => tab.id === this.activeTab),
      )
    },
    trackStyle() {
      const step = 100 / this.tabs.length
      return {
        width: `${this.tabs.length * 100}%`,
        transform: `translateX(-${this.activeTabIndex * step}%)`,
      }
    },
    paneStyle() {
      const size = `${100 / this.tabs.length}%`
      return { width: size, flexBasis: size }
    },
    categoryTargetMacro() {
      return this.findMacroByName(this.categoryForm.macro_category)
    },
    isCategoryFormInvestment() {
      return Boolean(this.categoryTargetMacro?.is_investment)
    },
    limits() {
      return getPlanLimits(this.user.plan_tier || 'free')
    },
    isPaidPlan() {
      return this.user.plan_tier && this.user.plan_tier !== 'free'
    },
    canUseAi() {
      return this.isPaidPlan && Number(this.limits.finance_ai_monthly_credits || 0) > 0
    },
    planLabel() {
      const labels = { free: 'Free', pro: 'Pro', enterprise: 'Enterprise' }
      return labels[this.user.plan_tier] || 'Free'
    },
    aiUsageLabel() {
      if (!this.canUseAi) return 'IA bloqueada'
      return `${this.usage.remaining_credits || this.limits.finance_ai_monthly_credits} créditos IA`
    },
    budgetAiContextLabel() {
      const total = this.budgetAiConversation.length
      if (!total) return 'Sem histórico'
      return `${total} ${total === 1 ? 'interação' : 'interações'} neste mês`
    },
    monthLabel() {
      const [year, month] = this.selectedMonth.split('-').map(Number)
      return new Date(year, month - 1, 1).toLocaleDateString('pt-BR', {
        month: 'long',
        year: 'numeric',
      })
    },
    budgetSummary() {
      const summary = this.budgets.reduce(
        (acc, group) => {
          ;(group.items || []).forEach((item) => {
            const category = this.findCategory(item.category_id)
            const amount = Number(item.amount || 0)
            if ((category?.type || item.type) === 'INCOME') acc.plannedIncome += amount
            else acc.plannedExpense += amount
          })
          return acc
        },
        { plannedIncome: 0, plannedExpense: 0 },
      )

      const plannedBalance = summary.plannedIncome - summary.plannedExpense
      const unplannedExpense = Math.max(
        0,
        Number(this.totals.expense || 0) - summary.plannedExpense,
      )

      return {
        ...summary,
        plannedBalance,
        unplannedExpense,
      }
    },
    csvImportTotals() {
      if (!Array.isArray(this.csvImportRows)) return { income: 0, expense: 0 }
      return this.csvImportRows.reduce(
        (acc, row) => {
          if (!row) return acc
          const amount = Number(row.amount || 0)
          if (row.type === 'INCOME') acc.income += amount
          else acc.expense += amount
          return acc
        },
        { income: 0, expense: 0 },
      )
    },
    filteredTransactions() {
      const normalizedSearch = this.normalize(this.transactionSearch)

      return this.transactions.filter((transaction) => {
        return (
          this.matchesTransactionCategoryFilter(transaction) &&
          this.matchesTransactionSearch(transaction, normalizedSearch)
        )
      })
    },
    filteredCategories() {
      const term = this.normalize(this.categorySearch)
      if (!term) return this.categories
      return this.categories.filter((category) =>
        this.normalize(
          `${category.name} ${category.macro_category} ${this.typeLabel(category.type)}`,
        ).includes(term),
      )
    },
    groupedCategories() {
      const groups = new Map()
      this.macroCategories.forEach((macro) => {
        groups.set(macro?.name, { ...macro, items: [] })
      })

      this.filteredCategories.forEach((category) => {
        const canonicalMacro = this.macroCategories.find(
          (macro) =>
            this.sameId(macro.id, category.macro_category_id) ||
            this.sameId(macro.local_id, category.macro_category_id) ||
            this.sameId(macro.local_key, category.macro_category_id) ||
            this.normalize(macro?.name) === this.normalize(category.macro_category),
        )
        const macroName = canonicalMacro?.name || category.macro_category || 'Geral'
        if (!groups.has(macroName)) {
          groups.set(macroName, {
            ...(canonicalMacro || {}),
            id: canonicalMacro?.id || category.macro_category_id || null,
            name: macroName,
            color: canonicalMacro?.color || category.macro_color || category.color || '#999999',
            is_investment: Boolean(canonicalMacro?.is_investment ?? category.is_investment),
            items: [],
          })
        }
        groups.get(macroName).items.push({
          ...category,
          macro_category: macroName,
          macro_category_id: canonicalMacro?.id || category.macro_category_id,
          macro_color: canonicalMacro?.color || category.macro_color,
          color: canonicalMacro?.color || category.color,
          is_investment: Boolean(canonicalMacro?.is_investment ?? category.is_investment),
        })
      })

      return [...groups.values()]
        .map((group) => ({
          ...group,
          items: group.items.slice().sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
        }))
        .filter((group) => group.items.length > 0 || !this.categorySearch)
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    },
    displayInsights() {
      return this.insights.map((insight) => {
        const title = insight.title || 'Insight'
        const description = insight.description || (typeof insight === 'string' ? insight : '')
        const normalizedTitle = this.normalize(title)
        const normalizedDescription = this.normalize(description)

        if (
          normalizedTitle.includes('sem transacoes') &&
          normalizedDescription.includes('nao ha registros')
        ) {
          return { title: 'Movimentação do mês', description }
        }

        if (normalizedTitle && normalizedTitle === normalizedDescription) {
          return { title, description: '' }
        }

        return { title, description }
      })
    },
  },
  methods: {
    normalize(value) {
      return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
    },
    sameId(left, right) {
      return String(left || '') === String(right || '')
    },
    setActiveTab(tabId) {
      this.activeTab = tabId
      if (tabId === 'transactions') {
        this.loadTransactions()
      }
      if (tabId === 'investments') {
        this.loadInvestments()
        this.loadInvestmentRates()
      }
    },
    money(value) {
      try {
        const num = Number(value || 0)
        return (Number.isFinite(num) ? num : 0).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        })
      } catch {
        return 'R$ 0,00'
      }
    },
    parseMoneyInput(rawValue) {
      const digits = String(rawValue || '').replace(/\D/g, '')
      return Number(digits || 0) / 100
    },
    moneyInput(value) {
      return this.money(value || 0)
    },
    signedMoney(transaction) {
      const prefix = transaction.type === 'EXPENSE' ? '-' : '+'
      return `${prefix} ${this.money(transaction.amount)}`
    },
    shortDate(value) {
      if (!value) return '--'
      try {
        const d = new Date(value)
        if (Number.isNaN(d.getTime())) return '--'
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      } catch {
        return '--'
      }
    },
    typeLabel(type) {
      const labels = { EXPENSE: 'Saída', INCOME: 'Entrada' }
      return labels[type] || 'Não definido'
    },
    budgetProgress(budget, plannedKey = 'amount') {
      const planned = Number(budget[plannedKey] || 0)
      if (!planned) return 0
      return Math.min(100, Math.round((Number(budget.actual_amount || 0) / planned) * 100))
    },
    budgetGroupStyle(group) {
      return {
        '--budget-macro-color': group.macro_color || '#999999',
        '--budget-macro-soft': this.hexToRgba(group.macro_color || '#999999', 0.13),
        '--budget-macro-border': this.hexToRgba(group.macro_color || '#999999', 0.28),
      }
    },
    budgetGroupHeaderStyle(group) {
      return {
        background: this.hexToRgba(group.macro_color || '#999999', 0.12),
        borderColor: this.hexToRgba(group.macro_color || '#999999', 0.22),
      }
    },
    hexToRgba(hex, alpha = 1) {
      const normalized = String(hex || '#999999').replace('#', '')
      const safe =
        normalized.length === 3
          ? normalized
              .split('')
              .map((char) => char + char)
              .join('')
          : normalized.padEnd(6, '9').slice(0, 6)
      const value = Number.parseInt(safe, 16)
      const r = (value >> 16) & 255
      const g = (value >> 8) & 255
      const b = value & 255
      return `rgba(${r}, ${g}, ${b}, ${alpha})`
    },
    budgetAiStorageKey() {
      return `kadem:nexo:budget-ai:${this.user.id || 'local'}:${this.selectedMonth}`
    },
    loadBudgetAiConversation() {
      try {
        const raw = localStorage.getItem(this.budgetAiStorageKey())
        const parsed = raw ? JSON.parse(raw) : {}
        this.budgetAiConversation = Array.isArray(parsed.messages) ? parsed.messages : []
        this.budgetAiContextSummary = parsed.summary || ''
      } catch {
        this.budgetAiConversation = []
        this.budgetAiContextSummary = ''
      }
    },
    saveBudgetAiConversation() {
      const messages = this.budgetAiConversation.slice(-12)
      this.budgetAiConversation = messages
      this.budgetAiContextSummary = messages
        .slice(-6)
        .map((message) => `${message.role === 'assistant' ? 'IA' : 'Você'}: ${message.content}`)
        .join('\n')
      localStorage.setItem(
        this.budgetAiStorageKey(),
        JSON.stringify({ messages, summary: this.budgetAiContextSummary }),
      )
    },
    appendBudgetAiMessage(role, content) {
      this.budgetAiConversation.push({
        id: `${Date.now()}-${Math.random()}`,
        role,
        content,
        created_at: new Date().toISOString(),
      })
      this.saveBudgetAiConversation()
      this.scrollToBottomOfChat()
    },
    async reloadAll() {
      this.loading = true
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
        ])
        this.loadBudgetAiConversation()
      } finally {
        this.loading = false
      }
    },
    async loadDashboard() {
      const { data } = await financeService.getDashboard({ month: this.selectedMonth })
      this.totals = data.totals || { income: 0, expense: 0, balance: 0 }
      this.recentTransactions = data.transactions || data.recent_transactions || []
      this.macroDistribution = data.macro_distribution || []
      this.investmentSummary = {
        ...this.investmentSummary,
        ...data.investment_summary,
      }
    },
    async loadTransactions() {
      const { data } = await financeService.listTransactions({
        month: this.selectedMonth,
        limit: 250,
      })
      this.transactions = data || []
    },
    async loadCategories() {
      const { data } = await financeService.getCategories()
      this.categories = data || []
    },
    async loadMacroCategories() {
      const { data } = await financeService.getMacroCategories()
      this.macroCategories = data || []
    },
    async loadInvestments() {
      const { data } = await financeService.getInvestments({ month: this.selectedMonth })
      this.investmentSummary = data.summary || {
        month_invested: 0,
        month_withdrawn: 0,
        month_net: 0,
        total_invested: 0,
        total_yield: 0,
        total_withdrawn: 0,
        total_adjustments: 0,
        estimated_balance: 0,
      }
      this.investmentMonthlyHistory = data.monthly_history || []
      this.investmentCategoryDistribution = data.category_distribution || []
      this.investmentGoals = data.goals || []
      this.investmentEvents = data.events || []
    },
    async loadInvestmentRates() {
      this.loadingInvestmentRates = true
      try {
        const { data } = await financeService.getInvestmentRates()
        this.investmentRates = data.rates || []
      } finally {
        this.loadingInvestmentRates = false
      }
    },
    async loadBudgets() {
      const { data } = await financeService.getBudgets({ month: this.selectedMonth })
      this.budgets = (data || []).map((group) => this.hydrateBudgetGroup(group))
    },
    hydrateBudgetGroup(group) {
      return {
        ...group,
        _key: group._key || group.macro_category_id || `macro-${Date.now()}-${Math.random()}`,
        macro_category_id: group.macro_category_id || null,
        macro_category: group.macro_category || 'Geral',
        macro_color: group.macro_color || '#999999',
        planned_amount: Number(group.planned_amount || 0),
        planned_amount_display: this.moneyInput(group.planned_amount || 0),
        actual_amount: Number(group.actual_amount || 0),
        items: (group.items || []).map((item) => this.hydrateBudgetItem(item)),
      }
    },
    hydrateBudgetItem(item) {
      const category = this.findCategory(item.category_id)
      return {
        ...item,
        _key: item._key || item.id || `item-${Date.now()}-${Math.random()}`,
        amount: Number(item.amount || 0),
        amount_display: this.moneyInput(item.amount || 0),
        actual_amount: Number(item.actual_amount || 0),
        type: item.type || category?.type || 'EXPENSE',
      }
    },
    async loadConnections() {
      if (!this.isPaidPlan) return
      const { data } = await financeService.getConnections()
      this.connections = data || []
    },
    async loadUsage() {
      if (!this.canUseAi) {
        this.usage = {}
        return
      }
      const { data } = await financeService.getUsage()
      this.usage = data || {}
    },
    async refreshTransactionDrivenViews({ includeTransactions = true } = {}) {
      const loaders = [this.loadDashboard(), this.loadBudgets(), this.loadInvestments()]
      if (includeTransactions) {
        loaders.push(this.loadTransactions())
      }
      await Promise.all(loaders)
    },
    openTransactionForm(transaction = null) {
      if (transaction && typeof transaction.preventDefault === 'function') {
        transaction = null
      }

      const currentTransaction = transaction || {}
      const amount = Number(currentTransaction.amount || 0)
      const type = currentTransaction.type === 'INCOME' ? 'INCOME' : 'EXPENSE'

      this.form = {
        id: currentTransaction.id || currentTransaction.local_id || null,
        type,
        description: currentTransaction.description || '',
        observation: currentTransaction.observation || '',
        amount,
        amount_display: transaction ? this.moneyInput(amount) : '',
        category_id: currentTransaction.category_id || null,
        transaction_date: String(
          currentTransaction.transaction_date || new Date().toISOString().slice(0, 10),
        ).slice(0, 10),
      }
      this.showTransactionForm = true
    },
    closeTransactionForm() {
      this.showTransactionForm = false
    },
    updateTransactionFormField({ field, value }) {
      this.form[field] = value
    },
    updateTransactionAmount(event) {
      const value = this.parseMoneyInput(event.target.value)
      this.form.amount = value
      this.form.amount_display = this.moneyInput(value)
      event.target.value = this.form.amount_display
    },
    async saveTransaction() {
      const payload = {
        ...this.form,
        observation: this.form.observation || null,
        amount: Number(this.form.amount || 0),
      }
      let savedTransaction = null
      if (this.form.id) {
        const { data } = await financeService.updateTransaction(this.form.id, payload)
        savedTransaction = data
      } else {
        const { data } = await financeService.createTransaction(payload)
        savedTransaction = data
      }
      if (savedTransaction) {
        this.upsertTransactionInList(savedTransaction)
      }
      this.closeTransactionForm()
      await this.refreshTransactionDrivenViews()
    },
    resetCsvImport() {
      this.csvImportError = ''
      this.csvImportFileName = ''
      this.csvRawRows = []
      this.csvImportRows = []
      this.csvSkippedRows = 0
      this.loadingSchema = false
    },
    async handleCsvFileChange(event) {
      if (!this.isPaidPlan) {
        this.showPlanModal = true
        return
      }
      const [file] = event.target.files || []
      if (!file) return
      this.csvImportError = ''
      this.csvImportFileName = file.name
      this.csvRawRows = []
      this.csvImportRows = []
      this.loadingSchema = true

      try {
        const text = await file.text()
        const clean = String(text || '')
          .replace(/^\uFEFF/, '')
          .trim()
        const lines = clean.split(/\r\n/).filter((line) => line.trim())
        if (lines.length < 2) {
          throw new Error('O CSV precisa ter cabeçalho e pelo menos uma linha.')
        }

        const header = lines[0]
        const samples = lines.slice(1, 4) // Take up to 3 lines

        // Check local storage cache for this header to save credits and ensure determinism
        const cacheKey = `kadem:nexo:csv-schema:${this.normalizeKey(header)}`
        let schema = null
        try {
          const cached = localStorage.getItem(cacheKey)
          if (cached) {
            schema = JSON.parse(cached)
            console.log('[CSV Import] Reusing cached schema:', schema)
          }
        } catch (err) {
          console.warn('[CSV Import] Failed to read cached schema:', err)
        }

        if (!schema) {
          // Send to backend for schema analysis
          const response = await financeService.analyzeCsvSchema({ header, samples })
          schema = response.data
          if (!schema || !schema.dateColumn || !schema.descriptionColumn || !schema.amountColumn) {
            throw new Error('A IA não conseguiu determinar o esquema de colunas deste CSV.')
          }
          // Save to cache
          try {
            localStorage.setItem(cacheKey, JSON.stringify(schema))
            console.log('[CSV Import] Cached new schema:', schema)
          } catch (err) {
            console.warn('[CSV Import] Failed to cache schema:', err)
          }
        }

        await this.parseCsvWithSchema(lines, schema)
      } catch (error) {
        this.csvImportRows = []
        this.csvImportError =
          error.response.data.message || error.message || 'Não foi possível processar o CSV.'
      } finally {
        this.loadingSchema = false
      }
    },
    cleanCsvCell(val) {
      if (typeof val !== 'string') return ''
      let clean = val.trim()
      // Remove enclosing quotes
      while (
        (clean.startsWith('"') && clean.endsWith('"')) ||
        (clean.startsWith("'") && clean.endsWith("'"))
      ) {
        clean = clean.substring(1, clean.length - 1).trim()
      }
      // Remove any leftover outer quotes or weird trailing quotes
      clean = clean.replace(/^['"]|['"]$/g, '').trim()
      return clean
    },
    normalizeKey(key) {
      return String(key || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .trim()
    },
    async parseCsvWithSchema(lines, schema) {
      const delimiter = schema.delimiter || this.detectCsvDelimiter(lines[0])
      const rawHeaders = this.splitCsvLine(lines[0], delimiter).map((h) => this.cleanCsvCell(h))

      // Find indices of columns
      const dateIdx = rawHeaders.findIndex(
        (h) => this.normalizeKey(h) === this.normalizeKey(schema.dateColumn),
      )
      const descIdx = rawHeaders.findIndex(
        (h) => this.normalizeKey(h) === this.normalizeKey(schema.descriptionColumn),
      )
      const amountIdx = rawHeaders.findIndex(
        (h) => this.normalizeKey(h) === this.normalizeKey(schema.amountColumn),
      )
      const typeIdx = schema.typeColumn
        ? rawHeaders.findIndex((h) => this.normalizeKey(h) === this.normalizeKey(schema.typeColumn))
        : -1

      if (dateIdx === -1 || descIdx === -1 || amountIdx === -1) {
        throw new Error(
          'Não foi possível mapear as colunas essenciais do CSV com o esquema detectado.',
        )
      }

      // Build local history category memory on the fly
      const localTxs = await db.finance_transactions.toArray()
      const normalizeDesc = (desc) => {
        return String(desc || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
      }
      const freqMap = {}
      for (const tx of localTxs) {
        if (tx.category_id && !tx.is_ignored) {
          const norm = normalizeDesc(tx.description)
          if (norm) {
            if (!freqMap[norm]) freqMap[norm] = {}
            const cid = String(tx.category_id)
            freqMap[norm][cid] = (freqMap[norm][cid] || 0) + 1
          }
        }
      }
      const descriptionMemory = {}
      for (const norm in freqMap) {
        let maxCount = 0
        let bestId = null
        for (const cid in freqMap[norm]) {
          if (freqMap[norm][cid] > maxCount) {
            maxCount = freqMap[norm][cid]
            bestId = cid
          }
        }
        if (bestId) {
          descriptionMemory[norm] = bestId
        }
      }

      const rows = []
      let skipped = 0

      const normFn = this.normalize
      // Standard keywords for Brazilian Portuguese banking to guarantee determinism
      const stdIncome = [
        'recebido',
        'resgatado',
        'credito',
        'entrada',
        'estorno',
        'rendimento',
        'deposito',
        'salario',
      ]
      const stdExpense = [
        'pago',
        'enviado',
        'compra',
        'debito',
        'saida',
        'pagamento',
        'tarifa',
        'iof',
        'juros',
      ]

      for (let index = 1; index < lines.length; index += 1) {
        const line = lines[index].trim()
        if (!line) continue

        const values = this.splitCsvLine(line, delimiter).map((val) => this.cleanCsvCell(val))

        const rawDate = dateIdx >= 0 ? values[dateIdx] : ''
        const rawDesc = descIdx >= 0 ? values[descIdx] : ''
        const rawAmount = amountIdx >= 0 ? values[amountIdx] : ''
        const rawType = typeIdx >= 0 ? values[typeIdx] : ''

        const date = this.parseCsvDate(rawDate)
        const description = rawDesc
        const parsedAmount = this.parseCsvSignedAmount(rawAmount)

        if (!date || !description || !parsedAmount.amount) {
          skipped += 1
          continue
        }

        let type = null
        if (parsedAmount.negative) {
          type = 'EXPENSE'
        } else {
          const normalizedTypeVal = normFn(rawType || '')
          const normalizedDesc = normFn(description || '')

          const isIncomePattern = (str) => {
            if (!str) return false
            const norm = normFn(str)
            const patterns = [...(schema.incomePatterns || []), ...stdIncome]
            return patterns.some((pat) => {
              const normPat = normFn(pat)
              return norm.includes(normPat)
            })
          }

          const isExpensePattern = (str) => {
            if (!str) return false
            const norm = normFn(str)
            const patterns = [...(schema.expensePatterns || []), ...stdExpense]
            return patterns.some((pat) => {
              const normPat = normFn(pat)
              return norm.includes(normPat)
            })
          }

          if (isIncomePattern(normalizedTypeVal) || isIncomePattern(normalizedDesc)) {
            type = 'INCOME'
          } else if (isExpensePattern(normalizedTypeVal) || isExpensePattern(normalizedDesc)) {
            type = 'EXPENSE'
          } else {
            type = schema.defaultPositiveType || 'EXPENSE'
          }
        }

        // Try mapping category from memory first
        const normDescVal = normalizeDesc(description)
        let categoryId = descriptionMemory[normDescVal] || null

        // Fall back to name matching if not found in memory
        if (!categoryId) {
          const category = this.findCategoryByName(description, type)
          categoryId = category.id || null
        }

        rows.push({
          description: description.slice(0, 255) || `Movimento CSV ${index + 1}`,
          amount: parsedAmount.amount,
          type,
          category_id: categoryId,
          transaction_date: date,
          status: 'PAID',
          source: 'IMPORT',
        })
      }

      this.csvImportRows = rows
      this.csvSkippedRows = skipped

      if (!rows.length) {
        this.csvImportError = 'Nenhum movimento válido foi encontrado no CSV.'
      } else if (skipped) {
        this.csvImportError = `${skipped} linha(s) sem data, descrição ou valor foram ignoradas.`
      } else {
        this.csvImportError = ''
      }
    },
    detectCsvDelimiter(headerLine) {
      const options = [';', ',', '\t']
      return options
        .map((delimiter) => ({ delimiter, count: this.splitCsvLine(headerLine, delimiter).length }))
        .sort((a, b) => b.count - a.count)[0].delimiter
    },
    splitCsvLine(line, delimiter) {
      const values = []
      let current = ''
      let quoted = false

      for (let index = 0; index < line.length; index += 1) {
        const char = line[index]
        const next = line[index + 1]

        if (char === '"' && quoted && next === '"') {
          current += '"'
          index += 1
        } else if (char === '"') {
          quoted = !quoted
        } else if (char === delimiter && !quoted) {
          values.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }

      values.push(current.trim())
      return values
    },
    parseCsvSignedAmount(rawValue) {
      const raw = String(rawValue || '').trim()
      if (!raw) return { amount: 0, negative: false }

      const negative = raw.includes('-') || (raw.includes('(') && raw.includes(')'))
      let normalized = raw
        .replace(/\s/g, '')
        .replace(/[R$()]/g, '')
        .replace(/[^0-9,.-]/g, '')
      const lastComma = normalized.lastIndexOf(',')
      const lastDot = normalized.lastIndexOf('.')

        if (lastComma > -1 && lastDot > -1) {
          normalized =
            lastComma > lastDot
              ? normalized.replace(/\./g, '').replace(',', '.')
              : normalized.replace(/,/g, '')
      } else if (lastComma > -1) {
        normalized = normalized.replace(',', '.')
      }

      const amount = Math.abs(Number(normalized || 0))
      return { amount: Number.isFinite(amount) ? amount : 0, negative }
    },
    parseCsvDate(rawValue) {
      const raw = String(rawValue || '').trim()
      if (!raw) return ''

      const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
      if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`

        const brMatch = raw.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/)
        if (brMatch) {
          const year = brMatch[3].length === 2 ? `20${brMatch[3]}` : brMatch[3]
        return `${year}-${brMatch[2].padStart(2, '0')}-${brMatch[1].padStart(2, '0')}`
      }

      const parsed = new Date(raw)
      if (Number.isNaN(parsed.getTime())) return ''
      return parsed.toISOString().slice(0, 10)
    },
    findCategoryByName(name, type) {
      const normalized = this.normalize(name)
      if (!normalized) return null
      return (
        this.categories.find(
          (category) =>
            this.normalize(category.name) === normalized && (!type || category.type === type),
        ) || this.categories.find((category) => this.normalize(category.name) === normalized)
      )
    },
    async confirmCsvImport() {
      if (!this.csvImportRows.length) return
      this.importingCsv = true
      try {
        const cleanRows = this.csvImportRows.map((row) => ({
          description: String(row.description || ''),
          amount: Number(row.amount || 0),
          type: String(row.type || 'EXPENSE'),
          category_id: row.category_id || null,
          transaction_date: String(row.transaction_date),
          status: 'PAID',
          source: 'IMPORT',
        }))
        await financeService.createTransactionsBatch(cleanRows)
        this.resetCsvImport()
        await this.refreshTransactionDrivenViews()
      } finally {
        this.importingCsv = false
      }
    },

    transactionKey(transaction) {
      return transaction.id || transaction.local_id || null
    },
    categoryKey(category) {
      return category?.server_id || category?.id || category?.local_key || category?.local_id || null
    },
    macroKey(macro) {
      const resolved = this.resolveMacroRecord(macro) || macro || {}
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
      )
    },
    transactionMatches(transaction, id) {
      return this.sameId(transaction.id, id) || this.sameId(transaction.local_id, id)
    },
    transactionBelongsToSelectedMonth(transaction) {
      return String(transaction.transaction_date || '').startsWith(this.selectedMonth)
    },
    enrichTransactionForList(transaction = {}) {
      const category = this.findCategory(transaction.category_id)
      if (!category) return transaction

      return {
        ...transaction,
        category_id: category.id,
        category_name: category.name,
        macro_category: category.macro_category,
        macro_category_id: category.macro_category_id,
        category_icon: category.icon,
        category_color: category.macro_color || category.color,
      }
    },
    sortTransactionsList() {
      this.transactions = [...this.transactions].sort((a, b) => {
        const dateCompare = String(b.transaction_date || '').localeCompare(
          String(a.transaction_date || ''),
        )
        if (dateCompare !== 0) return dateCompare

        const isNumericA = a.id && Number.isFinite(Number(a.id))
        const isNumericB = b.id && Number.isFinite(Number(b.id))

        if (isNumericA && isNumericB) return Number(b.id) - Number(a.id)
        if (!isNumericA && isNumericB) return -1
        if (isNumericA && !isNumericB) return 1
        return (b.local_id || 0) - (a.local_id || 0)
      })
    },
    upsertTransactionInList(transaction) {
      const next = this.enrichTransactionForList(transaction)
      const key = this.transactionKey(next)
      const withoutCurrent = this.transactions.filter((item) => !this.transactionMatches(item, key))

      if (this.transactionBelongsToSelectedMonth(next)) {
        this.transactions = [next, ...withoutCurrent]
        this.sortTransactionsList()
      } else {
        this.transactions = withoutCurrent
      }
    },
    removeTransactionFromList(id) {
      this.transactions = this.transactions.filter(
        (transaction) => !this.transactionMatches(transaction, id),
      )
      this.recentTransactions = this.recentTransactions.filter(
        (transaction) => !this.transactionMatches(transaction, id),
      )
    },
    matchesTransactionCategoryFilter(transaction) {
      if (!this.transactionCategoryFilter) return true
      if (this.transactionCategoryFilter === '__uncategorized__') {
        return !transaction.category_id
      }

      const category = this.findCategory(transaction.category_id)
      return (
        this.sameId(transaction.category_id, this.transactionCategoryFilter) ||
        this.sameId(this.categoryKey(category), this.transactionCategoryFilter)
      )
    },
    buildTransactionSearchText(transaction) {
      const amount = Math.abs(Number(transaction.amount || 0))
      const category = this.findCategory(transaction.category_id)
      const amountBr = Number.isFinite(amount)
        ? amount.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        : ''
      const amountFixed = Number.isFinite(amount) ? amount.toFixed(2) : ''
      const amountInteger = Number.isFinite(amount) ? String(Math.trunc(amount)) : ''
      const amountDigits = Number.isFinite(amount) ? String(Math.round(amount * 100)) : ''

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
          .join(' '),
      )
    },
    matchesTransactionSearch(transaction, normalizedSearch) {
      if (!normalizedSearch) return true
      return this.buildTransactionSearchText(transaction).includes(normalizedSearch)
    },
    async selectTransactionCategory(transaction, categoryId, options = {}) {
      const category = this.findCategory(categoryId)
      const update = { category_id: categoryId || null }
      const originalType = transaction.original_type || options.originalType || transaction.type

      if (!categoryId && transaction.original_type) {
        update.type = transaction.original_type
        update.original_type = null
      }

      if (category?.type) {
        update.type = category.type
        if (originalType) {
          update.original_type = originalType
        }
      }

      await this.updateTransaction(this.transactionKey(transaction), update)
    },
    resolveSavedCategory(savedCategory) {
      if (!savedCategory) return null
      const savedName = this.normalize(savedCategory.name)
      const savedMacro = this.normalize(savedCategory.macro_category)

      return (
        this.categories.find(
          (category) =>
            this.sameId(category.id, savedCategory.id) ||
            this.sameId(category.local_id, savedCategory.local_id) ||
            (this.normalize(category.name) === savedName &&
              this.normalize(category.macro_category) === savedMacro &&
              category.type === savedCategory.type),
        ) || savedCategory
      )
    },
    async applyPendingCategorySelection(savedCategory) {
      if (!this.pendingCategorySelection) return
      const pending = this.pendingCategorySelection
      const category = this.resolveSavedCategory(savedCategory)
      const transaction = this.transactions.find(
        (item) =>
          this.transactionMatches(item, pending.transactionId) ||
          this.transactionMatches(item, pending.transactionLocalId),
      )

      if (transaction && category.id) {
        await this.selectTransactionCategory(transaction, category.id, {
          originalType: pending.originalType,
        })
      }

      this.pendingCategorySelection = null
    },
    applyTransactionPatch(id, data) {
      this.transactions = this.transactions.map((transaction) =>
        this.transactionMatches(transaction, id)
          ? this.enrichTransactionForList({ ...transaction, ...data })
          : transaction,
      )
      this.recentTransactions = this.recentTransactions.map((transaction) =>
        this.transactionMatches(transaction, id)
          ? this.enrichTransactionForList({ ...transaction, ...data })
          : transaction,
      )
    },
    async updateTransaction(id, data) {
      this.applyTransactionPatch(id, data)
      const { data: local } = await financeService.updateTransaction(id, data)
      if (local) {
        this.upsertTransactionInList(local)
      }
      await this.refreshTransactionDrivenViews()
    },
    async toggleIgnored(transaction) {
      const transactionId = this.transactionKey(transaction)
      if (!transactionId) return
      const nextIgnored = !transaction.is_ignored
      this.applyTransactionPatch(transactionId, { is_ignored: nextIgnored })
      await this.updateTransaction(transactionId, { is_ignored: nextIgnored })
    },
    async deleteTransaction(id) {
      await financeService.deleteTransaction(id)
      this.removeTransactionFromList(id)
      await this.refreshTransactionDrivenViews()
    },
    findCategory(categoryId) {
      return this.categories.find(
        (category) =>
          this.sameId(category.id, categoryId) ||
          this.sameId(category.local_id, categoryId) ||
          this.sameId(category.local_key, categoryId),
      )
    },
    findMacroByName(name) {
      return this.macroCategories.find(
        (macro) => this.normalize(macro?.name) === this.normalize(name),
      )
    },
    resolveMacroRecord(macro = null) {
      if (!macro) return null

      const candidates = [
        macro.id,
        macro.original_id,
        macro.local_key,
        macro.local_id,
        macro.macro_category_id,
      ].filter(Boolean)

      for (const candidate of candidates) {
        const found = this.macroCategories.find(
          (current) =>
            this.sameId(current.id, candidate) ||
            this.sameId(current.local_key, candidate) ||
            this.sameId(current.local_id, candidate),
        )
        if (found) return found
      }

      return this.findMacroByName(macro.name)
    },
    categoriesForMacro(group) {
      return this.categories.filter(
        (category) =>
          this.normalize(category.macro_category) === this.normalize(group.macro_category),
      )
    },
    availableCategoriesForMacro(group, currentItem) {
      const allCategoriesForMacro = this.categoriesForMacro(group)
      const usedCategoryIds = new Set()
      this.budgets.forEach((g) => {
        ;(g.items || []).forEach((item) => {
          if (item.category_id && item.category_id !== currentItem.category_id) {
            usedCategoryIds.add(String(item.category_id))
          }
        })
      })
      return allCategoriesForMacro.filter((category) => !usedCategoryIds.has(String(category.id)))
    },
    nextBudgetCategoryId(group) {
      const used = new Set()
      this.budgets.forEach((g) => {
        ;(g.items || []).forEach((item) => {
          if (item.category_id) used.add(String(item.category_id))
        })
      })
      const candidate = this.categoriesForMacro(group).find(
        (category) => !used.has(String(category.id)),
      )
      return candidate?.id || null
    },
    nextBudgetMacro() {
      const used = new Set(
        this.budgets.map((group) => String(group.macro_category_id || '')).filter(Boolean),
      )
      return this.macroCategories.find((macro) => !used.has(String(macro.id))) || null
    },
    addBudgetGroup() {
      const group = this.hydrateBudgetGroup({
        _key: `local-macro-${Date.now()}`,
        macro_category_id: null,
        macro_category: '',
        macro_color: '#999999',
        planned_amount: 0,
        actual_amount: 0,
        items: [],
      })
      this.budgets.push(group)
    },
    removeBudgetGroup(group) {
      this.budgets = this.budgets.filter((item) => item._key !== group._key)
    },
    selectBudgetMacro(group, macroName) {
      const macro = this.findMacroByName(macroName)
      group.macro_category_id = macro.id || null
      group.macro_category = macroName
      group.macro_color = macro?.color || group.macro_color || '#999999'
      group.items = []
    },
    addBudgetItem(group) {
      const categoryId = this.nextBudgetCategoryId(group)
      const category = this.findCategory(categoryId)
      group.items.push(
        this.hydrateBudgetItem({
          _key: `local-item-${Date.now()}-${Math.random()}`,
          category_id: categoryId,
          type: category?.type || 'EXPENSE',
          amount: 0,
          actual_amount: 0,
        }),
      )
    },
    removeBudgetItem(group, item) {
      group.items = group.items.filter((current) => current._key !== item._key)
    },
    syncBudgetItemType(item) {
      item.type = this.findCategory(item.category_id)?.type || item.type || 'EXPENSE'
    },
    updateBudgetGroupAmount(event, group) {
      const value = this.parseMoneyInput(event.target.value)
      group.planned_amount = value
      group.planned_amount_display = this.moneyInput(value)
      event.target.value = group.planned_amount_display
    },
    updateBudgetAmount(event, budget) {
      const value = this.parseMoneyInput(event.target.value)
      budget.amount = value
      budget.amount_display = this.moneyInput(value)
      event.target.value = budget.amount_display
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
              type: this.findCategory(item.category_id)?.type || item.type || 'EXPENSE',
            })),
        }))

      await financeService.saveBudgets({ month: this.selectedMonth, groups })
      await this.loadBudgets()
    },
    openCategoryForm(category = null, pendingSelection = null) {
      this.pendingCategorySelection = pendingSelection
      const currentCategory = category || {}
      this.categoryForm = {
        id: currentCategory.id || null,
        name: currentCategory.name || '',
        macro_category: currentCategory.macro_category || 'Geral',
        macro_color: currentCategory.macro_color || currentCategory.color || '#999999',
        type: currentCategory.type || 'EXPENSE',
        icon: currentCategory.icon || 'tag',
      }
      if (this.findMacroByName(this.categoryForm.macro_category)?.is_investment) {
        this.categoryForm.type = 'EXPENSE'
      }
      this.showCategoryForm = true
    },
    openCategoryFormForTransaction(transaction, suggestedName = '') {
      this.openCategoryForm(
        {
          name: suggestedName,
          macro_category: 'Geral',
          macro_color: '#999999',
          type: transaction.type || 'EXPENSE',
          icon: 'tag',
        },
        {
          transactionId: transaction.id,
          transactionLocalId: transaction.local_id,
          originalType: transaction.original_type || transaction.type,
        },
      )
    },
    handleNewCategoryRequest(group = null) {
      if (group?.name) {
        this.openCategoryForm({
          name: '',
          macro_category: group.name,
          macro_color: group.color || '#999999',
          type: 'EXPENSE',
          icon: 'tag',
        })
        return
      }
      this.openCategoryForm()
    },
    closeCategoryForm() {
      this.showCategoryForm = false
      this.pendingCategorySelection = null
    },
    onCategoryMacroChange(macroName) {
      const macro = this.findMacroByName(macroName)
      if (macro?.color) {
        this.categoryForm.macro_color = macro?.color
      }
      if (macro?.is_investment) {
        this.categoryForm.type = 'EXPENSE'
      }
    },
    async saveCategoryForm() {
      let savedCategory = null
      if (this.categoryForm.id) {
        const { data } = await financeService.updateCategory(
          this.categoryForm.id,
          this.categoryForm,
        )
        savedCategory = data
      } else {
        const { data } = await financeService.createCategory(this.categoryForm)
        savedCategory = data
      }
      this.showCategoryForm = false
      await Promise.all([this.loadMacroCategories(), this.loadCategories(), this.loadDashboard(), this.loadInvestments()])
      await this.applyPendingCategorySelection(savedCategory)
    },
    openMacroForm(macro = null) {
      const currentMacro = macro || {}
      const resolvedMacro = this.resolveMacroRecord(currentMacro) || currentMacro
      const resolvedId =
        resolvedMacro.id ||
        resolvedMacro.local_key ||
        resolvedMacro.local_id ||
        currentMacro.macro_category_id ||
        null

      this.macroForm = {
        id: resolvedId,
        original_id: resolvedId,
        name: resolvedMacro.name || '',
        color: resolvedMacro.color || '#999999',
        is_investment: Boolean(resolvedMacro.is_investment),
      }
      this.showMacroForm = true
    },
    async saveMacroForm() {
      const macroId = this.macroForm.original_id || this.macroForm.id || null
      const payload = {
        name: this.macroForm.name,
        color: this.macroForm.color,
        is_investment: this.macroForm.is_investment,
      }

      if (macroId) {
        await financeService.updateMacroCategory(macroId, payload)
      } else {
        await financeService.createMacroCategory(payload)
      }
      this.showMacroForm = false
      await Promise.all([
        this.loadMacroCategories(),
        this.loadCategories(),
        this.loadBudgets(),
        this.loadDashboard(),
        this.loadInvestments(),
      ])
    },
    async saveInvestmentGoal(goal) {
      if (goal.id) {
        await financeService.updateInvestmentGoal(goal.id, goal)
      } else {
        await financeService.createInvestmentGoal(goal)
      }
      await this.loadInvestments()
    },
    async deleteInvestmentGoal(goal) {
      const goalId = goal.id || goal.local_id
      if (!goalId) return
      await financeService.deleteInvestmentGoal(goalId)
      await this.loadInvestments()
    },
    async saveInvestmentEvent(event) {
      if (event.id) {
        await financeService.updateInvestmentEvent(event.id, event)
      } else {
        await financeService.createInvestmentEvent(event)
      }
      await this.loadInvestments()
    },
    async deleteInvestmentEvent(event) {
      const eventId = event.id || event.local_id
      if (!eventId) return
      await financeService.deleteInvestmentEvent(eventId)
      await this.loadInvestments()
    },
    openConfirmation({ description, message, confirmText, action }) {
      this.confirmationState = {
        show: true,
        message: message,
        confirmText: confirmText || 'Confirmar',
        action: action,
        description: description || '',
      }
    },
    async execute_confirmation_action() {
      if (this.confirmationState.action) {
        try {
          await this.confirmationState.action()
        } catch (err) {
          console.error('Erro ao executar ação confirmada:', err)
        }
      }
      this.confirmationState.show = false
    },
    requestDeleteTransaction(transaction) {
      this.openConfirmation({
        message: `Excluir o lançamento "${transaction.description}"`,
        description: `Esta ação excluirá o lançamento no valor de ${this.money(transaction.amount)} e não poderá ser desfeita.`,
        confirmText: 'Excluir',
        action: async () => {
          const transactionId = this.transactionKey(transaction)
          if (!transactionId) return
          await this.deleteTransaction(transactionId)
        },
      })
    },
    requestDeleteCategory(category) {
      this.confirmDelete = {
        visible: true,
        type: 'category',
        payload: category,
        message: `Excluir a categoria "${category.name}"? Os lançamentos vinculados ficarão sem categoria.`,
      }
    },
    requestDeleteMacro(macro) {
      this.confirmDelete = {
        visible: true,
        type: 'macro',
        payload: macro,
        message: `Excluir a macro categoria "${macro?.name}"? As categorias filhas devem ser movidas antes para evitar perda de organização.`,
      }
    },
    closeDeleteConfirm() {
      this.confirmDelete = { visible: false, type: null, payload: null, message: '' }
    },
    async confirmDeleteAction() {
      const { type, payload } = this.confirmDelete
      if (type === 'category') {
        const categoryId = this.categoryKey(payload)
        if (categoryId) await financeService.deleteCategory(categoryId)
      }
      if (type === 'macro') {
        const macroId = this.macroKey(payload)
        if (macroId) await financeService.deleteMacroCategory(macroId)
      }
      this.closeDeleteConfirm()
      await Promise.all([
        this.loadMacroCategories(),
        this.loadCategories(),
        this.loadBudgets(),
        this.loadDashboard(),
        this.loadInvestments(),
      ])
    },
    loadPluggyScript() {
      if (document.querySelector(`script[src="${pluggyWidgetUrl}"]`)) return Promise.resolve()
      return new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = pluggyWidgetUrl
        script.async = true
        script.onload = resolve
        script.onerror = reject
        document.head.appendChild(script)
      })
    },
    async openPluggyWidget() {
      await this.loadPluggyScript()
      if (!window.PluggyConnect) throw new Error('Pluggy Connect indisponível.')

      const { data } = await financeService.getConnectToken()
      const widget = new window.PluggyConnect({
        connectToken: data.accessToken,
        includeSandbox: includePluggySandbox,
        onSuccess: async (itemData) => {
          await financeService.saveConnection(itemData)
          await this.reloadAll()
        },
      })
      widget.init()
    },
    async syncConnections() {
      this.syncingBanks = true
      try {
        await financeService.syncConnections()
        await this.reloadAll()
      } finally {
        this.syncingBanks = false
      }
    },
    async deleteConnection(itemId) {
      await financeService.deleteConnection(itemId)
      await this.loadConnections()
    },
    async autoCategorize() {
      if (!this.canUseAi) {
        this.showPlanModal = true
        return
      }

      this.categorizingAi = true
      this.categorizingIds = []

      try {
        // 1. Identify all uncategorized transactions currently on the screen/dashboard
        const targetTransactions = this.transactions.filter((t) => !t.category_id && !t.is_ignored)

        if (targetTransactions.length === 0) {
          // No items to categorize
          return
        }

        // Helper to normalize transaction descriptions for matching
        const normalizeDesc = (desc) => {
          return String(desc || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove accents/diacritics
            .replace(/[^a-z0-9]/g, ' ') // Replace special characters and punctuation with spaces
            .replace(/\s+/g, ' ') // Collapse multiple spaces
            .trim()
        }

        // 2. Fetch all local transactions from Dexie database to build the description category frequency map
        const localTxs = await db.finance_transactions.toArray()
        const freqMap = {} // normalizedDesc -> { categoryId -> count }
        for (const tx of localTxs) {
          // If transaction has an active, valid category and is not ignored
          if (tx.category_id && !tx.is_ignored) {
            const norm = normalizeDesc(tx.description)
            if (norm) {
              if (!freqMap[norm]) freqMap[norm] = {}
              const catId = String(tx.category_id)
              freqMap[norm][catId] = (freqMap[norm][catId] || 0) + 1
            }
          }
        }

        // Select the most frequent category for each normalized description
        const descriptionMemory = {}
        for (const norm in freqMap) {
          let maxCount = 0
          let bestCatId = null
          for (const catId in freqMap[norm]) {
            if (freqMap[norm][catId] > maxCount) {
              maxCount = freqMap[norm][catId]
              bestCatId = catId
            }
          }
          if (bestCatId) {
            descriptionMemory[norm] = bestCatId
          }
        }

        // 3. Separate transactions into those resolvable locally and those requiring AI
        const localMatchUpdates = []
        const remainingIds = []

        for (const tx of targetTransactions) {
          const norm = normalizeDesc(tx.description)
          const matchedCategoryId = descriptionMemory[norm]
          if (matchedCategoryId) {
            localMatchUpdates.push({ id: tx.id, category_id: matchedCategoryId })
          } else {
            remainingIds.push(tx.id)
          }
        }

        // 4. Update locally resolved transactions immediately
        if (localMatchUpdates.length > 0) {
          console.log(
            `[CategorizeMemory] Resolving ${localMatchUpdates.length} transactions locally from memory...`,
          )
          for (const update of localMatchUpdates) {
            await financeService.updateTransaction(update.id, { category_id: update.category_id })
          }
        }

        // 5. Send remaining transactions to the AI backend if any exist
        if (remainingIds.length > 0) {
          console.log(
            `[CategorizeMemory] Requesting AI categorization for ${remainingIds.length} unknown transactions...`,
          )
          this.categorizingIds = [...remainingIds]
          await financeService.autoCategorize({ transaction_ids: remainingIds })
        } else {
          console.log(
            `[CategorizeMemory] All ${localMatchUpdates.length} transactions resolved from history! Bypassed AI call.`,
          )
        }

        await Promise.all([this.refreshTransactionDrivenViews(), this.loadUsage()])
      } catch (err) {
        console.error('Erro na categorização:', err)
      } finally {
        this.categorizingIds = []
        this.categorizingAi = false
      }
    },
    openBudgetPlanModal() {
      if (!this.canUseAi) {
        this.showPlanModal = true
        return
      }
      this.loadBudgetAiConversation()
      this.budgetAiPrompt = this.budgetAiInlinePrompt.trim()
      this.showBudgetAiForm = true
    },
    async runInlineBudgetAi() {
      if (!this.canUseAi) {
        this.showPlanModal = true
        return
      }
      this.budgetAiPrompt = this.budgetAiInlinePrompt.trim() || 'Organizar meu orçamento mensal'
      await this.submitBudgetPlan()
    },
    async submitBudgetPlan() {
      if (!this.budgetAiPrompt.trim()) return
      this.loadingAi = true
      try {
        const requestText = this.budgetAiPrompt.trim()
        this.appendBudgetAiMessage('user', requestText)
        const { data } = await financeService.generateBudgetPlan({
          month: this.selectedMonth,
          text: requestText,
          conversation_summary: this.budgetAiContextSummary,
        })
        if (Array.isArray(data.groups) && data.groups.length > 0) {
          this.budgets = data.groups.map((group) => {
            const macro = this.macroCategories.find((item) =>
              this.sameId(item.id, group.macro_category_id),
            )
            return this.hydrateBudgetGroup({
              ...group,
              _key: `ai-macro-${group.macro_category_id}-${Math.random()}`,
              macro_category: macro?.name || 'Geral',
              macro_color: macro?.color || '#999999',
              actual_amount: 0,
              items: (group.items || []).map((item) => ({
                ...item,
                type: this.findCategory(item.category_id)?.type || item.type || 'EXPENSE',
                actual_amount: 0,
              })),
            })
          })
        } else {
          const byMacro = new Map()
          ;(data.budgets || []).forEach((budget) => {
            const category = this.findCategory(budget.category_id)
            if (!category?.macro_category_id) return
            if (!byMacro.has(category.macro_category_id)) {
              byMacro.set(category.macro_category_id, {
                macro_category_id: category.macro_category_id,
                macro_category: category.macro_category,
                macro_color: category.macro_color || category.color,
                planned_amount: 0,
                actual_amount: 0,
                items: [],
              })
            }
            const group = byMacro.get(category.macro_category_id)
            group.planned_amount += Number(budget.amount || 0)
            group.items.push({ ...budget, type: category.type, actual_amount: 0 })
          })
          this.budgets = [...byMacro.values()].map((group) => this.hydrateBudgetGroup(group))
        }
          const insightText =
            Array.isArray(data.insights) && data.insights.length > 0
              ? data.insights.slice(0, 2).join(' ')
              : 'Plano gerado para o mês com base no seu pedido.'
        this.appendBudgetAiMessage('assistant', insightText)
        this.budgetAiInlinePrompt = ''
        this.budgetAiPrompt = ''
        this.showBudgetAiForm = false
        await this.loadUsage()
      } finally {
        this.loadingAi = false
      }
    },
    async loadInsights() {
      this.loadingAi = true
      try {
        const { data } = await financeService.getInsights({ month: this.selectedMonth })
        this.insights = data || []
        await this.loadUsage()
      } catch (err) {
        console.error('Erro ao carregar insights:', err)
      } finally {
        this.loadingAi = false
      }
    },
    scrollToBottomOfChat() {
      this.$nextTick(() => {
        const chatContainer = this.$refs.budgetAiChat
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight
        }
      })
    },
  },
  mounted() {
    this.reloadAll()
    document.addEventListener('keydown', this.handleGlobalKeydown)
  },
  beforeUnmount() {
    document.removeEventListener('keydown', this.handleGlobalKeydown)
  },
  watch: {
    showBudgetAiForm(val) {
      if (val) {
        this.scrollToBottomOfChat()
      }
    },
  },
}
</script>

<style scoped>
.nexo-shell {
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
}

.tabs-track {
  display: flex;
  height: 100%;
  will-change: transform;
  transition: transform 0.28s cubic-bezier(0.2, 0.9, 0.25, 1);
}

.tab-pane {
  height: 100%;
  min-width: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: var(--space-1) var(--space-2) var(--space-5) 0;
  box-sizing: border-box;
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
  grid-template-columns: repeat(4, minmax(180px, 1fr));
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.budget-summary-card {
  min-height: 78px;
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-card);
  transition: background var(--transition-base);
}

.budget-summary-card .summary-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-sm);
  display: grid;
  place-items: center;
  background: rgba(31, 39, 76, 0.1);
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
}

.budget-summary-card small,
.budget-group-totals small,
.budget-child-head span {
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.budget-summary-card strong {
  font-size: var(--fontsize-sm);
}

.budget-command-bar {
  display: grid;
  grid-template-columns: 240px minmax(260px, 1fr) auto;
  align-items: center;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-card);
}

.budget-month-picker {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 40px;
  border-radius: var(--radius-sm);
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  padding: 0 var(--space-3);
  transition: background var(--transition-base);
}

.budget-month-picker input {
  min-width: 0;
  width: 100%;
  height: 38px;
  border: none;
  outline: none;
  box-shadow: none;
  background: transparent;
  color: var(--text-primary);
  padding: 0;
}

.budget-inline-ai {
  position: relative;
  display: flex;
  align-items: stretch;
  gap: 0;
  min-height: 44px;
  height: 44px;
  border-radius: var(--radius-sm);
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  padding: 0 0 0 var(--space-3);
  transition: background var(--transition-base);
  overflow: hidden;
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
  padding: 12px 0 0 0;
  box-sizing: border-box;
}

.budget-inline-ai > span {
  position: absolute;
  left: var(--space-3);
  top: 3px;
  color: var(--text-muted);
  font-size: 0.68rem;
  font-weight: 800;
  text-transform: uppercase;
  pointer-events: none;
}

.budget-inline-ai input::placeholder {
  color: var(--text-muted);
}

.budget-inline-ai button {
  height: 100%;
  border: none;
  border-radius: 0;
  background: var(--deep-blue-gradient-right);
  color: var(--white);
  padding: 0 var(--space-4);
  cursor: pointer;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  transition: all var(--transition-fast) !important;
}

.budget-inline-ai button:hover {
  filter: brightness(1.15);
}

.budget-inline-ai .ghost-inline-button {
  border-left: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: 0;
  background: var(--surface-3);
  color: var(--text-primary);
}

.budget-inline-ai .ghost-inline-button:hover {
  background: var(--surface-2);
}

.budget-group {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  background: var(--surface-0);
  border: 1px solid var(--budget-macro-border, var(--glass-border));
  overflow: visible;
  transition: background var(--transition-base);
}

.budget-group-header,
.budget-child-row {
  display: grid;
  align-items: center;
  gap: var(--space-3);
}

.budget-group-header {
  grid-template-columns: minmax(240px, 1fr) minmax(320px, auto) 38px;
  padding: var(--space-3);
  border: 1px solid rgba(31, 39, 76, 0.08);
  border-radius: var(--radius-sm);
}

.budget-group-title {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.budget-group-title > svg {
  color: var(--budget-macro-color, var(--gray-100));
}

.budget-group-totals {
  display: grid;
  grid-template-columns: repeat(3, minmax(92px, 1fr));
  gap: var(--space-4);
  align-items: center;
}

.budget-group-totals div {
  display: grid;
  gap: var(--space-1);
  text-align: right;
}

.budget-group-totals strong {
  font-size: var(--fontsize-sm);
}

.budget-macro-plan {
  display: grid;
  grid-template-columns: minmax(220px, 280px) minmax(220px, 1fr);
  gap: var(--space-4);
  align-items: end;
  padding: var(--space-2) 0 var(--space-3);
}

.budget-child-head {
  display: grid;
  grid-template-columns: minmax(220px, 1.35fr) 170px minmax(220px, 1fr) 38px;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  background: rgba(31, 39, 76, 0.04);
}

.budget-child-row {
  grid-template-columns: minmax(220px, 1.35fr) 170px minmax(220px, 1fr) 38px;
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  transition: background var(--transition-base);
}

.budget-add-macro {
  min-height: 52px;
  width: 100%;
  border: 1.5px dashed var(--glass-border);
  border-radius: var(--radius-md);
  background: var(--surface-1);
  color: var(--text-muted);
  cursor: pointer;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  transition:
    background var(--transition-fast),
    color var(--transition-fast),
    transform var(--transition-fast);
}

.budget-add-macro:hover {
  background: var(--surface-2);
  color: var(--text-primary);
  transform: translateY(-1px);
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
  height: 40px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  background: var(--surface-0);
  color: var(--text-primary);
  padding: 0 var(--space-3);
  box-shadow: none;
  outline: none;
  font-size: var(--fontsize-xs);
  transition:
    border-color var(--transition-fast),
    background var(--transition-base);
}

.plain-control:focus {
  border-color: var(--deep-blue);
  background: var(--surface-1);
}

.money-control {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.budget-progress {
  display: grid;
  gap: var(--space-2);
}

.budget-progress div,
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

.add-row {
  margin-top: var(--space-3);
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

.modal-wrapper-fixed {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: grid;
  place-items: center;
  pointer-events: none;
}

.modal-overlay {
  position: absolute;
  inset: 0;
  background: var(--overlay-heavy);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  pointer-events: auto;
}

.nexo-modal {
  position: relative;
  z-index: 1;
  width: min(500px, 92vw);
  max-height: min(680px, 90vh);
  overflow-y: auto;
  background: var(--surface-0);
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  pointer-events: auto;
  transition: background var(--transition-base);
}

[data-theme='dark'] .nexo-modal {
  background: var(--surface-2);
  color: var(--text-primary);
}

.nexo-modal h3,
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
  box-shadow: none;
  background: var(--surface-1);
  color: var(--text-primary);
  padding: 0 var(--space-4);
  outline: none;
  transition:
    border-color var(--transition-fast),
    background var(--transition-base);
}

.nexo-field input:focus,
.nexo-field select:focus,
.nexo-field textarea:focus {
  border-color: var(--deep-blue);
  box-shadow: 0 0 0 3px rgba(31, 39, 76, 0.08);
}

.nexo-field input,
.nexo-field select {
  height: 50px;
}

.nexo-field textarea {
  min-height: 130px;
  padding: var(--space-4);
  resize: vertical;
}

.nexo-field label {
  color: var(--black);
}

[data-theme='dark'] .nexo-field label {
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
  padding: var(--space-2) var(--space-3);
}

.icon-picker > div {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
  gap: var(--space-2);
}

.icon-choice {
  height: 40px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--surface-1);
  color: var(--text-primary);
  cursor: pointer;
  transition:
    transform var(--transition-fast),
    background var(--transition-fast),
    box-shadow var(--transition-fast);
}

.icon-choice:hover,
.icon-choice.active {
  background: var(--dark-yellow-2);
  box-shadow: 0 0 0 2px rgba(31, 39, 76, 0.12);
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

@media (max-width: 900px) {
  .budget-summary-grid {
    grid-template-columns: 1fr;
  }

  .budget-command-bar,
  .budget-macro-plan,
  .budget-child-head,
  .budget-row {
    grid-template-columns: 1fr;
  }

  .budget-group-header,
  .budget-child-row {
    grid-template-columns: 1fr;
  }

  .budget-group-totals {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    width: 100%;
  }

  .budget-group-totals div {
    text-align: left;
  }

  .budget-ai-modal-header {
    display: grid;
  }

  .budget-ai-message {
    max-width: 100%;
  }
}

@media (max-width: 760px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .panel {
    padding: var(--space-4);
  }

  .budget-command-bar,
  .budget-group,
  .budget-summary-card {
    padding: var(--space-3);
  }

  .budget-group-totals {
    grid-template-columns: 1fr;
  }
}
</style>
