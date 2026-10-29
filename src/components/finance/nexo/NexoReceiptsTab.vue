<template>
  <div class="receipts-tab">
    <!-- KPIs DE RESUMO FISCAL (Padrão Nexo) -->
    <section class="receipt-metrics-grid" aria-label="Resumo do arquivo fiscal">
      <article class="metric-card">
        <div class="metric-icon info">
          <font-awesome-icon icon="receipt" />
        </div>
        <div class="metric-info">
          <span class="metric-label">Notas arquivadas</span>
          <strong class="metric-value">{{ rows.length }}</strong>
          <small class="metric-sub">
            {{ hasActiveReceiptFilters || transactionId ? "No filtro atual" : "Comprovantes no arquivo" }}
          </small>
        </div>
      </article>

      <article class="metric-card">
        <div class="metric-icon primary">
          <font-awesome-icon icon="scale-balanced" />
        </div>
        <div class="metric-info">
          <span class="metric-label">Total em notas</span>
          <strong class="metric-value">{{ money(receiptsTotalAmount) }}</strong>
          <small class="metric-sub">Soma dos comprovantes listados</small>
        </div>
      </article>

      <article class="metric-card">
        <div class="metric-icon success">
          <font-awesome-icon icon="circle-check" />
        </div>
        <div class="metric-info">
          <span class="metric-label">Conciliadas</span>
          <strong class="metric-value positive">{{ matchedReceiptsCount }}</strong>
          <small class="metric-sub">Vinculadas a lançamentos</small>
        </div>
      </article>

      <article class="metric-card">
        <div class="metric-icon warning">
          <font-awesome-icon icon="triangle-exclamation" />
        </div>
        <div class="metric-info">
          <span class="metric-label">Pendentes / Revisão</span>
          <strong class="metric-value" :class="{ 'warning-text': attentionReceiptsCount > 0 }">
            {{ attentionReceiptsCount }}
          </strong>
          <small class="metric-sub">
            {{ reviews.length ? `${reviews.length} importação(ões) em revisão` : "Aguardando conferência" }}
          </small>
        </div>
      </article>
    </section>

    <section class="panel receipts-panel">
      <header class="panel-title">
        <div class="title-block">
          <div class="title-with-badge">
            <h3>Notas fiscais</h3>
            <Transition name="banner-fade" mode="out-in">
              <span v-if="view === 'receipts' && rows.length > 0" key="count-receipts" class="count-pill info">
                {{ rows.length }} {{ rows.length === 1 ? "comprovante" : "comprovantes" }}
              </span>
              <span v-else-if="view === 'products' && products.length > 0" key="count-products" class="count-pill info">
                {{ products.length }} {{ products.length === 1 ? "produto" : "produtos" }}
              </span>
              <span v-else-if="view === 'reviews' && reviews.length > 0" key="count-reviews" class="count-pill warning">
                {{ reviews.length }} em revisão
              </span>
            </Transition>
          </div>
          <p class="panel-subtitle">
            Seus comprovantes originais, histórico de produtos comprados e conciliação fiscal.
          </p>
        </div>

        <div class="header-actions">
          <span v-if="!connected" class="offline-pill" title="Sem conexão no momento">
            <font-awesome-icon icon="wifi" />
            <span>Offline</span>
          </span>
          <button type="button" class="secondary-btn" :disabled="busy" @click="reload">
            <font-awesome-icon :icon="busy ? 'circle-notch' : 'arrows-rotate'" :spin="busy" />
            <span>{{ busy ? "Atualizando…" : "Atualizar" }}</span>
          </button>
          <button type="button" class="primary-action" :disabled="busy" @click="openCaptureModal">
            <font-awesome-icon icon="plus" />
            <span>Arquivar comprovante</span>
          </button>
        </div>
      </header>

      <div v-if="error" class="nexo-banner error" role="alert">
        <font-awesome-icon icon="triangle-exclamation" class="banner-icon" />
        <span>{{ error }}</span>
        <button type="button" class="banner-close" aria-label="Fechar aviso" @click="error = ''">
          <font-awesome-icon icon="xmark" />
        </button>
      </div>

      <div v-if="message" class="nexo-banner info" role="status">
        <font-awesome-icon icon="circle-check" class="banner-icon" />
        <span>{{ message }}</span>
        <button type="button" class="banner-close" aria-label="Fechar mensagem" @click="message = ''">
          <font-awesome-icon icon="xmark" />
        </button>
      </div>

      <div v-if="!connected" class="nexo-banner warning" role="status">
        <font-awesome-icon icon="circle-info" class="banner-icon" />
        <span>
          Você está offline. Os arquivos serão preservados neste dispositivo e enviados automaticamente ao reconectar.
        </span>
      </div>

      <nav ref="subnavRef" class="receipt-subnav" :class="{ 'has-glider': gliderReady }" aria-label="Arquivo fiscal">
        <span class="subnav-glider" :style="gliderStyle" aria-hidden="true" />
        <button
          v-for="v in views"
          :key="v.id"
          :ref="(el) => setSubnavBtnRef(el, v.id)"
          type="button"
          class="subnav-btn"
          :class="{ chosen: view === v.id }"
          @click="changeView(v.id)"
        >
          <font-awesome-icon :icon="v.icon" class="subnav-icon" />
          <span>{{ v.label }}</span>
          <span v-if="v.id === 'receipts' && rows.length" class="subnav-badge neutral">{{ rows.length }}</span>
          <span v-else-if="v.id === 'products' && products.length" class="subnav-badge neutral">
            {{ products.length }}
          </span>
          <span v-else-if="v.id === 'reviews' && reviews.length" class="subnav-badge warning">
            {{ reviews.length }}
          </span>
        </button>
      </nav>

      <Transition name="banner-fade">
        <div v-if="busy" class="nexo-progress-strip" role="status">
          <font-awesome-icon icon="circle-notch" spin />
          <span>{{ progress || "Carregando dados fiscais…" }}</span>
        </div>
      </Transition>

      <Transition :name="viewTransitionName" mode="out-in">
        <!-- ABA 1: NOTAS FISCAIS -->
        <div v-if="view === 'receipts'" key="receipts" class="receipt-view-stage">
          <div v-if="transactionId" class="tx-filter-banner">
            <div class="tx-filter-copy">
              <font-awesome-icon icon="filter" class="tx-filter-icon" />
              <span>
                Exibindo comprovantes vinculados ao lançamento <strong>#{{ transactionId }}</strong>
              </span>
            </div>
            <button type="button" class="reset-filters-btn compact" @click="$emit('clear-transaction')">
              <font-awesome-icon icon="xmark" />
              <span>Ver todo o arquivo</span>
            </button>
          </div>

          <div class="filters-surface">
            <form class="receipt-filters-bar" @submit.prevent="reload">
              <div class="filter-field search-filter">
                <label for="receipt-filter-q">Pesquisar notas e produtos</label>
                <div class="input-with-icon">
                  <font-awesome-icon icon="magnifying-glass" class="field-icon" />
                  <input
                    id="receipt-filter-q"
                    v-model="filters.q"
                    type="search"
                    class="nexo-control with-left-icon"
                    aria-label="Pesquisar notas e produtos"
                    placeholder="Estabelecimento, produto, CNPJ, chave…"
                  />
                  <button
                    v-if="filters.q"
                    type="button"
                    class="clear-search-btn"
                    title="Limpar busca"
                    @click="
                      filters.q = '';
                      reload();
                    "
                  >
                    <font-awesome-icon icon="xmark" />
                  </button>
                </div>
              </div>

              <div class="filter-field date-filter">
                <label for="receipt-filter-from">Data inicial</label>
                <input
                  id="receipt-filter-from"
                  v-model="filters.from"
                  type="date"
                  class="nexo-control"
                  aria-label="Data inicial"
                />
              </div>

              <div class="filter-field date-filter">
                <label for="receipt-filter-to">Data final</label>
                <input
                  id="receipt-filter-to"
                  v-model="filters.to"
                  type="date"
                  class="nexo-control"
                  aria-label="Data final"
                />
              </div>

              <div class="filter-field amount-filter">
                <label for="receipt-filter-amount">Valor (R$)</label>
                <input
                  id="receipt-filter-amount"
                  v-model="filters.amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  class="nexo-control"
                  aria-label="Valor total"
                  placeholder="0,00"
                />
              </div>

              <div class="filter-field status-filter">
                <label for="receipt-filter-status">Situação</label>
                <select id="receipt-filter-status" v-model="filters.status" class="nexo-control" aria-label="Situação">
                  <option value="">Todas as situações</option>
                  <option v-for="(label, key) in states" :key="key" :value="key">{{ label }}</option>
                </select>
              </div>

              <div class="filter-actions-col">
                <button type="submit" class="secondary-btn filter-btn" :disabled="busy">
                  <font-awesome-icon icon="magnifying-glass" />
                  <span>Pesquisar</span>
                </button>
                <button
                  v-if="hasActiveReceiptFilters"
                  type="button"
                  class="reset-filters-btn"
                  title="Limpar filtros"
                  @click="clearReceiptFilters"
                >
                  <font-awesome-icon icon="xmark" />
                  <span>Limpar</span>
                </button>
              </div>
            </form>
          </div>

          <div v-if="rows.length" class="receipt-list">
            <div
              v-for="row in rows"
              :key="row.local_key"
              role="button"
              tabindex="0"
              class="receipt-row-card"
              :class="`tone-${statusTone(row)}`"
              @click="open(row)"
              @keydown.enter.prevent="open(row)"
              @keydown.space.prevent="open(row)"
            >
              <div class="receipt-row-main">
                <span class="receipt-avatar" :class="statusTone(row)">
                  <font-awesome-icon :icon="statusIcon(row)" :spin="row.status === 'PROCESSING'" />
                </span>

                <div class="receipt-row-copy">
                  <div class="receipt-row-title">
                    <strong>{{ row.merchant || "Comprovante aguardando leitura" }}</strong>
                    <span v-if="row.pending_sync" class="status-pill pending">
                      <font-awesome-icon icon="cloud-arrow-up" />
                      {{ row.sync_error ? "Falha no envio" : "Aguardando envio" }}
                    </span>
                    <span v-else class="status-pill" :class="statusTone(row)">
                      {{ states[row.status] || row.status }}
                    </span>
                    <span v-if="row.ai_status === 'INSUFFICIENT_AI_CREDITS'" class="status-pill warning">
                      <font-awesome-icon icon="triangle-exclamation" />
                      IA indisponível · confira os dados
                    </span>
                  </div>

                  <div class="receipt-row-meta">
                    <span class="meta-chip">
                      <font-awesome-icon icon="calendar" />
                      {{ dateLabel(row.issued_on) }}
                    </span>
                    <span class="meta-dot">·</span>
                    <span class="mono-text">
                      {{ row.issuer_id || formatAccessKeyShort(row.access_key) || "Identificação pendente" }}
                    </span>
                    <template v-for="link in activeReceiptLinks(row)" :key="link.id || link.transaction_id">
                      <button type="button" class="linked-tag linked-transaction-btn"
                        :title="`Abrir movimentação #${link.transaction_id}`"
                        @click.stop="viewLinkedTransaction(link)" @keydown.enter.stop @keydown.space.stop>
                        <font-awesome-icon icon="link" />
                        Movimentação #{{ link.transaction_id }}
                      </button>
                    </template>
                  </div>
                </div>
              </div>

              <div class="receipt-row-end">
                <strong class="receipt-amount">{{ money(row.total) }}</strong>
                <div class="receipt-row-actions">
                  <button
                    type="button"
                    class="icon-btn small danger"
                    title="Excluir nota fiscal"
                    aria-label="Excluir nota fiscal"
                    :disabled="busy"
                    @click.stop="openDeleteConfirm(row)"
                  >
                    <font-awesome-icon icon="trash" />
                  </button>
                  <span class="row-chevron" aria-hidden="true">
                    <font-awesome-icon icon="chevron-right" />
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="!busy" class="empty-state-box">
            <div class="empty-state-card">
              <div class="empty-icon-circle">
                <font-awesome-icon icon="receipt" />
              </div>
              <h4>Nenhuma nota fiscal encontrada</h4>
              <p v-if="hasActiveReceiptFilters || transactionId">
                Não encontramos comprovantes para os filtros aplicados no momento.
              </p>
              <p v-else>Fotografe um comprovante, selecione um arquivo XML/PDF ou importe o QR Code para começar.</p>
              <div class="empty-state-actions">
                <button
                  v-if="hasActiveReceiptFilters"
                  type="button"
                  class="reset-filters-btn"
                  @click="clearReceiptFilters"
                >
                  <font-awesome-icon icon="xmark" />
                  <span>Limpar filtros</span>
                </button>
                <button v-else type="button" class="primary-action" @click="openCaptureModal">
                  <font-awesome-icon icon="plus" />
                  <span>Arquivar comprovante</span>
                </button>
              </div>
            </div>
          </div>

          <div v-if="hasMore" class="load-more-row">
            <button type="button" class="secondary-btn" :disabled="busy" @click="loadMore">
              <font-awesome-icon :icon="busy ? 'circle-notch' : 'arrows-rotate'" :spin="busy" />
              <span>Carregar mais notas</span>
            </button>
          </div>
        </div>

        <!-- ABA 2: PRODUTOS -->
        <div v-else-if="view === 'products'" key="products" class="receipt-view-stage">
          <div class="filters-surface">
            <form class="receipt-filters-bar products-filter-bar" @submit.prevent="loadProducts">
              <div class="filter-field search-filter">
                <label for="product-search-input">Pesquisar catálogo de produtos</label>
                <div class="input-with-icon">
                  <font-awesome-icon icon="magnifying-glass" class="field-icon" />
                  <input
                    id="product-search-input"
                    v-model="productQuery"
                    type="search"
                    class="nexo-control with-left-icon"
                    aria-label="Pesquisar produtos"
                    placeholder="Nome, GTIN (EAN) ou código do fornecedor…"
                  />
                  <button
                    v-if="productQuery"
                    type="button"
                    class="clear-search-btn"
                    title="Limpar busca"
                    @click="
                      productQuery = '';
                      loadProducts();
                    "
                  >
                    <font-awesome-icon icon="xmark" />
                  </button>
                </div>
              </div>
              <div class="filter-actions-col">
                <button type="submit" class="primary-action filter-btn" :disabled="busy">
                  <font-awesome-icon icon="magnifying-glass" />
                  <span>Pesquisar</span>
                </button>
                <button
                  v-if="productQuery"
                  type="button"
                  class="reset-filters-btn"
                  @click="
                    productQuery = '';
                    loadProducts();
                  "
                >
                  <font-awesome-icon icon="xmark" />
                  <span>Limpar</span>
                </button>
              </div>
            </form>
          </div>

          <NexoReceiptGrid v-if="products.length" v-model:column-order="productColumnOrder"
            :columns="productGridColumns" :rows="products" label="Produtos das notas fiscais">
            <template #description="{ row }">
              <button type="button" class="product-name-link" @click="showHistory(row)">{{ row.description }}</button>
              <small v-if="row.gtin || row.supplier_code" class="table-item-code">{{ row.gtin || row.supplier_code }}</small>
            </template>
            <template #purchase_count="{ row }">
              <span class="count-pill info">{{ row.purchase_count }}</span>
            </template>
            <template #actions="{ row }">
              <button type="button" class="icon-btn small" title="Histórico de compras" aria-label="Histórico de compras" @click="showHistory(row)">
                <font-awesome-icon icon="clock-rotate-left" />
              </button>
            </template>
          </NexoReceiptGrid>

          <div v-else-if="!busy" class="empty-state-box">
            <div class="empty-state-card">
              <div class="empty-icon-circle">
                <font-awesome-icon icon="boxes-stacked" />
              </div>
              <h4>Nenhum produto listado</h4>
              <p>Pesquise um produto das suas notas fiscais arquivadas para consultar preços e compras anteriores.</p>
            </div>
          </div>
        </div>

        <!-- ABA 3: IMPORTAÇÕES EM REVISÃO -->
        <div v-else key="reviews" class="receipt-view-stage">
          <div class="nexo-banner subtle accent-warning" role="status">
            <font-awesome-icon icon="scale-balanced" class="banner-icon" />
            <span>
              Importações em revisão não acrescentam despesas ao seu saldo até você confirmar a correspondência abaixo.
            </span>
          </div>

          <div v-if="pendingCount" class="nexo-banner warning" role="status">
            <font-awesome-icon icon="cloud-arrow-up" class="banner-icon" />
            <span>{{ pendingCount }} entrada(s) aguardando conexão/sincronização neste dispositivo.</span>
          </div>

          <div v-if="reviews.length" class="review-cards-stack">
            <article v-for="entry in reviews" :key="entry.id" class="review-entry-card">
              <div class="review-entry-head">
                <div class="review-entry-title">
                  <span class="receipt-avatar warning">
                    <font-awesome-icon icon="list-check" />
                  </span>
                  <div>
                    <strong>{{ entry.payload.description }}</strong>
                    <div class="receipt-row-meta">
                      <span class="status-pill info">
                        {{
                          {
                            CSV: "CSV",
                            CSV_LEGACY: "CSV",
                            GENOS_NOTIFICATION: "Genos",
                            PLUGGY: "Open Finance",
                          }[entry.provider] || "Nexo"
                        }}
                      </span>
                      <span class="meta-dot">·</span>
                      <span>
                        <font-awesome-icon icon="calendar" />
                        {{ dateLabel(entry.payload.transaction_date) }}
                      </span>
                    </div>
                  </div>
                </div>
                <strong
                  class="review-entry-amount"
                  :class="entry.payload.type === 'INCOME' ? 'positive' : 'negative'"
                >
                  {{ money(entry.payload.amount) }}
                </strong>
              </div>

              <div class="review-reconcile-surface">
                <div class="review-reconcile-grid">
                  <div class="filter-field">
                    <label>Mês para conciliação</label>
                    <div class="inline-control-row">
                      <input
                        v-model="reviewMonths[entry.id]"
                        type="month"
                        class="nexo-control"
                        aria-label="Mês dos lançamentos para conciliação"
                      />
                      <button
                        type="button"
                        class="secondary-btn"
                        :disabled="busy"
                        @click="findReviewCandidates(entry)"
                      >
                        <font-awesome-icon icon="magnifying-glass" />
                        <span>Buscar correspondências</span>
                      </button>
                    </div>
                  </div>

                  <div class="filter-field">
                    <label>Vincular a um lançamento existente</label>
                    <div class="inline-control-row">
                      <select v-model="reviewTargets[entry.id]" class="nexo-control" aria-label="Lançamento existente">
                        <option :value="undefined">Selecione um lançamento correspondente…</option>
                        <option v-for="tx in reviewMatches[entry.id] || []" :key="tx.id" :value="tx.id">
                          {{ dateLabel(tx.transaction_date) }} · {{ tx.description }} · {{ money(tx.amount) }}
                        </option>
                      </select>
                      <button
                        type="button"
                        class="primary-action compact"
                        :disabled="busy || !reviewTargets[entry.id]"
                        @click="resolveReview(entry, 'link')"
                      >
                        <font-awesome-icon icon="link" />
                        <span>Vincular existente</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="review-entry-actions">
                <button type="button" class="secondary-btn" :disabled="busy" @click="resolveReview(entry, 'create')">
                  <font-awesome-icon icon="plus" />
                  <span>Confirmar compra distinta</span>
                </button>
                <button
                  type="button"
                  class="danger-btn"
                  :disabled="busy"
                  @click="resolveReview(entry, 'dismiss')"
                >
                  <font-awesome-icon icon="trash" />
                  <span>Descartar importação</span>
                </button>
              </div>
            </article>
          </div>

          <div v-else-if="!busy" class="empty-state-box">
            <div class="empty-state-card">
              <div class="empty-icon-circle">
                <font-awesome-icon icon="circle-check" />
              </div>
              <h4>Nenhuma importação aguardando revisão</h4>
              <p>Todas as movimentações importadas já foram conciliadas ou confirmadas.</p>
            </div>
          </div>
        </div>
      </Transition>
    </section>

    <!-- MODAL 0: ARQUIVAR COMPROVANTE FISCAL -->
    <BaseModal
      :model-value="captureModalOpen"
      title="Arquivar comprovante fiscal"
      size="md"
      @close="closeCaptureModal"
    >
      <div class="nexo-receipt-modal capture-modal-body">
        <div v-if="!connected" class="nexo-banner warning" role="status">
          <font-awesome-icon icon="wifi" class="banner-icon" />
          <span>Sem internet: o arquivo ficará salvo neste dispositivo e será sincronizado ao reconectar.</span>
        </div>

        <div v-if="error" class="nexo-banner error" role="alert">
          <font-awesome-icon icon="triangle-exclamation" class="banner-icon" />
          <span>{{ error }}</span>
        </div>

        <div v-if="busy" class="nexo-progress-strip" role="status">
          <font-awesome-icon icon="circle-notch" spin />
          <span>{{ progress || "Processando… O documento original está preservado." }}</span>
        </div>

        <div class="capture-options-grid">
          <label class="capture-option-tile primary" :class="{ 'is-disabled': busy }">
            <span class="capture-tile-icon">
              <font-awesome-icon icon="cloud-arrow-up" />
            </span>
            <div class="capture-tile-copy">
              <strong>Selecionar arquivos</strong>
              <small>XML, PDF ou imagens (JPG, PNG, WebP)</small>
            </div>
            <input
              type="file"
              multiple
              accept=".xml,.pdf,image/jpeg,image/png,image/webp"
              :disabled="busy"
              @change="selectFiles"
            />
          </label>

          <label class="capture-option-tile" :class="{ 'is-disabled': busy }">
            <span class="capture-tile-icon">
              <font-awesome-icon icon="camera" />
            </span>
            <div class="capture-tile-copy">
              <strong>Fotografar nota</strong>
              <small>Capturar comprovante pela câmera</small>
            </div>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              :disabled="busy"
              @change="photograph"
            />
          </label>

          <button type="button" class="capture-option-tile" :disabled="busy" @click="startCamera">
            <span class="capture-tile-icon">
              <font-awesome-icon icon="qrcode" />
            </span>
            <div class="capture-tile-copy">
              <strong>Ler QR Code</strong>
              <small>Escanear QR Code da NFC-e / NF-e</small>
            </div>
          </button>
        </div>

        <label class="nexo-checkbox checkbox-surface">
          <input v-model="groupPhotos" type="checkbox" :disabled="busy" />
          <span>Agrupar múltiplos arquivos selecionados como páginas da mesma nota</span>
        </label>

        <!-- Câmera Ativa para QR Code -->
        <div v-if="cameraOpen" class="camera-box">
          <video ref="video" autoplay playsinline muted class="camera-video" />
          <div class="camera-actions">
            <button type="button" class="secondary-btn compact" @click="stopCamera">
              <font-awesome-icon icon="xmark" />
              <span>Fechar câmera</span>
            </button>
          </div>
        </div>

        <!-- Registro por Chave / QR -->
        <form class="qr-form-row" @submit.prevent="captureReference">
          <div class="input-with-icon qr-input-wrap">
            <font-awesome-icon icon="qrcode" class="field-icon" />
            <input
              v-model="qr"
              type="text"
              class="nexo-control with-left-icon"
              placeholder="Ou cole a chave de acesso de 44 dígitos / URL do QR Code…"
              aria-label="Chave de acesso de 44 dígitos ou referência do QR Code"
              :disabled="busy"
            />
          </div>
          <button type="submit" class="secondary-btn" :disabled="busy || !qr.trim()">
            <font-awesome-icon icon="arrow-right" />
            <span>Registrar chave</span>
          </button>
        </form>

        <footer class="modal-footer-bar">
          <small class="helper-note">Os arquivos originais são preservados sem recodificação.</small>
          <button type="button" class="secondary-btn" :disabled="busy" @click="closeCaptureModal">
            <span>Fechar</span>
          </button>
        </footer>
      </div>
    </BaseModal>

    <ConfirmationModal
      :model-value="!!captureFailure"
      message="Atenção: não foi possível enviar a nota fiscal"
      :description="captureFailure.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')"
      confirm-text="Entendi"
      cancel-text="Fechar"
      @cancelled="captureFailure = ''"
      @confirmed="captureFailure = ''"
    />

    <!-- MODAL 1: DETALHES DA NOTA FISCAL (Simplificado e Objetivo) -->
    <BaseModal :model-value="!!selected" :title="selected?.merchant || 'Nota fiscal'" size="lg" @close="closeDetail">
      <div v-if="selected" class="nexo-receipt-modal">
        <div v-if="selected.sync_error" class="nexo-banner error" role="alert">Falha no envio: {{ selected.sync_error }}. Tente novamente ou exclua o rascunho.</div>
        <div v-for="warning in selected.warnings" :key="warning" class="nexo-banner warning" role="alert">
          <font-awesome-icon icon="triangle-exclamation" class="banner-icon" />
          <span>{{ warning }}</span>
        </div>

        <div v-if="detailError" class="nexo-banner error" role="alert">
          <font-awesome-icon icon="triangle-exclamation" class="banner-icon" />
          <span>{{ detailError }}</span>
        </div>

        <div v-if="busy" class="nexo-progress-strip" role="status">
          <font-awesome-icon icon="circle-notch" spin />
          <span>{{ progress || "Processando… O documento original está preservado." }}</span>
        </div>

        <!-- Cabeçalho Compacto de Resumo -->
        <header class="receipt-overview-bar">
          <div class="overview-meta-col">
            <div class="overview-badges-row">
              <span class="status-pill" :class="statusTone(selected)">
                {{ states[selected.status] || selected.status }}
              </span>
              <span class="overview-meta-item">
                <font-awesome-icon icon="calendar" />
                {{ dateLabel(selected.issued_on) }}
              </span>
              <span v-if="selected.issuer_id" class="overview-meta-item">
                <font-awesome-icon icon="building" />
                {{ selected.issuer_id }}
              </span>
            </div>

            <div v-if="selected.access_key || selected.qr_reference" class="overview-keys-row">
              <button
                v-if="selected.access_key"
                type="button"
                class="key-chip-btn"
                :title="selected.access_key"
                :aria-label="copiedKey ? 'Chave copiada' : 'Copiar chave de acesso'"
                @click="copyAccessKey(selected.access_key)"
              >
                <font-awesome-icon :icon="copiedKey ? 'check' : 'copy'" />
                <code>{{ formatAccessKeyShort(selected.access_key) }}</code>
              </button>

              <details v-if="selected.qr_reference" class="qr-inline-details">
                <summary>
                  <font-awesome-icon icon="qrcode" />
                  <span>Ver QR Code</span>
                </summary>
                <code class="fiscal-key-box">{{ selected.qr_reference }}</code>
              </details>
            </div>
          </div>

          <div class="overview-total-col">
            <span class="stat-label">Valor total</span>
            <strong class="overview-total-value">{{ money(selected.total) }}</strong>
          </div>
        </header>

        <Transition name="receipt-stage-next" mode="out-in">
          <!-- Modo de Edição Manual (Exclusivo enquanto aberto) -->
          <section v-if="editing" key="modal-edit" class="modal-compact-section">
            <div class="compact-section-head">
              <h4>Conferir e corrigir dados</h4>
              <button type="button" class="secondary-btn compact" @click="editing = false">
                <font-awesome-icon icon="xmark" />
                <span>Voltar</span>
              </button>
            </div>

            <form class="edit-receipt-form" @submit.prevent="saveCorrection">
              <div class="edit-fields-grid">
                <label class="filter-field">
                  <span>Estabelecimento</span>
                  <input v-model="edit.merchant" class="nexo-control" required maxlength="255" />
                </label>
                <label class="filter-field">
                  <span>CPF / CNPJ</span>
                  <input v-model="edit.issuer_id" class="nexo-control" required maxlength="30" />
                </label>
                <label class="filter-field">
                  <span>Data de emissão</span>
                  <input v-model="edit.issued_on" type="date" class="nexo-control" required />
                </label>
                <label class="filter-field">
                  <span>Total (R$)</span>
                  <input v-model="edit.total" type="number" min="0.01" step="0.01" class="nexo-control" required />
                </label>
                <label class="filter-field">
                  <span>Modelo</span>
                  <select v-model="edit.model" class="nexo-control">
                    <option value="55">NF-e (Modelo 55)</option>
                    <option value="65">NFC-e (Modelo 65)</option>
                  </select>
                </label>
                <label class="filter-field">
                  <span>Desconto total (R$)</span>
                  <input v-model="edit.discount" type="number" min="0" step="0.01" class="nexo-control" />
                </label>
                <label class="filter-field">
                  <span>Frete (R$)</span>
                  <input v-model="edit.freight" type="number" min="0" step="0.01" class="nexo-control" />
                </label>
                <label class="filter-field">
                  <span>Outros acréscimos (R$)</span>
                  <input v-model="edit.other" type="number" step="0.01" class="nexo-control" />
                </label>
              </div>

              <div class="nexo-table-wrap">
                <table class="nexo-table edit-items-table">
                  <thead>
                    <tr>
                      <th>Produto</th>
                      <th>Qtd.</th>
                      <th>Unid.</th>
                      <th>Preço unit.</th>
                      <th>Total bruto</th>
                      <th>Desconto</th>
                      <th class="right">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(item, index) in edit.items" :key="index">
                      <td class="col-item-desc" data-label="Produto">
                        <input
                          v-model="item.description"
                          class="nexo-control compact"
                          required
                          aria-label="Descrição do item"
                        />
                      </td>
                      <td data-label="Qtd.">
                        <input
                          v-model="item.quantity"
                          type="number"
                          min="0.000001"
                          step="any"
                          class="nexo-control compact"
                          required
                          aria-label="Quantidade"
                        />
                      </td>
                      <td class="col-item-unit" data-label="Unid.">
                        <input v-model="item.unit" class="nexo-control compact" aria-label="Unidade" />
                      </td>
                      <td data-label="Preço unit.">
                        <input
                          v-model="item.unit_price"
                          type="number"
                          min="0"
                          step="any"
                          class="nexo-control compact"
                          required
                          aria-label="Preço unitário"
                        />
                      </td>
                      <td data-label="Total bruto">
                        <input
                          v-model="item.total"
                          type="number"
                          min="0"
                          step="0.01"
                          class="nexo-control compact"
                          required
                          aria-label="Total bruto do item"
                        />
                      </td>
                      <td data-label="Desconto">
                        <input
                          v-model="item.discount"
                          type="number"
                          min="0"
                          step="0.01"
                          class="nexo-control compact"
                          aria-label="Desconto do item"
                        />
                      </td>
                      <td class="right col-item-action" data-label="Remover">
                        <button
                          type="button"
                          class="icon-btn small danger"
                          title="Remover item"
                          aria-label="Remover item"
                          @click="edit.items.splice(index, 1)"
                        >
                          <font-awesome-icon icon="trash" />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                class="dashed-add-btn"
                @click="
                  edit.items.push({
                    description: '',
                    quantity: '1',
                    unit: 'UN',
                    unit_price: '0',
                    total: '0',
                    discount: '0',
                  })
                "
              >
                <font-awesome-icon icon="plus" />
                <span>Adicionar item à nota</span>
              </button>

              <label class="nexo-checkbox checkbox-surface">
                <input v-model="edit.document_complete" type="checkbox" />
                <span>Conferi que o comprovante anexado está completo, com todas as páginas e itens.</span>
              </label>

              <div class="modal-actions-bar">
                <button type="button" class="secondary-btn" @click="editing = false">Cancelar</button>
                <button type="submit" class="primary-action" :disabled="busy">
                  <font-awesome-icon :icon="busy ? 'circle-notch' : 'floppy-disk'" :spin="busy" />
                  <span>Salvar correções</span>
                </button>
              </div>
            </form>
          </section>

          <!-- Modo de Visualização Padrão (Objetivo e Limpo) -->
          <div v-else key="modal-view" class="modal-sections-stack">
            <!-- 1. Comprovantes e Leitura -->
            <section class="modal-compact-section">
              <div class="compact-section-head">
                <div class="title-with-badge">
                  <h4>Comprovantes</h4>
                  <span v-if="selected.documents?.length || unmatchedLocalFiles.length" class="count-pill neutral">
                    {{ (selected.documents?.length || 0) + unmatchedLocalFiles.length }}
                  </span>
                </div>

                <div class="compact-head-actions">
                  <button
                    type="button"
                    class="secondary-btn compact"
                    :disabled="busy || !selected.id"
                    @click="startEdit"
                  >
                    <font-awesome-icon icon="pencil" />
                    <span>Editar dados</span>
                  </button>
                  <button
                    type="button"
                    class="ai-action-btn compact"
                    :disabled="busy || !connected"
                    title="Extrair dados com inteligência artificial se necessário"
                    @click="reprocess(true)"
                  >
                    <font-awesome-icon icon="wand-magic-sparkles" class="ai-btn-icon" />
                    <span>Ler com IA</span>
                  </button>
                  <button
                    type="button"
                    class="secondary-btn compact"
                    :disabled="busy || !connected"
                    title="Reprocessar leitura determinística"
                    @click="reprocess(false)"
                  >
                    <font-awesome-icon icon="arrows-rotate" />
                    <span>Reler</span>
                  </button>
                  <label class="secondary-btn compact file-button" :class="{ 'is-disabled': busy }">
                    <font-awesome-icon icon="plus" />
                    <span>Anexar</span>
                    <input
                      type="file"
                      multiple
                      accept=".xml,.pdf,image/jpeg,image/png,image/webp"
                      :disabled="busy"
                      @change="addDocuments"
                    />
                  </label>
                </div>
              </div>

              <div v-if="selected.documents?.length || localFiles.length" class="compact-docs-list">
                <div v-for="document in selected.documents" :key="document.id" class="compact-doc-row">
                  <div class="compact-doc-main">
                    <font-awesome-icon
                      :icon="/^image\//.test(document.mime_type) ? 'image' : 'receipt'"
                      class="compact-doc-icon"
                    />
                    <span class="compact-doc-name">{{ document.file_name }}</span>
                    <small class="compact-doc-size">{{ Math.ceil(document.size_bytes / 1024) }} KiB</small>
                  </div>

                  <div class="compact-doc-actions">
                    <button
                      v-if="/^(image\/|application\/pdf)/.test(document.mime_type)"
                      type="button"
                      class="secondary-btn compact"
                      :disabled="busy"
                      @click="documentAction(document, true)"
                    >
                      <font-awesome-icon icon="eye" />
                      <span>Visualizar</span>
                    </button>
                    <button
                      type="button"
                      class="secondary-btn compact"
                      :disabled="busy"
                      @click="documentAction(document, false)"
                    >
                      <font-awesome-icon icon="download" />
                      <span>Baixar</span>
                    </button>
                  </div>
                </div>

                <div v-for="file in unmatchedLocalFiles" :key="file.local_key" class="compact-doc-row">
                  <div class="compact-doc-main">
                    <font-awesome-icon icon="cloud-arrow-up" class="compact-doc-icon" />
                    <span class="compact-doc-name">{{ file.name }}</span>
                    <small class="compact-doc-size">Cópia local</small>
                  </div>
                  <div class="compact-doc-actions">
                    <button
                      v-if="isPreviewableLocalFile(file)"
                      type="button"
                      class="secondary-btn compact"
                      @click="previewLocalFile(file)"
                    >
                      <font-awesome-icon icon="eye" />
                      <span>Visualizar</span>
                    </button>
                    <button type="button" class="secondary-btn compact" @click="saveBlob(file.blob, file.name)">
                      <font-awesome-icon icon="download" />
                      <span>Baixar</span>
                    </button>
                  </div>
                </div>
              </div>
              <p v-else class="empty-inline-text">Nenhum arquivo anexado ainda.</p>
            </section>

            <!-- 2. Itens da Nota -->
            <section class="modal-compact-section">
              <div class="compact-section-head">
                <div class="title-with-badge">
                  <h4>Itens da nota</h4>
                  <span v-if="selected.items?.length" class="count-pill info">
                    {{ selected.items.length }}
                  </span>
                </div>
                <label v-if="selected.items?.length" class="nexo-checkbox receipt-group-checkbox">
                  <input v-model="groupItems" type="checkbox" />
                  <span>Agrupar itens iguais</span>
                </label>
              </div>

              <NexoReceiptGrid v-if="selected.items?.length" v-model:column-order="itemColumnOrder"
                :key="groupItems ? 'grouped-items' : 'original-items'"
                :columns="itemGridColumns" :rows="displayedReceiptItems" label="Itens da nota fiscal">
                <template #description="{ row }">
                  <strong class="table-item-name">{{ row.description }}</strong>
                  <small v-if="row.gtin || row.supplier_code" class="table-item-code">{{ row.gtin || row.supplier_code }}</small>
                </template>
                <template #quantity="{ row }">{{ quantityLabel(row.quantity, row.unit) }}</template>
                <template #unit_price="{ row }">{{ money(row.unit_price) }}</template>
                <template #total="{ row }"><strong>{{ money(row.total) }}</strong></template>
                <template #actions="{ row }">
                  <div class="table-row-actions">
                    <button type="button" class="icon-btn small" title="Histórico de preços" aria-label="Histórico de preços"
                      @click="showHistory({ id: row.product_id, description: row.description })">
                      <font-awesome-icon icon="clock-rotate-left" />
                    </button>
                    <button type="button" class="icon-btn small" title="Associar todos os itens iguais desta nota" aria-label="Associar todos os itens iguais desta nota"
                      @click="chooseProduct(row)">
                      <font-awesome-icon icon="link" />
                    </button>
                  </div>
                </template>
              </NexoReceiptGrid>
              <p v-else class="empty-inline-text">Nenhum item extraído desta nota até o momento.</p>
            </section>

            <!-- 3. Conciliação Financeira -->
            <section class="modal-compact-section">
              <div class="compact-section-head">
                <div class="title-with-badge">
                  <h4>Conciliação financeira</h4>
                  <span v-if="selected.links?.length" class="count-pill positive">
                    {{ selected.links.length }} {{ selected.links.length === 1 ? "vínculo" : "vínculos" }}
                  </span>
                </div>

                <div v-if="selected.id && connected" class="compact-head-actions">
                  <button
                    type="button"
                    class="secondary-btn compact"
                    :class="{ active: reconcilePanel === 'link' }"
                    :disabled="busy"
                    @click="toggleReconcilePanel('link')"
                  >
                    <font-awesome-icon icon="link" />
                    <span>Vincular existente</span>
                  </button>
                  <button
                    v-if="!selected.links?.length"
                    type="button"
                    class="secondary-btn compact"
                    :class="{ active: reconcilePanel === 'create' }"
                    :disabled="busy"
                    @click="toggleReconcilePanel('create')"
                  >
                    <font-awesome-icon icon="plus" />
                    <span>Nova compra / parcelas</span>
                  </button>
                  <button
                    v-if="selected.status !== 'ARCHIVED'"
                    type="button"
                    class="secondary-btn compact"
                    :disabled="busy"
                    @click="archive"
                  >
                    <font-awesome-icon icon="box-archive" />
                    <span>Apenas arquivar</span>
                  </button>
                </div>
              </div>

              <div v-if="selected.links?.length" class="linked-tx-list">
                <div v-for="link in selected.links" :key="link.id" class="linked-tx-item">
                  <div class="linked-tx-copy">
                    <font-awesome-icon icon="link" class="linked-icon" />
                    <span>
                      {{
                        link.transaction_id
                          ? `#${link.transaction_id} · ${link.description}`
                          : "Lançamento excluído · comprovante preservado"
                      }}
                    </span>
                  </div>
                  <strong class="tabular">{{ money(link.amount) }}</strong>
                </div>
              </div>
              <p v-else-if="!reconcilePanel" class="empty-inline-text">
                Nenhum lançamento vinculado. Use os botões acima para vincular uma despesa existente, criar uma nova ou
                apenas arquivar.
              </p>

              <!-- Gaveta 1: Vincular Lançamento Existente -->
              <div v-if="reconcilePanel === 'link' && selected.id && connected" class="reconcile-drawer">
                <div class="inline-control-row">
                  <input
                    v-model="candidateMonth"
                    type="month"
                    class="nexo-control"
                    aria-label="Pesquisar lançamentos de outro mês"
                  />
                  <button type="button" class="secondary-btn" :disabled="busy" @click="searchTransactions">
                    <font-awesome-icon icon="magnifying-glass" />
                    <span>Buscar mês</span>
                  </button>
                </div>

                <div v-if="candidates.length" class="candidates-list">
                  <label v-for="tx in candidates" :key="tx.id" class="candidate-row">
                    <input v-model="allocations[tx.id].selected" type="checkbox" />
                    <span class="candidate-desc">
                      <strong>#{{ tx.id }} · {{ tx.description }}</strong>
                      <small>{{ dateLabel(tx.transaction_date) }} · Total: {{ money(tx.amount) }}</small>
                    </span>
                    <input
                      v-model="allocations[tx.id].amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      :max="tx.amount"
                      class="nexo-control candidate-amount"
                      aria-label="Valor a vincular"
                    />
                  </label>
                </div>
                <p v-else class="empty-inline-text">Nenhum lançamento candidato encontrado neste período.</p>

                <div class="details-actions-end">
                  <button type="button" class="secondary-btn compact" @click="reconcilePanel = ''">Cancelar</button>
                  <button type="button" class="primary-action compact" :disabled="busy" @click="linkTransactions">
                    <font-awesome-icon icon="check" />
                    <span>Vincular selecionados</span>
                  </button>
                </div>
              </div>

              <!-- Gaveta 2: Registrar Nova Compra ou Parcelas -->
              <div
                v-if="reconcilePanel === 'create' && selected.id && connected && !selected.links?.length"
                class="reconcile-drawer"
              >
                <p class="helper-note">
                  Crie os lançamentos desta nota caso ainda não existam no Nexo. A soma deve igualar
                  <strong>{{ selected.total != null ? money(selected.total) : "o total da nota" }}</strong>.
                </p>

                <div class="payments-stack">
                  <div v-for="(payment, index) in payments" :key="index" class="payment-grid-card">
                    <label class="filter-field">
                      <span>Valor (R$)</span>
                      <input v-model="payment.amount" type="number" min="0.01" step="0.01" class="nexo-control" />
                    </label>
                    <label class="filter-field">
                      <span>Data</span>
                      <input v-model="payment.transaction_date" type="date" class="nexo-control" />
                    </label>
                    <label class="filter-field">
                      <span>Pagamento</span>
                      <select v-model="payment.payment_method" class="nexo-control">
                        <option value="UNKNOWN">Não informado</option>
                        <option value="PIX">Pix</option>
                        <option value="CREDIT_CARD">Crédito</option>
                        <option value="DEBIT_CARD">Débito</option>
                        <option value="BOLETO">Boleto</option>
                        <option value="TRANSFER">Transferência</option>
                      </select>
                    </label>
                    <label class="filter-field">
                      <span>Situação</span>
                      <select v-model="payment.status" class="nexo-control">
                        <option value="PENDING">Previsto</option>
                        <option value="PAID">Pago</option>
                      </select>
                    </label>
                    <label v-if="payment.payment_method === 'CREDIT_CARD'" class="filter-field">
                      <span>Cartão</span>
                      <select v-model="payment.credit_card_id" class="nexo-control">
                        <option :value="null">Confirmar depois</option>
                        <option v-for="card in creditCards" :key="card.id" :value="card.id">
                          {{ card.name }} · {{ card.last_four }}
                        </option>
                      </select>
                    </label>
                    <div class="payment-remove-col">
                      <button
                        type="button"
                        class="icon-btn small danger"
                        title="Remover parcela"
                        aria-label="Remover parcela"
                        @click="payments.splice(index, 1)"
                      >
                        <font-awesome-icon icon="trash" />
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  class="dashed-add-btn"
                  @click="
                    payments.push({
                      amount: '',
                      transaction_date: '',
                      payment_method: 'UNKNOWN',
                      status: 'PENDING',
                      credit_card_id: null,
                    })
                  "
                >
                  <font-awesome-icon icon="plus" />
                  <span>Adicionar parcela</span>
                </button>

                <label class="nexo-checkbox checkbox-surface">
                  <input v-model="confirmDistinct" type="checkbox" />
                  <span>Confirmo que esta despesa ainda não foi lançada no Nexo.</span>
                </label>

                <div class="details-actions-end">
                  <button type="button" class="secondary-btn compact" @click="reconcilePanel = ''">Cancelar</button>
                  <button
                    type="button"
                    class="primary-action compact"
                    :disabled="busy || !confirmDistinct"
                    @click="createPurchase"
                  >
                    <font-awesome-icon icon="check" />
                    <span>Registrar compra</span>
                  </button>
                </div>
              </div>
            </section>
          </div>
        </Transition>
      </div>
    </BaseModal>

    <!-- MODAL DE CONFIRMAÇÃO DE EXCLUSÃO (Padrão do Sistema: ConfirmationModal) -->
    <ConfirmationModal
      :model-value="confirmDelete"
      message="Excluir nota fiscal?"
      :description="deleteConfirmDescription"
      confirm-text="Excluir"
      @cancelled="closeDeleteConfirm"
      @confirmed="deleteReceipt"
    />

    <!-- MODAL 2: HISTÓRICO DO PRODUTO -->
    <BaseModal
      :model-value="!!historyProduct"
      :title="historyProduct?.description || 'Histórico do produto'"
      size="lg"
      @close="historyProduct = null"
    >
      <div class="nexo-receipt-modal">
        <section v-if="history.length" class="history-summary-grid">
          <article class="detail-stat-card">
            <span class="stat-label">Compras registradas</span>
            <strong class="stat-value">{{ history.length }}</strong>
          </article>
          <article class="detail-stat-card">
            <span class="stat-label">Último preço unitário</span>
            <strong class="stat-value">{{ money(history[0]?.unit_price) }}</strong>
          </article>
          <article class="detail-stat-card">
            <span class="stat-label">Menor preço pago</span>
            <strong class="stat-value positive">{{ money(lowestHistoryPrice) }}</strong>
          </article>
        </section>

        <div v-if="history.length" class="receipt-list">
          <button
            v-for="purchase in history"
            :key="purchase.id"
            type="button"
            class="receipt-row-card"
            @click="openReceiptId(purchase.receipt_id)"
          >
            <div class="receipt-row-main">
              <span class="receipt-avatar info">
                <font-awesome-icon icon="receipt" />
              </span>
              <div class="receipt-row-copy">
                <div class="receipt-row-title">
                  <strong>{{ purchase.merchant || "Estabelecimento" }}</strong>
                </div>
                <div class="receipt-row-meta">
                  <span>
                    <font-awesome-icon icon="calendar" />
                    {{ dateLabel(purchase.issued_on) }}
                  </span>
                </div>
              </div>
            </div>
            <div class="receipt-row-end">
              <div class="purchase-price-stack">
                <strong>{{ money(purchase.unit_price) }}/un.</strong>
                <small>{{ quantityLabel(purchase.quantity, purchase.unit) }}</small>
              </div>
              <span class="row-chevron">
                <font-awesome-icon icon="chevron-right" />
              </span>
            </div>
          </button>
        </div>
        <p v-else class="empty-inline-text">Nenhuma compra anterior encontrada para este produto.</p>
      </div>
    </BaseModal>

    <!-- MODAL 3: ASSOCIAR PRODUTO -->
    <BaseModal
      :model-value="!!productItem"
      title="Associar ao histórico de um produto"
      size="md"
      @close="productItem = null"
    >
      <div class="nexo-receipt-modal">
        <div v-if="productItem" class="assoc-target-banner">
          <span class="stat-label">Item da nota selecionado</span>
          <strong>{{ productItem.description }}</strong>
        </div>

        <form class="inline-control-row" @submit.prevent="loadProducts">
          <div class="input-with-icon" style="flex: 1">
            <font-awesome-icon icon="magnifying-glass" class="field-icon" />
            <input
              v-model="productQuery"
              type="search"
              class="nexo-control with-left-icon"
              placeholder="Pesquisar produto existente…"
              aria-label="Pesquisar produto para associar"
            />
          </div>
          <button type="submit" class="primary-action" :disabled="busy">
            <font-awesome-icon icon="magnifying-glass" />
            <span>Pesquisar</span>
          </button>
        </form>

        <div v-if="products.length" class="receipt-list">
          <button
            v-for="product in products"
            :key="product.id"
            type="button"
            class="receipt-row-card"
            @click="assignProduct(product)"
          >
            <div class="receipt-row-main">
              <span class="receipt-avatar info">
                <font-awesome-icon icon="tag" />
              </span>
              <div class="receipt-row-copy">
                <div class="receipt-row-title">
                  <strong>{{ product.description }}</strong>
                </div>
                <div class="receipt-row-meta">
                  <span class="code-pill">{{ product.gtin || product.supplier_code || "Sem código" }}</span>
                </div>
              </div>
            </div>
            <span class="row-chevron">
              <font-awesome-icon icon="check" />
            </span>
          </button>
        </div>
        <p v-else class="empty-inline-text">Nenhum produto encontrado para o termo pesquisado.</p>
      </div>
    </BaseModal>

    <!-- MODAL 4: VISUALIZAÇÃO DO COMPROVANTE -->
    <BaseModal :model-value="!!previewUrl" title="Visualização do comprovante" size="lg" @close="closePreview">
      <div class="nexo-receipt-modal preview-container">
        <iframe
          v-if="previewMime === 'application/pdf'"
          :src="previewUrl"
          title="Documento original"
          sandbox
          class="pdf-preview"
        />
        <img v-else-if="previewUrl" :src="previewUrl" alt="Visualização do comprovante" class="image-preview" />
      </div>
    </BaseModal>
  </div>
