# Graph Report - kadem-web  (2026-10-02)

## Corpus Check
- 203 files · ~237,460 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2121 nodes · 3661 edges · 142 communities (126 shown, 16 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.74)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `29bfbe2c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- HealthTrackingInsights.vue
- KademTabs.vue
- KademNexo.vue
- KanbanColumn.vue
- RadioFlow.vue
- CategoryCombo.vue
- HealthWindow.vue
- NewProject.vue
- financeRepository.js
- PlayerWrapper.vue
- NexoInvestmentsTab.vue
- homeView.vue
- syncService.js
- db.js
- TrackList.vue
- PlaylistHeader.vue
- resetPasswordView.vue
- TaskDetailForm.vue
- headerSystem.vue
- reloadAll
- vault.js
- SubscriptionModal.vue
- dependencies
- devDependencies
- HealthCheckinModal.vue
- BaseWindow.vue
- ProjectKanban.vue
- authView.vue
- SubmenuTrigger.vue
- findMacroByName
- LyricsModal.vue
- AccountCenter.vue
- PipManager.vue
- normalize
- BaseModal.vue
- StartMenu.vue
- MainInformations.vue
- financeService.js
- auth.js
- sameId
- radioFlowWidget.vue
- MacroCategoryCombo.vue
- usePlayerStore
- useAuthStore
- biometricAuth.js
- SearchableDropdown.vue
- ReauthModal.vue
- findCategory
- KademSkeletonGroup.vue
- ProjectDropdown.vue
- HealthActionModal.vue
- VideoModal.vue
- QueueSidebar.vue
- MfaChallenge.vue
- healthGroups.test.js
- global.js
- buildCsvExactKey
- OtpInput.vue
- api.js
- scripts
- HealthCategoryModal.vue
- HealthObjectModal.vue
- switchComponent.vue
- CustomDropdown.vue
- moneyInput
- HealthRelationModal.vue
- HealthTrackerGroupModal.vue
- HealthTrackerModal.vue
- DevicesSection.vue
- apiErrorMessage
- package.json
- PasskeysSection.vue
- MediaSessionManager
- exclude
- NexoCsvPreviewModal.vue
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
- TotpSetupModal.vue
- buildTransactionSearchText
- HealthPublicCardTab.vue
- UploadTrackModal.vue
- getPlanLimits
- app.js
- is_track_unavailable
- confirmBiometrics
- MfaSection.vue
- main.js
- RecoveryEmailModal.vue
- ProjectStatusDropdown.vue
- vue
- select_playlist
- Configuration.vue
- vite-plugin-pwa
- activeInvestmentTab
- deleteInvestmentGoal
- close_options
- openConfirmation
- kanbanBoard.test.js
- finish_task_drag_preview
- buildSvgCurvePath
- goalCurrentAmount
- financeSync.test.js
- expandWrappedCsvRow
- createGoalForm
- refresh_attachment_row
- fetch_search_results
- animate_filter_change
- cancel_create_task
- eslint-plugin-oxlint
- qrcode

## God Nodes (most connected - your core abstractions)
1. `useAuthStore` - 47 edges
2. `apiErrorMessage()` - 27 edges
3. `useAppStore` - 27 edges
4. `api` - 25 edges
5. `usePlayerStore` - 25 edges
6. `useVaultStore` - 21 edges
7. `useUtilsStore` - 19 edges
8. `db` - 18 edges
9. `useWindowStore` - 15 edges
10. `normalize()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `usePlayerStore` --indirect_call--> `track()`  [INFERRED]
  src/stores/player.js → src/components/radio/LyricsModal.vue
- `setup()` --calls--> `useRadioStore`  [EXTRACTED]
  src/components/radio/PlayerWrapper.vue → src/stores/radio.js
- `disconnectOthers()` --calls--> `apiErrorMessage()`  [EXTRACTED]
  src/components/security/DevicesSection.vue → src/services/securityService.js
