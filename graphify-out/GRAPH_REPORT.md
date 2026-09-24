# Graph Report - kadem-web  (2026-09-24)

## Corpus Check
- 167 files · ~199,788 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1757 nodes · 2995 edges · 110 communities (91 shown, 19 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.74)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c512de66`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- VideoModal.vue
- db.js
- KademNexo.vue
- PipManager.vue
- NexoInvestmentsTab.vue
- KanbanColumn.vue
- RadioFlow.vue
- CategoryCombo.vue
- HealthWindow.vue
- ProjectKanban.vue
- HealthTrackingInsights.vue
- NewProject.vue
- PlayerWrapper.vue
- homeView.vue
- syncService.js
- authView.vue
- vault.js
- PlaylistHeader.vue
- TrackList.vue
- dependencies
- devDependencies
- reloadAll
- TrackOptionsMenu.vue
- normalize
- app.js
- parseCsvWithSchemaEnhanced
- ProductivityWindow.vue
- MainInformations.vue
- financeService.js
- updateTransaction
- AccountCenter.vue
- BaseModal.vue
- MacroCategoryCombo.vue
- Configuration.vue
- HealthTrackingTab.vue
- headerSystem.vue
- StartMenu.vue
- db
- SearchableDropdown.vue
- submitBudgetPlan
- player.js
- BaseWindow.vue
- HealthActionModal.vue
- biometricAuth.js
- main.js
- SubscriptionModal.vue
- getPlanLimits
- useAuthStore
- api.js
- health.js
- ProjectDropdown.vue
- buildCsvExactKey
- auth.js
- scripts
- HealthCategoryModal.vue
- HealthObjectModal.vue
- switchComponent.vue
- CustomDropdown.vue
- moneyInput
- HealthRelationModal.vue
- QueueSidebar.vue
- package.json
- HealthCheckinModal.vue
- MediaSessionManager
- exclude
- HealthTrackerModal.vue
- .prettierrc.json
- close_attachment_preview
- is_track_unavailable
- README.md
- snapshot_task
- close_comment_menu
- Como configurar o Background do Modo Escuro no Kadem
- download_attachment
- biometricAuth.test.js
- AGENTS.md
- moment
- healthGroups.test.js
- @vitejs/plugin-vue
- @vue/eslint-config-prettier
- cancel_edit_comment
- get_clean_task_data
- HealthTrackingOverview.vue
- healthInsights.js
- ProjectStatusDropdown.vue
- HealthTrackerGroupModal.vue
- ImageCropperModal.vue
- start_ticker
- handleCancelNewGroup
- dueDays
- loadAiUsage
- eslint-plugin-vue
- vuedraggable

## God Nodes (most connected - your core abstractions)
1. `useAuthStore` - 42 edges
2. `api` - 23 edges
3. `useAppStore` - 23 edges
4. `useVaultStore` - 21 edges
5. `useUtilsStore` - 18 edges
6. `db` - 17 edges
7. `usePlayerStore` - 15 edges
8. `useWindowStore` - 15 edges
9. `normalize()` - 14 edges
10. `reloadAll()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `patterns()` --calls--> `findPatterns()`  [EXTRACTED]
  src/components/health/HealthTrackingInsights.vue → src/services/healthInsights.js
- `runComparison()` --calls--> `comparePattern()`  [EXTRACTED]
  src/components/health/HealthTrackingInsights.vue → src/services/healthInsights.js
- `explainWithAi()` --calls--> `useAiCreditsStore`  [EXTRACTED]
  src/components/health/HealthTrackingInsights.vue → src/stores/aiCredits.js
- `usePlayerStore` --indirect_call--> `track()`  [INFERRED]
  src/stores/player.js → src/components/radio/LyricsModal.vue
- `setup()` --calls--> `usePlayerStore`  [EXTRACTED]
  src/components/radio/VideoModal.vue → src/stores/player.js

