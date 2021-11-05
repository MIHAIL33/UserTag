const expressJwt = require('express-jwt')

function authJwt() {
    const api = '/';
    const secret = process.env.secret
    return expressJwt({
        secret,
        algorithms: ['HS256']
    }).unless({
        path: [
            //{url: regPublic, methods: ['GET', 'OPTIONS']},
            `${api}singin`,
            `${api}login`
        ]
    })
}

module.exports = authJwt