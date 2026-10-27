"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();
  const copy = t.errors;

  useEffect(() => {
    console.error("[ui] error no controlado", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
        <h1 className="text-2xl font-bold text-rose-950">{copy.errorTitle}</h1>
        <p className="mt-2 text-sm text-rose-800">{copy.errorBody}</p>
        {error.digest && (
          <p className="mt-2 text-xs text-rose-700">
            {copy.reference} <code className="rounded bg-rose-100 px-1">{error.digest}</code>
          </p>
        )}
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {t.common.retry}
          </button>
          <Link
            href="/"
            className="rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-900 hover:bg-rose-100"
          >
            {t.common.backHome}
          </Link>
        </div>
      </div>
    </div>
  );
}
