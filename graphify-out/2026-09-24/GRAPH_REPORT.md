# Graph Report - kadem-web  (2026-09-24)

## Corpus Check
- 170 files · ~202,308 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1777 nodes · 3026 edges · 123 communities (96 shown, 27 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.74)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0c9ecc70`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- HealthTrackingInsights.vue
- NexoInvestmentsTab.vue
- KademNexo.vue
- KanbanColumn.vue
- RadioFlow.vue
- CategoryCombo.vue
- NewProject.vue
- LyricsModal.vue
- PlayerWrapper.vue
- api
- homeView.vue
- syncService.js
- db.js
- TrackList.vue
- PlaylistHeader.vue
- resetPasswordView.vue
- headerSystem.vue
- reloadAll
- useVaultStore
- SubscriptionModal.vue
- dependencies
- devDependencies
- HealthCheckinModal.vue
- BaseWindow.vue
- ProjectKanban.vue
- authView.vue
- TrackOptionsMenu.vue
- normalize
- VideoModal.vue
- AccountCenter.vue
- PipManager.vue
- parseCsvWithSchemaEnhanced
- BaseModal.vue
- StartMenu.vue
- MainInformations.vue
- financeService.js
- app.js
- updateTransaction
- MacroCategoryCombo.vue
- radioFlowApi.js
- health.js
- Configuration.vue
- SearchableDropdown.vue
- financeRepository.js
- submitBudgetPlan
- getPlanLimits
- useAuthStore
- HealthActionModal.vue
- ProjectDropdown.vue
- QueueSidebar.vue
- biometricAuth.js
- healthGroups.test.js
- global.js
- buildCsvExactKey
- vault.js
- auth.js
- scripts
- HealthCategoryModal.vue
- HealthObjectModal.vue
- switchComponent.vue
- CustomDropdown.vue
- moneyInput
- HealthRelationModal.vue
- HealthTrackerGroupModal.vue
- HealthTrackerModal.vue
- ProjectStatusDropdown.vue
- package.json
- ConfirmationModal.vue
- MediaSessionManager
- exclude
- .prettierrc.json
- close_attachment_preview
- dueDays
- README.md
- snapshot_task
- close_comment_menu
- player.js
- Como configurar o Background do Modo Escuro no Kadem
- download_attachment
- loadAiUsage
- biometricAuth.test.js
- AGENTS.md
- globals
- moment
- AccountList.vue
- api.js
- HealthPublicCardTab.vue
- cancel_edit_comment
- get_clean_task_data
- cancelArchiveTracker
- cancelDeleteEvent
- cancelDeleteTrackerGroup
- isLowStock
- dateWidget.vue
- main.js
- ImageCropperModal.vue
- HealthPublicCardView.vue
- logoutView.vue
- GlobalPlayerHost.vue
- setupIntersectionObserver
- @fortawesome/free-solid-svg-icons
- oxlint
- vue
- vite-plugin-vue-devtools

## God Nodes (most connected - your core abstractions)
1. `useAuthStore` - 42 edges
2. `api` - 24 edges
3. `useAppStore` - 23 edges
4. `useVaultStore` - 21 edges
5. `useUtilsStore` - 18 edges
6. `db` - 17 edges
7. `usePlayerStore` - 15 edges
8. `useWindowStore` - 15 edges
9. `normalize()` - 14 edges
10. `reloadAll()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `handleWindowClick()` --calls--> `useWindowStore`  [EXTRACTED]
  src/components/headerSystem.vue → src/stores/windows.js
- `usePlayerStore` --indirect_call--> `track()`  [INFERRED]
  src/stores/player.js → src/components/radio/LyricsModal.vue
- `setup()` --calls--> `useRadioStore`  [EXTRACTED]
  src/components/radio/PlayerWrapper.vue → src/stores/radio.js
- `setup()` --calls--> `useVaultStore`  [EXTRACTED]
  src/components/startMenu/AccountCenter/AccountList.vue → src/stores/vault.js
- `window_store()` --calls--> `useWindowStore`  [EXTRACTED]
  src/services/radioFlowApi.js → src/stores/windows.js

