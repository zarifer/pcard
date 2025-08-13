import { Create, useForm } from "@refinedev/antd";
import { Form, Input, Select, Button, DatePicker } from "antd";
import type { Dayjs } from "dayjs";
import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useList } from "@refinedev/core";

type ColumnId = string;

export interface IPCard {
  id?: string;
  title: string;
  description?: string;
  stage: ColumnId;
  checklist?: { id: string; text: string; done: boolean }[];
  comments?: { id: string; text: string; at: string }[];
  assignees?: string[];
  dueDate?: string | null /* ISO OR NULL */;
}

/* FORM-VERSION OF THE VALUES (DUE DATE AS DAYJS) */
type IPCardForm = Omit<IPCard, "dueDate"> & { dueDate?: Dayjs | null };

/* BASIC SANITIZER TO AVOID XSS */
const sanitizeTitle = (raw: string) =>
  raw
    .replace(/<[^>]*>/g, "")
    .trim()
    .slice(0, 120);

const DEFAULT_STAGE_OPTIONS = [
  { value: "todo", label: "To Do" },
  { value: "in-progress", label: "In Progress" },
  { value: "review", label: "Review" },
  { value: "waiting-vendor", label: "Waiting for vendor" },
  { value: "done", label: "Done" },
];

export default function KanbanCreate() {
  /* READ STAGE FROM QUERY (?stage=todo...) */
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const stageFromQuery = (params.get("stage") as ColumnId) || "todo";

  const { data: stagesRes } = useList<{
    id: string;
    key: string;
    title: string;
  }>({ resource: "stages", queryOptions: { retry: false } });

  const stageOptions = useMemo(
    () =>
      stagesRes?.data?.length
        ? stagesRes.data
            .sort((a, b) => (a as any).order - (b as any).order)
            .map((s) => ({ value: s.key, label: s.title }))
        : DEFAULT_STAGE_OPTIONS,
    [stagesRes?.data],
  );

  /* REFINE FORM BOUND TO `kanban` */
  const { formProps, saveButtonProps } = useForm<IPCard>({
    resource: "kanban",
    redirect: "list",
  });

  /* PREFILL DEFAULTS ON MOUNT */
  useEffect(() => {
    formProps.form?.setFieldsValue({
      stage: stageFromQuery,
      checklist: [],
      comments: [],
      assignees: [],
      dueDate: null,
      description: "",
    } as Partial<IPCardForm>); /* SAFE CAST FOR PARTIAL PRESET */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formProps.form, stageFromQuery]);

  return (
    <Create title="Add new card" saveButtonProps={saveButtonProps}>
      {/* IMPORTANT: PARAMETERIZE THE FORM WITH IPCardForm AND CAST formProps WHEN SPREADING */}
      <Form<IPCardForm>
        {...(formProps as any)} /* AVOID GENERIC MISMATCH BETWEEN REFINE/ANTD */
        layout="vertical"
        initialValues={{ stage: stageFromQuery } as Partial<IPCardForm>}
        onFinish={(values: IPCardForm) => {
          /* NORMALIZE + SANITIZE, CONVERT DUE DATE TO ISO */
          const clean: IPCard = {
            title: sanitizeTitle(values.title),
            stage: (values.stage ?? stageFromQuery) as ColumnId,
            description: values.description ?? "",
            checklist: values.checklist ?? [],
            comments: values.comments ?? [],
            assignees: values.assignees ?? [],
            dueDate: values.dueDate
              ? values.dueDate.toDate().toISOString()
              : null,
          };
          return formProps.onFinish?.(clean);
        }}
      >
        <Form.Item label="* Title" name="title" rules={[{ required: true }]}>
          <Input placeholder="Short card title…" maxLength={120} />
        </Form.Item>

        <Form.Item label="Stage" name="stage" rules={[{ required: true }]}>
          <Select options={stageOptions} placeholder="Select column" />
        </Form.Item>

        <Form.Item label="Due date" name="dueDate">
          <DatePicker style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item label="Description" name="description">
          <Input.TextArea
            placeholder="(Optional) Description…"
            autoSize={{ minRows: 2, maxRows: 6 }}
          />
        </Form.Item>

        <Form.Item style={{ textAlign: "right", marginBottom: 0 }}>
          <Button
            onClick={() => window.history.back()}
            style={{ marginRight: 12 }}
          >
            Cancel
          </Button>
        </Form.Item>
      </Form>
    </Create>
  );
}
