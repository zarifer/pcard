import React from "react";
import { useLogin } from "@refinedev/core";
import { Typography, Card, Form, Input, Button } from "antd";

type LoginParams = { email: string; password: string };

const ALLOWED_DOMAIN = "virusbulletin.com";

export const Login: React.FC = () => {
  const { mutate: login, isLoading } = useLogin<LoginParams>();

  const onFinish = (values: LoginParams) => {
    login(values);
  };

  return (
    <div className="login-root">
      <div className="login-left">
        <img src="/login_bck.png" alt="Background" className="login-bg" />
      </div>
      <div className="login-right">
        <Card className="login-card">
          <Typography.Title level={1} className="login-title">
            Sign In to VB Product Cards
          </Typography.Title>
          <Form
            layout="vertical"
            onFinish={onFinish}
            requiredMark={false}
            style={{ marginTop: 12 }}
          >
            <Form.Item
              label="E-mail"
              name="email"
              rules={[
                { required: true, message: "E-mail is required" },
                { type: "email", message: "Invalid e-mail format" },
                {
                  validator: (_, value) => {
                    const v = String(value || "")
                      .trim()
                      .toLowerCase();
                    if (!v) return Promise.resolve();
                    if (v.endsWith("@" + ALLOWED_DOMAIN))
                      return Promise.resolve();
                    return Promise.reject(
                      new Error(
                        `Only @${ALLOWED_DOMAIN} e-mail addresses are allowed`,
                      ),
                    );
                  },
                },
              ]}
              validateTrigger={["onBlur", "onSubmit"]}
            >
              <Input
                placeholder={`you@${ALLOWED_DOMAIN}`}
                autoComplete="email"
                inputMode="email"
              />
            </Form.Item>

            <Form.Item
              label="Password"
              name="password"
              rules={[{ required: true, message: "Password is required" }]}
            >
              <Input.Password
                placeholder="Password"
                autoComplete="current-password"
              />
            </Form.Item>

            <Button type="primary" htmlType="submit" block loading={isLoading}>
              Sign In
            </Button>
          </Form>

          <div
            style={{ margin: "32px 0 0 0", textAlign: "center", color: "#aaa" }}
          >
            By signing in you agree to the{" "}
            <a href="/login/terms">Terms of Use</a>
            and <a href="/login/privacy">Privacy Policy</a>.
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Login;
