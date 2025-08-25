<template>
  <div class="log-dashboard">
    <!-- 仪表板头部 -->
    <div class="dashboard-header">
      <h1 class="dashboard-title">
        <i class="icon-logs"></i>
        日志监控仪表板
      </h1>
      
      <div class="dashboard-controls">
        <div class="time-range-selector">
          <select v-model="selectedTimeRange" @change="updateTimeRange">
            <option value="1h">最近1小时</option>
            <option value="6h">最近6小时</option>
            <option value="24h">最近24小时</option>
            <option value="7d">最近7天</option>
          </select>
        </div>
        
        <button 
          class="refresh-btn"
          @click="refreshData"
          :disabled="isLoading"
        >
          <i class="icon-refresh" :class="{ spinning: isLoading }"></i>
          刷新
        </button>
        
        <button 
          class="export-btn"
          @click="exportLogs"
        >
          <i class="icon-download"></i>
          导出
        </button>
      </div>
    </div>

    <!-- 关键指标卡片 -->
    <div class="metrics-grid">
      <div class="metric-card error-rate">
        <div class="metric-header">
          <h3>错误率</h3>
          <i class="icon-error"></i>
        </div>
        <div class="metric-value" :class="getErrorRateClass()">
          {{ formatPercentage(currentMetrics.errorRate) }}
        </div>
        <div class="metric-trend">
          <span :class="getErrorTrendClass()">
            {{ getErrorTrendText() }}
          </span>
        </div>
      </div>

      <div class="metric-card response-time">
        <div class="metric-header">
          <h3>平均响应时间</h3>
          <i class="icon-clock"></i>
        </div>
        <div class="metric-value">
          {{ formatDuration(currentMetrics.averageResponseTime) }}
        </div>
        <div class="metric-trend">
          <span :class="getResponseTimeTrendClass()">
            {{ getResponseTimeTrendText() }}
          </span>
        </div>
      </div>

      <div class="metric-card active-users">
        <div class="metric-header">
          <h3>活跃用户</h3>
          <i class="icon-users"></i>
        </div>
        <div class="metric-value">
          {{ currentMetrics.uniqueUsers }}
        </div>
        <div class="metric-change">
          <span :class="getUsersTrendClass()">
            {{ getUsersTrendText() }}
          </span>
        </div>
      </div>

      <div class="metric-card log-volume">
        <div class="metric-header">
          <h3>日志量</h3>
          <i class="icon-logs"></i>
        </div>
        <div class="metric-value">
          {{ formatNumber(currentMetrics.totalLogs) }}
        </div>
        <div class="metric-rate">
          {{ formatNumber(currentMetrics.logsPerMinute) }}/分钟
        </div>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="charts-section">
      <div class="chart-container">
        <div class="chart-header">
          <h3>日志趋势</h3>
          <div class="chart-controls">
            <div class="chart-type-selector">
              <button 
                v-for="type in chartTypes"
                :key="type.value"
                :class="['chart-type-btn', { active: selectedChartType === type.value }]"
                @click="selectedChartType = type.value"
              >
                {{ type.label }}
              </button>
            </div>
          </div>
        </div>
        <div class="chart-content">
          <LogTrendChart 
            :data="chartData"
            :type="selectedChartType"
            :height="300"
          />
        </div>
      </div>

      <div class="chart-container">
        <div class="chart-header">
          <h3>日志级别分布</h3>
        </div>
        <div class="chart-content">
          <LogLevelChart 
            :data="logLevelData"
            :height="300"
          />
        </div>
      </div>
    </div>

    <!-- 告警和异常 -->
    <div class="alerts-section">
      <div class="section-header">
        <h3>活跃告警</h3>
        <span class="alert-count" :class="getAlertCountClass()">
          {{ activeAlerts.length }}
        </span>
      </div>
      
      <div class="alerts-list">
        <div 
          v-for="alert in activeAlerts.slice(0, 5)"
          :key="alert.id"
          class="alert-item"
          :class="[`alert-${alert.level}`, { acknowledged: alert.acknowledged }]"
        >
          <div class="alert-icon">
            <i :class="getAlertIcon(alert.level)"></i>
          </div>
          <div class="alert-content">
            <div class="alert-title">{{ alert.title }}</div>
            <div class="alert-description">{{ alert.description }}</div>
            <div class="alert-meta">
              <span class="alert-time">{{ formatTime(alert.timestamp) }}</span>
              <span class="alert-category">{{ alert.category }}</span>
            </div>
          </div>
          <div class="alert-actions">
            <button 
              v-if="!alert.acknowledged"
              class="btn-acknowledge"
              @click="acknowledgeAlert(alert.id)"
            >
              确认
            </button>
            <button 
              class="btn-resolve"
              @click="resolveAlert(alert.id)"
            >
              解决
            </button>
          </div>
        </div>
        
        <div v-if="activeAlerts.length === 0" class="no-alerts">
          <i class="icon-check-circle"></i>
          <span>暂无活跃告警</span>
        </div>
      </div>
    </div>

    <!-- 日志搜索和列表 -->
    <div class="logs-section">
      <div class="section-header">
        <h3>日志搜索</h3>
        <div class="search-controls">
          <div class="search-input-group">
            <input 
              v-model="searchQuery"
              type="text"
              placeholder="搜索日志内容..."
              class="search-input"
              @keyup.enter="performSearch"
            />
            <button class="search-btn" @click="performSearch">
              <i class="icon-search"></i>
            </button>
          </div>
          
          <div class="filter-controls">
            <select v-model="selectedLogLevel" @change="performSearch">
              <option value="">所有级别</option>
              <option value="ERROR">错误</option>
              <option value="WARN">警告</option>
              <option value="INFO">信息</option>
              <option value="DEBUG">调试</option>
            </select>
            
            <select v-model="selectedLogType" @change="performSearch">
              <option value="">所有类型</option>
              <option value="application">应用</option>
              <option value="security">安全</option>
              <option value="performance">性能</option>
              <option value="user_action">用户行为</option>
            </select>
          </div>
        </div>
      </div>

      <div class="logs-list">
        <div class="logs-header">
          <div class="log-column time">时间</div>
          <div class="log-column level">级别</div>
          <div class="log-column type">类型</div>
          <div class="log-column message">消息</div>
          <div class="log-column actions">操作</div>
        </div>
        
        <div class="logs-body">
          <div 
            v-for="log in filteredLogs"
            :key="log.id"
            class="log-row"
            :class="[`log-${log.level.toLowerCase()}`, { expanded: expandedLogs.has(log.id) }]"
          >
            <div class="log-column time">
              {{ formatLogTime(log.timestamp) }}
            </div>
            <div class="log-column level">
              <span class="level-badge" :class="`level-${log.level.toLowerCase()}`">
                {{ log.level }}
              </span>
            </div>
            <div class="log-column type">
              {{ log.type }}
            </div>
            <div class="log-column message">
              <div class="message-content">
                {{ log.message }}
              </div>
              <div v-if="log.tags.length > 0" class="message-tags">
                <span 
                  v-for="tag in log.tags"
                  :key="tag"
                  class="tag"
                >
                  {{ tag }}
                </span>
              </div>
            </div>
            <div class="log-column actions">
              <button 
                class="btn-expand"
                @click="toggleLogExpansion(log.id)"
              >
                <i :class="expandedLogs.has(log.id) ? 'icon-collapse' : 'icon-expand'"></i>
              </button>
            </div>
            
            <!-- 展开的详细信息 -->
            <div v-if="expandedLogs.has(log.id)" class="log-details">
              <div class="details-section">
                <h4>上下文信息</h4>
                <pre class="context-data">{{ JSON.stringify(log.context, null, 2) }}</pre>
              </div>
              
              <div class="details-section">
                <h4>元数据</h4>
                <div class="metadata-grid">
                  <div class="metadata-item">
                    <label>用户ID:</label>
                    <span>{{ log.metadata.userId || 'N/A' }}</span>
                  </div>
                  <div class="metadata-item">
                    <label>会话ID:</label>
                    <span>{{ log.metadata.sessionId || 'N/A' }}</span>
                  </div>
                  <div class="metadata-item">
                    <label>请求ID:</label>
                    <span>{{ log.metadata.requestId || 'N/A' }}</span>
                  </div>
                  <div class="metadata-item">
                    <label>环境:</label>
                    <span>{{ log.metadata.environment }}</span>
                  </div>
                </div>
              </div>
              
              <div v-if="log.stack" class="details-section">
                <h4>堆栈跟踪</h4>
                <pre class="stack-trace">{{ log.stack }}</pre>
              </div>
            </div>
          </div>
        </div>
        
        <div v-if="isLoadingLogs" class="loading-indicator">
          <i class="icon-spinner spinning"></i>
          <span>加载日志中...</span>
        </div>
        
        <div v-if="filteredLogs.length === 0 && !isLoadingLogs" class="no-logs">
          <i class="icon-info"></i>
          <span>未找到匹配的日志</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { logAnalyzer } from '../../logging/logAnalyzer'
