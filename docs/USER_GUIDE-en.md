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

Constella includes a dedicated plugin panel in two places:

- Settings -> Plugins
- Room dock -> Plugins

The panel shows:

- Built-in official nodes
- Installed external plugins
- A reserved marketplace area for future online distribution
- When Developer Mode is enabled, the panel can also show development plugin tools

## 6. Plugin Types

Constella distinguishes three plugin layers:

- Built-in official plugins: shipped with the app
- User-installed plugins: installed locally by end users
- Development plugins: local folder-based plugins for developer testing

These layers are not the same:

- Built-in plugins are part of the product
- Installed plugins belong to the user's local environment
- Development plugins belong to the development workflow

## 7. Import and Installation

Plugin import is available in the Electron desktop app.

Recommended formats for end users:

- `.constella-plugin`
- `.zip`

Developer-oriented source:

- A plugin folder that contains `manifest.json`

Important notes:

- `manifest.json` is the entry file of a plugin folder
- `manifest.json` is not a standalone plugin package
- Installed plugins remain available after restarting the app because they are stored locally
- The package import flow is the main path for end users
- Folder-based loading is intended for developers and is shown only when Developer Mode is enabled

## 8. Where Installed Plugins Are Stored

Electron stores plugin data under the user data directory:

- Installed plugin contents: `app.getPath('userData')/plugins/installed`
- Imported archives cache: `app.getPath('userData')/plugins/archives`

## 9. Enable, Disable, and Remove

In the plugin panel you can:

- Enable a plugin
- Disable a plugin
- Remove a plugin

These operations are intended to refresh the runtime plugin registry without requiring a full app reload.

## 10. Development Plugin Guidance

If you are building a plugin locally:

- Keep temporary development plugins outside built-in plugin source directories
- Prefer a dedicated development directory such as `dev-plugins/`
- Package the plugin as `.constella-plugin` when preparing it for sharing
- If Developer Mode is turned off, development plugins are hidden from the panel and skipped during runtime loading, but their saved records are preserved

Do not treat the built-in `src/plugins/` directory as the general install location for user plugins.

## 11. Export and Assets

- Export canvas as JSON, PNG, and SVG
- Export node content as Markdown, Text, and PDF where supported
- Upload assets and insert them into canvas

## 12. Troubleshooting

### 12.1 Plugin Cannot Be Imported

- Check that the package or folder contains a valid `manifest.json`
- Check that all files referenced by `manifest.json` exist
- If using an archive, make sure the archive root is the actual plugin root

### 12.2 Plugin Still Exists After Restart

This is expected. Installed plugins are persisted in Electron user data.