## Import Cycles
- 3-file cycle: `src/router/index.js -> src/views/logoutView.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/services/syncService.js -> src/stores/auth.js -> src/stores/vault.js -> src/services/syncService.js`
- 3-file cycle: `src/router/index.js -> src/views/homeView.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/router/index.js -> src/views/authView.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/router/index.js -> src/views/InviteLanding.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/router/index.js -> src/views/resetPasswordView.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/plugins/api.js -> src/stores/projects.js -> src/stores/utils.js -> src/plugins/api.js`
- 4-file cycle: `src/components/headerSystem.vue -> src/stores/auth.js -> src/router/index.js -> src/views/homeView.vue -> src/components/headerSystem.vue`
- 5-file cycle: `src/router/index.js -> src/views/authView.vue -> src/stores/vault.js -> src/services/syncService.js -> src/stores/auth.js -> src/router/index.js`
- 5-file cycle: `src/router/index.js -> src/views/homeView.vue -> src/stores/vault.js -> src/services/syncService.js -> src/stores/auth.js -> src/router/index.js`
- 5-file cycle: `src/components/SubscriptionModal.vue -> src/stores/auth.js -> src/router/index.js -> src/views/homeView.vue -> src/components/headerSystem.vue -> src/components/SubscriptionModal.vue`
- 5-file cycle: `src/components/headerSystem.vue -> src/components/startMenu/StartMenu.vue -> src/stores/auth.js -> src/router/index.js -> src/views/homeView.vue -> src/components/headerSystem.vue`
- 5-file cycle: `src/components/headerSystem.vue -> src/stores/aiCredits.js -> src/stores/auth.js -> src/router/index.js -> src/views/homeView.vue -> src/components/headerSystem.vue`

## Communities (110 total, 19 thin omitted)

### Community 0 - "VideoModal.vue"
Cohesion: 0.07
Nodes (41): active_index(), check_scroll_position(), close_modal(), current_time(), get_track_key(), handle_scroll(), handler(), modelValue() (+33 more)

### Community 1 - "db.js"
Cohesion: 0.11
Nodes (29): created(), repairStorage(), canUseBrowserStorage(), clearLocalDbIssue(), consumeLocalDbIssue(), createIssuePayload(), createLocalDbUnavailableError(), emitLocalDbIssue() (+21 more)

### Community 2 - "KademNexo.vue"
Cohesion: 0.05
Nodes (19): budgetGroupHeaderStyle(), budgetGroupStyle(), calendarDateParts(), categoryTargetMacro(), countCsvDelimiters(), csvImportSummary(), detectCsvDelimiter(), findMacroByName() (+11 more)

### Community 3 - "PipManager.vue"
Cohesion: 0.17
Nodes (14): current_time(), draw_canvas_content(), draw_image_cover(), draw_pause_icon(), draw_play_icon(), draw_round_rect(), fill_text_with_ellipsis(), force_frame_update() (+6 more)

### Community 4 - "NexoInvestmentsTab.vue"
Cohesion: 0.05
Nodes (15): createGoalForm(), data(), goalCurrentAmount(), goalProgress(), heroProgressPercent(), heroProgressText(), nearestGoal(), resetGoalForm() (+7 more)

### Community 5 - "KanbanColumn.vue"
Cohesion: 0.05
Nodes (14): calculate_dropdown_position(), cancel_create_task(), close_assignee_menu(), close_options(), close_search(), emit_delete_request(), handle_click_outside_creation(), handle_create_task() (+6 more)

### Community 6 - "RadioFlow.vue"
Cohesion: 0.06
Nodes (19): close_search(), delete_track(), execute_add_track(), fetch_search_results(), handle_create_playlist(), handle_delete_playlist(), handle_delete_track(), handle_load_more() (+11 more)

### Community 7 - "CategoryCombo.vue"
Cohesion: 0.05
Nodes (12): close(), filteredCategories(), handleOutsideClick(), handleViewportChange(), normalize(), open(), requestCreate(), sameId() (+4 more)

### Community 8 - "HealthWindow.vue"
Cohesion: 0.05
Nodes (8): cancelArchiveTracker(), cancelDeleteEvent(), cancelDeleteTrackerGroup(), confirmArchiveTracker(), confirmDeleteEvent(), confirmDeleteTrackerGroup(), isLowStock(), lowStockCount()

### Community 10 - "HealthTrackingInsights.vue"
Cohesion: 0.11
Nodes (4): explainWithAi(), patterns(), runComparison(), healthAiService

