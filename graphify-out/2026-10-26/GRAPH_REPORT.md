# Graph Report - kadem-web  (2026-10-26)

## Corpus Check
- 260 files · ~297,651 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2706 nodes · 4899 edges · 165 communities (148 shown, 17 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 43 edges (avg confidence: 0.79)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d7fec6ce`
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
- resetPasswordView.vue
- syncService.js
- AccountCenter.vue
- TrackList.vue
- PlaylistHeader.vue
- BaseModal.vue
- TaskDetailForm.vue
- headerSystem.vue
- reloadAll
- radio.js
- SubscriptionModal.vue
- dependencies
- devDependencies
- HealthCheckinModal.vue
- TaskRelations.vue
- ProjectKanban.vue
- authView.vue
- TrackOptionsMenu.vue
- db.js
- KademSkeletonGroup.vue
- useAppStore
- buildSvgCurvePath
- normalize
- VideoModal.vue
- StartMenu.vue
- MainInformations.vue
- financeService.js
- ProductivityWindow.vue
- refreshTransactionDrivenViews
- MacroCategoryCombo.vue
- main.js
- health.js
- biometricAuth.js
- SearchableDropdown.vue
- ReauthModal.vue
- findCategory
- mobileNavigation.js
- AudioSettingsPanel.vue
- HealthActionModal.vue
- BaseWindow.vue
- QueueSidebar.vue
- KanbanPresetPicker.vue
- healthGroups.test.js
- RadioInsightsPanel.vue
- kanbanBoard.test.js
- NexoGenosPairing.vue
- OtpInput.vue
- player.js
- scripts
- kanban.js
- MfaChallenge.vue
- switchComponent.vue
- CustomDropdown.vue
- radioNormalizationIntegration.test.js
- HealthRelationModal.vue
- HealthTrackerGroupModal.vue
- HealthTrackerModal.vue
- DevicesSection.vue
- financeRepository.js
- package.json
- PipManager.vue
- homeView.vue
- MediaSessionManager
- exclude
- vault.js
- .prettierrc.json
- PasskeysSection.vue
- healthObjectTypes.js
- README.md
- snapshot_task
- HealthObjectsTab.vue
- logoutView.vue
- Como configurar o Background do Modo Escuro no Kadem
- ConfirmationModal.vue
- SideModal.vue
- biometricAuth.test.js
- AGENTS.md
- HealthTrackingInsights.vue
- apiErrorMessage
- HealthCategoryModal.vue
- clampToMacroTone
- HealthPublicCardTab.vue
- NexoTransactionsTable.vue
- UploadTrackModal.vue
- getPlanLimits
- LyricsModal.vue
- HealthObjectModal.vue
- ProjectDropdown.vue
- MfaSection.vue
- global.js
- is_attachment_deleting
- calculate_dropdown_position
- modalHistory.js
- select_playlist
- Configuration.vue
- close_assignee_menu
- AccountList.vue
- deleteInvestmentGoal
- close_options
- TotpSetupModal.vue
- ProjectWorkspaceTab.vue
- auth.js
- ProjectsWindow.vue
- finish_task_drag_preview
- .event
- close_comment_menu
- financeSync.test.js
- buildCsvExactKey
- RecoveryEmailModal.vue
- NexoCreditTab.vue
- upload_attachment_file
- genosPairing.test.js
- findMacroByName
- healthInsights.js
- animate_filter_change
- cancel_create_task
- moneyInput
- HealthTrackingOverview.vue
- ProjectStatusDropdown.vue
- App.vue
- download_attachment
- clear_pasted_attachment
- openConfirmation
- PlaylistSelector.vue
- ImageCropperModal.vue
- TrackReaction.vue
- windows.js
- goalCurrentAmount
- dexie
- pinia
- createGoalForm
- activeInvestmentTab
- usePlayerStore

## God Nodes (most connected - your core abstractions)
1. `useAuthStore` - 56 edges
2. `useAppStore` - 33 edges
3. `usePlayerStore` - 33 edges
4. `apiErrorMessage()` - 27 edges
5. `useVaultStore` - 26 edges
6. `api` - 25 edges
7. `db` - 21 edges
8. `useUtilsStore` - 20 edges
9. `scripts` - 19 edges
10. `captureSyncSession()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `useProjectStore` --indirect_call--> `local_id()`  [INFERRED]
  src/stores/projects.js → tests/uiPerformance.test.js
- `makeStore()` --indirect_call--> `selectivePersistence()`  [INFERRED]
  tests/uiPerformance.test.js → src/plugins/selectivePersistence.js
- `debounce()` --indirect_call--> `context()`  [INFERRED]
  src/stores/player.js → tests/genosPairing.test.js
- `patterns()` --calls--> `findPatterns()`  [EXTRACTED]
  src/components/health/HealthTrackingInsights.vue → src/services/healthInsights.js
- `runComparison()` --calls--> `comparePattern()`  [EXTRACTED]
  src/components/health/HealthTrackingInsights.vue → src/services/healthInsights.js

## Import Cycles
- 3-file cycle: `src/router/index.js -> src/views/InviteLanding.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/services/syncService.js -> src/stores/auth.js -> src/stores/vault.js -> src/services/syncService.js`
- 3-file cycle: `src/services/syncService.js -> src/stores/radio.js -> src/stores/radioInsights.js -> src/services/syncService.js`
- 3-file cycle: `src/router/index.js -> src/views/resetPasswordView.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/services/syncService.js -> src/stores/auth.js -> src/stores/radioInsights.js -> src/services/syncService.js`
- 3-file cycle: `src/services/syncService.js -> src/stores/auth.js -> src/stores/health.js -> src/services/syncService.js`
- 3-file cycle: `src/services/syncService.js -> src/stores/auth.js -> src/stores/player.js -> src/services/syncService.js`
- 3-file cycle: `src/router/index.js -> src/views/logoutView.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/router/index.js -> src/views/homeView.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/router/index.js -> src/views/authView.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/plugins/api.js -> src/stores/projects.js -> src/stores/utils.js -> src/plugins/api.js`
- 4-file cycle: `src/components/headerSystem.vue -> src/stores/auth.js -> src/router/index.js -> src/views/homeView.vue -> src/components/headerSystem.vue`
- 4-file cycle: `src/services/syncService.js -> src/stores/auth.js -> src/stores/radio.js -> src/stores/radioInsights.js -> src/services/syncService.js`
- 5-file cycle: `src/components/headerSystem.vue -> src/components/startMenu/StartMenu.vue -> src/stores/auth.js -> src/router/index.js -> src/views/homeView.vue -> src/components/headerSystem.vue`
- 5-file cycle: `src/components/SubscriptionModal.vue -> src/stores/auth.js -> src/router/index.js -> src/views/homeView.vue -> src/components/headerSystem.vue -> src/components/SubscriptionModal.vue`
- 5-file cycle: `src/components/headerSystem.vue -> src/stores/aiCredits.js -> src/stores/auth.js -> src/router/index.js -> src/views/homeView.vue -> src/components/headerSystem.vue`
- 5-file cycle: `src/router/index.js -> src/views/authView.vue -> src/stores/vault.js -> src/services/syncService.js -> src/stores/auth.js -> src/router/index.js`
- 5-file cycle: `src/router/index.js -> src/views/homeView.vue -> src/stores/vault.js -> src/services/syncService.js -> src/stores/auth.js -> src/router/index.js`
- 5-file cycle: `src/services/syncService.js -> src/stores/auth.js -> src/stores/player.js -> src/stores/radio.js -> src/stores/radioInsights.js -> src/services/syncService.js`

## Communities (165 total, 17 thin omitted)

### Community 0 - "HealthTrackingTab.vue"
Cohesion: 0.12
Nodes (4): selectedSummary(), latestValueDisplay(), recentCount(), trackerSummary()

### Community 1 - "KademTabs.vue"
Cohesion: 0.14
Nodes (6): checkScrollability(), currentTabId(), handler(), initResizeObserver(), mounted(), scrollToActiveTab()

### Community 2 - "KademNexo.vue"
Cohesion: 0.05
Nodes (24): appendBudgetAiMessage(), budgetAiStorageKey(), budgetGroupHeaderStyle(), budgetGroupStyle(), calendarDateParts(), countCsvDelimiters(), csvImportSummary(), detectCsvDelimiter() (+16 more)

### Community 4 - "RadioFlow.vue"
Cohesion: 0.05
Nodes (10): beforeUnmount(), fetch_search_results(), format_bytes(), handle_load_more(), is_player_lifted(), observe_lifted_player(), perform_mobile_search(), perform_search() (+2 more)

### Community 5 - "CategoryCombo.vue"
Cohesion: 0.05
Nodes (15): close(), filteredCategories(), handleOutsideClick(), handleViewportChange(), normalize(), open(), requestCreate(), sameId() (+7 more)

### Community 6 - "HealthWindow.vue"
Cohesion: 0.04
Nodes (17): activeTab(), cancelArchiveTracker(), cancelDeleteEvent(), cancelDeleteTrackerGroup(), confirmArchiveTracker(), confirmDeleteEvent(), confirmDeleteTrackerGroup(), dueDays() (+9 more)

### Community 7 - "NewProject.vue"
Cohesion: 0.10
Nodes (8): checkInviteErrors(), displayList(), handleCancelNewGroup(), handleCreateProject(), handleDeleteProject(), handleSave(), handleUpdateProject(), isMemberOwner()

### Community 9 - "decode_html_entities"
Cohesion: 0.23
Nodes (8): visible_tracks(), get_visible_playlist_tracks(), normalize_search(), sort_value(), title_collator, decode_html_entities(), decoded_cache, tracks

### Community 10 - "PlayerWrapper.vue"
Cohesion: 0.06
Nodes (27): bring_lyrics_to_front(), bring_video_to_front(), cycle_reaction(), format_seconds_to_time(), formatted_current_time(), formatted_duration(), get_current_time(), get_duration() (+19 more)

### Community 12 - "resetPasswordView.vue"
Cohesion: 0.10
Nodes (12): completeLink(), handleAlexaLogin(), onMfaVerified(), backToPassword(), continueToSessions(), endsCurrentSession(), mounted(), passwordError() (+4 more)

### Community 13 - "syncService.js"
Cohesion: 0.10
Nodes (37): attachmentUploads, finishAttachmentUpload(), reportAttachmentUpload(), isRadioInsightsTask(), buildChangesArray(), delay(), deleteFinanceLocalRecord(), _handleAccountTask() (+29 more)

### Community 14 - "AccountCenter.vue"
Cohesion: 0.13
Nodes (9): usePasskey(), "auth.user.email"(), handleBiometricUnlock(), handleCloseModal(), handleSaveNewAccount(), mounted(), refreshVaultBiometricStatus(), toggleVaultBiometrics() (+1 more)

### Community 15 - "TrackList.vue"
Cohesion: 0.07
Nodes (13): create_fallback_thumb(), handle_add_queue(), handle_desktop_dbl_click(), handle_download_lyrics(), handle_row_click(), is_track_unavailable(), mounted(), on_drag_start() (+5 more)

### Community 16 - "PlaylistHeader.vue"
Cohesion: 0.07
Nodes (6): close_download_menu(), closeMenu(), format_total_duration_verbose(), toggle_download_menu(), toggle_options_menu(), total_duration_formatted()

### Community 17 - "BaseModal.vue"
Cohesion: 0.16
Nodes (14): beforeUnmount(), close(), destroyObservers(), handleKeydown(), handleMobileBack(), handler(), handleResize(), handleTouchEnd() (+6 more)

### Community 19 - "headerSystem.vue"
Cohesion: 0.11
Nodes (13): ai_credits_remaining(), ai_credits_total(), ai_credits_used(), closeAllPopups(), closeContextMenu(), handleMenuClick(), handler(), mobile_back() (+5 more)

### Community 20 - "reloadAll"
Cohesion: 0.12
Nodes (27): closeDeleteConfirm(), confirmDeleteAction(), deleteConnection(), deleteInvestmentEvent(), loadBudgets(), loadCategories(), loadConnections(), loadCreditCards() (+19 more)

### Community 21 - "radio.js"
Cohesion: 0.18
Nodes (12): radioRepository, _handleProjectTask(), syncHealthDelta(), useProjectStore, useUtilsStore, assertSyncSession(), captureSyncSession(), normalizeSyncCursor() (+4 more)

### Community 22 - "SubscriptionModal.vue"
Cohesion: 0.17
Nodes (6): check_cpf(), go_to_checkout(), handle_checkout(), request_cancel(), requestClose(), resetState()

### Community 23 - "dependencies"
Cohesion: 0.06
Nodes (31): axios, @fortawesome/fontawesome-svg-core, @fortawesome/free-solid-svg-icons, @fortawesome/vue-fontawesome, lodash.isequal, markdown-it, markdown-it-task-lists, moment (+23 more)

### Community 24 - "devDependencies"
Cohesion: 0.06
Nodes (31): eslint, @eslint/js, eslint-plugin-oxlint, eslint-plugin-vue, fake-indexeddb, globals, npm-run-all2, oxlint (+23 more)

### Community 25 - "HealthCheckinModal.vue"
Cohesion: 0.10
Nodes (10): clearAll(), clearField(), filledCount(), hasValue(), localDateTime(), parsedTags(), removeTag(), reset() (+2 more)

### Community 27 - "TaskRelations.vue"
Cohesion: 0.05
Nodes (10): completed_child_count(), candidates(), completedChildrenCount(), isTaskDone(), toggleChildCompletion(), rendered_content(), markdown, renderMarkdown() (+2 more)

### Community 28 - "ProjectKanban.vue"
Cohesion: 0.07
Nodes (8): beforeUnmount(), can_paste_attachment(), close_confirmation(), handle_confirm_delete(), handler(), load_board(), on_column_drag_end(), isTopModal()

### Community 29 - "authView.vue"
Cohesion: 0.08
Nodes (24): repairStorage(), repairLocalEnvironment(), afterLogin(), checkPasswordStrength(), confirmBiometrics(), confirmTrust(), continueAfterLogin(), continueAfterMfaCheck() (+16 more)

### Community 30 - "TrackOptionsMenu.vue"
Cohesion: 0.09
Nodes (8): beforeUnmount(), cancel_close(), close_on_hover(), open(), open_on_hover(), position_panel(), supports_hover(), toggle_on_touch()

### Community 31 - "db.js"
Cohesion: 0.12
Nodes (24): canUseBrowserStorage(), clearLocalDbIssue(), createIssuePayload(), createLocalDbUnavailableError(), emitLocalDbIssue(), ensureDbOpen(), getErrorNameChain(), initializeLocalDb() (+16 more)

### Community 32 - "KademSkeletonGroup.vue"
Cohesion: 0.16
Nodes (4): skeleton_style(), to_css_size(), loadingContinuity, APP_NAMES

### Community 33 - "useAppStore"
Cohesion: 0.13
Nodes (9): handle_save_task(), open_related_task(), setTheme(), toggleTheme(), buildThemeStorageKey(), lightThemePaths, resolveThemeUserId(), systemTheme() (+1 more)

### Community 34 - "buildSvgCurvePath"
Cohesion: 0.40
Nodes (5): buildSvgCurvePath(), calcCurveInterest(), calcCurveInvested(), calcCurveTotal(), projectionCurvePath()

### Community 35 - "normalize"
Cohesion: 0.16
Nodes (20): autoCategorize(), buildCsvObservation(), cleanCsvCell(), displayInsights(), findCategoryByName(), findColumnIndex(), handleCsvFileChange(), loadInsights() (+12 more)

### Community 36 - "VideoModal.vue"
Cohesion: 0.16
Nodes (14): beforeUnmount(), close_modal(), current_time(), exit_fullscreen_if_active(), handle_video_metadata(), is_playing(), load_video(), modelValue() (+6 more)

### Community 37 - "StartMenu.vue"
Cohesion: 0.15
Nodes (8): closeProjectView(), goToLogoutScreen(), handleLogoutClick(), mobile_back(), openCreateProject(), openEditProject(), setActiveTab(), setActiveTabById()

### Community 38 - "MainInformations.vue"
Cohesion: 0.12
Nodes (4): cancelAddOccupation(), handleAddNewOccupation(), handleSaveBio(), toggleBioEdit()

### Community 39 - "financeService.js"
Cohesion: 0.20
Nodes (13): entityMatchesAnyServerId(), entityReferenceIds(), entityServerId(), findLocalMacro(), isServerId(), pendingDeleteServerIds(), preparePendingMacroUpdate(), removeDeletedCategoryReferencesFromQueue() (+5 more)

### Community 41 - "refreshTransactionDrivenViews"
Cohesion: 0.15
Nodes (22): applyPendingCategorySelection(), applyTransactionPatch(), closeTransactionForm(), confirmCsvImport(), deleteTransaction(), enrichTransactionForList(), openConfirmation(), refreshTransactionDrivenViews() (+14 more)

### Community 43 - "MacroCategoryCombo.vue"
Cohesion: 0.18
Nodes (11): close(), createValue(), filteredMacros(), handleOutsideClick(), handleViewportChange(), normalize(), open(), select() (+3 more)

### Community 44 - "main.js"
Cohesion: 0.20
Nodes (8): frames, vAnimateHeight, app, pinia, utils_store, router, routes, radioFlowApi

### Community 45 - "health.js"
Cohesion: 0.22
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
Cohesion: 0.10
Nodes (26): addBudgetGroup(), addBudgetItem(), availableCategoriesForMacro(), budgetSummary(), buildTransactionSearchText(), categoriesForMacro(), categoryKey(), categoryTypeLabel() (+18 more)

### Community 52 - "mobileNavigation.js"
Cohesion: 0.18
Nodes (8): provide(), provide(), createWindowNavigation(), mobileNavigationMixin, windowNavigationKey, overlayScopeMixin, browserHistory(), settled()

### Community 53 - "AudioSettingsPanel.vue"
Cohesion: 0.05
Nodes (19): reset_band(), update_band(), AUDIO_BANDS, audio_headroom_db(), AUDIO_PRESETS, bounded(), default_audio_settings(), sanitize_audio_settings() (+11 more)

### Community 54 - "HealthActionModal.vue"
Cohesion: 0.20
Nodes (3): localDateTime(), resetForm(), visible()

### Community 55 - "BaseWindow.vue"
Cohesion: 0.13
Nodes (14): handleWindowClick(), data(), focus(), minimize(), mobile_back(), reload_content(), startDrag(), startResize() (+6 more)

### Community 56 - "QueueSidebar.vue"
Cohesion: 0.12
Nodes (20): animate_queue_changes(), AUTOSCROLL_END_EVENTS, AUTOSCROLL_POINTER_EVENTS, beforeUnmount(), capture_queue_positions(), get(), handle_drag_end(), handle_drag_start() (+12 more)

### Community 57 - "KanbanPresetPicker.vue"
Cohesion: 0.21
Nodes (10): PRESET_META, selectedPreset(), selectedRules(), DEFAULT_KANBAN_PRESET, getKanbanPreset(), getKanbanPresetColumns(), getKanbanPresetRules(), getPresetColumnType() (+2 more)

### Community 58 - "healthGroups.test.js"
Cohesion: 0.18
Nodes (3): mockLocalStorage, mockLocation, storage

### Community 59 - "RadioInsightsPanel.vue"
Cohesion: 0.07
Nodes (30): canPlay(), changeYear(), connected, currentYear, dateInputValue, dislikedCount, emptyStateIcon, emptyStateSubtitle (+22 more)

### Community 60 - "kanbanBoard.test.js"
Cohesion: 0.16
Nodes (6): createViteServer(), installMemoryStorage(), loadBoard(), stubRouter, withHierarchyBoard(), withProjectCreation()

### Community 61 - "NexoGenosPairing.vue"
Cohesion: 0.12
Nodes (9): beforeUnmount(), copy(), generate(), handler(), loadAccess(), reset(), tick(), userId() (+1 more)

### Community 62 - "OtpInput.vue"
Cohesion: 0.16
Nodes (9): codeComplete(), onInput(), codeComplete(), onInput(), digitsOnly(), formatRecoveryCode(), normalizeRecoveryCode(), OTP_LENGTH (+1 more)

### Community 63 - "player.js"
Cohesion: 0.10
Nodes (19): check_system_health(), CSRF_EXEMPT_PATHS, ensureCsrfToken(), getCookie(), isCsrfExempt(), MUTATION_METHODS, normalizePath(), url_api (+11 more)

### Community 64 - "scripts"
Cohesion: 0.11
Nodes (19): scripts, build, dev, format, lint, lint:eslint, lint:oxlint, preview (+11 more)

### Community 65 - "kanban.js"
Cohesion: 0.14
Nodes (15): db, runDbOperation(), kanbanRepository, medalRepository, occupationRepository, projectRepository, syncQueueRepository, userRepository (+7 more)

### Community 66 - "MfaChallenge.vue"
Cohesion: 0.12
Nodes (5): METHOD_DESCRIPTIONS, METHOD_ICONS, METHOD_ORDER, sendEmail(), startCooldown()

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

### Community 74 - "financeRepository.js"
Cohesion: 0.18
Nodes (9): INVESTMENT_FLOW, isServerId(), normalizeCategoryMacroReferences(), normalizeFinanceText(), now(), replaceServerItemsPreservingPending(), sameCategorySignature(), sameFinanceId() (+1 more)

### Community 75 - "package.json"
Cohesion: 0.29
Nodes (6): engines, node, name, private, type, version

### Community 76 - "PipManager.vue"
Cohesion: 0.15
Nodes (17): current_music(), current_time(), draw_canvas_content(), draw_image_cover(), draw_pause_icon(), draw_play_icon(), draw_round_rect(), fill_text_with_ellipsis() (+9 more)

### Community 77 - "homeView.vue"
Cohesion: 0.07
Nodes (9): create_yt_player(), init_youtube_api(), mounted(), mounted(), updateClock(), checkIfReady(), handler(), init_connection_monitor() (+1 more)

### Community 79 - "exclude"
Cohesion: 0.33
Nodes (5): compilerOptions, paths, exclude, dist, node_modules

### Community 80 - "vault.js"
Cohesion: 0.15
Nodes (10): handleGenerateRecovery(), handleMigration(), setup(), handleRescue(), accountsRepository, base64ToBuffer(), bufferToBase64(), decoder (+2 more)

### Community 81 - ".prettierrc.json"
Cohesion: 0.40
Nodes (4): printWidth, $schema, semi, singleQuote

### Community 82 - "PasskeysSection.vue"
Cohesion: 0.22
Nodes (9): add(), deviceName(), mounted(), remove(), biometricDeclinedKey(), isBiometricSupported(), rememberedEmailKey, checkBiometricSupport() (+1 more)

### Community 83 - "healthObjectTypes.js"
Cohesion: 0.18
Nodes (5): HEALTH_ENTITY_TYPE_OPTIONS, HEALTH_OBJECT_TYPE_OPTIONS, HEALTH_SCHEDULE_TYPE_OPTION, HEALTH_SCHEDULE_TYPE_OPTIONS, storage

### Community 84 - "README.md"
Cohesion: 0.50
Nodes (3): ✨ Funcionalidades Principais, 📌 Sobre o Projeto, 🛠️ Tecnologias Utilizadas

### Community 85 - "snapshot_task"
Cohesion: 0.40
Nodes (6): apply_responsible_change(), get_clean_task_data(), handler(), is_dirty(), snapshot_task(), sync_responsible_wrapper()

### Community 86 - "HealthObjectsTab.vue"
Cohesion: 0.12
Nodes (3): objectBadgeClass(), objectCardClass(), isHealthStockObject()

### Community 87 - "logoutView.vue"
Cohesion: 0.38
Nodes (4): beforeUnmount(), cleanupTimers(), mounted(), startLogoutSequence()

### Community 90 - "SideModal.vue"
Cohesion: 0.23
Nodes (11): beforeUnmount(), checkMobile(), close(), destroyObservers(), handleKeydown(), handleWindowResize(), initObservers(), is_modal_active() (+3 more)

### Community 95 - "HealthTrackingInsights.vue"
Cohesion: 0.11
Nodes (4): explainWithAi(), patterns(), runComparison(), healthAiService

### Community 96 - "apiErrorMessage"
Cohesion: 0.16
Nodes (11): submit(), sendLink(), submit(), active(), loadDevices(), onDevicesChanged(), online(), reload() (+3 more)

### Community 97 - "HealthCategoryModal.vue"
Cohesion: 0.28
Nodes (3): localDate(), resetForm(), visible()

### Community 98 - "clampToMacroTone"
Cohesion: 0.28
Nodes (14): categoryTones(), currentCategoryToneColor(), currentToneLightness(), isCurrentCategoryTone(), onCategoryMacroColorInput(), onToneSliderChange(), setCategoryColor(), toneSliderTrackStyle() (+6 more)

### Community 99 - "HealthPublicCardTab.vue"
Cohesion: 0.09
Nodes (13): data(), emptyCard(), loadSettings(), mounted(), refreshQr(), save(), healthPublicCardService, copyFullSummary() (+5 more)

### Community 100 - "NexoTransactionsTable.vue"
Cohesion: 0.14
Nodes (8): sourceLabel(), timeLabel(), editedTransactionDate(), isGenosNotification(), notificationClock, transactionCalendarDate(), transactionDescription(), transactionObservation()

### Community 101 - "UploadTrackModal.vue"
Cohesion: 0.25
Nodes (7): format_bytes(), handle_close(), handle_file_change(), modelValue(), probe_duration(), quota_error_message(), reset_selection()

### Community 102 - "getPlanLimits"
Cohesion: 0.18
Nodes (11): limits(), plan_limits(), video_quality_options(), can_download_individually(), plan_limits(), video_quality_options(), limits(), getOfflineVideoQualities() (+3 more)

### Community 103 - "LyricsModal.vue"
Cohesion: 0.29
Nodes (12): active_index(), check_scroll_position(), close_modal(), current_time(), get_track_key(), handle_scroll(), handler(), modelValue() (+4 more)

### Community 104 - "HealthObjectModal.vue"
Cohesion: 0.15
Nodes (12): "form.object_type"(), localDateTime(), resetForm(), visible(), frequencyLabel(), openEditObjectModal(), openNewObjectModal(), submitObject() (+4 more)

### Community 109 - "MfaSection.vue"
Cohesion: 0.24
Nodes (4): disable(), regenerate(), removeRecoveryEmail(), run()

### Community 110 - "global.js"
Cohesion: 0.27
Nodes (4): beginGlobalDrag(), endGlobalDrag(), resetGlobalDrag(), setGlobalDragging()

### Community 111 - "is_attachment_deleting"
Cohesion: 0.33
Nodes (6): attachment_icon(), attachment_status_label(), get_attachment_kind(), is_attachment_deleting(), open_attachment(), remove_attachment()

### Community 113 - "modalHistory.js"
Cohesion: 0.30
Nodes (12): currentUrl(), handlePopState(), modalStack, navigateBack(), navigationStack, needsHistory(), register(), registerModal() (+4 more)

### Community 117 - "select_playlist"
Cohesion: 0.12
Nodes (18): close_playlist_filter(), close_playlist_filter_on_escape(), close_playlist_filter_on_outside_click(), close_search(), get_liked_tracks(), handle_create_playlist(), handle_delete_playlist(), handle_mobile_select_playlist() (+10 more)

### Community 118 - "Configuration.vue"
Cohesion: 0.40
Nodes (7): handlePwaInstall(), mounted(), getPwaInstallUnavailableMessage(), isIOSDevice(), isPwaInstalled(), isStandalone(), requestPwaInstall()

### Community 121 - "deleteInvestmentGoal"
Cohesion: 0.38
Nodes (7): deleteInvestmentGoal(), investmentGoalKey(), investmentGoalMatches(), removeInvestmentGoalFromList(), requestDeleteInvestmentGoal(), saveInvestmentGoal(), upsertInvestmentGoalInList()

### Community 122 - "close_options"
Cohesion: 0.25
Nodes (8): close_options(), close_search(), emit_delete_request(), handle_click_outside_search(), open_type_config(), show_new_task_form(), start_rename(), toggle_search()

### Community 123 - "TotpSetupModal.vue"
Cohesion: 0.39
Nodes (5): cancel(), confirm(), modelValue(), reset(), start()

### Community 124 - "ProjectWorkspaceTab.vue"
Cohesion: 0.14
Nodes (3): resetKey(), retry(), overlayScopeKey

### Community 125 - "auth.js"
Cohesion: 0.15
Nodes (19): setup(), setup(), data(), api, canUseLocalStorage(), clearSessionRefresh(), getLastSessionRefresh(), getSessionRefreshRemainingMs() (+11 more)

### Community 126 - "ProjectsWindow.vue"
Cohesion: 0.12
Nodes (20): check_teleport_target(), close_tab(), close_tab_context_menu(), focus_active_tab(), focus_workspace_window(), handle_duplicate_tab(), handle_open_tab(), handle_tab_click() (+12 more)

### Community 128 - "finish_task_drag_preview"
Cohesion: 0.53
Nodes (6): cancel_task_drag_preview_cleanup(), finish_task_drag_preview(), measure_natural_column_height(), restore_task_drag_preview(), schedule_task_drag_preview_cleanup(), update_task_drag_preview()

### Community 129 - ".event"
Cohesion: 0.15
Nodes (9): mounted(), mounted(), mounted(), mounted(), mounted(), RadioListeningTracker, compactSong(), fixture() (+1 more)

### Community 130 - "close_comment_menu"
Cohesion: 0.50
Nodes (4): close_comment_menu(), delete_comment(), edit_comment(), handle_global_click()

### Community 131 - "financeSync.test.js"
Cohesion: 0.20
Nodes (6): localDashboard(), creditSummary(), normalizePaymentOrigin(), installMemoryStorage(), loadOfflineFinance(), stubRouter

### Community 132 - "buildCsvExactKey"
Cohesion: 0.31
Nodes (10): buildCsvExactKey(), buildCsvLegacyKey(), buildTransactionCandidateMaps(), consumeCandidate(), csvAmountKey(), csvDateOnly(), csvHasMeaningfulTime(), filterCsvDuplicates() (+2 more)

### Community 133 - "RecoveryEmailModal.vue"
Cohesion: 0.24
Nodes (7): cancel(), confirm(), modelValue(), reset(), sendCode(), startCooldown(), apiErrorCode()

### Community 134 - "NexoCreditTab.vue"
Cohesion: 0.12
Nodes (6): labelFor(), options(), cardName(), cardLabel(), PAYMENT_METHODS, paymentMethodLabel()

### Community 135 - "upload_attachment_file"
Cohesion: 0.33
Nodes (6): confirm_pasted_attachment(), handle_attachment_selected(), refresh_attachment_row(), upload_attachment_file(), uploading_attachment_ids(), upsert_attachment_row()

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

### Community 141 - "moneyInput"
Cohesion: 0.24
Nodes (10): data(), localToday(), money(), moneyInput(), openTransactionForm(), parseMoneyInput(), signedMoney(), updateBudgetAmount() (+2 more)

### Community 142 - "HealthTrackingOverview.vue"
Cohesion: 0.24
Nodes (3): hasRecordedValue(), latestValue(), trackerSummaryData()

### Community 144 - "ProjectStatusDropdown.vue"
Cohesion: 0.29
Nodes (3): close_dropdown(), mounted(), select_status()

### Community 145 - "App.vue"
Cohesion: 0.43
Nodes (4): created(), consumeLocalDbIssue(), onLocalDbIssue(), mounted()

### Community 146 - "download_attachment"
Cohesion: 0.50
Nodes (4): download_attachment(), get_attachment_download_name(), is_attachment_downloading(), trigger_browser_download()

### Community 147 - "clear_pasted_attachment"
Cohesion: 0.50
Nodes (4): active_tab(), beforeUnmount(), clear_pasted_attachment(), close_attachment_preview()

### Community 148 - "openConfirmation"
Cohesion: 0.33
Nodes (7): delete_track(), execute_add_track(), handle_add_to_another_playlist(), handle_delete_track(), handle_upload_submit(), openConfirmation(), verify_and_add_track()

### Community 151 - "ImageCropperModal.vue"
Cohesion: 0.15
Nodes (4): modelValue(), reset_state(), save_crop(), trigger_input()

### Community 153 - "TrackReaction.vue"
Cohesion: 0.40
Nodes (4): currentVote, props, store, votes

### Community 154 - "windows.js"
Cohesion: 0.67
Nodes (5): finite(), isStateMap(), normalizeWindowStates(), position(), size()

### Community 155 - "goalCurrentAmount"
Cohesion: 0.40
Nodes (5): goalCurrentAmount(), goalProgress(), heroProgressPercent(), heroProgressText(), nearestGoal()

### Community 161 - "createGoalForm"
Cohesion: 0.50
Nodes (4): createGoalForm(), data(), resetGoalForm(), submitGoal()

### Community 162 - "activeInvestmentTab"
Cohesion: 0.67
Nodes (3): activeInvestmentTab(), mounted(), updateChartDimensions()

### Community 167 - "usePlayerStore"
Cohesion: 0.27
Nodes (9): activeTab(), setup(), data(), player_store(), RADIO_FLOW_WINDOW, radio_store(), state_snapshot(), normalization_runtime() (+1 more)

## Knowledge Gaps
- **168 isolated node(s):** `$schema`, `semi`, `singleQuote`, `printWidth`, `paths` (+163 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAuthStore` connect `auth.js` to `KademNexo.vue`, `KanbanColumn.vue`, `HealthWindow.vue`, `NewProject.vue`, `resetPasswordView.vue`, `syncService.js`, `AccountCenter.vue`, `TrackList.vue`, `PlaylistHeader.vue`, `TaskDetailForm.vue`, `headerSystem.vue`, `radio.js`, `SubscriptionModal.vue`, `ImageCropperModal.vue`, `windows.js`, `TaskRelations.vue`, `ProjectKanban.vue`, `authView.vue`, `db.js`, `StartMenu.vue`, `MainInformations.vue`, `usePlayerStore`, `health.js`, `ReauthModal.vue`, `NexoGenosPairing.vue`, `player.js`, `kanban.js`, `homeView.vue`, `vault.js`, `PasskeysSection.vue`, `logoutView.vue`, `apiErrorMessage`?**
  _High betweenness centrality (0.106) - this node is a cross-community bridge._
- **Why does `usePlayerStore` connect `usePlayerStore` to `.event`, `KademNexo.vue`, `RadioFlow.vue`, `HealthWindow.vue`, `PlayerWrapper.vue`, `NexoInvestmentsTab.vue`, `moneyInput`, `TrackList.vue`, `radio.js`, `windows.js`, `KademSkeletonGroup.vue`, `createGoalForm`, `activeInvestmentTab`, `VideoModal.vue`, `ProductivityWindow.vue`, `radioFlowWidget.vue`, `AudioSettingsPanel.vue`, `QueueSidebar.vue`, `RadioInsightsPanel.vue`, `player.js`, `homeView.vue`, `LyricsModal.vue`, `auth.js`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `useAppStore` connect `useAppStore` to `RadioFlow.vue`, `AccountCenter.vue`, `App.vue`, `TaskDetailForm.vue`, `headerSystem.vue`, `DesktopWindowManager.vue`, `ProjectKanban.vue`, `StartMenu.vue`, `main.js`, `ProjectList.vue`, `mobileNavigation.js`, `BaseWindow.vue`, `QueueSidebar.vue`, `DevicesSection.vue`, `homeView.vue`, `vault.js`, `PasskeysSection.vue`, `apiErrorMessage`, `MfaSection.vue`, `Configuration.vue`, `auth.js`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `usePlayerStore` (e.g. with `track()` and `.flush()`) actually correct?**
  _`usePlayerStore` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `semi`, `singleQuote` to the rest of the system?**
  _168 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `HealthTrackingTab.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.12418300653594772 - nodes in this community are weakly interconnected._
- **Should `KademTabs.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.1368421052631579 - nodes in this community are weakly interconnected._