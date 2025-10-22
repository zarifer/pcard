import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Typography,
  Form,
  Input,
  Button,
  Space,
  Avatar,
  Tooltip,
  Divider,
  Upload,
  Image,
  Row,
  Col,
  message,
} from "antd";
import { useApiUrl } from "@refinedev/core";
import axios from "axios";
import {
  QuestionCircleOutlined,
  UploadOutlined,
  CheckCircleTwoTone,
} from "@ant-design/icons";
import { useGetIdentity } from "@refinedev/core";

type Me = {
  email: string;
  name?: string;
  avatar?: string;
  picture?: string;
  mustChangePassword?: boolean;
} | null;

const PRESET_AVATARS = [
  "/avatars/avatar1.png",
  "/avatars/avatar2.png",
  "/avatars/avatar3.png",
  "/avatars/avatar4.png",
  "/avatars/avatar5.png",
  "/avatars/avatar6.png",
  "/avatars/avatar7.png",
  "/avatars/avatar8.png",
  "/avatars/avatar9.png",
  "/avatars/avatar10.png",
  "/avatars/avatar11.png",
  "/avatars/avatar12.png",
];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

export const Profile: React.FC = () => {
  const API_URL = useApiUrl();
  const [me, setMe] = useState<Me>(null);
  const [loadingMe, setLoadingMe] = useState<boolean>(true);
  const [savingProfile, setSavingProfile] = useState<boolean>(false);
  const [changingPass, setChangingPass] = useState<boolean>(false);

  const [selectedAvatar, setSelectedAvatar] = useState<string>("");

  const [formProfile] = Form.useForm();
  const [formPass] = Form.useForm();
  const { refetch: refetchIdentity } = useGetIdentity<any>();

  // read once – ha változtatod máshol a tokent, tedd state-be
  const token = useMemo(() => localStorage.getItem("token") || "", []);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        setLoadingMe(true);
        const r = await axios.get(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (ignore) return;
        const data = r.data || {};
        setMe(data);
        const initialAvatar = data.avatar || data.picture || "";
        setSelectedAvatar(initialAvatar);
        formProfile.setFieldsValue({
          name: data.name || "",
          avatar: initialAvatar,
        });
      } catch (e: any) {
        message.error(e?.response?.data?.error || "Failed to load profile");
      } finally {
        if (!ignore) setLoadingMe(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [API_URL, token, formProfile]);

  // form érték szinkronban tartása a kiválasztott avatar state-tel
  useEffect(() => {
    formProfile.setFieldsValue({ avatar: selectedAvatar });
  }, [selectedAvatar, formProfile]);

  const email = me?.email || "";
  const isFirstLogin = !!me?.mustChangePassword;

  const saveProfile = async (values: { name?: string; avatar?: string }) => {
    try {
      setSavingProfile(true);
      const r = await axios.patch(
        `${API_URL}/me`,
        {
          name: values.name ?? me?.name ?? "",
          avatar: selectedAvatar || values.avatar || "",
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const updated = r.data || {};
      const u = localStorage.getItem("user");
      if (u) {
        const parsed = JSON.parse(u);
        localStorage.setItem(
          "user",
          JSON.stringify({
            ...parsed,
            name: updated.name,
            avatar: updated.avatar,
            picture: updated.avatar || parsed.picture,
          }),
        );
      }

      setMe((prev) => ({ ...(prev as any), ...updated }));
      await refetchIdentity?.();
      message.success("Profile updated");
    } catch (e: any) {
      message.error(e?.response?.data?.error || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (vals: {
    currentPassword?: string;
    newPassword: string;
    confirm: string;
  }) => {
    if (vals.newPassword !== vals.confirm) {
      return message.error("New password confirmation does not match");
    }
    try {
      setChangingPass(true);
      if (isFirstLogin) {
        // First-login flow (/auth/set-password)
        await axios.post(
          `${API_URL}/auth/set-password`,
          { newPassword: vals.newPassword },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        message.success("Password set");
        setMe((prev) => ({ ...(prev as any), mustChangePassword: false }));
      } else {
        // Normal flow (/auth/change-password)
        const cur = vals.currentPassword || "";
        await axios.post(
          `${API_URL}/auth/change-password`,
          {
            currentPassword: cur,
            newPassword: vals.newPassword,
          },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        message.success("Password changed");
      }
      formPass.resetFields();
    } catch (e: any) {
      message.error(e?.response?.data?.error || "Failed to change password");
    } finally {
      setChangingPass(false);
    }
  };

  return (
    <div className="vb-profile">
      <Typography.Title level={2} className="vb-profile__title">
        My Profile
      </Typography.Title>

      <Card loading={loadingMe} className="vb-profile__card">
        <Space align="center" size={16} style={{ marginBottom: 16 }}>
          <Avatar
            size={72}
            src={selectedAvatar || me?.avatar || me?.picture}
            alt="Profile picture"
          >
            {(me?.name?.[0] || me?.email?.[0] || "U").toUpperCase()}
          </Avatar>
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {me?.name || email.split("@")[0]}
            </Typography.Title>
            <Space size={6} align="center">
              <Typography.Text type="secondary">{email}</Typography.Text>
              <Tooltip title="To change your email, please contact the system administrator.">
                <QuestionCircleOutlined style={{ color: "#999" }} />
              </Tooltip>
            </Space>
          </div>
        </Space>

        <Divider />

        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Typography.Title level={4}>Profile Picture</Typography.Title>

            <div className="vb-profile__hint">
              Choose from presets or upload from your device.
            </div>

            <div className="vb-profile__avatar-grid" role="list">
              {PRESET_AVATARS.map((src) => {
                const selected = selectedAvatar === src;
                return (
                  <button
                    key={src}
                    onClick={() => setSelectedAvatar(src)}
                    className={`vb-profile__avatar-btn${
                      selected ? " is-selected" : ""
                    }`}
                    aria-label="Choose avatar"
                    role="listitem"
                    type="button"
                  >
                    <Image
                      src={src}
                      alt="avatar"
                      preview={false}
                      width="100%"
                      height="100%"
                      style={{ objectFit: "cover" }}
                    />
                    {selected && (
                      <CheckCircleTwoTone
                        twoToneColor="#8b5cf6"
                        className="vb-profile__avatar-check"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: 12 }}>
              <Upload
                accept="image/*"
                maxCount={1}
                showUploadList={false}
                beforeUpload={async (file) => {
                  const isOk = file.type.startsWith("image/");
                  if (!isOk) {
                    message.error("Please select an image file");
                    return Upload.LIST_IGNORE;
                  }
                  const b64 = await fileToBase64(file);
                  setSelectedAvatar(String(b64));
                  return Upload.LIST_IGNORE; // prevent actual upload
                }}
              >
                <Button icon={<UploadOutlined />}>Upload from device</Button>
              </Upload>
            </div>

            <Form
              form={formProfile}
              layout="vertical"
              onFinish={saveProfile}
              style={{ marginTop: 16 }}
              requiredMark={false}
              className="vb-profile__form"
            >
              <Form.Item name="name" label="Display Name">
                <Input placeholder="Your name" />
              </Form.Item>
              {/* Hidden field to keep value in sync if needed */}
              <Form.Item name="avatar" hidden>
                <Input />
              </Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={savingProfile}
                className="vb-profile__save-btn"
              >
                Save Profile
              </Button>
            </Form>
          </Col>

          <Col xs={24} md={12}>
            <Typography.Title level={4}>Change Password</Typography.Title>
            {isFirstLogin ? (
              <>
                <Typography.Paragraph
                  type="secondary"
                  style={{ marginTop: -4 }}
                >
                  Please set your password. You’ll need to enter it twice to
                  confirm.
                </Typography.Paragraph>
                <Form
                  form={formPass}
                  layout="vertical"
                  onFinish={changePassword}
                  requiredMark={false}
                >
                  <Form.Item
                    label="New Password"
                    name="newPassword"
                    rules={[
                      { required: true, message: "New password is required" },
                    ]}
                  >
                    <Input.Password autoComplete="new-password" />
                  </Form.Item>
                  <Form.Item
                    label="Confirm New Password"
                    name="confirm"
                    dependencies={["newPassword"]}
                    rules={[
                      {
                        required: true,
                        message: "Please confirm the new password",
                      },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (
                            !value ||
                            getFieldValue("newPassword") === value
                          ) {
                            return Promise.resolve();
                          }
                          return Promise.reject(
                            new Error(
                              "New password confirmation does not match",
                            ),
                          );
                        },
                      }),
                    ]}
                  >
                    <Input.Password autoComplete="new-password" />
                  </Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={changingPass}
                  >
                    Set Password
                  </Button>
                </Form>
              </>
            ) : (
              <>
                <Typography.Paragraph
                  type="secondary"
                  style={{ marginTop: -4 }}
                >
                  Enter your current password, then set a new one twice.
                </Typography.Paragraph>
                <Form
                  form={formPass}
                  layout="vertical"
                  onFinish={changePassword}
                  requiredMark={false}
                >
                  <Form.Item
                    label="Current Password"
                    name="currentPassword"
                    rules={[
                      {
                        required: true,
                        message: "Current password is required",
                      },
                    ]}
                  >
                    <Input.Password autoComplete="current-password" />
                  </Form.Item>
                  <Form.Item
                    label="New Password"
                    name="newPassword"
                    rules={[
                      { required: true, message: "New password is required" },
                    ]}
                  >
                    <Input.Password autoComplete="new-password" />
                  </Form.Item>
                  <Form.Item
                    label="Confirm New Password"
                    name="confirm"
                    dependencies={["newPassword"]}
                    rules={[
                      {
                        required: true,
                        message: "Please confirm the new password",
                      },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (
                            !value ||
                            getFieldValue("newPassword") === value
                          ) {
                            return Promise.resolve();
                          }
                          return Promise.reject(
                            new Error(
                              "New password confirmation does not match",
                            ),
                          );
                        },
                      }),
                    ]}
                  >
                    <Input.Password autoComplete="new-password" />
                  </Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={changingPass}
                  >
                    Change Password
                  </Button>
                </Form>
              </>
            )}
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default Profile;