- `submit()` --calls--> `apiErrorMessage()`  [EXTRACTED]
  src/components/security/MfaChallenge.vue → src/services/securityService.js
- `setup()` --calls--> `useVaultStore`  [EXTRACTED]
  src/components/startMenu/AccountCenter/AccountList.vue → src/stores/vault.js

## Import Cycles
- 3-file cycle: `src/router/index.js -> src/views/authView.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/router/index.js -> src/views/InviteLanding.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/router/index.js -> src/views/logoutView.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/router/index.js -> src/views/homeView.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/router/index.js -> src/views/resetPasswordView.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/services/syncService.js -> src/stores/auth.js -> src/stores/vault.js -> src/services/syncService.js`
- 3-file cycle: `src/plugins/api.js -> src/stores/projects.js -> src/stores/utils.js -> src/plugins/api.js`
- 4-file cycle: `src/components/headerSystem.vue -> src/stores/auth.js -> src/router/index.js -> src/views/homeView.vue -> src/components/headerSystem.vue`
- 5-file cycle: `src/router/index.js -> src/views/authView.vue -> src/stores/vault.js -> src/services/syncService.js -> src/stores/auth.js -> src/router/index.js`
- 5-file cycle: `src/components/SubscriptionModal.vue -> src/stores/auth.js -> src/router/index.js -> src/views/homeView.vue -> src/components/headerSystem.vue -> src/components/SubscriptionModal.vue`
- 5-file cycle: `src/components/headerSystem.vue -> src/components/startMenu/StartMenu.vue -> src/stores/auth.js -> src/router/index.js -> src/views/homeView.vue -> src/components/headerSystem.vue`
- 5-file cycle: `src/components/headerSystem.vue -> src/stores/aiCredits.js -> src/stores/auth.js -> src/router/index.js -> src/views/homeView.vue -> src/components/headerSystem.vue`
- 5-file cycle: `src/router/index.js -> src/views/homeView.vue -> src/stores/vault.js -> src/services/syncService.js -> src/stores/auth.js -> src/router/index.js`

## Communities (142 total, 16 thin omitted)

### Community 0 - "HealthTrackingInsights.vue"
Cohesion: 0.05
Nodes (18): patterns(), runComparison(), selectedSummary(), hasRecordedValue(), latestValue(), trackerSummaryData(), latestValueDisplay(), recentCount() (+10 more)

### Community 1 - "KademTabs.vue"
Cohesion: 0.14
Nodes (6): checkScrollability(), currentTabId(), handler(), initResizeObserver(), mounted(), scrollToActiveTab()

### Community 2 - "KademNexo.vue"
Cohesion: 0.05
Nodes (23): appendBudgetAiMessage(), budgetAiStorageKey(), budgetGroupHeaderStyle(), budgetGroupStyle(), calendarDateParts(), countCsvDelimiters(), csvImportSummary(), detectCsvDelimiter() (+15 more)

### Community 3 - "KanbanColumn.vue"
Cohesion: 0.07
Nodes (4): calculate_dropdown_position(), close_assignee_menu(), select_assignee(), toggle_assignee_menu()

### Community 5 - "CategoryCombo.vue"
Cohesion: 0.19
Nodes (12): close(), filteredCategories(), handleOutsideClick(), handleViewportChange(), normalize(), open(), requestCreate(), sameId() (+4 more)

### Community 6 - "HealthWindow.vue"
Cohesion: 0.05
Nodes (9): cancelArchiveTracker(), cancelDeleteEvent(), cancelDeleteTrackerGroup(), confirmArchiveTracker(), confirmDeleteEvent(), confirmDeleteTrackerGroup(), HEALTH_TAB_IDS, isLowStock() (+1 more)

### Community 7 - "NewProject.vue"
Cohesion: 0.06
Nodes (12): modelValue(), reset_state(), save_crop(), trigger_input(), checkInviteErrors(), displayList(), handleCancelNewGroup(), handleCreateProject() (+4 more)

