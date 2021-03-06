// host of the server
var host = 'localhost';
var nodejs_port = '4000';

var game, board, socket, serverGame;
var usersOnline = [];
var checkLogout = '';
var checkDraw = '';

$(function () {
    socket = io(host + ':' + nodejs_port);

    //Menu
    username = $('#username').val();
    socket.emit('login', username);
    console.log('user ', username);
    $('#page-lobby').show();
    $('#page-game').hide();
    $('#page-notification').hide();

    $('#game-quit').on('click', function () {
        if (checkLogout === '') {
            socket.emit('quit', { username: username, gameId: serverGame.Id });
        }
        else {
            checkLogout = '';
        }
        socket.emit('login', username);
        $('#opponentname').html('');
        historyElement.html('');
        $('#page-lobby').show();
        $('#page-game').hide();
        $('#page-notification').hide();
        updateUserList();
        //window.location.reload();
    });

    var addUsers = function (msg) {
        usersOnline.push(msg);
        updateUserList();
    };

    var removeUser = function (msg) {
        usersOnline = [...new Set(usersOnline)];
        for (var i = 0; i < usersOnline.length; i++) {
            if (usersOnline[i] === msg) {
                usersOnline.splice(i, 1);
            }
        }
    };

    var updateUserList = function () {
        removeUser(username);
        document.getElementById('userList').innerHTML = '';
        usersOnline.forEach(function (user) {
            $('#userList').append($('<button>')
                .text(user)
                .on('click', function () {
                    socket.emit('invite', user);
                }));
        });
    };


    //login
    socket.on('login', function (msg) {
        usersOnline = msg;
        updateUserList();
    });

    socket.on('joinlobby', function (msg) {
        addUsers(msg);
    });

    //when choice an oppenent
    socket.on('leavelobby', function (msg) {
        removeUser(msg);
        updateUserList();
    });

    //start game with color user
    socket.on('joingame', function (msg) {
        initGame(msg);
        updateStatus();
        $('#opponentname').html(msg.oppDict[username]);
        $('#page-lobby').hide();
        $('#page-game').show();
        $('#page-notification').show();
    });

    //draw board with new move
    socket.on('move', function (msg) {
        if (msg.gameId === serverGame.Id) {
            game.move(msg.Move);
            board.position(game.fen());
            updateMoveHistory(msg.Move);
            updateStatus();
        }
    });

    //logout
    socket.on('logout', function (msg) {
        if (msg.username !== username) {
            if (serverGame != null) {
                if (msg.gameId === serverGame.Id) {
                    checkLogout = msg.username;
                    updateStatus();
                    socket.disconnect();

                }
            }
            removeUser(msg.username);
            updateUserList();
        }
    });

    socket.on('quit', function (msg) {
        if (msg.gameId === serverGame.Id) {
            checkLogout = msg.username;
            updateStatus();
            removeUser(msg.username);
            updateUserList();
        }
    });
});


var initGame = function (serverGameState) {
    serverGame = serverGameState;

    var cfg = {
        draggable: true,
        position: 'start',
        orientation: serverGame.setColorUser[username],
        onDragStart: onDragStart,
        onDrop: onDrop,
        onMouseoutSquare: onMouseoutSquare,
        onMouseoverSquare: onMouseoverSquare,
        onSnapEnd: onSnapEnd
    };
    game = new Chess();
    board = new ChessBoard('board', cfg);
    statusEl = $('#status');
    historyElement = $('#move-history');
    updateStatus();
}

var onDragStart = function (source, piece, position, orientation) {
    if (game.game_over() === true ||
        (game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (game.turn() === 'b' && piece.search(/^w/) !== -1) ||
        (game.turn() !== serverGame.setColorUser[username][0]) ||
        (checkLogout !== '') || (checkDraw !== '')) {
        return false;
    }
};

//show status
var updateStatus = function () {
    if (checkLogout === '') {
        var status = '';

        var moveUser = serverGame.setColorUser['white'];
        if (game.turn() === 'b') {
            moveUser = serverGame.setColorUser['black'];
        }

        if (game.in_checkmate() === true) {
            status = 'Game over, ' + moveUser + ' is in checkmate.';
            var winner = moveUser !== username ? username : moveUser;
            endGame(winner, '');
        }

        else if (game.in_draw() === true) {
            status = 'Game over, drawn position';
            checkDraw = moveUser;
            endGame('draw', 'drawn position');
        }

        else {
            status = moveUser + ' to move';
            if (game.in_check() === true) {
                status += ', ' + moveUser + ' is in check';
            }
        }
    }
    else {
        var status = 'Game over, you win,  ' + checkLogout + ' is quitted.';
        var winner = checkLogout !== username ? username : checkLogout;
        endGame(winner, checkLogout + ' quit');
    }
    statusEl.html(status);
};

var updateMoveHistory = function (lastMove) {
    historyElement.append('<tr>' + '<td>' + lastMove['from'] + '</td>' + '<td>' + lastMove['to'] + '</td>' + '<td>' + lastMove['piece'] + '</td>' + '</tr>');
};

var onDrop = function (source, target) {

    removeGreySquares();

    // see if the move is legal
    var move = game.move({
        from: source,
        to: target,
        promotion: 'q' // NOTE: always promote to a queen for example simplicity
    });

    // illegal move
    if (move === null) {
        return 'snapback';
    } else {
        socket.emit('move', { Move: move, gameId: serverGame.Id });
        updateMoveHistory(move);
    }
    updateStatus();
};

// update the board position after the piece snap 
// for castling, en passant, pawn promotion
var onSnapEnd = function () {
    board.position(game.fen());
};

var onMouseoverSquare = function (square, piece) {
    if ((game.turn() === serverGame.setColorUser[username][0]) &&
        (checkLogout === '') && (checkDraw === '')) {
        var moves = game.moves({
            square: square,
            verbose: true
        });

        if (moves.length === 0) return;

        greySquare(square);

        for (var i = 0; i < moves.length; i++) {
            greySquare(moves[i].to);
        }
    }
};

var onMouseoutSquare = function (square, piece) {
    removeGreySquares();
};

var removeGreySquares = function () {
    $('#board .square-55d63').css('background', '');
};

var greySquare = function (square) {
    var squareEl = $('#board .square-' + square);

    var background = '#a9a9a9';
    if (squareEl.hasClass('black-3c85d') === true) {
        background = '#696969';
    }

    squareEl.css('background', background);
};

var endGame = function (winner, note) {
    var historyGame = game.history({ verbose: true });
    var text = "";
    for (var i = 0; i < historyGame.length; i++) {
        text += moveToString(historyGame[i]) + ", ";
    }
    if (winner === username || winner === 'draw' && checkDraw === username) {
        console.log(winner + ' send');
        socket.emit('endgame', { 'winner': winner, 'history': text, note: note, username: username });
        checkDraw = '';
    }
}

var moveToString = function (move) {
    return (move.captured ? move.to + '-x,' : '') + move.from + '-' + move.to;
}