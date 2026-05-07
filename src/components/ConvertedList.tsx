import { useAppStore } from '@/stores/appStore'
import { Path } from '@/utils/path'

export default function ConvertedList() {
  const {
    convertedPaths, results,
    selectedPaths, selectSingle,
  } = useAppStore()

  if (!convertedPaths.length) {
    return (
      <div style={{
        padding: '24px 16px', textAlign: 'center',
        color: 'var(--faint)', fontSize: 13,
        fontFamily: 'var(--font-ui)',
      }}>
        尚未转换任何文件
      </div>
    )
  }

  return (
    <div style={{
      flex: 1, overflowY: 'auto', overflowX: 'hidden',
      padding: '2px 0',
    }}>
      {convertedPaths.map(path => {
        const name = Path.basename(path)
        const isSelected = selectedPaths.includes(path)
        const result = results.get(path)

        return (
          <div
            key={path}
            onClick={() => selectSingle(path)}
            style={{
              display: 'flex', alignItems: 'center',
              height: 28, minHeight: 28,
              margin: '1px 4px',
              paddingLeft: 8, paddingRight: 8,
              borderRadius: 'var(--radius-sm)',
              background: isSelected ? 'var(--selected)' : 'transparent',
              cursor: 'pointer',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => {
              if (!isSelected) e.currentTarget.style.background = 'var(--hover)'
            }}
            onMouseLeave={e => {
              if (!isSelected) e.currentTarget.style.background = 'transparent'
            }}
          >
            <span style={{
              flex: 1, overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              fontSize: 16, color: 'var(--muted)',
              fontFamily: 'var(--font-ui)',
            }}>
              {name}
            </span>

            {result && (
              <span style={{
                fontSize: 11, color: 'var(--faint)',
                fontFamily: 'var(--font-mono)',
                flexShrink: 0, marginLeft: 8,
              }}>
                {result.elapsed_ms}ms
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
