import { useCallback, useState } from "react";

import { useLazyInvoiceForOrderQuery } from "../api/baseApi";
import { useToast } from "../components/Toast";
import { generateAndShareInvoice } from "./download";

// Fetches the order's invoice, renders a PDF and opens the share/save sheet.
// `busy` lets callers show a spinner / disable the button while it runs.
export function useInvoiceDownloader() {
  const [fetchInvoice] = useLazyInvoiceForOrderQuery();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const download = useCallback(
    async (orderNumber: string) => {
      if (busy) return;
      setBusy(true);
      try {
        const inv = await fetchInvoice(orderNumber).unwrap();
        await generateAndShareInvoice(inv);
      } catch (e) {
        toast("Couldn't generate the invoice. Please try again.", "error");
      } finally {
        setBusy(false);
      }
    },
    [busy, fetchInvoice, toast],
  );

  return { download, busy };
}
