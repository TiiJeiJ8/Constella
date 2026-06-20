<template>
    <div class="todo-wrap">
        <button v-if="!isOpen" class="todo-fab" :title="t('canvas.todo.open')" @click="open">
            <svg class="fab-icon" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="5.5" y="4.5" width="13" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="1.7" />
                <path d="M8 10l2.5 2.5 5-5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" />
            </svg>
            <span class="fab-badge">{{ incCnt }}</span>
        </button>

        <Transition name="todo-pop">
            <div v-if="isOpen" ref="panelRef" class="todo-panel" :style="panelStyle" @mousedown.stop>
                <div class="tp-head" @mousedown.prevent="startDrag">
                    <div class="tp-heading">
                        <span class="tp-title">{{ t('canvas.todo.title') }}</span>
                        <span class="tp-summary">{{ t('canvas.todo.pendingCount', { count: incCnt }) }}</span>
                    </div>
                    <div class="tp-head-actions">
                        <button class="tp-mini-btn" :title="t('canvas.todo.small')" :disabled="isSmallSize" @click="resize(SMALL_SIZE)">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <rect x="6.5" y="7.5" width="11" height="9" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.8" />
                                <path d="M9.5 10.5h5M9.5 13.5h3" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.6" />
                            </svg>
                        </button>
                        <button class="tp-mini-btn" :title="t('canvas.todo.large')" :disabled="isLargeSize" @click="resize(LARGE_SIZE)">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <rect x="4.75" y="5.25" width="14.5" height="13.5" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.8" />
                                <path d="M8 9.25h8M8 12.25h6M8 15.25h4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.6" />
                            </svg>
                        </button>
                        <button class="tp-icon-btn" :title="t('canvas.todo.clearLocalTodos')" @click="requestClearLocalTodos">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M7 7h10M9 7V5h6v2M9 11v6M15 11v6M6.5 7l.8 13h9.4l.8-13" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" />
                            </svg>
                        </button>
                        <button class="tp-icon-btn" :title="t('common.close')" @click="isOpen = false">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="m7 7 10 10M17 7 7 17" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div class="tp-add">
                    <div class="tp-row1">
                        <input ref="inputRef" v-model="txt" class="tp-inp" :placeholder="t('canvas.todo.placeholder')" @keydown.enter="add" />
                        <button class="tp-addbtn" :title="t('canvas.todo.add')" :disabled="!txt.trim()" @click="add">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2" />
                            </svg>
                        </button>
                    </div>
                    <div class="tp-filters">
                        <button
                            v-for="option in filterOptions"
                            :key="option.value"
                            class="tp-filter"
                            :class="{ active: filterMode === option.value }"
                            @click="filterMode = option.value"
                        >
                            {{ option.label }}
                        </button>
                    </div>
                </div>

                <div ref="listRef" class="tp-list">
                    <div v-if="visibleTodos.length === 0" class="tp-empty">
                        <svg class="tp-empty-icon" viewBox="0 0 24 24" aria-hidden="true">
                            <rect x="5.5" y="4.5" width="13" height="15" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.7" />
                            <path d="M8.5 10.5h7M8.5 14h4.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.7" />
                        </svg>
                        <span style="user-select:none">{{ t('canvas.todo.empty') }}</span>
                    </div>
                    <TransitionGroup v-else name="todo-row">
                        <div v-for="item in visibleTodos" :key="item.id" class="tp-row" :class="{ done: item.done }">
                            <button class="tp-cb" :title="item.done ? t('canvas.todo.markUndone') : t('canvas.todo.markDone')" :class="{ chk: item.done }" @click="tog(item.id)">
                                <svg v-if="item.done" class="tp-cbic" viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M6 12.5 10 16.5 18 8" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" />
                                </svg>
                            </button>
                            <div class="tp-body">
                                <input
                                    v-if="editingId === item.id"
                                    v-model="editingText"
                                    class="tp-edit-input"
                                    :placeholder="t('canvas.todo.editPlaceholder')"
                                    @keydown.enter="commitEdit(item.id)"
                                    @keydown.esc.stop="cancelEdit"
                                    @blur="commitEdit(item.id)"
                                />
                                <span v-else class="tp-lbl" :class="{ done: item.done }" @dblclick="startEdit(item)">{{ item.text }}</span>
                                <div class="tp-meta">
                                    <button class="tp-assign" @click.stop="toggleAssign(item.id)">{{ assignName(item) }}</button>
                                    <span class="tp-date-label">{{ t('canvas.todo.createdAt', { date: fmtCreatedDate(item.createdAt) }) }}</span>
                                    <div class="tp-item-date-wrap" :class="dateClass(item)">
                                        <svg class="tp-item-date-icon" viewBox="0 0 24 24" aria-hidden="true">
                                            <rect x="4" y="5.5" width="16" height="14" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.8" />
                                            <path d="M8 3.8v3.4M16 3.8v3.4M4.5 10h15" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8" />
                                        </svg>
                                        <span class="tp-item-date-display">{{ fmtDueDate(item.dueDate) }}</span>
                                        <input
                                            type="date"
                                            class="tp-item-date"
                                            :title="t('canvas.todo.selectDdl')"
                                            :value="dateToInput(item.dueDate)"
                                            @pointerdown.prevent="openDateInputPicker"
                                            @change="setTodoDueDate(item.id, ($event.target as HTMLInputElement).value)"
                                        />
                                        <button
                                            v-if="item.dueDate"
                                            class="tp-item-date-clear"
                                            :title="t('canvas.todo.clearDdl')"
                                            @click="setTodoDueDate(item.id, '')"
                                        >
                                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                                <path d="m8 8 8 8M16 8l-8 8" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                                <div v-if="activeAssign === item.id" class="tp-dropdown" @click.stop>
                                    <div v-if="members.length === 0" class="tp-drop-empty">{{ t('canvas.todo.noMembers') }}</div>
                                    <div v-for="u in members" :key="u.id" class="tp-drop-item" :class="{ sel: item.assigneeId === u.id }" @click="setAssign(item.id, u)">
                                        {{ u.name }}<span v-if="u.isMe"> ({{ t('canvas.todo.me') }})</span>
                                    </div>
                                    <div v-if="item.assigneeId" class="tp-drop-div"></div>
                                    <div v-if="item.assigneeId" class="tp-drop-item danger" @click="clearAssign(item.id)">{{ t('canvas.todo.clearAssignee') }}</div>
                                </div>
                            </div>
                            <button class="tp-del" :title="t('canvas.todo.delete')" @click="del(item.id)">
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M8 7h8M10 7V5h4v2M9 10v7M15 10v7M6.5 7l.8 13h9.4l.8-13" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" />
                                </svg>
                            </button>
                        </div>
                    </TransitionGroup>
                </div>

                <div class="tp-resize-handle" @mousedown.prevent="startResize"></div>
            </div>
        </Transition>

        <ConfirmDialog
            v-model="isClearLocalTodosDialogOpen"
            :title="t('canvas.todo.clearLocalTodos')"
            :message="t('canvas.todo.clearLocalTodosConfirm')"
            :confirm-text="t('common.delete')"
            type="danger"
            @confirm="confirmClearLocalTodos"
        />
    </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import type { CSSProperties } from 'vue'
