# Graph Report - kadem-web  (2026-10-29)

## Corpus Check
- 284 files · ~338,313 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2971 nodes · 5517 edges · 168 communities (154 shown, 14 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 53 edges (avg confidence: 0.77)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b3cfa689`
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
- auth.js
- SubscriptionModal.vue
- dependencies
- devDependencies
- HealthCheckinModal.vue
- TaskRelations.vue
- ProjectKanban.vue
- authView.vue
- TrackOptionsMenu.vue
- db.js
- PlaylistSidebar.vue
- useAppStore
- buildSvgCurvePath
- normalize
- VideoModal.vue
- StartMenu.vue
- MainInformations.vue
- financeService.js
- ProductivityWindow.vue
- NexoReceiptsTab.vue
- MacroCategoryCombo.vue
- main.js
- health.js
- biometricAuth.js
- SearchableDropdown.vue
- ReauthModal.vue
- findCategory
- NexoWealthDashboard.vue
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
- MfaChallenge.vue
- NotificationTray.vue
- scripts
- kanban.js
- updateTransaction
- switchComponent.vue
- CustomDropdown.vue
- radioNormalizationIntegration.test.js
- HealthRelationModal.vue
- HealthTrackerGroupModal.vue
- HealthTrackerModal.vue
- apiErrorMessage
- financeRepository.js
- package.json
- PipManager.vue
- homeView.vue
- MediaSessionManager
- exclude
- PrivacySettings.vue
- .prettierrc.json
- healthObjectTypes.js
- README.md
- snapshot_task
- HealthObjectsTab.vue
- logoutView.vue
- Como configurar o Background do Modo Escuro no Kadem
- NexoPhysicalWealthTab.vue
- SideModal.vue
- NexoMonthPicker.vue
- AGENTS.md
- HealthTrackingInsights.vue
- radioInsights.test.js
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
- db
- modalHistory.js
- close_options
- receipts.test.js
- select_playlist
- Configuration.vue
- dateWidget.vue
- deleteInvestmentGoal
- GlobalPlayerHost.vue
- TotpSetupModal.vue
- ProjectWorkspaceTab.vue
- authSession.js
- ProjectsWindow.vue
- finish_task_drag_preview
- RadioListeningTracker
- close_comment_menu
- financeSync.test.js
- buildCsvExactKey
- RecoveryEmailModal.vue
- NexoCreditTab.vue
- upload_attachment_file
- genosPairing.test.js
- expandWrappedCsvRow
- healthInsights.js
- animate_filter_change
- cancel_create_task
- moneyInput
- HealthTrackingOverview.vue
- ProjectStatusDropdown.vue
- calculate_dropdown_position
- download_attachment
- clear_pasted_attachment
- openConfirmation
- close_assignee_menu
- close_playlist_filter
- ImageCropperModal.vue
- useWindowStore
- TrackReaction.vue
- fetch_search_results
- goalCurrentAmount
- activeInvestmentTab
- createGoalForm
- @fortawesome/free-solid-svg-icons
- markdown-it
- usePlayerStore
- vue-router

## God Nodes (most connected - your core abstractions)
1. `useAuthStore` - 67 edges
2. `useAppStore` - 36 edges
3. `usePlayerStore` - 33 edges
4. `db` - 30 edges
5. `api` - 28 edges
6. `captureSyncSession()` - 28 edges
7. `apiErrorMessage()` - 27 edges
8. `useVaultStore` - 26 edges
9. `run()` - 23 edges
10. `useUtilsStore` - 22 edges

## Surprising Connections (you probably didn't know these)
- `useProjectStore` --indirect_call--> `local_id()`  [INFERRED]
  src/stores/projects.js → tests/uiPerformance.test.js
- `makeStore()` --indirect_call--> `selectivePersistence()`  [INFERRED]
  tests/uiPerformance.test.js → src/plugins/selectivePersistence.js
- `harness()` --indirect_call--> `value()`  [INFERRED]
  tests/biometricAuth.test.js → src/components/finance/nexo/NexoMonthPicker.vue
- `debounce()` --indirect_call--> `context()`  [INFERRED]
  src/stores/player.js → tests/genosPairing.test.js
- `handleWindowClick()` --calls--> `useWindowStore`  [EXTRACTED]
  src/components/headerSystem.vue → src/stores/windows.js

## Import Cycles
- 3-file cycle: `src/services/syncService.js -> src/stores/auth.js -> src/stores/vault.js -> src/services/syncService.js`
- 3-file cycle: `src/services/syncService.js -> src/stores/auth.js -> src/stores/radioInsights.js -> src/services/syncService.js`
- 3-file cycle: `src/services/syncService.js -> src/stores/radio.js -> src/stores/radioInsights.js -> src/services/syncService.js`
- 3-file cycle: `src/services/syncService.js -> src/stores/auth.js -> src/stores/health.js -> src/services/syncService.js`
- 3-file cycle: `src/services/syncService.js -> src/stores/auth.js -> src/stores/player.js -> src/services/syncService.js`
- 3-file cycle: `src/router/index.js -> src/views/InviteLanding.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/router/index.js -> src/views/homeView.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/router/index.js -> src/views/resetPasswordView.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/router/index.js -> src/views/authView.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/router/index.js -> src/views/logoutView.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/plugins/api.js -> src/stores/projects.js -> src/stores/utils.js -> src/plugins/api.js`
- 4-file cycle: `src/services/syncService.js -> src/stores/auth.js -> src/stores/radio.js -> src/stores/radioInsights.js -> src/services/syncService.js`
- 4-file cycle: `src/components/headerSystem.vue -> src/stores/auth.js -> src/router/index.js -> src/views/homeView.vue -> src/components/headerSystem.vue`
- 5-file cycle: `src/router/index.js -> src/views/authView.vue -> src/stores/vault.js -> src/services/syncService.js -> src/stores/auth.js -> src/router/index.js`
- 5-file cycle: `src/router/index.js -> src/views/homeView.vue -> src/stores/vault.js -> src/services/syncService.js -> src/stores/auth.js -> src/router/index.js`
- 5-file cycle: `src/services/syncService.js -> src/stores/auth.js -> src/stores/player.js -> src/stores/radio.js -> src/stores/radioInsights.js -> src/services/syncService.js`
- 5-file cycle: `src/components/headerSystem.vue -> src/components/startMenu/StartMenu.vue -> src/stores/auth.js -> src/router/index.js -> src/views/homeView.vue -> src/components/headerSystem.vue`
- 5-file cycle: `src/components/SubscriptionModal.vue -> src/stores/auth.js -> src/router/index.js -> src/views/homeView.vue -> src/components/headerSystem.vue -> src/components/SubscriptionModal.vue`
- 5-file cycle: `src/components/headerSystem.vue -> src/stores/aiCredits.js -> src/stores/auth.js -> src/router/index.js -> src/views/homeView.vue -> src/components/headerSystem.vue`

## Communities (168 total, 14 thin omitted)

### Community 0 - "HealthTrackingTab.vue"
Cohesion: 0.12
Nodes (4): selectedSummary(), latestValueDisplay(), recentCount(), trackerSummary()

### Community 1 - "KademTabs.vue"
Cohesion: 0.14
Nodes (6): checkScrollability(), currentTabId(), handler(), initResizeObserver(), mounted(), scrollToActiveTab()

### Community 2 - "KademNexo.vue"
Cohesion: 0.04
Nodes (36): appendBudgetAiMessage(), budgetAiStorageKey(), budgetGroupHeaderStyle(), budgetGroupStyle(), calendarDateParts(), categoryTargetMacro(), confirmCsvImport(), countCsvDelimiters() (+28 more)

### Community 4 - "RadioFlow.vue"
Cohesion: 0.06
Nodes (6): beforeUnmount(), format_bytes(), is_player_lifted(), observe_lifted_player(), release_lifted_player(), upload_usage_label()

### Community 5 - "CategoryCombo.vue"
Cohesion: 0.05
Nodes (15): close(), filteredCategories(), handleOutsideClick(), handleViewportChange(), normalize(), open(), requestCreate(), sameId() (+7 more)

### Community 6 - "HealthWindow.vue"
Cohesion: 0.04
Nodes (19): activeTab(), cancelArchiveTracker(), cancelDeleteEvent(), cancelDeleteObject(), cancelDeleteTrackerGroup(), confirmArchiveTracker(), confirmDeleteEvent(), confirmDeleteObject() (+11 more)

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
Cohesion: 0.12
Nodes (26): finishAttachmentUpload(), reportAttachmentUpload(), medalRepository, occupationRepository, isRadioInsightsTask(), LISTENING_COUNTERS, userRepository, buildChangesArray() (+18 more)

### Community 14 - "AccountCenter.vue"
Cohesion: 0.14
Nodes (7): "auth.user.email"(), handleBiometricUnlock(), handleCloseModal(), handleSaveNewAccount(), mounted(), refreshVaultBiometricStatus(), toggleVaultBiometrics()

### Community 15 - "TrackList.vue"
Cohesion: 0.07
Nodes (13): create_fallback_thumb(), handle_add_queue(), handle_desktop_dbl_click(), handle_download_lyrics(), handle_row_click(), is_track_unavailable(), mounted(), on_drag_start() (+5 more)

### Community 16 - "PlaylistHeader.vue"
Cohesion: 0.07
Nodes (6): close_download_menu(), closeMenu(), format_total_duration_verbose(), toggle_download_menu(), toggle_options_menu(), total_duration_formatted()

### Community 17 - "BaseModal.vue"
Cohesion: 0.16
Nodes (15): beforeUnmount(), close(), destroyObservers(), handleKeydown(), handleMediaLoad(), handleMobileBack(), handler(), handleResize() (+7 more)

### Community 18 - "TaskDetailForm.vue"
Cohesion: 0.06
Nodes (3): cancel_edit_comment(), save_edit_comment(), attachmentUploads

### Community 19 - "headerSystem.vue"
Cohesion: 0.10
Nodes (15): ai_credits_remaining(), ai_credits_total(), ai_credits_used(), closeAllPopups(), closeContextMenu(), handleMenuClick(), handler(), handleWindowClick() (+7 more)

### Community 20 - "reloadAll"
Cohesion: 0.14
Nodes (26): closeDeleteConfirm(), confirmDeleteAction(), deleteInvestmentEvent(), loadBudgets(), loadCategories(), loadCreditCards(), loadDashboard(), loadInvestmentRates() (+18 more)

### Community 21 - "auth.js"
Cohesion: 0.10
Nodes (33): setup(), setup(), api, check_system_health(), CSRF_EXEMPT_PATHS, ensureCsrfToken(), getCookie(), isCsrfExempt() (+25 more)

### Community 22 - "SubscriptionModal.vue"
Cohesion: 0.06
Nodes (9): sanitize(), sanitizedMessage(), setup(), check_cpf(), go_to_checkout(), handle_checkout(), request_cancel(), requestClose() (+1 more)

### Community 23 - "dependencies"
Cohesion: 0.06
Nodes (31): axios, dexie, @fortawesome/fontawesome-svg-core, @fortawesome/vue-fontawesome, lodash.isequal, markdown-it-task-lists, moment, dependencies (+23 more)

### Community 24 - "devDependencies"
Cohesion: 0.06
Nodes (31): eslint, @eslint/js, eslint-plugin-oxlint, eslint-plugin-vue, fake-indexeddb, globals, npm-run-all2, oxlint (+23 more)

### Community 25 - "HealthCheckinModal.vue"
Cohesion: 0.10
Nodes (10): clearAll(), clearField(), filledCount(), hasValue(), localDateTime(), parsedTags(), removeTag(), reset() (+2 more)

### Community 27 - "TaskRelations.vue"
Cohesion: 0.05
Nodes (12): completed_child_count(), has_markdown(), candidates(), completedChildrenCount(), isTaskDone(), toggleChildCompletion(), rendered_content(), hasMarkdown() (+4 more)

### Community 28 - "ProjectKanban.vue"
Cohesion: 0.08
Nodes (6): beforeUnmount(), close_confirmation(), handle_confirm_delete(), handler(), load_board(), on_column_drag_end()

### Community 29 - "authView.vue"
Cohesion: 0.08
Nodes (29): repairStorage(), repairLocalEnvironment(), biometricDeclinedKey(), rememberedEmailKey, afterLogin(), auth(), checkBiometricSupport(), checkPasswordStrength() (+21 more)

### Community 30 - "TrackOptionsMenu.vue"
Cohesion: 0.09
Nodes (8): beforeUnmount(), cancel_close(), close_on_hover(), open(), open_on_hover(), position_panel(), supports_hover(), toggle_on_touch()

### Community 31 - "db.js"
Cohesion: 0.13
Nodes (23): canUseBrowserStorage(), clearLocalDbIssue(), createIssuePayload(), createLocalDbUnavailableError(), emitLocalDbIssue(), ensureDbOpen(), getErrorNameChain(), initializeLocalDb() (+15 more)

### Community 32 - "PlaylistSidebar.vue"
Cohesion: 0.13
Nodes (4): skeleton_style(), to_css_size(), loadingContinuity, APP_NAMES

### Community 33 - "useAppStore"
Cohesion: 0.12
Nodes (14): created(), handle_save_task(), open_related_task(), setup(), setTheme(), toggleTheme(), consumeLocalDbIssue(), onLocalDbIssue() (+6 more)

### Community 34 - "buildSvgCurvePath"
Cohesion: 0.40
Nodes (5): buildSvgCurvePath(), calcCurveInterest(), calcCurveInvested(), calcCurveTotal(), projectionCurvePath()

### Community 35 - "normalize"
Cohesion: 0.12
Nodes (25): autoCategorize(), buildCsvObservation(), buildTransactionSearchText(), categoryTypeLabel(), cleanCsvCell(), displayInsights(), filteredCategories(), findCategoryByName() (+17 more)

### Community 36 - "VideoModal.vue"
Cohesion: 0.16
Nodes (14): beforeUnmount(), close_modal(), current_time(), exit_fullscreen_if_active(), handle_video_metadata(), is_playing(), load_video(), modelValue() (+6 more)

### Community 37 - "StartMenu.vue"
Cohesion: 0.15
Nodes (9): closeProjectView(), goToLogoutScreen(), handleLogoutClick(), mobile_back(), mounted(), openCreateProject(), openEditProject(), setActiveTab() (+1 more)

### Community 38 - "MainInformations.vue"
Cohesion: 0.12
Nodes (4): cancelAddOccupation(), handleAddNewOccupation(), handleSaveBio(), toggleBioEdit()

### Community 39 - "financeService.js"
Cohesion: 0.21
Nodes (14): entityMatchesAnyServerId(), entityReferenceIds(), entityServerId(), findLocalMacro(), isServerId(), localDashboard(), pendingDeleteServerIds(), preparePendingMacroUpdate() (+6 more)

### Community 41 - "NexoReceiptsTab.vue"
Cohesion: 0.05
Nodes (59): active(), addDocuments(), archive(), assignProduct(), beforeUnmount(), captureReference(), changeView(), chooseProduct() (+51 more)

### Community 43 - "MacroCategoryCombo.vue"
Cohesion: 0.18
Nodes (11): close(), createValue(), filteredMacros(), handleOutsideClick(), handleViewportChange(), normalize(), open(), select() (+3 more)

### Community 44 - "main.js"
Cohesion: 0.12
Nodes (13): frames, vAnimateHeight, app, pinia, utils_store, router, routes, api (+5 more)

### Community 45 - "health.js"
Cohesion: 0.23
Nodes (12): DIGESTIVE_WELLBEING_TEMPLATE, addInterval(), controlFields, DEFAULT_HEALTH_UNITS, DEFAULT_TRACKER_GROUPS, HEALTH_RECORD_TYPES, localKey(), now() (+4 more)

### Community 47 - "biometricAuth.js"
Cohesion: 0.28
Nodes (14): usePasskey(), authenticateVaultWithBiometrics(), authenticateVaultWithLocalBiometrics(), authenticateWithBiometrics(), bufferToBase64Url(), credentialForVerification(), getBiometricStatus(), getWebAuthn() (+6 more)

### Community 48 - "SearchableDropdown.vue"
Cohesion: 0.13
Nodes (7): calculate_position(), close(), handle_click_outside(), mobile_back(), open(), select_option(), toggle()

### Community 49 - "ReauthModal.vue"
Cohesion: 0.11
Nodes (11): mounted(), cancel(), clear(), handler(), METHOD_ORDER, onModelUpdate(), prepare(), sendEmail() (+3 more)

### Community 50 - "findCategory"
Cohesion: 0.11
Nodes (23): addBudgetGroup(), addBudgetItem(), availableCategoriesForMacro(), budgetSummary(), categoriesForMacro(), categoryKey(), closeTransactionForm(), filteredTransactions() (+15 more)

### Community 51 - "NexoWealthDashboard.vue"
Cohesion: 0.08
Nodes (6): calcPercent(), calcPercentNum(), emptyTotals, expenseFlow(), flowSlices(), incomeFlow()

### Community 52 - "mobileNavigation.js"
Cohesion: 0.10
Nodes (7): close(), mobile_back(), mobileNavigationMixin, windowNavigationKey, overlayScopeMixin, browserHistory(), settled()

### Community 53 - "AudioSettingsPanel.vue"
Cohesion: 0.05
Nodes (19): reset_band(), update_band(), AUDIO_BANDS, audio_headroom_db(), AUDIO_PRESETS, bounded(), default_audio_settings(), sanitize_audio_settings() (+11 more)

### Community 54 - "HealthActionModal.vue"
Cohesion: 0.20
Nodes (3): localDateTime(), resetForm(), visible()

### Community 55 - "BaseWindow.vue"
Cohesion: 0.13
Nodes (13): provide(), data(), focus(), minimize(), mobile_back(), provide(), reload_content(), startDrag() (+5 more)

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
Nodes (27): canPlay(), connected, currentYear, dateInputValue, dislikedCount, emptyStateIcon, emptyStateSubtitle, emptyStateTitle (+19 more)

### Community 60 - "kanbanBoard.test.js"
Cohesion: 0.16
Nodes (6): createViteServer(), installMemoryStorage(), loadBoard(), stubRouter, withHierarchyBoard(), withProjectCreation()

### Community 61 - "NexoGenosPairing.vue"
Cohesion: 0.29
Nodes (8): beforeUnmount(), copy(), generate(), handler(), loadAccess(), reset(), tick(), userId()

### Community 62 - "MfaChallenge.vue"
Cohesion: 0.08
Nodes (16): codeComplete(), METHOD_DESCRIPTIONS, METHOD_ICONS, METHOD_ORDER, sendEmail(), startCooldown(), submit(), onInput() (+8 more)

### Community 63 - "NotificationTray.vue"
Cohesion: 0.14
Nodes (5): handleContextMenuAction(), isTrayOpen(), mounted(), openPrivacySettings(), updatePosition()

### Community 64 - "scripts"
Cohesion: 0.11
Nodes (19): scripts, build, dev, format, lint, lint:eslint, lint:oxlint, preview (+11 more)

### Community 65 - "kanban.js"
Cohesion: 0.23
Nodes (8): kanbanRepository, pendingPulls, useKanbanStore, loadKanbanSyncs(), normalizeKanbanSyncs(), DEFAULT_COLUMN_TYPE, isColumnType(), normalizeColumn()

### Community 66 - "updateTransaction"
Cohesion: 0.18
Nodes (17): applyPendingCategorySelection(), applyTransactionPatch(), deleteTransaction(), enrichTransactionForList(), openConfirmation(), removeTransactionFromList(), requestDeleteTransaction(), resolveSavedCategory() (+9 more)

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

### Community 73 - "apiErrorMessage"
Cohesion: 0.08
Nodes (16): disconnectOthers(), guard(), RTF, runAction(), untrust(), add(), deviceName(), remove() (+8 more)

### Community 74 - "financeRepository.js"
Cohesion: 0.17
Nodes (9): financeRepository, INVESTMENT_FLOW, isServerId(), normalizeCategoryMacroReferences(), normalizeFinanceText(), now(), sameCategorySignature(), sameFinanceId() (+1 more)

### Community 75 - "package.json"
Cohesion: 0.29
Nodes (6): engines, node, name, private, type, version

### Community 76 - "PipManager.vue"
Cohesion: 0.15
Nodes (17): current_music(), current_time(), draw_canvas_content(), draw_image_cover(), draw_pause_icon(), draw_play_icon(), draw_round_rect(), fill_text_with_ellipsis() (+9 more)

### Community 77 - "homeView.vue"
Cohesion: 0.06
Nodes (14): handleGenerateRecovery(), handleMigration(), handleRescue(), data(), accountsRepository, base64ToBuffer(), bufferToBase64(), decoder (+6 more)

### Community 79 - "exclude"
Cohesion: 0.33
Nodes (5): compilerOptions, paths, exclude, dist, node_modules

### Community 80 - "PrivacySettings.vue"
Cohesion: 0.23
Nodes (8): activate(), deactivate(), handler(), load(), online(), save(), showMessage(), useNotificationStore

### Community 81 - ".prettierrc.json"
Cohesion: 0.40
Nodes (4): printWidth, $schema, semi, singleQuote

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
Cohesion: 0.16
Nodes (6): objectBadgeClass(), objectCardClass(), openEditObjectModal(), submitObject(), isHealthRoutine(), isHealthStockObject()

### Community 87 - "logoutView.vue"
Cohesion: 0.38
Nodes (4): beforeUnmount(), cleanupTimers(), mounted(), startLogoutSequence()

### Community 89 - "NexoPhysicalWealthTab.vue"
Cohesion: 0.07
Nodes (29): afterWrite(), applyReportFilter(), bankQueryKey(), changeSection(), findBank(), handler(), kinds, loadDashboardHistory() (+21 more)

### Community 90 - "SideModal.vue"
Cohesion: 0.19
Nodes (14): can_paste_attachment(), beforeUnmount(), checkMobile(), close(), destroyObservers(), handleKeydown(), handleWindowResize(), initObservers() (+6 more)

### Community 91 - "NexoMonthPicker.vue"
Cohesion: 0.08
Nodes (25): canShiftView(), data(), pickMonth(), selectedYear(), shiftView(), canStep(), close(), closeAndFocus() (+17 more)

### Community 96 - "radioInsights.test.js"
Cohesion: 0.25
Nodes (3): compactSong(), fixture(), song

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
Cohesion: 0.13
Nodes (13): visible(), shouldShowPaymentOrigin(), sourceLabel(), timeLabel(), editedTransactionDate(), genosDescriptionParts(), genosMethodLabels, isAbsoluteFinanceDate() (+5 more)

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
Cohesion: 0.19
Nodes (8): "form.object_type"(), localDateTime(), resetForm(), visible(), frequencyLabel(), openNewObjectModal(), isHealthRecurring(), isHealthScheduled()

### Community 105 - "ProjectDropdown.vue"
Cohesion: 0.18
Nodes (3): closeDropdown(), handleSelectProject(), mounted()

### Community 109 - "MfaSection.vue"
Cohesion: 0.13
Nodes (4): disable(), regenerate(), removeRecoveryEmail(), run()

### Community 110 - "global.js"
Cohesion: 0.27
Nodes (4): beginGlobalDrag(), endGlobalDrag(), resetGlobalDrag(), setGlobalDragging()

### Community 111 - "is_attachment_deleting"
Cohesion: 0.33
Nodes (6): attachment_icon(), attachment_status_label(), get_attachment_kind(), is_attachment_deleting(), open_attachment(), remove_attachment()

### Community 112 - "db"
Cohesion: 0.11
Nodes (24): db, runDbOperation(), BACKGROUND_TAG, backgroundPull(), replaceServerItemsPreservingPending(), healthRepository, receiptRepository, syncQueueRepository (+16 more)

### Community 113 - "modalHistory.js"
Cohesion: 0.32
Nodes (11): currentUrl(), handlePopState(), modalStack, navigateBack(), navigationStack, needsHistory(), register(), registerNavigation() (+3 more)

### Community 114 - "close_options"
Cohesion: 0.25
Nodes (8): close_options(), close_search(), emit_delete_request(), handle_click_outside_search(), open_type_config(), show_new_task_form(), start_rename(), toggle_search()

### Community 116 - "receipts.test.js"
Cohesion: 0.21
Nodes (8): dropColumn(), orderedColumns(), shiftColumn(), sortedRows(), moveReceiptColumn(), orderedReceiptColumns(), sortReceiptRows(), router

### Community 117 - "select_playlist"
Cohesion: 0.18
Nodes (13): close_search(), get_liked_tracks(), handle_create_playlist(), handle_delete_playlist(), handle_mobile_select_playlist(), handle_select_liked_playlist(), handler(), load_data() (+5 more)

### Community 118 - "Configuration.vue"
Cohesion: 0.40
Nodes (7): handlePwaInstall(), mounted(), getPwaInstallUnavailableMessage(), isIOSDevice(), isPwaInstalled(), isStandalone(), requestPwaInstall()

### Community 121 - "deleteInvestmentGoal"
Cohesion: 0.38
Nodes (7): deleteInvestmentGoal(), investmentGoalKey(), investmentGoalMatches(), removeInvestmentGoalFromList(), requestDeleteInvestmentGoal(), saveInvestmentGoal(), upsertInvestmentGoalInList()

### Community 122 - "GlobalPlayerHost.vue"
Cohesion: 0.47
Nodes (3): create_yt_player(), init_youtube_api(), mounted()

### Community 123 - "TotpSetupModal.vue"
Cohesion: 0.31
Nodes (7): submit(), cancel(), confirm(), modelValue(), reset(), start(), apiErrorCode()

### Community 124 - "ProjectWorkspaceTab.vue"
Cohesion: 0.14
Nodes (3): resetKey(), retry(), overlayScopeKey

### Community 125 - "authSession.js"
Cohesion: 0.36
Nodes (9): canUseLocalStorage(), clearSessionRefresh(), getLastSessionRefresh(), getSessionRefreshRemainingMs(), hasValidSessionRefresh(), markSessionRefreshed(), restoreSessionRefreshFromTimestamp(), SESSION_MAX_AGE_MS (+1 more)

### Community 126 - "ProjectsWindow.vue"
Cohesion: 0.12
Nodes (20): check_teleport_target(), close_tab(), close_tab_context_menu(), focus_active_tab(), focus_workspace_window(), handle_duplicate_tab(), handle_open_tab(), handle_tab_click() (+12 more)

### Community 128 - "finish_task_drag_preview"
Cohesion: 0.53
Nodes (6): cancel_task_drag_preview_cleanup(), finish_task_drag_preview(), measure_natural_column_height(), restore_task_drag_preview(), schedule_task_drag_preview_cleanup(), update_task_drag_preview()

### Community 129 - "RadioListeningTracker"
Cohesion: 0.36
Nodes (4): mounted(), mounted(), mounted(), RadioListeningTracker

### Community 130 - "close_comment_menu"
Cohesion: 0.50
Nodes (4): close_comment_menu(), delete_comment(), edit_comment(), handle_global_click()

### Community 131 - "financeSync.test.js"
Cohesion: 0.29
Nodes (3): installMemoryStorage(), loadOfflineFinance(), stubRouter

### Community 132 - "buildCsvExactKey"
Cohesion: 0.31
Nodes (10): buildCsvExactKey(), buildCsvLegacyKey(), buildTransactionCandidateMaps(), consumeCandidate(), csvAmountKey(), csvDateOnly(), csvHasMeaningfulTime(), filterCsvDuplicates() (+2 more)

### Community 133 - "RecoveryEmailModal.vue"
Cohesion: 0.25
Nodes (6): cancel(), confirm(), modelValue(), reset(), sendCode(), startCooldown()

### Community 134 - "NexoCreditTab.vue"
Cohesion: 0.09
Nodes (12): cardFilterOptions(), labelFor(), cardName(), options(), paymentMethods(), financeService, cardLabel(), CASH_PAYMENT_METHODS (+4 more)

### Community 135 - "upload_attachment_file"
Cohesion: 0.33
Nodes (6): confirm_pasted_attachment(), handle_attachment_selected(), refresh_attachment_row(), upload_attachment_file(), uploading_attachment_ids(), upsert_attachment_row()

### Community 137 - "expandWrappedCsvRow"
Cohesion: 0.83
Nodes (4): expandWrappedCsvRow(), isWrappedCsvRow(), normalizeParsedCsvRows(), splitCsvLine()

### Community 138 - "healthInsights.js"
Cohesion: 0.35
Nodes (9): patterns(), checkinsInPeriod(), comparePattern(), findPatterns(), hasValue(), observedOptions(), trackerSeries(), checkins (+1 more)

### Community 139 - "animate_filter_change"
Cohesion: 0.25
Nodes (8): animate_filter_change(), animate_filter_task(), beforeUnmount(), cancel_filter_task_animations(), filter_values(), on_task_drag_end(), on_task_drag_start(), stop_tracking_task_drag()

### Community 140 - "cancel_create_task"
Cohesion: 1.00
Nodes (3): cancel_create_task(), handle_click_outside_creation(), handle_create_task()

### Community 141 - "moneyInput"
Cohesion: 0.22
Nodes (11): data(), localToday(), money(), moneyInput(), openTransactionForm(), parseMoneyInput(), signedMoney(), updateBudgetAmount() (+3 more)

### Community 142 - "HealthTrackingOverview.vue"
Cohesion: 0.24
Nodes (3): hasRecordedValue(), latestValue(), trackerSummaryData()

### Community 144 - "ProjectStatusDropdown.vue"
Cohesion: 0.29
Nodes (3): close_dropdown(), mounted(), select_status()

### Community 146 - "download_attachment"
Cohesion: 0.50
Nodes (4): download_attachment(), get_attachment_download_name(), is_attachment_downloading(), trigger_browser_download()

### Community 147 - "clear_pasted_attachment"
Cohesion: 0.50
Nodes (4): active_tab(), beforeUnmount(), clear_pasted_attachment(), close_attachment_preview()

### Community 148 - "openConfirmation"
Cohesion: 0.33
Nodes (7): delete_track(), execute_add_track(), handle_add_to_another_playlist(), handle_delete_track(), handle_upload_submit(), openConfirmation(), verify_and_add_track()

### Community 150 - "close_playlist_filter"
Cohesion: 0.40
Nodes (5): close_playlist_filter(), close_playlist_filter_on_escape(), close_playlist_filter_on_outside_click(), mobile_back(), toggle_playlist_filter()

### Community 151 - "ImageCropperModal.vue"
Cohesion: 0.15
Nodes (4): modelValue(), reset_state(), save_crop(), trigger_input()

### Community 152 - "useWindowStore"
Cohesion: 0.19
Nodes (8): beforeUnmount(), window_store(), useWindowStore, finite(), isStateMap(), normalizeWindowStates(), position(), size()

### Community 153 - "TrackReaction.vue"
Cohesion: 0.40
Nodes (4): currentVote, props, store, votes

### Community 154 - "fetch_search_results"
Cohesion: 0.50
Nodes (4): fetch_search_results(), handle_load_more(), perform_mobile_search(), perform_search()

### Community 155 - "goalCurrentAmount"
Cohesion: 0.40
Nodes (5): goalCurrentAmount(), goalProgress(), heroProgressPercent(), heroProgressText(), nearestGoal()

### Community 158 - "activeInvestmentTab"
Cohesion: 0.67
Nodes (3): activeInvestmentTab(), mounted(), updateChartDimensions()

### Community 161 - "createGoalForm"
Cohesion: 0.50
Nodes (4): createGoalForm(), data(), resetGoalForm(), submitGoal()

### Community 167 - "usePlayerStore"
Cohesion: 0.25
Nodes (8): activeTab(), changeYear(), onDateChange(), refresh(), setup(), data(), normalization_runtime(), usePlayerStore

## Knowledge Gaps
- **177 isolated node(s):** `$schema`, `semi`, `singleQuote`, `printWidth`, `paths` (+172 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAuthStore` connect `auth.js` to `KademNexo.vue`, `KanbanColumn.vue`, `HealthWindow.vue`, `NewProject.vue`, `resetPasswordView.vue`, `syncService.js`, `AccountCenter.vue`, `TrackList.vue`, `PlaylistHeader.vue`, `TaskDetailForm.vue`, `headerSystem.vue`, `SubscriptionModal.vue`, `ImageCropperModal.vue`, `useWindowStore`, `TaskRelations.vue`, `ProjectKanban.vue`, `authView.vue`, `useAppStore`, `StartMenu.vue`, `MainInformations.vue`, `usePlayerStore`, `NexoReceiptsTab.vue`, `health.js`, `ReauthModal.vue`, `NexoGenosPairing.vue`, `kanban.js`, `apiErrorMessage`, `homeView.vue`, `logoutView.vue`, `db`, `authSession.js`?**
  _High betweenness centrality (0.089) - this node is a cross-community bridge._
- **Why does `usePlayerStore` connect `usePlayerStore` to `RadioListeningTracker`, `KademNexo.vue`, `RadioFlow.vue`, `HealthWindow.vue`, `PlayerWrapper.vue`, `NexoInvestmentsTab.vue`, `moneyInput`, `TrackList.vue`, `auth.js`, `useWindowStore`, `activeInvestmentTab`, `PlaylistSidebar.vue`, `createGoalForm`, `VideoModal.vue`, `ProductivityWindow.vue`, `radioFlowWidget.vue`, `AudioSettingsPanel.vue`, `QueueSidebar.vue`, `RadioInsightsPanel.vue`, `LyricsModal.vue`, `GlobalPlayerHost.vue`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `useAppStore` connect `useAppStore` to `RadioFlow.vue`, `AccountCenter.vue`, `TaskDetailForm.vue`, `headerSystem.vue`, `auth.js`, `useWindowStore`, `ProjectKanban.vue`, `PlaylistSidebar.vue`, `StartMenu.vue`, `main.js`, `ProjectList.vue`, `mobileNavigation.js`, `BaseWindow.vue`, `QueueSidebar.vue`, `NotificationTray.vue`, `apiErrorMessage`, `homeView.vue`, `MfaSection.vue`, `Configuration.vue`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `usePlayerStore` (e.g. with `track()` and `.flush()`) actually correct?**
  _`usePlayerStore` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `semi`, `singleQuote` to the rest of the system?**
  _177 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `HealthTrackingTab.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.12418300653594772 - nodes in this community are weakly interconnected._
- **Should `KademTabs.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.1368421052631579 - nodes in this community are weakly interconnected._