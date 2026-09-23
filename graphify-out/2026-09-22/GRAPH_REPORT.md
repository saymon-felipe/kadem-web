# Graph Report - kadem-web  (2026-09-22)

## Corpus Check
- 148 files · ~178,147 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1535 nodes · 2615 edges · 101 communities (80 shown, 21 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.77)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `48407eae`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KademNexo.vue
- homeView.vue
- RadioFlow.vue
- CategoryCombo.vue
- devDependencies
- financeService.js
- db.js
- KanbanColumn.vue
- PlaylistHeader.vue
- syncService.js
- dependencies
- NexoInvestmentsTab.vue
- PlayerWrapper.vue
- parseCsvWithSchemaEnhanced
- reloadAll
- useVaultStore
- TrackList.vue
- TaskDetailForm.vue
- ProjectKanban.vue
- VideoModal.vue
- NewProject.vue
- authView.vue
- TrackOptionsMenu.vue
- BaseWindow.vue
- PipManager.vue
- ProjectsWindow.vue
- updateTransaction
- MainInformations.vue
- financeRepository.js
- AccountCenter.vue
- MacroCategoryCombo.vue
- Configuration.vue
- headerSystem.vue
- app.js
- kanban.js
- normalize
- StartMenu.vue
- SubscriptionModal.vue
- SearchableDropdown.vue
- HealthCategoryModal.vue
- biometricAuth.js
- QueueSidebar.vue
- ProjectDropdown.vue
- resetPasswordView.vue
- moneyInput
- getPlanLimits
- api.js
- buildCsvExactKey
- auth.js
- switchComponent.vue
- CustomDropdown.vue
- ProjectStatusDropdown.vue
- dateWidget.vue
- SideModal.vue
- ProductivityWindow.vue
- MediaSessionManager
- exclude
- .prettierrc.json
- BaseModal.vue
- close_attachment_preview
- GlobalPlayerHost.vue
- README.md
- snapshot_task
- close_comment_menu
- Como configurar o Background do Modo Escuro no Kadem
- submitBudgetPlan
- download_attachment
- biometricAuth.test.js
- AGENTS.md
- HealthWindow.vue
- LyricsModal.vue
- HealthActionModal.vue
- radioFlowApi.js
- player.js
- scripts
- HealthObjectModal.vue
- HealthRelationModal.vue
- health.js
- package.json
- useAuthStore
- parse_srt
- expandWrappedCsvRow
- moment
- oxlint
- pinia-plugin-persistedstate
- vite-plugin-pwa
- get_clean_task_data

