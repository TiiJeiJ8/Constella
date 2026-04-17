<template>
    <Teleport to="body">
        <Transition name="modal-fade">
            <div
                v-if="isEditorVisible"
                ref="overlayRef"
                class="editor-overlay"
                tabindex="-1"
                @click.self="handleClose"
                @keydown.esc.stop="handleOverlayEscape"
                @mousemove="handleOverlayPointerMove"
                @mouseleave="handleOverlayPointerLeave"
            >
                <Transition name="modal-scale" appear>
                    <div ref="editorContainerRef" class="editor-container">
                        <div class="editor-header">
                            <div class="header-left">
                                <span class="type-icon">{{ pluginMeta?.icon || 'N' }}</span>
                                <span class="type-label">
                                    {{ pluginMeta ? (te(`canvas.nodeTypes.${pluginMeta.kind}`) ? t(`canvas.nodeTypes.${pluginMeta.kind}`) : pluginMeta.label) : t('canvas.editor.edit') }}
                                </span>
                                <div v-if="editingUsers.length > 0" class="collab-users">
                                    <div
                                        v-for="user in editingUsers"
                                        :key="user.clientId"
                                        class="collab-avatar"
                                        :style="{ backgroundColor: user.user.color }"
                                        :title="user.user.name"
                                    >
                                        {{ user.user.name.charAt(0).toUpperCase() }}
                                    </div>
                                </div>
                            </div>
                            <div v-if="isMarkdown && !isReadOnly" class="view-mode-switch" role="tablist" :aria-label="t('canvas.editor.viewMode')">
                                <button
                                    v-for="mode in viewModes"
                                    :key="mode.id"
                                    type="button"
                                    class="view-mode-btn"
                                    :class="{ active: effectiveViewMode === mode.id }"
                                    :title="mode.label"
                                    @click="viewMode = mode.id"
                                >
                                    {{ mode.label }}
                                </button>
                            </div>
                            <div class="header-actions">
                                <button
                                    v-if="canImportDocument"
                                    type="button"
                                    class="header-action-btn"
                                    :title="t('canvas.editor.importAction')"
                                    @click="triggerImport"
                                >
                                    {{ t('canvas.editor.importAction') }}
                                </button>
                                <button
                                    v-if="canExportDocument"
                                    type="button"
                                    class="header-action-btn primary"
                                    :title="t('canvas.editor.exportAction')"
                                    @click="handleExport"
                                >
                                    {{ t('canvas.editor.exportAction') }}
                                </button>
                                <div v-if="isMarkdown" class="editor-settings-shell">
                                    <button
                                        type="button"
                                        class="header-action-btn icon-only"
                                        :class="{ active: isPreviewSettingsOpen }"
                                        :title="previewSettingsTitle"
                                        :aria-label="previewSettingsTitle"
                                        @click="isPreviewSettingsOpen = !isPreviewSettingsOpen"
                                    >
                                        <svg class="header-action-icon" viewBox="0 0 20 20" aria-hidden="true">
                                            <path
                                                d="M4 5.25A1.25 1.25 0 1 1 4 7.75A1.25 1.25 0 0 1 4 5.25Zm4 .5a.75.75 0 0 1 .75-.75h7a.75.75 0 0 1 0 1.5h-7A.75.75 0 0 1 8 5.75Zm8 6a1.25 1.25 0 1 1 0 2.5a1.25 1.25 0 0 1 0-2.5Zm-11.75.5a.75.75 0 0 1 .75-.75h7a.75.75 0 0 1 0 1.5h-7a.75.75 0 0 1-.75-.75Z"
                                                fill="currentColor"
                                            />
                                        </svg>
                                    </button>
                                    <Transition name="settings-pop">
                                    <div v-if="isPreviewSettingsOpen" class="editor-settings-menu" @pointerdown.stop>
                                        <div class="editor-settings-section">
                                            <div v-if="!isReadOnly" class="editor-settings-group-title">{{ editorPanelTitle }}</div>
                                            <div v-if="!isReadOnly" class="editor-settings-grid">
                                                <div class="editor-settings-item">
                                                    <div class="editor-settings-row editor-settings-row-spread">
                                                        <div class="editor-settings-label">{{ editorFontSizeLabel }}</div>
                                                        <span class="editor-settings-value">{{ editorFontSize }}px</span>
                                                    </div>
                                                    <input
                                                        v-model.number="editorFontSize"
                                                        class="editor-settings-slider"
                                                        type="range"
                                                        min="13"
                                                        max="22"
                                                        step="1"
                                                    />
                                                </div>
                                                <div class="editor-settings-item">
                                                    <div class="editor-settings-row editor-settings-row-spread">
                                                        <div class="editor-settings-label">{{ editorLetterSpacingLabel }}</div>
                                                        <span class="editor-settings-value">{{ editorLetterSpacing.toFixed(2) }}px</span>
                                                    </div>
                                                    <input
                                                        v-model.number="editorLetterSpacing"
                                                        class="editor-settings-slider"
                                                        type="range"
                                                        min="0"
                                                        max="1.5"
                                                        step="0.05"
                                                    />
                                                </div>
                                                <div class="editor-settings-item">
                                                    <div class="editor-settings-label">{{ editorLineHeightLabel }}</div>
                                                    <div class="editor-settings-row">
                                                        <button
                                                            v-for="option in editorLineHeightOptions"
                                                            :key="option.id"
                                                            type="button"
                                                            class="editor-settings-chip"
                                                            :class="{ active: editorLineHeightMode === option.id }"
                                                            @click="editorLineHeightMode = option.id"
                                                        >
                                                            {{ option.label }}
                                                        </button>
                                                    </div>
                                                </div>
                                                <div class="editor-settings-item">
                                                    <div class="editor-settings-row editor-settings-row-spread">
                                                        <div class="editor-settings-label">{{ highlightCurrentLineLabel }}</div>
                                                        <button
                                                            type="button"
                                                            class="editor-settings-toggle"
                                                            :class="{ active: highlightCurrentLine }"
                                                            @click="highlightCurrentLine = !highlightCurrentLine"
                                                        >
                                                            <span class="editor-settings-toggle-knob" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="editor-settings-section">
                                            <div class="editor-settings-group-title">{{ previewPanelTitle }}</div>
                                            <div class="editor-settings-grid">
                                                <div class="editor-settings-item">
                                                    <div class="editor-settings-row editor-settings-row-spread">
                                                        <div class="editor-settings-label">{{ previewFontSizeLabel }}</div>
                                                        <span class="editor-settings-value">{{ previewFontSize }}px</span>
                                                    </div>
                                                    <input
                                                        v-model.number="previewFontSize"
                                                        class="editor-settings-slider"
                                                        type="range"
                                                        min="13"
                                                        max="22"
                                                        step="1"
                                                    />
                                                </div>
                                                <div class="editor-settings-item">
                                                    <div class="editor-settings-row editor-settings-row-spread">
                                                        <div class="editor-settings-label">{{ previewLetterSpacingLabel }}</div>
                                                        <span class="editor-settings-value">{{ previewLetterSpacing.toFixed(2) }}px</span>
                                                    </div>
                                                    <input
                                                        v-model.number="previewLetterSpacing"
                                                        class="editor-settings-slider"
                                                        type="range"
                                                        min="0"
                                                        max="1.5"
                                                        step="0.05"
                                                    />
                                                </div>
                                                <div class="editor-settings-item">
                                                    <div class="editor-settings-label">{{ paragraphSpacingLabel }}</div>
                                                    <div class="editor-settings-row">
                                                        <button
                                                            v-for="option in previewParagraphSpacingOptions"
                                                            :key="option.id"
                                                            type="button"
                                                            class="editor-settings-chip"
                                                            :class="{ active: previewParagraphSpacing === option.id }"
                                                            @click="previewParagraphSpacing = option.id"
                                                        >
                                                            {{ option.label }}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="editor-settings-section">
                                            <div class="editor-settings-group-title">{{ appearancePanelTitle }}</div>
                                            <div class="editor-settings-grid">
                                                <div class="editor-settings-item">
                                                    <div class="editor-settings-row editor-settings-row-spread">
                                                        <div class="editor-settings-label">{{ compactToolbarLabel }}</div>
                                                        <button
                                                            type="button"
                                                            class="editor-settings-toggle"
                                                            :class="{ active: compactToolbar }"
                                                            @click="compactToolbar = !compactToolbar"
                                                        >
                                                            <span class="editor-settings-toggle-knob" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div class="editor-settings-item">
                                                    <div class="editor-settings-label">{{ splitRatioLabel }}</div>
                                                    <div class="editor-settings-row">
                                                        <button
                                                            v-for="option in splitRatioOptions"
                                                            :key="option.id"
                                                            type="button"
                                                            class="editor-settings-chip"
                                                            :class="{ active: splitRatio === option.id }"
                                                            @click="splitRatio = option.id"
                                                        >
                                                            {{ option.label }}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="editor-settings-section">
                                            <div class="editor-settings-group-title">{{ diagramPanelTitle }}</div>
                                            <div class="editor-settings-grid">
                                                <div class="editor-settings-item">
                                                    <div class="editor-settings-label">{{ mermaidWidthLabel }}</div>
                                                    <div class="editor-settings-row">
                                                        <button
                                                            type="button"
                                                            class="editor-settings-chip"
                                                            :class="{ active: previewMermaidScaleMode === 'fit-width' }"
                                                            @click="previewMermaidScaleMode = 'fit-width'"
                                                        >
                                                            {{ fitWidthLabel }}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            class="editor-settings-chip"
                                                            :class="{ active: previewMermaidScaleMode === 'native' }"
                                                            @click="previewMermaidScaleMode = 'native'"
                                                        >
                                                            {{ originalWidthLabel }}
                                                        </button>
                                                    </div>
                                                </div>
                                                <div class="editor-settings-item">
                                                    <div class="editor-settings-row editor-settings-row-spread">
                                                        <div class="editor-settings-label">{{ scaleLabel }}</div>
                                                        <span class="editor-settings-value">{{ previewMermaidScalePercent }}%</span>
                                                    </div>
                                                    <input
                                                        v-model.number="previewMermaidScalePercent"
                                                        class="editor-settings-slider"
                                                        type="range"
                                                        :min="EXPORT_PDF_MERMAID_SCALE_MIN"
                                                        :max="EXPORT_PDF_MERMAID_SCALE_MAX"
                                                        :step="EXPORT_PDF_MERMAID_SCALE_STEP"
                                                    />
                                                    <div class="editor-settings-row">
                                                        <button
                                                            v-for="percent in previewMermaidScalePresets"
                                                            :key="percent"
                                                            type="button"
                                                            class="editor-settings-chip"
                                                            :class="{ active: previewMermaidScalePercent === percent }"
                                                            @click="previewMermaidScalePercent = percent"
                                                        >
                                                            {{ percent }}%
                                                        </button>
                                                    </div>
                                                </div>
                                                <div class="editor-settings-item">
                                                    <div class="editor-settings-label">{{ densityLabel }}</div>
                                                    <div class="editor-settings-row">
                                                        <button
                                                            v-for="option in previewMermaidDensityOptions"
                                                            :key="option.id"
                                                            type="button"
                                                            class="editor-settings-chip"
                                                            :class="{ active: previewMermaidDensity === option.id }"
                                                            @click="previewMermaidDensity = option.id"
                                                        >
                                                            {{ option.label }}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="editor-settings-footer">
                                            <button type="button" class="editor-settings-reset" @click="resetEditorSettings">
                                                {{ resetSettingsLabel }}
                                            </button>
                                        </div>
                                    </div>
                                    </Transition>
                                </div>
                                <div class="editor-search-shell">
                                    <button
                                        type="button"
                                        class="header-action-btn icon-only"
                                        :class="{ active: searchBarOpen }"
                                        :title="searchButtonTitle"
                                        :aria-label="searchButtonTitle"
                                        @click="toggleSearchBar"
                                    >
                                        <svg class="header-action-icon" viewBox="0 0 20 20" aria-hidden="true">
                                            <path
                                                d="M8.75 3.5a5.25 5.25 0 1 0 0 10.5a5.25 5.25 0 0 0 0-10.5Zm-6.75 5.25a6.75 6.75 0 1 1 12.153 4.097l3.5 3.5a.75.75 0 1 1-1.06 1.06l-3.5-3.5A6.75 6.75 0 0 1 2 8.75Z"
                                                fill="currentColor"
                                            />
                                        </svg>
                                    </button>
                                    <Transition name="settings-pop">
                                        <div v-if="searchBarOpen" class="editor-search-panel" @pointerdown.stop>
                                            <div class="editor-search-row">
                                                <input
                                                    ref="searchInputRef"
                                                    v-model="searchQuery"
                                                    class="editor-search-input"
                                                    type="text"
                                                    :placeholder="searchPlaceholder"
                                                    @keydown.stop="handleSearchInputKeyDown"
                                                />
                                                <div class="editor-search-scope">
                                                    <button
                                                        type="button"
                                                        class="editor-search-scope-btn"
                                                        :class="{ active: searchScope === 'current' }"
                                                        @click="searchScope = 'current'"
                                                    >
                                                        {{ searchCurrentLabel }}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        class="editor-search-scope-btn"
                                                        :class="{ active: searchScope === 'room' }"
                                                        @click="searchScope = 'room'"
                                                    >
                                                        {{ searchRoomLabel }}
                                                    </button>
                                                </div>
                                                <button type="button" class="editor-search-close" :aria-label="closeSearchLabel" @click="closeSearchBar">
                                                    <svg viewBox="0 0 24 24" aria-hidden="true">
                                                        <path d="M7 7l10 10M17 7 7 17" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2" />
                                                    </svg>
                                                </button>
                                            </div>
                                            <div class="editor-search-options">
                                                <button type="button" class="editor-search-option" :class="{ active: searchMatchCase }" @click="searchMatchCase = !searchMatchCase">
                                                    {{ searchMatchCaseLabel }}
                                                </button>
                                                <button type="button" class="editor-search-option" :class="{ active: searchWholeWord }" @click="searchWholeWord = !searchWholeWord">
                                                    {{ searchWholeWordLabel }}
                                                </button>
                                                <button type="button" class="editor-search-option" :class="{ active: searchUseRegex }" @click="searchUseRegex = !searchUseRegex">
                                                    {{ searchRegexLabel }}
                                                </button>
                                                <button
                                                    v-if="searchScope === 'current'"
                                                    type="button"
                                                    class="editor-search-option"
                                                    :class="{ active: replaceBarOpen }"
                                                    :title="replaceButtonTitle"
                                                    @click="toggleReplaceBar"
                                                >
                                                    {{ replaceLabel }}
                                                </button>
                                            </div>
                                            <div v-if="searchScope === 'room' && roomSearchTypeOptions.length > 1" class="editor-search-filters">
                                                <button
                                                    v-for="option in roomSearchTypeOptions"
                                                    :key="option.value"
                                                    type="button"
                                                    class="editor-search-filter"
                                                    :class="{ active: roomSearchKindFilter === option.value }"
                                                    @click="roomSearchKindFilter = option.value"
                                                >
                                                    {{ option.label }}
                                                </button>
                                            </div>
                                            <div v-if="replaceBarOpen && searchScope === 'current'" class="editor-search-row replace-row">
                                                <input
                                                    ref="replaceInputRef"
                                                    v-model="replaceQuery"
                                                    class="editor-search-input"
                                                    type="text"
                                                    :placeholder="replacePlaceholder"
                                                    @keydown.stop="handleReplaceInputKeyDown"
                                                />
                                                <button type="button" class="editor-search-nav compact" :disabled="!hasCurrentSearchMatches" @click="replaceCurrentSearchMatch()">
                                                    {{ replaceLabel }}
                                                </button>
                                                <button type="button" class="editor-search-nav compact" :disabled="!hasCurrentSearchMatches" @click="replaceAllSearchMatches()">
                                                    {{ replaceAllLabel }}
                                                </button>
                                            </div>
                                            <div class="editor-search-meta">
                                                <template v-if="searchScope === 'current'">
                                                    {{ currentSearchStatusLabel }}
                                                </template>
                                                <template v-else>
                                                    {{ roomSearchStatusLabel }}
                                                </template>
                                            </div>
                                            <div v-if="searchScope === 'room' && replaceBarOpen" class="editor-search-meta">
                                                {{ roomReplaceHintLabel }}
                                            </div>
                                            <div v-if="searchScope === 'current'" class="editor-search-actions">
                                                <button type="button" class="editor-search-nav" :disabled="!hasCurrentSearchMatches" @click="jumpToCurrentSearchMatch(-1)">
                                                    {{ searchPrevLabel }}
                                                </button>
                                                <button type="button" class="editor-search-nav" :disabled="!hasCurrentSearchMatches" @click="jumpToCurrentSearchMatch(1)">
                                                    {{ searchNextLabel }}
                                                </button>
                                            </div>
                                            <div v-else-if="roomSearchResults.length > 0" class="editor-search-results">
                                                <button
                                                    v-for="(result, index) in roomSearchResults"
                                                    :key="`${result.nodeId}-${result.matchIndex}`"
                                                    type="button"
                                                    class="editor-search-result"
                                                    :class="{ active: index === activeRoomSearchIndex }"
                                                    @click="activeRoomSearchIndex = index"
                                                    @dblclick="jumpToRoomSearchResult(index)"
                                                >
                                                    <span class="editor-search-result-title" v-html="result.titleHtml" />
                                                    <span class="editor-search-result-snippet">{{ result.snippet }}</span>
                                                    <span class="editor-search-result-meta">
                                                        {{ result.kindLabel }} - {{ result.matchCount }} match<span v-if="result.matchCount > 1">es</span>
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    </Transition>
                                </div>
                                <button class="close-btn" :title="t('canvas.editor.closeHint')" :aria-label="t('canvas.editor.closeHint')" @click="handleClose">
                                    <span>&times;</span>
                                </button>
                                <input
                                    ref="importInputRef"
                                    class="sr-only-file-input"
                                    type="file"
                                    :accept="acceptedImportExtensions"
                                    @change="handleImportFileChange"
                                />
                            </div>
                        </div>

                        <div class="editor-body" :class="editorBodyClass" @pointerdown="handleWorkspacePointerDown">
                            <div
                                v-if="showPreviewPane && outlineItems.length > 0"
                                ref="outlineShellRef"
                                class="editor-outline-shell"
                                :class="{ open: outlineOpen }"
                                @pointerdown.stop
                            >
                                <button
                                    type="button"
                                    class="outline-toggle"
                                    :class="{ open: outlineOpen, armed: outlineHintActive }"
                                    @click="outlineOpen = !outlineOpen"
                                >
                                    <span class="outline-toggle-icon">{{ outlineOpen ? '‹' : '›' }}</span>
                                </button>

                                <Transition name="outline-float">
                                    <aside v-if="outlineOpen" class="outline-pane">
                                        <div class="outline-header">{{ outlineTitle }}</div>
                                        <button
                                            v-for="item in outlineItems"
                                            :key="item.id"
                                            type="button"
                                            class="outline-item"
                                            :class="[`level-${item.level}`, { active: activeOutlineId === item.id }]"
                                            @click="scrollToOutlineItem(item)"
                                        >
                                            {{ item.text }}
                                        </button>
                                    </aside>
                                </Transition>
                            </div>

                            <div v-if="showEditorPane" class="edit-pane" :style="editPaneStyle">
                                <div class="pane-header-row">
                                    <div class="pane-header">{{ t('canvas.editor.edit') }}</div>
                                    <div v-if="isMarkdown && activeCodeFence" class="pane-subtools">
                                        <span class="subtool-label">Code Block</span>
                                        <button
                                            v-for="language in commonCodeLanguages"
                                            :key="language"
                                            type="button"
                                            class="code-language-chip"
                                            :class="{ active: activeCodeFence.language === language }"
                                            @click="setCurrentCodeFenceLanguage(language)"
                                        >
                                            {{ language }}
                                        </button>
                                    </div>
                                </div>

                                <div v-if="isMarkdown && !isReadOnly" class="editor-toolbar">
                                    <button
                                        v-for="action in toolbarActions"
                                        :key="action.id"
                                        type="button"
                                        class="toolbar-button"
                                        :class="{ compact: compactToolbar }"
                                        :title="action.description"
                                        @click="action.action"
                                    >
                                        <span class="toolbar-button-label">{{ compactToolbar ? getToolbarDisplayIcon(action) : action.label }}</span>
                                    </button>
                                </div>

                                <div class="textarea-wrapper">
                                    <textarea
                                        ref="textareaRef"
                                        class="editor-textarea"
                                        :style="editorTextareaStyle"
                                        :value="localContent"
                                        :placeholder="placeholder"
                                        :readonly="isReadOnly"
                                        spellcheck="false"
                                        @input="handleInput"
                                        @keydown="handleKeyDown"
                                        @paste="handlePaste"
                                        @wheel="markEditorIntent"
                                        @pointerdown="markEditorIntent"
                                        @scroll="handleEditorScroll"
                                        @select="handleSelection"
                                        @click="handleCursorChange"
                                        @keyup="handleCursorChange"
                                    />
                                    <div
                                        v-for="cursor in remoteCursors"
                                        :key="cursor.clientId"
                                        class="remote-cursor"
                                        :style="cursor.style"
                                    >
                                        <div class="remote-cursor-caret" :style="{ backgroundColor: cursor.color }" />
                                        <div class="remote-cursor-label" :style="{ backgroundColor: cursor.color }">
                                            {{ cursor.name }}
                                        </div>
                                        <div
                                            v-if="cursor.selectionWidth > 0"
                                            class="remote-selection"
                                            :style="{ backgroundColor: `${cursor.color}40`, width: `${cursor.selectionWidth}ch` }"
                                        />
                                    </div>
                                </div>

                                <div
                                    v-if="showSlashMenu"
                                    ref="slashMenuRef"
                                    class="slash-menu"
                                    :style="slashMenuStyle"
                                >
                                    <div class="slash-menu-header">{{ t('canvas.editor.insertBlock') }}</div>
                                    <div class="slash-menu-scroll">
                                        <div
                                            v-for="(cmd, index) in filteredCommands"
                                            :key="cmd.id"
                                            class="slash-menu-item"
                                            :class="{ active: index === selectedCommandIndex }"
                                            @click="executeCommand(cmd)"
                                            @mouseenter="selectedCommandIndex = index"
                                        >
                                            <span class="cmd-icon" :class="cmd.iconClass">{{ cmd.icon }}</span>
                                            <div class="cmd-info">
                                                <span class="cmd-label">{{ cmd.label }}</span>
                                                <span class="cmd-desc">{{ cmd.description }}</span>
                                            </div>
                                            <span v-if="cmd.shortcut" class="cmd-shortcut">{{ cmd.shortcut }}</span>
                                        </div>
                                    </div>
                                    <div v-if="filteredCommands.length === 0" class="slash-menu-empty">
                                        {{ t('canvas.editor.noMatch') }}
                                    </div>
                                </div>

                            </div>

                            <div v-if="showPreviewPane" class="preview-pane" :style="previewPaneStyle">
                                <div class="pane-header-row preview-pane-header">
                                    <div class="pane-header">{{ t('canvas.editor.preview') }}</div>
                                    <div class="preview-stats">
                                        <span>{{ previewBlocks.length }} blocks</span>
                                        <span>{{ outlineItems.length }} headings</span>
                                    </div>
                                </div>

                                <div class="preview-layout">
                                    <div ref="previewRef" class="preview-content" :style="previewContentStyle" @click="handlePreviewClick" @wheel="markPreviewIntent" @pointerdown="markPreviewIntent" @scroll="handlePreviewScroll">
                                        <div v-if="previewBlocks.length === 0" class="preview-empty">
                                            {{ t('canvas.editor.previewArea') }}
                                        </div>
                                        <div v-else class="preview-top-spacer" aria-hidden="true" />
                                        <div
                                            v-for="block in previewBlocks"
                                            :id="block.anchorId"
                                            :key="block.id"
                                            class="preview-block"
                                            :class="{ 'is-heavy': block.isHeavy, 'is-deferred': block.isDeferred, active: block.id === activePreviewBlockId }"
                                            :data-preview-block-id="block.id"
                                        >
                                            <div v-if="block.isDeferred" class="preview-block-placeholder">
                                                <span class="preview-block-badge">Lazy Render</span>
                                                <p>{{ block.summary }}</p>
                                            </div>
                                            <div v-else class="preview-block-inner" v-html="block.html" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="editor-footer">
                            <div class="footer-hint">
                                <kbd>/</kbd> {{ t('canvas.editor.footerHint') }} · <kbd>Tab</kbd> indent · <kbd>Esc</kbd> {{ t('canvas.editor.footerClose') }}
                            </div>
                            <div class="footer-right">
                                <span v-if="editingUsers.length > 0" class="collab-indicator">
                                    {{ t('canvas.editor.collaborating', { count: editingUsers.length + 1 }) }}
                                </span>
                                <span class="char-count">{{ t('canvas.editor.characters', { count: localContent.length }) }}</span>
                            </div>
                        </div>
                    </div>
                </Transition>
                <div
                    v-if="showPreviewPane && outlineItems.length > 0"
                    class="outline-floating-shell"
                    @pointerdown.stop
                >
                    <button
                        type="button"
                        class="outline-toggle"
                        :class="{ open: outlineOpen, armed: outlineHintActive }"
                        :title="outlineTitle"
                        :aria-label="outlineTitle"
                        @click="outlineOpen = !outlineOpen"
                    >
                        <span class="outline-toggle-icon">{{ outlineOpen ? '‹' : '›' }}</span>
                    </button>

                    <Transition name="outline-float">
                        <aside v-if="outlineOpen" class="outline-pane">
                            <div class="outline-header">{{ outlineTitle }}</div>
                            <button
                                v-for="item in outlineItems"
                                :key="item.id"
                                type="button"
                                class="outline-item"
                                :class="[`level-${item.level}`, { active: activeOutlineId === item.id }]"
                                @click="scrollToOutlineItem(item)"
                            >
                                {{ item.text }}
                            </button>
                        </aside>
                    </Transition>
                </div>
                <div v-if="showBackToTopButton" class="to-top-shell">
                    <button
                        type="button"
                        class="to-top-button"
                        :title="backToTopTitle"
                        :aria-label="backToTopTitle"
                        @click="handleBackToTop"
                    >
                        <span class="to-top-icon">{{ locale === 'zh-CN' ? '顶部' : 'Top' }}</span>
                    </button>
                </div>
            </div>
        </Transition>
        <DocumentExportPanel
            v-model="isExportPanelOpen"
            :kind="isMarkdown ? 'markdown' : 'text'"
            :default-settings="exportPanelDefaults"
            :supports-electron-pdf="supportsElectronPdf"
            @confirm="handleExportConfirm"
        />
        <Transition name="modal-fade">
            <div
                v-if="activeImagePreview"
                ref="imageLightboxRef"
                class="image-lightbox"
                tabindex="-1"
                @click.self="closeImagePreview"
                @keydown.esc.stop="closeImagePreview"
            >
                <button type="button" class="image-lightbox-close" @click="closeImagePreview">&times;</button>
                <img
                    class="image-lightbox-media"
                    :src="activeImagePreview.src"
                    :alt="activeImagePreview.alt"
                />
                <div v-if="activeImagePreview.alt" class="image-lightbox-caption">{{ activeImagePreview.alt }}</div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { computed, inject, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js'
import katex from 'katex'
import mermaid from 'mermaid'
import type { MermaidConfig } from 'mermaid'
// @ts-ignore
import { pluginCatalogVersion, pluginRegistry, type NodeContent } from '@/plugins'
import DocumentExportPanel from '@/components/canvas/DocumentExportPanel.vue'
import {
    EXPORT_PDF_MERMAID_SCALE_MAX,
    EXPORT_PDF_MERMAID_SCALE_MIN,
    EXPORT_PDF_MERMAID_SCALE_STEP,
    exportDocument,
    type ExportTheme,
    type ExportPanelSettings,
    type ExportPanelThemeMode,
    type ExportPdfMermaidDensity
} from '@/utils/documentExport'
import { deriveDocumentTitle, sanitizeFilename } from '@/utils/markdownRender'
import { useToast } from '@/utils/useToast'
import type { UserState } from '../../composables/useAwareness'

const { t, te, locale } = useI18n()
const toast = useToast()

type MermaidThemeMode = 'light' | 'dark'

function getMermaidThemeVariables(mode: MermaidThemeMode) {
    if (mode === 'light') {
        return {
            primaryColor: '#e8eef9',
            primaryTextColor: '#172033',
            primaryBorderColor: '#9bb2d1',
            lineColor: '#7a93b8',
            secondaryColor: '#dfe8f5',
            tertiaryColor: '#f3f6fb',
            background: '#ffffff',
            mainBkg: '#e8eef9',
            secondBkg: '#dfe8f5',
            tertiaryBkg: '#f3f6fb',
            textColor: '#172033',
            nodeBorder: '#9bb2d1',
            clusterBkg: '#f5f7fb',
            clusterBorder: '#c8d4e8',
            edgeLabelBackground: '#ffffff',
            cScale0: '#d8e7ff',
            cScale1: '#dff4ea',
            cScale2: '#fff1d6',
            cScale3: '#f4e3ff',
            cScaleLabel0: '#172033',
            cScaleLabel1: '',
            cScaleLabel2: '#4b3200',
            cScaleLabel3: '#3d1d59'
        }
    }

    return {
        primaryColor: '#1e293b',
        primaryTextColor: '#e5eefc',
        primaryBorderColor: '#5f7ba6',
        lineColor: '#8aa4d0',
        secondaryColor: '#162132',
        tertiaryColor: '#111a28',
        background: '#17181c',
        mainBkg: '#1e293b',
        secondBkg: '#162132',
        tertiaryBkg: '#111a28',
        textColor: '#e5eefc',
        nodeBorder: '#5f7ba6',
        clusterBkg: '#111a28',
        clusterBorder: '#334155',
        edgeLabelBackground: '#17181c',
        cScale0: '#26476b',
        cScale1: '#173226',
        cScale2: '#6a4f1f',
        cScale3: '#4b2e67',
        cScaleLabel0: '#eff6ff',
        cScaleLabel1: '#ecfdf5',
        cScaleLabel2: '#fff7ed',
        cScaleLabel3: '#faf5ff'
    }
}

function getMermaidConfig(mode: MermaidThemeMode): MermaidConfig {
    return {
        startOnLoad: false,
        theme: 'base',
        securityLevel: 'loose',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        themeVariables: getMermaidThemeVariables(mode)
    }
}

function getMermaidDiagramLabel(source: string): string {
    const firstMeaningfulLine = source
        .split('\n')
        .map(line => line.trim())
        .find(line => Boolean(line))
        ?.toLowerCase() ?? ''

    const labelMap: Array<[RegExp, string]> = [
        [/^mindmap\b/, 'Mindmap'],
        [/^(flowchart|graph)\b/, 'Flowchart'],
        [/^sequencediagram\b/, 'Sequence'],
        [/^classdiagram\b/, 'Class'],
        [/^erdiagram\b/, 'ERD'],
        [/^journey\b/, 'Journey'],
        [/^gantt\b/, 'Gantt'],
        [/^statediagram(?:-v2)?\b/, 'State'],
        [/^pie\b/, 'Pie'],
        [/^quadrantchart\b/, 'Quadrant'],
        [/^requirementdiagram\b/, 'Requirement'],
        [/^gitgraph\b/, 'Git Graph'],
        [/^timeline\b/, 'Timeline'],
        [/^c4context\b/, 'C4 Context'],
        [/^c4container\b/, 'C4 Container'],
        [/^c4component\b/, 'C4 Component'],
        [/^c4dynamic\b/, 'C4 Dynamic'],
        [/^c4deployment\b/, 'C4 Deployment'],
        [/^block-beta\b/, 'Block']
    ]

    const matched = labelMap.find(([pattern]) => pattern.test(firstMeaningfulLine))
    return `Mermaid · ${matched?.[1] ?? 'Diagram'}`
}

function isGanttMermaidSource(source: string) {
    const firstMeaningfulLine = source
        .split('\n')
        .map(line => line.trim())
        .find(line => Boolean(line))
        ?.toLowerCase() ?? ''

    return /^gantt\b/.test(firstMeaningfulLine)
}

mermaid.initialize(getMermaidConfig('dark'))

interface SlashCommand {
    id: string
    icon: string
    iconClass?: string
    label: string
    description: string
    shortcut?: string
    action: () => string
}

interface RemoteCursor {
    clientId: number
    name: string
    color: string
    position: number
    selectionEnd: number
    style: { top: string; left: string }
    selectionWidth: number
}

interface PreviewBlock {
    id: string
    anchorId: string
    raw: string
    html: string
    summary: string
    isHeavy: boolean
    isDeferred: boolean
}

interface EditorBlockMetric {
    id: string
    start: number
    end: number
    length: number
    lineStart: number
    lineEnd: number
    lineCount: number
}

interface OutlineItem {
    id: string
    blockId: string
    anchorId: string
    text: string
    level: number
}

interface ToolbarAction {
    id: string
    label: string
    icon: string
    description: string
    action: () => void
}

interface CodeFenceContext {
    language: string
    lineStart: number
    lineEnd: number
}

type EditorViewMode = 'edit' | 'split' | 'preview'
type PreviewMermaidScaleMode = 'fit-width' | 'native'
type EditorLineHeightMode = 'compact' | 'standard' | 'relaxed'
type PreviewParagraphSpacingMode = 'compact' | 'standard' | 'relaxed'
type SplitRatioMode = 'editor-wide' | 'balanced' | 'preview-wide'

interface StoredPreviewSessionState {
    contentHash: string
    visibleBlockIds: string[]
    previewScrollTop: number
    editorScrollTop: number
}

interface NodeEditorPreviewGlobalState {
    htmlCache: Map<string, string>
    sessionByNodeId: Map<string, StoredPreviewSessionState>
}

const MAX_PREVIEW_HTML_CACHE_ENTRIES = 400
const MAX_PREVIEW_SESSION_ENTRIES = 40

const props = defineProps<{
    nodeId: string
    content: NodeContent
    allNodes?: Array<{ id: string; content: NodeContent }>
    readOnly?: boolean
}>()

const emit = defineEmits<{
    (e: 'update', nodeId: string, data: string): void
    (e: 'close'): void
    (e: 'jump-to-node', nodeId: string): void
}>()

const awareness = inject<{
    otherUsers: { value: UserState[] }
    updateTextCursor?: (nodeId: string, position: number, selectionEnd: number) => void
}>('awareness', { otherUsers: { value: [] } })

const overlayRef = ref<HTMLDivElement | null>(null)
const editorContainerRef = ref<HTMLDivElement | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const importInputRef = ref<HTMLInputElement | null>(null)
const previewRef = ref<HTMLDivElement | null>(null)
const slashMenuRef = ref<HTMLDivElement | null>(null)
const imageLightboxRef = ref<HTMLDivElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)
const replaceInputRef = ref<HTMLInputElement | null>(null)
const localContent = ref('')
const searchBarOpen = ref(false)
const replaceBarOpen = ref(false)
const searchScope = ref<'current' | 'room'>('current')
const searchQuery = ref('')
const replaceQuery = ref('')
const searchMatchCase = ref(false)
const searchWholeWord = ref(false)
const searchUseRegex = ref(false)
const roomSearchKindFilter = ref<'all' | string>('all')
const currentSearchIndex = ref(0)
const activeRoomSearchIndex = ref(0)
const showSlashMenu = ref(false)
const slashMenuPosition = ref({ top: 0, left: 0 })
const selectedCommandIndex = ref(0)
const slashQuery = ref('')
const slashStartPosition = ref(0)
const visiblePreviewBlockIds = ref<Set<string>>(new Set())
const outlineOpen = ref(false)
const activeOutlineId = ref('')
const outlineHintActive = ref(false)
const editorScrollTop = ref(0)
const previewScrollTop = ref(0)
const isExportPanelOpen = ref(false)
const isPreviewSettingsOpen = ref(false)
const viewMode = ref<EditorViewMode>('edit')
const editorSelectionStart = ref(0)
const forceSingleColumn = ref(false)
const activeImagePreview = ref<{ src: string; alt: string } | null>(null)
const previewMermaidScaleMode = ref<PreviewMermaidScaleMode>('fit-width')
const previewMermaidScalePercent = ref(100)
const previewMermaidDensity = ref<ExportPdfMermaidDensity>('compact')
const isEditorVisible = ref(true)
const editorFontSize = ref(15)
const editorLetterSpacing = ref(0)
const editorLineHeightMode = ref<EditorLineHeightMode>('standard')
const highlightCurrentLine = ref(false)
const previewFontSize = ref(15)
const previewLetterSpacing = ref(0)
const previewParagraphSpacing = ref<PreviewParagraphSpacingMode>('standard')
const compactToolbar = ref(false)
const splitRatio = ref<SplitRatioMode>('balanced')

