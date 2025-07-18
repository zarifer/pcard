import { 
    Refine,
    GitHubBanner, 
    WelcomePage,
    Authenticated
,AuthBindings, 
} from '@refinedev/core';
import { DevtoolsPanel, DevtoolsProvider } from "@refinedev/devtools";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";

import { ErrorComponent
,useNotificationProvider
,ThemedLayoutV2
,ThemedSiderV2} from '@refinedev/antd';
import "@refinedev/antd/dist/reset.css";

import dataProvider from "@refinedev/simple-rest";
import { App as AntdApp } from "antd"
import { BrowserRouter, Route, Routes, Outlet } from "react-router";
import routerBindings, { NavigateToResource, CatchAllNavigate, UnsavedChangesNotifier, DocumentTitleHandler } from "@refinedev/react-router";
import axios from "axios";
import { BlogPostList, BlogPostCreate, BlogPostEdit, BlogPostShow } from "./pages/blog-posts";
import { CategoryList, CategoryCreate, CategoryEdit, CategoryShow } from "./pages/categories";
import { ColorModeContextProvider } from "./contexts/color-mode";
import { Header } from "./components/header";
import { Login } from "./pages/login";
import { CredentialResponse } from "./interfaces/google";
import { parseJwt } from "./utils/parse-jwt";

import { CalendarPage } from "./pages/calendar";
import CalendarCreate from "./pages/calendar";

import CompanyListPage from "./pages/companies/list";
import CompanyCreatePage from "./pages/companies/create";
import CompanyEditPage from "./pages/companies/edit";
import CompanyShowPage from "./pages/companies/show";

const axiosInstance = axios.create();
axiosInstance.interceptors.request.use((config) => {
const token = localStorage.getItem("token");
if (config.headers) {
    config.headers["Authorization"] = `Bearer ${token}`;
}

return config;
});

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
                        
localStorage.setItem("token", `${ credential }`);

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
        <BrowserRouter>
        <RefineKbarProvider>
            <ColorModeContextProvider>
                <AntdApp>
            <DevtoolsProvider>
                <Refine dataProvider={dataProvider("http://localhost:3001")}
                        notificationProvider={useNotificationProvider}
                        routerProvider={routerBindings}
                        authProvider={authProvider} 
                        resources={[
                            {
                                name: "blog_posts",
                                list: "/blog-posts",
                                create: "/blog-posts/create",
                                edit: "/blog-posts/edit/:id",
                                show: "/blog-posts/show/:id",
                                meta: {
                                    canDelete: true,
                                },
                            },
                            {
                                name: "categories",
                                list: "/categories",
                                create: "/categories/create",
                                edit: "/categories/edit/:id",
                                show: "/categories/show/:id",
                                meta: {
                                    canDelete: true,
                                },
                            },
                                                        {
                                name: "events",
                                list: "/calendar",
                                create: "/calendar/create",
                                meta: {
                                    canDelete: true,
                                }
                            },
                            {
                                name: "companies",
                                list: "/companies",
                                create: "/companies/create",
                                edit: "/companies/edit/:id",
                                show: "/companies/show/:id",
                                meta: { canDelete: true }
                            }
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
                                            Header={Header}
                                            Sider={(props) => <ThemedSiderV2 {...props} fixed />}
                                        >
                                            <Outlet />
                                        </ThemedLayoutV2>
                                </Authenticated>
                            }
                        >
                            <Route index element={
                                    <NavigateToResource resource="blog_posts" />
                            } />
                            <Route path="/blog-posts">
                                <Route index element={<BlogPostList />} />
                                <Route path="create" element={<BlogPostCreate />} />
                                <Route path="edit/:id" element={<BlogPostEdit />} />
                                <Route path="show/:id" element={<BlogPostShow />} />
                            </Route>
                            <Route path="/categories">
                                <Route index element={<CategoryList />} />
                                <Route path="create" element={<CategoryCreate />} />
                                <Route path="edit/:id" element={<CategoryEdit />} />
                                <Route path="show/:id" element={<CategoryShow />} />
                            </Route>
                                                        <Route path="/calendar">
                                <Route index element={<CalendarPage />} />
                                <Route path="create" element={<CalendarCreate />} />
                            </Route>
                              <Route path="/companies">
                                <Route index element={<CompanyListPage />} />
                                <Route path="create" element={<CompanyCreatePage />} />
                                <Route path="edit/:id" element={<CompanyEditPage />} />
                                <Route path="show/:id" element={<CompanyShowPage />} />
                            </Route>
                            <Route path="*" element={<ErrorComponent />} />
                        </Route>
                        <Route
                            element={
                                <Authenticated key="authenticated-outer" fallback={<Outlet />}>
                                    <NavigateToResource />
                                </Authenticated>
                            }
                        >
                                <Route path="/login" element={<Login />}  />
                        </Route>
                    </Routes>


                    <RefineKbar />
                    <UnsavedChangesNotifier />
                    <DocumentTitleHandler />
                </Refine>
            <DevtoolsPanel />
            </DevtoolsProvider>
            </AntdApp>
</ColorModeContextProvider>
        </RefineKbarProvider>
        </BrowserRouter>
      );
};

export default App;