### Community 9 - "financeRepository.js"
Cohesion: 0.18
Nodes (9): INVESTMENT_FLOW, isServerId(), normalizeCategoryMacroReferences(), normalizeFinanceText(), now(), replaceServerItemsPreservingPending(), sameCategorySignature(), sameFinanceId() (+1 more)

### Community 10 - "PlayerWrapper.vue"
Cohesion: 0.08
Nodes (23): bring_lyrics_to_front(), bring_video_to_front(), format_seconds_to_time(), formatted_current_time(), formatted_duration(), get_current_time(), get_duration(), handle_pip_play_toggle() (+15 more)

### Community 12 - "homeView.vue"
Cohesion: 0.07
Nodes (9): create_yt_player(), init_youtube_api(), mounted(), mounted(), updateClock(), checkIfReady(), handler(), init_connection_monitor() (+1 more)

### Community 13 - "syncService.js"
Cohesion: 0.10
Nodes (37): attachmentUploads, finishAttachmentUpload(), reportAttachmentUpload(), buildChangesArray(), delay(), deleteFinanceLocalRecord(), _handleAccountTask(), _handleDownloadLyricsTask() (+29 more)

### Community 14 - "db.js"
Cohesion: 0.09
Nodes (31): repairStorage(), clearLocalDbIssue(), createIssuePayload(), createLocalDbUnavailableError(), db, emitLocalDbIssue(), ensureDbOpen(), getErrorNameChain() (+23 more)

### Community 15 - "TrackList.vue"
Cohesion: 0.08
Nodes (9): handle_add_queue(), handle_download_lyrics(), mounted(), setup(), setupIntersectionObserver(), track_has_lyrics(), track_lyrics_unavailable(), trigger_add_feedback() (+1 more)

### Community 17 - "resetPasswordView.vue"
Cohesion: 0.10
Nodes (12): completeLink(), handleAlexaLogin(), onMfaVerified(), backToPassword(), continueToSessions(), endsCurrentSession(), mounted(), passwordError() (+4 more)

### Community 18 - "TaskDetailForm.vue"
Cohesion: 0.06
Nodes (4): cancel_edit_comment(), get_clean_task_data(), is_dirty(), save_edit_comment()

### Community 19 - "headerSystem.vue"
Cohesion: 0.10
Nodes (13): ai_credits_remaining(), ai_credits_total(), ai_credits_used(), closeAllPopups(), closeContextMenu(), handleMenuClick(), handler(), mounted() (+5 more)

### Community 20 - "reloadAll"
Cohesion: 0.12
Nodes (27): closeDeleteConfirm(), confirmCsvImport(), confirmDeleteAction(), deleteConnection(), deleteInvestmentEvent(), loadBudgets(), loadCategories(), loadConnections() (+19 more)

### Community 21 - "vault.js"
Cohesion: 0.13
Nodes (10): handleGenerateRecovery(), handleMigration(), handleRescue(), data(), accountsRepository, base64ToBuffer(), bufferToBase64(), decoder (+2 more)

### Community 22 - "SubscriptionModal.vue"
Cohesion: 0.06
Nodes (9): sanitize(), sanitizedMessage(), setup(), check_cpf(), go_to_checkout(), handle_checkout(), request_cancel(), requestClose() (+1 more)

### Community 23 - "dependencies"
Cohesion: 0.07
Nodes (27): axios, dexie, @fortawesome/fontawesome-svg-core, @fortawesome/free-solid-svg-icons, @fortawesome/vue-fontawesome, lodash.isequal, moment, dependencies (+19 more)

### Community 24 - "devDependencies"
Cohesion: 0.07
Nodes (27): eslint, @eslint/js, eslint-plugin-vue, fake-indexeddb, globals, npm-run-all2, oxlint, devDependencies (+19 more)

### Community 25 - "HealthCheckinModal.vue"
Cohesion: 0.10
Nodes (10): clearAll(), clearField(), filledCount(), hasValue(), localDateTime(), parsedTags(), removeTag(), reset() (+2 more)