import { useI18n } from 'vue-i18n'
import ConfirmDialog from '@/components/base/ConfirmDialog.vue'
import { apiService } from '@/services/api'
import { loadTodoCache, removeTodoCache, saveTodoCache, type CachedTodoItem } from '@/utils/storage'

type Todo = CachedTodoItem
interface UserOpt { id: string; name: string; isMe: boolean }

const props = defineProps<{ members: UserOpt[]; roomId: string }>()
const { t } = useI18n()

const isOpen = ref(false)
const txt = ref('')
const todos = ref<Todo[]>([])
const activeAssign = ref<string | null>(null)
const filterMode = ref<'all' | 'active' | 'mine' | 'overdue' | 'unassigned'>('all')
const editingId = ref<string | null>(null)
const editingText = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const listRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const isClearLocalTodosDialogOpen = ref(false)
const serverUrl = computed(() => apiService.getBaseUrl() || localStorage.getItem('serverUrl') || '')
const panelX = ref(0)
const panelY = ref(0)
const dragOffX = ref(0)
const dragOffY = ref(0)
const isDrag = ref(false)
const SMALL_SIZE = { w: 320, h: 420 }
const LARGE_SIZE = { w: 440, h: 620 }
const pw = ref(SMALL_SIZE.w)
const ph = ref(SMALL_SIZE.h)
const resizing = ref(false)
const resOffX = ref(0)
const resOffY = ref(0)

