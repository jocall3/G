# Covenant 38: The Immutable Artifact Blueprint for the Users Service
# This Dockerfile defines the process for creating a secure, efficient, and
# self-contained image for the InfiniteAI Users Service. It is a testament
# to the principle of transmitting utility through code.

# STAGE 1: The Forge (Builder)
# Here, we compile the source into its final, executable form.
# We use a specific version to ensure deterministic builds.
FROM node:20.12.2-alpine3.19 AS builder

# Set the working directory within the forge.
WORKDIR /usr/src/app

# Copy the dependency manifests. This layer is cached unless they change.
COPY package*.json ./

# Install dependencies with 'npm ci' for a clean, reproducible install.
# This is the foundation upon which the service is built.
RUN npm ci

# Copy the source code, the raw material of our utility.
COPY . .

# Transpile the TypeScript into executable JavaScript. This is the act of creation.
RUN npm run build

# Prune development dependencies to lighten the final artifact.
RUN npm prune --production


# STAGE 2: The Vessel (Production)
# This is the final, lean image that will carry our utility to the world.
# We use a minimal base to reduce surface area and enhance security.
FROM node:20.12.2-alpine3.19

# Define environment variables.
# NODE_ENV=production is critical for performance and security optimizations.
ENV NODE_ENV=production
ENV PORT=8080

# Create a dedicated, non-privileged user for the service.
# Running as root is a vulnerability we do not permit.
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Set the working directory for the running service.
WORKDIR /home/appuser

# Copy the compiled code and production dependencies from the forge.
# We only bring what is essential for the service to function.
COPY --from=builder --chown=appuser:appgroup /usr/src/app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /usr/src/app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /usr/src/app/package.json .

# Switch to the non-privileged user.
USER appuser

# Expose the port the service will listen on.
EXPOSE ${PORT}

# Add a health check to ensure the service is operational.
# This allows orchestrators to manage the service's lifecycle intelligently.
# The path '/healthz' is a common convention.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O - http://localhost:${PORT}/healthz || exit 1

# The command to start the service.
# This is the final instruction that brings the utility to life.
CMD [ "node", "dist/main.js" ]

# Metadata: Stamping the artifact with its identity.
LABEL maintainer="InfiniteAI <ceo@infiniteai.world>"
LABEL version="1.0.0"
LABEL description="Users Service for the InfiniteAI Banking Platform. A transmitting utility secured by Covenant 38."