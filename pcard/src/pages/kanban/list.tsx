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
  Checkbox,
} from "antd";
import type { MenuProps } from "antd";
import { useMemo, useState, useCallback } from "react";
import axios from "axios";
import { useApiUrl } from "@refinedev/core";
import "./index.css";
import KanbanEdit from "./edit";

type ColumnId = string;

type KanbanItem = {
  id?: string;
  title: string; // ← listnézetben csak ezt mutatjuk (Product ID)
  description?: string;
  stage: ColumnId;
  checklist?: { id: string; text: string; done: boolean }[];
  comments?: { id: string; text: string; at: string }[];
  assignees?: string[];
  dueDate?: string | null;
  calendarId?: string | null;
};

type Stage = { id: string; key: string; title: string; order?: number };

type Company = {
  id: string;
  name?: string;
  product?: string;
  productId?: string;
  licenseExpiry?: string;
  versionCheckPath?: string;
  wdManuallyOff?: boolean;
  pctManuallyOff?: boolean;
};

const DEFAULT_STAGES: Stage[] = [
  { id: "todo", key: "todo", title: "To Do" },
  { id: "in-progress", key: "in-progress", title: "In Progress" },
  { id: "review", key: "review", title: "Review" },
  { id: "waiting-vendor", key: "waiting-vendor", title: "Waiting for vendor" },
  { id: "done", key: "done", title: "Done" },
];

