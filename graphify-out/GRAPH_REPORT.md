# Graph Report - kadem-web  (2026-08-26)

## Corpus Check
- 127 files · ~161,827 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1366 nodes · 2378 edges · 83 communities (69 shown, 14 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8718d601`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KademNexo.vue
- homeView.vue
- RadioFlow.vue
- CategoryCombo.vue
- devDependencies
- financeService.js
- main.js
- db.js
- KanbanColumn.vue
- PlaylistHeader.vue
- syncService.js
- dependencies
- NexoInvestmentsTab.vue
- PlayerWrapper.vue
- normalize
- reloadAll
- radioFlowWidget.vue
- TrackList.vue
- TaskDetailForm.vue
- ProjectKanban.vue
- VideoModal.vue
- NewProject.vue
- authView.vue
- TrackOptionsMenu.vue
- BaseWindow.vue
- PipManager.vue
- resetPasswordView.vue
- vault.js
- sameId
- MainInformations.vue
- auth.js
- AccountCenter.vue
- MacroCategoryCombo.vue
- Configuration.vue
- headerSystem.vue
- app.js
- avatarComponent.vue
- findCategory
- StartMenu.vue
- SubscriptionModal.vue
- SearchableDropdown.vue
- LyricsModal.vue
- biometricAuth.js
- useAuthStore
- ProjectDropdown.vue
- QueueSidebar.vue
- moneyInput
- getPlanLimits
- api.js
- buildCsvExactKey
- authSession.js
- switchComponent.vue
- CustomDropdown.vue
- ProjectStatusDropdown.vue
- close_options
- SideModal.vue
- MediaSessionManager
- exclude
- .prettierrc.json
- BaseModal.vue
- close_attachment_preview
- is_track_unavailable
- README.md
- snapshot_task
- close_comment_menu
- parse_srt
- Como configurar o Background do Modo Escuro no Kadem
- cancel_create_task
- download_attachment
- biometricAuth.test.js
- AGENTS.md
- get_clean_task_data

## God Nodes (most connected - your core abstractions)
1. `useAuthStore` - 37 edges
2. `useAppStore` - 23 edges
3. `api` - 20 edges
4. `useUtilsStore` - 18 edges
5. `useVaultStore` - 17 edges
6. `db` - 16 edges
7. `normalize()` - 14 edges
8. `reloadAll()` - 14 edges
9. `useWindowStore` - 14 edges
10. `findCategory()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `handleWindowClick()` --calls--> `useWindowStore`  [EXTRACTED]
  src/components/headerSystem.vue → src/stores/windows.js
- `usePlayerStore` --indirect_call--> `track()`  [INFERRED]
  src/stores/player.js → src/components/radio/LyricsModal.vue
- `setup()` --calls--> `useRadioStore`  [EXTRACTED]
  src/components/radio/PlayerWrapper.vue → src/stores/radio.js
- `handleResetPassword()` --calls--> `useAuthStore`  [EXTRACTED]
  src/views/authView.vue → src/stores/auth.js
- `init_connection_monitor()` --calls--> `useUtilsStore`  [EXTRACTED]
  src/views/homeView.vue → src/stores/utils.js

## Import Cycles
- 3-file cycle: `src/services/syncService.js -> src/stores/auth.js -> src/stores/vault.js -> src/services/syncService.js`
- 3-file cycle: `src/router/index.js -> src/views/InviteLanding.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/router/index.js -> src/views/authView.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/router/index.js -> src/views/homeView.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/router/index.js -> src/views/logoutView.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/router/index.js -> src/views/resetPasswordView.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/plugins/api.js -> src/stores/projects.js -> src/stores/utils.js -> src/plugins/api.js`
- 4-file cycle: `src/components/headerSystem.vue -> src/stores/auth.js -> src/router/index.js -> src/views/homeView.vue -> src/components/headerSystem.vue`
- 5-file cycle: `src/router/index.js -> src/views/authView.vue -> src/stores/vault.js -> src/services/syncService.js -> src/stores/auth.js -> src/router/index.js`
- 5-file cycle: `src/router/index.js -> src/views/homeView.vue -> src/stores/vault.js -> src/services/syncService.js -> src/stores/auth.js -> src/router/index.js`
- 5-file cycle: `src/components/SubscriptionModal.vue -> src/stores/auth.js -> src/router/index.js -> src/views/homeView.vue -> src/components/headerSystem.vue -> src/components/SubscriptionModal.vue`
- 5-file cycle: `src/components/headerSystem.vue -> src/components/startMenu/StartMenu.vue -> src/stores/auth.js -> src/router/index.js -> src/views/homeView.vue -> src/components/headerSystem.vue`

## Communities (83 total, 14 thin omitted)

### Community 0 - "KademNexo.vue"
Cohesion: 0.05
Nodes (29): appendBudgetAiMessage(), budgetAiStorageKey(), budgetGroupHeaderStyle(), budgetGroupStyle(), calendarDateParts(), categoryTargetMacro(), countCsvDelimiters(), csvImportSummary() (+21 more)

### Community 1 - "homeView.vue"
Cohesion: 0.05
Nodes (15): cancel(), handleKeydown(), sanitize(), sanitizedMessage(), setup(), setup(), base64ToBuffer(), bufferToBase64() (+7 more)

### Community 2 - "RadioFlow.vue"
Cohesion: 0.06
Nodes (20): close_search(), create_yt_player(), delete_track(), execute_add_track(), fetch_search_results(), handle_create_playlist(), handle_delete_playlist(), handle_delete_track() (+12 more)

### Community 3 - "CategoryCombo.vue"
Cohesion: 0.05
Nodes (12): close(), filteredCategories(), handleOutsideClick(), handleViewportChange(), normalize(), open(), requestCreate(), sameId() (+4 more)

### Community 4 - "devDependencies"
Cohesion: 0.04
Nodes (44): eslint, @eslint/js, eslint-plugin-oxlint, eslint-plugin-vue, globals, npm-run-all2, oxlint, devDependencies (+36 more)

### Community 5 - "financeService.js"
Cohesion: 0.09
Nodes (23): entityMatchesAnyServerId(), entityReferenceIds(), entityServerId(), financeService, findLocalMacro(), isServerId(), pendingDeleteServerIds(), preparePendingMacroUpdate() (+15 more)

### Community 6 - "main.js"
Cohesion: 0.07
Nodes (14): beginGlobalDrag(), endGlobalDrag(), resetGlobalDrag(), setGlobalDragging(), vAnimateHeight, app, pinia, utils_store (+6 more)

### Community 7 - "db.js"
Cohesion: 0.12
Nodes (27): created(), repairStorage(), canUseBrowserStorage(), clearLocalDbIssue(), consumeLocalDbIssue(), createIssuePayload(), createLocalDbUnavailableError(), emitLocalDbIssue() (+19 more)

### Community 8 - "KanbanColumn.vue"
Cohesion: 0.07
Nodes (4): calculate_dropdown_position(), close_assignee_menu(), select_assignee(), toggle_assignee_menu()

### Community 10 - "syncService.js"
Cohesion: 0.13
Nodes (29): buildChangesArray(), delay(), deleteFinanceLocalRecord(), _handleAccountTask(), _handleFinanceTask(), _handleKanbanTask(), _handleProjectTask(), _handleRadioTask() (+21 more)

### Community 11 - "dependencies"
Cohesion: 0.07
Nodes (29): axios, dexie, @fortawesome/fontawesome-svg-core, @fortawesome/free-solid-svg-icons, @fortawesome/vue-fontawesome, lodash.isequal, moment, dependencies (+21 more)

### Community 12 - "NexoInvestmentsTab.vue"
Cohesion: 0.09
Nodes (9): createGoalForm(), data(), goalCurrentAmount(), goalProgress(), heroProgressPercent(), heroProgressText(), nearestGoal(), resetGoalForm() (+1 more)

### Community 13 - "PlayerWrapper.vue"
Cohesion: 0.09
Nodes (14): bring_lyrics_to_front(), bring_video_to_front(), format_seconds_to_time(), formatted_current_time(), formatted_duration(), handler(), load_lyrics_from_cache(), mounted() (+6 more)

### Community 14 - "normalize"
Cohesion: 0.12
Nodes (27): autoCategorize(), buildCsvObservation(), buildTransactionSearchText(), cleanCsvCell(), displayInsights(), expandWrappedCsvRow(), filteredCategories(), filteredTransactions() (+19 more)

### Community 15 - "reloadAll"
Cohesion: 0.12
Nodes (27): closeDeleteConfirm(), confirmCsvImport(), confirmDeleteAction(), deleteConnection(), deleteInvestmentEvent(), deleteInvestmentGoal(), loadBudgets(), loadCategories() (+19 more)

### Community 16 - "radioFlowWidget.vue"
Cohesion: 0.08
Nodes (5): mounted(), updateClock(), focus_radio_flow(), handle_play_interaction(), open_radio_flow()

### Community 17 - "TrackList.vue"
Cohesion: 0.09
Nodes (8): handle_add_queue(), handle_download_lyrics(), mounted(), setupIntersectionObserver(), track_has_lyrics(), track_lyrics_unavailable(), trigger_add_feedback(), updated()

### Community 20 - "VideoModal.vue"
Cohesion: 0.15
Nodes (15): beforeUnmount(), close_modal(), current_time(), exit_fullscreen_if_active(), is_playing(), load_video(), modelValue(), mounted() (+7 more)

### Community 21 - "NewProject.vue"
Cohesion: 0.11
Nodes (8): checkInviteErrors(), displayList(), handleCancelNewGroup(), handleCreateProject(), handleDeleteProject(), handleSave(), handleUpdateProject(), isMemberOwner()

### Community 22 - "authView.vue"
Cohesion: 0.13
Nodes (13): biometricDeclinedKey(), auth(), checkBiometricSupport(), checkPasswordStrength(), confirmBiometrics(), declineBiometrics(), finishLogin(), getErrorMessage() (+5 more)

### Community 23 - "TrackOptionsMenu.vue"
Cohesion: 0.13
Nodes (11): beforeUnmount(), cancel_download_menu_close(), close_download_menu_on_hover(), modelValue(), open_download_menu(), open_download_menu_on_hover(), position_download_submenu(), position_video_quality_submenu() (+3 more)

### Community 24 - "BaseWindow.vue"
Cohesion: 0.12
Nodes (6): focus(), startDrag(), startResize(), windowComponentMap, beforeUnmount(), useWindowStore

### Community 25 - "PipManager.vue"
Cohesion: 0.17
Nodes (14): current_time(), draw_canvas_content(), draw_image_cover(), draw_pause_icon(), draw_play_icon(), draw_round_rect(), fill_text_with_ellipsis(), force_frame_update() (+6 more)

### Community 26 - "resetPasswordView.vue"
Cohesion: 0.14
Nodes (5): mounted(), resetResponse(), setResponse(), submitReset(), validateToken()

### Community 27 - "vault.js"
Cohesion: 0.17
Nodes (8): db, runDbOperation(), accountsRepository, medalRepository, occupationRepository, userRepository, decoder, encoder

### Community 28 - "sameId"
Cohesion: 0.15
Nodes (19): applyPendingCategorySelection(), applyTransactionPatch(), categoryKey(), closeTransactionForm(), enrichTransactionForList(), groupedCategories(), matchesTransactionCategoryFilter(), removeTransactionFromList() (+11 more)

### Community 29 - "MainInformations.vue"
Cohesion: 0.12
Nodes (4): cancelAddOccupation(), handleAddNewOccupation(), handleSaveBio(), toggleBioEdit()

### Community 30 - "auth.js"
Cohesion: 0.30
Nodes (9): api, apiServices, kanbanRepository, projectRepository, radioRepository, syncQueueRepository, syncService, useKanbanStore (+1 more)

### Community 31 - "AccountCenter.vue"
Cohesion: 0.14
Nodes (7): close_rescue_modal(), handle_rescue(), handleBiometricUnlock(), mounted(), refreshVaultBiometricStatus(), toggleVaultBiometrics(), isBiometricCancellationError()

### Community 32 - "MacroCategoryCombo.vue"
Cohesion: 0.18
Nodes (11): close(), createValue(), filteredMacros(), handleOutsideClick(), handleViewportChange(), normalize(), open(), select() (+3 more)

### Community 33 - "Configuration.vue"
Cohesion: 0.21
Nodes (13): handlePwaInstall(), loadBiometricStatus(), mounted(), toggleBiometrics(), getBiometricStatus(), isBiometricSupported(), rememberedEmailKey, removeBiometricCredentials() (+5 more)

### Community 34 - "headerSystem.vue"
Cohesion: 0.14
Nodes (4): closeAllPopups(), closeContextMenu(), handleMenuClick(), handleWindowClick()

### Community 35 - "app.js"
Cohesion: 0.16
Nodes (8): handle_save_task(), setTheme(), toggleTheme(), buildThemeStorageKey(), lightThemePaths, resolveThemeUserId(), systemTheme(), useAppStore

### Community 36 - "avatarComponent.vue"
Cohesion: 0.15
Nodes (4): modelValue(), reset_state(), save_crop(), trigger_input()

### Community 37 - "findCategory"
Cohesion: 0.15
Nodes (15): addBudgetGroup(), addBudgetItem(), availableCategoriesForMacro(), budgetSummary(), categoriesForMacro(), findCategory(), hydrateBudgetGroup(), hydrateBudgetItem() (+7 more)

### Community 39 - "StartMenu.vue"
Cohesion: 0.18
Nodes (7): closeProjectView(), handleLogoutClick(), logout(), openCreateProject(), openEditProject(), setActiveTab(), setActiveTabById()

### Community 40 - "SubscriptionModal.vue"
Cohesion: 0.17
Nodes (6): check_cpf(), go_to_checkout(), handle_checkout(), request_cancel(), requestClose(), resetState()

### Community 41 - "SearchableDropdown.vue"
Cohesion: 0.17
Nodes (6): calculate_position(), close(), handle_click_outside(), open(), select_option(), toggle()

### Community 43 - "LyricsModal.vue"
Cohesion: 0.31
Nodes (12): active_index(), check_scroll_position(), close_modal(), current_time(), get_track_key(), handle_scroll(), handler(), modelValue() (+4 more)

### Community 44 - "biometricAuth.js"
Cohesion: 0.36
Nodes (11): authenticateVaultWithBiometrics(), authenticateVaultWithLocalBiometrics(), authenticateWithBiometrics(), bufferToBase64Url(), credentialForVerification(), getWebAuthn(), prepareVaultBiometricUnlock(), registerBiometricCredential() (+3 more)

### Community 45 - "useAuthStore"
Cohesion: 0.23
Nodes (6): setup(), data(), _handleDownloadLyricsTask(), useAuthStore, useRadioStore, mounted()

### Community 48 - "moneyInput"
Cohesion: 0.22
Nodes (11): deleteTransaction(), money(), moneyInput(), openConfirmation(), openTransactionForm(), parseMoneyInput(), requestDeleteTransaction(), signedMoney() (+3 more)

### Community 49 - "getPlanLimits"
Cohesion: 0.20
Nodes (10): limits(), plan_limits(), video_quality_options(), can_download_individually(), plan_limits(), video_quality_options(), getOfflineVideoQualities(), getPlanLimits() (+2 more)

### Community 50 - "api.js"
Cohesion: 0.22
Nodes (8): check_system_health(), CSRF_EXEMPT_PATHS, ensureCsrfToken(), getCookie(), isCsrfExempt(), MUTATION_METHODS, normalizePath(), url_api

### Community 51 - "buildCsvExactKey"
Cohesion: 0.31
Nodes (10): buildCsvExactKey(), buildCsvLegacyKey(), buildTransactionCandidateMaps(), consumeCandidate(), csvAmountKey(), csvDateOnly(), csvHasMeaningfulTime(), filterCsvDuplicates() (+2 more)

### Community 52 - "authSession.js"
Cohesion: 0.36
Nodes (9): canUseLocalStorage(), clearSessionRefresh(), getLastSessionRefresh(), getSessionRefreshRemainingMs(), hasValidSessionRefresh(), markSessionRefreshed(), restoreSessionRefreshFromTimestamp(), SESSION_MAX_AGE_MS (+1 more)

### Community 53 - "switchComponent.vue"
Cohesion: 0.28
Nodes (3): handler(), mounted(), setIndicatorStyle()

### Community 57 - "close_options"
Cohesion: 0.29
Nodes (7): close_options(), close_search(), emit_delete_request(), reset_filters(), show_new_task_form(), start_rename(), toggle_search()

### Community 62 - "exclude"
Cohesion: 0.33
Nodes (5): compilerOptions, paths, exclude, dist, node_modules

### Community 64 - ".prettierrc.json"
Cohesion: 0.40
Nodes (4): printWidth, $schema, semi, singleQuote

### Community 67 - "close_attachment_preview"
Cohesion: 0.40
Nodes (5): attachment_icon(), beforeUnmount(), close_attachment_preview(), get_attachment_kind(), open_attachment()

### Community 68 - "is_track_unavailable"
Cohesion: 0.40
Nodes (5): create_fallback_thumb(), handle_desktop_dbl_click(), handle_row_click(), is_track_unavailable(), on_drag_start()

### Community 69 - "README.md"
Cohesion: 0.50
Nodes (3): ✨ Funcionalidades Principais, 📌 Sobre o Projeto, 🛠️ Tecnologias Utilizadas

### Community 70 - "snapshot_task"
Cohesion: 0.67
Nodes (4): apply_responsible_change(), handler(), snapshot_task(), sync_responsible_wrapper()

### Community 71 - "close_comment_menu"
Cohesion: 0.50
Nodes (4): close_comment_menu(), delete_comment(), edit_comment(), handle_global_click()

### Community 72 - "parse_srt"
Cohesion: 0.83
Nodes (3): clean_text(), parse_srt(), time_to_seconds()

### Community 74 - "cancel_create_task"
Cohesion: 1.00
Nodes (3): cancel_create_task(), handle_click_outside_creation(), handle_create_task()

### Community 75 - "download_attachment"
Cohesion: 0.67
Nodes (3): download_attachment(), get_attachment_download_name(), trigger_browser_download()

## Knowledge Gaps
- **78 isolated node(s):** `$schema`, `semi`, `singleQuote`, `printWidth`, `paths` (+73 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAuthStore` connect `useAuthStore` to `KademNexo.vue`, `homeView.vue`, `main.js`, `KanbanColumn.vue`, `PlaylistHeader.vue`, `syncService.js`, `TrackList.vue`, `TaskDetailForm.vue`, `ProjectKanban.vue`, `NewProject.vue`, `authView.vue`, `BaseWindow.vue`, `resetPasswordView.vue`, `MainInformations.vue`, `auth.js`, `AccountCenter.vue`, `Configuration.vue`, `headerSystem.vue`, `avatarComponent.vue`, `StartMenu.vue`, `SubscriptionModal.vue`, `authSession.js`?**
  _High betweenness centrality (0.140) - this node is a cross-community bridge._
- **Why does `db` connect `vault.js` to `KademNexo.vue`, `RadioFlow.vue`, `financeService.js`, `db.js`, `syncService.js`, `PlayerWrapper.vue`, `auth.js`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `useAppStore` connect `app.js` to `homeView.vue`, `headerSystem.vue`, `RadioFlow.vue`, `Configuration.vue`, `ProjectList.vue`, `db.js`, `StartMenu.vue`, `main.js`, `QueueSidebar.vue`, `ProjectKanban.vue`, `BaseWindow.vue`, `DesktopWindowManager.vue`, `auth.js`, `AccountCenter.vue`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `$schema`, `semi`, `singleQuote` to the rest of the system?**
  _78 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `KademNexo.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.04839685420447671 - nodes in this community are weakly interconnected._
- **Should `homeView.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.047872340425531915 - nodes in this community are weakly interconnected._
- **Should `RadioFlow.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.05920444033302498 - nodes in this community are weakly interconnected._