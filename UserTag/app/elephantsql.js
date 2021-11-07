const pg = require('pg')
let client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
})

function start() {
    client.connect().then(() => {
        client.query('SELECT NOW() AS "theTime"', function(err, result) {
            if (err) {
                return console.error('error running query', err)
            }
            console.log(result.rows[0].theTime)
        })
    }).catch(async (err) => {
        client = new pg.Client({
            connectionString: process.env.DATABASE_URL,
        })
        console.error('could not connect to postgres', err);
        setTimeout(start, 10000)
    })
}

start()

module.exports = client