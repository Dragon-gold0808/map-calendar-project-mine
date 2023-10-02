const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const admin = require("firebase-admin");
const geocoder = require("node-geocoder");
const { initializeApp } = require("firebase-admin/app");
const localtunnel = require("localtunnel");
const moment = require("moment");
const { v4: uuidv4 } = require("uuid");
const { encode, decode } = require("base-64");
// const SSE = require("express-sse");
const {
  authorize,
  listEvents,
  addCalendar,
  deleteCalendar,
  setupCalendarWatch,
  createWatch,
  updateCalendar,
  addEvent,
  deleteEvent,
  editEvent,
} = require("./controllers/fetchCalendar");

// const calendarSse = new SSE();
// const eventSse = new SSE();

// Get environment variables
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const JWT_SECRET = process.env.JWT_SECRET;
const FIREBASE_DATABASE_URL = process.env.FIREBASE_DATABASE_URL;
const PORT = process.env.PORT || 5000;
const APP_URL = process.env.APP_URL;
const superadminEmail = process.env.SUPERADMIN_EMAIL;

// Initialize Firebase Admin SDK
var serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: FIREBASE_DATABASE_URL,
});

const app = express();
app.use(express.static("client/build"));
// let the react app to handle any unknown routes
// serve up the index.html if express does'nt recognize the route
const path = require("path");
app.use(
  cors({
    origin: [APP_URL],
    methods: "GET,POST,PUT,DELETE,OPTIONS",
    withCredentials: true,
  })
);
app.use(express.json());
setInitials("groups");
setInitialCevents();

async function backUrl() {
  const tunnel = await localtunnel({ port: PORT });
  const fullBackUrl =
    process.env.BACK_URL === "local" ? tunnel.url : process.env.BACK_URL;
  return fullBackUrl;
}

async function setupCalendarWatchWithTunnel() {
  const fullBackUrl = await backUrl();
  await setupCalendarWatch(
    await authorize(),
    `${fullBackUrl}/api/set-events`
  ).catch((error) => {
    console.error("Error setting up calendar watch:", error);
  });
}

app.post("/api/validation", async (req, res) => {
  const usersRef = admin.database().ref("users");
  const userId = encode(req.body.email);
  const userRef = usersRef.child(userId);
  userRef
    .once("value")
    .then((snapshot) => {
      const exist = snapshot.exists();
      exist
        ? res.status(200).json({ message: true })
        : res.status(401).json({ message: false });
    })
    .catch((err) => {
      console.error("Error checking child node:", err);
      res.status(500).json({ message: "Error" });
    });
});