const panelStyle = computed<CSSProperties>(() => {
    return isDrag.value || panelX.value !== 0 || panelY.value !== 0
        ? { position: 'fixed', left: `${panelX.value}px`, top: `${panelY.value}px`, width: `${pw.value}px`, height: `${ph.value}px` }
        : { width: `${pw.value}px`, height: `${ph.value}px` }
})
const incCnt = computed(() => todos.value.filter(todo => !todo.done).length)
const isSmallSize = computed(() => pw.value <= SMALL_SIZE.w && ph.value <= SMALL_SIZE.h)
const isLargeSize = computed(() => pw.value >= LARGE_SIZE.w && ph.value >= LARGE_SIZE.h)
const currentUserId = computed(() => props.members.find(user => user.isMe)?.id || '')
const filterOptions = computed(() => [
    { value: 'all' as const, label: t('canvas.todo.filterAll') },
    { value: 'active' as const, label: t('canvas.todo.filterActive') },
    { value: 'mine' as const, label: t('canvas.todo.filterMine') },
    { value: 'overdue' as const, label: t('canvas.todo.filterOverdue') },
    { value: 'unassigned' as const, label: t('canvas.todo.filterUnassigned') }
])
const sorted = computed(() => [...todos.value].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    const aD = Boolean(a.dueDate)
    const bD = Boolean(b.dueDate)
    if (aD !== bD) return aD ? -1 : 1
    if (aD) return new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()
    return b.createdAt - a.createdAt
}))
const visibleTodos = computed(() => sorted.value.filter(todo => {
    if (filterMode.value === 'active') return !todo.done
    if (filterMode.value === 'mine') return Boolean(currentUserId.value) && todo.assigneeId === currentUserId.value
    if (filterMode.value === 'overdue') return !todo.done && Boolean(todo.dueDate) && daysFromToday(todo.dueDate!) < 0
    if (filterMode.value === 'unassigned') return !todo.assigneeId
    return true
}))

function open() {
    const btn = document.querySelector('.todo-fab')
    if (btn) {
        const r = btn.getBoundingClientRect()
        panelX.value = r.left
        panelY.value = r.bottom + 4
    }
    isOpen.value = true
    nextTick(() => inputRef.value?.focus())
}

