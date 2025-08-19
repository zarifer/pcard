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
  Tag,
  Carousel,
  Image,
} from "antd";
import {
  ClockCircleOutlined,
  PictureOutlined,
  LeftOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { useEffect, useMemo, useState, useRef, useContext } from "react";
import { useParams } from "react-router-dom";
import "./index.css";
import type { CarouselRef } from "antd/es/carousel";
import { AnalogClock } from "./analogclock";
import { ColorModeContext } from "../../contexts/color-mode";

export default function CompanyShow() {
  /* GET ROUTE PARAM SAFELY */
  const params = useParams<Record<string, string | undefined>>();
  const companyId = params?.id;

  /* FETCH COMPANY */
  const { queryResult } = useShow({ resource: "companies" });
  const { data, isLoading, isError, error } = queryResult;
  const company: any = data?.data;

  const { show, push } = useNavigation();

  /* GET THEME MODE FOR ANALOG CLOCK */
  const { mode } = useContext(ColorModeContext);

  /* REF FOR CAROUSEL NAVIGATION */
  const carouselRef = useRef<CarouselRef>(null);

  /* LIVE CLOCK FOR COMPANY TIMEZONE */
  const tz = company?.timeZone || "Europe/London";
  const [now, setNow] = useState<Date>(new Date());
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

  /* NORMALIZE CONTACT EMAILS (MAX 2) */
  const emails: string[] = Array.isArray(company?.emails)
    ? company.emails.slice(0, 2)
    : company?.email
      ? [company.email]
      : [];

  /* COMMON FILTERS – TYPED CrudFilters */
  const commonFilters: CrudFilters = [
    { field: "companyId", operator: "eq", value: companyId },
    { field: "company.id", operator: "eq", value: companyId },
  ];

  /* INCIDENT TABLES */
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

  /* ALL INCIDENTS TABLE */
  const allTbl = useTable({
    resource: "incident_logs",
    syncWithLocation: false,
    pagination: { pageSize: 5 },
    filters: { permanent: [...commonFilters] },
    queryOptions: { enabled: !!companyId },
  });

  /* COLLECT CATEGORY IDS TO RESOLVE TITLES */
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

  /* INCIDENT COLUMNS */
  const COL_W = {
    id: 80,
    title: 140,
    category: 300,
    created: 180,
    actions: 140,
  };

  const columns = [
    { title: "ID", dataIndex: "id", width: COL_W.id },
    { title: "Title", dataIndex: "title", width: COL_W.title, ellipsis: true },
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
      title: "Created at",
      dataIndex: "createdAt",
      width: COL_W.created,
      render: (v: any) =>
        v ? <DateField value={v} format="YYYY-MM-DD HH:mm" /> : "—",
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

  const images: string[] = (company?.installSteps || [])
    .map((s: any) => s?.imageUrl)
    .filter(Boolean);

  const appearance: "Terminal" | "GUI" | "Other" = company?.interfaceType
    ? company.interfaceType === "gui"
      ? "GUI"
      : company.interfaceType === "terminal"
        ? "Terminal"
        : "Other"
    : company?.hasGui || company?.gui
      ? "GUI"
      : "Terminal";

  const isOverdue = useMemo(() => {
    if (!company?.licenseExpiry) return false;
    const exp = new Date(company.licenseExpiry);
    exp.setHours(23, 59, 59, 999);
    return exp.getTime() < Date.now();
  }, [company?.licenseExpiry]);

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
              <div className="product-meta">
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
                  <strong>Version check:</strong>{" "}
                  {company.versionCheckPath || "—"}
                </div>
                <div>
                  <strong>License expiry:</strong>{" "}
                  {company.licenseExpiry ? (
                    <>
                      <DateField value={company.licenseExpiry} />
                      {isOverdue && (
                        <span className="status-badge status-badge--overdue">
                          Overdue
                        </span>
                      )}
                    </>
                  ) : (
                    "—"
                  )}
                </div>
              </div>
            }
          />
        </Card>

        <Row gutter={[16, 16]} className="notes-grid">
          <Col xs={24} md={12} lg={8}>
            <Card
              className="note-card small tilt-left"
              title="Primary Info"
              bordered={false}
            >
              <div className="kv">
                <span>Vendor name:</span>
                <span>{company.name || "—"}</span>
              </div>
              <div className="kv">
                <span>Product:</span>
                <span>{company.product || "—"}</span>
              </div>
              <div className="kv">
                <span>Version check path:</span>
                <span>{company.versionCheckPath || "—"}</span>
              </div>
              <div className="kv">
                <span>License expiry:</span>
                <span>
                  {company.licenseExpiry ? (
                    <>
                      <DateField
                        value={company.licenseExpiry}
                        format="YYYY-MM-DD"
                      />
                      {isOverdue && (
                        <span className="status-badge status-badge--overdue">
                          Overdue
                        </span>
                      )}
                    </>
                  ) : (
                    "—"
                  )}
                </span>
              </div>
              <div className="kv">
                <span>Log path:</span>
                <span>{company.log || "—"}</span>
              </div>
              <div className="kv">
                <span>GUI:</span>
                <span>
                  {company.gui || (appearance === "GUI" ? "GUI" : "—")}
                </span>
              </div>
            </Card>
          </Col>

          {/* INTERFACE + CLOCK */}
          <Col xs={24} md={12} lg={8}>
            <Card
              className="note-card small tilt-right"
              title="Interface / Timezone"
              bordered={false}
              extra={<Tag color="purple">{appearance}</Tag>}
            >
              <div className="kv">
                <span>Timezone:</span>
                <span>{tz}</span>
              </div>
              <div className="kv clock-line">
                <ClockCircleOutlined />{" "}
                <span className="tz-clock">{timeInTZ}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginTop: 8,
                }}
              >
                <AnalogClock tz={tz} size={90} mode={mode as any} />
              </div>
              <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
                Time is shown using the company&apos;s timezone.
              </Typography.Paragraph>
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card
              className="note-card gallery-card"
              title="Installer & Notes"
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
                  <Carousel dots className="image-carousel" ref={carouselRef}>
                    {images.map((src, i) => (
                      <div key={i} className="carousel-item">
                        <Image src={src} alt={`installer_${i + 1}`} />
                      </div>
                    ))}
                  </Carousel>
                </div>
              ) : (
                <div className="no-images">
                  <PictureOutlined /> No installer images
                </div>
              )}
              <div className="notes-block">
                <MarkdownField
                  value={company.features || "_No notes provided._"}
                />
              </div>
            </Card>
          </Col>
        </Row>

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
                  `/incident-logs/create?companyId=${encodeURIComponent(company.id)}`,
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
      </div>
    </Show>
  );
}
