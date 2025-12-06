#!/bin/sh

# A simple script used by Docker and Kubernetes to verify the health of a running service container.
# This script attempts to connect to a predefined health check endpoint.

# Define the health check endpoint.
# It's common practice for services to expose a /health or /status endpoint.
# Adjust the port and path as per your application's configuration.
HEALTH_CHECK_URL="http://localhost:8080/health"

# Use curl to make a request to the health check URL.
# -s: Silent mode (don't show progress meter or error messages).
# -f: Fail silently (don't output HTTP error page on server errors).
#     This means curl will exit with a non-zero status code for 4xx or 5xx responses.
# -o /dev/null: Discard the output of the request.
curl -s -f -o /dev/null "${HEALTH_CHECK_URL}"

# Check the exit status of the curl command.
# If curl exited with 0, the request was successful (HTTP 2xx/3xx).
# If curl exited with a non-zero status, the request failed (connection error, timeout, HTTP 4xx/5xx).
if [ $? -eq 0 ]; then
  echo "Health check successful for ${HEALTH_CHECK_URL}"
  exit 0 # Success
else
  echo "Health check failed for ${HEALTH_CHECK_URL}"
  exit 1 # Failure
fi