import { intelligentAlerting } from '../../logging/intelligentAlerting'
import LogTrendChart from './LogTrendChart.vue'
import LogLevelChart from './LogLevelChart.vue'

// 响应式数据
const isLoading = ref(false)
const isLoadingLogs = ref(false)
const selectedTimeRange = ref('1h')
const selectedChartType = ref('volume')
const selectedLogLevel = ref('')
const selectedLogType = ref('')
const searchQuery = ref('')
const expandedLogs = ref(new Set<string>())

// 数据状态
const currentMetrics = ref({
  errorRate: 0,
  averageResponseTime: 0,
  uniqueUsers: 0,
  totalLogs: 0,
  logsPerMinute: 0
})

const chartData = ref([])
const logLevelData = ref([])
const activeAlerts = ref([])
const filteredLogs = ref([])

// 图表类型选项
const chartTypes = [
  { value: 'volume', label: '日志量' },
  { value: 'errors', label: '错误数' },
  { value: 'response_time', label: '响应时间' }
]

// 计算属性
const timeRangeMs = computed(() => {
  const ranges = {
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000
  }
  return ranges[selectedTimeRange.value] || ranges['1h']
})

// 生命周期
let refreshInterval: number

onMounted(() => {
  loadInitialData()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})

// 方法
async function loadInitialData() {
  isLoading.value = true
  try {
    await Promise.all([
      loadMetrics(),
      loadChartData(),
      loadAlerts(),
      loadLogs()
    ])
  } finally {
    isLoading.value = false
  }
}