### Community 13 - "PlayerWrapper.vue"
Cohesion: 0.09
Nodes (15): bring_lyrics_to_front(), bring_video_to_front(), format_seconds_to_time(), formatted_current_time(), formatted_duration(), handle_pip_play_toggle(), on_seek_change(), seek_to() (+7 more)

### Community 14 - "homeView.vue"
Cohesion: 0.07
Nodes (9): create_yt_player(), init_youtube_api(), mounted(), mounted(), updateClock(), checkIfReady(), handler(), init_connection_monitor() (+1 more)

### Community 15 - "syncService.js"
Cohesion: 0.12
Nodes (33): buildChangesArray(), delay(), deleteFinanceLocalRecord(), _handleAccountTask(), _handleFinanceTask(), _handleHealthTask(), _handleKanbanTask(), _handleProjectTask() (+25 more)

### Community 16 - "authView.vue"
Cohesion: 0.14
Nodes (13): biometricDeclinedKey(), isBiometricSupported(), auth(), checkBiometricSupport(), checkPasswordStrength(), confirmBiometrics(), declineBiometrics(), finishLogin() (+5 more)

### Community 17 - "vault.js"
Cohesion: 0.13
Nodes (10): handleGenerateRecovery(), handleMigration(), handleRescue(), data(), accountsRepository, base64ToBuffer(), bufferToBase64(), decoder (+2 more)

### Community 19 - "TrackList.vue"
Cohesion: 0.09
Nodes (8): handle_add_queue(), handle_download_lyrics(), mounted(), setupIntersectionObserver(), track_has_lyrics(), track_lyrics_unavailable(), trigger_add_feedback(), updated()

### Community 21 - "dependencies"
Cohesion: 0.08
Nodes (25): axios, dexie, @fortawesome/fontawesome-svg-core, @fortawesome/free-solid-svg-icons, @fortawesome/vue-fontawesome, lodash.isequal, dependencies, axios (+17 more)

### Community 22 - "devDependencies"
Cohesion: 0.08
Nodes (25): eslint, @eslint/js, eslint-plugin-oxlint, fake-indexeddb, globals, npm-run-all2, oxlint, devDependencies (+17 more)

### Community 23 - "reloadAll"
Cohesion: 0.12
Nodes (27): closeDeleteConfirm(), confirmCsvImport(), confirmDeleteAction(), deleteConnection(), deleteInvestmentEvent(), deleteInvestmentGoal(), loadBudgets(), loadCategories() (+19 more)

### Community 25 - "TrackOptionsMenu.vue"
Cohesion: 0.13
Nodes (11): beforeUnmount(), cancel_download_menu_close(), close_download_menu_on_hover(), modelValue(), open_download_menu(), open_download_menu_on_hover(), position_download_submenu(), position_video_quality_submenu() (+3 more)

### Community 26 - "normalize"
Cohesion: 0.12
Nodes (22): addBudgetItem(), availableCategoriesForMacro(), budgetSummary(), buildTransactionSearchText(), categoriesForMacro(), categoryKey(), displayInsights(), filteredCategories() (+14 more)

### Community 27 - "app.js"
Cohesion: 0.15
Nodes (9): handle_save_task(), setup(), setTheme(), toggleTheme(), buildThemeStorageKey(), lightThemePaths, resolveThemeUserId(), systemTheme() (+1 more)

### Community 28 - "parseCsvWithSchemaEnhanced"
Cohesion: 0.15
Nodes (20): autoCategorize(), buildCsvObservation(), cleanCsvCell(), expandWrappedCsvRow(), findCategoryByName(), findColumnIndex(), handleCsvFileChange(), isWrappedCsvRow() (+12 more)

### Community 29 - "ProductivityWindow.vue"
Cohesion: 0.11
Nodes (9): handleWindowClick(), beforeUnmount(), player_store(), RADIO_FLOW_WINDOW, radio_store(), state_snapshot(), window_store(), usePlayerStore (+1 more)

### Community 30 - "MainInformations.vue"
Cohesion: 0.12
Nodes (4): cancelAddOccupation(), handleAddNewOccupation(), handleSaveBio(), toggleBioEdit()

