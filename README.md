# Mancord

Mancord is a cross-platform community chat starter: React + Vite for web and Expo + React Native for Android. Email/password authentication and first-run profile setup use Supabase Auth and Storage. Servers, channels, direct messages, and text channel messages use Supabase Postgres and Realtime.

## Run the clients

Install dependencies from the repository root with npm, then start either client:

```sh
npm install
npm run dev:web
npm run dev:android
```

The web app runs through Vite. The Android app uses Expo Go for development; an EAS project and Android build profile will be needed for installable builds.

The root `vercel.json` builds the web workspace and publishes `apps/web/dist`. The mobile `apps/mobile/eas.json` includes an internal preview profile that produces an APK; run EAS from `apps/mobile` after linking the project with `eas build:configure`.

## Backend setup

1. Create a Supabase project and run [`supabase/schema.sql`](supabase/schema.sql) in its SQL editor. New auth users get a starter profile automatically. Server creation calls the `create_server` RPC and starts with no channels; users add text or voice channels themselves.
   When upgrading an existing project, run the updated `supabase/schema.sql` again. It adds server icon fields, direct messages, server invite links, direct server member adds, and Realtime publication entries; it is safe to re-run.
2. Copy `apps/web/.env.example` to `apps/web/.env.local` and fill in the project URL and publishable (or legacy anon) key. Copy `apps/mobile/.env.example` to `apps/mobile/.env` and fill the same project values there. The client env variable is still named `*_ANON_KEY`. Restart Vite and Expo after changing env files. Only use the public key in clients; never put the service-role key in either app.
3. Enable email/password in Supabase Auth. Add the web dev URL (`http://localhost:5173`) and your deployed site URL to Auth's allowed redirect URLs. Configure a production SMTP provider before opening registration to everyone; Supabase's default email sender is for development/testing.
4. Registration creates the Supabase Auth account first, then requires the user to choose a unique Mancord username and upload profile media before entering the main screen. With email confirmation enabled, the user confirms the email, logs in, and then completes that profile step. Login restores saved sessions. The clients accept JPG, PNG, WebP, GIF, MP4, and WebM profile media up to 8 MB; web video profiles are limited to 12 seconds.
5. The SQL creates a public `profile-media` bucket with authenticated owner-only uploads and public reads so profile media can render across users. Review this exposure model before launch. The clients do not use Cloudflare R2 yet.

## Product scope

The web and Android interfaces follow the Figma reference for welcome, login, registration, profile setup, interests, channel navigation, and profile/server settings. Inter, monochrome emoji, and the original SVG icons are bundled locally; font license notices are in `apps/web/public/assets/fonts`. On narrow web screens, selecting a channel opens chat and the back button returns to channels. Profile Settings contains Log out.

Suggested avatars and profile media use the existing profile-media upload flow. Mobile server icon URLs and media types are saved with the server. Interests are saved on the current device. Account editing, privacy/notification controls, some server administration, and account deletion remain previews: unavailable actions show a coming-soon message or disabled controls.

The clients use Supabase for shared server and channel data, live channel messages, direct messages, and online presence. Any signed-in member can discover profiles and start a DM without a friend request. Server members can send invite links in DMs, and recipients can join from the invite message or web link. Re-run the updated schema before using these features in an existing Supabase project. Voice, camera, and screen sharing need a WebRTC SFU/signaling service and native platform permissions; Supabase Realtime alone does not provide that media layer. The UI does not promise 4K streaming.

The SQL policies provide a starting point for member-scoped text chat. Review them alongside the actual invite, moderation, account deletion, and role-management flows before production. Service free-tier limits and billing can change; check current provider terms before launch.
