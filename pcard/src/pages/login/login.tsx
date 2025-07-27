import { useEffect, useRef } from "react";
import { useLogin } from "@refinedev/core";
import { Typography, Card } from "antd";
import { CredentialResponse } from "../../interfaces/google";

// Google client ID
const GOOGLE_CLIENT_ID =
  "979184695640-8k3tsbn5r11b7cf4ahsdrrj6p123o31i.apps.googleusercontent.com";

export const Login: React.FC = () => {
  const { mutate: login } = useLogin<CredentialResponse>();

  const GoogleButton = (): JSX.Element => {
    const divRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (typeof window === "undefined" || !window.google || !divRef.current) {
        return;
      }
      try {
        window.google.accounts.id.initialize({
          ux_mode: "popup",
          client_id: GOOGLE_CLIENT_ID,
          callback: async (res: CredentialResponse) => {
            if (res.credential) {
              login(res);
            }
          },
        });
        window.google.accounts.id.renderButton(divRef.current, {
          type: "standard",
          theme: "filled_blue",
          size: "large",
          shape: "pill",
          width: "300",
        });
      } catch (error) {
        console.log(error);
      }
    }, []);

    return <div ref={divRef} />;
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
          <div className="google-btn-wrapper">
            <GoogleButton />
          </div>
          <div
            style={{ margin: "32px 0 0 0", textAlign: "center", color: "#aaa" }}
          >
            By registering you with our{" "}
            <a href="#" style={{ color: "#bc80fc" }}>
              Terms
            </a>{" "}
            and{" "}
            <a href="#" style={{ color: "#bc80fc" }}>
              Conditions
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Login;