## Import Cycles
- 3-file cycle: `src/services/syncService.js -> src/stores/auth.js -> src/stores/vault.js -> src/services/syncService.js`
- 3-file cycle: `src/router/index.js -> src/views/authView.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/router/index.js -> src/views/homeView.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/router/index.js -> src/views/InviteLanding.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/router/index.js -> src/views/logoutView.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/router/index.js -> src/views/resetPasswordView.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/plugins/api.js -> src/stores/projects.js -> src/stores/utils.js -> src/plugins/api.js`
- 4-file cycle: `src/components/headerSystem.vue -> src/stores/auth.js -> src/router/index.js -> src/views/homeView.vue -> src/components/headerSystem.vue`
- 5-file cycle: `src/router/index.js -> src/views/authView.vue -> src/stores/vault.js -> src/services/syncService.js -> src/stores/auth.js -> src/router/index.js`
- 5-file cycle: `src/router/index.js -> src/views/homeView.vue -> src/stores/vault.js -> src/services/syncService.js -> src/stores/auth.js -> src/router/index.js`
- 5-file cycle: `src/components/SubscriptionModal.vue -> src/stores/auth.js -> src/router/index.js -> src/views/homeView.vue -> src/components/headerSystem.vue -> src/components/SubscriptionModal.vue`
- 5-file cycle: `src/components/headerSystem.vue -> src/components/startMenu/StartMenu.vue -> src/stores/auth.js -> src/router/index.js -> src/views/homeView.vue -> src/components/headerSystem.vue`
- 5-file cycle: `src/components/headerSystem.vue -> src/stores/aiCredits.js -> src/stores/auth.js -> src/router/index.js -> src/views/homeView.vue -> src/components/headerSystem.vue`

## Communities (123 total, 27 thin omitted)

### Community 0 - "HealthTrackingInsights.vue"
Cohesion: 0.05
Nodes (18): patterns(), runComparison(), selectedSummary(), hasRecordedValue(), latestValue(), trackerSummaryData(), latestValueDisplay(), recentCount() (+10 more)

### Community 1 - "NexoInvestmentsTab.vue"
Cohesion: 0.05
Nodes (15): createGoalForm(), data(), goalCurrentAmount(), goalProgress(), heroProgressPercent(), heroProgressText(), nearestGoal(), resetGoalForm() (+7 more)

### Community 2 - "KademNexo.vue"
Cohesion: 0.05
Nodes (19): budgetGroupHeaderStyle(), budgetGroupStyle(), calendarDateParts(), categoryTargetMacro(), countCsvDelimiters(), csvImportSummary(), detectCsvDelimiter(), findMacroByName() (+11 more)

### Community 3 - "KanbanColumn.vue"
Cohesion: 0.05
Nodes (14): calculate_dropdown_position(), cancel_create_task(), close_assignee_menu(), close_options(), close_search(), emit_delete_request(), handle_click_outside_creation(), handle_create_task() (+6 more)

### Community 4 - "RadioFlow.vue"
Cohesion: 0.06
Nodes (19): close_search(), delete_track(), execute_add_track(), fetch_search_results(), handle_create_playlist(), handle_delete_playlist(), handle_delete_track(), handle_load_more() (+11 more)

### Community 5 - "CategoryCombo.vue"
Cohesion: 0.05
Nodes (12): close(), filteredCategories(), handleOutsideClick(), handleViewportChange(), normalize(), open(), requestCreate(), sameId() (+4 more)

### Community 7 - "NewProject.vue"
Cohesion: 0.11
Nodes (8): checkInviteErrors(), displayList(), handleCancelNewGroup(), handleCreateProject(), handleDeleteProject(), handleSave(), handleUpdateProject(), isMemberOwner()

### Community 9 - "LyricsModal.vue"
Cohesion: 0.12
Nodes (27): active_index(), check_scroll_position(), close_modal(), current_time(), get_track_key(), handle_scroll(), handler(), modelValue() (+19 more)

### Community 10 - "PlayerWrapper.vue"
Cohesion: 0.08
Nodes (23): bring_lyrics_to_front(), bring_video_to_front(), format_seconds_to_time(), formatted_current_time(), formatted_duration(), get_current_time(), get_duration(), handle_pip_play_toggle() (+15 more)

### Community 11 - "api"
Cohesion: 0.20
Nodes (8): api, kanbanRepository, projectRepository, SUBSCRIPTION_PLANS, VIDEO_RESOLUTIONS, syncService, useKanbanStore, useUtilsStore