### Community 31 - "financeService.js"
Cohesion: 0.09
Nodes (23): entityMatchesAnyServerId(), entityReferenceIds(), entityServerId(), financeService, findLocalMacro(), isServerId(), pendingDeleteServerIds(), preparePendingMacroUpdate() (+15 more)

### Community 32 - "updateTransaction"
Cohesion: 0.16
Nodes (18): applyPendingCategorySelection(), applyTransactionPatch(), closeTransactionForm(), deleteTransaction(), enrichTransactionForList(), openConfirmation(), removeTransactionFromList(), requestDeleteTransaction() (+10 more)

### Community 33 - "AccountCenter.vue"
Cohesion: 0.14
Nodes (7): handleBiometricUnlock(), handleCloseModal(), handleSaveNewAccount(), mounted(), refreshVaultBiometricStatus(), toggleVaultBiometrics(), isBiometricCancellationError()

### Community 34 - "BaseModal.vue"
Cohesion: 0.21
Nodes (11): beforeUnmount(), close(), destroyObservers(), handleKeydown(), handler(), handleResize(), initObservers(), onBackdropClick() (+3 more)

### Community 35 - "MacroCategoryCombo.vue"
Cohesion: 0.18
Nodes (11): close(), createValue(), filteredMacros(), handleOutsideClick(), handleViewportChange(), normalize(), open(), select() (+3 more)

### Community 36 - "Configuration.vue"
Cohesion: 0.24
Nodes (11): handlePwaInstall(), loadBiometricStatus(), mounted(), toggleBiometrics(), rememberedEmailKey, removeBiometricCredentials(), getPwaInstallUnavailableMessage(), isIOSDevice() (+3 more)

### Community 37 - "HealthTrackingTab.vue"
Cohesion: 0.12
Nodes (4): selectedSummary(), latestValueDisplay(), recentCount(), trackerSummary()

### Community 39 - "headerSystem.vue"
Cohesion: 0.10
Nodes (12): ai_credits_remaining(), ai_credits_total(), ai_credits_used(), closeAllPopups(), closeContextMenu(), handleMenuClick(), handler(), mounted() (+4 more)

### Community 41 - "StartMenu.vue"
Cohesion: 0.18
Nodes (7): closeProjectView(), goToLogoutScreen(), handleLogoutClick(), openCreateProject(), openEditProject(), setActiveTab(), setActiveTabById()

### Community 42 - "db"
Cohesion: 0.22
Nodes (7): db, runDbOperation(), healthRepository, medalRepository, occupationRepository, syncQueueRepository, userRepository

### Community 43 - "SearchableDropdown.vue"
Cohesion: 0.17
Nodes (6): calculate_position(), close(), handle_click_outside(), open(), select_option(), toggle()

### Community 44 - "submitBudgetPlan"
Cohesion: 0.14
Nodes (14): addBudgetGroup(), appendBudgetAiMessage(), budgetAiStorageKey(), hydrateBudgetGroup(), loadBudgetAiConversation(), loadInsights(), loadUsage(), openBudgetPlanModal() (+6 more)

### Community 46 - "player.js"
Cohesion: 0.20
Nodes (8): api, apiServices, kanbanRepository, projectRepository, radioRepository, syncService, useKanbanStore, useUtilsStore

### Community 47 - "BaseWindow.vue"
Cohesion: 0.19
Nodes (4): focus(), startDrag(), startResize(), windowComponentMap

### Community 48 - "HealthActionModal.vue"
Cohesion: 0.20
Nodes (3): localDateTime(), resetForm(), visible()

### Community 49 - "biometricAuth.js"
Cohesion: 0.33
Nodes (12): authenticateVaultWithBiometrics(), authenticateVaultWithLocalBiometrics(), authenticateWithBiometrics(), bufferToBase64Url(), credentialForVerification(), getBiometricStatus(), getWebAuthn(), prepareVaultBiometricUnlock() (+4 more)

### Community 50 - "main.js"
Cohesion: 0.05
Nodes (20): beginGlobalDrag(), endGlobalDrag(), resetGlobalDrag(), setGlobalDragging(), vAnimateHeight, app, pinia, utils_store (+12 more)

