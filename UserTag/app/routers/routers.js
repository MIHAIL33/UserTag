const express = require('express')
const client = require('../elephantsql')
const { body, validationResult } = require('express-validator')
const {v4: uuidv4} = require('uuid')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { query } = require('express')
const router = express.Router()


router.post(`/singin`, 
body('email').isEmail(), 
body('password').matches(/^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9]).{8,}$/), 
async (req, res) => {
    try {

        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()})
        }

        const emailMatch = await client.query(
            `SELECT email FROM Users WHERE email='${req.body.email}';`
        )
        if (emailMatch.rowCount) return res.status(400).send('this email already exists')

        const nicknameMatch = await client.query(
            `SELECT nickname FROM Users WHERE nickname='${req.body.nickname}';`
        )
        if (nicknameMatch.rowCount) return res.status(400).send('this nickname already exists')

        const result = await client.query(
            `INSERT INTO Users (uid, email, password, nickname)
                VALUES ('${uuidv4()}', '${req.body.email}', '${bcrypt.hashSync(req.body.password, 10)}', '${req.body.nickname}');
            `
        )
        
        const secret = process.env.secret
        const time = 1800
        const token = jwt.sign({
            userEmail: req.body.email
        }, secret, {expiresIn: time})

        return res.status(201).send({token: token, expire: time})
    } catch (err) {
        console.log(err)
    }
})

router.post(`/login`, 
body('email').isEmail(),
async (req, res) => {
    try {

        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()})
        }

        const userMatch = await client.query(
            `SELECT email, password, uid  FROM Users WHERE email='${req.body.email}';`
        )
        if (!userMatch.rowCount) return res.status(400).send('this email not found')

        if (!bcrypt.compareSync(req.body.password, userMatch.rows[0].password)) {
            return res.status(400).send('invalid password')
        }

        const secret = process.env.secret
        const time = 1800
        const token = jwt.sign({
            userUid: userMatch.rows[0].uid
        }, secret, {expiresIn: time})

        return res.status(201).send({token: token, expire: time})
    } catch (err) {
        console.log(err)
    }
})


router.post(`/logout`, verifyToken, getUidFromToken, (req, res) => {
    try {
        res.clearCookie('jwt')
        return res.status(200).send('logout success')
    } catch (err) {
        console.log(err)
    }
})

function verifyToken(req, res, next) {
    const bearerHeader = req.headers['authorization'];
  
    if (bearerHeader) {
      const bearer = bearerHeader.split(' ');
      const bearerToken = bearer[1];
      req.token = bearerToken;
      next();
    } else {
      res.sendStatus(403);
    }
}

function getUidFromToken(req, res, next) {
    let base64Url = req.token.split('.')[1];
    let base64 = base64Url.replace('-', '+').replace('_', '/');
    let decodedData = JSON.parse(Buffer.from(base64, 'base64').toString('binary'));
    req.userUid = decodedData.userUid
    next()
}

router.get(`/user`, verifyToken, getUidFromToken, async (req, res) => {
    try {
        const result = await client.query(
            `SELECT us.email, us.nickname, t.id, t.name, t.sortOrder FROM usertag as ut 
            LEFT JOIN users us ON us.uid=ut.uid 
            LEFT JOIN tags t ON t.id=ut.idtag where ut.uid='${req.userUid}'
            `
        )
        if (!result.rowCount) {
            const resWithoutTag = await client.query(`
                SELECT email, nickname FROM Users WHERE uid='${req.userUid}'
            `)
            if (!resWithoutTag) return res.status(400).send('Select error')

            let tags = []

            let resJSON = {}
            resJSON.email = resWithoutTag.rows[0].email
            resJSON.nickname = resWithoutTag.rows[0].nickname
            resJSON.tags = tags
        
            return res.status(200).send(resJSON)

        } else {
            let tags = []
            for (let i = 0; i < result.rowCount; i++) {
                tags.push({
                    id: result.rows[i].id,
                    name: result.rows[i].name,
                    sortOrder: result.rows[i].sortorder
                })
            }
        
            let resJSON = {}
            resJSON.email = result.rows[0].email
            resJSON.nickname = result.rows[0].nickname
            resJSON.tags = tags
        
            return res.status(200).send(resJSON)
        }
        
    } catch (err) {
        console.log(err)
    }
})

