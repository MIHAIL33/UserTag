const client = require('../elephantsql')

const createTableUsertag = async () => {
    try {
        const res = await client.query(
            `CREATE TABLE IF NOT EXISTS UserTag (
                id serial NOT NULL, 
                uid uuid NOT NULL, 
                idtag int NOT NULL,
                PRIMARY KEY (id),
                FOREIGN KEY (uid) REFERENCES Users(uid),
                FOREIGN KEY (idtag) REFERENCES Tags(id)
            );`
        )
    } catch (err) {
        console.log(err)
    }
}

module.exports = createTableUsertag