type RoomSearchResult = {
    nodeId: string
    kind: string
    kindLabel: string
    titleHtml: string
    snippet: string
    matchIndex: number
    matchCount: number
}

const NODE_EDITOR_PREVIEW_GLOBAL_KEY = '__constellaNodeEditorPreviewState'
const nodeEditorPreviewGlobalState = (() => {
    const scope = globalThis as typeof globalThis & {
        [NODE_EDITOR_PREVIEW_GLOBAL_KEY]?: NodeEditorPreviewGlobalState
    }
    if (!scope[NODE_EDITOR_PREVIEW_GLOBAL_KEY]) {
        scope[NODE_EDITOR_PREVIEW_GLOBAL_KEY] = {
            htmlCache: new Map<string, string>(),
            sessionByNodeId: new Map<string, StoredPreviewSessionState>()
        }
    }
    return scope[NODE_EDITOR_PREVIEW_GLOBAL_KEY]!
})()

const previewCache = nodeEditorPreviewGlobalState.htmlCache
const mathPlaceholders = new Map<string, string>()
const codePlaceholders = new Map<string, string>()
const markdownUtils = new MarkdownIt().utils
const commonCodeLanguages = ['text', 'javascript', 'typescript', 'python', 'bash', 'sql', 'json', 'html', 'css']

let placeholderCounter = 0
let mermaidCounter = 0
let previewObserver: IntersectionObserver | null = null
let previewSyncFrame: number | null = null
let previewRealignFrame: number | null = null
let pendingEditorScrollTop = 0
let syncingSource: 'editor' | null = null
let editorLayoutResizeObserver: ResizeObserver | null = null
let previewBlockResizeObserver: ResizeObserver | null = null
let restoringPreviewSession = false
let closeEmitTimer: number | null = null
let pendingPreviewSessionRestore: StoredPreviewSessionState | null = null
let hasRestoredPreviewSession = false

const VIEW_MODE_STORAGE_KEY = 'constella.node-editor.view-mode'
const PREVIEW_MERMAID_SETTINGS_STORAGE_KEY = 'constella.node-editor.preview-mermaid-settings'
const EDITOR_SETTINGS_STORAGE_KEY = 'constella.node-editor.settings'
const SINGLE_COLUMN_BREAKPOINT = 1180
const SCROLL_TOP_VISIBILITY_THRESHOLD = 220
const PREVIEW_TOP_SPACER_PX = 170
const EDITOR_CLOSE_ANIMATION_MS = 220

const md = new MarkdownIt({
    html: false,
    breaks: true,
    linkify: true,
    typographer: true,
    highlight(str: string, lang: string): string {
        if (lang === 'mermaid') {
            const id = `mermaid-${mermaidCounter++}`
            const mermaidLabel = markdownUtils.escapeHtml(getMermaidDiagramLabel(str))
            return `<div class="mermaid-wrapper"><span class="mermaid-block-lang">${mermaidLabel}</span><pre class="mermaid" id="${id}">${markdownUtils.escapeHtml(str)}</pre></div>`
        }
        const languageLabel = markdownUtils.escapeHtml(lang || 'text')
        if (lang && hljs.getLanguage(lang)) {
            try {
                return `<div class="code-block-shell"><span class="code-block-lang">${languageLabel}</span><pre class="hljs"><code class="language-${lang}">${hljs.highlight(str, { language: lang, ignoreIllegals: true }).value}</code></pre></div>`
            } catch {
                return `<div class="code-block-shell"><span class="code-block-lang">${languageLabel}</span><pre class="hljs"><code>${markdownUtils.escapeHtml(str)}</code></pre></div>`
            }
        }
        return `<div class="code-block-shell"><span class="code-block-lang">${languageLabel}</span><pre class="hljs"><code>${markdownUtils.escapeHtml(str)}</code></pre></div>`
    }
})

const defaultLinkOpen = md.renderer.rules.link_open ?? ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const token = tokens[idx]
    if (!token) return ''
    token.attrSet('target', '_blank')
    token.attrSet('rel', 'noopener noreferrer')
    return defaultLinkOpen(tokens, idx, options, env, self)
}

function renderKaTeX(tex: string, displayMode: boolean): string {
    try {
        return katex.renderToString(tex, {
            displayMode,
            throwOnError: false,
            errorColor: '#f56565',
            trust: true,
            strict: false
        })
    } catch {
        return `<span class="katex-error">${markdownUtils.escapeHtml(tex)}</span>`
    }
}

function protectCode(text: string): string {
    codePlaceholders.clear()
    text = text.replace(/(^|\n)(```[\s\S]*?```)(?=\n|$)/g, (_, prefix: string, block: string) => {
        const id = `%%CODE_BLOCK_${placeholderCounter++}%%`
        codePlaceholders.set(id, block)
        return `${prefix}${id}`
    })
    text = text.replace(/`([^`\n]+)`/g, (match: string) => {
        const id = `%%CODE_INLINE_${placeholderCounter++}%%`
        codePlaceholders.set(id, match)
        return id
    })
    return text
}

function restoreCode(text: string): string {
    codePlaceholders.forEach((replacement, placeholder) => {
        text = text.split(placeholder).join(replacement)
    })
    return text
}

function protectMath(text: string): string {
    mathPlaceholders.clear()
    placeholderCounter = 0
    text = protectCode(text)
    text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex: string) => {
        const id = `%%MATH_BLOCK_${placeholderCounter++}%%`
        mathPlaceholders.set(id, `<div class="katex-block">${renderKaTeX(tex.trim(), true)}</div>`)
        return id
    })
    text = text.replace(/\$([^$\n]+?)\$/g, (_, tex: string) => {
        const id = `%%MATH_INLINE_${placeholderCounter++}%%`
        mathPlaceholders.set(id, renderKaTeX(tex.trim(), false))
        return id
    })
    return restoreCode(text)
}

function restoreMath(html: string): string {
    mathPlaceholders.forEach((replacement, placeholder) => {
        html = html.split(placeholder).join(replacement)
    })
    return html
}

function sanitizeHtml(rawHtml: string): string {
    return DOMPurify.sanitize(rawHtml, {
        ADD_TAGS: ['span', 'img', 'svg', 'path', 'line', 'rect', 'circle', 'g', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac', 'mroot', 'msqrt', 'mtext', 'annotation', 'math', 'foreignObject', 'polygon', 'polyline', 'ellipse', 'text', 'tspan', 'marker', 'defs', 'clipPath', 'use', 'image', 'pattern', 'linearGradient', 'radialGradient', 'stop', 'title', 'desc'],
        ADD_ATTR: ['xmlns', 'width', 'height', 'viewBox', 'd', 'fill', 'stroke', 'stroke-width', 'transform', 'style', 'aria-hidden', 'focusable', 'role', 'encoding', 'id', 'class', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'points', 'marker-end', 'marker-start', 'text-anchor', 'dominant-baseline', 'font-size', 'font-family', 'font-weight', 'fill-opacity', 'stroke-opacity', 'stroke-dasharray', 'clip-path', 'xlink:href', 'href', 'src', 'alt', 'title', 'loading', 'referrerpolicy', 'preserveAspectRatio'],
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'a', 'hr', 'span', 'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img', 'svg', 'path', 'line', 'rect', 'circle', 'g', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac', 'mroot', 'msqrt', 'mtext', 'annotation', 'math', 'polygon', 'polyline', 'ellipse', 'text', 'tspan', 'marker', 'defs', 'clipPath', 'use', 'foreignObject'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style', 'id', 'xmlns', 'width', 'height', 'viewBox', 'd', 'fill', 'stroke', 'stroke-width', 'transform', 'aria-hidden', 'focusable', 'role', 'encoding', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'points', 'marker-end', 'text-anchor', 'dominant-baseline', 'font-size', 'font-family', 'font-weight', 'src', 'alt', 'title', 'loading', 'referrerpolicy']
    })
}

function renderMarkdown(text: string): string {
    mermaidCounter = 0
    const processed = protectMath(text)
    return sanitizeHtml(restoreMath(md.render(processed)))
}

function stripMarkdownSyntax(text: string): string {
    return text
        .replace(/```[\s\S]*?```/g, 'code block')
        .replace(/`([^`\n]+)`/g, '$1')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/~~([^~]+)~~/g, '$1')
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/^\s*[-*+]\s+/gm, '')
        .replace(/^\s*\d+\.\s+/gm, '')
        .replace(/^\s*>\s?/gm, '')
        .replace(/\$\$[\s\S]+?\$\$/g, 'formula')
        .replace(/\$([^$\n]+)\$/g, '$1')
        .replace(/\|/g, ' ')
        .replace(/\n+/g, ' ')
        .trim()
}

function summarizeBlock(text: string): string {
    const plain = stripMarkdownSyntax(text)
    return plain ? plain.slice(0, 120) : 'Heavy block will render when it enters the viewport.'
}

function hashText(text: string): string {
    let hash = 0
    for (let i = 0; i < text.length; i += 1) {
        hash = ((hash << 5) - hash) + text.charCodeAt(i)
        hash |= 0
    }
    return Math.abs(hash).toString(36)
}

function getCurrentPreviewContentHash() {
    return hashText(localContent.value)
}

function touchPreviewCacheEntry(key: string, value?: string) {
    const hasValue = previewCache.has(key)
    const resolvedValue = value ?? previewCache.get(key)
    if (resolvedValue == null) return null
    if (hasValue) {
        previewCache.delete(key)
    }
    previewCache.set(key, resolvedValue)
    while (previewCache.size > MAX_PREVIEW_HTML_CACHE_ENTRIES) {
        const oldestKey = previewCache.keys().next().value
        if (typeof oldestKey !== 'string') break
        previewCache.delete(oldestKey)
    }
    return resolvedValue
}

function getStoredPreviewSessionState() {
    const stored = nodeEditorPreviewGlobalState.sessionByNodeId.get(props.nodeId)
    if (!stored) return null
    nodeEditorPreviewGlobalState.sessionByNodeId.delete(props.nodeId)
    nodeEditorPreviewGlobalState.sessionByNodeId.set(props.nodeId, stored)
    if (stored.contentHash !== getCurrentPreviewContentHash()) return null
    return stored
}

function persistPreviewSessionState() {
    nodeEditorPreviewGlobalState.sessionByNodeId.delete(props.nodeId)
    nodeEditorPreviewGlobalState.sessionByNodeId.set(props.nodeId, {
        contentHash: getCurrentPreviewContentHash(),
        visibleBlockIds: Array.from(visiblePreviewBlockIds.value),
        previewScrollTop: previewScrollTop.value,
        editorScrollTop: editorScrollTop.value
    })
    while (nodeEditorPreviewGlobalState.sessionByNodeId.size > MAX_PREVIEW_SESSION_ENTRIES) {
        const oldestKey = nodeEditorPreviewGlobalState.sessionByNodeId.keys().next().value
        if (typeof oldestKey !== 'string') break
        nodeEditorPreviewGlobalState.sessionByNodeId.delete(oldestKey)
    }
}

