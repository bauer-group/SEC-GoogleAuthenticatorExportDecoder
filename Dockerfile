# =============================================================================
# Google Authenticator Export Decoder - Production Dockerfile
# =============================================================================
# Multi-stage build optimized for minimal image size and security
#
# Final image: ~25MB (nginx:alpine-slim + static assets)
# Build: docker build -t ga-export-decoder .
# Run:   docker run -p 8080:80 ga-export-decoder
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Dependencies
# -----------------------------------------------------------------------------
# Separate stage for npm install to maximize layer caching
# Only invalidated when package*.json changes
# -----------------------------------------------------------------------------
FROM node:24-alpine AS deps

WORKDIR /app

# Copy only package files for dependency installation
COPY package.json package-lock.json* ./

# Install dependencies with clean install for reproducible builds
# --ignore-scripts: Skip postinstall scripts for security
# --no-audit: Skip audit during build (run separately in CI)
RUN npm ci --ignore-scripts

# -----------------------------------------------------------------------------
# Stage 2: Build
# -----------------------------------------------------------------------------
# Build the production bundle
# -----------------------------------------------------------------------------
FROM node:24-alpine AS build

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build the production bundle
# Output: /app/dist
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 3: Production
# -----------------------------------------------------------------------------
# Minimal nginx image serving static files
# -----------------------------------------------------------------------------
FROM nginx:1.27-alpine-slim AS production

# ───────────────────────────────────────────────────────────────────────────────
# Metadata
# ───────────────────────────────────────────────────────────────────────────────

LABEL vendor="BAUER GROUP"
LABEL maintainer="Karl Bauer <karl.bauer@bauer-group.com>"

# Opencontainers Metadata
LABEL org.opencontainers.image.title="Google Authenticator Export Decoder"
LABEL org.opencontainers.image.description="PWA for scanning Google Authenticator export QR codes and exporting TOTP secrets"
LABEL org.opencontainers.image.version="0.1.0"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.vendor="BAUER GROUP"
LABEL org.opencontainers.image.authors="Karl Bauer <karl.bauer@bauer-group.com>"
LABEL org.opencontainers.image.source="https://github.com/bauer-group/SEC-GoogleAuthenticatorExportDecoder"
LABEL org.opencontainers.image.url="https://github.com/bauer-group/SEC-GoogleAuthenticatorExportDecoder"
LABEL org.opencontainers.image.documentation="https://github.com/bauer-group/SEC-GoogleAuthenticatorExportDecoder#readme"

# Remove default nginx content
RUN rm -rf /usr/share/nginx/html/*

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Set correct permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Use non-root user where possible
# Note: nginx master process needs root to bind to port 80
# Worker processes run as 'nginx' user

# Expose HTTP port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

# Start nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