// Route for Google authentication
app.post("/api/auth/login", async (req, res) => {
  try {
    if (req.body.credential) {
      const verificationResponse = await verifyGoogleToken(req.body.credential);
      if (verificationResponse.error) {
        return res.status(400).json({
          message: verificationResponse.error,
        });
      }

      const profile = verificationResponse?.payload;

      // Check if user exists in the database
      const userSnapshot = await admin
        .database()
        .ref("users")
        .orderByChild("email")
        .equalTo(profile.email)
        .once("value");
      const userData = userSnapshot.val();

      if (userData) {
        const userId = Object.keys(userData)[0];
        const user = userData[userId];
        console.log(user);
        // Generate JWT token
        const token = jwt.sign({ email: profile?.email }, JWT_SECRET, {
          expiresIn: "1h",
        });

        if (user.state === true) {
          res.status(201).json({
            message: "Login successful",
            user: {
              email: profile.email,
              token,
            },
          });
        } else {
          res.status(400).json({
            message: "Waiting for admin approval.",
          });
        }
      } else {
        // User does not exist, create a new user
        const usersRef = admin.database().ref("users");
        const newUserId = encode(profile.email);
        const newUserRef = usersRef.child(newUserId);
        const newUser = {
          email: profile.email,
          roll: profile.email === superadminEmail ? "admin" : "user",
          state: profile.email === superadminEmail ? true : false,
          createdAt: moment().format("YYYY-MM-DD HH:mm:ss A"),
        };
        newUserRef
          .set(newUser)
          .then(() => {
            console.log("New user successfully!");
          })
          .catch((error) => {
            console.error("Error adding new user:", error);
          });

        // Generate JWT token
        const token = jwt.sign({ email: profile?.email }, JWT_SECRET, {
          expiresIn: "1h",
        });

        if (profile.email === superadminEmail) {
          res.status(201).json({
            message: "Approved as Admin",
            user: {
              email: profile.email,
              token,
            },
          });
        } else {
          res.status(400).json({
            message: "Waiting for admin approval.",
          });
        }
      }
    } else {
      return res.status(400).json({
        message: "Missing credential",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "An error occurred",
    });
  }
});

// Route to update user status
app.post("/api/update-status", async (req, res) => {
  const usersRef = admin.database().ref("users");
  const newUserId = encode(req.body.email);
  const newUserRef = usersRef.child(newUserId);
  const newUser = {
    ...req.body,
    checkedAt:
      req.body.checked === "checked"
        ? moment().format("YYYY-MM-DD HH:mm:ss A")
        : null,
    updatedAt: moment().format("YYYY-MM-DD HH:mm:ss A"),
  };
  newUserRef
    .once("value")
    .then((snapshot) => {
      const exist = snapshot.exists();
      exist
        ? newUserRef
            .update(newUser)
            .then(() => {
              console.log("Updated user successfully!");
            })
            .catch((error) => {
              console.error("Error updating user:", error);
            })
        : console.log("error");
    })
    .catch((error) => {
      console.error("Error updating user:", error);
    });
});

// Route to delete user
app.post("/api/delete-user", async (req, res) => {
  const usersRef = admin.database().ref("users");
  const deleteUserId = encode(req.body.email);
  const deleteUserRef = usersRef.child(deleteUserId);
  deleteUserRef
    .remove()
    .then(() => {
      console.log("Deleted user successfully!");
    })
    .catch((error) => {
      console.error("Error removing user:", error);
    });
});

// Route to get the whole user list
app.get("/api/get-users", async (req, res) => {
  if (req.query.email === superadminEmail) {
    res.writeHead(200, {
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": APP_URL,
      "Access-Control-Allow-credentials": "true",
    });

    // Fetch all users from the database
    const usersSnapshot = await admin
      .database()
      .ref("users")
      .orderByChild("createdAt")
      .once("value");
    const usersData = usersSnapshot.val();
    const users = Object.values(usersData);
    res.write("event: initialResponse\n");
    res.write("data: " + JSON.stringify(users) + "\n\n");
    const usersUpdatesRef = admin
      .database()
      .ref("users")
      .orderByChild("createdAt");
    usersUpdatesRef.on("value", (snapshot) => {
      const updatedUsers = snapshot.val();
      const users = Object.values(updatedUsers);
      res.write("id: " + uuidv4() + "\n");
      res.write("event: updatedUsers\n");
      res.write("data: " + JSON.stringify(users));
      res.write("\n\n");
      // res.json(events);
      req.on("close", () => {
        // if (!res.writableEnded) {
        // res.end();
        usersUpdatesRef.off();
        // console.log("Stopped sending events.");
        // }
      });
    });
  } else {
    res.status(401).json({
      message: "Unauthorized access",
    });
  }
});

// Function to verify the Google token
async function verifyGoogleToken(token) {
  try {
    const client = new OAuth2Client(GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });
    return { payload: ticket.getPayload() };
  } catch (error) {
    return { error: "Invalid user detected. Please try again" };
  }
}
async function geocodeAddresses(data) {
  const options = {
    provider: "mapbox",
    apiKey: process.env.MAPBOX_TOKEN,
  };
  const geoCoder = geocoder(options);

  const geocodePromises = data.map(async (row) => {
    const address = row.location;
    const query = { address: address, limit: 1 };
    if (address) {
      try {
        const geocodeResult = await geoCoder.geocode(query);
        row.longitude = geocodeResult[0].longitude;
        row.latitude = geocodeResult[0].latitude;
      } catch (error) {
        console.error("Error geocoding address:", address, error);
      }
    }
    return row;
  });

  const geocodeData = await Promise.all(geocodePromises);
  return geocodeData;
}
app.get("/api/events", async (req, res) => {
  try {
    const response = await authorize().then(listEvents);
    const geocodedEvents = await geocodeAddresses(response.eventsData);
    const metaRef = admin.database().ref("meta");
    const eventsRef = admin.database().ref("events");
    const calendarNamesRef = admin.database().ref("calendars");
    await metaRef.set({
      [decode("initial")]: {
        id: "event.id",
        calendarId: "event.calendarId",
        color: "event.color",
        kind: "event.kind",
        start: "event.start",
        end: "event.end",
      },
    });
    await eventsRef.remove();
    // await calendarNamesRef.remove();
    await calendarNamesRef.set({
      [decode("initial")]: {
        summary: "initial",
        kind: "calendar#calendarListEntry",
        id: "initial",
        backgroundColor: "#42d692",
      },
    });
    geocodedEvents.map(async (event) => {
      const newEventData = {
        id: event.id,
        calendarId: event.calendarId,
        color: event.color,
        kind: event.kind,
        start: event.start,
        end: event.end,
        latitude: event.latitude || null,
        longitude: event.longitude || null,
        location: event.location || null,
        description: event.description || null,
        calendarName: event.calendarName || null,
        visibility: event.visibility || null,
        reminders: event.reminders || null,
        created: event.created || null,
        creator: event.creator || null,
        summary: event.summary || null,
      };
      const newEventId = encode(event.id);
      const newEventRef = eventsRef.child(newEventId);
      await newEventRef.set(newEventData);
      const metaEvent = {
        id: event.id,
        calendarId: event.calendarId,
        color: event.color,
        kind: event.kind,
        start: event.start,
        end: event.end,
        latitude: event.latitude || null,
        longitude: event.longitude || null,
      };
      const newMetaRef = metaRef.child(newEventId);
      await newMetaRef.set(metaEvent);
    });

    response.calendars.map(async (calendar) => {
      const newCalendarId = encode(calendar.id);
      const newCalendarRef = calendarNamesRef.child(newCalendarId);
      await newCalendarRef.set(calendar);
    });
    await calendarNamesRef.child(decode("initial")).remove();
    // Respond with a success message
    res.status(200).json({ message: "Events data saved to Firebase" });
    // res.json(events);
  } catch (error) {
    console.error("Error retrieving events:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/api/start", async (req, res) => {
  try {
    const response = await authorize().then(listEvents);
    setupCalendarWatchWithTunnel();
    const geocodedEvents = await geocodeAddresses(response.eventsData);
    // Save events data to Firebase Realtime Database
    const eventsRef = admin.database().ref("events");
    await eventsRef.set(geocodedEvents);

    const calendarNamesRef = admin.database().ref("calendars");
    await calendarNamesRef.set(response.calendars);
    // Respond with a success message
    res.status(200).json({ message: "Events data saved to Firebase" });
    // res.json(events);
  } catch (error) {
    console.error("Error retrieving events:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/api/set-events", async (req, res) => {
  try {
    console.log("pull", req);
    // const response = await authorize().then(listEvents);
    // const geocodedEvents = await geocodeAddresses(response.eventsData);
    // // Save events data to Firebase Realtime Database
    // const eventsRef = admin.database().ref("events");
    // await eventsRef.set(geocodedEvents);

    // const calendarNamesRef = admin.database().ref("calendars");
    // await calendarNamesRef.set(response.calendars);
    // // await setupCalendarWatchWithTunnel();
    // // Respond with a success message
    // // res.status(200).json({ message: "Events data saved to Firebase" });
    // // res.json(events);
  } catch (error) {
    console.error("Error retrieving events:", error);
    // res.status(500).send("Internal Server Error");
  }

  res.status(200).send("OK");
});

app.get("/api/get-calendarGroups", async (req, res) => {
  res.writeHead(200, {
    Connection: "keep-alive",
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Access-Control-Allow-Origin": APP_URL,
    "Access-Control-Allow-credentials": "true",
  });

  // Fetch all users from the database
  const groupingSnapshot = await admin
    .database()
    .ref("grouping")
    .orderByChild("createdAt")
    .once("value");
  const grouping = groupingSnapshot.val();
  const result = grouping ? Object.values(grouping) : [];
  res.write("event: initialResponse\n");
  res.write("data: " + JSON.stringify(result) + "\n\n");
  const updatedGroupingSnapshot = await admin
    .database()
    .ref("grouping")
    .orderByChild("createdAt");
  updatedGroupingSnapshot.on("value", (snapshot) => {
    const grouping = snapshot.val();
    const result = grouping ? Object.values(grouping) : [];
    res.write("id: " + uuidv4() + "\n");
    res.write("event: updatedGroupings\n");
    res.write("data: " + JSON.stringify(result));
    res.write("\n\n");
    // res.json(events);
    req.on("close", () => {
      // if (!res.writableEnded) {
      // res.end();
      updatedGroupingSnapshot.off();
      // console.log("Stopped sending events.");
      // }
    });
  });
});
app.post("/api/set-calendarGroups", async (req, res) => {
  const groupingSnapshot = await admin.database().ref("grouping");
  // .orderByChild("createdAt")
  // .once("value");
  const newGroupingRef = groupingSnapshot.push();
  const newGroupingKey = newGroupingRef.key;
  const newGroupingData = {
    key: newGroupingKey,
    name: req.body.name,
    calendars: req.body.calendars ? req.body.calendars : null,
    open: req.body.open,
  };
  newGroupingRef
    .set(newGroupingData)
    .then((result) => {
      res.status(200).json(newGroupingKey);
    })
    .catch((err) => {
      console.error("Error adding new group:", err);
      res.status(500).send("Internal Server Error");
    });
});
app.post("/api/delete-calendarGroup", async (req, res) => {
  const groupingRef = await admin
    .database()
    .ref("grouping")
    .child(req.body.key);
  groupingRef
    .remove()
    .then(() => {
      console.log("Deleted group successfully!");
      res.status(200).json({ message: "Group deleted" });
    })
    .catch((error) => {
      console.error("Error deleting group:", error);
    });
});
app.post("/api/edit-calendarGroups", async (req, res) => {
  const groupingSnapshot = await admin.database().ref("grouping");
  if (req.body.key) {
    const newGroupingRef = groupingSnapshot.child(req.body.key);
    const newGroupingData = {
      name: req.body.name,
      calendars: req.body.calendars,
      open: req.body.open,
    };
    newGroupingRef
      .update(newGroupingData)
      .then((result) => {
        res.status(200).json({ message: "Group updated" });
      })
      .catch((err) => {
        console.error("Error editing new group:", err);
        res.status(500).send("Internal Server Error");
      });
  }
});

app.get("/api/get-groups", async (req, res) => {
  try {
    res.writeHead(200, {
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": APP_URL,
      "Access-Control-Allow-credentials": "true",
    });
    const groupsRef = await admin
      .database()
      .ref("groups")
      .orderByKey()
      .once("value");
    const groupData = groupsRef.val();
    if (groupData) {
      const groupsData = Object.values(groupData);
      // const groupsData = groupData.map((obj) => Object.values(obj)[0]);
      const groups = groupsData
        .filter((group) => group.id !== "initial")
        .map((group) => {
          return {
            value: group.id,
            label: group.summary,
            desc: group.description,
            color: group.color,
            kind: "group",
            // color: group.backgroundColor,
          };
        });

      res.write("event: initialResponse\n");
      res.write("data: " + JSON.stringify(groups) + "\n\n");

      // Set up listener for real-time updates for stream 1
      const groupUpdatesRef = admin.database().ref("groups").orderByKey();
      groupUpdatesRef.on("value", (snapshot) => {
        const updatedGroups = snapshot.val();
        // const groupsData = updatedGroups.map((obj) => Object.values(obj)[0]);
        const groupsData = Object.values(updatedGroups);
        const groups = groupsData
          .filter((group) => group.id !== "initial")
          .map((group) => {
            return {
              value: group.id,
              label: group.summary,
              desc: group.description,
              color: group.color,
              kind: "group",
              // color: group.backgroundColor,
            };
          });
        res.write("id: " + uuidv4() + "\n");
        res.write("event: updatedGroups\n");
        res.write("data: " + JSON.stringify(groups));
        res.write("\n\n");
        // res.json(events);
        req.on("close", () => {
          // if (!res.writableEnded) {
          // res.end();
          groupUpdatesRef.off();
          // console.log("Stopped sending events.");
          // }
        });
      });
    }
  } catch (error) {
    console.error("Error retrieving groups:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/api/get-customEvents", async (req, res) => {
  try {
    res.writeHead(200, {
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": APP_URL,
      "Access-Control-Allow-credentials": "true",
    });
    const ceventsRef = await admin
      .database()
      .ref("cevents")
      .orderByKey()
      .once("value");
    const ceventData = ceventsRef.val();
    if (ceventData) {
      const ceventsData = Object.values(ceventData);

      res.write("event: initialResponse\n");
      res.write("data: " + JSON.stringify(ceventsData) + "\n\n");

      // Set up listener for real-time updates for stream 1
      const ceventUpdatesRef = admin.database().ref("cevents").orderByKey();
      ceventUpdatesRef.on("value", (snapshot) => {
        const updatedCevents = snapshot.val();
        // const ceventsData = updatedCevents.map((obj) => Object.values(obj)[0]);
        const ceventsData = Object.values(updatedCevents);

        res.write("id: " + uuidv4() + "\n");
        res.write("event: updatedCevents\n");
        res.write("data: " + JSON.stringify(ceventsData));
        res.write("\n\n");
        // res.json(events);
        req.on("close", () => {
          // if (!res.writableEnded) {
          // res.end();
          ceventUpdatesRef.off();
          // console.log("Stopped sending events.");
          // }
        });
      });
    }
  } catch (error) {
    console.error("Error retrieving cevents:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/api/get-calendars", async (req, res) => {
  try {
    res.writeHead(200, {
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": APP_URL,
      "Access-Control-Allow-credentials": "true",
    });
    const calendarsRef = await admin
      .database()
      .ref("calendars")
      .orderByChild("accessRole")
      .once("value");
    const calendarData = calendarsRef.val();
    const calendarList = calendarData ? Object.values(calendarData) : null;
    const calendars = calendarList.map((calendar) => {
      return {
        value: calendar.id,
        label: calendar.summary,
        desc: calendar.description,
        color: calendar.backgroundColor,
        kind: "calendar",
      };
    });
    res.write("event: initialResponse\n");
    res.write("data: " + JSON.stringify(calendars) + "\n\n");
    // Set up listener for real-time updates for stream 1
    const calendarUpdatesRef = admin
      .database()
      .ref("calendars")
      .orderByChild("accessRole");
    calendarUpdatesRef.on("value", (snapshot) => {
      const updatedCalendars = snapshot.val();
      const calendarList = updatedCalendars
        ? Object.values(updatedCalendars)
        : null;
      const calendars = calendarList.map((calendar) => {
        return {
          value: calendar.id,
          label: calendar.summary,
          desc: calendar.description,
          color: calendar.backgroundColor,
          kind: "calendar",
        };
      });
      res.write("id: " + uuidv4() + "\n");
      res.write("event: updatedCalendars\n");
      res.write("data: " + JSON.stringify(calendars));
      res.write("\n\n");
    });
    // res.json(events);
    req.on("close", () => {
      // if (!res.writableEnded) {
      // res.end();
      calendarUpdatesRef.off();
      // console.log("Stopped sending events.");
      // }
    });
  } catch (error) {
    console.error("Error retrieving calendars:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/api/get-event", async (req, res) => {
  if (req.query.kind.includes("calendar")) {
    const eventSnapshot = await admin
      .database()
      .ref("events")
      .child(encode(req.query.id))
      .once("value");
    const eventData = eventSnapshot.val();
    // const event = Object.values(eventData)[0];

    res.json(eventData);
  } else {
    const ceventSnapshot = await admin
      .database()
      .ref("cevents")
      .child(req.query.id)
      .once("value");
    const ceventData = ceventSnapshot.val();
    res.json(ceventData);
  }
});

app.get("/api/get-events", async (req, res) => {
  // res.writeHead(200, {
  //   Connection: "keep-alive",
  //   "Content-Type": "text/event-stream",
  //   "Cache-Control": "no-cache",
  //   "Access-Control-Allow-Origin": APP_URL,
  //   "Access-Control-Allow-credentials": "true",
  // });
  // // Get events data from Firebase Realtime Database
  console.log(
    req.query.email,
    "was logged in at",
    moment().format("MMM DD, HH:mm:ss A"),
    process.env.SUPERADMIN_EMAIL
  );
  const userId = encode(req.query.email);
  const userRef = await admin
    .database()
    .ref("users")
    .child(userId)
    .once("value");
  const currentUser = userRef.val();
  const currentCalendars = currentUser.calendars ? currentUser.calendars : null;
  console.log(currentCalendars);
  const geocode = async () => {
    const eventsRef = await admin
      .database()
      .ref("meta")
      .orderByKey()
      .once("value");
    const geocodedEvents = eventsRef.val();
    const events = geocodedEvents ? Object.values(geocodedEvents) : null;
    return events;
  };
  // const geocodedEvents = [];
  // const abc = currentCalendars
  //   ? currentCalendars.map(async (calendar) => {
  //       const eventsRef = await admin
  //         .database()
  //         .ref("meta")
  //         .orderByChild("calendarName")
  //         .equalTo(calendar)
  //         .once("value");
  //       const geocodedEvent = eventsRef.val();
  //       const geo = Object.values(geocodedEvent);
  //       geocodedEvents.push(geo);
  //     })
  //   : geocode();
  // const events = await Promise.all(geocodedEvents);
  const events = await geocode();
  // console.log(events);
  res.status(200).send(events);
  // res.write("event: initialResponse\n");
  // res.write("data: " + JSON.stringify(events) + "\n\n");
  // Set up listener for real-time updates for stream 2
  // const eventUpdatesRef = admin.database().ref("meta").orderByKey();
  // eventUpdatesRef.on("value", (snapshot) => {
  //   const updatedEvents = snapshot.val();
  //   const events = updatedEvents ? Object.values(updatedEvents) : null;
  //   res.write("id: " + uuidv4() + "\n");
  //   res.write("event: updatedEvents\n");
  //   res.write("data: " + JSON.stringify(events) + "\n\n");
  //   res.write("\n\n");
  // });
  // req.on("close", () => {
  //   // if (!res.writableEnded) {
  //   // res.end();
  //   eventUpdatesRef.off();
  //   console.log(
  //     req.query.email,
  //     "was left at",
  //     moment().format("MMM DD, HH:mm:ss A")
  //   );
  //   const usersRef = admin.database().ref("users");
  //   const newUserId = encode(req.query.email);
  //   const newUserRef = usersRef.child(newUserId);
  //   const newUser = {
  //     visitedAt: moment().format("YYYY-MM-DD HH:mm:ss A"),
  //   };
  //   newUserRef
  //     .once("value")
  //     .then((snapshot) => {
  //       const exist = snapshot.exists();
  //       exist
  //         ? newUserRef
  //             .update(newUser)
  //             .then(() => {
  //               console.log("Updated user successfully!");
  //             })
  //             .catch((error) => {
  //               console.error("Error updating user:", error);
  //             })
  //         : console.log("error");
  //     })
  //     .catch((error) => {
  //       console.error("Error updating user:", error);
  //     });
  //   // }
  // });
  // } catch (error) {
  //   console.error("Error retrieving events:", error);
  //   res.status(500).send("Internal Server Error");
  // }
});

app.post("/api/add-group", async (req, res) => {
  // Save events data to Firebase Realtime Database
  const groupRef = admin.database().ref("groups");
  const newGroupRef = groupRef.push();
  const newGroupKey = newGroupRef.key;
  const newGroupData = {
    id: newGroupKey,
    summary: req.body.title,
    description: req.body.description,
    kind: "group",
    color: req.body.color,
  };
  newGroupRef
    .set(newGroupData)
    .then(() => {
      console.log("New group successfully!");
      res.status(200).json({ message: "Group saved" });
    })
    .catch((error) => {
      console.error("Error adding new group:", error);
    });
});

app.post("/api/update-group", async (req, res) => {
  // Save events data to Firebase Realtime Database
  const groupRef = admin.database().ref("groups");
  const updatedGroupId = req.body.id;
  const updatedGroupData = {
    summary: req.body.title,
    description: req.body.description,
    color: req.body.color,
  };
  groupRef
    .child(updatedGroupId)
    .update(updatedGroupData)
    .then(() => {
      console.log("Updated group successfully!");
      res.status(200).json({ message: "Group saved" });
    })
    .catch((error) => {
      console.error("Error updating group:", error);
    });
});

app.delete("/api/delete-group", async (req, res) => {
  // Save events data to Firebase Realtime Database
  const groupRef = admin.database().ref("groups");
  const updatedGroupId = req.body.id;
  groupRef
    .child(updatedGroupId)
    .remove()
    .then(() => {
      console.log("Deleted group successfully!");
      res.status(200).json({ message: "Group deleted" });
    })
    .catch((error) => {
      console.error("Error deleting group:", error);
    });
});

app.delete("/api/delete-cevent", async (req, res) => {
  // Save events data to Firebase Realtime Database
  const groupRef = admin.database().ref("cevents");
  const ceventId = req.body.id;
  console.log(req.body.id);
  const deleteCeventRef = groupRef.child(ceventId);
  deleteCeventRef
    .remove()
    .then(() => {
      console.log("Deleted custom event successfully!");
      res.status(200).json({ message: "Group deleted" });
    })
    .catch((error) => {
      console.error("Error deleting custom event:", error);
      res.status(500).send("Internal Server Error");
    });
});
app.post("/api/edit-cevent", async (req, res) => {
  // Save events data to Firebase Realtime Database
  const groupRef = admin.database().ref("cevents");
  const ceventId = req.body.id;
  const newEventData = {
    summary: req.body.title,
    kind: `group#${req.body.type}`,
    start: { dateTime: req.body.time ? req.body.time[0] : null },
    end: { dateTime: req.body.time ? req.body.time[1] : null },
    location: req.body.location,
    description: req.body.description,
    calendarId: req.body.calendarId,
    calendarName: req.body.calendarName,
    color: req.body.color,
    visibility: req.body.visibility,
    longitude: req.body.longitude,
    latitude: req.body.latitude,
    reminders: req.body.reminders,
    created: moment().format("YYYY-MM-DD HH:mm:ss A"),
    creator: { email: req.body.creator },
  };
  const editCeventRef = groupRef.child(ceventId);
  editCeventRef
    .update(newEventData)
    .then(() => {
      console.log("Modified custom event successfully!");
      res.status(200).json({ message: "Event deleted" });
    })
    .catch((error) => {
      console.error("Error modifying custom event:", error);
      res.status(500).send("Internal Server Error");
    });
});
app.post("/api/add-event", async (req, res) => {
  try {
    await addEvent(await authorize(), req).then((result) => {
      if (result === "success") {
        res.status(200).json({ message: "Event saved" });
        console.log("Event saved.", result);
      } else res.status(500).send("Internal Server Error");
    });
  } catch (error) {
    console.error("Error adding event:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/api/edit-event", async (req, res) => {
  try {
    const events = await editEvent(await authorize(), req);
    if (events === "success")
      res.status(200).json({ message: "Event successfully modified!" });
  } catch (error) {
    // console.error("Error deleting calendar:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/api/update-calendar", async (req, res) => {
  updateCalendar(
    await authorize(),
    req.body.id,
    req.body.title,
    req.body.description
  )
    .then(() => {
      res.status(200).json({ message: "Calendar updated" });
    })
    .catch((error) => {
      console.error("Error updating calendar:", error);
      res.status(500).send("Internal Server Error");
    });
});

app.delete("/api/delete-calendar", async (req, res) => {
  console.log(req.body);
  try {
    const events = await deleteCalendar(await authorize(), req.body.id);
    if (events === "success") {
      res.status(200).json({ message: "Calendar successfully deleted!" });
      const groupingRef = admin.database().ref("grouping");
      groupingRef.once("value", (snapshot) => {
        snapshot.forEach((childSnapshot) => {
          const childKey = childSnapshot.key;
          const childData = childSnapshot.val();
          const updatedCalendars =
            childData && childData.calendars
              ? childData.calendars.filter((val) => val !== req.body.summary)
              : null;

          groupingRef.child(childKey).update({ calendars: updatedCalendars });
        });
      });
    }
  } catch (error) {
    // console.error("Error deleting calendar:", error);
    res.status(500).send("Internal Server Error");
  }
});
app.delete("/api/delete-event", async (req, res) => {
  // console.log(req);
  try {
    const events = await deleteEvent(
      await authorize(),
      req.body.id,
      req.body.calendarId
    );
    if (events === "success")
      res.status(200).json({ message: "Event successfully deleted!" });
  } catch (error) {
    // console.error("Error deleting calendar:", error);
    res.status(500).send("Internal Server Error");
  }
});
app.post("/api/add-customEvent", async (req, res) => {
  // Save events data to Firebase Realtime Database
  const eventRef = admin.database().ref("cevents");
  const newEventRef = eventRef.push();
  const newEventKey = newEventRef.key;
  const newEventData = {
    id: newEventKey,
    summary: req.body.title,
    kind: `group#${req.body.type}`,
    start: { dateTime: req.body.time ? req.body.time[0] : null },
    end: { dateTime: req.body.time ? req.body.time[1] : null },
    location: req.body.location,
    description: req.body.description,
    calendarId: req.body.calendarId,
    calendarName: req.body.calendarName,
    color: req.body.color,
    visibility: req.body.visibility,
    longitude: req.body.longitude,
    latitude: req.body.latitude,
    reminders: req.body.reminders,
    created: moment().format("YYYY-MM-DD HH:mm:ss A"),
    creator: { email: req.body.creator },
  };
  newEventRef
    .set(newEventData)
    .then(() => {
      console.log("New group successfully!");
      res.status(200).json({ message: "Group saved" });
    })
    .catch((error) => {
      console.error("Error adding new group:", error);
    });
});
app.post("/api/add-calendar", async (req, res) => {
  try {
    const events = await addCalendar(
      await authorize(),
      req.body.title,
      req.body.description
    );
    // console.log(events);
    const fullBackUrl = await backUrl();
    await createWatch(
      await authorize(),
      "events",
      events.id,
      `${fullBackUrl}/api/set-events`
    ).catch((error) => {
      console.error("Error setting up calendar watch:", error);
    });
    res.status(200).json({ message: "Calendar saved" });
  } catch (error) {
    console.error("Error adding calendar:", error);
    res.status(500).send("Internal Server Error");
  }
});

//initialize the collection "groups"
async function setInitials(collection) {
  // Save events data to Firebase Realtime Database
  const groupRef = admin.database().ref(collection);
  groupRef.once("value").then((snapshot) => {
    if (snapshot.exists()) {
      // console.log("The 'groups' collection exists.");
    } else {
      const newGroupRef = groupRef.push();
      const newGroupData = {
        id: "initial",
        summary: "initial",
        description: "initial",
        kind: "group",
      };
      newGroupRef
        .set(newGroupData)
        .then(() => {
          // console.log("Collection 'groups' initialized!");
        })
        .catch((error) => {
          console.error("Error initializing group:", error);
        });
    }
  });
}

//initialize the collection "groups"
async function setInitialCevents() {
  // Save events data to Firebase Realtime Database
  const groupRef = admin.database().ref("cevents");
  groupRef.once("value").then((snapshot) => {
    if (snapshot.exists()) {
      // console.log("The 'groups' collection exists.");
    } else {
      const fakeDate = new Date();
      const newGroupRef = groupRef.push();
      const newGroupData = {
        id: "initial",
        summary: "req.body.title",
        kind: "group#event",
        start: { dateTime: fakeDate ? fakeDate : null },
        end: { dateTime: fakeDate ? fakeDate : null },
        description: "req.body.description",
        calendarId: "req.body.calendarId",
        calendarName: "",
        visibility: "",
        created: moment().format("YYYY-MM-DD HH:mm:ss A"),
        creator: { email: process.env.SUPERADMIN_EMAIL },
      };
      newGroupRef
        .set(newGroupData)
        .then(() => {
          // console.log("Collection 'groups' initialized!");
        })
        .catch((error) => {
          console.error("Error initializing group:", error);
        });
    }
  });
}

// Call the function with the desired parameters
app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "client", "build", "index.html"));
});

// Start the server
app.listen(PORT, () => {
  console.log("Server is running on port ", PORT);
});
