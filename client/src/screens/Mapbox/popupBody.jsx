import React, { useState } from "react";
import parse from "html-react-parser";
import { Popconfirm, Typography, Col, Row } from "antd";
import {
  CalendarOutlined,
  GlobalOutlined,
  UnorderedListOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  UserOutlined,
  EditOutlined,
} from "@ant-design/icons";
import moment from "moment";
const { Text, Link, Title } = Typography;

function Item({ icon, text }) {
  if (text)
    return (
      <Row gutter={[15]} style={{ marginBottom: "10px", marginTop: "10px" }}>
        <Col
          span={4}
          className="popup-icon"
          style={{ color: "rgba(0, 0, 0, 0.78)" }}
        >
          {icon}
        </Col>
        <Col span={20}>{text}</Col>
      </Row>
    );
  else return null;
}

export default function PopupBody(props) {
  const data = {
    start: props.data.start || "unset",
    end: props.data.end || "unset",
    summary: props.data.summary || "(No Title)",
    location: props.data.location || "",
    description: props.data.description || "(No Description)",
    calendarName: props.data.calendarName || "",
    reminders: props.data.reminders,
    id: props.data.id,
    creator: props.data.creator.email,
  };
  const theUser = localStorage.getItem("user");
  const user = JSON.parse(theUser);

  const isAdmin =
    props.user?.roll === "superadmin" || props.user?.roll === "admin"
      ? true
      : false;
  console.log(isAdmin);
  const startDate = moment(data.start.dateTime).format("MMM DD, HH:mm A");
  const endDate = moment(data.end.dateTime).format("MMM DD, HH:mm A");
  return (
    <>
      <div
        style={{
          maxHeight: "40vh",
          width: "100%",
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        {/* <Space direction="vertical"> */}
        <Item
          icon={<FileTextOutlined />}
          text={
            <Title level={4} style={{ margin: 0 }}>
              {data.summary}
              <Text
                style={{
                  display: "block",
                  fontWeight: "normal",
                  color: "#8c8c8c",
                  fontSize: "12px",
                  whiteSpace: "nowrap",
                }}
              >
                {startDate} - {endDate}
              </Text>
            </Title>
          }
        />
        <Item icon={<GlobalOutlined />} text={<Text>{data.location}</Text>} />
        <Item
          icon={<UnorderedListOutlined />}
          text={<Text>{parse(data.description)}</Text>}
        />
        <Item
          icon={<CalendarOutlined />}
          text={<Text>{data.calendarName}</Text>}
        />
        <Item
          icon={<ClockCircleOutlined />}
          text={<Text>30 minutes before</Text>}
        />
        <Item icon={<UserOutlined />} text={<Text>{data.creator}</Text>} />

        {/* <p>{data.reminders.overrides[0].minutes} minutes before</p> */}
        {/* </Space> */}
      </div>
      {isAdmin ? (
        <div style={{ position: "absolute", bottom: -1, right: 3 }}>
          <Popconfirm
            title="Warning"
            description={`Are you sure want to delete "${data.summary}"?`}
            onConfirm={() => props.onDelete()}
            key={data.id}
          >
            <a href="#">
              <DeleteOutlined />
            </a>
          </Popconfirm>
        </div>
      ) : null}
      {isAdmin ? (
        <div style={{ position: "absolute", bottom: -1, left: 3 }}>
          <a href="#" onClick={() => props.onEdit()}>
            <EditOutlined />
          </a>
        </div>
      ) : null}
    </>
  );
}