### Community 12 - "homeView.vue"
Cohesion: 0.12
Nodes (4): checkIfReady(), handler(), init_connection_monitor(), preloadImage()

### Community 13 - "syncService.js"
Cohesion: 0.12
Nodes (33): buildChangesArray(), delay(), deleteFinanceLocalRecord(), _handleAccountTask(), _handleFinanceTask(), _handleHealthTask(), _handleKanbanTask(), _handleProjectTask() (+25 more)

### Community 14 - "db.js"
Cohesion: 0.11
Nodes (29): created(), repairStorage(), canUseBrowserStorage(), clearLocalDbIssue(), consumeLocalDbIssue(), createIssuePayload(), createLocalDbUnavailableError(), emitLocalDbIssue() (+21 more)

### Community 15 - "TrackList.vue"
Cohesion: 0.09
Nodes (10): create_fallback_thumb(), handle_add_queue(), handle_desktop_dbl_click(), handle_download_lyrics(), handle_row_click(), is_track_unavailable(), on_drag_start(), track_has_lyrics() (+2 more)

### Community 17 - "resetPasswordView.vue"
Cohesion: 0.14
Nodes (5): mounted(), resetResponse(), setResponse(), submitReset(), validateToken()

### Community 19 - "headerSystem.vue"
Cohesion: 0.11
Nodes (14): ai_credits_remaining(), ai_credits_total(), ai_credits_used(), closeAllPopups(), closeContextMenu(), handleMenuClick(), handler(), handleWindowClick() (+6 more)

### Community 20 - "reloadAll"
Cohesion: 0.12
Nodes (27): closeDeleteConfirm(), confirmCsvImport(), confirmDeleteAction(), deleteConnection(), deleteInvestmentEvent(), deleteInvestmentGoal(), loadBudgets(), loadCategories() (+19 more)

### Community 21 - "useVaultStore"
Cohesion: 0.18
Nodes (6): handleGenerateRecovery(), handleMigration(), handleRescue(), base64ToBuffer(), bufferToBase64(), useVaultStore

### Community 22 - "SubscriptionModal.vue"
Cohesion: 0.17
Nodes (6): check_cpf(), go_to_checkout(), handle_checkout(), request_cancel(), requestClose(), resetState()

### Community 23 - "dependencies"
Cohesion: 0.08
Nodes (25): axios, dexie, @fortawesome/fontawesome-svg-core, @fortawesome/vue-fontawesome, lodash.isequal, dependencies, axios, dexie (+17 more)

### Community 24 - "devDependencies"
Cohesion: 0.08
Nodes (25): eslint, @eslint/js, eslint-plugin-oxlint, eslint-plugin-vue, fake-indexeddb, npm-run-all2, devDependencies, eslint (+17 more)

### Community 25 - "HealthCheckinModal.vue"
Cohesion: 0.10
Nodes (10): clearAll(), clearField(), filledCount(), hasValue(), localDateTime(), parsedTags(), removeTag(), reset() (+2 more)

### Community 27 - "BaseWindow.vue"
Cohesion: 0.12
Nodes (6): focus(), startDrag(), startResize(), windowComponentMap, beforeUnmount(), useWindowStore

### Community 29 - "authView.vue"
Cohesion: 0.13
Nodes (14): biometricDeclinedKey(), rememberedEmailKey, auth(), checkBiometricSupport(), checkPasswordStrength(), confirmBiometrics(), declineBiometrics(), finishLogin() (+6 more)

### Community 30 - "TrackOptionsMenu.vue"
Cohesion: 0.13
Nodes (11): beforeUnmount(), cancel_download_menu_close(), close_download_menu_on_hover(), modelValue(), open_download_menu(), open_download_menu_on_hover(), position_download_submenu(), position_video_quality_submenu() (+3 more)

### Community 31 - "normalize"
Cohesion: 0.12
Nodes (22): addBudgetItem(), availableCategoriesForMacro(), budgetSummary(), buildTransactionSearchText(), categoriesForMacro(), categoryKey(), displayInsights(), filteredCategories() (+14 more)

### Community 32 - "VideoModal.vue"
Cohesion: 0.17
Nodes (13): beforeUnmount(), close_modal(), current_time(), exit_fullscreen_if_active(), is_playing(), load_video(), modelValue(), mounted() (+5 more)

