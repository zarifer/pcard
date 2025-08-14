import { useShow, useNavigation } from "@refinedev/core";
import { Show, EditButton, DeleteButton, useTable } from "@refinedev/antd";
import {
  Card,
  Typography,
  Avatar,
  Tabs,
  Table,
  Tag,
  Button,
  Space,
  Skeleton,
  Result,
} from "antd";
import { useParams } from "react-router-dom";
import "./index.css";

/* ALL COMMENTS IN ENGLISH AND CAPS */

export default function CompanyShow() {
  /* ALWAYS GET PARAMS FIRST */
  const params = useParams<Record<string, string | undefined>>();
  const companyIdRaw = params?.id;
  const companyId =
    companyIdRaw && /^\d+$/.test(companyIdRaw) ? Number(companyIdRaw) : companyIdRaw;

  /* FETCH COMPANY RECORD (RUNS EVERY RENDER) */
  const { queryResult, isLoading, error } = useShow({ resource: "companies" });
  const company: any = queryResult?.data?.data;

  /* NAV HELPERS */
  const { show, push } = useNavigation();

  /* PREPARE EMAILS (SAFE) */
  const emails: string[] = Array.isArray(company?.emails)
    ? company.emails.slice(0, 2)
    : company?.email
    ? [company.email]
    : [];

  /* USE THREE TABLE HOOKS UNCONDITIONALLY (STABLE HOOK ORDER) */
  const draftTbl = useTable({
    resource: "incident_logs", /* MUST MATCH APP RESOURCE NAME */
    syncWithLocation: false,
    pagination: { pageSize: 5 },
    filters: {
      permanent: [
        { field: "companyId", operator: "eq", value: companyId },
        { field: "status", operator: "eq", value: "draft" },
      ],
    },
    queryOptions: { enabled: !!companyId }, /* DO NOT FIRE UNTIL WE HAVE ID */
  });

  const openTbl = useTable({
    resource: "incident_logs",
    syncWithLocation: false,
    pagination: { pageSize: 5 },
    filters: {
      permanent: [
        { field: "companyId", operator: "eq", value: companyId },
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
        { field: "companyId", operator: "eq", value: companyId },
        { field: "status", operator: "eq", value: "closed" },
      ],
    },
    queryOptions: { enabled: !!companyId },
  });

  /* COMPACT COLUMNS FOR INCIDENT PREVIEW */
  const columns = [
    { title: "ID", dataIndex: "id", width: 80 },
    { title: "Title", dataIndex: "title", ellipsis: true },
    {
      title: "Severity",
      dataIndex: "severity",
      width: 110,
      render: (v: string) => (v ? <Tag>{v}</Tag> : "—"),
    },
    {
      title: "Updated",
      dataIndex: "updatedAt",
      width: 160,
      render: (v: string) => (v ? new Date(v).toLocaleString() : "—"),
    },
  ];

  /* RENDER AFTER HOOKS — STATE HANDLING INSIDE JSX */
  if (error) {
    return (
      <Result
        status="error"
        title="Failed to load company"
        subTitle={(error as any)?.message ?? "Unknown error"}
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

  if (!company || !companyId) {
    return <Result status="404" title="Company not found" />;
  }

  return (
    <Show
      title={company.name}
      /* KEEP ONLY EDIT + DELETE BUTTONS */
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

      {/* INCIDENT LOGS – COMPACT, FILTERED BY COMPANY */}
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
                push(`/incident-logs/create?companyId=${encodeURIComponent(company.id)}`)
              }
            >
              New incident
            </Button>
          </Space>
        </div>

        <Tabs
          items={[
            {
              key: "draft",
              label: "Draft",
              children: (
                <Table
                  {...draftTbl.tableProps}
                  rowKey="id"
                  size="small"
                  columns={columns as any}
                  onRow={(record: any) => ({
                    onClick: () => show("incident_logs", record.id), /* RESOURCE NAME FIXED */
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
                  columns={columns as any}
                  onRow={(record: any) => ({
                    onClick: () => show("incident_logs", record.id),
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
                  onRow={(record: any) => ({
                    onClick: () => show("incident_logs", record.id),
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
