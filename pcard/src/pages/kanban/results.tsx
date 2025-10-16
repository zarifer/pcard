import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Table,
  Typography,
  Input,
  Checkbox,
  Segmented,
  Space,
  Tag,
  Button,
  Modal,
  Form,
  InputNumber,
  message,
} from "antd";
import { useCalendarLogger } from "../calendar/calendarlogger";

type Stage = { key: string; title: string };
type KanbanItem = {
  id?: string | number;
  title: string;
  stage: string;
  dueDate?: string | null;
};
type Company = {
  productId?: string;
  product?: string;
  name?: string;
  productName?: string;
  title?: string;
  company?: string;
  label?: string;
};

type ResultRow = {
  key: string;
  productId: string;
  productName: string;
  w11Id: string;
  stageLabel: string;
  certMiss?: string;
  fps?: string;
  previewCfn?: string;
  finalCfn?: string;
  privateFlag?: boolean;
  invResFlag?: boolean;
};

type Config = {
  testSetName?: string;
  cleanSampleSize?: number;
  certificationSet?: number;
  preview?: number;
};

type PrimaryAction = { label: string; onClick: () => void };
export type ResultsApi = {
  exportCsv: () => void;
  openConfig: () => void;
  getPrimaryAction: () => PrimaryAction | null;
};

