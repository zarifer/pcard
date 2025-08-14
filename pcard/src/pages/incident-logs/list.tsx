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

const { Title } = Typography;

export const IncidentLogList = () => {
  /* USE REFINED TABLE HOOK */
  const { tableProps } = useTable({
    syncWithLocation: true,
  });

  /* RESOLVE CATEGORY TITLES FOR LIST VIEW */
  const { data: categoryData, isLoading: categoryIsLoading } = useMany({
    resource: "categories",
    ids:
      tableProps?.dataSource
        ?.map((item: any) => item?.category?.id)
        .filter(Boolean) ?? [],
    queryOptions: {
      enabled: !!tableProps?.dataSource,
    },
  });

  return (
    /* IMPORTANT: HIDE DEFAULT LIST HEADER CREATE BUTTON */
    <List title="Incident logs" canCreate={false} headerButtons={null}>
      <Tabs
        className="tabs-default"
        items={[
          {
            key: "incidents",
            label: "Incidents",
            children: (
              <Card className="panel-card">
                {/* HEADER ROW: TITLE LEFT, ACTIONS RIGHT */}
                <div className="panel-header">
                  <Title level={5} className="panel-title">Incidents</Title>
                  <div className="panel-actions">
                    {/* KEEP ANTD PRIMARY (PURPLE) */}
                    <CreateButton className="btn-primary" />
                  </div>
                </div>

                <Table {...tableProps} rowKey="id">
                  <Table.Column dataIndex="id" title={"ID"} width={80} />
                  <Table.Column dataIndex="title" title={"Title"} />
                  <Table.Column
                    dataIndex="content"
                    title={"Content"}
                    render={(value: any) => {
                      if (!value) return "-";
                      /* SECURITY: SHOW A SHORT MARKDOWN PREVIEW ONLY */
                      return <MarkdownField value={String(value).slice(0, 120) + "..."} />;
                    }}
                  />
                  <Table.Column
                    dataIndex={"category"}
                    title={"Category"}
                    render={(value: any) =>
                      categoryIsLoading ? (
                        <>Loading...</>
                      ) : (
                        categoryData?.data?.find((item: any) => item.id === value?.id)
                          ?.title
                      )
                    }
                  />
                  <Table.Column dataIndex="status" title={"Status"} width={110} />
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
          {
            key: "categories",
            label: "Categories",
            children: <CategoriesBox />,
          },
        ]}
      />
    </List>
  );
};

/* ALL COMMENTS IN ENGLISH AND UPPERCASE PER PROJECT STANDARD */
