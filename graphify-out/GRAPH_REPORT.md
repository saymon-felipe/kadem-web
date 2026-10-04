# Graph Report - kadem-web  (2026-10-03)

## Corpus Check
- 223 files · ~261,761 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2377 nodes · 4087 edges · 142 communities (129 shown, 13 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.76)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `57a9dff5`
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
- decode_html_entities
- PlayerWrapper.vue
- NexoInvestmentsTab.vue
- homeView.vue
- syncService.js
- AccountCenter.vue
- TrackList.vue
- PlaylistHeader.vue
- resetPasswordView.vue
- headerSystem.vue
- reloadAll
- useVaultStore
- AccountList.vue
- dependencies
- devDependencies
- HealthCheckinModal.vue
- TaskRelations.vue
- ProjectKanban.vue
- authView.vue
- TrackOptionsMenu.vue
- db.js
- VideoModal.vue
- ConfirmationModal.vue
- buildSvgCurvePath
- normalize
- BaseModal.vue
- StartMenu.vue
- MainInformations.vue
- financeService.js
- vault.js
- sameId
- MacroCategoryCombo.vue
- main.js
- health.js
- biometricAuth.js
- SearchableDropdown.vue
- ReauthModal.vue
- findCategory
- KademSkeletonGroup.vue
- AudioSettingsPanel.vue
- HealthActionModal.vue
- BaseWindow.vue
- QueueSidebar.vue
- MfaChallenge.vue
- healthGroups.test.js
- useAppStore
- buildCsvExactKey
- OtpInput.vue
- scripts
- HealthCategoryModal.vue
- HealthObjectModal.vue
- switchComponent.vue
- CustomDropdown.vue
- radioNormalizationIntegration.test.js
- HealthRelationModal.vue
- HealthTrackerGroupModal.vue
- HealthTrackerModal.vue
- DevicesSection.vue
- apiErrorMessage
- package.json
- PipManager.vue
- MediaSessionManager
- exclude
- NexoCsvPreviewModal.vue
- .prettierrc.json
- close_attachment_preview
- dueDays
- README.md
- snapshot_task
- close_comment_menu
- kanban.js
- Como configurar o Background do Modo Escuro no Kadem
- createGoalForm
- activeInvestmentTab
- biometricAuth.test.js
- AGENTS.md
- useWindowStore
- securityService.js
- buildTransactionSearchText
- HealthPublicCardTab.vue
- UploadTrackModal.vue
- getPlanLimits
- app.js
- moneyInput
- PasskeysSection.vue
- MfaSection.vue
- global.js
- player.js
- RecoveryEmailModal.vue
- ProjectWorkspaceTab.vue
- select_playlist
- Configuration.vue
- usePlayerStore
- deleteInvestmentGoal
- close_options
- openConfirmation
- auth.js
- ProjectsWindow.vue
- kanbanBoard.test.js
- finish_task_drag_preview
- goalCurrentAmount
- financeSync.test.js
- expandWrappedCsvRow
- refresh_attachment_row
- findMacroByName
- animate_filter_change
- cancel_create_task
- parse_srt
- loadAiUsage
- @fortawesome/fontawesome-svg-core
- download_attachment
- vite-plugin-pwa
- cancel_edit_comment

## God Nodes (most connected - your core abstractions)
1. `useAuthStore` - 48 edges
2. `useAppStore` - 29 edges
3. `apiErrorMessage()` - 27 edges
4. `usePlayerStore` - 26 edges
5. `api` - 25 edges
6. `useVaultStore` - 21 edges
7. `db` - 20 edges
8. `useUtilsStore` - 19 edges
9. `scripts` - 17 edges
10. `VolumeNormalizer` - 17 edges

## Surprising Connections (you probably didn't know these)
- `useProjectStore` --indirect_call--> `local_id()`  [INFERRED]
  src/stores/projects.js → tests/uiPerformance.test.js
- `makeStore()` --indirect_call--> `selectivePersistence()`  [INFERRED]
  tests/uiPerformance.test.js → src/plugins/selectivePersistence.js
- `usePlayerStore` --indirect_call--> `track()`  [INFERRED]
  src/stores/player.js → src/components/radio/LyricsModal.vue