function genId() {
    return `t${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

function add() {
    const text = txt.value.trim()
    if (!text) return

    todos.value.unshift({ id: genId(), text, done: false, createdAt: Date.now() })
    txt.value = ''
    save()
    nextTick(() => {
        if (listRef.value) listRef.value.scrollTop = 0
    })
}

function inputDateToIso(value: string): string | undefined {
    return value ? new Date(`${value}T12:00`).toISOString() : undefined
}

function dateToInput(value?: string): string {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function startOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function daysFromToday(d: string): number {
    return Math.round((startOfDay(new Date(d)).getTime() - startOfDay(new Date()).getTime()) / 86400000)
}

function fmtCreatedDate(timestamp: number): string {
    const dt = new Date(timestamp)
    return `${dt.getMonth() + 1}/${dt.getDate()}`
}

function fmtDueDate(value?: string): string {
    if (!value) return 'DDL'
    const dt = new Date(value)
    if (Number.isNaN(dt.getTime())) return 'DDL'
    return `${dt.getFullYear()}/${dt.getMonth() + 1}/${dt.getDate()}`
}

function dateClass(item: Todo): string {
    if (!item.dueDate || item.done) return ''
    const diff = daysFromToday(item.dueDate)
    if (diff < 0) return 'overdue'
    if (diff === 0) return 'today'
    return ''
}

function tog(id: string) {
    const item = todos.value.find(todo => todo.id === id)
    if (item) {
        item.done = !item.done
        save()
    }
}

function startEdit(item: Todo) {
    editingId.value = item.id
    editingText.value = item.text
    nextTick(() => {
        const input = panelRef.value?.querySelector('.tp-edit-input') as HTMLInputElement | null
        input?.focus()
        input?.select()
    })
}

function commitEdit(id: string) {
    if (editingId.value !== id) return
    const text = editingText.value.trim()
    if (!text) {
        cancelEdit()
        return
    }

    const item = todos.value.find(todo => todo.id === id)
    if (item && item.text !== text) {
        item.text = text
        save()
    }
    cancelEdit()
}

function cancelEdit() {
    editingId.value = null
    editingText.value = ''
}

function del(id: string) {
    todos.value = todos.value.filter(todo => todo.id !== id)
    save()
}

function toggleAssign(id: string) {
    activeAssign.value = activeAssign.value === id ? null : id
}

function assignName(item: Todo): string {
    return item.assigneeName || t('canvas.todo.unassigned')
}

function setAssign(id: string, user: UserOpt) {
    const item = todos.value.find(todo => todo.id === id)
    if (item) {
        item.assigneeId = user.id
        item.assigneeName = user.name
        activeAssign.value = null
        save()
    }
}

function clearAssign(id: string) {
    const item = todos.value.find(todo => todo.id === id)
    if (item) {
        item.assigneeId = undefined
        item.assigneeName = undefined
        activeAssign.value = null
        save()
    }
}

function setTodoDueDate(id: string, value: string) {
    const item = todos.value.find(todo => todo.id === id)
    if (!item) return

    item.dueDate = inputDateToIso(value)
    save()
}

function openDateInputPicker(event: PointerEvent) {
    const input = event.currentTarget as HTMLInputElement | null
    if (!input) return

    input.focus()
    if (typeof input.showPicker === 'function') {
        input.showPicker()
    } else {
        input.click()
    }
}

function startDrag(e: MouseEvent) {
    if (!panelRef.value) return
    const r = panelRef.value.getBoundingClientRect()
    panelX.value = r.left
    panelY.value = r.top
    isDrag.value = true
    dragOffX.value = e.clientX - r.left
    dragOffY.value = e.clientY - r.top
    document.addEventListener('mousemove', onDrag)
    document.addEventListener('mouseup', stopDrag)
}

function onDrag(e: MouseEvent) {
    panelX.value = e.clientX - dragOffX.value
    panelY.value = e.clientY - dragOffY.value
}

function stopDrag() {
    isDrag.value = false
    document.removeEventListener('mousemove', onDrag)
    document.removeEventListener('mouseup', stopDrag)
}

function startResize(e: MouseEvent) {
    if (!panelRef.value) return
    const r = panelRef.value.getBoundingClientRect()
    pw.value = r.width
    ph.value = r.height
    resizing.value = true
    resOffX.value = e.clientX
    resOffY.value = e.clientY
    document.addEventListener('mousemove', onResize)
    document.addEventListener('mouseup', stopResize)
}

function onResize(e: MouseEvent) {
    pw.value = Math.max(SMALL_SIZE.w, pw.value + (e.clientX - resOffX.value))
    ph.value = Math.max(SMALL_SIZE.h, ph.value + (e.clientY - resOffY.value))
    resOffX.value = e.clientX
    resOffY.value = e.clientY
}

function stopResize() {
    resizing.value = false
    document.removeEventListener('mousemove', onResize)
    document.removeEventListener('mouseup', stopResize)
}

function resize(sz: { w: number; h: number }) {
    pw.value = sz.w
    ph.value = sz.h
}

function onClick(e: MouseEvent) {
    const target = e.target as HTMLElement
    if (!target.closest('.todo-panel') && !target.closest('.todo-fab')) activeAssign.value = null
}

function onKeydown(e: KeyboardEvent) {
    if (!isOpen.value || e.key !== 'Escape') return
    if (editingId.value) {
        cancelEdit()
        return
    }
    if (activeAssign.value) {
        activeAssign.value = null
        return
    }
    isOpen.value = false
}

function requestClearLocalTodos() {
    if (todos.value.length === 0) return
    isClearLocalTodosDialogOpen.value = true
}

function confirmClearLocalTodos() {
    todos.value = []
    activeAssign.value = null
    cancelEdit()
    isClearLocalTodosDialogOpen.value = false
    removeTodoCache(serverUrl.value, props.roomId)
}

function save() {
    saveTodoCache(serverUrl.value, props.roomId, todos.value)
}

function load() {
    todos.value = loadTodoCache(serverUrl.value, props.roomId)
}

onMounted(() => {
    load()
    document.addEventListener('click', onClick)
    document.addEventListener('keydown', onKeydown)
})

watch(() => props.roomId, () => {
    activeAssign.value = null
    cancelEdit()
    load()
})

onUnmounted(() => {
    document.removeEventListener('mousemove', onDrag)
    document.removeEventListener('mouseup', stopDrag)
    document.removeEventListener('mousemove', onResize)
    document.removeEventListener('mouseup', stopResize)
    document.removeEventListener('click', onClick)
    document.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.todo-wrap{position:relative;display:inline-flex;align-items:center}
.todo-fab{display:inline-flex;align-items:center;gap:5px;padding:7px 10px;border-radius:8px;background:var(--canvas-toolbar-bg);backdrop-filter:blur(20px);border:1px solid var(--border-color);color:var(--text-primary);cursor:pointer;font-size:12px;transition:transform .2s,box-shadow .2s,border-color .2s;white-space:nowrap;box-shadow:var(--shadow-sm)}
.todo-fab:hover{border-color:var(--color-primary);box-shadow:var(--shadow-md);transform:translateY(-1px)}
.fab-icon{width:16px;height:16px;display:block}
.fab-badge{min-width:18px;height:18px;padding:0 5px;border-radius:9px;display:inline-flex;align-items:center;justify-content:center;background:var(--color-primary);color:#fff;font-size:10px;font-weight:700}
.todo-panel{background:color-mix(in srgb,var(--canvas-panel-bg) 90%,transparent);backdrop-filter:blur(20px);border:1px solid color-mix(in srgb,var(--border-color) 82%,transparent);border-radius:14px;box-shadow:0 12px 32px rgba(0,0,0,.14);z-index:200;overflow:hidden;display:flex;flex-direction:column;position:fixed}
.tp-head{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;cursor:grab;flex-shrink:0;border-bottom:1px solid color-mix(in srgb,var(--border-color) 65%,transparent)}
.tp-head:active{cursor:grabbing}
.tp-heading{display:flex;flex-direction:column;gap:2px;min-width:0}
.tp-title{font-size:14px;font-weight:600;color:var(--text-primary)}
.tp-summary{font-size:11px;color:var(--text-tertiary)}
.tp-head-actions{display:flex;align-items:center;gap:2px}
.tp-mini-btn{width:24px;height:24px;border-radius:6px;border:0;background:transparent;color:var(--text-tertiary);cursor:pointer;transition:all .15s;display:flex;align-items:center;justify-content:center}
.tp-mini-btn svg{width:15px;height:15px}
.tp-mini-btn:hover{background:var(--bg-tertiary);color:var(--text-primary)}
.tp-mini-btn:disabled{cursor:default;background:var(--bg-tertiary);color:var(--color-primary);opacity:.85}
.tp-icon-btn{width:26px;height:26px;border-radius:6px;border:none;background:transparent;color:var(--text-secondary);cursor:pointer;display:flex;align-items:center;justify-content:center}
.tp-icon-btn svg{width:15px;height:15px}
.tp-icon-btn:hover{background:var(--bg-tertiary);color:var(--text-primary)}
.tp-add{display:flex;flex-direction:column;gap:8px;padding:10px 12px 8px;flex-shrink:0;border-bottom:1px solid color-mix(in srgb,var(--border-color) 35%,transparent)}
.tp-row1{display:flex;gap:6px}
.tp-inp{flex:1;height:34px;padding:0 10px;border-radius:7px;border:1px solid color-mix(in srgb,var(--border-color) 80%,transparent);background:color-mix(in srgb,var(--bg-secondary) 82%,transparent);color:var(--text-primary);font-size:13px;outline:none;min-width:0}
.tp-inp:focus{border-color:var(--color-primary)}
.tp-addbtn{width:34px;height:34px;border-radius:7px;border:none;background:var(--color-primary);color:#fff;cursor:pointer;line-height:1;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:transform .15s,opacity .15s}
.tp-addbtn svg{width:17px;height:17px}
.tp-addbtn:hover:not(:disabled){transform:translateY(-1px)}
.tp-addbtn:disabled{opacity:.4;cursor:default}
.tp-filters::-webkit-scrollbar{display:none}
.tp-filters{display:flex;gap:4px;overflow-x:auto;margin-top:-2px}
.tp-filter{height:24px;padding:0 8px;border-radius:999px;border:0;background:transparent;color:var(--text-secondary);font-size:10px;font-weight:600;cursor:pointer;white-space:nowrap;transition:all .15s}
.tp-filter:hover{color:var(--text-primary);background:color-mix(in srgb,var(--bg-secondary) 70%,transparent)}
.tp-filter.active{background:color-mix(in srgb,var(--color-primary) 10%,transparent);color:var(--color-primary)}
.tp-list{flex:1;overflow-y:auto;padding:8px 14px 10px;display:flex;flex-direction:column;gap:2px}
.tp-list::-webkit-scrollbar{width:4px}
.tp-list::-webkit-scrollbar-thumb{background:var(--border-color);border-radius:2px}
.tp-empty{margin:auto;min-height:120px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;text-align:center;color:var(--text-tertiary);font-size:13px}
.tp-empty-icon{width:28px;height:28px;opacity:.46}
.tp-row{display:flex;align-items:flex-start;gap:9px;padding:8px 6px;margin:0 -6px;border-radius:8px;transition:background .15s}
.tp-row:hover{background:color-mix(in srgb,var(--bg-secondary) 82%,transparent)}
.tp-cb{width:18px;height:18px;min-width:18px;margin-top:2px;border-radius:5px;border:1.6px solid var(--border-color);background:transparent;display:flex;align-items:center;justify-content:center;cursor:pointer;color:transparent;transition:all .15s}
.tp-cb:hover{border-color:var(--color-primary)}
.tp-cb.chk{background:var(--color-primary);border-color:var(--color-primary);color:#fff}
.tp-cbic{width:13px;height:13px;display:block;animation:todo-check .24s cubic-bezier(.2,.8,.2,1)}
@keyframes todo-check{0%{transform:scale(.35) rotate(-12deg);opacity:0}70%{transform:scale(1.18) rotate(0);opacity:1}100%{transform:scale(1);opacity:1}}
.tp-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.tp-lbl{font-size:13px;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;line-height:1.4}
.tp-lbl.done{text-decoration:line-through;color:var(--text-tertiary)}
.tp-edit-input{height:24px;width:100%;padding:0 7px;border-radius:6px;border:1px solid var(--color-primary);background:var(--bg-primary);color:var(--text-primary);font-size:13px;outline:none}
.tp-meta{display:flex;align-items:center;gap:5px;flex-wrap:nowrap;min-width:0;overflow:hidden}
.tp-assign{height:20px;max-width:92px;padding:0 7px;border-radius:999px;border:1px solid color-mix(in srgb,var(--border-color) 62%,transparent);background:color-mix(in srgb,var(--bg-secondary) 72%,transparent);color:var(--text-secondary);font-size:11px;line-height:18px;cursor:pointer;transition:all .15s;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex-shrink:1}
.tp-assign:hover{color:var(--color-primary);border-color:color-mix(in srgb,var(--color-primary) 35%,transparent);background:color-mix(in srgb,var(--color-primary) 8%,transparent)}
.tp-date-label{font-size:11px;color:var(--text-tertiary);white-space:nowrap;flex-shrink:0}
.tp-date-label.today{color:#2563eb}
.tp-date-label.overdue{color:#ef4444;font-weight:600}
.tp-item-date-wrap{position:relative;height:22px;display:inline-flex;align-items:center;border:0;border-radius:999px;background:color-mix(in srgb,var(--bg-secondary) 68%,transparent);color:var(--text-secondary);overflow:hidden;flex-shrink:0}
.tp-item-date-wrap.today{color:#2563eb}
.tp-item-date-wrap.overdue{color:#ef4444}
.tp-item-date-icon{width:12px;height:12px;margin-left:7px;flex-shrink:0;opacity:.82;pointer-events:none}
.tp-item-date-display{min-width:34px;padding:0 7px 0 4px;font-size:11px;line-height:22px;text-align:center;pointer-events:none}
.tp-item-date{position:absolute;inset:0;z-index:1;width:100%;height:100%;padding:0;border:0;background:transparent;color:transparent;font-size:16px;outline:none;cursor:pointer;opacity:0}
.tp-item-date:focus{color:var(--text-primary)}
.tp-item-date-clear{position:relative;z-index:2;width:18px;height:20px;border:0;background:transparent;color:var(--text-tertiary);cursor:pointer;display:flex;align-items:center;justify-content:center}
.tp-item-date-clear svg{width:12px;height:12px}
.tp-item-date-clear:hover{color:#ef4444;background:rgba(239,68,68,.08)}
.tp-dropdown{margin-top:4px;background:var(--canvas-panel-bg);backdrop-filter:blur(20px);border:1px solid var(--border-color);border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,.12);padding:4px;position:relative;z-index:300}
.tp-drop-empty{padding:8px 10px;color:var(--text-tertiary);font-size:12px}
.tp-drop-item{display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:6px;font-size:12px;color:var(--text-primary);cursor:pointer;transition:background .15s}
.tp-drop-item:hover{background:var(--bg-secondary)}
.tp-drop-item.sel{background:rgba(102,126,234,.08);color:var(--color-primary)}
.tp-drop-item.danger{color:#ef4444}
.tp-drop-item.danger:hover{background:rgba(239,68,68,.08)}
.tp-drop-div{height:1px;margin:3px 6px;background:var(--border-color)}
.tp-del{width:24px;height:24px;min-width:24px;margin-top:1px;border-radius:6px;border:none;background:transparent;color:var(--text-tertiary);cursor:pointer;opacity:0;transition:all .15s;display:flex;align-items:center;justify-content:center}
.tp-del svg{width:16px;height:16px}
.tp-row:hover .tp-del{opacity:1}
.tp-del:hover{background:rgba(239,68,68,.12);color:#ef4444}
.tp-resize-handle{position:absolute;bottom:0;right:0;width:16px;height:16px;cursor:nwse-resize;background:linear-gradient(135deg,transparent 50%,var(--text-tertiary) 50%);opacity:.3;transition:opacity .2s}
.tp-resize-handle:hover{opacity:.7}
.todo-pop-enter-active,.todo-pop-leave-active{transition:opacity .18s ease,transform .18s ease}
.todo-pop-enter-from,.todo-pop-leave-to{opacity:0;transform:translateY(-6px) scale(.98)}
.todo-row-enter-active,.todo-row-leave-active,.todo-row-move{transition:all .2s ease}
.todo-row-enter-from,.todo-row-leave-to{opacity:0;transform:translateY(-4px)}
.todo-row-leave-active{position:absolute}
</style>
