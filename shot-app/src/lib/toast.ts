export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: number
  message: string
  type: ToastType
  duration: number
}

export function showToast(message: string, type: ToastType = 'info', duration = 3200) {
  window.dispatchEvent(new CustomEvent('shot-toast', {
    detail: { id: Date.now() + Math.random(), message, type, duration }
  }))
}
