import React, { useEffect, useState } from "react";
import axios from "axios";
import { acceptUser, deleteUser, getAllUsers } from "../utils/APIRoutes";
// import {
//   UploadOutlined,
//   UserOutlined,
//   VideoCameraOutlined,
// } from "@ant-design/icons";
import { Layout, Table, Switch, Popconfirm, Card } from "antd";
import {
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
const { Content, Header, Sider } = Layout;

export default function AdminContainer(props) {
  const [users, setUsers] = useState();
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
      onStateChange(process.env.REACT_APP_SUPERADMIN, "checked");
    };
  }, []);

  const onStateChange = (email, checked, state) => {
    const newState = !state;
    console.log(`${email} switched to ${newState}`);
    const fetchData = async () => {
      try {
        const response = await axios.post(acceptUser, {
          email,
          newState,
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
      render: (text) => <a>{text}</a>,
    },
    {
      title: "Roll",
      dataIndex: "roll",
      key: "roll",
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
    },
    {
      title: "Updated At",
      dataIndex: "updatedAt",
      key: "updatedAt",
    },
    {
      title: "Last Visted At",
      dataIndex: "visitedAt",
      key: "visitedAt",
    },
    {
      title: "Allow / Disable",
      key: "state",
      dataIndex: "state",
      render: (text, record) => (
        <Switch
          checkedChildren={<CheckOutlined />}
          unCheckedChildren={<CloseOutlined />}
          defaultChecked={text ? true : false}
          onChange={() => {
            onStateChange(record.email, "none", text);
          }}
          disabled={
            record.email === process.env.REACT_APP_SUPERADMIN ? true : false
          }
          key={record.email}
        />
      ),
    },
    {
      title: "Delete",
      key: "delete",
      render: (text, record) => (
        <Popconfirm
          title="Warning"
          description={`Are you sure want to delete "${record.email}"?`}
          onConfirm={() => handleDelete(record.email)}
          key={record.email}
          disabled={
            record.email === process.env.REACT_APP_SUPERADMIN ? true : false
          }
        >
          <DeleteOutlined style={{ fontSize: 20, color: "#1677ff" }} />
        </Popconfirm>
      ),
    },
  ];
  return (
    <Card className={`c-multi-drag-table `}>
      <Table columns={columns} dataSource={users} />
    </Card>
  );
}
