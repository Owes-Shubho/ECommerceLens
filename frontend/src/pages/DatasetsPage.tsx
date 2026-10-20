import { useRef, useState } from "react";
import { FileUp, Upload } from "lucide-react";
import { Alert, Button, DataTable, StatusPill, type Column } from "@/components/ui";
import { Panel } from "@/components/Panel";
import { REAL_DATASET } from "@/data/catalog";
import { int, pct } from "@/lib/format";
import { cn } from "@/lib/utils";

/** The 46 columns of ecommerce_sales_customer_analytics_150k.csv, used to validate uploads of the main table. */
const EXPECTED = "order_id,order_date,order_time,order_status,sales_channel,customer_id,customer_name,customer_age,gender,customer_segment,customer_type,customer_city,customer_state,customer_country,region,customer_postal_code,payment_method,payment_status,currency,shipping_method,warehouse,delivery_days,estimated_delivery_days,delivery_status,return_status,return_reason,customer_rating,review_sentiment,customer_review,marketing_channel,campaign_name,coupon_code,loyalty_points_earned,loyalty_points_redeemed,quantity,gross_sales,discount_amount,tax_amount,shipping_cost,net_sales,product_cost,profit,profit_margin_percentage,customer_lifetime_value,is_repeat_customer,customer_order_count".split(",");
const PII = new Set(["customer_name", "customer_postal_code", "customer_review", "customer_city"]);

type ColProfile = { name: string; type: string; missing: number; distinct: number; example: string; flag?: string };

function splitCsvLine(line: string) {
  const out: string[] = [];
  let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q;
    } else if (c === "," && !q) { out.push(cur); cur = ""; } else cur += c;
  }
  out.push(cur);
  return out;
}

function profile(text: string, sampleCap = 5000) {
  const lines = text.split(/\r?\n/).filter((l) => l.length);
  const header = splitCsvLine(lines[0]).map((h) => h.trim());
  const rows = lines.slice(1, sampleCap + 1).map(splitCsvLine);
  const cols: ColProfile[] = header.map((name, i) => {
    const vals = rows.map((r) => (r[i] ?? "").trim());
    const filled = vals.filter((v) => v !== "");
    const isNum = filled.length > 0 && filled.every((v) => !Number.isNaN(Number(v)));
    const isDate = !isNum && filled.length > 0 && filled.slice(0, 50).every((v) => /^\d{4}-\d{2}-\d{2}/.test(v));
    return { name, type: isNum ? "number" : isDate ? "date" : "text", missing: vals.length - filled.length, distinct: new Set(filled).size, example: filled[0] ?? "", flag: PII.has(name) ? "Personal data" : undefined };
  });
  return { header, cols, sampleRows: rows.length, totalLines: lines.length - 1 };
}

interface Version { id: string; label: string; files: string; rows: number; status: "current" | "validated" | "archived"; note: string }