### Community 33 - "AccountCenter.vue"
Cohesion: 0.14
Nodes (8): handleBiometricUnlock(), handleCloseModal(), handleSaveNewAccount(), mounted(), refreshVaultBiometricStatus(), toggleVaultBiometrics(), isBiometricCancellationError(), isBiometricSupported()

### Community 34 - "PipManager.vue"
Cohesion: 0.17
Nodes (14): current_time(), draw_canvas_content(), draw_image_cover(), draw_pause_icon(), draw_play_icon(), draw_round_rect(), fill_text_with_ellipsis(), force_frame_update() (+6 more)

### Community 35 - "parseCsvWithSchemaEnhanced"
Cohesion: 0.15
Nodes (20): autoCategorize(), buildCsvObservation(), cleanCsvCell(), expandWrappedCsvRow(), findCategoryByName(), findColumnIndex(), handleCsvFileChange(), isWrappedCsvRow() (+12 more)

### Community 36 - "BaseModal.vue"
Cohesion: 0.21
Nodes (11): beforeUnmount(), close(), destroyObservers(), handleKeydown(), handler(), handleResize(), initObservers(), onBackdropClick() (+3 more)

### Community 37 - "StartMenu.vue"
Cohesion: 0.18
Nodes (7): closeProjectView(), goToLogoutScreen(), handleLogoutClick(), openCreateProject(), openEditProject(), setActiveTab(), setActiveTabById()

### Community 38 - "MainInformations.vue"
Cohesion: 0.12
Nodes (4): cancelAddOccupation(), handleAddNewOccupation(), handleSaveBio(), toggleBioEdit()

### Community 39 - "financeService.js"
Cohesion: 0.19
Nodes (13): entityMatchesAnyServerId(), entityReferenceIds(), entityServerId(), financeService, findLocalMacro(), isServerId(), pendingDeleteServerIds(), preparePendingMacroUpdate() (+5 more)

### Community 40 - "app.js"
Cohesion: 0.15
Nodes (9): handle_save_task(), setup(), setTheme(), toggleTheme(), buildThemeStorageKey(), lightThemePaths, resolveThemeUserId(), systemTheme() (+1 more)

### Community 41 - "updateTransaction"
Cohesion: 0.16
Nodes (18): applyPendingCategorySelection(), applyTransactionPatch(), closeTransactionForm(), deleteTransaction(), enrichTransactionForList(), openConfirmation(), removeTransactionFromList(), requestDeleteTransaction() (+10 more)

### Community 43 - "MacroCategoryCombo.vue"
Cohesion: 0.18
Nodes (11): close(), createValue(), filteredMacros(), handleOutsideClick(), handleViewportChange(), normalize(), open(), select() (+3 more)

### Community 44 - "radioFlowApi.js"
Cohesion: 0.31
Nodes (8): setup(), player_store(), RADIO_FLOW_WINDOW, radio_store(), radioFlowApi, state_snapshot(), window_store(), usePlayerStore

### Community 45 - "health.js"
Cohesion: 0.24
Nodes (10): DIGESTIVE_WELLBEING_TEMPLATE, addInterval(), controlFields, DEFAULT_HEALTH_UNITS, DEFAULT_TRACKER_GROUPS, HEALTH_RECORD_TYPES, localKey(), now() (+2 more)

### Community 47 - "Configuration.vue"
Cohesion: 0.25
Nodes (11): handlePwaInstall(), loadBiometricStatus(), mounted(), toggleBiometrics(), getBiometricStatus(), removeBiometricCredentials(), getPwaInstallUnavailableMessage(), isIOSDevice() (+3 more)

### Community 48 - "SearchableDropdown.vue"
Cohesion: 0.17
Nodes (6): calculate_position(), close(), handle_click_outside(), open(), select_option(), toggle()

### Community 49 - "financeRepository.js"
Cohesion: 0.20
Nodes (9): INVESTMENT_FLOW, isServerId(), normalizeCategoryMacroReferences(), normalizeFinanceText(), now(), replaceServerItemsPreservingPending(), sameCategorySignature(), sameFinanceId() (+1 more)

