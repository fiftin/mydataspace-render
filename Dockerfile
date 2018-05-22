FROM mhart/alpine-node:8

WORKDIR /app

ADD . /app

RUN npm install

EXPOSE 8080

CMD ["node", "index.js"]
