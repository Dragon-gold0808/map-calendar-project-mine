const fs = require("fs").promises;
const path = require("path");
const process = require("process");
const { authenticate } = require("@google-cloud/local-auth");
const { google } = require("googleapis");
const { v4: uuidv4 } = require("uuid");
const WATCH_EXPIRATION_TIME_MS = 5 * 24 * 60 * 60 * 1000;
let watchTimeout;

// If modifying these scopes, delete token.json.
const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.readonly",
];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), "token.json");
const CREDENTIALS_PATH = path.join(process.cwd(), "credentials_daniel3.json");

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file compatible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: "authorized_user",
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
    redirect_uris: [process.env.REDIRECT_URI],
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

/**
 * Lists the next 10 events on the user's primary calendar.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */

// Function to create a watch request for push notifications
async function createCalendarWatch(auth) {
  const calendar = google.calendar({ version: "v3", auth });

  const watchRequest = {
    id: "4b7c7b3a-9d67-4b6d-9e63-7a4d3e7c8f9e", // Provide a unique ID for the watch request
    type: "web_hook",
    address: `${process.env.BACK_URL}/set-events`, // Replace with your actual webhook endpoint URL
  };

  await calendar.events.watch({
    calendarId: "primary", // Replace with the calendar ID you want to watch
    requestBody: watchRequest,
  });
}
async function addCalendar(auth, title, disc) {
  const calendar = google.calendar({ version: "v3", auth });
  const newCalendar = await calendar.calendars.insert({
    requestBody: {
      summary: title,
      description: disc,
      timeZone: "America/Los_Angeles",
    },
  });
  return newCalendar.data;
}
async function addEvent(auth, req) {
  const calendar = google.calendar({ version: "v3", auth });
  const event = {
    summary: req.body.title,
    location: req.body.location,
    description: req.body.description,
    start: { dateTime: req.body.time[0], timeZone: "America/Los_Angeles" },
    end: { dateTime: req.body.time[1], timeZone: "America/Los_Angeles" },
  };
  try {
    const response = await calendar.events.insert({
      calendarId: req.body.calendarId,
      resource: event,
    });
    // console.log("Event added:", response.data);
    return "success";
  } catch (error) {
    console.error("Error adding event:", error);
    return "error";
  }
}
async function updateCalendar(auth, calendarId, title, disc) {
  try {
    const calendar = google.calendar({ version: "v3", auth });
    const response = await calendar.calendars.update({
      calendarId: calendarId,
      requestBody: {
        summary: title,
        description: disc,
        timeZone: "America/Los_Angeles",
      },
    });
    if (response) {
      console.log("Calendar updated successfully:", response.data);
      return "success";
    }
  } catch (error) {
    console.error("Error updating calendar:", error);
    throw new Error("Failed to delete calendar");
  }
}
async function deleteCalendar(auth, calendarId) {
  const calendar = google.calendar({ version: "v3", auth });
  try {
    const response = await calendar.calendarList.delete({
      calendarId: calendarId,
    });
    if (response) {
      console.log("Calendar deleted successfully");
      return "success";
    }
  } catch (error) {
    console.error("Error deleting calendar:", error);
    throw new Error("Failed to delete calendar");
  }
}
async function deleteEvent(auth, id, calendarId) {
  const calendar = google.calendar({ version: "v3", auth });
  try {
    const response = await calendar.events.delete({
      calendarId: calendarId,
      eventId: id,
    });
    if (response) {
      console.log("Event deleted successfully");
      return "success";
    }
  } catch (error) {
    console.error("Error deleting event:", error);
    throw new Error("Failed to delete event");
  }
}
async function editEvent(auth, req) {
  const calendar = google.calendar({ version: "v3", auth });
  const event = {
    summary: req.body.title,
    location: req.body.location,
    description: req.body.description,
    start: { dateTime: req.body.time[0], timeZone: "America/Los_Angeles" },
    end: { dateTime: req.body.time[1], timeZone: "America/Los_Angeles" },
  };
  try {
    const response = await calendar.events.delete({
      calendarId: req.body.oldCalendarId,
      eventId: req.body.id,
    });
    const responsed = await calendar.events.insert({
      calendarId: req.body.calendarId,
      resource: event,
    });

    console.log(responsed);
    if (responsed) {
      console.log("Event modified successfully");
      return "success";
    }
  } catch (error) {
    console.error("Error editing event:", error);
    throw new Error("Failed to modify event");
  }
}
async function listCalendars(auth) {
  const calendar = google.calendar({ version: "v3", auth });
  try {
    // Get a list of all calendars
    const response = await calendar.calendarList.list({});
    // Filter out the calendar with the specified ID
    const calendars = response.data.items.filter(
      (calendar) =>
        calendar.id !== "addressbook#contacts@group.v.calendar.google.com"
    );

    return calendars;
  } catch (error) {
    console.error("Error fetching events:", error);
    throw new Error("Failed to fetch events");
  }
}
async function listEvents(auth) {
  const calendar = google.calendar({ version: "v3", auth });
  try {
    // Set up push notifications for calendar changes
    // await createCalendarWatch(auth);
    // Get a list of all calendars
    const response = await calendar.calendarList.list({});
    // Filter out the calendar with the specified ID
    const calendars = response.data.items.filter(
      (calendar) =>
        calendar.id !== "addressbook#contacts@group.v.calendar.google.com"
    );
    // const calendarNames = calendars.map((calendar) => {return {summary:calendar.summary, id:calendar.calendarId}});
    const calendarIds = calendars.map((calendar) => calendar.id);
    const eventsPromises = calendarIds.map((calendarId) => {
      // Retrieve events from each calendar
      return calendar.events.list({
        calendarId: calendarId,
        timeMin: new Date().toISOString(),
        maxResults: 1000, // Adjust the number of events to retrieve as needed
        singleEvents: true,
        orderBy: "startTime",
      });
    });

    const results = await Promise.all(eventsPromises);

    const eventsData = [];

    results.forEach((result, index) => {
      const events = result.data.items;
      const calendarName = calendars[index].summary;
      const calendarId = calendars[index].id;
      const backgroundColor = calendars[index].backgroundColor;

      events.forEach((event) => {
        // Embed the calendar name as a new attribute
        event.calendarName = calendarName;
        event.calendarId = calendarId;
        event.color = backgroundColor;
        // eventsData.push()
      });

      eventsData.push(...events);
    });

    return eventsData;
  } catch (error) {
    console.error("Error fetching events:", error);
    throw new Error("Failed to fetch events");
  }
}