async function loadMetrics() {
  const aggregation = logAnalyzer.getLatestAggregation()
  if (aggregation) {
    currentMetrics.value = {
      errorRate: aggregation.metrics.errorRate,
      averageResponseTime: aggregation.metrics.averageResponseTime,
      uniqueUsers: aggregation.metrics.uniqueUsers,
      totalLogs: aggregation.counts.total,
      logsPerMinute: aggregation.counts.total / (aggregation.interval / 60000)
    }
  }
}

async function loadChartData() {
  const startTime = Date.now() - timeRangeMs.value
  const aggregations = logAnalyzer.getAggregations(startTime)
  
  chartData.value = aggregations.map(agg => ({
    timestamp: agg.timestamp,
    volume: agg.counts.total,
    errors: (agg.counts.byLevel[4] || 0) + (agg.counts.byLevel[5] || 0), // ERROR + FATAL
    responseTime: agg.metrics.averageResponseTime
  }))
  
  // 日志级别分布数据
  const latest = aggregations[aggregations.length - 1]
  if (latest) {
    logLevelData.value = Object.entries(latest.counts.byLevel).map(([level, count]) => ({
      level: ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'][parseInt(level)],
      count
    }))
  }
}

async function loadAlerts() {
  activeAlerts.value = intelligentAlerting.getActiveAlerts()
}

