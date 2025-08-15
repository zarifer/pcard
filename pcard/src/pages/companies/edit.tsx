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
} from "antd";
import {
  LeftOutlined,
  RightOutlined,
  ClockCircleOutlined,
  InboxOutlined,
} from "@ant-design/icons";
import MDEditor from "@uiw/react-md-editor";
import { useContext, useEffect, useMemo, useState } from "react";
import { ColorModeContext } from "../../contexts/color-mode";
import dayjs from "dayjs";
import { AnalogClock } from "./analogclock";

const { Title, Text } = Typography;
const { Dragger } = Upload;

const AV_TIMEZONES = [
  { value: "Europe/London", label: "Europe/London — Sophos (UK)" },
  { value: "Europe/Prague", label: "Europe/Prague — Avast / AVG (CZ)" },
  { value: "Europe/Bratislava", label: "Europe/Bratislava — ESET (SK)" },
  { value: "Europe/Bucharest", label: "Europe/Bucharest — Bitdefender (RO)" },
  { value: "Europe/Helsinki", label: "Europe/Helsinki — F-Secure (FI)" },
  { value: "Europe/Moscow", label: "Europe/Moscow — Kaspersky (RU)" },
  {
    value: "America/Los_Angeles",
    label: "America/Los_Angeles — Norton/McAfee (US West)",
  },
  {
    value: "America/Phoenix",
    label: "America/Phoenix — NortonLifeLock (US AZ)",
  },
  { value: "Asia/Tokyo", label: "Asia/Tokyo — Trend Micro (JP)" },
  { value: "Asia/Seoul", label: "Asia/Seoul — AhnLab (KR)" },
  { value: "Asia/Shanghai", label: "Asia/Shanghai — Qihoo 360 (CN)" },
  { value: "Pacific/Auckland", label: "Pacific/Auckland — Emsisoft (NZ)" },
];

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function CompanyEdit() {
  const { formProps, saveButtonProps, queryResult } = useForm({
    resource: "companies",
  });
  const { goBack } = useNavigation();
  const record: any = queryResult?.data?.data;
  const { mode } = useContext(ColorModeContext);

  /* WIZARD STATE */
  const TAB_KEYS = ["primary", "ui", "installer", "updates"] as const;
  const [activeKey, setActiveKey] =
    useState<(typeof TAB_KEYS)[number]>("primary");
  const idx = TAB_KEYS.indexOf(activeKey);
  const goPrev = () => setActiveKey(TAB_KEYS[Math.max(0, idx - 1)]);
  const goNext = () =>
    setActiveKey(TAB_KEYS[Math.min(TAB_KEYS.length - 1, idx + 1)]);

  /* LIVE TZ CLOCK */
  const [tz, setTz] = useState<string>(record?.timeZone || "Europe/London");
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const timeInTZ = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(undefined, {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(now);
    } catch {
      return "";
    }
  }, [now, tz]);

  /* EMAIL + INTERFACE INITIALS */
  const initialPrimary = Array.isArray(record?.emails)
    ? record.emails[0]
    : record?.email || "";
  const initialSecondary = Array.isArray(record?.emails)
    ? record.emails[1]
    : "";
  const initialInterface: "terminal" | "gui" | "other" = record?.hasGui
    ? "gui"
    : record?.gui
      ? "gui"
      : "terminal";

  /* PREP FILE LIST FROM EXISTING installSteps */
  const initialFileList = (record?.installSteps || [])
    .filter((s: any) => s?.imageUrl)
    .map((s: any, i: number) => ({
      uid: String(i + 1),
      name: `image_${i + 1}.png`,
      url: s.imageUrl,
    }));

  return (
    <Edit
      headerButtons={() => null}
      /* KEEP DEFAULT OUTER DELETE + SAVE, NO EXTRA FOOTER NEEDED */
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
          {...formProps}
          layout="vertical"
          className="form-compact"
          initialValues={{
            ...record,
            emailPrimary: initialPrimary,
            emailSecondary: initialSecondary,
            interfaceType: initialInterface,
            timeZone: record?.timeZone || "Europe/London",
            licenseExpiry: record?.licenseExpiry
              ? dayjs(record.licenseExpiry)
              : undefined,
            installerImages: initialFileList,
          }}
          onFinish={async (values: any) => {
            /* NORMALIZE IMAGES -> installSteps */
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
            const emails = [values.emailPrimary, values.emailSecondary].filter(
              Boolean,
            );

            const payload: any = {
              ...values,
              emails,
              installSteps: steps,
              hasGui: values.interfaceType === "gui",
              gui:
                values.interfaceType === "gui"
                  ? values.gui || "GUI"
                  : undefined,
              customScan: {
                type: values.scanType || record?.customScan?.type,
                path:
                  (values.scanType || record?.customScan?.type) === "unique"
                    ? values.customScanPath || record?.customScan?.path
                    : undefined,
              },
              licenseExpiry: values.licenseExpiry
                ? values.licenseExpiry.toISOString()
                : undefined,
            };
            delete payload.emailPrimary;
            delete payload.emailSecondary;
            delete payload.installerImages;
            delete payload.customScanPath;

            return formProps.onFinish?.(payload);
          }}
        >
          <Tabs
            activeKey={activeKey}
            onChange={(k) => setActiveKey(k as any)}
            items={[
              {
                key: "primary",
                label: "Primary info",
                children: (
                  <>
                    <Row gutter={[16, 8]}>
                      <Col xs={24} md={12}>
                        <Form.Item
                          label="Company Name"
                          name="name"
                          rules={[
                            {
                              required: true,
                              message: "Company name is required",
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
                        <Form.Item label="Appearance" name="interfaceType">
                          <Select
                            options={[
                              { value: "terminal", label: "Terminal" },
                              { value: "gui", label: "GUI" },
                              { value: "other", label: "Other" },
                            ]}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item label="UI notes" name="gui">
                          <Input placeholder="e.g. Web UI, Desktop app, shortcuts…" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Divider orientation="left">Timezone (AV vendors)</Divider>
                    <Row gutter={[16, 8]} align="middle">
                      <Col xs={24} md={12}>
                        <Form.Item
                          label={
                            <span>
                              City / Timezone{" "}
                              <Text type="secondary">
                                <ClockCircleOutlined /> {timeInTZ}
                              </Text>
                            </span>
                          }
                          name="timeZone"
                          initialValue="Europe/London"
                        >
                          <Select
                            showSearch
                            options={AV_TIMEZONES}
                            onChange={(v) => setTz(v)}
                          />
                        </Form.Item>
                      </Col>

                      {/* ANALOG CLOCK ON THE RIGHT */}
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

                    <Row gutter={[16, 8]}>
                      <Col span={24}>
                        <Form.Item label="Log files path" name="log">
                          <Input placeholder="e.g. C:\ProgramData\Vendor\Product\Logs" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </>
                ),
              },
              {
                key: "installer",
                label: "Installer & Notes",
                children: (
                  <>
                    <Divider orientation="left">
                      Installer images (drag & drop or browse)
                    </Divider>
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
                            message.error("Only images are allowed");
                          }
                        }}
                      >
                        <p className="ant-upload-drag-icon">
                          <InboxOutlined />
                        </p>
                        <p className="ant-upload-text">
                          Click or drag images to upload
                        </p>
                        <p className="ant-upload-hint">
                          We’ll store them with the record
                        </p>
                      </Dragger>
                    </Form.Item>

                    <Divider orientation="left">
                      Notes / Special features
                    </Divider>
                    <Form.Item name="features">
                      <MDEditor data-color-mode={mode as "light" | "dark"} />
                    </Form.Item>
                  </>
                ),
              },
              {
                key: "updates",
                label: "Update & Scan",
                children: (
                  <>
                    {/* ABOVE THE MARKDOWN */}
                    <Row gutter={[16, 8]}>
                      <Col xs={24} md={12}>
                        <Form.Item
                          label="Where to check current version"
                          name="versionCheckPath"
                        >
                          <Input placeholder="e.g. Help → About • or URL/KB" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item
                          label="License expiry date"
                          name="licenseExpiry"
                          initialValue={
                            record?.licenseExpiry
                              ? dayjs(record.licenseExpiry)
                              : undefined
                          }
                        >
                          <DatePicker style={{ width: "100%" }} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Divider orientation="left">Update procedure</Divider>
                    <Form.Item name="updateProcedure">
                      <MDEditor data-color-mode={mode as "light" | "dark"} />
                    </Form.Item>

                    <Divider orientation="left">Custom scan</Divider>
                    <Row gutter={[16, 8]}>
                      <Col xs={24} md={12}>
                        <Form.Item
                          name="scanType"
                          initialValue={
                            record?.customScan?.type || "context_menu"
                          }
                        >
                          <Radio.Group>
                            <Radio value="context_menu">
                              Right-click context menu
                            </Radio>
                            <Radio value="gui_custom_scan">
                              GUI scans → Custom scan
                            </Radio>
                            <Radio value="unique">Unique (specify path)</Radio>
                          </Radio.Group>
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item noStyle shouldUpdate>
                          {({ getFieldValue }) =>
                            (getFieldValue("scanType") ||
                              record?.customScan?.type) === "unique" ? (
                              <Form.Item
                                label="Custom scan path"
                                name="customScanPath"
                                initialValue={record?.customScan?.path}
                                rules={[
                                  {
                                    required: true,
                                    message: "Path required for Unique",
                                  },
                                ]}
                              >
                                <Input placeholder="e.g. C:\Scans\custom.cmd" />
                              </Form.Item>
                            ) : null
                          }
                        </Form.Item>
                      </Col>
                    </Row>
                  </>
                ),
              },
            ]}
          />

          {/* INNER FOOTER: ONLY PREV / NEXT */}
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
    </Edit>
  );
}
