<template>
  <div class="nexo-shell">
    <header class="nexo-header">
      <div>
        <h2>Kadem Nexo</h2>
        <span>{{ planLabel }} · {{ aiUsageLabel }}</span>
      </div>

      <div class="nexo-actions">
        <input type="month" v-model="selectedMonth" @change="reloadAll" />
        <button class="icon-btn" @click="reloadAll" :disabled="loading" title="Atualizar">
          <font-awesome-icon :icon="loading ? 'circle-notch' : 'arrows-rotate'" :spin="loading" />
        </button>
        <button class="primary-action" @click="openTransactionForm">
          <font-awesome-icon icon="plus" />
          Lançamento
        </button>
      </div>
    </header>

    <nav class="nexo-tabs" aria-label="Kadem Nexo">
      <button v-for="tab in tabs" :key="tab.id" :class="{ active: activeTab === tab.id }" @click="setActiveTab(tab.id)">
        <font-awesome-icon :icon="tab.icon" />
        <span>{{ tab.label }}</span>
        <font-awesome-icon v-if="tab.pro && !isPaidPlan" icon="lock" class="tab-lock" />
      </button>
    </nav>

    <div class="tab-viewport">
      <div class="tabs-track" :style="trackStyle">
        <section v-for="tab in tabs" :key="tab.id" class="tab-pane custom-scrollbar" :style="paneStyle">
          <template v-if="tab.id === 'overview'">
            <div class="summary-grid">
              <div class="metric income">
                <span>Entradas</span>
                <strong>{{ money(totals.income) }}</strong>
              </div>
              <div class="metric expense">
                <span>Saídas</span>
                <strong>{{ money(totals.expense) }}</strong>
              </div>
              <div class="metric balance">
                <span>Saldo</span>
                <strong :class="{ negative: totals.balance < 0 }">{{ money(totals.balance) }}</strong>
              </div>
            </div>

            <div class="overview-grid">
              <section class="panel allocation-panel">
                <div class="panel-title">
                  <h3>Distribuição</h3>
                </div>
                <div class="allocation-body">
                  <div class="donut" :style="{ background: donutGradient }">
                    <div class="donut-hole">
                      <span>{{ expensePercent }}%</span>
                      <small>uso</small>
                    </div>
                  </div>
                  <div class="legend-list">
                    <div v-for="segment in macroDistribution" :key="segment.macro_category" class="legend-row">
                      <span class="swatch" :style="{ background: segment.color || '#999999' }"></span>
                      <span>{{ segment.macro_category || "Geral" }}</span>
                      <strong>{{ money(segment.total) }}</strong>
                    </div>
                    <p v-if="macroDistribution.length === 0" class="empty-line">Sem gastos no mês.</p>
                  </div>
                </div>
              </section>

              <section class="panel">
                <div class="panel-title">
                  <h3>Recentes</h3>
                  <button class="text-btn" @click="setActiveTab('transactions')">Ver todos</button>
                </div>
                <div class="compact-list">
                  <article v-for="transaction in transactions.slice(0, 8)" :key="transaction.local_id || transaction.id" class="movement-row">
                    <div>
                      <strong>{{ transaction.description }}</strong>
                      <span>{{ categoryLabel(transaction) }} · {{ shortDate(transaction.transaction_date) }}</span>
                    </div>
                    <b :class="transaction.type">{{ signedMoney(transaction) }}</b>
                  </article>
                  <p v-if="transactions.length === 0" class="empty-line">Nenhum lançamento.</p>
                </div>
              </section>
            </div>
          </template>

          <template v-else-if="tab.id === 'transactions'">
            <section class="panel">
              <div class="panel-title">
                <h3>Movimentos</h3>
                <button class="text-btn" :disabled="!canUseAi || categorizingAi" @click="autoCategorize">
                  <font-awesome-icon :icon="categorizingAi ? 'circle-notch' : 'chart-simple'" :spin="categorizingAi" />
                  {{ categorizingAi ? 'Categorizando...' : 'Categorizar IA' }}
                </button>
              </div>
              <div class="transaction-tools">
                <form class="quick-entry-card" @submit.prevent="saveQuickTransaction">
                  <div class="quick-entry-heading">
                    <strong>Lançamento rápido</strong>
                    <div class="segmented compact-segmented">
                      <button type="button" class="expense-toggle" :class="{ active: quickForm.type === 'EXPENSE' }"
                        @click="quickForm.type = 'EXPENSE'">Saída</button>
                      <button type="button" class="income-toggle" :class="{ active: quickForm.type === 'INCOME' }"
                        @click="quickForm.type = 'INCOME'">Entrada</button>
                    </div>
                  </div>
                  <label class="quick-field description-field">
                    <span>Descrição</span>
                    <input v-model.trim="quickForm.description" type="text" placeholder="Mercado, farmácia, pix..."
                      required />
                  </label>
                  <label class="quick-field amount-field">
                    <span>Valor</span>
                    <input v-model="quickForm.amount_display" type="text" inputmode="numeric" placeholder="R$ 0,00"
                      required @input="updateQuickAmount" />
                  </label>
                  <label class="quick-field date-field">
                    <span>Data</span>
                    <input v-model="quickForm.transaction_date" type="date" required />
                  </label>
                  <div class="quick-category-field">
                    <span>Categoria</span>
                    <CategoryCombo v-model="quickForm.category_id" :categories="categories"
                      placeholder="Sem categoria" />
                  </div>
                  <button class="primary-action compact quick-save" type="submit" :disabled="savingQuick">
                    <font-awesome-icon :icon="savingQuick ? 'circle-notch' : 'plus'" :spin="savingQuick" />
                    Salvar rápido
                  </button>
                </form>

                <section class="csv-import-card">
                  <div class="csv-import-header">
                    <div>
                      <strong>Importar CSV</strong>
                      <span v-if="csvImportFileName">{{ csvImportFileName }}</span>
                      <span v-else>Banco, cartão ou planilha</span>
                    </div>
                      <button class="text-btn" type="button" @click="triggerCsvPicker" :disabled="importingCsv || loadingSchema">
                        <font-awesome-icon :icon="!isPaidPlan ? 'lock' : 'file-import'" />
                        Importar CSV
                      </button>
                    <input ref="csvInput" class="visually-hidden" type="file" accept=".csv,text/csv"
                      @change="handleCsvFileChange" />
                  </div>

                  <p v-if="csvImportError" class="import-feedback error">{{ csvImportError }}</p>
                  <p v-if="loadingSchema" class="import-feedback"><font-awesome-icon icon="circle-notch" spin /> Analisando padrão do CSV com IA...</p>
                  <div v-if="csvImportRows.length" class="csv-preview">
                    <div class="csv-preview-summary">
                      <span>{{ csvImportRows.length }} movimentos prontos</span>
                      <strong>{{ money(csvImportTotals.expense) }} saídas · {{ money(csvImportTotals.income) }}
                        entradas</strong>
                    </div>
                    <div class="csv-preview-table">
                      <table>
                        <tbody>
                          <tr v-for="(row, index) in csvImportRows.slice(0, 5)" :key="`${row.description}-${index}`">
                            <td>{{ shortDate(row.transaction_date) }}</td>
                            <td>{{ row.description }}</td>
                            <td class="right">
                              <strong :class="row.type">{{ row.type === "EXPENSE" ? "-" : "+" }}
                                {{ money(row.amount) }}</strong>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div class="csv-import-actions">
                      <button class="text-btn" type="button" @click="resetCsvImport" :disabled="importingCsv">
                        Limpar
                      </button>
                      <button class="primary-action compact" type="button" @click="confirmCsvImport"
                        :disabled="importingCsv">
                        <font-awesome-icon :icon="importingCsv ? 'circle-notch' : 'file-import'"
                          :spin="importingCsv" />
                        Importar
                      </button>
                    </div>
                  </div>
                </section>
              </div>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Descrição</th>
                      <th>Categoria</th>
                      <th>Origem</th>
                      <th class="right">Valor</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="transaction in transactions" :key="transaction.local_id || transaction.id"
                      :class="{ ignored: transaction.is_ignored }">
                      <td>{{ shortDate(transaction.transaction_date) }}</td>
                      <td class="transaction-description-cell">
                        <strong>{{ transaction.description }}</strong>
                        <small v-if="transaction.observation" class="transaction-observation">{{ transaction.observation }}</small>
                      </td>
                      <td>
                        <span v-if="categorizingIds.includes(transaction.id)" class="categorizing-loading-text">
                          <font-awesome-icon icon="circle-notch" spin /> Categorizando...
                        </span>
                        <CategoryCombo v-else :model-value="transaction.category_id" :categories="categories"
                          allow-create
                          placeholder="Sem categoria"
                          @update:modelValue="selectTransactionCategory(transaction, $event)"
                          @create="openCategoryFormForTransaction(transaction, $event)" />
                      </td>
                      <td>{{ sourceLabel(transaction.source) }}</td>
                      <td class="right value-cell">
                        <strong :class="transaction.type">{{ signedMoney(transaction) }}</strong>
                        <small
                          v-if="transaction.original_type && transaction.original_type !== transaction.type"
                          class="original-type-label"
                        >
                          Original: {{ polarityLabel(transaction.original_type) }}
                        </small>
                      </td>
                      <td>
                        <div class="row-actions">
                          <button class="icon-btn small" @click="openTransactionForm(transaction)" title="Editar">
                            <font-awesome-icon icon="pencil" />
                          </button>
                          <button class="icon-btn small" @click="toggleIgnored(transaction)" title="Ignorar">
                            <font-awesome-icon :icon="transaction.is_ignored ? 'eye-slash' : 'eye'" />
                          </button>
                          <button class="icon-btn small danger" @click="requestDeleteTransaction(transaction)"
                             title="Excluir">
                             <font-awesome-icon icon="trash" />
                           </button>
                        </div>
                      </td>

                    </tr>
                  </tbody>
                </table>
                <p v-if="transactions.length === 0" class="empty-line">Nenhum lançamento encontrado.</p>
              </div>
            </section>
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
                <input v-model="budgetAiInlinePrompt" type="text" placeholder='IA: "Reduzir 10% em lazer"'
                  @keyup.enter="runInlineBudgetAi" />
                <button type="button" :disabled="!canUseAi || loadingAi" @click.prevent="runInlineBudgetAi">
                  <font-awesome-icon :icon="loadingAi ? 'circle-notch' : 'wand-magic-sparkles'" :spin="loadingAi" />
                  IA
                </button>
                <button type="button" class="ghost-inline-button" :disabled="!canUseAi"
                  @click.prevent="openBudgetPlanModal">
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
                <section v-for="group in budgets" :key="group._key" class="budget-group"
                  :style="budgetGroupStyle(group)">
                  <header class="budget-group-header" :style="budgetGroupHeaderStyle(group)">
                    <div class="budget-group-title">
                      <font-awesome-icon icon="folder" />
                      <MacroCategoryCombo v-model="group.macro_category" :categories="categories"
                        :macro-categories="macroCategories"
                        @change="selectBudgetMacro(group, $event)" />
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
                        <strong>{{ budgetProgress(group, "planned_amount") }}%</strong>
                      </div>
                    </div>
                    <button class="icon-btn small danger" @click="removeBudgetGroup(group)" title="Remover macro">
                      <font-awesome-icon icon="trash" />
                    </button>
                  </header>

                  <div class="budget-macro-plan">
                    <label class="budget-labeled-control">
                      <span>Limite planejado da macro categoria</span>
                      <input class="plain-control money-control" type="text" inputmode="numeric"
                        :value="group.planned_amount_display" @input="updateBudgetGroupAmount($event, group)" />
                    </label>
                    <div class="budget-progress macro-progress">
                      <span>{{ money(group.actual_amount || 0) }} / {{ money(group.planned_amount || 0) }}</span>
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
                        <CategoryCombo v-model="item.category_id" :categories="availableCategoriesForMacro(group, item)"
                          placeholder="Selecionar categoria" @change="syncBudgetItemType(item)" />
                      </label>
                      <label class="budget-labeled-control">
                        <span>Limite da categoria</span>
                        <input class="plain-control money-control" type="text" inputmode="numeric"
                          :value="item.amount_display" @input="updateBudgetAmount($event, item)" />
                      </label>
                      <div class="budget-progress">
                        <span>{{ money(item.actual_amount || 0) }} / {{ money(item.amount || 0) }}</span>
                        <div>
                          <i :style="{ width: budgetProgress(item) + '%' }"></i>
                        </div>
                      </div>
                      <button class="icon-btn small danger" @click="removeBudgetItem(group, item)"
                        title="Remover categoria">
                        <font-awesome-icon icon="trash" />
                      </button>
                    </article>
                  </TransitionGroup>

                  <button class="text-btn add-row" @click="addBudgetItem(group)">
                    <font-awesome-icon icon="plus" />
                    Adicionar à {{ group.macro_category || "macro categoria" }}
                  </button>
                </section>
              </TransitionGroup>

              <button class="budget-add-macro" @click="addBudgetGroup">
                <font-awesome-icon icon="layer-group" />
                Nova macro categoria
              </button>
            </section>
          </template>

          <template v-else-if="tab.id === 'connections'">
            <div class="panel connections-soon">
              <div class="soon-icon">
                <font-awesome-icon icon="link" />
              </div>
              <div>
                <span class="soon-kicker">Em breve</span>
                <h3>Conexões bancárias automáticas</h3>
                <p>
                  O Kadem Nexo está preparando uma integração viável para produção. Por enquanto, use lançamento
                  rápido no momento da compra e importe CSV para organizar o histórico.
                </p>
              </div>
              <button class="primary-action compact" type="button" @click="setActiveTab('transactions')">
                <font-awesome-icon icon="list" />
                Ir para movimentos
              </button>
            </div>
            <template v-if="false">
            <ProGate v-if="!isPaidPlan" @upgrade="showPlanModal = true" />
            <div v-else class="panel">
              <div class="panel-title">
                <h3>Conexões</h3>
                <div class="inline-actions">
                  <button class="text-btn" @click="syncConnections" :disabled="syncingBanks">
                    <font-awesome-icon :icon="syncingBanks ? 'circle-notch' : 'arrows-rotate'" :spin="syncingBanks" />
                    Sincronizar
                  </button>
                  <button class="primary-action compact" @click="openPluggyWidget">
                    <font-awesome-icon icon="link" />
                    Conectar
                  </button>
                </div>
              </div>

              <div class="connection-grid">
                <article v-for="connection in connections" :key="connection.item_id" class="connection-card">
                  <div>
                    <strong>{{ connection.connector_name }}</strong>
                    <span>
                      {{ connectionStatusLabel(connection.status) }} ·
                      {{ connection.last_sync_at ? shortDate(connection.last_sync_at) : "sem sincronização" }}
                    </span>
                  </div>
                  <button class="icon-btn small danger" @click="deleteConnection(connection.item_id)" title="Remover">
                    <font-awesome-icon icon="trash" />
                  </button>
                </article>
                <p v-if="connections.length === 0" class="empty-line">Nenhuma conexão ativa.</p>
              </div>
            </div>
            </template>
          </template>

          <template v-else-if="tab.id === 'categories'">
            <section class="panel categories-panel">
              <div class="panel-title">
                <h3>Categorias</h3>
                <div class="inline-actions">
                  <button class="text-btn" @click="openMacroForm">
                    <font-awesome-icon icon="layer-group" />
                    Macro categoria
                  </button>
                  <button class="primary-action compact" @click="openCategoryForm">
                    <font-awesome-icon icon="plus" />
                    Categoria
                  </button>
                </div>
              </div>

              <div class="category-filter">
                <font-awesome-icon icon="magnifying-glass" />
                <div class="form-group">
                  <input v-model="categorySearch" id="filtrar-categorias" type="search" placeholder=" " />
                  <label for="filtrar-categorias">Filtrar categorias</label>
                </div>
              </div>

              <div class="macro-groups">
                <section v-for="group in groupedCategories" :key="group.id || group.name" class="macro-group"
                  :style="budgetGroupStyle({ macro_color: group.color })">
                  <header :style="budgetGroupHeaderStyle({ macro_color: group.color })">
                    <div class="macro-heading">
                      <span class="swatch" :style="{ background: group.color || '#999999' }"></span>
                      <div>
                        <h4>{{ group.name }}</h4>
                        <span>{{ group.items.length }} {{ group.items.length === 1 ? "categoria" : "categorias"
                        }}</span>
                      </div>
                    </div>
                    <div class="row-actions">
                      <button class="icon-btn small" @click="openMacroForm(group)" title="Editar macro">
                        <font-awesome-icon icon="pen" />
                      </button>
                      <button class="icon-btn small danger" @click="requestDeleteMacro(group)" title="Excluir macro">
                        <font-awesome-icon icon="trash" />
                      </button>
                    </div>
                  </header>
                  <div class="category-grid">
                    <article v-for="category in group.items" :key="category.local_id || category.id" class="category-card">
                      <span class="swatch" :style="{ background: category.color || '#999999' }"></span>
                      <font-awesome-icon :icon="category.icon || 'tag'" class="category-icon" />
                      <div>
                        <strong>{{ category.name }}</strong>
                        <small>{{ typeLabel(category.type) }}</small>
                      </div>
                      <div class="row-actions">
                        <button class="icon-btn small" @click="openCategoryForm(category)" title="Editar">
                          <font-awesome-icon icon="pen" />
                        </button>
                        <button class="icon-btn small danger" @click="requestDeleteCategory(category)" title="Excluir">
                          <font-awesome-icon icon="trash" />
                        </button>
                      </div>
                    </article>
                  </div>
                </section>
                <p v-if="filteredCategories.length === 0" class="empty-line">Nenhuma categoria encontrada.</p>
              </div>
            </section>
          </template>

          <template v-else-if="tab.id === 'ai'">
            <ProGate v-if="!canUseAi" @upgrade="showPlanModal = true" />
            <div v-else class="panel ai-panel">
              <div class="panel-title">
                <div>
                  <h3>IA Financeira</h3>
                  <span>Automação, leitura mensal e apoio ao orçamento.</span>
                </div>
                <button class="text-btn" @click="loadInsights" :disabled="loadingAi">
                  <font-awesome-icon :icon="loadingAi ? 'circle-notch' : 'chart-simple'" :spin="loadingAi" />
                  Gerar insights
                </button>
              </div>

              <div class="ai-grid">
                <section class="usage-card">
                  <span>Créditos disponíveis</span>
                  <strong>{{ usage.remaining_credits || 0 }}</strong>
                  <small>
                    {{ usage.used_credits || 0 }} usados de {{ usage.total_credits || usage.monthly_limit || 0 }}
                  </small>
                  <div class="usage-track">
                    <i :style="{ width: usagePercent + '%' }"></i>
                  </div>
                </section>

                <section class="ai-summary">
                  <span>Mês em análise</span>
                  <strong>{{ monthLabel }}</strong>
                  <small>Os insights usam os lançamentos e categorias visíveis neste período.</small>
                </section>
              </div>

              <div class="insight-list">
                <article v-for="(insight, index) in displayInsights" :key="index" class="insight-row">
                  <strong>{{ insight.title }}</strong>
                  <span v-if="insight.description">{{ insight.description }}</span>
                </article>
                <div v-if="displayInsights.length === 0" class="empty-state">
                  <strong>Nenhum insight gerado</strong>
                  <span>Gere uma análise para este mês quando houver movimentos ou orçamento para comparar.</span>
                </div>
              </div>
            </div>
          </template>
        </section>
      </div>
    </div>

    <Transition name="slide-over-root">
      <div v-if="showTransactionForm" class="modal-wrapper-fixed">
        <div class="modal-overlay" @click.self="closeTransactionForm"></div>
        <form class="modal-content nexo-modal transaction-modal glass" :class="form.type.toLowerCase()"
          @submit.prevent="saveTransaction">
          <h3>{{ form.id ? "Editar lançamento" : "Novo lançamento" }}</h3>
          <div class="segmented">
            <button type="button" class="expense-toggle" :class="{ active: form.type === 'EXPENSE' }"
              @click="form.type = 'EXPENSE'">Saída</button>
            <button type="button" class="income-toggle" :class="{ active: form.type === 'INCOME' }"
              @click="form.type = 'INCOME'">Entrada</button>
          </div>
          <div class="nexo-field static-label">
            <label for="transaction-description">Descrição</label>
            <input id="transaction-description" v-model="form.description" placeholder="" required />
          </div>
          <div class="nexo-field static-label textarea">
            <label for="transaction-observation">Observação</label>
            <textarea id="transaction-observation" v-model.trim="form.observation"
              placeholder="Detalhe opcional para diferenciar este movimento"></textarea>
          </div>
          <div class="form-grid">
            <div class="nexo-field static-label">
              <label for="transaction-amount">Valor</label>
              <input id="transaction-amount" v-model="form.amount_display" type="text" inputmode="numeric"
                placeholder="" required @input="updateTransactionAmount" />
            </div>
            <div class="nexo-field static-label">
              <label for="transaction-date">Data</label>
              <input id="transaction-date" v-model="form.transaction_date" type="date" placeholder="" required />
            </div>
          </div>
          <CategoryCombo v-model="form.category_id" :categories="categories" placeholder="Sem categoria" />
          <div class="modal-actions">
            <button type="button" class="text-btn" @click="closeTransactionForm">Cancelar</button>
            <button type="submit" class="primary-action">{{ form.id ? "Salvar alterações" : "Salvar" }}</button>
          </div>
        </form>
      </div>
    </Transition>

    <Transition name="slide-over-root">
      <div v-if="showCategoryForm" class="modal-wrapper-fixed">
        <div class="modal-overlay" @click.self="closeCategoryForm"></div>
        <form class="modal-content nexo-modal glass" @submit.prevent="saveCategoryForm">
          <h3>{{ categoryForm.id ? "Editar categoria" : "Nova categoria" }}</h3>
          <div class="nexo-field static-label">
            <label for="category-name">Nome da categoria</label>
            <input id="category-name" v-model="categoryForm.name" placeholder="" required />
          </div>
          <label class="field-caption">
            <span>Macro categoria</span>
            <MacroCategoryCombo v-model="categoryForm.macro_category" :categories="categories"
              :macro-categories="macroCategories" @change="onCategoryMacroChange" />
          </label>
          <div class="form-grid">
            <div class="nexo-field static-label select-field">
              <label for="category-type">Tipo</label>
              <select id="category-type" v-model="categoryForm.type" required>
                <option value="EXPENSE">Saída</option>
                <option value="INCOME">Entrada</option>
              </select>
            </div>
            <div class="nexo-field static-label color-field">
              <label for="category-macro-color">Cor da macro</label>
              <input id="category-macro-color" v-model="categoryForm.macro_color" type="color" placeholder=""
                title="Cor da macro categoria" />
            </div>
          </div>
          <div class="icon-picker">
            <span>Ícone da categoria</span>
            <div>
              <button v-for="icon in categoryIcons" :key="icon" type="button" class="icon-choice"
                :class="{ active: categoryForm.icon === icon }" @click="categoryForm.icon = icon">
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
          <h3>{{ macroForm.id ? "Editar macro categoria" : "Nova macro categoria" }}</h3>
          <div class="nexo-field static-label">
            <label for="macro-name">Nome da macro categoria</label>
            <input id="macro-name" v-model="macroForm.name" placeholder="" required />
          </div>
          <div class="nexo-field static-label color-field">
            <label for="macro-color">Cor da macro categoria</label>
            <input id="macro-color" v-model="macroForm.color" type="color" placeholder="" />
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
        <form class="modal-content nexo-modal budget-ai-modal glass" @submit.prevent="submitBudgetPlan">
          <div class="budget-ai-modal-header">
            <div>
              <h3>Planejamento com IA</h3>
              <p class="modal-help">
                Descreva o objetivo do mês. Exemplo: reduzir lazer em 10% e reservar mais para impostos.
              </p>
            </div>
            <span>{{ budgetAiContextLabel }}</span>
          </div>

          <div class="budget-ai-chat custom-scrollbar">
            <article v-for="message in budgetAiConversation" :key="message.id" class="budget-ai-message"
              :class="message.role">
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
import { mapState } from "pinia";
import { useAuthStore } from "@/stores/auth";
import { financeService } from "@/services/financeService";
import { getPlanLimits } from "@/services/subscription_plans";
import { db } from "@/db";
import SubscriptionModal from "@/components/SubscriptionModal.vue";
import ConfirmationModal from "@/components/ConfirmationModal.vue";
import CategoryCombo from "./CategoryCombo.vue";
import MacroCategoryCombo from "./MacroCategoryCombo.vue";

