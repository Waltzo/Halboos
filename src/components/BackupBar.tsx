import { useRef } from 'react'
import { useStore } from '../store'
import { exportJson, parseImport } from '../lib/backup'

export default function BackupBar() {
  const assets = useStore((s) => s.assets)
  const installments = useStore((s) => s.installments)
  const fixedExpenses = useStore((s) => s.fixedExpenses)
  const replaceAll = useStore((s) => s.replaceAll)
  const fileRef = useRef<HTMLInputElement>(null)

  const onExport = () => exportJson({ assets, installments, fixedExpenses })

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const data = parseImport(await file.text())
      const ok = confirm('현재 데이터를 가져온 파일로 덮어씁니다. 계속?')
      if (ok) replaceAll(data)
    } catch (err) {
      alert('가져오기 실패: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="toolbar">
      <button className="ghost" onClick={onExport}>
        ⬆ 내보내기
      </button>
      <button className="ghost" onClick={() => fileRef.current?.click()}>
        ⬇ 가져오기
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        style={{ display: 'none' }}
        onChange={onImportFile}
      />
    </div>
  )
}