</template>

<script>
import BaseModal from "@/components/BaseModal.vue";
import ConfirmationModal from "@/components/ConfirmationModal.vue";
import NexoReceiptGrid from "./NexoReceiptGrid.vue";
import { receiptService } from "@/services/receiptService";
import { receiptRepository } from "@/services/localData/receiptRepository";
import { api } from "@/plugins/api";
import { db } from "@/db";
import { useAuthStore } from "@/stores/auth";
import { syncService } from "@/services/syncService";
import { captureSyncSession, assertSyncSession } from "@/utils/syncState";
import { transactionCalendarDate } from "@/utils/financeNotificationDisplay";
import { groupReceiptItems, matchingReceiptItemIds } from "@/utils/receiptItemGrouping";

export default {
  name: "NexoReceiptsTab",
  components: { BaseModal, ConfirmationModal, NexoReceiptGrid },
  props: {
    active: Boolean,
    transactionId: { type: [Number, String], default: null },
    creditCards: { type: Array, default: () => [] },
  },
  emits: ["changed", "clear-transaction", "view-transaction"],
  data: () => ({
    rows: [],
    busy: false,
    progress: "",
    error: "",
    message: "",
    detailError: "",
    qr: "",
    groupPhotos: false,
    groupItems: true,
    productColumnOrder: [],
    itemColumnOrder: [],
    productGridColumns: [
      { key: "description", label: "Nome" },
      { key: "purchase_count", label: "Quantidade de compras", numeric: true },
      { key: "actions", label: "Ações", sortable: false },
    ],
    itemGridColumns: [
      { key: "description", label: "Produto" },
      { key: "quantity", label: "Qtd.", numeric: true },
      { key: "unit_price", label: "Unitário", numeric: true },
      { key: "total", label: "Total", numeric: true },
      { key: "actions", label: "Ações", sortable: false },
    ],
    connected: navigator.onLine,
    view: "receipts",
    viewTransitionName: "receipt-stage-next",
    subnavBtnRefs: {},
    gliderStyle: {},
    gliderReady: false,
    subnavObserver: null,
    views: [
      { id: "receipts", label: "Notas", icon: "receipt" },
      { id: "products", label: "Produtos", icon: "boxes-stacked" },
      { id: "reviews", label: "Importações em revisão", icon: "list-check" },
    ],
    filters: { q: "", from: "", to: "", amount: "", status: "" },
    limit: 50,
    offset: 0,
    hasMore: false,
    selected: null,
    captureModalOpen: false,
    captureFailure: "",
    reconcilePanel: "",
    confirmDelete: false,
    deleteTarget: null,
    copiedKey: false,
    copyKeyTimer: null,
    editing: false,
    edit: { items: [] },
    localFiles: [],
    candidates: [],
    allocations: {},
    candidateMonth: "",
    payments: [],
    confirmDistinct: false,
    products: [],
    productQuery: "",
    historyProduct: null,
    history: [],
    productItem: null,
    reviews: [],
    reviewTargets: {},
    reviewMatches: {},
    reviewMonths: {},
    pendingCount: 0,
    cameraOpen: false,
    cameraControls: null,
    cameraGeneration: 0,
    previewUrl: null,
    previewMime: "",
    states: {
      AWAITING_DOCUMENT: "Aguardando comprovante completo",
      READY: "Pronta para conciliação",
      PROCESSING: "Em processamento",
      REVIEW: "Conferir dados e vínculos",
      PARTIAL: "Parcialmente conciliada",
      MATCHED: "Conciliada",
      ARCHIVED: "Arquivada",
      FAILED: "Leitura interrompida",
      DELETING: "Exclusão pendente; tente novamente",
    },
  }),
  computed: {
    unmatchedLocalFiles() {
      const ids = new Set((this.selected?.documents || []).map((document) => document.id));
      return this.localFiles.filter((file) => !file.document_id || !ids.has(file.document_id));
    },
    displayedReceiptItems() {
      const items = this.selected?.items || [];
      return this.groupItems ? groupReceiptItems(items) : items;
    },
    currentUserId() {
      return useAuthStore().user?.id;
    },
    hasActiveReceiptFilters() {
      return Boolean(
        (this.filters.q && this.filters.q.trim()) ||
          this.filters.from ||
          this.filters.to ||
          this.filters.amount ||
          this.filters.status,
      );
    },
    receiptsTotalAmount() {
      return this.rows.reduce((sum, row) => sum + (Number(row?.total) || 0), 0);
    },
    matchedReceiptsCount() {
      return this.rows.filter((row) => row?.status === "MATCHED").length;
    },
    attentionReceiptsCount() {
      const pendingReceipts = this.rows.filter(
        (row) =>
          row?.pending_sync ||
          ["REVIEW", "AWAITING_DOCUMENT", "FAILED", "DELETING", "READY", "PARTIAL"].includes(row?.status),
      ).length;
      return pendingReceipts + (this.reviews?.length || 0);
    },
    activeDeleteTarget() {
      return this.deleteTarget || this.selected;
    },
    deleteConfirmDescription() {
      const target = this.activeDeleteTarget;
      const summary = target
        ? `<strong>${target.merchant || "Comprovante fiscal"}</strong> (${this.dateLabel(target.issued_on)} · ${this.money(target.total)})<br><br>`
        : "";
      return `${summary}A nota, os produtos e seus arquivos originais serão excluídos permanentemente. Os lançamentos financeiros vinculados serão mantidos.`;
    },
    lowestHistoryPrice() {
      if (!this.history?.length) return null;
      const prices = this.history.map((p) => Number(p?.unit_price)).filter((n) => Number.isFinite(n) && n > 0);
      return prices.length ? Math.min(...prices) : this.history[0]?.unit_price;
    },
  },
  watch: {
    active(value) {
      if (value) {
        this.reload();
        this.$nextTick(() => this.updateGlider());
      } else {
        this.stopCamera();
      }
    },
    view() {
      this.$nextTick(() => this.updateGlider());
    },
    "rows.length"() {
      this.$nextTick(() => this.updateGlider());
    },
    "products.length"() {
      this.$nextTick(() => this.updateGlider());
    },
    "reviews.length"() {
      this.$nextTick(() => this.updateGlider());
    },
    transactionId() {
      if (this.active) {
        this.viewTransitionName = "receipt-stage-prev";
        this.view = "receipts";
        this.reload();
      }
    },
    currentUserId() {
      this.rows = [];
      this.selected = null;
      this.captureModalOpen = false;
      this.captureFailure = "";
      this.reconcilePanel = "";
      this.confirmDelete = false;
      this.deleteTarget = null;
      this.products = [];
      this.reviews = [];
      this.reviewMatches = {};
      this.reviewTargets = {};
      this.reviewMonths = {};
      this.history = [];
      this.historyProduct = null;
      this.productItem = null;
      this.localFiles = [];
      this.stopCamera();
      this.closePreview();
    },
  },
  mounted() {
    window.addEventListener("online", this.connectionChanged);
    window.addEventListener("offline", this.connectionChanged);
    window.addEventListener("resize", this.updateGlider);
    this.$nextTick(() => {
      this.updateGlider();
      if (typeof ResizeObserver !== "undefined" && this.$refs.subnavRef) {
        this.subnavObserver = new ResizeObserver(() => this.updateGlider());
        this.subnavObserver.observe(this.$refs.subnavRef);
      }
    });
    if (this.active) this.reload();
  },
  beforeUnmount() {
    this.stopCamera();
    this.closePreview();
    if (this.copyKeyTimer) {
      clearTimeout(this.copyKeyTimer);
      this.copyKeyTimer = null;
    }
    if (this.subnavObserver) {
      this.subnavObserver.disconnect();
      this.subnavObserver = null;
    }
    window.removeEventListener("online", this.connectionChanged);
    window.removeEventListener("offline", this.connectionChanged);
    window.removeEventListener("resize", this.updateGlider);
  },
  methods: {
    activeReceiptLinks(row) {
      return (row.links || []).filter((link) => link.transaction_id != null);
    },
    viewLinkedTransaction(link) {
      this.closeDetail();
      this.$emit("view-transaction", link);
    },
    setSubnavBtnRef(el, id) {
      if (el) {
        this.subnavBtnRefs[id] = el;
      }
    },
    updateGlider() {
      const btn = this.subnavBtnRefs?.[this.view];
      if (!btn || !btn.offsetWidth) return;
      this.gliderStyle = {
        width: `${btn.offsetWidth}px`,
        height: `${btn.offsetHeight}px`,
        transform: `translate3d(${btn.offsetLeft}px, ${btn.offsetTop}px, 0)`,
      };
      this.gliderReady = true;
    },
    money(value) {
      return value == null
        ? "—"
        : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
    },
    quantityLabel(value, unit) {
      const num = Number(value);
      const formatted = Number.isFinite(num)
        ? new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 6 }).format(num)
        : String(value ?? "");
      return unit ? `${formatted} ${unit}` : formatted;
    },
    dateLabel(value) {
      if (!value) return "Data pendente";
      const date = String(value).slice(0, 10);
      return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.split("-").reverse().join("/") : date;
    },
    formatAccessKeyShort(key) {
      if (!key) return "";
      const clean = String(key).replace(/\s+/g, "");
      if (clean.length <= 18) return clean;
      return `${clean.slice(0, 8)}…${clean.slice(-8)}`;
    },
    statusTone(row) {
      if (!row) return "neutral";
      if (row.pending_sync) return "pending";
      const map = {
        MATCHED: "success",
        READY: "info",
        PARTIAL: "info",
        PROCESSING: "ai",
        REVIEW: "warning",
        AWAITING_DOCUMENT: "warning",
        FAILED: "danger",
        ARCHIVED: "neutral",
      };
      return map[row.status] || "neutral";
    },
    statusIcon(row) {
      if (!row) return "receipt";
      if (row.pending_sync) return "cloud-arrow-up";
      const map = {
        MATCHED: "circle-check",
        READY: "receipt",
        PARTIAL: "scale-balanced",
        PROCESSING: "circle-notch",
        REVIEW: "triangle-exclamation",
        AWAITING_DOCUMENT: "clock",
        FAILED: "triangle-exclamation",
        ARCHIVED: "box-archive",
      };
      return map[row.status] || "receipt";
    },
    clearReceiptFilters() {
      this.filters = { q: "", from: "", to: "", amount: "", status: "" };
      this.reload();
    },
    async copyAccessKey(key) {
      if (!key) return;
      try {
        await navigator.clipboard?.writeText(String(key));
        this.copiedKey = true;
        if (this.copyKeyTimer) clearTimeout(this.copyKeyTimer);
        this.copyKeyTimer = setTimeout(() => {
          this.copiedKey = false;
        }, 2000);
      } catch {
        // Fallback silencioso
      }
    },
    openCaptureModal() {
      this.error = "";
      this.captureModalOpen = true;
    },
    closeCaptureModal() {
      this.stopCamera();
      this.captureModalOpen = false;
      this.error = "";
    },
    openDeleteConfirm(row) {
      this.deleteTarget = row || this.selected;
      this.detailError = "";
      this.confirmDelete = true;
    },
    closeDeleteConfirm() {
      this.confirmDelete = false;
      this.deleteTarget = null;
      this.detailError = "";
    },
    async request(fn) {
      const session = captureSyncSession();
      const result = await fn();
      assertSyncSession(session);
      return result;
    },
    async deleteReceipt() {
      const target = this.deleteTarget || this.selected;
      if (!target) return;
      await this.run(async () => {
        await receiptService.remove(target);
        this.confirmDelete = false;
        this.deleteTarget = null;
        if (this.selected && this.selected.local_key === target.local_key) {
          this.closeDetail();
        }
        this.rows = this.rows.filter((row) => row.local_key !== target.local_key);
        this.message = "Nota fiscal excluída.";
        this.$emit("changed");
        try {
          await this.fetchReceiptPage();
        } catch {
          throw new Error("Nota fiscal excluída, mas não foi possível atualizar a lista. Tente novamente.");
        }
      });
    },
    async run(fn) {
      if (this.busy) return;
      this.busy = true;
      this.error = "";
      this.detailError = "";
      try {
        await fn();
      } catch (e) {
        const message = e?.response?.data?.message || e.message || "Não foi possível concluir a operação.";
        this.error = message;
        if (this.selected || this.confirmDelete) this.detailError = message;
      } finally {
        this.busy = false;
        this.progress = "";
      }
    },
    async fetchReceiptPage() {
      this.offset = 0;
      const filters = Object.fromEntries(
        Object.entries({ ...this.filters, limit: this.limit, transaction_id: this.transactionId }).filter(
          ([, v]) => v,
        ),
      );
      const rows = await this.request(() => receiptService.list(filters));
      this.hasMore = rows.has_more;
      this.rows = rows;
    },
    async reload() {
      await this.run(async () => {
        await this.fetchReceiptPage();
        if (this.view === "products") await this.fetchProducts();
        if (this.view === "reviews") await this.fetchReviews();
      });
    },
    async loadMore() {
      await this.run(async () => {
        this.offset += this.limit;
        const filters = Object.fromEntries(
          Object.entries({
            ...this.filters,
            limit: this.limit,
            offset: this.offset,
            transaction_id: this.transactionId,
          }).filter(([, v]) => v),
        );
        const rows = await this.request(() => receiptService.list(filters));
        this.hasMore = rows.has_more;
        this.rows = [...new Map([...this.rows, ...rows].map((r) => [r.local_key, r])).values()];
      });
    },
    async changeView(view) {
      if (this.view !== view) {
        const prevIdx = this.views.findIndex((v) => v.id === this.view);
        const nextIdx = this.views.findIndex((v) => v.id === view);
        this.viewTransitionName = nextIdx >= prevIdx ? "receipt-stage-next" : "receipt-stage-prev";
        this.view = view;
        this.$nextTick(() => this.updateGlider());
      }
      await this.reload();
    },
    async connectionChanged() {
      this.connected = navigator.onLine;
      if (this.connected) {
        await syncService.processSyncQueue();
        if (this.active) await this.reload();
      }
    },
    async selectFiles(event) {
      const files = Array.from(event.target.files || []);
      event.target.value = "";
      if (!files.length) return;
      const session = captureSyncSession();
      await this.run(async () => {
        const groups =
          this.groupPhotos && files.every((f) => f.type.startsWith("image/")) ? [files] : files.map((f) => [f]);
        const failures = [];
        for (const [index, group] of groups.entries()) {
          assertSyncSession(session);
          this.progress = `Arquivando e lendo ${index + 1} de ${groups.length}…`;
          try {
            await receiptService.capture(group);
          } catch (error) {
            assertSyncSession(session);
            failures.push(error?.response?.data?.message || error.message);
          }
        }
        this.stopCamera();
        this.captureModalOpen = false;
        if (failures.length) {
          this.message = "";
          this.captureFailure = `${failures.length} envio(s) falharam. ${failures[0]}`;
        } else {
          this.message = navigator.onLine ? "Originais preservados. Confira os dados e as conciliações." : "Arquivo salvo neste dispositivo, aguardando conexão para envio.";
        }
        this.$emit("changed");
      });
      await this.reload();
    },
    async photograph(event) {
      const prior = this.groupPhotos;
      this.groupPhotos = true;
      await this.selectFiles(event);
      this.groupPhotos = prior;
    },
    async captureReference() {
      await this.run(async () => {
        try {
          await receiptService.capture([], this.qr);
        } catch (error) {
          this.stopCamera();
          this.captureModalOpen = false;
          this.captureFailure = error.message || "Não foi possível registrar a referência.";
          return;
        }
        this.qr = "";
        this.stopCamera();
        this.captureModalOpen = false;
        this.$emit("changed");
      });
      await this.reload();
    },
    async open(row) {
      await this.run(async () => {
        this.selected = { ...await this.request(() => receiptService.detail(row)), sync_error: row.sync_error };
        this.groupItems = true;
        this.localFiles = await receiptRepository.files(useAuthStore().user.id, row.local_key);
        this.editing = false;
        this.reconcilePanel = "";
        this.confirmDistinct = false;
        this.candidates = [];
        this.allocations = {};
        this.candidateMonth = String(this.selected.issued_on || "").slice(0, 7);
        this.payments = [
          {
            amount: this.selected.total || "",
            transaction_date: String(this.selected.issued_on || "").slice(0, 10),
            payment_method: "UNKNOWN",
            status: "PENDING",
            credit_card_id: null,
          },
        ];
      });
    },
    closeDetail() {
      this.selected = null;
      this.editing = false;
      this.reconcilePanel = "";
      this.detailError = "";
    },
    async addDocuments(event) {
      const files = Array.from(event.target.files || []);
      event.target.value = "";
      await this.run(async () => {
        const user_id = useAuthStore().user.id;
        this.selected = await receiptService.addDocuments(this.selected, files);
        this.localFiles = await receiptRepository.files(user_id, this.selected.local_key);
        this.$emit("changed");
      });
    },
    async reprocess(use_ai) {
      let completed = false;
      await this.run(async () => {
        this.progress = "Lendo o comprovante…";
        this.selected = await receiptService.retry(this.selected, use_ai);
        completed = true;
        this.$emit("changed");
      });
      if (completed) await this.reload();
    },
    startEdit() {
      const d = this.selected.data || {};
      this.edit = {
        merchant: d.merchant || this.selected.merchant || "",
        issuer_id: d.issuer_id || "",
        issued_on: d.issued_on || "",
        total: d.total || "",
        model: d.model || "65",
        environment: d.environment || "1",
        discount: d.discount || "0",
        freight: d.freight || "0",
        other: d.other || "0",
        document_complete: !!this.selected.original_complete,
        items: JSON.parse(JSON.stringify(d.items || [])),
      };
      this.editing = true;
    },
    async saveCorrection() {
      await this.run(async () => {
        this.selected = await receiptService.correct(this.selected, this.edit);
        this.editing = false;
        this.$emit("changed");
      });
    },
    setCandidates(items) {
      this.candidates = items;
      const allocations = { ...this.allocations };
      for (const tx of items)
        allocations[tx.id] ||= { selected: false, amount: Math.min(Number(tx.amount), Number(this.selected.total)) };
      this.allocations = allocations;
    },
    async toggleReconcilePanel(mode) {
      if (this.reconcilePanel === mode) {
        this.reconcilePanel = "";
        return;
      }
      this.reconcilePanel = mode;
      if (mode === "link" && !this.candidates.length) {
        await this.run(async () =>
          this.setCandidates(await this.request(() => receiptService.candidates(this.selected))),
        );
      }
    },
    async loadCandidates(event) {
      if (!event.target.open || this.candidates.length) return;
      await this.run(async () =>
        this.setCandidates(await this.request(() => receiptService.candidates(this.selected))),
      );
    },
    async searchTransactions() {
      await this.run(async () => {
        const { data } = await this.request(() =>
          api.get("/finance/transactions", { params: { month: this.candidateMonth, type: "EXPENSE", limit: 250 } }),
        );
        this.setCandidates(data);
      });
    },
    async linkTransactions() {
      await this.run(async () => {
        const links = Object.entries(this.allocations)
          .filter(([, a]) => a.selected)
          .map(([id, a]) => ({ transaction_id: Number(id), amount: Number(a.amount) }));
        if (!links.length) throw new Error("Selecione ao menos um lançamento.");
        this.selected = await receiptService.reconcile(this.selected, { action: "link", links });
        this.reconcilePanel = "";
        this.$emit("changed");
      });
    },
    async createPurchase() {
      await this.run(async () => {
        const payments = this.payments.map((p) => ({ ...p, amount: Number(p.amount) }));
        this.selected = await receiptService.reconcile(this.selected, { action: "create", payments });
        this.reconcilePanel = "";
        this.$emit("changed");
      });
    },
    async archive() {
      await this.run(async () => {
        this.selected = await receiptService.reconcile(this.selected, { action: "archive" });
        this.reconcilePanel = "";
        this.$emit("changed");
      });
    },
    saveBlob(blob, name) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    isPreviewableLocalFile(file) {
      if (!file?.blob) return false;
      const mime = file.blob.type || "";
      if (/^(image\/|application\/pdf)/.test(mime)) return true;
      return /\.(jpe?g|png|webp|pdf)$/i.test(file.name || "");
    },
    previewLocalFile(file) {
      if (!file?.blob) return;
      this.closePreview();
      this.previewMime =
        file.blob.type || (/\.pdf$/i.test(file.name || "") ? "application/pdf" : "image/jpeg");
      this.previewUrl = URL.createObjectURL(file.blob);
    },
    async documentAction(doc, preview) {
      await this.run(async () => {
        const blob = await receiptService.download(this.selected, doc, preview);
        if (preview) {
          this.closePreview();
          this.previewMime = doc.mime_type;
          this.previewUrl = URL.createObjectURL(blob);
        } else this.saveBlob(blob, doc.file_name);
      });
    },
    closePreview() {
      if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
      this.previewUrl = null;
    },
    async startCamera() {
      await this.run(async () => {
        const generation = ++this.cameraGeneration;
        this.cameraOpen = true;
        await this.$nextTick();
        const { BrowserQRCodeReader } = await import("@zxing/browser");
        const reader = new BrowserQRCodeReader();
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: "environment" } },
          this.$refs.video,
          (result) => {
            if (result && generation === this.cameraGeneration) {
              this.qr = result.getText();
              this.stopCamera();
            }
          },
        );
        if (generation !== this.cameraGeneration) controls.stop();
        else this.cameraControls = controls;
      });
    },
    stopCamera() {
      this.cameraGeneration++;
      this.cameraControls?.stop();
      this.cameraControls = null;
      if (this.$refs.video?.srcObject) for (const track of this.$refs.video.srcObject.getTracks()) track.stop();
      this.cameraOpen = false;
    },
    async fetchProducts() {
      const { data } = await this.request(() => api.get("/finance/products", { params: { q: this.productQuery } }));
      this.products = data;
    },
    async loadProducts() {
      await this.run(() => this.fetchProducts());
    },
    async showHistory(product) {
      await this.run(async () => {
        const { data } = await this.request(() => api.get(`/finance/products/${product.id}/purchases`));
        this.history = data;
        this.historyProduct = product;
      });
    },
    async openReceiptId(id) {
      this.historyProduct = null;
      const user_id = useAuthStore().user.id;
      let row = await db.finance_receipts.where("[user_id+id]").equals([user_id, id]).first();
      if (!row) {
        const { data } = await this.request(() => api.get(`/finance/receipts/${id}`));
        await receiptRepository.merge(user_id, [data]);
        row = await db.finance_receipts.where("[user_id+id]").equals([user_id, id]).first();
      }
      await this.open(row);
    },
    async chooseProduct(item) {
      this.productItem = item;
      this.productQuery = item.description.split(" ").slice(0, 2).join(" ");
      await this.loadProducts();
    },
    async assignProduct(product) {
      await this.run(async () => {
        const ids = matchingReceiptItemIds(this.selected.items || [], this.productItem);
        if (!ids.length) throw new Error("Item indisponível. Reabra a nota e tente novamente.");
        const selected = this.selected;
        let completed = 0;
        try {
          for (const id of ids) {
            await this.request(() =>
              api.patch(`/finance/receipts/${selected.id}/items/${id}/product`, { product_id: product.id }),
            );
            completed++;
          }
        } catch (error) {
          if (completed) {
            try {
              const refreshed = await this.request(() => receiptService.detail(selected));
              if (this.selected?.local_key === selected.local_key) this.selected = refreshed;
            } catch { /* Preserve the original failure. */ }
            throw new Error(`Associação parcial: ${completed} de ${ids.length} linhas foram atualizadas. Tente novamente.`);
          }
          throw error;
        }
        this.productItem = null;
        const refreshed = await this.request(() => receiptService.detail(selected));
        if (this.selected?.local_key === selected.local_key) this.selected = refreshed;
      });
    },
    async findReviewCandidates(entry) {
      await this.run(async () => {
        const month = this.reviewMonths[entry.id] || transactionCalendarDate(entry.payload).slice(0, 7);
        this.reviewMonths[entry.id] = month;
        const { data } = await this.request(() =>
          api.get("/finance/transactions", { params: { month, type: entry.payload.type, limit: 250 } }),
        );
        this.reviewMatches[entry.id] = data.filter(
          (tx) => Number(tx.amount) === Number(entry.payload.amount) && tx.status !== "CANCELED",
        );
      });
    },
    async fetchReviews() {
      const { data } = await this.request(() => api.get("/finance/reconciliations"));
      this.reviews = data;
      this.pendingCount = await db.finance_import_entries
        .where("user_id")
        .equals(useAuthStore().user.id)
        .and((e) => e.state === "PENDING")
        .count();
    },
    async resolveReview(entry, action) {
      await this.run(async () => {
        await this.request(() =>
          api.post(`/finance/reconciliations/${entry.id}`, {
            action,
            ...(action === "link" ? { transaction_id: Number(this.reviewTargets[entry.id]) } : {}),
          }),
        );
        await this.fetchReviews();
        this.$emit("changed");
      });
    },
  },
};
</script>