const sanitize = (raw: string) => raw.replace(/<[^>]*>/g, "").trim();
const slugify = (s: string) =>
  sanitize(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const yesno = (v: any) => (v === true ? "Yes" : v === false ? "No" : "—");
const fmtDate = (v?: string) =>
  v
    ? new Intl.DateTimeFormat("en-GB", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(v))
    : "—";

export default function KanbanList() {
  const API_URL = useApiUrl();
  const { message, modal } = App.useApp();

  // CARDS
  const { data, isLoading } = useList<KanbanItem>({
    resource: "kanban",
    config: { pagination: { pageSize: 500 } },
  });
  const items = data?.data ?? [];

  // STAGES
  const { data: stagesRes } = useList<Stage>({
    resource: "stages",
    config: { pagination: { pageSize: 100 } },
    queryOptions: { retry: false },
  });
  const stages: Stage[] = stagesRes?.data?.length
    ? stagesRes.data.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : DEFAULT_STAGES;

  const firstStageKey = stages[0]?.key || "todo";
  const importStageKey =
    stages.find((s) => s.title.toLowerCase().startsWith("prepare"))?.key ??
    firstStageKey;

  // GROUP
  const grouped = useMemo(() => {
    const map: Record<string, KanbanItem[]> = {};
    stages.forEach((s) => (map[s.key] = []));
    items.forEach((it) => {
      if (!map[it.stage]) map[it.stage] = [];
      map[it.stage].push(it);
    });
    return map;
  }, [items, stages]);

  // MUTATIONS
  const invalidate = useInvalidate();
  const { mutate: createKanban, isPending: creating } = useCreate();
  const { mutate: updateKanban } = useUpdate();
  const { mutate: deleteStageMut } = useDelete();

  // CREATE MODAL
  const [open, setOpen] = useState(false);
  const [targetStage, setTargetStage] = useState<ColumnId>(firstStageKey);
  const [form] = Form.useForm<KanbanItem>();

  // EDIT DRAWER
  const [editId, setEditId] = useState<string | null>(null);

  // DND
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<ColumnId | null>(null);

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

  // STAGE MODALS
  const [stageForm] = Form.useForm<{ title: string }>();
  const [stageEditTarget, setStageEditTarget] = useState<Stage | null>(null);
  const [stageAddOpen, setStageAddOpen] = useState(false);
  const [stageRenameOpen, setStageRenameOpen] = useState(false);

  const openRenameStage = (s: Stage) => {
    setStageEditTarget(s);
    stageForm.setFieldsValue({ title: s.title });
    setStageRenameOpen(true);
  };
  const saveStageRename = async () => {
    const vals = await stageForm.validateFields();
    const title = sanitize(vals.title).slice(0, 40);
    if (!title || !stageEditTarget) return setStageRenameOpen(false);
    if (!stagesRes?.data?.length) {
      message.info("STAGES RESOURCE NOT FOUND – USING DEFAULT TITLES LOCALLY.");
      setStageRenameOpen(false);
      return;
    }
    await axios.patch(`${API_URL}/stages/${stageEditTarget.id}`, { title });
    setStageRenameOpen(false);
    invalidate({ resource: "stages", invalidates: ["list"] });
  };
  const clearStageCards = async (s: Stage) => {
    const affected = (grouped[s.key] ?? []).map((c) => c.id!).filter(Boolean);
    if (!affected.length) return;
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
      okText: "Clear All Cards",
      cancelText: "Cancel",
      onOk: () => clearStageCards(s),
    });
  };
  const onDeleteStage = (s: Stage) => {
    modal.confirm({
      title: `Delete Stage "${s.title}"?`,
      content:
        "Cards in this stage will be moved to the first column before deletion.",
      okText: "Delete",
      cancelText: "Cancel",
      okButtonProps: { danger: true },
      onOk: async () => {
        await clearStageCards(s);
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
    if (!stagesRes?.data?.length) {
      message.info("STAGES RESOURCE NOT FOUND – CAN'T CREATE STAGE YET.");
      setStageAddOpen(false);
      return;
    }
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

  // CREATE CARD (modal)
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
              } catch {}
            }
          },
        },
      );
    });
  }

  // IMPORT MODAL
  const { data: companiesRes } = useList<Company>({
    resource: "companies",
    config: { pagination: { pageSize: 1000 } },
  });
  const companies: Company[] = companiesRes?.data ?? [];
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [searchCompanies, setSearchCompanies] = useState("");

  const filteredCompanies = useMemo(() => {
    const q = searchCompanies.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((c) =>
      [c.productId, c.product, c.name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [companies, searchCompanies]);

  const handleImport = async () => {
    if (!selectedCompanyIds.length) return;
    setImporting(true);
    try {
      const now = new Date();
      const due = new Date(now);
      due.setDate(due.getDate() + 15);
      const dueISO = due.toISOString();

      const checklistTexts = [
        "Windows Update",
        "Product Update",
        "Bootstrap Check",
        "WD Check",
        "Config File Update",
        "Snapshot Created",
      ];

      const chosen = companies.filter((c) =>
        selectedCompanyIds.includes(String(c.id)),
      );

      for (const c of chosen) {
        // TITLE = STRICTLY PRODUCT ID for list view
        const title = sanitize(c.productId || "(no Product ID)").slice(0, 120);

        const desc = [
          `Vendor: ${sanitize(c.name || "—")}`,
          `Product: ${sanitize(c.product || "—")}`,
          `License expiry: ${fmtDate(c.licenseExpiry)}`,
          `Current version check: ${sanitize(c.versionCheckPath || "—")}`,
          `Disable Windows Defender: ${yesno(c.wdManuallyOff)}`,
          `Disable PCT: ${yesno(c.pctManuallyOff)}`,
        ].join("\n");

        const checklist = checklistTexts.map((t, i) => ({
          id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
          text: t,
          done: false,
        }));

        const res = await axios.post(`${API_URL}/kanban`, {
          title,
          description: desc,
          stage: importStageKey,
          checklist,
          dueDate: dueISO,
        });

        const newId = res.data?.id;
        if (newId) {
          try {
            const cres = await axios.post(`${API_URL}/calendar`, {
              title,
              date: [dueISO, dueISO],
              type: "Kanban",
              refKanbanId: newId,
            });
            const calId = cres.data?.id;
            if (calId) {
              await axios.patch(`${API_URL}/kanban/${newId}`, {
                calendarId: calId,
              });
            }
          } catch {}
        }
      }

      // nincs extra toast → csak zárunk és frissítünk
      setImportOpen(false);
      setSelectedCompanyIds([]);
      invalidate({ resource: "kanban", invalidates: ["list"] });
    } finally {
      setImporting(false);
    }
  };

  if (isLoading) return <div>Loading…</div>;

  return (
    <div className="kanban-page">
      <div className="toolbar" style={{ marginTop: 8 }}>
        <Button type="primary" onClick={() => setImportOpen(true)}>
          Import Companies
        </Button>
        <div style={{ flex: 1 }} />
      </div>

      <div className="kanban-board">
        {stages.map((col) => {
          const menuItems: MenuProps["items"] = [
            { key: "edit", label: "Edit Stage", onClick: () => openRenameStage(col) },
            { key: "clear", label: "Clear All Cards", onClick: () => onClearStage(col) },
            { type: "divider" },
            {
              key: "delete",
              label: <span className="danger-text">Delete Stage</span>,
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
                <Typography.Text className="stage-title" strong>
                  {col.title}
                </Typography.Text>

                {/* BAL OLDALT: + gomb, mellette a … menü */}
                <div className="kanban-header-actions">
                  <button
                    className="kanban-add-btn"
                    aria-label={`Add card to ${col.title}`}
                    title={`Add to ${col.title}`}
                    onClick={() => onOpenCreate(col.key)}
                  >
                    +
                  </button>
                  <Dropdown menu={{ items: menuItems }} trigger={["click"]} placement="bottomRight">
                    <button className="stage-menu-btn" aria-label={`Stage menu for ${col.title}`} title="Stage actions">
                      ⋯
                    </button>
                  </Dropdown>
                </div>
              </div>

              <div className="kanban-column-content">
                {draggingId && dragOverCol === col.key && (
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
                    {/* LIST VIEW: csak Product ID (title) */}
                    <div className="kanban-card-title">{card.title}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* JOBB SZÉL: új oszlop */}
        <div className="kanban-column add-stage-column">
          <Button type="dashed" className="add-stage-btn" onClick={onAddStage} block>
            + Add Stage
          </Button>
        </div>
      </div>

      {/* CREATE CARD */}
      <Modal
        open={open}
        title="Create card"
        onCancel={() => setOpen(false)}
        onOk={onSubmit}
        okText="Create"
        confirmLoading={creating}
      >
        <Form form={form} layout="vertical" initialValues={{ stage: targetStage }}>
          <Form.Item
            label="Title"
            name="title"
            rules={[{ required: true, message: "Title is required" }]}
          >
            <Input maxLength={120} />
          </Form.Item>
          <Form.Item label="Stage" name="stage">
            <Select options={stages.map((s) => ({ value: s.key, label: s.title }))} />
          </Form.Item>
          <Form.Item label="Description" name="description">
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item label="Due date" name="dueDate">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ADD / RENAME STAGE */}
      <Modal open={stageAddOpen} title="Add Stage" onCancel={() => setStageAddOpen(false)} onOk={saveNewStage} okText="Create">
        <Form form={stageForm} layout="vertical">
          <Form.Item label="Stage title" name="title" rules={[{ required: true, message: "Title is required" }]}>
            <Input maxLength={40} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal open={stageRenameOpen} title="Edit Stage" onCancel={() => setStageRenameOpen(false)} onOk={saveStageRename} okText="Save">
        <Form form={stageForm} layout="vertical">
          <Form.Item label="Stage title" name="title" rules={[{ required: true, message: "Title is required" }]}>
            <Input maxLength={40} />
          </Form.Item>
        </Form>
      </Modal>

      {/* EDIT DRAWER */}
      {editId && (
        <KanbanEdit visible={!!editId} cardId={editId!} onClose={() => setEditId(null)} />
      )}

      {/* IMPORT COMPANIES */}
      <Modal
        open={importOpen}
        title="Import Companies"
        onCancel={() => setImportOpen(false)}
        okText="Import"
        cancelText="Cancel"
        onOk={handleImport}
        okButtonProps={{ disabled: selectedCompanyIds.length === 0 || importing }}
        confirmLoading={importing}
      >
        <Input.Search
          placeholder="Search companies…"
          value={searchCompanies}
          onChange={(e) => setSearchCompanies(e.target.value)}
          allowClear
          style={{ marginBottom: 12 }}
        />
        <div style={{ maxHeight: 360, overflow: "auto", paddingRight: 4 }}>
          {filteredCompanies.map((c) => {
            const label =
              sanitize([c.productId, c.product, c.name].filter(Boolean).join(" — ")) ||
              `Company #${c.id}`;
            const checked = selectedCompanyIds.includes(String(c.id));
            return (
              <div key={c.id} style={{ display: "flex", alignItems: "center", padding: "6px 0", borderBottom: "1px solid rgba(0,0,0,0.03)" }}>
                <Checkbox
                  checked={checked}
                  onChange={(e) => {
                    const val = String(c.id);
                    setSelectedCompanyIds((prev) =>
                      e.target.checked ? [...prev, val] : prev.filter((x) => x !== val),
                    );
                  }}
                >
                  {label}
                </Checkbox>
              </div>
            );
          })}
          {!filteredCompanies.length && (
            <Typography.Text type="secondary">No companies found.</Typography.Text>
          )}
        </div>
        <div style={{ marginTop: 8 }}>
          <Typography.Text type="secondary">Selected: {selectedCompanyIds.length}</Typography.Text>
        </div>
      </Modal>
    </div>
  );
}