const API_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:4000";
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}
async function postJson<T>(url: string, body: any): Promise<T> {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}
async function patchJson<T>(url: string, body: any): Promise<T> {
  const r = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

const normalizePid = (s?: string) => (s ?? "").toString().trim().toUpperCase();
const extractCompanyName = (c: any) =>
  c?.product ?? c?.name ?? c?.productName ?? c?.title ?? c?.company ?? c?.label;

export default function Results({
  items,
  stages,
  companies,
  onReady,
}: {
  items: KanbanItem[];
  stages: Stage[];
  companies: Company[];
  onReady?: (api: ResultsApi) => void;
}) {
  const now = new Date();
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth();

  const [yearBase, setYearBase] = useState<number>(nowYear);
  const [year, setYear] = useState<number>(nowYear);
  const [monthIdx, setMonthIdx] = useState<number>(nowMonth);

  const [rows, setRows] = useState<ResultRow[]>([]);
  const [config, setConfig] = useState<Config>({
    testSetName: "testset-2025",
    cleanSampleSize: 100000,
    certificationSet: undefined,
    preview: undefined,
  });

  const [cfgOpen, setCfgOpen] = useState(false);
  const [cfgForm] = Form.useForm();
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [unlockPass, setUnlockPass] = useState("");
  const [snapshotLocked, setSnapshotLocked] = useState(false);
  const [overrideUnlocked, setOverrideUnlocked] = useState(false);

  const [companyNameByPid, setCompanyNameByPid] = useState<
    Record<string, string>
  >({});

  const { log } = useCalendarLogger();

  const isPast = useCallback(
    (y: number, m: number) => y < nowYear || (y === nowYear && m < nowMonth),
    [nowMonth, nowYear],
  );
  const effectiveLocked =
    (snapshotLocked || isPast(year, monthIdx)) && !overrideUnlocked;

  const getProductName = useCallback(
    (pid?: string) => companyNameByPid[normalizePid(pid)],
    [companyNameByPid],
  );

  const stageTitle = useMemo(() => {
    const m: Record<string, string> = {};
    stages.forEach((s) => (m[s.key] = s.title));
    return m;
  }, [stages]);

  useEffect(() => {
    if (!companies?.length) return;
    const m: Record<string, string> = {};
    for (const c of companies) {
      const pid = normalizePid((c as any)?.productId);
      const nm = extractCompanyName(c);
      if (pid && nm) m[pid] = nm;
    }
    setCompanyNameByPid((prev) => ({ ...prev, ...m }));
  }, [companies]);

  useEffect(() => {
    getJson<any[]>(`${API_URL}/companies`)
      .then((list) => {
        const m: Record<string, string> = {};
        for (const c of list || []) {
          const pid = normalizePid((c as any)?.productId);
          const nm = extractCompanyName(c);
          if (pid && nm) m[pid] = nm;
        }
        setCompanyNameByPid((prev) => ({ ...m, ...prev }));
      })
      .catch(() => {});
  }, []);

  const itemsByPid = useMemo(() => {
    const m = new Map<string, KanbanItem>();
    items.forEach((it) => {
      const k = String(it.title || "")
        .trim()
        .toUpperCase();
      if (k) m.set(k, it);
    });
    return m;
  }, [items]);

  const baseRowsFromItems = useCallback(
    () =>
      items.map((it, idx) => {
        const pid = String(it.title || "").trim();
        const pname = getProductName(pid) || "—";
        return {
          key: String(it.id ?? `${pid}-${idx}`),
          productId: pid,
          productName: pname,
          w11Id: `W11-${pid}`,
          stageLabel: stageTitle[it.stage] || it.stage,
        } as ResultRow;
      }),
    [items, getProductName, stageTitle],
  );

  const pureVmName = (w: any, pid: string) => {
    const raw = String(w ?? "");
    if (!raw) return pid ? `W11-${pid}` : "";
    const cut = raw.split("•")[0].trim();
    return cut || (pid ? `W11-${pid}` : "");
  };

  const thresholds = useMemo(() => {
    const n = config.preview ?? config.certificationSet;
    if (!n || !isFinite(n)) return { APlus: 0, A: 0, B: 0, C: 0, D: 0 };
    const r = (p: number) => Math.round(n - n * p);
    return { APlus: r(0.995), A: r(0.97), B: r(0.9), C: r(0.85), D: r(0.75) };
  }, [config.preview, config.certificationSet]);

  const gradeFromCertMiss = useCallback(
    (val?: string) => {
      if (val == null || val === "") return "—";
      const n = Number(val);
      if (!isFinite(n)) return "—";
      const t = thresholds;
      if (n <= t.APlus) return "A+";
      if (n <= t.A) return "A";
      if (n <= t.B) return "B";
      if (n <= t.C) return "C";
      if (n <= t.D) return "D";
      return "F";
    },
    [thresholds],
  );

  const normalizeRows = useCallback(
    (rs?: any[]): ResultRow[] => {
      const base = Array.isArray(rs) ? rs : baseRowsFromItems();
      return base.map((r: any, idx: number) => {
        const pid = String(r.productId ?? r.title ?? "").trim();
        const pidKey = pid.toUpperCase();
        const item = itemsByPid.get(pidKey);
        const stageKey = item?.stage;
        const stageLbl = stageKey
          ? stageTitle[stageKey] || stageKey
          : (r.stage ?? r.stageLabel ?? "");
        const pname = getProductName(pid) ?? r.productName ?? "—";
        return {
          key: String(r.key ?? item?.id ?? `${pid}-${idx}`),
          productId: pid,
          productName: pname,
          w11Id: pureVmName(r.vmName ?? r.w11Id, pid),
          stageLabel: stageLbl,
          certMiss: r.certMiss ?? "",
          fps: r.fps ?? "",
          previewCfn: r.cfnPreview ?? r.previewCfn ?? "",
          finalCfn: r.cfnFinal ?? r.finalCfn ?? "",
          privateFlag: r.privateFlag ?? r.private ?? false,
          invResFlag: r.invResFlag ?? r.inv_res ?? false,
        };
      });
    },
    [itemsByPid, stageTitle, baseRowsFromItems, getProductName],
  );

  const reconcileRows = useCallback(
    (saved: any[] = []): ResultRow[] => {
      const byPid = new Map<string, any>();
      saved.forEach((r) => {
        const k = String(r.productId ?? r.title ?? "")
          .trim()
          .toUpperCase();
        if (k) byPid.set(k, r);
      });
      return items.map((it, idx) => {
        const pid = String(it.title || "").trim();
        const k = pid.toUpperCase();
        const prev = byPid.get(k) || {};
        const pname = getProductName(pid) ?? prev.productName ?? "—";
        return {
          key: String(prev.key ?? it.id ?? `${pid}-${idx}`),
          productId: pid,
          productName: pname,
          w11Id: pureVmName(prev.vmName ?? prev.w11Id ?? `W11-${pid}`, pid),
          stageLabel: stageTitle[it.stage] || it.stage,
          certMiss: prev.certMiss ?? "",
          fps: prev.fps ?? "",
          previewCfn: prev.cfnPreview ?? prev.previewCfn ?? "",
          finalCfn: prev.cfnFinal ?? prev.finalCfn ?? "",
          privateFlag: prev.privateFlag ?? prev.private ?? false,
          invResFlag: prev.invResFlag ?? prev.inv_res ?? false,
        };
      });
    },
    [items, stageTitle, getProductName],
  );

  const upsertMeta = useCallback(
    async (
      vals: Partial<{
        testSetName?: string;
        cleanSampleSize?: number;
        certificationSet?: number;
        preview?: number;
        locked?: boolean;
        lastSnapshotAt?: string;
        lastUnlockAt?: string;
      }>,
      appendEvent?: { action: "snapshot" | "unlock"; at: string },
    ) => {
      const y = year;
      const m = monthIdx + 1;
      const existing = await getJson<any[]>(
        `${API_URL}/resultsMeta?year=${y}&month=${m}`,
      );
      const cur = existing[0] || { id: `${y}-${m}`, year: y, month: m };
      const base = cur ?? { id: `${y}-${m}`, year: y, month: m };
      const next = {
        ...cur,
        ...base,
        year: y,
        month: m,
        ...vals,
        eventLog: appendEvent
          ? [...(cur?.eventLog || []), appendEvent]
          : cur?.eventLog || [],
      };
      if (cur.id) {
        await patchJson(`${API_URL}/resultsMeta/${cur.id}`, next);
      } else {
        await postJson(`${API_URL}/resultsMeta`, next);
      }
    },
    [year, monthIdx],
  );

  const saveMeta = useCallback(
    async (vals: {
      testSetName?: string;
      cleanSampleSize?: number;
      certificationSet?: number;
      preview?: number;
    }) => {
      try {
        await upsertMeta({
          testSetName: vals.testSetName,
          cleanSampleSize:
            typeof vals.cleanSampleSize === "number"
              ? vals.cleanSampleSize
              : undefined,
          certificationSet:
            typeof vals.certificationSet === "number"
              ? vals.certificationSet
              : undefined,
          preview: typeof vals.preview === "number" ? vals.preview : undefined,
        });
      } catch (e: any) {
        message.error(e?.message || "Meta save failed");
      }
    },
    [upsertMeta],
  );

  const takeSnapshot = useCallback(async () => {
    try {
      const at = new Date().toISOString();
      await upsertMeta(
        { locked: true, lastSnapshotAt: at },
        { action: "snapshot", at },
      );
      setSnapshotLocked(true);
      setOverrideUnlocked(false);
    } catch (e: any) {
      message.error(e?.message || "Snapshot failed");
    }
  }, [upsertMeta]);

  const numOrEmpty = (v: any) =>
    v === "" || v === null || v === undefined ? "" : Number(v);

  const saveRow = useCallback(
    async (patch: Partial<ResultRow>) => {
      if (!patch.productId) return;
      const y = year;
      const m = monthIdx + 1;
      try {
        const pid = normalizePid(patch.productId);
        const q = await getJson<any[]>(
          `${API_URL}/resultsRows?year=${y}&month=${m}&productId=${encodeURIComponent(pid)}`,
        );

        const resolvedName =
          (patch.productName && patch.productName !== "—"
            ? patch.productName
            : undefined) ?? getProductName(pid);

        const body: any = {
          year: y,
          month: m,
          productId: pid,
          productName: resolvedName,
          vmName: patch.w11Id,
          stage: patch.stageLabel,
          certMiss: numOrEmpty(patch.certMiss),
          fps: numOrEmpty(patch.fps),
          cfnPreview: numOrEmpty(patch.previewCfn),
          cfnFinal: numOrEmpty(patch.finalCfn),
          privateFlag:
            typeof patch.privateFlag === "boolean"
              ? patch.privateFlag
              : (q[0]?.privateFlag ?? false),
          invResFlag:
            typeof patch.invResFlag === "boolean"
              ? patch.invResFlag
              : (q[0]?.invResFlag ?? false),
        };
        if (!resolvedName) delete body.productName;

        if (q[0]?.id) {
          await patchJson(`${API_URL}/resultsRows/${q[0].id}`, body);
        } else {
          await postJson(`${API_URL}/resultsRows`, {
            id: `${y}-${m}-${pid}`,
            ...body,
          });
        }
      } catch (e: any) {
        message.error(e?.message || "Save failed");
      }
    },
    [year, monthIdx, getProductName],
  );

  const resolveMissingNames = useCallback(
    async (current: ResultRow[], y: number, m: number) => {
      const need = current.filter(
        (r) => !r.productName || r.productName === "—",
      );
      if (!need.length) return;
      const upd: Record<string, string> = {};
      for (const r of need) {
        const pid = normalizePid(r.productId);
        if (!getProductName(pid)) {
          try {
            const arr = await getJson<any[]>(
              `${API_URL}/companies?productId=${encodeURIComponent(pid)}`,
            );
            const c = arr?.[0];
            const n = extractCompanyName(c);
            if (n) upd[pid] = n;
          } catch {}
        }
      }
      if (Object.keys(upd).length)
        setCompanyNameByPid((prev) => ({ ...prev, ...upd }));
      setRows((prev) =>
        prev.map((x) => {
          const nn = getProductName(x.productId);
          return nn && (x.productName === "—" || !x.productName)
            ? { ...x, productName: nn }
            : x;
        }),
      );
      for (const r of need) {
        const nn = getProductName(r.productId);
        if (nn) await saveRow({ productId: r.productId, productName: nn });
      }
    },
    [getProductName, saveRow],
  );

  const loadMonth = useCallback(async () => {
    const y = year;
    const m = monthIdx + 1;
    try {
      const [metaArr, rowsArr] = await Promise.all([
        getJson<any[]>(`${API_URL}/resultsMeta?year=${y}&month=${m}`),
        getJson<any[]>(`${API_URL}/resultsRows?year=${y}&month=${m}`),
      ]);

      const meta = metaArr[0];
      setSnapshotLocked(!!meta?.locked);
      setOverrideUnlocked(false);
      setConfig((prev) => ({
        ...prev,
        testSetName: meta?.testSetName ?? prev.testSetName ?? "testset-2025",
        cleanSampleSize:
          meta?.cleanSampleSize ?? prev.cleanSampleSize ?? 100000,
        certificationSet: meta?.certificationSet ?? prev.certificationSet,
        preview: meta?.preview ?? prev.preview,
      }));

      const dedupRows = Array.isArray(rowsArr)
        ? Object.values(
            (rowsArr as any[]).reduce(
              (acc, r) => {
                const k = normalizePid(r.productId);
                if (!acc[k]) acc[k] = r;
                return acc;
              },
              {} as Record<string, any>,
            ),
          )
        : [];

      const lockedNow = (!!meta?.locked || isPast(y, monthIdx)) && !false;
      const initial = lockedNow
        ? normalizeRows(dedupRows)
        : reconcileRows(dedupRows);
      setRows(initial);
      resolveMissingNames(initial, y, m);
    } catch {
      const past = isPast(y, monthIdx);
      setSnapshotLocked(past);
      setOverrideUnlocked(false);
      const initial = past ? [] : reconcileRows([]);
      setRows(initial);
      if (!past) resolveMissingNames(initial, y, m);
    }
  }, [
    year,
    monthIdx,
    isPast,
    normalizeRows,
    reconcileRows,
    resolveMissingNames,
  ]);

  useEffect(() => {
    loadMonth();
  }, [loadMonth]);

  useEffect(() => {
    const pastView = isPast(year, monthIdx);
    if (effectiveLocked || pastView) return;
    const next = reconcileRows(rows);
    setRows(next);
    if (next.length) resolveMissingNames(next, year, monthIdx + 1);
  }, [
    items,
    companies,
    stages,
    reconcileRows,
    effectiveLocked,
    isPast,
    year,
    monthIdx,
  ]);

  const onOpenConfig = useCallback(() => {
    cfgForm.setFieldsValue({
      testSetName: config.testSetName ?? "testset-2025",
      cleanSampleSize: config.cleanSampleSize ?? 100000,
      certificationSet: config.certificationSet,
      preview: config.preview,
    });
    setCfgOpen(true);
  }, [cfgForm, config]);

  const onSaveConfig = async () => {
    const vals = await cfgForm.validateFields();
    setConfig({
      testSetName: vals.testSetName || "testset-2025",
      cleanSampleSize: vals.cleanSampleSize ?? 100000,
      certificationSet: vals.certificationSet ?? undefined,
      preview: vals.preview ?? undefined,
    });
    await saveMeta({
      testSetName: vals.testSetName || "testset-2025",
      cleanSampleSize: vals.cleanSampleSize ?? 100000,
      certificationSet: vals.certificationSet ?? undefined,
      preview: vals.preview ?? undefined,
    });
    setCfgOpen(false);
  };

  const exportCsv = useCallback(() => {
    const meta = [
      ["test-set name", config.testSetName ?? ""],
      ["clean sample size", String(config.cleanSampleSize ?? "")],
      ["certification set", String(config.certificationSet ?? "")],
      ["preview", String(config.preview ?? "")],
    ];
    const header = [
      "Product ID",
      "Product Name",
      "VM's Name",
      "Stage",
      "CERT MISS",
      "FPs",
      "ORIGINAL",
      "PREVIEW CFN",
      "FINAL CFN",
      "PRIVATE",
      "INV/RES",
    ];
    const data = rows.map((r) => [
      r.productId,
      r.productName,
      r.w11Id,
      r.stageLabel,
      r.certMiss ?? "",
      r.fps ?? "",
      gradeFromCertMiss(r.certMiss),
      r.previewCfn ?? "",
      r.finalCfn ?? "",
      r.privateFlag ? "TRUE" : "FALSE",
      r.invResFlag ? "TRUE" : "FALSE",
    ]);
    const serialize = (arr: string[][]) =>
      arr
        .map((line) =>
          line.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(","),
        )
        .join("\n");

    const monthName = MONTHS[monthIdx];
    const content = [
      serialize(meta),
      "",
      header.join(","),
      ...data.map((d) =>
        d.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");

    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `VB100_tracker_${monthName}_${year}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    log({ title: "Exported to CSV", description: "Exported results to CSV" });
  }, [rows, config, gradeFromCertMiss, year, monthIdx]);

  const onLockSnapshot = useCallback(() => {
    if (effectiveLocked) return;
    Modal.confirm({
      title: "Lock this month?",
      content:
        "The table will be locked. You can edit it only with a password.",
      okText: "Take Snapshot",
      cancelText: "Cancel",
      onOk: () => {
        takeSnapshot();
        log({
          title: "Snapshot Locked",
          description: "Locked current month in Results",
        });
      },
    });
  }, [effectiveLocked, takeSnapshot]);

  const onUnlockConfirm = async () => {
    const allowed = isPast(year, monthIdx) || snapshotLocked;
    if (!allowed) {
      message.error("Cannot unlock.");
      return;
    }
    if (unlockPass === "opensesame") {
      if (isPast(year, monthIdx)) setOverrideUnlocked(true);
      if (snapshotLocked) {
        const at = new Date().toISOString();
        await upsertMeta(
          { locked: false, lastUnlockAt: at },
          { action: "unlock", at },
        );
        setSnapshotLocked(false);
      }
      setUnlockPass("");
      setUnlockOpen(false);
      log({
        title: "Snapshot Unlocked",
        description: "Unlocked month in Results",
      });
    } else {
      message.error("Incorrect password.");
    }
  };

  const prevYearStrip = () => {
    const nb = yearBase - 1;
    setYearBase(nb);
    if (year < nb - 1 || year > nb + 1) setYear(nb);
  };
  const nextYearStrip = () => {
    const nb = yearBase + 1;
    setYearBase(nb);
    if (year < nb - 1 || year > nb + 1) setYear(nb);
  };

  const onCellChange = useCallback(
    async (key: string, patch: Partial<ResultRow>) => {
      let mergedRow: ResultRow | undefined;
      setRows((prev) => {
        const next = prev.map((r) =>
          r.key === key ? ((mergedRow = { ...r, ...patch }), mergedRow) : r,
        );
        return next;
      });
      if (mergedRow) {
        await saveRow({
          productId: mergedRow.productId,
          productName: mergedRow.productName,
          w11Id: mergedRow.w11Id,
          stageLabel: mergedRow.stageLabel,
          certMiss: mergedRow.certMiss,
          fps: mergedRow.fps,
          previewCfn: mergedRow.previewCfn,
          finalCfn: mergedRow.finalCfn,
          privateFlag: mergedRow.privateFlag,
          invResFlag: mergedRow.invResFlag,
        });
        log({
          title: mergedRow.productName || mergedRow.productId,
          description: "Edited in Results",
        });
      }
    },
    [saveRow],
  );

  const renderNum = (val: any, r: ResultRow, key: keyof ResultRow) => (
    <InputNumber
      min={0}
      step={1}
      precision={0}
      controls={false}
      style={{ width: "100%" }}
      value={
        val === "" || val === undefined || val === null
          ? undefined
          : Number(val)
      }
      disabled={effectiveLocked || !!r.invResFlag}
      onChange={(v) =>
        onCellChange(r.key, { [key]: v == null ? "" : String(v) } as any)
      }
    />
  );

  const columns = useMemo(
    () => [
      { title: "Product ID", dataIndex: "productId", width: 160 },
      { title: "Product Name", dataIndex: "productName", width: 260 },
      { title: "VM’s Name", dataIndex: "w11Id", width: 160 },
      { title: "Stage", dataIndex: "stageLabel", width: 180 },
      {
        title: "Cert Miss",
        dataIndex: "certMiss",
        width: 120,
        render: (v: any, r: ResultRow) => renderNum(v, r, "certMiss"),
      },
      {
        title: "FPs",
        dataIndex: "fps",
        width: 100,
        render: (v: any, r: ResultRow) => renderNum(v, r, "fps"),
      },
      {
        title: "Original",
        dataIndex: "original",
        width: 120,
        render: (_: any, r: ResultRow) => (
          <span>{gradeFromCertMiss(r.certMiss)}</span>
        ),
      },
      {
        title: "Preview CFN",
        dataIndex: "previewCfn",
        width: 140,
        render: (v: any, r: ResultRow) => renderNum(v, r, "previewCfn"),
      },
      {
        title: "Final CFN",
        dataIndex: "finalCfn",
        width: 120,
        render: (v: any, r: ResultRow) => renderNum(v, r, "finalCfn"),
      },
      {
        title: "Private",
        dataIndex: "privateFlag",
        width: 100,
        render: (v: any, r: ResultRow) => (
          <Checkbox
            checked={!!v}
            disabled={effectiveLocked}
            onChange={(e) =>
              onCellChange(r.key, { privateFlag: e.target.checked })
            }
          />
        ),
      },
      {
        title: "Inv/Res",
        dataIndex: "invResFlag",
        width: 100,
        render: (v: any, r: ResultRow) => (
          <Checkbox
            checked={!!v}
            disabled={effectiveLocked}
            onChange={(e) =>
              onCellChange(r.key, { invResFlag: e.target.checked })
            }
          />
        ),
      },
    ],
    [effectiveLocked, gradeFromCertMiss],
  );

  useEffect(() => {
    const getPrimaryAction = (): PrimaryAction | null => {
      const past = isPast(year, monthIdx);
      if (past) {
        return !overrideUnlocked
          ? { label: "Unlock", onClick: () => setUnlockOpen(true) }
          : { label: "Lock", onClick: onLockSnapshot };
      }
      if (snapshotLocked)
        return { label: "Unlock", onClick: () => setUnlockOpen(true) };
      return { label: "Take a Snapshot", onClick: onLockSnapshot };
    };
    onReady?.({
      exportCsv,
      openConfig: onOpenConfig,
      getPrimaryAction,
    });
  }, [
    onReady,
    exportCsv,
    onOpenConfig,
    isPast,
    year,
    monthIdx,
    overrideUnlocked,
    snapshotLocked,
    onLockSnapshot,
  ]);

  return (
    <div
      style={{
        padding: 16,
      }}
    >
      <Space
        direction="vertical"
        size={8}
        style={{ width: "100%", marginBottom: 12 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Button onClick={prevYearStrip}>‹</Button>
          <Segmented
            value={year}
            onChange={(v) => setYear(Number(v))}
            options={[yearBase - 1, yearBase, yearBase + 1]}
          />
          <Button onClick={nextYearStrip}>›</Button>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Segmented
            value={monthIdx}
            onChange={(v) => setMonthIdx(Number(v))}
            options={MONTHS.map((m, i) => ({ label: m.slice(0, 3), value: i }))}
          />
          <Space>
            <Tag color="processing">
              Selected: {`${MONTHS[monthIdx]} ${year}`}
            </Tag>
            {isPast(year, monthIdx) &&
              (!overrideUnlocked ? (
                <Tag color="default">Past (locked)</Tag>
              ) : (
                <Tag color="green">Past (unlocked)</Tag>
              ))}
            {!isPast(year, monthIdx) && snapshotLocked && (
              <Tag color="purple">Snapshot locked</Tag>
            )}
            <Tag color="purple">
              Today: {`${MONTHS[nowMonth]} ${now.getDate()}, ${nowYear}`}
            </Tag>
          </Space>
        </div>
      </Space>

      <Table
        rowKey="key"
        size="middle"
        pagination={false}
        dataSource={rows}
        columns={columns as any}
        rowClassName={(r) =>
          effectiveLocked
            ? "results-row-snapshot"
            : r.invResFlag
              ? "results-row-locked"
              : r.privateFlag
                ? "results-row-private"
                : ""
        }
        scroll={{ x: 1280 }}
      />

      <Modal
        open={cfgOpen}
        onCancel={() => setCfgOpen(false)}
        onOk={onSaveConfig}
        title="Settings"
        okText="Save"
        okButtonProps={{ disabled: effectiveLocked }}
      >
        <Form
          form={cfgForm}
          layout="vertical"
          disabled={effectiveLocked}
          onValuesChange={(_, all) => {
            setConfig((prev) => ({
              ...prev,
              testSetName: all.testSetName ?? prev.testSetName,
              cleanSampleSize: all.cleanSampleSize ?? prev.cleanSampleSize,
              certificationSet: all.certificationSet ?? prev.certificationSet,
              preview: all.preview ?? prev.preview,
            }));
          }}
        >
          <Form.Item
            name="testSetName"
            label="Test-Set Name"
            initialValue="testset-2025"
          >
            <Input
              onFocus={(e) => {
                const v = e.target.value;
                e.target.value = "";
                e.target.value = v;
              }}
            />
          </Form.Item>
          <Form.Item
            name="cleanSampleSize"
            label="Clean Sample Size"
            initialValue={100000}
          >
            <InputNumber min={0} precision={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="certificationSet" label="Certification Set">
            <InputNumber<number>
              min={0}
              precision={0}
              style={{ width: "100%" }}
              formatter={(v) => `${v ?? ""}`}
              parser={(v) => {
                const s = (v ?? "").replace(/\D/g, "");
                return s ? Number(s) : 0;
              }}
            />
          </Form.Item>

          <Form.Item name="preview" label="Preview">
            <InputNumber<number>
              min={0}
              precision={0}
              style={{ width: "100%" }}
              formatter={(v) => `${v ?? ""}`}
              parser={(v) => {
                const s = (v ?? "").replace(/\D/g, "");
                return s ? Number(s) : 0;
              }}
            />
          </Form.Item>

          <Typography.Text strong style={{ display: "block", marginTop: 12 }}>
            Evaluation Buckets
          </Typography.Text>
          <div
            style={{
              padding: "8px 10px",
              background: "rgba(0,0,0,0.03)",
              borderRadius: 8,
            }}
          >
            {(() => {
              const n = config.preview ?? config.certificationSet;
              if (!n || !isFinite(n))
                return "Provide Preview or Certification set to compute thresholds.";
              const r = (p: number) => Math.round(n - n * p);
              return `A+: ${r(0.995)}, A: ${r(0.97)}, B: ${r(0.9)}, C: ${r(0.85)}, D: ${r(0.75)}, F: >${r(0.75)}`;
            })()}
          </div>
        </Form>
      </Modal>

      <Modal
        open={unlockOpen}
        onCancel={() => {
          setUnlockOpen(false);
          setUnlockPass("");
        }}
        onOk={onUnlockConfirm}
        title="Unlock with password"
        okText="Unlock"
      >
        <Input.Password
          value={unlockPass}
          onChange={(e) => setUnlockPass(e.target.value)}
          placeholder="Password"
        />
      </Modal>
    </div>
  );
}
