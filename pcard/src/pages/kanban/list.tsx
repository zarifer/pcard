import {
  useList,
  useInvalidate,
  useCreate,
  useUpdate,
  useDelete,
} from "@refinedev/core";
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  DatePicker,
  Dropdown,
  Typography,
  App,
} from "antd";
import type { MenuProps } from "antd";
import { useMemo, useState, useCallback } from "react";
import axios from "axios";
import { useApiUrl } from "@refinedev/core";
import "./index.css";
import KanbanEdit from "./edit";

/* NOTE: MAKE COLUMN IDS FLEXIBLE BECAUSE STAGES ARE NOW DYNAMIC */
type ColumnId = string;

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

type Stage = { id: string; key: string; title: string; order?: number };

/* DEFAULT STAGES AS FALLBACK – USED ONLY IF BACKEND HAS NO 'stages' RESOURCE YET */
const DEFAULT_STAGES: Stage[] = [
  { id: "todo", key: "todo", title: "To Do" },
  { id: "in-progress", key: "in-progress", title: "In Progress" },
  { id: "review", key: "review", title: "Review" },
  { id: "waiting-vendor", key: "waiting-vendor", title: "Waiting for vendor" },
  { id: "done", key: "done", title: "Done" },
];

/* BASIC SANITIZER TO AVOID XSS */
const sanitize = (raw: string) => raw.replace(/<[^>]*>/g, "").trim();
/* SAFE SLUG FOR NEW STAGE.KEY */
const slugify = (s: string) =>
  sanitize(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export default function KanbanList() {
  const API_URL = useApiUrl();
  const { message, modal } = App.useApp();

  /* LOAD CARDS */
  const { data, isLoading } = useList<KanbanItem>({
    resource: "kanban",
    config: { pagination: { pageSize: 500 } },
  });
  const items = data?.data ?? [];

  /* LOAD STAGES (DYNAMIC) */
  const { data: stagesRes } = useList<Stage>({
    resource: "stages",
    config: { pagination: { pageSize: 100 } },
    queryOptions: {
      /* IF BACKEND DOESN'T HAVE THIS RESOURCE, IGNORE ERROR */
      retry: false,
    },
  });
  const stages: Stage[] = stagesRes?.data?.length
    ? stagesRes.data.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : DEFAULT_STAGES;

  const firstStageKey = stages[0]?.key || "todo";

  /* GROUP CARDS PER STAGE */
  const grouped = useMemo(() => {
    const map: Record<string, KanbanItem[]> = {};
    stages.forEach((s) => (map[s.key] = []));
    items.forEach((it) => {
      if (!map[it.stage]) map[it.stage] = [];
      map[it.stage].push(it);
    });
    return map;
  }, [items, stages]);

  /* MUTATIONS */
  const invalidate = useInvalidate();
  const { mutate: createKanban, isPending: creating } = useCreate();
  const { mutate: updateKanban } = useUpdate();
  const { mutate: deleteStageMut } = useDelete();

  /* CREATE CARD MODAL STATE */
  const [open, setOpen] = useState(false);
  const [targetStage, setTargetStage] = useState<ColumnId>(firstStageKey);
  const [form] = Form.useForm<KanbanItem>();

  /* EDIT DRAWER */
  const [editId, setEditId] = useState<string | null>(null);

  /* DRAG & DROP STATE */
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<ColumnId | null>(null);

  /* STAGE MODALS */
  const [stageForm] = Form.useForm<{ title: string }>();
  const [stageEditTarget, setStageEditTarget] = useState<Stage | null>(null);
  const [stageAddOpen, setStageAddOpen] = useState(false);
  const [stageRenameOpen, setStageRenameOpen] = useState(false);

  /* OPEN CREATE CARD */
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

  /* SAVE CARD */
  function onSubmit() {
    form.validateFields().then(async (values: any) => {
      const payload: KanbanItem = {
        ...values,
        title: sanitize(values.title).slice(0, 120),
        stage: values.stage,
        dueDate: values.dueDate ? values.dueDate.toDate().toISOString() : null,
      };

      createKanban(
        { resource: "kanban", values: payload },
        {
          onSuccess: async (res) => {
            invalidate({ resource: "kanban", invalidates: ["list"] });
            setOpen(false);
            form.resetFields();

            /* SILENT CALENDAR SYNC */
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
                /* IGNORE */
              }
            }
          },
        },
      );
    });
  }

  /* DND HANDLERS */
  const handleDragStart = useCallback((id: string) => setDraggingId(id), []);
  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDragOverCol(null);
  }, []);
  const handleDragOverCol = useCallback(
    (colId: ColumnId, e: React.DragEvent) => {
      e.preventDefault();
      if (dragOverCol !== colId) setDragOverCol(colId);
    },
    [dragOverCol],
  );
  const handleDropOnCol = useCallback(
    (colId: ColumnId) => {
      if (!draggingId) return;
      const card = items.find((i) => i.id?.toString() === draggingId);
      if (!card || card.stage === colId) {
        setDraggingId(null);
        setDragOverCol(null);
        return;
      }
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

  /* === STAGE ACTIONS =================================================== */

  const openRenameStage = (s: Stage) => {
    setStageEditTarget(s);
    stageForm.setFieldsValue({ title: s.title });
    setStageRenameOpen(true);
  };

  const saveStageRename = async () => {
    const vals = await stageForm.validateFields();
    const title = sanitize(vals.title).slice(0, 40);
    if (!title || !stageEditTarget) return setStageRenameOpen(false);

    /* IF BACKEND HAS NO 'stages' RESOURCE, JUST UPDATE LOCAL TITLES (NO-OP HERE) */
    if (!stagesRes?.data?.length) {
      message.info("STAGES RESOURCE NOT FOUND – USING DEFAULT TITLES LOCALLY.");
      setStageRenameOpen(false);
      return;
    }

    await axios.patch(`${API_URL}/stages/${stageEditTarget.id}`, {
      title,
    });

    setStageRenameOpen(false);
    invalidate({ resource: "stages", invalidates: ["list"] });
  };

  const clearStageCards = async (s: Stage) => {
    const affected = (grouped[s.key] ?? []).map((c) => c.id!).filter(Boolean);
    if (affected.length === 0) return;

    /* BATCH MOVE TO FIRST COLUMN (USUALLY 'TODO') */
    await Promise.all(
      affected.map((id) =>
        axios.patch(`${API_URL}/kanban/${id}`, { stage: firstStageKey }),
      ),
    );
    invalidate({ resource: "kanban", invalidates: ["list"] });
    message.success("ALL CARDS MOVED TO TODO.");
  };

  const onClearStage = (s: Stage) => {
    modal.confirm({
      title: `Move all cards from "${s.title}" to "${stages[0]?.title || "To Do"}"?`,
      okText: "Clear all cards",
      cancelText: "Cancel",
      onOk: () => clearStageCards(s),
    });
  };

  const onDeleteStage = (s: Stage) => {
    modal.confirm({
      title: `Delete stage "${s.title}"?`,
      content:
        "Cards in this stage will be moved to the first column before deletion.",
      okText: "Delete",
      cancelText: "Cancel",
      okButtonProps: { danger: true }, // RED, NOT GREY
      onOk: async () => {
        /* MOVE CARDS OUT FIRST */
        await clearStageCards(s);

        /* IF NO BACKEND 'stages', WE CANNOT DELETE – FAIL SAFE */
        if (!stagesRes?.data?.length) {
          message.warning("STAGES RESOURCE NOT FOUND – DELETE IS DISABLED.");
          return;
        }

        deleteStageMut(
          { resource: "stages", id: s.id },
          {
            onSuccess: () => {
              invalidate({ resource: "stages", invalidates: ["list"] });
              message.success("STAGE DELETED.");
            },
          },
        );
      },
    });
  };

  const onAddStage = () => {
    stageForm.resetFields();
    setStageAddOpen(true);
  };

  const saveNewStage = async () => {
    const { title } = await stageForm.validateFields();
    const clean = sanitize(title).slice(0, 40);
    if (!clean) return;

    /* NO 'stages' RESOURCE? JUST INFO AND HIDE */
    if (!stagesRes?.data?.length) {
      message.info("STAGES RESOURCE NOT FOUND – CAN'T CREATE STAGE YET.");
      setStageAddOpen(false);
      return;
    }

    /* UNIQUE KEY */
    let base = slugify(clean) || `stage-${Date.now()}`;
    let key = base;
    const taken = new Set(stages.map((s) => s.key));
    let i = 1;
    while (taken.has(key)) key = `${base}-${i++}`;

    await axios.post(`${API_URL}/stages`, {
      title: clean,
      key,
      order: (stages[stages.length - 1]?.order ?? stages.length - 1) + 1,
    });

    setStageAddOpen(false);
    invalidate({ resource: "stages", invalidates: ["list"] });
    message.success("STAGE CREATED.");
  };

  if (isLoading) return <div>Loading…</div>;

  return (
    <>
      {/* BOARD */}
      <div className="kanban-board">
        {stages.map((col) => {
          const menuItems: MenuProps["items"] = [
            {
              key: "edit",
              label: "Edit status",
              onClick: () => openRenameStage(col),
            },
            {
              key: "clear",
              label: "Clear all cards",
              onClick: () => onClearStage(col),
            },
            {
              type: "divider",
            },
            {
              key: "delete",
              label: <span className="danger-text">Delete status</span>,
              onClick: () => onDeleteStage(col),
            },
          ];

          return (
            <div
              key={col.key}
              className={`kanban-column ${dragOverCol === col.key ? "drag-target" : ""}`}
              onDragOver={(e) => handleDragOverCol(col.key, e)}
              onDragEnter={(e) => handleDragOverCol(col.key, e)}
              onDrop={() => handleDropOnCol(col.key)}
            >
              <div className="kanban-column-header">
                <span className="stage-title">{col.title}</span>
                <div className="kanban-header-actions">
                  <button
                    className="kanban-add-btn"
                    aria-label={`Add card to ${col.title}`}
                    title={`Add to ${col.title}`}
                    onClick={() => onOpenCreate(col.key)}
                  >
                    +
                  </button>

                  <Dropdown
                    menu={{ items: menuItems }}
                    trigger={["click"]}
                    placement="bottomRight"
                  >
                    <button
                      className="stage-menu-btn"
                      aria-label={`Stage menu for ${col.title}`}
                      title="Stage actions"
                    >
                      ⋯
                    </button>
                  </Dropdown>
                </div>
              </div>

              <div className="kanban-column-content">
                {dragOverCol === col.key && (
                  <div className="kanban-drop-placeholder" aria-hidden />
                )}

                {(grouped[col.key] ?? []).map((card) => (
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
          );
        })}

        {/* ADD STAGE AT THE FAR RIGHT */}
        <div className="kanban-column add-stage-column">
          <Button
            type="dashed"
            className="add-stage-btn"
            onClick={onAddStage}
            block
          >
            + Add stage
          </Button>
        </div>
      </div>

      {/* CREATE CARD MODAL */}
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
          initialValues={{ stage: targetStage || firstStageKey }}
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
              options={stages.map((s) => ({ value: s.key, label: s.title }))}
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

      {/* EDIT CARD DRAWER */}
      {editId && (
        <KanbanEdit
          visible={!!editId}
          onClose={() => setEditId(null)}
          cardId={editId}
        />
      )}

      {/* ADD STAGE MODAL */}
      <Modal
        title="Add stage"
        open={stageAddOpen}
        onCancel={() => setStageAddOpen(false)}
        onOk={saveNewStage}
        okText="Create"
      >
        <Form form={stageForm} layout="vertical">
          <Form.Item
            label="Title"
            name="title"
            rules={[{ required: true, message: "Title is required" }]}
          >
            <Input placeholder="e.g., Backlog" />
          </Form.Item>
        </Form>
      </Modal>

      {/* RENAME STAGE MODAL */}
      <Modal
        title="Edit stage"
        open={stageRenameOpen}
        onCancel={() => setStageRenameOpen(false)}
        onOk={saveStageRename}
        okText="Save"
      >
        <Form form={stageForm} layout="vertical">
          <Form.Item
            label="Title"
            name="title"
            rules={[{ required: true, message: "Title is required" }]}
          >
            <Input maxLength={40} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
