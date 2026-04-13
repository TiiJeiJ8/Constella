<template>
    <Transition name="dialog-fade">
        <div v-if="modelValue" class="dialog-overlay" @click="handleOverlayClick">
            <div class="dialog-container" @click.stop>
                <!-- 閻庣數顢婇惁钘夘浖閸℃ぜ浠堥梺?-->
                <div class="dialog-header">
                    <h3 class="dialog-title">{{ t('joinRoom.title') }}</h3>
                    <button class="close-btn" @click="handleClose">&times;</button>
                </div>

                <!-- 閻庣數顢婇惁钘夘浖閸℃鏁堕悗?-->
                <div class="dialog-body">
                    <!-- 闁规潙娼″Λ鎸庣┍閳╁啩绱?-->
                    <div v-if="room" class="room-info">
                        <div class="room-icon">{{ roomIcon }}</div>
                        <div class="room-details">
                            <h4 class="room-name">{{ room.name }}</h4>
                            <p class="room-meta">
                                <span>By {{ room.creator }}</span>
                                <span class="separator">|</span>
                                <span>{{ room.memberCount }} members</span>
                            </p>
                            <p v-if="room.description" class="room-description">{{ room.description }}</p>
                        </div>
                    </div>

                    <!-- 閻庨潧妫涢悥婊勬綇閹惧啿寮?-->
                    <form @submit.prevent="handleSubmit">
                        <div class="form-group">
                            <label class="form-label">{{ t('joinRoom.password') }}</label>
                            <input
                                v-model="password"
                                type="password"
                                class="form-input"
                                :class="{ 'error': error }"
                                :placeholder="t('joinRoom.passwordPlaceholder')"
                                :disabled="loading"
                                autofocus
                            />
                            <span v-if="error" class="error-text">{{ error }}</span>
                        </div>
                    </form>
                </div>

                <!-- 閻庣數顢婇惁钘夘浖閸℃淇洪梺?-->
                <div class="dialog-footer">
                    <button class="btn btn-secondary" @click="handleClose" :disabled="loading">
                        {{ t('common.cancel') }}
                    </button>
                    <button class="btn btn-primary" @click="handleSubmit" :disabled="loading || !password">
                        <span v-if="loading" class="loading-spinner"></span>
                        {{ loading ? t('joinRoom.joining') : t('joinRoom.join') }}
                    </button>
                </div>
            </div>
        </div>
    </Transition>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiService } from '@/services/api'

const { t } = useI18n()

const props = defineProps({
    modelValue: {
        type: Boolean,
        required: true
    },
    room: {
        type: Object,
        default: null
    }
})

const emit = defineEmits(['update:modelValue', 'joined'])

// 闁规潙娼″Λ鍧楀炊閻愵剛鍨?
const roomIcon = computed(() => {
    return props.room?.settings?.appearance?.icon || '#'
})

const password = ref('')
const error = ref('')
const loading = ref(false)

// 闁圭粯鍔掑锔炬偘閵娿儱绀?
async function handleSubmit() {
    if (!password.value) {
        error.value = t('joinRoom.errors.passwordRequired')
        return
    }
    
    if (!props.room) {
        error.value = t('joinRoom.errors.roomNotFound')
        return
    }
    
    loading.value = true
    error.value = ''
    
    try {
        const response = await apiService.joinRoom(props.room.id, password.value)
        
        if (response.success) {
            console.log('[JoinRoom] Successfully joined room')
            emit('joined', props.room)
            handleClose()
            resetForm()
        } else {
            // 濠㈣泛瀚幃濠囨煥濞嗘帩鍤?
            if (response.errorCode === 'ROOM_WRONG_PASSWORD') {
                error.value = t('joinRoom.errors.wrongPassword')
            } else if (response.errorCode === 'ROOM_ALREADY_MEMBER') {
                // 濠碘€冲€归悘澶婎啅閼碱剛鐥呴柡鍕靛灡閸ㄦ岸宕ㄥ鍫㈢閻犲洤鐡ㄥΣ鎴﹀礆濡ゅ嫨鈧啴寮悧鍫濈ウ閺夆晛娲﹀﹢锟犳晬瀹€鍕ㄥ亾濮樿京鍙€闁绘牕澧庣划宥嗙鐠哄搫鐓曢柡鍌涙緲閼荤喐娼诲☉妯哄汲
                console.log('[JoinRoom] User is already a member, notifying parent')
                emit('joined', props.room)
                handleClose()
                resetForm()
            } else {
                error.value = response.message || t('joinRoom.errors.joinFailed')
            }
        }
    } catch (err) {
        console.error('[JoinRoom] Error:', err)
        error.value = err.message || t('joinRoom.errors.joinFailed')
    } finally {
        loading.value = false
    }
}

