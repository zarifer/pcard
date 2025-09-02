import { useEffect, useMemo, useRef, useState } from "react";
import { App, Button, Checkbox, Form, Input, InputNumber, Modal, Segmented, Space, Table, Tag, Typography } from "antd";
import axios from "axios";
import dayjs from "dayjs";
import { useApiUrl } from "@refinedev/core";

type ResultMeta = {
  year: number;
  month: number;
  testSetName?: string | null;
  cleanSampleSize?: number | null;
  locked: boolean;
  snapshotAt?: string | null;
};

type ResultRow = {
  id?: string;
  year: number;
  month: number;
  productId: string;
  productName?: string | null;
  vmName?: string | null;
  stage?: string | null;
  certMiss?: number | null;
  fps?: number | null;
  original?: string | null;
  cfnPreview?: number | null;
  cfnFinal?: number | null;
  privateFlag?: boolean;
  invResFlag?: boolean;
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function gradeString(total: number) {
  const t = Math.max(0, Math.floor(total || 0));
  const ap = Math.round(t - t * 0.995);
  const a = Math.round(t - t * 0.97);
  const b = Math.round(t - t * 0.9);
  const c = Math.round(t - t * 0.85);
  const d = Math.round(t - t * 0.75);
  return `A+: ${ap}, A: ${a}, B: ${b}, C: ${c}, D: ${d}, F: >${d}`;
}

function useDebouncedSaver(delay = 400) {
  const timer = useRef<number | null>(null);
  return (fn: () => void) => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(fn, delay);
  };
}