async function createWatch(auth, resourceType, resourceId, callbackUrl) {
  const calendar = google.calendar({ version: "v3", auth });

  const watchRequest = {
    id: uuidv4(),
    type: "web_hook",
    address: callbackUrl, // Replace with your actual webhook endpoint URL
  };

  const watchResponse =
    resourceType === "calendarList"
      ? await calendar.calendarList.watch({
          requestBody: watchRequest,
        })
      : await calendar.events.watch({
          calendarId: resourceId,
          requestBody: watchRequest,
        });

  const expirationTime = watchResponse.data.expiration * 1000; // Convert to milliseconds
  const currentTime = Date.now();

  const timeUntilExpiration = expirationTime - currentTime;

  // Schedule a new watch request before the current watch expires
  watchTimeout = setTimeout(async () => {
    await createWatch(auth, resourceType, resourceId, callbackUrl);
  }, WATCH_EXPIRATION_TIME_MS);
}

async function setupCalendarListWatch(auth, callbackUrl) {
  // Delete all running channels
  await createWatch(auth, "calendarList", "calendarList", callbackUrl);
}
async function setupCalendarEventsWatch(auth, callbackUrl) {
  // Get a list of all calendars
  const calendar = google.calendar({ version: "v3", auth });
  const response = await calendar.calendarList.list({});
  const calendars = response.data.items.filter(
    (calendar) =>
      calendar.id !== "addressbook#contacts@group.v.calendar.google.com"
  );
  for (const calendarItem of calendars) {
    await createWatch(auth, "events", calendarItem.id, callbackUrl);
  }
}

module.exports = {
  createWatch,
  authorize,
  listEvents,
  listCalendars,
  addCalendar,
  deleteCalendar,
  setupCalendarEventsWatch,
  updateCalendar,
  addEvent,
  deleteEvent,
  editEvent,
  setupCalendarListWatch,
};