function splitMarkdownBlocks(text: string): string[] {
    if (!text.trim()) return []
    const blocks: string[] = []
    const lines = text.split('\n')
    let current: string[] = []
    let inFence = false
    let inMath = false

    const pushCurrent = () => {
        const block = current.join('\n').trim()
        if (block) blocks.push(block)
        current = []
    }

    for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.startsWith('```')) {
            current.push(line)
            inFence = !inFence
            continue
        }
        if (!inFence && trimmed === '$$') {
            current.push(line)
            inMath = !inMath
            continue
        }
        if (!inFence && !inMath && trimmed === '') {
            pushCurrent()
            continue
        }
        current.push(line)
    }

    pushCurrent()
    return blocks
}

function isHeavyBlock(text: string): boolean {
    return /```|^\$\$|^\|.*\|$/m.test(text) || text.length > 600
}

const pluginMeta = computed(() => {
    pluginCatalogVersion.value
    return pluginRegistry.getMeta(props.content.kind)
})
const isMarkdown = computed(() => props.content.kind === 'markdown')
const isReadOnly = computed(() => Boolean(props.readOnly))
const effectiveViewMode = computed<EditorViewMode>(() => {
    if (!isMarkdown.value) return 'edit'
    if (isReadOnly.value) return 'preview'
    if (forceSingleColumn.value && viewMode.value === 'split') return 'edit'
    return viewMode.value
})
const viewModes = computed(() => ([
    { id: 'edit' as EditorViewMode, label: t('canvas.editor.modeEdit') },
    { id: 'split' as EditorViewMode, label: t('canvas.editor.modeSplit') },
    { id: 'preview' as EditorViewMode, label: t('canvas.editor.modePreview') }
]))
const acceptedImportExtensions = '.txt,.md,.markdown,.mdown,.mkd'
const canImportDocument = computed(() => !isReadOnly.value && (props.content.kind === 'markdown' || props.content.kind === 'text'))
const canExportDocument = computed(() => props.content.kind === 'markdown' || props.content.kind === 'text')
const supportsElectronPdf = computed(() => Boolean(window.electron?.exportDocumentPdf))
const showEditorPane = computed(() => !isMarkdown.value || effectiveViewMode.value === 'edit' || effectiveViewMode.value === 'split')
const showPreviewPane = computed(() => isMarkdown.value && (effectiveViewMode.value === 'split' || effectiveViewMode.value === 'preview'))
const editorBodyClass = computed(() => ({
    'split-view': showEditorPane.value && showPreviewPane.value,
    'edit-only': showEditorPane.value && !showPreviewPane.value,
    'preview-only': showPreviewPane.value && !showEditorPane.value
}))
const backToTopTarget = computed<'none' | 'editor' | 'preview' | 'both'>(() => {
    if (effectiveViewMode.value === 'split') {
        const shouldTopEditor = showEditorPane.value && editorScrollTop.value > SCROLL_TOP_VISIBILITY_THRESHOLD
        const shouldTopPreview = showPreviewPane.value && previewScrollTop.value > SCROLL_TOP_VISIBILITY_THRESHOLD
        if (shouldTopEditor && shouldTopPreview) return 'both'
        if (shouldTopEditor) return 'editor'
        if (shouldTopPreview) return 'preview'
        return 'none'
    }

    if (effectiveViewMode.value === 'preview') {
        return showPreviewPane.value && previewScrollTop.value > SCROLL_TOP_VISIBILITY_THRESHOLD ? 'preview' : 'none'
    }

    return showEditorPane.value && editorScrollTop.value > SCROLL_TOP_VISIBILITY_THRESHOLD ? 'editor' : 'none'
})
const showBackToTopButton = computed(() => backToTopTarget.value !== 'none')
const previewSettingsTitle = computed(() => locale.value === 'zh-CN' ? '预览设置' : 'Preview settings')
const editorPanelTitle = computed(() => locale.value === 'zh-CN' ? '编辑区' : 'Editor')
const previewPanelTitle = computed(() => locale.value === 'zh-CN' ? '预览区' : 'Preview')
const appearancePanelTitle = computed(() => locale.value === 'zh-CN' ? '外观' : 'Appearance')
const diagramPanelTitle = computed(() => locale.value === 'zh-CN' ? '图表' : 'Diagram')
const editorFontSizeLabel = computed(() => locale.value === 'zh-CN' ? '字号' : 'Font size')
const editorLetterSpacingLabel = computed(() => locale.value === 'zh-CN' ? '字间距' : 'Letter spacing')
const editorLineHeightLabel = computed(() => locale.value === 'zh-CN' ? '行高' : 'Line height')
const highlightCurrentLineLabel = computed(() => locale.value === 'zh-CN' ? '高亮当前行' : 'Highlight current line')
const previewFontSizeLabel = computed(() => locale.value === 'zh-CN' ? '预览字号' : 'Preview font size')
const previewLetterSpacingLabel = computed(() => locale.value === 'zh-CN' ? '字间距' : 'Letter spacing')
const paragraphSpacingLabel = computed(() => locale.value === 'zh-CN' ? '段落间距' : 'Paragraph spacing')
const compactToolbarLabel = computed(() => locale.value === 'zh-CN' ? '隐藏工具栏文案' : 'Icon-only toolbar')
const splitRatioLabel = computed(() => locale.value === 'zh-CN' ? '分栏比例' : 'Split ratio')
const resetSettingsLabel = computed(() => locale.value === 'zh-CN' ? '恢复默认' : 'Reset')
const mermaidWidthLabel = computed(() => locale.value === 'zh-CN' ? 'Mermaid 宽度' : 'Mermaid width')
const fitWidthLabel = computed(() => locale.value === 'zh-CN' ? '适应宽度' : 'Fit width')
const originalWidthLabel = computed(() => locale.value === 'zh-CN' ? '原始宽度' : 'Original width')
const scaleLabel = computed(() => locale.value === 'zh-CN' ? '缩放' : 'Scale')
const densityLabel = computed(() => locale.value === 'zh-CN' ? '密度' : 'Density')
const compactLabel = computed(() => locale.value === 'zh-CN' ? '紧凑' : 'Compact')
const standardLabel = computed(() => locale.value === 'zh-CN' ? '标准' : 'Standard')
const relaxedLabel = computed(() => locale.value === 'zh-CN' ? '宽松' : 'Relaxed')
const editorWideLabel = computed(() => locale.value === 'zh-CN' ? '55 / 45' : '55 / 45')
const balancedLabel = computed(() => locale.value === 'zh-CN' ? '50 / 50' : '50 / 50')
const previewWideLabel = computed(() => locale.value === 'zh-CN' ? '45 / 55' : '45 / 55')
const outlineTitle = computed(() => locale.value === 'zh-CN' ? '目录' : 'Outline')
const backToTopTitle = computed(() => {
    if (locale.value === 'zh-CN') {
        if (backToTopTarget.value === 'preview') return '回到顶部（预览）'
        if (backToTopTarget.value === 'editor') return '回到顶部（编辑器）'
        return '回到顶部'
    }
    if (backToTopTarget.value === 'both') return 'Back to top'
    if (backToTopTarget.value === 'preview') return 'Back to top (Preview)'
    if (backToTopTarget.value === 'editor') return 'Back to top (Editor)'
    return 'Back to top'
})
const placeholder = computed(() => isMarkdown.value ? t('canvas.editor.markdownPlaceholder') : t('canvas.editor.textPlaceholder'))
const slashMenuStyle = computed(() => ({ top: `${slashMenuPosition.value.top}px`, left: `${slashMenuPosition.value.left}px` }))
const editingUsers = computed(() => awareness.otherUsers.value.filter(user => user.selection?.includes(props.nodeId)))
const previewMermaidScalePresets = [EXPORT_PDF_MERMAID_SCALE_MIN, 80, 90, 100, EXPORT_PDF_MERMAID_SCALE_MAX]
const previewMermaidDensityOptions = computed<Array<{ id: ExportPdfMermaidDensity; label: string }>>(() => [
    { id: 'compact', label: compactLabel.value },
    { id: 'standard', label: standardLabel.value }
])
const editorLineHeightOptions = computed<Array<{ id: EditorLineHeightMode; label: string }>>(() => [
    { id: 'compact', label: compactLabel.value },
    { id: 'standard', label: standardLabel.value },
    { id: 'relaxed', label: relaxedLabel.value }
])
const previewParagraphSpacingOptions = computed<Array<{ id: PreviewParagraphSpacingMode; label: string }>>(() => [
    { id: 'compact', label: compactLabel.value },
    { id: 'standard', label: standardLabel.value },
    { id: 'relaxed', label: relaxedLabel.value }
])
const splitRatioOptions = computed<Array<{ id: SplitRatioMode; label: string }>>(() => [
    { id: 'editor-wide', label: editorWideLabel.value },
    { id: 'balanced', label: balancedLabel.value },
    { id: 'preview-wide', label: previewWideLabel.value }
])

const editorLineHeightValueMap: Record<EditorLineHeightMode, number> = {
    compact: 1.6,
    standard: 1.8,
    relaxed: 2.05
}

const previewParagraphSpacingValueMap: Record<PreviewParagraphSpacingMode, string> = {
    compact: '0.6em',
    standard: '0.85em',
    relaxed: '1.15em'
}

const previewLineHeightValueMap: Record<PreviewParagraphSpacingMode, number> = {
    compact: 1.6,
    standard: 1.8,
    relaxed: 2.02
}

const previewBlockGapValueMap: Record<PreviewParagraphSpacingMode, string> = {
    compact: '12px',
    standard: '18px',
    relaxed: '26px'
}

const splitRatioValueMap: Record<SplitRatioMode, { editor: string; preview: string }> = {
    'editor-wide': { editor: '55%', preview: '45%' },
    balanced: { editor: '50%', preview: '50%' },
    'preview-wide': { editor: '45%', preview: '55%' }
}

const searchButtonTitle = computed(() => locale.value === 'zh-CN' ? '查找（Ctrl+F）' : 'Find (Ctrl+F)')
const replaceButtonTitle = computed(() => locale.value === 'zh-CN' ? '替换（Ctrl+H）' : 'Replace (Ctrl+H)')
const searchPlaceholder = computed(() => locale.value === 'zh-CN' ? '搜索当前节点或整个房间' : 'Search this node or the whole room')
const replacePlaceholder = computed(() => locale.value === 'zh-CN' ? '替换为' : 'Replace with')
const searchCurrentLabel = computed(() => locale.value === 'zh-CN' ? '当前节点' : 'Current')
const searchRoomLabel = computed(() => locale.value === 'zh-CN' ? '整个房间' : 'Room')
const closeSearchLabel = computed(() => locale.value === 'zh-CN' ? '关闭搜索' : 'Close search')
const searchPrevLabel = computed(() => locale.value === 'zh-CN' ? '上一处' : 'Previous')
const searchNextLabel = computed(() => locale.value === 'zh-CN' ? '下一处' : 'Next')
const searchMatchCaseLabel = computed(() => locale.value === 'zh-CN' ? '区分大小写' : 'Match case')
const searchWholeWordLabel = computed(() => locale.value === 'zh-CN' ? '全字匹配' : 'Whole word')
const searchRegexLabel = computed(() => locale.value === 'zh-CN' ? '正则' : 'Regex')
const replaceLabel = computed(() => locale.value === 'zh-CN' ? '替换' : 'Replace')
const replaceAllLabel = computed(() => locale.value === 'zh-CN' ? '全部替换' : 'Replace all')
const roomReplaceHintLabel = computed(() => locale.value === 'zh-CN' ? '房间范围暂不支持替换' : 'Replace is only available in the current node')
const allNodeTypesLabel = computed(() => locale.value === 'zh-CN' ? '全部类型' : 'All types')

type SearchMatch = { start: number; end: number; text: string }

const trimmedSearchQuery = computed(() => searchQuery.value.trim())
const searchPatternError = computed(() => {
    if (!trimmedSearchQuery.value) return ''
    if (!searchUseRegex.value) return ''
    try {
        // eslint-disable-next-line no-new
        new RegExp(trimmedSearchQuery.value, searchMatchCase.value ? '' : 'i')
        return ''
    } catch (error) {
        return error instanceof Error ? error.message : 'Invalid regular expression'
    }
})

function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function escapeHtml(value: string) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

function createSearchRegExp(global = true) {
    const query = trimmedSearchQuery.value
    if (!query || searchPatternError.value) return null

    const source = searchUseRegex.value ? query : escapeRegExp(query)
    const wrappedSource = searchWholeWord.value ? `\\b(?:${source})\\b` : source
    const flags = `${global ? 'g' : ''}${searchMatchCase.value ? '' : 'i'}`

    try {
        return new RegExp(wrappedSource, flags)
    } catch {
        return null
    }
}

function collectMatches(content: string): SearchMatch[] {
    const regex = createSearchRegExp(true)
    if (!regex) return []

    const matches: SearchMatch[] = []
    let match: RegExpExecArray | null = regex.exec(content)

    while (match) {
        const text = match[0] ?? ''
        const start = match.index
        const end = start + text.length
        matches.push({ start, end, text })
        if (text.length === 0) {
            regex.lastIndex += 1
        }
        match = regex.exec(content)
    }

    return matches
}

function getNodeKindLabel(kind: string) {
    const meta = pluginRegistry.getMeta(kind)
    if (te(`canvas.nodeTypes.${kind}`)) return t(`canvas.nodeTypes.${kind}`)
    return meta?.label || kind
}

const currentSearchMatches = computed(() => collectMatches(localContent.value))

const hasCurrentSearchMatches = computed(() => currentSearchMatches.value.length > 0)

const roomSearchTypeOptions = computed(() => {
    pluginCatalogVersion.value

    const kindsInRoom = new Set(
        (props.allNodes || [])
            .map(node => node.content?.kind)
            .filter((kind): kind is string => Boolean(kind))
    )

    return [
        { value: 'all', label: allNodeTypesLabel.value },
        ...Array.from(kindsInRoom)
            .sort((left, right) => getNodeKindLabel(left).localeCompare(getNodeKindLabel(right), locale.value))
            .map(kind => ({
                value: kind,
                label: getNodeKindLabel(kind)
            }))
    ]
})

const selectedRoomSearchTypeLabel = computed(() => {
    const selected = roomSearchTypeOptions.value.find(option => option.value === roomSearchKindFilter.value)
    return selected?.label || allNodeTypesLabel.value
})

const filteredRoomSearchNodes = computed(() => {
    const selectedKind = roomSearchKindFilter.value
    return (props.allNodes || []).filter(node => (
        selectedKind === 'all' || (node.content?.kind || 'blank') === selectedKind
    ))
})

const currentSearchStatusLabel = computed(() => {
    if (!trimmedSearchQuery.value) {
        return locale.value === 'zh-CN' ? '输入关键词后可在当前节点中跳转' : 'Type to find matches in this node'
    }
    if (searchPatternError.value) {
        return locale.value === 'zh-CN' ? `正则无效：${searchPatternError.value}` : `Invalid regex: ${searchPatternError.value}`
    }
    if (!hasCurrentSearchMatches.value) {
        return locale.value === 'zh-CN' ? '当前节点无结果' : 'No matches in this node'
    }

    return locale.value === 'zh-CN'
        ? `${currentSearchIndex.value + 1} / ${currentSearchMatches.value.length}`
        : `${currentSearchIndex.value + 1} of ${currentSearchMatches.value.length}`
})

const roomSearchResults = computed<RoomSearchResult[]>(() => {
    if (!trimmedSearchQuery.value || searchPatternError.value) return []

    return filteredRoomSearchNodes.value
        .flatMap(node => {
            const data = String(node.content?.data || '')
            const matches = collectMatches(data)
            if (matches.length === 0) return []

            const lines = data.split('\n').map(line => line.trim()).filter(Boolean)
            const title = lines[0] || (locale.value === 'zh-CN' ? `节点 ${node.id.slice(-6)}` : `Node ${node.id.slice(-6)}`)
            const firstMatch = matches[0]!
            const matchIndex = firstMatch.start
            const snippetStart = Math.max(0, matchIndex - 24)
            const snippetEnd = Math.min(data.length, firstMatch.end + 36)
            const snippet = data.slice(snippetStart, snippetEnd).replace(/\s+/g, ' ').trim()
            const kind = node.content?.kind || 'blank'

            return [{
                nodeId: node.id,
                kind,
                kindLabel: getNodeKindLabel(kind),
                titleHtml: escapeHtml(title),
                snippet: snippet || title,
                matchIndex,
                matchCount: matches.length
            }]
        })
        .slice(0, 20)
})

const roomSearchStatusLabel = computed(() => {
    if (!trimmedSearchQuery.value) {
        return locale.value === 'zh-CN'
            ? `可搜索房间内${selectedRoomSearchTypeLabel.value}节点内容`
            : `Search across ${selectedRoomSearchTypeLabel.value.toLowerCase()} node contents in this room`
    }
    if (searchPatternError.value) {
        return locale.value === 'zh-CN' ? `正则无效：${searchPatternError.value}` : `Invalid regex: ${searchPatternError.value}`
    }
    if (roomSearchResults.value.length === 0) {
        return locale.value === 'zh-CN'
            ? `${selectedRoomSearchTypeLabel.value}节点中无结果`
            : `No ${selectedRoomSearchTypeLabel.value.toLowerCase()} matches in this room`
    }

    return locale.value === 'zh-CN'
        ? `在${selectedRoomSearchTypeLabel.value}节点中找到 ${roomSearchResults.value.length} 个结果，双击或回车可跳转`
        : `${roomSearchResults.value.length} matching ${selectedRoomSearchTypeLabel.value.toLowerCase()} nodes, double-click or press Enter to jump`
})

const editorTextareaStyle = computed(() => {
    const lineHeightMultiplier = editorLineHeightValueMap[editorLineHeightMode.value]
    const lineHeightPx = editorFontSize.value * lineHeightMultiplier
    const currentLineIndex = localContent.value.slice(0, editorSelectionStart.value).split('\n').length - 1
    const currentLineTop = 20 + (currentLineIndex * lineHeightPx) - editorScrollTop.value
    return {
        fontSize: `${editorFontSize.value}px`,
        letterSpacing: `${editorLetterSpacing.value.toFixed(2)}px`,
        lineHeight: lineHeightMultiplier.toString(),
        backgroundImage: highlightCurrentLine.value
            ? 'linear-gradient(90deg, rgba(96, 165, 250, 0.12), rgba(96, 165, 250, 0.04) 72%, rgba(96, 165, 250, 0))'
            : 'none',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: `0 ${Math.max(0, currentLineTop)}px`,
        backgroundSize: `100% ${lineHeightPx}px`,
        boxShadow: highlightCurrentLine.value ? `inset 3px 0 0 rgba(96, 165, 250, 0.42)` : 'none'
    }
})

const previewContentStyle = computed(() => ({
    fontSize: `${previewFontSize.value}px`,
    letterSpacing: `${previewLetterSpacing.value.toFixed(2)}px`,
    lineHeight: previewLineHeightValueMap[previewParagraphSpacing.value].toString(),
    '--preview-paragraph-spacing': previewParagraphSpacingValueMap[previewParagraphSpacing.value],
    '--preview-block-gap': previewBlockGapValueMap[previewParagraphSpacing.value]
}))

const editPaneStyle = computed(() => {
    if (!(showEditorPane.value && showPreviewPane.value) || forceSingleColumn.value) return undefined
    return { flexBasis: splitRatioValueMap[splitRatio.value].editor }
})

const previewPaneStyle = computed(() => {
    if (!(showEditorPane.value && showPreviewPane.value) || forceSingleColumn.value) return undefined
    return { flexBasis: splitRatioValueMap[splitRatio.value].preview }
})

function getToolbarDisplayIcon(action: ToolbarAction) {
    const iconMap: Record<string, string> = {
        h1: 'H1',
        h2: 'H2',
        bullet: '-',
        todo: '[ ]',
        quote: '""',
        code: '</>',
        math: 'fx',
        table: '[]',
        link: '@',
        flow: '->'
    }

    return iconMap[action.id] ?? action.icon ?? action.label
}

const remoteCursors = computed<RemoteCursor[]>(() => {
    if (!textareaRef.value) return []
    return awareness.otherUsers.value
        .filter(user => user.textCursor?.nodeId === props.nodeId)
        .map(user => {
            const position = user.textCursor?.position ?? 0
            const selectionEnd = user.textCursor?.selectionEnd ?? position
            const { top, left } = getCaretCoordinates(position)
            return {
                clientId: user.clientId,
                name: user.user.name,
                color: user.user.color,
                position,
                selectionEnd,
                style: { top: `${top}px`, left: `${left}px` },
                selectionWidth: Math.abs(selectionEnd - position)
            }
        })
})

const activeCodeFence = computed<CodeFenceContext | null>(() => {
    const textarea = textareaRef.value
    if (!textarea || !isMarkdown.value) return null

    const cursor = textarea.selectionStart
    const lines = localContent.value.split('\n')
    let offset = 0
    let openFence: CodeFenceContext | null = null

    for (const line of lines) {
        const lineStart = offset
        const lineEnd = offset + line.length
        const trimmed = line.trim()

        if (trimmed.startsWith('```')) {
            if (!openFence) {
                openFence = {
                    language: trimmed.slice(3).trim() || 'text',
                    lineStart,
                    lineEnd
                }
            } else if (cursor >= openFence.lineStart && cursor <= lineEnd) {
                return openFence
            } else {
                openFence = null
            }
        }

        if (openFence && cursor >= openFence.lineEnd + 1 && cursor <= lineEnd) {
            return openFence
        }

        offset = lineEnd + 1
    }

    return openFence && cursor >= openFence.lineEnd + 1 ? openFence : null
})

const rawBlocks = computed(() => splitMarkdownBlocks(localContent.value))

const editorBlockMetrics = computed<EditorBlockMetric[]>(() => {
    let cursor = 0
    return rawBlocks.value.map((block, index) => {
        const foundIndex = localContent.value.indexOf(block, cursor)
        const start = foundIndex === -1 ? cursor : foundIndex
        const end = start + block.length
        cursor = end
        const id = `preview-block-${index}-${hashText(block)}`
        const lineStart = getLineIndexForOffset(start)
        const lineEnd = getLineIndexForOffset(Math.max(start, end - 1))
        return {
            id,
            start,
            end,
            length: Math.max(1, end - start),
            lineStart,
            lineEnd,
            lineCount: Math.max(1, (lineEnd - lineStart) + 1)
        }
    })
})

const lineStartOffsets = computed(() => {
    const offsets = [0]
    for (let index = 0; index < localContent.value.length; index += 1) {
        if (localContent.value[index] === '\n') {
            offsets.push(index + 1)
        }
    }
    return offsets
})

function getLineIndexForOffset(offset: number) {
    const offsets = lineStartOffsets.value
    let low = 0
    let high = offsets.length - 1

    while (low <= high) {
        const mid = Math.floor((low + high) / 2)
        const lineStart = offsets[mid] ?? 0
        const nextLineStart = mid < offsets.length - 1 ? (offsets[mid + 1] ?? Number.POSITIVE_INFINITY) : Number.POSITIVE_INFINITY

        if (offset < lineStart) {
            high = mid - 1
            continue
        }

        if (offset >= nextLineStart) {
            low = mid + 1
            continue
        }

        return mid
    }

    return Math.max(0, offsets.length - 1)
}