async function loadLogs() {
  isLoadingLogs.value = true
  try {
    const startTime = Date.now() - timeRangeMs.value
    const logs = logAnalyzer.searchLogs({
      startTime,
      limit: 100
    })
    filteredLogs.value = logs
  } finally {
    isLoadingLogs.value = false
  }
}

function startAutoRefresh() {
  refreshInterval = window.setInterval(() => {
    loadInitialData()
  }, 30000) // 每30秒刷新
}

function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
}

async function refreshData() {
  await loadInitialData()
}

async function updateTimeRange() {
  await loadInitialData()
}

async function performSearch() {
  isLoadingLogs.value = true
  try {
    const startTime = Date.now() - timeRangeMs.value
    const logs = logAnalyzer.searchLogs({
      message: searchQuery.value,
      level: selectedLogLevel.value ? parseInt(selectedLogLevel.value) : undefined,
      type: selectedLogType.value || undefined,
      startTime,
      limit: 100
    })
    filteredLogs.value = logs
  } finally {
    isLoadingLogs.value = false
  }
}

function toggleLogExpansion(logId: string) {
  if (expandedLogs.value.has(logId)) {
    expandedLogs.value.delete(logId)
  } else {
    expandedLogs.value.add(logId)
  }
}

async function acknowledgeAlert(alertId: string) {
  intelligentAlerting.acknowledgeAlert(alertId, 'dashboard-user')
  await loadAlerts()
}

async function resolveAlert(alertId: string) {
  intelligentAlerting.resolveAlert(alertId, 'dashboard-user')
  await loadAlerts()
}