- `setup()` --calls--> `useRadioStore`  [EXTRACTED]
  src/components/radio/PlayerWrapper.vue → src/stores/radio.js
- `disconnectOthers()` --calls--> `apiErrorMessage()`  [EXTRACTED]
  src/components/security/DevicesSection.vue → src/services/securityService.js

## Import Cycles
- 3-file cycle: `src/router/index.js -> src/views/InviteLanding.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/services/syncService.js -> src/stores/auth.js -> src/stores/vault.js -> src/services/syncService.js`
- 3-file cycle: `src/router/index.js -> src/views/homeView.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/router/index.js -> src/views/authView.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/router/index.js -> src/views/logoutView.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/router/index.js -> src/views/resetPasswordView.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/plugins/api.js -> src/stores/projects.js -> src/stores/utils.js -> src/plugins/api.js`
- 4-file cycle: `src/components/headerSystem.vue -> src/stores/auth.js -> src/router/index.js -> src/views/homeView.vue -> src/components/headerSystem.vue`
- 5-file cycle: `src/router/index.js -> src/views/authView.vue -> src/stores/vault.js -> src/services/syncService.js -> src/stores/auth.js -> src/router/index.js`
- 5-file cycle: `src/router/index.js -> src/views/homeView.vue -> src/stores/vault.js -> src/services/syncService.js -> src/stores/auth.js -> src/router/index.js`
- 5-file cycle: `src/components/SubscriptionModal.vue -> src/stores/auth.js -> src/router/index.js -> src/views/homeView.vue -> src/components/headerSystem.vue -> src/components/SubscriptionModal.vue`
- 5-file cycle: `src/components/headerSystem.vue -> src/components/startMenu/StartMenu.vue -> src/stores/auth.js -> src/router/index.js -> src/views/homeView.vue -> src/components/headerSystem.vue`
- 5-file cycle: `src/components/headerSystem.vue -> src/stores/aiCredits.js -> src/stores/auth.js -> src/router/index.js -> src/views/homeView.vue -> src/components/headerSystem.vue`

## Communities (142 total, 13 thin omitted)

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
Cohesion: 0.05
Nodes (4): calculate_dropdown_position(), close_assignee_menu(), select_assignee(), toggle_assignee_menu()

### Community 4 - "RadioFlow.vue"
Cohesion: 0.06
Nodes (6): fetch_search_results(), format_bytes(), handle_load_more(), perform_mobile_search(), perform_search(), upload_usage_label()

### Community 5 - "CategoryCombo.vue"
Cohesion: 0.19
Nodes (12): close(), filteredCategories(), handleOutsideClick(), handleViewportChange(), normalize(), open(), requestCreate(), sameId() (+4 more)

### Community 6 - "HealthWindow.vue"
Cohesion: 0.05
Nodes (9): cancelArchiveTracker(), cancelDeleteEvent(), cancelDeleteTrackerGroup(), confirmArchiveTracker(), confirmDeleteEvent(), confirmDeleteTrackerGroup(), HEALTH_TAB_IDS, isLowStock() (+1 more)

### Community 7 - "NewProject.vue"
Cohesion: 0.06
Nodes (12): modelValue(), reset_state(), save_crop(), trigger_input(), checkInviteErrors(), displayList(), handleCancelNewGroup(), handleCreateProject() (+4 more)

### Community 9 - "decode_html_entities"
Cohesion: 0.23
Nodes (8): visible_tracks(), get_visible_playlist_tracks(), normalize_search(), sort_value(), title_collator, decode_html_entities(), decoded_cache, tracks

### Community 10 - "PlayerWrapper.vue"
Cohesion: 0.06
Nodes (25): bring_lyrics_to_front(), bring_video_to_front(), format_seconds_to_time(), formatted_current_time(), formatted_duration(), get_current_time(), get_duration(), handle_pip_play_toggle() (+17 more)

### Community 12 - "homeView.vue"
Cohesion: 0.07
Nodes (9): create_yt_player(), init_youtube_api(), mounted(), mounted(), updateClock(), checkIfReady(), handler(), init_connection_monitor() (+1 more)

### Community 13 - "syncService.js"
Cohesion: 0.10
Nodes (38): attachmentUploads, finishAttachmentUpload(), reportAttachmentUpload(), buildChangesArray(), delay(), deleteFinanceLocalRecord(), _handleAccountTask(), _handleFinanceTask() (+30 more)

