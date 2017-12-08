const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const port = "3002";
const host = "localhost";


const CHARACTERS = {
    WEREWOLF: 'w',
    PEASANT: 'p',
    CUPID: 'c',
    WITCH: 'witch',
    GIRL: 'g',
    HUNTER: 'h',
    SEER: 's'
};

function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function newGame(id, body) {
    let playersDistribution = [];
    for(let typeName in CHARACTERS){
        let type = CHARACTERS[typeName];
        if (body.hasOwnProperty(type)) {
            for (let i = 0; i < parseInt(body[type]); i++) {
                playersDistribution.push(type);
            }
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
        night: true
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

app.get('/types', (req, res) => {
    res.json(CHARACTERS);
});

app.post('/newGame', (req, res) => {
    let game = newGame(rooms.length, req.body);
    rooms.push(game);
    res.json(game);
});

app.get('/enterGame', (req, res) => {
    let currentRoom = rooms[req.query.room];
    if (currentRoom.started) {
        res.status(400).send('Game has already started');
    } else if (currentRoom.players.length >= currentRoom.numberOfPlayers) {
        res.status(400).send('Game is full');
    } else {
        let character = currentRoom.playersDistribution[currentRoom.players.length];
        let player = newPlayer(currentRoom.players.length, req.query.name, character);
        currentRoom.players.push(player);
        res.json(player);
    }
});

app.get('/infoRoom', (req, res) => {
    res.json(rooms[req.query.id]);
});

app.get('/info', (req, res) => {
    res.json(rooms);
});

app.get('/startGame', (req, res) => {
    let currentRoom = rooms[req.query.room];
    if (currentRoom.started) {
        res.status(400).send('Game has already started');
    } else if (currentRoom.players.length < currentRoom.numberOfPlayers) {
        res.status(400).send('Game is not full yet');
    } else {
        currentRoom.started = true;
        res.status(200).send('The game is starting');
    }
});

app.get('/getAliveCharacters', (req, res) => {
    let currentRoom = rooms[req.query.room];
    let characters = currentRoom.players.filter((player) => {
        if (req.query.hasOwnProperty('characterType')) {
            return player.character === req.query.characterType && player.alive;
        }
        return player.alive;
    });
    res.json(characters);
});

app.get('/fallInLove', (req, res) => {
    let currentRoom = rooms[req.query.room];
    let playerA = req.query.playerA;
    let playerB = req.query.playerB;
    currentRoom.players[playerA].lover = true;
    currentRoom.players[playerA].loverID = playerB;
    currentRoom.players[playerB].lover = true;
    currentRoom.players[playerB].loverID = playerA;
    res.status(200).send(`${currentRoom.players[playerA].name} and ${currentRoom.players[playerB].name} are in love`);
});

app.get('/kill', (req, res) => {
    let currentRoom = rooms[req.query.room];
    let playerID = req.query.id;
    let deads = [];
    currentRoom.players[playerID].alive = false;
    currentRoom.players[playerID].deathDay = currentRoom.day;
    currentRoom.players[playerID].killer = req.query.killer;
    deads.push(currentRoom.players[playerID]);
    if (currentRoom.players[playerID].lover) {
        let loverID = currentRoom.players[playerID].loverID;
        currentRoom.players[loverID].alive = false;
        currentRoom.players[loverID].deathDay = currentRoom.day;
        currentRoom.players[loverID].killer = CHARACTERS.CUPID;
        deads.push(currentRoom.players[loverID]);
    }
    res.json(deads);
});

app.get('/wakeTown', (req, res) => {
    let currentRoom = rooms[req.query.room];
    currentRoom.day++;
    currentRoom.night = false;
    res.status(200).status('The town is waking up');
});

app.get('/asleepTown', (req, res) => {
    let currentRoom = rooms[req.query.room];
    currentRoom.night = true;
    res.status(200).send('The town falls asleep');
});