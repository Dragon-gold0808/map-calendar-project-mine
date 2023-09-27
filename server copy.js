const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const admin = require("firebase-admin");
const geocoder = require("node-geocoder");
const { initializeApp } = require("firebase-admin/app");
const localtunnel = require("localtunnel");
const SSE = require("express-sse");
const {
  authorize,
  listEvents,
  addCalendar,
  deleteCalendar,
  setupCalendarWatch,
  createWatch,
  updateCalendar,
} = require("./controllers/fetchCalendar");
const calendarSse = new SSE();
const eventSse = new SSE();

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
app.use(
  cors({
    origin: [APP_URL],
    methods: "GET,POST,PUT,DELETE,OPTIONS",
    withCredentials: true 
  })
);
app.use(express.json());

// Route for Google authentication
app.post("/login", async (req, res) => {
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
      const userId = Object.keys(userData)[0];
      const user = userData[userId];
      console.log(user);

      if (user) {
        // Generate JWT token
        const token = jwt.sign({ email: profile?.email }, JWT_SECRET, {
          expiresIn: "1h",
        });

        if (user.state === 1) {
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
        const newUser = {
          email: profile.email,
          roll: profile.email === superadminEmail ? "admin" : "user",
          state: profile.email === superadminEmail ? 1 : 0,
        };
        await admin.database().ref("users").push(newUser);

        // Generate JWT token
        const token = jwt.sign({ email: profile?.email }, JWT_SECRET, {
          expiresIn: "1h",
        });

        if (profile.email === superadminEmail) {
          res.status(201).json({
            message: "User created.",
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
app.put("/update-status", async (req, res) => {
  try {
    if (req.body.superadminEmail === superadminEmail) {
      const { userId, status } = req.body;

      // Update user status to 1
      await admin.database().ref(`users/${userId}`).update({ state: status });

      res.status(200).json({
        message: "User status updated successfully",
      });
    } else {
      res.status(401).json({ message: "Unauthorized access" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An error occurred" });
  }
});

// Route to get the whole user list
app.get("/admin", async (req, res) => {
  try {
    if (req.query.email === superadminEmail) {
      // Fetch all users from the database
      const usersSnapshot = await admin.database().ref("users").once("value");
      const users = usersSnapshot.val();
      res.status(200).json({
        users,
      });
    } else {
      res.status(401).json({
        message: "Unauthorized access",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An error occurred" });
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
app.get("/events", async (req, res) => {
  try {
    const response = await authorize().then(listEvents);
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

app.post("/set-events", async (req, res) => {
  try {
    const response = await authorize().then(listEvents);
    const geocodedEvents = await geocodeAddresses(response.eventsData);
    // Save events data to Firebase Realtime Database
    const eventsRef = admin.database().ref("events");
    await eventsRef.set(geocodedEvents);

    const calendarNamesRef = admin.database().ref("calendars");
    await calendarNamesRef.set(response.calendars);
    // await setupCalendarWatchWithTunnel();
    // Respond with a success message
    // res.status(200).json({ message: "Events data saved to Firebase" });
    // res.json(events);
  } catch (error) {
    console.error("Error retrieving events:", error);
    // res.status(500).send("Internal Server Error");
  }

  res.status(200).send("OK");
});

app.get("/get-calendars", async (req, res) => {
  try {
    const calendarsRef = await admin.database().ref("calendars").once("value");
    const calendarData = calendarsRef.val();
    const calendars = calendarData.map((calendar) => {
      return {
        value: calendar.id,
        label: calendar.summary,
        desc: calendar.description,
        color: calendar.backgroundColor,
      };
    });
    res.status(200).json({ calendars: calendars });
    // res.json(events);
  } catch (error) {
    console.error("Error retrieving calendars:", error);
    res.status(500).send("Internal Server Error");
  }
});

// SSE route
app.get("/get-calendar-updates", calendarSse.init);
app.get("/get-event-updates", eventSse.init);

// Set up listener for real-time updates for stream 1
const calendarUpdatesRef = admin.database().ref("calendars");
calendarUpdatesRef.on("value", (snapshot) => {
  const updatedCalendars = snapshot.val();
  calendarSse.send(updatedCalendars);
});

// Set up listener for real-time updates for stream 2
const eventUpdatesRef = admin.database().ref("events");
eventUpdatesRef.on("value", (snapshot) => {
  const updatedEvents = snapshot.val();
  eventSse.send(updatedEvents);
});

app.get("/get-events", async (req, res) => {
  try {
    // Get events data from Firebase Realtime Database
    const eventsRef = await admin.database().ref("events").once("value");
    const geocodedEvents = eventsRef.val();
    res.status(200).json({ geocodedEvents: geocodedEvents });
    // res.json(events);
  } catch (error) {
    console.error("Error retrieving events:", error);
    res.status(500).send("Internal Server Error");
  }
});



app.post("/add-calendar", async (req, res) => {
  try {
    const events = await addCalendar(
      await authorize(),
      req.body.title,
      req.body.description
    );
    res.status(200).json({ message: "Calendar saved" });
  } catch (error) {
    console.error("Error adding calendar:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/update-calendar", async (req, res) => {
  try {
    const events = await updateCalendar(
      await authorize(),
      req.body.id,
      req.body.title,
      req.body.description
    );
    res.status(200).json({ message: "Calendar updated" });
  } catch (error) {
    console.error("Error updating calendar:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.delete("/delete-calendar", async (req, res) => {
  // console.log(req);
  try {
    const events = await deleteCalendar(await authorize(), req.body.calendarId);
    if (events === "success")
      res.status(200).json({ message: "Calendar successfully deleted!" });
  } catch (error) {
    // console.error("Error deleting calendar:", error);
    res.status(500).send("Internal Server Error");
  }
});
async function setupCalendarWatchWithTunnel() {
  const tunnel = await localtunnel({ port: PORT });

  const fullBackUrl =
    process.env.BACK_URL === "local" ? tunnel.url : process.env.BACK_URL;

  await setupCalendarWatch(
    await authorize(),
    `${fullBackUrl}/set-events`
  ).catch((error) => {
    console.error("Error setting up calendar watch:", error);
  });
}

// Call the function with the desired parameters
// setupCalendarWatchWithTunnel();

// Start the server
app.listen(PORT, () => {
  console.log("Server is running on port ", PORT);
});
