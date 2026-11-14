type ToastListener = (msg: string) => void;

let activeListener: ToastListener | null = null;

export function registerToastListener(listener: ToastListener) {
  activeListener = listener;
  return () => {
    if (activeListener === listener) {
      activeListener = null;
    }
  };
}

export function showToast(message: string) {
  if (activeListener) {
    activeListener(message);
  }
}