### Community 14 - "AccountCenter.vue"
Cohesion: 0.14
Nodes (8): "auth.user.email"(), handleBiometricUnlock(), handleCloseModal(), handleSaveNewAccount(), mounted(), refreshVaultBiometricStatus(), toggleVaultBiometrics(), isBiometricCancellationError()

### Community 15 - "TrackList.vue"
Cohesion: 0.07
Nodes (13): create_fallback_thumb(), handle_add_queue(), handle_desktop_dbl_click(), handle_download_lyrics(), handle_row_click(), is_track_unavailable(), mounted(), on_drag_start() (+5 more)

### Community 16 - "PlaylistHeader.vue"
Cohesion: 0.07
Nodes (6): close_download_menu(), closeMenu(), format_total_duration_verbose(), toggle_download_menu(), toggle_options_menu(), total_duration_formatted()

### Community 17 - "resetPasswordView.vue"
Cohesion: 0.10
Nodes (12): completeLink(), handleAlexaLogin(), onMfaVerified(), backToPassword(), continueToSessions(), endsCurrentSession(), mounted(), passwordError() (+4 more)

### Community 19 - "headerSystem.vue"
Cohesion: 0.06
Nodes (19): ai_credits_remaining(), ai_credits_total(), ai_credits_used(), closeAllPopups(), closeContextMenu(), handleMenuClick(), handler(), mounted() (+11 more)

### Community 20 - "reloadAll"
Cohesion: 0.12
Nodes (27): closeDeleteConfirm(), confirmCsvImport(), confirmDeleteAction(), deleteConnection(), deleteInvestmentEvent(), loadBudgets(), loadCategories(), loadConnections() (+19 more)

### Community 21 - "useVaultStore"
Cohesion: 0.16
Nodes (7): handleGenerateRecovery(), handleMigration(), setup(), handleRescue(), base64ToBuffer(), bufferToBase64(), useVaultStore

### Community 23 - "dependencies"
Cohesion: 0.07
Nodes (29): axios, dexie, @fortawesome/free-solid-svg-icons, @fortawesome/vue-fontawesome, lodash.isequal, moment, dependencies, axios (+21 more)

### Community 24 - "devDependencies"
Cohesion: 0.07
Nodes (29): eslint, @eslint/js, eslint-plugin-oxlint, eslint-plugin-vue, fake-indexeddb, globals, npm-run-all2, oxlint (+21 more)

### Community 25 - "HealthCheckinModal.vue"
Cohesion: 0.10
Nodes (10): clearAll(), clearField(), filledCount(), hasValue(), localDateTime(), parsedTags(), removeTag(), reset() (+2 more)

### Community 27 - "TaskRelations.vue"
Cohesion: 0.11
Nodes (5): candidates(), completedChildrenCount(), isTaskDone(), toggleChildCompletion(), canSetTaskParent()

### Community 28 - "ProjectKanban.vue"
Cohesion: 0.05
Nodes (8): closeDropdown(), handleSelectProject(), beforeUnmount(), close_confirmation(), handle_confirm_delete(), on_column_drag_end(), close_dropdown(), select_status()

### Community 29 - "authView.vue"
Cohesion: 0.09
Nodes (25): getErrorNameChain(), isLocalDbUnavailableError(), getBiometricStatus(), afterLogin(), auth(), checkBiometricSupport(), checkPasswordStrength(), confirmBiometrics() (+17 more)

### Community 30 - "TrackOptionsMenu.vue"
Cohesion: 0.09
Nodes (8): beforeUnmount(), cancel_close(), close_on_hover(), open(), open_on_hover(), position_panel(), supports_hover(), toggle_on_touch()

### Community 31 - "db.js"
Cohesion: 0.10
Nodes (27): canUseBrowserStorage(), clearLocalDbIssue(), consumeLocalDbIssue(), createIssuePayload(), createLocalDbUnavailableError(), db, emitLocalDbIssue(), ensureDbOpen() (+19 more)

### Community 32 - "VideoModal.vue"
Cohesion: 0.06
Nodes (43): active_index(), check_scroll_position(), close_modal(), current_time(), get_track_key(), handle_scroll(), handler(), modelValue() (+35 more)

