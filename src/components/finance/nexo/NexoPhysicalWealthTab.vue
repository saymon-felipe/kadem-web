<template>
  <div class="physical-tab">
    <!-- Resumo Rápido de Indicadores (KPIs do Topo) -->
    <section v-if="state?.summary" class="physical-metrics-grid">
      <article class="metric-card">
        <div class="metric-icon highlight">
          <font-awesome-icon icon="vault" />
        </div>
        <div class="metric-info">
          <span class="metric-label">Patrimônio físico total</span>
          <strong class="metric-value gold-value">{{ money(state.summary.physical_total) }}</strong>
          <small class="metric-sub">Dinheiro + Metais estimados</small>
        </div>
      </article>

      <article class="metric-card">
        <div class="metric-icon success">
          <font-awesome-icon icon="wallet" />
        </div>
        <div class="metric-info">
          <span class="metric-label">Dinheiro em mãos</span>
          <strong class="metric-value positive">{{ money(state.summary.cash) }}</strong>
          <small class="metric-sub">{{ state.wallets?.length || 0 }} conta(s) física(s)</small>
        </div>
      </article>

      <article class="metric-card">
        <div class="metric-icon gold">
          <font-awesome-icon icon="coins" />
        </div>
        <div class="metric-info">
          <span class="metric-label">Metais de reserva</span>
          <strong class="metric-value gold-value">
            {{ money(state.summary.missing_quotes ? null : state.summary.metals) }}
          </strong>
          <small class="metric-sub">{{ state.holdings?.length || 0 }} lote(s) custodiado(s)</small>
        </div>
      </article>

      <article class="metric-card">
        <div class="metric-icon primary">
          <font-awesome-icon icon="building-columns" />
        </div>
        <div class="metric-info">
          <span class="metric-label">Consolidado geral</span>
          <strong class="metric-value">{{ money(state.summary.consolidated_total) }}</strong>
          <small class="metric-sub">Digital + Físico</small>
        </div>
      </article>
    </section>

    <!-- Painel Principal do Patrimônio Físico -->
    <section class="panel physical-panel">
      <header class="panel-title">
        <div class="title-block">
          <div class="title-with-badge">
            <h3>Patrimônio Físico</h3>
            <span v-if="offline" class="offline-pill" title="Sem conexão no momento">
              <font-awesome-icon icon="wifi" />
              <span>Offline</span>
            </span>
            <span v-if="state?.summary?.negative_wallets" class="count-pill danger">
              Conta com saldo negativo
            </span>
            <span v-if="state?.summary?.pending_allocations" class="count-pill warning">
              Pagamento pendente de conciliação
            </span>
          </div>
          <p class="panel-subtitle">
            Gestão independente de dinheiro em espécie, cofres físicos e metais preciosos de reserva.
          </p>
        </div>

        <div class="header-actions">
          <button type="button" class="secondary-btn" :disabled="busy || loading" @click="reload">
            <font-awesome-icon :icon="loading ? 'circle-notch' : 'arrows-rotate'" :spin="loading" />
            <span>{{ loading ? "Carregando…" : "Atualizar saldos" }}</span>
          </button>
          <button type="button" class="primary-action" :disabled="busy || offline" @click="openOperation('INCOME')">
            <font-awesome-icon icon="plus" />
            <span>Registrar movimento</span>
          </button>
        </div>
      </header>

      <!-- Banners de Notificação e Status -->
      <div v-if="error" class="nexo-banner error" role="alert">
        <font-awesome-icon icon="triangle-exclamation" class="banner-icon" />
        <span>{{ error }}</span>
        <button type="button" class="banner-close" aria-label="Fechar aviso" @click="error = ''">
          <font-awesome-icon icon="xmark" />
        </button>
      </div>

      <div v-if="notice" class="nexo-banner info" role="status">
        <font-awesome-icon icon="circle-check" class="banner-icon" />
        <span>{{ notice }}</span>
        <button type="button" class="banner-close" aria-label="Fechar mensagem" @click="notice = ''">
          <font-awesome-icon icon="xmark" />
        </button>
      </div>

      <div v-if="offline" class="nexo-banner warning" role="status">
        <font-awesome-icon icon="wifi" class="banner-icon" />
        <span>
          Você está offline. Visualizando a última leitura salva no dispositivo. Conecte-se para registrar novos movimentos.
        </span>
      </div>

      <div v-if="state?.summary?.negative_wallets" class="nexo-banner warning" role="status">
        <font-awesome-icon icon="triangle-exclamation" class="banner-icon" />
        <span>Há contas com saldo negativo. Confira saldos iniciais, pagamentos em notas fiscais e transferências.</span>
      </div>

      <div v-if="state?.summary?.pending_allocations" class="nexo-banner subtle accent-warning" role="status">
        <font-awesome-icon icon="scale-balanced" class="banner-icon" />
        <span>Há pagamentos mistos sem parcela em espécie definida. Use a conciliação na aba de Dinheiro.</span>
      </div>

      <!-- Navegação por Abas com Glider Animado -->
      <nav ref="subnavRef" class="physical-subnav" :class="{ 'has-glider': gliderReady }" aria-label="Seções do patrimônio físico">
        <span class="subnav-glider" :style="gliderStyle" aria-hidden="true" />
        <button
          v-for="s in sections"
          :key="s.id"
          :ref="(el) => setSubnavBtnRef(el, s.id)"
          type="button"
          class="subnav-btn"
          :class="{ chosen: section === s.id }"
          @click="changeSection(s.id)"
        >
          <font-awesome-icon :icon="s.icon" class="subnav-icon" />
          <span>{{ s.label }}</span>
          <span v-if="s.id === 'cash' && state?.summary?.cash !== undefined" class="subnav-badge neutral">
            {{ money(state.summary.cash) }}
          </span>
          <span v-else-if="s.id === 'metals' && state?.holdings?.length" class="subnav-badge neutral">
            {{ state.holdings.length }}
          </span>
        </button>
      </nav>

      <!-- Transição de Conteúdo entre Seções -->
      <Transition :name="sectionTransitionName" mode="out-in">
        <!-- 1. DASHBOARD COMPLETO -->
        <div v-if="section === 'dashboard'" key="dashboard" class="physical-view-stage">
          <NexoWealthDashboard
            :state="state"
            :history="dashboardHistory"
            :flows="flows"
            :flow-month="month"
            :offline="offline"
          />
        </div>

        <!-- 2. DINHEIRO EM ESPÉCIE -->
        <div v-else-if="section === 'cash'" key="cash" class="physical-view-stage">
          <!-- Bloco de Contas Físicas -->
          <div class="sub-section-header">
            <div class="sub-header-title">
              <h4>Contas e carteiras físicas</h4>
              <p class="panel-subtitle">Total em espécie: <strong>{{ money(state?.summary?.cash) }}</strong></p>
            </div>
            <div class="sub-header-actions">
              <button type="button" class="secondary-btn compact" :disabled="busy || offline" @click="openWallet">
                <font-awesome-icon icon="plus" />
                <span>Nova conta física</span>
              </button>
              <button type="button" class="primary-action compact" :disabled="busy || offline" @click="openOperation('INCOME')">
                <font-awesome-icon icon="plus" />
                <span>Registrar movimento</span>
              </button>
            </div>
          </div>

          <div v-if="state?.wallets?.length" class="wallets-grid">
            <article v-for="w in state.wallets" :key="w.id || 'general'" class="wallet-card">
              <div class="wallet-card-head">
                <span class="wallet-icon-badge">
                  <font-awesome-icon icon="wallet" />
                </span>
                <span class="wallet-tag">Físico</span>
              </div>
              <div class="wallet-card-body">
                <strong class="wallet-name">{{ w.name }}</strong>
                <span class="wallet-balance" :class="{ negative: Number(w.balance) < 0 }">
                  {{ money(w.balance) }}
                </span>
              </div>
            </article>
          </div>
          <div v-else class="empty-state-card compact">
            <div class="empty-icon-circle">
              <font-awesome-icon icon="wallet" />
            </div>
            <h4>Nenhuma conta cadastrada</h4>
            <p>Cadastre uma carteira, cofre ou espécie geral para controlar o saldo físico.</p>
          </div>

          <!-- Compras em Dinheiro de Notas Fiscais -->
          <div class="inner-panel">
            <div class="sub-section-header">
              <div class="sub-header-title">
                <h4>Compras em dinheiro de notas fiscais</h4>
                <p class="panel-subtitle">
                  Lançamentos extraídos de notas fiscais onde o meio de pagamento especifica dinheiro em espécie.
                </p>
              </div>
            </div>

            <!-- Barra de Busca -->
            <form class="filters-surface" @submit.prevent="searchTransactions(true)">
              <div class="inline-control-row">
                <div class="input-with-icon" style="flex: 1 1 240px">
                  <font-awesome-icon icon="magnifying-glass" class="field-icon" />
                  <input
                    v-model="search"
                    type="search"
                    class="nexo-control with-left-icon"
                    placeholder="Buscar por descrição da compra…"
                    aria-label="Buscar lançamento"
                  />
                  <button
                    v-if="search"
                    type="button"
                    class="clear-search-btn"
                    title="Limpar busca"
                    @click="
                      search = '';
                      searchTransactions(true);
                    "
                  >
                    <font-awesome-icon icon="xmark" />
                  </button>
                </div>
                <button type="submit" class="secondary-btn" :disabled="busy">
                  <font-awesome-icon icon="magnifying-glass" />
                  <span>Buscar</span>
                </button>
              </div>
            </form>

            <!-- Tabela de Compras -->
            <div v-if="transactions.length" class="nexo-table-wrap">
              <table class="nexo-table">
                <thead>
                  <tr>
                    <th>Compra ou recebimento</th>
                    <th class="right">Total nota</th>
                    <th class="right">Em espécie</th>
                    <th>Situação</th>
                    <th class="right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="tx in transactions" :key="tx.id">
                    <td class="col-desc-main">
                      <strong class="table-item-name">{{ tx.description }}</strong>
                      <small class="table-item-code">#{{ tx.id }} · {{ day(calendar(tx)) }}</small>
                    </td>
                    <td class="right tabular">{{ money(tx.amount) }}</td>
                    <td class="right tabular">
                      <strong>{{ money(tx.payment_method === 'CASH' ? tx.amount : tx.cash_amount || 0) }}</strong>
                    </td>
                    <td>
                      <span
                        class="status-pill"
                        :class="tx.status === 'PAID' ? 'success' : tx.status === 'CANCELED' ? 'danger' : 'warning'"
                      >
                        {{ tx.status === "PAID" ? "Pago" : tx.status === "CANCELED" ? "Cancelado" : "Pendente" }}
                      </span>
                    </td>
                    <td class="right">
                      <div class="table-row-actions">
                        <button
                          type="button"
                          class="secondary-btn compact"
                          :disabled="busy || offline || tx.physical_linked"
                          title="Conciliar parcela em dinheiro"
                          @click="openAllocation(tx)"
                        >
                          <font-awesome-icon icon="scale-balanced" />
                          <span>Conciliar</span>
                        </button>
                        <button
                          type="button"
                          class="secondary-btn compact"
                          title="Ver histórico de alterações"
                          @click="showAudit(tx)"
                        >
                          <font-awesome-icon icon="clock-rotate-left" />
                          <span>Histórico</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Empty State -->
            <div v-else class="empty-state-box">
              <div class="empty-state-card">
                <div class="empty-icon-circle">
                  <font-awesome-icon icon="receipt" />
                </div>
                <h4>Nenhuma compra em dinheiro encontrada</h4>
                <p>
                  Ao importar notas fiscais com pagamento em dinheiro na aba de Notas fiscais, elas aparecerão aqui
                  automaticamente para conciliação física.
                </p>
              </div>
            </div>

            <!-- Paginação -->
            <div v-if="transactions.length || txPage > 0" class="pager">
              <button
                type="button"
                class="secondary-btn compact"
                :disabled="txPage === 0 || busy"
                @click="
                  txPage--;
                  searchTransactions(false);
                "
              >
                <font-awesome-icon icon="chevron-left" />
                <span>Anterior</span>
              </button>
              <span class="pager-info">Página {{ txPage + 1 }}</span>
              <button
                type="button"
                class="secondary-btn compact"
                :disabled="transactions.length < pageSize || busy"
                @click="
                  txPage++;
                  searchTransactions(false);
                "
              >
                <span>Próxima</span>
                <font-awesome-icon icon="chevron-right" />
              </button>
            </div>
          </div>
        </div>

        <!-- 3. METAIS PRECIOSOS -->
        <div v-else-if="section === 'metals'" key="metals" class="physical-view-stage">
          <div class="sub-section-header">
            <div class="sub-header-title">
              <h4>Cotações e custódia de metais</h4>
              <p class="panel-subtitle">
                Cotações em reais por grama de metal fino (31,1034768 g/oz troy) e posições de reserva.
              </p>
            </div>
            <div class="sub-header-actions">
              <button type="button" class="secondary-btn compact" :disabled="busy || offline" @click="refreshQuotes">
                <font-awesome-icon :icon="busy ? 'circle-notch' : 'arrows-rotate'" :spin="busy" />
                <span>Atualizar cotações</span>
              </button>
              <button type="button" class="primary-action compact" :disabled="busy || offline" @click="openOperation('METAL_BUY')">
                <font-awesome-icon icon="plus" />
                <span>Comprar metal</span>
              </button>
            </div>
          </div>

          <!-- Cards de Cotações (Ouro & Prata) -->
          <div class="quotes-grid">
            <article v-for="q in state?.quotes || []" :key="q.metal" class="quote-card" :class="q.metal.toLowerCase()">
              <div class="quote-card-head">
                <div class="quote-title-group">
                  <span class="quote-metal-icon">
                    <font-awesome-icon icon="coins" />
                  </span>
                  <div>
                    <strong class="quote-metal-name">{{ metalName(q.metal) }}</strong>
                    <span class="quote-metal-code">{{ q.metal }}</span>
                  </div>
                </div>
                <span v-if="stale(q)" class="count-pill warning" title="Referência com mais de 48h">
                  <font-awesome-icon icon="clock" /> Desatualizada
                </span>
                <span v-else class="count-pill neutral">Atualizada</span>
              </div>

              <div class="quote-card-body">
                <span class="quote-label">Preço de mercado</span>
                <strong class="quote-price">{{ money(q.brl_per_gram) }}<small>/g fino</small></strong>
              </div>

              <div class="quote-card-meta">
                <span>{{ timestamp(q.quoted_at) }}</span>
                <span class="meta-dot">·</span>
                <span>USD/BRL: {{ number(q.usd_brl) }} em {{ day(q.fx_date) }}</span>
                <span class="meta-dot">·</span>
                <span>{{ q.source }}</span>
              </div>
            </article>

            <div v-if="!state?.quotes?.length" class="empty-state-card compact">
              <div class="empty-icon-circle">
                <font-awesome-icon icon="coins" />
              </div>
              <h4>Sem cotações salvas</h4>
              <p>Clique em "Atualizar cotações" para sincronizar as referências de mercado de ouro e prata.</p>
            </div>
          </div>

          <!-- Tabela de Lotes Custodiados -->
          <div class="inner-panel">
            <div class="sub-section-header">
              <div class="sub-header-title">
                <h4>Lotes e barras custodiadas</h4>
                <p class="panel-subtitle">Posições físicas registradas em ouro e prata.</p>
              </div>
            </div>

            <div v-if="state?.holdings?.length" class="nexo-table-wrap">
              <table class="nexo-table">
                <thead>
                  <tr>
                    <th>Lote</th>
                    <th class="right">Qtd. / Peso</th>
                    <th class="right">Pureza</th>
                    <th class="right">Custo total</th>
                    <th class="right">Mercado est.</th>
                    <th class="right">Venda líquida</th>
                    <th class="right">Rentabilidade</th>
                    <th class="right">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="h in state.holdings" :key="h.id">
                    <td class="col-desc-main">
                      <strong class="table-item-name">{{ h.name }}</strong>
                      <span class="status-pill" :class="h.metal === 'XAU' ? 'gold' : 'silver'">
                        {{ metalName(h.metal) }}
                      </span>
                    </td>
                    <td class="right tabular">
                      <strong>{{ number(h.quantity) }} un.</strong>
                      <small class="table-sub-detail">{{ number(h.weight_grams) }} g</small>
                    </td>
                    <td class="right tabular">{{ number(Number(h.purity) * 100) }}%</td>
                    <td class="right tabular">{{ money(h.cost) }}</td>
                    <td class="right tabular">
                      <strong>{{ money(h.estimated_value) }}</strong>
                    </td>
                    <td class="right tabular">
                      {{ money(h.estimated_liquid_value) }}
                      <small class="table-sub-detail">Desc.: {{ number(h.liquidity_discount) }}%</small>
                    </td>
                    <td class="right tabular">
                      <strong :class="Number(h.estimated_gain) >= 0 ? 'positive' : 'negative'">
                        {{ money(h.estimated_gain) }}
                      </strong>
                      <small class="table-sub-detail" :class="Number(h.estimated_gain) >= 0 ? 'positive' : 'negative'">
                        {{ percent(h.estimated_return_percent) }}
                      </small>
                    </td>
                    <td class="right">
                      <button
                        type="button"
                        class="secondary-btn compact"
                        :disabled="busy || offline || Number(h.quantity) <= 0"
                        title="Registrar venda deste lote"
                        @click="openOperation('METAL_SELL', h)"
                      >
                        <font-awesome-icon icon="money-bill" />
                        <span>Vender</span>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-else class="empty-state-box">
              <div class="empty-state-card">
                <div class="empty-icon-circle">
                  <font-awesome-icon icon="coins" />
                </div>
                <h4>Nenhum lote de metal cadastrado</h4>
                <p>Registre a primeira compra de ouro ou prata para acompanhar custo, valorização e liquidação.</p>
              </div>
            </div>

            <p class="helper-note">
              O valor de mercado é uma estimativa de referência. Liquidez real, spread comercial e condições de recompra
              podem variar.
            </p>
          </div>
        </div>

        <!-- 4. MOVIMENTAÇÕES -->
        <div v-else-if="section === 'movements'" key="movements" class="physical-view-stage">
          <div class="sub-section-header">
            <div class="sub-header-title">
              <h4>Movimentações e rastreabilidade</h4>
              <p class="panel-subtitle">Histórico de saques, depósitos, compras de metais e ajustes de saldo.</p>
            </div>
            <div class="sub-header-actions">
              <button type="button" class="primary-action compact" :disabled="busy || offline" @click="openOperation('INCOME')">
                <font-awesome-icon icon="plus" />
                <span>Novo movimento</span>
              </button>
            </div>
          </div>

          <!-- Filtros de Movimentações -->
          <div class="filters-surface">
            <div class="movement-filters-bar">
              <label class="filter-field">
                <span>De</span>
                <input v-model="from" type="date" class="nexo-control compact" />
              </label>

              <label class="filter-field">
                <span>Até</span>
                <input v-model="to" type="date" class="nexo-control compact" />
              </label>

              <label class="filter-field" style="flex: 1 1 220px">
                <span>Visão do histórico</span>
                <select
                  v-model="movementView"
                  class="nexo-control compact"
                  @change="
                    movementPage = 0;
                    loadMovements();
                  "
                >
                  <option value="operations">Operações patrimoniais</option>
                  <option value="ledger">Extrato de espécie (inclui compras de notas)</option>
                </select>
              </label>

              <div class="filter-actions-col">
                <button
                  type="button"
                  class="primary-action filter-btn compact"
                  :disabled="busy"
                  @click="
                    movementPage = 0;
                    loadMovements();
                  "
                >
                  <font-awesome-icon icon="filter" />
                  <span>Filtrar</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Tabela de Movimentações -->
          <div v-if="movements.length" class="nexo-table-wrap">
            <table class="nexo-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Tipo</th>
                  <th>Categoria</th>
                  <th class="right">Espécie / Valor</th>
                  <th>Vínculo</th>
                  <th class="right">Ação</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="op in movements" :key="op.id">
                  <td class="nowrap tabular">{{ day(op.occurred_on) }}</td>
                  <td class="col-desc-main">
                    <strong class="table-item-name">{{ op.description }}</strong>
                    <small class="table-item-code">
                      {{ op.wallet_name || "Espécie geral" }}
                      {{ op.to_wallet_name ? " → " + op.to_wallet_name : "" }}
                      {{ op.lot_name ? " · " + op.lot_name : "" }}
                    </small>
                  </td>
                  <td>
                    <span class="status-pill" :class="op.reversed ? 'danger' : 'neutral'">
                      {{ op.transaction_id ? "Compra em dinheiro" : kindLabel(op.kind) }}
                    </span>
                    <span v-if="op.reversed" class="subnav-badge danger">Estornado</span>
                  </td>
                  <td class="col-category">
                    <CategoryCombo
                      v-if="canCategorize(op)"
                      size="compact"
                      placeholder="Sem categoria"
                      :model-value="op.category_id"
                      :categories="categoryOptionsFor(op.kind)"
                      :empty-label="noCategoriesLabel(op.kind)"
                      @update:modelValue="setOperationCategory(op, $event)"
                    />
                    <span v-else-if="op.category_name" class="category-chip">
                      <i class="category-dot" :style="{ background: op.category_color || '#999999' }" />
                      <span>{{ op.category_name }}</span>
                    </span>
                    <span v-else class="muted-dash">—</span>
                  </td>
                  <td class="right tabular">
                    <strong
                      :class="
                        movementView === 'ledger'
                          ? Number(op.delta) >= 0
                            ? 'positive'
                            : 'negative'
                          : ''
                      "
                    >
                      {{ money(movementView === "ledger" ? op.delta : op.amount) }}
                    </strong>
                  </td>
                  <td>
                    <span class="code-pill">
                      {{
                        op.transaction_id
                          ? "Compra #" + op.transaction_id
                          : op.financial_transaction_id
                            ? "Banco #" + op.financial_transaction_id
                            : op.reverses_id
                              ? "Estorno de " + op.reverses_id
                              : "Manual"
                      }}
                    </span>
                  </td>
                  <td class="right">
                    <div class="table-row-actions">
                      <button
                        v-if="movementView === 'operations' && !op.reversed && op.kind !== 'REVERSAL'"
                        type="button"
                        class="danger-btn compact"
                        :disabled="busy || offline"
                        title="Estornar movimentação"
                        @click="openReversal(op)"
                      >
                        <font-awesome-icon icon="arrows-rotate" />
                        <span>Estornar</span>
                      </button>
                      <button
                        v-if="op.transaction_id"
                        type="button"
                        class="secondary-btn compact"
                        title="Ver histórico de alterações"
                        @click="showAudit({ id: op.transaction_id })"
                      >
                        <font-awesome-icon icon="clock-rotate-left" />
                        <span>Histórico</span>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-else class="empty-state-box">
            <div class="empty-state-card">
              <div class="empty-icon-circle">
                <font-awesome-icon icon="arrow-right-arrow-left" />
              </div>
              <h4>Nenhuma movimentação neste período</h4>
              <p>Altere os filtros de data ou registre uma nova operação física de dinheiro ou metais.</p>
            </div>
          </div>

          <!-- Paginação -->
          <div v-if="movements.length || movementPage > 0" class="pager">
            <button
              type="button"
              class="secondary-btn compact"
              :disabled="movementPage === 0 || busy"
              @click="
                movementPage--;
                loadMovements();
              "
            >
              <font-awesome-icon icon="chevron-left" />
              <span>Anterior</span>
            </button>
            <span class="pager-info">Página {{ movementPage + 1 }}</span>
            <button
              type="button"
              class="secondary-btn compact"
              :disabled="movements.length < pageSize || busy"
              @click="
                movementPage++;
                loadMovements();
              "
            >
              <span>Próxima</span>
              <font-awesome-icon icon="chevron-right" />
            </button>
          </div>
        </div>

        <!-- 5. RELATÓRIOS -->
        <div v-else-if="section === 'reports'" key="reports" class="physical-view-stage">
          <div class="sub-section-header">
            <div class="sub-header-title">
              <h4>Relatórios e resultados</h4>
              <p class="panel-subtitle">Histórico consolidado mensal e resultados realizados e estimados.</p>
            </div>
          </div>

          <!-- Indicadores no topo -->
          <div class="report-metrics">
            <article class="metric-card">
              <div class="metric-icon success">
                <font-awesome-icon icon="chart-line" />
              </div>
              <div class="metric-info">
                <span class="metric-label">Resultado realizado nas vendas</span>
                <strong
                  class="metric-value"
                  :class="Number(state?.summary?.realized_gain) >= 0 ? 'positive' : 'negative'"
                >
                  {{ money(state?.summary?.realized_gain) }}
                </strong>
                <small class="metric-sub">Ganhos efetivados em metais</small>
              </div>
            </article>

            <article class="metric-card">
              <div class="metric-icon gold">
                <font-awesome-icon icon="coins" />
              </div>
              <div class="metric-info">
                <span class="metric-label">Valorização não realizada (estimada)</span>
                <strong
                  class="metric-value"
                  :class="Number(state?.summary?.unrealized_gain) >= 0 ? 'positive' : 'negative'"
                >
                  {{ money(state?.summary?.unrealized_gain) }}
                </strong>
                <small class="metric-sub">Posições abertas atuais</small>
              </div>
            </article>
          </div>

          <!-- Tabela mensal: período e ações acoplados ao topo do grid, sem um container só para os filtros -->
          <div class="report-grid">
            <div class="report-toolbar">
              <div class="report-period">
                <label class="filter-field">
                  <span>De</span>
                  <input v-model="from" type="date" class="nexo-control compact" />
                </label>

                <label class="filter-field">
                  <span>Até</span>
                  <input v-model="to" type="date" class="nexo-control compact" />
                </label>
              </div>

              <!-- Layout compacto: o período vira um botão de filtro que abre um modal com as datas -->
              <button
                type="button"
                class="secondary-btn compact report-filter-btn"
                title="Filtrar período"
                aria-label="Filtrar período"
                aria-haspopup="dialog"
                @click="openReportFilter"
              >
                <font-awesome-icon icon="filter" />
                <span class="report-period-label">{{ day(from) }} – {{ day(to) }}</span>
              </button>

              <div class="report-actions">
                <button
                  type="button"
                  class="primary-action compact report-consult-btn"
                  :disabled="busy"
                  @click="loadReports"
                >
                  <font-awesome-icon icon="magnifying-glass" />
                  <span>Consultar</span>
                </button>
                <button type="button" class="secondary-btn compact" :disabled="!history.length" @click="exportHistory">
                  <font-awesome-icon icon="download" />
                  <span>Exportar CSV</span>
                </button>
              </div>
            </div>

            <div v-if="history.length" class="nexo-table-wrap">
              <table class="nexo-table">
                <thead>
                  <tr>
                    <th>Mês</th>
                    <th class="right">Espécie</th>
                    <th class="right">Custo dos metais</th>
                    <th class="right">Metais estimados</th>
                    <th class="right">Patrimônio físico total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="p in history" :key="p.month">
                    <td class="nowrap tabular">
                      <strong>{{ p.month }}</strong>
                    </td>
                    <td class="right tabular">{{ money(p.cash) }}</td>
                    <td class="right tabular">{{ money(p.cost) }}</td>
                    <td class="right tabular">{{ money(p.metals) }}</td>
                    <td class="right tabular">
                      <strong class="gold-text">{{ money(p.physical_total) }}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-else class="empty-state-box">
              <div class="empty-state-card">
                <div class="empty-icon-circle">
                  <font-awesome-icon icon="file-lines" />
                </div>
                <h4>Nenhum histórico encontrado para o intervalo</h4>
                <p>Ajuste o período acima e consulte novamente para ver o relatório consolidado.</p>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </section>

    <!-- ==========================================================================
         MODAIS DO PATRIMÔNIO FÍSICO
         ========================================================================== -->

    <!-- MODAL 1: NOVA CONTA FÍSICA -->
    <BaseModal
      :model-value="walletVisible"
      title="Nova conta física"
      size="sm"
      @close="walletVisible = false"
    >
      <form class="nexo-modal-form" @submit.prevent="saveWallet">
        <div v-if="formError" class="nexo-banner error" role="alert">
          <font-awesome-icon icon="triangle-exclamation" class="banner-icon" />
          <span>{{ formError }}</span>
        </div>

        <label class="filter-field">
          <span>Nome da conta ou carteira</span>
          <input
            v-model="walletName"
            maxlength="100"
            required
            class="nexo-control"
            placeholder="Ex.: Carteira de bolso, Cofre residencial…"
          />
        </label>

        <footer class="modal-actions-bar">
          <button type="button" class="secondary-btn" @click="walletVisible = false">Cancelar</button>
          <button type="submit" class="primary-action" :disabled="busy || !walletName.trim()">
            <font-awesome-icon :icon="busy ? 'circle-notch' : 'check'" :spin="busy" />
            <span>{{ busy ? "Salvando…" : "Criar conta" }}</span>
          </button>
        </footer>
      </form>
    </BaseModal>

    <!-- MODAL 2: REGISTRAR OPERAÇÃO / MOVIMENTO -->
    <BaseModal
      :model-value="operationVisible"
      :title="kindLabel(form.kind)"
      size="md"
      @close="operationVisible = false"
    >
      <form class="nexo-modal-form" @submit.prevent="saveOperation">
        <div v-if="formError" class="nexo-banner error" role="alert">
          <font-awesome-icon icon="triangle-exclamation" class="banner-icon" />
          <span>{{ formError }}</span>
        </div>

        <label v-if="!isMetal && form.kind !== 'REVERSAL'" class="filter-field">
          <span>Tipo de movimento</span>
          <select v-model="form.kind" class="nexo-control">
            <option v-for="k in cashKinds" :key="k" :value="k">{{ kindLabel(k) }}</option>
          </select>
        </label>

        <label class="filter-field">
          <span>Descrição</span>
          <input
            v-model="form.description"
            maxlength="255"
            required
            class="nexo-control"
            placeholder="Ex.: Saque no caixa eletrônico, Entrada avulsa…"
          />
        </label>

        <div class="form-grid">
          <label class="filter-field">
            <span>Data</span>
            <input v-model="form.occurred_on" type="date" required :max="today" class="nexo-control" />
          </label>

          <label v-if="form.kind !== 'REVERSAL'" class="filter-field">
            <span>Valor total (R$)</span>
            <input
              v-model.number="form.amount"
              type="number"
              min="0.01"
              max="999999999999.99"
              step="0.01"
              required
              class="nexo-control"
              placeholder="0,00"
            />
          </label>
        </div>

        <!-- Categorias do Nexo (sem as de investimento), alimentam os gráficos de entradas e saídas do dashboard -->
        <div v-if="hasCategory" class="filter-field">
          <span>{{ form.kind === "INCOME" ? "Categoria da entrada" : "Categoria do gasto" }} (opcional)</span>
          <CategoryCombo
            placeholder="Sem categoria"
            :model-value="form.category_id"
            :categories="categoryOptionsFor(form.kind)"
            :empty-label="noCategoriesLabel(form.kind)"
            @update:modelValue="form.category_id = $event"
          />
        </div>
        <p v-else-if="form.kind === 'WITHDRAWAL'" class="helper-note">
          O saque entra nas entradas do mês, no gráfico do dashboard, com a categoria de sistema Saque.
        </p>
        <p v-else-if="form.kind === 'DEPOSIT'" class="helper-note">
          O depósito aparece nas saídas do mês, no gráfico do dashboard, como Depósito bancário.
        </p>

        <p v-if="form.kind === 'REVERSAL'" class="helper-note">
          O estorno registra os valores inversos e preserva o movimento original no histórico de auditoria.
        </p>

        <label v-if="form.kind === 'ADJUSTMENT'" class="filter-field">
          <span>Direção do ajuste</span>
          <select v-model="form.direction" class="nexo-control">
            <option value="IN">Acrescentar ao saldo</option>
            <option value="OUT">Reduzir o saldo</option>
          </select>
        </label>

        <!-- Campos Específicos para Metais -->
        <template v-if="isMetal">
          <label v-if="form.kind === 'METAL_BUY'" class="filter-field">
            <span>Nome ou identificador do lote</span>
            <input v-model="form.name" maxlength="120" required class="nexo-control" placeholder="Ex.: Barra Ouro 10g Certificada" />
          </label>

          <div v-if="form.kind === 'METAL_BUY'" class="form-grid">
            <label class="filter-field">
              <span>Metal</span>
              <select v-model="form.metal" class="nexo-control">
                <option value="XAU">Ouro (XAU)</option>
                <option value="XAG">Prata (XAG)</option>
              </select>
            </label>

            <label class="filter-field">
              <span>Peso por unidade (g)</span>
              <input
                v-model.number="form.unit_weight_grams"
                type="number"
                min="0.000001"
                step="0.000001"
                required
                class="nexo-control"
              />
            </label>

            <label class="filter-field">
              <span>Pureza (0 a 1)</span>
              <input
                v-model.number="form.purity"
                type="number"
                min="0.000001"
                max="1"
                step="0.000001"
                required
                class="nexo-control"
                placeholder="Ex.: 0.999"
              />
            </label>

            <label class="filter-field">
              <span>Desconto de liquidez (%)</span>
              <input
                v-model.number="form.liquidity_discount"
                type="number"
                min="0"
                max="100"
                step="0.001"
                required
                class="nexo-control"
                placeholder="0"
              />
            </label>
          </div>

          <label class="filter-field">
            <span>Quantidade de unidades</span>
            <input
              v-model.number="form.quantity"
              type="number"
              min="0.000001"
              step="0.000001"
              :max="form.kind === 'METAL_SELL' ? selectedLotQuantity : undefined"
              required
              class="nexo-control"
            />
          </label>

          <label class="filter-field">
            <span>Liquidação</span>
            <select v-model="form.funding" class="nexo-control">
              <option value="CASH">Dinheiro em espécie</option>
              <option value="DIGITAL">Conta financeira digital</option>
            </select>
          </label>
        </template>

        <!-- Seleção de Conta Física -->
        <label v-if="form.kind !== 'REVERSAL' && (!isMetal || form.funding === 'CASH')" class="filter-field">
          <span>Conta física de origem</span>
          <select v-model="form.wallet_id" class="nexo-control">
            <option value="">Espécie geral</option>
            <option v-for="w in namedWallets" :key="w.id" :value="w.id">{{ w.name }}</option>
          </select>
        </label>

        <label v-if="form.kind === 'TRANSFER'" class="filter-field">
          <span>Conta física de destino</span>
          <select v-model="form.to_wallet_id" class="nexo-control">
            <option value="">Espécie geral</option>
            <option v-for="w in namedWallets.filter((w) => w.id !== form.wallet_id)" :key="w.id" :value="w.id">
              {{ w.name }}
            </option>
          </select>
          <small class="helper-note">Selecione contas de origem e destino diferentes.</small>
        </label>

        <!-- Vínculo Bancário Obrigatório -->
        <template v-if="needsBank">
          <div class="inner-highlight-card">
            <p v-if="form.kind === 'WITHDRAWAL'" class="helper-note">
              Vincule o débito do saque já registrado em Movimentos, pago e do mesmo valor. Ele é tratado como
              transferência patrimonial sem duplicar despesa.
            </p>
            <p v-else class="helper-note">
              Vincule o lançamento bancário correspondente já registrado em Movimentos.
            </p>

            <div class="inline-control-row" style="margin-top: var(--space-2)">
              <div class="input-with-icon" style="flex: 1">
                <font-awesome-icon icon="magnifying-glass" class="field-icon" />
                <input
                  v-model="bankSearch"
                  class="nexo-control with-left-icon compact"
                  placeholder="Buscar lançamento bancário…"
                />
              </div>
              <button type="button" class="secondary-btn compact" @click="findBank">Buscar</button>
            </div>

            <label class="filter-field" style="margin-top: var(--space-2)">
              <span>Lançamento bancário correspondente</span>
              <select v-model.number="form.financial_transaction_id" required class="nexo-control">
                <option value="">Selecione um lançamento</option>
                <option v-for="tx in bankCandidates" :key="tx.id" :value="tx.id">
                  #{{ tx.id }} · {{ tx.description }} · {{ money(tx.amount) }}
                  {{ Number(tx.withdrawal_category) ? " · categoria Saque" : "" }}
                </option>
              </select>
              <small v-if="!bankCandidates.length" class="helper-note">
                {{
                  bankLoading
                    ? "Buscando lançamentos…"
                    : bankLoaded
                      ? `Nenhum lançamento ${bankType === "EXPENSE" ? "de saída" : "de entrada"} pago de ${money(form.amount)} disponível.`
                      : "Informe o valor total para listar lançamentos bancários compatíveis."
                }}
              </small>
            </label>
          </div>
        </template>

        <p v-if="['OPENING', 'ADJUSTMENT'].includes(form.kind)" class="helper-note">
          Saldos iniciais e ajustes corrigem o patrimônio e não afetam despesas ou receitas do mês.
        </p>

        <footer class="modal-actions-bar">
          <button type="button" class="secondary-btn" @click="operationVisible = false">Cancelar</button>
          <button type="submit" class="primary-action" :disabled="busy || offline">
            <font-awesome-icon :icon="busy ? 'circle-notch' : 'check'" :spin="busy" />
            <span>{{ busy ? "Salvando…" : form.kind === "REVERSAL" ? "Confirmar estorno" : "Registrar" }}</span>
          </button>
        </footer>
      </form>
    </BaseModal>

    <!-- MODAL: PERÍODO DOS RELATÓRIOS (layout compacto) -->
    <BaseModal
      :model-value="reportFilterVisible"
      title="Filtrar período"
      size="sm"
      @close="reportFilterVisible = false"
    >
      <form class="nexo-modal-form" @submit.prevent="applyReportFilter">
        <label class="filter-field">
          <span>De</span>
          <input v-model="reportDraft.from" type="date" required :max="reportDraft.to || undefined" class="nexo-control" />
        </label>

        <label class="filter-field">
          <span>Até</span>
          <input v-model="reportDraft.to" type="date" required :min="reportDraft.from || undefined" class="nexo-control" />
        </label>

        <p v-if="reportDraft.from && reportDraft.to && !reportDraftValid" class="helper-note">
          A data inicial não pode ser posterior à data final.
        </p>

        <footer class="modal-actions-bar">
          <button type="button" class="secondary-btn" @click="reportFilterVisible = false">Cancelar</button>
          <button type="submit" class="primary-action" :disabled="busy || !reportDraftValid">
            <font-awesome-icon icon="magnifying-glass" />
            <span>Consultar</span>
          </button>
        </footer>
      </form>
    </BaseModal>

    <!-- MODAL 3: CONCILIAR PAGAMENTO EM ESPÉCIE -->
    <BaseModal
      :model-value="allocationVisible"
      title="Conciliar pagamento em espécie"
      size="md"
      @close="allocationVisible = false"
    >
      <form class="nexo-modal-form" @submit.prevent="saveAllocation">
        <div v-if="formError" class="nexo-banner error" role="alert">
          <font-awesome-icon icon="triangle-exclamation" class="banner-icon" />
          <span>{{ formError }}</span>
        </div>

        <div v-if="allocationTx" class="alloc-summary-card">
          <span class="alloc-label">Lançamento selecionado</span>
          <strong class="alloc-name">{{ allocationTx.description }}</strong>
          <span class="alloc-total">Total: {{ money(allocationTx.amount) }}</span>
        </div>

        <div class="form-grid">
          <label class="filter-field">
            <span>Dinheiro entregue (R$)</span>
            <input
              v-model.number="allocation.tendered"
              type="number"
              min="0"
              step="0.01"
              required
              class="nexo-control"
            />
          </label>

          <label class="filter-field">
            <span>Troco recebido (R$)</span>
            <input
              v-model.number="allocation.change"
              type="number"
              min="0"
              :max="allocation.tendered"
              step="0.01"
              required
              class="nexo-control"
            />
          </label>
        </div>

        <div class="alloc-result-box">
          <div>
            <span>Parcela líquida em espécie:</span>
            <strong class="positive">{{ money(netCash) }}</strong>
          </div>
          <div v-if="Number(allocationTx?.amount || 0) - netCash > 0">
            <span>Outros meios de pagamento:</span>
            <strong>{{ money(Number(allocationTx?.amount || 0) - netCash) }}</strong>
          </div>
        </div>

        <label class="filter-field">
          <span>Conta física de onde saiu o dinheiro</span>
          <select v-model="allocation.wallet_id" class="nexo-control">
            <option value="">Espécie geral</option>
            <option v-for="w in namedWallets" :key="w.id" :value="w.id">{{ w.name }}</option>
          </select>
        </label>

        <label v-if="netCash === 0" class="filter-field">
          <span>Meio de pagamento restante após correção</span>
          <select v-model="allocation.other_method" class="nexo-control">
            <option value="UNKNOWN">Não informado</option>
            <option value="PIX">Pix</option>
            <option value="DEBIT_CARD">Débito</option>
            <option value="BOLETO">Boleto</option>
            <option value="TRANSFER">Transferência</option>
          </select>
        </label>

        <footer class="modal-actions-bar">
          <button type="button" class="secondary-btn" @click="allocationVisible = false">Cancelar</button>
          <button
            type="submit"
            class="primary-action"
            :disabled="busy || offline || netCash < 0 || netCash > Number(allocationTx?.amount || 0)"
          >
            <font-awesome-icon :icon="busy ? 'circle-notch' : 'check'" :spin="busy" />
            <span>{{ busy ? "Salvando…" : "Salvar conciliação" }}</span>
          </button>
        </footer>
      </form>
    </BaseModal>

    <!-- MODAL 4: HISTÓRICO DE AUDITORIA EM ESPÉCIE -->
    <BaseModal
      :model-value="auditVisible"
      title="Histórico de conciliação em espécie"
      size="md"
      @close="auditVisible = false"
    >
      <div class="audit-modal-body">
        <div v-if="audit.length" class="audit-timeline">
          <article v-for="a in audit" :key="a.id" class="audit-card">
            <div class="audit-time-row">
              <span class="audit-dot" />
              <strong>{{ timestamp(a.created_at) }}</strong>
            </div>
            <div class="audit-diff-grid">
              <div class="audit-state before">
                <span class="audit-tag">Antes</span>
                <p>{{ auditLabel(a.before_state) }}</p>
              </div>
              <div class="audit-state after">
                <span class="audit-tag">Depois</span>
                <p>{{ auditLabel(a.after_state) }}</p>
              </div>
            </div>
          </article>
        </div>

        <div v-else class="empty-state-box">
          <div class="empty-state-card">
            <div class="empty-icon-circle">
              <font-awesome-icon icon="clock-rotate-left" />
            </div>
            <h4>Sem alterações registradas</h4>
            <p>Nenhuma modificação manual ou conciliação foi feita neste lançamento até o momento.</p>
          </div>
        </div>

        <footer class="modal-actions-bar">
          <button type="button" class="secondary-btn" @click="auditVisible = false">Fechar</button>
        </footer>
      </div>
    </BaseModal>
  </div>
