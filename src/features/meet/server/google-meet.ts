import "server-only";
import { createGoogleMeetingProvider } from "./google-meet-core";
export type { GoogleMeetingInput, GoogleMeetingResult } from "./google-meet-core";

const provider = createGoogleMeetingProvider({
  config: () => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    return clientId && clientSecret && refreshToken ? {
      clientId, clientSecret, refreshToken, calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
      openAccess: process.env.GOOGLE_MEET_OPEN_ACCESS === "true",
    } : null;
  },
});

/** Call only after authenticated RPC returned an authorized, non-cancelled DB meeting. */
export const ensureGoogleMeeting = provider.ensureGoogleMeeting;
export const cancelGoogleMeeting = provider.cancelGoogleMeeting;