<style scoped>
/* ==========================================================================
   CONTAINER, KPIs & PANEL (Padrão Nexo)
   ========================================================================== */
.receipts-tab {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-width: 0;
  gap: var(--space-4);
  color: var(--text-primary);
  container-type: inline-size;
  container-name: receipts-tab;
}

.receipt-metrics-grid {
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
  font-size: 1.1rem;
  border: 1px solid transparent;
}

.metric-icon.info {
  background: rgba(53, 90, 253, 0.1);
  border-color: rgba(53, 90, 253, 0.2);
  color: var(--color-info);
}

[data-theme="dark"] .metric-icon.info {
  background: rgba(95, 124, 255, 0.16);
  border-color: rgba(95, 124, 255, 0.28);
  color: #93c5fd;
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

.metric-icon.warning {
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(245, 158, 11, 0.26);
  color: #d97706;
}

[data-theme="dark"] .metric-icon.warning {
  background: rgba(251, 191, 36, 0.15);
  border-color: rgba(251, 191, 36, 0.3);
  color: #fbbf24;
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

.metric-value.positive,
.positive {
  color: var(--color-income, #2e9b62);
}

.metric-value.warning-text {
  color: #d97706;
}

[data-theme="dark"] .metric-value.warning-text {
  color: #fbbf24;
}

.negative {
  color: var(--color-expense, #d64a2e);
}

.metric-sub {
  font-size: 0.75rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

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

.panel-title h3,
.nexo-receipt-modal h4 {
  margin: 0;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--text-primary);
}

.panel-title h3 {
  font-size: 1.25rem;
}

.panel-subtitle,
.section-subtitle {
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

/* ==========================================================================
   PILLS & BADGES SEMÂNTICOS
   ========================================================================== */
.count-pill {
  font-size: 0.75rem;
  color: var(--text-secondary);
  background: var(--surface-2);
  border: 1px solid var(--glass-border);
  padding: 2px 10px;
  border-radius: var(--radius-pill);
  font-weight: 600;
  white-space: nowrap;
}

.count-pill.info {
  color: var(--color-info);
  background: rgba(53, 90, 253, 0.1);
  border-color: rgba(53, 90, 253, 0.22);
}

[data-theme="dark"] .count-pill.info {
  color: #93c5fd;
  background: rgba(95, 124, 255, 0.16);
  border-color: rgba(95, 124, 255, 0.28);
}

.count-pill.warning {
  color: #b45309;
  background: rgba(245, 158, 11, 0.14);
  border-color: rgba(245, 158, 11, 0.3);
}

[data-theme="dark"] .count-pill.warning {
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.15);
  border-color: rgba(251, 191, 36, 0.3);
}

.code-pill {
  display: inline-flex;
  align-items: center;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.74rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-xs);
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  color: var(--text-secondary);
}

.offline-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.74rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  color: #b45309;
  background: rgba(245, 158, 11, 0.14);
  border: 1px solid rgba(245, 158, 11, 0.28);
}

[data-theme="dark"] .offline-pill {
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.14);
  border-color: rgba(251, 191, 36, 0.3);
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 9px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--glass-border);
  background: var(--surface-2);
  color: var(--text-secondary);
  white-space: nowrap;
}

