# ── Stage 1: build the static SPA ──
FROM node:22-alpine AS build
WORKDIR /app

# Install deps first for better layer caching.
COPY package.json package-lock.json* ./
RUN npm ci || npm install

COPY . .

# VITE_ vars are inlined at build time. Pass one through if you want to bake a
# default API base into the image:  docker build --build-arg VITE_API_BASE=... .
# (At runtime you can always override via the in-app "API base" field instead.)
ARG VITE_API_BASE
ENV VITE_API_BASE=${VITE_API_BASE}
RUN npm run build

# ── Stage 2: serve with nginx ──
FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
