<script setup lang="ts">
import { Play } from '@lucide/vue'
</script>

<template>
  <div class="words-container">
    <header class="page-header">
      <h2>今日单词</h2>
      <p class="subtitle">让 AI 陪你练口语</p>
    </header>

    <div class="word-card">
      <div class="word-info">
        <h1 class="english-word">Serendipity</h1>
        <p class="phonetic">/ˌserənˈdipəti/</p>
        <p class="translation">n. 不期而遇的美好；意外发现珍奇事物的本领</p>
      </div>
      
      <button class="pronounce-btn">
        <Play :size="20" fill="currentColor" />
      </button>
    </div>

    <!-- 预留的 AI 聊天/跟读区域 -->
    <div class="ai-interaction-area">
      <div class="empty-state">
        <p>按住底部麦克风开始跟读</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.words-container {
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h2 {
  font-size: 24px;
  font-weight: 600;
  color: var(--color-text-main);
  margin-bottom: 4px;
}

.subtitle {
  font-size: 14px;
  color: var(--color-text-muted);
}

.word-card {
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: 32px 24px;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.english-word {
  font-size: 32px;
  font-weight: 600;
  letter-spacing: -0.02em;
  margin-bottom: 8px;
}

.phonetic {
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  color: var(--color-primary);
  margin-bottom: 12px;
}

.translation {
  font-size: 14px;
  color: var(--color-text-muted);
  line-height: 1.5;
}

.pronounce-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.15s;
}

.pronounce-btn:active {
  transform: scale(0.92);
}

.ai-interaction-area {
  flex: 1;
  border-radius: var(--radius-lg);
  border: 1px dashed var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255,255,255,0.5);
}

.empty-state p {
  color: var(--color-text-muted);
  font-size: 14px;
}
</style>
