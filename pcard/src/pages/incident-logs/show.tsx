import { DateField, MarkdownField, Show, TextField } from "@refinedev/antd";
import { useOne, useShow } from "@refinedev/core";
import { Typography } from "antd";

/* ALL COMMENTS IN ENGLISH AND CAPS */

const { Title } = Typography;

export const IncidentLogShow = () => {
  const { queryResult } = useShow({});
  const { data, isLoading } = queryResult;
  const record: any = data?.data;

  const { data: companyData } = useOne({
    resource: "companies",
    id: record?.company?.id || "",
    queryOptions: { enabled: !!record?.company?.id },
  });

  const { data: categoryData } = useOne({
    resource: "categories",
    id: record?.category?.id || "",
    queryOptions: { enabled: !!record?.category?.id },
  });

  const created = record?.createdAt ?? record?.CreatedAt ?? null;
  const updated = record?.updatedAt ?? record?.UpdatedAt ?? null;

  return (
    <Show isLoading={isLoading} headerButtons={() => null}>
      <Title level={5}>{"ID"}</Title>
      <TextField value={record?.id} />

      <Title level={5}>{"Company"}</Title>
      <TextField value={companyData?.data?.product} />

      <Title level={5}>{"Title"}</Title>
      <TextField value={record?.title} />

      <Title level={5}>{"Detail"}</Title>
      <MarkdownField value={record?.detail} />

      <Title level={5}>{"Solution"}</Title>
      <MarkdownField
        value={record?.solution || "_No solution provided yet._"}
      />

      <Title level={5}>{"Incident type"}</Title>
      <TextField value={categoryData?.data?.title} />

      <Title level={5}>{"Status"}</Title>
      <TextField value={record?.status} />

      <Title level={5}>{"Created at"}</Title>
      <DateField value={created} />

      <Title level={5}>{"Updated at"}</Title>
      <DateField value={updated} />
    </Show>
  );
};
