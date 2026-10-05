# Graph Report - kadem-web  (2026-10-04)

## Corpus Check
- 238 files · ~278,973 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2551 nodes · 4496 edges · 164 communities (149 shown, 15 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.78)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7ee21420`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- HealthTrackingTab.vue
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
- player.js
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
- PlaylistSidebar.vue
- AudioSettingsPanel.vue
- HealthActionModal.vue
- BaseWindow.vue
- QueueSidebar.vue
- MfaChallenge.vue
- healthGroups.test.js
- RadioInsightsPanel.vue
- SideModal.vue
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
- financeRepository.js
- biometricAuth.test.js
- AGENTS.md
- HealthTrackingInsights.vue
- securityService.js
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
- mobileNavigation.js
- ConfirmationModal.vue
- handle_mobile_select_playlist
- Configuration.vue
- LyricsModal.vue
- usePlayerStore
- deleteInvestmentGoal
- close_options
- openConfirmation
- auth.js
- ProjectsWindow.vue
- kanbanBoard.test.js
- finish_task_drag_preview
- .event
- KademSkeletonGroup.vue
- financeSync.test.js
- expandWrappedCsvRow
- refresh_attachment_row
- modalHistory.js
- findMacroByName
- healthInsights.js
- animate_filter_change
- cancel_create_task
- ProjectDropdown.vue
- HealthTrackingOverview.vue
- App.vue
- loadAiUsage
- ProjectStatusDropdown.vue
- download_attachment
- projectWorkspaceTabs.test.js
- select_playlist
- useAuthStore
- ImageCropperModal.vue
- radioInsights.test.js
- close_playlist_filter
- handlePlay
- fetch_search_results
- TrackReaction.vue
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
- `useProjectStore` --indirect_call--> `local_id()`  [INFERRED]
  src/stores/projects.js → tests/uiPerformance.test.js
- `makeStore()` --indirect_call--> `selectivePersistence()`  [INFERRED]
  tests/uiPerformance.test.js → src/plugins/selectivePersistence.js
- `handleWindowClick()` --calls--> `useWindowStore`  [EXTRACTED]
  src/components/headerSystem.vue → src/stores/windows.js
- `runComparison()` --calls--> `comparePattern()`  [EXTRACTED]
  src/components/health/HealthTrackingInsights.vue → src/services/healthInsights.js
- `usePlayerStore` --indirect_call--> `track()`  [INFERRED]
  src/stores/player.js → src/components/radio/LyricsModal.vue

## Import Cycles
- 3-file cycle: `src/router/index.js -> src/views/InviteLanding.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/router/index.js -> src/views/authView.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/router/index.js -> src/views/homeView.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/router/index.js -> src/views/logoutView.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/router/index.js -> src/views/resetPasswordView.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/services/syncService.js -> src/stores/auth.js -> src/stores/vault.js -> src/services/syncService.js`
- 3-file cycle: `src/services/syncService.js -> src/stores/radio.js -> src/stores/radioInsights.js -> src/services/syncService.js`
- 3-file cycle: `src/services/syncService.js -> src/stores/auth.js -> src/stores/player.js -> src/services/syncService.js`
- 3-file cycle: `src/services/syncService.js -> src/stores/auth.js -> src/stores/radioInsights.js -> src/services/syncService.js`
- 3-file cycle: `src/plugins/api.js -> src/stores/projects.js -> src/stores/utils.js -> src/plugins/api.js`
- 4-file cycle: `src/components/headerSystem.vue -> src/stores/auth.js -> src/router/index.js -> src/views/homeView.vue -> src/components/headerSystem.vue`
- 4-file cycle: `src/services/syncService.js -> src/stores/auth.js -> src/stores/radio.js -> src/stores/radioInsights.js -> src/services/syncService.js`
- 5-file cycle: `src/router/index.js -> src/views/authView.vue -> src/stores/vault.js -> src/services/syncService.js -> src/stores/auth.js -> src/router/index.js`
- 5-file cycle: `src/components/SubscriptionModal.vue -> src/stores/auth.js -> src/router/index.js -> src/views/homeView.vue -> src/components/headerSystem.vue -> src/components/SubscriptionModal.vue`
- 5-file cycle: `src/components/headerSystem.vue -> src/components/startMenu/StartMenu.vue -> src/stores/auth.js -> src/router/index.js -> src/views/homeView.vue -> src/components/headerSystem.vue`
- 5-file cycle: `src/components/headerSystem.vue -> src/stores/aiCredits.js -> src/stores/auth.js -> src/router/index.js -> src/views/homeView.vue -> src/components/headerSystem.vue`
- 5-file cycle: `src/router/index.js -> src/views/homeView.vue -> src/stores/vault.js -> src/services/syncService.js -> src/stores/auth.js -> src/router/index.js`
- 5-file cycle: `src/services/syncService.js -> src/stores/auth.js -> src/stores/player.js -> src/stores/radio.js -> src/stores/radioInsights.js -> src/services/syncService.js`

## Communities (164 total, 15 thin omitted)

### Community 0 - "HealthTrackingTab.vue"
Cohesion: 0.12
Nodes (4): selectedSummary(), latestValueDisplay(), recentCount(), trackerSummary()

### Community 1 - "KademTabs.vue"
Cohesion: 0.14
Nodes (6): checkScrollability(), currentTabId(), handler(), initResizeObserver(), mounted(), scrollToActiveTab()

### Community 2 - "KademNexo.vue"
Cohesion: 0.05
Nodes (24): appendBudgetAiMessage(), budgetAiStorageKey(), budgetGroupHeaderStyle(), budgetGroupStyle(), calendarDateParts(), countCsvDelimiters(), csvImportSummary(), deleteConnection() (+16 more)

### Community 3 - "KanbanColumn.vue"
Cohesion: 0.05
Nodes (4): calculate_dropdown_position(), close_assignee_menu(), select_assignee(), toggle_assignee_menu()

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

### Community 11 - "NexoInvestmentsTab.vue"
Cohesion: 0.05
Nodes (6): goalCurrentAmount(), goalProgress(), heroProgressPercent(), heroProgressText(), INVESTMENT_TAB_IDS, nearestGoal()

### Community 12 - "homeView.vue"
Cohesion: 0.07
Nodes (9): create_yt_player(), init_youtube_api(), mounted(), mounted(), updateClock(), checkIfReady(), handler(), init_connection_monitor() (+1 more)

### Community 13 - "syncService.js"
Cohesion: 0.10
Nodes (38): attachmentUploads, finishAttachmentUpload(), reportAttachmentUpload(), isRadioInsightsTask(), buildChangesArray(), delay(), deleteFinanceLocalRecord(), _handleAccountTask() (+30 more)

### Community 14 - "AccountCenter.vue"
Cohesion: 0.13
Nodes (9): usePasskey(), "auth.user.email"(), handleBiometricUnlock(), handleCloseModal(), handleSaveNewAccount(), mounted(), refreshVaultBiometricStatus(), toggleVaultBiometrics() (+1 more)

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
Cohesion: 0.10
Nodes (15): ai_credits_remaining(), ai_credits_total(), ai_credits_used(), closeAllPopups(), closeContextMenu(), handleMenuClick(), handler(), handleWindowClick() (+7 more)

### Community 20 - "reloadAll"
Cohesion: 0.15
Nodes (23): closeDeleteConfirm(), confirmCsvImport(), confirmDeleteAction(), deleteInvestmentEvent(), loadBudgets(), loadCategories(), loadDashboard(), loadInvestmentRates() (+15 more)

### Community 21 - "useVaultStore"
Cohesion: 0.09
Nodes (8): handleGenerateRecovery(), handleMigration(), setup(), setup(), handleRescue(), base64ToBuffer(), bufferToBase64(), useVaultStore

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
Nodes (20): afterLogin(), checkPasswordStrength(), confirmBiometrics(), confirmTrust(), continueAfterLogin(), continueAfterMfaCheck(), declineMfaSetup(), declineTrust() (+12 more)

### Community 30 - "TrackOptionsMenu.vue"
Cohesion: 0.09
Nodes (8): beforeUnmount(), cancel_close(), close_on_hover(), open(), open_on_hover(), position_panel(), supports_hover(), toggle_on_touch()

### Community 31 - "db.js"
Cohesion: 0.10
Nodes (31): canUseBrowserStorage(), clearLocalDbIssue(), createIssuePayload(), createLocalDbUnavailableError(), db, emitLocalDbIssue(), ensureDbOpen(), getErrorNameChain() (+23 more)

### Community 32 - "VideoModal.vue"
Cohesion: 0.16
Nodes (14): beforeUnmount(), close_modal(), current_time(), exit_fullscreen_if_active(), handle_video_metadata(), is_playing(), load_video(), modelValue() (+6 more)

### Community 33 - "player.js"
Cohesion: 0.13
Nodes (18): api, check_system_health(), CSRF_EXEMPT_PATHS, ensureCsrfToken(), getCookie(), isCsrfExempt(), MUTATION_METHODS, normalizePath() (+10 more)

### Community 34 - "buildSvgCurvePath"
Cohesion: 0.40
Nodes (5): buildSvgCurvePath(), calcCurveInterest(), calcCurveInvested(), calcCurveTotal(), projectionCurvePath()

### Community 35 - "normalize"
Cohesion: 0.12
Nodes (28): autoCategorize(), buildCsvExactKey(), buildCsvLegacyKey(), buildCsvObservation(), buildTransactionCandidateMaps(), cleanCsvCell(), consumeCandidate(), csvAmountKey() (+20 more)

### Community 36 - "BaseModal.vue"
Cohesion: 0.16
Nodes (14): beforeUnmount(), close(), destroyObservers(), handleKeydown(), handleMobileBack(), handler(), handleResize(), handleTouchEnd() (+6 more)

### Community 37 - "StartMenu.vue"
Cohesion: 0.15
Nodes (8): closeProjectView(), goToLogoutScreen(), handleLogoutClick(), mobile_back(), openCreateProject(), openEditProject(), setActiveTab(), setActiveTabById()

### Community 38 - "MainInformations.vue"
Cohesion: 0.12
Nodes (4): cancelAddOccupation(), handleAddNewOccupation(), handleSaveBio(), toggleBioEdit()

### Community 39 - "financeService.js"
Cohesion: 0.19
Nodes (13): entityMatchesAnyServerId(), entityReferenceIds(), entityServerId(), financeService, findLocalMacro(), isServerId(), pendingDeleteServerIds(), preparePendingMacroUpdate() (+5 more)

### Community 40 - "ProductivityWindow.vue"
Cohesion: 0.17
Nodes (4): windowComponentMap, beforeUnmount(), close_app(), mobile_back()

### Community 41 - "updateTransaction"
Cohesion: 0.18
Nodes (16): applyPendingCategorySelection(), applyTransactionPatch(), deleteTransaction(), enrichTransactionForList(), openConfirmation(), removeTransactionFromList(), requestDeleteTransaction(), resolveSavedCategory() (+8 more)

### Community 43 - "MacroCategoryCombo.vue"
Cohesion: 0.18
Nodes (11): close(), createValue(), filteredMacros(), handleOutsideClick(), handleViewportChange(), normalize(), open(), select() (+3 more)

### Community 44 - "main.js"
Cohesion: 0.13
Nodes (12): frames, vAnimateHeight, app, pinia, utils_store, router, routes, radioFlowApi (+4 more)

### Community 45 - "health.js"
Cohesion: 0.17
Nodes (11): DIGESTIVE_WELLBEING_TEMPLATE, healthRepository, addInterval(), controlFields, DEFAULT_HEALTH_UNITS, DEFAULT_TRACKER_GROUPS, HEALTH_RECORD_TYPES, localKey() (+3 more)

### Community 47 - "biometricAuth.js"
Cohesion: 0.30
Nodes (12): authenticateVaultWithBiometrics(), authenticateVaultWithLocalBiometrics(), authenticateWithBiometrics(), bufferToBase64Url(), credentialForVerification(), getBiometricStatus(), getWebAuthn(), prepareVaultBiometricUnlock() (+4 more)

### Community 48 - "SearchableDropdown.vue"
Cohesion: 0.13
Nodes (7): calculate_position(), close(), handle_click_outside(), mobile_back(), open(), select_option(), toggle()

### Community 49 - "ReauthModal.vue"
Cohesion: 0.12
Nodes (9): cancel(), clear(), handler(), METHOD_ORDER, onModelUpdate(), prepare(), sendEmail(), startCooldown() (+1 more)

### Community 50 - "findCategory"
Cohesion: 0.11
Nodes (23): budgetSummary(), buildTransactionSearchText(), categoryKey(), categoryTypeLabel(), closeTransactionForm(), filteredCategories(), filteredTransactions(), findCategory() (+15 more)

### Community 53 - "AudioSettingsPanel.vue"
Cohesion: 0.05
Nodes (19): reset_band(), update_band(), AUDIO_BANDS, audio_headroom_db(), AUDIO_PRESETS, bounded(), default_audio_settings(), sanitize_audio_settings() (+11 more)

### Community 54 - "HealthActionModal.vue"
Cohesion: 0.20
Nodes (3): localDateTime(), resetForm(), visible()

### Community 55 - "BaseWindow.vue"
Cohesion: 0.10
Nodes (10): provide(), focus(), minimize(), mobile_back(), provide(), startDrag(), startResize(), window_store() (+2 more)

### Community 56 - "QueueSidebar.vue"
Cohesion: 0.12
Nodes (20): animate_queue_changes(), AUTOSCROLL_END_EVENTS, AUTOSCROLL_POINTER_EVENTS, beforeUnmount(), capture_queue_positions(), get(), handle_drag_end(), handle_drag_start() (+12 more)

### Community 57 - "MfaChallenge.vue"
Cohesion: 0.12
Nodes (5): METHOD_DESCRIPTIONS, METHOD_ICONS, METHOD_ORDER, sendEmail(), startCooldown()

### Community 58 - "healthGroups.test.js"
Cohesion: 0.18
Nodes (3): mockLocalStorage, mockLocation, storage

### Community 59 - "RadioInsightsPanel.vue"
Cohesion: 0.07
Nodes (25): changeYear(), connected, currentYear, dateInputValue, dislikedCount, emptyStateIcon, emptyStateSubtitle, emptyStateTitle (+17 more)

### Community 60 - "SideModal.vue"
Cohesion: 0.21
Nodes (13): beforeUnmount(), checkMobile(), close(), destroyObservers(), handleKeydown(), handleWindowResize(), initObservers(), is_modal_active() (+5 more)

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
Cohesion: 0.17
Nodes (10): kanbanRepository, projectRepository, SUBSCRIPTION_PLANS, VIDEO_RESOLUTIONS, loadKanbanSyncs(), useKanbanStore, useProjectStore, DEFAULT_COLUMN_TYPE (+2 more)

### Community 89 - "createGoalForm"
Cohesion: 0.50
Nodes (4): createGoalForm(), data(), resetGoalForm(), submitGoal()

### Community 90 - "financeRepository.js"
Cohesion: 0.18
Nodes (9): INVESTMENT_FLOW, isServerId(), normalizeCategoryMacroReferences(), normalizeFinanceText(), now(), replaceServerItemsPreservingPending(), sameCategorySignature(), sameFinanceId() (+1 more)

### Community 96 - "securityService.js"
Cohesion: 0.24
Nodes (8): cancel(), confirm(), modelValue(), reset(), start(), apiErrorCode(), mfaMethodLabels, securityService

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
Cohesion: 0.22
Nodes (9): limits(), plan_limits(), video_quality_options(), can_download_individually(), plan_limits(), video_quality_options(), limits(), getOfflineVideoQualities() (+1 more)

### Community 103 - "app.js"
Cohesion: 0.16
Nodes (9): handle_save_task(), open_related_task(), setTheme(), toggleTheme(), buildThemeStorageKey(), lightThemePaths, resolveThemeUserId(), systemTheme() (+1 more)

### Community 104 - "moneyInput"
Cohesion: 0.16
Nodes (15): addBudgetGroup(), addBudgetItem(), availableCategoriesForMacro(), categoriesForMacro(), hydrateBudgetGroup(), hydrateBudgetItem(), money(), moneyInput() (+7 more)

### Community 105 - "PasskeysSection.vue"
Cohesion: 0.20
Nodes (10): add(), deviceName(), mounted(), remove(), biometricDeclinedKey(), isBiometricSupported(), rememberedEmailKey, checkBiometricSupport() (+2 more)

### Community 109 - "MfaSection.vue"
Cohesion: 0.24
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

### Community 113 - "mobileNavigation.js"
Cohesion: 0.09
Nodes (7): close(), mobile_back(), mobileNavigationMixin, windowNavigationKey, overlayScopeKey, browserHistory(), settled()

### Community 117 - "handle_mobile_select_playlist"
Cohesion: 0.29
Nodes (7): handle_create_playlist(), handle_mobile_select_playlist(), handle_select_liked_playlist(), load_data(), mounted(), observe_container_size(), update_container_width()

### Community 118 - "Configuration.vue"
Cohesion: 0.40
Nodes (7): handlePwaInstall(), mounted(), getPwaInstallUnavailableMessage(), isIOSDevice(), isPwaInstalled(), isStandalone(), requestPwaInstall()

### Community 119 - "LyricsModal.vue"
Cohesion: 0.29
Nodes (12): active_index(), check_scroll_position(), close_modal(), current_time(), get_track_key(), handle_scroll(), handler(), modelValue() (+4 more)

### Community 120 - "usePlayerStore"
Cohesion: 0.22
Nodes (9): activeTab(), data(), activeInvestmentTab(), mounted(), updateChartDimensions(), setup(), data(), normalization_runtime() (+1 more)

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
Cohesion: 0.25
Nodes (13): canUseLocalStorage(), clearSessionRefresh(), getLastSessionRefresh(), getSessionRefreshRemainingMs(), hasValidSessionRefresh(), markSessionRefreshed(), restoreSessionRefreshFromTimestamp(), SESSION_MAX_AGE_MS (+5 more)

### Community 126 - "ProjectsWindow.vue"
Cohesion: 0.12
Nodes (20): check_teleport_target(), close_tab(), close_tab_context_menu(), focus_active_tab(), focus_workspace_window(), handle_duplicate_tab(), handle_open_tab(), handle_tab_click() (+12 more)

### Community 127 - "kanbanBoard.test.js"
Cohesion: 0.29
Nodes (6): createViteServer(), installMemoryStorage(), loadBoard(), stubRouter, withHierarchyBoard(), withProjectCreation()

### Community 128 - "finish_task_drag_preview"
Cohesion: 0.53
Nodes (6): cancel_task_drag_preview_cleanup(), finish_task_drag_preview(), measure_natural_column_height(), restore_task_drag_preview(), schedule_task_drag_preview_cleanup(), update_task_drag_preview()

### Community 129 - ".event"
Cohesion: 0.27
Nodes (6): mounted(), mounted(), mounted(), mounted(), mounted(), RadioListeningTracker

### Community 131 - "financeSync.test.js"
Cohesion: 0.33
Nodes (3): installMemoryStorage(), loadOfflineFinance(), stubRouter

### Community 132 - "expandWrappedCsvRow"
Cohesion: 0.83
Nodes (4): expandWrappedCsvRow(), isWrappedCsvRow(), normalizeParsedCsvRows(), splitCsvLine()

### Community 135 - "refresh_attachment_row"
Cohesion: 0.50
Nodes (4): handle_attachment_selected(), refresh_attachment_row(), uploading_attachment_ids(), upsert_attachment_row()

### Community 136 - "modalHistory.js"
Cohesion: 0.32
Nodes (11): currentUrl(), handlePopState(), modalStack, navigateBack(), navigationStack, needsHistory(), register(), registerNavigation() (+3 more)

### Community 137 - "findMacroByName"
Cohesion: 0.22
Nodes (10): categoryTargetMacro(), findMacroByName(), handleNewCategoryRequest(), macroKey(), onCategoryMacroChange(), openCategoryForm(), openCategoryFormForTransaction(), openMacroForm() (+2 more)

### Community 138 - "healthInsights.js"
Cohesion: 0.35
Nodes (9): patterns(), checkinsInPeriod(), comparePattern(), findPatterns(), hasValue(), observedOptions(), trackerSeries(), checkins (+1 more)

### Community 139 - "animate_filter_change"
Cohesion: 0.25
Nodes (8): animate_filter_change(), animate_filter_task(), beforeUnmount(), cancel_filter_task_animations(), filter_values(), on_task_drag_end(), on_task_drag_start(), stop_tracking_task_drag()

### Community 140 - "cancel_create_task"
Cohesion: 1.00
Nodes (3): cancel_create_task(), handle_click_outside_creation(), handle_create_task()

### Community 142 - "HealthTrackingOverview.vue"
Cohesion: 0.24
Nodes (3): hasRecordedValue(), latestValue(), trackerSummaryData()

### Community 143 - "App.vue"
Cohesion: 0.25
Nodes (7): created(), repairStorage(), consumeLocalDbIssue(), onLocalDbIssue(), repairLocalEnvironment(), mounted(), repairStorage()

### Community 144 - "loadAiUsage"
Cohesion: 0.67
Nodes (3): activeTab(), loadAiUsage(), mounted()

### Community 145 - "ProjectStatusDropdown.vue"
Cohesion: 0.29
Nodes (3): close_dropdown(), mounted(), select_status()

### Community 146 - "download_attachment"
Cohesion: 0.67
Nodes (3): download_attachment(), get_attachment_download_name(), trigger_browser_download()

### Community 148 - "select_playlist"
Cohesion: 0.40
Nodes (6): close_search(), get_liked_tracks(), handle_delete_playlist(), handler(), load_playlist_tracks(), select_playlist()

### Community 149 - "useAuthStore"
Cohesion: 0.13
Nodes (16): setup(), setup(), data(), player_store(), RADIO_FLOW_WINDOW, radio_store(), state_snapshot(), _handleDownloadLyricsTask() (+8 more)

### Community 151 - "ImageCropperModal.vue"
Cohesion: 0.32
Nodes (4): modelValue(), reset_state(), save_crop(), trigger_input()

### Community 153 - "radioInsights.test.js"
Cohesion: 0.25
Nodes (3): compactSong(), fixture(), song

### Community 154 - "close_playlist_filter"
Cohesion: 0.40
Nodes (5): close_playlist_filter(), close_playlist_filter_on_escape(), close_playlist_filter_on_outside_click(), mobile_back(), toggle_playlist_filter()

### Community 155 - "handlePlay"
Cohesion: 0.40
Nodes (5): canPlay(), handlePlay(), isCurrentPlaying(), isTrackPlaying(), play()

### Community 156 - "fetch_search_results"
Cohesion: 0.50
Nodes (4): fetch_search_results(), handle_load_more(), perform_mobile_search(), perform_search()

### Community 157 - "TrackReaction.vue"
Cohesion: 0.40
Nodes (4): currentVote, props, store, votes

## Knowledge Gaps
- **159 isolated node(s):** `$schema`, `semi`, `singleQuote`, `printWidth`, `paths` (+154 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAuthStore` connect `useAuthStore` to `KademNexo.vue`, `KanbanColumn.vue`, `HealthWindow.vue`, `NewProject.vue`, `homeView.vue`, `syncService.js`, `AccountCenter.vue`, `TrackList.vue`, `PlaylistHeader.vue`, `resetPasswordView.vue`, `TaskDetailForm.vue`, `headerSystem.vue`, `useVaultStore`, `SubscriptionModal.vue`, `avatarComponent.vue`, `TaskRelations.vue`, `ProjectKanban.vue`, `authView.vue`, `db.js`, `player.js`, `StartMenu.vue`, `MainInformations.vue`, `main.js`, `health.js`, `ReauthModal.vue`, `BaseWindow.vue`, `apiErrorMessage`, `kanban.js`, `PasskeysSection.vue`, `usePlayerStore`, `auth.js`?**
  _High betweenness centrality (0.104) - this node is a cross-community bridge._