### Community 50 - "submitBudgetPlan"
Cohesion: 0.14
Nodes (14): addBudgetGroup(), appendBudgetAiMessage(), budgetAiStorageKey(), hydrateBudgetGroup(), loadBudgetAiConversation(), loadInsights(), loadUsage(), openBudgetPlanModal() (+6 more)

### Community 52 - "getPlanLimits"
Cohesion: 0.22
Nodes (9): limits(), plan_limits(), video_quality_options(), can_download_individually(), plan_limits(), video_quality_options(), limits(), getOfflineVideoQualities() (+1 more)

### Community 53 - "useAuthStore"
Cohesion: 0.27
Nodes (4): data(), syncHealthDelta(), useAuthStore, mounted()

### Community 54 - "HealthActionModal.vue"
Cohesion: 0.20
Nodes (3): localDateTime(), resetForm(), visible()

### Community 57 - "biometricAuth.js"
Cohesion: 0.36
Nodes (11): authenticateVaultWithBiometrics(), authenticateVaultWithLocalBiometrics(), authenticateWithBiometrics(), bufferToBase64Url(), credentialForVerification(), getWebAuthn(), prepareVaultBiometricUnlock(), registerBiometricCredential() (+3 more)

### Community 58 - "healthGroups.test.js"
Cohesion: 0.18
Nodes (3): mockLocalStorage, mockLocation, storage

### Community 59 - "global.js"
Cohesion: 0.27
Nodes (4): beginGlobalDrag(), endGlobalDrag(), resetGlobalDrag(), setGlobalDragging()

### Community 60 - "buildCsvExactKey"
Cohesion: 0.31
Nodes (10): buildCsvExactKey(), buildCsvLegacyKey(), buildTransactionCandidateMaps(), consumeCandidate(), csvAmountKey(), csvDateOnly(), csvHasMeaningfulTime(), filterCsvDuplicates() (+2 more)

### Community 62 - "vault.js"
Cohesion: 0.17
Nodes (10): db, runDbOperation(), accountsRepository, healthRepository, medalRepository, occupationRepository, syncQueueRepository, userRepository (+2 more)

### Community 63 - "auth.js"
Cohesion: 0.35
Nodes (10): canUseLocalStorage(), clearSessionRefresh(), getLastSessionRefresh(), getSessionRefreshRemainingMs(), hasValidSessionRefresh(), markSessionRefreshed(), restoreSessionRefreshFromTimestamp(), SESSION_MAX_AGE_MS (+2 more)

### Community 64 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, dev, format, lint, lint:eslint, lint:oxlint, preview (+1 more)

### Community 65 - "HealthCategoryModal.vue"
Cohesion: 0.28
Nodes (3): localDate(), resetForm(), visible()

### Community 66 - "HealthObjectModal.vue"
Cohesion: 0.28
Nodes (3): localDate(), resetForm(), visible()

### Community 67 - "switchComponent.vue"
Cohesion: 0.28
Nodes (3): handler(), mounted(), setIndicatorStyle()

### Community 69 - "moneyInput"
Cohesion: 0.32
Nodes (8): money(), moneyInput(), openTransactionForm(), parseMoneyInput(), signedMoney(), updateBudgetAmount(), updateBudgetGroupAmount(), updateTransactionAmount()

### Community 71 - "HealthTrackerGroupModal.vue"
Cohesion: 0.32
Nodes (5): AVAILABLE_COLORS, AVAILABLE_ICONS, group(), reset(), visible()

### Community 72 - "HealthTrackerModal.vue"
Cohesion: 0.32
Nodes (4): reset(), tracker(), VALUE_TYPES, visible()

### Community 75 - "package.json"
Cohesion: 0.29
Nodes (6): engines, node, name, private, type, version

### Community 79 - "exclude"
Cohesion: 0.33
Nodes (5): compilerOptions, paths, exclude, dist, node_modules

### Community 81 - ".prettierrc.json"
Cohesion: 0.40
Nodes (4): printWidth, $schema, semi, singleQuote

### Community 82 - "close_attachment_preview"
Cohesion: 0.40
Nodes (5): attachment_icon(), beforeUnmount(), close_attachment_preview(), get_attachment_kind(), open_attachment()

### Community 83 - "dueDays"
Cohesion: 0.40
Nodes (5): dueDays(), nextDueClass(), nextDueIcon(), scheduleDueClass(), scheduleDueIcon()

