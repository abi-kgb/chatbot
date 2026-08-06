# WhatsApp Clone 

This project is a modern, real-time web application built to mimic the core features of WhatsApp. It features a robust backend built with Python (Django) and a responsive, dynamic frontend built with React (Vite).

## Key Features

This application goes far beyond basic messaging, implementing a full suite of features expected in a modern chat application:

### 🔐 Privacy & Security
- **App Lock:** Secure your chats behind a custom passcode lock screen. The app auto-locks after inactivity or upon request.
- **Per-Chat Passcode Lock:** Lock individual 1-on-1 and group chats with unique custom PINs/passcodes. Message previews in the sidebar are masked as *"🔒 Locked chat"*, and chats automatically re-lock as soon as you switch away to another conversation.
- **Dedicated "Locked Chats" Folder:** A WhatsApp-style top-level folder view that aggregates all protected chats behind passcode authentication.
- **WhatsApp-Style Contacts:** A privacy-first address book. If a user is not in your contacts, their username is hidden during search (only their phone number is shown). You can manually add users to your contacts with custom names that sync across your devices.
- **Block System:** Block and unblock users to prevent unwanted messages and calls.

### 💬 Messaging & Chats
- **Real-time Messaging:** Lightning-fast 1-on-1 and group messaging powered by WebSockets.
- **Group Chats:** Create groups, add/remove members, and manage admin roles. Group avatars and names can be customized.
- **⭐ Starred Messages Drawer:** Star important messages via context menu (`⌄` ➔ **"Star message ⭐"**). View and manage all saved starred messages anytime from the 3-dots header menu (`⋮`) or sidebar drawer with instant search and contact name resolution.
- **🕒 Automatic Scheduled Messages:** Schedule messages for any future date and time (**`⋮` 3-dots menu ➔ "Schedule message 🕒"**). Features a dedicated Python background daemon worker (`chat/apps.py`) that checks every 10 seconds to auto-dispatch due scheduled messages live over WebSockets without requiring user clicks. Includes future time validation and a pending messages manager modal.
- **⏳ Disappearing Messages:** Set timers (24 Hours, 7 Days, 30 Days, or Off) per chat or group (**`⋮` 3-dots menu ➔ "Disappearing messages"**). Expired messages automatically disappear from chat windows for maximum privacy and storage optimization.
- **Interactive WhatsApp Polls:** Create dynamic multi-option polls in individual and group chats featuring live multi-select vote tabulation, authentic green percentage progress bars, voter avatar circle preview badges, and an exhaustive "View votes" detail breakdown dialog.
- **Automatic Hyperlink Recognition:** Automatically scans chat texts for HTTP, HTTPS, and web domains (such as Amazon or GitHub) and transforms them into secure, clickable light-blue web hyperlinks (`target="_blank"` with zero-day vulnerability protection `rel="noopener noreferrer"`).
- **Advanced Message Actions & WhatsApp Selection Bar:** 
  - **Reply:** Quote specific messages in your response (available via menu or top selection action bar when 1 message is selected).
  - **Forward:** Share messages and media to other chats or groups (single or multi-message forward).
  - **Delete Options (Delete for Me vs. Delete for Everyone):**
    - **Delete for Me:** Remove messages from your view anytime.
    - **Delete for Everyone:** Soft-delete messages for all participants within a 30-minute sending window (leaves a *"🚫 This message was deleted"* tombstone). Automatically expires after 30 minutes.
  - **Multi-Select & Bulk Actions:** WhatsApp-style top action bar showing Reply (1 selected), Forward, and Delete icons. Already deleted messages are protected and non-selectable during selection mode.
- **Chat Management:** Pin important chats to the top, favourite them, mute notifications, or archive them.
- **Read Receipts & Status:** See when your messages are sent and read. View real-time "Typing..." indicators, "Online" status, and "Last Seen" timestamps.
- **In-Chat Search:** Search for specific text within a conversation to quickly find old messages.

### 🏛️ Django Admin Portal & Compliance Audit Trail
- **Permanent Data Audit Preservation:** Even when messages disappear or are soft-deleted by users in the app, the Django Admin Portal (`http://localhost:8000/admin/chat/message/`) permanently retains 100% of all original message content, edit histories, and attachment records for administrative compliance.
- **Sequential Multi-Edit Audit History:** Displays complete step-by-step audit trails for edited messages (`Content (Original): ...`, `Edit 1: ...`, `Edit 2: ...`, `Edit 3: ...`) with status badges (`✏️ [EDITED (2 Edits)]`).
- **IST Local Timezone Integration:** Configured with `TIME_ZONE = 'Asia/Kolkata'` (IST / UTC+5:30) so all Django Admin timestamps reflect local Indian Standard Time.

