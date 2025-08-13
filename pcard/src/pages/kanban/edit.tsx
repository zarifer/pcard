import { useShow, useUpdate, useGetIdentity } from "@refinedev/core";
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
} from "antd";
import dayjs, { Dayjs } from "dayjs";
import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import axios from "axios";
import { useApiUrl } from "@refinedev/core";

/* ALL COMMENTS IN ENGLISH AND CAPS LOCK AS REQUESTED */

type ColumnId = "todo" | "in-progress" | "review" | "waiting-vendor" | "done";

type KanbanItem = {
  id: string;
  title: string;
  description?: string;
  stage: ColumnId;
  dueDate?: string | null /* ISO */;
  calendarId?: string | null /* LINKED CALENDAR ENTRY */;
  comments?: Array<{
    id: string;
    text: string /* MARKDOWN OR PLAIN */;
    at: string /* ISO DATE */;
    authorName?: string;
    authorEmail?: string;
    authorAvatar?: string;
  }>;
};

/* TINY HELPERS */
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
  /* API BASE URL FOR SILENT CALENDAR CALLS */
  const API_URL = useApiUrl();

  /* LOAD CARD */
  const { queryResult } = useShow<KanbanItem>({
    resource: "kanban",
    id: cardId,
  });
  const item = queryResult?.data?.data;

  /* MUTATION FOR KANBAN (THIS ONE SHOWS A SINGLE TOAST) */
  const { mutate: updateCard } = useUpdate();

  /* USER IDENTITY FOR COMMENTS */
  const { data: identity } = useGetIdentity<any>();

  /* INLINE TITLE STATE */
  const [title, setTitle] = useState("");
  const [titleEditing, setTitleEditing] = useState(false);

  /* DESCRIPTION STATE (TOGGLE VIEW/EDIT) */
  const [descEdit, setDescEdit] = useState(false);
  const [desc, setDesc] = useState("");

  /* COMMENTS STATE */
  const [commentText, setCommentText] = useState("");

  /* DUE DATE STATE */
  const [due, setDue] = useState<Dayjs | null>(null);

  useEffect(() => {
    if (!item) return;
    setTitle(item.title || "");
    setDesc(item.description || "");
    setDue(item.dueDate ? dayjs(item.dueDate) : null);
  }, [item?.id]);

  if (!visible || !item) return null;

  /* SAVE TITLE QUICKLY */
  const saveTitle = () => {
    const clean = sanitize(title).slice(0, 160);
    if (!clean || clean === item.title) return setTitleEditing(false);
    updateCard(
      { resource: "kanban", id: item.id, values: { title: clean } },
      { onSuccess: () => setTitleEditing(false) },
    );
  };

  /* SAVE DESCRIPTION */
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
    };
    const next = [...(item.comments || []), newComment];

    updateCard(
      { resource: "kanban", id: item.id, values: { comments: next } },
      {
        onSuccess: () => setCommentText(""),
        onError: () => message.error("FAILED TO ADD COMMENT."),
      },
    );
  };

  /* SYNC DUE DATE WITH CALENDAR – SILENT CALENDAR CALLS, ONE REFINe TOAST */
  const syncDueDate = async (value: Dayjs | null) => {
    const nextIso = value ? value.toDate().toISOString() : null;

    /* UPDATE KANBAN FIRST (THIS TRIGGERS ONE SUCCESS TOAST) */
    updateCard(
      { resource: "kanban", id: item.id, values: { dueDate: nextIso } },
      {
        onSuccess: async () => {
          try {
            if (!nextIso) {
              /* REMOVE CALENDAR ENTRY IF ANY (SILENT) */
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
              /* UPDATE EXISTING CALENDAR ENTRY (SILENT) */
              await axios.patch(`${API_URL}/calendar/${item.calendarId}`, {
                title: sanitize(title || item.title),
                date: dateRange,
                type: "Kanban",
              });
            } else {
              /* CREATE NEW CAL ENTRY + LINK BACK TO CARD (SILENT) */
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
            message.error("CALENDAR SYNC FAILED.");
          }
        },
      },
    );
  };

  return (
    <Drawer
      open={visible}
      onClose={onClose}
      width={720}
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
              onKeyDown={(e) => {
                if (e.key === "Escape") setTitleEditing(false);
              }}
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

          <div style={{ marginLeft: "auto" }}>
            <Space>
              <DatePicker
                value={due}
                onChange={(d) => {
                  setDue(d);
                  /* IMMEDIATE SYNC – NO EXTRA SAVE BUTTON */
                  syncDueDate(d || null);
                }}
                placeholder="Due date"
              />
            </Space>
          </div>
        </div>
      }
    >
      <div style={{ padding: 24, display: "grid", gap: 20 }}>
        {/* DESCRIPTION – CLICK TO EDIT */}
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
              <Input.TextArea
                autoSize={{ minRows: 6 }}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
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

        {/* COMMENTS */}
        <section>
          <Typography.Title level={5}>Comments</Typography.Title>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <Avatar src={identity?.avatar || identity?.picture}>
              {(identity?.name?.[0] || "U").toUpperCase()}
            </Avatar>
            <Input.TextArea
              placeholder="Write a comment (markdown supported)…"
              autoSize={{ minRows: 2, maxRows: 5 }}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <Button type="primary" onClick={addComment}>
              Post
            </Button>
          </div>

          <List
            dataSource={[...(item.comments || [])].reverse()}
            locale={{ emptyText: "No comments yet." }}
            renderItem={(c) => (
              <List.Item>
                <List.Item.Meta
                  avatar={
                    <Avatar src={c.authorAvatar}>
                      {(c.authorName?.[0] || "?").toUpperCase()}
                    </Avatar>
                  }
                  title={
                    <Space size={8}>
                      <span style={{ fontWeight: 600 }}>
                        {c.authorName || "User"}
                      </span>
                      <Tag color="default" style={{ marginLeft: 8 }}>
                        {new Date(c.at).toLocaleString()}
                      </Tag>
                    </Space>
                  }
                  description={
                    <div className="markdown-body">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {c.text}
                      </ReactMarkdown>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </section>
      </div>
    </Drawer>
  );
}
