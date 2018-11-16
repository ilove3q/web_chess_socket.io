var http = require('http').createServer().listen(4000);
var io = require('socket.io')(http);

// host of the server
var host = 'localhost';
var port = '8000';

//set users
var games = [];
var waitingUsers = [];


io.on('connection', function (socket) {

    //set user
    socket.username = 'user' + Math.floor((Math.random()*100)+1);
    console.log (socket.username + ' connect');

    //set 2 user play together --> show board game
    if (waitingUsers.length > 0){
        var opponent = waitingUsers.pop();
        var game = {
            Id: Math.floor((Math.random()*100)+1),
            player: [opponent.username, socket.username]
        };

        socket.gameId = game.Id;
        opponent.gameId = game.Id;

        console.log('starting game: '+game.Id);
        opponent.emit('join', {game:game, color : 'white'});
        socket.emit('join', {game:game, color: 'black'});

        games.push(game);
    }
    //1 user --> waiting
    else{
        console.log(socket.username + ' joing lobby');
        waitingUsers.push(socket);
    }

    //send the move of pice
    socket.on('move', function (msg) {
        socket.broadcast.emit('move', msg);
    });

});