### Community 51 - "SubscriptionModal.vue"
Cohesion: 0.06
Nodes (9): sanitize(), sanitizedMessage(), setup(), check_cpf(), go_to_checkout(), handle_checkout(), request_cancel(), requestClose() (+1 more)

### Community 52 - "getPlanLimits"
Cohesion: 0.18
Nodes (11): limits(), plan_limits(), video_quality_options(), can_download_individually(), plan_limits(), video_quality_options(), limits(), getOfflineVideoQualities() (+3 more)

### Community 53 - "useAuthStore"
Cohesion: 0.19
Nodes (11): setup(), setup(), _handleDownloadLyricsTask(), syncHealthDelta(), useAuthStore, useRadioStore, clean_text(), parse_srt() (+3 more)

### Community 54 - "api.js"
Cohesion: 0.22
Nodes (8): check_system_health(), CSRF_EXEMPT_PATHS, ensureCsrfToken(), getCookie(), isCsrfExempt(), MUTATION_METHODS, normalizePath(), url_api

### Community 55 - "health.js"
Cohesion: 0.24
Nodes (10): DIGESTIVE_WELLBEING_TEMPLATE, addInterval(), controlFields, DEFAULT_HEALTH_UNITS, DEFAULT_TRACKER_GROUPS, HEALTH_RECORD_TYPES, localKey(), now() (+2 more)

### Community 57 - "buildCsvExactKey"
Cohesion: 0.31
Nodes (10): buildCsvExactKey(), buildCsvLegacyKey(), buildTransactionCandidateMaps(), consumeCandidate(), csvAmountKey(), csvDateOnly(), csvHasMeaningfulTime(), filterCsvDuplicates() (+2 more)

### Community 58 - "auth.js"
Cohesion: 0.40
Nodes (9): canUseLocalStorage(), clearSessionRefresh(), getLastSessionRefresh(), getSessionRefreshRemainingMs(), hasValidSessionRefresh(), markSessionRefreshed(), restoreSessionRefreshFromTimestamp(), SESSION_MAX_AGE_MS (+1 more)

### Community 59 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, dev, format, lint, lint:eslint, lint:oxlint, preview (+1 more)

### Community 60 - "HealthCategoryModal.vue"
Cohesion: 0.28
Nodes (3): localDate(), resetForm(), visible()

### Community 61 - "HealthObjectModal.vue"
Cohesion: 0.28
Nodes (3): localDate(), resetForm(), visible()

### Community 62 - "switchComponent.vue"
Cohesion: 0.28
Nodes (3): handler(), mounted(), setIndicatorStyle()

### Community 65 - "moneyInput"
Cohesion: 0.32
Nodes (8): money(), moneyInput(), openTransactionForm(), parseMoneyInput(), signedMoney(), updateBudgetAmount(), updateBudgetGroupAmount(), updateTransactionAmount()

### Community 69 - "package.json"
Cohesion: 0.29
Nodes (6): engines, node, name, private, type, version

### Community 70 - "HealthCheckinModal.vue"
Cohesion: 0.10
Nodes (10): clearAll(), clearField(), filledCount(), hasValue(), localDateTime(), parsedTags(), removeTag(), reset() (+2 more)

### Community 72 - "exclude"
Cohesion: 0.33
Nodes (5): compilerOptions, paths, exclude, dist, node_modules

### Community 74 - "HealthTrackerModal.vue"
Cohesion: 0.32
Nodes (4): reset(), tracker(), VALUE_TYPES, visible()

### Community 75 - ".prettierrc.json"
Cohesion: 0.40
Nodes (4): printWidth, $schema, semi, singleQuote

### Community 77 - "close_attachment_preview"
Cohesion: 0.40
Nodes (5): attachment_icon(), beforeUnmount(), close_attachment_preview(), get_attachment_kind(), open_attachment()

### Community 78 - "is_track_unavailable"
Cohesion: 0.40
Nodes (5): create_fallback_thumb(), handle_desktop_dbl_click(), handle_row_click(), is_track_unavailable(), on_drag_start()

### Community 79 - "README.md"
Cohesion: 0.50
Nodes (3): ✨ Funcionalidades Principais, 📌 Sobre o Projeto, 🛠️ Tecnologias Utilizadas