const outlineItems = computed<OutlineItem[]>(() => {
    const items: OutlineItem[] = []
    rawBlocks.value.forEach((block, index) => {
        const match = block.match(/^(#{1,6})\s+(.+)$/m)
        if (!match) return
        const headingMarks = match[1] ?? ''
        const headingText = match[2] ?? ''
        const blockId = `preview-block-${index}-${hashText(block)}`
        items.push({
            id: `outline-${blockId}`,
            blockId,
            anchorId: `${blockId}-anchor`,
            text: stripMarkdownSyntax(headingText),
            level: headingMarks.length
        })
    })
    return items
})

const previewBlocks = computed<PreviewBlock[]>(() => {
    return rawBlocks.value.map((block, index) => {
        const id = `preview-block-${index}-${hashText(block)}`
        const isHeavy = isHeavyBlock(block)
        const shouldDefer = isHeavy && !visiblePreviewBlockIds.value.has(id) && !previewCache.has(block)
        const cachedHtml = shouldDefer ? null : touchPreviewCacheEntry(block)
        const html = shouldDefer
            ? ''
            : (cachedHtml ?? (() => {
                const rendered = renderMarkdown(block)
                touchPreviewCacheEntry(block, rendered)
                return rendered
            })())

        return {
            id,
            anchorId: `${id}-anchor`,
            raw: block,
            html,
            summary: summarizeBlock(block),
            isHeavy,
            isDeferred: shouldDefer
        }
    })
})

const activePreviewBlockId = computed(() => {
    if (!isMarkdown.value || editorBlockMetrics.value.length === 0) return ''
    const cursor = Math.min(localContent.value.length, Math.max(0, editorSelectionStart.value))
    const metric = editorBlockMetrics.value.find(block => cursor <= block.end) ?? editorBlockMetrics.value[editorBlockMetrics.value.length - 1]
    return metric?.id ?? ''
})

const toolbarActions = computed<ToolbarAction[]>(() => [
    { id: 'h1', label: 'H1', icon: 'H1', description: 'Insert heading 1', action: () => prependToCurrentLine('# ') },
    { id: 'h2', label: 'H2', icon: 'H2', description: 'Insert heading 2', action: () => prependToCurrentLine('## ') },
    { id: 'bullet', label: 'List', icon: 'UL', description: 'Insert bullet list', action: () => prependToCurrentLine('- ') },
    { id: 'todo', label: 'Todo', icon: 'TD', description: 'Insert checklist item', action: () => prependToCurrentLine('- [ ] ') },
    { id: 'quote', label: 'Quote', icon: 'QT', description: 'Insert quote block', action: () => prependToCurrentLine('> ') },
    { id: 'code', label: 'Code', icon: '</>', description: 'Insert fenced code block', action: () => insertSnippet('```\n\n```', 4) },
    { id: 'math', label: 'Math', icon: 'FX', description: 'Insert inline math', action: () => wrapSelection('$', '$', 'formula') },
    { id: 'table', label: 'Table', icon: 'TB', description: 'Insert markdown table', action: () => insertSnippet('| Col 1 | Col 2 |\n| --- | --- |\n| Item | Item |') },
    { id: 'link', label: 'Link', icon: 'URL', description: 'Wrap selection with a link', action: () => wrapSelection('[', '](https://)', 'text') },
    { id: 'flow', label: 'Flow', icon: '->', description: 'Insert mermaid flowchart', action: () => insertSnippet('```mermaid\nflowchart TD\n    A[Start] --> B{Decision}\n    B -->|Yes| C[Done]\n    B -->|No| D[Retry]\n```', 13) }
])

const slashCommands = computed<SlashCommand[]>(() => [
    { id: 'h1', icon: 'H1', label: t('canvas.editor.commands.h1'), description: t('canvas.editor.commands.h1Desc'), action: () => '# ' },
    { id: 'h2', icon: 'H2', label: t('canvas.editor.commands.h2'), description: t('canvas.editor.commands.h2Desc'), action: () => '## ' },
    { id: 'h3', icon: 'H3', label: t('canvas.editor.commands.h3'), description: t('canvas.editor.commands.h3Desc'), action: () => '### ' },
    { id: 'bullet', icon: 'UL', label: t('canvas.editor.commands.bullet'), description: t('canvas.editor.commands.bulletDesc'), action: () => '- ' },
    { id: 'numbered', icon: '1.', label: t('canvas.editor.commands.numbered'), description: t('canvas.editor.commands.numberedDesc'), action: () => '1. ' },
    { id: 'todo', icon: 'TD', label: t('canvas.editor.commands.todo'), description: t('canvas.editor.commands.todoDesc'), action: () => '- [ ] ' },
    { id: 'quote', icon: '"', label: t('canvas.editor.commands.quote'), description: t('canvas.editor.commands.quoteDesc'), action: () => '> ' },
    { id: 'divider', icon: '---', label: t('canvas.editor.commands.divider'), description: t('canvas.editor.commands.dividerDesc'), action: () => '\n---\n' },
    { id: 'code', icon: '<>', iconClass: 'code-icon', label: t('canvas.editor.commands.code'), description: t('canvas.editor.commands.codeDesc'), action: () => '```\n\n```' },
    { id: 'code-js', icon: 'JS', iconClass: 'lang-js', label: t('canvas.editor.commands.codeJs'), description: t('canvas.editor.commands.codeJsDesc'), action: () => '```javascript\n\n```' },
    { id: 'code-ts', icon: 'TS', iconClass: 'lang-ts', label: t('canvas.editor.commands.codeTs'), description: t('canvas.editor.commands.codeTsDesc'), action: () => '```typescript\n\n```' },
    { id: 'code-py', icon: 'PY', iconClass: 'lang-py', label: t('canvas.editor.commands.codePy'), description: t('canvas.editor.commands.codePyDesc'), action: () => '```python\n\n```' },
    { id: 'code-java', icon: 'J', label: t('canvas.editor.commands.codeJava'), description: t('canvas.editor.commands.codeJavaDesc'), action: () => '```java\n\n```' },
    { id: 'code-css', icon: '#', iconClass: 'lang-css', label: t('canvas.editor.commands.codeCss'), description: t('canvas.editor.commands.codeCssDesc'), action: () => '```css\n\n```' },
    { id: 'code-html', icon: '<>', iconClass: 'lang-html', label: t('canvas.editor.commands.codeHtml'), description: t('canvas.editor.commands.codeHtmlDesc'), action: () => '```html\n\n```' },
    { id: 'code-sql', icon: 'DB', label: t('canvas.editor.commands.codeSql'), description: t('canvas.editor.commands.codeSqlDesc'), action: () => '```sql\n\n```' },
    { id: 'code-sh', icon: '$', label: t('canvas.editor.commands.codeSh'), description: t('canvas.editor.commands.codeShDesc'), action: () => '```bash\n\n```' },
    { id: 'code-json', icon: '{}', label: t('canvas.editor.commands.codeJson'), description: t('canvas.editor.commands.codeJsonDesc'), action: () => '```json\n\n```' },
    { id: 'math', icon: 'FX', iconClass: 'math-icon', label: t('canvas.editor.commands.math'), description: t('canvas.editor.commands.mathDesc'), shortcut: '$...$', action: () => '$E = mc^2$' },
    { id: 'math-block', icon: 'INT', iconClass: 'math-icon', label: t('canvas.editor.commands.mathBlock'), description: t('canvas.editor.commands.mathBlockDesc'), shortcut: '$$...$$', action: () => '$$\n\\int_{a}^{b} f(x) dx\n$$' },
    { id: 'mermaid-flow', icon: 'Flow', label: t('canvas.editor.commands.flowchart'), description: t('canvas.editor.commands.flowchartDesc'), action: () => '```mermaid\nflowchart TD\n    A[Start] --> B{Decision}\n    B -->|Yes| C[Done]\n    B -->|No| D[Retry]\n```' },
    { id: 'mermaid-seq', icon: 'Seq', label: t('canvas.editor.commands.sequence'), description: t('canvas.editor.commands.sequenceDesc'), action: () => '```mermaid\nsequenceDiagram\n    Alice->>Bob: Hello\n    Bob-->>Alice: Hi\n```' },
    { id: 'mermaid-mindmap', icon: 'Map', label: t('canvas.editor.commands.mindmap'), description: t('canvas.editor.commands.mindmapDesc'), action: () => '```mermaid\nmindmap\n  root((Topic))\n    Branch One\n      Detail A\n      Detail B\n```' },
    { id: 'mermaid-class', icon: 'Cls', label: t('canvas.editor.commands.mermaidClass'), description: t('canvas.editor.commands.mermaidClassDesc'), action: () => '```mermaid\nclassDiagram\n    class Animal {\n      +String name\n      +eat()\n    }\n    class Dog {\n      +bark()\n    }\n    Animal <|-- Dog\n```' },
    { id: 'mermaid-state', icon: 'State', label: t('canvas.editor.commands.mermaidState'), description: t('canvas.editor.commands.mermaidStateDesc'), action: () => '```mermaid\nstateDiagram-v2\n    [*] --> Idle\n    Idle --> Loading: Fetch\n    Loading --> Success: Done\n    Loading --> Error: Fail\n    Error --> Idle: Retry\n```' },
    { id: 'mermaid-er', icon: 'ER', label: t('canvas.editor.commands.mermaidEr'), description: t('canvas.editor.commands.mermaidErDesc'), action: () => '```mermaid\nerDiagram\n    USER ||--o{ ORDER : places\n    USER {\n      string id\n      string email\n    }\n    ORDER {\n      string id\n      float total\n    }\n```' },
    { id: 'mermaid-gantt', icon: 'Plan', label: t('canvas.editor.commands.mermaidGantt'), description: t('canvas.editor.commands.mermaidGanttDesc'), action: () => '```mermaid\ngantt\n    title Product Launch\n    dateFormat  YYYY-MM-DD\n    section Design\n    Wireframes    :done,    des1, 2026-03-01,2026-03-03\n    Review        :active,  des2, 2026-03-04, 3d\n    section Build\n    API           :         dev1, after des2, 4d\n    UI Polish     :         dev2, after dev1, 3d\n```' },
    { id: 'mermaid-journey', icon: 'Path', label: t('canvas.editor.commands.mermaidJourney'), description: t('canvas.editor.commands.mermaidJourneyDesc'), action: () => '```mermaid\njourney\n    title User onboarding\n    section Discover\n      Visit homepage: 4: User\n      Read product story: 5: User\n    section Activate\n      Create account: 3: User\n      Finish setup: 4: User\n```' },
    { id: 'mermaid-pie', icon: 'Pie', label: t('canvas.editor.commands.mermaidPie'), description: t('canvas.editor.commands.mermaidPieDesc'), action: () => '```mermaid\npie title Traffic sources\n    \"Organic\" : 42\n    \"Direct\" : 23\n    \"Social\" : 18\n    \"Email\" : 17\n```' },
    { id: 'mermaid-gitgraph', icon: 'Git', label: t('canvas.editor.commands.mermaidGitGraph'), description: t('canvas.editor.commands.mermaidGitGraphDesc'), action: () => '```mermaid\ngitGraph\n    commit id: \"init\"\n    branch feature\n    checkout feature\n    commit id: \"editor\"\n    checkout main\n    merge feature\n```' },
    { id: 'mermaid-timeline', icon: 'Time', label: t('canvas.editor.commands.mermaidTimeline'), description: t('canvas.editor.commands.mermaidTimelineDesc'), action: () => '```mermaid\ntimeline\n    title Product Evolution\n    2023 : Idea\n         : First prototype\n    2024 : Private beta\n         : Team rollout\n    2025 : Public launch\n```' },
    { id: 'mermaid-quadrant', icon: 'Quad', label: t('canvas.editor.commands.mermaidQuadrant'), description: t('canvas.editor.commands.mermaidQuadrantDesc'), action: () => '```mermaid\nquadrantChart\n    title Feature Prioritization\n    x-axis Low effort --> High effort\n    y-axis Low impact --> High impact\n    quadrant-1 Quick wins\n    quadrant-2 Big bets\n    quadrant-3 Fill-ins\n    quadrant-4 Time sinks\n    \"Search\" : [0.32, 0.82]\n    \"Sync\" : [0.76, 0.88]\n    \"Themes\" : [0.24, 0.42]\n    \"Import\" : [0.81, 0.26]\n```' },
    { id: 'mermaid-requirement', icon: 'Req', label: t('canvas.editor.commands.mermaidRequirement'), description: t('canvas.editor.commands.mermaidRequirementDesc'), action: () => '```mermaid\nrequirementDiagram\n    requirement user_auth {\n      id: 1\n      text: User signs in securely\n      risk: medium\n      verifymethod: test\n    }\n    requirement session_persist {\n      id: 2\n      text: Session survives app restart\n      risk: low\n      verifymethod: analysis\n    }\n    element web_app {\n      type: application\n    }\n    web_app - satisfies -> user_auth\n    web_app - satisfies -> session_persist\n```' },
    { id: 'bold', icon: 'B', iconClass: 'bold-icon', label: t('canvas.editor.commands.bold'), description: t('canvas.editor.commands.boldDesc'), action: () => `**${t('canvas.editor.examples.bold')}**` },
    { id: 'italic', icon: 'I', iconClass: 'italic-icon', label: t('canvas.editor.commands.italic'), description: t('canvas.editor.commands.italicDesc'), action: () => `*${t('canvas.editor.examples.italic')}*` },
    { id: 'strike', icon: 'S', iconClass: 'strike-icon', label: t('canvas.editor.commands.strike'), description: t('canvas.editor.commands.strikeDesc'), action: () => `~~${t('canvas.editor.examples.strikethrough')}~~` },
    { id: 'link', icon: 'URL', label: t('canvas.editor.commands.link'), description: t('canvas.editor.commands.linkDesc'), action: () => `[${t('canvas.editor.examples.text')}](${t('canvas.editor.examples.url')})` },
    { id: 'image', icon: 'IMG', label: t('canvas.editor.commands.image'), description: t('canvas.editor.commands.imageDesc'), action: () => `![${t('canvas.editor.examples.description')}](${t('canvas.editor.examples.url')})` },
    { id: 'table', icon: 'TB', label: t('canvas.editor.commands.table'), description: t('canvas.editor.commands.tableDesc'), action: () => `| ${t('canvas.editor.examples.col1')} | ${t('canvas.editor.examples.col2')} | ${t('canvas.editor.examples.col3')} |\n| --- | --- | --- |\n| ${t('canvas.editor.examples.content')} | ${t('canvas.editor.examples.content')} | ${t('canvas.editor.examples.content')} |` }
])

const filteredCommands = computed(() => {
    if (!slashQuery.value) return slashCommands.value
    const query = slashQuery.value.toLowerCase()
    return slashCommands.value.filter(command => command.label.toLowerCase().includes(query) || command.id.toLowerCase().includes(query) || command.description.toLowerCase().includes(query))
})

function getCaretCoordinates(position: number): { top: number; left: number } {
    const textarea = textareaRef.value
    if (!textarea) return { top: 0, left: 0 }
    const safePosition = Math.max(0, Math.min(position, textarea.value.length))
    const text = textarea.value.slice(0, safePosition)
    const lines = text.split('\n')
    const lineIndex = Math.max(0, lines.length - 1)
    const currentLine = lines[lineIndex] ?? ''
    return {
        top: lineIndex * 27 + 20,
        left: currentLine.length * 9 + 20
    }
}

function getLineRange(value: string, index: number): { start: number; end: number; text: string } {
    const start = value.lastIndexOf('\n', index - 1) + 1
    const endIndex = value.indexOf('\n', index)
    const end = endIndex === -1 ? value.length : endIndex
    return { start, end, text: value.slice(start, end) }
}

function setEditorValue(value: string, selectionStart?: number, selectionEnd?: number) {
    if (isReadOnly.value) return
    localContent.value = value
    emit('update', props.nodeId, value)
    nextTick(() => {
        const textarea = textareaRef.value
        if (!textarea) return
        textarea.value = value
        if (typeof selectionStart === 'number') {
            textarea.setSelectionRange(selectionStart, selectionEnd ?? selectionStart)
        }
        checkSlashCommand(textarea)
        handleCursorChange()
        textarea.focus()
    })
}

function insertSnippet(snippet: string, cursorOffsetFromStart?: number) {
    const textarea = textareaRef.value
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const value = localContent.value
    const nextValue = `${value.slice(0, start)}${snippet}${value.slice(end)}`
    const nextCursor = cursorOffsetFromStart === undefined ? start + snippet.length : start + cursorOffsetFromStart
    setEditorValue(nextValue, nextCursor)
}

function wrapSelection(prefix: string, suffix: string, placeholderText = '') {
    const textarea = textareaRef.value
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const value = localContent.value
    const selected = value.slice(start, end) || placeholderText
    const nextValue = `${value.slice(0, start)}${prefix}${selected}${suffix}${value.slice(end)}`
    const selectionStart = start + prefix.length
    const selectionEnd = selectionStart + selected.length
    setEditorValue(nextValue, selectionStart, selectionEnd)
}

function prependToCurrentLine(prefix: string) {
    const textarea = textareaRef.value
    if (!textarea) return
    const start = textarea.selectionStart
    const range = getLineRange(localContent.value, start)
    const nextValue = `${localContent.value.slice(0, range.start)}${prefix}${range.text}${localContent.value.slice(range.end)}`
    setEditorValue(nextValue, start + prefix.length)
}

function handleInput(event: Event) {
    if (isReadOnly.value) return
    const target = event.target as HTMLTextAreaElement
    localContent.value = target.value
    emit('update', props.nodeId, target.value)
    checkSlashCommand(target)
    handleCursorChange()
}

function triggerImport() {
    if (isReadOnly.value) return
    if (!canImportDocument.value) {
        toast.error(t('canvas.editor.importUnsupported'))
        return
    }
    importInputRef.value?.click()
}

function resetImportInput() {
    if (importInputRef.value) {
        importInputRef.value.value = ''
    }
}

async function handleImportFileChange(event: Event) {
    if (isReadOnly.value) {
        resetImportInput()
        return
    }
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]

    if (!file) {
        resetImportInput()
        return
    }

    const lowerName = file.name.toLowerCase()
    const supportedExtensions = ['.txt', '.md', '.markdown', '.mdown', '.mkd']
    const hasSupportedExtension = supportedExtensions.some(extension => lowerName.endsWith(extension))

    if (!hasSupportedExtension) {
        toast.error(t('canvas.editor.importInvalidType'))
        resetImportInput()
        return
    }

    try {
        const text = (await file.text()).replace(/^\uFEFF/, '')
        setEditorValue(text, 0, 0)
        toast.success(t('canvas.editor.importSuccess', { name: file.name }))
    } catch (error) {
        console.error('[NodeEditorModal] Document import failed:', error)
        toast.error(t('canvas.editor.importFailed'))
    } finally {
        resetImportInput()
    }
}

function syncPreviewFromEditor() {
    if (restoringPreviewSession) return
    const textarea = textareaRef.value
    const preview = previewRef.value
    if (!textarea || !preview) return
    const metrics = editorBlockMetrics.value
    if (metrics.length === 0) return
    pendingEditorScrollTop = textarea.scrollTop
    if (previewSyncFrame !== null) return
    previewSyncFrame = requestAnimationFrame(() => {
        const lineHeight = 27
        const totalLines = Math.max(1, lineStartOffsets.value.length)
        const anchorLine = Math.max(0, Math.min(
            totalLines - 1,
            Math.floor((pendingEditorScrollTop + (textarea.clientHeight * 0.24)) / lineHeight)
        ))
        let safeBlockIndex = metrics.findIndex(metric => anchorLine <= metric.lineEnd)
        if (safeBlockIndex === -1) safeBlockIndex = metrics.length - 1
        const currentMetric = metrics[safeBlockIndex]
        if (!currentMetric) {
            previewSyncFrame = null
            return
        }
        const currentElement = preview.querySelector<HTMLElement>(`[data-preview-block-id="${currentMetric.id}"]`)
        if (!currentElement) {
            previewSyncFrame = null
            return
        }

        const blockProgress = Math.min(1, Math.max(
            0,
            (anchorLine - currentMetric.lineStart) / Math.max(1, currentMetric.lineCount)
        ))
        const currentTop = currentElement.offsetTop
        const currentHeight = currentElement.offsetHeight
        const nextMetric = safeBlockIndex < metrics.length - 1 ? metrics[safeBlockIndex + 1] : undefined
        const nextElement = safeBlockIndex < metrics.length - 1
            ? preview.querySelector<HTMLElement>(`[data-preview-block-id="${nextMetric?.id ?? ''}"]`)
            : null
        const nextTop = nextElement?.offsetTop ?? (currentTop + currentHeight)
        const interpolatedTop = currentTop + ((nextTop - currentTop) * blockProgress)
        const targetScrollTop = Math.max(0, interpolatedTop - PREVIEW_TOP_SPACER_PX - (preview.clientHeight * 0.2))
        syncingSource = 'editor'
        preview.scrollTop = Math.round(targetScrollTop)
        updateActiveOutline()
        previewSyncFrame = null
        window.setTimeout(() => {
            if (syncingSource === 'editor') syncingSource = null
        }, 24)
    })
}

function updateActiveOutline() {
    const preview = previewRef.value
    if (!preview || outlineItems.value.length === 0) {
        activeOutlineId.value = ''
        return
    }

    const previewRect = preview.getBoundingClientRect()
    let nextActive = outlineItems.value[0]?.id ?? ''
    let bestDistance = Number.POSITIVE_INFINITY

    for (const item of outlineItems.value) {
        const element = preview.querySelector<HTMLElement>(`#${item.anchorId}`)
        if (!element) continue
        const distance = Math.abs(element.getBoundingClientRect().top - previewRect.top - 28)
        if (element.getBoundingClientRect().top - previewRect.top <= 48 && distance < bestDistance) {
            bestDistance = distance
            nextActive = item.id
        }
    }

    if (bestDistance === Number.POSITIVE_INFINITY) {
        const firstVisible = outlineItems.value.find(item => {
            const element = preview.querySelector<HTMLElement>(`#${item.anchorId}`)
            return element ? element.getBoundingClientRect().bottom > previewRect.top + 48 : false
        })
        nextActive = firstVisible?.id ?? nextActive
    }

    activeOutlineId.value = nextActive
}

function handlePreviewScroll() {
    const preview = previewRef.value
    previewScrollTop.value = preview?.scrollTop ?? 0
    updateActiveOutline()
    persistPreviewSessionState()
}

function handleWorkspacePointerDown(event: PointerEvent) {
    const target = event.target
    if (!(target instanceof HTMLElement)) return
    if (outlineOpen.value && !target.closest('.outline-floating-shell')) {
        outlineOpen.value = false
    }
    if (isPreviewSettingsOpen.value && !target.closest('.editor-settings-shell')) {
        isPreviewSettingsOpen.value = false
    }
}

function requestPreviewRealignment() {
    if (restoringPreviewSession) return
    if (!showEditorPane.value || !showPreviewPane.value) return
    if (previewRealignFrame !== null) return
    previewRealignFrame = requestAnimationFrame(() => {
        previewRealignFrame = null
        syncPreviewFromEditor()
    })
}

function setupPreviewBlockResizeObserver() {
    previewBlockResizeObserver?.disconnect()
    previewBlockResizeObserver = null

    if (typeof ResizeObserver === 'undefined') return
    const preview = previewRef.value
    if (!preview) return

    previewBlockResizeObserver = new ResizeObserver((entries) => {
        if (entries.length === 0) return
        requestPreviewRealignment()
    })

    preview.querySelectorAll<HTMLElement>('[data-preview-block-id]').forEach((element) => {
        previewBlockResizeObserver?.observe(element)
    })
}

function handleEditorScroll() {
    const textarea = textareaRef.value
    editorScrollTop.value = textarea?.scrollTop ?? 0
    if (!restoringPreviewSession) {
        syncPreviewFromEditor()
    }
    persistPreviewSessionState()
}

function markEditorIntent() {
    // Keep editor interactions explicit even though preview no longer drives editor scroll.
}

function markPreviewIntent() {
    // Preview is now read-follow by default; clicking can still trigger explicit jumps.
}

function handleBackToTop() {
    const target = backToTopTarget.value
    if (target === 'none') return

    if (target === 'editor' || target === 'both') {
        const textarea = textareaRef.value
        if (textarea) {
            animateScrollTop(textarea, 0, 260)
            editorScrollTop.value = 0
        }
    }

    if (target === 'preview' || target === 'both') {
        const preview = previewRef.value
        if (preview) {
            animateScrollTop(preview, 0, 260)
            previewScrollTop.value = 0
            updateActiveOutline()
        }
    }
}

function createImageFallback(img: HTMLImageElement) {
    if (img.nextElementSibling?.classList.contains('preview-image-fallback')) return
    const fallback = document.createElement('div')
    fallback.className = 'preview-image-fallback'
    const alt = img.getAttribute('alt')?.trim()
    fallback.innerHTML = `
        <span class="preview-image-fallback-badge">Image unavailable</span>
        <strong>${markdownUtils.escapeHtml(alt || 'Unable to load image')}</strong>
        <span>${markdownUtils.escapeHtml(img.currentSrc || img.src || '')}</span>
    `
    img.insertAdjacentElement('afterend', fallback)
}

function decoratePreviewImages() {
    const preview = previewRef.value
    if (!preview) return

    preview.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
        if (!img.dataset.previewEnhanced) {
            img.dataset.previewEnhanced = 'true'
            img.loading = 'lazy'
            img.referrerPolicy = 'no-referrer'
            img.addEventListener('load', () => {
                img.classList.remove('is-error')
                img.nextElementSibling?.classList.contains('preview-image-fallback') && img.nextElementSibling.remove()
                requestPreviewRealignment()
            })
            img.addEventListener('error', () => {
                img.classList.add('is-error')
                createImageFallback(img)
                requestPreviewRealignment()
            })
        }

        if (img.complete && img.naturalWidth === 0) {
            img.classList.add('is-error')
            createImageFallback(img)
            requestPreviewRealignment()
        }
    })
}

