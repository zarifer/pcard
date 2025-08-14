import {
  DateField,
  DeleteButton,
  EditButton,
  List,
  MarkdownField,
  ShowButton,
  useTable,
  CreateButton,
} from "@refinedev/antd";
import { type BaseRecord, useMany } from "@refinedev/core";
import { Space, Table, Tabs, Typography, Card } from "antd";
import CategoriesBox from "./categories";
import { STATUS_OPTS } from "./fields";

/* ALL COMMENTS IN ENGLISH AND CAPS */

const { Title } = Typography;

export const IncidentLogList = () => {
  const { tableProps } = useTable({
    syncWithLocation: true,
  });

  /* RESOLVE CATEGORY + COMPANY TITLES */
  const { data: categoryData, isLoading: categoryIsLoading } = useMany({
    resource: "categories",
    ids: tableProps?.dataSource?.map((r: any) => r?.category?.id).filter(Boolean) ?? [],
    queryOptions: { enabled: !!tableProps?.dataSource },
  });

  const { data: companyData, isLoading: companyIsLoading } = useMany({
    resource: "companies",
    ids: tableProps?.dataSource?.map((r: any) => r?.company?.id).filter(Boolean) ?? [],
    queryOptions: { enabled: !!tableProps?.dataSource },
  });

  return (
    <List title="Incident logs" canCreate={false} headerButtons={null}>
      <Tabs
        className="tabs-default"
        items={[
          {
            key: "incidents",
            label: "Incidents",
            children: (
              <Card className="panel-card">
                <div className="panel-header">
                  <Title level={5} className="panel-title">Incidents</Title>
                  <div className="panel-actions">
                    <CreateButton className="btn-primary" />
                  </div>
                </div>

                <Table {...tableProps} rowKey="id">
                  <Table.Column dataIndex="id" title={"ID"} width={80} />
                  <Table.Column
                    dataIndex={"company"}
                    title={"Company"}
                    render={(value: any) =>
                      companyIsLoading ? "…" : companyData?.data?.find((c: any) => c.id === value?.id)?.name
                    }
                    width={180}
                  />
                  <Table.Column dataIndex="title" title={"Title"} />
                  <Table.Column
                    dataIndex="content"
                    title={"Content"}
                    render={(value: any) =>
                      value ? <MarkdownField value={String(value).slice(0, 120) + "..."} /> : "-"
                    }
                  />
                  <Table.Column
                    dataIndex={"category"}
                    title={"Category"}
                    render={(value: any) =>
                      categoryIsLoading ? "…" : categoryData?.data?.find((i: any) => i.id === value?.id)?.title
                    }
                    width={160}
                  />
                  <Table.Column dataIndex="status" title={"Status"} width={110} />
                  <Table.Column dataIndex="severity" title={"Severity"} width={110} />
                  <Table.Column dataIndex="priority" title={"Priority"} width={90} />
                  <Table.Column
                    dataIndex={["createdAt"]}
                    title={"Created at"}
                    render={(value: any) => <DateField value={value} />}
                    width={180}
                  />
                  <Table.Column
                    title={"Actions"}
                    dataIndex="actions"
                    width={180}
                    render={(_, record: BaseRecord) => (
                      <Space>
                        <EditButton hideText size="small" recordItemId={record.id} />
                        <ShowButton hideText size="small" recordItemId={record.id} />
                        <DeleteButton hideText size="small" recordItemId={record.id} />
                      </Space>
                    )}
                  />
                </Table>
              </Card>
            ),
          },
          { key: "categories", label: "Categories", children: <CategoriesBox /> },
        ]}
      />
    </List>
  );
};
