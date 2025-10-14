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
import {
  useUpdate,
  useDelete,
  useInvalidate,
  useGetIdentity,
} from "@refinedev/core";
import dayjs, { Dayjs } from "dayjs";
import React, { useEffect, useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import axios from "axios";
import { useApiUrl } from "@refinedev/core";
import { DeleteOutlined } from "@ant-design/icons";
import SimpleMDE from "react-simplemde-editor";
import "easymde/dist/easymde.min.css";
import { useCalendarLogger } from "../calendar/calendarlogger";

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

  const [comments, setComments] = useState<KanbanItem["comments"]>([]);

  const [item, setItem] = useState<KanbanItem | null>(null);

  const { log } = useCalendarLogger();

  useEffect(() => {
    if (!cardId) return;
    axios.get(`${API_URL}/kanban/${cardId}`).then((r) => {
      const c = r.data as KanbanItem;
      setItem(c);
      setTitle(c.title || "");
      setDesc(c.description || "");
      setDue(c.dueDate ? dayjs(c.dueDate) : null);
      setChecklist(c.checklist || []);
      setComments(c.comments || []);
    });
  }, [cardId, API_URL]);

  const isOverdue = useMemo(
    () => !!item?.dueDate && dayjs(item.dueDate).isBefore(dayjs(), "day"),
    [item?.dueDate],
  );

  const sortedComments = useMemo(() => {
    const arr = [...(comments || [])];
    return arr.sort((a, b) => {
      if (!!a.pinned && !b.pinned) return -1;
      if (!a.pinned && !!b.pinned) return 1;
      return new Date(b.at).getTime() - new Date(a.at).getTime();
    });
  }, [comments]);

  if (!visible || !item) return null;

  const saveTitle = () => {
    const clean = sanitize(title).slice(0, 160);
    if (!clean || clean === item.title) return setTitleEditing(false);
    updateCard(
      { resource: "kanban", id: item.id, values: { title: clean } },
      { onSuccess: () => setTitleEditing(false) },
    );
    log({ title, description: `Edited title in ${item.stage || "Unknown"}` });
  };

  const saveDescription = () => {
    const clean = sanitize(desc);
    updateCard(
      { resource: "kanban", id: item.id, values: { description: clean } },
      { onSuccess: () => setDescEdit(false) },
    );
    log({
      title: item.title,
      description: `Edited description in ${item.stage || "Unknown"}`,
    });
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
    const next = [...(comments || []), newComment];
    updateCard(
      { resource: "kanban", id: item.id, values: { comments: next } },
      {
        onSuccess: () => {
          setCommentText("");
          setComments(next);
          log({
            title: item.title,
            description: `Added comment in ${item.stage || "Unknown"}`,
          });
        },
        onError: () => message.error("Failed to add comment."),
      },
    );
  };

  const togglePin = (cid: string) => {
    const next = (comments || []).map((c) =>
      c.id === cid ? { ...c, pinned: !c.pinned } : c,
    );
    setComments(next);
    updateCard({ resource: "kanban", id: item.id, values: { comments: next } });
    log({
      title: item.title,
      description: `Edited pin on a comment in ${item.stage || "Unknown"}`,
    });
  };

  const deleteOwnComment = (cid: string) => {
    const target = (comments || []).find((c) => c.id === cid);
    const me = identity?.email;
    if (!target || !me || target.authorEmail !== me) {
      message.warning("You can only delete your OWN comments.");
      return;
    }
    const next = (comments || []).filter((c) => c.id !== cid);
    setComments(next);
    updateCard({ resource: "kanban", id: item.id, values: { comments: next } });
    log({
      title: item.title,
      description: `Deleted the comment in ${item.stage || "Unknown"}`,
    });
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
    log({
      title: item.title,
      description: `Added checklist item in ${item.stage || "Unknown"}`,
    });
  };

  const toggleChecklistItem = (id: string, done: boolean) => {
    const next = checklist.map((c) => (c.id === id ? { ...c, done } : c));
    persistChecklist(next);
    log({
      title: item.title,
      description: `Toggled a checklist item in ${item.stage || "Unknown"}`,
    });
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
    log({
      title: item.title,
      description: `Deleted a checklist item in ${item.stage || "Unknown"}`,
    });
  };

  const doDelete = () =>
    deleteCard(
      { resource: "kanban", id: item.id },
      {
        onSuccess: () => {
          invalidate({ resource: "kanban", invalidates: ["list"] });
          log({
            title: item.title,
            description: `Deleted from ${item.stage || "Unknown"}`,
          });
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
            <Typography.Text type="secondary">Due Date</Typography.Text>
            <DatePicker
              value={due}
              onChange={(d) => {
                setDue(d);
                const iso = d ? d.toDate().toISOString() : null;
                updateCard({
                  resource: "kanban",
                  id: item.id,
                  values: { dueDate: iso },
                });
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