### 🎨 Media & Image Preview Editor
- **📄 Document Preview (PDF, Word & Excel):** Preview PDFs, Word (`.doc`/`.docx`), and Excel (`.xls`/`.xlsx`) documents directly inside a full-screen interactive viewport without downloading them first, complete with direct download buttons.
- **✨ HD Image Quality Toggle:** Select between **Standard Quality** (optimized) and **HD Quality ✨** (full resolution) via an interactive pill toggle before sending pictures in chat.
- **Chat Image Preview Editor:** Full-screen annotation suite that opens whenever sending images in chat:
  - **Text Overlays:** Add colorful text anywhere on the image.
  - **Emoji Stickers:** Add draggable emojis to pictures.
  - **Scribble & Drawing Canvas:** Freehand drawing on photos with customizable color palettes and brush sizes (3px to 20px).
  - **Interactive Resizing:** Scale text and emoji stickers via mouse scroll wheel, **+** / **−** buttons, or an interactive size slider (10px - 120px).
  - **Captions:** Add text captions sent alongside your edited photos.
- **Voice & Video Calls:** High-quality, real-time, peer-to-peer audio and video calling powered by WebRTC. Includes incoming call overlay and dedicated call history tab.
- **Voice Notes:** Record and send audio messages directly from the chat window using your microphone.
- **Avatar Cropping:** Upload and perfectly crop circular profile pictures and group icons using an interactive cropping tool.

### 🔔 Sound Effects & Audio Synthesizer
- **Web Audio API Notification System:** Zero-dependency, browser-native audio synthesizer requiring no external MP3 files:
  - **Incoming Message Chime:** WhatsApp-style dual-tone chime (`D5` 587Hz ➔ `A5` 880Hz) on new messages.
  - **Sent Message Pop:** Subtle outgoing pop sound (`440Hz` ➔ `880Hz`).
  - **WebRTC Call Ringtone Loop:** WhatsApp-style dual-tone ringing pulse (`440Hz` + `480Hz`) on incoming calls that automatically stops on answer/decline.
- **Browser Autoplay Unlock & Global Sound Engine:**
  - **Interaction Audio Unlock:** Automatic pointer/touch/keypress listeners (`click`, `keydown`, `touchstart`) to immediately unlock the Web Audio API context in compliance with modern browser autoplay policies.
  - **Global WebSocket Audio Listener:** Listens on the global user WebSocket channel so incoming messages from friends trigger notification chimes anywhere across active, background, or unselected chats.
- **Notification & Ringtone Settings:** Customizable sound preferences inside **Profile Settings**:
  - **Message Sound Toggle & Tone Picker:** Choose between *Classic Chime*, *Soft Marimba*, *Crisp Pop*, or *Double Pulse*.
  - **Call Ringtone Toggle & Tone Picker:** Choose between *WhatsApp Ringtone*, *Classic Digital Ring*, *Gentle Melody*, or *Marimba Beat*.
  - **Live ▶ Play Test Buttons:** Instantly preview selected tones directly inside Settings!

### 🌟 Status Media Studio & 24-Hour Stories
- **WhatsApp-Style Status Stories:** Share temporary photo, video, and rich text updates that automatically expire after 24 hours with view receipt timestamps and direct messaging reaction replies.
- **Status Quote Preview & Viewer:** High-resolution status thumbnail rendering in chat threads with click-to-view full-screen Status Story Preview modal.

### 🎨 User Experience
- **Dedicated Status Dashboard Workspace:** Intelligent layout routing that automatically clears open conversation windows when switching navigation tabs, displaying an elegant WhatsApp-styled status illustration workspace on the main right-hand screen.
- **Profile About Emoji Personalization:** Built-in interactive theme-aware emoji picker dropdown integrated directly into the Profile Settings About status input field.
- **Custom Glassmorphic Popups & Modals:** Universal custom-styled confirmation dialogs, blurred backdrops, and interactive notification toasts that completely replace native browser alert windows.
- **Professional Lucide Icon Design:** Enterprise-grade vector icon architecture providing clean, crisp iconography across headers, menus, attachment pickers, and navigation bars.
- **Dark & Light Mode:** Toggle between beautifully crafted light and dark themes that mirror WhatsApp's modern design tokens.
- **WhatsApp-Style Media Picker (Emojis, GIFs & Stickers):** Features a multi-tabbed media popup window with a bottom floating pill switcher to easily send Emojis, live trending GIFs (powered by GIPHY API), and transparent animated Stickers with custom category filtering.
- **Responsive Design:** A fluid UI that works flawlessly on different screen sizes from desktops to mobile devices.

