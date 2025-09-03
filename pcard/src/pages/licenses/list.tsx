import { List, DateField } from "@refinedev/antd";
import { useList, useUpdate } from "@refinedev/core";
import {
  Card,
  Tabs,
  Table,
  DatePicker,
  Button,
  Modal,
  Input,
  Row,
  Col,
  Checkbox,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { Dayjs } from "dayjs";
import { useMemo, useState, useCallback } from "react";
import { EditOutlined } from "@ant-design/icons";

const { RangePicker } = DatePicker;

type Company = {
  id: string;
  name: string;
  product?: string;
  productId?: string;
  licenseExpiry?: string | null;
  licenseExpiryMode?: "date" | "perpetual" | "none";
  activationType?:
    | "oem"
    | "floating"
    | "trial"
    | "none"
    | "serial"
    | "license_file"
    | "vendor_account"
    | "email_based";
  activationSerial?: string;
};

type TabKey = "all" | "soon" | "expired";

const activationTypeLabel = (v?: string) =>
  v === "oem"
    ? "OEM"
    : v === "floating"
      ? "Floating"
      : v === "trial"
        ? "Trial"
        : v === "none"
          ? "No Activation"
          : v === "serial"
            ? "Serial Key"
            : v === "license_file"
              ? "License File"
              : v === "vendor_account"
                ? "Vendor Account"
                : v === "email_based"
                  ? "E-mail Based"
                  : "—";

export default function LicenseExpiryList() {
  const { data, isLoading, refetch } = useList<Company>({
    resource: "companies",
    pagination: { pageSize: 1000 },
    queryOptions: { staleTime: 30000 },
  });

  const items = data?.data ?? [];

  const prepared = useMemo(
    () =>
      items.map((c) => {
        const expiryEffective =
          c.licenseExpiryMode === "perpetual" || c.licenseExpiryMode === "none"
            ? dayjs("2099-12-31").toISOString()
            : (c.licenseExpiry ?? null);
        const now = dayjs().startOf("day");
        const st = expiryEffective
          ? dayjs(expiryEffective).startOf("day").isBefore(now)
            ? "Expired"
            : dayjs(expiryEffective).diff(now, "day") <= 30
              ? "Expiring Soon"
              : "Good"
          : "Good";
        return { ...c, _expiryEffective: expiryEffective, _status: st };
      }),
    [items],
  );

  const [active, setActive] = useState<TabKey>("all");
  const filteredByTab = useMemo(() => {
    if (active === "soon")
      return prepared.filter((x: any) => x._status === "Expiring Soon");
    if (active === "expired")
      return prepared.filter((x: any) => x._status === "Expired");
    return prepared;
  }, [prepared, active]);

  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const filtered = useMemo(() => {
    if (!range || (!range[0] && !range[1])) return filteredByTab;
    const [start, end] = range;
    return filteredByTab.filter((r: any) => {
      const d = r._expiryEffective
        ? dayjs(r._expiryEffective).startOf("day")
        : null;
      if (!d) return false;
      if (start && d.isBefore(start.startOf("day"))) return false;
      if (end && d.isAfter(end.endOf("day"))) return false;
      return true;
    });
  }, [filteredByTab, range]);

  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<Company | null>(null);
  const [editDate, setEditDate] = useState<Dayjs | null>(null);
  const [editPerpetual, setEditPerpetual] = useState<boolean>(false);
  const [editNone, setEditNone] = useState<boolean>(false);
  const [editSerial, setEditSerial] = useState<string>("");

  const { mutateAsync: updateCompany, isLoading: saving } = useUpdate();

  const openEdit = useCallback((row: Company) => {
    setEditRow(row);
    setEditDate(row.licenseExpiry ? dayjs(row.licenseExpiry) : null);
    setEditPerpetual(row.licenseExpiryMode === "perpetual");
    setEditNone(row.licenseExpiryMode === "none");
    setEditSerial(row.activationSerial || "");
    setEditOpen(true);
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editRow) return;
    let licenseExpiry: string | null | undefined = undefined;
    let licenseExpiryMode: "date" | "perpetual" | "none" | undefined =
      undefined;

    if (editNone) {
      licenseExpiry = dayjs("2099-12-31").toISOString();
      licenseExpiryMode = "none";
    } else if (editPerpetual) {
      licenseExpiry = dayjs("2099-12-31").toISOString();
      licenseExpiryMode = "perpetual";
    } else if (editDate) {
      licenseExpiry = editDate.toISOString();
      licenseExpiryMode = "date";
    }

    const payload: Partial<Company> = {
      licenseExpiry,
      licenseExpiryMode,
      ...(editRow.activationType === "serial"
        ? { activationSerial: editSerial }
        : {}),
    };

    await updateCompany({
      resource: "companies",
      id: String(editRow.id),
      values: payload as any,
      mutationMode: "pessimistic",
    });
    setEditOpen(false);
    setEditRow(null);
    await refetch();
  }, [
    editRow,
    editDate,
    editPerpetual,
    editNone,
    editSerial,
    updateCompany,
    refetch,
  ]);

  const columns: ColumnsType<any> = [
    {
      title: "Product ID",
      dataIndex: "productId",
      width: 160,
      sorter: (a: any, b: any) =>
        String(a.productId || "").localeCompare(String(b.productId || "")),
      render: (v: any) => v ?? "—",
      onCell: () => ({ style: { whiteSpace: "nowrap" } }),
    },
    {
      title: "Company Name",
      dataIndex: "name",
      width: 220,
      ellipsis: true,
      sorter: (a: any, b: any) =>
        String(a.name || "").localeCompare(String(b.name || "")),
      render: (v: any) => v ?? "—",
    },
    {
      title: "Activation Key",
      dataIndex: "activationSerial",
      width: 360,
      render: (_: any, r: Company) =>
        r.activationType === "serial" ? (
          <Typography.Text>{r.activationSerial || "—"}</Typography.Text>
        ) : (
          <Typography.Text type="secondary">Not key-based</Typography.Text>
        ),
    },
    {
      title: "Activation Method",
      dataIndex: "activationType",
      width: 220,
      render: (_: any, r: Company) => activationTypeLabel(r.activationType),
    },
    {
      title: "Expiry Date",
      dataIndex: "_expiryEffective",
      width: 160,
      sorter: (a: any, b: any) => {
        const da = a._expiryEffective
          ? dayjs(a._expiryEffective).valueOf()
          : Infinity;
        const db = b._expiryEffective
          ? dayjs(b._expiryEffective).valueOf()
          : Infinity;
        return da - db;
      },
      render: (v: any) =>
        v ? <DateField value={v} format="YYYY-MM-DD" /> : "—",
    },
    {
      title: "Status",
      dataIndex: "_status",
      width: 140,
      sorter: (a: any, b: any) => {
        const rank = (s: string) =>
          s === "Expired" ? 0 : s === "Expiring Soon" ? 1 : 2;
        return rank(a._status) - rank(b._status);
      },
      render: (v: string) => v,
    },
    {
      title: "Actions",
      dataIndex: "actions",
      width: 80,
render: (_: any, r: Company) => (
  <Button
    size="small"
    type="default"
    icon={<EditOutlined />}
    onClick={() => openEdit(r)}
  />
),

    },
  ];

  const rowClassName = (r: any) =>
    r._status === "Expired"
      ? "license-row-expired"
      : r._status === "Expiring Soon"
        ? "license-row-soon"
        : "";

  return (
<List title="Licenses">
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      flexWrap: "wrap",
      marginBottom: 8,
    }}
  >
    <Tabs
      className="tabs-default"
      activeKey={active}
      onChange={(k) => setActive(k as TabKey)}
      items={[
        { key: "all", label: "All", children: null },
        { key: "soon", label: "Expiring Soon", children: null },
        { key: "expired", label: "Expired", children: null },
      ]}
      tabBarStyle={{ margin: 0 }}
    />

    <RangePicker
      size="small"
      value={range ?? [null, null]}
      onChange={(v) => setRange(v as any)}
      allowEmpty={[true, true]}
    />
  </div>

  <Card className="panel-card">
    <Table
      loading={isLoading}
      rowKey="id"
      dataSource={filtered}
      columns={columns}
      pagination={{ pageSize: 10, showSizeChanger: false }}
      rowClassName={rowClassName}
      scroll={{ x: 1200 }}
    />
  </Card>

      <Modal
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={saveEdit}
        confirmLoading={saving}
        title="Edit expiry and activation key"
        okText="Save"
        width={560}
      >
        <Row gutter={[16, 8]}>
          <Col xs={24} md={12}>
            <div style={{ marginBottom: 8 }}>Expiry Date</div>
            <DatePicker
              style={{ width: "100%" }}
              value={editDate}
              onChange={setEditDate}
            />
          </Col>
          <Col xs={24} md={12}>
            <div style={{ display: "flex", gap: 12, marginTop: 30 }}>
              <Checkbox
                checked={editPerpetual}
                onChange={(e) => {
                  setEditPerpetual(e.target.checked);
                  if (e.target.checked) {
                    setEditNone(false);
                    setEditDate(dayjs("2099-12-31"));
                  }
                }}
              >
                Perpetual
              </Checkbox>
              <Checkbox
                checked={editNone}
                onChange={(e) => {
                  setEditNone(e.target.checked);
                  if (e.target.checked) {
                    setEditPerpetual(false);
                    setEditDate(dayjs("2099-12-31"));
                  }
                }}
              >
                No expiry
              </Checkbox>
            </div>
          </Col>
        </Row>

        <Row gutter={[16, 8]} style={{ marginTop: 8 }}>
          <Col xs={24} md={18}>
            <Input
              placeholder="Activation key"
              value={editSerial}
              onChange={(e) => setEditSerial(e.target.value)}
              disabled={editRow?.activationType !== "serial"}
            />
          </Col>
        </Row>
      </Modal>
    </List>
  );
}
