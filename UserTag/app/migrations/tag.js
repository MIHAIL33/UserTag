const client = require('../elephantsql')

const createTableTags = async () => {
    try {
        const res = await client.query(
            `CREATE TABLE IF NOT EXISTS Tags (
                id serial NOT NULL,
                creator uuid NOT NULL,
                name varchar(40) NOT NULL,
                sortOrder int DEFAULT 0,
                PRIMARY KEY (id),
                FOREIGN KEY (creator) REFERENCES Users(uid)
            );`
        )
    } catch (err) {
        console.log(err)
    }
}

module.exports = createTableTags