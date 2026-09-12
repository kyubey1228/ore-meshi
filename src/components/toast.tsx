'use client';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

type ToastKind = 'status' | 'alert';
type Toast = { id: number; kind: ToastKind; message: string };

// Server Actionのperform()が常にrevalidatePath('/', 'layout')を呼ぶため、mutation成功のレスポンスには
// 最新のRSCペイロードが同梱される。成功メッセージを出したい要素の親が、その新しいデータのせいで
// 同じコミットで条件分岐ごと消えてしまうケース(参加後にJoinFormが消える等)では、フォームの真下に
// ローカルで表示していた成功メッセージが画面に一度も描画されないまま消えるレースが起きる。
// ルートlayoutに常駐するこのProviderにメッセージを積むことで、呼び出し元がどう再描画/消滅しても
// 確実に表示できるようにする。
const ToastContext = createContext<((kind: ToastKind, message: string) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const push = useCallback((kind: ToastKind, message: string) => {
    const id = ++nextId.current;
    setToasts(prev => [...prev, { id, kind, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);
  return <ToastContext.Provider value={push}>
    {children}
    <div className="toast-stack">
      {toasts.map(t => <p key={t.id} role={t.kind} className={t.kind === 'status' ? 'success' : 'error'}>{t.message}</p>)}
    </div>
  </ToastContext.Provider>;
}

export function usePushToast() {
  const push = useContext(ToastContext);
  return push ?? (() => {});
}
