# Graph Report - kadem-web  (2026-10-13)

## Corpus Check
- 239 files · ~279,698 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2560 nodes · 4513 edges · 156 communities (140 shown, 16 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.78)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4a229e67`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- HealthTrackingTab.vue
- KademTabs.vue
- KademNexo.vue
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
- vault.js
- SubscriptionModal.vue
- dependencies
- devDependencies
- HealthCheckinModal.vue
- TaskRelations.vue
- ProjectKanban.vue
- authView.vue
- TrackOptionsMenu.vue
- db.js
- VideoModal.vue
- api.js
- buildSvgCurvePath
- normalize
- BaseModal.vue
- StartMenu.vue
- MainInformations.vue
- financeService.js
- ProductivityWindow.vue
- updateTransaction
- MacroCategoryCombo.vue
- main.js
- health.js
- biometricAuth.js
- SearchableDropdown.vue
- ReauthModal.vue
- findCategory
- loudness.js
- AudioSettingsPanel.vue
- HealthActionModal.vue
- BaseWindow.vue
- QueueSidebar.vue
- MfaChallenge.vue
- healthGroups.test.js
- RadioInsightsPanel.vue
- player.js
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
- VolumeNormalizer
- biometricAuth.test.js
- AGENTS.md
- HealthTrackingInsights.vue
- TotpSetupModal.vue
- AccountList.vue
- clampToMacroTone
- HealthPublicCardTab.vue
- UploadTrackModal.vue
- getPlanLimits
- app.js
- moneyInput
- PasskeysSection.vue
- MfaSection.vue
- global.js
- KanbanPresetPicker.vue
- RecoveryEmailModal.vue
- ProjectWorkspaceTab.vue
- ConfirmationModal.vue
- select_playlist
- Configuration.vue
- dateWidget.vue
- activeInvestmentTab
- deleteInvestmentGoal
- close_options
- logoutView.vue
- auth.js
- ProjectsWindow.vue
- kanbanBoard.test.js
- finish_task_drag_preview
- ProjectDropdown.vue
- GlobalPlayerHost.vue
- financeSync.test.js
- expandWrappedCsvRow
- refresh_attachment_row
- goalCurrentAmount
- findMacroByName
- healthInsights.js
- animate_filter_change
- cancel_create_task
- calculate_dropdown_position
- HealthTrackingOverview.vue
- close_assignee_menu
- loadAiUsage
- download_attachment
- mobileNavigation.js
- usePlayerStore
- ImageCropperModal.vue
- fake-indexeddb
- lodash.isequal
- cancel_edit_comment

## God Nodes (most connected - your core abstractions)
1. `useAuthStore` - 52 edges
2. `useAppStore` - 32 edges
3. `usePlayerStore` - 32 edges
4. `apiErrorMessage()` - 27 edges
5. `api` - 25 edges
6. `db` - 21 edges
7. `useUtilsStore` - 21 edges
8. `useVaultStore` - 21 edges
9. `scripts` - 18 edges
10. `VolumeNormalizer` - 17 edges

## Surprising Connections (you probably didn't know these)
- `makeStore()` --indirect_call--> `selectivePersistence()`  [INFERRED]
  tests/uiPerformance.test.js → src/plugins/selectivePersistence.js
- `useProjectStore` --indirect_call--> `local_id()`  [INFERRED]
  src/stores/projects.js → tests/uiPerformance.test.js
- `patterns()` --calls--> `findPatterns()`  [EXTRACTED]
  src/components/health/HealthTrackingInsights.vue → src/services/healthInsights.js
- `runComparison()` --calls--> `comparePattern()`  [EXTRACTED]
  src/components/health/HealthTrackingInsights.vue → src/services/healthInsights.js
- `usePlayerStore` --indirect_call--> `track()`  [INFERRED]
  src/stores/player.js → src/components/radio/LyricsModal.vue

## Import Cycles
- 3-file cycle: `src/router/index.js -> src/views/authView.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/router/index.js -> src/views/homeView.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/router/index.js -> src/views/InviteLanding.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/router/index.js -> src/views/logoutView.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/router/index.js -> src/views/resetPasswordView.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/services/syncService.js -> src/stores/auth.js -> src/stores/player.js -> src/services/syncService.js`
- 3-file cycle: `src/services/syncService.js -> src/stores/auth.js -> src/stores/radioInsights.js -> src/services/syncService.js`
- 3-file cycle: `src/services/syncService.js -> src/stores/auth.js -> src/stores/vault.js -> src/services/syncService.js`
- 3-file cycle: `src/services/syncService.js -> src/stores/radio.js -> src/stores/radioInsights.js -> src/services/syncService.js`
- 3-file cycle: `src/plugins/api.js -> src/stores/projects.js -> src/stores/utils.js -> src/plugins/api.js`
- 4-file cycle: `src/components/headerSystem.vue -> src/stores/auth.js -> src/router/index.js -> src/views/homeView.vue -> src/components/headerSystem.vue`
- 4-file cycle: `src/services/syncService.js -> src/stores/auth.js -> src/stores/radio.js -> src/stores/radioInsights.js -> src/services/syncService.js`
- 5-file cycle: `src/router/index.js -> src/views/authView.vue -> src/stores/vault.js -> src/services/syncService.js -> src/stores/auth.js -> src/router/index.js`
- 5-file cycle: `src/components/SubscriptionModal.vue -> src/stores/auth.js -> src/router/index.js -> src/views/homeView.vue -> src/components/headerSystem.vue -> src/components/SubscriptionModal.vue`
- 5-file cycle: `src/components/headerSystem.vue -> src/components/startMenu/StartMenu.vue -> src/stores/auth.js -> src/router/index.js -> src/views/homeView.vue -> src/components/headerSystem.vue`
- 5-file cycle: `src/components/headerSystem.vue -> src/stores/aiCredits.js -> src/stores/auth.js -> src/router/index.js -> src/views/homeView.vue -> src/components/headerSystem.vue`
- 5-file cycle: `src/router/index.js -> src/views/homeView.vue -> src/stores/vault.js -> src/services/syncService.js -> src/stores/auth.js -> src/router/index.js`
- 5-file cycle: `src/services/syncService.js -> src/stores/auth.js -> src/stores/player.js -> src/stores/radio.js -> src/stores/radioInsights.js -> src/services/syncService.js`

## Communities (156 total, 16 thin omitted)

### Community 0 - "HealthTrackingTab.vue"
Cohesion: 0.12
Nodes (4): selectedSummary(), latestValueDisplay(), recentCount(), trackerSummary()

### Community 1 - "KademTabs.vue"
Cohesion: 0.14
Nodes (6): checkScrollability(), currentTabId(), handler(), initResizeObserver(), mounted(), scrollToActiveTab()

### Community 2 - "KademNexo.vue"
Cohesion: 0.05
Nodes (24): appendBudgetAiMessage(), budgetAiStorageKey(), budgetGroupHeaderStyle(), budgetGroupStyle(), calendarDateParts(), countCsvDelimiters(), csvImportSummary(), deleteConnection() (+16 more)

### Community 4 - "RadioFlow.vue"
Cohesion: 0.05
Nodes (22): beforeUnmount(), close_playlist_filter(), close_playlist_filter_on_escape(), close_playlist_filter_on_outside_click(), delete_track(), execute_add_track(), fetch_search_results(), format_bytes() (+14 more)

### Community 5 - "CategoryCombo.vue"
Cohesion: 0.19
Nodes (12): close(), filteredCategories(), handleOutsideClick(), handleViewportChange(), normalize(), open(), requestCreate(), sameId() (+4 more)

### Community 6 - "HealthWindow.vue"
Cohesion: 0.05
Nodes (9): cancelArchiveTracker(), cancelDeleteEvent(), cancelDeleteTrackerGroup(), confirmArchiveTracker(), confirmDeleteEvent(), confirmDeleteTrackerGroup(), HEALTH_TAB_IDS, isLowStock() (+1 more)

### Community 7 - "NewProject.vue"
Cohesion: 0.10
Nodes (8): checkInviteErrors(), displayList(), handleCancelNewGroup(), handleCreateProject(), handleDeleteProject(), handleSave(), handleUpdateProject(), isMemberOwner()

### Community 9 - "decode_html_entities"
Cohesion: 0.23
Nodes (8): visible_tracks(), get_visible_playlist_tracks(), normalize_search(), sort_value(), title_collator, decode_html_entities(), decoded_cache, tracks

### Community 10 - "PlayerWrapper.vue"
Cohesion: 0.06
Nodes (27): bring_lyrics_to_front(), bring_video_to_front(), cycle_reaction(), format_seconds_to_time(), formatted_current_time(), formatted_duration(), get_current_time(), get_duration() (+19 more)

### Community 12 - "homeView.vue"
Cohesion: 0.12
Nodes (4): checkIfReady(), handler(), init_connection_monitor(), preloadImage()

### Community 13 - "syncService.js"
Cohesion: 0.08
Nodes (45): attachmentUploads, finishAttachmentUpload(), reportAttachmentUpload(), isRadioInsightsTask(), buildChangesArray(), delay(), deleteFinanceLocalRecord(), _handleAccountTask() (+37 more)

### Community 14 - "AccountCenter.vue"
Cohesion: 0.14
Nodes (7): "auth.user.email"(), handleBiometricUnlock(), handleCloseModal(), handleSaveNewAccount(), mounted(), refreshVaultBiometricStatus(), toggleVaultBiometrics()

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
Cohesion: 0.11
Nodes (14): ai_credits_remaining(), ai_credits_total(), ai_credits_used(), closeAllPopups(), closeContextMenu(), handleMenuClick(), handler(), mobile_back() (+6 more)

### Community 20 - "reloadAll"
Cohesion: 0.15
Nodes (23): closeDeleteConfirm(), confirmCsvImport(), confirmDeleteAction(), deleteInvestmentEvent(), loadBudgets(), loadCategories(), loadDashboard(), loadInvestmentRates() (+15 more)

### Community 21 - "vault.js"
Cohesion: 0.13
Nodes (10): handleGenerateRecovery(), handleMigration(), handleRescue(), data(), accountsRepository, base64ToBuffer(), bufferToBase64(), decoder (+2 more)

### Community 22 - "SubscriptionModal.vue"
Cohesion: 0.17
Nodes (6): check_cpf(), go_to_checkout(), handle_checkout(), request_cancel(), requestClose(), resetState()

### Community 23 - "dependencies"
Cohesion: 0.07
Nodes (29): axios, dexie, @fortawesome/fontawesome-svg-core, @fortawesome/free-solid-svg-icons, @fortawesome/vue-fontawesome, moment, dependencies, axios (+21 more)

### Community 24 - "devDependencies"
Cohesion: 0.07
Nodes (29): eslint, @eslint/js, eslint-plugin-oxlint, eslint-plugin-vue, globals, npm-run-all2, oxlint, devDependencies (+21 more)

### Community 25 - "HealthCheckinModal.vue"
Cohesion: 0.10
Nodes (10): clearAll(), clearField(), filledCount(), hasValue(), localDateTime(), parsedTags(), removeTag(), reset() (+2 more)

### Community 27 - "TaskRelations.vue"
Cohesion: 0.11
Nodes (5): candidates(), completedChildrenCount(), isTaskDone(), toggleChildCompletion(), canSetTaskParent()

### Community 28 - "ProjectKanban.vue"
Cohesion: 0.08
Nodes (4): beforeUnmount(), close_confirmation(), handle_confirm_delete(), on_column_drag_end()

### Community 29 - "authView.vue"
Cohesion: 0.09
Nodes (24): setup(), useAuthStore, afterLogin(), auth(), checkPasswordStrength(), confirmBiometrics(), confirmTrust(), continueAfterLogin() (+16 more)

### Community 30 - "TrackOptionsMenu.vue"
Cohesion: 0.09
Nodes (8): beforeUnmount(), cancel_close(), close_on_hover(), open(), open_on_hover(), position_panel(), supports_hover(), toggle_on_touch()

### Community 31 - "db.js"
Cohesion: 0.11
Nodes (28): repairStorage(), canUseBrowserStorage(), clearLocalDbIssue(), consumeLocalDbIssue(), createIssuePayload(), createLocalDbUnavailableError(), emitLocalDbIssue(), ensureDbOpen() (+20 more)

### Community 32 - "VideoModal.vue"
Cohesion: 0.06
Nodes (50): active_index(), check_scroll_position(), close_modal(), current_time(), get_track_key(), handle_scroll(), handler(), modelValue() (+42 more)

### Community 33 - "api.js"
Cohesion: 0.13
Nodes (13): api, check_system_health(), CSRF_EXEMPT_PATHS, ensureCsrfToken(), getCookie(), isCsrfExempt(), MUTATION_METHODS, normalizePath() (+5 more)

### Community 34 - "buildSvgCurvePath"
Cohesion: 0.40
Nodes (5): buildSvgCurvePath(), calcCurveInterest(), calcCurveInvested(), calcCurveTotal(), projectionCurvePath()

### Community 35 - "normalize"
Cohesion: 0.12
Nodes (28): autoCategorize(), buildCsvExactKey(), buildCsvLegacyKey(), buildCsvObservation(), buildTransactionCandidateMaps(), cleanCsvCell(), consumeCandidate(), csvAmountKey() (+20 more)

### Community 36 - "BaseModal.vue"
Cohesion: 0.16
Nodes (15): beforeUnmount(), close(), destroyObservers(), handleKeydown(), handleMobileBack(), handler(), handleResize(), handleTouchEnd() (+7 more)

### Community 37 - "StartMenu.vue"
Cohesion: 0.15
Nodes (8): closeProjectView(), goToLogoutScreen(), handleLogoutClick(), mobile_back(), openCreateProject(), openEditProject(), setActiveTab(), setActiveTabById()

### Community 38 - "MainInformations.vue"
Cohesion: 0.12
Nodes (4): cancelAddOccupation(), handleAddNewOccupation(), handleSaveBio(), toggleBioEdit()

### Community 39 - "financeService.js"
Cohesion: 0.09
Nodes (23): entityMatchesAnyServerId(), entityReferenceIds(), entityServerId(), financeService, findLocalMacro(), isServerId(), pendingDeleteServerIds(), preparePendingMacroUpdate() (+15 more)

### Community 41 - "updateTransaction"
Cohesion: 0.18
Nodes (16): applyPendingCategorySelection(), applyTransactionPatch(), deleteTransaction(), enrichTransactionForList(), openConfirmation(), removeTransactionFromList(), requestDeleteTransaction(), resolveSavedCategory() (+8 more)

### Community 43 - "MacroCategoryCombo.vue"
Cohesion: 0.18
Nodes (11): close(), createValue(), filteredMacros(), handleOutsideClick(), handleViewportChange(), normalize(), open(), select() (+3 more)

### Community 44 - "main.js"
Cohesion: 0.20
Nodes (8): frames, vAnimateHeight, app, pinia, utils_store, router, routes, radioFlowApi

### Community 45 - "health.js"
Cohesion: 0.17
Nodes (11): DIGESTIVE_WELLBEING_TEMPLATE, healthRepository, addInterval(), controlFields, DEFAULT_HEALTH_UNITS, DEFAULT_TRACKER_GROUPS, HEALTH_RECORD_TYPES, localKey() (+3 more)

### Community 47 - "biometricAuth.js"
Cohesion: 0.26
Nodes (14): usePasskey(), authenticateVaultWithBiometrics(), authenticateVaultWithLocalBiometrics(), authenticateWithBiometrics(), bufferToBase64Url(), credentialForVerification(), getBiometricStatus(), getWebAuthn() (+6 more)

### Community 48 - "SearchableDropdown.vue"
Cohesion: 0.13
Nodes (7): calculate_position(), close(), handle_click_outside(), mobile_back(), open(), select_option(), toggle()

### Community 49 - "ReauthModal.vue"
Cohesion: 0.12
Nodes (9): cancel(), clear(), handler(), METHOD_ORDER, onModelUpdate(), prepare(), sendEmail(), startCooldown() (+1 more)

### Community 50 - "findCategory"
Cohesion: 0.11
Nodes (23): budgetSummary(), buildTransactionSearchText(), categoryKey(), categoryTypeLabel(), closeTransactionForm(), filteredCategories(), filteredTransactions(), findCategory() (+15 more)

### Community 52 - "loudness.js"
Cohesion: 0.15
Nodes (10): coefficients(), db_to_gain(), gain_to_db(), LoudnessMeter, MAX_GAIN_DB, normalization_gain(), profile_key(), TARGET_LUFS (+2 more)

### Community 54 - "HealthActionModal.vue"
Cohesion: 0.20
Nodes (3): localDateTime(), resetForm(), visible()

### Community 55 - "BaseWindow.vue"
Cohesion: 0.10
Nodes (10): handleWindowClick(), focus(), minimize(), mobile_back(), startDrag(), startResize(), windowComponentMap, beforeUnmount() (+2 more)

### Community 56 - "QueueSidebar.vue"
Cohesion: 0.12
Nodes (20): animate_queue_changes(), AUTOSCROLL_END_EVENTS, AUTOSCROLL_POINTER_EVENTS, beforeUnmount(), capture_queue_positions(), get(), handle_drag_end(), handle_drag_start() (+12 more)

### Community 57 - "MfaChallenge.vue"
Cohesion: 0.12
Nodes (6): METHOD_DESCRIPTIONS, METHOD_ICONS, METHOD_ORDER, sendEmail(), startCooldown(), submit()

### Community 58 - "healthGroups.test.js"
Cohesion: 0.18
Nodes (3): mockLocalStorage, mockLocation, storage

### Community 59 - "RadioInsightsPanel.vue"
Cohesion: 0.06
Nodes (32): canPlay(), changeYear(), connected, currentYear, dateInputValue, dislikedCount, emptyStateIcon, emptyStateSubtitle (+24 more)

### Community 60 - "player.js"
Cohesion: 0.23
Nodes (10): AUDIO_BANDS, audio_headroom_db(), AUDIO_PRESETS, bounded(), default_audio_settings(), sanitize_audio_settings(), PROFILE_VERSION, loudnessRepository (+2 more)

### Community 62 - "OtpInput.vue"
Cohesion: 0.16
Nodes (9): codeComplete(), onInput(), codeComplete(), onInput(), digitsOnly(), formatRecoveryCode(), normalizeRecoveryCode(), OTP_LENGTH (+1 more)

### Community 64 - "scripts"
Cohesion: 0.11
Nodes (18): scripts, build, dev, format, lint, lint:eslint, lint:oxlint, preview (+10 more)

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
Cohesion: 0.17
Nodes (8): beforeUnmount(), close(), handle_outside_pointer_down(), mobile_back(), open(), select_option(), toggle(), update_position()

### Community 69 - "radioNormalizationIntegration.test.js"
Cohesion: 0.05
Nodes (7): selectivePersistence(), Context, Media, Node, Parameter, Worklet, makeStore()

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
Cohesion: 0.18
Nodes (12): db, runDbOperation(), kanbanRepository, projectRepository, LISTENING_COUNTERS, radioInsightsRepository, syncQueueRepository, loadKanbanSyncs() (+4 more)

### Community 89 - "createGoalForm"
Cohesion: 0.50
Nodes (4): createGoalForm(), data(), resetGoalForm(), submitGoal()

### Community 95 - "HealthTrackingInsights.vue"
Cohesion: 0.12
Nodes (3): patterns(), runComparison(), healthAiService

### Community 96 - "TotpSetupModal.vue"
Cohesion: 0.31
Nodes (7): submit(), cancel(), confirm(), modelValue(), reset(), start(), apiErrorCode()

### Community 97 - "AccountList.vue"
Cohesion: 0.14
Nodes (3): app, pinia, setup()

### Community 98 - "clampToMacroTone"
Cohesion: 0.28
Nodes (14): categoryTones(), currentCategoryToneColor(), currentToneLightness(), isCurrentCategoryTone(), onCategoryMacroColorInput(), onToneSliderChange(), setCategoryColor(), toneSliderTrackStyle() (+6 more)

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
Cohesion: 0.14
Nodes (11): created(), handle_save_task(), open_related_task(), setTheme(), toggleTheme(), onLocalDbIssue(), buildThemeStorageKey(), lightThemePaths (+3 more)

### Community 104 - "moneyInput"
Cohesion: 0.16
Nodes (15): addBudgetGroup(), addBudgetItem(), availableCategoriesForMacro(), categoriesForMacro(), hydrateBudgetGroup(), hydrateBudgetItem(), money(), moneyInput() (+7 more)

### Community 105 - "PasskeysSection.vue"
Cohesion: 0.22
Nodes (9): add(), deviceName(), mounted(), remove(), biometricDeclinedKey(), isBiometricSupported(), rememberedEmailKey, checkBiometricSupport() (+1 more)

### Community 109 - "MfaSection.vue"
Cohesion: 0.13
Nodes (4): disable(), regenerate(), removeRecoveryEmail(), run()

### Community 110 - "global.js"
Cohesion: 0.27
Nodes (4): beginGlobalDrag(), endGlobalDrag(), resetGlobalDrag(), setGlobalDragging()

### Community 111 - "KanbanPresetPicker.vue"
Cohesion: 0.21
Nodes (10): PRESET_META, selectedPreset(), selectedRules(), DEFAULT_KANBAN_PRESET, getKanbanPreset(), getKanbanPresetColumns(), getKanbanPresetRules(), getPresetColumnType() (+2 more)

### Community 112 - "RecoveryEmailModal.vue"
Cohesion: 0.25
Nodes (6): cancel(), confirm(), modelValue(), reset(), sendCode(), startCooldown()

### Community 113 - "ProjectWorkspaceTab.vue"
Cohesion: 0.12
Nodes (4): close(), mobile_back(), mobileNavigationMixin, overlayScopeKey

### Community 117 - "select_playlist"
Cohesion: 0.18
Nodes (13): close_search(), get_liked_tracks(), handle_create_playlist(), handle_delete_playlist(), handle_mobile_select_playlist(), handle_select_liked_playlist(), handler(), load_data() (+5 more)

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
Cohesion: 0.25
Nodes (8): close_options(), close_search(), emit_delete_request(), handle_click_outside_search(), open_type_config(), show_new_task_form(), start_rename(), toggle_search()

### Community 124 - "logoutView.vue"
Cohesion: 0.38
Nodes (4): beforeUnmount(), cleanupTimers(), mounted(), startLogoutSequence()

### Community 125 - "auth.js"
Cohesion: 0.27
Nodes (12): canUseLocalStorage(), clearSessionRefresh(), getLastSessionRefresh(), getSessionRefreshRemainingMs(), hasValidSessionRefresh(), markSessionRefreshed(), restoreSessionRefreshFromTimestamp(), SESSION_MAX_AGE_MS (+4 more)

### Community 126 - "ProjectsWindow.vue"
Cohesion: 0.06
Nodes (24): skeleton_style(), to_css_size(), loadingContinuity, APP_NAMES, check_teleport_target(), close_tab(), close_tab_context_menu(), focus_active_tab() (+16 more)

### Community 127 - "kanbanBoard.test.js"
Cohesion: 0.29
Nodes (6): createViteServer(), installMemoryStorage(), loadBoard(), stubRouter, withHierarchyBoard(), withProjectCreation()

### Community 128 - "finish_task_drag_preview"
Cohesion: 0.53
Nodes (6): cancel_task_drag_preview_cleanup(), finish_task_drag_preview(), measure_natural_column_height(), restore_task_drag_preview(), schedule_task_drag_preview_cleanup(), update_task_drag_preview()

### Community 129 - "ProjectDropdown.vue"
Cohesion: 0.05
Nodes (13): mounted(), mounted(), closeDropdown(), handleSelectProject(), mounted(), close_dropdown(), mounted(), select_status() (+5 more)

### Community 130 - "GlobalPlayerHost.vue"
Cohesion: 0.47
Nodes (3): create_yt_player(), init_youtube_api(), mounted()

### Community 131 - "financeSync.test.js"
Cohesion: 0.33
Nodes (3): installMemoryStorage(), loadOfflineFinance(), stubRouter

### Community 132 - "expandWrappedCsvRow"
Cohesion: 0.83
Nodes (4): expandWrappedCsvRow(), isWrappedCsvRow(), normalizeParsedCsvRows(), splitCsvLine()

### Community 135 - "refresh_attachment_row"
Cohesion: 0.50
Nodes (4): handle_attachment_selected(), refresh_attachment_row(), uploading_attachment_ids(), upsert_attachment_row()

### Community 136 - "goalCurrentAmount"
Cohesion: 0.40
Nodes (5): goalCurrentAmount(), goalProgress(), heroProgressPercent(), heroProgressText(), nearestGoal()

### Community 137 - "findMacroByName"
Cohesion: 0.22
Nodes (10): categoryTargetMacro(), findMacroByName(), handleNewCategoryRequest(), macroKey(), onCategoryMacroChange(), openCategoryForm(), openCategoryFormForTransaction(), openMacroForm() (+2 more)

### Community 138 - "healthInsights.js"
Cohesion: 0.40
Nodes (8): checkinsInPeriod(), comparePattern(), findPatterns(), hasValue(), observedOptions(), trackerSeries(), checkins, reference

### Community 139 - "animate_filter_change"
Cohesion: 0.25
Nodes (8): animate_filter_change(), animate_filter_task(), beforeUnmount(), cancel_filter_task_animations(), filter_values(), on_task_drag_end(), on_task_drag_start(), stop_tracking_task_drag()

### Community 140 - "cancel_create_task"
Cohesion: 1.00
Nodes (3): cancel_create_task(), handle_click_outside_creation(), handle_create_task()

### Community 142 - "HealthTrackingOverview.vue"
Cohesion: 0.24
Nodes (3): hasRecordedValue(), latestValue(), trackerSummaryData()

### Community 144 - "loadAiUsage"
Cohesion: 0.67
Nodes (3): activeTab(), loadAiUsage(), mounted()

### Community 146 - "download_attachment"
Cohesion: 0.67
Nodes (3): download_attachment(), get_attachment_download_name(), trigger_browser_download()

### Community 147 - "mobileNavigation.js"
Cohesion: 0.11
Nodes (7): provide(), provide(), createWindowNavigation(), windowNavigationKey, overlayScopeMixin, browserHistory(), settled()

### Community 149 - "usePlayerStore"
Cohesion: 0.14
Nodes (17): activeTab(), data(), setup(), setup(), currentVote, props, store, votes (+9 more)

### Community 151 - "ImageCropperModal.vue"
Cohesion: 0.32
Nodes (4): modelValue(), reset_state(), save_crop(), trigger_input()

## Knowledge Gaps
- **161 isolated node(s):** `pinia`, `app`, `$schema`, `semi`, `singleQuote` (+156 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAuthStore` connect `authView.vue` to `KademNexo.vue`, `KanbanColumn.vue`, `HealthWindow.vue`, `NewProject.vue`, `homeView.vue`, `syncService.js`, `AccountCenter.vue`, `TrackList.vue`, `PlaylistHeader.vue`, `resetPasswordView.vue`, `TaskDetailForm.vue`, `headerSystem.vue`, `usePlayerStore`, `vault.js`, `SubscriptionModal.vue`, `avatarComponent.vue`, `TaskRelations.vue`, `ProjectKanban.vue`, `api.js`, `StartMenu.vue`, `MainInformations.vue`, `health.js`, `ReauthModal.vue`, `BaseWindow.vue`, `player.js`, `apiErrorMessage`, `kanban.js`, `PasskeysSection.vue`, `logoutView.vue`, `auth.js`?**
  _High betweenness centrality (0.095) - this node is a cross-community bridge._
