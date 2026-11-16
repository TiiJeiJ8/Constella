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
                                    <label class="tp-drop-check">
                                        <input type="checkbox" :checked="item.isPublic" @change="setPublic(item.id, ($event.target as HTMLInputElement).checked)" />
                                        <span>{{ t('canvas.todo.assignPublic') }}</span>
                                    </label>
                                    <div class="tp-drop-div"></div>
                                    <div class="tp-drop-label">{{ t('canvas.todo.assignPerson') }}</div>
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

type TodoSource = 'local' | 'shared'
type Todo = CachedTodoItem & { source: TodoSource }
interface UserOpt { id: string; name: string; isMe: boolean }

const props = defineProps<{ members: UserOpt[]; roomId: string }>()
const { t } = useI18n()

const isOpen = ref(false)
const txt = ref('')
const localTodos = ref<CachedTodoItem[]>([])
const sharedTodos = ref<CachedTodoItem[]>([])
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
let sharedSyncTimer: number | null = null
let isSharedSyncing = false

const panelStyle = computed<CSSProperties>(() => {
    return isDrag.value || panelX.value !== 0 || panelY.value !== 0
        ? { position: 'fixed', left: `${panelX.value}px`, top: `${panelY.value}px`, width: `${pw.value}px`, height: `${ph.value}px` }
        : { width: `${pw.value}px`, height: `${ph.value}px` }
})
const todos = computed<Todo[]>(() => [
    ...localTodos.value.map(todo => ({ ...todo, source: 'local' as const })),
    ...sharedTodos.value.map(todo => ({ ...todo, source: 'shared' as const }))
])
const visibleByPermission = computed(() => todos.value.filter(canViewTodo))
const incCnt = computed(() => visibleByPermission.value.filter(todo => !todo.done).length)
const isSmallSize = computed(() => pw.value <= SMALL_SIZE.w && ph.value <= SMALL_SIZE.h)
const isLargeSize = computed(() => pw.value >= LARGE_SIZE.w && ph.value >= LARGE_SIZE.h)
const currentUserId = computed(() => props.members.find(user => user.isMe)?.id || '')
const currentUserName = computed(() => props.members.find(user => user.isMe)?.name || '')
const filterOptions = computed(() => [
    { value: 'all' as const, label: t('canvas.todo.filterAll') },
    { value: 'active' as const, label: t('canvas.todo.filterActive') },
    { value: 'mine' as const, label: t('canvas.todo.filterMine') },
    { value: 'overdue' as const, label: t('canvas.todo.filterOverdue') },
    { value: 'unassigned' as const, label: t('canvas.todo.filterUnassigned') }
])
const sorted = computed(() => [...visibleByPermission.value].sort((a, b) => {
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

function startSharedSyncTimer() {
    if (sharedSyncTimer != null) return
    sharedSyncTimer = window.setInterval(() => {
        void syncSharedTodos()
    }, 3000)
}

function stopSharedSyncTimer() {
    if (sharedSyncTimer == null) return
    window.clearInterval(sharedSyncTimer)
    sharedSyncTimer = null
}

function open() {
    const btn = document.querySelector('.todo-fab')
    if (btn) {
        const r = btn.getBoundingClientRect()
        panelX.value = r.left
        panelY.value = r.bottom + 4
    }
    isOpen.value = true
    void syncSharedTodos()
    startSharedSyncTimer()
    nextTick(() => inputRef.value?.focus())
}

function genId() {
    return `t${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

function toLocalTodo(todo: CachedTodoItem): CachedTodoItem {
    const { id, text, done, dueDate, assigneeId, assigneeName, creatorId, creatorName, isPublic, createdAt } = todo
    return { id, text, done, dueDate, assigneeId, assigneeName, creatorId, creatorName, isPublic, createdAt }
}

function fromServerTodo(raw: any): CachedTodoItem {
    return {
        id: String(raw.id),
        text: String(raw.text || ''),
        done: Boolean(raw.done),
        dueDate: raw.due_date || undefined,
        assigneeId: raw.assignee_id || undefined,
        assigneeName: raw.assignee_name || undefined,
        creatorId: raw.creator_id || undefined,
        creatorName: raw.creator_name || undefined,
        isPublic: Boolean(raw.is_public),
        createdAt: new Date(raw.created_at || Date.now()).getTime()
    }
}

function toServerPayload(todo: CachedTodoItem) {
    return {
        text: todo.text,
        done: todo.done,
        dueDate: todo.dueDate || null,
        assigneeId: todo.assigneeId || null,
        assigneeName: todo.assigneeName || null,
        creatorName: todo.creatorName || currentUserName.value || null,
        isPublic: Boolean(todo.isPublic)
    }
}

async function syncSharedTodos() {
    if (isSharedSyncing) return
    isSharedSyncing = true
    try {
        const result = await apiService.getRoomTodos(props.roomId)
        if (result.success) {
            sharedTodos.value = Array.isArray(result.data) ? result.data.map(fromServerTodo) : []
        }
    } finally {
        isSharedSyncing = false
    }
}

function canViewTodo(item: Todo): boolean {
    if (item.source === 'local') return true
    if (item.isPublic) return true
    if (!item.assigneeId) return true
    return Boolean(currentUserId.value) && (item.creatorId === currentUserId.value || item.assigneeId === currentUserId.value)
}

function findTodo(id: string): Todo | null {
    return todos.value.find(todo => todo.id === id) || null
}

function removeLocalTodo(id: string) {
    localTodos.value = localTodos.value.filter(todo => todo.id !== id)
    save()
}

async function writeTodo(todo: Todo | CachedTodoItem, targetSource?: TodoSource) {
    const next = toLocalTodo(todo)
    const source = targetSource || ('source' in todo ? todo.source : 'local')

    if (source === 'shared') {
        const result = 'source' in todo && todo.source === 'shared'
            ? await apiService.updateRoomTodo(props.roomId, next.id, toServerPayload(next))
            : await apiService.createRoomTodo(props.roomId, toServerPayload(next))
        if (result.success && result.data) {
            const saved = fromServerTodo(result.data)
            sharedTodos.value = [saved, ...sharedTodos.value.filter(item => item.id !== saved.id)]
            removeLocalTodo(next.id)
            return
        }
        return
    }

    if ('source' in todo && todo.source === 'shared') {
        await apiService.deleteRoomTodo(props.roomId, next.id)
        sharedTodos.value = sharedTodos.value.filter(item => item.id !== next.id)
    }
    const index = localTodos.value.findIndex(item => item.id === next.id)
    if (index >= 0) {
        localTodos.value.splice(index, 1, next)
    } else {
        localTodos.value.unshift(next)
    }
    save()
}

function add() {
    const text = txt.value.trim()
    if (!text) return

    localTodos.value.unshift({
        id: genId(),
        text,
        done: false,
        creatorId: currentUserId.value || undefined,
        creatorName: currentUserName.value || undefined,
        isPublic: false,
        createdAt: Date.now()
    })
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
    const item = findTodo(id)
    if (item) {
        void writeTodo({ ...item, done: !item.done })
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

    const item = findTodo(id)
    if (item && item.text !== text) {
        void writeTodo({ ...item, text })
    }
    cancelEdit()
}

function cancelEdit() {
    editingId.value = null
    editingText.value = ''
}

function del(id: string) {
    const item = findTodo(id)
    if (!item) return

    if (item.source === 'shared') {
        void apiService.deleteRoomTodo(props.roomId, id).then(result => {
            if (result.success) {
                sharedTodos.value = sharedTodos.value.filter(todo => todo.id !== id)
            }
        })
    } else {
        removeLocalTodo(id)
    }
}

function toggleAssign(id: string) {
    activeAssign.value = activeAssign.value === id ? null : id
}

function assignName(item: Todo): string {
    return item.assigneeName || t('canvas.todo.unassigned')
}

function setAssign(id: string, user: UserOpt) {
    const item = findTodo(id)
    if (item) {
        void writeTodo({
            ...item,
            assigneeId: user.id,
            assigneeName: user.name,
            creatorId: item.creatorId || currentUserId.value || undefined,
            creatorName: item.creatorName || currentUserName.value || undefined
        }, 'shared')
        activeAssign.value = null
    }
}

function clearAssign(id: string) {
    const item = findTodo(id)
    if (item) {
        const next = {
            ...item,
            assigneeId: undefined,
            assigneeName: undefined
        }
        void writeTodo(next, next.isPublic ? 'shared' : 'local')
        activeAssign.value = null
    }
}

function setPublic(id: string, isPublic: boolean) {
    const item = findTodo(id)
    if (!item) return

    const next = {
        ...item,
        isPublic,
        creatorId: item.creatorId || currentUserId.value || undefined,
        creatorName: item.creatorName || currentUserName.value || undefined
    }
    void writeTodo(next, isPublic || next.assigneeId ? 'shared' : 'local')
}

function setTodoDueDate(id: string, value: string) {
    const item = findTodo(id)
    if (!item) return

    void writeTodo({ ...item, dueDate: inputDateToIso(value) })
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
    if (localTodos.value.length === 0) return
    isClearLocalTodosDialogOpen.value = true
}

function confirmClearLocalTodos() {
    localTodos.value = []
    activeAssign.value = null
    cancelEdit()
    isClearLocalTodosDialogOpen.value = false
    removeTodoCache(serverUrl.value, props.roomId)
}

function save() {
    saveTodoCache(serverUrl.value, props.roomId, localTodos.value)
}

function load() {
    localTodos.value = loadTodoCache(serverUrl.value, props.roomId)
    void syncSharedTodos()
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

watch(isOpen, open => {
    if (open) {
        void syncSharedTodos()
        startSharedSyncTimer()
    } else {
        stopSharedSyncTimer()
    }
})

onUnmounted(() => {
    stopSharedSyncTimer()
    document.removeEventListener('mousemove', onDrag)
    document.removeEventListener('mouseup', stopDrag)
    document.removeEventListener('mousemove', onResize)
    document.removeEventListener('mouseup', stopResize)
    document.removeEventListener('click', onClick)
    document.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped src="./TodoPanel.css"></style>