function handleClose() {
    emit('update:modelValue', false)
}

function handleOverlayClick() {
    if (!loading.value) {
        handleClose()
    }
}

// 闂佹彃绉堕悿鍡欐偘閵娿儱绀?
function resetForm() {
    password.value = ''
    error.value = ''
}

watch(() => props.modelValue, (newVal) => {
    if (newVal) {
        resetForm()
    }
})
</script>

<style scoped>
/* ==================== 閻庣數顢婇惁钘夘浖閸℃稐绱曠紓?==================== */
.dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
}

/* ==================== 閻庣數顢婇惁钘夘浖閸℃鍟囬柛?==================== */
.dialog-container {
    background: var(--bg-primary);
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    width: 100%;
    max-width: 450px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: background-color 0.3s ease;
}

/* ==================== 閻庣數顢婇惁钘夘浖閸℃ぜ浠堥梺?==================== */
.dialog-header {
    padding: 24px 24px 16px;
    border-bottom: 1px solid var(--border-light);
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.dialog-title {
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
}

.close-btn {
    width: 32px;
    height: 32px;
    border-radius: 16px;
    background: transparent;
    color: var(--text-secondary);
    font-size: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
}

.close-btn:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
}

/* ==================== 閻庣數顢婇惁钘夘浖閸℃洖鐦滃ù?==================== */
.dialog-body {
    padding: 24px;
}

/* ==================== 闁规潙娼″Λ鎸庣┍閳╁啩绱?==================== */
.room-info {
    display: flex;
    gap: 16px;
    margin-bottom: 24px;
    padding: 16px;
    background: var(--bg-secondary);
    border-radius: 12px;
}

.room-icon {
    width: 56px;
    height: 56px;
    border-radius: 12px;
    background: var(--bg-tertiary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    flex-shrink: 0;
}

.room-details {
    flex: 1;
    min-width: 0;
}

.room-name {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 6px 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.room-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--text-secondary);
    margin: 0 0 8px 0;
}

.separator {
    opacity: 0.5;
}

.room-description {
    font-size: 13px;
    color: var(--text-tertiary);
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
}

/* ==================== 閻炴稏鍔屽畷?==================== */
.form-group {
    margin-bottom: 20px;
}

.form-group:last-child {
    margin-bottom: 0;
}

.form-label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 8px;
}

.form-input {
    width: 100%;
    padding: 12px 16px;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 14px;
    transition: all 0.2s ease;
}

.form-input:focus {
    border-color: var(--accent-primary);
    outline: none;
}

.form-input.error {
    border-color: #e53935;
}

.error-text {
    display: block;
    color: #e53935;
    font-size: 12px;
    margin-top: 6px;
}

/* ==================== 閻庣數顢婇惁钘夘浖閸℃淇洪梺?==================== */
.dialog-footer {
    padding: 16px 24px;
    border-top: 1px solid var(--border-light);
    display: flex;
    justify-content: flex-end;
    gap: 12px;
}

.btn {
    padding: 10px 24px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 8px;
}

.btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.btn-secondary {
    background: var(--bg-tertiary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
}

.btn-secondary:hover:not(:disabled) {
    background: var(--bg-secondary);
}

.btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
}

.btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.loading-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

/* ==================== 闁告柣鍔庨弫?==================== */
.dialog-fade-enter-active,
.dialog-fade-leave-active {
    transition: opacity 0.3s ease;
}

.dialog-fade-enter-active .dialog-container,
.dialog-fade-leave-active .dialog-container {
    transition: transform 0.3s ease, opacity 0.3s ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
    opacity: 0;
}

.dialog-fade-enter-from .dialog-container,
.dialog-fade-leave-to .dialog-container {
    transform: scale(0.95);
    opacity: 0;
}

/* ==================== 闁告繂绉寸花鎻掝嚕?==================== */
@media (max-width: 768px) {
    .dialog-container {
        max-width: 100%;
        margin: 0;
        border-radius: 16px 16px 0 0;
        align-self: flex-end;
    }
}
</style>
