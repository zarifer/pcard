import { List, DateField } from "@refinedev/antd";
import { useList, useUpdate } from "@refinedev/core";
import {
  Card,
  Tabs,
  Table,
  Space,
  Typography,
  DatePicker,
  Button,
  Modal,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { Dayjs } from "dayjs";
import { useMemo, useState, useCallback } from "react";

type Company = {
  id: string;
  name: string;
  product?: string;
  productId?: string;
  licenseExpiry?: string | null;
};

type TabKey = "all" | "soon" | "expired";

const { Title } = Typography;
const { RangePicker } = DatePicker;

const statusOf = (d?: string | null) => {
  if (!d) return "Good";
  const now = dayjs().startOf("day");
  const exp = dayjs(d).startOf("day");
  if (exp.isBefore(now)) return "Expired";
  if (exp.diff(now, "day") <= 30) return "Expiring Soon";
  return "Good";
};

const rowBg = (status: string) => {
  if (status === "Expired") return { background: "rgba(255, 77, 79, 0.08)" };
  if (status === "Expiring Soon")
    return { background: "rgba(250, 173, 20, 0.08)" };
  return {};
};

export default function LicenseExpiryList() {
  const { data, isLoading, refetch } = useList<Company>({
    resource: "companies",
    pagination: { pageSize: 1000 },
    queryOptions: { staleTime: 30000 },
  });

  const items = data?.data ?? [];

  const withStatus = useMemo(
    () =>
      items.map((c) => ({
        ...c,
        _status: statusOf(c.licenseExpiry),
      })),
    [items],
  );

  const [active, setActive] = useState<TabKey>("all");
  const filtered = useMemo(() => {
    if (active === "soon")
      return withStatus.filter((x) => x._status === "Expiring Soon");
    if (active === "expired")
      return withStatus.filter((x) => x._status === "Expired");
    return withStatus;
  }, [withStatus, active]);

  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const byDateRange = useMemo(() => {
    if (!range || (!range[0] && !range[1])) return filtered;
    const [start, end] = range;
    return filtered.filter((r) => {
      const d = r.licenseExpiry ? dayjs(r.licenseExpiry).startOf("day") : null;
      if (!d) return false;
      if (start && d.isBefore(start.startOf("day"))) return false;
      if (end && d.isAfter(end.endOf("day"))) return false;
      return true;
    });
  }, [filtered, range]);

  const [sortOrder, setSortOrder] = useState<"ascend" | "descend" | null>(null);
  const sorted = useMemo(() => {
    if (!sortOrder) return byDateRange;
    return [...byDateRange].sort((a, b) => {
      const da = a.licenseExpiry ? dayjs(a.licenseExpiry).valueOf() : Infinity;
      const db = b.licenseExpiry ? dayjs(b.licenseExpiry).valueOf() : Infinity;
      return sortOrder === "ascend" ? da - db : db - da;
    });
  }, [byDateRange, sortOrder]);

  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<Company | null>(null);
  const [editDate, setEditDate] = useState<Dayjs | null>(null);

  const { mutateAsync: updateCompany, isLoading: saving } = useUpdate();

  const openEdit = useCallback((row: Company) => {
    setEditRow(row);
    setEditDate(row.licenseExpiry ? dayjs(row.licenseExpiry) : null);
    setEditOpen(true);
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editRow) return;
    const payload: Partial<Company> = {
      licenseExpiry: editDate ? editDate.toISOString() : null,
    };
    await updateCompany({
      resource: "companies",
      id: String(editRow.id),
      values: payload,
      mutationMode: "pessimistic",
    });
    setEditOpen(false);
    setEditRow(null);
    await refetch();
  }, [editRow, editDate, updateCompany, refetch]);

  const columns: ColumnsType<any> = [
    {
      title: "Product ID",
      dataIndex: "productId",
      sorter: true,
      sortOrder: sortOrder ?? undefined,
      onHeaderCell: () => ({
        onClick: () =>
          setSortOrder((s) =>
            s === "ascend" ? "descend" : s === "descend" ? null : "ascend",
          ),
        style: { cursor: "pointer" },
      }),
      width: 160,
      render: (v: any) => v ?? "—",
      onCell: () => ({ style: { whiteSpace: "nowrap" } }),
    },
    {
      title: "Company Name",
      dataIndex: "name",
      sorter: true,
      sortOrder: sortOrder ?? undefined,
      onHeaderCell: () => ({
        onClick: () =>
          setSortOrder((s) =>
            s === "ascend" ? "descend" : s === "descend" ? null : "ascend",
          ),
        style: { cursor: "pointer" },
      }),
      render: (v: any) => v ?? "—",
    },
    {
      title: "Expiry Date",
      dataIndex: "licenseExpiry",
      sorter: true,
      sortOrder: sortOrder ?? undefined,
      onHeaderCell: () => ({
        onClick: () =>
          setSortOrder((s) =>
            s === "ascend" ? "descend" : s === "descend" ? null : "ascend",
          ),
        style: { cursor: "pointer" },
      }),
      render: (v: any) =>
        v ? <DateField value={v} format="YYYY-MM-DD" /> : "—",
      width: 160,
    },
    {
      title: "Status",
      dataIndex: "_status",
      sorter: true,
      sortOrder: sortOrder ?? undefined,
      onHeaderCell: () => ({
        onClick: () =>
          setSortOrder((s) =>
            s === "ascend" ? "descend" : s === "descend" ? null : "ascend",
          ),
        style: { cursor: "pointer" },
      }),
      width: 160,
      render: (v: string) => v,
    },
    {
      title: "Actions",
      dataIndex: "actions",
      width: 120,
      render: (_: any, r: Company) => (
        <Space size="small">
          <Button size="small" onClick={() => openEdit(r)}>
            Edit
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <List title="License Expiry">
      <Card className="panel-card">
        <div className="panel-header">
          <div className="panel-actions" />
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          <RangePicker
            value={range ?? [null, null]}
            onChange={(v) => setRange(v as any)}
            allowEmpty={[true, true]}
          />
        </div>

        <Tabs
          className="tabs-default"
          activeKey={active}
          onChange={(k) => setActive(k as TabKey)}
          items={[
            { key: "all", label: "All", children: null },
            { key: "soon", label: "Expiring Soon", children: null },
            { key: "expired", label: "Expired", children: null },
          ]}
        />

        <Table
          loading={isLoading}
          rowKey="id"
          dataSource={sorted}
          columns={columns}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          rowClassName={(r: any) =>
            r._status === "Expired"
              ? "license-row-expired"
              : r._status === "Expiring Soon"
                ? "license-row-soon"
                : ""
          }
          onRow={() => ({ style: {} })}
        />
      </Card>

      <Modal
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={saveEdit}
        confirmLoading={saving}
        title="Edit expiry date"
        okText="Save"
      >
        <DatePicker
          style={{ width: "100%" }}
          value={editDate}
          onChange={(d) => setEditDate(d)}
          allowClear
        />
      </Modal>
    </List>
  );
}
