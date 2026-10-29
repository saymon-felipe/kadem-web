# Graph Report - kadem-web  (2026-10-28)

## Corpus Check
- 275 files · ~329,666 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2935 nodes · 5419 edges · 174 communities (154 shown, 20 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 52 edges (avg confidence: 0.77)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9f16436b`
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
- resetPasswordView.vue
- syncService.js
- AccountCenter.vue
- TrackList.vue
- PlaylistHeader.vue
- BaseModal.vue
- TaskDetailForm.vue
- headerSystem.vue
- reloadAll
- api.js
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
- uiPerformance.test.js
- .prettierrc.json
- PasskeysSection.vue
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
- useAuthStore
- modalHistory.js
- receipts.test.js
- select_playlist
- Configuration.vue
- alexaAuthView.vue
- Context
- deleteInvestmentGoal
- start_ticker
- securityService.js
- ProjectWorkspaceTab.vue
- auth.js
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
- findMacroByName
- healthInsights.js
- animate_filter_change
- cancel_create_task
- moneyInput
- HealthTrackingOverview.vue
- ProjectStatusDropdown.vue
- set_volume
- download_attachment
- clear_pasted_attachment
- openConfirmation
- release_lifted_player
- close_playlist_filter
- ImageCropperModal.vue
- useWindowStore
- TrackReaction.vue
- fetch_search_results
- goalCurrentAmount
- Media
- activeInvestmentTab
- cycle_reaction
- createGoalForm
- format_seconds_to_time
- @fortawesome/free-solid-svg-icons
- markdown-it
- usePlayerStore
- vue-router
- handle_pip_play_toggle
- on_seek_change
- save_audio_settings

## God Nodes (most connected - your core abstractions)
1. `useAuthStore` - 67 edges
2. `useAppStore` - 33 edges
3. `usePlayerStore` - 33 edges
4. `api` - 28 edges
5. `apiErrorMessage()` - 27 edges
6. `captureSyncSession()` - 27 edges
7. `db` - 26 edges
8. `useVaultStore` - 26 edges
9. `run()` - 23 edges
10. `useUtilsStore` - 20 edges

## Surprising Connections (you probably didn't know these)
- `useProjectStore` --indirect_call--> `local_id()`  [INFERRED]
  src/stores/projects.js → tests/uiPerformance.test.js
- `makeStore()` --indirect_call--> `selectivePersistence()`  [INFERRED]
  tests/uiPerformance.test.js → src/plugins/selectivePersistence.js
- `harness()` --indirect_call--> `value()`  [INFERRED]
  tests/biometricAuth.test.js → src/components/finance/nexo/NexoMonthPicker.vue
- `debounce()` --indirect_call--> `context()`  [INFERRED]
  src/stores/player.js → tests/genosPairing.test.js
- `runComparison()` --calls--> `comparePattern()`  [EXTRACTED]
  src/components/health/HealthTrackingInsights.vue → src/services/healthInsights.js

## Import Cycles
- 3-file cycle: `src/router/index.js -> src/views/resetPasswordView.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/router/index.js -> src/views/homeView.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/services/syncService.js -> src/stores/auth.js -> src/stores/player.js -> src/services/syncService.js`
- 3-file cycle: `src/services/syncService.js -> src/stores/auth.js -> src/stores/health.js -> src/services/syncService.js`
- 3-file cycle: `src/services/syncService.js -> src/stores/auth.js -> src/stores/radioInsights.js -> src/services/syncService.js`
- 3-file cycle: `src/services/syncService.js -> src/stores/auth.js -> src/stores/vault.js -> src/services/syncService.js`
- 3-file cycle: `src/services/syncService.js -> src/stores/radio.js -> src/stores/radioInsights.js -> src/services/syncService.js`
- 3-file cycle: `src/router/index.js -> src/views/authView.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/router/index.js -> src/views/InviteLanding.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/router/index.js -> src/views/logoutView.vue -> src/stores/auth.js -> src/router/index.js`
- 3-file cycle: `src/plugins/api.js -> src/stores/projects.js -> src/stores/utils.js -> src/plugins/api.js`
- 4-file cycle: `src/components/headerSystem.vue -> src/stores/auth.js -> src/router/index.js -> src/views/homeView.vue -> src/components/headerSystem.vue`
- 4-file cycle: `src/services/syncService.js -> src/stores/auth.js -> src/stores/radio.js -> src/stores/radioInsights.js -> src/services/syncService.js`
- 5-file cycle: `src/components/headerSystem.vue -> src/stores/aiCredits.js -> src/stores/auth.js -> src/router/index.js -> src/views/homeView.vue -> src/components/headerSystem.vue`
- 5-file cycle: `src/components/SubscriptionModal.vue -> src/stores/auth.js -> src/router/index.js -> src/views/homeView.vue -> src/components/headerSystem.vue -> src/components/SubscriptionModal.vue`
- 5-file cycle: `src/components/headerSystem.vue -> src/components/startMenu/StartMenu.vue -> src/stores/auth.js -> src/router/index.js -> src/views/homeView.vue -> src/components/headerSystem.vue`
- 5-file cycle: `src/router/index.js -> src/views/homeView.vue -> src/stores/vault.js -> src/services/syncService.js -> src/stores/auth.js -> src/router/index.js`
- 5-file cycle: `src/services/syncService.js -> src/stores/auth.js -> src/stores/player.js -> src/stores/radio.js -> src/stores/radioInsights.js -> src/services/syncService.js`
- 5-file cycle: `src/router/index.js -> src/views/authView.vue -> src/stores/vault.js -> src/services/syncService.js -> src/stores/auth.js -> src/router/index.js`

## Communities (174 total, 20 thin omitted)

### Community 0 - "HealthTrackingTab.vue"
Cohesion: 0.12
Nodes (4): selectedSummary(), latestValueDisplay(), recentCount(), trackerSummary()

### Community 1 - "KademTabs.vue"
Cohesion: 0.14
Nodes (6): checkScrollability(), currentTabId(), handler(), initResizeObserver(), mounted(), scrollToActiveTab()

### Community 2 - "KademNexo.vue"
Cohesion: 0.04
Nodes (32): appendBudgetAiMessage(), availableCategoriesForMacro(), budgetAiStorageKey(), budgetGroupHeaderStyle(), budgetGroupStyle(), calendarDateParts(), categoriesForMacro(), categoryTypeLabel() (+24 more)

### Community 3 - "KanbanColumn.vue"
Cohesion: 0.05
Nodes (12): calculate_dropdown_position(), close_assignee_menu(), close_options(), close_search(), emit_delete_request(), handle_click_outside_search(), open_type_config(), select_assignee() (+4 more)

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
Cohesion: 0.09
Nodes (4): bring_lyrics_to_front(), bring_video_to_front(), toggle_lyrics(), toggle_video()

### Community 12 - "resetPasswordView.vue"
Cohesion: 0.18
Nodes (9): backToPassword(), continueToSessions(), endsCurrentSession(), mounted(), passwordError(), resetResponse(), setResponse(), submitReset() (+1 more)

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
Nodes (14): beforeUnmount(), close(), destroyObservers(), handleMediaLoad(), handleMobileBack(), handler(), handleResize(), handleTouchEnd() (+6 more)

### Community 19 - "headerSystem.vue"
Cohesion: 0.09
Nodes (14): ai_credits_remaining(), ai_credits_total(), ai_credits_used(), closeAllPopups(), closeContextMenu(), handleMenuClick(), handler(), mobile_back() (+6 more)

### Community 20 - "reloadAll"
Cohesion: 0.10
Nodes (32): closeDeleteConfirm(), confirmCsvImport(), confirmDeleteAction(), deleteConnection(), deleteInvestmentEvent(), loadBudgets(), loadCategories(), loadConnections() (+24 more)

### Community 21 - "api.js"
Cohesion: 0.07
Nodes (30): handleGenerateRecovery(), handleMigration(), setup(), handleRescue(), data(), api, check_system_health(), CSRF_EXEMPT_PATHS (+22 more)

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
Cohesion: 0.09
Nodes (21): afterLogin(), checkPasswordStrength(), confirmBiometrics(), confirmTrust(), continueAfterLogin(), continueAfterMfaCheck(), declineBiometrics(), declineMfaSetup() (+13 more)

### Community 30 - "TrackOptionsMenu.vue"
Cohesion: 0.09
Nodes (8): beforeUnmount(), cancel_close(), close_on_hover(), open(), open_on_hover(), position_panel(), supports_hover(), toggle_on_touch()

### Community 31 - "db.js"
Cohesion: 0.10
Nodes (31): created(), repairStorage(), canUseBrowserStorage(), clearLocalDbIssue(), consumeLocalDbIssue(), createIssuePayload(), createLocalDbUnavailableError(), emitLocalDbIssue() (+23 more)

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
Cohesion: 0.15
Nodes (15): beforeUnmount(), close_modal(), current_time(), exit_fullscreen_if_active(), handle_video_metadata(), is_playing(), load_video(), modelValue() (+7 more)

### Community 37 - "StartMenu.vue"
Cohesion: 0.15
Nodes (8): closeProjectView(), goToLogoutScreen(), handleLogoutClick(), mobile_back(), openCreateProject(), openEditProject(), setActiveTab(), setActiveTabById()

### Community 38 - "MainInformations.vue"
Cohesion: 0.12
Nodes (4): cancelAddOccupation(), handleAddNewOccupation(), handleSaveBio(), toggleBioEdit()

### Community 39 - "financeService.js"
Cohesion: 0.24
Nodes (12): entityMatchesAnyServerId(), entityReferenceIds(), entityServerId(), findLocalMacro(), isServerId(), pendingDeleteServerIds(), preparePendingMacroUpdate(), removeDeletedCategoryReferencesFromQueue() (+4 more)

### Community 41 - "NexoReceiptsTab.vue"
Cohesion: 0.05
Nodes (55): active(), addDocuments(), archive(), assignProduct(), beforeUnmount(), captureReference(), changeView(), chooseProduct() (+47 more)

### Community 43 - "MacroCategoryCombo.vue"
Cohesion: 0.18
Nodes (11): close(), createValue(), filteredMacros(), handleOutsideClick(), handleViewportChange(), normalize(), open(), select() (+3 more)

### Community 44 - "main.js"
Cohesion: 0.22
Nodes (7): frames, vAnimateHeight, app, pinia, utils_store, router, routes

### Community 45 - "health.js"
Cohesion: 0.23
Nodes (12): DIGESTIVE_WELLBEING_TEMPLATE, addInterval(), controlFields, DEFAULT_HEALTH_UNITS, DEFAULT_TRACKER_GROUPS, HEALTH_RECORD_TYPES, localKey(), now() (+4 more)

### Community 47 - "biometricAuth.js"
Cohesion: 0.33
Nodes (12): authenticateVaultWithBiometrics(), authenticateVaultWithLocalBiometrics(), authenticateWithBiometrics(), bufferToBase64Url(), credentialForVerification(), getBiometricStatus(), getWebAuthn(), prepareVaultBiometricUnlock() (+4 more)

### Community 48 - "SearchableDropdown.vue"
Cohesion: 0.13
Nodes (7): calculate_position(), close(), handle_click_outside(), mobile_back(), open(), select_option(), toggle()

### Community 49 - "ReauthModal.vue"
Cohesion: 0.12
Nodes (9): cancel(), clear(), handler(), METHOD_ORDER, onModelUpdate(), prepare(), sendEmail(), startCooldown() (+1 more)

### Community 50 - "findCategory"
Cohesion: 0.09
Nodes (35): addBudgetGroup(), addBudgetItem(), applyPendingCategorySelection(), applyTransactionPatch(), budgetSummary(), buildTransactionSearchText(), categoryKey(), closeTransactionForm() (+27 more)

### Community 51 - "NexoWealthDashboard.vue"
Cohesion: 0.08
Nodes (6): calcPercent(), calcPercentNum(), emptyTotals, expenseFlow(), flowSlices(), incomeFlow()

### Community 52 - "mobileNavigation.js"
Cohesion: 0.10
Nodes (8): close(), mobile_back(), mobileNavigationMixin, windowNavigationKey, overlayScopeKey, overlayScopeMixin, browserHistory(), settled()

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
Cohesion: 0.15
Nodes (14): setup(), setup(), apiServices, PROFILE_VERSION, loudnessRepository, radioInsightsRepository, radioRepository, _handleDownloadLyricsTask() (+6 more)

### Community 64 - "scripts"
Cohesion: 0.11
Nodes (19): scripts, build, dev, format, lint, lint:eslint, lint:oxlint, preview (+11 more)

### Community 65 - "kanban.js"
Cohesion: 0.13
Nodes (14): db, runDbOperation(), healthRepository, kanbanRepository, projectRepository, LISTENING_COUNTERS, syncQueueRepository, pendingPulls (+6 more)

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
Cohesion: 0.12
Nodes (3): Node, Parameter, Worklet

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
Cohesion: 0.17
Nodes (9): financeRepository, INVESTMENT_FLOW, isServerId(), normalizeCategoryMacroReferences(), normalizeFinanceText(), now(), sameCategorySignature(), sameFinanceId() (+1 more)

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

### Community 80 - "uiPerformance.test.js"
Cohesion: 0.18
Nodes (3): selectivePersistence(), local_id(), makeStore()

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
Cohesion: 0.16
Nodes (6): objectBadgeClass(), objectCardClass(), openEditObjectModal(), submitObject(), isHealthRoutine(), isHealthStockObject()

### Community 87 - "logoutView.vue"
Cohesion: 0.38
Nodes (4): beforeUnmount(), cleanupTimers(), mounted(), startLogoutSequence()

### Community 89 - "NexoPhysicalWealthTab.vue"
Cohesion: 0.07
Nodes (29): afterWrite(), applyReportFilter(), bankQueryKey(), changeSection(), findBank(), handler(), kinds, loadDashboardHistory() (+21 more)

### Community 90 - "SideModal.vue"
Cohesion: 0.18
Nodes (15): handleKeydown(), can_paste_attachment(), beforeUnmount(), checkMobile(), close(), destroyObservers(), handleKeydown(), handleWindowResize() (+7 more)

### Community 91 - "NexoMonthPicker.vue"
Cohesion: 0.08
Nodes (25): canShiftView(), data(), pickMonth(), selectedYear(), shiftView(), canStep(), close(), closeAndFocus() (+17 more)

### Community 96 - "apiErrorMessage"
Cohesion: 0.20
Nodes (9): submit(), sendLink(), submit(), active(), loadDevices(), onDevicesChanged(), online(), reload() (+1 more)

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
Cohesion: 0.12
Nodes (15): openTransactionForm(), viewReceiptTransaction(), visible(), shouldShowPaymentOrigin(), sourceLabel(), timeLabel(), editedTransactionDate(), genosDescriptionParts() (+7 more)

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

### Community 109 - "MfaSection.vue"
Cohesion: 0.24
Nodes (4): disable(), regenerate(), removeRecoveryEmail(), run()

### Community 110 - "global.js"
Cohesion: 0.27
Nodes (4): beginGlobalDrag(), endGlobalDrag(), resetGlobalDrag(), setGlobalDragging()

### Community 111 - "is_attachment_deleting"
Cohesion: 0.33
Nodes (6): attachment_icon(), attachment_status_label(), get_attachment_kind(), is_attachment_deleting(), open_attachment(), remove_attachment()

### Community 112 - "useAuthStore"
Cohesion: 0.16
Nodes (13): replaceServerItemsPreservingPending(), receiptRepository, owner(), read(), write(), deleting, owner(), syncing (+5 more)

### Community 113 - "modalHistory.js"
Cohesion: 0.32
Nodes (11): currentUrl(), handlePopState(), modalStack, navigateBack(), navigationStack, needsHistory(), register(), registerNavigation() (+3 more)

### Community 116 - "receipts.test.js"
Cohesion: 0.17
Nodes (13): dropColumn(), orderedColumns(), shiftColumn(), sortedRows(), displayedReceiptItems(), moveReceiptColumn(), orderedReceiptColumns(), sortReceiptRows() (+5 more)

### Community 117 - "select_playlist"
Cohesion: 0.18
Nodes (13): close_search(), get_liked_tracks(), handle_create_playlist(), handle_delete_playlist(), handle_mobile_select_playlist(), handle_select_liked_playlist(), handler(), load_data() (+5 more)

### Community 118 - "Configuration.vue"
Cohesion: 0.40
Nodes (7): handlePwaInstall(), mounted(), getPwaInstallUnavailableMessage(), isIOSDevice(), isPwaInstalled(), isStandalone(), requestPwaInstall()

### Community 119 - "alexaAuthView.vue"
Cohesion: 0.22
Nodes (3): completeLink(), handleAlexaLogin(), onMfaVerified()

### Community 121 - "deleteInvestmentGoal"
Cohesion: 0.38
Nodes (7): deleteInvestmentGoal(), investmentGoalKey(), investmentGoalMatches(), removeInvestmentGoalFromList(), requestDeleteInvestmentGoal(), saveInvestmentGoal(), upsertInvestmentGoalInList()

### Community 122 - "start_ticker"
Cohesion: 0.29
Nodes (7): get_current_time(), get_duration(), handler(), load_lyrics_from_cache(), mounted(), start_ticker(), update_playback_position()

### Community 123 - "securityService.js"
Cohesion: 0.24
Nodes (8): cancel(), confirm(), modelValue(), reset(), start(), apiErrorCode(), mfaMethodLabels, securityService

### Community 125 - "auth.js"
Cohesion: 0.25
Nodes (13): canUseLocalStorage(), clearSessionRefresh(), getLastSessionRefresh(), getSessionRefreshRemainingMs(), hasValidSessionRefresh(), markSessionRefreshed(), restoreSessionRefreshFromTimestamp(), SESSION_MAX_AGE_MS (+5 more)

### Community 126 - "ProjectsWindow.vue"
Cohesion: 0.12
Nodes (20): check_teleport_target(), close_tab(), close_tab_context_menu(), focus_active_tab(), focus_workspace_window(), handle_duplicate_tab(), handle_open_tab(), handle_tab_click() (+12 more)

### Community 128 - "finish_task_drag_preview"
Cohesion: 0.53
Nodes (6): cancel_task_drag_preview_cleanup(), finish_task_drag_preview(), measure_natural_column_height(), restore_task_drag_preview(), schedule_task_drag_preview_cleanup(), update_task_drag_preview()

### Community 129 - "RadioListeningTracker"
Cohesion: 0.16
Nodes (8): mounted(), mounted(), mounted(), mounted(), RadioListeningTracker, compactSong(), fixture(), song

### Community 130 - "close_comment_menu"
Cohesion: 0.50
Nodes (4): close_comment_menu(), delete_comment(), edit_comment(), handle_global_click()

### Community 131 - "financeSync.test.js"
Cohesion: 0.22
Nodes (5): localDashboard(), creditSummary(), installMemoryStorage(), loadOfflineFinance(), stubRouter

### Community 132 - "buildCsvExactKey"
Cohesion: 0.31
Nodes (10): buildCsvExactKey(), buildCsvLegacyKey(), buildTransactionCandidateMaps(), consumeCandidate(), csvAmountKey(), csvDateOnly(), csvHasMeaningfulTime(), filterCsvDuplicates() (+2 more)

### Community 133 - "RecoveryEmailModal.vue"
Cohesion: 0.25
Nodes (6): cancel(), confirm(), modelValue(), reset(), sendCode(), startCooldown()

### Community 134 - "NexoCreditTab.vue"
Cohesion: 0.09
Nodes (11): cardFilterOptions(), labelFor(), cardName(), options(), paymentMethods(), cardLabel(), CASH_PAYMENT_METHODS, normalizePaymentOrigin() (+3 more)

### Community 135 - "upload_attachment_file"
Cohesion: 0.33
Nodes (6): confirm_pasted_attachment(), handle_attachment_selected(), refresh_attachment_row(), upload_attachment_file(), uploading_attachment_ids(), upsert_attachment_row()

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

### Community 141 - "moneyInput"
Cohesion: 0.22
Nodes (11): deleteTransaction(), money(), moneyInput(), openConfirmation(), parseMoneyInput(), removeTransactionFromList(), requestDeleteTransaction(), signedMoney() (+3 more)

### Community 142 - "HealthTrackingOverview.vue"
Cohesion: 0.24
Nodes (3): hasRecordedValue(), latestValue(), trackerSummaryData()

### Community 144 - "ProjectStatusDropdown.vue"
Cohesion: 0.29
Nodes (3): close_dropdown(), mounted(), select_status()

### Community 145 - "set_volume"
Cohesion: 0.50
Nodes (4): set_volume(), toggle_mute(), update_volume(), update_volume_from_external()

### Community 146 - "download_attachment"
Cohesion: 0.50
Nodes (4): download_attachment(), get_attachment_download_name(), is_attachment_downloading(), trigger_browser_download()

### Community 147 - "clear_pasted_attachment"
Cohesion: 0.50
Nodes (4): active_tab(), beforeUnmount(), clear_pasted_attachment(), close_attachment_preview()

### Community 148 - "openConfirmation"
Cohesion: 0.33
Nodes (7): delete_track(), execute_add_track(), handle_add_to_another_playlist(), handle_delete_track(), handle_upload_submit(), openConfirmation(), verify_and_add_track()

### Community 149 - "release_lifted_player"
Cohesion: 0.50
Nodes (4): beforeUnmount(), is_player_lifted(), observe_lifted_player(), release_lifted_player()

### Community 150 - "close_playlist_filter"
Cohesion: 0.40
Nodes (5): close_playlist_filter(), close_playlist_filter_on_escape(), close_playlist_filter_on_outside_click(), mobile_back(), toggle_playlist_filter()

### Community 151 - "ImageCropperModal.vue"
Cohesion: 0.15
Nodes (4): modelValue(), reset_state(), save_crop(), trigger_input()

### Community 152 - "useWindowStore"
Cohesion: 0.18
Nodes (9): handleWindowClick(), beforeUnmount(), window_store(), useWindowStore, finite(), isStateMap(), normalizeWindowStates(), position() (+1 more)

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

### Community 160 - "cycle_reaction"
Cohesion: 0.67
Nodes (3): cycle_reaction(), handle_player_dblclick(), handle_player_touchend()

### Community 161 - "createGoalForm"
Cohesion: 0.50
Nodes (4): createGoalForm(), data(), resetGoalForm(), submitGoal()

### Community 162 - "format_seconds_to_time"
Cohesion: 0.67
Nodes (3): format_seconds_to_time(), formatted_current_time(), formatted_duration()

### Community 167 - "usePlayerStore"
Cohesion: 0.27
Nodes (9): activeTab(), data(), player_store(), RADIO_FLOW_WINDOW, radio_store(), radioFlowApi, state_snapshot(), normalization_runtime() (+1 more)

## Knowledge Gaps
- **178 isolated node(s):** `$schema`, `semi`, `singleQuote`, `printWidth`, `paths` (+173 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAuthStore` connect `useAuthStore` to `KademNexo.vue`, `KanbanColumn.vue`, `HealthWindow.vue`, `NewProject.vue`, `resetPasswordView.vue`, `syncService.js`, `AccountCenter.vue`, `TrackList.vue`, `PlaylistHeader.vue`, `TaskDetailForm.vue`, `headerSystem.vue`, `api.js`, `SubscriptionModal.vue`, `ImageCropperModal.vue`, `useWindowStore`, `TaskRelations.vue`, `ProjectKanban.vue`, `authView.vue`, `db.js`, `StartMenu.vue`, `MainInformations.vue`, `usePlayerStore`, `NexoReceiptsTab.vue`, `health.js`, `ReauthModal.vue`, `NexoGenosPairing.vue`, `player.js`, `kanban.js`, `homeView.vue`, `PasskeysSection.vue`, `logoutView.vue`, `apiErrorMessage`, `auth.js`?**
  _High betweenness centrality (0.098) - this node is a cross-community bridge._
- **Why does `usePlayerStore` connect `usePlayerStore` to `RadioListeningTracker`, `KademNexo.vue`, `RadioFlow.vue`, `HealthWindow.vue`, `PlayerWrapper.vue`, `NexoInvestmentsTab.vue`, `TrackList.vue`, `api.js`, `useWindowStore`, `activeInvestmentTab`, `KademSkeletonGroup.vue`, `createGoalForm`, `VideoModal.vue`, `ProductivityWindow.vue`, `radioFlowWidget.vue`, `AudioSettingsPanel.vue`, `QueueSidebar.vue`, `RadioInsightsPanel.vue`, `player.js`, `homeView.vue`, `LyricsModal.vue`, `useAuthStore`, `auth.js`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `usePlayerStore` (e.g. with `track()` and `.flush()`) actually correct?**
  _`usePlayerStore` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `semi`, `singleQuote` to the rest of the system?**
  _178 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `HealthTrackingTab.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.12418300653594772 - nodes in this community are weakly interconnected._
- **Should `KademTabs.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.1368421052631579 - nodes in this community are weakly interconnected._
- **Should `KademNexo.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.044034818228366614 - nodes in this community are weakly interconnected._