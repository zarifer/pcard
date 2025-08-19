import { Refine, Authenticated, AuthBindings } from "@refinedev/core";
import { DevtoolsPanel, DevtoolsProvider } from "@refinedev/devtools";
import { RefineKbarProvider } from "@refinedev/kbar";
import {
  ErrorComponent,
  useNotificationProvider,
  ThemedLayoutV2,
  ThemedSiderV2,
} from "@refinedev/antd";
import "@refinedev/antd/dist/reset.css";
import dataProvider from "@refinedev/simple-rest";
import { App as AntdApp } from "antd";
import { BrowserRouter, Route, Routes, Outlet } from "react-router-dom";
import routerBindings, {
  NavigateToResource,
  CatchAllNavigate,
  UnsavedChangesNotifier,
  DocumentTitleHandler,
} from "@refinedev/react-router";
import axios from "axios";
import { ColorModeContextProvider } from "./contexts/color-mode";
import { Header } from "./components/header";
import { Helmet } from "react-helmet";
import { CredentialResponse } from "./interfaces/google";
import { parseJwt } from "./utils/parse-jwt";

//Login imports
import { Login } from "./pages/login";

//Calendar imports
import CalendarList from "./pages/calendar/list";
import CalendarCreate from "./pages/calendar/create";
import CalendarEdit from "./pages/calendar/edit";

//Companies imports
import CompanyList from "./pages/companies/list";
import CompanyCreate from "./pages/companies/create";
import CompanyEdit from "./pages/companies/edit";
import CompanyShow from "./pages/companies/show";

//Incident logs import
import {
  IncidentLogList,
  IncidentLogCreate,
  IncidentLogEdit,
  IncidentLogShow,
} from "./pages/incident-logs";

//Kanban imports
import KanbanList from "./pages/kanban/list";

const axiosInstance = axios.create();
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (config.headers) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

// Logo + company name
const LogoTitle = () => (
  <a href="/" style={{ display: "flex", alignItems: "center" }}>
    <img
      src="/logo.png"
      alt="VirusBulletin"
      style={{ height: 32, marginRight: 8 }}
    />
  </a>
);

function App() {
  const authProvider: AuthBindings = {
    login: async ({ credential }: CredentialResponse) => {
      const profileObj = credential ? parseJwt(credential) : null;
      if (profileObj) {
        localStorage.setItem(
          "user",
          JSON.stringify({
            ...profileObj,
            avatar: profileObj.picture,
          }),
        );
        localStorage.setItem("token", `${credential}`);
        return {
          success: true,
          redirectTo: "/",
        };
      }
      return {
        success: false,
      };
    },
    logout: async () => {
      const token = localStorage.getItem("token");
      if (token && typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        axios.defaults.headers.common = {};
        window.google?.accounts.id.revoke(token, () => {
          return {};
        });
      }
      return {
        success: true,
        redirectTo: "/login",
      };
    },
    onError: async (error) => {
      console.error(error);
      return { error };
    },
    check: async () => {
      const token = localStorage.getItem("token");
      if (token) {
        return {
          authenticated: true,
        };
      }
      return {
        authenticated: false,
        error: {
          message: "Check failed",
          name: "Token not found",
        },
        logout: true,
        redirectTo: "/login",
      };
    },
    getPermissions: async () => null,
    getIdentity: async () => {
      const user = localStorage.getItem("user");
      if (user) {
        return JSON.parse(user);
      }
      return null;
    },
  };

  return (
    <>
      <Helmet>
        <title>VirusBulletin</title>
        <link rel="icon" type="image/png" href="/favicon.png" />
      </Helmet>
      <BrowserRouter>
        <RefineKbarProvider>
          <ColorModeContextProvider>
            <AntdApp>
              <DevtoolsProvider>
                <Refine
                  dataProvider={dataProvider("http://localhost:3001")}
                  notificationProvider={useNotificationProvider}
                  routerProvider={routerBindings}
                  authProvider={authProvider}
                  resources={[
                    {
                      name: "companies",
                      list: "/companies",
                      create: "/companies/create",
                      edit: "/companies/edit/:id",
                      show: "/companies/show/:id",
                      meta: { canDelete: true, label: "Companies" },
                    },
                    {
                      name: "incident_logs",
                      list: "/incident-logs",
                      create: "/incident-logs/create",
                      edit: "/incident-logs/edit/:id",
                      show: "/incident-logs/show/:id",
                      meta: { canDelete: true, label: "Incident Logs" },
                    },
                    {
                      name: "kanban",
                      list: "/kanban",
                      meta: { canDelete: true, label: "Kanban Board" },
                    },
                    {
                      name: "calendar",
                      list: "/calendar",
                      create: "/calendar/create",
                      edit: "/calendar/edit/:id",
                      meta: { canDelete: true, label: "Calendar" },
                    },
                  ]}
                  options={{
                    syncWithLocation: true,
                    warnWhenUnsavedChanges: true,
                    useNewQueryKeys: true,
                    projectId: "5zfHVV-J9HiD2-0sf6xU",
                  }}
                >
                  <Routes>
                    <Route
                      element={
                        <Authenticated
                          key="authenticated-inner"
                          fallback={<CatchAllNavigate to="/login" />}
                        >
                          <ThemedLayoutV2
                            Title={LogoTitle}
                            Header={Header}
                            Sider={(props) => (
                              <ThemedSiderV2 {...props} fixed />
                            )}
                          >
                            <Outlet />
                          </ThemedLayoutV2>
                        </Authenticated>
                      }
                    >
                      <Route
                        index
                        element={
                          <NavigateToResource resource="incident_logs" />
                        }
                      />
                      <Route path="/calendar">
                        <Route index element={<CalendarList />} />
                        <Route path="create" element={<CalendarCreate />} />
                        <Route path="edit/:id" element={<CalendarEdit />} />
                      </Route>
                      <Route path="/companies">
                        <Route index element={<CompanyList />} />
                        <Route path="create" element={<CompanyCreate />} />
                        <Route path="edit/:id" element={<CompanyEdit />} />
                        <Route path="show/:id" element={<CompanyShow />} />
                      </Route>
                      <Route path="/incident-logs">
                        <Route index element={<IncidentLogList />} />
                        <Route path="create" element={<IncidentLogCreate />} />
                        <Route path="edit/:id" element={<IncidentLogEdit />} />
                        <Route path="show/:id" element={<IncidentLogShow />} />
                      </Route>
                      <Route path="/kanban">
                        <Route index element={<KanbanList />} />
                      </Route>
                      <Route path="*" element={<ErrorComponent />} />
                    </Route>
                    <Route
                      element={
                        <Authenticated
                          key="authenticated-outer"
                          fallback={<Outlet />}
                        >
                          <NavigateToResource />
                        </Authenticated>
                      }
                    >
                      <Route path="/login" element={<Login />} />
                    </Route>
                  </Routes>
                  <UnsavedChangesNotifier />
                  <DocumentTitleHandler />
                </Refine>
                <DevtoolsPanel />
              </DevtoolsProvider>
            </AntdApp>
          </ColorModeContextProvider>
        </RefineKbarProvider>
      </BrowserRouter>
    </>
  );
}

export default App;
