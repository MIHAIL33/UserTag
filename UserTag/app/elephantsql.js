const pg = require('pg')
const client = new pg.Client(process.env.DATABASE_URL)

client.connect(function(err) {
    if (err) {
        return console.error('could not connect to postgres', err);
    }
    client.query('SELECT NOW() AS "theTime"', function(err, result) {
        if (err) {
            return console.error('error running query', err)
        }
        console.log(result.rows[0].theTime)
    })
})

module.exports = client