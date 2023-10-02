import React, { useEffect } from "react";
import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { FloatButton, message } from "antd";
import { LogoutOutlined, HomeOutlined } from "@ant-design/icons";
import axios from "axios";

import Home from "./screens/Home";
import Login from "./screens/Login";
import Adimin from "./screens/Admin";
import Mapbox from "./screens/Mapbox/app";
import GroupedCheckboxes from "./screens/drag";
import { GroupingCalendars } from "./components/grouping";
import {
  getCalendars,
  getCustomEvents,
  getEvents,
  getAllUsers,
  getCalendarGroup,
  getGroups,
  validateUser,
} from "./utils/APIRoutes";
import { Spin } from "antd";
import "./App.css";
import AdminContainer from "./components/AdminContainer";

const App = () => {
  const [user, setUser] = useState({});
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [grouping, setGrouping] = useState([]);
  const [cevents, setCevents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [calendars, setCalendars] = useState([]);
  const [filteredCalendars, setFilteredCalendars] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newUsers, setNewUsers] = useState(0);
  const [messageApi, contextHolder] = message.useMessage();
  const logout = () => {
    messageApi.open({
      type: "success",
      content: "Successfully logged out",
    });
    message.success("Successfully logged out");
    localStorage.removeItem("user");
    window.location.reload();
  };

  // const validation = async (email) => {
  //   await axios
  //     .post(validateUser, { email })
  //     .then((res) => res.json())
  //     .then((data) => {
  //       console.log(data.message);
  //       return data.message;
  //     })
  //     .catch((err) => {
  //       return false;
  //     });
  // };

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
  const fetchEvents = (event) => {
    // Establish SSE connection
    const data = JSON.parse(event.data);
    setLoading(false);
    setEvents(data);
  };
  const fetchUpdatedEvents = (event) => {
    // Establish SSE connection
    const data = JSON.parse(event.data);
    setEvents(data);
  };
  const fetchCevents = (event) => {
    // Establish SSE connection
    const data = JSON.parse(event.data);
    setLoading(false);
    setCevents(data);
  };
  const fetchUpdatedCevents = (event) => {
    // Establish SSE connection
    const data = JSON.parse(event.data);
    setCevents(data);
  };
  const fetchCalendars = (event) => {
    // Establish SSE connection
    const data = JSON.parse(event.data);
    setLoading(false);
    setCalendars(data);
  };
  const fetchUpdatedCalendars = (event) => {
    // Establish SSE connection
    const data = JSON.parse(event.data);
    setCalendars(data);
  };
  const fetchGroups = (event) => {
    // Establish SSE connection
    const data = JSON.parse(event.data);
    setLoading(false);
    setGroups(data);
  };
  const fetchUpdatedGroups = (event) => {
    // Establish SSE connection
    const data = JSON.parse(event.data);
    setGroups(data);
  };
  const fetchData = (event) => {
    // Establish SSE connection
    const data = JSON.parse(event.data);
    setGrouping(data);
  };
  const fetchUpdatedData = (event) => {
    const data = JSON.parse(event.data);

    setGrouping(data);
  };

  useEffect(() => {
    const theUser = localStorage.getItem("user");

    const usersSource = new EventSource(`${getAllUsers}?email=${email}`, {
      withCredentials: true,
    });
    usersSource.addEventListener("initialResponse", fetchUsers);
    usersSource.addEventListener("updatedUsers", fetchUpdatedUsers);
    if (theUser && !theUser.includes("undefined")) {
      const email = JSON.parse(theUser).email;
      // const eventSource = new EventSource(`${getEvents}?email=${email}`, {
      //   withCredentials: true,
      // });
      axios
        .get(`${getEvents}?email=${email}`)
        .then((res) => {
          console.log(res.data);
          // res.data.length() > 1
          setEvents(res.data);
        })
        .catch((err) => console.log(err));
      const ceventSource = new EventSource(getCustomEvents, {
        withCredentials: true,
      });
      const calendarSource = new EventSource(getCalendars, {
        withCredentials: true,
      });

      const dataSource = new EventSource(getCalendarGroup, {
        withCredentials: true,
      });
      const groupsSource = new EventSource(getGroups, {
        withCredentials: true,
      });

      setLoading(true);
      // eventSource.addEventListener("initialResponse", fetchEvents);
      ceventSource.addEventListener("initialResponse", fetchCevents);
      calendarSource.addEventListener("initialResponse", fetchCalendars);
      groupsSource.addEventListener("initialResponse", fetchGroups);
      // eventSource.addEventListener("updatedEvents", fetchUpdatedEvents);
      ceventSource.addEventListener("updatedCevents", fetchUpdatedCevents);
      calendarSource.addEventListener(
        "updatedCalendars",
        fetchUpdatedCalendars
      );
      groupsSource.addEventListener("updatedGroups", fetchUpdatedGroups);
      dataSource.addEventListener("initialResponse", fetchData);
      dataSource.addEventListener("updatedGroupings", fetchUpdatedData);
      return () => {
        // eventSource.close();
        ceventSource.close();
        calendarSource.close();
        dataSource.close();
        groupsSource.close();
      };
    }
    return () => {
      usersSource.close();
    };
  }, []);

  const theUser = localStorage.getItem("user");
  useEffect(() => {
    const convertToDate = (dateString) => {
      // Split the string into date and time components
      const [datePart, timePart] = dateString.split(" ");

      // Split the date part into year, month, and day
      const [year, month, day] = datePart.split("-");

      // Split the time part into hours, minutes, and seconds
      const [time, meridiem] = timePart.split(" ");
      const [hours, minutes, seconds] = time.split(":");

      // Create the Date object
      const date = new Date(year, month - 1, day, hours, minutes, seconds);

      return date;
    };

    const getNewUsersNum = () => {
      if (users.length > 1) {
        const admin = users.find((user) => user.roll === "superadmin");
        const checkedTime = admin.checkedAt ? admin.checkedAt : admin.createdAt;

        const xin = users.filter(
          (user) => convertToDate(user.createdAt) > convertToDate(checkedTime)
        );
        const newUsersNum = xin.length;
        return newUsersNum;
      } else return 0;
    };
    const getCurrentUser = () => {
      if (users.length > 1) {
        const decoded = JSON.parse(theUser);
        // console.log(users);
        const currentUser = users.find((user) => user.email === decoded.email);
        return currentUser;
      } else return null;
    };
    const currentUser = getCurrentUser();
    setUser(currentUser);
    const usersNum = getNewUsersNum();
    setNewUsers(usersNum);
  }, [users, theUser]);
  useEffect(() => {
    const filter = () => {
      const calendarsd = user
        ? user.calendars
          ? calendars
            ? calendars.filter((calendar) => {
                return user.calendars.includes(calendar.label);
              })
            : []
          : calendars
        : [];
      return calendarsd;
    };
    const calendarss = filter();
    setFilteredCalendars(calendarss);
  }, [user, calendars]);
  useEffect(() => {
    const calendarArray = filteredCalendars.map((calendar) => calendar.value);
    const ev = events.filter((event) =>
      calendarArray.includes(event.calendarId)
    );
    console.log(ev);
    setFilteredEvents(ev);
  }, [events, filteredCalendars]);
  console.log(filteredEvents);
  const email = theUser ? JSON.parse(theUser).email : null;
  const isAuthenticated = theUser ? true : false;
  return (
    <div>
      {contextHolder}
      <Spin spinning={loading} size="large" tip="Fetching data from cloud...">
        <BrowserRouter>
          <Routes>
            <Route exact path="/" element={<Navigate to="/home" />} />
            <Route
              path="/login"
              element={isAuthenticated ? <Navigate to="/home" /> : <Login />}
            />
            <Route
              path="/test"
              element={
                isAuthenticated ? (
                  <GroupedCheckboxes />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            <Route
              path="/admin"
              element={isAuthenticated ? <Adimin /> : <Navigate to="/login" />}
            >
              <Route
                path="users"
                element={
                  <AdminContainer
                    users={users}
                    calendars={calendars}
                    user={user}
                  />
                }
              />
              <Route
                path="groups"
                element={
                  <GroupingCalendars calendars={calendars} data={grouping} />
                }
              />
            </Route>
            <Route
              path="/home"
              element={
                isAuthenticated ? (
                  <Mapbox
                    events={filteredEvents.concat(cevents)}
                    user={user}
                    newUsersNum={newUsers}
                    calendars={filteredCalendars.concat("").concat(groups)}
                    grouping={grouping}
                  />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
          </Routes>
        </BrowserRouter>
        {isAuthenticated ? (
          <FloatButton.Group
            style={{
              right: 24,
            }}
          >
            <FloatButton
              icon={<HomeOutlined />}
              tooltip={"Home"}
              href="/home"
            />
            <FloatButton
              icon={<LogoutOutlined />}
              type="primary"
              tooltip={"Logout"}
              onClick={() => {
                logout();
              }}
            />
          </FloatButton.Group>
        ) : null}
      </Spin>
    </div>
  );
};

export default App;
