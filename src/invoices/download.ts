import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import { Invoice } from "../api/baseApi";

const COMPANY = "Shwetdhara Milk Producer Company Limited";

const money = (n: number | string) => "₹" + Number(n || 0).toFixed(2);

function esc(s: string): string {
  return String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
}

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

// A self-contained printable invoice. Rendered to PDF by expo-print's webview.
export function buildInvoiceHtml(inv: Invoice): string {
  const rows = (inv.items ?? [])
    .map((it) => {
      const name = esc(it.product_name) + (it.variant_label ? ` <span class="muted">(${esc(it.variant_label)})</span>` : "");
      return `<tr>
        <td>${name}</td>
        <td class="c">${it.quantity}</td>
        <td class="r">${money(it.product_price)}</td>
        <td class="r">${money(it.subtotal)}</td>
      </tr>`;
    })
    .join("");

  const totalRow = (label: string, value: string, strong = false) =>
    `<tr class="${strong ? "tot" : ""}"><td colspan="3" class="r">${label}</td><td class="r">${value}</td></tr>`;

  const discount = Number(inv.discount) > 0 ? totalRow("Discount", "−" + money(inv.discount)) : "";
  const fees = Number(inv.delivery_fee) + Number(inv.small_cart_fee);

  return `<!doctype html><html><head><meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif; color: #253d4e; margin: 0; padding: 28px; font-size: 13px; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #3bb77e; padding-bottom: 14px; }
    .brand { font-size: 20px; font-weight: 800; color: #3bb77e; }
    .company { font-size: 12px; color: #5e7180; margin-top: 4px; max-width: 320px; }
    .inv-title { text-align: right; }
    .inv-title h1 { margin: 0; font-size: 18px; letter-spacing: 1px; }
    .muted { color: #7a8893; font-weight: normal; }
    .meta { display: flex; justify-content: space-between; margin-top: 18px; gap: 24px; }
    .meta .box { flex: 1; }
    .label { font-size: 10px; letter-spacing: 1px; color: #7a8893; text-transform: uppercase; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 22px; }
    th { text-align: left; font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: #7a8893; border-bottom: 1px solid #e3e7e9; padding: 8px 6px; }
    td { padding: 9px 6px; border-bottom: 1px solid #eef1f3; }
    th.c, td.c { text-align: center; } th.r, td.r { text-align: right; }
    tfoot td { border: none; padding: 5px 6px; }
    tfoot .tot td { font-weight: 800; font-size: 15px; color: #3bb77e; border-top: 2px solid #e3e7e9; padding-top: 10px; }
    .paid { display: inline-block; margin-top: 18px; background: #eaf7f1; color: #287d56; font-weight: 700; padding: 5px 12px; border-radius: 999px; font-size: 11px; letter-spacing: 1px; }
    .foot { margin-top: 26px; color: #7a8893; font-size: 11px; text-align: center; }
  </style></head>
  <body>
    <div class="head">
      <div>
        <div class="brand">MilkKart</div>
        <div class="company">${esc(COMPANY)}</div>
      </div>
      <div class="inv-title">
        <h1>INVOICE</h1>
        <div class="muted">${esc(inv.number)}</div>
      </div>
    </div>

    <div class="meta">
      <div class="box">
        <div class="label">Billed to</div>
        <div>${esc(inv.address_snapshot || "—")}</div>
      </div>
      <div class="box" style="text-align:right">
        <div class="label">Order</div>
        <div>#${esc(String(inv.order_number).slice(0, 8))}</div>
        <div class="label" style="margin-top:10px">Order date</div>
        <div>${fmtDate(inv.placed_at)}</div>
        <div class="label" style="margin-top:10px">Invoice date</div>
        <div>${fmtDate(inv.issued_at)}</div>
      </div>
    </div>

    <table>
      <thead><tr><th>Item</th><th class="c">Qty</th><th class="r">Price</th><th class="r">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot>
        ${totalRow("Subtotal", money(inv.subtotal))}
        ${discount}
        ${totalRow("Delivery & fees", fees > 0 ? money(fees) : "FREE")}
        ${totalRow("Tax", money(inv.tax))}
        ${totalRow("Total", money(inv.total), true)}
      </tfoot>
    </table>

    <div class="paid">PAID</div>
    <div class="foot">Thank you for ordering with MilkKart 🥛</div>
  </body></html>`;
}

// Generate the PDF and open the share/save sheet.
export async function generateAndShareInvoice(inv: Invoice): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html: buildInvoiceHtml(inv) });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: "Invoice " + inv.number,
      UTI: "com.adobe.pdf",
    });
  }
}