- **Why does `usePlayerStore` connect `usePlayerStore` to `.event`, `KademNexo.vue`, `KademSkeletonGroup.vue`, `RadioFlow.vue`, `HealthWindow.vue`, `PlayerWrapper.vue`, `NexoInvestmentsTab.vue`, `homeView.vue`, `TrackList.vue`, `loadAiUsage`, `useAuthStore`, `VideoModal.vue`, `player.js`, `ProductivityWindow.vue`, `radioFlowWidget.vue`, `AudioSettingsPanel.vue`, `QueueSidebar.vue`, `RadioInsightsPanel.vue`, `createGoalForm`, `LyricsModal.vue`, `auth.js`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `useAppStore` connect `app.js` to `RadioFlow.vue`, `homeView.vue`, `AccountCenter.vue`, `App.vue`, `TaskDetailForm.vue`, `headerSystem.vue`, `useVaultStore`, `ProjectKanban.vue`, `StartMenu.vue`, `main.js`, `ProjectList.vue`, `PlaylistSidebar.vue`, `BaseWindow.vue`, `QueueSidebar.vue`, `DevicesSection.vue`, `apiErrorMessage`, `PasskeysSection.vue`, `MfaSection.vue`, `mobileNavigation.js`, `Configuration.vue`, `auth.js`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `usePlayerStore` (e.g. with `track()` and `.flush()`) actually correct?**
  _`usePlayerStore` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `semi`, `singleQuote` to the rest of the system?**
  _159 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `HealthTrackingTab.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.12418300653594772 - nodes in this community are weakly interconnected._
- **Should `KademTabs.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.1368421052631579 - nodes in this community are weakly interconnected._