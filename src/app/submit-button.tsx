"use client";

import { useFormStatus } from "react-dom";

// Butang submit borang server action — tunjuk spinner + cursor-wait + disable
// semasa hantar, supaya pengguna tahu klik mereka diterima (bukan senyap).
export function SubmitButton({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`${className} disabled:cursor-wait disabled:opacity-70`}
    >
      {pending && (
        <span
          aria-hidden
          className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent align-[-3px]"
        />
      )}
      {children}
    </button>
  );
}