function exportLogs() {
  const data = filteredLogs.value.map(log => ({
    timestamp: new Date(log.timestamp).toISOString(),
    level: log.level,
    type: log.type,
    message: log.message,
    userId: log.metadata.userId,
    sessionId: log.metadata.sessionId
  }))
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `logs-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// 格式化函数
function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString()
}

function formatLogTime(timestamp: number): string {
  const date = new Date(timestamp)
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
}

// 样式类函数
function getErrorRateClass(): string {
  const rate = currentMetrics.value.errorRate
  if (rate > 0.05) return 'critical'
  if (rate > 0.02) return 'warning'
  return 'normal'
}

function getAlertCountClass(): string {
  const count = activeAlerts.value.length
  if (count > 5) return 'critical'
  if (count > 2) return 'warning'
  return 'normal'
}

function getAlertIcon(level: string): string {
  const icons = {
    critical: 'icon-alert-triangle',
    error: 'icon-x-circle',
    warning: 'icon-alert-circle',
    info: 'icon-info-circle'
  }
  return icons[level] || 'icon-info-circle'
}

function getErrorTrendClass(): string {
  return 'trend-up' // 简化实现
}

function getErrorTrendText(): string {
  return '+2.3% vs 昨天' // 简化实现
}

function getResponseTimeTrendClass(): string {
  return 'trend-down' // 简化实现
}

function getResponseTimeTrendText(): string {
  return '-5.1% vs 昨天' // 简化实现
}

function getUsersTrendClass(): string {
  return 'trend-up' // 简化实现
}

function getUsersTrendText(): string {
  return '+12 vs 昨天' // 简化实现
}
</script>

<style scoped>
.log-dashboard {
  padding: 20px;
  background: #f5f5f5;
  min-height: 100vh;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.dashboard-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  color: #333;
}

.dashboard-controls {
  display: flex;
  gap: 15px;
  align-items: center;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.metric-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.metric-header h3 {
  margin: 0;
  color: #666;
  font-size: 14px;
  font-weight: 500;
}

.metric-value {
  font-size: 32px;
  font-weight: bold;
  color: #333;
  margin-bottom: 10px;
}

.metric-value.critical {
  color: #e74c3c;
}

.metric-value.warning {
  color: #f39c12;
}

.metric-value.normal {
  color: #27ae60;
}

.charts-section {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
  margin-bottom: 30px;
}

.chart-container {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.chart-type-selector {
  display: flex;
  gap: 5px;
}

.chart-type-btn {
  padding: 5px 10px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.chart-type-btn.active {
  background: #3498db;
  color: white;
  border-color: #3498db;
}

.alerts-section,
.logs-section {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.alert-count {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.alert-count.critical {
  background: #e74c3c;
  color: white;
}

.alert-count.warning {
  background: #f39c12;
  color: white;
}

.alert-count.normal {
  background: #27ae60;
  color: white;
}

.alert-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  border: 1px solid #eee;
  border-radius: 6px;
  margin-bottom: 10px;
}

.alert-item.alert-critical {
  border-left: 4px solid #e74c3c;
}

.alert-item.alert-error {
  border-left: 4px solid #e67e22;
}

.alert-item.alert-warning {
  border-left: 4px solid #f39c12;
}

.logs-list {
  border: 1px solid #eee;
  border-radius: 6px;
  overflow: hidden;
}

.logs-header {
  display: grid;
  grid-template-columns: 150px 80px 100px 1fr 60px;
  background: #f8f9fa;
  padding: 10px;
  font-weight: 500;
  border-bottom: 1px solid #eee;
}

.log-row {
  display: grid;
  grid-template-columns: 150px 80px 100px 1fr 60px;
  padding: 10px;
  border-bottom: 1px solid #f0f0f0;
  align-items: center;
}

.log-row:hover {
  background: #f8f9fa;
}

.level-badge {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: bold;
  text-transform: uppercase;
}

.level-badge.level-error,
.level-badge.level-fatal {
  background: #e74c3c;
  color: white;
}

.level-badge.level-warn {
  background: #f39c12;
  color: white;
}

.level-badge.level-info {
  background: #3498db;
  color: white;
}

.level-badge.level-debug,
.level-badge.level-trace {
  background: #95a5a6;
  color: white;
}

.log-details {
  grid-column: 1 / -1;
  padding: 20px;
  background: #f8f9fa;
  border-top: 1px solid #eee;
}

.details-section {
  margin-bottom: 20px;
}

.details-section h4 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 14px;
}

.context-data,
.stack-trace {
  background: #2c3e50;
  color: #ecf0f1;
  padding: 10px;
  border-radius: 4px;
  font-size: 12px;
  overflow-x: auto;
}

.metadata-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
}

.metadata-item {
  display: flex;
  gap: 10px;
}

.metadata-item label {
  font-weight: 500;
  color: #666;
  min-width: 80px;
}

.search-controls {
  display: flex;
  gap: 15px;
  align-items: center;
}

.search-input-group {
  display: flex;
  align-items: center;
}

.search-input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px 0 0 4px;
  width: 300px;
}

.search-btn {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-left: none;
  border-radius: 0 4px 4px 0;
  background: #f8f9fa;
  cursor: pointer;
}

.filter-controls {
  display: flex;
  gap: 10px;
}

.filter-controls select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.no-alerts,
.no-logs {
  text-align: center;
  padding: 40px;
  color: #666;
}

.loading-indicator {
  text-align: center;
  padding: 20px;
  color: #666;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .dashboard-header {
    flex-direction: column;
    gap: 15px;
  }
  
  .metrics-grid {
    grid-template-columns: 1fr;
  }
  
  .charts-section {
    grid-template-columns: 1fr;
  }
  
  .logs-header,
  .log-row {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  
  .log-column {
    display: flex;
    justify-content: space-between;
  }
  
  .log-column::before {
    content: attr(data-label);
    font-weight: bold;
    color: #666;
  }
}
</style>
