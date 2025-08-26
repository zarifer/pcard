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
  Input,
  Upload,
  message,
  Radio,
  Row,
  Col,
  Checkbox
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { Dayjs } from "dayjs";
import { useMemo, useState, useCallback } from "react";
import { InboxOutlined } from "@ant-design/icons";

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Dragger } = Upload;

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
  activationEmail?: string;
  activationPassword?: string;
  activationFileName?: string;
};

type TabKey = "all" | "soon" | "expired";

const statusOf = (c: Company) => {
  if (!c.licenseExpiry || c.licenseExpiryMode === "perpetual" || c.licenseExpiryMode === "none") return "Hidden";
  const now = dayjs().startOf("day");
  const exp = dayjs(c.licenseExpiry).startOf("day");
  if (exp.isBefore(now)) return "Expired";
  if (exp.diff(now, "day") <= 30) return "Expiring Soon";
  return "Good";
};

const acceptLicenseFiles = ".lic,.dat,.bin";
const validateLicenseFile = (file: File) => {
  const ok = /\.(lic|dat|bin)$/i.test(file.name);
  if (!ok) {
    message.error("Invalid file. Allowed: .lic, .dat, .bin");
    return Upload.LIST_IGNORE;
  }
  return false;
};
const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

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
      items
        .map((c) => ({ ...c, _status: statusOf(c) }))
        .filter((c) => c._status !== "Hidden"),
    [items],
  );

  const [active, setActive] = useState<TabKey>("all");
  const filtered = useMemo(() => {
    if (active === "soon")
      return prepared.filter((x) => x._status === "Expiring Soon");
    if (active === "expired")
      return prepared.filter((x) => x._status === "Expired");
    return prepared;
  }, [prepared, active]);

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
  const [editPerpetual, setEditPerpetual] = useState<boolean>(false);
  const [editNone, setEditNone] = useState<boolean>(false);
  const [editType, setEditType] = useState<Company["activationType"]>("none");
  const [editSerial, setEditSerial] = useState<string>("");
  const [editEmail, setEditEmail] = useState<string>("");
  const [editPassword, setEditPassword] = useState<string>("");
  const [editFileList, setEditFileList] = useState<any[]>([]);

  const { mutateAsync: updateCompany, isLoading: saving } = useUpdate();

  const openEdit = useCallback((row: Company) => {
    setEditRow(row);
    setEditDate(row.licenseExpiry ? dayjs(row.licenseExpiry) : null);
    setEditPerpetual(row.licenseExpiryMode === "perpetual");
    setEditNone(row.licenseExpiryMode === "none");
    setEditType(row.activationType || "none");
    setEditSerial(row.activationSerial || "");
    setEditEmail(row.activationEmail || "");
    setEditPassword(row.activationPassword || "");
    setEditFileList(
      row.activationFileName
        ? [{ uid: "1", name: row.activationFileName, url: "file://local" }]
        : [],
    );
    setEditOpen(true);
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editRow) return;
    let licenseExpiry: string | null | undefined = undefined;
    let licenseExpiryMode: "date" | "perpetual" | "none" | undefined =
      undefined;
    if (editNone) {
      licenseExpiry = null;
      licenseExpiryMode = "none";
    } else if (editPerpetual) {
      licenseExpiry = dayjs("2099-12-31").toISOString();
      licenseExpiryMode = "perpetual";
    } else if (editDate) {
      licenseExpiry = editDate.toISOString();
      licenseExpiryMode = "date";
    }

    let activationFile;
    if (editType === "license_file" && editFileList?.[0]?.originFileObj) {
      activationFile = await fileToBase64(editFileList[0].originFileObj);
    }

    const payload: Partial<Company> = {
      licenseExpiry,
      licenseExpiryMode,
      activationType: editType,
      activationSerial: editType === "serial" ? editSerial : undefined,
      activationEmail:
        editType === "vendor_account" || editType === "email_based"
          ? editEmail
          : undefined,
      activationPassword:
        editType === "vendor_account" ? editPassword : undefined,
      activationFileName:
        editType === "license_file"
          ? editFileList?.[0]?.name || editRow.activationFileName
          : undefined,
      ...(activationFile && editType === "license_file"
        ? { activationFile }
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
    editType,
    editSerial,
    editEmail,
    editPassword,
    editFileList,
    updateCompany,
    refetch,
  ]);

  const renderActivationInfo = (r: Company) => {
    if (r.activationType === "serial") {
      return r.activationSerial || "Serial Key";
    }
    if (r.activationType === "license_file") {
      return r.activationFileName || "License File";
    }
    if (r.activationType === "vendor_account") {
      return "Vendor Account Activation";
    }
    if (r.activationType === "email_based") {
      return "E-mail Based Activation";
    }
    if (r.activationType === "oem") return "OEM";
    if (r.activationType === "floating") return "Floating";
    if (r.activationType === "trial") return "Trial";
    return "No Activation";
  };

  const [sorter, setSorter] = useState<"ascend" | "descend" | null>(null);
  const columns: ColumnsType<any> = [
    {
      title: "Product ID",
      dataIndex: "productId",
      sorter: true,
      sortOrder: sorter ?? undefined,
      onHeaderCell: () => ({
        onClick: () =>
          setSorter((s) =>
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
      sortOrder: sorter ?? undefined,
      onHeaderCell: () => ({
        onClick: () =>
          setSorter((s) =>
            s === "ascend" ? "descend" : s === "descend" ? null : "ascend",
          ),
        style: { cursor: "pointer" },
      }),
      render: (v: any) => v ?? "—",
    },
    {
      title: "Activation",
      dataIndex: "activationType",
      render: (_: any, r: Company) => renderActivationInfo(r),
      width: 220,
    },
    {
      title: "Expiry Date",
      dataIndex: "licenseExpiry",
      sorter: true,
      sortOrder: sorter ?? undefined,
      onHeaderCell: () => ({
        onClick: () =>
          setSorter((s) =>
            s === "ascend" ? "descend" : s === "descend" ? null : "ascend",
          ),
        style: { cursor: "pointer" },
      }),
      render: (v: any, r: Company) =>
        r.licenseExpiryMode === "perpetual"
          ? "Perpetual"
          : r.licenseExpiryMode === "none"
            ? "No expiry"
            : v
              ? <DateField value={v} format="YYYY-MM-DD" />
              : "—",
      width: 160,
    },
    {
      title: "Status",
      dataIndex: "_status",
      sorter: true,
      sortOrder: sorter ?? undefined,
      onHeaderCell: () => ({
        onClick: () =>
          setSorter((s) =>
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
        />
      </Card>

      <Modal
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={saveEdit}
        confirmLoading={saving}
        title="Edit license and activation"
        okText="Save"
        width={720}
      >
        <Row gutter={[16, 8]}>
          <Col xs={24}>
            <div style={{ marginBottom: 8 }}>Activation Type</div>
            <Radio.Group
              value={editType}
              onChange={(e) => setEditType(e.target.value)}
              buttonStyle="solid"
            >
              <Radio value="oem">OEM</Radio>
              <Radio value="floating">Floating</Radio>
              <Radio value="trial">Trial</Radio>
              <Radio value="none">No Activation</Radio>
              <Radio value="serial">Serial Key</Radio>
              <Radio value="license_file">License File</Radio>
              <Radio value="vendor_account">Vendor Account</Radio>
              <Radio value="email_based">E-mail Based</Radio>
            </Radio.Group>
          </Col>
        </Row>

        {(editType === "serial" ||
          editType === "license_file" ||
          editType === "vendor_account" ||
          editType === "email_based") && (
          <>
            <Row gutter={[16, 8]} style={{ marginTop: 8 }}>
              <Col xs={24} md={12}>
                <DatePicker
                  style={{ width: "100%" }}
                  value={editDate}
                  onChange={(d) => setEditDate(d)}
                />
              </Col>
              <Col xs={24} md={12}>
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    height: "100%",
                  }}
                >
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
                    Perpetual license
                  </Checkbox>
                  <Checkbox
                    checked={editNone}
                    onChange={(e) => {
                      setEditNone(e.target.checked);
                      if (e.target.checked) {
                        setEditPerpetual(false);
                        setEditDate(null);
                      }
                    }}
                  >
                    No expiry
                  </Checkbox>
                </div>
              </Col>
            </Row>

            {editType === "serial" && (
              <Row gutter={[16, 8]} style={{ marginTop: 8 }}>
                <Col xs={24} md={12}>
                  <Input
                    placeholder="Serial key"
                    value={editSerial}
                    onChange={(e) => setEditSerial(e.target.value)}
                  />
                </Col>
              </Row>
            )}

            {editType === "license_file" && (
              <Row gutter={[16, 8]} style={{ marginTop: 8 }}>
                <Col xs={24} md={16}>
                  <Dragger
                    accept={acceptLicenseFiles}
                    maxCount={1}
                    beforeUpload={validateLicenseFile}
                    fileList={editFileList as any}
                    onChange={({ fileList }) => setEditFileList(fileList as any)}
                  >
                    <p className="ant-upload-drag-icon">
                      <InboxOutlined />
                    </p>
                    <p className="ant-upload-text">
                      Click or drag .lic/.dat/.bin
                    </p>
                  </Dragger>
                </Col>
              </Row>
            )}

            {editType === "vendor_account" && (
              <Row gutter={[16, 8]} style={{ marginTop: 8 }}>
                <Col xs={24} md={12}>
                  <Input
                    placeholder="Vendor account e-mail"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                  />
                </Col>
                <Col xs={24} md={12}>
                  <Input.Password
                    placeholder="Vendor account password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                  />
                </Col>
              </Row>
            )}

            {editType === "email_based" && (
              <Row gutter={[16, 8]} style={{ marginTop: 8 }}>
                <Col xs={24} md={12}>
                  <Input
                    placeholder="Activation e-mail"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                  />
                </Col>
              </Row>
            )}
          </>
        )}
      </Modal>
    </List>
  );
}