export default function KanbanResults({
  items = [],
  stages = [],
  companies = [],
}: {
  items?: Array<any>;
  stages?: Array<any>;
  companies?: Array<any>;
}) {
  const API_BASE = useApiUrl() || "";
  const { message } = App.useApp();

  const now = new Date();
  const yearBase = now.getFullYear();
  const [year, setYear] = useState<number>(yearBase);
  const [monthIdx, setMonthIdx] = useState<number>(now.getMonth());

  const [meta, setMeta] = useState<ResultMeta | null>(null);
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [cfgOpen, setCfgOpen] = useState(false);

  const isPast = (y: number, m: number) => {
    const a = y * 12 + m;
    const b = yearBase * 12 + now.getMonth();
    return a < b;
  };

  const selectedTag = `${MONTHS[monthIdx]} ${year}`;
  const todayTag = `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  const effectiveLocked = !!meta?.locked && isPast(year, monthIdx) ? true : !!meta?.locked;

  const load = async (y: number, m: number) => {
    const res = await axios.get(`${API_BASE.replace(/\/$/, "")}/api/results/${y}/${m + 1}`);
    setMeta(res.data.meta as ResultMeta);
    setRows((res.data.rows as ResultRow[]).map((r) => ({ ...r, year: y, month: m + 1 })));
  };

  useEffect(() => {
    load(year, monthIdx);
  }, [year, monthIdx]);

  const updater = useDebouncedSaver(350);
  const upsert = (partial: Partial<ResultRow> & { productId: string }) => {
    if (effectiveLocked) return;
    const payload: Partial<ResultRow> = {
      ...partial,
      year,
      month: monthIdx + 1,
    };
    updater(async () => {
      try {
        await axios.put(`${API_BASE.replace(/\/$/, "")}/api/results/${year}/${monthIdx + 1}/row`, payload);
      } catch {
        message.error("Save failed");
      }
    });
  };

  const onToggle = (pid: string, key: "privateFlag" | "invResFlag", v: boolean) => {
    setRows((prev) => prev.map((r) => (r.productId === pid ? { ...r, [key]: v } : r)));
    upsert({ productId: pid, [key]: v });
  };

  const onNumber = (pid: string, key: keyof ResultRow, v: number | null) => {
    setRows((prev) => prev.map((r) => (r.productId === pid ? { ...r, [key]: v ?? null } : r)));
    upsert({ productId: pid, [key]: typeof v === "number" ? v : null });
  };

  const onText = (pid: string, key: keyof ResultRow, v: string) => {
    setRows((prev) => prev.map((r) => (r.productId === pid ? { ...r, [key]: v } : r)));
    upsert({ productId: pid, [key]: v });
  };

  const prevYearStrip = () => setYear((y) => y - 1);
  const nextYearStrip = () => setYear((y) => y + 1);

  const onLockSnapshot = async () => {
    await axios.post(`${API_BASE.replace(/\/$/, "")}/api/results/${year}/${monthIdx + 1}/snapshot`);
    await load(year, monthIdx);
    message.success("Snapshot locked");
  };

  const [cfgForm] = Form.useForm();

  useEffect(() => {
    cfgForm.setFieldsValue({
      testSetName: meta?.testSetName || "testset-2025",
      cleanSampleSize: meta?.cleanSampleSize ?? 100000,
    });
  }, [meta?.testSetName, meta?.cleanSampleSize]);

  const onSaveConfig = async () => {
    const v = await cfgForm.validateFields();
    await axios.patch(`${API_BASE.replace(/\/$/, "")}/api/results/${year}/${monthIdx + 1}/meta`, {
      testSetName: v.testSetName || "testset-2025",
      cleanSampleSize: v.cleanSampleSize ?? 100000,
    });
    await load(year, monthIdx);
    setCfgOpen(false);
  };

  const columns = [
    {
      title: "Product ID",
      dataIndex: "productId",
      width: 140,
      fixed: "left" as const,
      render: (v: any) => v || "—",
    },
    {
      title: "Product Name",
      dataIndex: "productName",
      width: 220,
      render: (_: any, r: ResultRow) => (
        <Input
          value={r.productName || ""}
          disabled={effectiveLocked}
          onChange={(e) => onText(r.productId, "productName", e.target.value)}
        />
      ),
    },
    {
      title: "VM's Name",
      dataIndex: "vmName",
      width: 160,
      render: (_: any, r: ResultRow) => (
        <Input
          value={r.vmName || ""}
          disabled={effectiveLocked}
          onChange={(e) => onText(r.productId, "vmName", e.target.value)}
        />
      ),
    },
    {
      title: "Stage",
      dataIndex: "stage",
      width: 180,
      render: (_: any, r: ResultRow) => (
        <Input
          value={r.stage || ""}
          disabled={effectiveLocked}
          onChange={(e) => onText(r.productId, "stage", e.target.value)}
        />
      ),
    },
    {
      title: "CERT MISS",
      dataIndex: "certMiss",
      width: 120,
      render: (_: any, r: ResultRow) => (
        <InputNumber
          min={0}
          value={typeof r.certMiss === "number" ? r.certMiss : undefined}
          disabled={effectiveLocked}
          onChange={(v) => onNumber(r.productId, "certMiss", v as number | null)}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      title: "FPs",
      dataIndex: "fps",
      width: 100,
      render: (_: any, r: ResultRow) => (
        <InputNumber
          min={0}
          value={typeof r.fps === "number" ? r.fps : undefined}
          disabled={effectiveLocked}
          onChange={(v) => onNumber(r.productId, "fps", v as number | null)}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      title: "ORIGINAL",
      dataIndex: "original",
      width: 100,
      render: (_: any, r: ResultRow) => (
        <Input
          value={r.original || ""}
          disabled={effectiveLocked}
          onChange={(e) => onText(r.productId, "original", e.target.value)}
        />
      ),
    },
    {
      title: "PREVIEW CFN",
      dataIndex: "cfnPreview",
      width: 140,
      render: (_: any, r: ResultRow) => (
        <InputNumber
          min={0}
          value={typeof r.cfnPreview === "number" ? r.cfnPreview : undefined}
          disabled={effectiveLocked}
          onChange={(v) => onNumber(r.productId, "cfnPreview", v as number | null)}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      title: "FINAL CFN",
      dataIndex: "cfnFinal",
      width: 120,
      render: (_: any, r: ResultRow) => (
        <InputNumber
          min={0}
          value={typeof r.cfnFinal === "number" ? r.cfnFinal : undefined}
          disabled={effectiveLocked}
          onChange={(v) => onNumber(r.productId, "cfnFinal", v as number | null)}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      title: "PRIVATE",
      dataIndex: "privateFlag",
      width: 110,
      render: (_: any, r: ResultRow) => (
        <Checkbox
          checked={!!r.privateFlag}
          disabled={effectiveLocked}
          onChange={(e) => onToggle(r.productId, "privateFlag", e.target.checked)}
        />
      ),
    },
    {
      title: "INV/RES",
      dataIndex: "invResFlag",
      width: 110,
      render: (_: any, r: ResultRow) => (
        <Checkbox
          checked={!!r.invResFlag}
          disabled={effectiveLocked}
          onChange={(e) => onToggle(r.productId, "invResFlag", e.target.checked)}
        />
      ),
    },
  ];

  const yearOptions = [yearBase - 1, yearBase, yearBase + 1];

  return (
    <div style={{ padding: 8 }}>
      <div className="toolbar" style={{ margin: "8px 0", display: "flex", gap: 8 }}>
        <Button onClick={() => setCfgOpen(true)}>Info / Settings</Button>
        <div style={{ flex: 1 }} />
        {effectiveLocked ? (
          <Tag color="default">Locked</Tag>
        ) : (
          <Button type="primary" onClick={onLockSnapshot}>Take Snapshot</Button>
        )}
      </div>

      <Space direction="vertical" size={8} style={{ width: "100%", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Button onClick={prevYearStrip}>‹</Button>
          <Segmented value={year} onChange={(v) => setYear(Number(v))} options={yearOptions} />
          <Button onClick={nextYearStrip}>›</Button>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Segmented
            key={`months-${year}-${meta?.locked ? "L" : "U"}`}
            value={String(monthIdx)}
            onChange={(v) => setMonthIdx(Number(v))}
            options={MONTHS.map((m, i) => ({ label: m.slice(0, 3), value: String(i) }))}
          />
          <Space>
            <Tag color="processing">Selected: {selectedTag}</Tag>
            {isPast(year, monthIdx) && <Tag color="default">Past</Tag>}
            {meta?.locked && <Tag color="purple">Snapshot locked</Tag>}
            <Tag color="purple">Today: {todayTag}</Tag>
          </Space>
        </div>
      </Space>

      <Table
        rowKey={(r) => r.productId}
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
        locale={{ emptyText: "No data" }}
        scroll={{ x: 1200 }}
      />

      <Modal
        open={cfgOpen}
        onCancel={() => setCfgOpen(false)}
        onOk={onSaveConfig}
        title="Settings"
        okText="Save"
      >
        <Form form={cfgForm} layout="vertical">
          <Form.Item name="testSetName" label="Test-set name">
            <Input placeholder="testset-2025" />
          </Form.Item>
          <Form.Item name="cleanSampleSize" label="Clean sample size">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Typography.Text type="secondary">
            {gradeString(Number(cfgForm.getFieldValue("cleanSampleSize") || meta?.cleanSampleSize || 100000))}
          </Typography.Text>
        </Form>
      </Modal>
    </div>
  );
}