## God Nodes (most connected - your core abstractions)
1. `useAuthStore` - 40 edges
2. `useAppStore` - 23 edges
3. `api` - 21 edges
4. `useUtilsStore` - 18 edges
5. `db` - 17 edges
6. `useVaultStore` - 17 edges
7. `usePlayerStore` - 15 edges
8. `useWindowStore` - 15 edges
9. `normalize()` - 14 edges
10. `reloadAll()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `usePlayerStore` --indirect_call--> `track()`  [INFERRED]
  src/stores/player.js → src/components/radio/LyricsModal.vue
- `setup()` --calls--> `useRadioStore`  [EXTRACTED]
  src/components/radio/PlayerWrapper.vue → src/stores/radio.js
- `beforeUnmount()` --calls--> `useWindowStore`  [EXTRACTED]
  src/components/windows/ProductivityWindow.vue → src/stores/windows.js
- `window_store()` --calls--> `useWindowStore`  [EXTRACTED]
  src/services/radioFlowApi.js → src/stores/windows.js
- `handleResetPassword()` --calls--> `useAuthStore`  [EXTRACTED]
  src/views/authView.vue → src/stores/auth.js

## Import Cycles
- 3-file cycle: `src/services/syncService.js -> src/stores/auth.js -> src/stores/vault.js -> src/services/syncService.js`
- 3-file cycle: `src/router/index.js -> src/views/authView.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/router/index.js -> src/views/homeView.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/router/index.js -> src/views/InviteLanding.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/router/index.js -> src/views/logoutView.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/router/index.js -> src/views/resetPasswordView.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/plugins/api.js -> src/stores/projects.js -> src/stores/utils.js -> src/plugins/api.js`
- 4-file cycle: `src/components/headerSystem.vue -> src/stores/auth.js -> src/router/index.js -> src/views/homeView.vue -> src/components/headerSystem.vue`
- 5-file cycle: `src/components/headerSystem.vue -> src/components/startMenu/StartMenu.vue -> src/stores/auth.js -> src/router/index.js -> src/views/homeView.vue -> src/components/headerSystem.vue`
- 5-file cycle: `src/router/index.js -> src/views/authView.vue -> src/stores/vault.js -> src/services/syncService.js -> src/stores/auth.js -> src/router/index.js`
- 5-file cycle: `src/router/index.js -> src/views/homeView.vue -> src/stores/vault.js -> src/services/syncService.js -> src/stores/auth.js -> src/router/index.js`
- 5-file cycle: `src/components/SubscriptionModal.vue -> src/stores/auth.js -> src/router/index.js -> src/views/homeView.vue -> src/components/headerSystem.vue -> src/components/SubscriptionModal.vue`

## Communities (101 total, 21 thin omitted)

### Community 0 - "KademNexo.vue"
Cohesion: 0.05
Nodes (22): budgetGroupHeaderStyle(), budgetGroupStyle(), calendarDateParts(), categoryTargetMacro(), countCsvDelimiters(), csvImportSummary(), detectCsvDelimiter(), findMacroByName() (+14 more)

### Community 1 - "homeView.vue"
Cohesion: 0.12
Nodes (4): checkIfReady(), handler(), init_connection_monitor(), preloadImage()

### Community 2 - "RadioFlow.vue"
Cohesion: 0.06
Nodes (19): close_search(), delete_track(), execute_add_track(), fetch_search_results(), handle_create_playlist(), handle_delete_playlist(), handle_delete_track(), handle_load_more() (+11 more)

### Community 3 - "CategoryCombo.vue"
Cohesion: 0.05
Nodes (12): close(), filteredCategories(), handleOutsideClick(), handleViewportChange(), normalize(), open(), requestCreate(), sameId() (+4 more)

### Community 4 - "devDependencies"
Cohesion: 0.08
Nodes (25): eslint, @eslint/js, eslint-plugin-oxlint, eslint-plugin-vue, globals, npm-run-all2, devDependencies, eslint (+17 more)

### Community 5 - "financeService.js"
Cohesion: 0.19
Nodes (13): entityMatchesAnyServerId(), entityReferenceIds(), entityServerId(), financeService, findLocalMacro(), isServerId(), pendingDeleteServerIds(), preparePendingMacroUpdate() (+5 more)

### Community 7 - "db.js"
Cohesion: 0.11
Nodes (29): created(), repairStorage(), canUseBrowserStorage(), clearLocalDbIssue(), consumeLocalDbIssue(), createIssuePayload(), createLocalDbUnavailableError(), emitLocalDbIssue() (+21 more)

### Community 8 - "KanbanColumn.vue"
Cohesion: 0.05
Nodes (14): calculate_dropdown_position(), cancel_create_task(), close_assignee_menu(), close_options(), close_search(), emit_delete_request(), handle_click_outside_creation(), handle_create_task() (+6 more)

### Community 10 - "syncService.js"
Cohesion: 0.12
Nodes (33): buildChangesArray(), delay(), deleteFinanceLocalRecord(), _handleAccountTask(), _handleFinanceTask(), _handleHealthTask(), _handleKanbanTask(), _handleProjectTask() (+25 more)

### Community 11 - "dependencies"
Cohesion: 0.08
Nodes (25): axios, dexie, @fortawesome/fontawesome-svg-core, @fortawesome/free-solid-svg-icons, @fortawesome/vue-fontawesome, lodash.isequal, dependencies, axios (+17 more)

### Community 12 - "NexoInvestmentsTab.vue"
Cohesion: 0.09
Nodes (9): createGoalForm(), data(), goalCurrentAmount(), goalProgress(), heroProgressPercent(), heroProgressText(), nearestGoal(), resetGoalForm() (+1 more)

### Community 13 - "PlayerWrapper.vue"
Cohesion: 0.08
Nodes (23): bring_lyrics_to_front(), bring_video_to_front(), format_seconds_to_time(), formatted_current_time(), formatted_duration(), get_current_time(), get_duration(), handle_pip_play_toggle() (+15 more)

### Community 14 - "parseCsvWithSchemaEnhanced"
Cohesion: 0.19
Nodes (16): autoCategorize(), buildCsvObservation(), cleanCsvCell(), findCategoryByName(), findColumnIndex(), handleCsvFileChange(), loadLocalTransactionsForMemory(), normalizeKey() (+8 more)

### Community 15 - "reloadAll"
Cohesion: 0.12
Nodes (27): closeDeleteConfirm(), confirmCsvImport(), confirmDeleteAction(), deleteConnection(), deleteInvestmentEvent(), deleteInvestmentGoal(), loadBudgets(), loadCategories() (+19 more)

### Community 16 - "useVaultStore"
Cohesion: 0.29
Nodes (7): setup(), setup(), base64ToBuffer(), bufferToBase64(), useVaultStore, generate_recovery(), run_migration()

### Community 17 - "TrackList.vue"
Cohesion: 0.08
Nodes (13): create_fallback_thumb(), handle_add_queue(), handle_desktop_dbl_click(), handle_download_lyrics(), handle_row_click(), is_track_unavailable(), mounted(), on_drag_start() (+5 more)

### Community 20 - "VideoModal.vue"
Cohesion: 0.16
Nodes (13): beforeUnmount(), close_modal(), current_time(), exit_fullscreen_if_active(), is_playing(), load_video(), modelValue(), mounted() (+5 more)

### Community 21 - "NewProject.vue"
Cohesion: 0.06
Nodes (12): modelValue(), reset_state(), save_crop(), trigger_input(), checkInviteErrors(), displayList(), handleCancelNewGroup(), handleCreateProject() (+4 more)

### Community 22 - "authView.vue"
Cohesion: 0.13
Nodes (13): biometricDeclinedKey(), auth(), checkBiometricSupport(), checkPasswordStrength(), confirmBiometrics(), declineBiometrics(), finishLogin(), getErrorMessage() (+5 more)

### Community 23 - "TrackOptionsMenu.vue"
Cohesion: 0.13
Nodes (11): beforeUnmount(), cancel_download_menu_close(), close_download_menu_on_hover(), modelValue(), open_download_menu(), open_download_menu_on_hover(), position_download_submenu(), position_video_quality_submenu() (+3 more)

### Community 24 - "BaseWindow.vue"
Cohesion: 0.14
Nodes (5): handleWindowClick(), focus(), startDrag(), startResize(), useWindowStore

### Community 25 - "PipManager.vue"
Cohesion: 0.17
Nodes (14): current_time(), draw_canvas_content(), draw_image_cover(), draw_pause_icon(), draw_play_icon(), draw_round_rect(), fill_text_with_ellipsis(), force_frame_update() (+6 more)

### Community 28 - "updateTransaction"
Cohesion: 0.27
Nodes (11): applyTransactionPatch(), closeTransactionForm(), enrichTransactionForList(), saveTransaction(), selectTransactionCategory(), sortTransactionsList(), toggleIgnored(), transactionBelongsToSelectedMonth() (+3 more)

### Community 29 - "MainInformations.vue"
Cohesion: 0.12
Nodes (4): cancelAddOccupation(), handleAddNewOccupation(), handleSaveBio(), toggleBioEdit()

### Community 30 - "financeRepository.js"
Cohesion: 0.20
Nodes (9): INVESTMENT_FLOW, isServerId(), normalizeCategoryMacroReferences(), normalizeFinanceText(), now(), replaceServerItemsPreservingPending(), sameCategorySignature(), sameFinanceId() (+1 more)

### Community 31 - "AccountCenter.vue"
Cohesion: 0.14
Nodes (8): close_rescue_modal(), handle_rescue(), handleBiometricUnlock(), mounted(), refreshVaultBiometricStatus(), toggleVaultBiometrics(), isBiometricCancellationError(), isBiometricSupported()

### Community 32 - "MacroCategoryCombo.vue"
Cohesion: 0.18
Nodes (11): close(), createValue(), filteredMacros(), handleOutsideClick(), handleViewportChange(), normalize(), open(), select() (+3 more)

### Community 33 - "Configuration.vue"
Cohesion: 0.24
Nodes (11): handlePwaInstall(), loadBiometricStatus(), mounted(), toggleBiometrics(), rememberedEmailKey, removeBiometricCredentials(), getPwaInstallUnavailableMessage(), isIOSDevice() (+3 more)

### Community 34 - "headerSystem.vue"
Cohesion: 0.15
Nodes (3): closeAllPopups(), closeContextMenu(), handleMenuClick()

### Community 35 - "app.js"
Cohesion: 0.16
Nodes (8): handle_save_task(), setTheme(), toggleTheme(), buildThemeStorageKey(), lightThemePaths, resolveThemeUserId(), systemTheme(), useAppStore

### Community 36 - "kanban.js"
Cohesion: 0.29
Nodes (5): api, kanbanRepository, projectRepository, syncService, useUtilsStore

### Community 37 - "normalize"
Cohesion: 0.12
Nodes (23): addBudgetItem(), applyPendingCategorySelection(), availableCategoriesForMacro(), budgetSummary(), buildTransactionSearchText(), categoriesForMacro(), categoryKey(), displayInsights() (+15 more)

### Community 39 - "StartMenu.vue"
Cohesion: 0.18
Nodes (7): closeProjectView(), goToLogoutScreen(), handleLogoutClick(), openCreateProject(), openEditProject(), setActiveTab(), setActiveTabById()

### Community 40 - "SubscriptionModal.vue"
Cohesion: 0.09
Nodes (10): cancel(), handleKeydown(), sanitize(), sanitizedMessage(), check_cpf(), go_to_checkout(), handle_checkout(), request_cancel() (+2 more)

### Community 41 - "SearchableDropdown.vue"
Cohesion: 0.17
Nodes (6): calculate_position(), close(), handle_click_outside(), open(), select_option(), toggle()

### Community 43 - "HealthCategoryModal.vue"
Cohesion: 0.28
Nodes (3): localDate(), resetForm(), visible()

### Community 44 - "biometricAuth.js"
Cohesion: 0.33
Nodes (12): authenticateVaultWithBiometrics(), authenticateVaultWithLocalBiometrics(), authenticateWithBiometrics(), bufferToBase64Url(), credentialForVerification(), getBiometricStatus(), getWebAuthn(), prepareVaultBiometricUnlock() (+4 more)

### Community 45 - "QueueSidebar.vue"
Cohesion: 0.15
Nodes (3): setup(), usePlayerStore, decode_html_entities()

### Community 47 - "resetPasswordView.vue"
Cohesion: 0.05
Nodes (20): beginGlobalDrag(), endGlobalDrag(), resetGlobalDrag(), setGlobalDragging(), vAnimateHeight, app, pinia, utils_store (+12 more)

### Community 48 - "moneyInput"
Cohesion: 0.22
Nodes (11): deleteTransaction(), money(), moneyInput(), openConfirmation(), openTransactionForm(), parseMoneyInput(), requestDeleteTransaction(), signedMoney() (+3 more)

### Community 49 - "getPlanLimits"
Cohesion: 0.20
Nodes (10): limits(), plan_limits(), video_quality_options(), can_download_individually(), plan_limits(), video_quality_options(), getOfflineVideoQualities(), getPlanLimits() (+2 more)

### Community 50 - "api.js"
Cohesion: 0.13
Nodes (11): check_system_health(), CSRF_EXEMPT_PATHS, ensureCsrfToken(), getCookie(), isCsrfExempt(), MUTATION_METHODS, normalizePath(), url_api (+3 more)

### Community 51 - "buildCsvExactKey"
Cohesion: 0.31
Nodes (10): buildCsvExactKey(), buildCsvLegacyKey(), buildTransactionCandidateMaps(), consumeCandidate(), csvAmountKey(), csvDateOnly(), csvHasMeaningfulTime(), filterCsvDuplicates() (+2 more)

### Community 52 - "auth.js"
Cohesion: 0.25
Nodes (13): canUseLocalStorage(), clearSessionRefresh(), getLastSessionRefresh(), getSessionRefreshRemainingMs(), hasValidSessionRefresh(), markSessionRefreshed(), restoreSessionRefreshFromTimestamp(), SESSION_MAX_AGE_MS (+5 more)

### Community 53 - "switchComponent.vue"
Cohesion: 0.28
Nodes (3): handler(), mounted(), setIndicatorStyle()

### Community 62 - "exclude"
Cohesion: 0.33
Nodes (5): compilerOptions, paths, exclude, dist, node_modules

### Community 64 - ".prettierrc.json"
Cohesion: 0.40
Nodes (4): printWidth, $schema, semi, singleQuote

### Community 67 - "close_attachment_preview"
Cohesion: 0.40
Nodes (5): attachment_icon(), beforeUnmount(), close_attachment_preview(), get_attachment_kind(), open_attachment()

### Community 68 - "GlobalPlayerHost.vue"
Cohesion: 0.47
Nodes (3): create_yt_player(), init_youtube_api(), mounted()

### Community 69 - "README.md"
Cohesion: 0.50
Nodes (3): ✨ Funcionalidades Principais, 📌 Sobre o Projeto, 🛠️ Tecnologias Utilizadas

### Community 70 - "snapshot_task"
Cohesion: 0.67
Nodes (4): apply_responsible_change(), handler(), snapshot_task(), sync_responsible_wrapper()

### Community 71 - "close_comment_menu"
Cohesion: 0.50
Nodes (4): close_comment_menu(), delete_comment(), edit_comment(), handle_global_click()

### Community 74 - "submitBudgetPlan"
Cohesion: 0.14
Nodes (14): addBudgetGroup(), appendBudgetAiMessage(), budgetAiStorageKey(), hydrateBudgetGroup(), loadBudgetAiConversation(), loadInsights(), loadUsage(), openBudgetPlanModal() (+6 more)

### Community 75 - "download_attachment"
Cohesion: 0.67
Nodes (3): download_attachment(), get_attachment_download_name(), trigger_browser_download()

### Community 80 - "HealthWindow.vue"
Cohesion: 0.07
Nodes (7): dueDays(), isLowStock(), lowStockCount(), nextDueClass(), nextDueIcon(), scheduleDueClass(), scheduleDueIcon()

### Community 83 - "LyricsModal.vue"
Cohesion: 0.31
Nodes (12): active_index(), check_scroll_position(), close_modal(), current_time(), get_track_key(), handle_scroll(), handler(), modelValue() (+4 more)

### Community 84 - "HealthActionModal.vue"
Cohesion: 0.20
Nodes (3): localDateTime(), resetForm(), visible()

### Community 85 - "radioFlowApi.js"
Cohesion: 0.47
Nodes (5): player_store(), RADIO_FLOW_WINDOW, radio_store(), state_snapshot(), window_store()

### Community 86 - "player.js"
Cohesion: 0.25
Nodes (6): db, runDbOperation(), apiServices, occupationRepository, radioRepository, syncQueueRepository

### Community 88 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, dev, format, lint, lint:eslint, lint:oxlint, preview (+1 more)

### Community 89 - "HealthObjectModal.vue"
Cohesion: 0.28
Nodes (3): localDate(), resetForm(), visible()

### Community 91 - "health.js"
Cohesion: 0.22
Nodes (9): healthRepository, addInterval(), controlFields, DEFAULT_HEALTH_UNITS, HEALTH_RECORD_TYPES, localKey(), now(), syncPayload() (+1 more)

### Community 92 - "package.json"
Cohesion: 0.29
Nodes (6): engines, node, name, private, type, version

### Community 93 - "useAuthStore"
Cohesion: 0.28
Nodes (7): setup(), data(), _handleDownloadLyricsTask(), syncHealthDelta(), useAuthStore, useRadioStore, mounted()

### Community 94 - "parse_srt"
Cohesion: 0.83
Nodes (3): clean_text(), parse_srt(), time_to_seconds()

### Community 98 - "expandWrappedCsvRow"
Cohesion: 0.83
Nodes (4): expandWrappedCsvRow(), isWrappedCsvRow(), normalizeParsedCsvRows(), splitCsvLine()

## Knowledge Gaps
- **85 isolated node(s):** `$schema`, `semi`, `singleQuote`, `printWidth`, `paths` (+80 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAuthStore` connect `useAuthStore` to `KademNexo.vue`, `homeView.vue`, `KanbanColumn.vue`, `PlaylistHeader.vue`, `syncService.js`, `useVaultStore`, `TrackList.vue`, `TaskDetailForm.vue`, `ProjectKanban.vue`, `NewProject.vue`, `authView.vue`, `BaseWindow.vue`, `MainInformations.vue`, `AccountCenter.vue`, `Configuration.vue`, `headerSystem.vue`, `kanban.js`, `StartMenu.vue`, `SubscriptionModal.vue`, `resetPasswordView.vue`, `api.js`, `auth.js`, `player.js`, `health.js`?**
  _High betweenness centrality (0.129) - this node is a cross-community bridge._
- **Why does `db` connect `player.js` to `KademNexo.vue`, `RadioFlow.vue`, `kanban.js`, `db.js`, `syncService.js`, `PlayerWrapper.vue`, `api.js`, `health.js`, `financeRepository.js`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `usePlayerStore` connect `QueueSidebar.vue` to `RadioFlow.vue`, `GlobalPlayerHost.vue`, `PlayerWrapper.vue`, `TrackList.vue`, `LyricsModal.vue`, `VideoModal.vue`, `radioFlowApi.js`, `auth.js`, `player.js`, `radioFlowWidget.vue`, `ProductivityWindow.vue`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **What connects `$schema`, `semi`, `singleQuote` to the rest of the system?**
  _85 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `KademNexo.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.05254901960784314 - nodes in this community are weakly interconnected._
- **Should `homeView.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.12418300653594772 - nodes in this community are weakly interconnected._
- **Should `RadioFlow.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.058279370952821465 - nodes in this community are weakly interconnected._