### Community 34 - "buildSvgCurvePath"
Cohesion: 0.40
Nodes (5): buildSvgCurvePath(), calcCurveInterest(), calcCurveInvested(), calcCurveTotal(), projectionCurvePath()

### Community 35 - "normalize"
Cohesion: 0.16
Nodes (20): autoCategorize(), buildCsvObservation(), cleanCsvCell(), displayInsights(), findCategoryByName(), findColumnIndex(), handleCsvFileChange(), loadInsights() (+12 more)

### Community 36 - "BaseModal.vue"
Cohesion: 0.17
Nodes (13): beforeUnmount(), close(), destroyObservers(), handleKeydown(), handler(), handleResize(), handleTouchEnd(), initObservers() (+5 more)

### Community 37 - "StartMenu.vue"
Cohesion: 0.17
Nodes (7): closeProjectView(), goToLogoutScreen(), handleLogoutClick(), openCreateProject(), openEditProject(), setActiveTab(), setActiveTabById()

### Community 38 - "MainInformations.vue"
Cohesion: 0.12
Nodes (4): cancelAddOccupation(), handleAddNewOccupation(), handleSaveBio(), toggleBioEdit()

### Community 39 - "financeService.js"
Cohesion: 0.09
Nodes (23): entityMatchesAnyServerId(), entityReferenceIds(), entityServerId(), financeService, findLocalMacro(), isServerId(), pendingDeleteServerIds(), preparePendingMacroUpdate() (+15 more)

### Community 40 - "vault.js"
Cohesion: 0.50
Nodes (3): accountsRepository, decoder, encoder

### Community 41 - "sameId"
Cohesion: 0.22
Nodes (14): applyPendingCategorySelection(), applyTransactionPatch(), enrichTransactionForList(), groupedCategories(), resolveSavedCategory(), sameId(), selectTransactionCategory(), sortTransactionsList() (+6 more)

### Community 43 - "MacroCategoryCombo.vue"
Cohesion: 0.18
Nodes (11): close(), createValue(), filteredMacros(), handleOutsideClick(), handleViewportChange(), normalize(), open(), select() (+3 more)

### Community 44 - "main.js"
Cohesion: 0.14
Nodes (11): frames, vAnimateHeight, app, pinia, utils_store, router, routes, beforeUnmount() (+3 more)

### Community 45 - "health.js"
Cohesion: 0.24
Nodes (10): DIGESTIVE_WELLBEING_TEMPLATE, addInterval(), controlFields, DEFAULT_HEALTH_UNITS, DEFAULT_TRACKER_GROUPS, HEALTH_RECORD_TYPES, localKey(), now() (+2 more)

### Community 47 - "biometricAuth.js"
Cohesion: 0.35
Nodes (10): authenticateVaultWithBiometrics(), authenticateVaultWithLocalBiometrics(), bufferToBase64Url(), credentialForVerification(), getWebAuthn(), prepareVaultBiometricUnlock(), registerBiometricCredential(), reportBiometricFailure() (+2 more)

### Community 48 - "SearchableDropdown.vue"
Cohesion: 0.14
Nodes (6): calculate_position(), close(), handle_click_outside(), open(), select_option(), toggle()

### Community 49 - "ReauthModal.vue"
Cohesion: 0.11
Nodes (11): cancel(), clear(), handler(), METHOD_ORDER, onModelUpdate(), prepare(), sendEmail(), startCooldown() (+3 more)

### Community 50 - "findCategory"
Cohesion: 0.14
Nodes (17): addBudgetGroup(), addBudgetItem(), availableCategoriesForMacro(), budgetSummary(), categoriesForMacro(), closeTransactionForm(), findCategory(), hydrateBudgetGroup() (+9 more)

### Community 52 - "KademSkeletonGroup.vue"
Cohesion: 0.14
Nodes (4): skeleton_style(), to_css_size(), loadingContinuity, APP_NAMES

### Community 53 - "AudioSettingsPanel.vue"
Cohesion: 0.05
Nodes (19): reset_band(), update_band(), AUDIO_BANDS, audio_headroom_db(), AUDIO_PRESETS, bounded(), default_audio_settings(), sanitize_audio_settings() (+11 more)

