import {
  useShow,
  useUpdate,
  useGetIdentity,
  useDelete,
  useInvalidate,
} from "@refinedev/core";
import {
  Drawer,
  Typography,
  Input,
  DatePicker,
  Space,
  Button,
  Divider,
  Avatar,
  List,
  Tag,
  message,
  Checkbox,
  Popconfirm,
} from "antd";
import dayjs, { Dayjs } from "dayjs";
import React, { useEffect, useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import axios from "axios";
import { useApiUrl } from "@refinedev/core";
import { DeleteOutlined } from "@ant-design/icons";
import SimpleMDE from "react-simplemde-editor";
import "easymde/dist/easymde.min.css";

type ColumnId = "todo" | "in-progress" | "review" | "waiting-vendor" | "done";

type KanbanItem = {
  id: string;
  title: string;
  description?: string;
  stage: ColumnId;
  dueDate?: string | null;
  calendarId?: string | null;
  checklist?: Array<{ id: string; text: string; done: boolean }>;
  comments?: Array<{
    id: string;
    text: string;
    at: string;
    authorName?: string;
    authorEmail?: string;
    authorAvatar?: string;
    pinned?: boolean;
  }>;
};

const sanitize = (s: string) => s.replace(/<[^>]*>/g, "").trim();
const rid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function KanbanEdit({
  visible,
  onClose,
  cardId,
}: {
  visible: boolean;
  onClose: () => void;
  cardId: string;
}) {
  const API_URL = useApiUrl();

  const { queryResult } = useShow<KanbanItem>({
    resource: "kanban",
    id: cardId,
  });
  const item = queryResult?.data?.data;

  const { mutate: updateCard } = useUpdate();
  const { mutate: deleteCard } = useDelete();
  const invalidate = useInvalidate();

  const { data: identity } = useGetIdentity<any>();

  const [title, setTitle] = useState("");
  const [titleEditing, setTitleEditing] = useState(false);

  const [descEdit, setDescEdit] = useState(false);
  const [desc, setDesc] = useState("");

  const [commentText, setCommentText] = useState("");

  const [due, setDue] = useState<Dayjs | null>(null);

  const [checklist, setChecklist] = useState<
    Array<{ id: string; text: string; done: boolean }>
  >([]);

  useEffect(() => {
    if (!item) return;
    setTitle(item.title || "");
    setDesc(item.description || "");
    setDue(item.dueDate ? dayjs(item.dueDate) : null);
    setChecklist(item.checklist || []);
  }, [item?.id]);

  const isOverdue = useMemo(
    () => !!item?.dueDate && dayjs(item.dueDate).isBefore(dayjs(), "day"),
    [item?.dueDate],
  );

  const sortedComments = useMemo(() => {
    const arr = [...(item?.comments || [])];
    return arr.sort((a, b) => {
      if (!!a.pinned && !b.pinned) return -1;
      if (!a.pinned && !!b.pinned) return 1;
      return new Date(b.at).getTime() - new Date(a.at).getTime();
    });
  }, [item?.comments]);

  if (!visible || !item) return null;

  const saveTitle = () => {
    const clean = sanitize(title).slice(0, 160);
    if (!clean || clean === item.title) return setTitleEditing(false);
    updateCard(
      { resource: "kanban", id: item.id, values: { title: clean } },
      { onSuccess: () => setTitleEditing(false) },
    );
  };

  const saveDescription = () => {
    const clean = sanitize(desc);
    updateCard(
      { resource: "kanban", id: item.id, values: { description: clean } },
      { onSuccess: () => setDescEdit(false) },
    );
  };

  const addComment = () => {
    const text = sanitize(commentText);
    if (!text) return;
    const newComment = {
      id: rid(),
      text,
      at: new Date().toISOString(),
      authorName:
        identity?.name || identity?.given_name || identity?.email || "You",
      authorEmail: identity?.email,
      authorAvatar: identity?.avatar || identity?.picture,
      pinned: false,
    };
    const next = [...(item.comments || []), newComment];

    updateCard(
      { resource: "kanban", id: item.id, values: { comments: next } },
      {
        onSuccess: () => setCommentText(""),
        onError: () => message.error("Failed to add comment."),
      },
    );
  };

  const togglePin = (cid: string) => {
    const next = (item.comments || []).map((c) =>
      c.id === cid ? { ...c, pinned: !c.pinned } : c,
    );
    updateCard({ resource: "kanban", id: item.id, values: { comments: next } });
  };

  const deleteOwnComment = (cid: string) => {
    const target = (item.comments || []).find((c) => c.id === cid);
    const me = identity?.email;
    if (!target || !me || target.authorEmail !== me) {
      message.warning("You can only delete your OWN comments.");
      return;
    }
    const next = (item.comments || []).filter((c) => c.id !== cid);
    updateCard({ resource: "kanban", id: item.id, values: { comments: next } });
  };

  const syncDueDate = async (value: Dayjs | null) => {
    const nextIso = value ? value.toDate().toISOString() : null;

    updateCard(
      { resource: "kanban", id: item.id, values: { dueDate: nextIso } },
      {
        onSuccess: async () => {
          try {
            if (!nextIso) {
              if (item.calendarId) {
                await axios.delete(`${API_URL}/calendar/${item.calendarId}`);
                await axios.patch(`${API_URL}/kanban/${item.id}`, {
                  calendarId: null,
                });
              }
              return;
            }

            const dateRange = [nextIso, nextIso];

            if (item.calendarId) {
              await axios.patch(`${API_URL}/calendar/${item.calendarId}`, {
                title: sanitize(title || item.title),
                date: dateRange,
                type: "Kanban",
              });
            } else {
              const cres = await axios.post(`${API_URL}/calendar`, {
                title: sanitize(title || item.title),
                date: dateRange,
                type: "Kanban",
                refKanbanId: item.id,
              });
              const calId = cres.data?.id;
              if (calId) {
                await axios.patch(`${API_URL}/kanban/${item.id}`, {
                  calendarId: calId,
                });
              }
            }
          } catch {
            message.error("Calendar sync failed.");
          }
        },
      },
    );
  };

  const persistChecklist = (next: KanbanItem["checklist"]) => {
    setChecklist(next || []);
    updateCard({
      resource: "kanban",
      id: item.id,
      values: { checklist: next },
    });
  };

  const addChecklistItem = () => {
    const next = [...checklist, { id: rid(), text: "", done: false }];
    persistChecklist(next);
  };

  const toggleChecklistItem = (id: string, done: boolean) => {
    const next = checklist.map((c) => (c.id === id ? { ...c, done } : c));
    persistChecklist(next);
  };

  const renameChecklistItem = (id: string, text: string) => {
    const next = checklist.map((c) =>
      c.id === id ? { ...c, text: sanitize(text) } : c,
    );
    persistChecklist(next);
  };

  const deleteChecklistItem = (id: string) => {
    const next = checklist.filter((c) => c.id !== id);
    persistChecklist(next);
  };

  const doDelete = () =>
    deleteCard(
      { resource: "kanban", id: item.id },
      {
        onSuccess: () => {
          invalidate({ resource: "kanban", invalidates: ["list"] });
          onClose();
        },
      },
    );

  return (
    <Drawer
      open={visible}
      onClose={onClose}
      width={560}
      bodyStyle={{ padding: 0, background: "var(--card-bg)" }}
      closable={false}
      title={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {titleEditing ? (
              <Input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onPressEnter={saveTitle}
                onBlur={saveTitle}
                onKeyDown={(e) => e.key === "Escape" && setTitleEditing(false)}
                style={{ fontWeight: 700 }}
              />
            ) : (
              <>
                <Typography.Text strong style={{ fontSize: 16 }}>
                  {item.title}
                </Typography.Text>
                <Button type="link" onClick={() => setTitleEditing(true)}>
                  ✎
                </Button>
              </>
            )}
          </div>
          <Space size={8}>
            {isOverdue && <Tag color="error">Overdue</Tag>}
            <DatePicker
              value={due}
              onChange={(d) => {
                setDue(d);
                syncDueDate(d || null);
              }}
              placeholder="Due date"
              allowClear
            />
          </Space>
        </div>
      }
      footer={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Popconfirm
            title="Are you sure?"
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={doDelete}
          >
            <Button danger>Delete card</Button>
          </Popconfirm>
          <Space>
            <Button onClick={onClose}>Cancel</Button>
          </Space>
        </div>
      }
    >
      <div style={{ padding: 20, display: "grid", gap: 16 }}>
        <section>
          <Typography.Title level={5} style={{ marginTop: 0 }}>
            Description
          </Typography.Title>

          {!descEdit ? (
            <div
              className="markdown-body"
              onClick={() => setDescEdit(true)}
              style={{
                background: "var(--card-bg)",
                border: "1px solid #eae6ff22",
                borderRadius: 8,
                padding: 12,
                minHeight: 120,
                cursor: "text",
              }}
              title="Click to edit"
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {desc || "_No description yet. Click to edit._"}
              </ReactMarkdown>
            </div>
          ) : (
            <div>
              <SimpleMDE
                value={desc}
                onChange={(v: React.SetStateAction<string>) => setDesc(v)}
                options={{
                  spellChecker: false,
                  status: false,
                  autofocus: true,
                  placeholder: "Write markdown…",
                  minHeight: "180px",
                  toolbar: [
                    "bold",
                    "italic",
                    "strikethrough",
                    "|",
                    "heading",
                    "|",
                    "link",
                    "quote",
                    "code",
                    "table",
                    "image",
                    "|",
                    "unordered-list",
                    "ordered-list",
                    "clean-block",
                    "|",
                    "guide",
                  ],
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                  marginTop: 8,
                }}
              >
                <Button
                  onClick={() => {
                    setDesc(item.description || "");
                    setDescEdit(false);
                  }}
                >
                  Cancel
                </Button>
                <Button type="primary" onClick={saveDescription}>
                  Save
                </Button>
              </div>
            </div>
          )}
        </section>

        <Divider style={{ margin: "8px 0 0" }} />

        <section>
          <div className="checklist-header">
            <Typography.Title level={5} style={{ margin: 0 }}>
              Checklist
            </Typography.Title>
          </div>

          <div className="checklist-list">
            {checklist.map((c) => (
              <div
                key={c.id}
                className={`checklist-item ${c.done ? "done" : ""}`}
              >
                <Checkbox
                  checked={c.done}
                  onChange={(e) => toggleChecklistItem(c.id, e.target.checked)}
                />
                <Input
                  className="checklist-input"
                  value={c.text}
                  onChange={(e) => renameChecklistItem(c.id, e.target.value)}
                  placeholder="Checklist item…"
                />
                <Button
                  className="icon-btn"
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => deleteChecklistItem(c.id)}
                  aria-label="Delete"
                />
              </div>
            ))}
            <div className="checklist-add-row">
              <Button
                block
                className="checklist-add-btn"
                onClick={addChecklistItem}
              >
                + Add item
              </Button>
            </div>
          </div>
        </section>

        <Divider style={{ margin: "8px 0 0" }} />

        <section>
          <Typography.Title level={5}>Comments</Typography.Title>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <Avatar src={identity?.avatar || identity?.picture}>
              {(identity?.name?.[0] || "U").toUpperCase()}
            </Avatar>
            <Input.TextArea
              placeholder="Write a comment…"
              autoSize={{ minRows: 2, maxRows: 5 }}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <Button type="primary" onClick={addComment}>
              Post
            </Button>
          </div>

          <List
            dataSource={sortedComments}
            locale={{ emptyText: "No comments yet." }}
            renderItem={(c) => {
              const mine =
                !!identity?.email && c.authorEmail === identity.email;
              return (
                <List.Item
                  className={`comment-item ${c.pinned ? "pinned" : ""}`}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar src={c.authorAvatar}>
                        {(c.authorName?.[0] || "?").toUpperCase()}
                      </Avatar>
                    }
                    title={
                      <Space
                        size={8}
                        style={{
                          width: "100%",
                          justifyContent: "space-between",
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>
                          {c.authorName || "User"}{" "}
                          {c.pinned && <Tag color="gold">Pinned</Tag>}
                        </span>
                        <div className="comment-actions">
                          <Button
                            size="small"
                            type="link"
                            onClick={() => togglePin(c.id)}
                          >
                            {c.pinned ? "Unpin" : "Pin"}
                          </Button>
                          {mine && (
                            <Button
                              size="small"
                              danger
                              type="link"
                              onClick={() => deleteOwnComment(c.id)}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </Space>
                    }
                    description={
                      <div className="markdown-body">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {c.text}
                        </ReactMarkdown>
                        <Tag color="default" style={{ marginTop: 6 }}>
                          {new Date(c.at).toLocaleString()}
                        </Tag>
                      </div>
                    }
                  />
                </List.Item>
              );
            }}
          />
        </section>
      </div>
    </Drawer>
  );
}