.status-pill.success {
  color: #15803d;
  background: rgba(46, 204, 113, 0.14);
  border-color: rgba(46, 204, 113, 0.3);
}

[data-theme="dark"] .status-pill.success {
  color: #4ade80;
  background: rgba(46, 204, 113, 0.16);
  border-color: rgba(46, 204, 113, 0.32);
}

.status-pill.info,
.status-pill.pending {
  color: var(--color-info);
  background: rgba(53, 90, 253, 0.1);
  border-color: rgba(53, 90, 253, 0.24);
}

[data-theme="dark"] .status-pill.info,
[data-theme="dark"] .status-pill.pending {
  color: #93c5fd;
  background: rgba(95, 124, 255, 0.16);
  border-color: rgba(95, 124, 255, 0.3);
}

.status-pill.warning {
  color: #b45309;
  background: rgba(245, 158, 11, 0.13);
  border-color: rgba(245, 158, 11, 0.3);
}

[data-theme="dark"] .status-pill.warning {
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.15);
  border-color: rgba(251, 191, 36, 0.32);
}

.status-pill.danger {
  color: var(--color-expense, #d64a2e);
  background: var(--red-high);
  border-color: rgba(214, 74, 46, 0.3);
}

[data-theme="dark"] .status-pill.danger {
  color: #f87171;
  background: rgba(239, 68, 68, 0.16);
  border-color: rgba(239, 68, 68, 0.32);
}

.status-pill.ai {
  color: var(--ai-accent, #7c3aed);
  background: rgba(124, 58, 237, 0.12);
  border-color: rgba(124, 58, 237, 0.28);
}

[data-theme="dark"] .status-pill.ai {
  color: #c4b5fd;
  background: rgba(139, 92, 246, 0.18);
  border-color: rgba(139, 92, 246, 0.34);
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
  border: 1px solid var(--glass-border);
  background: var(--surface-1);
  color: var(--text-primary);
  font-size: 0.84rem;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.nexo-banner > span {
  flex: 1;
}

.nexo-banner.error {
  background: var(--red-high);
  border-color: rgba(214, 74, 46, 0.35);
  color: var(--color-expense, #d64a2e);
}

[data-theme="dark"] .nexo-banner.error {
  color: #fca5a5;
  background: rgba(239, 68, 68, 0.14);
  border-color: rgba(239, 68, 68, 0.32);
}

.nexo-banner.warning {
  background: var(--amber-high);
  border-color: rgba(245, 158, 11, 0.32);
  color: #b45309;
}

[data-theme="dark"] .nexo-banner.warning {
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.12);
  border-color: rgba(251, 191, 36, 0.28);
}

.nexo-banner.info {
  background: rgba(53, 90, 253, 0.08);
  border-color: rgba(53, 90, 253, 0.24);
  color: var(--text-primary);
}

.nexo-banner.Info .banner-icon,
.nexo-banner.info .banner-icon {
  color: var(--color-info);
}

.nexo-banner.subtle {
  background: var(--surface-1);
  color: var(--text-secondary);
}

.nexo-banner.subtle.accent-warning {
  border-left: 4px solid #f59e0b;
}

.nexo-banner.subtle.accent-warning .banner-icon {
  color: #d97706;
}

[data-theme="dark"] .nexo-banner.subtle.accent-warning .banner-icon {
  color: #fbbf24;
}

.banner-icon {
  font-size: 0.95rem;
  flex-shrink: 0;
}

.banner-close {
  width: 26px;
  height: 26px;
  border: none;
  border-radius: var(--radius-xs);
  background: transparent;
  color: inherit;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0.75;
}

.banner-close:hover {
  opacity: 1;
  background: rgba(0, 0, 0, 0.06);
}

.nexo-progress-strip {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-sm);
  background: rgba(53, 90, 253, 0.08);
  border: 1px solid rgba(53, 90, 253, 0.2);
  color: var(--color-info);
  font-size: 0.84rem;
  font-weight: 600;
}

[data-theme="dark"] .nexo-progress-strip {
  color: #93c5fd;
  background: rgba(95, 124, 255, 0.14);
}

/* ==========================================================================
   SUBNAVEGAÇÃO ANIMADA (Notas / Produtos / Importações em revisão)
   ========================================================================== */
.receipt-subnav {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 5px;
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  flex-wrap: nowrap;
  overflow-x: auto;
  scrollbar-width: none;
  width: fit-content;
  max-width: 100%;
  box-sizing: border-box;
  isolation: isolate;
}

.receipt-subnav::-webkit-scrollbar {
  display: none;
}

.subnav-glider {
  position: absolute;
  top: 0;
  left: 0;
  border-radius: calc(var(--radius-sm) - 3px);
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-card);
  pointer-events: none;
  z-index: 0;
  opacity: 0;
  transition:
    transform 0.32s cubic-bezier(0.32, 0.72, 0, 1),
    width 0.32s cubic-bezier(0.32, 0.72, 0, 1),
    height 0.32s cubic-bezier(0.32, 0.72, 0, 1),
    opacity 0.18s ease,
    background var(--transition-base),
    border-color var(--transition-base);
}

.receipt-subnav.has-glider .subnav-glider {
  opacity: 1;
}

[data-theme="dark"] .subnav-glider {
  background: var(--surface-2);
  border-color: rgba(255, 255, 255, 0.12);
}

.subnav-btn {
  position: relative;
  z-index: 1;
  height: 36px;
  padding: 0 var(--space-4);
  border: 1px solid transparent;
  border-radius: calc(var(--radius-sm) - 3px);
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.84rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
  transition:
    color 0.22s ease,
    background var(--transition-fast),
    transform 0.16s ease;
  white-space: nowrap;
}

.subnav-btn:hover:not(.chosen) {
  color: var(--text-primary);
  background: rgba(128, 128, 128, 0.08);
}

.subnav-btn:active {
  transform: scale(0.98);
}

.subnav-btn.chosen {
  background: var(--surface-0);
  color: var(--text-primary);
  border-color: var(--glass-border);
  box-shadow: var(--shadow-card);
}

[data-theme="dark"] .subnav-btn.chosen {
  background: var(--surface-2);
  color: var(--text-primary);
  border-color: rgba(255, 255, 255, 0.12);
}

.receipt-subnav.has-glider .subnav-btn.chosen {
  background: transparent;
  border-color: transparent;
  box-shadow: none;
}

.subnav-icon {
  font-size: 0.85rem;
  opacity: 0.85;
  transition:
    color 0.22s ease,
    transform 0.24s cubic-bezier(0.32, 0.72, 0, 1),
    opacity 0.22s ease;
}

.subnav-btn.chosen .subnav-icon {
  color: var(--color-info);
  opacity: 1;
  transform: scale(1.06);
}

.subnav-badge {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: var(--radius-pill);
  background: var(--surface-2);
  color: var(--text-secondary);
  border: 1px solid var(--glass-border);
}

.subnav-btn.chosen .subnav-badge.neutral {
  background: rgba(53, 90, 253, 0.12);
  color: var(--color-info);
  border-color: rgba(53, 90, 253, 0.24);
}

[data-theme="dark"] .subnav-btn.chosen .subnav-badge.neutral {
  background: rgba(95, 124, 255, 0.18);
  color: #93c5fd;
  border-color: rgba(95, 124, 255, 0.32);
}

.subnav-badge.warning {
  background: rgba(245, 158, 11, 0.18);
  color: #b45309;
  border-color: rgba(245, 158, 11, 0.3);
}

[data-theme="dark"] .subnav-badge.warning {
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.18);
  border-color: rgba(251, 191, 36, 0.32);
}