### Community 54 - "HealthActionModal.vue"
Cohesion: 0.20
Nodes (3): localDateTime(), resetForm(), visible()

### Community 55 - "BaseWindow.vue"
Cohesion: 0.19
Nodes (4): focus(), startDrag(), startResize(), windowComponentMap

### Community 56 - "QueueSidebar.vue"
Cohesion: 0.12
Nodes (20): animate_queue_changes(), AUTOSCROLL_END_EVENTS, AUTOSCROLL_POINTER_EVENTS, beforeUnmount(), capture_queue_positions(), get(), handle_drag_end(), handle_drag_start() (+12 more)

### Community 57 - "MfaChallenge.vue"
Cohesion: 0.11
Nodes (12): codeComplete(), METHOD_DESCRIPTIONS, METHOD_ICONS, METHOD_ORDER, sendEmail(), startCooldown(), codeComplete(), onInput() (+4 more)

### Community 58 - "healthGroups.test.js"
Cohesion: 0.18
Nodes (3): mockLocalStorage, mockLocation, storage

### Community 59 - "useAppStore"
Cohesion: 0.17
Nodes (11): created(), repairStorage(), handle_save_task(), open_related_task(), setTheme(), toggleTheme(), onLocalDbIssue(), repairLocalEnvironment() (+3 more)

### Community 60 - "buildCsvExactKey"
Cohesion: 0.31
Nodes (10): buildCsvExactKey(), buildCsvLegacyKey(), buildTransactionCandidateMaps(), consumeCandidate(), csvAmountKey(), csvDateOnly(), csvHasMeaningfulTime(), filterCsvDuplicates() (+2 more)

### Community 64 - "scripts"
Cohesion: 0.12
Nodes (17): scripts, build, dev, format, lint, lint:eslint, lint:oxlint, preview (+9 more)

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
Cohesion: 0.20
Nodes (7): beforeUnmount(), close(), handle_outside_pointer_down(), open(), select_option(), toggle(), update_position()

### Community 69 - "radioNormalizationIntegration.test.js"
Cohesion: 0.05
Nodes (8): selectivePersistence(), Context, Media, Node, Parameter, Worklet, local_id(), makeStore()

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
Cohesion: 0.20
Nodes (9): submit(), sendLink(), submit(), active(), loadDevices(), onDevicesChanged(), online(), reload() (+1 more)

### Community 75 - "package.json"
Cohesion: 0.29
Nodes (6): engines, node, name, private, type, version

### Community 76 - "PipManager.vue"
Cohesion: 0.15
Nodes (17): current_music(), current_time(), draw_canvas_content(), draw_image_cover(), draw_pause_icon(), draw_play_icon(), draw_round_rect(), fill_text_with_ellipsis() (+9 more)

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
Cohesion: 0.40
Nodes (6): apply_responsible_change(), get_clean_task_data(), handler(), is_dirty(), snapshot_task(), sync_responsible_wrapper()

### Community 86 - "close_comment_menu"
Cohesion: 0.50
Nodes (4): close_comment_menu(), delete_comment(), edit_comment(), handle_global_click()

### Community 87 - "kanban.js"
Cohesion: 0.25
Nodes (8): kanbanRepository, projectRepository, loadKanbanSyncs(), useKanbanStore, DEFAULT_COLUMN_TYPE, isColumnType(), KANBAN_COLUMN_TYPES, normalizeColumn()

### Community 89 - "createGoalForm"
Cohesion: 0.50
Nodes (4): createGoalForm(), data(), resetGoalForm(), submitGoal()

### Community 90 - "activeInvestmentTab"
Cohesion: 0.67
Nodes (3): activeInvestmentTab(), mounted(), updateChartDimensions()

### Community 95 - "useWindowStore"
Cohesion: 0.13
Nodes (3): handleWindowClick(), beforeUnmount(), useWindowStore

### Community 96 - "securityService.js"
Cohesion: 0.24
Nodes (8): cancel(), confirm(), modelValue(), reset(), start(), apiErrorCode(), mfaMethodLabels, securityService

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
Cohesion: 0.18
Nodes (11): limits(), plan_limits(), video_quality_options(), can_download_individually(), plan_limits(), video_quality_options(), limits(), getOfflineVideoQualities() (+3 more)

