import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  Table,
  Card,
  Form,
  Input,
  Select,
  Tag,
  Button,
  Popconfirm,
  Typography,
} from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import {
  addCalendarGroup,
  deleteCalendarGroup,
  editCalendarGroup,
  getCalendarGroup,
} from "../../utils/APIRoutes";
export const GroupingCalendars = ({ calendars, data }) => {
  const [form] = Form.useForm();
  // const [data, setData] = useState([]);
  const [added, setAdded] = useState(null);
  const [editingKey, setEditingKey] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const [filteredOptions, setFilteredOptions] = useState([]);

  useEffect(() => {
    let selected = [];
    const selectedCalendars = data.map((item) => {
      selected = selected.concat(item.calendars);
    });
    const select = Object.keys(
      selected.reduce((accumulator, currentValue) => {
        if (!accumulator[currentValue]) {
          accumulator[currentValue] = true;
        }
        return accumulator;
      }, {})
    );
    // console.log(select);
    setSelectedItems(select);
    const unselect = calendars.filter((o) => !select.includes(o.label));
    console.log(unselect);
    setFilteredOptions(unselect);
  }, [data, calendars]);

  const isEditing = (record) => record.key === editingKey;
  const edit = (record) => {
    form.setFieldsValue({
      ...record,
      // name: "",
      calendars: record.calendars ? record.calendars : [],
      // open: "Opened",
    });
    setEditingKey(record.key);
    console.log(record);
  };
  useEffect(() => {
    if (added) {
      const editData = data.pop();
      edit(editData);
      console.log(editData);
    }
  }, [added, data]);
  const handleDelete = (key) => {
    setAdded(null);
    axios
      .post(deleteCalendarGroup, { key: key })
      .then((res) => {
        console.log(res.data);
      })
      .catch((err) => console.log(err));
  };
  const handleAdd = () => {
    const newData = {
      name: `Group ${data.length}`,
      open: "Opened",
    };
    const currentData = data;
    axios
      .post(addCalendarGroup, newData)
      .then((res) => {
        console.log(res.data);
        // setData([...data, newData]);
        setAdded(res.data);
      })
      .catch((err) => console.log(err));
  };
  const cancel = () => {
    setEditingKey("");
    setAdded(null);
  };
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
      inputType === "calendars" ? (
        <Select
          mode="multiple"
          placeholder="Select Calendar"
          value={record.calendars}
          // onChange={setSelectedItems}
          style={{
            width: "100%",
          }}
          options={filteredOptions.map((item) => ({
            value: item.label,
            label: item.label,
          }))}
        />
      ) : inputType === "open" ? (
        <Select
          // defaultValue="Opened"
          style={{ width: 120 }}
          // onChange={handleChange}
          options={[
            { value: "Opened", label: "Opened" },
            { value: "Closed", label: "Closed" },
          ]}
        />
      ) : (
        <Input />
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
  const save = async (key) => {
    try {
      const row = await form.validateFields();
      const index = data.findIndex((item) => key === item.key);
      console.log(row);
      if (index > -1) {
        const item = data[index];
        // data.splice(index, 1, {
        //   ...item,
        //   ...row,
        // });
        const ndata = {
          ...item,
          ...row,
        };
        // const calendarData = data.calendars.map((calendar)=>{
        //   return {id:calendar, }
        // })
        axios
          .post(editCalendarGroup, ndata)
          .then((res) => {
            setEditingKey("");
            setAdded(null);
          })
          .catch((err) => console.log(err));
      } else {
        const editData = data.pop();
        const ndata = {
          key: added,
          ...row,
        };
        console.log(ndata);
        axios
          .post(editCalendarGroup, ndata)
          .then((res) => {
            setEditingKey("");
            setAdded(null);
          })
          .catch((err) => console.log(err));
      }
    } catch (errInfo) {
      console.log("Validate Failed:", errInfo);
    }
  };
  const columns = [
    {
      title: "Key",
      dataIndex: "key",
      width: "10%",
      editable: false,
      // render: (text, record) => {
      //   return
      // },
    },
    {
      title: "Group Name",
      dataIndex: "name",
      width: "20%",
      editable: true,
    },
    {
      title: "Child Calendars",
      dataIndex: "calendars",
      width: "40%",
      editable: true,
      render: (text, record) => {
        const calendars = text ? text.map((val) => <Tag>{val}</Tag>) : null;
        return calendars;
      },
    },
    {
      title: "Default Opened State",
      dataIndex: "open",
      width: "15%",
      editable: true,
    },
    {
      title: "Edit",
      dataIndex: "operation",
      render: (_, record) => {
        const editable = isEditing(record);
        return editable ? (
          <span>
            <Typography.Link
              onClick={() => save(record.key)}
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
            disabled={editingKey !== ""}
            onClick={() => edit(record)}
          >
            Edit
          </Typography.Link>
        );
      },
    },
    {
      title: "Delete",
      dataIndex: "delete",
      width: "5%",
      editable: false,
      render: (text, record) => {
        return (
          <a>
            <DeleteOutlined onClick={() => handleDelete(record.key)} />
          </a>
        );
      },
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
        inputType: col.dataIndex,
        dataIndex: col.dataIndex,
        title: col.title,
        editing: isEditing(record),
      }),
    };
  });

  return (
    <>
      <Card className={`c-multi-drag-table `}>
        <Form form={form} component={false}>
          <Button
            onClick={handleAdd}
            type="primary"
            style={{
              marginBottom: 16,
            }}
          >
            Add a group
          </Button>
          <Table
            components={{
              body: {
                cell: EditableCell,
              },
            }}
            bordered
            dataSource={data}
            columns={mergedColumns}
            rowClassName="editable-row"
            pagination={{
              onChange: cancel,
            }}
          />
        </Form>
      </Card>
    </>
  );
};