### Community 27 - "BaseWindow.vue"
Cohesion: 0.12
Nodes (7): handleWindowClick(), focus(), startDrag(), startResize(), windowComponentMap, beforeUnmount(), useWindowStore

### Community 29 - "authView.vue"
Cohesion: 0.10
Nodes (20): canUseBrowserStorage(), consumeLocalDbIssue(), afterLogin(), auth(), checkBiometricSupport(), checkPasswordStrength(), confirmTrust(), continueAfterLogin() (+12 more)

### Community 30 - "SubmenuTrigger.vue"
Cohesion: 0.13
Nodes (8): beforeUnmount(), cancel_close(), close_on_hover(), open(), open_on_hover(), position_panel(), supports_hover(), toggle_on_touch()

### Community 31 - "findMacroByName"
Cohesion: 0.29
Nodes (7): categoryTargetMacro(), findMacroByName(), macroKey(), onCategoryMacroChange(), openMacroForm(), resolveMacroRecord(), selectBudgetMacro()

### Community 32 - "LyricsModal.vue"
Cohesion: 0.12
Nodes (27): active_index(), check_scroll_position(), close_modal(), current_time(), get_track_key(), handle_scroll(), handler(), modelValue() (+19 more)

### Community 33 - "AccountCenter.vue"
Cohesion: 0.13
Nodes (9): usePasskey(), "auth.user.email"(), handleBiometricUnlock(), handleCloseModal(), handleSaveNewAccount(), mounted(), refreshVaultBiometricStatus(), toggleVaultBiometrics() (+1 more)

### Community 34 - "PipManager.vue"
Cohesion: 0.17
Nodes (14): current_time(), draw_canvas_content(), draw_image_cover(), draw_pause_icon(), draw_play_icon(), draw_round_rect(), fill_text_with_ellipsis(), force_frame_update() (+6 more)

### Community 35 - "normalize"
Cohesion: 0.16
Nodes (21): autoCategorize(), buildCsvObservation(), cleanCsvCell(), displayInsights(), findCategoryByName(), findColumnIndex(), handleCsvFileChange(), loadInsights() (+13 more)

### Community 36 - "BaseModal.vue"
Cohesion: 0.17
Nodes (12): beforeUnmount(), close(), destroyObservers(), handleKeydown(), handler(), handleResize(), handleTouchEnd(), initObservers() (+4 more)

### Community 37 - "StartMenu.vue"
Cohesion: 0.17
Nodes (7): closeProjectView(), goToLogoutScreen(), handleLogoutClick(), openCreateProject(), openEditProject(), setActiveTab(), setActiveTabById()

### Community 38 - "MainInformations.vue"
Cohesion: 0.14
Nodes (4): cancelAddOccupation(), handleAddNewOccupation(), handleSaveBio(), toggleBioEdit()

### Community 39 - "financeService.js"
Cohesion: 0.19
Nodes (13): entityMatchesAnyServerId(), entityReferenceIds(), entityServerId(), financeService, findLocalMacro(), isServerId(), pendingDeleteServerIds(), preparePendingMacroUpdate() (+5 more)

### Community 40 - "auth.js"
Cohesion: 0.35
Nodes (10): canUseLocalStorage(), clearSessionRefresh(), getLastSessionRefresh(), getSessionRefreshRemainingMs(), hasValidSessionRefresh(), markSessionRefreshed(), restoreSessionRefreshFromTimestamp(), SESSION_MAX_AGE_MS (+2 more)

### Community 41 - "sameId"
Cohesion: 0.22
Nodes (14): applyPendingCategorySelection(), applyTransactionPatch(), enrichTransactionForList(), groupedCategories(), resolveSavedCategory(), sameId(), selectTransactionCategory(), sortTransactionsList() (+6 more)

