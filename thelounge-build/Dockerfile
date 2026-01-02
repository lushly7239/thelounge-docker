# ---------- BUILDER ----------
FROM node:24-alpine AS builder

ARG GIT_REPO="https://github.com/tetrahydroc/thelounge.git"
ARG GIT_BRANCH="master"

ENV NODE_ENV=production

# Build dependencies
RUN apk add --no-cache \
      python3 \
      py3-setuptools \
      build-base \
      git

# Use Yarn 1.x, disable Corepack
RUN corepack enable && \
    corepack prepare yarn@stable --activate

# Clone and build The Lounge
RUN git clone --depth 1 -b "$GIT_BRANCH" "$GIT_REPO" /src
WORKDIR /src

# Remove packageManager cleanly and rewrite JSON
#RUN tmp=$(mktemp) \
#    && jq 'del(.packageManager)' package.json > "$tmp" \
#    && mv "$tmp" package.json

# Install + build
RUN echo "nodeLinker: node-modules" > .yarnrc.yml \
    && yarn install --immutable \
    && yarn build \
    && yarn cache clean

# ---------- RUNTIME IMAGE ----------
FROM node:24-alpine

EXPOSE 9000

ENV THELOUNGE_HOME="/var/opt/thelounge"
ENV NODE_ENV=production

# Create runtime directories
RUN mkdir -p "$THELOUNGE_HOME" \
    && mkdir -p /opt/thelounge

# Copy build output only (no dev dependencies, no git, no caches)
COPY --chown=node:node --from=builder /src /opt/thelounge

# Add symlink for thelounge binary
RUN ln -s "/opt/thelounge/node_modules/.bin/thelounge" /usr/local/bin/thelounge
#RUN chown -R node:node "$THELOUNGE_HOME"

VOLUME "$THELOUNGE_HOME"

USER node:node
WORKDIR "$THELOUNGE_HOME"

ENTRYPOINT ["/usr/local/bin/thelounge"]
CMD ["start"]