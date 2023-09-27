import React, { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { UserOutlined, GroupOutlined } from "@ant-design/icons";
import { Layout, Menu } from "antd";
const { Content, Header, Sider } = Layout;

export default function Adimin() {
  const location = useLocation().pathname;
  const items = [
    {
      key: "1",
      label: "User Management",
      icon: (
        <a href="/admin/users">
          <UserOutlined />
        </a>
      ),
    },
    {
      key: "2",
      label: "Grouping Calendars",
      icon: (
        <a href="/admin/groups">
          <GroupOutlined />
        </a>
      ),
    },
  ];
  return (
    <>
      <Layout style={{ height: "100vh" }}>
        <Header
          style={{
            background: "#001529",
            height: "100px",
          }}
        >
          <h1 style={{ color: "white" }}>Admin Page</h1>
        </Header>
        <Layout>
          <Sider
            width={200}
            // style={{
            //   background: colorBgContainer,
            // }}
          >
            <Menu
              theme="dark"
              mode="inline"
              defaultSelectedKeys={["1"]}
              defaultOpenKeys={["sub1"]}
              style={{
                height: "100%",
                borderRight: 0,
              }}
              items={items}
              selectedKeys={location === "/admin/users" ? "1" : "2"}
            />
          </Sider>
          <Layout>
            <Content
              style={{
                margin: "24px 16px 0",
                // minHeight: "800px",
              }}
            >
              {/* <AdminContainer users={users} /> */}
              <Outlet />
            </Content>
          </Layout>
        </Layout>
      </Layout>
    </>
  );
}