### Community 43 - "MacroCategoryCombo.vue"
Cohesion: 0.18
Nodes (11): close(), createValue(), filteredMacros(), handleOutsideClick(), handleViewportChange(), normalize(), open(), select() (+3 more)

### Community 44 - "usePlayerStore"
Cohesion: 0.21
Nodes (11): activeTab(), data(), setup(), data(), player_store(), RADIO_FLOW_WINDOW, radio_store(), radioFlowApi (+3 more)

### Community 45 - "useAuthStore"
Cohesion: 0.15
Nodes (15): DIGESTIVE_WELLBEING_TEMPLATE, syncHealthDelta(), useAuthStore, addInterval(), controlFields, DEFAULT_HEALTH_UNITS, DEFAULT_TRACKER_GROUPS, HEALTH_RECORD_TYPES (+7 more)

### Community 47 - "biometricAuth.js"
Cohesion: 0.30
Nodes (12): authenticateVaultWithBiometrics(), authenticateVaultWithLocalBiometrics(), authenticateWithBiometrics(), bufferToBase64Url(), credentialForVerification(), getBiometricStatus(), getWebAuthn(), prepareVaultBiometricUnlock() (+4 more)

### Community 48 - "SearchableDropdown.vue"
Cohesion: 0.17
Nodes (6): calculate_position(), close(), handle_click_outside(), open(), select_option(), toggle()

### Community 49 - "ReauthModal.vue"
Cohesion: 0.12
Nodes (9): cancel(), clear(), handler(), METHOD_ORDER, onModelUpdate(), prepare(), sendEmail(), startCooldown() (+1 more)

### Community 50 - "findCategory"
Cohesion: 0.14
Nodes (17): addBudgetGroup(), addBudgetItem(), availableCategoriesForMacro(), budgetSummary(), categoriesForMacro(), closeTransactionForm(), findCategory(), hydrateBudgetGroup() (+9 more)

### Community 52 - "KademSkeletonGroup.vue"
Cohesion: 0.14
Nodes (4): skeleton_style(), to_css_size(), loadingContinuity, APP_NAMES

### Community 54 - "HealthActionModal.vue"
Cohesion: 0.20
Nodes (3): localDateTime(), resetForm(), visible()

### Community 55 - "VideoModal.vue"
Cohesion: 0.17
Nodes (13): beforeUnmount(), close_modal(), current_time(), exit_fullscreen_if_active(), is_playing(), load_video(), modelValue(), mounted() (+5 more)

### Community 56 - "QueueSidebar.vue"
Cohesion: 0.12
Nodes (20): animate_queue_changes(), AUTOSCROLL_END_EVENTS, AUTOSCROLL_POINTER_EVENTS, beforeUnmount(), capture_queue_positions(), get(), handle_drag_end(), handle_drag_start() (+12 more)

### Community 57 - "MfaChallenge.vue"
Cohesion: 0.12
Nodes (6): METHOD_DESCRIPTIONS, METHOD_ICONS, METHOD_ORDER, sendEmail(), startCooldown(), submit()

### Community 58 - "healthGroups.test.js"
Cohesion: 0.18
Nodes (3): mockLocalStorage, mockLocation, storage

### Community 59 - "global.js"
Cohesion: 0.27
Nodes (4): beginGlobalDrag(), endGlobalDrag(), resetGlobalDrag(), setGlobalDragging()

### Community 60 - "buildCsvExactKey"
Cohesion: 0.31
Nodes (9): buildCsvExactKey(), buildCsvLegacyKey(), buildTransactionCandidateMaps(), consumeCandidate(), csvAmountKey(), csvDateOnly(), csvHasMeaningfulTime(), filterCsvDuplicates() (+1 more)

### Community 62 - "OtpInput.vue"
Cohesion: 0.16
Nodes (9): codeComplete(), onInput(), codeComplete(), onInput(), digitsOnly(), formatRecoveryCode(), normalizeRecoveryCode(), OTP_LENGTH (+1 more)