router.put(`/user`, 
body('email').isEmail(), 
body('password').matches(/^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9]).{8,}$/), 
verifyToken, getUidFromToken,
async (req, res) => {
    try {

        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()})
        }

        const user = await client.query(`SELECT email, nickname FROM Users WHERE uid='${req.userUid}'`)

        if (!(user.rows[0].email === req.body.email)) {
            const emailMatch = await client.query(
                `SELECT email FROM Users WHERE email='${req.body.email}';`
            )
            if (emailMatch.rowCount) return res.status(500).send('this email already exists')
        }

        if (!(user.rows[0].nickname === req.body.nickname)) {
            const nicknameMatch = await client.query(
                `SELECT nickname FROM Users WHERE nickname='${req.body.nickname}';`
            )
            if (nicknameMatch.rowCount) return res.status(400).send('this nickname already exists')
        }
       
        const result = await client.query(
            `UPDATE Users set email = '${req.body.email}', password='${bcrypt.hashSync(req.body.password, 10)}', nickname='${req.body.nickname}'
            WHERE uid = '${req.userUid}'`
        )

        return res.status(200).send({email: req.body.email, nickname: req.body.nickname})
    } catch (err) {
        console.log(err)
    }
})


router.delete(`/user`, verifyToken, getUidFromToken, async (req, res) => {
    try {
        const result = client.query(`DELETE FROM Users WHERE uid='${req.userUid}'`)

        res.clearCookie('jwt')
        return res.status(200).send('user was deleted')
    } catch (err) {
        console.log(err)
    }
})

router.post(`/tag`, body('name').isLength({max: 40}), verifyToken, getUidFromToken, async (req, res) => {
    try {

        const nameMatch = await client.query(`
            SELECT name FROM Tags WHERE name='${req.body.name}'
        `)
        if (nameMatch.rowCount) return res.status(400).send('this name already exists')

        const id = await client.query(`SELECT COUNT (*) FROM Tags`)

        const result = client.query(`
            INSERT INTO Tags (id, creator, name, sortorder)
            VALUES ('${+id.rows[0].count + 1}', '${req.userUid}', '${req.body.name}', '${req.body.sortOrder}')
        `)

        return res.status(200).send({id: +id.rows[0].count + 1, name: req.body.name, sortOrder: req.body.sortOrder})
    } catch (err) {
        console.log(err)
    }
})

// router.post(`/tag`, body('name').isLength({max: 40}), verifyToken, getUidFromToken, async (req, res) => {
//     try {
    
//         const nameMatch = await client.query(`
//             SELECT name FROM Tags WHERE name='${req.body.name}'
//         `)
//         if (nameMatch.rowCount) return res.status(500).send('this name already exists')
    
//         const id = await client.query(`SELECT COUNT (*) FROM Tags WHERE creator='${req.userUid}'`)
    
//         const result = client.query(`
//             INSERT INTO Tags (id, creator, name, sortorder)
//             VALUES ('${id.rows[0].count}', '${req.userUid}', '${req.body.name}', '${req.body.sortOrder}')
//         `)
    
//         return res.status(200).send({id: id.rows[0].count, name: req.body.name, sortOrder: req.body.sortOrder})
//     } catch (err) {
//         console.log(err)
//     }
// })

router.get(`/tag/:id`, verifyToken, getUidFromToken, async (req, res) => {
    try {
        
        const result = await client.query(`
            SELECT us.nickname, us.uid, t.name, t.sortorder FROM tags as t LEFT JOIN users us ON us.uid=t.creator WHERE t.id='${req.params.id}' 
        `)
        //AND t.creator='${req.userUid}'
        if (!result.rowCount) return res.status(500).send(`nothing tag with id = ${req.params.id}`)
        
        return res.status(200).send({creator: {nickname: result.rows[0].nickname, uid: result.rows[0].uid}, name: result.rows[0].name, sortOrder: result.rows[0].sortorder})

    } catch (err) {
        console.log(err)
    }
})

router.put(`/tag/:id`, verifyToken, getUidFromToken, async (req, res) => {
    try {

        const result = await client.query(`
            SELECT us.nickname, us.uid, t.name, t.sortorder FROM tags as t LEFT JOIN users us ON us.uid=t.creator WHERE t.id='${req.params.id}'
        `)
        if (!result.rowCount) return res.status(400).send(`nothing tag with id = ${req.params.id}`)

        if (!(result.rows[0].name === req.body.name)) {
            const nameMatch = await client.query(`
                SELECT name FROM Tags WHERE name='${req.body.name}'
            `)
            if (nameMatch.rowCount) return res.status(400).send('this name already exists')
        }

        if (result.rows[0].uid === req.userUid) {
            const update = await client.query(
                `UPDATE Tags set name = '${req.body.name}', sortorder='${req.body.sortOrder}'
                WHERE id='${req.params.id}'`
            )

            return res.status(200).send({creator: {nickname: result.rows[0].nickname, uidd: result.rows[0].uid}, name: req.body.name, sortOrder: req.body.sortOrder})
        } else {
            return res.status(403).send('you did not created this tag')
        }
    } catch (err) {
        console.log(err)
    }
})


