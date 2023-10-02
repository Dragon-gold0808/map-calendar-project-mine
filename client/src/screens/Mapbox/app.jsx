import * as React from "react";
import { useState, useMemo, useEffect } from "react";
import { message, Row, Spin } from "antd";
import axios from "axios";
import { deleteCevent, deleteEvent, getEvent } from "../../utils/APIRoutes";
import GeocoderControl from "./geocoder-control";
import ControlPanel from "./control-panel";

import Map, {
  Marker,
  Popup,
  NavigationControl,
  FullscreenControl,
  ScaleControl,
  GeolocateControl,
} from "react-map-gl";
import Pin from "./pin";
import PopupBody from "./popupBody";

// eslint-disable-next-line
const TOKEN = process.env.REACT_APP_MAPBOX_TOKEN; // Set your mapbox token here

export default function Mapbox(props) {
  const [messageApi, contextHolder] = message.useMessage();
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [popupInfo, setPopupInfo] = useState(null);
  const [events, setEvents] = useState(null);
  const [filteredEvents, setFilteredEvents] = useState(null);
  const [filteredRangedEvents, setFilteredRangedEvents] = useState(null);
  const [filters, setFilters] = useState([]);
  const [filter, setFilter] = useState([]);
  const [range, setRange] = useState(["", ""]);
  const [editEvent, setEditEvent] = useState({
    open: false,
    kind: null,
    data: null,
  });

  useEffect(() => {
    setEvents(props.events);
    setFilteredEvents(props.events);
    setFilteredRangedEvents(props.events);
  }, [props.events]);
  useEffect(() => {
    setFilters(props.calendars);
  }, [props.calendars]);
  useEffect(() => {
    if (filter.length > 0) {
      setFilteredEvents(
        events.filter((item) =>
          filter.some((filter) => filter === item.calendarId)
        )
      );
    } else setFilteredEvents(events);
  }, [filter, events]);
  useEffect(() => {
    if (range[0]) {
      const rangeStart = new Date(range[0] + "T00:00:00");
      const rangeEnd = new Date(range[1] + "T23:59:00");
      setFilteredRangedEvents(
        filteredEvents?.filter((item) => {
          const itemStart = new Date(item.start?.dateTime);
          const itemEnd = new Date(item.end?.dateTime);
          // console.log(rangeEnd);
          return (
            item.start &&
            item.end &&
            itemStart > rangeStart &&
            itemEnd < rangeEnd
          );
        })
      );
    } else setFilteredRangedEvents(filteredEvents);
  }, [range, filteredEvents]);
  const handleDeleteOk = (key, kind, calendarId) => {
    setConfirmLoading(true);
    const deleteUrl = kind.includes("group") ? deleteCevent : deleteEvent;
    axios
      .delete(deleteUrl, {
        data: { id: key, calendarId: calendarId },
      })
      .then((res) => {
        messageApi.open({
          type: "success",
          content: "Successfully deleted",
        });
        setConfirmLoading(false);
        setPopupInfo(null);
      })
      .catch((err) => {
        messageApi.open({
          type: "error",
          content: "Failed to delete",
        });
        setConfirmLoading(false);
      });
  };
  // const handleEdit = (key, kind, calendarId) => {

  // }
  const getPopupInfo = (id, kind) => {
    setConfirmLoading(true);
    axios
      .get(`${getEvent}?id=${id}&kind=${kind}`)
      .then((res) => {
        // console.log(res.data);
        setConfirmLoading(false);
        setPopupInfo(res.data);
      })
      .catch((err) => {
        console.log(err);
      });
  };
  const pins = useMemo(
    () =>
      filteredRangedEvents?.map((event, index) => {
        if (event && event.latitude && event.longitude)
          return (
            <Marker
              key={`marker-${index}`}
              longitude={event.longitude}
              latitude={event.latitude}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                getPopupInfo(event.id, event.kind);
                // setPopupInfo(event);
              }}
            >
              <Pin
                color={event.color}
                shadow={true}
                pinSize={"32"}
                type={event.kind.includes("calendar") ? "calendar" : "group"}
              />
            </Marker>
          );
        else return null;
      }),
    [filteredRangedEvents]
  );
  return (
    <>
      {contextHolder}
      <Spin spinning={confirmLoading} size="large" tip="Loading...">
        <Row>
          <Map
            initialViewState={{
              longitude: -119.77857,
              latitude: 39.49249,
              zoom: 5,
            }}
            mapStyle="mapbox://styles/mapbox/streets-v12"
            mapboxAccessToken={TOKEN}
            style={{ height: "100vh", width: "100%" }}
            attributionControl={false}
          >
            <GeocoderControl mapboxAccessToken={TOKEN} position="top-left" />
            <GeolocateControl position="top-left" />
            <FullscreenControl position="top-left" />
            <NavigationControl position="top-left" />
            <ScaleControl />

            {pins}

            {popupInfo && (
              <Popup
                anchor="top"
                longitude={popupInfo.longitude}
                latitude={popupInfo.latitude}
                onClose={() => setPopupInfo(null)}
              >
                <PopupBody
                  data={popupInfo}
                  user={props.user}
                  onDelete={() => {
                    handleDeleteOk(
                      popupInfo.id,
                      popupInfo.kind,
                      popupInfo.calendarId
                    );
                  }}
                  onEdit={() => {
                    setEditEvent({
                      open: true,
                      kind: popupInfo.kind.includes("calendar")
                        ? "event"
                        : "cevent",
                      data: popupInfo,
                    });
                  }}
                />
              </Popup>
            )}
          </Map>
          <ControlPanel
            filters={filters}
            onFilterChange={setFilter}
            onRangeChange={setRange}
            user={props.user}
            newUsersNum={props.newUsersNum}
            editEvent={editEvent}
            editClose={() => {
              setEditEvent({
                open: false,
                kind: null,
                data: null,
              });
            }}
            data={props.grouping}
          />
        </Row>
      </Spin>
    </>
  );
}
