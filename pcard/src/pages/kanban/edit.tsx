import {
  useShow,
  useUpdate,
  useGetIdentity,
  useDelete /* ENABLE DELETE CARD */,
  useInvalidate /* TO REFRESH LIST AFTER DELETE */,
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
  Popconfirm /* CONFIRM UI FOR DELETE CARD */,
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

/* ALL COMMENTS IN ENGLISH AND CAPS LOCK AS REQUESTED */

type ColumnId = "todo" | "in-progress" | "review" | "waiting-vendor" | "done";

type KanbanItem = {
  id: string;
  title: string;
  description?: string;
  stage: ColumnId;
  dueDate?: string | null /* ISO */;
  calendarId?: string | null /* LINKED CALENDAR ENTRY */;
  checklist?: Array<{ id: string; text: string; done: boolean }>;
  comments?: Array<{
    id: string;
    text: string /* MARKDOWN OR PLAIN */;
    at: string /* ISO DATE */;
    authorName?: string;
    authorEmail?: string;
    authorAvatar?: string;
    pinned?: boolean /* PINNED COMMENTS FLOAT TO TOP */;
  }>;
};

/* UTILS */
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
  /* API BASE URL FOR CALENDAR SYNC */
  const API_URL = useApiUrl();

  /* LOAD CARD */
  const { queryResult } = useShow<KanbanItem>({
    resource: "kanban",
    id: cardId,
  });
  const item = queryResult?.data?.data;

  /* MUTATIONS */
  const { mutate: updateCard } = useUpdate();
  const { mutate: deleteCard } = useDelete();
  const invalidate = useInvalidate();

  /* USER IDENTITY FOR COMMENTS (TO ALLOW DELETING OWN COMMENTS) */
  const { data: identity } = useGetIdentity<any>();

  /* TITLE STATE */
  const [title, setTitle] = useState("");
  const [titleEditing, setTitleEditing] = useState(false);

  /* DESCRIPTION STATE (MARKDOWN EDITOR) */
  const [descEdit, setDescEdit] = useState(false);
  const [desc, setDesc] = useState("");

  /* COMMENTS STATE */
  const [commentText, setCommentText] = useState("");

  /* DUE DATE STATE */
  const [due, setDue] = useState<Dayjs | null>(null);

  /* CHECKLIST STATE */
  const [checklist, setChecklist] = useState<
    Array<{ id: string; text: string; done: boolean }>
  >([]);

  /* INIT STATE FROM ITEM */
  useEffect(() => {
    if (!item) return;
    setTitle(item.title || "");
    setDesc(item.description || "");
    setDue(item.dueDate ? dayjs(item.dueDate) : null);
    setChecklist(item.checklist || []);
  }, [item?.id]);

  /* OVERDUE FLAG (USED NEAR THE DUE DATE TITLE) */
  const isOverdue = useMemo(
    () => !!item?.dueDate && dayjs(item.dueDate).isBefore(dayjs(), "day"),
    [item?.dueDate],
  );

  /* SORT COMMENTS: PINNED FIRST, THEN NEWEST FIRST */
  const sortedComments = useMemo(() => {
    const arr = [...(item?.comments || [])];
    return arr.sort((a, b) => {
      if (!!a.pinned && !b.pinned) return -1;
      if (!a.pinned && !!b.pinned) return 1;
      return new Date(b.at).getTime() - new Date(a.at).getTime();
    });
  }, [item?.comments]);

  if (!visible || !item) return null;

  /* QUICK SAVE TITLE */
  const saveTitle = () => {
    const clean = sanitize(title).slice(0, 160);
    if (!clean || clean === item.title) return setTitleEditing(false);
    updateCard(
      { resource: "kanban", id: item.id, values: { title: clean } },
      { onSuccess: () => setTitleEditing(false) },
    );
  };

  /* SAVE DESCRIPTION (MARKDOWN TEXT) */
  const saveDescription = () => {
    const clean = sanitize(desc);
    updateCard(
      { resource: "kanban", id: item.id, values: { description: clean } },
      { onSuccess: () => setDescEdit(false) },
    );
  };

  /* ADD COMMENT */
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

  /* PIN / UNPIN COMMENT */
  const togglePin = (cid: string) => {
    const next = (item.comments || []).map((c) =>
      c.id === cid ? { ...c, pinned: !c.pinned } : c,
    );
    updateCard({ resource: "kanban", id: item.id, values: { comments: next } });
  };

  /* DELETE OWN COMMENT ONLY */
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

  /* SYNC DUE DATE WITH CALENDAR (SILENT CALENDAR CALLS) */
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

  /* CHECKLIST HELPERS */
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

  /* DELETE CARD */
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
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
          {/* NOTE: DUE DATE LIVES IN ITS OWN SECTION BELOW DESCRIPTION */}
        </div>
      }
    >
      <div style={{ padding: 20, display: "grid", gap: 16 }}>
        {/* DESCRIPTION – VIEW TO EDIT (MARKDOWN) */}
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

        {/* DUE DATE SECTION WITH INLINE OVERDUE BADGE */}
        <section>
          <Typography.Title level={5} className="section-title-row">
            <span>Due date</span>
            {isOverdue && (
              <Tag color="error" className="overdue-tag">
                Overdue
              </Tag>
            )}
          </Typography.Title>

          <DatePicker
            value={due}
            onChange={(d) => {
              setDue(d);
              syncDueDate(d || null);
            }}
            placeholder="Pick a due date"
            style={{ width: "100%" }}
          />
        </section>

        <Divider style={{ margin: "8px 0 0" }} />

        {/* CHECKLIST – ADD AT BOTTOM, ITEMS FADE/STRIKETHROUGH WHEN DONE */}
        <section>
          <div className="checklist-header">
            <Typography.Title level={5} style={{ margin: 0 }}>
              Checklist
            </Typography.Title>
          </div>

          <div className="checklist-list">
  {checklist.map((c) => (
    <div key={c.id} className={`checklist-item ${c.done ? "done" : ""}`}>
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
    <Button block className="checklist-add-btn" onClick={addChecklistItem}>
      + Add item
    </Button>
  </div>
</div>

        </section>

        <Divider style={{ margin: "8px 0 0" }} />

        {/* COMMENTS WITH PIN & DELETE-OWN */}
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

        {/* BOTTOM ACTIONS – DELETE CARD WITH POPCONFIRM */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Popconfirm
            title="Are you sure?"
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={doDelete}
          >
            <Button danger>Delete card</Button>
          </Popconfirm>
        </div>
      </div>
    </Drawer>
  );
}