### Community 63 - "api.js"
Cohesion: 0.11
Nodes (16): api, check_system_health(), CSRF_EXEMPT_PATHS, ensureCsrfToken(), getCookie(), isCsrfExempt(), MUTATION_METHODS, normalizePath() (+8 more)

### Community 64 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, dev, format, lint, lint:eslint, lint:oxlint, preview (+5 more)

### Community 65 - "HealthCategoryModal.vue"
Cohesion: 0.28
Nodes (3): localDate(), resetForm(), visible()

### Community 66 - "HealthObjectModal.vue"
Cohesion: 0.28
Nodes (3): localDate(), resetForm(), visible()

### Community 67 - "switchComponent.vue"
Cohesion: 0.28
Nodes (3): handler(), mounted(), setIndicatorStyle()

### Community 68 - "CustomDropdown.vue"
Cohesion: 0.27
Nodes (7): beforeUnmount(), close(), handle_outside_pointer_down(), open(), select_option(), toggle(), update_position()

### Community 69 - "moneyInput"
Cohesion: 0.20
Nodes (12): deleteTransaction(), money(), moneyInput(), openConfirmation(), openTransactionForm(), parseMoneyInput(), removeTransactionFromList(), requestDeleteTransaction() (+4 more)

### Community 71 - "HealthTrackerGroupModal.vue"
Cohesion: 0.32
Nodes (5): AVAILABLE_COLORS, AVAILABLE_ICONS, group(), reset(), visible()

### Community 72 - "HealthTrackerModal.vue"
Cohesion: 0.32
Nodes (4): reset(), tracker(), VALUE_TYPES, visible()

### Community 73 - "DevicesSection.vue"
Cohesion: 0.15
Nodes (5): disconnectOthers(), guard(), RTF, runAction(), untrust()

### Community 74 - "apiErrorMessage"
Cohesion: 0.19
Nodes (9): sendLink(), active(), loadDevices(), onDevicesChanged(), online(), reload(), apiErrorMessage(), mfaMethodLabels (+1 more)

### Community 75 - "package.json"
Cohesion: 0.29
Nodes (6): engines, node, name, private, type, version

### Community 76 - "PasskeysSection.vue"
Cohesion: 0.23
Nodes (8): add(), deviceName(), mounted(), remove(), biometricDeclinedKey(), isBiometricSupported(), rememberedEmailKey, declineBiometrics()

### Community 79 - "exclude"
Cohesion: 0.33
Nodes (5): compilerOptions, paths, exclude, dist, node_modules

### Community 80 - "NexoCsvPreviewModal.vue"
Cohesion: 0.22
Nodes (3): canPickGoal(), hasGoalColumn(), isInvestmentRow()

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
Cohesion: 0.27
Nodes (7): apiServices, radioRepository, useRadioStore, useUtilsStore, clean_text(), parse_srt(), time_to_seconds()

### Community 89 - "download_attachment"
Cohesion: 0.67
Nodes (3): download_attachment(), get_attachment_download_name(), trigger_browser_download()

### Community 90 - "loadAiUsage"
Cohesion: 0.67
Nodes (3): activeTab(), loadAiUsage(), mounted()

### Community 96 - "TotpSetupModal.vue"
Cohesion: 0.31
Nodes (7): submit(), cancel(), confirm(), modelValue(), reset(), start(), apiErrorCode()

### Community 98 - "buildTransactionSearchText"
Cohesion: 0.22
Nodes (9): buildTransactionSearchText(), categoryKey(), categoryTypeLabel(), filteredCategories(), filteredTransactions(), goalName(), matchesTransactionCategoryFilter(), matchesTransactionSearch() (+1 more)

### Community 99 - "HealthPublicCardTab.vue"
Cohesion: 0.09
Nodes (13): data(), emptyCard(), loadSettings(), mounted(), refreshQr(), save(), healthPublicCardService, copyFullSummary() (+5 more)

