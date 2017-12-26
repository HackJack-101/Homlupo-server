const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const port = "3002";
const host = "localhost";

const WebSocket = require('ws');
const wss = new WebSocket.Server({port: 3003});


const CHARACTERS = {
    WEREWOLF: 'werewolf',
    VILLAGER: 'villager',
    CUPID: 'cupid',
    WITCH: 'witch',
    GIRL: 'littleGirl',
    HUNTER: 'hunter',
    SEER: 'seer'
};

function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function newGame(id, characters) {
    let playersDistribution = [];
    for (let character in characters) {
        for (let i = 0; i < characters[character]; i++) {
            playersDistribution.push(character);
        }
    }
    playersDistribution = shuffle(playersDistribution);

    return {
        id,
        players: [],
        numberOfPlayers: playersDistribution.length,
        playersDistribution,
        started: false,
        day: 0,
        night: true,
        currentNightDeaths: []
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
        lover: false,
        loverID: null,
        deathDay: null,
        killer: null
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
let gameMasters = {};

app.get('/types', (req, res) => {
    res.json(CHARACTERS);
});

app.post('/game', (req, res) => {
    let game = newGame(rooms.length, req.body.characters);
    rooms.push(game);
    res.json(game);
});

app.post('/game/:room', (req, res) => {
    let id = req.params.room;
    let currentRoom = rooms[id];
    if (currentRoom.started) {
        res.status(400).send('Game has already started');
    } else if (currentRoom.players.length >= currentRoom.numberOfPlayers) {
        res.status(400).send('Game is full');
    } else {
        let character = currentRoom.playersDistribution[currentRoom.players.length];
        let player = newPlayer(currentRoom.players.length, req.body.name, character);
        currentRoom.players.push(player);
        if (gameMasters.hasOwnProperty('room' + id)) {
            let gameMaster = gameMasters['room' + id];
            gameMaster.send(JSON.stringify({room: currentRoom}));
        }
        res.json(player);
    }
});

app.get('/room/:room', (req, res) => {
    res.json(rooms[req.params.room]);
});

app.get('/info', (req, res) => {
    res.json(rooms);
});

app.get('/reset', (req, res) => {
    rooms = [];
    res.status(200).send('All games deleted');
});

app.get('/game/start/:room', (req, res) => {
    let currentRoom = rooms[req.params.room];
    if (currentRoom.started) {
        res.status(400).send('Game has already started');
    } else if (currentRoom.players.length < currentRoom.numberOfPlayers) {
        res.status(400).send('Game is not full yet');
    } else {
        currentRoom.started = true;
        res.status(200).send('The game is starting');
    }
});

app.get('/game/aliveCharacters/:room', (req, res) => {
    let currentRoom = rooms[req.params.room];
    let characters = currentRoom.players.filter((player) => {
        if (req.query.hasOwnProperty('characterType')) {
            return player.character === req.query.characterType && player.alive;
        }
        return player.alive;
    });
    res.json(characters);
});

app.get('/game/fallInLove/:room', (req, res) => {
    let currentRoom = rooms[req.params.room];
    let playerA = req.query.playerA;
    let playerB = req.query.playerB;
    currentRoom.players[playerA].lover = true;
    currentRoom.players[playerA].loverID = playerB;
    currentRoom.players[playerB].lover = true;
    currentRoom.players[playerB].loverID = playerA;
    res.status(200).send(`${currentRoom.players[playerA].name} and ${currentRoom.players[playerB].name} are in love`);
});

app.get('/game/kill/:room', (req, res) => {
    let currentRoom = rooms[req.params.room];
    let playerID = req.query.id;
    currentRoom.players[playerID].alive = false;
    currentRoom.players[playerID].deathDay = currentRoom.day;
    currentRoom.players[playerID].killer = req.query.killer;
    currentRoom.currentNightDeaths.push(currentRoom.players[playerID]);
    // if (currentRoom.players[playerID].lover) {
    //     let loverID = currentRoom.players[playerID].loverID;
    //     currentRoom.players[loverID].alive = false;
    //     currentRoom.players[loverID].deathDay = currentRoom.day;
    //     currentRoom.players[loverID].killer = CHARACTERS.CUPID;
    //     deads.push(currentRoom.players[loverID]);
    // }
    // res.json(deads);
});

app.get('/game/getCurrentNightDeaths/:room', (req, res) => {
    let currentRoom = rooms[req.params.room];
    res.json(currentRoom.currentNightDeaths);
});


app.get('/game/wakeTown/:room', (req, res) => {
    let currentRoom = rooms[req.params.room];
    currentRoom.day++;
    currentRoom.night = false;
    res.status(200).status('The town is waking up');
});

app.get('/game/asleepTown/:room', (req, res) => {
    let currentRoom = rooms[req.params.room];
    currentRoom.night = true;
    res.status(200).send('The town falls asleep');
});

app.get('/', (req, res) => {
    res.send('Hello world');
});


app.get('/ping/:room', (req, res) => {
    let id = req.params.room;
    if (gameMasters.hasOwnProperty('room' + id)) {
        let gameMaster = gameMasters['room' + id];
        gameMaster.send('pong');
    }
    res.send('ping sent');
});

wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(message) {
        if (message.substr(0, 5) === 'room:') {
            let id = parseInt(message.substr(5));
            gameMasters['room' + id] = ws;
        } else if (message.substr(0, 7) === 'unroom:') {
            let id = parseInt(message.substr(7));
            delete gameMasters['room' + id];
        }
    });
    ws.send('connected');
});