import { Edit, useForm } from "@refinedev/antd";
import { useNavigation } from "@refinedev/core";
import {
  Form,
  Input,
  Row,
  Col,
  Select,
  Radio,
  Divider,
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
import dayjs from "dayjs";
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

  return (
    <Edit
      breadcrumb={false}
      title={record?.product || "Edit Product"}
      headerButtons={() => null}
      footerButtons={() => null}
    >
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
            installerImages: initialFileList,
            hasRT: record?.hasRT ?? true,
            hasOD: record?.hasOD ?? true,
            scanType: record?.customScan?.type || "context_menu",
            logoUpload: initialLogoList,
          }}
          onFinish={async (values: any) => {
            const fileList = (values.installerImages || []) as any[];
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
              licenseExpiry: values.licenseExpiry
                ? values.licenseExpiry.toISOString()
                : undefined,
            };
            delete payload.emailPrimary;
            delete payload.emailSecondary;
            delete payload.installerImages;
            delete payload.customScanPath;
            delete payload.logoUpload;
            return formProps.onFinish?.(payload);
          }}
        >
          <Tabs
            activeKey={activeKey}
            onChange={(k) => setActiveKey(k as any)}
            items={[
              {
                key: "primary",
                label: "PRIMARY INFO",
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

                    <Divider orientation="left">Meta Data</Divider>
                    <Row gutter={[16, 8]}>
                      <Col xs={24} md={8}>
                        <Form.Item
                          label="Product ID"
                          name="productId"
                          rules={[
                            {
                              required: true,
                              message: "Product name is required",
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
                            accept="image/*"
                            multiple={false}
                            maxCount={1}
                            listType="picture"
                            beforeUpload={() => false}
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
                            <p className="ant-upload-hint">
                              PNG/SVG/JPG – 1 file
                            </p>
                          </Dragger>
                        </Form.Item>
                      </Col>
                    </Row>
                  </>
                ),
              },
              {
                key: "ui",
                label: "INTERFACE",
                children: (
                  <>
                    <Divider orientation="left">Interface</Divider>
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

                    <Divider orientation="left">Timezone (AV vendors)</Divider>
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
                label: "INSTALLATION",
                children: (
                  <>
                    <Divider orientation="left">
                      Windows Defender & Process Creation Trigger{" "}
                    </Divider>
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
                    <Divider orientation="left">Installer Images</Divider>
                    <Form.Item
                      name="installerImages"
                      valuePropName="fileList"
                      getValueFromEvent={(e) => e?.fileList}
                    >
                      <Dragger
                        accept="image/*"
                        multiple
                        listType="picture"
                        beforeUpload={() => false}
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
                        <p className="ant-upload-text">
                          Click or Drag & Drop Images Here
                        </p>
                        <p className="ant-upload-hint">
                          PNG/JPG only. Files are stored client-side until save.
                        </p>
                      </Dragger>
                    </Form.Item>

                    <Divider orientation="left">Installation Notes</Divider>
                    <Form.Item name="installProcedure">
                      <MDEditor data-color-mode={mode as "light" | "dark"} />
                    </Form.Item>
                  </>
                ),
              },
              {
                key: "updates",
                label: "UPDATES",
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
                      <Col xs={24} md={12}>
                        <Form.Item
                          label="License Expiry Date"
                          name="licenseExpiry"
                        >
                          <DatePicker style={{ width: "100%" }} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Divider orientation="left">Update Procedure</Divider>
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
                    <Divider orientation="left">
                      Real-Time & Custom Scan
                    </Divider>
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
                    <Divider orientation="left">Custom Scan</Divider>
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
                                  initialValue={
                                    record?.customScan?.type || "context_menu"
                                  }
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
                                      Unique (specify path)
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
                                    initialValue={record?.customScan?.path}
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
                    <Divider orientation="left">Logs</Divider>
                    <Row gutter={[16, 8]}>
                      <Col span={24}>
                        <Form.Item label="Path To Collect Logs" name="log">
                          <Input placeholder="e.g. C:\ProgramData\Vendor\Product\Logs" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </>
                ),
              },
            ]}
          />

          <Divider />
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
      <div className="page-actions">
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
    </Edit>
  );
}