### Community 103 - "app.js"
Cohesion: 0.29
Nodes (3): buildThemeStorageKey(), lightThemePaths, resolveThemeUserId()

### Community 104 - "moneyInput"
Cohesion: 0.20
Nodes (12): deleteTransaction(), money(), moneyInput(), openConfirmation(), openTransactionForm(), parseMoneyInput(), removeTransactionFromList(), requestDeleteTransaction() (+4 more)

### Community 105 - "PasskeysSection.vue"
Cohesion: 0.23
Nodes (8): add(), deviceName(), mounted(), remove(), biometricDeclinedKey(), isBiometricSupported(), rememberedEmailKey, declineBiometrics()

### Community 109 - "MfaSection.vue"
Cohesion: 0.13
Nodes (4): disable(), regenerate(), removeRecoveryEmail(), run()

### Community 110 - "global.js"
Cohesion: 0.27
Nodes (4): beginGlobalDrag(), endGlobalDrag(), resetGlobalDrag(), setGlobalDragging()

### Community 111 - "player.js"
Cohesion: 0.13
Nodes (17): api, check_system_health(), CSRF_EXEMPT_PATHS, ensureCsrfToken(), getCookie(), isCsrfExempt(), MUTATION_METHODS, normalizePath() (+9 more)

### Community 112 - "RecoveryEmailModal.vue"
Cohesion: 0.25
Nodes (6): cancel(), confirm(), modelValue(), reset(), sendCode(), startCooldown()

### Community 117 - "select_playlist"
Cohesion: 0.22
Nodes (10): close_search(), handle_create_playlist(), handle_delete_playlist(), handle_mobile_select_playlist(), handler(), load_data(), mounted(), observe_container_size() (+2 more)

### Community 118 - "Configuration.vue"
Cohesion: 0.40
Nodes (7): handlePwaInstall(), mounted(), getPwaInstallUnavailableMessage(), isIOSDevice(), isPwaInstalled(), isStandalone(), requestPwaInstall()

### Community 120 - "usePlayerStore"
Cohesion: 0.21
Nodes (11): activeTab(), data(), setup(), data(), player_store(), RADIO_FLOW_WINDOW, radio_store(), radioFlowApi (+3 more)

### Community 121 - "deleteInvestmentGoal"
Cohesion: 0.38
Nodes (7): deleteInvestmentGoal(), investmentGoalKey(), investmentGoalMatches(), removeInvestmentGoalFromList(), requestDeleteInvestmentGoal(), saveInvestmentGoal(), upsertInvestmentGoalInList()

### Community 122 - "close_options"
Cohesion: 0.25
Nodes (8): close_options(), close_search(), emit_delete_request(), handle_click_outside_search(), open_type_config(), show_new_task_form(), start_rename(), toggle_search()

### Community 124 - "openConfirmation"
Cohesion: 0.33
Nodes (7): delete_track(), execute_add_track(), handle_add_to_another_playlist(), handle_delete_track(), handle_upload_submit(), openConfirmation(), verify_and_add_track()

### Community 125 - "auth.js"
Cohesion: 0.13
Nodes (19): setup(), data(), canUseLocalStorage(), clearSessionRefresh(), getLastSessionRefresh(), getSessionRefreshRemainingMs(), hasValidSessionRefresh(), markSessionRefreshed() (+11 more)

### Community 126 - "ProjectsWindow.vue"
Cohesion: 0.13
Nodes (12): close_tab(), focus_active_tab(), handle_duplicate_tab(), handle_open_tab(), handle_tab_click(), handle_tab_keydown(), on_tab_mousedown(), reset_drag_state() (+4 more)

### Community 127 - "kanbanBoard.test.js"
Cohesion: 0.36
Nodes (5): createViteServer(), installMemoryStorage(), loadBoard(), stubRouter, withHierarchyBoard()

### Community 128 - "finish_task_drag_preview"
Cohesion: 0.53
Nodes (6): cancel_task_drag_preview_cleanup(), finish_task_drag_preview(), measure_natural_column_height(), restore_task_drag_preview(), schedule_task_drag_preview_cleanup(), update_task_drag_preview()

### Community 130 - "goalCurrentAmount"
Cohesion: 0.40
Nodes (5): goalCurrentAmount(), goalProgress(), heroProgressPercent(), heroProgressText(), nearestGoal()