### Community 101 - "UploadTrackModal.vue"
Cohesion: 0.25
Nodes (7): format_bytes(), handle_close(), handle_file_change(), modelValue(), probe_duration(), quota_error_message(), reset_selection()

### Community 102 - "getPlanLimits"
Cohesion: 0.22
Nodes (9): limits(), plan_limits(), video_quality_options(), can_download_individually(), plan_limits(), video_quality_options(), limits(), getOfflineVideoQualities() (+1 more)

### Community 103 - "app.js"
Cohesion: 0.14
Nodes (11): created(), handle_save_task(), setup(), setTheme(), toggleTheme(), onLocalDbIssue(), buildThemeStorageKey(), lightThemePaths (+3 more)

### Community 104 - "is_track_unavailable"
Cohesion: 0.40
Nodes (5): create_fallback_thumb(), handle_desktop_dbl_click(), handle_row_click(), is_track_unavailable(), on_drag_start()

### Community 105 - "confirmBiometrics"
Cohesion: 0.67
Nodes (4): confirmBiometrics(), finishLogin(), getErrorMessage(), loginWithBiometrics()

### Community 109 - "MfaSection.vue"
Cohesion: 0.13
Nodes (4): disable(), regenerate(), removeRecoveryEmail(), run()

### Community 110 - "main.js"
Cohesion: 0.15
Nodes (10): vAnimateHeight, app, pinia, utils_store, router, routes, beforeUnmount(), cleanupTimers() (+2 more)

### Community 112 - "RecoveryEmailModal.vue"
Cohesion: 0.25
Nodes (6): cancel(), confirm(), modelValue(), reset(), sendCode(), startCooldown()

### Community 117 - "select_playlist"
Cohesion: 0.22
Nodes (10): close_search(), handle_create_playlist(), handle_delete_playlist(), handle_mobile_select_playlist(), handler(), load_data(), mounted(), observe_container_size() (+2 more)

### Community 118 - "Configuration.vue"
Cohesion: 0.40
Nodes (7): handlePwaInstall(), mounted(), getPwaInstallUnavailableMessage(), isIOSDevice(), isPwaInstalled(), isStandalone(), requestPwaInstall()

### Community 120 - "activeInvestmentTab"
Cohesion: 0.67
Nodes (3): activeInvestmentTab(), mounted(), updateChartDimensions()

### Community 121 - "deleteInvestmentGoal"
Cohesion: 0.38
Nodes (7): deleteInvestmentGoal(), investmentGoalKey(), investmentGoalMatches(), removeInvestmentGoalFromList(), requestDeleteInvestmentGoal(), saveInvestmentGoal(), upsertInvestmentGoalInList()

### Community 122 - "close_options"
Cohesion: 0.29
Nodes (7): close_options(), close_search(), emit_delete_request(), handle_click_outside_search(), show_new_task_form(), start_rename(), toggle_search()

### Community 124 - "openConfirmation"
Cohesion: 0.33
Nodes (7): delete_track(), execute_add_track(), handle_add_to_another_playlist(), handle_delete_track(), handle_upload_submit(), openConfirmation(), verify_and_add_track()

### Community 127 - "kanbanBoard.test.js"
Cohesion: 0.33
Nodes (3): installMemoryStorage(), loadBoard(), stubRouter

### Community 128 - "finish_task_drag_preview"
Cohesion: 0.53
Nodes (6): cancel_task_drag_preview_cleanup(), finish_task_drag_preview(), measure_natural_column_height(), restore_task_drag_preview(), schedule_task_drag_preview_cleanup(), update_task_drag_preview()

### Community 129 - "buildSvgCurvePath"
Cohesion: 0.40
Nodes (5): buildSvgCurvePath(), calcCurveInterest(), calcCurveInvested(), calcCurveTotal(), projectionCurvePath()

### Community 130 - "goalCurrentAmount"
Cohesion: 0.40
Nodes (5): goalCurrentAmount(), goalProgress(), heroProgressPercent(), heroProgressText(), nearestGoal()