export default function DatasetsPage() {
  const [versions, setVersions] = useState<Version[]>([
    { id: "v1", label: "v1 · Kaggle export", files: "5 files", rows: 138116, status: "current", note: "2021-01-01 to 2025-12-31" },
  ]);
  const [upload, setUpload] = useState<{ name: string; sizeKB: number; p: ReturnType<typeof profile> } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const read = (file: File) => {
    setError(null);
    if (!/\.csv$/i.test(file.name)) {
      setError(`${file.name} is not a CSV file. Upload a .csv export.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result);
        setUpload({ name: file.name, sizeKB: file.size / 1024, p: profile(text) });
      } catch {
        setError("The file could not be read as CSV. Check that it has a header row and comma separators.");
      }
    };
    // Read the first 4 MB: enough to profile the columns without freezing the page on a 50 MB file.
    reader.readAsText(file.slice(0, 4 * 1024 * 1024));
  };

  const header = upload?.p.header ?? [];
  const missingCols = EXPECTED.filter((c) => !header.includes(c));
  const extraCols = header.filter((c) => !EXPECTED.includes(c));
  const matchesMain = upload && missingCols.length === 0;

  const fileCols: Column<(typeof REAL_DATASET.files)[number]>[] = [
    { key: "name", label: "File", mono: true },
    { key: "role", label: "Contents" },
    { key: "rows", label: "Rows", align: "right", format: (v) => int(v as number) },
    { key: "columns", label: "Columns", align: "right" },
    { key: "sizeMB", label: "Size", align: "right", format: (v) => ((v as number) < 1 ? `${Math.max(1, Math.round((v as number) * 1024))} KB` : `${(v as number).toFixed(1)} MB`) },
  ];
  const profCols: Column<ColProfile>[] = [
    { key: "name", label: "Column", mono: true },
    { key: "type", label: "Type" },
    { key: "missing", label: "Blank in sample", align: "right", format: (v) => int(v as number) },
    { key: "distinct", label: "Distinct", align: "right", format: (v) => int(v as number) },
    { key: "example", label: "Example", format: (v, r) => (r.flag ? <StatusPill tone="warning">Personal data, masked</StatusPill> : <span className="text-ink-muted">{String(v).slice(0, 32)}</span>) },
  ];
  const verCols: Column<Version>[] = [
    { key: "label", label: "Version" },
    { key: "files", label: "Files" },
    { key: "rows", label: "Rows", align: "right", format: (v) => int(v as number) },
    { key: "note", label: "Notes" },
    { key: "status", label: "Status", format: (v) => <StatusPill tone={v === "current" ? "good" : v === "validated" ? "lens" : "neutral"} icon={v === "current"}>{v === "current" ? "In use" : v === "validated" ? "Validated" : "Archived"}</StatusPill> },
  ];

  return (
    <>
      <Alert tone="neutral" title="The app is running on demo data">
        The pages use a generated sample shaped exactly like your dataset. The real files below get loaded into DuckDB in Phase 2; nothing is uploaded to a server from this page.
      </Alert>

      <div className="grid gap-space-3">
        <h2 className="text-heading text-ink">Source files · {REAL_DATASET.dateRange}</h2>
        <DataTable caption="Dataset files" columns={fileCols} rows={REAL_DATASET.files} rowKey={(r) => r.name} />
      </div>

      <div className="grid gap-space-6 lg:grid-cols-2">
        <Panel title="Publisher's summary" subtitle="From dataset_statistics.csv">
          <dl className="grid grid-cols-2 gap-x-space-4 gap-y-space-3 text-body-sm">
            {[
              ["Total revenue", `$${REAL_DATASET.totals.revenue.toLocaleString("en-US", { maximumFractionDigits: 2 })}`],
              ["Total profit", `$${REAL_DATASET.totals.profit.toLocaleString("en-US", { maximumFractionDigits: 2 })}`],
              ["Average order value", `$${REAL_DATASET.totals.aov.toFixed(2)}`],
              ["Average rating", REAL_DATASET.totals.rating.toFixed(2)],
              ["Return rate", pct(REAL_DATASET.totals.returnRate, 2)],
              ["Cancellation rate", pct(REAL_DATASET.totals.cancellationRate, 2)],
              ["Customers", int(REAL_DATASET.totals.customers)],
            ].map(([k, v]) => (
              <div key={k} className="grid gap-0.5">
                <dt className="text-label text-ink-muted">{k}</dt>
                <dd className="tabular font-medium text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>
        <Panel title="Known data-quality notes" subtitle="Blank values counted in the main table">
          <ul className="grid gap-space-2 text-body-sm">
            {REAL_DATASET.blanks.map((b) => (
              <li key={b.column} className="flex flex-wrap items-baseline justify-between gap-space-2 border-b border-line pb-space-2 last:border-0">
                <span className="font-mono text-code text-ink">{b.column}</span>
                <span className="tabular text-ink">{b.blank == null ? "Not profiled yet" : `${int(b.blank)} blank`}</span>
                <span className="basis-full text-ink-muted">{b.note}</span>
              </li>
            ))}
            <li className="text-ink-muted">The main table has 138,116 rows, not the 150k its file name suggests, and no product_id: products link through order_items.csv.</li>
          </ul>
        </Panel>
      </div>

      <Panel title="Check a new export" subtitle="Profile a CSV in your browser and compare it with the main table's 46 columns">
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) read(f); }}
          className={cn("grid place-items-center gap-space-2 rounded-md border border-dashed p-space-8 text-center", drag ? "border-lens bg-lens-soft" : "border-line-strong bg-surface")}
        >
          <FileUp className="size-6 text-ink-subtle" aria-hidden />
          <p className="text-body text-ink">Drop a CSV file here</p>
          <p className="text-body-sm text-ink-muted">The first 4 MB is read to profile the columns. The file stays on your computer.</p>
          <input ref={inputRef} id="csv-file" type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) read(f); e.target.value = ""; }} />
          <Button icon={<Upload aria-hidden />} onClick={() => inputRef.current?.click()}>Choose file</Button>
        </div>
        {error ? <Alert tone="critical" title="File not accepted">{error}</Alert> : null}
        {upload ? (
          <div className="grid gap-space-3">
            <div className="flex flex-wrap items-center justify-between gap-space-3">
              <p className="text-body text-ink">
                <span className="font-mono text-code">{upload.name}</span> · {upload.sizeKB > 1024 ? `${(upload.sizeKB / 1024).toFixed(1)} MB` : `${Math.round(upload.sizeKB)} KB`} · {int(upload.p.header.length)} columns · profiled {int(upload.p.sampleRows)} rows
              </p>
              <Button
                variant="primary"
                disabled={!matchesMain || versions.some((v) => v.label.includes(upload.name))}
                onClick={() => setVersions([...versions.map((v) => v), { id: `v${versions.length + 1}`, label: `v${versions.length + 1} · ${upload.name}`, files: "1 file", rows: upload.p.totalLines, status: "validated", note: "Schema matches; ingestion runs in Phase 25" }])}
              >
                Register as new version
              </Button>
            </div>
            {matchesMain ? (
              <Alert tone="good" title="Schema matches the main table">All 46 expected columns are present{extraCols.length ? `, plus ${extraCols.length} extra: ${extraCols.join(", ")}` : ""}.</Alert>
            ) : (
              <Alert tone="warning" title={`${missingCols.length} expected column${missingCols.length === 1 ? "" : "s"} missing`}>
                {missingCols.slice(0, 12).join(", ")}{missingCols.length > 12 ? "…" : ""}. This file can't replace the main table, but its profile is below.
              </Alert>
            )}
            <DataTable caption="Column profile" columns={profCols} rows={upload.p.cols} rowKey={(r) => r.name} />
          </div>
        ) : null}
      </Panel>

      <div className="grid gap-space-3">
        <h2 className="text-heading text-ink">Versions</h2>
        <DataTable caption="Dataset versions" columns={verCols} rows={versions} rowKey={(r) => r.id} />
      </div>
    </>
  );
}
