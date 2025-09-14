import express from "express";
import cors from "cors";

export const app = express();
app.use(cors());
app.use(express.json());

app.get("/v0/context", (_req, res) => {
  res.json({
    identity: { fullName: "Ben Shoemaker", emails: ["ben@example.com"], timezone: "America/Los_Angeles" },
    prefs: { tone: "concise", units: "imperial", dateFormat: "MM/dd/yyyy" },
    comms: { primaryEmail: "ben@example.com", calendarProvider: "google", availability: [] },
    files: [],
    policy: { allowedApps: ["codex-local"], shareLevels: {} }
  });
});

// Only start the server when executed directly (not when imported by tests)
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT || 4000);
  app.listen(port, () => console.log(`vault-api listening on :${port}`));
}