## Tech Stack & Packages Used

### Backend Packages (Python/Django)
The backend uses a virtual environment and runs on Django and Django Rest Framework to provide a powerful API and handle data.

- **Django (5.0.14):** The core web framework running the backend.
- **djangorestframework (3.17.1):** Used to build the REST API endpoints that the frontend talks to.
- **djangorestframework-simplejwt (5.5.1):** Handles user authentication via JSON Web Tokens (Access and Refresh tokens).
- **django-cors-headers (4.9.0):** Allows the React frontend to securely communicate with the Django backend.
- **channels & daphne (4.3.2 / 4.2.3):** These enable WebSockets and asynchronous processing for real-time chat, calls, and online status.
- **channels_redis & redis:** Installed as the backend message broker used by Django Channels for production. *(Note: For local development, the app is currently configured to use Django's built-in `InMemoryChannelLayer` to avoid requiring a separate Redis server installation).*
- **PyMySQL (1.2.0):** The database driver that allows Django to connect to the MySQL database.
- **pillow (12.3.0):** The Python image processing library used to handle profile pictures and image uploads.

### Frontend Packages (React/Vite)
The frontend is a modern single-page React application powered by the Vite build tool.

- **react & react-dom (19.2.7):** The core UI library for building the interface components.
- **react-router-dom (7.18.2):** Handles navigation between different pages (like Login, Register, and the main Chat Layout).
- **axios (1.18.1):** A powerful HTTP client used to send API requests to the Django backend.
- **vite (8.1.1):** The extremely fast build tool and development server running the frontend environment.
- **emoji-picker-react (4.19.1):** Provides the fast virtualized emoji scrolling grid in Tab 1 of the multi-tabbed chat media picker.
- **GIPHY Media REST API Integration:** Instead of importing heavy third-party vendor UI bundles (like `@giphy/react-components` or `gif-picker-react`), the application directly queries Giphy's public trending and searching REST endpoints (`api.giphy.com/v1/gifs` and `api.giphy.com/v1/stickers`) via native browser `fetch`. This zero-dependency design allowed building the custom WhatsApp-style floating bottom switch bar while keeping the production build exceptionally fast and lightweight.

## How to Run the Application

You will need two separate terminal windows to run both the frontend and backend simultaneously.

### 1. Running the Backend
Open a terminal and navigate to the project root directory (where `manage.py` is located).

```bash
# Activate the virtual environment
.\venv\Scripts\activate

# Start the Django development server (runs with Daphne for WebSockets)
python manage.py runserver
```
*The backend API and WebSocket server will run on `http://localhost:8000`.*

### 2. Running the Frontend
Open a second terminal window and navigate to the `frontend` directory.

```bash
# Install dependencies (only needed the first time or when packages change)
npm install

# Start the Vite development server
npm run dev
```
*The frontend application will start and be accessible in your browser (usually at `http://localhost:5173` or `https://localhost:5173`).*

## Real-Time Architecture: How Messages Travel

This application uses a combination of REST APIs and WebSockets to achieve real-time, persistent messaging. Here is the step-by-step lifecycle of a message:

1. **User Sends a Message (Frontend)**: The user types a message in React (`ChatWindow.jsx`) and clicks send.
2. **HTTP POST Request**: The React application packages the message data and makes a secure HTTP `POST` request to the Django backend API via `axios`.
3. **Database Storage (Backend)**: The Django backend receives the request, validates it, and permanently saves the message to the MySQL database. This ensures chat history is preserved across devices and sessions.
4. **Internal Broadcast (Django Channels)**: Immediately after saving to the database, Django utilizes the `InMemoryChannelLayer`. It broadcasts an internal event to a virtual "room group" corresponding to that specific chat conversation.
    - *Note on Redis vs InMemoryChannelLayer:* In production, an external Redis server is typically used to route these messages between multiple Django servers. For local development, this app is configured to use Django's `InMemoryChannelLayer`, which performs the exact same routing entirely within your computer's RAM, completely removing the need to install or run a separate Redis database!
5. **WebSocket Push**: The `ChatConsumer` listening to that room group grabs the message data and pushes it down the open WebSocket connection of anyone currently viewing that chat.
6. **Instant UI Update (Frontend)**: The receiving user's React frontend detects the incoming WebSocket message and instantly appends it to their chat window, updating the UI in real-time without requiring a page refresh.

## WebRTC Architecture: How Calls Work

This application utilizes native WebRTC (Web Real-Time Communication) to provide high-quality peer-to-peer audio and video calls, completely free of any third-party calling services (like Twilio or Agora). Here is how a call is established:

1. **Initiating the Call (Caller)**: The user clicks the video or audio call button. The browser immediately asks for microphone/camera permissions (`getUserMedia`). Once granted, it creates an `RTCPeerConnection` and generates an SDP "Offer" containing the caller's media capabilities.
2. **Signaling over WebSockets**: WebRTC requires a "signaling" channel to exchange connection data before the actual peer-to-peer link can start. The app reuses the existing Django Channels WebSocket connection to securely transmit the SDP Offer to the callee.
3. **Receiving the Call (Callee)**: The receiving user's frontend gets the WebSocket event. A full-screen "Incoming Call" overlay rings. If they click "Accept", they grant media permissions and generate an SDP "Answer", which is sent back over WebSockets.
4. **ICE Candidate Exchange**: Simultaneously, both browsers use STUN servers (like Google's public STUN servers) to discover their own public IP addresses (ICE candidates). These IP addresses are rapidly exchanged through the WebSocket signaling server so the two devices know how to reach each other over the internet.
5. **Direct Peer-to-Peer Connection**: Once the SDP and ICE data is successfully exchanged, the WebSocket signaling is complete. A direct, encrypted, peer-to-peer WebRTC connection is established between the two users. Video and audio stream directly from computer to computer, bypassing the backend server entirely for maximum privacy and zero latency!

## Media Picker Architecture: Emojis, GIFs & Stickers

To deliver an authentic WhatsApp-style messaging experience without bloating the application bundle size, the media selection system in `MediaPicker.jsx` combines dedicated lightweight libraries with native API integrations:

1. **Tabbed Bottom Switcher (WhatsApp UI Pattern)**: A floating dark pill container anchored at the bottom center of the pop-up modal lets users instantly switch between Emojis (`😀`), GIFs (`GIF`), and animated Stickers (`📄`).
2. **Emoji Tab**: Powered by `emoji-picker-react` for instant offline rendering of Unicode standard emojis.
3. **GIF & Sticker Tabs (Zero-Dependency API Design)**:
   - Uses native asynchronous `fetch()` calls to GIPHY's Media REST API endpoints (`/v1/gifs/trending`, `/v1/gifs/search`, `/v1/stickers/trending`, `/v1/stickers/search`).
   - Includes instant keyword search bars with debouncing and interactive category filtering chips (*Trending*, *Love*, *Funny*, *Party*, *Pets*).
   - **Resilient Fallback Design**: If the device is offline or the network is constrained, the component immediately falls back to a curated collection of high-definition animated media URLs, ensuring zero loading errors.
4. **Native Chat Display & Previews**: When selected, GIFs render in custom rounded media bubbles while Stickers render as transparent floating icons. The left navigation conversation feed and message replies cleanly represent these items with specific badges (`🎞️ GIF` and `🏷️ Sticker`).

### Alternative Third-Party Packages
For developers looking to integrate standalone off-the-shelf vendor UI components instead of a custom multi-tabbed interface, the industry standard npm alternatives include:
- **`gif-picker-react`**: A ready-made modal powered by Google's Tenor GIF repository (`npm i gif-picker-react`).
- **`@giphy/react-components` + `@giphy/js-fetch-api`**: The official Giphy SDK providing automatic responsive masonry layout grids (`npm i @giphy/react-components @giphy/js-fetch-api`).

## Testing with Friends over the Internet (No Deploy Required!)

If you want your friends to connect to your app while they are at their own houses (not on your WiFi), you can use a free tunneling tool like **Ngrok**. 

Because this project uses Vite's proxy to combine the frontend and backend under one port, you only need to expose your frontend port!

1. Download and install [Ngrok](https://ngrok.com/).
2. Run your backend and frontend normally in your two terminal windows.
3. Open a **third** terminal window and run:
   ```bash
   ngrok http https://localhost:5173
   ```
4. Ngrok will generate a public URL (e.g., `https://1234-abcd.ngrok-free.app`). 
5. Send that exact URL to your friends anywhere in the world, and they will be able to load the app, create an account, and chat/call you instantly!
