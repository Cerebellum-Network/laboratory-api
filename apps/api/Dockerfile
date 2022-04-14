FROM node:12.18.4

WORKDIR /app

COPY . .

RUN npm install

RUN npm run build:api; rm -f .npmrc

EXPOSE 1111

CMD npm run start:prod:api
