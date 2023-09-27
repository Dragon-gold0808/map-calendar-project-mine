import React, { useState, useEffect } from "react";
import { Form, Input, Button, message, Spin, ColorPicker } from "antd";
import axios from "axios";
import {
  addCalendar,
  addGroup,
  updateCalendar,
  updateGroup,
} from "../../utils/APIRoutes";
const { TextArea } = Input;

export default function CalendarForm(props) {
  const colors = [
    "#F5222D",
    "#FA8C16",
    "#FADB14",
    "#8BBB11",
    "#52C41A",
    "#13A8A8",
    "#1677FF",
    "#2F54EB",
    "#722ED1",
    "#EB2F96",
  ];
  // Generate a random index within the range of the array length
  const randomIndex = Math.floor(Math.random() * colors.length);

  // Retrieve the random color using the random index
  const randomColor = colors[randomIndex];
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState(false);
  const [color, setColor] = useState(randomColor);
  const [fields, setFields] = useState([
    {
      name: ["title"],
      value: "",
    },
    {
      name: ["description"],
      value: "",
    },
    {
      name: ["color"],
      value: "",
    },
  ]);
  useEffect(() => {
    console.log(props.color);
    setFields([
      {
        name: ["title"],
        value: props.title,
      },
      {
        name: ["description"],
        value: props.desc,
      },
      {
        name: ["color"],
        value: props.color,
      },
    ]);
    setColor(randomColor);
  }, [props, randomColor]);
  const [form] = Form.useForm();
  const onFinish = (val) => {
    const values = { ...val, color: val.color ? val.color : color };
    console.log(values);
    form.resetFields();
    setLoading(true);
    if (props.mode === "add-calendar")
      axios
        .post(addCalendar, values)
        .then((res) => {
          messageApi.open({
            type: "success",
            content: "Successfully created",
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
    if (props.mode === "edit-calendar") {
      const newCalendar = { ...values, id: props.id };
      axios
        .post(updateCalendar, newCalendar)
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
    if (props.mode === "add-group")
      axios
        .post(addGroup, values)
        .then((res) => {
          messageApi.open({
            type: "success",
            content: "Successfully created",
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
    if (props.mode === "edit-group") {
      const editedGroup = { ...values, id: props.id };
      axios
        .post(updateGroup, editedGroup)
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

  // console.log(defaultValues);
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
          size={"default"}
          onFinish={onFinish}
          form={form}
          fields={fields}
        >
          <Form.Item
            label="Title"
            name="title"
            rules={[{ required: true }]}
            // initialValue={defaultValues.title}
          >
            <Input
              type={"text"}
              placeholder="Input Calendar Name"
              // defaultValue={defaultValues.title}
            />
          </Form.Item>
          <Form.Item label="Description" name="description">
            <TextArea
              placeholder="Input description here"
              autoSize={{ minRows: 3, maxRows: 6 }}
              // defaultValue={defaultValues.desc}
            />
          </Form.Item>
          {props.mode.includes("group") ? (
            <Form.Item label="Color" name="color">
              <ColorPicker
                disabledAlpha
                format="hex"
                presets={[
                  {
                    label: "Recommended",
                    colors: colors,
                  },
                  // {
                  //   label: "Recent",
                  //   colors: [],
                  // },
                ]}
                defaultValue={randomColor}
                value={color}
                onChangeComplete={(color) => {
                  setColor(color.toHexString());
                }}
              />
            </Form.Item>
          ) : null}

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