const pluggyWidgetUrl = "https://cdn.pluggy.ai/pluggy-connect/latest/pluggy-connect.js";
const includePluggySandbox =
  import.meta.env.VITE_PLUGGY_INCLUDE_SANDBOX === "true" ||
  (!import.meta.env.PROD && import.meta.env.VITE_PLUGGY_INCLUDE_SANDBOX !== "false");

const ProGate = {
  emits: ["upgrade"],
  template: `
    <div class="panel pro-gate">
      <font-awesome-icon icon="lock" />
      <h3>Recurso Pro</h3>
      <p>Open Finance e IA financeira entram no plano Pro.</p>
      <button class="primary-action compact" @click="$emit('upgrade')">
        <font-awesome-icon icon="crown" />
        Ver planos
      </button>
    </div>
  `,
};

export default {
  name: "KademNexo",
  components: { SubscriptionModal, ConfirmationModal, ProGate, CategoryCombo, MacroCategoryCombo },
  data() {
    const today = new Date().toISOString().slice(0, 10);
    return {
      activeTab: "overview",
      selectedMonth: new Date().toISOString().slice(0, 7),
      loading: false,
      syncingBanks: false,
      loadingAi: false,
      savingQuick: false,
      importingCsv: false,
      loadingSchema: false,
      showTransactionForm: false,
      showCategoryForm: false,
      showMacroForm: false,
      showBudgetAiForm: false,
      showPlanModal: false,
      totals: { income: 0, expense: 0, balance: 0 },
      transactions: [],
      categories: [],
      macroCategories: [],
      categorySearch: "",
      pendingCategorySelection: null,
      budgets: [],
      connections: [],
      macroDistribution: [],
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
        type: "EXPENSE",
        icon: "tag",
      },
      macroForm: {
        id: null,
        name: "",
        color: "#999999",
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
        transaction_date: today,
      },
      quickForm: {
        type: "EXPENSE",
        description: "",
        amount: 0,
        amount_display: "",
        category_id: null,
        transaction_date: today,
      },
      csvImportError: "",
      csvImportFileName: "",
      csvRawRows: [],
      csvImportRows: [],
      csvSkippedRows: 0,
      categorizingAi: false,
      categorizingIds: [],
      tabs: [
        { id: "overview", label: "Visão", icon: "chart-simple" },
        { id: "transactions", label: "Movimentos", icon: "list" },
        { id: "budget", label: "Orçamento", icon: "clipboard" },
        { id: "connections", label: "Conexões", icon: "link" },
        { id: "categories", label: "Categorias", icon: "layer-group" },
        { id: "ai", label: "IA", icon: "crown", pro: true },
      ],
    };
  },
  computed: {
    ...mapState(useAuthStore, ["user"]),
    activeTabIndex() {
      return Math.max(0, this.tabs.findIndex((tab) => tab.id === this.activeTab));
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
      return { width: size, flexBasis: size };
    },
    limits() {
      return getPlanLimits(this.user?.plan_tier || "free");
    },
    isPaidPlan() {
      return this.user?.plan_tier && this.user.plan_tier !== "free";
    },
    canUseAi() {
      return this.isPaidPlan && Number(this.limits.finance_ai_monthly_credits || 0) > 0;
    },
    planLabel() {
      const labels = { free: "Free", pro: "Pro", enterprise: "Enterprise" };
      return labels[this.user?.plan_tier] || "Free";
    },
    aiUsageLabel() {
      if (!this.canUseAi) return "IA bloqueada";
      return `${this.usage.remaining_credits ?? this.limits.finance_ai_monthly_credits} créditos IA`;
    },
    expensePercent() {
      if (!this.totals.income) return 0;
      return Math.min(100, Math.round((this.totals.expense / this.totals.income) * 100));
    },
    usagePercent() {
      const total = Number(this.usage.total_credits || this.usage.monthly_limit || 0);
      if (!total) return 0;
      return Math.min(100, Math.round((Number(this.usage.used_credits || 0) / total) * 100));
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
        groups.set(macro.name, { ...macro, items: [] });
      });

      this.filteredCategories.forEach((category) => {
        const macroName = category.macro_category || "Geral";
        if (!groups.has(macroName)) {
          groups.set(macroName, {
            id: category.macro_category_id || null,
            name: macroName,
            color: category.macro_color || category.color || "#999999",
            items: [],
          });
        }
        groups.get(macroName).items.push(category);
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

        if (
          normalizedTitle.includes("sem transacoes") &&
          normalizedDescription.includes("nao ha registros")
        ) {
          return { title: "Movimentação do mês", description };
        }

        if (normalizedTitle && normalizedTitle === normalizedDescription) {
          return { title, description: "" };
        }

        return { title, description };
      });
    },
    donutGradient() {
      const total = this.macroDistribution.reduce((sum, item) => sum + Number(item.total || 0), 0);
      if (!total) return "conic-gradient(var(--gray-600) 0deg 360deg)";

      let cursor = 0;
      const parts = this.macroDistribution.map((item) => {
        const degrees = (Number(item.total || 0) / total) * 360;
        const part = `${item.color || "#999999"} ${cursor}deg ${cursor + degrees}deg`;
        cursor += degrees;
        return part;
      });
      return `conic-gradient(${parts.join(", ")})`;
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
      return String(left ?? "") === String(right ?? "");
    },
    setActiveTab(tabId) {
      this.activeTab = tabId;
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
    signedMoney(transaction) {
      const prefix = transaction.type === "EXPENSE" ? "-" : "+";
      return `${prefix} ${this.money(transaction.amount)}`;
    },
    shortDate(value) {
      if (!value) return "--";
      try {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return "--";
        return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      } catch {
        return "--";
      }
    },
    categoryLabel(transaction) {
      return transaction.category_name || this.findCategory(transaction.category_id)?.name || "Sem categoria";
    },
    typeLabel(type) {
      const labels = { EXPENSE: "Saída", INCOME: "Entrada" };
      return labels[type] || "Não definido";
    },
    polarityLabel(type) {
      return type === "INCOME" ? "positivo" : "negativo";
    },
    sourceLabel(source) {
      const labels = { MANUAL: "Manual", OPEN_FINANCE: "Open Finance", IMPORT: "CSV" };
      return labels[source] || "Não definido";
    },
    connectionStatusLabel(status) {
      const labels = {
        UPDATED: "Atualizada",
        UPDATING: "Atualizando",
        LOGIN_ERROR: "Erro de acesso",
        OUTDATED: "Desatualizada",
        DELETED: "Removida",
      };
      return labels[status] || "Pendente";
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
      const safe = normalized.length === 3
        ? normalized.split("").map((char) => char + char).join("")
        : normalized.padEnd(6, "9").slice(0, 6);
      const value = Number.parseInt(safe, 16);
      const r = (value >> 16) & 255;
      const g = (value >> 8) & 255;
      const b = value & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    },
    budgetAiStorageKey() {
      return `kadem:nexo:budget-ai:${this.user?.id || "local"}:${this.selectedMonth}`;
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
        .map((message) => `${message.role === "assistant" ? "IA" : "Usuário"}: ${message.content}`)
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
    },
    async reloadAll() {
      this.loading = true;
      try {
        await Promise.all([
          this.loadDashboard(),
          this.loadMacroCategories(),
          this.loadCategories(),
          this.loadBudgets(),
          this.loadConnections(),
          this.loadUsage(),
        ]);
        this.loadBudgetAiConversation();
      } finally {
        this.loading = false;
      }
    },
    async loadDashboard() {
      const { data } = await financeService.getDashboard({ month: this.selectedMonth });
      this.totals = data.totals || { income: 0, expense: 0, balance: 0 };
      this.transactions = data.transactions || [];
      this.macroDistribution = data.macro_distribution || [];
    },
    async loadCategories() {
      const { data } = await financeService.getCategories();
      this.categories = data || [];
    },
    async loadMacroCategories() {
      const { data } = await financeService.getMacroCategories();
      this.macroCategories = data || [];
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
      return {
        ...item,
        _key: item._key || item.id || `item-${Date.now()}-${Math.random()}`,
        amount: Number(item.amount || 0),
        amount_display: this.moneyInput(item.amount || 0),
        actual_amount: Number(item.actual_amount || 0),
        type: item.type || this.findCategory(item.category_id)?.type || "EXPENSE",
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
      const { data } = await financeService.getUsage();
      this.usage = data || {};
    },
    openTransactionForm(transaction = null) {
      const amount = Number(transaction?.amount || 0);
      this.form = {
        id: transaction?.id || transaction?.local_id || null,
        type: transaction?.type || "EXPENSE",
        description: transaction?.description || "",
        observation: transaction?.observation || "",
        amount,
        amount_display: transaction ? this.moneyInput(amount) : "",
        category_id: transaction?.category_id || null,
        transaction_date: String(transaction?.transaction_date || new Date().toISOString().slice(0, 10)).slice(0, 10),
      };
      this.showTransactionForm = true;
    },
    closeTransactionForm() {
      this.showTransactionForm = false;
    },
    updateTransactionAmount(event) {
      const value = this.parseMoneyInput(event.target.value);
      this.form.amount = value;
      this.form.amount_display = this.moneyInput(value);
      event.target.value = this.form.amount_display;
    },
    async saveTransaction() {
      const payload = {
        ...this.form,
        observation: this.form.observation || null,
        amount: Number(this.form.amount || 0),
      };
      if (this.form.id) {
        await financeService.updateTransaction(this.form.id, payload);
      } else {
        await financeService.createTransaction(payload);
      }
      this.closeTransactionForm();
      await this.loadDashboard();
    },
    resetQuickForm(keepType = true) {
      this.quickForm = {
        type: keepType ? this.quickForm.type : "EXPENSE",
        description: "",
        amount: 0,
        amount_display: "",
        category_id: null,
        transaction_date: new Date().toISOString().slice(0, 10),
      };
    },
    updateQuickAmount(event) {
      const value = this.parseMoneyInput(event.target.value);
      this.quickForm.amount = value;
      this.quickForm.amount_display = this.moneyInput(value);
      event.target.value = this.quickForm.amount_display;
    },
    async saveQuickTransaction() {
      if (!this.quickForm.description || !Number(this.quickForm.amount)) return;
      this.savingQuick = true;
      try {
        await financeService.createTransaction({
          ...this.quickForm,
          amount: Number(this.quickForm.amount || 0),
          source: "MANUAL",
        });
        this.resetQuickForm();
        await this.loadDashboard();
      } finally {
        this.savingQuick = false;
      }
    },
    getRefElement(ref) {
      if (!ref) return null;
      return Array.isArray(ref) ? ref[0] : ref;
    },
    triggerCsvPicker() {
      if (!this.isPaidPlan) {
        this.showPlanModal = true;
        return;
      }
      this.getRefElement(this.$refs.csvInput)?.click();
    },
    resetCsvImport() {
      this.csvImportError = "";
      this.csvImportFileName = "";
      this.csvRawRows = [];
      this.csvImportRows = [];
      this.csvSkippedRows = 0;
      this.loadingSchema = false;
      const csvInput = this.getRefElement(this.$refs.csvInput);
      if (csvInput) csvInput.value = "";
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
      this.csvImportRows = [];
      this.loadingSchema = true;

      try {
        const text = await file.text();
        const clean = String(text || "").replace(/^\uFEFF/, "").trim();
        const lines = clean.split(/\r?\n/).filter((line) => line.trim());
        if (lines.length < 2) {
          throw new Error("O CSV precisa ter cabeçalho e pelo menos uma linha.");
        }

        const header = lines[0];
        const samples = lines.slice(1, 4); // Take up to 3 lines

        // Check local storage cache for this header to save credits and ensure determinism
        const cacheKey = `kadem:nexo:csv-schema:${this.normalizeKey(header)}`;
        let schema = null;
        try {
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            schema = JSON.parse(cached);
            console.log("[CSV Import] Reusing cached schema:", schema);
          }
        } catch (err) {
          console.warn("[CSV Import] Failed to read cached schema:", err);
        }

        if (!schema) {
          // Send to backend for schema analysis
          const response = await financeService.analyzeCsvSchema({ header, samples });
          schema = response.data;
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

        await this.parseCsvWithSchema(lines, schema);
      } catch (error) {
        this.csvImportRows = [];
        this.csvImportError = error.response?.data?.message || error.message || "Não foi possível processar o CSV.";
      } finally {
        this.loadingSchema = false;
        const csvInput = this.getRefElement(this.$refs.csvInput);
        if (csvInput) csvInput.value = "";
      }
    },
    cleanCsvCell(val) {
      if (typeof val !== 'string') return '';
      let clean = val.trim();
      // Remove enclosing quotes
      while ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
        clean = clean.substring(1, clean.length - 1).trim();
      }
      // Remove any leftover outer quotes or weird trailing quotes
      clean = clean.replace(/^['"]|['"]$/g, '').trim();
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
    async parseCsvWithSchema(lines, schema) {
      const delimiter = schema.delimiter || this.detectCsvDelimiter(lines[0]);
      const rawHeaders = this.splitCsvLine(lines[0], delimiter).map(h => this.cleanCsvCell(h));

      // Find indices of columns
      const dateIdx = rawHeaders.findIndex(h => this.normalizeKey(h) === this.normalizeKey(schema.dateColumn));
      const descIdx = rawHeaders.findIndex(h => this.normalizeKey(h) === this.normalizeKey(schema.descriptionColumn));
      const amountIdx = rawHeaders.findIndex(h => this.normalizeKey(h) === this.normalizeKey(schema.amountColumn));
      const typeIdx = schema.typeColumn ? rawHeaders.findIndex(h => this.normalizeKey(h) === this.normalizeKey(schema.typeColumn)) : -1;

      if (dateIdx === -1 || descIdx === -1 || amountIdx === -1) {
        throw new Error("Não foi possível mapear as colunas essenciais do CSV com o esquema detectado.");
      }

      // Build local history category memory on the fly
      const localTxs = await db.finance_transactions.toArray();
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

      for (let index = 1; index < lines.length; index += 1) {
        const line = lines[index].trim();
        if (!line) continue;

        const values = this.splitCsvLine(line, delimiter).map(val => this.cleanCsvCell(val));

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
            return patterns.some(pat => {
              const normPat = normFn(pat);
              return norm.includes(normPat);
            });
          };

          const isExpensePattern = (str) => {
            if (!str) return false;
            const norm = normFn(str);
            const patterns = [...(schema.expensePatterns || []), ...stdExpense];
            return patterns.some(pat => {
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
    detectCsvDelimiter(headerLine) {
      const options = [";", ",", "\t"];
      return options
        .map((delimiter) => ({ delimiter, count: this.splitCsvLine(headerLine, delimiter).length }))
        .sort((a, b) => b.count - a.count)[0].delimiter;
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

      const negative = raw.includes("-") || (raw.includes("(") && raw.includes(")"));
      let normalized = raw.replace(/\s/g, "").replace(/[R$()]/g, "").replace(/[^0-9,.-]/g, "");
      const lastComma = normalized.lastIndexOf(",");
      const lastDot = normalized.lastIndexOf(".");

      if (lastComma > -1 && lastDot > -1) {
        normalized = lastComma > lastDot
          ? normalized.replace(/\./g, "").replace(",", ".")
          : normalized.replace(/,/g, "");
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

      const brMatch = raw.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
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
      return this.categories.find((category) =>
        this.normalize(category.name) === normalized && (!type || category.type === type),
      ) || this.categories.find((category) => this.normalize(category.name) === normalized);
    },
    async confirmCsvImport() {
      if (!this.csvImportRows.length) return;
      this.importingCsv = true;
      try {
        const cleanRows = this.csvImportRows.map((row) => ({
          description: String(row.description || ""),
          amount: Number(row.amount || 0),
          type: String(row.type || "EXPENSE"),
          category_id: row.category_id || null,
          transaction_date: String(row.transaction_date),
          status: "PAID",
          source: "IMPORT",
        }));
        await financeService.createTransactionsBatch(cleanRows);
        this.resetCsvImport();
        await this.loadDashboard();
      } finally {
        this.importingCsv = false;
      }
    },

    transactionKey(transaction) {
      return transaction?.id || transaction?.local_id || null;
    },
    transactionMatches(transaction, id) {
      return this.sameId(transaction?.id, id) || this.sameId(transaction?.local_id, id);
    },
    async selectTransactionCategory(transaction, categoryId, options = {}) {
      const category = this.findCategory(categoryId);
      const update = { category_id: categoryId || null };
      const originalType = transaction?.original_type || options.originalType || transaction?.type;

      if (!categoryId && transaction?.original_type) {
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

      return this.categories.find((category) => (
        this.sameId(category.id, savedCategory.id)
          || this.sameId(category.local_id, savedCategory.local_id)
          || (
            this.normalize(category.name) === savedName
            && this.normalize(category.macro_category) === savedMacro
            && category.type === savedCategory.type
          )
      )) || savedCategory;
    },
    async applyPendingCategorySelection(savedCategory) {
      if (!this.pendingCategorySelection) return;
      const pending = this.pendingCategorySelection;
      const category = this.resolveSavedCategory(savedCategory);
      const transaction = this.transactions.find((item) => (
        this.transactionMatches(item, pending.transactionId)
          || this.transactionMatches(item, pending.transactionLocalId)
      ));

      if (transaction && category?.id) {
        await this.selectTransactionCategory(transaction, category.id, { originalType: pending.originalType });
      }

      this.pendingCategorySelection = null;
    },
    applyTransactionPatch(id, data) {
      this.transactions = this.transactions.map((transaction) =>
        this.transactionMatches(transaction, id)
          ? { ...transaction, ...data }
          : transaction,
      );
    },
    async updateTransaction(id, data) {
      this.applyTransactionPatch(id, data);
      const { data: local } = await financeService.updateTransaction(id, data);
      if (local) {
        this.applyTransactionPatch(id, local);
      }
      await this.loadDashboard();
    },
    async toggleIgnored(transaction) {
      const nextIgnored = !transaction.is_ignored;
      this.applyTransactionPatch(transaction.id, { is_ignored: nextIgnored });
      await this.updateTransaction(transaction.id, { is_ignored: nextIgnored });
    },
    async deleteTransaction(id) {
      await financeService.deleteTransaction(id);
      await this.loadDashboard();
    },
    findCategory(categoryId) {
      return this.categories.find((category) => this.sameId(category.id, categoryId));
    },
    findMacroByName(name) {
      return this.macroCategories.find((macro) => this.normalize(macro.name) === this.normalize(name));
    },
    categoriesForMacro(group) {
      return this.categories.filter((category) => this.normalize(category.macro_category) === this.normalize(group.macro_category));
    },
    availableCategoriesForMacro(group, currentItem) {
      const allCategoriesForMacro = this.categoriesForMacro(group);
      const usedCategoryIds = new Set();
      this.budgets.forEach((g) => {
        (g.items || []).forEach((item) => {
          if (item.category_id && item.category_id !== currentItem?.category_id) {
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
      group.macro_category_id = macro?.id || null;
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
      item.type = this.findCategory(item.category_id)?.type || "EXPENSE";
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
      this.categoryForm = {
        id: category?.id || null,
        name: category?.name || "",
        macro_category: category?.macro_category || "Geral",
        macro_color: category?.macro_color || category?.color || "#999999",
        type: category?.type || "EXPENSE",
        icon: category?.icon || "tag",
      };
      this.showCategoryForm = true;
    },
    openCategoryFormForTransaction(transaction, suggestedName = "") {
      this.openCategoryForm(
        {
          name: suggestedName,
          macro_category: "Geral",
          macro_color: "#999999",
          type: transaction?.type || "EXPENSE",
          icon: "tag",
        },
        {
          transactionId: transaction?.id,
          transactionLocalId: transaction?.local_id,
          originalType: transaction?.original_type || transaction?.type,
        },
      );
    },
    closeCategoryForm() {
      this.showCategoryForm = false;
      this.pendingCategorySelection = null;
    },
    onCategoryMacroChange(macroName) {
      const macro = this.findMacroByName(macroName);
      if (macro?.color) {
        this.categoryForm.macro_color = macro.color;
      }
    },
    async saveCategoryForm() {
      let savedCategory = null;
      if (this.categoryForm.id) {
        const { data } = await financeService.updateCategory(this.categoryForm.id, this.categoryForm);
        savedCategory = data;
      } else {
        const { data } = await financeService.createCategory(this.categoryForm);
        savedCategory = data;
      }
      this.showCategoryForm = false;
      await Promise.all([this.loadMacroCategories(), this.loadCategories(), this.loadDashboard()]);
      await this.applyPendingCategorySelection(savedCategory);
    },
    openMacroForm(macro = null) {
      this.macroForm = {
        id: macro?.id || null,
        name: macro?.name || "",
        color: macro?.color || "#999999",
      };
      this.showMacroForm = true;
    },
    async saveMacroForm() {
      if (this.macroForm.id) {
        await financeService.updateMacroCategory(this.macroForm.id, this.macroForm);
      } else {
        await financeService.createMacroCategory(this.macroForm);
      }
      this.showMacroForm = false;
      await Promise.all([this.loadMacroCategories(), this.loadCategories(), this.loadBudgets(), this.loadDashboard()]);
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
        message: `Excluir o lançamento "${transaction.description}"?`,
        description: `Esta ação excluirá o lançamento no valor de ${this.money(transaction.amount)} e não poderá ser desfeita.`,
        confirmText: "Excluir",
        action: async () => {
          await financeService.deleteTransaction(transaction.id);
          await Promise.all([
            this.loadMacroCategories(),
            this.loadCategories(),
            this.loadBudgets(),
            this.loadDashboard(),
          ]);
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
        message: `Excluir a macro categoria "${macro.name}"? As categorias filhas devem ser movidas antes para evitar perda de organização.`,
      };
    },
    closeDeleteConfirm() {
      this.confirmDelete = { visible: false, type: null, payload: null, message: "" };
    },
    async confirmDeleteAction() {
      const { type, payload } = this.confirmDelete;
      if (type === "category") {
        await financeService.deleteCategory(payload.id);
      }
      if (type === "macro") {
        await financeService.deleteMacroCategory(payload.id);
      }
      this.closeDeleteConfirm();
      await Promise.all([this.loadMacroCategories(), this.loadCategories(), this.loadBudgets(), this.loadDashboard()]);
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
        const targetTransactions = this.transactions.filter(
          (t) => !t.category_id && !t.is_ignored
        );

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
            .replace(/[^a-z0-9]/g, " ")      // Replace special characters and punctuation with spaces
            .replace(/\s+/g, " ")            // Collapse multiple spaces
            .trim();
        };

        // 2. Fetch all local transactions from Dexie database to build the description category frequency map
        const localTxs = await db.finance_transactions.toArray();
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
          console.log(`[CategorizeMemory] Requesting AI categorization for ${remainingIds.length} unknown transactions...`);
          this.categorizingIds = [...remainingIds];
          await financeService.autoCategorize({ transaction_ids: remainingIds });
        } else {
          console.log(`[CategorizeMemory] All ${localMatchUpdates.length} transactions resolved from history! Bypassed AI call.`);
        }

        await Promise.all([this.loadDashboard(), this.loadUsage()]);
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
    async submitBudgetPlan() {
      if (!this.budgetAiPrompt.trim()) return;
      this.loadingAi = true;
      try {
        const requestText = this.budgetAiPrompt.trim();
        this.appendBudgetAiMessage("user", requestText);
        const { data } = await financeService.generateBudgetPlan({
          month: this.selectedMonth,
          text: requestText,
          conversation_summary: this.budgetAiContextSummary,
        });
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
                type: this.findCategory(item.category_id)?.type || "EXPENSE",
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
        const insightText = Array.isArray(data.insights) && data.insights.length > 0
          ? data.insights.slice(0, 2).join(" ")
          : "Plano gerado para o mês com base no seu pedido.";
        this.appendBudgetAiMessage("assistant", insightText);
        this.budgetAiInlinePrompt = "";
        this.budgetAiPrompt = "";
        this.showBudgetAiForm = false;
        await this.loadUsage();
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
  },
  mounted() {
    this.reloadAll();
    document.addEventListener("keydown", this.handleGlobalKeydown);
  },
  beforeUnmount() {
    document.removeEventListener("keydown", this.handleGlobalKeydown);
  },
};
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
.nexo-header,
.panel-title,
.nexo-actions,
.inline-actions,
.modal-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.nexo-header {
  flex-wrap: wrap;
  flex: 0 0 auto;
}

.nexo-header h2,
.panel-title h3,
.macro-group h4 {
  margin: 0;
}

.nexo-header span,
.empty-line,
.movement-row span,
.connection-card span,
.category-card small,
.usage-card span,
.usage-card small,
.ai-summary span,
.ai-summary small,
.insight-row span,
.modal-help,
.panel-title span,
.macro-group header span {
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
}

.nexo-actions {
  justify-content: flex-end;
  flex-wrap: wrap;
}

.nexo-actions input {
  height: 40px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  background: var(--surface-0);
  color: var(--text-primary);
  padding: 0 var(--space-3);
  box-shadow: none;
  outline: none;
  font-size: var(--fontsize-sx);
  transition: border-color var(--transition-fast);
}

.nexo-actions input:focus {
  border-color: var(--deep-blue);
  outline: none;
  box-shadow: none;
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
  transition: transform var(--transition-fast), background var(--transition-fast),
    box-shadow var(--transition-fast), filter var(--transition-fast);
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
.nexo-tabs button:active,
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

.nexo-tabs {
  display: flex;
  gap: var(--space-5);
  border-bottom: 1px solid var(--glass-border);
  overflow-x: auto;
  overflow-y: hidden;
  flex: 0 0 auto;
  scrollbar-width: none;
}

.nexo-tabs::-webkit-scrollbar {
  display: none;
}

.nexo-tabs button {
  position: relative;
  border: none;
  background: transparent;
  color: var(--text-muted);
  padding: var(--space-3) 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  white-space: nowrap;
  font-size: var(--fontsize-sx);
  font-weight: 500;
  transition: color var(--transition-fast);
}

.nexo-tabs button:hover,
.nexo-tabs button.active {
  color: var(--text-primary);
}

.nexo-tabs button.active {
  font-weight: 700;
}

.nexo-tabs button.active::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  border-radius: 2px 2px 0 0;
  background: var(--deep-blue);
  animation: tab-underline-in 0.2s var(--transition-spring);
}

@keyframes tab-underline-in {
  from {
    transform: scaleX(0);
  }

  to {
    transform: scaleX(1);
  }
}

.tab-lock {
  color: #d4af37;
  font-size: 0.7rem;
  opacity: 0.8;
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
.metric,
.connection-card,
.category-card,
.budget-row,
.usage-card,
.ai-summary {
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  transition: background var(--transition-base), border-color var(--transition-base);
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

.panel-title>div {
  display: grid;
  gap: var(--space-1);
}

.inline-actions {
  display: flex !important;
  gap: var(--space-3) !important;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(150px, 1fr));
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.metric {
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.metric strong {
  font-size: var(--fontsize-md);
}

.metric.income strong,
.INCOME {
  color: var(--color-income);
}

.metric.expense strong,
.EXPENSE,
.negative {
  color: var(--color-expense);
}

.overview-grid {
  display: grid;
  grid-template-columns: minmax(280px, 0.9fr) minmax(320px, 1.1fr);
  gap: var(--space-4);
}

.allocation-body {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: var(--space-5);
  align-items: center;
}

.donut {
  width: 180px;
  aspect-ratio: 1;
  border-radius: 50%;
  display: grid;
  place-items: center;
}

.donut-hole {
  width: 116px;
  aspect-ratio: 1;
  border-radius: 50%;
  background: var(--surface-0);
  display: grid;
  place-items: center;
  align-content: center;
  transition: background var(--transition-base);
}

.donut-hole span {
  font-weight: 900;
  font-size: var(--fontsize-md);
  color: var(--text-primary);
}

.donut-hole small {
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.05em;
}

.legend-list,
.compact-list,
.budget-list,
.budget-groups,
.budget-child-list,
.insight-list,
.macro-groups {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.legend-row,
.movement-row,
.connection-card,
.category-card,
.budget-row,
.insight-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.legend-row strong,
.movement-row b {
  margin-left: auto;
}

.swatch {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex: 0 0 12px;
}

.movement-row {
  justify-content: space-between;
  padding: var(--space-3) var(--space-2);
  border-bottom: 1px solid var(--glass-border);
  transition: background var(--transition-fast);
  border-radius: var(--radius-xs);
}

.movement-row:hover {
  background: var(--surface-2);
}

.transaction-tools {
  display: grid;
  gap: var(--space-4);
  margin-bottom: var(--space-5);
}

.quick-entry-card,
.csv-import-card {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  background: var(--surface-1);
  transition: background var(--transition-base), border-color var(--transition-base);
}

.quick-entry-card {
  grid-template-columns: minmax(220px, 1fr) minmax(220px, 1.35fr) 150px 150px minmax(210px, 1fr) auto;
  align-items: end;
}

.quick-entry-heading,
.csv-import-header,
.csv-preview-summary,
.csv-import-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.quick-entry-heading {
  align-items: stretch;
  flex-direction: column;
}

.quick-entry-heading strong,
.csv-import-header strong {
  color: var(--text-primary);
}

.compact-segmented {
  min-width: 190px;
  padding: 4px;
}

.compact-segmented button {
  height: 32px;
}

.quick-field,
.quick-category-field,
.csv-positive-mode {
  display: grid;
  gap: var(--space-1);
  min-width: 0;
}

.quick-field span,
.quick-category-field>span,
.csv-positive-mode span {
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
  font-weight: 700;
}

.quick-field input,
.csv-positive-mode select {
  height: 40px;
  width: 100%;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  background: var(--surface-0);
  color: var(--text-primary);
  padding: 0 var(--space-3);
  outline: none;
  box-shadow: none;
  transition: border-color var(--transition-fast), background var(--transition-base);
}

.quick-field input:focus,
.csv-positive-mode select:focus {
  border-color: var(--deep-blue);
  background: var(--surface-0);
}

.quick-field input::placeholder {
  color: var(--text-muted);
}

.quick-save {
  min-width: 132px;
}

.csv-import-header {
  flex-wrap: wrap;
}

.csv-import-header>div:first-child {
  display: grid;
  gap: var(--space-1);
}

.csv-import-header span,
.csv-preview-summary span,
.import-feedback {
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
}

.csv-positive-mode {
  min-width: 150px;
}

.csv-positive-mode select {
  height: 36px;
  font-size: var(--fontsize-xs);
}

.csv-preview {
  display: grid;
  gap: var(--space-3);
}

.csv-preview-table {
  overflow-x: auto;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
}

.csv-preview-table table {
  min-width: 520px;
}

.csv-preview-table td {
  padding: var(--space-2) var(--space-3);
}

.csv-import-actions {
  justify-content: flex-end;
}

.import-feedback {
  margin: 0;
}

.import-feedback.error {
  color: var(--red);
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

.movement-row div,
.connection-card div,
.category-card div,
.insight-row {
  min-width: 0;
}

.movement-row strong,
.movement-row span,
.connection-card strong,
.connection-card span,
.category-card strong,
.category-card small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

.table-wrap {
  overflow: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 820px;
}

th,
td {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--glass-border);
  text-align: left;
  vertical-align: middle;
}

th {
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: var(--surface-1);
  position: sticky;
  top: 0;
  z-index: 1;
}

tr:hover td {
  background: var(--surface-1);
}

.right {
  text-align: right;
}

.value-cell strong,
.value-cell small {
  display: block;
}

.transaction-description-cell strong,
.transaction-description-cell small {
  display: block;
}

.transaction-observation {
  margin-top: var(--space-1);
  color: var(--text-muted);
  font-size: var(--fontsize-xs);
  line-height: 1.4;
  white-space: normal;
}

.original-type-label {
  margin-top: var(--space-1);
  color: var(--text-muted);
  font-size: var(--fontsize-xs);
  white-space: nowrap;
}

.row-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

tr.ignored {
  opacity: 0.45;
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

.budget-inline-ai>span {
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

.budget-group-title>svg {
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
  transition: background var(--transition-fast), color var(--transition-fast), transform var(--transition-fast);
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
  transition: border-color var(--transition-fast), background var(--transition-base);
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
.usage-track {
  height: 8px;
  background: var(--surface-2);
  border-radius: 999px;
  overflow: hidden;
}

.budget-progress i,
.usage-track i {
  height: 100%;
  display: block;
  background: var(--yellow-gradient);
  transition: width 0.24s ease;
}

.budget-row-enter-active,
.budget-row-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
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

.connection-grid,
.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-3);
}

.connection-card,
.category-card,
.insight-row,
.usage-card,
.ai-summary {
  padding: var(--space-4);
}

.connection-card button,
.category-card button {
  margin-left: auto;
}

.connections-soon {
  min-height: 320px;
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-5);
}

.connections-soon h3,
.connections-soon p {
  margin: 0;
}

.connections-soon p {
  max-width: 620px;
  color: var(--text-secondary);
  line-height: 1.55;
}

.soon-icon {
  width: 72px;
  height: 72px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-md);
  background: var(--surface-2);
  color: var(--deep-blue);
  font-size: var(--fontsize-md);
}

.soon-kicker {
  display: inline-flex;
  width: max-content;
  margin-bottom: var(--space-2);
  border-radius: 999px;
  background: var(--dark-yellow-2);
  color: var(--gray-100);
  padding: var(--space-1) var(--space-3);
  font-size: var(--fontsize-xs);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.macro-group {
  display: grid;
  gap: var(--space-4);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  border-left: 4px solid var(--budget-macro-color, var(--glass-border));
  transition: background var(--transition-base);
}

.macro-group header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-sm);
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  transition: background var(--transition-base);
}

.category-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4) !important;
  background: var(--surface-1) !important;
  border: 1px solid var(--glass-border) !important;
  border-radius: var(--radius-sm) !important;
  box-shadow: var(--shadow-xs) !important;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast), background var(--transition-fast) !important;
}

.category-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card) !important;
  background: var(--surface-2) !important;
}

.category-card .row-actions {
  display: flex;
  gap: var(--space-1);
  margin-left: auto;
  opacity: 0.4;
  transition: opacity var(--transition-fast);
}

.category-card:hover .row-actions {
  opacity: 1;
}

.category-card button {
  margin-left: initial !important;
}

@media (max-width: 600px) {
  .category-grid {
    grid-template-columns: 1fr !important;
  }
}

.macro-heading {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.category-filter {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 42px;
  margin-bottom: var(--space-5);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  background: var(--surface-0);
  padding: 0 var(--space-3);
  transition: background var(--transition-base);
}

.category-filter input {
  min-width: 0;
  width: 100%;
  height: 40px;
  border: none;
  background: transparent;
  box-shadow: none;
  outline: none;
  color: var(--text-primary);
  padding: 0;
}

.category-icon {
  color: var(--text-primary);
  width: 18px;
  opacity: 0.7;
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

.budget-ai-modal-header>span {
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

.pro-gate {
  min-height: 260px;
  display: grid;
  place-items: center;
  align-content: center;
  text-align: center;
  gap: var(--space-3);
}

.pro-gate>svg {
  font-size: var(--fontsize-lg);
  color: #d4af37;
}

.ai-grid {
  display: grid;
  grid-template-columns: minmax(220px, 0.7fr) minmax(260px, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.usage-card,
.ai-summary {
  display: grid;
  gap: var(--space-2);
}

.usage-card strong,
.ai-summary strong {
  font-size: var(--fontsize-md);
}

.empty-state {
  display: grid;
  gap: var(--space-1);
  padding: var(--space-5);
  border: 1.5px dashed var(--glass-border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
}

.empty-state span {
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
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

.transaction-modal.expense {
  background: linear-gradient(160deg, rgba(255, 246, 246, 0.97), rgba(255, 255, 255, 0.95));
}

.transaction-modal.income {
  background: linear-gradient(160deg, rgba(243, 255, 247, 0.97), rgba(255, 255, 255, 0.95));
}

[data-theme="dark"] .nexo-modal {
  background: var(--surface-2);
  color: var(--text-primary);
}

[data-theme="dark"] .transaction-modal.expense {
  background: linear-gradient(160deg, rgba(231, 76, 60, 0.12), var(--surface-2));
}

[data-theme="dark"] .transaction-modal.income {
  background: linear-gradient(160deg, rgba(46, 204, 113, 0.12), var(--surface-2));
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
  transition: border-color var(--transition-fast), background var(--transition-base);
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

[data-theme="dark"] .nexo-field label {
  color: var(--gray-400);
}

.nexo-field.static-label {
  display: grid;
  gap: var(--space-1);
}

.nexo-field.static-label label,
.field-caption>span,
.icon-picker>span {
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

.color-field input {
  padding: var(--space-2) var(--space-3);
}

.icon-picker>div {
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
  transition: transform var(--transition-fast), background var(--transition-fast), box-shadow var(--transition-fast);
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
  transition: transform var(--transition-fast), background var(--transition-fast), box-shadow var(--transition-fast);
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
}

/* Animação dos modais do Nexo - usa a mesma do SideModal global (floating-modal) */
/* Definida em SideModal.vue e main.css, reutilizada aqui sem redeclaração */

@media (max-width: 900px) {

  .summary-grid,
  .overview-grid,
  .allocation-body,
  .ai-grid,
  .budget-summary-grid,
  .quick-entry-card,
  .connections-soon {
    grid-template-columns: 1fr;
  }

  .allocation-body {
    justify-items: center;
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

  .quick-entry-heading,
  .csv-import-header,
  .csv-preview-summary {
    align-items: stretch;
    flex-direction: column;
  }

  .quick-save,
  .connections-soon .primary-action {
    width: 100%;
  }

  .connections-soon {
    justify-items: start;
    min-height: 260px;
  }

  .budget-ai-message {
    max-width: 100%;
  }
}

@media (max-width: 760px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .nexo-tabs {
    gap: var(--space-4);
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

.categorizing-loading-text {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
  font-weight: 600;
}
</style>
