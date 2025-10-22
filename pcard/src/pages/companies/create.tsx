import { Create, useForm } from "@refinedev/antd";
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
  Checkbox,
  AutoComplete,
} from "antd";
import { LeftOutlined, RightOutlined, InboxOutlined } from "@ant-design/icons";
import MDEditor from "@uiw/react-md-editor";
import { useContext, useEffect, useState } from "react";
import { ColorModeContext } from "../../contexts/color-mode";
import { AnalogClock } from "./analogclock";
import { AV_TIMEZONES } from "./timezones";
import dayjs, { Dayjs } from "dayjs";

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

const ACTIVATION_OPTIONS = [
  { label: "OEM", value: "oem" },
  { label: "Floating (License Server)", value: "floating" },
  { label: "Trial", value: "trial" },
  { label: "No Activation Needed", value: "none" },
  { label: "Serial Key", value: "serial" },
  { label: "License File", value: "license_file" },
  { label: "Vendor Account", value: "vendor_account" },
  { label: "E-mail Based", value: "email_based" },
];

export default function CompanyCreate() {
  const { formProps, saveButtonProps } = useForm({ resource: "companies" });
  const { goBack } = useNavigation();
  const { mode } = useContext(ColorModeContext);

  const TAB_KEYS = ["primary", "ui", "installer", "updates", "rtod"] as const;
  const [activeKey, setActiveKey] =
    useState<(typeof TAB_KEYS)[number]>("primary");

  const idx = TAB_KEYS.indexOf(activeKey);
  const goPrev = () => setActiveKey(TAB_KEYS[Math.max(0, idx - 1)]);
  const goNext = () =>
    setActiveKey(TAB_KEYS[Math.min(TAB_KEYS.length - 1, idx + 1)]);
  const [tz, setTz] = useState<string>("Europe/London");
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => {}, 1000);
    return () => clearInterval(id);
  }, []);

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
    <Create
      breadcrumb={false}
      title="Add Company"
      headerButtons={null}
      footerButtons={null}
    >
      <Tabs
        className="page-tabs"
        activeKey={activeKey}
        onChange={(k) => setActiveKey(k as any)}
        items={[
          { key: "primary", label: "Primary Info" },
          { key: "ui", label: "Interface" },
          { key: "installer", label: "Installation" },
          { key: "updates", label: "Updates" },
          { key: "rtod", label: "RT & OD" },
        ]}
        tabBarExtraContent={
          <div style={{ display: "flex", gap: 8 }}>
            <Button onClick={() => goBack()}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              form="company-create-form"
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
          id="company-create-form"
          {...formProps}
          layout="vertical"
          className="form-compact"
          initialValues={{
            interfaceType: "gui",
            timeZone: "Europe/London",
            scanType: "context_menu",
            hasRT: true,
            hasOD: true,
            activationType: "none",
            expiryPerpetual: false,
            expiryNone: false,
          }}
          onFinish={async (values: any) => {
            const fileList = (values.installerImages || []) as any[];
            setSubmitError(null);

            const steps = [];
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
            const emails = [values.emailPrimary, values.emailSecondary].filter(
              Boolean,
            );

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
              emails,
              installSteps: steps,
              hasGui: values.interfaceType === "gui",
              gui:
                values.interfaceType === "gui"
                  ? "GUI"
                  : values.interfaceType === "other"
                    ? values.interfaceOther
                    : undefined,
              hasRT: !!values.hasRT,
              hasOD: !!values.hasOD,
              customScan: values.hasOD
                ? {
                    type: values.scanType,
                    path:
                      values.scanType === "unique"
                        ? values.customScanPath
                        : undefined,
                  }
                : undefined,
              logo: logoUrl,
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
                  ? activationFile
                  : undefined,
              activationFileName:
                values.activationType === "license_file"
                  ? activationFileRaw?.name
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

            if (activationFile && values.activationType === "license_file") {
              payload.activationFile = activationFile;
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
          <Tabs
            activeKey={activeKey}
            onChange={(k) => setActiveKey(k as any)}
            renderTabBar={() => <></>}
            items={[
              {
                key: "primary",
                label: "Primary Info",
                children: (
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

                    <Form.Item label="Contact Email(s)" required>
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
                            rules={[
                              { type: "email", message: "Invalid email" },
                            ]}
                          >
                            <Input placeholder="secondary@company.com (optional)" />
                          </Form.Item>
                        </Col>
                      </Row>
                    </Form.Item>

                    <Row gutter={[16, 8]}>
                      <Col xs={24} md={8}>
                        <Form.Item
                          label="Product ID"
                          name="productId"
                          rules={[
                            {
                              required: true,
                              message: "Product ID is required",
                            },
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
                              if (
                                file.type &&
                                !file.type.startsWith("image/")
                              ) {
                                message.error("Only images are allowed");
                              }
                            }}
                          >
                            <p className="ant-upload-drag-icon">
                              <InboxOutlined />
                            </p>
                            <p className="ant-upload-text">
                              Click or drag a logo image
                            </p>
                            <p className="ant-upload-hint">PNG/JPG – 1 file</p>
                          </Dragger>
                        </Form.Item>
                      </Col>
                    </Row>
                  </>
                ),
              },
              {
                key: "ui",
                label: "Interface",
                children: (
                  <>
                    <Row gutter={[16, 8]}>
                      <Col xs={24} md={12}>
                        <Form.Item name="interfaceType" initialValue="gui">
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
                        <AnalogClock
                          tz={tz}
                          size={96}
                          mode={mode as "light" | "dark"}
                        />
                      </Col>
                    </Row>
                  </>
                ),
              },
              {
                key: "installer",
                label: "Installation",
                children: (
                  <>
                    <Row gutter={[16, 8]}>
                      <Col xs={24} md={8}>
                        <Form.Item
                          label="Need To Manually Disable Windows Defender?"
                          name="wdManuallyOff"
                          rules={[
                            { required: true, message: "Select Yes or No" },
                          ]}
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
                          rules={[
                            { required: true, message: "Select Yes or No" },
                          ]}
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
                            message.error("Only images are allowed");
                          }
                        }}
                      >
                        <p className="ant-upload-drag-icon">
                          <InboxOutlined />
                        </p>
                        <p className="ant-upload-text">
                          Click or Drag & Drop Images Here
                        </p>
                        <p className="ant-upload-hint">
                          PNG/JPG only. Files are stored client-side until save.
                        </p>
                      </Dragger>
                    </Form.Item>

                    <Form.Item name="installProcedure">
                      <MDEditor data-color-mode={mode as "light" | "dark"} />
                    </Form.Item>
                  </>
                ),
              },
              {
                key: "updates",
                label: "Updates",
                children: (
                  <>
                    <Row gutter={[16, 8]}>
                      <Col xs={24} md={12}>
                        <Form.Item
                          label="Current Version Check"
                          name="versionCheckPath"
                        >
                          <Input placeholder="e.g. Help → About • or URL/KB" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={[16, 8]}>
                      <Col xs={24}>
                        <Form.Item name="activationType">
                          <Radio.Group buttonStyle="solid">
                            {ACTIVATION_OPTIONS.map((o) => (
                              <Radio key={o.value} value={o.value}>
                                {o.label}
                              </Radio>
                            ))}
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
                                <Form.Item
                                  label="License Expiry Date"
                                  name="licenseExpiry"
                                >
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
                                  <Form.Item
                                    label="Serial key"
                                    name="activationSerial"
                                  >
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
                                    <Dragger
                                      accept=".lic,.dat,.bin"
                                      maxCount={1}
                                      beforeUpload={validateLicenseFile}
                                    >
                                      <p className="ant-upload-drag-icon">
                                        <InboxOutlined />
                                      </p>
                                      <p className="ant-upload-text">
                                        Click or drag .lic/.dat/.bin
                                      </p>
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
                ),
              },
              {
                key: "rtod",
                label: "RT & OD",
                children: (
                  <>
                    <Row gutter={[16, 8]}>
                      <Col xs={24} md={12}>
                        <Form.Item
                          name="hasRT"
                          valuePropName="checked"
                          initialValue={true}
                        >
                          <Checkbox>Real-time (RT) scanning available</Checkbox>
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item
                          name="hasOD"
                          valuePropName="checked"
                          initialValue={true}
                        >
                          <Checkbox>On-demand (OD) scanning available</Checkbox>
                        </Form.Item>
                      </Col>
                    </Row>

                    <Form.Item noStyle shouldUpdate>
                      {({ getFieldValue }) => {
                        const odEnabled = !!getFieldValue("hasOD");
                        const st = getFieldValue("scanType") || "context_menu";
                        return (
                          <>
                            <Row gutter={[16, 8]}>
                              <Col xs={24} md={16}>
                                <Form.Item
                                  name="scanType"
                                  initialValue="context_menu"
                                >
                                  <Radio.Group
                                    disabled={!odEnabled}
                                    optionType="button"
                                    buttonStyle="solid"
                                  >
                                    <Radio value="context_menu">
                                      Right-Click Context Menu
                                    </Radio>
                                    <Radio value="gui_custom_scan">
                                      GUI → Custom Scan
                                    </Radio>
                                    <Radio value="unique">
                                      Unique (Specify Path)
                                    </Radio>
                                  </Radio.Group>
                                </Form.Item>
                              </Col>
                            </Row>
                            {st === "unique" && (
                              <Row gutter={[16, 8]}>
                                <Col xs={24} md={16}>
                                  <Form.Item
                                    name="customScanPath"
                                    rules={[
                                      {
                                        required: true,
                                        message: "Path is required for Unique",
                                      },
                                    ]}
                                  >
                                    <AutoComplete
                                      options={UNIQUE_PATH_SUGGESTIONS.map(
                                        (v) => ({ value: v }),
                                      )}
                                      filterOption={(input, option) =>
                                        (option?.value ?? "")
                                          .toLowerCase()
                                          .includes(input.toLowerCase())
                                      }
                                      disabled={!odEnabled}
                                    >
                                      <Input placeholder="e.g. Start the OD scan from the website client" />
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
                        <Form.Item label="Log Files Path" name="log">
                          <Input placeholder="e.g. C:\ProgramData\Vendor\Product\Logs" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </>
                ),
              },
            ]}
          />

          <div
            className="wizard-footer"
            style={{ justifyContent: "flex-end", gap: 8 }}
          >
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
    </Create>
  );
}
