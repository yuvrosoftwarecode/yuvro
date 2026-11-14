import { useState, useEffect } from "react";
import { registerToastListener } from "./toastService";

export function AuthToast() {
  const [message, setMessage] = useState<string>("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const unbind = registerToastListener((msg: string) => {
      setMessage(msg);
      setVisible(true);
      clearTimeout(timer);
      timer = setTimeout(() => {
        setVisible(false);
      }, 2200);
    });

    return () => {
      clearTimeout(timer);
      unbind();
    };
  }, []);

  return (
    <div className={`yuvro-auth-toast ${visible ? "show" : ""}`} role="status" aria-live="polite">
      {message}
    </div>
  );
}
