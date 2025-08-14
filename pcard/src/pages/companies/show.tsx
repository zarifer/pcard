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
} from "antd";
import { useMemo } from "react";
import { useParams } from "react-router-dom";
import "./index.css";

/* ALL COMMENTS IN ENGLISH AND CAPS */

export default function CompanyShow() {
  /* GET ROUTE PARAM SAFELY */
  const params = useParams<Record<string, string | undefined>>();
  const companyId = params?.id;

  /* FETCH COMPANY; STATE COMES FROM queryResult */
  const { queryResult } = useShow({ resource: "companies" });
  const { data, isLoading, isError, error } = queryResult;
  const company: any = data?.data;

  const { show, push } = useNavigation();

  /* NORMALIZE CONTACT EMAILS (MAX 2) */
  const emails: string[] = Array.isArray(company?.emails)
    ? company.emails.slice(0, 2)
    : company?.email
      ? [company.email]
      : [];

  /* COMMON FILTERS – USE TYPED CrudFilters TO AVOID STRING OPERATOR ERRORS */
  const commonFilters: CrudFilters = [
    { field: "companyId", operator: "eq", value: companyId },
    { field: "company.id", operator: "eq", value: companyId },
  ];

  /* THREE INCIDENT TABLES – FILTERED TO THIS COMPANY ONLY */
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

  /* COLLECT CATEGORY IDS FROM ALL THREE TABLES (READONLY-SAFE) */
  const categoryIds = useMemo(() => {
    const set = new Set<string>();
    for (const arr of [
      draftTbl.tableProps.dataSource,
      openTbl.tableProps.dataSource,
      closedTbl.tableProps.dataSource,
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
  ]);

  /* RESOLVE CATEGORY TITLES */
  const { data: categoriesResolved } = useMany({
    resource: "categories",
    ids: categoryIds,
    queryOptions: { enabled: categoryIds.length > 0 },
  });

  const categoryTitle = (id?: string) =>
    categoriesResolved?.data?.find((c: any) => c.id === id)?.title || "—";

  /* INCIDENT COLUMNS – MATCH INCIDENT LIST (WITHOUT COMPANY COLUMN) */
  /* COMPANY PAGE INCIDENT COLUMNS (MATCH INCIDENT LIST, PLUS ACTIONS) */
  const columns = [
    { title: "ID", dataIndex: "id", width: 80 },
    { title: "Title", dataIndex: "title", ellipsis: true },
    {
      title: "Detail",
      dataIndex: "detail",
      render: (v: any) =>
        v ? <MarkdownField value={String(v).slice(0, 120) + "..."} /> : "-",
    },
    {
      title: "Incident type",
      dataIndex: ["category", "id"],
      width: 160,
      render: (id: string) => categoryTitle(id),
    },
    { title: "Status", dataIndex: "status", width: 110 },
    {
      title: "Created at",
      dataIndex: "createdAt",
      width: 180,
      render: (_: any, r: any) => (
        <DateField value={r?.createdAt ?? r?.CreatedAt} />
      ),
    },
    {
      title: "Actions",
      dataIndex: "actions",
      width: 120,
      render: (_: any, r: any) => (
        /* PREVENT ROW CLICK WHEN CLICKING ACTION BUTTONS */
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

  /* ERROR / LOADING / 404 STATES */
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
          <DeleteButton resource="companies" recordItemId={company.id} />
        </>
      )}
    >
      <Card>
        <Card.Meta
          avatar={
            <Avatar src={company.logo} size={64}>
              {(company.name || "?").charAt(0)}
            </Avatar>
          }
          title={<Typography.Title level={4}>{company.name}</Typography.Title>}
          description={
            <>
              <Typography.Paragraph strong>Vendor:</Typography.Paragraph>
              <Typography.Text>{company.vendor || "—"}</Typography.Text>
              <br />
              <Typography.Paragraph strong>Product name:</Typography.Paragraph>
              <Typography.Text>{company.product || "—"}</Typography.Text>
              <br />
              <Typography.Paragraph strong>Contacts:</Typography.Paragraph>
              {emails.length ? (
                <>
                  {emails.map((e, idx) => (
                    <div key={`${e}-${idx}`}>
                      {/* SECURITY: ENCODE EMAIL AND USE MAILTO ONLY */}
                      <a href={`mailto:${encodeURIComponent(e)}`}>{e}</a>
                    </div>
                  ))}
                </>
              ) : (
                <Typography.Text>—</Typography.Text>
              )}
              <br />
              <Typography.Paragraph strong>GUI:</Typography.Paragraph>
              <Typography.Text>{company.gui || "—"}</Typography.Text>
              <br />
              <Typography.Paragraph strong>Log path:</Typography.Paragraph>
              <Typography.Text>{company.log || "—"}</Typography.Text>
              <br />
              <Typography.Paragraph strong>Spec features:</Typography.Paragraph>
              <Typography.Text>{company.features || "—"}</Typography.Text>
            </>
          }
        />
      </Card>

      {/* INCIDENT LOGS – FILTERED TO THIS COMPANY ONLY */}
      <div className="company-incidents">
        <div className="panel-header">
          <Typography.Title level={5} className="panel-title">
            Incident logs
          </Typography.Title>
          <Space className="panel-actions">
            <Button
              type="primary"
              size="small"
              onClick={() =>
                push(
                  `/incident-logs/create?companyId=${encodeURIComponent(company.id)}`,
                )
              }
            >
              New incident
            </Button>
          </Space>
        </div>

        <Tabs
          items={[
            {
              key: "open",
              label: "Open",
              children: (
                <Table
                  {...openTbl.tableProps}
                  rowKey="id"
                  size="small"
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
    </Show>
  );
}
