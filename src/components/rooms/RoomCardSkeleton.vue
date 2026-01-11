<template>
    <div class="skeleton-card">
        <!-- 卡片头部 -->
        <div class="skeleton-header">
            <div class="skeleton-info">
                <div class="skeleton-title"></div>
                <div class="skeleton-meta"></div>
            </div>
            <div class="skeleton-badge"></div>
        </div>

        <!-- 卡片内容 -->
        <div class="skeleton-content">
            <div class="skeleton-line"></div>
            <div class="skeleton-line short"></div>
        </div>

        <!-- 卡片底部 -->
        <div class="skeleton-footer">
            <div class="skeleton-tag"></div>
            <div class="skeleton-time"></div>
        </div>
    </div>
</template>

<style scoped>
.skeleton-card {
    background: var(--bg-secondary);
    border-radius: 16px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    border: 1px solid var(--border-light);
    min-height: 180px;
    display: flex;
    flex-direction: column;
    animation: skeleton-pulse 1.5s ease-in-out infinite;
}

@keyframes skeleton-pulse {
    0%, 100% {
        opacity: 1;
    }
    50% {
        opacity: 0.6;
    }
}

/* ==================== 骨架元素 ==================== */
.skeleton-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
}

.skeleton-info {
    flex: 1;
}

.skeleton-title {
    height: 24px;
    width: 60%;
    background: linear-gradient(90deg, 
        var(--border-light) 25%, 
        var(--bg-tertiary) 50%, 
        var(--border-light) 75%);
    background-size: 200% 100%;
    animation: shimmer 2s infinite;
    border-radius: 8px;
    margin-bottom: 8px;
}

.skeleton-meta {
    height: 16px;
    width: 40%;
    background: linear-gradient(90deg, 
        var(--border-light) 25%, 
        var(--bg-tertiary) 50%, 
        var(--border-light) 75%);
    background-size: 200% 100%;
    animation: shimmer 2s infinite;
    border-radius: 6px;
}

.skeleton-badge {
    width: 32px;
    height: 32px;
    border-radius: 16px;
    background: linear-gradient(90deg, 
        var(--border-light) 25%, 
        var(--bg-tertiary) 50%, 
        var(--border-light) 75%);
    background-size: 200% 100%;
    animation: shimmer 2s infinite;
}

.skeleton-content {
    flex: 1;
    margin-bottom: 12px;
}

.skeleton-line {
    height: 14px;
    width: 100%;
    background: linear-gradient(90deg, 
        var(--border-light) 25%, 
        var(--bg-tertiary) 50%, 
        var(--border-light) 75%);
    background-size: 200% 100%;
    animation: shimmer 2s infinite;
    border-radius: 6px;
    margin-bottom: 8px;
}

.skeleton-line.short {
    width: 80%;
}

.skeleton-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 12px;
    border-top: 1px solid var(--border-light);
}

.skeleton-tag {
    height: 24px;
    width: 80px;
    background: linear-gradient(90deg, 
        var(--border-light) 25%, 
        var(--bg-tertiary) 50%, 
        var(--border-light) 75%);
    background-size: 200% 100%;
    animation: shimmer 2s infinite;
    border-radius: 12px;
}

.skeleton-time {
    height: 16px;
    width: 60px;
    background: linear-gradient(90deg, 
        var(--border-light) 25%, 
        var(--bg-tertiary) 50%, 
        var(--border-light) 75%);
    background-size: 200% 100%;
    animation: shimmer 2s infinite;
    border-radius: 6px;
}

@keyframes shimmer {
    0% {
        background-position: 200% 0;
    }
    100% {
        background-position: -200% 0;
    }
}

/* ==================== 响应式设计 ==================== */
@media (max-width: 768px) {
    .skeleton-card {
        padding: 16px;
    }
}
</style>