### Community 131 - "financeSync.test.js"
Cohesion: 0.33
Nodes (3): installMemoryStorage(), loadOfflineFinance(), stubRouter

### Community 132 - "expandWrappedCsvRow"
Cohesion: 0.83
Nodes (4): expandWrappedCsvRow(), isWrappedCsvRow(), normalizeParsedCsvRows(), splitCsvLine()

### Community 135 - "refresh_attachment_row"
Cohesion: 0.50
Nodes (4): handle_attachment_selected(), refresh_attachment_row(), uploading_attachment_ids(), upsert_attachment_row()

### Community 137 - "findMacroByName"
Cohesion: 0.29
Nodes (7): categoryTargetMacro(), findMacroByName(), macroKey(), onCategoryMacroChange(), openMacroForm(), resolveMacroRecord(), selectBudgetMacro()

### Community 139 - "animate_filter_change"
Cohesion: 0.25
Nodes (8): animate_filter_change(), animate_filter_task(), beforeUnmount(), cancel_filter_task_animations(), filter_values(), on_task_drag_end(), on_task_drag_start(), stop_tracking_task_drag()

### Community 140 - "cancel_create_task"
Cohesion: 1.00
Nodes (3): cancel_create_task(), handle_click_outside_creation(), handle_create_task()

### Community 141 - "parse_srt"
Cohesion: 0.83
Nodes (3): clean_text(), parse_srt(), time_to_seconds()

### Community 144 - "loadAiUsage"
Cohesion: 0.67
Nodes (3): activeTab(), loadAiUsage(), mounted()

### Community 146 - "download_attachment"
Cohesion: 0.67
Nodes (3): download_attachment(), get_attachment_download_name(), trigger_browser_download()

## Knowledge Gaps
- **128 isolated node(s):** `$schema`, `semi`, `singleQuote`, `printWidth`, `paths` (+123 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAuthStore` connect `auth.js` to `KademNexo.vue`, `KanbanColumn.vue`, `HealthWindow.vue`, `NewProject.vue`, `homeView.vue`, `syncService.js`, `AccountCenter.vue`, `TrackList.vue`, `PlaylistHeader.vue`, `resetPasswordView.vue`, `TaskDetailForm.vue`, `headerSystem.vue`, `useVaultStore`, `TaskRelations.vue`, `ProjectKanban.vue`, `authView.vue`, `StartMenu.vue`, `MainInformations.vue`, `main.js`, `health.js`, `ReauthModal.vue`, `apiErrorMessage`, `kanban.js`, `useWindowStore`, `PasskeysSection.vue`, `player.js`?**
  _High betweenness centrality (0.112) - this node is a cross-community bridge._
- **Why does `usePlayerStore` connect `usePlayerStore` to `VideoModal.vue`, `KademNexo.vue`, `RadioFlow.vue`, `HealthWindow.vue`, `PlayerWrapper.vue`, `NexoInvestmentsTab.vue`, `homeView.vue`, `radioFlowWidget.vue`, `TrackList.vue`, `loadAiUsage`, `player.js`, `KademSkeletonGroup.vue`, `AudioSettingsPanel.vue`, `QueueSidebar.vue`, `createGoalForm`, `activeInvestmentTab`, `auth.js`, `useWindowStore`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `useAppStore` connect `useAppStore` to `RadioFlow.vue`, `homeView.vue`, `AccountCenter.vue`, `TaskDetailForm.vue`, `headerSystem.vue`, `useVaultStore`, `ProjectKanban.vue`, `StartMenu.vue`, `main.js`, `ProjectList.vue`, `KademSkeletonGroup.vue`, `BaseWindow.vue`, `QueueSidebar.vue`, `DevicesSection.vue`, `apiErrorMessage`, `useWindowStore`, `app.js`, `PasskeysSection.vue`, `MfaSection.vue`, `Configuration.vue`, `auth.js`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **What connects `$schema`, `semi`, `singleQuote` to the rest of the system?**
  _128 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `HealthTrackingInsights.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.052597402597402594 - nodes in this community are weakly interconnected._
- **Should `KademTabs.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.1368421052631579 - nodes in this community are weakly interconnected._
- **Should `KademNexo.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.04713804713804714 - nodes in this community are weakly interconnected._