### Community 131 - "financeSync.test.js"
Cohesion: 0.33
Nodes (3): installMemoryStorage(), loadOfflineFinance(), stubRouter

### Community 132 - "expandWrappedCsvRow"
Cohesion: 0.83
Nodes (4): expandWrappedCsvRow(), isWrappedCsvRow(), normalizeParsedCsvRows(), splitCsvLine()

### Community 133 - "createGoalForm"
Cohesion: 0.50
Nodes (4): createGoalForm(), data(), resetGoalForm(), submitGoal()

### Community 135 - "refresh_attachment_row"
Cohesion: 0.50
Nodes (4): handle_attachment_selected(), refresh_attachment_row(), uploading_attachment_ids(), upsert_attachment_row()

### Community 137 - "fetch_search_results"
Cohesion: 0.50
Nodes (4): fetch_search_results(), handle_load_more(), perform_mobile_search(), perform_search()

### Community 139 - "animate_filter_change"
Cohesion: 0.25
Nodes (8): animate_filter_change(), animate_filter_task(), beforeUnmount(), cancel_filter_task_animations(), filter_values(), on_task_drag_end(), on_task_drag_start(), stop_tracking_task_drag()

### Community 140 - "cancel_create_task"
Cohesion: 1.00
Nodes (3): cancel_create_task(), handle_click_outside_creation(), handle_create_task()

## Knowledge Gaps
- **115 isolated node(s):** `$schema`, `semi`, `singleQuote`, `printWidth`, `paths` (+110 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAuthStore` connect `useAuthStore` to `KademNexo.vue`, `KanbanColumn.vue`, `HealthWindow.vue`, `NewProject.vue`, `homeView.vue`, `syncService.js`, `TrackList.vue`, `PlaylistHeader.vue`, `resetPasswordView.vue`, `TaskDetailForm.vue`, `headerSystem.vue`, `vault.js`, `SubscriptionModal.vue`, `BaseWindow.vue`, `ProjectKanban.vue`, `authView.vue`, `AccountCenter.vue`, `StartMenu.vue`, `MainInformations.vue`, `auth.js`, `ReauthModal.vue`, `api.js`, `apiErrorMessage`, `PasskeysSection.vue`, `player.js`, `app.js`, `confirmBiometrics`, `main.js`?**
  _High betweenness centrality (0.110) - this node is a cross-community bridge._
- **Why does `usePlayerStore` connect `usePlayerStore` to `LyricsModal.vue`, `KademNexo.vue`, `RadioFlow.vue`, `createGoalForm`, `HealthWindow.vue`, `loadAiUsage`, `auth.js`, `PlayerWrapper.vue`, `NexoInvestmentsTab.vue`, `homeView.vue`, `radioFlowWidget.vue`, `TrackList.vue`, `KademSkeletonGroup.vue`, `player.js`, `VideoModal.vue`, `activeInvestmentTab`, `QueueSidebar.vue`, `BaseWindow.vue`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `useAppStore` connect `app.js` to `AccountCenter.vue`, `RadioFlow.vue`, `StartMenu.vue`, `auth.js`, `DevicesSection.vue`, `apiErrorMessage`, `PasskeysSection.vue`, `MfaSection.vue`, `ProjectList.vue`, `main.js`, `homeView.vue`, `headerSystem.vue`, `KademSkeletonGroup.vue`, `Configuration.vue`, `QueueSidebar.vue`, `BaseWindow.vue`, `ProjectKanban.vue`, `DesktopWindowManager.vue`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **What connects `$schema`, `semi`, `singleQuote` to the rest of the system?**
  _115 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `HealthTrackingInsights.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.052597402597402594 - nodes in this community are weakly interconnected._
- **Should `KademTabs.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.1368421052631579 - nodes in this community are weakly interconnected._
- **Should `KademNexo.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.04713804713804714 - nodes in this community are weakly interconnected._