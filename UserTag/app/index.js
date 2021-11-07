const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
require('dotenv/config')
const client = require('./elephantsql')
const authJwt = require('./helpers/jwt');
const errorHandler = require('./helpers/error-handler');

const createTableUsers = require('./migrations/user')
const createTableTags = require('./migrations/tag')
const createTableUsertag = require('./migrations/usertag')
createTableUsers()
createTableTags()
createTableUsertag()

const routers = require('./routers/routers')

const app = express()

app.use(cors())
app.options('*', cors())

app.use(express.json())
app.use(morgan('tiny'))
app.use(authJwt())
app.use(errorHandler)

app.use(`/`, routers)

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
    console.log('Server has been started...')
})