</template>

<script>
import BaseModal from "@/components/BaseModal.vue";
import CategoryCombo from "../CategoryCombo.vue";
import NexoWealthDashboard from "./NexoWealthDashboard.vue";
import { physicalWealthService as service } from "@/services/physicalWealthService";
import { transactionCalendarDate } from "@/utils/financeNotificationDisplay";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

const monthStart = (n) => {
  const [year, month] = today().split("-").map(Number);
  const total = year * 12 + (month - 1) - n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}-01`;
};

const kinds = {
  OPENING: "Saldo inicial",
  INCOME: "Entrada real",
  EXPENSE: "Saída real",
  ADJUSTMENT: "Ajuste de saldo",
  TRANSFER: "Transferência entre contas físicas",
  WITHDRAWAL: "Saque bancário",
  DEPOSIT: "Depósito bancário",
  METAL_BUY: "Compra de metal",
  METAL_SELL: "Venda de metal",
  REVERSAL: "Estorno",
};

const money = (v) =>
  v === null || v === undefined
    ? "Sem estimativa"
    : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default {
  name: "NexoPhysicalWealthTab",
  components: { BaseModal, CategoryCombo, NexoWealthDashboard },
  props: {
    active: Boolean,
    // Categorias do Nexo (KademNexo); as de investimento e a de Saque ficam de fora das movimentações.
    categories: { type: Array, default: () => [] },
    // Mês (YYYY-MM) do filtro principal do Nexo: os gráficos de entradas e saídas de espécie seguem esse mês.
    month: { type: String, default: () => today().slice(0, 7) },
  },
  emits: ["changed"],
  data: () => ({
    state: null,
    history: [],
    dashboardHistory: [],
    flows: [],
    section: "dashboard",
    sectionTransitionName: "physical-stage-next",
    subnavBtnRefs: {},
    gliderStyle: {},
    gliderReady: false,
    subnavObserver: null,
    sections: [
      { id: "dashboard", label: "Dashboard", icon: "chart-pie" },
      { id: "cash", label: "Dinheiro em espécie", icon: "wallet" },
      { id: "metals", label: "Metais preciosos", icon: "coins" },
      { id: "movements", label: "Movimentações", icon: "arrow-right-arrow-left" },
      { id: "reports", label: "Relatórios", icon: "chart-line" },
    ],
    loading: false,
    busy: false,
    error: "",
    notice: "",
    offline: false,
    from: today().slice(0, 4) + "-01-01",
    to: today(),
    reportFilterVisible: false,
    reportDraft: { from: "", to: "" },
    pageSize: 20,
    movementPage: 0,
    movementView: "operations",
    movements: [],
    transactions: [],
    search: "",
    txPage: 0,
    walletVisible: false,
    walletName: "",
    walletClient: "",
    operationVisible: false,
    form: {},
    formError: "",
    bankSearch: "",
    bankTransactions: [],
    bankLoading: false,
    bankLoaded: false,
    bankTimer: null,
    allocationVisible: false,
    allocationTx: null,
    allocation: {},
    audit: [],
    auditVisible: false,
  }),
  computed: {
    today,
    cashKinds: () => ["OPENING", "INCOME", "EXPENSE", "WITHDRAWAL", "DEPOSIT", "TRANSFER", "ADJUSTMENT"],
    namedWallets() {
      return (this.state?.wallets || []).filter((w) => w.id);
    },
    isMetal() {
      return ["METAL_BUY", "METAL_SELL"].includes(this.form.kind);
    },
    hasCategory() {
      return ["INCOME", "EXPENSE"].includes(this.form.kind);
    },
    reportDraftValid() {
      const { from, to } = this.reportDraft;
      return Boolean(from && to && from <= to);
    },
    // Só categorias já gravadas no servidor (o diário exige o id real), do mesmo tipo do movimento e sem investimento.
    usableCategories() {
      return this.categories.filter(
        (c) =>
          /^\d+$/.test(String(c.id ?? "")) &&
          (!c.investment_flow_type || c.investment_flow_type === "STANDARD") &&
          !Number(c.is_patrimonial_transfer),
      );
    },
    needsBank() {
      return ["WITHDRAWAL", "DEPOSIT"].includes(this.form.kind) || (this.isMetal && this.form.funding === "DIGITAL");
    },
    selectedLotQuantity() {
      return this.state?.holdings?.find((h) => h.id === this.form.lot_id)?.quantity || 0;
    },
    bankType() {
      return ["WITHDRAWAL", "METAL_BUY"].includes(this.form.kind) ? "EXPENSE" : "INCOME";
    },
    bankQueryKey() {
      const amount = Number(this.form.amount);
      return this.operationVisible && this.needsBank && amount > 0 ? `${this.bankType}|${amount.toFixed(2)}` : "";
    },
    bankCandidates() {
      return this.bankTransactions
        .filter(
          (t) =>
            t.type === this.bankType &&
            t.status === "PAID" &&
            !t.physical_linked &&
            !["CASH", "MIXED", "CREDIT_CARD"].includes(t.payment_method) &&
            Number(t.amount) === Number(this.form.amount),
        )
        .sort((a, b) => Number(b.withdrawal_category || 0) - Number(a.withdrawal_category || 0));
    },
    netCash() {
      return Math.round((Number(this.allocation.tendered || 0) - Number(this.allocation.change || 0)) * 100) / 100;
    },
  },
  watch: {
    active: {
      immediate: true,
      handler(value) {
        if (value) {
          this.reload();
          this.$nextTick(() => this.updateGlider());
        }
      },
    },
    // A aba fica montada com o Nexo; fora dela o `reload` do `active` já traz o mês certo ao voltar.
    month() {
      if (this.active) this.loadFlows();
    },
    // Entrada e saída usam listas de categorias diferentes: trocar o tipo descarta a categoria escolhida.
    "form.kind"() {
      this.form.category_id = null;
    },
    section(value) {
      if (value === "movements") this.loadMovements();
      if (value === "reports") this.loadReports();
      this.$nextTick(() => this.updateGlider());
    },
    bankQueryKey(key) {
      clearTimeout(this.bankTimer);
      if (!key) {
        this.bankTransactions = [];
        this.bankLoaded = false;
        return;
      }
      this.bankTimer = setTimeout(() => this.findBank(), 350);
    },
  },
  mounted() {
    window.addEventListener("resize", this.updateGlider);
    this.$nextTick(() => {
      this.updateGlider();
      if (typeof ResizeObserver !== "undefined" && this.$refs.subnavRef) {
        this.subnavObserver = new ResizeObserver(() => this.updateGlider());
        this.subnavObserver.observe(this.$refs.subnavRef);
      }
    });
  },
  beforeUnmount() {
    clearTimeout(this.bankTimer);
    if (this.subnavObserver) {
      this.subnavObserver.disconnect();
      this.subnavObserver = null;
    }
    window.removeEventListener("resize", this.updateGlider);
  },
  methods: {
    money,
    kindLabel: (k) => kinds[k] || k,
    metalName: (m) => (m === "XAU" ? "Ouro" : "Prata"),
    number: (v) => Number(v || 0).toLocaleString("pt-BR", { maximumFractionDigits: 6 }),
    calendar: transactionCalendarDate,
    day(v) {
      const [year, month, date] = String(v ?? "")
        .slice(0, 10)
        .split("-");
      return date ? `${date}/${month}/${year}` : "";
    },
    percent: (v) =>
      v === null || v === undefined
        ? "Sem base de retorno"
        : `${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`,
    timestamp: (v) => new Date(v).toLocaleString("pt-BR"),
    stale: (q) => Date.now() - new Date(q.quoted_at).getTime() > 48 * 3600000,
    message(e) {
      return e.response?.data?.message || e.message || "Não foi possível concluir a operação.";
    },
    setSubnavBtnRef(el, id) {
      if (el) this.subnavBtnRefs[id] = el;
    },
    updateGlider() {
      const btn = this.subnavBtnRefs?.[this.section];
      if (!btn || !btn.offsetWidth) return;
      this.gliderStyle = {
        width: `${btn.offsetWidth}px`,
        height: `${btn.offsetHeight}px`,
        transform: `translate3d(${btn.offsetLeft}px, ${btn.offsetTop}px, 0)`,
      };
      this.gliderReady = true;
    },
    changeSection(id) {
      if (this.section !== id) {
        const prevIdx = this.sections.findIndex((s) => s.id === this.section);
        const nextIdx = this.sections.findIndex((s) => s.id === id);
        this.sectionTransitionName = nextIdx >= prevIdx ? "physical-stage-next" : "physical-stage-prev";
        this.section = id;
        this.$nextTick(() => this.updateGlider());
      }
    },
    async reload() {
      if (this.loading) return;
      this.loading = true;
      this.error = "";
      try {
        const result = await service.overview();
        this.state = result.data;
        this.offline = result.offline;
        await Promise.all([
          this.searchTransactions(false),
          this.loadMovements(),
          this.loadReports(),
          this.loadDashboardHistory(),
          this.loadFlows(),
        ]);
        this.$nextTick(() => this.updateGlider());
      } catch (e) {
        this.error = this.message(e);
      } finally {
        this.loading = false;
      }
    },
    async searchTransactions(reset = true) {
      if (reset) this.txPage = 0;
      try {
        const result = await service.transactions({
          q: this.search,
          source: "receipt_cash",
          limit: this.pageSize,
          offset: this.txPage * this.pageSize,
        });
        this.transactions = result.data;
      } catch (e) {
        this.error = this.message(e);
      }
    },
    async loadMovements() {
      try {
        const result = await service[this.movementView]({
          from: this.from,
          to: this.to,
          limit: this.pageSize,
          offset: this.movementPage * this.pageSize,
        });
        this.movements = result.data;
      } catch (e) {
        this.error = this.message(e);
      }
    },
    async loadDashboardHistory() {
      try {
        const result = await service.reports({ from: monthStart(11), to: today() });
        this.dashboardHistory = result.data;
      } catch (e) {
        this.error = this.message(e);
      }
    },
    async loadReports() {
      try {
        const result = await service.reports({ from: this.from, to: this.to });
        this.history = result.data;
      } catch (e) {
        this.error = this.message(e);
      }
    },
    // O modal edita um rascunho: o período (compartilhado com Movimentações) só muda ao consultar.
    openReportFilter() {
      this.reportDraft = { from: this.from, to: this.to };
      this.reportFilterVisible = true;
    },
    async applyReportFilter() {
      if (!this.reportDraftValid) return;
      this.from = this.reportDraft.from;
      this.to = this.reportDraft.to;
      this.reportFilterVisible = false;
      await this.loadReports();
    },
    // Fluxo de espécie do mês do filtro principal; respostas antigas (troca rápida de mês) não sobrescrevem a atual.
    async loadFlows() {
      const month = this.month;
      if (!/^\d{4}-\d{2}$/.test(month)) return;
      try {
        const result = await service.flows({ month });
        if (month === this.month) this.flows = result.data;
      } catch (e) {
        if (month === this.month) this.error = this.message(e);
      }
    },
    categoryOptionsFor(kind) {
      return this.usableCategories.filter((c) => c.type === (kind === "EXPENSE" ? "EXPENSE" : "INCOME"));
    },
    noCategoriesLabel: (kind) =>
      kind === "EXPENSE" ? "Nenhuma categoria de gasto encontrada." : "Nenhuma categoria de entrada encontrada.",
    // Só entradas/saídas reais não estornadas na visão do diário aceitam trocar de categoria depois de gravadas.
    canCategorize(op) {
      return (
        this.movementView === "operations" && ["INCOME", "EXPENSE"].includes(op.kind) && !op.reversed && !this.offline
      );
    },
    async setOperationCategory(op, categoryId) {
      if (this.busy) return;
      const category_id = categoryId ? Number(categoryId) : null;
      if (category_id === (op.category_id ?? null)) return;
      this.busy = true;
      this.error = "";
      try {
        await service.setOperationCategory(op.id, { category_id });
        await Promise.all([this.loadMovements(), this.loadFlows()]);
      } catch (e) {
        this.error = this.message(e);
      } finally {
        this.busy = false;
      }
    },
    async afterWrite() {
      await this.reload();
      this.$emit("changed");
    },
    openWallet() {
      this.formError = "";
      this.walletName = "";
      this.walletClient = crypto.randomUUID();
      this.walletVisible = true;
    },
    async saveWallet() {
      if (this.busy) return;
      this.busy = true;
      this.error = "";
      try {
        await service.createWallet({ client_id: this.walletClient, name: this.walletName });
        this.walletVisible = false;
        await this.afterWrite();
      } catch (e) {
        this.formError = this.message(e);
      } finally {
        this.busy = false;
      }
    },
    openOperation(kind, lot) {
      this.formError = "";
      this.bankTransactions = [];
      this.bankSearch = "";
      this.bankLoaded = false;
      this.form = {
        kind,
        client_id: crypto.randomUUID(),
        description: lot ? `Venda de ${lot.name}` : "",
        occurred_on: today(),
        amount: null,
        wallet_id: "",
        to_wallet_id: "",
        direction: "IN",
        funding: "CASH",
        name: "",
        metal: "XAU",
        unit_weight_grams: 1,
        purity: 0.999,
        liquidity_discount: 0,
        quantity: 1,
        lot_id: lot?.id,
        financial_transaction_id: "",
        category_id: null,
      };
      this.operationVisible = true;
    },
    openReversal(op) {
      this.formError = "";
      this.form = {
        kind: "REVERSAL",
        client_id: crypto.randomUUID(),
        reverses_id: op.id,
        description: `Estorno: ${op.description}`.slice(0, 255),
        occurred_on: today(),
      };
      this.operationVisible = true;
    },
    async findBank() {
      clearTimeout(this.bankTimer);
      const key = this.bankQueryKey;
      const amount = Number(this.form.amount);
      this.bankLoading = true;
      try {
        const params = { q: this.bankSearch, type: this.bankType, limit: 100 };
        if (amount > 0) params.amount = amount.toFixed(2);
        const r = await service.transactions(params);
        if (key && key !== this.bankQueryKey) return;
        this.bankTransactions = r.data;
        this.bankLoaded = true;
        if (!this.bankCandidates.some((t) => t.id === this.form.financial_transaction_id)) {
          this.form.financial_transaction_id = "";
        }
      } catch (e) {
        this.formError = this.message(e);
      } finally {
        this.bankLoading = false;
      }
    },
    async saveOperation() {
      if (this.busy) return;
      this.busy = true;
      this.formError = "";
      try {
        const f = this.form;
        const data = { client_id: f.client_id, kind: f.kind, description: f.description, occurred_on: f.occurred_on };
        if (f.kind === "REVERSAL") {
          data.reverses_id = f.reverses_id;
        } else {
          data.amount = Number(f.amount);
          if (!this.isMetal || f.funding === "CASH") data.wallet_id = f.wallet_id || null;
          if (f.kind === "TRANSFER") data.to_wallet_id = f.to_wallet_id || null;
          if (f.kind === "ADJUSTMENT") data.direction = f.direction;
          if (this.hasCategory && f.category_id) data.category_id = Number(f.category_id);
          if (this.isMetal) {
            data.funding = f.funding;
            data.quantity = Number(f.quantity);
            if (f.kind === "METAL_BUY") {
              Object.assign(data, {
                name: f.name,
                metal: f.metal,
                unit_weight_grams: Number(f.unit_weight_grams),
                purity: Number(f.purity),
                liquidity_discount: Number(f.liquidity_discount),
              });
            } else {
              data.lot_id = f.lot_id;
            }
          }
          if (this.needsBank) data.financial_transaction_id = Number(f.financial_transaction_id);
        }
        await service.createOperation(data);
        this.operationVisible = false;
        await this.afterWrite();
      } catch (e) {
        this.formError = this.message(e);
      } finally {
        this.busy = false;
      }
    },
    openAllocation(tx) {
      this.formError = "";
      this.allocationTx = tx;
      this.allocation = {
        tendered: Number(tx.payment_method === "CASH" ? tx.amount : tx.cash_amount || 0),
        change: 0,
        wallet_id: tx.cash_wallet_id || "",
        other_method: "UNKNOWN",
      };
      this.allocationVisible = true;
    },
    async saveAllocation() {
      if (this.busy) return;
      this.busy = true;
      this.formError = "";
      try {
        await service.allocateCash(this.allocationTx.id, {
          cash_amount: this.netCash,
          wallet_id: this.allocation.wallet_id || null,
          other_method: this.allocation.other_method,
        });
        this.allocationVisible = false;
        await this.afterWrite();
      } catch (e) {
        this.formError = this.message(e);
      } finally {
        this.busy = false;
      }
    },
    async showAudit(tx) {
      try {
        this.audit = (await service.audit(tx.id)).data;
        this.auditVisible = true;
      } catch (e) {
        this.error = this.message(e);
      }
    },
    auditLabel(tx) {
      if (!tx) return "Sem registro";
      return `R$ ${tx.payment_method === "CASH" ? tx.amount : tx.cash_amount || 0} em espécie · ${tx.status === "PAID" ? "pago" : tx.status === "PENDING" ? "pendente" : "cancelado"} · ${tx.cash_allocation_source === "RECEIPT" ? "nota fiscal" : "usuário"}`;
    },
    async refreshQuotes() {
      if (this.busy) return;
      this.busy = true;
      try {
        const result = await service.refreshQuotes();
        this.notice = result.data.unavailable ? result.data.message : "Cotações atualizadas.";
        await this.afterWrite();
      } catch (e) {
        this.error = this.message(e);
      } finally {
        this.busy = false;
      }
    },
    exportHistory() {
      const rows = [
        ["Mês", "Espécie BRL", "Custo metais BRL", "Metais estimados BRL", "Patrimônio físico estimado BRL"],
        ...this.history.map((p) => [p.month, p.cash, p.cost, p.metals ?? "", p.physical_total ?? ""]),
      ];
      const blob = new Blob(["\ufeff" + rows.map((r) => r.join(";")).join("\r\n")], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "patrimonio-fisico.csv";
      a.click();
      URL.revokeObjectURL(url);
    },
  },
};
</script>

<style scoped>
/* ==========================================================================
   CONTAINER & LAYOUT DA ABA PATRIMÔNIO FÍSICO
   ========================================================================== */
.physical-tab {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-width: 0;
  gap: var(--space-4);
  color: var(--text-primary);
  container-type: inline-size;
  container-name: physical-tab;
}

/* ==========================================================================
   METRICS GRID (Top KPI Cards)
   ========================================================================== */
.physical-metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: var(--space-4);
}

.metric-card {
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  padding: var(--space-4) var(--space-5);
  display: flex;
  align-items: center;
  gap: var(--space-4);
  min-width: 0;
  transition:
    transform var(--transition-fast),
    border-color var(--transition-fast),
    background var(--transition-base),
    box-shadow var(--transition-fast);
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-elevated);
}

.metric-icon {
  width: 44px;
  height: 44px;
  min-width: 44px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15rem;
  border: 1px solid transparent;
}

.metric-icon.highlight {
  background: rgba(181, 152, 75, 0.16);
  border-color: rgba(181, 152, 75, 0.35);
  color: #9f8037;
}

[data-theme="dark"] .metric-icon.highlight {
  background: rgba(216, 183, 94, 0.18);
  border-color: rgba(216, 183, 94, 0.38);
  color: #e4c46f;
}

.metric-icon.success {
  background: rgba(46, 204, 113, 0.12);
  border-color: rgba(46, 204, 113, 0.24);
  color: #16a34a;
}

[data-theme="dark"] .metric-icon.success {
  background: rgba(46, 204, 113, 0.16);
  border-color: rgba(46, 204, 113, 0.3);
  color: #4ade80;
}

.metric-icon.gold {
  background: rgba(181, 152, 75, 0.14);
  border-color: rgba(181, 152, 75, 0.28);
  color: #9f8037;
}

[data-theme="dark"] .metric-icon.gold {
  background: rgba(216, 183, 94, 0.16);
  border-color: rgba(216, 183, 94, 0.32);
  color: #e4c46f;
}

.metric-icon.primary {
  background: rgba(79, 70, 229, 0.1);
  border-color: rgba(79, 70, 229, 0.2);
  color: #4f46e5;
}

[data-theme="dark"] .metric-icon.primary {
  background: rgba(129, 140, 248, 0.16);
  border-color: rgba(129, 140, 248, 0.28);
  color: #a5b4fc;
}

.metric-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.metric-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
}

.metric-value {
  font-size: 1.25rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
  line-height: 1.2;
}

.metric-value.gold-value {
  color: #9f8037;
}

[data-theme="dark"] .metric-value.gold-value {
  color: #e4c46f;
}

.metric-value.positive {
  color: var(--color-income, #2e9b62);
}

.metric-sub {
  font-size: 0.74rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ==========================================================================
   PAINEL PRINCIPAL & SUBNAV GLIDER
   ========================================================================== */
.panel {
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  padding: var(--space-6);
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-width: 0;
  gap: var(--space-5);
  transition:
    background var(--transition-base),
    border-color var(--transition-base);
}

.panel-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.title-block {
  display: grid;
  gap: 4px;
}

.title-with-badge {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.panel-title h3 {
  margin: 0;
  font-weight: 700;
  font-size: 1.25rem;
  letter-spacing: -0.01em;
  color: var(--text-primary);
}

.panel-subtitle,
.helper-note {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
  line-height: 1.45;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

/* Subnav Segmented Glider */
.physical-subnav {
  position: relative;
  display: inline-flex;
  align-items: center;
  background: var(--surface-2);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  padding: 3px;
  gap: 2px;
  max-width: 100%;
  overflow-x: auto;
  box-sizing: border-box;
}

.subnav-glider {
  position: absolute;
  top: 0;
  left: 0;
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  /* Concêntrico ao subnav: raio externo menos a borda (1px) e o respiro (3px) de .physical-subnav. */
  border-radius: calc(var(--radius-sm) - 4px);
  box-shadow: var(--shadow-sm);
  transition:
    transform 0.24s cubic-bezier(0.16, 1, 0.3, 1),
    width 0.24s cubic-bezier(0.16, 1, 0.3, 1);
  pointer-events: none;
  z-index: 1;
}

[data-theme="dark"] .subnav-glider {
  background: var(--surface-1);
}

.subnav-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 36px;
  padding: 0 var(--space-3);
  border-radius: calc(var(--radius-sm) - 4px);
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: color var(--transition-fast);
  z-index: 2;
}

.subnav-btn:hover {
  color: var(--text-primary);
}

.subnav-btn.chosen {
  color: var(--text-primary);
  font-weight: 700;
}

.subnav-icon {
  font-size: 0.88rem;
}

.subnav-badge {
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  border-radius: var(--radius-md);
  font-size: 0.68rem;
  font-weight: 700;
}

.subnav-badge.neutral {
  background: var(--surface-3);
  color: var(--text-secondary);
}

.subnav-badge.danger {
  background: rgba(214, 74, 46, 0.12);
  color: var(--color-expense);
}

/* ==========================================================================
   SUB-SECTIONS & INNER PANELS
   ========================================================================== */
.physical-view-stage {
  display: grid;
  gap: var(--space-4);
  min-width: 0;
}

.sub-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.sub-header-title h4 {
  margin: 0 0 2px;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-primary);
}

.sub-header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.inner-panel {
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  padding: var(--space-5);
  display: grid;
  gap: var(--space-4);
}

/* ==========================================================================
   CARDS DE CONTAS FÍSICAS (WALLETS)
   ========================================================================== */
.wallets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-3);
}

.wallet-card {
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  display: grid;
  gap: var(--space-3);
  box-shadow: var(--shadow-card);
  transition:
    transform var(--transition-fast),
    border-color var(--transition-fast),
    background var(--transition-fast);
}

.wallet-card:hover {
  transform: translateY(-2px);
  border-color: rgba(181, 152, 75, 0.4);
  background: var(--surface-2);
}

.wallet-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.wallet-icon-badge {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  background: rgba(46, 204, 113, 0.12);
  color: #16a34a;
  border: 1px solid rgba(46, 204, 113, 0.24);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
}

[data-theme="dark"] .wallet-icon-badge {
  background: rgba(46, 204, 113, 0.16);
  border-color: rgba(46, 204, 113, 0.3);
  color: #4ade80;
}

.wallet-tag {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
  padding: 2px 7px;
  border-radius: var(--radius-md);
  background: var(--surface-2);
  border: 1px solid var(--glass-border);
}

.wallet-card-body {
  display: grid;
  gap: 2px;
}

.wallet-name {
  font-size: 0.92rem;
  color: var(--text-primary);
}

.wallet-balance {
  font-size: 1.25rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: var(--color-income, #2e9b62);
}

.wallet-balance.negative {
  color: var(--color-expense, #d64a2e);
}

/* ==========================================================================
   CARDS DE COTAÇÕES (OURO E PRATA)
   ========================================================================== */
.quotes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-4);
}

.quote-card {
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  padding: var(--space-4) var(--space-5);
  display: grid;
  gap: var(--space-3);
  box-shadow: var(--shadow-card);
  transition:
    transform var(--transition-fast),
    border-color var(--transition-fast);
}

.quote-card.xau {
  border-left: 4px solid #b5984b;
}

.quote-card.xag {
  border-left: 4px solid #94a3b8;
}

.quote-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.quote-title-group {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.quote-metal-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
}

.quote-card.xau .quote-metal-icon {
  background: rgba(181, 152, 75, 0.14);
  color: #9f8037;
  border: 1px solid rgba(181, 152, 75, 0.3);
}

[data-theme="dark"] .quote-card.xau .quote-metal-icon {
  background: rgba(216, 183, 94, 0.16);
  color: #e4c46f;
  border-color: rgba(216, 183, 94, 0.34);
}

.quote-card.xag .quote-metal-icon {
  background: rgba(148, 163, 184, 0.14);
  color: #64748b;
  border: 1px solid rgba(148, 163, 184, 0.3);
}

[data-theme="dark"] .quote-card.xag .quote-metal-icon {
  background: rgba(148, 163, 184, 0.18);
  color: #cbd5e1;
  border-color: rgba(148, 163, 184, 0.35);
}

.quote-metal-name {
  display: block;
  font-size: 0.95rem;
  color: var(--text-primary);
}

.quote-metal-code {
  font-size: 0.72rem;
  color: var(--text-secondary);
  font-weight: 700;
}

.quote-card-body {
  display: grid;
  gap: 2px;
}

.quote-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
}

.quote-price {
  font-size: 1.45rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
}

.quote-price small {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-left: 4px;
}

.quote-card-meta {
  font-size: var(--fontsize-xs);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  padding-top: var(--space-2);
  border-top: 1px solid var(--glass-border);
}

/* ==========================================================================
   TABELAS & LISTAS
   ========================================================================== */
.nexo-table-wrap {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: auto;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  background: var(--surface-0);
  box-sizing: border-box;
}

.nexo-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.nexo-table th,
.nexo-table td {
  padding: 10px 14px;
  border-bottom: 1px solid var(--glass-border);
  vertical-align: middle;
  font-size: 0.84rem;
}

.nexo-table th {
  color: var(--text-secondary);
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: var(--surface-2);
  white-space: nowrap;
}

.nexo-table tbody tr:last-child td {
  border-bottom: none;
}

.nexo-table tbody tr:hover {
  background: var(--surface-1);
}

.nexo-table .right {
  text-align: right;
}

.nexo-table .nowrap {
  white-space: nowrap;
}

.tabular {
  font-variant-numeric: tabular-nums;
}

.table-item-name {
  display: block;
  color: var(--text-primary);
  font-size: 0.88rem;
  overflow-wrap: anywhere;
}

.table-item-code {
  display: block;
  color: var(--text-secondary);
  font-size: 0.72rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.table-sub-detail {
  display: block;
  font-size: 0.72rem;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

.col-category {
  min-width: 200px;
}

.category-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-primary);
}

.category-chip > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-dot {
  width: 10px;
  height: 10px;
  flex: 0 0 10px;
  border-radius: 50%;
}

.muted-dash {
  color: var(--text-muted);
}

.table-row-actions {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
}

/* ==========================================================================
   STATUS PILLS, BADGES & PAGINAÇÃO
   ========================================================================== */
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: var(--radius-md);
  font-size: 0.72rem;
  font-weight: 700;
}

.status-pill.success {
  background: rgba(46, 204, 113, 0.12);
  border: 1px solid rgba(46, 204, 113, 0.28);
  color: #16a34a;
}

[data-theme="dark"] .status-pill.success {
  color: #4ade80;
}

.status-pill.warning {
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.28);
  color: #d97706;
}

[data-theme="dark"] .status-pill.warning {
  color: #fbbf24;
}

.status-pill.danger {
  background: rgba(214, 74, 46, 0.12);
  border: 1px solid rgba(214, 74, 46, 0.28);
  color: var(--color-expense, #d64a2e);
}

.status-pill.neutral {
  background: var(--surface-2);
  border: 1px solid var(--glass-border);
  color: var(--text-secondary);
}

.status-pill.gold {
  background: rgba(181, 152, 75, 0.14);
  border: 1px solid rgba(181, 152, 75, 0.3);
  color: #9f8037;
}

[data-theme="dark"] .status-pill.gold {
  color: #e4c46f;
}

.status-pill.silver {
  background: rgba(148, 163, 184, 0.14);
  border: 1px solid rgba(148, 163, 184, 0.3);
  color: #64748b;
}

[data-theme="dark"] .status-pill.silver {
  color: #cbd5e1;
}

.code-pill {
  display: inline-block;
  padding: 2px 7px;
  border-radius: var(--radius-xs);
  background: var(--surface-2);
  border: 1px solid var(--glass-border);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.74rem;
  color: var(--text-secondary);
}

.offline-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: var(--radius-md);
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.28);
  color: #d97706;
  font-size: 0.74rem;
  font-weight: 600;
}

[data-theme="dark"] .offline-pill {
  color: #fbbf24;
}

.count-pill {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--radius-md);
  font-size: 0.72rem;
  font-weight: 600;
}

.count-pill.neutral {
  background: var(--surface-2);
  color: var(--text-secondary);
  border: 1px solid var(--glass-border);
}

.count-pill.info {
  background: rgba(53, 90, 253, 0.1);
  color: var(--color-info);
  border: 1px solid rgba(53, 90, 253, 0.22);
}

.count-pill.warning {
  background: rgba(245, 158, 11, 0.12);
  color: #d97706;
  border: 1px solid rgba(245, 158, 11, 0.26);
}

.count-pill.danger {
  background: rgba(214, 74, 46, 0.12);
  color: var(--color-expense);
  border: 1px solid rgba(214, 74, 46, 0.28);
}

.meta-dot {
  opacity: 0.55;
}

.pager {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-3);
  padding-top: var(--space-2);
}

.pager-info {
  font-size: 0.78rem;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

.report-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--space-4);
}

.metric-value.negative {
  color: var(--color-expense, #d64a2e);
}

/* Grid do relatório: a barra de período e ações é a faixa superior do próprio grid. */
.report-grid {
  display: grid;
  min-width: 0;
  overflow: hidden;
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
}

.report-toolbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--glass-border);
}

.report-period,
.report-actions {
  display: flex;
  align-items: flex-end;
  gap: var(--space-3);
}

.report-actions {
  margin-left: auto;
  gap: var(--space-2);
}

.report-actions .compact {
  height: 36px;
}

.report-grid .nexo-table-wrap,
.report-grid .empty-state-box {
  border: none;
  border-radius: 0;
  background: transparent;
}

.report-toolbar .report-filter-btn {
  display: none;
  min-width: 0;
}

.report-period-label {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.78rem;
  font-variant-numeric: tabular-nums;
}

/* Layout compacto: no lugar dos campos de data fica um botão de filtro; as datas são escolhidas num modal. */
@container physical-tab (max-width: 640px) {
  .report-toolbar {
    align-items: center;
    flex-wrap: nowrap;
  }

  .report-toolbar .report-period,
  .report-actions .report-consult-btn {
    display: none;
  }

  .report-toolbar .report-filter-btn {
    display: inline-flex;
  }
}

/* ==========================================================================
   FILTROS & FORMULÁRIOS INTERNOS
   ========================================================================== */
.filters-surface {
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  padding: var(--space-3) var(--space-4);
}

.movement-filters-bar {
  display: flex;
  align-items: flex-end;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.filter-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.filter-field span {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
}

.filter-actions-col {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.inline-control-row {
  display: flex;
  flex-direction: row !important;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.inline-control-row > button {
  height: 42px;
  min-height: 42px;
  flex-shrink: 0;
}

.input-with-icon {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.field-icon {
  position: absolute;
  left: 15px;
  color: var(--text-muted);
  font-size: 0.85rem;
  pointer-events: none;
  z-index: 1;
}

.nexo-control {
  width: 100%;
  height: 42px !important;
  min-height: 42px !important;
  border-radius: var(--radius-sm) !important;
  border: 1px solid var(--glass-border) !important;
  box-shadow: none !important;
  background: var(--surface-0) !important;
  color: var(--text-primary) !important;
  padding: 0 var(--space-3) !important;
  outline: none !important;
  font-size: var(--fontsize-sx, 0.875rem) !important;
  font-family: inherit;
  box-sizing: border-box;
  transition:
    border-color var(--transition-fast),
    background var(--transition-fast),
    box-shadow var(--transition-fast);
}

[data-theme="dark"] .nexo-control {
  background: var(--surface-1) !important;
}

.nexo-control.with-left-icon {
  padding: 0 36px 0 44px !important;
}

.nexo-control.compact {
  height: 36px !important;
  min-height: 36px !important;
  padding: 0 var(--space-2) !important;
  font-size: 0.82rem !important;
}

.nexo-control:focus {
  border-color: var(--color-info) !important;
  background: var(--surface-0) !important;
  box-shadow: 0 0 0 3px rgba(53, 90, 253, 0.14) !important;
}

.clear-search-btn {
  position: absolute;
  right: 8px;
  width: 26px;
  height: 26px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-xs);
  font-size: 0.8rem;
  transition: all var(--transition-fast);
}

.clear-search-btn:hover {
  background: var(--surface-2);
  color: var(--text-primary);
}

/* ==========================================================================
   BOTÕES (Padrão Nexo)
   ========================================================================== */
.primary-action,
.secondary-btn,
.danger-btn {
  border-radius: var(--radius-sm);
  font-weight: 600;
  font-size: 0.84rem;
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  cursor: pointer;
  white-space: nowrap;
  box-sizing: border-box;
  transition:
    transform var(--transition-fast),
    background var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.primary-action {
  height: 40px;
  padding: 0 var(--space-4);
  border: 1px solid transparent;
  background: linear-gradient(135deg, #1f274c, #344079);
  color: #ffffff;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(31, 39, 76, 0.2);
}

[data-theme="dark"] .primary-action {
  background: linear-gradient(135deg, #355afd, #4f46e5);
  box-shadow: 0 2px 10px rgba(53, 90, 253, 0.32);
}

.primary-action:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.08);
}

.secondary-btn {
  height: 38px;
  padding: 0 var(--space-3);
  border: 1px solid var(--glass-border);
  background: var(--surface-2);
  color: var(--text-primary);
  font-size: 0.82rem;
}

.secondary-btn:hover:not(:disabled) {
  background: var(--surface-3);
  border-color: var(--color-info);
  color: var(--color-info);
  transform: translateY(-1px);
}

.danger-btn {
  height: 38px;
  padding: 0 var(--space-3);
  border: 1px solid rgba(214, 74, 46, 0.3);
  background: rgba(214, 74, 46, 0.08);
  color: var(--color-expense, #d64a2e);
  font-size: 0.82rem;
  font-weight: 700;
}

.danger-btn:hover:not(:disabled) {
  background: var(--color-expense, #d64a2e);
  border-color: var(--color-expense, #d64a2e);
  color: #ffffff;
  transform: translateY(-1px);
}

.primary-action.compact,
.secondary-btn.compact,
.danger-btn.compact {
  height: 34px;
  min-height: 34px;
  padding: 0 12px;
  font-size: 0.78rem;
}

button:disabled {
  opacity: 0.52;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}

/* ==========================================================================
   BANNERS & AVISOS
   ========================================================================== */
.nexo-banner {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  line-height: 1.45;
}

.nexo-banner .banner-icon {
  font-size: 1rem;
  flex-shrink: 0;
}

.nexo-banner.warning {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.28);
  color: #b45309;
}

[data-theme="dark"] .nexo-banner.warning {
  background: rgba(251, 191, 36, 0.14);
  border-color: rgba(251, 191, 36, 0.32);
  color: #fde68a;
}

.nexo-banner.error {
  background: rgba(214, 74, 46, 0.1);
  border: 1px solid rgba(214, 74, 46, 0.28);
  color: var(--color-expense, #d64a2e);
}

[data-theme="dark"] .nexo-banner.error {
  background: rgba(239, 68, 68, 0.14);
  border-color: rgba(239, 68, 68, 0.32);
  color: #fca5a5;
}

.nexo-banner.info {
  background: rgba(53, 90, 253, 0.08);
  border: 1px solid rgba(53, 90, 253, 0.22);
  color: var(--color-info);
}

[data-theme="dark"] .nexo-banner.info {
  background: rgba(95, 124, 255, 0.14);
  border-color: rgba(95, 124, 255, 0.3);
  color: #bfdbfe;
}

.nexo-banner.subtle.accent-warning {
  background: rgba(181, 152, 75, 0.08);
  border: 1px solid rgba(181, 152, 75, 0.24);
  color: var(--text-secondary);
}

.banner-close {
  margin-left: auto;
  background: transparent;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 4px;
  font-size: 0.9rem;
  opacity: 0.7;
}

.banner-close:hover {
  opacity: 1;
}

/* ==========================================================================
   EMPTY STATES
   ========================================================================== */
.empty-state-box {
  padding: var(--space-8) var(--space-4);
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  text-align: center;
}

.empty-state-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  max-width: 420px;
  margin: 0 auto;
  text-align: center;
}

.empty-state-card.compact {
  padding: var(--space-6) var(--space-4);
  max-width: 380px;
}

.empty-icon-circle {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--surface-2);
  border: 1px solid var(--glass-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.35rem;
  color: var(--text-muted);
  margin-bottom: var(--space-1);
}

.empty-state-card h4 {
  margin: 0;
  font-size: 1rem;
  color: var(--text-primary);
}

.empty-state-card p {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
  line-height: 1.5;
}

/* ==========================================================================
   FORMULÁRIOS NOS MODAIS
   ========================================================================== */
.nexo-modal-form {
  display: grid;
  gap: var(--space-4);
  color: var(--text-primary);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.inner-highlight-card {
  padding: var(--space-3) var(--space-4);
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  display: grid;
  gap: var(--space-2);
}

.alloc-summary-card {
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  padding: var(--space-3) var(--space-4);
  display: grid;
  gap: 2px;
}

.alloc-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.alloc-name {
  font-size: 0.95rem;
  color: var(--text-primary);
}

.alloc-total {
  font-size: 0.82rem;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.alloc-result-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3);
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  font-size: 0.86rem;
}

.alloc-result-box strong {
  font-variant-numeric: tabular-nums;
  margin-left: 6px;
}

.modal-actions-bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--glass-border);
  flex-wrap: wrap;
}

/* Modal de Auditoria */
.audit-modal-body {
  display: grid;
  gap: var(--space-4);
}

.audit-timeline {
  display: grid;
  gap: var(--space-3);
  max-height: 380px;
  overflow-y: auto;
}

.audit-card {
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  padding: var(--space-3) var(--space-4);
  display: grid;
  gap: var(--space-2);
}

.audit-time-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.audit-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-info);
}

.audit-diff-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.audit-state {
  padding: var(--space-2);
  border-radius: var(--radius-xs);
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  font-size: 0.78rem;
}

.audit-tag {
  font-weight: 700;
  text-transform: uppercase;
  font-size: 0.68rem;
  display: block;
  margin-bottom: 2px;
  color: var(--text-secondary);
}

.audit-state p {
  margin: 0;
  color: var(--text-primary);
  line-height: 1.4;
}

/* ==========================================================================
   TRANSIÇÕES DE ETAPA
   ========================================================================== */
.physical-stage-next-enter-active,
.physical-stage-next-leave-active,
.physical-stage-prev-enter-active,
.physical-stage-prev-leave-active {
  transition:
    opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.physical-stage-next-enter-from {
  opacity: 0;
  transform: translate3d(16px, 0, 0);
}

.physical-stage-next-leave-to {
  opacity: 0;
  transform: translate3d(-16px, 0, 0);
}

.physical-stage-prev-enter-from {
  opacity: 0;
  transform: translate3d(-16px, 0, 0);
}

.physical-stage-prev-leave-to {
  opacity: 0;
  transform: translate3d(16px, 0, 0);
}

/* ==========================================================================
   RESPONSIVIDADE
   ========================================================================== */
@container physical-tab (max-width: 800px) {
  .physical-metrics-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-3);
  }

  .form-grid,
  .audit-diff-grid {
    grid-template-columns: 1fr;
  }
}

@container physical-tab (max-width: 600px) {
  .panel {
    padding: var(--space-4);
    gap: var(--space-4);
  }

  .panel-title {
    flex-direction: column;
    align-items: stretch;
  }

  .header-actions {
    width: 100%;
  }

  .header-actions > * {
    flex: 1;
    justify-content: center;
  }

  .physical-subnav {
    width: 100%;
  }

  .subnav-btn {
    flex: 1;
    justify-content: center;
    padding: 0 var(--space-2);
    font-size: 0.76rem;
  }

  .movement-filters-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-actions-col {
    width: 100%;
  }

  .filter-actions-col button {
    flex: 1;
  }
}

@container physical-tab (max-width: 480px) {
  .physical-metrics-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .modal-actions-bar {
    flex-direction: column-reverse;
    align-items: stretch;
  }

  .modal-actions-bar button {
    width: 100%;
    min-height: 42px;
  }

  .form-grid,
  .audit-diff-grid {
    grid-template-columns: 1fr;
  }
}
</style>