function closeImagePreview() {
    activeImagePreview.value = null
}

function readStoredViewMode(): EditorViewMode {
    if (!isMarkdown.value) return 'edit'
    try {
        const stored = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY)
        if (stored === 'edit' || stored === 'split' || stored === 'preview') {
            return stored
        }
    } catch {}
    return 'split'
}

function readStoredPreviewMermaidSettings() {
    try {
        const raw = window.localStorage.getItem(PREVIEW_MERMAID_SETTINGS_STORAGE_KEY)
        if (!raw) return
        const parsed = JSON.parse(raw) as {
            scaleMode?: PreviewMermaidScaleMode
            scalePercent?: number
            density?: ExportPdfMermaidDensity
        }

        if (parsed.scaleMode === 'fit-width' || parsed.scaleMode === 'native') {
            previewMermaidScaleMode.value = parsed.scaleMode
        }

        if (typeof parsed.scalePercent === 'number') {
            previewMermaidScalePercent.value = Math.min(
                EXPORT_PDF_MERMAID_SCALE_MAX,
                Math.max(EXPORT_PDF_MERMAID_SCALE_MIN, Math.round(parsed.scalePercent))
            )
        }

        if (parsed.density === 'compact' || parsed.density === 'standard') {
            previewMermaidDensity.value = parsed.density
        }
    } catch {}
}

function readStoredEditorSettings() {
    try {
        const raw = window.localStorage.getItem(EDITOR_SETTINGS_STORAGE_KEY)
        if (!raw) return
        const parsed = JSON.parse(raw) as {
            editorFontSize?: number
            editorLetterSpacing?: number
            editorLineHeightMode?: EditorLineHeightMode
            highlightCurrentLine?: boolean
            previewFontSize?: number
            previewLetterSpacing?: number
            previewParagraphSpacing?: PreviewParagraphSpacingMode
            compactToolbar?: boolean
            splitRatio?: SplitRatioMode
        }

        if (typeof parsed.editorFontSize === 'number') {
            editorFontSize.value = Math.min(22, Math.max(13, Math.round(parsed.editorFontSize)))
        }
        if (typeof parsed.editorLetterSpacing === 'number') {
            editorLetterSpacing.value = Math.min(1.5, Math.max(0, Number(parsed.editorLetterSpacing)))
        }
        if (parsed.editorLineHeightMode && parsed.editorLineHeightMode in editorLineHeightValueMap) {
            editorLineHeightMode.value = parsed.editorLineHeightMode
        }
        if (typeof parsed.highlightCurrentLine === 'boolean') {
            highlightCurrentLine.value = parsed.highlightCurrentLine
        }
        if (typeof parsed.previewFontSize === 'number') {
            previewFontSize.value = Math.min(22, Math.max(13, Math.round(parsed.previewFontSize)))
        }
        if (typeof parsed.previewLetterSpacing === 'number') {
            previewLetterSpacing.value = Math.min(1.5, Math.max(0, Number(parsed.previewLetterSpacing)))
        }
        if (parsed.previewParagraphSpacing && parsed.previewParagraphSpacing in previewParagraphSpacingValueMap) {
            previewParagraphSpacing.value = parsed.previewParagraphSpacing
        }
        if (typeof parsed.compactToolbar === 'boolean') {
            compactToolbar.value = parsed.compactToolbar
        }
        if (parsed.splitRatio && parsed.splitRatio in splitRatioValueMap) {
            splitRatio.value = parsed.splitRatio
        }
    } catch {}
}

function persistEditorSettings() {
    try {
        window.localStorage.setItem(EDITOR_SETTINGS_STORAGE_KEY, JSON.stringify({
            editorFontSize: editorFontSize.value,
            editorLetterSpacing: editorLetterSpacing.value,
            editorLineHeightMode: editorLineHeightMode.value,
            highlightCurrentLine: highlightCurrentLine.value,
            previewFontSize: previewFontSize.value,
            previewLetterSpacing: previewLetterSpacing.value,
            previewParagraphSpacing: previewParagraphSpacing.value,
            compactToolbar: compactToolbar.value,
            splitRatio: splitRatio.value
        }))
    } catch {}
}

function resetEditorSettings() {
    editorFontSize.value = 15
    editorLetterSpacing.value = 0
    editorLineHeightMode.value = 'standard'
    highlightCurrentLine.value = false
    previewFontSize.value = 15
    previewLetterSpacing.value = 0
    previewParagraphSpacing.value = 'standard'
    compactToolbar.value = false
    splitRatio.value = 'balanced'
}

function getPreviewMermaidSvgSize(svg: SVGSVGElement) {
    const viewBox = svg.viewBox?.baseVal
    if (viewBox?.width && viewBox?.height) {
        return { width: viewBox.width, height: viewBox.height }
    }

    const width = Number(svg.getAttribute('width')) || svg.getBoundingClientRect().width || svg.clientWidth || 0
    const height = Number(svg.getAttribute('height')) || svg.getBoundingClientRect().height || svg.clientHeight || 0
    return { width, height }
}

function getPreviewMermaidNaturalSize(svg: SVGSVGElement) {
    const viewBox = svg.viewBox?.baseVal
    if (viewBox?.width && viewBox?.height) {
        return { width: viewBox.width, height: viewBox.height }
    }

    const widthAttr = Number.parseFloat(svg.getAttribute('width') || '')
    const heightAttr = Number.parseFloat(svg.getAttribute('height') || '')
    return {
        width: Number.isFinite(widthAttr) ? widthAttr : 0,
        height: Number.isFinite(heightAttr) ? heightAttr : 0
    }
}

function getPreviewMermaidAvailableWidth(wrapper: HTMLElement, preview: HTMLElement) {
    const wrapperStyle = window.getComputedStyle(wrapper)
    const previewStyle = window.getComputedStyle(preview)
    const wrapperPaddingX = (Number.parseFloat(wrapperStyle.paddingLeft) || 0) + (Number.parseFloat(wrapperStyle.paddingRight) || 0)
    const previewPaddingX = (Number.parseFloat(previewStyle.paddingLeft) || 0) + (Number.parseFloat(previewStyle.paddingRight) || 0)
    const previewWidth = preview.clientWidth - previewPaddingX
    const wrapperWidth = wrapper.clientWidth - wrapperPaddingX
    return Math.max(1, Math.max(wrapperWidth, previewWidth))
}

function applyPreviewMermaidSettings() {
    const preview = previewRef.value
    if (!preview) return

    preview.style.setProperty('--preview-mermaid-padding-top', previewMermaidDensity.value === 'compact' ? '38px' : '44px')
    preview.style.setProperty('--preview-mermaid-padding-side', previewMermaidDensity.value === 'compact' ? '18px' : '24px')
    preview.style.setProperty('--preview-mermaid-padding-bottom', previewMermaidDensity.value === 'compact' ? '18px' : '24px')
    preview.style.setProperty('--preview-mermaid-margin', previewMermaidDensity.value === 'compact' ? '1.25em 0' : '1.6em 0')

    const wrappers = preview.querySelectorAll<HTMLElement>('.mermaid-wrapper')
    wrappers.forEach((wrapper) => {
        const svg = wrapper.querySelector<SVGSVGElement>('svg')
        if (!svg) return
        wrapper.classList.remove('is-wide-mermaid')
        svg.style.removeProperty('width')
        svg.style.removeProperty('height')
        svg.style.removeProperty('max-width')
        svg.style.removeProperty('min-width')
        svg.style.removeProperty('transform')
        svg.style.removeProperty('transform-origin')

        const naturalSize = getPreviewMermaidNaturalSize(svg)
        const measuredSize = getPreviewMermaidSvgSize(svg)
        const width = naturalSize.width || measuredSize.width
        const height = naturalSize.height || measuredSize.height
        if (!width || !height) return

        const availableWidth = getPreviewMermaidAvailableWidth(wrapper, preview)
        const baseScale = previewMermaidScalePercent.value / 100
        const widthScale = availableWidth / width
        const scaledNaturalWidth = Math.max(1, width * baseScale)
        const scaledNaturalHeight = Math.max(1, height * baseScale)
        const fitScale = Math.min(widthScale, 1) * baseScale
        const fittedWidth = Math.max(1, width * fitScale)
        const fittedHeight = Math.max(1, height * fitScale)
        if (previewMermaidScaleMode.value === 'fit-width') {
            svg.style.width = `${fittedWidth}px`
            svg.style.height = `${fittedHeight}px`
            svg.style.maxWidth = 'none'
            return
        }

        wrapper.classList.add('is-wide-mermaid')
        svg.style.width = `${scaledNaturalWidth}px`
        svg.style.height = `${scaledNaturalHeight}px`
        svg.style.maxWidth = 'none'
        svg.style.minWidth = `${scaledNaturalWidth}px`
    })
}

function updateLayoutMode() {
    const width = editorContainerRef.value?.clientWidth ?? window.innerWidth
    forceSingleColumn.value = width < SINGLE_COLUMN_BREAKPOINT
    applyPreviewMermaidSettings()
}

function animateScrollTop(element: HTMLElement, targetScrollTop: number, duration = 220) {
    const start = element.scrollTop
    const delta = targetScrollTop - start
    if (Math.abs(delta) < 1) {
        element.scrollTop = targetScrollTop
        return
    }

    const startTime = performance.now()
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

    const step = (now: number) => {
        const progress = Math.min(1, (now - startTime) / duration)
        element.scrollTop = start + (delta * easeOutCubic(progress))
        if (progress < 1) {
            requestAnimationFrame(step)
        }
    }

    requestAnimationFrame(step)
}

function focusEditorAtOffset(offset: number) {
    const textarea = textareaRef.value
    if (!textarea) return

    const safeOffset = Math.max(0, Math.min(localContent.value.length, offset))
    const lineHeight = 27
    const lineIndex = localContent.value.slice(0, safeOffset).split('\n').length - 1
    const targetScrollTop = Math.max(0, (lineIndex * lineHeight) - (textarea.clientHeight * 0.28))

    textarea.focus()
    textarea.setSelectionRange(safeOffset, safeOffset)
    animateScrollTop(textarea, targetScrollTop)
    editorSelectionStart.value = safeOffset
    awareness.updateTextCursor?.(props.nodeId, safeOffset, safeOffset)
    window.setTimeout(() => {
        syncPreviewFromEditor()
    }, 40)
}

function focusEditorAtBlock(blockId: string) {
    const metric = editorBlockMetrics.value.find(item => item.id === blockId)
    if (!metric) return
    focusEditorAtOffset(metric.start)
}

function handleOverlayPointerMove(event: MouseEvent) {
    outlineHintActive.value = event.clientX <= 120
}

function handleOverlayPointerLeave() {
    outlineHintActive.value = false
}

function handlePreviewClick(event: MouseEvent) {
    const target = event.target as HTMLElement | null
    const image = target?.closest('img') as HTMLImageElement | null
    if (image && !image.classList.contains('is-error')) {
        activeImagePreview.value = {
            src: image.currentSrc || image.src,
            alt: image.alt || ''
        }
        nextTick(() => imageLightboxRef.value?.focus())
        return
    }

    const anchor = target?.closest('a[href]') as HTMLAnchorElement | null
    if (anchor) {
        event.preventDefault()
        const href = anchor.href
        if (!href) return
        if (window.electron?.openExternal) {
            window.electron.openExternal(href)
            return
        }
        window.open(href, '_blank', 'noopener,noreferrer')
        return
    }

    const blockElement = target?.closest<HTMLElement>('[data-preview-block-id]')
    const blockId = blockElement?.dataset.previewBlockId
    if (!blockId) return

    focusEditorAtBlock(blockId)
}

function handlePaste(event: ClipboardEvent) {
    if (isReadOnly.value) return
    if (!isMarkdown.value || !textareaRef.value) return
    const clipboardText = event.clipboardData?.getData('text/plain')?.trim()
    if (!clipboardText) return
    const textarea = textareaRef.value
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = localContent.value.slice(start, end)

    if (/^https?:\/\//i.test(clipboardText) && selected) {
        event.preventDefault()
        const nextValue = `${localContent.value.slice(0, start)}[${selected}](${clipboardText})${localContent.value.slice(end)}`
        setEditorValue(nextValue, start + 1, start + 1 + selected.length)
        return
    }

    if (!selected && clipboardText.includes('\n') && /[{};<>]/.test(clipboardText)) {
        event.preventDefault()
        const snippet = `\`\`\`\n${clipboardText}\n\`\`\``
        setEditorValue(`${localContent.value.slice(0, start)}${snippet}${localContent.value.slice(end)}`, start + 4)
    }
}

function handleSelection() {
    handleCursorChange()
}

function handleCursorChange() {
    const textarea = textareaRef.value
    if (!textarea) return
    editorSelectionStart.value = textarea.selectionStart
    awareness.updateTextCursor?.(props.nodeId, textarea.selectionStart, textarea.selectionEnd)
    syncPreviewFromEditor()
}

function checkSlashCommand(textarea: HTMLTextAreaElement) {
    const cursorPos = textarea.selectionStart
    const textBefore = textarea.value.slice(0, cursorPos)
    const lastSlashIndex = textBefore.lastIndexOf('/')
    if (lastSlashIndex !== -1) {
        const charBefore = lastSlashIndex > 0 ? textBefore[lastSlashIndex - 1] : '\n'
        if (charBefore === ' ' || charBefore === '\n' || lastSlashIndex === 0) {
            const query = textBefore.slice(lastSlashIndex + 1)
            if (!query.includes(' ') && !query.includes('\n')) {
                slashQuery.value = query
                slashStartPosition.value = lastSlashIndex
                selectedCommandIndex.value = 0
                showSlashMenu.value = true
                const rect = textarea.getBoundingClientRect()
                slashMenuPosition.value = {
                    top: Math.min(108, rect.height - 360),
                    left: 20
                }
                return
            }
        }
    }
    showSlashMenu.value = false
    slashQuery.value = ''
}

function handleTabIndent(event: KeyboardEvent): boolean {
    const textarea = textareaRef.value
    if (!textarea) return false
    event.preventDefault()
    const value = localContent.value
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    const lineEndIndex = value.indexOf('\n', end)
    const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex
    const selectedText = value.slice(lineStart, lineEnd)
    const lines = selectedText.split('\n')

    if (event.shiftKey) {
        const updatedLines = lines.map(line => line.replace(/^ {1,2}/, ''))
        const removedChars = lines.reduce((total, line) => total + (line.match(/^ {1,2}/)?.[0].length ?? 0), 0)
        const nextValue = `${value.slice(0, lineStart)}${updatedLines.join('\n')}${value.slice(lineEnd)}`
        setEditorValue(nextValue, Math.max(lineStart, start - Math.min(2, start - lineStart)), Math.max(lineStart, end - removedChars))
    } else {
        const updatedLines = lines.map(line => `  ${line}`)
        const nextValue = `${value.slice(0, lineStart)}${updatedLines.join('\n')}${value.slice(lineEnd)}`
        setEditorValue(nextValue, start + 2, end + lines.length * 2)
    }
    return true
}

function handleListContinuation(event: KeyboardEvent): boolean {
    const textarea = textareaRef.value
    if (!textarea) return false
    const value = localContent.value
    const cursor = textarea.selectionStart
    const range = getLineRange(value, cursor)
    const currentLine = range.text

    const todoMatch = currentLine.match(/^(\s*[-*+]\s\[[ xX]\]\s)(.*)$/)
    if (todoMatch) {
        event.preventDefault()
        const prefix = todoMatch[1] ?? ''
        const content = todoMatch[2] ?? ''
        const insert = content.trim() ? `\n${prefix}` : '\n'
        setEditorValue(`${value.slice(0, cursor)}${insert}${value.slice(textarea.selectionEnd)}`, cursor + insert.length)
        return true
    }

    const bulletMatch = currentLine.match(/^(\s*[-*+]\s)(.*)$/)
    if (bulletMatch) {
        event.preventDefault()
        const prefix = bulletMatch[1] ?? ''
        const content = bulletMatch[2] ?? ''
        const insert = content.trim() ? `\n${prefix}` : '\n'
        setEditorValue(`${value.slice(0, cursor)}${insert}${value.slice(textarea.selectionEnd)}`, cursor + insert.length)
        return true
    }

    const orderedMatch = currentLine.match(/^(\s*)(\d+)\.\s(.*)$/)
    if (orderedMatch) {
        event.preventDefault()
        const prefix = orderedMatch[1] ?? ''
        const number = orderedMatch[2] ?? '0'
        const content = orderedMatch[3] ?? ''
        const insert = content.trim() ? `\n${prefix}${Number(number) + 1}. ` : '\n'
        setEditorValue(`${value.slice(0, cursor)}${insert}${value.slice(textarea.selectionEnd)}`, cursor + insert.length)
        return true
    }

    const quoteMatch = currentLine.match(/^(\s*>\s?)(.*)$/)
    if (quoteMatch) {
        event.preventDefault()
        const prefix = quoteMatch[1] ?? ''
        const content = quoteMatch[2] ?? ''
        const insert = content.trim() ? `\n${prefix}` : '\n'
        setEditorValue(`${value.slice(0, cursor)}${insert}${value.slice(textarea.selectionEnd)}`, cursor + insert.length)
        return true
    }

    return false
}

function handlePairing(event: KeyboardEvent): boolean {
    const textarea = textareaRef.value
    if (!textarea || !isMarkdown.value || event.ctrlKey || event.metaKey || event.altKey) return false
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const value = localContent.value
    const selected = value.slice(start, end)
    const nextChar = value[start]

    if ((event.key === '"' || event.key === "'" || event.key === ')' || event.key === ']' || event.key === '}' || event.key === '`') && !selected && nextChar === event.key) {
        event.preventDefault()
        setEditorValue(value, start + 1)
        return true
    }

    if (event.key === '[') {
        event.preventDefault()
        if (selected) {
            setEditorValue(`${value.slice(0, start)}[${selected}]()${value.slice(end)}`, end + 3)
        } else {
            setEditorValue(`${value.slice(0, start)}[]()${value.slice(end)}`, start + 1)
        }
        return true
    }

    if (event.key === '`') {
        event.preventDefault()
        if (selected) {
            wrapSelection('`', '`')
        } else {
            setEditorValue(`${value.slice(0, start)}\`\`${value.slice(end)}`, start + 1)
        }
        return true
    }

    if (event.key === '$') {
        event.preventDefault()
        if (selected) {
            wrapSelection('$', '$')
        } else {
            setEditorValue(`${value.slice(0, start)}$${'$'}${value.slice(end)}`, start + 1)
        }
        return true
    }

    if (event.key === '*' && selected) {
        event.preventDefault()
        wrapSelection('**', '**')
        return true
    }

    const pairs: Record<string, string> = {
        '(': ')',
        '{': '}',
        '"': '"',
        "'": "'"
    }

    const closing = pairs[event.key]
    if (!closing) return false

    event.preventDefault()
    const nextValue = `${value.slice(0, start)}${event.key}${selected}${closing}${value.slice(end)}`
    const selectionStart = start + 1
    setEditorValue(nextValue, selectionStart, selected ? selectionStart + selected.length : selectionStart)
    return true
}

function handleKeyDown(event: KeyboardEvent) {
    if (isReadOnly.value) {
        if (replaceBarOpen.value && event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            replaceBarOpen.value = false
            focusSearchInput()
            return
        }
        if (searchBarOpen.value && event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            closeSearchBar()
            return
        }
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
            event.preventDefault()
            openSearchBar()
            return
        }
        if (event.key === 'F3') {
            event.preventDefault()
            if (!searchBarOpen.value) {
                openSearchBar()
                return
            }
            if (searchScope.value === 'room') {
                const nextIndex = event.shiftKey
                    ? Math.max(activeRoomSearchIndex.value - 1, 0)
                    : Math.min(activeRoomSearchIndex.value + 1, Math.max(0, roomSearchResults.value.length - 1))
                jumpToRoomSearchResult(nextIndex)
                return
            }
            jumpToCurrentSearchMatch(event.shiftKey ? -1 : 1)
            return
        }
        return
    }

    if (replaceBarOpen.value && event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        replaceBarOpen.value = false
        focusSearchInput()
        return
    }

    if (searchBarOpen.value && event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        closeSearchBar()
        return
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        openSearchBar()
        return
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'h') {
        event.preventDefault()
        openReplaceBar()
        return
    }
    if (event.key === 'F3') {
        event.preventDefault()
        if (!searchBarOpen.value) {
            openSearchBar()
            return
        }
        if (searchScope.value === 'room') {
            const nextIndex = event.shiftKey
                ? Math.max(activeRoomSearchIndex.value - 1, 0)
                : Math.min(activeRoomSearchIndex.value + 1, Math.max(0, roomSearchResults.value.length - 1))
            jumpToRoomSearchResult(nextIndex)
            return
        }
        jumpToCurrentSearchMatch(event.shiftKey ? -1 : 1)
        return
    }

    if (showSlashMenu.value) {
        if (event.key === 'ArrowDown') {
            event.preventDefault()
            selectedCommandIndex.value = Math.min(selectedCommandIndex.value + 1, filteredCommands.value.length - 1)
            scrollCommandIntoView()
            return
        }
        if (event.key === 'ArrowUp') {
            event.preventDefault()
            selectedCommandIndex.value = Math.max(selectedCommandIndex.value - 1, 0)
            scrollCommandIntoView()
            return
        }
        if (event.key === 'Enter' || event.key === 'Tab') {
            event.preventDefault()
            const command = filteredCommands.value[selectedCommandIndex.value]
            if (command) executeCommand(command)
            return
        }
        if (event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            showSlashMenu.value = false
            return
        }
    }

    if (isMarkdown.value && event.key === 'Tab' && handleTabIndent(event)) return
    if (isMarkdown.value && event.key === 'Enter' && handleListContinuation(event)) return
    if (handlePairing(event)) return

    if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        handleClose()
    }
}

function scrollCommandIntoView() {
    nextTick(() => {
        const menu = slashMenuRef.value
        if (!menu) return
        menu.querySelector('.slash-menu-item.active')?.scrollIntoView({ block: 'nearest' })
    })
}

function executeCommand(command: SlashCommand) {
    const textarea = textareaRef.value
    if (!textarea) return
    const insertText = command.action()
    const before = localContent.value.slice(0, slashStartPosition.value)
    const after = localContent.value.slice(textarea.selectionStart)
    const nextValue = `${before}${insertText}${after}`
    showSlashMenu.value = false
    slashQuery.value = ''
    let nextCursor = before.length + insertText.length
    if ((insertText.includes('```') || insertText.includes('$$')) && insertText.includes('\n')) {
        nextCursor = before.length + insertText.indexOf('\n') + 1
    }
    setEditorValue(nextValue, nextCursor)
}

function setCurrentCodeFenceLanguage(language: string) {
    const context = activeCodeFence.value
    if (!context) return
    const nextValue = `${localContent.value.slice(0, context.lineStart)}\`\`\`${language}${localContent.value.slice(context.lineEnd)}`
    setEditorValue(nextValue, textareaRef.value?.selectionStart ?? context.lineEnd)
}

