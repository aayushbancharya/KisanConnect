# KisanConnect frontend

This folder contains the frontend for KisanConnect. It is a React and TypeScript app built with Vite.

## Start it

From this folder, install the packages and start the development server:

```sh
npm ci
npm run dev
```

The frontend uses the backend URL from `VITE_BACKEND_URL` when it is set. During local development, the project uses the local backend at `http://localhost:5000` for the pages that support local development.

## Build it

```sh
npm run build
```

The production files are created in the `dist` folder.

## Main parts

- `src/pages` contains the website pages.
- `src/components` contains shared UI such as the navigation shell, loading screen, and weather widget.
- `src/assets` contains frontend image assets.
- `public` contains the logo and PWA files.

The UI and navigation are designed for desktop and mobile screens. Login state, the selected farm, and API data are handled by the existing application code.
