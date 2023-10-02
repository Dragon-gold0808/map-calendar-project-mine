import React, { useEffect, useState } from "react";
import axios from "axios";
import { acceptUser, deleteUser, getAllUsers } from "../utils/APIRoutes";
// import {
//   UploadOutlined,
//   UserOutlined,
//   VideoCameraOutlined,
// } from "@ant-design/icons";
import {
  Layout,
  Table,
  Switch,
  Popconfirm,
  Card,
  Form,
  Tag,
  Input,
  Select,
  Typography,
} from "antd";
import {
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
const { Content, Header, Sider } = Layout;

export default function AdminContainer(props) {
  const [users, setUsers] = useState();
  const [form] = Form.useForm();
  const [data, setData] = useState();
  const [editingKey, setEditingKey] = useState("");
  const [options, setOptions] = useState([]);

  useEffect(() => {
    const option = props.calendars.map((calendar) => {
      return { label: calendar.label, value: calendar.label };
    });
    setOptions(option);
  }, [props.calendars]);

  const EditableCell = ({
    editing,
    dataIndex,
    title,
    inputType,
    record,
    index,
    children,
    ...restProps
  }) => {
    const inputNode =
      inputType === "select" ? (
        <Select
          defaultValue="user"
          style={{
            width: 120,
          }}
          // onChange={handleChange}
          options={[
            {
              value: "superadmin",
              label: "superadmin",
              disabled: true,
            },
            {
              value: "admin",
              label: "admin",
            },
            {
              value: "user",
              label: "user",
            },
          ]}
        />
      ) : (
        <Select
          mode="multiple"
          allowClear
          style={{
            width: "100%",
          }}
          placeholder="Please select calendars"
          // defaultValue={}
          options={options}
        />
      );
    return (
      <td {...restProps}>
        {editing ? (
          <Form.Item
            name={dataIndex}
            style={{
              margin: 0,
            }}
            rules={[
              {
                required: true,
                message: `Please Input ${title}!`,
              },
            ]}
          >
            {inputNode}
          </Form.Item>
        ) : (
          children
        )}
      </td>
    );
  };

  const isEditing = (record) => record.key === editingKey;
  const edit = (record) => {
    form.setFieldsValue({
      roll: "",
      calendars: [],
      ...record,
    });
    setEditingKey(record.key);
  };
  const cancel = () => {
    setEditingKey("");
  };
  const save = async (key) => {
    try {
      const row = await form.validateFields();
      const index = users.findIndex((item) => key === item.email);
      if (index > -1) {
        const item = users[index];
        const updatedUser = {
          ...item,
          ...row,
        };
        const savedUser = {
          email: updatedUser.email,
          roll: updatedUser.roll,
          updatedAt: updatedUser.updatedAt,
          calendars: updatedUser.calendars,
        };
        const fetchData = async () => {
          try {
            const response = await axios.post(acceptUser, savedUser);
            console.log(response.data); // Assuming you want to log the response data
          } catch (error) {
            console.error("Failed to fetch data:", error);
          }
        };

        fetchData();
        // setUsers(users);
        setEditingKey("");
      } else {
        // newData.push(row);
        // setUsers(newData);
        setEditingKey("");
      }
    } catch (errInfo) {
      console.log("Validate Failed:", errInfo);
    }
  };
  const fetchUsers = (event) => {
    // Establish SSE connection
    const data = JSON.parse(event.data);
    setUsers(data);
  };
  const fetchUpdatedUsers = (event) => {
    // Establish SSE connection
    const data = JSON.parse(event.data);
    setUsers(data);
  };
  useEffect(() => {
    const theUser = localStorage.getItem("user");
    const email = JSON.parse(theUser).email;
    const usersSource = new EventSource(`${getAllUsers}?email=${email}`, {
      withCredentials: true,
    });
    usersSource.addEventListener("initialResponse", fetchUsers);
    usersSource.addEventListener("updatedUsers", fetchUpdatedUsers);
    return () => {
      usersSource.close();
      onStateChange(email, "checked");
    };
  }, []);

  const onStateChange = (email, checked, state) => {
    const newState = !state;
    console.log(`${email} switched to ${newState}`);
    const fetchData = async () => {
      try {
        const response = await axios.post(acceptUser, {
          email,
          state: newState,
          checked,
        });
        console.log(response.data); // Assuming you want to log the response data
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    };

    fetchData();
  };

  const handleDelete = (email) => {
    const deleteData = async () => {
      try {
        const response = await axios.post(deleteUser, { email });
        console.log(response.data); // Assuming you want to log the response data
      } catch (error) {
        console.error("Failed to delete data:", error);
      }
    };
    deleteData();
  };

  const columns = [
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      editable: false,
      width: "15%",
      render: (text) => <a>{text}</a>,
    },
    {
      title: "Roll",
      dataIndex: "roll",
      key: "roll",
      editable: true,
      width: "7%",
    },
    {
      title: "Calendars to show",
      dataIndex: "calendars",
      key: "calendars",
      editable: true,
      width: "38%",
      render: (text, record) => {
        return text ? text.map((val) => <Tag>{val}</Tag>) : null;
      },
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      editable: false,
      key: "createdAt",
      width: "10%",
    },
    {
      title: "Last Visted At",
      dataIndex: "visitedAt",
      editable: false,
      key: "visitedAt",
      width: "10%",
    },
    {
      title: "Allow / Disable",
      key: "state",
      editable: false,
      dataIndex: "state",
      width: "5%",
      render: (text, record) => (
        <Switch
          checkedChildren={<CheckOutlined />}
          unCheckedChildren={<CloseOutlined />}
          defaultChecked={text ? true : false}
          onChange={() => {
            onStateChange(record.email, "none", text);
          }}
          disabled={
            record.roll === "superadmin" || record.roll === props.user?.roll
              ? true
              : false
          }
          key={record.email}
        />
      ),
    },
    {
      title: "Operation",
      dataIndex: "operation",
      editable: false,
      width: "10%",
      render: (_, record) => {
        const editable = isEditing(record);
        return editable ? (
          <span>
            <Typography.Link
              onClick={() => save(record.email)}
              style={{
                marginRight: 8,
              }}
            >
              Save
            </Typography.Link>
            <Popconfirm title="Sure to cancel?" onConfirm={cancel}>
              <a>Cancel</a>
            </Popconfirm>
          </span>
        ) : (
          <Typography.Link
            disabled={
              editingKey !== "" ||
              record.roll === "superadmin" ||
              record.roll === props.user?.roll
            }
            onClick={() => edit(record)}
          >
            Edit
          </Typography.Link>
        );
      },
    },
    {
      title: "Delete",
      key: "delete",
      editable: false,
      width: "5%",
      render: (text, record) => (
        <Popconfirm
          title="Warning"
          description={`Are you sure want to delete "${record.email}"?`}
          onConfirm={() => handleDelete(record.email)}
          key={record.email}
          disabled={
            record.roll === "superadmin" || record.roll === props.user?.roll
              ? true
              : false
          }
        >
          <DeleteOutlined style={{ fontSize: 20, color: "#1677ff" }} />
        </Popconfirm>
      ),
    },
  ];
  const mergedColumns = columns.map((col) => {
    if (!col.editable) {
      return col;
    }
    return {
      ...col,
      onCell: (record) => ({
        record,
        inputType: col.dataIndex === "roll" ? "select" : "multiselect",
        dataIndex: col.dataIndex,
        title: col.title,
        editing: isEditing(record),
      }),
    };
  });
  const originData = users
    ? users.map((user) => {
        return {
          ...user,
          key: user?.email,
          calendars: user?.calendars,
        };
      })
    : null;
  // for (let i = 0; i < 100; i++) {
  //   originData.push({
  //     key: i.toString(),
  //     name: `Edward ${i}`,
  //     age: 32,
  //     address: `London Park no. ${i}`,
  //   });
  // }
  return (
    <Card className={`c-multi-drag-table `}>
      <Form form={form} component={false}>
        <Table
          columns={mergedColumns}
          components={{
            body: {
              cell: EditableCell,
            },
          }}
          bordered
          dataSource={originData}
          rowClassName="editable-row"
          pagination={{
            onChange: cancel,
          }}
        />
      </Form>
    </Card>
  );
}
