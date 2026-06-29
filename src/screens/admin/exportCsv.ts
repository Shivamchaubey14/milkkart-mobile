import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

function cell(v: string | number | null | undefined): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

/** Write the rows to a CSV in the cache dir and open the OS share/save sheet. */
export async function shareCsv(filename: string, rows: (string | number)[][]): Promise<void> {
  const csv = rows.map((r) => r.map(cell).join(",")).join("\n");
  const file = new File(Paths.cache, filename);
  file.create({ overwrite: true });
  file.write(csv);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: "text/csv",
      dialogTitle: filename,
      UTI: "public.comma-separated-values-text",
    });
  }
}
