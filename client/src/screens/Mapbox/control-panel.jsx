import * as React from "react";
import { useState, useEffect } from "react";
import {
  Space,
  Button,
  Divider,
  Checkbox,
  Dropdown,
  Drawer,
  Typography,
  Popconfirm,
  DatePicker,
  message,
  Menu,
  Tooltip,
  Badge,
  Spin,
  Tree,
  Col,
  Row,
} from "antd";
import axios from "axios";
import {
  PlusCircleOutlined,
  UserAddOutlined,
  DeleteOutlined,
  EditOutlined,
} from "@ant-design/icons";
import EventForm from "./eventForm.jsx";
import CalendarForm from "./calendarForm.jsx";
import {
  deleteCalendar,
  deleteGroup,
  getCalendarGroup,
} from "../../utils/APIRoutes.js";
import Pin from "./pin.jsx";
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
function ControlPanel({
  filters,
  onFilterChange,
  onRangeChange,
  user,
  newUsersNum,
  editEvent,
  editClose,
  data,
}) {
  const [messageApi, contextHolder] = message.useMessage();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerContent, setDrawerContent] = useState();
  const [drawerTitle, setDrawerTitle] = useState();
  const [checkedFilters, setCheckedFilters] = useState([]);
  const [checkedGroups, setCheckedGroups] = useState([]);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [grouping, setGrouping] = useState();
  const [calendarData, setCalendarData] = useState();
  const [expandedKeys, setExpandedKeys] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [autoExpandParent, setAutoExpandParent] = useState(true);

  useEffect(() => {
    const filterLabels = filters.map((filter) => filter.label);
    const group = data
      ? data.map((item) => {
          const groupCal = item.calendars
            ? item.calendars
                .filter((val) => filterLabels.includes(val))
                .map((val) => {
                  return filters.find((filter) => filter.label === val);
                })
            : null;
          return { ...item, calendars: groupCal };
        })
      : null;
    setGrouping(group);
  }, [data, filters]);
  const handleDeleteOk = ({ value, kind, label }) => {
    setConfirmLoading(true);
    const deleteUrl = kind === "group" ? deleteGroup : deleteCalendar;
    axios
      .delete(deleteUrl, {
        data: { id: value, summary: label },
      })
      .then((res) => {
        messageApi.open({
          type: "success",
          content: "Successfully deleted",
        });
        setConfirmLoading(false);
      })
      .catch((err) => {
        messageApi.open({
          type: "error",
          content: "Failed to delete",
        });
        setConfirmLoading(false);
      });
  };
  useEffect(() => {
    const expanded = grouping
      ? grouping
          .filter((value) => value.open === "Opened")
          .map((val) => val.key)
      : [];
    setExpandedKeys(expanded);

    const calendard = grouping
      ? grouping.map((group) => {
          return {
            title: group.name,
            key: group.key,
            children:
              group.calendars && group.calendars[0]
                ? group.calendars.map((calendar) => {
                    return {
                      title: isAdmin ? (
                        <>
                          <Dropdown
                            // menu={{ items: createOptions }}
                            overlay={
                              <Menu>
                                <Menu.Item key="edit">
                                  <a
                                    onClick={(ee) => {
                                      // ee.preventDefault();
                                      ee.stopPropagation();

                                      setDrawerOpen(true);
                                      setDrawerTitle("Edit Calendar");
                                      calendar.kind === "group"
                                        ? setDrawerContent(
                                            <CalendarForm
                                              onDrawerClose={onDrawerClose}
                                              title={calendar?.label}
                                              desc={calendar?.desc}
                                              id={calendar?.value}
                                              color={calendar?.color}
                                              mode="edit-group"
                                            />
                                          )
                                        : setDrawerContent(
                                            <CalendarForm
                                              onDrawerClose={onDrawerClose}
                                              title={calendar?.label}
                                              desc={calendar?.desc}
                                              id={calendar?.value}
                                              mode="edit-calendar"
                                            />
                                          );
                                    }}
                                  >
                                    <EditOutlined /> &nbsp; Edit
                                  </a>
                                </Menu.Item>
                                <Menu.Item key="delete">
                                  <Popconfirm
                                    title="Warning"
                                    description={`Are you sure want to delete ${calendar?.label}?`}
                                    onConfirm={(ee) => handleDeleteOk(calendar)}
                                    key={calendar?.value}
                                  >
                                    <a
                                      href="#"
                                      onClick={(ee) => {
                                        ee.stopPropagation();
                                      }}
                                    >
                                      <DeleteOutlined />
                                      &nbsp;Delete
                                    </a>
                                  </Popconfirm>
                                </Menu.Item>
                              </Menu>
                            }
                            trigger={["contextMenu"]}
                          >
                            <Tooltip
                              title={calendar?.desc}
                              key={calendar?.value}
                              color={calendar?.color}
                            >
                              {calendar?.label}
                            </Tooltip>
                          </Dropdown>
                          <div
                            style={{
                              position: "absolute",
                              left: "-57px",
                              top: "-4px",
                            }}
                          >
                            <Pin
                              color={calendar?.color}
                              type={
                                calendar?.kind === "group"
                                  ? "group"
                                  : "calendar"
                              }
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <Tooltip
                            title={calendar?.desc}
                            key={calendar?.value}
                            color={calendar?.color}
                          >
                            {calendar?.label}
                          </Tooltip>
                          <div
                            style={{
                              position: "absolute",
                              left: "-57px",
                              top: "-4px",
                            }}
                          >
                            <Pin
                              color={calendar?.color}
                              type={
                                calendar?.kind === "group"
                                  ? "group"
                                  : "calendar"
                              }
                            />
                          </div>
                        </>
                      ),
                      key: calendar?.value,
                    };
                  })
                : [],
          };
        })
      : null;
    setCalendarData(calendard);
  }, [grouping]);

  const treeData = [
    {
      title: "0-0-0",
      key: "0-0-0",
      children: [
        {
          title: (
            <>
              <UserAddOutlined />
              <a>adf</a>
            </>
          ),
          key: "0-0-0-0",
        },
        {
          title: "0-0-0-1",
          key: "0-0-0-1",
        },
        {
          title: "0-0-0-2",
          key: "0-0-0-2",
        },
      ],
    },
    {
      title: "0-0-1",
      key: "0-0-1",
      children: [
        {
          title: "0-0-1-0",
          key: "0-0-1-0",
        },
        {
          title: "0-0-1-1",
          key: "0-0-1-1",
        },
        {
          title: "0-0-1-2",
          key: "0-0-1-2",
        },
      ],
    },
    {
      title: "0-0-2",
      key: "0-0-2",
    },
  ];
  const onExpand = (expandedKeysValue) => {
    // console.log("onExpand", expandedKeysValue);
    // if not set autoExpandParent to false, if children expanded, parent can not collapse.
    // or, you can remove all expanded children keys.
    setExpandedKeys(expandedKeysValue);
    setAutoExpandParent(false);
  };
  const onSelect = (selectedKeysValue, info) => {
    // console.log("onSelect", info);
    setSelectedKeys(selectedKeysValue);
  };
  const isAdmin =
    user?.roll === "superadmin" || user?.roll === "admin" ? true : false;

  const createOptions = [
    {
      label: (
        <span
          onClick={() => {
            setDrawerOpen(true);
            setDrawerTitle("New Calendar");
            setDrawerContent(
              <CalendarForm
                onDrawerClose={onDrawerClose}
                title={""}
                desc={""}
                mode="add-calendar"
              />
            );
          }}
        >
          New Calendar
        </span>
      ),
      key: "0",
    },
    {
      label: (
        <span
          onClick={() => {
            setDrawerOpen(true);
            setDrawerTitle("New Calendar Event");
            setDrawerContent(
              <EventForm
                onDrawerClose={onDrawerClose}
                mode="add-event"
                data={filters}
                fields=""
              />
            );
          }}
        >
          New Calendar Event
        </span>
      ),
      key: "1",
    },
    {
      type: "divider",
    },
    {
      label: (
        <span
          onClick={() => {
            setDrawerOpen(true);
            setDrawerTitle("New Custom Calendar");
            setDrawerContent(
              <CalendarForm
                onDrawerClose={onDrawerClose}
                title={""}
                desc={""}
                mode="add-group"
              />
            );
          }}
        >
          New Custom Calendar
        </span>
      ),
      key: "3",
    },
    {
      label: (
        <span
          onClick={() => {
            setDrawerOpen(true);
            setDrawerTitle("New Custom Event");
            setDrawerContent(
              <EventForm
                onDrawerClose={onDrawerClose}
                mode="add-cevent"
                data={filters}
                user={user}
                fields=""
              />
            );
          }}
        >
          New Custom Event
        </span>
      ),
      key: "4",
    },
    {
      type: "divider",
    },
    {
      label: (
        <a href="/admin/groups">
          <span>Grouping Calendars</span>
        </a>
      ),
      key: "5",
    },
  ];
  const onDrawerClose = () => {
    setDrawerOpen(false);
    editClose();
  };
  useEffect(() => {
    const initialValues = []; //filters.map((filter) => filter.value);
    setCheckedFilters(initialValues);
    setCheckedGroups(initialValues);
    onFilterChange(initialValues);
  }, [filters, onFilterChange]);

  useEffect(() => {
    if (editEvent.open) {
      setDrawerOpen(editEvent.open);
      const content =
        editEvent.kind === "event"
          ? "Edit Calendar Event"
          : "Edit Custom Event";
      setDrawerTitle(content);
      const formContent =
        editEvent.kind === "event" ? (
          <EventForm
            onDrawerClose={() => {
              setDrawerOpen(false);
              editClose();
            }}
            mode="edit-event"
            data={filters}
            fields={editEvent.data}
          />
        ) : (
          <EventForm
            onDrawerClose={() => {
              setDrawerOpen(false);
              editClose();
            }}
            mode="edit-cevent"
            data={filters}
            fields={editEvent.data}
            user={user}
          />
        );
      setDrawerContent(formContent);
    }
  }, [editEvent, filters, editClose, user]);

  const onFiltersChange = (checkedValues) => {
    setCheckedFilters(checkedValues);
    onFilterChange(checkedValues.concat(checkedGroups));
  };
  const onGroupsChange = (checkedValues) => {
    setCheckedGroups(checkedValues);
    onFilterChange(checkedFilters.concat(checkedValues));
  };
  const onDateChange = (value, dateString) => {
    console.log("Selected Time: ", value);
    console.log("Formatted Selected Time: ", dateString);
    onRangeChange(dateString);
  };
  const onDateOk = (value) => {
    // console.log("onOk: ", value);
    return null;
  };
  return (
    <div className="control-panel">
      {contextHolder}
      <Spin
        spinning={confirmLoading}
        size="large"
        tip="Deleting in progress..."
      >
        <Title level={2} style={{ textAlign: "center" }}>
          Stay Organized!
        </Title>
        {isAdmin ? <Divider /> : null}
        <Space direction="vertical" style={{ marginBottom: 20, width: "100%" }}>
          {isAdmin ? (
            <div style={{ display: "flex", justifyContent: "space-around" }}>
              <Badge count={newUsersNum}>
                <Button
                  type="primary"
                  shape="round"
                  size="large"
                  href="/admin/users"
                >
                  <UserAddOutlined />
                  USERS
                </Button>
              </Badge>
              <Dropdown menu={{ items: createOptions }} trigger={["click"]}>
                <Button
                  type="primary"
                  shape="round"
                  size="large"
                  // style={{ display: isAdmin ? "" : "none" }}
                >
                  <PlusCircleOutlined />
                  CREATE
                </Button>
              </Dropdown>
            </div>
          ) : null}
          <Divider orientation="left"> Date Range </Divider>
          <Row>
            <Col span={20} offset={2}>
              <RangePicker
                // showTime={{ format: "HH:mm" }}
                format="YYYY-MM-DD"
                onChange={onDateChange}
                onOk={onDateOk}
              />
            </Col>
          </Row>

          <Divider orientation="left"> Calendars </Divider>
          <Tree
            checkable
            selectable={false}
            onExpand={onExpand}
            expandedKeys={expandedKeys}
            autoExpandParent={autoExpandParent}
            onCheck={onFiltersChange}
            checkedKeys={checkedFilters}
            onSelect={onSelect}
            selectedKeys={selectedKeys}
            treeData={calendarData}
            style={{
              fontSize: "medium",
              // display: "flex",
              // alignItems: "center",
            }}
          />
          <Checkbox.Group
            // options={filters}
            value={checkedGroups}
            onChange={onGroupsChange}
            style={{
              display: "flex",
              flexDirection: "column",
              zIndex: 0,
              fontSize: "medium",
            }}
          >
            {filters.map((filter, key) => {
              return filter ? (
                filter.kind.includes("group") ? (
                  <div
                    key={filter.value}
                    style={{
                      // whiteSpace: "nowrap",
                      display: "flex",
                      alignItems: "center",
                      // flexWrap: "wrap",
                    }}
                  >
                    <Pin
                      color={filter.color}
                      type={filter.kind === "group" ? "group" : "calendar"}
                    />
                    &nbsp;
                    <Checkbox
                      value={filter.value}
                      className="large-checkbox"
                      style={{
                        fontSize: "medium",
                        width: "232px",
                      }}
                    >
                      {isAdmin ? (
                        <Dropdown
                          // menu={{ items: createOptions }}
                          overlay={
                            <Menu>
                              <Menu.Item key="edit">
                                <a
                                  onClick={(ee) => {
                                    // ee.preventDefault();
                                    ee.stopPropagation();

                                    setDrawerOpen(true);
                                    setDrawerTitle("Edit Calendar");
                                    filter.kind === "group"
                                      ? setDrawerContent(
                                          <CalendarForm
                                            onDrawerClose={onDrawerClose}
                                            title={filter.label}
                                            desc={filter.desc}
                                            id={filter.value}
                                            color={filter.color}
                                            mode="edit-group"
                                          />
                                        )
                                      : setDrawerContent(
                                          <CalendarForm
                                            onDrawerClose={onDrawerClose}
                                            title={filter.label}
                                            desc={filter.desc}
                                            id={filter.value}
                                            mode="edit-calendar"
                                          />
                                        );
                                  }}
                                >
                                  <EditOutlined /> &nbsp; Edit
                                </a>
                              </Menu.Item>
                              <Menu.Item key="delete">
                                <Popconfirm
                                  title="Warning"
                                  description={`Are you sure want to delete ${filter.label}?`}
                                  onConfirm={(ee) => handleDeleteOk(filter)}
                                  key={filter.value}
                                >
                                  <a
                                    href="#"
                                    onClick={(ee) => {
                                      ee.stopPropagation();
                                    }}
                                  >
                                    <DeleteOutlined />
                                    &nbsp;Delete
                                  </a>
                                </Popconfirm>
                              </Menu.Item>
                            </Menu>
                          }
                          trigger={["contextMenu"]}
                        >
                          <div
                            style={{ wordWrap: "break-word", width: "200px" }}
                          >
                            <Tooltip
                              title={filter.desc}
                              key={filter.value}
                              color={filter.color}
                            >
                              {filter.label}
                            </Tooltip>
                          </div>
                        </Dropdown>
                      ) : (
                        <div style={{ wordWrap: "break-word", width: "200px" }}>
                          <Tooltip
                            title={filter.desc}
                            key={filter.value}
                            color={filter.color}
                          >
                            {filter.label}
                          </Tooltip>
                        </div>
                      )}
                    </Checkbox>
                  </div>
                ) : null
              ) : (
                <Divider orientation="left" key={"divider"}>
                  Custom Calendars
                </Divider>
              );
            })}
          </Checkbox.Group>
        </Space>
        <Drawer
          title={drawerTitle}
          placement="right"
          onClose={onDrawerClose}
          open={drawerOpen}
          closable={false}
        >
          {drawerContent}
        </Drawer>
      </Spin>
    </div>
  );
}

export default React.memo(ControlPanel);
