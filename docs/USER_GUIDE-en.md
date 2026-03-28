# Constella User Guide

## 1. Scope

- Client targets: Web and Electron desktop
- Typical users: collaborators, room owners, and admins
- Goal: help you from first connection to daily collaboration and plugin usage

## 2. Quick Start

### 2.1 Prerequisites

- Make sure the backend server is running and reachable
- Prepare a server address, for example `http://127.0.0.1:3000`

### 2.2 Start the Client

- Web: open the deployed URL or local dev URL
- Desktop installer: install and launch the app
- Desktop portable: unzip and run the executable

## 3. Login and Rooms

- Connect to the backend from the home page
- Log in or register
- Create, join, and favorite rooms

## 4. Canvas Basics

- Pan, zoom, and select nodes
- Double-click nodes to edit
- Create edges between nodes

## 5. Plugin Panel

Constella now includes a dedicated plugin panel in two places:

- Settings -> Plugins
- Room dock -> Plugins

The panel shows:

- Built-in official nodes
- Installed external plugins
- A reserved marketplace area for future online distribution

## 6. Plugin Import and Installation

Plugin import is currently available in the Electron desktop app.

You can install a plugin by:

- Dragging a plugin folder into the plugin drop zone
- Dragging a `.constella-plugin` or `.zip` archive into the drop zone
- Clicking the drop zone and selecting local content manually

Important notes:

- `manifest.json` is only the entry file of a plugin folder
- Importing `manifest.json` means importing the whole directory that contains it
- Installed plugins remain available after restarting the app because they are stored locally

## 7. Where Installed Plugins Are Stored

Electron stores plugin data under the user data directory:

- Installed plugin contents: `app.getPath('userData')/plugins/installed`
- Imported archives cache: `app.getPath('userData')/plugins/archives`

## 8. Enable, Disable, and Remove

In the plugin panel you can:

- Enable a plugin
- Disable a plugin
- Remove a plugin

These operations refresh the runtime plugin registry and should not require a full app reload.

## 9. Export and Assets

- Export canvas as JSON, PNG, and SVG
- Export node content as Markdown, Text, and PDF where supported
- Upload assets and insert them into canvas

## 10. Troubleshooting

### 10.1 Plugin Cannot Be Imported

- Check that the plugin folder contains `manifest.json`
- Check that all files referenced by `manifest.json` exist
- If using an archive, make sure it contains the plugin root contents instead of an unrelated outer directory

### 10.2 Plugin Still Exists After Restart

This is expected. Installed plugins are persisted in Electron user data.

### 10.3 Web App Cannot Install Plugins

This is expected. Local plugin installation is currently desktop-only.
