var game, board, socket, playerColor;

window.onload = function () {
    socket = io();

    //start game with color user
    socket.on('join', function (msg) {
        playerColor = msg.color;
        initGame();
        updateStatus();
    });

    //draw board with new move
    socket.on('move', function (msg) {
        game.move(msg);
        board.position(game.fen());
        updateMoveHistory(msg);
        updateStatus();
    });
};


var initGame = function () {

    var cfg = {
        draggable: true,
        position: 'start',
        orientation: playerColor,
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
        (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
        return false;
    }
};

//show status
var updateStatus = function() {
    var status = '';
  
    var moveColor = 'White';
    if (game.turn() === 'b') {
      moveColor = 'Black';
    }
  
    if (game.in_checkmate() === true) {
      status = 'Game over, ' + moveColor + ' is in checkmate.';
    }
  
    else if (game.in_draw() === true) {
      status = 'Game over, drawn position';
    }
  
    else {
      status = moveColor + ' to move';
  

      if (game.in_check() === true) {
        status += ', ' + moveColor + ' is in check';
      }
    }
    
    statusEl.html(status); 
};  

var updateMoveHistory = function (lastMove) {
    historyElement.append('<tr>'+'<td>'+lastMove['from']+'</td>'+'<td>'+lastMove['to']+'</td>'+'<td>'+lastMove['piece']+'</td>'+'</tr>');
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
        socket.emit('move', move);
        updateMoveHistory(move);
    }
    updateStatus();
};

// update the board position after the piece snap 
// for castling, en passant, pawn promotion
var onSnapEnd = function () {
    board.position(game.fen());
};

var onMouseoverSquare = function(square, piece) {
    var moves = game.moves({
        square: square,
        verbose: true
    });

    if (moves.length === 0) return;

    greySquare(square);

    for (var i = 0; i < moves.length; i++) {
        greySquare(moves[i].to);
    }
};

var onMouseoutSquare = function(square, piece) {
    removeGreySquares();
};

var removeGreySquares = function() {
    $('#board .square-55d63').css('background', '');
};

var greySquare = function(square) {
    var squareEl = $('#board .square-' + square);

    var background = '#a9a9a9';
    if (squareEl.hasClass('black-3c85d') === true) {
        background = '#696969';
    }

    squareEl.css('background', background);
};