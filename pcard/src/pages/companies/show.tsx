import {
  useShow,
  useNavigation,
  useMany,
  type CrudFilters,
} from "@refinedev/core";
import {
  Show,
  EditButton,
  DeleteButton,
  useTable,
  DateField,
  MarkdownField,
  CreateButton,
} from "@refinedev/antd";
import {
  Card,
  Typography,
  Avatar,
  Tabs,
  Table,
  Button,
  Space,
  Skeleton,
  Result,
  Row,
  Col,
  Carousel,
  Image,
} from "antd";
import {
  PictureOutlined,
  LeftOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { useEffect, useMemo, useState, useRef, useContext } from "react";
import { useParams, useLocation } from "react-router-dom";
import "./index.css";
import type { CarouselRef } from "antd/es/carousel";
import { AnalogClock } from "./analogclock";
import { ColorModeContext } from "../../contexts/color-mode";

export default function CompanyShow() {
  const params = useParams<Record<string, string | undefined>>();
  const companyId = params?.id;

  const { queryResult } = useShow({ resource: "companies" });
  const { data, isLoading, isError, error } = queryResult;
  const company: any = data?.data;

  const { show, push } = useNavigation();
  const { mode } = useContext(ColorModeContext);
  const carouselRef = useRef<CarouselRef>(null);

  const tz = company?.timeZone || "Europe/London";
  const [now, setNow] = useState<Date>(new Date());

  const location = useLocation();
  const initialTab =
    new URLSearchParams(location.search).get("tab") || "overview";

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const timeInTZ = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(undefined, {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(now);
    } catch {
      return "";
    }
  }, [now, tz]);

  const emails: string[] = Array.isArray(company?.emails)
    ? company.emails.slice(0, 2)
    : company?.email
      ? [company.email]
      : [];

  const appearanceLabel = useMemo(() => {
    const t = company?.interfaceType;
    if (t === "gui") return "GUI Client";
    if (t === "cli") return "CLI-Only";
    if (t === "web") return "Headless";
    if (t === "other") return company?.gui || "Other";
    if (company?.hasGui || company?.gui) return "GUI Client";
    return "CLI-Only";
  }, [company?.interfaceType, company?.hasGui, company?.gui]);

  const isOverdue = useMemo(() => {
    if (!company?.licenseExpiry) return false;
    const exp = new Date(company.licenseExpiry);
    exp.setHours(23, 59, 59, 999);
    return exp.getTime() < Date.now();
  }, [company?.licenseExpiry]);

  const images: string[] = (company?.installSteps || [])
    .map((s: any) => s?.imageUrl)
    .filter(Boolean);

  const customScanTypeLabel = (v?: string) =>
    v === "context_menu"
      ? "Right-Click Context Menu"
      : v === "gui_custom_scan"
        ? "GUI → Custom Scan"
        : v === "unique"
          ? "Unique path"
          : "—";

  const activationTypeLabel = (v?: string) =>
    v === "oem"
      ? "OEM"
      : v === "floating"
        ? "Floating (License Server)"
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

  const commonFilters: CrudFilters = [
    { field: "companyId", operator: "eq", value: companyId },
    { field: "company.id", operator: "eq", value: companyId },
  ];

  const draftTbl = useTable({
    resource: "incident_logs",
    syncWithLocation: false,
    pagination: { pageSize: 5 },
    filters: {
      permanent: [
        ...commonFilters,
        { field: "status", operator: "eq", value: "draft" },
      ],
    },
    queryOptions: { enabled: !!companyId },
  });
  const openTbl = useTable({
    resource: "incident_logs",
    syncWithLocation: false,
    pagination: { pageSize: 5 },
    filters: {
      permanent: [
        ...commonFilters,
        { field: "status", operator: "eq", value: "open" },
      ],
    },
    queryOptions: { enabled: !!companyId },
  });
  const closedTbl = useTable({
    resource: "incident_logs",
    syncWithLocation: false,
    pagination: { pageSize: 5 },
    filters: {
      permanent: [
        ...commonFilters,
        { field: "status", operator: "eq", value: "closed" },
      ],
    },
    queryOptions: { enabled: !!companyId },
  });
  const allTbl = useTable({
    resource: "incident_logs",
    syncWithLocation: false,
    pagination: { pageSize: 5 },
    filters: { permanent: [...commonFilters] },
    queryOptions: { enabled: !!companyId },
  });

  const categoryIds = useMemo(() => {
    const set = new Set<string>();
    for (const arr of [
      draftTbl.tableProps.dataSource,
      openTbl.tableProps.dataSource,
      closedTbl.tableProps.dataSource,
      allTbl.tableProps.dataSource,
    ] as ReadonlyArray<readonly any[] | undefined>) {
      for (const r of arr ?? []) {
        const id = r?.category?.id;
        if (id) set.add(id);
      }
    }
    return Array.from(set);
  }, [
    draftTbl.tableProps.dataSource,
    openTbl.tableProps.dataSource,
    closedTbl.tableProps.dataSource,
    allTbl.tableProps.dataSource,
  ]);

  const { data: categoriesResolved } = useMany({
    resource: "categories",
    ids: categoryIds,
    queryOptions: { enabled: categoryIds.length > 0 },
  });

  const categoryTitle = (id?: string) =>
    categoriesResolved?.data?.find((c: any) => c.id === id)?.title || "—";

  const COL_W = {
    category: 300,
    created: 140,
    actions: 140,
  };
  const columns = [
    {
      title: "Product ID",
      dataIndex: "productId",
      width: 140,
      render: (_: any, rec: any) => company?.productId || "—",
      onCell: () => ({ style: { whiteSpace: "nowrap" } }),
    },
    {
      title: "Company",
      dataIndex: ["company", "id"],
      width: 220,
      render: (_: any, rec: any) => company?.name || "—",
      onCell: () => ({ style: { whiteSpace: "nowrap" } }),
    },
    {
      title: "Detail",
      dataIndex: "detail",
      render: (v: any) =>
        v ? String(v).slice(0, 60) + (String(v).length > 60 ? "…" : "") : "—",
    },
    {
      title: "Incident type",
      dataIndex: ["category", "id"],
      width: COL_W.category,
      render: (_: any, rec: any) =>
        categoryTitle(rec?.category?.id) || rec?.category?.title || "—",
      onCell: () => ({ style: { whiteSpace: "nowrap" } }),
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      width: COL_W.created,
      render: (v: any, r: any) => {
        const val = v ?? r?.CreatedAt ?? r?.createdAt;
        return val ? <DateField value={val} format="DD/MM/YYYY" /> : "—";
      },
    },
    {
      title: "Actions",
      dataIndex: "actions",
      width: COL_W.actions,
      render: (_: any, r: any) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Space size="small">
            <EditButton
              hideText
              size="small"
              resource="incident_logs"
              recordItemId={r.id}
            />
            <DeleteButton
              hideText
              size="small"
              resource="incident_logs"
              recordItemId={r.id}
            />
          </Space>
        </span>
      ),
    },
  ];

  if (isError) {
    return (
      <Result
        status="error"
        title="Failed to load company"
        subTitle={(error as any)?.message}
      />
    );
  }
  if (isLoading) {
    return (
      <Show title="Loading..." headerButtons={() => null}>
        <Skeleton active paragraph={{ rows: 6 }} />
      </Show>
    );
  }
  if (!company || !companyId)
    return <Result status="404" title="Company not found" />;

  return (
    <Show
      title={company.name}
      headerButtons={() => (
        <>
          <EditButton resource="companies" recordItemId={company.id} />
          <DeleteButton
            resource="companies"
            recordItemId={company.id}
            onSuccess={() => push("/companies")}
          />
        </>
      )}
    >
      <Tabs
        defaultActiveKey={initialTab}
        items={[
          {
            key: "overview",
            label: "Overview",
            children: (
              <div className="corkboard">
                <Card className="note-card small product-card" bordered={false}>
                  <Card.Meta
                    avatar={
                      <Avatar src={company.logo} size={64}>
                        {(company.name || "?").charAt(0)}
                      </Avatar>
                    }
                    title={
                      <Typography.Title level={4} style={{ margin: 0 }}>
                        {company.product}
                      </Typography.Title>
                    }
                    description={
                      <div className="product-summary">
                        <div className="product-meta">
                          <div>
                            <strong>Product ID:</strong>{" "}
                            {company.productId || "—"}
                          </div>
                          <div>
                            <strong>Vendor:</strong> {company.name || "—"}
                          </div>
                          <div>
                            <strong>Contacts:</strong>{" "}
                            {emails.length
                              ? emails.map((e, idx) => (
                                  <a
                                    key={`${e}-${idx}`}
                                    href={`mailto:${encodeURIComponent(e)}`}
                                    className="email-link"
                                  >
                                    {e}
                                  </a>
                                ))
                              : "—"}
                          </div>
                          <div>
                            <strong>Interface:</strong> {appearanceLabel}
                          </div>
                          <div>
                            <strong>Activation:</strong>{" "}
                            {activationTypeLabel(company?.activationType)}
                          </div>
                          {company?.activationType === "serial" && (
                            <div>
                              <strong>Serial key:</strong>{" "}
                              {company.activationSerial || "—"}
                            </div>
                          )}
                          {company?.activationType === "license_file" && (
                            <div>
                              <strong>License file:</strong>{" "}
                              {company.activationFileName || "Attached"}
                            </div>
                          )}
                          {company?.activationType === "vendor_account" && (
                            <>
                              <div>
                                <strong>Vendor e-mail:</strong>{" "}
                                {company.activationEmail || "—"}
                              </div>
                              <div>
                                <strong>Password:</strong>{" "}
                                {company.activationPassword
                                  ? "••••••••"
                                  : "—"}
                              </div>
                            </>
                          )}
                          {company?.activationType === "email_based" && (
                            <div>
                              <strong>Activation e-mail:</strong>{" "}
                              {company.activationEmail || "—"}
                            </div>
                          )}
                          <div>
                            <strong>License expiry:</strong>{" "}
                            {company.licenseExpiryMode === "perpetual"
                              ? "Perpetual"
                              : company.licenseExpiryMode === "none"
                                ? "No expiry"
                                : company.licenseExpiry
                                  ? (
                                      <>
                                        <DateField
                                          value={company.licenseExpiry}
                                        />
                                        {isOverdue && (
                                          <span className="status-badge status-badge--overdue">
                                            Overdue
                                          </span>
                                        )}
                                      </>
                                    )
                                  : "—"}
                          </div>
                        </div>

                        <div className="product-summary__tz">
                          <div className="kv clock-line">
                            <span></span>
                            <span className="tz-clock">{timeInTZ}</span>
                          </div>
                          <div className="kv">
                            <span></span>
                            <span>{tz}</span>
                          </div>
                        </div>
                        <div className="product-summary__clock">
                          <AnalogClock tz={tz} size={86} mode={mode as any} />
                        </div>
                      </div>
                    }
                  />
                </Card>

                <Row gutter={[16, 16]} className="notes-grid">
                  <Col xs={24} lg={8}>
                    <Card
                      className="note-card gallery-card"
                      title="Installation"
                      bordered={false}
                    >
                      {images.length ? (
                        <div style={{ position: "relative" }}>
                          <Button
                            shape="circle"
                            style={{
                              position: "absolute",
                              left: 8,
                              top: "50%",
                              transform: "translateY(-50%)",
                              zIndex: 3,
                            }}
                            icon={<LeftOutlined />}
                            onClick={() => carouselRef.current?.prev()}
                            aria-label="Previous image"
                          />
                          <Button
                            shape="circle"
                            style={{
                              position: "absolute",
                              right: 8,
                              top: "50%",
                              transform: "translateY(-50%)",
                              zIndex: 3,
                            }}
                            icon={<RightOutlined />}
                            onClick={() => carouselRef.current?.next()}
                            aria-label="Next image"
                          />
                          <Carousel
                            dots
                            className="image-carousel"
                            ref={carouselRef}
                          >
                            {images.map((src, i) => (
                              <div key={i} className="carousel-item">
                                <Image src={src} alt={`installer_${i + 1}`} />
                              </div>
                            ))}
                          </Carousel>
                        </div>
                      ) : (
                        <div className="no-images">
                          <PictureOutlined /> No Installation Images Available
                        </div>
                      )}
                      <div className="kv" style={{ marginTop: 12 }}>
                        <span>Disable Windows Defender:</span>
                        <span>
                          {company.wdManuallyOff === true
                            ? "Yes"
                            : company.wdManuallyOff === false
                              ? "No"
                              : "—"}
                        </span>
                      </div>
                      <div className="kv">
                        <span>Disable Process Creation Trigger:</span>
                        <span>
                          {company.pctManuallyOff === true
                            ? "Yes"
                            : company.pctManuallyOff === false
                              ? "No"
                              : "—"}
                        </span>
                      </div>
                      <div className="notes-block">
                        <span>Installation Notes:</span>
                        <MarkdownField
                          value={
                            (company.installProcedure &&
                              String(company.installProcedure).trim()) ||
                            "_No notes provided._"
                          }
                        />
                      </div>
                    </Card>
                  </Col>

                  <Col xs={24} md={12} lg={8}>
                    <Card
                      className="note-card small tilt-right"
                      title="Updates"
                      bordered={false}
                    >
                      <div className="kv">
                        <span>Current version check:</span>
                        <span>{company.versionCheckPath || "—"}</span>
                      </div>
                      <div className="notes-block">
                        <span>Update Notes:</span>
                        <MarkdownField
                          value={
                            company.updateProcedure || "_No update notes._"
                          }
                        />
                      </div>
                    </Card>
                  </Col>

                  <Col xs={24} md={12} lg={8}>
                    <Card
                      className="note-card small tilt-left"
                      title="RT & OD"
                      bordered={false}
                    >
                      <div className="kv">
                        <span>Has RT:</span>
                        <span>{company.hasRT ? "Yes" : "No"}</span>
                      </div>
                      <div className="kv">
                        <span>Has OD:</span>
                        <span>{company.hasOD ? "Yes" : "No"}</span>
                      </div>
                      {company?.hasOD && (
                        <>
                          <div className="kv">
                            <span>Custom scan:</span>
                            <span>
                              {customScanTypeLabel(company?.customScan?.type)}
                            </span>
                          </div>
                          {company?.customScan?.type === "unique" && (
                            <div className="kv">
                              <span>Unique path:</span>
                              <span>{company?.customScan?.path || "—"}</span>
                            </div>
                          )}
                        </>
                      )}
                      <div className="kv">
                        <span>Log path:</span>
                        <span>{company.log || "—"}</span>
                      </div>
                    </Card>
                  </Col>
                </Row>
              </div>
            ),
          },
          {
            key: "incidents",
            label: "Incidents",
            children: (
              <div className="company-incidents">
                <div
                  className="panel-header"
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <Typography.Title
                    level={5}
                    className="panel-title"
                    style={{ margin: 0 }}
                  >
                    Incident Logs
                  </Typography.Title>
                  <CreateButton
                    resource="incident_logs"
                    size="small"
                    onClick={(e) => {
                      e.preventDefault();
                      push(
                        `/incident-logs/create?companyId=${encodeURIComponent(
                          company.id,
                        )}&productId=${encodeURIComponent(company.productId || "")}`,
                      );
                    }}
                  >
                    Add Incident
                  </CreateButton>
                </div>

                <Tabs
                  items={[
                    {
                      key: "all",
                      label: "All",
                      children: (
                        <Table
                          {...allTbl.tableProps}
                          rowKey="id"
                          size="small"
                          tableLayout="fixed"
                          columns={columns as any}
                          onRow={(r: any) => ({
                            onClick: () => show("incident_logs", r.id),
                          })}
                        />
                      ),
                    },
                    {
                      key: "open",
                      label: "Open",
                      children: (
                        <Table
                          {...openTbl.tableProps}
                          rowKey="id"
                          size="small"
                          tableLayout="fixed"
                          columns={columns as any}
                          onRow={(r: any) => ({
                            onClick: () => show("incident_logs", r.id),
                          })}
                        />
                      ),
                    },
                    {
                      key: "closed",
                      label: "Closed",
                      children: (
                        <Table
                          {...closedTbl.tableProps}
                          rowKey="id"
                          size="small"
                          tableLayout="fixed"
                          columns={columns as any}
                          onRow={(r: any) => ({
                            onClick: () => show("incident_logs", r.id),
                          })}
                        />
                      ),
                    },
                    {
                      key: "draft",
                      label: "Draft",
                      children: (
                        <Table
                          {...draftTbl.tableProps}
                          rowKey="id"
                          size="small"
                          tableLayout="fixed"
                          columns={columns as any}
                          onRow={(r: any) => ({
                            onClick: () => show("incident_logs", r.id),
                          })}
                        />
                      ),
                    },
                  ]}
                />
              </div>
            ),
          },
        ]}
      />
    </Show>
  );
}
