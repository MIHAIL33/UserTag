const client = require('../elephantsql')

const createTableUsers = async () => {
    try {
        const res = await client.query(
            `CREATE TABLE IF NOT EXISTS Users (
                uid uuid NOT NULL, 
                email varchar(100) NOT NULL, 
                password varchar(100) NOT NULL, 
                nickname varchar(30) NOT NULL,
                PRIMARY KEY (uid)
            );`
        )
    } catch (err) {
        console.log(err)
    }
}

module.exports = createTableUsers