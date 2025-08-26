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

type Stage = { key: string; title: string };
type KanbanItem = {
  id?: string | number;
  title: string;
  stage: string;
  dueDate?: string | null;
};
type Company = { productId?: string; product?: string };

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

type Thresholds = { APlus: number; A: number; B: number; C: number; D: number };
type Config = {
  thresholds: Thresholds;
  testSetName?: string;
  cleanSampleSize?: number;
  certificationSet?: number;
  preview?: number;
};

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

const FLAGS_KEY = "vb100-flags";

type FlagStore = { private: string[]; invres: string[] };

const readFlags = (): FlagStore => {
  try {
    const raw = localStorage.getItem(FLAGS_KEY);
    if (!raw) return { private: [], invres: [] };
    const obj = JSON.parse(raw);
    return {
      private: Array.isArray(obj?.private) ? obj.private : [],
      invres: Array.isArray(obj?.invres) ? obj.invres : [],
    };
  } catch {
    return { private: [], invres: [] };
  }
};

const writeFlags = (next: FlagStore) => {
  localStorage.setItem(FLAGS_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("vb100-flags-updated"));
};

const setFlag = (pid: string, key: keyof FlagStore, on: boolean) => {
  const norm = pid.trim().toLowerCase();
  const f = readFlags();
  const s = new Set(f[key].map((x) => x.toLowerCase()));
  if (on) s.add(norm);
  else s.delete(norm);
  f[key] = Array.from(s);
  writeFlags(f);
};

