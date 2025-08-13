import { useList, useInvalidate, useCreate, useUpdate } from "@refinedev/core";
import { Modal, Form, Input, Select, Button, DatePicker } from "antd";
import { useMemo, useState, useCallback } from "react";
import axios from "axios";
import { useApiUrl } from "@refinedev/core";
import "./index.css";
import KanbanEdit from "./edit";

/* TYPES */
type ColumnId = "todo" | "in-progress" | "review" | "waiting-vendor" | "done";

type KanbanItem = {
  id?: string;
  title: string;
  description?: string;
  stage: ColumnId;
  checklist?: { id: string; text: string; done: boolean }[];
  comments?: { id: string; text: string; at: string }[];
  assignees?: string[];
  dueDate?: string | null;
  calendarId?: string | null;
};

/* CONSTANTS */
const COLUMNS: { id: ColumnId; title: string }[] = [
  { id: "todo", title: "To Do" },
  { id: "in-progress", title: "In Progress" },
  { id: "review", title: "Review" },
  { id: "waiting-vendor", title: "Waiting for vendor" },
  { id: "done", title: "Done" },
];

const sanitizeTitle = (raw: string) =>
  raw
    .replace(/<[^>]*>/g, "")
    .trim()
    .slice(0, 120);

export default function KanbanList() {
  const API_URL = useApiUrl();

  /* DATA */
  const { data, isLoading } = useList<KanbanItem>({
    resource: "kanban",
    config: { pagination: { pageSize: 200 } },
  });
  const items = data?.data ?? [];
  const grouped = useMemo(() => {
    const map: Record<ColumnId, KanbanItem[]> = {
      todo: [],
      "in-progress": [],
      review: [],
      "waiting-vendor": [],
      done: [],
    };
    items.forEach((it) => map[it.stage]?.push(it));
    return map;
  }, [items]);

  /* MUTATIONS */
  const invalidate = useInvalidate();
  const { mutate: createKanban, isPending: creating } = useCreate();
  const { mutate: updateKanban } = useUpdate();

  /* CREATE MODAL STATE */
  const [open, setOpen] = useState(false);
  const [targetStage, setTargetStage] = useState<ColumnId>("todo");
  const [form] = Form.useForm<KanbanItem>();

  /* EDIT DRAWER */
  const [editId, setEditId] = useState<string | null>(null);

  /* DRAG & DROP STATE */
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<ColumnId | null>(null);

  /* CREATE FLOW */
  function onOpenCreate(stage: ColumnId) {
    setTargetStage(stage);
    form.setFieldsValue({
      title: "",
      stage,
      description: "",
      checklist: [],
      comments: [],
      assignees: [],
      dueDate: undefined,
      calendarId: null,
    } as any);
    setOpen(true);
  }

  function onSubmit() {
    form.validateFields().then(async (values: any) => {
      const payload: KanbanItem = {
        ...values,
        title: sanitizeTitle(values.title),
        dueDate: values.dueDate ? values.dueDate.toDate().toISOString() : null,
      };

      createKanban(
        { resource: "kanban", values: payload },
        {
          onSuccess: async (res) => {
            invalidate({ resource: "kanban", invalidates: ["list"] });
            setOpen(false);
            form.resetFields();

            // silent calendar sync
            const newId = (res?.data as any)?.id;
            if (newId && payload.dueDate) {
              try {
                const cres = await axios.post(`${API_URL}/calendar`, {
                  title: payload.title,
                  date: [payload.dueDate, payload.dueDate],
                  type: "Kanban",
                  refKanbanId: newId,
                });
                const calId = cres.data?.id;
                if (calId) {
                  await axios.patch(`${API_URL}/kanban/${newId}`, {
                    calendarId: calId,
                  });
                }
              } catch {
                /* ignore */
              }
            }
          },
        },
      );
    });
  }

  /* DND HANDLERS */
  const handleDragStart = useCallback((id: string) => {
    setDraggingId(id);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDragOverCol(null);
  }, []);

  const handleDragOverCol = useCallback(
    (colId: ColumnId, e: React.DragEvent) => {
      e.preventDefault(); // allow drop
      if (dragOverCol !== colId) setDragOverCol(colId);
    },
    [dragOverCol],
  );

  const handleDropOnCol = useCallback(
    (colId: ColumnId) => {
      if (!draggingId) return;
      // find the card
      const card = items.find((i) => i.id?.toString() === draggingId);
      if (!card || card.stage === colId) {
        setDraggingId(null);
        setDragOverCol(null);
        return;
      }
      // update stage
      updateKanban(
        { resource: "kanban", id: draggingId, values: { stage: colId } },
        {
          onSuccess: () => {
            setDraggingId(null);
            setDragOverCol(null);
            invalidate({ resource: "kanban", invalidates: ["list"] });
          },
          onError: () => {
            setDraggingId(null);
            setDragOverCol(null);
          },
        },
      );
    },
    [draggingId, items, updateKanban, invalidate],
  );

  if (isLoading) return <div>Loading…</div>;

  return (
    <>
      <div className="kanban-board">
        {COLUMNS.map((col) => (
          <div
            key={col.id}
            className={`kanban-column ${dragOverCol === col.id ? "drag-target" : ""}`}
            onDragOver={(e) => handleDragOverCol(col.id, e)}
            onDragEnter={(e) => handleDragOverCol(col.id, e)}
            onDrop={() => handleDropOnCol(col.id)}
          >
            <div className="kanban-column-header">
              <span>{col.title}</span>
              <div className="kanban-header-actions">
                <button
                  className="kanban-add-btn"
                  aria-label={`Add card to ${col.title}`}
                  title={`Add to ${col.title}`}
                  onClick={() => onOpenCreate(col.id)}
                >
                  +
                </button>
              </div>
            </div>

            <div className="kanban-column-content">
              {/* dashed placeholder while hovering column */}
              {dragOverCol === col.id && (
                <div className="kanban-drop-placeholder" aria-hidden />
              )}

              {(grouped[col.id] ?? []).map((card) => (
                <div
                  key={card.id}
                  className={`kanban-card ${draggingId === card.id ? "dragging" : ""}`}
                  draggable
                  onDragStart={() => handleDragStart(card.id!.toString())}
                  onDragEnd={handleDragEnd}
                  onClick={() => setEditId(card.id!.toString())}
                >
                  <div className="kanban-card-title">{card.title}</div>
                  <div className="kanban-card-desc">
                    {card.description || "Click to edit…"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* CREATE MODAL */}
      <Modal
        title="Add new card"
        open={open}
        onCancel={() => setOpen(false)}
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="primary" loading={creating} onClick={onSubmit}>
              Save
            </Button>
          </div>
        }
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ stage: targetStage }}
        >
          <Form.Item
            label="Title"
            name="title"
            rules={[{ required: true, message: "Title is required" }]}
          >
            <Input placeholder="Short card title…" maxLength={120} />
          </Form.Item>

          <Form.Item label="Stage" name="stage" rules={[{ required: true }]}>
            <Select
              options={[
                { value: "todo", label: "To Do" },
                { value: "in-progress", label: "In Progress" },
                { value: "review", label: "Review" },
                { value: "waiting-vendor", label: "Waiting for vendor" },
                { value: "done", label: "Done" },
              ]}
            />
          </Form.Item>

          <Form.Item label="Description" name="description">
            <Input.TextArea
              placeholder="(Optional) Description…"
              autoSize={{ minRows: 2, maxRows: 6 }}
            />
          </Form.Item>

          <Form.Item label="Due date" name="dueDate">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* EDIT DRAWER */}
      {editId && (
        <KanbanEdit
          visible={!!editId}
          onClose={() => setEditId(null)}
          cardId={editId}
        />
      )}
    </>
  );
}