function scrollToOutlineItem(item: OutlineItem) {
    activeOutlineId.value = item.id
    previewRef.value?.querySelector<HTMLElement>(`#${item.anchorId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    focusEditorAtBlock(item.blockId)
}

function focusSearchInput() {
    nextTick(() => {
        searchInputRef.value?.focus()
        searchInputRef.value?.select()
    })
}

function focusReplaceInput() {
    nextTick(() => {
        replaceInputRef.value?.focus()
        replaceInputRef.value?.select()
    })
}

function openSearchBar(scope: 'current' | 'room' = 'current') {
    searchBarOpen.value = true
    searchScope.value = scope
    focusSearchInput()
}

function openReplaceBar() {
    openSearchBar('current')
    replaceBarOpen.value = true
    focusReplaceInput()
}

function toggleReplaceBar() {
    replaceBarOpen.value = !replaceBarOpen.value
    if (replaceBarOpen.value) {
        focusReplaceInput()
    } else {
        focusSearchInput()
    }
}

function toggleSearchBar() {
    if (searchBarOpen.value) {
        closeSearchBar()
        return
    }
    openSearchBar()
}

function closeSearchBar() {
    searchBarOpen.value = false
    replaceBarOpen.value = false
    textareaRef.value?.focus()
}

function handleOverlayEscape() {
    if (searchBarOpen.value) {
        closeSearchBar()
        return
    }
    handleClose()
}

function revealCurrentSearchMatch(index: number) {
    const textarea = textareaRef.value
    const match = currentSearchMatches.value[index]
    if (!textarea || !match) return

    currentSearchIndex.value = index
    textarea.focus()
    textarea.setSelectionRange(match.start, match.end)
    editorSelectionStart.value = match.start

    requestAnimationFrame(() => {
        const before = localContent.value.slice(0, match.start)
        const lineIndex = before.split('\n').length - 1
        const lineHeight = editorFontSize.value * editorLineHeightValueMap[editorLineHeightMode.value]
        const targetScrollTop = Math.max(0, (lineIndex * lineHeight) - (textarea.clientHeight * 0.4))
        textarea.scrollTop = targetScrollTop
        editorScrollTop.value = targetScrollTop
    })
}

function jumpToCurrentSearchMatch(direction = 1) {
    const count = currentSearchMatches.value.length
    if (count === 0) return
    const nextIndex = (currentSearchIndex.value + direction + count) % count
    revealCurrentSearchMatch(nextIndex)
}

function getReplacementForMatch(match: SearchMatch) {
    const singleRegex = createSearchRegExp(false)
    if (!singleRegex) return match.text
    return match.text.replace(singleRegex, replaceQuery.value)
}

function replaceCurrentSearchMatch() {
    const match = currentSearchMatches.value[currentSearchIndex.value]
    if (!match) return

    const replacement = getReplacementForMatch(match)
    const nextValue = `${localContent.value.slice(0, match.start)}${replacement}${localContent.value.slice(match.end)}`
    const nextCursor = match.start + replacement.length
    setEditorValue(nextValue, nextCursor, nextCursor)
}

function replaceAllSearchMatches() {
    const regex = createSearchRegExp(true)
    if (!regex) return

    const nextValue = localContent.value.replace(regex, (...args) => {
        const matched = String(args[0] ?? '')
        const singleRegex = createSearchRegExp(false)
        return singleRegex ? matched.replace(singleRegex, replaceQuery.value) : replaceQuery.value
    })

    if (nextValue === localContent.value) return
    setEditorValue(nextValue, textareaRef.value?.selectionStart ?? 0)
}

function jumpToRoomSearchResult(index = activeRoomSearchIndex.value) {
    const result = roomSearchResults.value[index]
    if (!result) return
    activeRoomSearchIndex.value = index
    searchScope.value = 'current'
    emit('jump-to-node', result.nodeId)
}

function handleSearchInputKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        closeSearchBar()
        return
    }

    if (searchScope.value === 'room') {
        if (event.key === 'ArrowDown') {
            event.preventDefault()
            event.stopPropagation()
            activeRoomSearchIndex.value = Math.min(activeRoomSearchIndex.value + 1, Math.max(0, roomSearchResults.value.length - 1))
            return
        }
        if (event.key === 'ArrowUp') {
            event.preventDefault()
            event.stopPropagation()
            activeRoomSearchIndex.value = Math.max(activeRoomSearchIndex.value - 1, 0)
            return
        }
        if (event.key === 'Enter') {
            event.preventDefault()
            event.stopPropagation()
            jumpToRoomSearchResult()
            return
        }
        return
    }

    if (event.key === 'Enter') {
        event.preventDefault()
        event.stopPropagation()
        jumpToCurrentSearchMatch(event.shiftKey ? -1 : 1)
    }
}

function handleReplaceInputKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        replaceBarOpen.value = false
        focusSearchInput()
        return
    }

    if (event.key === 'Enter') {
        event.preventDefault()
        event.stopPropagation()
        if (event.shiftKey) {
            replaceAllSearchMatches()
            return
        }
        replaceCurrentSearchMatch()
    }
}

function restorePreviewSessionIfNeeded() {
    if (hasRestoredPreviewSession || !pendingPreviewSessionRestore) return
    const textarea = textareaRef.value
    const preview = previewRef.value
    if (!textarea || !preview) return

    restoringPreviewSession = true
    const session = pendingPreviewSessionRestore
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            textarea.scrollTop = session.editorScrollTop
            preview.scrollTop = session.previewScrollTop
            editorScrollTop.value = textarea.scrollTop
            previewScrollTop.value = preview.scrollTop
            updateActiveOutline()
            persistPreviewSessionState()
            hasRestoredPreviewSession = true
            pendingPreviewSessionRestore = null
            restoringPreviewSession = false
        })
    })
}

async function renderMermaidDiagrams() {
    await nextTick()
    const preview = previewRef.value
    if (!preview) return
    const mermaidElements = Array.from(preview.querySelectorAll<HTMLElement>('pre.mermaid'))
    if (mermaidElements.length > 0) {
        try {
            const themeMode: MermaidThemeMode = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
            mermaid.initialize(getMermaidConfig(themeMode))

            for (const element of mermaidElements) {
                const source = element.textContent?.trim()
                if (!source) continue

                try {
                    const renderId = `mermaid-preview-${isGanttMermaidSource(source) ? 'gantt' : 'diagram'}-${mermaidCounter++}`
                    const result = await mermaid.render(renderId, source)
                    element.outerHTML = `<div class="mermaid mermaid-rendered">${result.svg}</div>`
                    const renderedElement = preview.querySelector<HTMLElement>(`.mermaid-rendered > svg#${renderId}`)?.parentElement
                    if (renderedElement && typeof result.bindFunctions === 'function') {
                        result.bindFunctions(renderedElement)
                    }
                } catch (renderError) {
                    console.warn('[Mermaid] Preview render error:', renderError)
                    element.outerHTML = `<pre class="mermaid-fallback">${md.utils.escapeHtml(source)}</pre>`
                }
            }
        } catch (error) {
            console.warn('[Mermaid] Render error:', error)
        }
    }
    applyPreviewMermaidSettings()
    requestAnimationFrame(() => {
        applyPreviewMermaidSettings()
    })
    decoratePreviewImages()
    restorePreviewSessionIfNeeded()
    requestPreviewRealignment()
}

function setupPreviewObserver() {
    previewObserver?.disconnect()
    previewObserver = null
    const root = previewRef.value
    if (!root) return
    if (!('IntersectionObserver' in window)) {
        visiblePreviewBlockIds.value = new Set(previewBlocks.value.map(block => block.id))
        return
    }

    previewObserver = new IntersectionObserver((entries) => {
        const nextIds = new Set(visiblePreviewBlockIds.value)
        let changed = false
        entries.forEach(entry => {
            const id = (entry.target as HTMLElement).dataset.previewBlockId
            if (!id) return
            if (entry.isIntersecting && !nextIds.has(id)) {
                nextIds.add(id)
                changed = true
            }
        })
        if (changed) visiblePreviewBlockIds.value = nextIds
    }, {
        root,
        rootMargin: '180px 0px'
    })

    root.querySelectorAll<HTMLElement>('[data-preview-block-id]').forEach(element => {
        previewObserver?.observe(element)
    })

    setupPreviewBlockResizeObserver()
    updateActiveOutline()
}

function handleClose() {
    if (!isEditorVisible.value) return
    awareness.updateTextCursor?.('', -1, -1)
    isEditorVisible.value = false
    if (closeEmitTimer !== null) window.clearTimeout(closeEmitTimer)
    closeEmitTimer = window.setTimeout(() => {
        closeEmitTimer = null
        emit('close')
    }, EDITOR_CLOSE_ANIMATION_MS)
}

function getExportTheme(): ExportTheme {
    return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

function getDefaultExportFileName() {
    return sanitizeFilename(deriveDocumentTitle(localContent.value, isMarkdown.value ? 'markdown' : 'text'))
}

const exportPanelDefaults = computed<ExportPanelSettings>(() => ({
    format: isMarkdown.value ? 'pdf' : 'txt',
    fileName: getDefaultExportFileName(),
    pdfTheme: 'current',
    pdfOrientation: 'portrait',
    pdfIncludeTitle: true,
    pdfMermaidOversize: 'scale',
    pdfMermaidScaleMode: 'fit-page',
    pdfMermaidScalePercent: 100,
    pdfMermaidDensity: 'compact',
    txtMode: 'plain'
}))

function resolveExportTheme(themeMode: ExportPanelThemeMode): ExportTheme {
    return themeMode === 'current' ? getExportTheme() : themeMode
}

function handleExport() {
    if (!canExportDocument.value) {
        toast.error(t('canvas.editor.exportUnsupported'))
        return
    }

    isExportPanelOpen.value = true
}

async function handleExportConfirm(settings: ExportPanelSettings) {
    const format = settings.format
    const fileName = sanitizeFilename(settings.fileName, getDefaultExportFileName())

    try {
        const result = await exportDocument(format, {
            kind: isMarkdown.value ? 'markdown' : 'text',
            content: localContent.value,
            title: deriveDocumentTitle(localContent.value, isMarkdown.value ? 'markdown' : 'text'),
            fileName,
            theme: resolveExportTheme(settings.pdfTheme),
            includeTitle: settings.pdfIncludeTitle,
            orientation: settings.pdfOrientation,
            mermaidOversize: settings.pdfMermaidOversize,
            mermaidScaleMode: settings.pdfMermaidScaleMode,
            mermaidScalePercent: settings.pdfMermaidScalePercent,
            mermaidDensity: settings.pdfMermaidDensity,
            textMode: settings.txtMode
        })

        if (result.canceled) {
            return
        }

        if (format === 'pdf' && !window.electron?.exportDocumentPdf) {
            toast.success(t('canvas.editor.exportPdfReady'))
            return
        }

        if (result.filePath) {
            toast.success(t('canvas.editor.exportSavedTo', { path: result.filePath }))
            return
        }

        if (result.fileName) {
            toast.success(t('canvas.editor.exportSavedAs', { name: result.fileName }))
            return
        }

        if (format === 'pdf') {
            toast.success(t('canvas.editor.exportPdfSaved'))
            return
        }

        toast.success(t('canvas.toast.exportSuccess', { format: format.toUpperCase() }))
    } catch (error) {
        console.error('[NodeEditorModal] Document export failed:', error)
        toast.error(t('canvas.toast.exportFailed'))
    }
}

onMounted(() => {
    localContent.value = props.content.data || ''
    viewMode.value = readStoredViewMode()
    readStoredPreviewMermaidSettings()
    readStoredEditorSettings()
    nextTick(() => {
        const storedSession = getStoredPreviewSessionState()
        pendingPreviewSessionRestore = storedSession
        hasRestoredPreviewSession = false
        overlayRef.value?.focus()
        textareaRef.value?.focus()
        editorSelectionStart.value = textareaRef.value?.selectionStart ?? 0
        editorScrollTop.value = storedSession?.editorScrollTop ?? (textareaRef.value?.scrollTop ?? 0)
        previewScrollTop.value = storedSession?.previewScrollTop ?? (previewRef.value?.scrollTop ?? 0)
        updateLayoutMode()
        setupPreviewObserver()
        renderMermaidDiagrams()
        restorePreviewSessionIfNeeded()
    })
    if (typeof ResizeObserver !== 'undefined' && editorContainerRef.value) {
        editorLayoutResizeObserver = new ResizeObserver(() => {
            updateLayoutMode()
        })
        editorLayoutResizeObserver.observe(editorContainerRef.value)
    } else {
        window.addEventListener('resize', updateLayoutMode)
    }
    if (!document.querySelector('link[href*="katex"]')) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css'
        document.head.appendChild(link)
    }
})

watch(() => props.content.data, (newData) => {
    if (newData !== localContent.value) {
        localContent.value = newData || ''
    }
})

watch([trimmedSearchQuery, searchMatchCase, searchWholeWord, searchUseRegex, roomSearchKindFilter], () => {
    currentSearchIndex.value = 0
    activeRoomSearchIndex.value = 0
})

watch(currentSearchMatches, (matches) => {
    if (matches.length === 0) {
        currentSearchIndex.value = 0
        return
    }

    currentSearchIndex.value = Math.min(currentSearchIndex.value, matches.length - 1)
})

watch(roomSearchResults, (results) => {
    activeRoomSearchIndex.value = Math.min(activeRoomSearchIndex.value, Math.max(0, results.length - 1))
})

watch(roomSearchTypeOptions, (options) => {
    if (!options.some(option => option.value === roomSearchKindFilter.value)) {
        roomSearchKindFilter.value = 'all'
    }
})

watch(searchScope, (scope) => {
    if (scope !== 'current') {
        replaceBarOpen.value = false
    }
})

watch(() => props.content.kind, (kind) => {
    viewMode.value = kind === 'markdown' ? readStoredViewMode() : 'edit'
    editorScrollTop.value = textareaRef.value?.scrollTop ?? 0
    previewScrollTop.value = previewRef.value?.scrollTop ?? 0
})

watch(viewMode, (mode) => {
    if (!isMarkdown.value) return
    try {
        window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode)
    } catch {}
})

watch(showPreviewPane, async (visible) => {
    if (!visible) return
    await nextTick()
    setupPreviewObserver()
    renderMermaidDiagrams()
    restorePreviewSessionIfNeeded()
}, { flush: 'post' })

watch([previewMermaidScaleMode, previewMermaidScalePercent, previewMermaidDensity], ([scaleMode, scalePercent, density]) => {
    previewMermaidScalePercent.value = Math.min(
        EXPORT_PDF_MERMAID_SCALE_MAX,
        Math.max(EXPORT_PDF_MERMAID_SCALE_MIN, Math.round(scalePercent))
    )
    applyPreviewMermaidSettings()
    requestPreviewRealignment()
    try {
        window.localStorage.setItem(PREVIEW_MERMAID_SETTINGS_STORAGE_KEY, JSON.stringify({
            scaleMode,
            scalePercent: previewMermaidScalePercent.value,
            density
        }))
    } catch {}
})

watch([
    editorFontSize,
    editorLetterSpacing,
    editorLineHeightMode,
    highlightCurrentLine,
    previewFontSize,
    previewLetterSpacing,
    previewParagraphSpacing,
    compactToolbar,
    splitRatio
], () => {
    editorFontSize.value = Math.min(22, Math.max(13, Math.round(editorFontSize.value)))
    previewFontSize.value = Math.min(22, Math.max(13, Math.round(previewFontSize.value)))
    editorLetterSpacing.value = Math.min(1.5, Math.max(0, Number(editorLetterSpacing.value)))
    previewLetterSpacing.value = Math.min(1.5, Math.max(0, Number(previewLetterSpacing.value)))
    persistEditorSettings()
    requestPreviewRealignment()
}, { deep: false })

watch(rawBlocks, async () => {
    const restorableSession = !hasRestoredPreviewSession ? (pendingPreviewSessionRestore ?? getStoredPreviewSessionState()) : null
    if (restorableSession && !pendingPreviewSessionRestore) {
        pendingPreviewSessionRestore = restorableSession
    }
    const nextVisibleIds = restorableSession
        ? restorableSession.visibleBlockIds.filter(id => rawBlocks.value.some((block, index) => `preview-block-${index}-${hashText(block)}` === id))
        : []
    visiblePreviewBlockIds.value = new Set(nextVisibleIds)
    activeOutlineId.value = outlineItems.value[0]?.id ?? ''
    await nextTick()
    setupPreviewObserver()
    renderMermaidDiagrams()
    restorePreviewSessionIfNeeded()
}, { flush: 'post' })

watch(visiblePreviewBlockIds, () => {
    persistPreviewSessionState()
    renderMermaidDiagrams()
}, { flush: 'post' })

watch(outlineItems, (items) => {
    if (!items.some(item => item.id === activeOutlineId.value)) {
        activeOutlineId.value = items[0]?.id ?? ''
    }
})

onUnmounted(() => {
    persistPreviewSessionState()
    if (closeEmitTimer !== null) {
        window.clearTimeout(closeEmitTimer)
        closeEmitTimer = null
    }
    if (previewSyncFrame !== null) {
        cancelAnimationFrame(previewSyncFrame)
    }
    if (previewRealignFrame !== null) {
        cancelAnimationFrame(previewRealignFrame)
    }
    previewObserver?.disconnect()
    editorLayoutResizeObserver?.disconnect()
    previewBlockResizeObserver?.disconnect()
    window.removeEventListener('resize', updateLayoutMode)
    awareness.updateTextCursor?.('', -1, -1)
})
</script>