export default function Results({
  items,
  stages,
  companies,
}: {
  items: KanbanItem[];
  stages: Stage[];
  companies: Company[];
}) {
  const now = new Date();
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth();

  const [yearBase, setYearBase] = useState<number>(nowYear);
  const [year, setYear] = useState<number>(nowYear);
  const [monthIdx, setMonthIdx] = useState<number>(nowMonth);

  const [rows, setRows] = useState<ResultRow[]>([]);
  const [config, setConfig] = useState<Config>({
    thresholds: { APlus: 9, A: 56, B: 186, C: 279, D: 465 },
    testSetName: "",
    cleanSampleSize: undefined,
    certificationSet: undefined,
    preview: undefined,
  });

  const [cfgOpen, setCfgOpen] = useState(false);
  const [cfgForm] = Form.useForm();
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [unlockPass, setUnlockPass] = useState("");
  const [snapshotLocked, setSnapshotLocked] = useState(false);
  const [overrideUnlocked, setOverrideUnlocked] = useState(false);
  const [loadedKey, setLoadedKey] = useState<string>("");

  const isPast = useCallback(
    (y: number, m: number) => y < nowYear || (y === nowYear && m < nowMonth),
    [nowMonth, nowYear],
  );

  const effectiveLocked =
    (snapshotLocked || isPast(year, monthIdx)) && !overrideUnlocked;

  const storageKey = useMemo(
    () => `vb100-results-${year}-${String(monthIdx + 1).padStart(2, "0")}`,
    [year, monthIdx],
  );

  const stageTitle = useMemo(() => {
    const m: Record<string, string> = {};
    stages.forEach((s) => (m[s.key] = s.title));
    return m;
  }, [stages]);

  const companyByPid = useMemo(() => {
    const m = new Map<string, Company>();
    companies.forEach((c) => {
      const k = String(c.productId || "")
        .trim()
        .toLowerCase();
      if (k) m.set(k, c);
    });
    return m;
  }, [companies]);

  const itemsByPid = useMemo(() => {
    const m = new Map<string, KanbanItem>();
    items.forEach((it) => {
      const k = String(it.title || "")
        .trim()
        .toLowerCase();
      if (k) m.set(k, it);
    });
    return m;
  }, [items]);

  const baseRowsFromItems = useCallback(
    () =>
      items.map((it, idx) => {
        const pid = String(it.title || "").trim();
        const comp = companyByPid.get(pid.toLowerCase());
        return {
          key: String(it.id ?? `${pid}-${idx}`),
          productId: pid,
          productName: comp?.product || "—",
          w11Id: `W11-${pid}`,
          stageLabel: stageTitle[it.stage] || it.stage,
        } as ResultRow;
      }),
    [items, companyByPid, stageTitle],
  );

  const gradeFromCertMiss = useCallback(
    (val?: string) => {
      if (val == null || val === "") return "—";
      const n = Number(val);
      if (!isFinite(n)) return "—";
      const t = config.thresholds;
      if (n <= t.APlus) return "A+";
      if (n <= t.A) return "A";
      if (n <= t.B) return "B";
      if (n <= t.C) return "C";
      if (n <= t.D) return "D";
      return "F";
    },
    [config.thresholds],
  );

  const pureVmName = (w: any, pid: string) => {
    const raw = String(w ?? "");
    if (!raw) return pid ? `W11-${pid}` : "";
    const cut = raw.split("•")[0].trim();
    return cut || (pid ? `W11-${pid}` : "");
  };

  const normalizeRows = useCallback(
    (rs?: any[]): ResultRow[] => {
      const store = readFlags();
      const priv = new Set(store.private.map((x: string) => x.toLowerCase()));
      const inv = new Set(store.invres.map((x: string) => x.toLowerCase()));
      const base = Array.isArray(rs) ? rs : baseRowsFromItems();
      return base.map((r: any, idx: number) => {
        const pid = String(r.productId ?? r.title ?? "").trim();
        const pidKey = pid.toLowerCase();
        const comp = companyByPid.get(pidKey);
        const item = itemsByPid.get(pidKey);
        const stageKey = item?.stage;
        const stageLbl = stageKey
          ? stageTitle[stageKey] || stageKey
          : r.stage ?? r.stageLabel ?? "";
        return {
          key: String(r.key ?? item?.id ?? `${pid}-${idx}`),
          productId: pid,
          productName: comp?.product ?? r.productName ?? "—",
          w11Id: pureVmName(r.w11Id ?? r.w11, pid),
          stageLabel: stageLbl,
          certMiss: r.certMiss ?? "",
          fps: r.fps ?? "",
          previewCfn: r.previewCfn ?? "",
          finalCfn: r.finalCfn ?? "",
          privateFlag: (r.privateFlag ?? r.private) ?? priv.has(pidKey),
          invResFlag: (r.invResFlag ?? r.inv_res) ?? inv.has(pidKey),
        };
      });
    },
    [itemsByPid, companyByPid, stageTitle, baseRowsFromItems],
  );

  const reconcileRows = useCallback(
    (saved: any[] = []): ResultRow[] => {
      const byPid = new Map<string, any>();
      saved.forEach((r) => {
        const k = String(r.productId ?? r.title ?? "").trim().toLowerCase();
        if (k) byPid.set(k, r);
      });
      const store = readFlags();
      const priv = new Set(store.private.map((x: string) => x.toLowerCase()));
      const inv = new Set(store.invres.map((x: string) => x.toLowerCase()));
      return items.map((it, idx) => {
        const pid = String(it.title || "").trim();
        const k = pid.toLowerCase();
        const prev = byPid.get(k) || {};
        const comp = companyByPid.get(k);
        return {
          key: String(prev.key ?? it.id ?? `${pid}-${idx}`),
          productId: pid,
          productName: comp?.product ?? prev.productName ?? "—",
          w11Id: pureVmName(prev.w11Id ?? `W11-${pid}`, pid),
          stageLabel: stageTitle[it.stage] || it.stage,
          certMiss: prev.certMiss ?? "",
          fps: prev.fps ?? "",
          previewCfn: prev.previewCfn ?? "",
          finalCfn: prev.finalCfn ?? "",
          privateFlag: (prev.privateFlag ?? prev.private) ?? priv.has(k),
          invResFlag: (prev.invResFlag ?? prev.inv_res) ?? inv.has(k),
        };
      });
    },
    [items, companyByPid, stageTitle],
  );

  useEffect(() => {
    if (effectiveLocked) return;
    setRows((prev) => reconcileRows(prev));
  }, [items, effectiveLocked, reconcileRows]);

  useEffect(() => {
    if (loadedKey !== storageKey) return;
    const rowsToSave =
      isPast(year, monthIdx) && !snapshotLocked && !overrideUnlocked ? [] : rows;
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        rows: rowsToSave,
        config,
        locked: snapshotLocked,
        overrideUnlocked,
      }),
    );
  }, [
    rows,
    config,
    snapshotLocked,
    overrideUnlocked,
    storageKey,
    year,
    monthIdx,
    isPast,
    loadedKey,
  ]);

  useEffect(() => {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const savedRows = Array.isArray(parsed.rows) ? parsed.rows : [];
        setConfig(parsed?.config ?? config);
        setSnapshotLocked(!!parsed.locked);
        setOverrideUnlocked(!!parsed.overrideUnlocked);
        const nextLocked =
          (!!parsed.locked || isPast(year, monthIdx)) && !parsed.overrideUnlocked;
        setRows(nextLocked ? normalizeRows(savedRows) : reconcileRows(savedRows));
        setLoadedKey(storageKey);
        return;
      } catch {}
    }
    const past = isPast(year, monthIdx);
    setSnapshotLocked(past);
    setOverrideUnlocked(false);
    setRows(past ? [] : reconcileRows([]));
    setLoadedKey(storageKey);
  }, [storageKey, year, monthIdx, isPast, normalizeRows, reconcileRows, config]);

  const updateRow = useCallback(
    (key: string, patch: Partial<ResultRow>) =>
      setRows((prev) =>
        prev.map((r) => (r.key === key ? { ...r, ...patch } : r)),
      ),
    [],
  );

  const onOpenConfig = () => {
    cfgForm.setFieldsValue({
      APlus: config.thresholds.APlus,
      A: config.thresholds.A,
      B: config.thresholds.B,
      C: config.thresholds.C,
      D: config.thresholds.D,
      testSetName: config.testSetName,
      cleanSampleSize: config.cleanSampleSize,
      certificationSet: config.certificationSet,
      preview: config.preview,
    });
    setCfgOpen(true);
  };

  const onSaveConfig = async () => {
    const vals = await cfgForm.validateFields();
    setConfig({
      thresholds: {
        APlus: Number(vals.APlus),
        A: Number(vals.A),
        B: Number(vals.B),
        C: Number(vals.C),
        D: Number(vals.D),
      },
      testSetName: vals.testSetName || "",
      cleanSampleSize: vals.cleanSampleSize ?? undefined,
      certificationSet: vals.certificationSet ?? undefined,
      preview: vals.preview ?? undefined,
    });
    setCfgOpen(false);
  };

  const exportCsv = () => {
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
  };

  const onLockSnapshot = () => {
    if (effectiveLocked) return;
    Modal.confirm({
      title: "Lock this month?",
      content:
        "The table will be locked. You can edit it only with a password.",
      okText: "Take Snapshot",
      cancelText: "Cancel",
      onOk: () => {
        setSnapshotLocked(true);
        setOverrideUnlocked(false);
      },
    });
  };

  const onUnlockConfirm = () => {
    const allowed = isPast(year, monthIdx) || snapshotLocked;
    if (!allowed) {
      message.error("Cannot unlock.");
      return;
    }
    if (unlockPass === "opensesame") {
      if (isPast(year, monthIdx)) setOverrideUnlocked(true);
      if (snapshotLocked) setSnapshotLocked(false);
      setUnlockPass("");
      setUnlockOpen(false);
    } else {
      message.error("Incorrect password.");
    }
  };

  const yearOptions = useMemo(
    () => [yearBase - 1, yearBase, yearBase + 1],
    [yearBase],
  );

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

  const todayTag = `${MONTHS[nowMonth]} ${now.getDate()}, ${nowYear}`;
  const selectedTag = `${MONTHS[monthIdx]} ${year}`;

  const columns = useMemo(
    () => [
      { title: "Product ID", dataIndex: "productId", width: 160 },
      { title: "Product Name", dataIndex: "productName", width: 220 },
      { title: "VM’s Name", dataIndex: "w11Id", width: 160 },
      { title: "Stage", dataIndex: "stageLabel", width: 180 },
      {
        title: "CERT MISS",
        dataIndex: "certMiss",
        width: 120,
        render: (v: any, r: ResultRow) => (
          <Input
            value={v || ""}
            disabled={effectiveLocked || !!r.invResFlag}
            onChange={(e) =>
              updateRow(r.key, { certMiss: e.target.value.trimStart() })
            }
          />
        ),
      },
      {
        title: "FPs",
        dataIndex: "fps",
        width: 100,
        render: (v: any, r: ResultRow) => (
          <Input
            value={v || ""}
            disabled={effectiveLocked || !!r.invResFlag}
            onChange={(e) =>
              updateRow(r.key, { fps: e.target.value.trimStart() })
            }
          />
        ),
      },
      {
        title: "ORIGINAL",
        dataIndex: "original",
        width: 120,
        render: (_: any, r: ResultRow) => (
          <span>{gradeFromCertMiss(r.certMiss)}</span>
        ),
      },
      {
        title: "PREVIEW CFN",
        dataIndex: "previewCfn",
        width: 140,
        render: (v: any, r: ResultRow) => (
          <Input
            value={v || ""}
            disabled={effectiveLocked || !!r.invResFlag}
            onChange={(e) =>
              updateRow(r.key, { previewCfn: e.target.value.trimStart() })
            }
          />
        ),
      },
      {
        title: "FINAL CFN",
        dataIndex: "finalCfn",
        width: 120,
        render: (v: any, r: ResultRow) => (
          <Input
            value={v || ""}
            disabled={effectiveLocked || !!r.invResFlag}
            onChange={(e) =>
              updateRow(r.key, { finalCfn: e.target.value.trimStart() })
            }
          />
        ),
      },
      {
        title: "PRIVATE",
        dataIndex: "privateFlag",
        width: 100,
        render: (v: any, r: ResultRow) => (
          <Checkbox
            checked={!!v}
            disabled={effectiveLocked}
            onChange={(e) => {
              setFlag(r.productId, "private", e.target.checked);
              updateRow(r.key, { privateFlag: e.target.checked });
            }}
          />
        ),
      },
      {
        title: "INV/RES",
        dataIndex: "invResFlag",
        width: 100,
        render: (v: any, r: ResultRow) => (
          <Checkbox
            checked={!!v}
            disabled={effectiveLocked}
            onChange={(e) => {
              setFlag(r.productId, "invres", e.target.checked);
              updateRow(r.key, { invResFlag: e.target.checked });
            }}
          />
        ),
      },
    ],
    [effectiveLocked, updateRow, gradeFromCertMiss],
  );

  return (
    <div style={{ padding: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <Typography.Title level={4} style={{ margin: 0 }}>
          Results
        </Typography.Title>
        <Space>
          <Button onClick={exportCsv}>Export to CSV</Button>
          <Button onClick={onOpenConfig}>Info / Settings</Button>
          {isPast(year, monthIdx) ? (
            overrideUnlocked ? (
              <Button type="primary" onClick={onLockSnapshot}>
                Take Snapshot
              </Button>
            ) : (
              <Button type="primary" onClick={() => setUnlockOpen(true)}>
                Unlock
              </Button>
            )
          ) : snapshotLocked ? (
            <Button type="primary" onClick={() => setUnlockOpen(true)}>
              Unlock
            </Button>
          ) : (
            <Button type="primary" onClick={onLockSnapshot}>
              Take Snapshot
            </Button>
          )}
        </Space>
      </div>

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
            key={`months-${year}-${snapshotLocked ? "L" : "U"}-${overrideUnlocked ? "O" : "X"}`}
            value={String(monthIdx)}
            onChange={(v) => setMonthIdx(Number(v))}
            options={MONTHS.map((m, i) => ({
              label: m.slice(0, 3),
              value: String(i),
            }))}
          />
          <Space>
            <Tag color="processing">Selected: {selectedTag}</Tag>
            {isPast(year, monthIdx) &&
              (!overrideUnlocked ? (
                <Tag color="default">Past (locked)</Tag>
              ) : (
                <Tag color="green">Past (unlocked)</Tag>
              ))}
            {!isPast(year, monthIdx) && snapshotLocked && (
              <Tag color="purple">Snapshot locked</Tag>
            )}
            <Tag color="purple">Today: {todayTag}</Tag>
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
        scroll={{ x: 1200 }}
      />

      <Modal
        open={cfgOpen}
        onCancel={() => setCfgOpen(false)}
        onOk={onSaveConfig}
        title="Settings"
        okText="Save"
        okButtonProps={{ disabled: effectiveLocked }}
      >
        <Form form={cfgForm} layout="vertical" disabled={effectiveLocked}>
          <Typography.Text strong>
            Grade thresholds (by CERT miss)
          </Typography.Text>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 8,
              marginTop: 8,
            }}
          >
            <Form.Item name="APlus" label="A+">
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="A" label="A">
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="B" label="B">
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="C" label="C">
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="D" label="D">
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
          </div>
          <Typography.Text strong style={{ display: "block", marginTop: 4 }}>
            Meta
          </Typography.Text>
          <Form.Item name="testSetName" label="test-set name">
            <Input />
          </Form.Item>
          <Form.Item name="cleanSampleSize" label="clean sample size">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="certificationSet" label="certification set">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="preview" label="preview">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
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