### Community 80 - "snapshot_task"
Cohesion: 0.67
Nodes (4): apply_responsible_change(), handler(), snapshot_task(), sync_responsible_wrapper()

### Community 81 - "close_comment_menu"
Cohesion: 0.50
Nodes (4): close_comment_menu(), delete_comment(), edit_comment(), handle_global_click()

### Community 83 - "download_attachment"
Cohesion: 0.67
Nodes (3): download_attachment(), get_attachment_download_name(), trigger_browser_download()

### Community 90 - "healthGroups.test.js"
Cohesion: 0.18
Nodes (3): mockLocalStorage, mockLocation, storage

### Community 98 - "HealthTrackingOverview.vue"
Cohesion: 0.24
Nodes (3): hasRecordedValue(), latestValue(), trackerSummaryData()

### Community 99 - "healthInsights.js"
Cohesion: 0.40
Nodes (8): checkinsInPeriod(), comparePattern(), findPatterns(), hasValue(), observedOptions(), trackerSeries(), checkins, reference

### Community 101 - "HealthTrackerGroupModal.vue"
Cohesion: 0.32
Nodes (5): AVAILABLE_COLORS, AVAILABLE_ICONS, group(), reset(), visible()

### Community 102 - "ImageCropperModal.vue"
Cohesion: 0.32
Nodes (4): modelValue(), reset_state(), save_crop(), trigger_input()

### Community 103 - "start_ticker"
Cohesion: 0.29
Nodes (7): get_current_time(), get_duration(), handler(), load_lyrics_from_cache(), mounted(), start_ticker(), update_playback_position()

### Community 105 - "handleCancelNewGroup"
Cohesion: 0.47
Nodes (6): checkInviteErrors(), handleCancelNewGroup(), handleCreateProject(), handleDeleteProject(), handleSave(), handleUpdateProject()

### Community 108 - "dueDays"
Cohesion: 0.40
Nodes (5): dueDays(), nextDueClass(), nextDueIcon(), scheduleDueClass(), scheduleDueIcon()

### Community 110 - "loadAiUsage"
Cohesion: 0.67
Nodes (3): activeTab(), loadAiUsage(), mounted()

## Knowledge Gaps
- **96 isolated node(s):** `$schema`, `semi`, `singleQuote`, `printWidth`, `paths` (+91 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAuthStore` connect `useAuthStore` to `KademNexo.vue`, `KanbanColumn.vue`, `HealthWindow.vue`, `ProjectKanban.vue`, `NewProject.vue`, `homeView.vue`, `syncService.js`, `authView.vue`, `vault.js`, `PlaylistHeader.vue`, `TrackList.vue`, `TaskDetailForm.vue`, `app.js`, `ProductivityWindow.vue`, `MainInformations.vue`, `AccountCenter.vue`, `Configuration.vue`, `headerSystem.vue`, `StartMenu.vue`, `player.js`, `main.js`, `SubscriptionModal.vue`, `health.js`, `auth.js`, `avatarComponent.vue`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **Why does `usePlayerStore` connect `ProductivityWindow.vue` to `VideoModal.vue`, `QueueSidebar.vue`, `RadioFlow.vue`, `radioFlowWidget.vue`, `PlayerWrapper.vue`, `homeView.vue`, `player.js`, `TrackList.vue`, `auth.js`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `useAppStore` connect `app.js` to `db.js`, `AccountCenter.vue`, `QueueSidebar.vue`, `Configuration.vue`, `RadioFlow.vue`, `headerSystem.vue`, `ProjectList.vue`, `ProjectKanban.vue`, `StartMenu.vue`, `homeView.vue`, `BaseWindow.vue`, `main.js`, `auth.js`, `ProductivityWindow.vue`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **What connects `$schema`, `semi`, `singleQuote` to the rest of the system?**
  _96 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `VideoModal.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.06779661016949153 - nodes in this community are weakly interconnected._
- **Should `db.js` be split into smaller, more focused modules?**
  _Cohesion score 0.10984848484848485 - nodes in this community are weakly interconnected._
- **Should `KademNexo.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.054078014184397165 - nodes in this community are weakly interconnected._