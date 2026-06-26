// Merchant UPI details — taken verbatim from the company's printed ICICI
// POS-linked static QR (decoded). The `tr` (transaction reference) is REQUIRED
// by this POS VPA: a QR built from just pa/pn fails at the payer's bank with
// "Receiver's UPI ID or VPA was unavailable". Keep these exactly as on the
// sticker; `pn` is intentionally the registered M/S. name (not title-cased).
export const MERCHANT_UPI = {
  vpa: "ibkPOS.EP138384@icici",
  name: "M/S.SHWETDHARA MILK PRODUCER COMPANY LIMITED",
  ref: "EPYSSQREP138384",
};

// Reproduce the exact working payload and append the order amount so the
// customer's UPI app pre-fills it. Values are kept literal (as in the printed
// QR) — UPI apps parse spaces/`/` fine, and matching the proven QR avoids the
// bank rejecting a re-encoded merchant string.
export function upiUri(amount: number | string): string {
  const am = Number(amount || 0).toFixed(2);
  return (
    "upi://pay?pa=" + MERCHANT_UPI.vpa +
    "&pn=" + MERCHANT_UPI.name +
    "&tr=" + MERCHANT_UPI.ref +
    "&am=" + am +
    "&cu=INR"
  );
}
