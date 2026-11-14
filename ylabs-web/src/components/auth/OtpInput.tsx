import React, { useRef, useImperativeHandle, forwardRef, useEffect } from "react";

export interface OtpInputHandle {
  focus: () => void;
  clear: () => void;
}

interface OtpInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  hasError?: boolean;
  disabled?: boolean;
  length?: number;
}

export const OtpInput = forwardRef<OtpInputHandle, OtpInputProps>(
  ({ id, value, onChange, hasError, disabled, length = 6 }, ref) => {
    const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

    const digits = Array.from({ length }, (_, i) => value[i] || "");

    useImperativeHandle(ref, () => ({
      focus: () => {
        inputsRef.current[0]?.focus();
      },
      clear: () => {
        onChange("");
        inputsRef.current[0]?.focus();
      },
    }));

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
      const char = e.target.value.replace(/\D/g, "").slice(-1);
      const newDigits = [...digits];
      newDigits[index] = char;
      const combined = newDigits.join("");
      onChange(combined);

      if (char && index < length - 1) {
        inputsRef.current[index + 1]?.focus();
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
      if (e.key === "Backspace") {
        if (!digits[index] && index > 0) {
          const newDigits = [...digits];
          newDigits[index - 1] = "";
          onChange(newDigits.join(""));
          inputsRef.current[index - 1]?.focus();
        }
      } else if (e.key === "ArrowLeft" && index > 0) {
        inputsRef.current[index - 1]?.focus();
      } else if (e.key === "ArrowRight" && index < length - 1) {
        inputsRef.current[index + 1]?.focus();
      }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const text = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, length);
      if (!text) return;

      const newDigits = Array.from({ length }, (_, i) => text[i] || "");
      onChange(newDigits.join(""));
      const nextFocus = Math.min(text.length, length - 1);
      inputsRef.current[nextFocus]?.focus();
    };

    return (
      <div
        id={id}
        className={`otp ${hasError ? "err" : ""}`}
        role="group"
        aria-label="One-time verification code"
      >
        {Array.from({ length }, (_, i) => (
          <input
            key={i}
            ref={(el) => {
              inputsRef.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            autoComplete={i === 0 ? "one-time-code" : "off"}
            aria-label={`Digit ${i + 1}`}
            value={digits[i] || ""}
            disabled={disabled}
            onChange={(e) => handleInput(e, i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
          />
        ))}
      </div>
    );
  },
);

OtpInput.displayName = "OtpInput";
