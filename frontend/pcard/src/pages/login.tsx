import { useEffect, useRef } from "react";
import { useLogin } from "@refinedev/core";

import { ThemedTitleV2 } from "@refinedev/antd";
import { Typography, Layout, Space } from "antd";

import { CredentialResponse } from "../interfaces/google"; 

// Todo: Update your Google Client ID here
const GOOGLE_CLIENT_ID = "1041339102270-e1fpe2b6v6u1didfndh7jkjmpcashs4f.apps.googleusercontent.com";

export const Login: React.FC = () => {
    const { mutate: login } = useLogin<CredentialResponse>();

    const GoogleButton = (): JSX.Element => {
        const divRef = useRef<HTMLDivElement>(null);

        useEffect(() => {
            if (
                typeof window === "undefined" ||
                !window.google ||
                !divRef.current
            ) {
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
                    theme: "filled_blue",
                    size: "medium",
                    type: "standard",
                });
            } catch (error) {
                console.log(error);
            }
        }, []);

        return <div ref={divRef} />;
    };


        return (
            <Layout
            style={{
                height: "100vh",
                justifyContent: "center",
                alignItems: "center",
            }}
            >
            <Space direction="vertical" align="center">
                <ThemedTitleV2
                collapsed={false}
                wrapperStyles={{
                    fontSize: "22px",
                    marginBottom: "36px",
                }}
                />
                <GoogleButton />
                <Typography.Text type="secondary">
                Powered by
          <img
            style={{ padding: "0 5px" }}
            alt="Google"
            src="https://refine.ams3.cdn.digitaloceanspaces.com/superplate-auth-icons%2Fgoogle.svg"
          />
          Google
                </Typography.Text>
            </Space>
            </Layout>
        );
    

};
