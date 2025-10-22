import type { RefineThemedLayoutV2HeaderProps } from "@refinedev/antd";
import { useGetIdentity } from "@refinedev/core";
import { Avatar, Layout as AntdLayout, Space, Switch, theme } from "antd";
import React, { useContext } from "react";
import { ColorModeContext } from "../../contexts/color-mode";
import { Link } from "react-router-dom";

const { useToken } = theme;

type IUser = {
  id?: number;
  name?: string;
  email?: string;
  avatar?: string;
  picture?: string;
};

export const Header: React.FC<RefineThemedLayoutV2HeaderProps> = ({
  sticky = true,
}) => {
  const { token } = useToken();
  const { data: user } = useGetIdentity<IUser>();
  const { mode, setMode } = useContext(ColorModeContext);

  const headerStyles: React.CSSProperties = {
    backgroundColor: token.colorBgElevated,
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    padding: "0px 24px",
    height: "64px",
  };

  if (sticky) {
    headerStyles.position = "sticky";
    headerStyles.top = 0;
    headerStyles.zIndex = 1;
  }

  return (
    <AntdLayout.Header style={headerStyles}>
      <Space>
        <Switch
          checkedChildren="🌛"
          unCheckedChildren="🔆"
          onChange={() => setMode(mode === "light" ? "dark" : "light")}
          defaultChecked={mode === "dark"}
        />
        <Space style={{ marginLeft: "8px" }} size="middle">
          <Link to="/profile" aria-label="Open profile">
            <Avatar
              size={56}
              src={user?.avatar || user?.picture}
              alt={user?.name || user?.email || "User"}
              style={{ cursor: "pointer" }}
            >
              {(user?.name?.[0] || user?.email?.[0] || "U").toUpperCase()}
            </Avatar>
          </Link>
        </Space>
      </Space>
    </AntdLayout.Header>
  );
};