/* ==========================================================================
   TRANSIÇÃO DO CONTEÚDO ENTRE SUB-ABAS
   ========================================================================== */
.receipt-view-stage {
  display: grid;
  gap: var(--space-5);
  min-width: 0;
}

.receipt-stage-next-enter-active,
.receipt-stage-prev-enter-active {
  transition:
    opacity 0.24s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.26s cubic-bezier(0.22, 1, 0.36, 1);
}

.receipt-stage-next-leave-active,
.receipt-stage-prev-leave-active {
  transition:
    opacity 0.16s cubic-bezier(0.4, 0, 1, 1),
    transform 0.16s cubic-bezier(0.4, 0, 1, 1);
}

.receipt-stage-next-enter-from {
  opacity: 0;
  transform: translate3d(18px, 0, 0);
}

.receipt-stage-next-leave-to {
  opacity: 0;
  transform: translate3d(-14px, 0, 0);
}

.receipt-stage-prev-enter-from {
  opacity: 0;
  transform: translate3d(-18px, 0, 0);
}

.receipt-stage-prev-leave-to {
  opacity: 0;
  transform: translate3d(14px, 0, 0);
}

.banner-fade-enter-active,
.banner-fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.banner-fade-enter-from,
.banner-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (prefers-reduced-motion: reduce) {
  .subnav-glider,
  .receipt-stage-next-enter-active,
  .receipt-stage-next-leave-active,
  .receipt-stage-prev-enter-active,
  .receipt-stage-prev-leave-active,
  .banner-fade-enter-active,
  .banner-fade-leave-active {
    transition-duration: 0.01ms !important;
  }
}

