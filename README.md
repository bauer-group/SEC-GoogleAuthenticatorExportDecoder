# Google Authenticator Export Decoder

![Logo](public/icon-192x192.png)

**Decode Google Authenticator export QR codes and migrate your TOTP secrets**

## **[▶ Launch App](https://bauer-group.github.io/SEC-GoogleAuthenticatorExportDecoder/)**

[Features](#features) | [Quick Start](#quick-start) | [Usage](#usage) | [Deployment](#deployment) | [Development](#development) | [Security](#security--privacy)

---

> **Privacy First**: All processing happens entirely in your browser. No data is ever sent to a server.

> **Note**: This project is not affiliated with Google.

## Features

| Feature              | Description                                           |
| -------------------- | ----------------------------------------------------- |
| 📸 **QR Scanner**    | Scan QR codes via webcam or upload image files        |
| 📤 **Export Formats**| CSV, JSON, and Bitwarden/Vaultwarden compatible       |
| 🔒 **Privacy-First** | 100% client-side processing, no server communication  |
| 🌍 **Multi-Language**| English and German with auto-detection                |
| 🌙 **Dark/Light Mode**| Elegant theme switcher with system preference support|
| 📱 **PWA Ready**     | Install as standalone app on desktop or mobile        |
| 📶 **Offline Support**| Works without internet once installed                |
| 🔢 **Batch Support** | Handles multi-QR exports for many accounts            |
| 🐳 **Docker Ready**  | Lightweight production container (~25MB)              |

## Quick Start

### Prerequisites

- **Node.js 24 LTS** (see `.nvmrc`)
- A camera or QR code image file
- Google Authenticator app with accounts to export

### Installation

```bash
# Clone the repository
git clone https://github.com/bauer-group/SEC-GoogleAuthenticatorExportDecoder.git
cd SEC-GoogleAuthenticatorExportDecoder

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build

```bash
# Type-check and build
npm run build

# Preview production build locally
npm run preview
```

## Usage

### Step 1: Export from Google Authenticator

1. Open **Google Authenticator** on your phone
2. Tap ⋮ (menu) → **Transfer accounts** → **Export accounts**
3. Authenticate if prompted (fingerprint, PIN, etc.)
4. Select accounts to export → **Next**
5. The QR code(s) will be displayed

> **Note**: Google Authenticator disables screenshots for security. Use your webcam or take a photo with another device.

### Step 2: Scan the QR Code

#### Webcam Scanning

1. Allow camera access when prompted
2. Point webcam at the QR code
3. Accounts are decoded automatically

#### File Upload

1. Switch to **File** mode
2. Drag & drop or click to upload an image
3. Accounts are decoded automatically

### Step 3: Export Your Accounts

| Format        | Description              | Use Case                          |
| ------------- | ------------------------ | --------------------------------- |
| **CSV**       | Comma-separated values   | Spreadsheets, general import      |
| **JSON**      | Structured data          | Backup, programmatic access       |
| **Bitwarden** | Bitwarden JSON format    | Import into Bitwarden/Vaultwarden |

### Importing to Bitwarden

1. Export using the **Bitwarden** format
2. In Bitwarden: **Tools** → **Import Data**
3. Select format: **Bitwarden (json)**
4. Choose your file → **Import Data**

## Deployment

### GitHub Pages (Recommended for Public Access)

The easiest way to deploy is via GitHub Pages:

1. **Enable GitHub Pages**:
   - Go to repository **Settings** → **Pages**
   - Source: Select **GitHub Actions**

2. **Deploy**:
   - Push to `main` branch → automatic deployment
   - Or manually trigger via **Actions** → **Deploy to GitHub Pages** → **Run workflow**

3. **Access**: `https://bauer-group.github.io/SEC-GoogleAuthenticatorExportDecoder/`

> **Note**: The build automatically configures the correct base path for GitHub Pages.

### Docker (Self-Hosted)

#### Build and Run

```bash
# Build and run
docker build -t ga-export-decoder .
docker run -p 8080:80 ga-export-decoder
```

Open [http://localhost:8080](http://localhost:8080)

### Docker Compose (Recommended)

```bash
# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down

# Rebuild after changes
docker-compose up -d --build
```

### Production Features

- **Multi-stage build**: Minimal ~25MB image (nginx:alpine-slim)
- **Resource limits**: 128MB RAM, 0.5 CPU
- **Read-only filesystem**: Enhanced security
- **Health checks**: Automatic container monitoring
- **Log rotation**: Prevents disk fill-up

## Development

### Available Scripts

| Script                  | Description                            |
| ----------------------- | -------------------------------------- |
| `npm run dev`           | Start development server with HMR      |
| `npm run build`         | Type-check and build for production    |
| `npm run preview`       | Preview production build locally       |
| `npm run type-check`    | Run TypeScript compiler checks         |
| `npm run clean`         | Remove build artifacts and cache       |
| `npm run generate-icons`| Regenerate PWA icons                   |

### Technology Stack

| Category        | Technology                 |
| --------------- | -------------------------- |
| **Framework**   | React 18 with TypeScript   |
| **Build Tool**  | Vite 6                     |
| **Styling**     | Tailwind CSS v4            |
| **Components**  | shadcn/ui + Radix UI       |
| **Icons**       | Lucide React               |
| **QR Scanning** | html5-qrcode               |
| **Protobuf**    | protobufjs                 |
| **i18n**        | react-i18next              |
| **PWA**         | vite-plugin-pwa            |
| **Production**  | nginx:alpine-slim          |

### Project Structure

```text
src/
├── main.tsx                    # React entry point
├── App.tsx                     # Main application component
├── index.css                   # Global styles & theme variables
├── i18n.ts                     # i18next configuration
├── components/
│   ├── QRScanner.tsx          # Webcam QR scanning
│   ├── FileUpload.tsx         # File upload QR scanning
│   ├── AccountList.tsx        # Display scanned accounts
│   ├── ExportPanel.tsx        # Export format buttons
│   ├── LanguageSwitcher.tsx   # EN/DE toggle
│   ├── ThemeToggle.tsx        # Dark/Light mode switch
│   └── ui/                    # shadcn/ui components
├── context/
│   └── ThemeContext.tsx       # Theme state management
├── utils/
│   ├── decoder.ts             # Protobuf decoding logic
│   ├── exporters.ts           # CSV, JSON, Bitwarden exporters
│   └── pwa.ts                 # PWA utilities
├── types/
│   └── index.ts               # TypeScript interfaces
└── lib/
    └── utils.ts               # Utility functions (cn, etc.)

public/
├── locales/
│   ├── en/translation.json    # English translations
│   └── de/translation.json    # German translations
├── icon-192x192.png           # PWA icon
└── icon-512x512.png           # PWA icon

Configuration:
├── package.json               # Dependencies and scripts
├── vite.config.ts             # Vite + PWA configuration
├── tsconfig.json              # TypeScript configuration
├── tailwind.config.ts         # Tailwind CSS configuration
├── components.json            # shadcn/ui configuration
├── Dockerfile                 # Multi-stage production build
├── docker-compose.yml         # Docker deployment
├── nginx.conf                 # Nginx SPA configuration
└── .nvmrc                     # Node.js version (24)
```

### How It Works

```text
QR Code → html5-qrcode → URI Parsing → Base64 Decode → Protobuf Parse → Base32 Convert → Export
```

1. **QR Scanning**: Captures QR codes from webcam or image files
2. **URI Parsing**: Extracts `otpauth-migration://offline?data=...`
3. **Base64 Decoding**: URL-decode then Base64-decode the data
4. **Protobuf Parsing**: Parse binary using Google's protobuf schema
5. **Secret Conversion**: Convert Base64 secrets to Base32 (TOTP standard)
6. **Export Generation**: Format as CSV, JSON, or Bitwarden JSON

**All processing happens in your browser** — no server communication.

### Adding a New Language

1. Create `public/locales/{lang}/translation.json`
2. Copy structure from `public/locales/en/translation.json`
3. Translate all strings
4. Update `src/i18n.ts`:
   - Add to `SUPPORTED_LANGUAGES`
   - Add display name to `LANGUAGE_NAMES`

## Security & Privacy

| Guarantee              | Description                              |
| ---------------------- | ---------------------------------------- |
| **Client-Side Only**   | All processing in your browser           |
| **No Server Comm.**    | Secrets never leave your device          |
| **No Storage**         | Data only in memory, gone on tab close   |
| **No Tracking**        | No analytics, telemetry, or third-party  |
| **Open Source**        | Full transparency — audit the code       |

### Verify Privacy

1. Open Developer Tools (F12) → Network tab
2. Scan a QR code
3. Confirm no requests contain your TOTP secrets

> **Full Security Documentation**: See [SECURITY.md](SECURITY.md) for detailed security architecture, threat model, and incident response procedures.

## Troubleshooting

### Camera Not Working

- Ensure HTTPS or localhost (camera requires secure context)
- Check browser permissions for camera access
- Try Chrome or Firefox (best compatibility)
- Use file upload as alternative

### QR Code Not Detected

- Ensure good lighting and steady camera
- Hold QR code ~20-30cm from camera
- Try file upload with a clear photo
- Verify it's a Google Authenticator export QR (`otpauth-migration://`)

### Bitwarden Import Issues

- Select format: **Bitwarden (json)** (not generic JSON)
- Verify the exported file isn't corrupted
- Check Bitwarden's import logs for errors

## Contributing

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** changes: `git commit -m 'Add amazing feature'`
4. **Push** to branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### Code Guidelines

- Follow existing patterns
- Use TypeScript strictly (no `any`)
- Add tests for new functionality
- Use i18n for all user-facing text
- Ensure accessibility (ARIA, keyboard navigation)
- Keep dependencies minimal

## Author

**Karl Bauer** — [karl.bauer@bauer-group.com](mailto:karl.bauer@bauer-group.com)

## License

MIT License — see [LICENSE](LICENSE) for details.

## Acknowledgments

- [html5-qrcode](https://github.com/mebjas/html5-qrcode) — QR code scanning
- [protobufjs](https://github.com/protobufjs/protobuf.js) — Protocol Buffers
- [Aegis Authenticator](https://github.com/beemdevelopment/Aegis) — Protobuf schema reference
- [shadcn/ui](https://ui.shadcn.com/) — UI components
- [Lucide](https://lucide.dev/) — Icons

---

**Your secrets stay yours.**