### Community 84 - "README.md"
Cohesion: 0.50
Nodes (3): ✨ Funcionalidades Principais, 📌 Sobre o Projeto, 🛠️ Tecnologias Utilizadas

### Community 85 - "snapshot_task"
Cohesion: 0.67
Nodes (4): apply_responsible_change(), handler(), snapshot_task(), sync_responsible_wrapper()

### Community 86 - "close_comment_menu"
Cohesion: 0.50
Nodes (4): close_comment_menu(), delete_comment(), edit_comment(), handle_global_click()

### Community 87 - "player.js"
Cohesion: 0.24
Nodes (8): setup(), apiServices, radioRepository, _handleDownloadLyricsTask(), useRadioStore, clean_text(), parse_srt(), time_to_seconds()

### Community 89 - "download_attachment"
Cohesion: 0.67
Nodes (3): download_attachment(), get_attachment_download_name(), trigger_browser_download()

### Community 90 - "loadAiUsage"
Cohesion: 0.67
Nodes (3): activeTab(), loadAiUsage(), mounted()

### Community 98 - "api.js"
Cohesion: 0.22
Nodes (8): check_system_health(), CSRF_EXEMPT_PATHS, ensureCsrfToken(), getCookie(), isCsrfExempt(), MUTATION_METHODS, normalizePath(), url_api

### Community 99 - "HealthPublicCardTab.vue"
Cohesion: 0.33
Nodes (6): data(), emptyCard(), loadSettings(), mounted(), refreshQr(), save()

### Community 110 - "main.js"
Cohesion: 0.24
Nodes (6): vAnimateHeight, app, pinia, utils_store, router, routes

### Community 111 - "ImageCropperModal.vue"
Cohesion: 0.32
Nodes (4): modelValue(), reset_state(), save_crop(), trigger_input()

### Community 115 - "logoutView.vue"
Cohesion: 0.38
Nodes (4): beforeUnmount(), cleanupTimers(), mounted(), startLogoutSequence()

### Community 116 - "GlobalPlayerHost.vue"
Cohesion: 0.47
Nodes (3): create_yt_player(), init_youtube_api(), mounted()

### Community 118 - "setupIntersectionObserver"
Cohesion: 0.67
Nodes (3): mounted(), setupIntersectionObserver(), updated()

## Knowledge Gaps
- **97 isolated node(s):** `$schema`, `semi`, `singleQuote`, `printWidth`, `paths` (+92 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **27 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAuthStore` connect `useAuthStore` to `KademNexo.vue`, `KanbanColumn.vue`, `HealthWindow.vue`, `NewProject.vue`, `api`, `homeView.vue`, `syncService.js`, `TrackList.vue`, `PlaylistHeader.vue`, `resetPasswordView.vue`, `TaskDetailForm.vue`, `headerSystem.vue`, `SubscriptionModal.vue`, `BaseWindow.vue`, `ProjectKanban.vue`, `authView.vue`, `AccountCenter.vue`, `StartMenu.vue`, `MainInformations.vue`, `app.js`, `health.js`, `Configuration.vue`, `auth.js`, `player.js`, `avatarComponent.vue`, `logoutView.vue`?**
  _High betweenness centrality (0.123) - this node is a cross-community bridge._
- **Why does `usePlayerStore` connect `radioFlowApi.js` to `VideoModal.vue`, `RadioFlow.vue`, `LyricsModal.vue`, `PlayerWrapper.vue`, `radioFlowWidget.vue`, `TrackList.vue`, `GlobalPlayerHost.vue`, `player.js`, `QueueSidebar.vue`, `BaseWindow.vue`, `auth.js`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `db` connect `vault.js` to `KademNexo.vue`, `RadioFlow.vue`, `PlayerWrapper.vue`, `api`, `syncService.js`, `db.js`, `financeRepository.js`, `player.js`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **What connects `$schema`, `semi`, `singleQuote` to the rest of the system?**
  _97 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `HealthTrackingInsights.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.052597402597402594 - nodes in this community are weakly interconnected._
- **Should `NexoInvestmentsTab.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.05272108843537415 - nodes in this community are weakly interconnected._
- **Should `KademNexo.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.054078014184397165 - nodes in this community are weakly interconnected._