router.get(`/user/tag/my`, verifyToken, getUidFromToken, async (req, res) => {
    try {
        const result = await client.query(`
            SELECT id, name, sortorder FROM tags WHERE creator='${req.userUid}'
        `)
        if (!result.rowCount) return res.status(404).send('you have no tags')

        const tags = []
        for (let i = 0; i < result.rowCount; i++) {
            tags.push({
                id: result.rows[i].id,
                name: result.rows[i].name,
                sortOrder: result.rows[i].sortorder
            })
        }

        return res.status(200).send({tags: tags})

    } catch (err) {
        console.log(err)
    }
})

router.post(`/user/tag`, verifyToken, getUidFromToken, async (req, res) => {
    try {
        const result = await client.query(`SELECT id, name, sortorder FROM tags WHERE id in (${req.body.tags})`)
        if (!result.rowCount) return res.status(400).send('No such tags') 
        if (+result.rowCount !== req.body.tags.length) {
            return res.status(400).send('Not all tags found')
        }

        for (let i in req.body.tags) {
            const resultMatch = await client.query(`
                SELECT COUNT(*) FROM usertag WHERE uid='${req.userUid}' AND idtag='${req.body.tags[i]}'
            `)
            if (!+resultMatch.rows[0].count) {
                await client.query(`
                INSERT INTO Usertag(uid, idtag)
                    VALUES ('${req.userUid}', ${req.body.tags[i]})
                `)
            }
        }

        const insertTags = []
        for (let i = 0; i < result.rowCount; i++) {
            insertTags.push({
                id: result.rows[i].id,
                name: result.rows[i].name,
                sortOrder: result.rows[i].sortorder
            })
        }

        return res.status(200).send({tags: insertTags})

    } catch (error) {
        console.log(error)
    }
    
})

router.delete(`/user/tag/:id`, verifyToken, getUidFromToken, async (req, res) => {
    try {
        const result = await client.query(`
            SELECT t.id, t.name, t.sortorder FROM usertag as ut LEFT JOIN tags t ON ut.idtag=t.id WHERE ut.uid='${req.userUid}'
        `)
        if (!result.rowCount) return res.status(400).send(`No such tags`)

        let tags = []
        for (let i = 0; i < result.rowCount; i++) {
            tags.push({
                id: result.rows[i].id,
                name: result.rows[i].name,
                sortOrder: result.rows[i].sortorder
            })
        }
        if (tags.some(e => e.id == req.params.id)) {
            
            await client.query(`
                DELETE FROM usertag WHERE uid='${req.userUid}' AND idtag=${req.params.id}
            `)

            tags = tags.filter(item => item.id != req.params.id)
    
            return res.status(200).send({tags: tags})

        } else {
            return res.status(400).send(`You do not have a tag with id = ${req.params.id}`)
        }

    } catch (err) {
        console.log(err)
    }
})


router.delete(`/tag/:id`, verifyToken, getUidFromToken, async (req, res) => {
    try {
        const result = await client.query(`
            SELECT COUNT(*) FROM Tags WHERE id=${+req.params.id} AND creator='${req.userUid}'
        `)
        if (!+result.rows[0].count) return res.status(400).send(`You did not create a tag with id = ${req.params.id}`)

        await client.query(`
            DELETE FROM usertag WHERE idtag=${+req.params.id};
            DELETE FROM Tags WHERE id=${+req.params.id};
        `)

        return res.status(200).send('Tag was deleted')

    } catch (err) {
        console.log(err)
    }
})

router.get(`/tag`, verifyToken, getUidFromToken, async (req, res) => {
    try {

        let offset = req.query.offset || 1
        if (offset < 1) return res.status(400).send('offset must be >= 1')

        let length = req.query.length || 'ALL'
        if (req.query.length < 1) return res.status(400).send('length must be >= 1')
       
        const result = await client.query(`
            SELECT t.name, t.sortorder, us.nickname, us.uid FROM tags as t LEFT JOIN users us ON us.uid=t.creator LIMIT ${length} OFFSET ${offset}
        `)
        if (!result.rowCount) return res.status(400).send('No tags')
            
        let data = []
        for (let i = 0; i < result.rowCount; i++) {
            data.push({
                сreator: {
                    nickname: result.rows[i].nickname,
                    uid: result.rows[i].uid
                },
                name: result.rows[i].name,
                sortOrder: result.rows[i].sortorder
            })
        }

        if (req.query.sortByOrder === '') {
            data = data.sort((a, b) => a.sortOrder - b.sortOrder)
        }

        if (req.query.sortByName === '') {
            data = data.sort((a, b) => (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0))
        }

        const quantity = await client.query(`
            SELECT COUNT(*) FROM Tags
        `)

        let meta = {
            offset: offset,
            length: length,
            quantity: quantity.rows[0].count
        }

        return res.status(200).send({data: data, meta: meta})

    } catch (err) {
        console.log(err)
    }
})

module.exports = router
