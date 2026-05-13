import { useAppStore } from '@/stores/appStore'

export default function StatsPanel() {
  const { stats } = useAppStore()

  const avgTime = stats.totalConversions > 0
    ? (stats.totalTimeMs / stats.totalConversions / 1000).toFixed(1)
    : '0.0'
  const successRate = stats.totalConversions > 0
    ? Math.round((stats.successCount / stats.totalConversions) * 100)
    : 0

  const formatChars = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
    return String(n)
  }

  return (
    <div style={{
      flex: 1, overflowY: 'auto', padding: '20px 24px',
      fontFamily: 'var(--font-ui)',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 8,
      }}>
        <StatCard label="总转换次数" value={String(stats.totalConversions)} />
        <StatCard label="成功率" value={`${successRate}%`} />
        <StatCard label="总字符数" value={formatChars(stats.totalChars)} />
        <StatCard label="LLM 调用" value={String(stats.llmCalls)} />
        <StatCard label="平均耗时" value={`${avgTime}s`} />
        <StatCard label="失败次数" value={String(stats.failCount)} accent />
      </div>
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{
      background: 'var(--card)',
      borderRadius: 'var(--radius-lg)',
      padding: '16px',
    }}>
      <div style={{
        fontSize: 12, color: 'var(--faint)',
        marginBottom: 6,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 24, fontWeight: 700,
        fontFamily: 'var(--font-mono)',
        color: accent ? 'var(--danger)' : 'var(--text)',
      }}>
        {value}
      </div>
    </div>
  )
}