/* ==========================================================================
   CARD DE CAPTURA (Padrão NexoCsvImportCard)
   ========================================================================== */
.capture-card {
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  background: var(--surface-1);
  padding: var(--space-5);
  display: grid;
  gap: var(--space-4);
  transition:
    background var(--transition-base),
    border-color var(--transition-base);
}

.capture-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.header-main-info {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.capture-icon-avatar {
  width: 42px;
  height: 42px;
  min-width: 42px;
  border-radius: var(--radius-sm);
  background: rgba(53, 90, 253, 0.08);
  border: 1px solid rgba(53, 90, 253, 0.16);
  color: var(--color-info);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
}

[data-theme="dark"] .capture-icon-avatar {
  background: rgba(95, 124, 255, 0.15);
  border-color: rgba(95, 124, 255, 0.25);
  color: #a5b4fc;
}

.capture-title-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.capture-title-group strong {
  color: var(--text-primary);
  font-size: 0.95rem;
  font-weight: 700;
}

.capture-subtitle {
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
}

.capture-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.file-button input[type="file"] {
  display: none;
}

.file-button.is-disabled {
  opacity: 0.55;
  pointer-events: none;
}

.qr-input-bar {
  display: flex;
  flex-direction: row !important;
  align-items: flex-end;
  gap: var(--space-3);
  flex-wrap: wrap;
  padding-top: var(--space-3);
  border-top: 1px solid var(--glass-border);
}

.qr-field {
  flex: 1 1 280px;
  min-width: 220px;
}

.qr-submit-btn {
  height: 42px !important;
}

.capture-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
  padding-top: var(--space-2);
}

.capture-footnotes {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.footnote-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.74rem;
  color: var(--text-secondary);
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  padding: 4px 10px;
  border-radius: var(--radius-pill);
}

.footnote-pill.ai svg {
  color: var(--ai-accent, #7c3aed);
}

.camera-box {
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  padding: var(--space-4);
  display: grid;
  gap: var(--space-3);
  justify-items: center;
}

.camera-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
  font-size: var(--fontsize-xs);
  color: var(--text-secondary);
  font-weight: 600;
}

.camera-video {
  width: min(100%, 440px);
  border-radius: var(--radius-sm);
  border: 1px solid var(--glass-border);
  background: #000;
  display: block;
}

/* ==========================================================================
   CONTROLES DE FORMULÁRIO, FILTROS & INPUTS (Reset sobre main.css + Teleport)
   ========================================================================== */
.filters-surface {
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
}

.receipt-filters-bar {
  display: flex;
  flex-direction: row !important;
  align-items: flex-end;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.filter-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
}

.filter-field.search-filter {
  flex: 1 1 260px;
  min-width: 220px;
}

.filter-field.date-filter {
  flex: 0 1 150px;
  min-width: 138px;
}

.filter-field.amount-filter {
  flex: 0 1 130px;
  min-width: 115px;
}

.filter-field.status-filter {
  flex: 0 1 210px;
  min-width: 180px;
}

.filter-field > label,
.filter-field > span {
  position: static !important;
  transform: none !important;
  color: var(--text-secondary) !important;
  font-size: 0.72rem !important;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding-left: 2px;
  user-select: none;
}

.filter-actions-col {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.filter-btn {
  height: 42px !important;
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

.nexo-checkbox {
  display: inline-flex;
  align-items: center;
  gap: var(--space-3);
  cursor: pointer;
  font-size: 0.84rem;
  color: var(--text-secondary);
  user-select: none;
}

.nexo-checkbox.checkbox-surface {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-sm);
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  color: var(--text-primary);
  transition:
    border-color var(--transition-fast),
    background var(--transition-fast);
}

.nexo-checkbox.checkbox-surface:hover {
  border-color: var(--border-hover);
}

.nexo-checkbox input[type="checkbox"] {
  flex-shrink: 0;
  margin: 0;
}

.tx-filter-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-sm);
  background: rgba(53, 90, 253, 0.08);
  border: 1px solid rgba(53, 90, 253, 0.22);
  font-size: 0.85rem;
}

.tx-filter-copy {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--text-primary);
}

.tx-filter-icon {
  color: var(--color-info);
}

/* ==========================================================================
   HIERARQUIA DE BOTÕES NEXO (Primário, Secundário, Exclusão/Danger, IA, Add)
   ========================================================================== */
.primary-action,
.secondary-btn,
.danger-btn,
.danger-solid-btn,
.ai-action-btn,
.dashed-add-btn,
.text-btn,
.reset-filters-btn,
.icon-btn {
  border-radius: var(--radius-sm);
  font-weight: 600;
  font-size: 0.84rem;
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  cursor: pointer;
  transition:
    transform var(--transition-fast),
    background var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast),
    box-shadow var(--transition-fast),
    filter var(--transition-fast);
  white-space: nowrap;
  box-sizing: border-box;
}

/* 1. Botão Primário (Ações principais de confirmação e envio) */
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
  color: #ffffff;
  box-shadow: 0 2px 10px rgba(53, 90, 253, 0.32);
}

.primary-action:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.08);
  box-shadow: 0 4px 12px rgba(31, 39, 76, 0.28);
}

[data-theme="dark"] .primary-action:hover:not(:disabled) {
  box-shadow: 0 4px 14px rgba(53, 90, 253, 0.45);
}

.primary-action:active:not(:disabled) {
  transform: translateY(0) scale(0.98);
}

