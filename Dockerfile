FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

# Create uploads directory
RUN mkdir -p storage/uploads

EXPOSE 3006

CMD ["node", "server.js"]