- **Why does `usePlayerStore` connect `usePlayerStore` to `ProjectDropdown.vue`, `KademNexo.vue`, `GlobalPlayerHost.vue`, `RadioFlow.vue`, `HealthWindow.vue`, `PlayerWrapper.vue`, `NexoInvestmentsTab.vue`, `TrackList.vue`, `loadAiUsage`, `authView.vue`, `VideoModal.vue`, `api.js`, `ProductivityWindow.vue`, `radioFlowWidget.vue`, `QueueSidebar.vue`, `RadioInsightsPanel.vue`, `player.js`, `createGoalForm`, `activeInvestmentTab`, `auth.js`, `ProjectsWindow.vue`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Why does `useAppStore` connect `app.js` to `RadioFlow.vue`, `homeView.vue`, `AccountCenter.vue`, `TaskDetailForm.vue`, `headerSystem.vue`, `mobileNavigation.js`, `ProjectKanban.vue`, `authView.vue`, `StartMenu.vue`, `main.js`, `ProjectList.vue`, `BaseWindow.vue`, `QueueSidebar.vue`, `DevicesSection.vue`, `apiErrorMessage`, `PasskeysSection.vue`, `MfaSection.vue`, `Configuration.vue`, `auth.js`, `ProjectsWindow.vue`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `usePlayerStore` (e.g. with `track()` and `.flush()`) actually correct?**
  _`usePlayerStore` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `pinia`, `app`, `$schema` to the rest of the system?**
  _161 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `HealthTrackingTab.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.12418300653594772 - nodes in this community are weakly interconnected._
- **Should `KademTabs.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.1368421052631579 - nodes in this community are weakly interconnected._