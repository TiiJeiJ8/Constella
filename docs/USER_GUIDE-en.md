# Constella User Guide

## 1. Scope

- Client targets: Web and Electron desktop (installer and portable).
- Typical users: collaborators, room owners, and admins.
- Goal: help you from first connection to daily collaboration and export.

## 2. Quick Start

### 2.1 Prerequisites

- Make sure the backend server is running and reachable.
- Prepare a server address, for example `http://127.0.0.1:3000` or `http://192.168.x.x:3000`.
- In LAN scenarios, allow required ports through firewall policies.

### 2.2 Start the Client

- Web: open the deployed URL or local dev URL.
- Desktop installer: install and launch the app.
- Desktop portable: unzip and run the executable directly.

### 2.3 First Server Connection

1. Enter the server address on the home screen.
2. Click Connect.
3. After a successful check, continue to the login screen.

Desktop LAN discovery tips:

- Single-click an item to preview its address.
- Double-click an item to connect directly.

## 3. Login and Registration

### 3.1 Login

1. Enter password.
2. After login, go to the room page.

### 3.2 Registration

When an account does not exist, registration flow is shown:

1. Enter password.
2. Enter Confirm Password.
3. Registration is allowed only when both passwords match.

Note: the client no longer auto-registers immediately when an account is missing.

## 4. Room Collaboration Flow

### 4.1 Room List

- Browse all rooms, my rooms, and joined rooms.
- Favorite rooms for quick access.

### 4.2 Create a Room

1. Click Create Room.
2. Set room name and optional description.
3. Choose public or private.
4. For private rooms, set a password if needed.

### 4.3 Join a Room

- Public rooms can be joined directly.
- Private rooms require the room password.

### 4.4 Roles and Permissions

- Owner: full control.
- Admin: assists in member and asset management.
- Member: regular collaboration permissions.

## 5. Canvas Basics

### 5.1 Navigation

- Pan: drag the canvas or use pan tool.
- Zoom: use mouse wheel.
- Select: click node or box-select.

### 5.2 Nodes and Edges

- Create nodes from the toolbox.
- Edit nodes by double-clicking.
- Create edges by linking source and target nodes.

### 5.3 Common Panels

- Right panel: properties, structure, assets, and more.
- Members panel: online member presence.
- Chat panel: real-time room messaging.

## 6. Node Editing and Content Features

### 6.1 Text and Markdown

- Supports plain text and Markdown rendering.
- Markdown editor supports common formatting and commands.

### 6.2 Math and Code

- KaTeX math rendering is supported.
- Multi-language code block highlighting is supported.

### 6.3 Mermaid Diagrams

- Supports common Mermaid diagram types.
- Useful for flows, sequences, and mind maps.

## 7. Assets and Snapshots

### 7.1 Asset Upload

- Upload image assets and insert them into canvas.
- Asset operations are controlled by room permissions.

### 7.2 Snapshot Management

- Create snapshots of current canvas state.
- Restore snapshots when rollback is needed.

## 8. Export

### 8.1 Canvas Export

- Export as JSON, PNG, and SVG.

### 8.2 Document Export

- Export as Markdown, Text, and PDF (depends on runtime environment).

## 9. Settings and Personalization

- Theme: light and dark.
- Language: Chinese and English.
- Account profile: display name, avatar, user identifier.
- Editor and collaboration preferences are configurable in Settings.

## 10. Troubleshooting

### 10.1 Cannot Connect to Server

- Verify backend is running.
- Verify URL and port.
- Check network path and firewall rules.

### 10.2 LAN Discovery Looks Unstable

- Prefer IPv4 address for connection.
- Refresh discovery list or connect manually.
- Restart client and server once to refresh cached discovery state.

### 10.3 Desktop Startup Issues

- Ensure Node.js is installed on target machine.
- Check app logs and system permissions.

## 11. Feedback and Support

- Open an issue in the repository for bugs and feature requests.
- Include environment, reproduction steps, and logs whenever possible.

---

Maintenance policy:

- This guide is continuously updated.
- When behavior changes, update this file first.
