FROM node:16
RUN mkdir -p /app
WORKDIR /app

COPY package.json ./
COPY yarn.lock ./


RUN yarn

ADD . .

CMD ["sh", "./migrate-and-run.sh"]

EXPOSE 9000