/* 2. Botão Secundário (Ações neutras e complementares) */
.secondary-btn {
  height: 38px;
  padding: 0 var(--space-3);
  border: 1px solid var(--glass-border);
  background: var(--surface-2);
  color: var(--text-primary);
  font-size: 0.82rem;
}

[data-theme="dark"] .secondary-btn {
  background: var(--surface-2);
  border-color: rgba(255, 255, 255, 0.12);
  color: var(--text-primary);
}

.secondary-btn:hover:not(:disabled) {
  background: var(--surface-3);
  border-color: var(--color-info);
  color: var(--color-info);
  transform: translateY(-1px);
}

[data-theme="dark"] .secondary-btn:hover:not(:disabled) {
  color: #93c5fd;
  border-color: rgba(95, 124, 255, 0.45);
}

.secondary-btn:active:not(:disabled) {
  transform: translateY(0) scale(0.98);
}

/* 3. Botões de Exclusão / Destrutivos (.danger-btn, .danger-solid-btn, .icon-btn.danger) */
.danger-btn {
  height: 38px;
  padding: 0 var(--space-3);
  border: 1px solid rgba(214, 74, 46, 0.3);
  background: rgba(214, 74, 46, 0.08);
  color: var(--color-expense, #d64a2e);
  font-size: 0.82rem;
  font-weight: 700;
}

[data-theme="dark"] .danger-btn {
  background: rgba(239, 68, 68, 0.14);
  border-color: rgba(239, 68, 68, 0.32);
  color: #f87171;
}

.danger-btn:hover:not(:disabled) {
  background: var(--color-expense, #d64a2e);
  border-color: var(--color-expense, #d64a2e);
  color: #ffffff;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(214, 74, 46, 0.25);
}

[data-theme="dark"] .danger-btn:hover:not(:disabled) {
  background: #ef4444;
  border-color: #ef4444;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.35);
}

.danger-solid-btn {
  height: 40px;
  padding: 0 var(--space-4);
  border: 1px solid transparent;
  background: linear-gradient(135deg, #d64a2e, #b91c1c);
  color: #ffffff;
  font-size: 0.84rem;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(214, 74, 46, 0.28);
}

.danger-solid-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.06);
  box-shadow: 0 4px 14px rgba(214, 74, 46, 0.38);
}

.danger-solid-btn:active:not(:disabled) {
  transform: translateY(0) scale(0.98);
}

/* 4. Botão de IA (Padrão Nexo AI Accent) */
.ai-action-btn {
  height: 38px;
  padding: 0 var(--space-4);
  border: 1px solid rgba(124, 58, 237, 0.28);
  background: rgba(124, 58, 237, 0.06);
  color: var(--text-primary);
  font-size: 0.82rem;
}

[data-theme="dark"] .ai-action-btn {
  border-color: rgba(139, 92, 246, 0.34);
  background: rgba(139, 92, 246, 0.12);
}

.ai-btn-icon {
  color: var(--ai-accent, #7c3aed);
  font-size: 0.92rem;
}

[data-theme="dark"] .ai-btn-icon {
  color: #c4b5fd;
}

.ai-action-btn:hover:not(:disabled) {
  border-color: var(--ai-accent, #7c3aed);
  background: rgba(124, 58, 237, 0.12);
  color: var(--ai-accent, #7c3aed);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.16);
}

[data-theme="dark"] .ai-action-btn:hover:not(:disabled) {
  color: #ddd6fe;
  border-color: #a78bfa;
  background: rgba(139, 92, 246, 0.2);
}

/* 5. Botão Tracejado de Adição de Linha (.dashed-add-btn) */
.dashed-add-btn {
  width: 100%;
  height: 40px;
  padding: 0 var(--space-3);
  border: 1px dashed var(--glass-border);
  background: var(--surface-0);
  color: var(--text-secondary);
  font-size: 0.82rem;
}

.dashed-add-btn:hover:not(:disabled) {
  border-color: var(--color-info);
  color: var(--color-info);
  background: rgba(53, 90, 253, 0.05);
}

[data-theme="dark"] .dashed-add-btn:hover:not(:disabled) {
  color: #93c5fd;
  border-color: rgba(95, 124, 255, 0.45);
  background: rgba(95, 124, 255, 0.1);
}

.reset-filters-btn {
  height: 42px;
  padding: 0 var(--space-3);
  border: 1px dashed rgba(214, 74, 46, 0.3);
  background: rgba(214, 74, 46, 0.05);
  color: var(--color-expense, #d64a2e);
  font-size: 0.82rem;
}

[data-theme="dark"] .reset-filters-btn {
  color: #f87171;
  border-color: rgba(239, 68, 68, 0.32);
  background: rgba(239, 68, 68, 0.08);
}

.reset-filters-btn:hover:not(:disabled) {
  background: rgba(214, 74, 46, 0.14);
  border-color: var(--color-expense, #d64a2e);
}

/* 6. Variante Compacta Unificada (Mesma altura exata em qualquer grupo de botões) */
.primary-action.compact,
.secondary-btn.compact,
.danger-btn.compact,
.ai-action-btn.compact,
.reset-filters-btn.compact {
  height: 34px;
  min-height: 34px;
  padding: 0 12px;
  font-size: 0.78rem;
}

.text-btn {
  height: 38px;
  padding: 0 var(--space-3);
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-secondary);
}

.text-btn:hover:not(:disabled) {
  color: var(--text-primary);
  background: var(--surface-2);
}

.icon-btn {
  width: 36px;
  height: 36px;
  border: 1px solid var(--glass-border);
  background: var(--surface-2);
  color: var(--text-primary);
}

.icon-btn.small {
  width: 32px;
  height: 32px;
  font-size: 0.78rem;
}

.icon-btn.danger {
  background: rgba(214, 74, 46, 0.08);
  border-color: rgba(214, 74, 46, 0.22);
  color: var(--color-expense, #d64a2e);
}

[data-theme="dark"] .icon-btn.danger {
  background: rgba(239, 68, 68, 0.12);
  border-color: rgba(239, 68, 68, 0.28);
  color: #f87171;
}

.icon-btn.danger:hover:not(:disabled) {
  background: var(--color-expense, #d64a2e);
  border-color: var(--color-expense, #d64a2e);
  color: #ffffff;
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(214, 74, 46, 0.25);
}

[data-theme="dark"] .icon-btn.danger:hover:not(:disabled) {
  background: #ef4444;
  border-color: #ef4444;
  color: #ffffff;
}

button:disabled {
  opacity: 0.52;
  cursor: not-allowed;
  transform: none !important;
  filter: none !important;
  box-shadow: none !important;
}

/* ==========================================================================
   LISTA DE NOTAS FISCAIS E PRODUTOS (Cards interativos)
   ========================================================================== */
.receipt-list {
  display: grid;
  gap: var(--space-3);
}

.receipt-row-card {
  width: 100%;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  background: var(--surface-1);
  color: var(--text-primary);
  padding: var(--space-4);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  box-sizing: border-box;
  transition:
    transform var(--transition-fast),
    border-color var(--transition-fast),
    background var(--transition-fast),
    box-shadow var(--transition-fast);
}

.receipt-row-card:focus-visible {
  outline: 2px solid var(--color-info);
  outline-offset: 2px;
}

.receipt-row-card.tone-success {
  border-left: 3px solid #2e9b62;
}

.receipt-row-card.tone-info,
.receipt-row-card.tone-pending {
  border-left: 3px solid var(--color-info);
}

.receipt-row-card.tone-warning {
  border-left: 3px solid #f59e0b;
}

.receipt-row-card.tone-danger {
  border-left: 3px solid var(--color-expense, #d64a2e);
}

.receipt-row-card.tone-ai {
  border-left: 3px solid var(--ai-accent, #7c3aed);
}

.receipt-row-card:hover {
  background: var(--surface-0);
  border-color: rgba(53, 90, 253, 0.35);
  box-shadow: var(--shadow-card);
  transform: translateY(-1px);
}

[data-theme="dark"] .receipt-row-card:hover {
  background: var(--surface-2);
  border-color: rgba(95, 124, 255, 0.4);
}

.receipt-row-main {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
  flex: 1;
}

.receipt-avatar {
  width: 40px;
  height: 40px;
  min-width: 40px;
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.98rem;
  background: var(--surface-2);
  color: var(--text-secondary);
  border: 1px solid var(--glass-border);
}

.receipt-avatar.success {
  background: rgba(46, 204, 113, 0.12);
  color: #16a34a;
  border-color: rgba(46, 204, 113, 0.25);
}

[data-theme="dark"] .receipt-avatar.success {
  color: #4ade80;
}

.receipt-avatar.info,
.receipt-avatar.pending {
  background: rgba(53, 90, 253, 0.1);
  color: var(--color-info);
  border-color: rgba(53, 90, 253, 0.22);
}

[data-theme="dark"] .receipt-avatar.info,
[data-theme="dark"] .receipt-avatar.pending {
  background: rgba(95, 124, 255, 0.16);
  color: #93c5fd;
}

.receipt-avatar.warning {
  background: rgba(245, 158, 11, 0.12);
  color: #d97706;
  border-color: rgba(245, 158, 11, 0.26);
}

[data-theme="dark"] .receipt-avatar.warning {
  color: #fbbf24;
}

.receipt-avatar.danger {
  background: var(--red-high);
  color: var(--color-expense);
  border-color: rgba(214, 74, 46, 0.28);
}

.receipt-avatar.ai {
  background: rgba(124, 58, 237, 0.12);
  color: var(--ai-accent, #7c3aed);
  border-color: rgba(124, 58, 237, 0.26);
}

.receipt-row-copy {
  display: grid;
  gap: 5px;
  min-width: 0;
  flex: 1;
}

.receipt-row-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.receipt-row-title strong {
  font-size: 0.94rem;
  color: var(--text-primary);
  font-weight: 700;
}

.receipt-row-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  font-size: var(--fontsize-xs);
  color: var(--text-secondary);
}

.meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.meta-dot {
  opacity: 0.55;
}

.mono-text {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.76rem;
}

.linked-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--color-info);
  font-weight: 600;
}

.receipt-row-end {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-shrink: 0;
}

.receipt-row-actions {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.receipt-amount {
  font-size: 1rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
}

.purchase-price-stack {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  font-variant-numeric: tabular-nums;
}

.purchase-price-stack small {
  font-size: var(--fontsize-xs);
  color: var(--text-secondary);
}

.row-chevron {
  width: 30px;
  height: 30px;
  border-radius: var(--radius-xs);
  background: var(--surface-2);
  border: 1px solid var(--glass-border);
  color: var(--text-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.78rem;
  transition: all var(--transition-fast);
}

.receipt-row-card:hover .row-chevron {
  background: var(--color-info);
  border-color: var(--color-info);
  color: #fff;
}

.load-more-row {
  display: flex;
  justify-content: center;
  padding-top: var(--space-2);
}

/* ==========================================================================
   IMPORTAÇÕES EM REVISÃO
   ========================================================================== */
.review-cards-stack {
  display: grid;
  gap: var(--space-4);
}

.review-entry-card {
  border: 1px solid var(--glass-border);
  border-left: 3px solid #f59e0b;
  border-radius: var(--radius-md);
  background: var(--surface-1);
  padding: var(--space-5);
  display: grid;
  gap: var(--space-4);
}

.review-entry-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.review-entry-title {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.review-entry-title strong {
  display: block;
  font-size: 0.96rem;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.review-entry-amount {
  font-size: 1.05rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--color-expense);
}

.review-reconcile-surface {
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  padding: var(--space-4);
}

.review-reconcile-grid {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(280px, 1.5fr);
  gap: var(--space-4);
}

.inline-control-row {
  display: flex;
  flex-direction: row !important;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.inline-control-row > .nexo-control {
  flex: 1 1 160px;
}

.inline-control-row > button {
  height: 42px;
  min-height: 42px;
  flex-shrink: 0;
}

.review-entry-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-2);
  flex-wrap: wrap;
  padding-top: var(--space-2);
  border-top: 1px solid var(--glass-border);
}

/* ==========================================================================
   EMPTY STATES (Padrão NexoTransactionsTable)
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
  max-width: 400px;
  margin: 0 auto;
  text-align: center;
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

.empty-state-card p,
.empty-inline-text,
.helper-note {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--fontsize-xs);
  line-height: 1.5;
}

/* ==========================================================================
   MODAL DE DETALHES DA NOTA FISCAL (Compatível com Teleport do BaseModal)
   ========================================================================== */
.nexo-receipt-modal {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-4);
  color: var(--text-primary);
  width: 100%;
  max-width: 100%;
  min-width: 0;
  flex-shrink: 0;
  box-sizing: border-box;
}

.detail-summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.detail-stat-card {
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.detail-stat-card.highlight {
  background: linear-gradient(145deg, rgba(53, 90, 253, 0.08), var(--surface-1));
  border-color: rgba(53, 90, 253, 0.22);
}

[data-theme="dark"] .detail-stat-card.highlight {
  background: linear-gradient(145deg, rgba(95, 124, 255, 0.14), var(--surface-1));
  border-color: rgba(95, 124, 255, 0.28);
}

.detail-stat-card.wide {
  grid-column: 1 / -1;
}

.stat-wide-head {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.stat-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
}

.stat-value {
  font-size: 1.35rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
}

.stat-text {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
  overflow-wrap: anywhere;
}

.stat-sub {
  font-size: var(--fontsize-xs);
  color: var(--text-secondary);
}

.fiscal-key-box {
  width: 100%;
  display: block;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-xs);
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.8rem;
  color: var(--text-primary);
  overflow-wrap: anywhere;
  line-height: 1.45;
  box-sizing: border-box;
}

.modal-section-card {
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  display: grid;
  gap: var(--space-4);
}

.section-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.documents-list {
  display: grid;
  gap: var(--space-2);
}

.document-item-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
}

.document-item-info {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
  flex: 1;
}

.doc-icon-badge {
  width: 34px;
  height: 34px;
  min-width: 34px;
  border-radius: var(--radius-xs);
  background: rgba(53, 90, 253, 0.1);
  color: var(--color-info);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
}

.doc-copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.doc-copy strong {
  font-size: 0.86rem;
  color: var(--text-primary);
  overflow-wrap: anywhere;
}

.doc-copy small {
  font-size: var(--fontsize-xs);
  color: var(--text-secondary);
}

.document-item-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.extraction-toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  padding-top: var(--space-3);
  border-top: 1px solid var(--glass-border);
}

/* ==========================================================================
   TABELAS INTERNAS DO MODAL (Produtos & Edição)
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
  padding: 8px 10px;
  border-bottom: 1px solid var(--glass-border);
  vertical-align: middle;
  font-size: 0.82rem;
}

.nexo-table th {
  color: var(--text-secondary);
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: var(--surface-2);
  white-space: nowrap;
}

.nexo-table tbody tr:last-child td {
  border-bottom: none;
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
  font-size: 0.84rem;
  overflow-wrap: anywhere;
}

.table-item-code {
  display: block;
  color: var(--text-secondary);
  font-size: 0.7rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  overflow-wrap: anywhere;
}

.table-row-actions {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 5px;
  flex-wrap: nowrap;
}

.table-row-actions .secondary-btn.compact {
  height: 28px;
  padding: 0 8px;
  font-size: 0.73rem;
  gap: 5px;
}

.edit-receipt-form {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr);
  min-width: 0;
  max-width: 100%;
  gap: var(--space-4);
}

.edit-fields-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.edit-items-table input {
  min-width: 85px;
}

.edit-items-table .col-item-desc input {
  min-width: 180px;
}

.edit-items-table .col-item-unit input {
  min-width: 64px;
  max-width: 80px;
}

.edit-table-actions {
  display: flex;
  justify-content: flex-start;
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

.modal-footer-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
  padding-top: var(--space-3);
  border-top: 1px solid var(--glass-border);
}

.modal-footer-right {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin-left: auto;
}

/* ==========================================================================
   MODAL DE CONFIRMAÇÃO DE EXCLUSÃO & MODAIS AUXILIARES
   ========================================================================== */
.delete-confirm-modal {
  gap: var(--space-4);
}

.delete-confirm-hero {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: rgba(214, 74, 46, 0.08);
  border: 1px solid rgba(214, 74, 46, 0.24);
}

[data-theme="dark"] .delete-confirm-hero {
  background: rgba(239, 68, 68, 0.12);
  border-color: rgba(239, 68, 68, 0.28);
}

.delete-icon-circle {
  width: 44px;
  height: 44px;
  min-width: 44px;
  border-radius: 50%;
  background: rgba(214, 74, 46, 0.14);
  color: var(--color-expense, #d64a2e);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
}

[data-theme="dark"] .delete-icon-circle {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

.delete-target-card {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.delete-target-card strong {
  font-size: 0.92rem;
  color: var(--text-primary);
  overflow-wrap: anywhere;
}

.delete-target-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  font-size: var(--fontsize-xs);
  color: var(--text-secondary);
}

.delete-confirm-text {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.55;
  color: var(--text-secondary);
}

.history-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-3);
}

.assoc-target-banner {
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  padding: var(--space-3) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.assoc-target-banner strong {
  font-size: 0.9rem;
  color: var(--text-primary);
}

/* ==========================================================================
   VÍNCULOS & ACCORDIONS (<details>)
   ========================================================================== */
.linked-tx-list {
  display: grid;
  gap: var(--space-2);
}

.linked-tx-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--surface-0);
  border: 1px solid var(--glass-border);
  font-size: 0.86rem;
}

.linked-tx-copy {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}

.linked-icon {
  color: var(--color-info);
}

.nexo-details-card {
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  background: var(--surface-0);
  overflow: hidden;
}

.nexo-details-card summary {
  list-style: none;
  cursor: pointer;
  padding: var(--space-3) var(--space-4);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  font-weight: 600;
  font-size: 0.86rem;
  color: var(--text-primary);
  user-select: none;
  transition: background var(--transition-fast);
}

.nexo-details-card summary::-webkit-details-marker {
  display: none;
}

.nexo-details-card summary:hover {
  background: var(--surface-2);
}

.summary-left {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.summary-left svg {
  color: var(--color-info);
}

.summary-chevron {
  font-size: 0.78rem;
  color: var(--text-muted);
  transition: transform var(--transition-fast);
}

.nexo-details-card[open] .summary-chevron {
  transform: rotate(180deg);
}

.details-body {
  padding: var(--space-4);
  border-top: 1px solid var(--glass-border);
  display: grid;
  gap: var(--space-3);
}

.candidates-list {
  display: grid;
  gap: var(--space-2);
  max-height: 240px;
  overflow-y: auto;
}

.candidate-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-xs);
  border: 1px solid var(--glass-border);
  background: var(--surface-1);
  cursor: pointer;
}

.candidate-row input[type="checkbox"] {
  flex-shrink: 0;
  margin: 0;
}

.candidate-desc {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 2px;
}

.candidate-desc strong {
  font-size: 0.84rem;
  color: var(--text-primary);
}

.candidate-desc small {
  font-size: var(--fontsize-xs);
  color: var(--text-secondary);
}

.candidate-amount {
  width: 120px !important;
  flex-shrink: 0;
}

.payments-stack {
  display: grid;
  gap: var(--space-3);
}

.payment-grid-card {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
  align-items: end;
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
}

.payment-remove-col {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-top: var(--space-1);
}

.details-actions-end {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  padding-top: var(--space-1);
}

/* ==========================================================================
   MODAL 0: ARQUIVAR COMPROVANTE FISCAL (Capture Modal)
   ========================================================================== */
.capture-modal-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-width: 0;
  max-width: 100%;
  gap: var(--space-4);
}

.capture-options-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.capture-option-tile {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  background: var(--surface-2);
  border: 1px solid var(--glass-border);
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
  min-width: 0;
  box-sizing: border-box;
  transition:
    transform var(--transition-fast),
    border-color var(--transition-fast),
    background var(--transition-fast),
    box-shadow var(--transition-fast);
}

.capture-option-tile input[type="file"] {
  display: none;
}

.capture-option-tile:hover:not(:disabled):not(.is-disabled) {
  transform: translateY(-2px);
  border-color: var(--border-hover);
  background: var(--surface-3);
  box-shadow: var(--shadow-elevated);
}

.capture-option-tile.primary {
  grid-column: 1 / -1;
  flex-direction: row;
  align-items: center;
  background: rgba(53, 90, 253, 0.08);
  border-color: rgba(53, 90, 253, 0.28);
}

.capture-option-tile.primary:hover:not(:disabled):not(.is-disabled) {
  background: rgba(53, 90, 253, 0.14);
  border-color: rgba(53, 90, 253, 0.45);
}

.capture-option-tile:disabled,
.capture-option-tile.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.capture-tile-icon {
  width: 38px;
  height: 38px;
  min-width: 38px;
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  color: var(--color-info);
  font-size: 1rem;
  flex-shrink: 0;
}

.capture-option-tile.primary .capture-tile-icon {
  background: var(--primary-gradient);
  border-color: transparent;
  color: #ffffff;
}

.capture-tile-copy {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.capture-tile-copy strong {
  font-size: var(--fontsize-sm);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
}

.capture-tile-copy small {
  font-size: var(--fontsize-xs);
  color: var(--text-secondary);
  line-height: 1.35;
}

.qr-form-row {
  display: flex;
  flex-direction: row !important;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}

.qr-form-row > button {
  height: 42px;
  min-height: 42px;
  flex-shrink: 0;
}

.qr-input-wrap {
  flex: 1;
  min-width: 0;
}

.empty-state-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-2);
  margin-top: var(--space-2);
}

/* ==========================================================================
   MODAL 1: DETALHES DA NOTA FISCAL (Simplificado & Objetivo)
   ========================================================================== */
.receipt-overview-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--surface-2);
  border: 1px solid var(--glass-border);
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}

.overview-meta-col {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-2);
  min-width: 0;
  flex: 1 1 auto;
}

.overview-badges-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
}

