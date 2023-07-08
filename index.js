const express = require('express');
const fetch = require('node-fetch');
const redis = require('redis');
require('dotenv').config();

const PORT = process.env.PORT || 5000;
//const REDIS_HOST = process.env.REDIS_HOST || 6379;

const client = redis.createClient({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
});

/*
const client = redis.createClient({
    rootNodes: [
        {
            url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
        }
    ]
});
*/

if (client) {
    console.log("connected to redis");
} else {
    console.log("disconnected")
}
const app = express();

//set setRseponse
function setResponse(username, repos) {
    return (`<h1>${username} has ${repos} repository in github</h1>`);
}

//Make github request
async function getRepos (req, res, next) {
    try {
        console.log("Reading data");
        const { username } = req.params;
        const response = await fetch(`https://api.github.com/users/${username}`);
        const data = await response.json();
        const repos = data.public_repos;
        //Set data to redis
        client.set(username, repos, "EX", 3600);
        res.send(setResponse(username, repos));
    } catch (err) {
        console.error(err);
        res.status(500);
    }
}

//Middlewares
function cache(req, res, next) {
    const {username} = req.params;
    client.get(username, (err, data) => {
        if (err) throw err;
        if (data !== null) {
            res.send(setResponse(username, data));
        } else {
            next();
        }
    }) 
}

app.get ("/repos/:username", cache, getRepos);

app.listen(PORT, () => {
    console.log(`Application listening on port ${PORT}`);
});
