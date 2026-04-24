import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

type Props = {
  value: string;
  onCommit: (value: string) => void | Promise<void>;
  className?: string;
  placeholder?: string;
};

/**
 * Controlled-locally text input that commits on blur.
 * Avoids cursor-jump caused by upstream re-renders that recreate
 * the underlying object/array on every keystroke.
 */
export function InlineEditInput({ value, onCommit, className, placeholder }: Props) {
  const [local, setLocal] = useState(value ?? "");
  const [focused, setFocused] = useState(false);

  // Sync external changes only when the input is NOT being edited.
  useEffect(() => {
    if (!focused) setLocal(value ?? "");
  }, [value, focused]);

  return (
    <Input
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        if (local !== (value ?? "")) onCommit(local);
      }}
      className={className}
      placeholder={placeholder}
    />
  );
}