.overview-meta-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--fontsize-xs);
  font-weight: var(--font-medium);
  color: var(--text-secondary);
}

.overview-keys-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}

.key-chip-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 6px;
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  color: var(--text-secondary);
  font-size: 0.74rem;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.key-chip-btn code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: var(--text-primary);
}

.key-chip-btn:hover {
  border-color: var(--border-hover);
  color: var(--text-primary);
  background: var(--surface-3);
}

.linked-transaction-btn { border: 1px solid var(--glass-border); border-radius: 6px; padding: 3px 7px; background: var(--surface-2); cursor: pointer; }
.linked-transaction-btn:hover { color: var(--text-primary); }
.product-name-link { padding: 0; border: 0; background: none; color: var(--text-primary); font: inherit; font-weight: 600; text-align: left; cursor: pointer; }
.product-name-link:hover { text-decoration: underline; }

.qr-inline-details {
  font-size: 0.74rem;
  color: var(--text-secondary);
}

.qr-inline-details summary {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  cursor: pointer;
  list-style: none;
}

.qr-inline-details summary::-webkit-details-marker {
  display: none;
}

.qr-inline-details[open] .fiscal-key-box {
  margin-top: var(--space-2);
}

.overview-total-col {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  flex-shrink: 0;
  text-align: right;
}

.overview-total-value {
  font-size: 1.35rem;
  font-weight: var(--font-bold);
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.modal-sections-stack {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-width: 0;
  max-width: 100%;
  gap: var(--space-3);
}

.modal-compact-section {
  background: var(--surface-2);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  gap: var(--space-3);
}

.compact-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.compact-section-head h4 {
  margin: 0;
  font-size: 0.92rem;
  font-weight: var(--font-semibold);
  color: var(--text-primary);
}

.compact-head-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.secondary-btn.compact.active {
  background: rgba(53, 90, 253, 0.14);
  border-color: rgba(53, 90, 253, 0.42);
  color: #60a5fa;
}

:global(:root[data-theme="light"]) .secondary-btn.compact.active {
  background: rgba(37, 99, 235, 0.1);
  border-color: rgba(37, 99, 235, 0.35);
  color: #1d4ed8;
}

.compact-docs-list {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-width: 0;
  max-width: 100%;
  gap: 6px;
}

.compact-doc-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  background: var(--surface-1);
  border: 1px solid var(--glass-border);
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}

.compact-doc-main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1 1 0%;
  overflow: hidden;
}

.compact-doc-icon {
  color: var(--color-info);
  font-size: 0.88rem;
  flex-shrink: 0;
}

.compact-doc-name {
  flex: 0 1 auto;
  min-width: 0;
  font-size: 0.84rem;
  font-weight: var(--font-medium);
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.compact-doc-size {
  font-size: var(--fontsize-xs);
  color: var(--text-muted);
  flex-shrink: 0;
  white-space: nowrap;
}

.compact-doc-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.reconcile-drawer {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-width: 0;
  max-width: 100%;
  gap: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--glass-border);
}

/* ==========================================================================
   MODAL DE PRÉVIA (PDF / IMAGEM)
   ========================================================================== */
.preview-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 240px;
}

.image-preview {
  display: block;
  max-width: 100%;
  max-height: 72vh;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: var(--radius-sm);
  border: 1px solid var(--glass-border);
}

.pdf-preview {
  width: 100%;
  height: 70vh;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  background: var(--surface-1);
}

/* ==========================================================================
   RESPONSIVIDADE DA ABA (@container receipts-tab) & DOS MODAIS (@media)
   ========================================================================== */
@container receipts-tab (max-width: 820px) {
  .receipt-metrics-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-3);
  }

  .review-reconcile-grid {
    grid-template-columns: 1fr;
  }
}

@container receipts-tab (max-width: 680px) {
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

  .header-actions > .primary-action {
    flex: 1;
  }

  .filters-surface {
    padding: var(--space-3);
  }

  .receipt-filters-bar {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-3);
    align-items: end;
  }

  .filter-field.search-filter,
  .filter-field.status-filter,
  .filter-actions-col {
    grid-column: 1 / -1;
    width: 100%;
    min-width: 0;
  }

  .filter-field.date-filter,
  .filter-field.amount-filter {
    min-width: 0;
    width: 100%;
  }

  .filter-actions-col button {
    flex: 1;
  }

  .receipt-row-card {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-3);
  }

  .receipt-row-end {
    justify-content: space-between;
    padding-top: var(--space-2);
    border-top: 1px solid var(--glass-border);
  }
}

@container receipts-tab (max-width: 480px) {
  .receipt-metrics-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-2);
  }

  .metric-card {
    padding: var(--space-3);
    gap: var(--space-2);
  }

  .metric-icon {
    width: 34px;
    height: 34px;
    min-width: 34px;
    font-size: 0.9rem;
  }

  .metric-value {
    font-size: 1.02rem;
  }

  .metric-sub {
    font-size: 0.68rem;
  }

  .panel {
    padding: var(--space-3);
  }

  .receipt-subnav {
    width: 100%;
  }

  .subnav-btn {
    flex: 1;
    justify-content: center;
    height: 34px;
    padding: 0 var(--space-2);
    font-size: 0.76rem;
    gap: 5px;
  }

  .receipt-filters-bar {
    grid-template-columns: 1fr;
  }

  .review-entry-card {
    padding: var(--space-3);
  }

  .review-entry-actions {
    flex-direction: column-reverse;
    align-items: stretch;
  }

  .review-entry-actions button {
    width: 100%;
  }
}

/* Responsividade dos Modais (Teleportados no body) e Telas Mobile */
@media (max-width: 680px) {
  .panel {
    padding: var(--space-4);
  }

  .detail-summary-grid,
  .history-summary-grid,
  .edit-fields-grid,
  .review-reconcile-grid {
    grid-template-columns: 1fr;
  }

  .candidate-row {
    flex-wrap: wrap;
  }

  .candidate-amount {
    width: 100% !important;
  }
}

@media (max-width: 480px) {
  .qr-input-bar,
  .qr-form-row {
    flex-direction: column !important;
    align-items: stretch;
  }

  .qr-submit-btn,
  .qr-form-row > button {
    width: 100%;
  }
}

@media (max-width: 560px) {
  .capture-options-grid {
    grid-template-columns: 1fr;
  }

  .capture-option-tile {
    flex-direction: row;
    align-items: center;
    padding: var(--space-3);
  }

  .receipt-overview-bar {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-3);
  }

  .overview-total-col {
    flex-direction: row;
    align-items: baseline;
    justify-content: space-between;
    padding-top: var(--space-2);
    border-top: 1px solid var(--glass-border);
    text-align: left;
  }

  .compact-section-head {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-2);
  }

  .compact-head-actions {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
  }

  .compact-head-actions > * {
    width: 100%;
    justify-content: center;
  }

  .compact-doc-row {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-2);
  }

  .compact-doc-actions {
    width: 100%;
    display: flex;
    gap: 6px;
  }

  .compact-doc-actions > button {
    flex: 1;
  }

  /* Transformação das tabelas do modal em cartões responsivos no mobile */
  .nexo-table-wrap {
    border: none;
    background: transparent;
    overflow-x: visible;
  }

  .nexo-table,
  .nexo-table tbody {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-2);
    width: 100%;
  }

  .nexo-table thead {
    display: none;
  }

  .nexo-table tbody tr {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-2);
    padding: var(--space-3);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-sm);
    background: var(--surface-1);
  }

  .nexo-table td {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 3px;
    padding: 0;
    border-bottom: none;
    text-align: left !important;
    min-width: 0;
  }

  .nexo-table td::before {
    content: attr(data-label);
    font-size: 0.66rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-secondary);
  }

  .nexo-table td.col-read-product,
  .nexo-table td.col-item-desc,
  .nexo-table td.col-read-actions,
  .nexo-table td.col-item-action {
    grid-column: 1 / -1;
  }

  .nexo-table td.col-read-actions::before {
    display: none;
  }

  .nexo-table td.col-read-actions {
    padding-top: var(--space-2);
    border-top: 1px solid var(--glass-border);
  }

  .table-row-actions {
    width: 100%;
    display: flex;
    gap: 6px;
  }

  .table-row-actions .secondary-btn.compact {
    flex: 1;
    height: 32px;
  }

  .edit-items-table input {
    min-width: 0 !important;
    width: 100% !important;
  }

  .nexo-table td.col-item-action {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding-top: var(--space-2);
    border-top: 1px solid var(--glass-border);
  }

  .payment-grid-card {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .payment-remove-col {
    grid-column: 1 / -1;
    justify-content: flex-end;
  }

  .receipt-row-card {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-3);
  }

  .receipt-row-end {
    justify-content: space-between;
    padding-top: var(--space-2);
    border-top: 1px solid var(--glass-border);
  }

  .details-actions-end,
  .modal-actions-bar,
  .modal-footer-bar {
    flex-direction: column-reverse;
    align-items: stretch;
  }

  .details-actions-end button,
  .modal-actions-bar button,
  .modal-footer-bar > button {
    width: 100%;
  }
}
</style>
