"use client";

import type { ButtonHTMLAttributes } from "react";

export function ConfirmSubmitButton({
  confirmText,
  disabled,
  children,
  ...rest
}: {
  confirmText: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      type={rest.type ?? "submit"}
      disabled={disabled}
      onClick={(e) => {
        if (disabled) return;
        if (!window.confirm(confirmText)) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        rest.onClick?.(e);
      }}
    >
      {children}
    </button>
  );
}

