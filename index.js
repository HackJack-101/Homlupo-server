const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const port = "3002";
const host = "localhost";

const WEREWOLF = 'w';
const PEASANT = 'p';

function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function newGame(id, peasants, werewolves) {
    let numberOfPlayers = peasants + werewolves;
    let playersDistribution = [];
    for (let i = 0; i < peasants; i++) {
        playersDistribution.push(PEASANT);
    }
    for (let i = 0; i < werewolves; i++) {
        playersDistribution.push(WEREWOLF);
    }
    playersDistribution = shuffle(playersDistribution);

    return {
        id,
        players: [],
        numberOfPlayers,
        playersDistribution,
        started: false
    };
}

function newPlayer(id, name, character) {
    return {
        id,
        name,
        character,
        alive: true,
        infested: false,
        charmed: false,
        lover: false
    }
}

app.use(bodyParser.json());

let server = app.listen(port, host, function () {
    console.log(
        server.address().address,
        server.address().port
    );
});

let rooms = [];

app.get('/newGame', (req, res) => {
    let game = newGame(rooms.length, parseInt(req.query.peasants), parseInt(req.query.werewolves));
    rooms.push(game);
    res.json(game);
});

app.get('/enterGame', (req, res) => {
    let currentRoom = rooms[req.query.room];
    if (currentRoom.players.length >= currentRoom.numberOfPlayers) {
        res.status(400).send('Game is full');
    } else {
        let character = currentRoom.playersDistribution[currentRoom.players.length];
        let player = newPlayer(currentRoom.players.length, req.query.name, character);
        currentRoom.players.push(player);
        res.json(player);
    }
});

app.get('/info', (req, res) => {
    res.json(rooms);
});