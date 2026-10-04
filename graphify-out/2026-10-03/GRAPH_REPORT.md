# Graph Report - kadem-web  (2026-10-03)

## Corpus Check
- 221 files · ~257,627 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2347 nodes · 4040 edges · 151 communities (137 shown, 14 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.76)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4d69611d`
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
- dateWidget.vue
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
- financeRepository.js
- dependencies
- devDependencies
- HealthCheckinModal.vue
- TaskRelations.vue
- ProjectKanban.vue
- authView.vue
- TrackOptionsMenu.vue
- db.js
- VideoModal.vue
- SubscriptionModal.vue
- GlobalPlayerHost.vue
- normalize
- BaseModal.vue
- StartMenu.vue
- MainInformations.vue
- financeService.js
- authSession.js
- sameId
- radioFlowWidget.vue
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
- App.vue
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
- auth.js
- Como configurar o Background do Modo Escuro no Kadem
- SideModal.vue
- biometricAuth.test.js
- AGENTS.md
- useWindowStore
- TotpSetupModal.vue
- buildTransactionSearchText
- HealthPublicCardTab.vue
- UploadTrackModal.vue
- getPlanLimits
- app.js
- moneyInput
- PasskeysSection.vue
- MfaSection.vue
- global.js
- api.js
- RecoveryEmailModal.vue
- ProjectWorkspaceTab.vue
- LyricsModal.vue
- select_playlist
- Configuration.vue
- alexaAuthView.vue
- usePlayerStore
- deleteInvestmentGoal
- close_options
- openConfirmation
- useAuthStore
- ProjectsWindow.vue
- kanbanBoard.test.js
- finish_task_drag_preview
- goalCurrentAmount
- financeSync.test.js
- expandWrappedCsvRow
- modalHistory.js
- refresh_attachment_row
- findMacroByName
- fetch_search_results
- animate_filter_change
- cancel_create_task
- player.js
- is_track_unavailable
- ProjectDropdown.vue
- loadAiUsage
- @fortawesome/fontawesome-svg-core
- download_attachment
- vite-plugin-pwa
- cancel_edit_comment
- ProjectStatusDropdown.vue

## God Nodes (most connected - your core abstractions)
1. `useAuthStore` - 48 edges
2. `useAppStore` - 29 edges
3. `apiErrorMessage()` - 27 edges
4. `usePlayerStore` - 26 edges
5. `api` - 25 edges
6. `useVaultStore` - 21 edges
7. `db` - 20 edges
8. `useUtilsStore` - 19 edges
9. `VolumeNormalizer` - 17 edges
10. `scripts` - 16 edges

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
- 3-file cycle: `src/router/index.js -> src/views/authView.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/router/index.js -> src/views/homeView.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/router/index.js -> src/views/logoutView.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/router/index.js -> src/views/resetPasswordView.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/services/syncService.js -> src/stores/auth.js -> src/stores/vault.js -> src/services/syncService.js`
- 3-file cycle: `src/plugins/api.js -> src/stores/projects.js -> src/stores/utils.js -> src/plugins/api.js`
- 4-file cycle: `src/components/headerSystem.vue -> src/stores/auth.js -> src/router/index.js -> src/views/homeView.vue -> src/components/headerSystem.vue`
- 5-file cycle: `src/components/headerSystem.vue -> src/stores/aiCredits.js -> src/stores/auth.js -> src/router/index.js -> src/views/homeView.vue -> src/components/headerSystem.vue`
- 5-file cycle: `src/components/SubscriptionModal.vue -> src/stores/auth.js -> src/router/index.js -> src/views/homeView.vue -> src/components/headerSystem.vue -> src/components/SubscriptionModal.vue`
- 5-file cycle: `src/components/headerSystem.vue -> src/components/startMenu/StartMenu.vue -> src/stores/auth.js -> src/router/index.js -> src/views/homeView.vue -> src/components/headerSystem.vue`
- 5-file cycle: `src/router/index.js -> src/views/authView.vue -> src/stores/vault.js -> src/services/syncService.js -> src/stores/auth.js -> src/router/index.js`
- 5-file cycle: `src/router/index.js -> src/views/homeView.vue -> src/stores/vault.js -> src/services/syncService.js -> src/stores/auth.js -> src/router/index.js`

## Communities (151 total, 14 thin omitted)

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
Nodes (5): calculate_dropdown_position(), close_assignee_menu(), select_assignee(), toggle_assignee_menu(), KANBAN_COLUMN_TYPES

### Community 5 - "CategoryCombo.vue"
Cohesion: 0.19
Nodes (12): close(), filteredCategories(), handleOutsideClick(), handleViewportChange(), normalize(), open(), requestCreate(), sameId() (+4 more)

### Community 6 - "HealthWindow.vue"
Cohesion: 0.05
Nodes (9): cancelArchiveTracker(), cancelDeleteEvent(), cancelDeleteTrackerGroup(), confirmArchiveTracker(), confirmDeleteEvent(), confirmDeleteTrackerGroup(), HEALTH_TAB_IDS, isLowStock() (+1 more)

### Community 7 - "NewProject.vue"
Cohesion: 0.06
Nodes (12): modelValue(), reset_state(), save_crop(), trigger_input(), checkInviteErrors(), displayList(), handleCancelNewGroup(), handleCreateProject() (+4 more)

### Community 10 - "PlayerWrapper.vue"
Cohesion: 0.06
Nodes (25): bring_lyrics_to_front(), bring_video_to_front(), format_seconds_to_time(), formatted_current_time(), formatted_duration(), get_current_time(), get_duration(), handle_pip_play_toggle() (+17 more)

### Community 11 - "NexoInvestmentsTab.vue"
Cohesion: 0.06
Nodes (6): buildSvgCurvePath(), calcCurveInterest(), calcCurveInvested(), calcCurveTotal(), INVESTMENT_TAB_IDS, projectionCurvePath()

### Community 12 - "homeView.vue"
Cohesion: 0.12
Nodes (4): checkIfReady(), handler(), init_connection_monitor(), preloadImage()

### Community 13 - "syncService.js"
Cohesion: 0.10
Nodes (38): attachmentUploads, finishAttachmentUpload(), reportAttachmentUpload(), financeRepository, buildChangesArray(), delay(), deleteFinanceLocalRecord(), _handleAccountTask() (+30 more)

### Community 14 - "AccountCenter.vue"
Cohesion: 0.14
Nodes (8): "auth.user.email"(), handleBiometricUnlock(), handleCloseModal(), handleSaveNewAccount(), mounted(), refreshVaultBiometricStatus(), toggleVaultBiometrics(), isBiometricCancellationError()

### Community 15 - "TrackList.vue"
Cohesion: 0.09
Nodes (8): handle_add_queue(), handle_download_lyrics(), mounted(), setupIntersectionObserver(), track_has_lyrics(), track_lyrics_unavailable(), trigger_add_feedback(), updated()

### Community 16 - "PlaylistHeader.vue"
Cohesion: 0.07
Nodes (6): close_download_menu(), closeMenu(), format_total_duration_verbose(), toggle_download_menu(), toggle_options_menu(), total_duration_formatted()

### Community 17 - "resetPasswordView.vue"
Cohesion: 0.20
Nodes (9): backToPassword(), continueToSessions(), endsCurrentSession(), mounted(), passwordError(), resetResponse(), setResponse(), submitReset() (+1 more)

### Community 19 - "headerSystem.vue"
Cohesion: 0.10
Nodes (13): ai_credits_remaining(), ai_credits_total(), ai_credits_used(), closeAllPopups(), closeContextMenu(), handleMenuClick(), handler(), mounted() (+5 more)

### Community 20 - "reloadAll"
Cohesion: 0.12
Nodes (27): closeDeleteConfirm(), confirmCsvImport(), confirmDeleteAction(), deleteConnection(), deleteInvestmentEvent(), loadBudgets(), loadCategories(), loadConnections() (+19 more)

### Community 21 - "useVaultStore"
Cohesion: 0.09
Nodes (8): handleGenerateRecovery(), handleMigration(), setup(), setup(), handleRescue(), base64ToBuffer(), bufferToBase64(), useVaultStore

### Community 22 - "financeRepository.js"
Cohesion: 0.18
Nodes (9): INVESTMENT_FLOW, isServerId(), normalizeCategoryMacroReferences(), normalizeFinanceText(), now(), replaceServerItemsPreservingPending(), sameCategorySignature(), sameFinanceId() (+1 more)

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
Cohesion: 0.08
Nodes (4): beforeUnmount(), close_confirmation(), handle_confirm_delete(), on_column_drag_end()

### Community 29 - "authView.vue"
Cohesion: 0.10
Nodes (20): afterLogin(), auth(), checkPasswordStrength(), confirmBiometrics(), confirmTrust(), continueAfterLogin(), continueAfterMfaCheck(), declineBiometrics() (+12 more)

### Community 30 - "TrackOptionsMenu.vue"
Cohesion: 0.09
Nodes (8): beforeUnmount(), cancel_close(), close_on_hover(), open(), open_on_hover(), position_panel(), supports_hover(), toggle_on_touch()

### Community 31 - "db.js"
Cohesion: 0.08
Nodes (32): canUseBrowserStorage(), clearLocalDbIssue(), createIssuePayload(), createLocalDbUnavailableError(), db, emitLocalDbIssue(), ensureDbOpen(), getErrorNameChain() (+24 more)

### Community 32 - "VideoModal.vue"
Cohesion: 0.16
Nodes (14): beforeUnmount(), close_modal(), current_time(), exit_fullscreen_if_active(), handle_video_metadata(), is_playing(), load_video(), modelValue() (+6 more)

### Community 33 - "SubscriptionModal.vue"
Cohesion: 0.09
Nodes (8): sanitize(), sanitizedMessage(), check_cpf(), go_to_checkout(), handle_checkout(), request_cancel(), requestClose(), resetState()

### Community 34 - "GlobalPlayerHost.vue"
Cohesion: 0.47
Nodes (3): create_yt_player(), init_youtube_api(), mounted()

### Community 35 - "normalize"
Cohesion: 0.16
Nodes (20): autoCategorize(), buildCsvObservation(), cleanCsvCell(), displayInsights(), findCategoryByName(), findColumnIndex(), handleCsvFileChange(), loadInsights() (+12 more)

### Community 36 - "BaseModal.vue"
Cohesion: 0.17
Nodes (12): beforeUnmount(), close(), destroyObservers(), handler(), handleResize(), handleTouchEnd(), initObservers(), onBackdropClick() (+4 more)

### Community 37 - "StartMenu.vue"
Cohesion: 0.17
Nodes (7): closeProjectView(), goToLogoutScreen(), handleLogoutClick(), openCreateProject(), openEditProject(), setActiveTab(), setActiveTabById()

### Community 38 - "MainInformations.vue"
Cohesion: 0.12
Nodes (4): cancelAddOccupation(), handleAddNewOccupation(), handleSaveBio(), toggleBioEdit()

### Community 39 - "financeService.js"
Cohesion: 0.19
Nodes (13): entityMatchesAnyServerId(), entityReferenceIds(), entityServerId(), financeService, findLocalMacro(), isServerId(), pendingDeleteServerIds(), preparePendingMacroUpdate() (+5 more)

### Community 40 - "authSession.js"
Cohesion: 0.36
Nodes (9): canUseLocalStorage(), clearSessionRefresh(), getLastSessionRefresh(), getSessionRefreshRemainingMs(), hasValidSessionRefresh(), markSessionRefreshed(), restoreSessionRefreshFromTimestamp(), SESSION_MAX_AGE_MS (+1 more)

### Community 41 - "sameId"
Cohesion: 0.22
Nodes (14): applyPendingCategorySelection(), applyTransactionPatch(), enrichTransactionForList(), groupedCategories(), resolveSavedCategory(), sameId(), selectTransactionCategory(), sortTransactionsList() (+6 more)

### Community 43 - "MacroCategoryCombo.vue"
Cohesion: 0.18
Nodes (11): close(), createValue(), filteredMacros(), handleOutsideClick(), handleViewportChange(), normalize(), open(), select() (+3 more)

### Community 44 - "main.js"
Cohesion: 0.13
Nodes (12): frames, vAnimateHeight, app, pinia, utils_store, router, routes, radioFlowApi (+4 more)

### Community 45 - "health.js"
Cohesion: 0.24
Nodes (10): DIGESTIVE_WELLBEING_TEMPLATE, addInterval(), controlFields, DEFAULT_HEALTH_UNITS, DEFAULT_TRACKER_GROUPS, HEALTH_RECORD_TYPES, localKey(), now() (+2 more)

### Community 47 - "biometricAuth.js"
Cohesion: 0.32
Nodes (11): authenticateVaultWithBiometrics(), authenticateVaultWithLocalBiometrics(), bufferToBase64Url(), credentialForVerification(), getBiometricStatus(), getWebAuthn(), prepareVaultBiometricUnlock(), registerBiometricCredential() (+3 more)

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
Cohesion: 0.16
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
Cohesion: 0.12
Nodes (6): METHOD_DESCRIPTIONS, METHOD_ICONS, METHOD_ORDER, sendEmail(), startCooldown(), submit()

### Community 58 - "healthGroups.test.js"
Cohesion: 0.18
Nodes (3): mockLocalStorage, mockLocation, storage

### Community 59 - "App.vue"
Cohesion: 0.29
Nodes (7): created(), repairStorage(), consumeLocalDbIssue(), onLocalDbIssue(), repairLocalEnvironment(), mounted(), repairStorage()

### Community 60 - "buildCsvExactKey"
Cohesion: 0.31
Nodes (10): buildCsvExactKey(), buildCsvLegacyKey(), buildTransactionCandidateMaps(), consumeCandidate(), csvAmountKey(), csvDateOnly(), csvHasMeaningfulTime(), filterCsvDuplicates() (+2 more)

### Community 62 - "OtpInput.vue"
Cohesion: 0.16
Nodes (9): codeComplete(), onInput(), codeComplete(), onInput(), digitsOnly(), formatRecoveryCode(), normalizeRecoveryCode(), OTP_LENGTH (+1 more)

### Community 64 - "scripts"
Cohesion: 0.12
Nodes (16): scripts, build, dev, format, lint, lint:eslint, lint:oxlint, preview (+8 more)

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

### Community 87 - "auth.js"
Cohesion: 0.18
Nodes (15): api, kanbanRepository, projectRepository, radioRepository, syncQueueRepository, SUBSCRIPTION_PLANS, VIDEO_RESOLUTIONS, syncService (+7 more)

### Community 90 - "SideModal.vue"
Cohesion: 0.20
Nodes (13): handleKeydown(), beforeUnmount(), checkMobile(), close(), destroyObservers(), handleKeydown(), handleWindowResize(), initObservers() (+5 more)

### Community 95 - "useWindowStore"
Cohesion: 0.20
Nodes (4): handleWindowClick(), beforeUnmount(), window_store(), useWindowStore

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
Cohesion: 0.15
Nodes (9): handle_save_task(), open_related_task(), setTheme(), toggleTheme(), buildThemeStorageKey(), lightThemePaths, resolveThemeUserId(), systemTheme() (+1 more)

### Community 104 - "moneyInput"
Cohesion: 0.20
Nodes (12): deleteTransaction(), money(), moneyInput(), openConfirmation(), openTransactionForm(), parseMoneyInput(), removeTransactionFromList(), requestDeleteTransaction() (+4 more)

### Community 105 - "PasskeysSection.vue"
Cohesion: 0.22
Nodes (9): add(), deviceName(), mounted(), remove(), biometricDeclinedKey(), isBiometricSupported(), rememberedEmailKey, checkBiometricSupport() (+1 more)

### Community 109 - "MfaSection.vue"
Cohesion: 0.24
Nodes (4): disable(), regenerate(), removeRecoveryEmail(), run()

### Community 110 - "global.js"
Cohesion: 0.27
Nodes (4): beginGlobalDrag(), endGlobalDrag(), resetGlobalDrag(), setGlobalDragging()

### Community 111 - "api.js"
Cohesion: 0.22
Nodes (8): check_system_health(), CSRF_EXEMPT_PATHS, ensureCsrfToken(), getCookie(), isCsrfExempt(), MUTATION_METHODS, normalizePath(), url_api

### Community 112 - "RecoveryEmailModal.vue"
Cohesion: 0.25
Nodes (6): cancel(), confirm(), modelValue(), reset(), sendCode(), startCooldown()

### Community 115 - "LyricsModal.vue"
Cohesion: 0.29
Nodes (12): active_index(), check_scroll_position(), close_modal(), current_time(), get_track_key(), handle_scroll(), handler(), modelValue() (+4 more)

### Community 117 - "select_playlist"
Cohesion: 0.22
Nodes (10): close_search(), handle_create_playlist(), handle_delete_playlist(), handle_mobile_select_playlist(), handler(), load_data(), mounted(), observe_container_size() (+2 more)

### Community 118 - "Configuration.vue"
Cohesion: 0.40
Nodes (7): handlePwaInstall(), mounted(), getPwaInstallUnavailableMessage(), isIOSDevice(), isPwaInstalled(), isStandalone(), requestPwaInstall()

### Community 119 - "alexaAuthView.vue"
Cohesion: 0.18
Nodes (3): completeLink(), handleAlexaLogin(), onMfaVerified()

### Community 120 - "usePlayerStore"
Cohesion: 0.17
Nodes (12): activeTab(), data(), activeInvestmentTab(), createGoalForm(), data(), mounted(), resetGoalForm(), submitGoal() (+4 more)

### Community 121 - "deleteInvestmentGoal"
Cohesion: 0.38
Nodes (7): deleteInvestmentGoal(), investmentGoalKey(), investmentGoalMatches(), removeInvestmentGoalFromList(), requestDeleteInvestmentGoal(), saveInvestmentGoal(), upsertInvestmentGoalInList()

### Community 122 - "close_options"
Cohesion: 0.25
Nodes (8): close_options(), close_search(), emit_delete_request(), handle_click_outside_search(), open_type_config(), show_new_task_form(), start_rename(), toggle_search()

### Community 124 - "openConfirmation"
Cohesion: 0.33
Nodes (7): delete_track(), execute_add_track(), handle_add_to_another_playlist(), handle_delete_track(), handle_upload_submit(), openConfirmation(), verify_and_add_track()

### Community 125 - "useAuthStore"
Cohesion: 0.22
Nodes (6): data(), syncHealthDelta(), useAuthStore, handleResetPassword(), verifyMfa(), mounted()

### Community 126 - "ProjectsWindow.vue"
Cohesion: 0.31
Nodes (3): close_tab(), focus_active_tab(), handle_tab_keydown()

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

### Community 133 - "modalHistory.js"
Cohesion: 0.48
Nodes (5): ensureListener(), handlePopState(), modalStack, registerModal(), updateBodyScrollLock()

### Community 135 - "refresh_attachment_row"
Cohesion: 0.50
Nodes (4): handle_attachment_selected(), refresh_attachment_row(), uploading_attachment_ids(), upsert_attachment_row()

### Community 137 - "findMacroByName"
Cohesion: 0.29
Nodes (7): categoryTargetMacro(), findMacroByName(), macroKey(), onCategoryMacroChange(), openMacroForm(), resolveMacroRecord(), selectBudgetMacro()

### Community 138 - "fetch_search_results"
Cohesion: 0.50
Nodes (4): fetch_search_results(), handle_load_more(), perform_mobile_search(), perform_search()

### Community 139 - "animate_filter_change"
Cohesion: 0.25
Nodes (8): animate_filter_change(), animate_filter_task(), beforeUnmount(), cancel_filter_task_animations(), filter_values(), on_task_drag_end(), on_task_drag_start(), stop_tracking_task_drag()

### Community 140 - "cancel_create_task"
Cohesion: 1.00
Nodes (3): cancel_create_task(), handle_click_outside_creation(), handle_create_task()

### Community 141 - "player.js"
Cohesion: 0.14
Nodes (14): setup(), apiServices, PROFILE_VERSION, loudnessRepository, player_store(), RADIO_FLOW_WINDOW, radio_store(), state_snapshot() (+6 more)

### Community 142 - "is_track_unavailable"
Cohesion: 0.40
Nodes (5): create_fallback_thumb(), handle_desktop_dbl_click(), handle_row_click(), is_track_unavailable(), on_drag_start()

### Community 144 - "loadAiUsage"
Cohesion: 0.67
Nodes (3): activeTab(), loadAiUsage(), mounted()

### Community 146 - "download_attachment"
Cohesion: 0.67
Nodes (3): download_attachment(), get_attachment_download_name(), trigger_browser_download()

## Knowledge Gaps
- **125 isolated node(s):** `$schema`, `semi`, `singleQuote`, `printWidth`, `paths` (+120 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAuthStore` connect `useAuthStore` to `windows.js`, `KademNexo.vue`, `KanbanColumn.vue`, `HealthWindow.vue`, `NewProject.vue`, `homeView.vue`, `player.js`, `AccountCenter.vue`, `TrackList.vue`, `PlaylistHeader.vue`, `syncService.js`, `TaskDetailForm.vue`, `headerSystem.vue`, `resetPasswordView.vue`, `useVaultStore`, `TaskRelations.vue`, `ProjectKanban.vue`, `authView.vue`, `SubscriptionModal.vue`, `StartMenu.vue`, `MainInformations.vue`, `authSession.js`, `main.js`, `health.js`, `ReauthModal.vue`, `apiErrorMessage`, `auth.js`, `PasskeysSection.vue`?**
  _High betweenness centrality (0.115) - this node is a cross-community bridge._