<style scoped>
.editor-overlay { position: fixed; inset: 0; z-index: 10000; display: flex; align-items: stretch; justify-content: stretch; padding: 0; background: rgba(0, 0, 0, 0.92); }
.editor-container { width: 100vw; height: 100vh; max-width: none; max-height: none; display: flex; flex-direction: column; overflow: hidden; border-radius: 0; background: #17181c; box-shadow: none; }
.editor-header, .editor-footer { flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; padding: 14px 24px; background: rgba(255, 255, 255, 0.03); }
.editor-header { position: relative; z-index: 40; border-bottom: 1px solid rgba(255, 255, 255, 0.08); overflow: visible; }
.editor-footer { border-top: 1px solid rgba(255, 255, 255, 0.08); }
.header-left, .header-actions, .footer-right, .collab-users, .pane-header-row, .pane-subtools, .editor-toolbar, .preview-stats, .view-mode-switch { display: flex; align-items: center; }
.header-left { gap: 10px; }
.view-mode-switch { gap: 6px; padding: 4px; border-radius: 999px; background: rgba(255, 255, 255, 0.05); }
.view-mode-btn { min-width: 74px; height: 32px; padding: 0 14px; border: none; border-radius: 999px; background: transparent; color: rgba(255, 255, 255, 0.58); cursor: pointer; font-size: 12px; font-weight: 700; transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease; }
.view-mode-btn:hover { color: rgba(255, 255, 255, 0.9); }
.view-mode-btn.active { background: rgba(96, 165, 250, 0.18); color: #dbeafe; box-shadow: inset 0 0 0 1px rgba(147, 197, 253, 0.16); }
.header-actions { gap: 10px; }
.editor-search-shell { position: relative; z-index: 55; }
.editor-search-panel { position: absolute; top: calc(100% + 10px); right: 0; z-index: 90; width: min(420px, calc(100vw - 32px)); padding: 12px; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 18px; background: rgba(15, 18, 24, 0.98); box-shadow: 0 22px 44px rgba(0, 0, 0, 0.3); backdrop-filter: blur(16px); }
.editor-search-row { display: flex; align-items: center; gap: 8px; }
.editor-search-row.replace-row { margin-top: 10px; }
.editor-search-input { flex: 1; min-width: 0; height: 36px; padding: 0 12px; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; background: rgba(255, 255, 255, 0.04); color: rgba(255, 255, 255, 0.92); font-size: 13px; outline: none; }
.editor-search-input:focus { border-color: rgba(96, 165, 250, 0.68); box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.14); }
.editor-search-scope { display: inline-flex; padding: 3px; border-radius: 999px; background: rgba(255, 255, 255, 0.06); }
.editor-search-options { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.editor-search-filters { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.editor-search-option { border: none; padding: 6px 10px; border-radius: 999px; background: rgba(255, 255, 255, 0.06); color: rgba(255, 255, 255, 0.66); font-size: 12px; font-weight: 700; cursor: pointer; transition: background 0.18s ease, color 0.18s ease; }
.editor-search-option.active { background: rgba(96, 165, 250, 0.18); color: #dbeafe; }
.editor-search-filter { border: none; padding: 6px 10px; border-radius: 999px; background: rgba(255, 255, 255, 0.04); color: rgba(255, 255, 255, 0.72); font-size: 12px; font-weight: 700; cursor: pointer; transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease; }
.editor-search-filter.active { background: rgba(34, 197, 94, 0.18); color: #dcfce7; }
.editor-search-filter:hover { transform: translateY(-1px); }
.editor-search-scope-btn, .editor-search-nav, .editor-search-result, .editor-search-close { border: none; cursor: pointer; }
.editor-search-scope-btn { min-width: 64px; height: 30px; padding: 0 10px; border-radius: 999px; background: transparent; color: rgba(255, 255, 255, 0.62); font-size: 12px; font-weight: 700; }
.editor-search-scope-btn.active { background: rgba(96, 165, 250, 0.18); color: #dbeafe; }
.editor-search-close { width: 30px; height: 30px; border-radius: 999px; background: rgba(255, 255, 255, 0.06); color: rgba(255, 255, 255, 0.72); display: inline-flex; align-items: center; justify-content: center; line-height: 1; }
.editor-search-close svg { width: 14px; height: 14px; display: block; }
.editor-search-meta { margin-top: 10px; color: rgba(255, 255, 255, 0.52); font-size: 12px; }
.editor-search-actions { display: flex; gap: 8px; margin-top: 10px; }
.editor-search-nav { flex: 1; height: 32px; border-radius: 10px; background: rgba(255, 255, 255, 0.06); color: rgba(255, 255, 255, 0.82); font-size: 12px; font-weight: 700; }
.editor-search-nav.compact { flex: 0 0 auto; min-width: 84px; padding: 0 12px; }
.editor-search-nav:disabled { cursor: not-allowed; opacity: 0.45; }
.editor-search-results { display: grid; gap: 8px; margin-top: 10px; max-height: min(48vh, 360px); overflow-y: auto; }
.editor-search-result { display: grid; gap: 4px; width: 100%; padding: 10px 12px; border-radius: 12px; background: rgba(255, 255, 255, 0.04); color: rgba(255, 255, 255, 0.82); text-align: left; }
.editor-search-result.active { background: rgba(96, 165, 250, 0.16); color: #dbeafe; box-shadow: inset 0 0 0 1px rgba(147, 197, 253, 0.16); }
.editor-search-result-title { font-size: 12px; font-weight: 700; }
.editor-search-result-snippet { color: rgba(255, 255, 255, 0.56); font-size: 12px; line-height: 1.45; }
.editor-search-result-meta { color: rgba(255, 255, 255, 0.42); font-size: 11px; }
.editor-settings-shell { position: relative; z-index: 50; }
.editor-settings-menu { position: absolute; top: calc(100% + 10px); right: 0; z-index: 80; width: min(420px, calc(100vw - 32px)); max-height: min(72vh, 760px); overflow-y: auto; -ms-overflow-style: none; scrollbar-width: none; padding: 14px; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 18px; background: rgba(15, 18, 24, 0.98); box-shadow: 0 22px 44px rgba(0, 0, 0, 0.3); backdrop-filter: blur(16px); }
.editor-settings-section + .editor-settings-section { margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.08); }
.editor-settings-group-title { margin-bottom: 8px; font-size: 11px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255, 255, 255, 0.84); }
.editor-settings-grid { display: grid; gap: 8px; }
.editor-settings-item { display: grid; gap: 6px; padding: 4px 0; border-radius: 0; background: transparent; }
.editor-settings-label { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255, 255, 255, 0.48); }
.editor-settings-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.editor-settings-row-spread { align-items: center; justify-content: space-between; }
.editor-settings-chip { border: none; padding: 6px 10px; border-radius: 999px; background: rgba(255, 255, 255, 0.06); color: rgba(255, 255, 255, 0.74); font-size: 12px; cursor: pointer; transition: background 0.18s ease, color 0.18s ease; }
.editor-settings-chip.active { background: rgba(96, 165, 250, 0.18); color: #dbeafe; }
.editor-settings-value { font-size: 12px; color: rgba(255, 255, 255, 0.74); }
.editor-settings-slider { width: 100%; margin-top: 8px; accent-color: #60a5fa; }
.editor-settings-toggle { position: relative; width: 42px; height: 24px; border: none; border-radius: 999px; background: rgba(255, 255, 255, 0.12); cursor: pointer; transition: background 0.18s ease; }
.editor-settings-toggle.active { background: rgba(96, 165, 250, 0.26); }
.editor-settings-toggle-knob { position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #ffffff; transition: transform 0.18s ease; }
.editor-settings-toggle.active .editor-settings-toggle-knob { transform: translateX(18px); }
.editor-settings-footer { display: flex; justify-content: flex-end; margin-top: 14px; padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.08); }
.editor-settings-reset { border: none; padding: 8px 12px; border-radius: 10px; background: rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.82); font-size: 12px; font-weight: 700; cursor: pointer; transition: background 0.18s ease, color 0.18s ease; }
.editor-settings-reset:hover { background: rgba(255, 255, 255, 0.14); color: #ffffff; }
.settings-pop-enter-active,
.settings-pop-leave-active { transition: opacity 0.18s ease, transform 0.22s ease; transform-origin: top right; }
.settings-pop-enter-from,
.settings-pop-leave-to { opacity: 0; transform: translateY(-8px) scale(0.98); }
.editor-settings-menu::-webkit-scrollbar { display: none; width: 0; height: 0; }
.type-icon { font-size: 20px; }
.type-label { font-size: 16px; font-weight: 600; color: rgba(255, 255, 255, 0.92); }
.collab-users { gap: 0; margin-left: 14px; padding-left: 14px; border-left: 1px solid rgba(255, 255, 255, 0.08); }
.collab-avatar { width: 28px; height: 28px; margin-left: -8px; border: 2px solid #17181c; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 12px; font-weight: 700; }
.collab-avatar:first-child { margin-left: 0; }
.header-action-btn { min-width: 56px; height: 32px; padding: 0 12px; border: none; border-radius: 8px; background: rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.72); cursor: pointer; font-size: 12px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; transition: background 0.15s ease, color 0.15s ease; }
.header-action-btn.icon-only { min-width: 32px; width: 32px; padding: 0; display: inline-flex; align-items: center; justify-content: center; letter-spacing: 0; text-transform: none; }
.header-action-btn.active { color: #dbeafe; background: rgba(96, 165, 250, 0.18); box-shadow: inset 0 0 0 1px rgba(147, 197, 253, 0.16); }
.header-action-icon { width: 16px; height: 16px; display: block; }
.header-action-btn.primary { background: rgba(96, 165, 250, 0.16); color: #dbeafe; }
.close-btn { width: 32px; height: 32px; border: none; border-radius: 8px; background: rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.72); cursor: pointer; transition: background 0.15s ease, color 0.15s ease; }
.header-action-btn:hover,
.close-btn:hover { color: #fff; background: rgba(255, 255, 255, 0.14); }
.editor-body { flex: 1; min-height: 0; display: flex; overflow: hidden; position: relative; }
.editor-body.split-view { gap: 1px; background: rgba(255, 255, 255, 0.08); }
.editor-body.edit-only .edit-pane,
.editor-body.preview-only .preview-pane { flex: 1 1 100%; }
.editor-body.preview-only {
    background:
        radial-gradient(circle at top, rgba(96, 165, 250, 0.08), transparent 38%),
        linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0));
}
.editor-body.split-view .edit-pane { flex: 0 1 50%; }
.editor-body.split-view .preview-pane { flex: 0 1 50%; }
.edit-pane, .preview-pane { min-width: 0; display: flex; flex: 1; flex-direction: column; position: relative; background: #17181c; }
.editor-body.preview-only .preview-pane-header { justify-content: center; padding: 18px 24px 8px; border-bottom: none; background: transparent; }
.editor-body.preview-only .preview-stats { display: none; }
.editor-body.preview-only .preview-layout { padding: 8px 28px 32px; background: transparent; }
.editor-body.preview-only .preview-content {
    width: min(100%, 940px);
    margin: 0 auto 12px;
    padding: 44px 52px 60px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 28px;
    background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.025)),
        rgba(15, 18, 24, 0.7);
    box-shadow: 0 28px 80px rgba(0, 0, 0, 0.28);
}
.pane-header-row { justify-content: space-between; gap: 12px; padding: 10px 18px; border-bottom: 1px solid rgba(255, 255, 255, 0.06); }
.pane-header { font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255, 255, 255, 0.45); }
.pane-subtools, .preview-stats { flex-wrap: wrap; gap: 8px; font-size: 11px; color: rgba(255, 255, 255, 0.42); }
.subtool-label { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255, 255, 255, 0.35); }
.editor-toolbar { gap: 8px; flex-wrap: wrap; padding: 12px 18px; border-bottom: 1px solid rgba(255, 255, 255, 0.05); background: linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.015)); }
.toolbar-button, .code-language-chip, .outline-item, .outline-toggle, .to-top-button { border: none; cursor: pointer; transition: background 0.22s ease, color 0.22s ease, transform 0.22s ease, box-shadow 0.22s ease, opacity 0.22s ease; }
.toolbar-button { padding: 6px 10px; border-radius: 999px; background: rgba(255, 255, 255, 0.06); color: rgba(255, 255, 255, 0.76); }
.toolbar-button.compact { min-width: 34px; padding: 6px 0; justify-content: center; font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 11px; letter-spacing: 0.02em; }
.toolbar-button:hover, .code-language-chip:hover, .outline-item:hover, .outline-toggle:hover, .to-top-button:hover { transform: translateY(-1px); background: rgba(96, 165, 250, 0.16); color: #dbeafe; box-shadow: 0 10px 24px rgba(37, 99, 235, 0.16); }
.toolbar-button-label { font-size: 12px; font-weight: 600; }
.code-language-chip { padding: 3px 9px; border-radius: 999px; background: rgba(255, 255, 255, 0.06); color: rgba(255, 255, 255, 0.72); font-size: 10px; line-height: 1.45; text-transform: lowercase; }
.code-language-chip.active { background: rgba(96, 165, 250, 0.22); color: #dbeafe; }
.textarea-wrapper { position: relative; flex: 1; min-height: 0; overflow: hidden; }
.editor-textarea, .preview-content { width: 100%; height: 100%; padding: 20px; overflow-y: auto; font-size: 15px; line-height: 1.8; }
.editor-textarea { resize: none; border: none; outline: none; background: transparent; color: rgba(255, 255, 255, 0.92); caret-color: #60a5fa; font-family: 'JetBrains Mono', 'Fira Code', monospace; }
.editor-textarea::placeholder { color: rgba(255, 255, 255, 0.25); }
.preview-layout { position: relative; flex: 1; min-height: 0; display: flex; }
.editor-outline-shell { display: none; }
.editor-outline-shell.open { display: none; }
.outline-floating-shell { position: fixed; top: 50%; left: 18px; z-index: 18; display: flex; align-items: center; gap: 10px; transform: translateY(-50%); pointer-events: auto; }
.outline-toggle { display: inline-flex; align-items: center; justify-content: center; width: 28px; min-height: 120px; padding: 14px 0; border-radius: 999px; opacity: 0.72; background: rgba(20, 24, 31, 0.58); color: rgba(255, 255, 255, 0.68); backdrop-filter: blur(16px); box-shadow: 0 12px 28px rgba(0, 0, 0, 0.16); }
.outline-toggle.armed { background: rgba(20, 24, 31, 0.78); color: rgba(255, 255, 255, 0.9); box-shadow: 0 16px 32px rgba(0, 0, 0, 0.22); }
.outline-toggle.open { opacity: 1; background: rgba(59, 130, 246, 0.2); color: #dbeafe; box-shadow: 0 14px 34px rgba(37, 99, 235, 0.18); }
.outline-toggle-icon { font-size: 18px; line-height: 1; }
.to-top-shell { position: absolute; right: 34px; bottom: 84px; z-index: 14; }
.to-top-button { width: 42px; height: 42px; border-radius: 999px; background: rgba(20, 24, 31, 0.72); color: rgba(255, 255, 255, 0.84); backdrop-filter: blur(14px); box-shadow: 0 12px 30px rgba(0, 0, 0, 0.24); opacity: 0.58; }
.to-top-button:hover,
.to-top-button:focus-visible { opacity: 1; }
.to-top-icon { font-size: 11px; line-height: 1; font-weight: 700; letter-spacing: 0.02em; text-transform: uppercase; }
@media (max-width: 900px) {
    .to-top-shell { right: 22px; bottom: 76px; }
}
@media (max-width: 1280px) {
    .outline-pane { width: 208px; }
}
@media (max-width: 960px) {
    .editor-body.split-view { flex-direction: column; }
    .editor-body.split-view .edit-pane,
    .editor-body.split-view .preview-pane { flex: 1 1 50%; }
}
.outline-pane { width: 240px; max-height: min(66vh, 560px); overflow-y: auto; flex-shrink: 0; display: flex; flex-direction: column; gap: 6px; padding: 14px 12px 14px; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 18px; background: rgba(20, 24, 31, 0.82); box-shadow: 0 18px 48px rgba(0, 0, 0, 0.24); backdrop-filter: blur(18px); }
.outline-header { margin-bottom: 8px; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255, 255, 255, 0.35); }
.outline-item { width: 100%; padding: 8px 10px; border-radius: 10px; background: transparent; color: rgba(255, 255, 255, 0.68); text-align: left; font-size: 12px; line-height: 1.4; }
.outline-item.active { background: rgba(96, 165, 250, 0.16); color: #dbeafe; box-shadow: inset 0 0 0 1px rgba(147, 197, 253, 0.16); }
.outline-item.level-2 { padding-left: 18px; }
.outline-item.level-3, .outline-item.level-4, .outline-item.level-5, .outline-item.level-6 { padding-left: 26px; }
.preview-content { --preview-mermaid-padding-top: 38px; --preview-mermaid-padding-side: 18px; --preview-mermaid-padding-bottom: 18px; --preview-mermaid-margin: 1.25em 0; --preview-paragraph-spacing: 0.85em; --preview-block-gap: 18px; flex: 1; width: min(100%, 940px); min-width: 0; margin: 0 auto; color: rgba(255, 255, 255, 0.92); scroll-behavior: smooth; }
.preview-empty { color: rgba(255, 255, 255, 0.34); font-style: italic; }
.preview-top-spacer { height: 28px; pointer-events: none; }
.preview-block { position: relative; margin-bottom: var(--preview-block-gap); border-radius: 14px; opacity: 0; transform: translateY(10px) scale(0.992); animation: preview-block-enter 0.26s ease forwards; transition: transform 0.2s ease, background 0.2s ease, box-shadow 0.22s ease; }
.preview-block:hover { transform: translateY(-1px); }
.preview-block.active { background: linear-gradient(135deg, rgba(96, 165, 250, 0.045), rgba(96, 165, 250, 0.015)); box-shadow: 0 0 0 1px rgba(147, 197, 253, 0.08), 0 8px 18px rgba(37, 99, 235, 0.04); }
.preview-block.is-heavy:not(.is-deferred) { background: transparent; }
.preview-block-placeholder, .preview-block-inner { border-radius: 14px; }
.preview-block-placeholder { position: relative; padding: 18px 18px 18px 20px; border: 1px solid rgba(255, 255, 255, 0.08); background: linear-gradient(135deg, rgba(255, 255, 255, 0.03), rgba(96, 165, 250, 0.04)); color: rgba(255, 255, 255, 0.64); overflow: hidden; }
.preview-block-placeholder::before { content: ''; position: absolute; inset: 0; background: linear-gradient(110deg, transparent 15%, rgba(255, 255, 255, 0.06) 45%, transparent 75%); transform: translateX(-120%); animation: placeholder-sheen 2.4s ease-in-out infinite; }
.preview-block-placeholder p { position: relative; margin: 0; line-height: 1.6; }
.preview-block-badge { position: relative; display: inline-flex; margin-bottom: 8px; padding: 4px 8px; border-radius: 999px; background: rgba(96, 165, 250, 0.18); color: #bfdbfe; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.remote-cursor { position: absolute; z-index: 10; pointer-events: none; }
.remote-cursor-caret { width: 2px; height: 20px; animation: cursor-blink 1s ease-in-out infinite; }
.remote-cursor-label { position: absolute; top: -18px; left: 0; padding: 2px 6px; border-radius: 4px; color: #fff; font-size: 10px; font-weight: 600; white-space: nowrap; }
.remote-selection { position: absolute; top: 0; left: 2px; height: 20px; border-radius: 2px; }
.slash-menu { position: absolute; left: 20px; z-index: 30; width: min(360px, calc(100% - 40px)); overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 14px; background: rgba(20, 20, 24, 0.96); box-shadow: 0 18px 42px rgba(0, 0, 0, 0.32); backdrop-filter: blur(16px); }
.slash-menu-header { padding: 12px 14px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255, 255, 255, 0.42); }
.slash-menu-scroll { max-height: 320px; overflow-y: auto; padding: 8px; }
.slash-menu-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 12px; cursor: pointer; }
.slash-menu-item:hover, .slash-menu-item.active { background: rgba(255, 255, 255, 0.06); }
.cmd-icon { width: 28px; height: 28px; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: 8px; background: rgba(255, 255, 255, 0.06); color: rgba(255, 255, 255, 0.75); font-size: 12px; font-weight: 700; }
.cmd-icon.code-icon { color: #61afef; }
.cmd-icon.lang-js { color: #f7df1e; background: rgba(247, 223, 30, 0.12); }
.cmd-icon.lang-ts { color: #60a5fa; background: rgba(96, 165, 250, 0.14); }
.cmd-icon.lang-py { color: #93c5fd; background: rgba(59, 130, 246, 0.16); }
.cmd-icon.lang-css { color: #38bdf8; background: rgba(56, 189, 248, 0.16); }
.cmd-icon.lang-html { color: #fb7185; background: rgba(251, 113, 133, 0.16); }
.cmd-icon.math-icon { color: #c4b5fd; background: rgba(196, 181, 253, 0.14); }
.cmd-icon.bold-icon { font-weight: 800; }
.cmd-icon.italic-icon { font-style: italic; }
.cmd-icon.strike-icon { text-decoration: line-through; }
.cmd-info { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 2px; }
.cmd-label { color: rgba(255, 255, 255, 0.92); font-size: 13px; }
.cmd-desc { color: rgba(255, 255, 255, 0.42); font-size: 11px; }
.cmd-shortcut { padding: 2px 6px; border-radius: 4px; background: rgba(255, 255, 255, 0.05); color: rgba(255, 255, 255, 0.35); font-size: 10px; font-family: 'JetBrains Mono', monospace; }
.slash-menu-empty { padding: 18px 14px; color: rgba(255, 255, 255, 0.42); text-align: center; }
.footer-hint, .char-count, .collab-indicator { font-size: 12px; }
.footer-hint, .char-count { color: rgba(255, 255, 255, 0.42); }
.collab-indicator { color: #4ade80; }
.footer-hint kbd { display: inline-block; margin: 0 3px; padding: 3px 8px; border-radius: 4px; background: rgba(255, 255, 255, 0.1); font-family: 'JetBrains Mono', monospace; font-size: 11px; }
.preview-content :deep(h1) { margin: 0.5em 0; font-size: 1.8em; font-weight: 700; }
.preview-content :deep(h2) { margin: 0.5em 0; font-size: 1.45em; font-weight: 700; }
.preview-content :deep(h3) { margin: 0.5em 0; font-size: 1.18em; font-weight: 700; }
.preview-content :deep(p) { margin: var(--preview-paragraph-spacing) 0; }
.preview-content :deep(code) { padding: 2px 6px; border-radius: 5px; background: rgba(255, 255, 255, 0.08); font-size: 0.92em; font-family: 'JetBrains Mono', monospace; }
.preview-content :deep(.hljs) { color: #d6deeb; background: transparent; }
.preview-content :deep(.hljs-keyword), .preview-content :deep(.hljs-selector-tag), .preview-content :deep(.hljs-literal), .preview-content :deep(.hljs-title.function_) { color: #c792ea; }
.preview-content :deep(.hljs-string), .preview-content :deep(.hljs-attr), .preview-content :deep(.hljs-template-string) { color: #c3e88d; }
.preview-content :deep(.hljs-number), .preview-content :deep(.hljs-symbol), .preview-content :deep(.hljs-bullet) { color: #f78c6c; }
.preview-content :deep(.hljs-comment), .preview-content :deep(.hljs-quote) { color: #7f8c98; font-style: italic; }
.preview-content :deep(.hljs-variable), .preview-content :deep(.hljs-title), .preview-content :deep(.hljs-property) { color: #82aaff; }
.preview-content :deep(.hljs-type), .preview-content :deep(.hljs-built_in), .preview-content :deep(.hljs-class .hljs-title) { color: #ffcb6b; }
.preview-content :deep(.hljs-meta), .preview-content :deep(.hljs-meta .hljs-keyword), .preview-content :deep(.hljs-doctag) { color: #89ddff; }
.preview-content :deep(.code-block-shell) { position: relative; margin: 1em 0; border-radius: 14px; background: transparent; border: none; box-shadow: none; overflow: visible; }
.preview-content :deep(.code-block-lang) { position: absolute; top: 10px; left: 12px; z-index: 1; display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 999px; background: rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.68); font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.preview-content :deep(pre) { margin: 0; padding: 38px 16px 16px; overflow-x: auto; overflow-y: hidden; border-radius: 14px; background: rgba(15, 18, 24, 0.72); border: 1px solid rgba(255, 255, 255, 0.06); white-space: pre; }
.preview-content :deep(pre code) { display: block; width: max-content; min-width: 100%; padding: 0; background: transparent; white-space: pre; word-break: normal; overflow-wrap: normal; }
.preview-content :deep(blockquote) { margin: var(--preview-paragraph-spacing) 0; padding-left: 16px; border-left: 4px solid rgba(255, 255, 255, 0.18); color: rgba(255, 255, 255, 0.7); }
.preview-content :deep(ul), .preview-content :deep(ol) { margin: var(--preview-paragraph-spacing) 0; padding-left: 1.5em; }
.preview-content :deep(a) { color: #60a5fa; text-decoration: none; }
.preview-content :deep(img) { display: block; max-width: min(100%, 780px); max-height: min(52vh, 560px); width: auto; height: auto; margin: 1.1em auto; border-radius: 16px; box-shadow: 0 18px 40px rgba(0, 0, 0, 0.18); background: rgba(255, 255, 255, 0.03); object-fit: contain; cursor: zoom-in; transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease; }
.preview-content :deep(img:hover) { transform: translateY(-1px); box-shadow: 0 22px 44px rgba(0, 0, 0, 0.22); }
.preview-content :deep(img.is-error) { display: none; }
.preview-content :deep(.preview-image-fallback) { display: flex; flex-direction: column; gap: 6px; margin: 1em auto; padding: 16px 18px; border: 1px dashed rgba(255, 255, 255, 0.18); border-radius: 14px; background: rgba(255, 255, 255, 0.03); color: rgba(255, 255, 255, 0.7); }
.preview-content :deep(.preview-image-fallback strong) { color: rgba(255, 255, 255, 0.9); font-size: 13px; }
.preview-content :deep(.preview-image-fallback span:last-child) { font-size: 12px; line-height: 1.45; word-break: break-all; }
.preview-content :deep(.preview-image-fallback-badge) { display: inline-flex; align-self: flex-start; padding: 4px 8px; border-radius: 999px; background: rgba(248, 113, 113, 0.14); color: #fecaca; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.preview-content :deep(hr) { margin: 1.5em 0; border: none; border-top: 1px solid rgba(255, 255, 255, 0.1); }
.preview-content :deep(table) { width: 100%; margin: 1em 0; border-collapse: collapse; }
.preview-content :deep(th), .preview-content :deep(td) { padding: 8px 12px; border: 1px solid rgba(255, 255, 255, 0.1); }
.preview-content :deep(th) { font-weight: 700; background: rgba(255, 255, 255, 0.04); }
.preview-content :deep(.katex-block) { display: flex; justify-content: center; margin: 1.2em 0; padding: 1em; border-radius: 12px; background: rgba(255, 255, 255, 0.03); overflow-x: auto; }
.preview-content :deep(.katex-error) { padding: 2px 6px; border-radius: 6px; color: #fca5a5; background: rgba(239, 68, 68, 0.1); }
.preview-content :deep(.mermaid-wrapper) { position: relative; display: flex; justify-content: center; width: fit-content; max-width: 100%; margin: var(--preview-mermaid-margin); margin-left: auto; margin-right: auto; padding: var(--preview-mermaid-padding-top) var(--preview-mermaid-padding-side) var(--preview-mermaid-padding-bottom); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 16px; background: rgba(255, 255, 255, 0.03); overflow: auto; break-inside: avoid; }
.preview-content :deep(.mermaid-block-lang) { position: absolute; top: 10px; left: 12px; z-index: 1; display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 999px; background: rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.68); font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.preview-content :deep(.mermaid) { display: flex; justify-content: center; width: fit-content; max-width: 100%; min-width: 0; margin: 0 auto; }
.preview-content :deep(.mermaid svg) { display: block; width: auto !important; max-width: 100%; height: auto; margin: 0 auto; }
.preview-content :deep(.mermaid-fallback) { margin: 0; padding: 12px 14px; overflow-x: auto; overflow-y: hidden; border-radius: 12px; background: rgba(15, 18, 24, 0.72); border: 1px dashed rgba(248, 113, 113, 0.26); color: #fecaca; white-space: pre; }
.preview-content :deep(.mermaid-wrapper.is-wide-mermaid) { width: 100%; margin-left: 0; margin-right: 0; overflow-x: auto; overflow-y: hidden; justify-content: flex-start; }
.preview-content :deep(.mermaid-wrapper.is-wide-mermaid .mermaid) { justify-content: flex-start; min-width: max-content; }
.preview-content :deep(.mermaid-wrapper.is-wide-mermaid .mermaid svg) { max-width: none !important; width: auto !important; min-width: max-content; margin: 0; }
.preview-content :deep(.mermaid text),
.preview-content :deep(.mermaid .label),
.preview-content :deep(.mermaid .nodeLabel),
.preview-content :deep(.mermaid .edgeLabel),
.preview-content :deep(.mermaid .edgeLabel p),
.preview-content :deep(.mermaid .edgeLabel span),
.preview-content :deep(.mermaid .cluster-label text),
.preview-content :deep(.mermaid .cluster-label span),
.preview-content :deep(.mermaid .mindmap-node .label),
.preview-content :deep(.mermaid .mindmap-node text),
.preview-content :deep(.mermaid .mindmap-node foreignObject),
.preview-content :deep(.mermaid .mindmap-node foreignObject div) { fill: #e5eefc !important; color: #e5eefc !important; }
.preview-content :deep(.mermaid .edgeLabel rect),
.preview-content :deep(.mermaid .labelBkg) { fill: rgba(23, 24, 28, 0.92) !important; }
.preview-content :deep(.mermaid .edgePath path),
.preview-content :deep(.mermaid .flowchart-link),
.preview-content :deep(.mermaid .relationshipLine),
.preview-content :deep(.mermaid .messageLine0),
.preview-content :deep(.mermaid .messageLine1),
.preview-content :deep(.mermaid .mindmap-link),
.preview-content :deep(.mermaid .section-edge) { stroke: #8aa4d0 !important; }
.preview-content :deep(.mermaid .arrowheadPath),
.preview-content :deep(.mermaid marker path) { fill: #8aa4d0 !important; stroke: #8aa4d0 !important; }
.preview-content :deep(.mermaid .node rect),
.preview-content :deep(.mermaid .node circle),
.preview-content :deep(.mermaid .node ellipse),
.preview-content :deep(.mermaid .node polygon),
.preview-content :deep(.mermaid .node path),
.preview-content :deep(.mermaid .cluster rect),
.preview-content :deep(.mermaid .cluster polygon),
.preview-content :deep(.mermaid .mindmap-node rect),
.preview-content :deep(.mermaid .mindmap-node circle),
.preview-content :deep(.mermaid .mindmap-node path) { stroke: rgba(191, 219, 254, 0.34) !important; }
.preview-content :deep(.mermaid .cluster rect),
.preview-content :deep(.mermaid .cluster polygon) { fill: rgba(17, 26, 40, 0.78) !important; }
.preview-content :deep(.mermaid .mindmap-node:nth-of-type(4n + 1) rect),
.preview-content :deep(.mermaid .mindmap-node:nth-of-type(4n + 1) circle),
.preview-content :deep(.mermaid .mindmap-node:nth-of-type(4n + 1) path) { fill: #26476b !important; }
.preview-content :deep(.mermaid .mindmap-node:nth-of-type(4n + 2) rect),
.preview-content :deep(.mermaid .mindmap-node:nth-of-type(4n + 2) circle),
.preview-content :deep(.mermaid .mindmap-node:nth-of-type(4n + 2) path) { fill: #1f5a4c !important; }
.preview-content :deep(.mermaid .mindmap-node:nth-of-type(4n + 3) rect),
.preview-content :deep(.mermaid .mindmap-node:nth-of-type(4n + 3) circle),
.preview-content :deep(.mermaid .mindmap-node:nth-of-type(4n + 3) path) { fill: #6a4f1f !important; }
.preview-content :deep(.mermaid .mindmap-node:nth-of-type(4n + 4) rect),
.preview-content :deep(.mermaid .mindmap-node:nth-of-type(4n + 4) circle),
.preview-content :deep(.mermaid .mindmap-node:nth-of-type(4n + 4) path) { fill: #4b2e67 !important; }
.preview-content::-webkit-scrollbar, .editor-textarea::-webkit-scrollbar, .slash-menu-scroll::-webkit-scrollbar { width: 8px; }
.preview-content::-webkit-scrollbar-track, .editor-textarea::-webkit-scrollbar-track, .slash-menu-scroll::-webkit-scrollbar-track { background: transparent; }
.preview-content::-webkit-scrollbar-thumb, .editor-textarea::-webkit-scrollbar-thumb, .slash-menu-scroll::-webkit-scrollbar-thumb { border-radius: 4px; background: rgba(255, 255, 255, 0.16); }
.preview-content::-webkit-scrollbar-thumb:hover, .editor-textarea::-webkit-scrollbar-thumb:hover, .slash-menu-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.24); }
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
.modal-scale-enter-active { transition: all 0.28s cubic-bezier(0.34, 1.56, 0.64, 1); }
.modal-scale-leave-active { transition: all 0.16s ease-in; }
.modal-scale-enter-from { opacity: 0; transform: scale(0.96); }
.modal-scale-leave-to { opacity: 0; transform: scale(0.985); }
.modal-fade-leave-active .editor-container { transition: opacity 0.18s ease, transform 0.22s ease; }
.modal-fade-leave-to .editor-container { opacity: 0; transform: scale(0.985) translateY(10px); }
@keyframes cursor-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
@keyframes preview-block-enter { from { opacity: 0; transform: translateY(10px) scale(0.992); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes placeholder-sheen { from { transform: translateX(-120%); } to { transform: translateX(120%); } }
.outline-float-enter-active, .outline-float-leave-active { transition: opacity 0.22s ease, transform 0.22s ease; }
.outline-float-enter-from, .outline-float-leave-to { opacity: 0; transform: translateX(-10px) scale(0.98); }
.image-lightbox { position: fixed; inset: 0; z-index: 10040; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; padding: 32px; background: rgba(5, 8, 14, 0.82); backdrop-filter: blur(12px); }
.image-lightbox-close { position: absolute; top: 20px; right: 24px; width: 40px; height: 40px; border: none; border-radius: 999px; background: rgba(255, 255, 255, 0.1); color: rgba(255, 255, 255, 0.88); font-size: 28px; line-height: 1; cursor: pointer; }
.image-lightbox-media { max-width: min(92vw, 1440px); max-height: calc(100vh - 120px); border-radius: 18px; box-shadow: 0 26px 60px rgba(0, 0, 0, 0.35); object-fit: contain; background: rgba(255, 255, 255, 0.04); }
.image-lightbox-caption { max-width: min(90vw, 960px); padding: 10px 14px; border-radius: 999px; background: rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.86); font-size: 13px; line-height: 1.4; text-align: center; }
.sr-only-file-input { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
html[data-theme='light'] .editor-overlay { background: rgba(0, 0, 0, 0.45); }
html[data-theme='light'] .editor-container, html[data-theme='light'] .edit-pane, html[data-theme='light'] .preview-pane { background: #ffffff; }
html[data-theme='light'] .editor-container { box-shadow: 0 25px 80px rgba(0, 0, 0, 0.18); }
html[data-theme='light'] .editor-header, html[data-theme='light'] .editor-footer { background: rgba(0, 0, 0, 0.02); }
html[data-theme='light'] .editor-header, html[data-theme='light'] .pane-header-row, html[data-theme='light'] .editor-footer, html[data-theme='light'] .outline-pane { border-color: rgba(0, 0, 0, 0.08); }
html[data-theme='light'] .type-label, html[data-theme='light'] .editor-textarea, html[data-theme='light'] .preview-content, html[data-theme='light'] .cmd-label { color: rgba(0, 0, 0, 0.9); }
html[data-theme='light'] .pane-header, html[data-theme='light'] .preview-stats, html[data-theme='light'] .subtool-label, html[data-theme='light'] .outline-header, html[data-theme='light'] .footer-hint, html[data-theme='light'] .char-count, html[data-theme='light'] .cmd-desc, html[data-theme='light'] .cmd-shortcut, html[data-theme='light'] .slash-menu-header, html[data-theme='light'] .slash-menu-empty { color: rgba(0, 0, 0, 0.48); }
html[data-theme='light'] .editor-body.preview-only {
    background:
        radial-gradient(circle at top, rgba(59, 130, 246, 0.08), transparent 38%),
        linear-gradient(180deg, rgba(0, 0, 0, 0.015), rgba(0, 0, 0, 0));
}
html[data-theme='light'] .editor-body.preview-only .preview-content {
    border-color: rgba(15, 23, 42, 0.08);
    background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(255, 255, 255, 0.92)),
        #ffffff;
    box-shadow: 0 24px 60px rgba(15, 23, 42, 0.08);
}
html[data-theme='light'] .view-mode-switch { background: rgba(0, 0, 0, 0.04); }
html[data-theme='light'] .view-mode-btn { color: rgba(15, 23, 42, 0.52); }
html[data-theme='light'] .view-mode-btn:hover { color: rgba(15, 23, 42, 0.84); }
html[data-theme='light'] .view-mode-btn.active { background: rgba(59, 130, 246, 0.12); color: #1d4ed8; box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.12); }
html[data-theme='light'] .editor-search-panel { border-color: rgba(0, 0, 0, 0.08); background: rgba(255, 255, 255, 0.98); box-shadow: 0 18px 42px rgba(0, 0, 0, 0.12); }
html[data-theme='light'] .editor-settings-menu { border-color: rgba(0, 0, 0, 0.08); background: rgba(255, 255, 255, 0.98); box-shadow: 0 18px 42px rgba(0, 0, 0, 0.12); }
html[data-theme='light'] .editor-settings-section + .editor-settings-section { border-top-color: rgba(0, 0, 0, 0.08); }
html[data-theme='light'] .editor-settings-group-title { color: rgba(0, 0, 0, 0.86); }
html[data-theme='light'] .editor-settings-label { color: rgba(0, 0, 0, 0.48); }
html[data-theme='light'] .editor-settings-chip { background: rgba(0, 0, 0, 0.06); color: rgba(0, 0, 0, 0.72); }
html[data-theme='light'] .editor-settings-chip.active { background: rgba(59, 130, 246, 0.12); color: #1d4ed8; }
html[data-theme='light'] .editor-settings-value { color: rgba(0, 0, 0, 0.68); }
html[data-theme='light'] .editor-settings-toggle { background: rgba(0, 0, 0, 0.08); }
html[data-theme='light'] .editor-settings-toggle.active { background: rgba(59, 130, 246, 0.24); }
html[data-theme='light'] .editor-settings-footer { border-top-color: rgba(0, 0, 0, 0.08); }
html[data-theme='light'] .editor-settings-reset { background: rgba(0, 0, 0, 0.06); color: rgba(0, 0, 0, 0.78); }
html[data-theme='light'] .editor-settings-reset:hover { background: rgba(0, 0, 0, 0.1); color: rgba(0, 0, 0, 0.92); }
html[data-theme='light'] .editor-search-input { border-color: rgba(0, 0, 0, 0.08); background: rgba(0, 0, 0, 0.03); color: rgba(0, 0, 0, 0.88); }
html[data-theme='light'] .editor-search-scope { background: rgba(0, 0, 0, 0.06); }
html[data-theme='light'] .editor-search-option { background: rgba(0, 0, 0, 0.05); color: rgba(0, 0, 0, 0.62); }
html[data-theme='light'] .editor-search-filter { background: rgba(0, 0, 0, 0.04); color: rgba(0, 0, 0, 0.68); }
html[data-theme='light'] .editor-search-scope-btn { color: rgba(0, 0, 0, 0.6); }
html[data-theme='light'] .editor-search-scope-btn.active, html[data-theme='light'] .editor-search-option.active { background: rgba(59, 130, 246, 0.12); color: #1d4ed8; }
html[data-theme='light'] .editor-search-filter.active { background: rgba(34, 197, 94, 0.14); color: #166534; }
html[data-theme='light'] .editor-search-close, html[data-theme='light'] .editor-search-nav, html[data-theme='light'] .editor-search-result { background: rgba(0, 0, 0, 0.05); color: rgba(0, 0, 0, 0.82); }
html[data-theme='light'] .editor-search-meta, html[data-theme='light'] .editor-search-result-snippet, html[data-theme='light'] .editor-search-result-meta { color: rgba(0, 0, 0, 0.54); }
html[data-theme='light'] .editor-search-result.active { background: rgba(59, 130, 246, 0.12); color: #1d4ed8; box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.12); }
html[data-theme='light'] .collab-users { border-color: rgba(0, 0, 0, 0.08); }
html[data-theme='light'] .collab-avatar { border-color: #ffffff; }
html[data-theme='light'] .header-action-btn, html[data-theme='light'] .close-btn, html[data-theme='light'] .toolbar-button, html[data-theme='light'] .code-language-chip, html[data-theme='light'] .cmd-icon { background: rgba(0, 0, 0, 0.06); color: rgba(0, 0, 0, 0.72); }
html[data-theme='light'] .header-action-btn.primary { background: rgba(59, 130, 246, 0.12); color: #1d4ed8; }
html[data-theme='light'] .toolbar-button:hover, html[data-theme='light'] .code-language-chip:hover, html[data-theme='light'] .outline-item:hover, html[data-theme='light'] .outline-toggle:hover, html[data-theme='light'] .to-top-button:hover { background: rgba(59, 130, 246, 0.12); color: #1d4ed8; }
html[data-theme='light'] .code-language-chip.active { background: rgba(59, 130, 246, 0.16); color: #1d4ed8; }
html[data-theme='light'] .editor-body.split-view { background: rgba(0, 0, 0, 0.08); }
html[data-theme='light'] .editor-toolbar { border-color: rgba(0, 0, 0, 0.06); background: linear-gradient(180deg, rgba(0, 0, 0, 0.03), rgba(0, 0, 0, 0.015)); }
html[data-theme='light'] .editor-textarea::placeholder { color: rgba(0, 0, 0, 0.3); }
html[data-theme='light'] .outline-toggle { opacity: 0.78; background: rgba(255, 255, 255, 0.88); color: rgba(15, 23, 42, 0.62); box-shadow: 0 10px 24px rgba(0, 0, 0, 0.08); }
html[data-theme='light'] .outline-toggle.armed { background: rgba(255, 255, 255, 0.98); color: rgba(15, 23, 42, 0.86); box-shadow: 0 14px 30px rgba(0, 0, 0, 0.12); }
html[data-theme='light'] .outline-toggle.open { opacity: 1; background: rgba(59, 130, 246, 0.14); color: #1d4ed8; }
html[data-theme='light'] .to-top-button { background: rgba(255, 255, 255, 0.92); color: rgba(15, 23, 42, 0.72); box-shadow: 0 10px 24px rgba(0, 0, 0, 0.1); opacity: 0.62; }
html[data-theme='light'] .outline-pane { border-color: rgba(0, 0, 0, 0.08); background: rgba(255, 255, 255, 0.9); }
html[data-theme='light'] .outline-item { color: rgba(0, 0, 0, 0.72); }
html[data-theme='light'] .outline-item.active { background: rgba(59, 130, 246, 0.12); color: #1d4ed8; box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.12); }
html[data-theme='light'] .preview-block.is-heavy:not(.is-deferred) { background: transparent; }
html[data-theme='light'] .preview-block.active { background: linear-gradient(135deg, rgba(59, 130, 246, 0.04), rgba(59, 130, 246, 0.015)); box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.07), 0 8px 18px rgba(37, 99, 235, 0.035); }
html[data-theme='light'] .preview-block-placeholder { border-color: rgba(0, 0, 0, 0.12); background: rgba(0, 0, 0, 0.02); color: rgba(0, 0, 0, 0.62); }
html[data-theme='light'] .preview-block-badge { background: rgba(59, 130, 246, 0.12); color: #2563eb; }
html[data-theme='light'] .slash-menu { border-color: rgba(0, 0, 0, 0.12); background: rgba(255, 255, 255, 0.96); box-shadow: 0 18px 42px rgba(0, 0, 0, 0.12); }
html[data-theme='light'] .slash-menu-item:hover, html[data-theme='light'] .slash-menu-item.active { background: rgba(0, 0, 0, 0.05); }
html[data-theme='light'] .footer-hint kbd, html[data-theme='light'] .cmd-shortcut { background: rgba(0, 0, 0, 0.06); }
html[data-theme='light'] .preview-content :deep(code) { background: rgba(0, 0, 0, 0.06); }
html[data-theme='light'] .preview-content :deep(.hljs) { color: #24292f; }
html[data-theme='light'] .preview-content :deep(.hljs-keyword), html[data-theme='light'] .preview-content :deep(.hljs-selector-tag), html[data-theme='light'] .preview-content :deep(.hljs-literal), html[data-theme='light'] .preview-content :deep(.hljs-title.function_) { color: #8250df; }
html[data-theme='light'] .preview-content :deep(.hljs-string), html[data-theme='light'] .preview-content :deep(.hljs-attr), html[data-theme='light'] .preview-content :deep(.hljs-template-string) { color: #116329; }
html[data-theme='light'] .preview-content :deep(.hljs-number), html[data-theme='light'] .preview-content :deep(.hljs-symbol), html[data-theme='light'] .preview-content :deep(.hljs-bullet) { color: #bc4c00; }
html[data-theme='light'] .preview-content :deep(.hljs-comment), html[data-theme='light'] .preview-content :deep(.hljs-quote) { color: #6e7781; font-style: italic; }
html[data-theme='light'] .preview-content :deep(.hljs-variable), html[data-theme='light'] .preview-content :deep(.hljs-title), html[data-theme='light'] .preview-content :deep(.hljs-property) { color: #0550ae; }
html[data-theme='light'] .preview-content :deep(.hljs-type), html[data-theme='light'] .preview-content :deep(.hljs-built_in), html[data-theme='light'] .preview-content :deep(.hljs-class .hljs-title) { color: #953800; }
html[data-theme='light'] .preview-content :deep(.hljs-meta), html[data-theme='light'] .preview-content :deep(.hljs-meta .hljs-keyword), html[data-theme='light'] .preview-content :deep(.hljs-doctag) { color: #0a7ea4; }
html[data-theme='light'] .preview-content :deep(.code-block-shell) { background: #f3f4f6; border: none; box-shadow: none; overflow: hidden; }
html[data-theme='light'] .preview-content :deep(.code-block-lang) { background: rgba(255, 255, 255, 0.72); color: rgba(15, 23, 42, 0.52); }
html[data-theme='light'] .preview-content :deep(pre) { background: transparent; border: none; }
html[data-theme='light'] .preview-content :deep(pre code) { background: transparent; box-shadow: none; }
html[data-theme='light'] .preview-content :deep(blockquote) { border-left-color: rgba(0, 0, 0, 0.2); color: rgba(0, 0, 0, 0.68); }
html[data-theme='light'] .preview-content :deep(th), html[data-theme='light'] .preview-content :deep(td) { border-color: rgba(0, 0, 0, 0.1); }
html[data-theme='light'] .preview-content :deep(th) { background: rgba(0, 0, 0, 0.04); }
html[data-theme='light'] .preview-content :deep(hr) { border-top-color: rgba(0, 0, 0, 0.1); }
html[data-theme='light'] .preview-content :deep(img) { background: rgba(0, 0, 0, 0.02); box-shadow: 0 12px 28px rgba(0, 0, 0, 0.08); }
html[data-theme='light'] .preview-content :deep(.preview-image-fallback) { border-color: rgba(0, 0, 0, 0.14); background: rgba(0, 0, 0, 0.02); color: rgba(0, 0, 0, 0.62); }
html[data-theme='light'] .preview-content :deep(.preview-image-fallback strong) { color: rgba(0, 0, 0, 0.82); }
html[data-theme='light'] .preview-content :deep(.preview-image-fallback-badge) { background: rgba(239, 68, 68, 0.1); color: #b91c1c; }
html[data-theme='light'] .image-lightbox { background: rgba(241, 245, 249, 0.82); }
html[data-theme='light'] .image-lightbox-close { background: rgba(15, 23, 42, 0.08); color: rgba(15, 23, 42, 0.86); }
html[data-theme='light'] .image-lightbox-media { background: rgba(255, 255, 255, 0.78); box-shadow: 0 22px 52px rgba(15, 23, 42, 0.18); }
html[data-theme='light'] .image-lightbox-caption { background: rgba(255, 255, 255, 0.88); color: rgba(15, 23, 42, 0.84); }
html[data-theme='light'] .preview-content :deep(.katex-block) { background: rgba(0, 0, 0, 0.03); }
html[data-theme='light'] .preview-content :deep(.mermaid-wrapper) { border-color: rgba(0, 0, 0, 0.08); background: rgba(0, 0, 0, 0.02); }
html[data-theme='light'] .preview-content :deep(.mermaid-block-lang) { background: rgba(255, 255, 255, 0.72); color: rgba(15, 23, 42, 0.52); }
html[data-theme='light'] .preview-content :deep(.mermaid-fallback) { background: rgba(255, 255, 255, 0.92); border-color: rgba(220, 38, 38, 0.16); color: #b91c1c; }
html[data-theme='light'] .preview-content :deep(.mermaid text),
html[data-theme='light'] .preview-content :deep(.mermaid .label),
html[data-theme='light'] .preview-content :deep(.mermaid .nodeLabel),
html[data-theme='light'] .preview-content :deep(.mermaid .edgeLabel),
html[data-theme='light'] .preview-content :deep(.mermaid .edgeLabel p),
html[data-theme='light'] .preview-content :deep(.mermaid .edgeLabel span),
html[data-theme='light'] .preview-content :deep(.mermaid .cluster-label text),
html[data-theme='light'] .preview-content :deep(.mermaid .cluster-label span),
html[data-theme='light'] .preview-content :deep(.mermaid .mindmap-node .label),
html[data-theme='light'] .preview-content :deep(.mermaid .mindmap-node text),
html[data-theme='light'] .preview-content :deep(.mermaid .mindmap-node foreignObject),
html[data-theme='light'] .preview-content :deep(.mermaid .mindmap-node foreignObject div) { fill: #172033 !important; color: #172033 !important; }
html[data-theme='light'] .preview-content :deep(.mermaid .edgeLabel rect),
html[data-theme='light'] .preview-content :deep(.mermaid .labelBkg) { fill: rgba(255, 255, 255, 0.96) !important; }
html[data-theme='light'] .preview-content :deep(.mermaid .edgePath path),
html[data-theme='light'] .preview-content :deep(.mermaid .flowchart-link),
html[data-theme='light'] .preview-content :deep(.mermaid .relationshipLine),
html[data-theme='light'] .preview-content :deep(.mermaid .messageLine0),
html[data-theme='light'] .preview-content :deep(.mermaid .messageLine1),
html[data-theme='light'] .preview-content :deep(.mermaid .mindmap-link),
html[data-theme='light'] .preview-content :deep(.mermaid .section-edge) { stroke: #7a93b8 !important; }
html[data-theme='light'] .preview-content :deep(.mermaid .arrowheadPath),
html[data-theme='light'] .preview-content :deep(.mermaid marker path) { fill: #7a93b8 !important; stroke: #7a93b8 !important; }
html[data-theme='light'] .preview-content :deep(.mermaid .node rect),
html[data-theme='light'] .preview-content :deep(.mermaid .node circle),
html[data-theme='light'] .preview-content :deep(.mermaid .node ellipse),
html[data-theme='light'] .preview-content :deep(.mermaid .node polygon),
html[data-theme='light'] .preview-content :deep(.mermaid .node path),
html[data-theme='light'] .preview-content :deep(.mermaid .cluster rect),
html[data-theme='light'] .preview-content :deep(.mermaid .cluster polygon),
html[data-theme='light'] .preview-content :deep(.mermaid .mindmap-node rect),
html[data-theme='light'] .preview-content :deep(.mermaid .mindmap-node circle),
html[data-theme='light'] .preview-content :deep(.mermaid .mindmap-node path) { stroke: rgba(122, 147, 184, 0.46) !important; }
html[data-theme='light'] .preview-content :deep(.mermaid .cluster rect),
html[data-theme='light'] .preview-content :deep(.mermaid .cluster polygon) { fill: rgba(245, 247, 251, 0.96) !important; }
html[data-theme='light'] .preview-content :deep(.mermaid .mindmap-node:nth-of-type(4n + 1) rect),
html[data-theme='light'] .preview-content :deep(.mermaid .mindmap-node:nth-of-type(4n + 1) circle),
html[data-theme='light'] .preview-content :deep(.mermaid .mindmap-node:nth-of-type(4n + 1) path) { fill: #d8e7ff !important; }
html[data-theme='light'] .preview-content :deep(.mermaid .mindmap-node:nth-of-type(4n + 2) rect),
html[data-theme='light'] .preview-content :deep(.mermaid .mindmap-node:nth-of-type(4n + 2) circle),
html[data-theme='light'] .preview-content :deep(.mermaid .mindmap-node:nth-of-type(4n + 2) path) { fill: #dff4ea !important; }
html[data-theme='light'] .preview-content :deep(.mermaid .mindmap-node:nth-of-type(4n + 3) rect),
html[data-theme='light'] .preview-content :deep(.mermaid .mindmap-node:nth-of-type(4n + 3) circle),
html[data-theme='light'] .preview-content :deep(.mermaid .mindmap-node:nth-of-type(4n + 3) path) { fill: #fff1d6 !important; }
html[data-theme='light'] .preview-content :deep(.mermaid .mindmap-node:nth-of-type(4n + 4) rect),
html[data-theme='light'] .preview-content :deep(.mermaid .mindmap-node:nth-of-type(4n + 4) circle),
html[data-theme='light'] .preview-content :deep(.mermaid .mindmap-node:nth-of-type(4n + 4) path) { fill: #f4e3ff !important; }
html[data-theme='light'] .preview-content::-webkit-scrollbar-thumb, html[data-theme='light'] .editor-textarea::-webkit-scrollbar-thumb, html[data-theme='light'] .slash-menu-scroll::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.14); }
html[data-theme='light'] .preview-content::-webkit-scrollbar-thumb:hover, html[data-theme='light'] .editor-textarea::-webkit-scrollbar-thumb:hover, html[data-theme='light'] .slash-menu-scroll::-webkit-scrollbar-thumb:hover { background: rgba(0, 0, 0, 0.22); }
</style>
