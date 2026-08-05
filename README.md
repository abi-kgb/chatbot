# WhatsApp Clone 

This project is a modern, real-time web application built to mimic the core features of WhatsApp. It features a robust backend built with Python (Django) and a responsive, dynamic frontend built with React (Vite).

## Key Features

This application goes far beyond basic messaging, implementing a full suite of features expected in a modern chat application:

### 🔐 Privacy & Security
- **App Lock:** Secure your chats behind a custom passcode lock screen. The app auto-locks after inactivity or upon request.
- **WhatsApp-Style Contacts:** A privacy-first address book. If a user is not in your contacts, their username is hidden during search (only their phone number is shown). You can manually add users to your contacts with custom names that sync across your devices.
- **Block System:** Block and unblock users to prevent unwanted messages and calls.

### 💬 Messaging & Chats
- **Real-time Messaging:** Lightning-fast 1-on-1 and group messaging powered by WebSockets.
- **Group Chats:** Create groups, add/remove members, and manage admin roles. Group avatars and names can be customized.
- **Advanced Message Actions:** 
  - **Reply:** Quote specific messages in your response.
  - **Forward:** Share messages (including media) with other chats or groups.
  - **Delete:** Delete messages for everyone (leaves a "This message was deleted" tombstone).
  - **Select & Bulk Actions:** Select multiple messages to forward or delete them all at once.
- **Chat Management:** Pin important chats to the top, favourite them, mute notifications, or archive them.
- **Read Receipts & Status:** See when your messages are sent and read. View real-time "Typing..." indicators, "Online" status, and "Last Seen" timestamps.
- **In-Chat Search:** Search for specific text within a conversation to quickly find old messages.

### 📞 Media & Calls
- **Voice & Video Calls:** High-quality, real-time, peer-to-peer audio and video calling powered by WebRTC. Includes a custom ringtone, incoming call overlay, and a dedicated call history tab.
- **Media Attachments:** Send images, videos, audio files, and PDFs directly in the chat.
- **Voice Notes:** Record and send audio messages directly from the chat window using your microphone.
- **Avatar Cropping:** Upload and perfectly crop circular profile pictures and group icons using an interactive cropping tool.

### 🌟 Status Media Studio & 24-Hour Stories
- **WhatsApp-Style Status Stories:** Share temporary photo, video, and rich text updates that automatically expire after 24 hours with view receipt timestamps and direct messaging reaction replies.
- **Interactive Photo & Video Studio:** An all-in-one full-screen media editing suite that launches automatically before publishing:
  - **Image Cropping & Rotation:** Custom cropping aspect ratios (Original, 9:16 story portrait, 1:1 square, 4:3) and instant 90° rotational transformations.
  - **Pencil Doodling & Sketching:** Silky-smooth freehand drawing tool with customizable vibrant color palettes and adjustable stroke thicknesses (Fine, Medium, Marker) featuring OS-level hardware pointer locking (`setPointerCapture`) for zero-latency drawing on laptop touchpads, touchscreens, and mice.
  - **Sticker & Text Overlays:** Stamp floating, draggable emojis and custom styled typography banners directly onto pictures and videos with click-to-resize bounding selection frames and two-finger zoom scaling.
  - **Video Trimming Sliders:** Precision dual-handle range slider enabling exact start and end timestamp trimming within loop intervals alongside native playback controls across MP4, WebM, MOV, AVI, MKV, and 3GP formats.
- **Status Notification Counts:** Real-time badge indicator counters alerting users whenever contacts publish new unviewed stories.

### 🎨 User Experience
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
