FROM node:14
WORKDIR /app
COPY ./app/package*.json ./
RUN npm install
COPY ./app /app
EXPOSE 3000
#ENV DATABASE_URL postgres://bdirykox:NsaqJFEmeeeH71USWjYUArHWUNu0Z3We@surus.db.elephantsql.com/bdirykox
#ENV secret bigsecret 
CMD ["node", "index.js"]

