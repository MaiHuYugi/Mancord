# Mancord

Mancord is a cross-platform community chat starter: React + Vite for web and Expo + React Native for Android. Email/password authentication and first-run profile setup use Supabase Auth and Storage. Text messages are saved per account and channel on the current device; synchronized chat, voice calls, and screen sharing need further service wiring.

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

1. Create a Supabase project and run [`supabase/schema.sql`](supabase/schema.sql) in its SQL editor. New auth users get a starter profile automatically, and server creation should call the `create_server` RPC so its owner membership and `general` channel are created together.
2. Copy `apps/web/.env.example` to `apps/web/.env.local` and fill in the project URL and publishable (or legacy anon) key. Copy `apps/mobile/.env.example` to `apps/mobile/.env` and fill the same project values there. The client env variable is still named `*_ANON_KEY`. Restart Vite and Expo after changing env files. Only use the public key in clients; never put the service-role key in either app.
3. Enable email/password in Supabase Auth. Add the web dev URL (`http://localhost:5173`) and your deployed site URL to Auth's allowed redirect URLs. Configure a production SMTP provider before opening registration to everyone; Supabase's default email sender is for development/testing.
4. Registration creates the Supabase Auth account first, then requires the user to choose a unique Mancord username and upload profile media before entering the main screen. With email confirmation enabled, the user confirms the email, logs in, and then completes that profile step. Login restores saved sessions. The clients accept JPG, PNG, WebP, GIF, MP4, and WebM profile media up to 8 MB; web video profiles are limited to 12 seconds.
5. The SQL creates a public `profile-media` bucket with authenticated owner-only uploads and public reads so profile media can render across users. Review this exposure model before launch. The clients do not use Cloudflare R2 yet.

## Product scope

The web and Android interfaces follow the Figma reference for welcome, login, registration, profile setup, interests, channel navigation, and profile/server settings. Inter, monochrome emoji, and the original SVG icons are bundled locally; font license notices are in `apps/web/public/assets/fonts`. On narrow web screens, selecting a channel opens chat and the back button returns to channels. Profile Settings contains Log out.

Suggested avatars use the existing profile-media upload flow. Interests are saved on the current device. Account editing, privacy/notification controls, server administration, and account deletion remain previews: unavailable actions show a coming-soon message or disabled controls. These UI changes do not add service integrations or change the Supabase schema.

The current step adds email/password signup and login, required first-run username and profile media setup, and sign-out on web and Android. On web and Android, selecting a text channel opens the Figma text channel layout with the selected channel name, profile media, and message timestamps. The send button posts a message. On web, Enter sends and Shift+Enter adds a new line. On narrow web screens and Android, chat fills the screen and the composer stays above the keyboard. The header searches the current channel's messages, the smile button inserts emoji, and the plus button attaches images, PDFs, or text files up to 1 MB. Messages and attachments are saved on the current device per account and channel, and text drafts stay separate while switching channels. The online indicator represents the current user; shared presence and multi-user chat still need Supabase message reads/writes and Realtime subscriptions. Voice, camera, and screen sharing need a WebRTC SFU/signaling service and native platform permissions; Supabase Realtime alone does not provide that media layer. The UI does not promise 4K streaming.

The SQL policies provide a starting point for member-scoped text chat. Review them alongside the actual invite, moderation, account deletion, and role-management flows before production. Service free-tier limits and billing can change; check current provider terms before launch.
