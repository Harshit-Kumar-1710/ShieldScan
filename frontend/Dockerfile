FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY vercel.json /etc/nginx/conf.d/default.conf.template 2>/dev/null || true

EXPOSE 80
EXPOSE 5173

CMD ["nginx", "-g", "daemon off;"]
