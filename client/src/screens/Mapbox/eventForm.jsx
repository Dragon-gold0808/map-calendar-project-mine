import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import {
  Form,
  Radio,
  Switch,
  Button,
  Input,
  Select,
  DatePicker,
  message,
  Row,
  Col,
  Spin,
  Typography,
} from "antd";
import Geocoder from "react-geocoder-mapbox";
import axios from "axios";
import {
  addCustomEvent,
  addEvent,
  deleteEvent,
  editCevent,
  editEvent,
} from "../../utils/APIRoutes";

const { RangePicker } = DatePicker;
const { TextArea } = Input;
const { Text, Title } = Typography;

export default function EventForm(props) {
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [geocode, setGeocode] = useState();
  const [reminder, setReminder] = useState({
    amount: 30,
    type: "minutes",
  });
  const [fields, setFields] = useState([
    {
      name: ["title"],
      value: "",
    },
    {
      name: ["type"],
      value: "event",
    },
    {
      name: ["time"],
      value: "",
    },
    {
      name: ["location"],
      value: "",
    },
    {
      name: ["description"],
      value: "",
    },
    {
      name: ["calendarId"],
      value: {},
    },
    {
      name: ["visibility"],
      value: "default",
    },
    {
      name: ["reminder"],
      value: "",
    },
  ]);
  useEffect(() => {
    console.log(geocode);
  }, [geocode]);
  useEffect(() => {
    setGeocode();
    const start = props.fields
      ? dayjs(props.fields.start.dateTime, "YYYY-MM-DD HH:mm")
      : "";
    const end = props.fields
      ? dayjs(props.fields.end.dateTime, "YYYY-MM-DD HH:mm")
      : "";
    setFields([
      {
        name: ["title"],
        value: props.fields?.summary,
      },
      {
        name: ["type"],
        value: "event",
      },
      {
        name: ["time"],
        value: [start, end],
      },
      {
        name: ["location"],
        value: props.fields?.location,
      },
      {
        name: ["description"],
        value: props.fields?.description,
      },
      {
        name: ["calendarId"],
        value: props.fields?.calendarId,
      },
      {
        name: ["visibility"],
        value: "default",
      },
      {
        name: ["reminder"],
        value: "",
      },
    ]);
  }, [props]);
  const onDateChange = (value, dateString) => {
    // console.log("Selected Time: ", value);
    // console.log("Formatted Selected Time: ", dateString);
  };
  const onDateOk = (value) => {
    console.log("onOk: ", value);
  };
  const [form] = Form.useForm();
  const onFinish = (val) => {
    form.resetFields();
    setLoading(true);
    const selected = props.data.find((obj) => obj.value === val.calendarId);
    if (props.mode === "add-cevent") {
      const values = {
        ...val,
        location: geocode?.place_name,
        longitude: geocode?.center[0],
        latitude: geocode?.center[1],
        calendarName: selected.label,
        color: selected.color,
        calendarId: val.calendarId,
        creator: props.user.email,
        reminders: {
          overrides: [{ method: "popup", [reminder.type]: reminder.amount }],
        },
      };
      axios
        .post(addCustomEvent, values)
        .then((res) => {
          messageApi.open({
            type: "success",
            content: "Successfully created!",
          });
          setLoading(false);
          props.onDrawerClose();
        })
        .catch((err) => {
          messageApi.open({
            type: "error",
            content: "Failed to create.",
          });
          setLoading(false);
          props.onDrawerClose();
        });
    }
    if (props.mode === "add-event") {
      const values = {
        ...val,
        location: geocode.place_name,
        reminders: {
          // overrides: [
          //   { method: "popup", [reminder.type]: reminder.amount },
          // ],
          useDefault: true,
        },
      };
      console.log(values);
      axios
        .post(addEvent, values)
        .then((res) => {
          messageApi.open({
            type: "success",
            content: "Successfully created!",
          });
          setLoading(false);
          props.onDrawerClose();
        })
        .catch((err) => {
          messageApi.open({
            type: "error",
            content: "Failed to create.",
          });
          setLoading(false);
          props.onDrawerClose();
        });
    }
    if (props.mode === "edit-event") {
      const values = {
        ...val,
        id: props.fields.id,
        oldCalendarId: props.fields.calendarId,
        reminders: {
          // overrides: [
          //   { method: "popup", [reminder.type]: reminder.amount },
          // ],
          useDefault: true,
        },
        location: geocode ? geocode.place_name : props.fields.location,
      };
      console.log(values);
      axios
        .post(editEvent, values)
        .then((res) => {
          messageApi.open({
            type: "success",
            content: "Successfully modified!",
          });
          setLoading(false);
          props.onDrawerClose();
        })
        .catch((err) => {
          messageApi.open({
            type: "error",
            content: "Failed to update.",
          });
          setLoading(false);
          props.onDrawerClose();
        });
    }
    if (props.mode === "edit-cevent") {
      const values = {
        ...val,
        calendarName: selected.label,
        color: selected.color,
        calendarId: val.calendarId,
        creator: props.user.email,
        // reminders: {
        //   overrides: [{ method: "popup", [reminder.type]: reminder.amount }],
        // },
        id: props.fields.id,
        // oldCalendarId: props.fields.calendarId,
        reminders: {
          // overrides: [
          //   { method: "popup", [reminder.type]: reminder.amount },
          // ],
          useDefault: true,
        },
        location: geocode ? geocode.place_name : props.fields.location,
        latitude: geocode ? geocode.center[1] : props.fields.latitude,
        longitude: geocode ? geocode.center[0] : props.fields.longitude,
      };
      console.log(values);
      axios
        .post(editCevent, values)
        .then((res) => {
          messageApi.open({
            type: "success",
            content: "Successfully modified!",
          });
          setLoading(false);
          props.onDrawerClose();
        })
        .catch((err) => {
          messageApi.open({
            type: "error",
            content: "Failed to update.",
          });
          setLoading(false);
          props.onDrawerClose();
        });
    }
  };
  return (
    <div>
      {contextHolder}
      <Spin
        spinning={loading}
        size="large"
        tip={
          props.mode.includes("add")
            ? "Creating in progress..."
            : "Updating in progress..."
        }
      >
        <Form
          labelCol={{
            span: 6,
          }}
          wrapperCol={{
            span: 18,
          }}
          layout="horizontal"
          initialValues={{
            size: "large",
          }}
          onFinish={onFinish}
          size={"default"}
          fields={fields}
        >
          <Form.Item label="Title" name="title">
            <Input type={"text"} placeholder="Input Title" />
          </Form.Item>
          <Form.Item label="Type" name="type">
            <Radio.Group buttonStyle="solid">
              <Radio.Button value="event">Event</Radio.Button>
              <Radio.Button value="task">Task</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item
            label="DateTime"
            rules={props.mode === "add-cevent" ? [] : [{ required: true }]}
            name="time"
          >
            <RangePicker
              showTime={{ format: "HH:mm" }}
              format="YYYY-MM-DD HH:mm"
              onChange={onDateChange}
              onOk={onDateOk}
            />
          </Form.Item>
          <Form.Item
            label="Location"
            name={"location"}
            // rules={props.mode === "add-cevent" ? [{ required: true }] : []}
          >
            <Geocoder
              accessToken={process.env.REACT_APP_MAPBOX_TOKEN}
              onSelect={(geocoderObject) => {
                setGeocode(geocoderObject);
              }}
              inputPlaceholder="Search Location"
              inputClass="ant-input css-i0102m"
            />
          </Form.Item>
          <Form.Item label="Description" name={"description"}>
            <TextArea
              placeholder="Input description here"
              autoSize={{ minRows: 3, maxRows: 6 }}
            />
          </Form.Item>
          {props.mode.includes("cevent") ? (
            <Form.Item label={"Group"} name={"calendarId"}>
              <Select>
                {props.data
                  .filter((val) => val.kind === "group")
                  .map((val) => (
                    <Select.Option value={val.value}>{val.label}</Select.Option>
                  ))}
              </Select>
            </Form.Item>
          ) : (
            <Form.Item label={"Calendar"} name={"calendarId"}>
              <Select>
                {props.data
                  .filter((val) => val.kind === "calendar")
                  .map((val) => (
                    <Select.Option value={val.value}>{val.label}</Select.Option>
                  ))}
              </Select>
            </Form.Item>
          )}

          <Form.Item label="Busy" valuePropName="checked">
            <Switch defaultChecked />
          </Form.Item>
          <Form.Item label="Visibility" name={"visibility"}>
            <Select
              // defaultValue="default"
              options={[
                { value: "default", label: "Default Visibility" },
                { value: "public", label: "Public" },
                { value: "private", label: "Private" },
              ]}
            />
          </Form.Item>
          <Form.Item label="Alarm">
            <Row gutter={[10]}>
              <Col span={8}>
                <Input
                  type={"number"}
                  value={reminder.amount}
                  onChange={(e) =>
                    setReminder({ ...reminder, amount: e.target.value })
                  }
                />
              </Col>
              <Col span={10}>
                <Select
                  value={reminder.type}
                  onChange={(value) =>
                    setReminder({ ...reminder, type: value })
                  }
                  options={[
                    { value: "minutes", label: "Minutes" },
                    { value: "mours", label: "Hours" },
                    { value: "mays", label: "Days" },
                    { value: "meeks", label: "Weeks" },
                  ]}
                />
              </Col>
              <Col span={6}>
                <Text style={{ verticalAlign: "sub" }}>Before</Text>
              </Col>
            </Row>
          </Form.Item>
          <Form.Item
            wrapperCol={{
              offset: 6,
              span: 18,
            }}
          >
            <Button type="primary" htmlType="submit">
              Submit
            </Button>
          </Form.Item>
        </Form>
      </Spin>
    </div>
  );
}
