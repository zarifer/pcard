import {
  type PropsWithChildren,
  createContext,
  useEffect,
  useState,
} from "react";
import { ConfigProvider, theme } from "antd";
import { RefineThemes } from "@refinedev/antd";

type ColorModeContextType = {
  mode: string;
  setMode: (mode: string) => void;
};

export const ColorModeContext = createContext<ColorModeContextType>(
  {} as ColorModeContextType,
);

export const ColorModeContextProvider: React.FC<PropsWithChildren> = ({
  children,
}) => {
  const colorModeFromLocalStorage = localStorage.getItem("colorMode");
  const isSystemPreferenceDark = window?.matchMedia(
    "(prefers-color-scheme: dark)",
  ).matches;

  const systemPreference = isSystemPreferenceDark ? "dark" : "light";
  const [mode, setMode] = useState(
    colorModeFromLocalStorage || systemPreference,
  );

  useEffect(() => {
    window.localStorage.setItem("colorMode", mode);
    document.body.setAttribute("data-theme", mode);
  }, [mode]);

  const setColorMode = () => {
    if (mode === "light") {
      setMode("dark");
    } else {
      setMode("light");
    }
  };

  const { darkAlgorithm, defaultAlgorithm } = theme;

  return (
    <ColorModeContext.Provider
      value={{
        setMode: setColorMode,
        mode,
      }}
    >
      <ConfigProvider
        theme={{
          ...RefineThemes.Purple,
          algorithm: mode === "light" ? defaultAlgorithm : darkAlgorithm,
          components: {
      Menu: {
        itemBorderRadius: 10,
        itemPaddingInline: 12,
        itemHeight: 40,
        itemHoverBg: "rgba(124,58,237,0.10)",
        itemActiveBg: "rgba(124,58,237,0.18)",
        itemSelectedBg: "rgba(124,58,237,0.22)",
        itemColor: mode === "light" ? "rgba(17,24,39,0.82)" : "rgba(229,231,235,0.75)",
        itemHoverColor: mode === "light" ? "#111827" : "#F9FAFB",
        itemSelectedColor: mode === "light" ? "#111827" : "#FFFFFF",
      },
      Layout: {
        siderBg: mode === "light" ? "#ffffff" : "#111319",
      },
    },
        }}
      >
        {children}
      </ConfigProvider>
    </ColorModeContext.Provider>
  );
};