- **Why does `usePlayerStore` connect `usePlayerStore` to `VideoModal.vue`, `KademNexo.vue`, `GlobalPlayerHost.vue`, `RadioFlow.vue`, `HealthWindow.vue`, `PlayerWrapper.vue`, `NexoInvestmentsTab.vue`, `radioFlowWidget.vue`, `player.js`, `TrackList.vue`, `loadAiUsage`, `LyricsModal.vue`, `KademSkeletonGroup.vue`, `AudioSettingsPanel.vue`, `auth.js`, `QueueSidebar.vue`, `useWindowStore`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Why does `useAppStore` connect `app.js` to `windows.js`, `RadioFlow.vue`, `homeView.vue`, `AccountCenter.vue`, `TaskDetailForm.vue`, `headerSystem.vue`, `useVaultStore`, `ProjectKanban.vue`, `StartMenu.vue`, `main.js`, `ProjectList.vue`, `BaseWindow.vue`, `QueueSidebar.vue`, `App.vue`, `DevicesSection.vue`, `apiErrorMessage`, `auth.js`, `PasskeysSection.vue`, `MfaSection.vue`, `Configuration.vue`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `$schema`, `semi`, `singleQuote` to the rest of the system?**
  _125 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `HealthTrackingInsights.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.052597402597402594 - nodes in this community are weakly interconnected._
- **Should `KademTabs.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.1368421052631579 - nodes in this community are weakly interconnected._
- **Should `KademNexo.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.04713804713804714 - nodes in this community are weakly interconnected._