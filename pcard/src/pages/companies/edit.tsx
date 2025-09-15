import { Edit, useForm } from "@refinedev/antd";
import { useNavigation } from "@refinedev/core";
import {
  Form,
  Input,
  Row,
  Col,
  Select,
  Radio,
  DatePicker,
  Typography,
  Button,
  Tabs,
  Card,
  Upload,
  message,
  App,
  Result,
  Checkbox,
  AutoComplete,
} from "antd";
import { LeftOutlined, RightOutlined, InboxOutlined } from "@ant-design/icons";
import MDEditor from "@uiw/react-md-editor";
import { useContext, useEffect, useState } from "react";
import { ColorModeContext } from "../../contexts/color-mode";
import dayjs, { Dayjs } from "dayjs";
import { AnalogClock } from "./analogclock";
import { AV_TIMEZONES } from "./timezones";

const { Title } = Typography;
const { Dragger } = Upload;

const UNIQUE_PATH_SUGGESTIONS = [
  "C:\\Program Files\\Vendor\\Product",
  "C:\\ProgramData\\Vendor\\Product\\Logs",
  "/opt/vendor/product",
  "/var/log/vendor/product",
  "/Library/Application Support/Vendor/Product",
];

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function CompanyEdit() {
  const { message: toast } = App.useApp();
  const { formProps, saveButtonProps, queryResult } = useForm({
    resource: "companies",
    redirect: "show",
  });
  const { goBack } = useNavigation();
  const record: any = queryResult?.data?.data;
  const { mode } = useContext(ColorModeContext);
  const TAB_KEYS = ["primary", "ui", "installer", "updates", "rtod"] as const;
  const [activeKey, setActiveKey] =
    useState<(typeof TAB_KEYS)[number]>("primary");
  const TAB_LABELS = {
    primary: "Primary Info",
    ui: "Interface",
    installer: "Installation",
    updates: "Updates",
    rtod: "RT & OD",
  } as const;
  const tabHeaders = TAB_KEYS.map((k) => ({ key: k, label: TAB_LABELS[k] }));

  const idx = TAB_KEYS.indexOf(activeKey);
  const goPrev = () => setActiveKey(TAB_KEYS[Math.max(0, idx - 1)]);
  const goNext = () =>
    setActiveKey(TAB_KEYS[Math.min(TAB_KEYS.length - 1, idx + 1)]);
  const [tz, setTz] = useState<string>(record?.timeZone || "Europe/London");
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (queryResult?.isError) {
    return (
      <Result
        status="500"
        title="Failed to load"
        subTitle={String(queryResult.error)}
      />
    );
  }
  if (queryResult?.isLoading) {
    return <Result status="info" title="Loading…" />;
  }
  if (!record) {
    return <Result status="404" title="Company not found" />;
  }

  const initialEmails = Array.isArray(record?.emails) ? record.emails : [];
  const initialPrimary = initialEmails[0] || "";
  const initialSecondary = initialEmails[1] || "";
  const initialInterface: "cli" | "gui" | "web" | "other" =
    (record?.interfaceType as "cli" | "gui" | "web" | "other") ??
    (record?.hasGui ? "gui" : record?.gui ? "other" : "cli");

  const initialFileList = (record?.installSteps || [])
    .filter((s: any) => s?.imageUrl)
    .map((s: any, i: number) => ({
      uid: String(i + 1),
      name: `image_${i + 1}.png`,
      url: s.imageUrl,
    }));

  const initialLogoList = record?.logo
    ? [{ uid: "logo", name: "logo.png", url: record.logo }]
    : [];

  const acceptImages = ".png,.jpg,.jpeg";
  const validateImage = (file: File) => {
    const ok = /\.(png|jpe?g)$/i.test(file.name);
    if (!ok) {
      message.error("Invalid image format. Please upload .png or .jpg/.jpeg.");
      return Upload.LIST_IGNORE;
    }
    return false;
  };

  const acceptLicenseFiles = ".lic,.dat,.bin";
  const validateLicenseFile = (file: File) => {
    const ok = /\.(lic|dat|bin)$/i.test(file.name);
    if (!ok) {
      message.error("Invalid file. Allowed: .lic, .dat, .bin");
      return Upload.LIST_IGNORE;
    }
    return false;
  };

  return (
    <Edit
      breadcrumb={false}
      title={record?.product || "Edit Product"}
      headerButtons={() => null}
      footerButtons={() => null}
    >
      <Tabs
        className="page-tabs"
        activeKey={activeKey}
        onChange={(k) => setActiveKey(k as any)}
        items={tabHeaders}
        tabBarExtraContent={
          <div style={{ display: "flex", gap: 8 }}>
            <Button onClick={() => goBack()}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              form="company-edit-form"
              loading={saveButtonProps.loading}
              disabled={saveButtonProps.disabled}
            >
              Save
            </Button>
          </div>
        }
      />

      <Card className="wizard-card">
        <Button
          shape="circle"
          className="wizard-arrow wizard-arrow-left"
          icon={<LeftOutlined />}
          onClick={goPrev}
          disabled={idx === 0}
          aria-label="Previous step"
        />
        <Button
          shape="circle"
          className="wizard-arrow wizard-arrow-right"
          icon={<RightOutlined />}
          onClick={goNext}
          disabled={idx === TAB_KEYS.length - 1}
          aria-label="Next step"
        />

        <Form
          id="company-edit-form"
          {...formProps}
          layout="vertical"
          className="form-compact"
          initialValues={{
            ...record,
            emailPrimary: initialPrimary,
            emailSecondary: initialSecondary,
            interfaceType: initialInterface,
            interfaceOther:
              initialInterface === "other" ? record?.gui : undefined,
            timeZone: record?.timeZone || "Europe/London",
            licenseExpiry: record?.licenseExpiry
              ? dayjs(record.licenseExpiry)
              : undefined,
            expiryPerpetual: record?.licenseExpiryMode === "perpetual",
            expiryNone: record?.licenseExpiryMode === "none",
            activationType: record?.activationType || "none",
            activationSerial: record?.activationSerial,
            activationEmail: record?.activationEmail,
            activationPassword: record?.activationPassword,
            installerImages: initialFileList,
            hasRT: record?.hasRT ?? true,
            hasOD: record?.hasOD ?? true,
            scanType: record?.customScan?.type || "context_menu",
            logoUpload: initialLogoList,
          }}
          onFinish={async (values: any) => {
            const fileList = (values.installerImages || []) as any[];
            const steps = [];
            setSubmitError(null);
            for (const f of fileList) {
              const url =
                f.url ||
                (f.originFileObj
                  ? await fileToBase64(f.originFileObj)
                  : undefined);
              if (url) steps.push({ imageUrl: url });
            }
            const logoFile = values.logoUpload?.[0] as any;
            const logoUrl =
              logoFile?.url ||
              (logoFile?.originFileObj
                ? await fileToBase64(logoFile.originFileObj)
                : undefined);

            let licenseExpiry: string | null | undefined = undefined;
            let licenseExpiryMode: "date" | "perpetual" | "none" | undefined =
              undefined;
            if (values.expiryNone) {
              licenseExpiry = null;
              licenseExpiryMode = "none";
            } else if (values.expiryPerpetual) {
              licenseExpiry = dayjs("2099-12-31").toISOString();
              licenseExpiryMode = "perpetual";
            } else if (values.licenseExpiry) {
              licenseExpiry = (values.licenseExpiry as Dayjs).toISOString();
              licenseExpiryMode = "date";
            }

            const activationFileRaw = values.activationFile?.[0] as any;
            const activationFile =
              activationFileRaw?.url ||
              (activationFileRaw?.originFileObj
                ? await fileToBase64(activationFileRaw.originFileObj)
                : undefined);

            const payload: any = {
              ...values,
              interfaceType: values.interfaceType,
              hasGui: values.interfaceType === "gui",
              gui:
                values.interfaceType === "gui"
                  ? "GUI"
                  : values.interfaceType === "other"
                    ? values.interfaceOther || record?.gui
                    : undefined,
              hasRT: !!values.hasRT,
              hasOD: !!values.hasOD,
              customScan: values.hasOD
                ? {
                    type: values.scanType || record?.customScan?.type,
                    path:
                      (values.scanType || record?.customScan?.type) === "unique"
                        ? values.customScanPath || record?.customScan?.path
                        : undefined,
                  }
                : undefined,
              logo: logoUrl ?? record?.logo,
              activationType: values.activationType,
              activationSerial:
                values.activationType === "serial"
                  ? values.activationSerial
                  : undefined,
              activationEmail:
                values.activationType === "vendor_account" ||
                values.activationType === "email_based"
                  ? values.activationEmail
                  : undefined,
              activationPassword:
                values.activationType === "vendor_account"
                  ? values.activationPassword
                  : undefined,
              activationFile:
                values.activationType === "license_file"
                  ? (activationFile ?? record?.activationFile)
                  : undefined,
              activationFileName:
                values.activationType === "license_file"
                  ? activationFileRaw?.name || record?.activationFileName
                  : undefined,
              licenseExpiry,
              licenseExpiryMode,
            };
            delete payload.emailPrimary;
            delete payload.emailSecondary;
            delete payload.installerImages;
            delete payload.customScanPath;
            delete payload.logoUpload;
            delete payload.activationFile;

            if (
              (values.activationType === "license_file" && activationFile) ||
              (values.activationType === "license_file" &&
                record?.activationFile)
            ) {
              payload.activationFile = activationFile ?? record?.activationFile;
            }

            return formProps.onFinish?.(payload);
          }}
          onFinishFailed={(info) => {
            const hasFormatError = info.errorFields.some((f) =>
              (f.errors || []).some((m) =>
                /valid|format|email|invalid/i.test(m),
              ),
            );
            setSubmitError(
              hasFormatError
                ? "Some fields have invalid format."
                : "Please fill out all required fields.",
            );
          }}
        >
          {activeKey === "primary" && (
            <>
              <Row gutter={[16, 8]}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Vendor Name"
                    name="name"
                    rules={[
                      {
                        required: true,
                        message: "Vendor name is required",
                      },
                    ]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Product Name"
                    name="product"
                    rules={[
                      {
                        required: true,
                        message: "Product name is required",
                      },
                    ]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
              </Row>

              <Title level={5} style={{ marginTop: 8 }}>
                Contact email(s)
              </Title>
              <Row gutter={[16, 8]}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="emailPrimary"
                    rules={[
                      {
                        required: true,
                        type: "email",
                        message: "Valid email required",
                      },
                    ]}
                  >
                    <Input placeholder="primary@company.com" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="emailSecondary"
                    rules={[{ type: "email", message: "Invalid email" }]}
                  >
                    <Input placeholder="optional@company.com (optional)" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[16, 8]}>
                <Col xs={24} md={8}>
                  <Form.Item
                    label="Product ID"
                    name="productId"
                    rules={[
                      { required: true, message: "Product ID is required" },
                    ]}
                  >
                    <Input placeholder="e.g. XY-AV" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={16}>
                  <Form.Item
                    name="logoUpload"
                    valuePropName="fileList"
                    getValueFromEvent={(e) => e?.fileList}
                  >
                    <Dragger
                      accept={acceptImages}
                      multiple={false}
                      maxCount={1}
                      listType="picture"
                      beforeUpload={validateImage}
                      onChange={({ file }) => {
                        if (file.status === "removed") return;
                        if (file.type && !file.type.startsWith("image/")) {
                          toast.error("Only images are allowed");
                        }
                      }}
                    >
                      <p className="ant-upload-drag-icon">
                        <InboxOutlined />
                      </p>
                      <p className="ant-upload-text">Click or drag a logo image</p>
                      <p className="ant-upload-hint">PNG/JPG – 1 file</p>
                    </Dragger>
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          {activeKey === "ui" && (
            <>
              <Row gutter={[16, 8]}>
                <Col xs={24} md={12}>
                  <Form.Item name="interfaceType">
                    <Radio.Group optionType="button" buttonStyle="solid">
                      <Radio value="cli">CLI-Only</Radio>
                      <Radio value="gui">GUI Client</Radio>
                      <Radio value="web">Headless</Radio>
                      <Radio value="other">Other</Radio>
                    </Radio.Group>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item noStyle shouldUpdate>
                {({ getFieldValue }) =>
                  getFieldValue("interfaceType") === "other" ? (
                    <Row gutter={[16, 8]}>
                      <Col xs={24} md={12}>
                        <Form.Item
                          name="interfaceOther"
                          label="Specify interface"
                          rules={[
                            {
                              required: true,
                              message: "Please specify the interface",
                            },
                          ]}
                        >
                          <Input placeholder="e.g. Hybrid / Web-only / Plug-in" />
                        </Form.Item>
                      </Col>
                    </Row>
                  ) : null
                }
              </Form.Item>

              <Row gutter={[16, 8]} align="middle">
                <Col xs={24} md={12}>
                  <Form.Item name="timeZone" style={{ marginBottom: 0 }}>
                    <Select
                      options={AV_TIMEZONES}
                      value={tz}
                      onChange={(v) => setTz(v)}
                    />
                  </Form.Item>
                </Col>
                <Col
                  xs={24}
                  md={12}
                  style={{ display: "flex", justifyContent: "center" }}
                >
                  <AnalogClock tz={tz} size={96} mode={mode as "light" | "dark"} />
                </Col>
              </Row>
            </>
          )}

          {activeKey === "installer" && (
            <>
              <Row gutter={[16, 8]}>
                <Col xs={24} md={8}>
                  <Form.Item
                    label="Need To Manually Disable Windows Defender?"
                    name="wdManuallyOff"
                    rules={[{ required: true, message: "Select Yes or No" }]}
                  >
                    <Radio.Group optionType="button" buttonStyle="solid">
                      <Radio value={true}>Yes</Radio>
                      <Radio value={false}>No</Radio>
                    </Radio.Group>
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item
                    label="Need To Manually Disable Process Creation Trigger?"
                    name="pctManuallyOff"
                    rules={[{ required: true, message: "Select Yes or No" }]}
                  >
                    <Radio.Group optionType="button" buttonStyle="solid">
                      <Radio value={true}>Yes</Radio>
                      <Radio value={false}>No</Radio>
                    </Radio.Group>
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item
                name="installerImages"
                valuePropName="fileList"
                getValueFromEvent={(e) => e?.fileList}
              >
                <Dragger
                  accept={acceptImages}
                  multiple
                  listType="picture"
                  beforeUpload={validateImage}
                  onChange={({ file }) => {
                    if (file.status === "removed") return;
                    if (file.type && !file.type.startsWith("image/")) {
                      toast.error("Only images are allowed");
                    }
                  }}
                >
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                  </p>
                  <p className="ant-upload-text">Click or Drag & Drop Images Here</p>
                  <p className="ant-upload-hint">
                    PNG/JPG only. Files are stored client-side until save.
                  </p>
                </Dragger>
              </Form.Item>

              <Form.Item name="installProcedure">
                <MDEditor data-color-mode={mode as "light" | "dark"} />
              </Form.Item>
            </>
          )}

          {activeKey === "updates" && (
            <>
              <Row gutter={[16, 8]}>
                <Col xs={24} md={12}>
                  <Form.Item label="Current Version Check" name="versionCheckPath">
                    <Input placeholder="e.g. Help → About • or URL/KB" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[16, 8]}>
                <Col xs={24}>
                  <Form.Item name="activationType">
                    <Radio.Group buttonStyle="solid">
                      <Radio value="oem">OEM</Radio>
                      <Radio value="floating">Floating</Radio>
                      <Radio value="trial">Trial</Radio>
                      <Radio value="none">No Activation</Radio>
                      <Radio value="serial">Serial Key</Radio>
                      <Radio value="license_file">License File</Radio>
                      <Radio value="vendor_account">Vendor Account</Radio>
                      <Radio value="email_based">E-mail Based</Radio>
                    </Radio.Group>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item noStyle shouldUpdate>
                {({ getFieldValue, setFieldsValue }) => {
                  const t = getFieldValue("activationType");
                  const showAct =
                    t === "serial" ||
                    t === "license_file" ||
                    t === "vendor_account" ||
                    t === "email_based";
                  return showAct ? (
                    <>
                      <Row gutter={[16, 8]}>
                        <Col xs={24} md={12}>
                          <Form.Item label="License Expiry Date" name="licenseExpiry">
                            <DatePicker style={{ width: "100%" }} />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                          <div
                            style={{
                              display: "flex",
                              gap: 12,
                              alignItems: "center",
                              height: "100%",
                            }}
                          >
                            <Form.Item
                              name="expiryPerpetual"
                              valuePropName="checked"
                              style={{ margin: 0 }}
                            >
                              <Checkbox
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFieldsValue({
                                      expiryNone: false,
                                      licenseExpiry: dayjs("2099-12-31"),
                                    });
                                  }
                                }}
                              >
                                Perpetual license
                              </Checkbox>
                            </Form.Item>
                            <Form.Item
                              name="expiryNone"
                              valuePropName="checked"
                              style={{ margin: 0 }}
                            >
                              <Checkbox
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFieldsValue({
                                      expiryPerpetual: false,
                                      licenseExpiry: null,
                                    });
                                  }
                                }}
                              >
                                No expiry
                              </Checkbox>
                            </Form.Item>
                          </div>
                        </Col>
                      </Row>

                      {t === "serial" && (
                        <Row gutter={[16, 8]}>
                          <Col xs={24} md={12}>
                            <Form.Item label="Serial key" name="activationSerial">
                              <Input placeholder="XXXX-XXXX-XXXX-XXXX" />
                            </Form.Item>
                          </Col>
                        </Row>
                      )}

                      {t === "license_file" && (
                        <Row gutter={[16, 8]}>
                          <Col xs={24} md={12}>
                            <Form.Item
                              label="License file"
                              name="activationFile"
                              valuePropName="fileList"
                              getValueFromEvent={(e) => e?.fileList}
                            >
                              <Dragger accept=".lic,.dat,.bin" maxCount={1} beforeUpload={validateLicenseFile}>
                                <p className="ant-upload-drag-icon">
                                  <InboxOutlined />
                                </p>
                                <p className="ant-upload-text">Click or drag .lic/.dat/.bin</p>
                              </Dragger>
                            </Form.Item>
                          </Col>
                        </Row>
                      )}

                      {t === "vendor_account" && (
                        <Row gutter={[16, 8]}>
                          <Col xs={24} md={12}>
                            <Form.Item
                              label="Vendor account e-mail"
                              name="activationEmail"
                              rules={[{ type: "email" }]}
                            >
                              <Input placeholder="email@vendor.com" />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={12}>
                            <Form.Item
                              label="Vendor account password"
                              name="activationPassword"
                            >
                              <Input.Password placeholder="Password" />
                            </Form.Item>
                          </Col>
                        </Row>
                      )}

                      {t === "email_based" && (
                        <Row gutter={[16, 8]}>
                          <Col xs={24} md={12}>
                            <Form.Item
                              label="Activation e-mail"
                              name="activationEmail"
                              rules={[{ type: "email" }]}
                            >
                              <Input placeholder="email@vendor.com" />
                            </Form.Item>
                          </Col>
                        </Row>
                      )}
                    </>
                  ) : null;
                }}
              </Form.Item>

              <Form.Item name="updateProcedure">
                <MDEditor data-color-mode={mode as "light" | "dark"} />
              </Form.Item>
            </>
          )}

          {activeKey === "rtod" && (
            <>
              <Row gutter={[16, 8]}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="hasRT"
                    valuePropName="checked"
                    initialValue={record?.hasRT ?? true}
                  >
                    <Checkbox>Real-Time Scan Available</Checkbox>
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="hasOD"
                    valuePropName="checked"
                    initialValue={record?.hasOD ?? true}
                  >
                    <Checkbox>Custom Scan Available</Checkbox>
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item noStyle shouldUpdate>
                {({ getFieldValue }) => {
                  const odEnabled = !!getFieldValue("hasOD");
                  const st =
                    getFieldValue("scanType") ||
                    record?.customScan?.type ||
                    "context_menu";
                  return (
                    <>
                      <Row gutter={[16, 8]}>
                        <Col xs={24} md={16}>
                          <Form.Item
                            name="scanType"
                            initialValue={record?.customScan?.type || "context_menu"}
                          >
                            <Radio.Group
                              disabled={!odEnabled}
                              optionType="button"
                              buttonStyle="solid"
                            >
                              <Radio value="context_menu">Right-Click Context Menu</Radio>
                              <Radio value="gui_custom_scan">GUI → Custom Scan</Radio>
                              <Radio value="unique">Unique (specify path)</Radio>
                            </Radio.Group>
                          </Form.Item>
                        </Col>
                      </Row>
                      {st === "unique" && (
                        <Row gutter={[16, 8]}>
                          <Col xs={24} md={16}>
                            <Form.Item
                              name="customScanPath"
                              initialValue={record?.customScan?.path}
                              rules={[
                                { required: true, message: "Path is required for Unique" },
                              ]}
                            >
                              <AutoComplete
                                options={UNIQUE_PATH_SUGGESTIONS.map((v) => ({ value: v }))}
                                filterOption={(input, option) =>
                                  (option?.value ?? "")
                                    .toLowerCase()
                                    .includes(input.toLowerCase())
                                }
                                disabled={!odEnabled}
                              >
                                <Input placeholder="e.g. C:\ProgramData\Vendor\Product\Logs" />
                              </AutoComplete>
                            </Form.Item>
                          </Col>
                        </Row>
                      )}
                    </>
                  );
                }}
              </Form.Item>
              <Row gutter={[16, 8]}>
                <Col span={24}>
                  <Form.Item label="Path To Collect Logs" name="log">
                    <Input placeholder="e.g. C:\ProgramData\Vendor\Product\Logs" />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          <div className="wizard-footer" style={{ justifyContent: "flex-end", gap: 8 }}>
            <Button onClick={goPrev} disabled={idx === 0}>
              <LeftOutlined /> Prev
            </Button>
            <Button onClick={goNext} disabled={idx === TAB_KEYS.length - 1}>
              Next <RightOutlined />
            </Button>
          </div>
        </Form>
      </Card>

      {submitError && (
        <div className="form-submit-error" style={{ textAlign: "right" }}>
          {submitError}
        </div>
      )}
    </Edit>
  );
}
