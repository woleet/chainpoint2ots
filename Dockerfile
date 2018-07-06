FROM node:9.2-alpine

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json /usr/src/app/

RUN apk add --no-cache --virtual .build-deps \
    git \
    && npm i --production \
    && apk del .build-deps

# Bundle app source
COPY src /usr/src/app/src
COPY static /usr/src/app/static
COPY index.js /usr/src/app/index.js

EXPOSE 3000
CMD [ "npm", "start" ]
