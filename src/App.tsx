import { useState } from 'react'
import AssetForm from './components/AssetForm'
import CategoryForm from './components/CategoryForm'
import InstallmentForm from './components/InstallmentForm'
import FixedExpenseForm from './components/FixedExpenseForm'
import Registry from './components/Registry'
import MonthlySummary from './components/MonthlySummary'
import MatrixView from './components/MatrixView'
import BackupBar from './components/BackupBar'
import Modal from './components/Modal'
import ThemeToggle from './components/ThemeToggle'

export type ModalType = 'asset' | 'category' | 'installment' | 'fixed' | 'registry'
export type ModalState = { type: ModalType; editingId?: string }

const TITLES: Record<ModalType, string> = {
  asset: '자산',
  category: '카테고리',
  installment: '할부',
  fixed: '고정지출',
  registry: '등록 내역',
}

export default function App() {
  const [modal, setModal] = useState<ModalState | null>(null)
  const close = () => setModal(null)

  const title = !modal
    ? ''
    : modal.type === 'registry'
      ? TITLES.registry
      : `${TITLES[modal.type]} ${modal.editingId ? '수정' : '추가'}`

  return (
    <div className="app">
      <header className="top">
        <div>
          <h1>💰 할부 계산기</h1>
          <div className="sub">카드·계좌 할부 · 고정지출을 월별로 모아보기 · halboos</div>
        </div>
        <div className="toolbar">
          <button className="primary" onClick={() => setModal({ type: 'asset' })}>
            + 자산
          </button>
          <button className="primary" onClick={() => setModal({ type: 'installment' })}>
            + 할부
          </button>
          <button className="primary" onClick={() => setModal({ type: 'fixed' })}>
            + 고정지출
          </button>
          <button className="ghost" onClick={() => setModal({ type: 'registry' })}>
            📂 내역
          </button>
          <span className="divider" />
          <BackupBar />
          <span className="divider" />
          <ThemeToggle />
        </div>
      </header>

      <div className="layout">
        <MonthlySummary />
        <MatrixView onEdit={setModal} />
      </div>

      {modal && (
        <Modal title={title} onClose={close} wide={modal.type === 'registry'}>
          {modal.type === 'asset' && <AssetForm editingId={modal.editingId} onDone={close} />}
          {modal.type === 'category' && <CategoryForm editingId={modal.editingId} onDone={close} />}
          {modal.type === 'installment' && (
            <InstallmentForm editingId={modal.editingId} onDone={close} />
          )}
          {modal.type === 'fixed' && <FixedExpenseForm editingId={modal.editingId} onDone={close} />}
          {modal.type === 'registry' && <Registry onEdit={setModal} />}
        </Modal>
      )}
    </div>
  )
}
