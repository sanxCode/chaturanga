/**
 * Chatur Chess - A Chess Variant with the Chatur Piece
 * 
 * Chatur Rules:
 * - Moves diagonally forward (1 step, or 2 on first move)
 * - Captures straight forward
 * - Positioned alternately with pawns (columns b, d, f, h)
 */

// Piece types
const PIECES = {
    KING: 'king',
    QUEEN: 'queen',
    ROOK: 'rook',
    BISHOP: 'bishop',
    KNIGHT: 'knight',
    PAWN: 'pawn',
    CHATUR: 'chatur'
};

// Piece symbols
const PIECE_SYMBOLS = {
    white: {
        king: '♔',
        queen: '♕',
        rook: '♖',
        bishop: '♗',
        knight: '♘',
        pawn: '♙',
        chatur: '⛃'  // Using a unique symbol for Chatur
    },
    black: {
        king: '♚',
        queen: '♛',
        rook: '♜',
        bishop: '♝',
        knight: '♞',
        pawn: '♟',
        chatur: '⛂'  // Using a unique symbol for Chatur
    }
};

// Game state
let board = [];
let currentTurn = 'white';
let selectedSquare = null;
let validMoves = [];
let gameOver = false;
let capturedPieces = { white: [], black: [] };
let pendingPromotion = null;

// Initialize the game
function initGame() {
    board = createInitialBoard();
    currentTurn = 'white';
    selectedSquare = null;
    validMoves = [];
    gameOver = false;
    capturedPieces = { white: [], black: [] };
    pendingPromotion = null;
    
    renderBoard();
    updateTurnIndicator();
    hideGameStatus();
    updateCapturedPieces();
}

// Create the initial board setup
function createInitialBoard() {
    const newBoard = Array(8).fill(null).map(() => Array(8).fill(null));
    
    // Set up back rows
    const backRow = [PIECES.ROOK, PIECES.KNIGHT, PIECES.BISHOP, PIECES.QUEEN, 
                     PIECES.KING, PIECES.BISHOP, PIECES.KNIGHT, PIECES.ROOK];
    
    for (let col = 0; col < 8; col++) {
        // Black back row
        newBoard[0][col] = { type: backRow[col], color: 'black', hasMoved: false };
        // White back row
        newBoard[7][col] = { type: backRow[col], color: 'white', hasMoved: false };
    }
    
    // Set up pawns and chaturs (alternating: pawn on a,c,e,g and chatur on b,d,f,h)
    for (let col = 0; col < 8; col++) {
        const pieceType = col % 2 === 0 ? PIECES.PAWN : PIECES.CHATUR;
        // Black pawns/chaturs
        newBoard[1][col] = { type: pieceType, color: 'black', hasMoved: false };
        // White pawns/chaturs
        newBoard[6][col] = { type: pieceType, color: 'white', hasMoved: false };
    }
    
    return newBoard;
}

// Render the chess board
function renderBoard() {
    const boardElement = document.getElementById('chess-board');
    boardElement.innerHTML = '';
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
            square.dataset.row = row;
            square.dataset.col = col;
            
            const piece = board[row][col];
            if (piece) {
                const pieceSpan = document.createElement('span');
                pieceSpan.className = `piece ${piece.type}`;
                pieceSpan.textContent = PIECE_SYMBOLS[piece.color][piece.type];
                square.appendChild(pieceSpan);
            }
            
            // Highlight selected square
            if (selectedSquare && selectedSquare.row === row && selectedSquare.col === col) {
                square.classList.add('selected');
            }
            
            // Highlight valid moves
            if (validMoves.some(m => m.row === row && m.col === col)) {
                if (board[row][col]) {
                    square.classList.add('valid-capture');
                } else {
                    square.classList.add('valid-move');
                }
            }
            
            // Highlight king in check
            if (piece && piece.type === PIECES.KING && isKingInCheck(piece.color)) {
                square.classList.add('check');
            }
            
            square.addEventListener('click', () => handleSquareClick(row, col));
            boardElement.appendChild(square);
        }
    }
}

// Handle square click
function handleSquareClick(row, col) {
    if (gameOver || pendingPromotion) return;
    
    const clickedPiece = board[row][col];
    
    // If a piece is selected and clicking on a valid move
    if (selectedSquare && validMoves.some(m => m.row === row && m.col === col)) {
        makeMove(selectedSquare.row, selectedSquare.col, row, col);
        return;
    }
    
    // If clicking on own piece, select it
    if (clickedPiece && clickedPiece.color === currentTurn) {
        selectedSquare = { row, col };
        validMoves = getValidMoves(row, col);
        renderBoard();
        return;
    }
    
    // Clear selection
    selectedSquare = null;
    validMoves = [];
    renderBoard();
}

// Get all valid moves for a piece
function getValidMoves(row, col) {
    const piece = board[row][col];
    if (!piece) return [];
    
    let moves = [];
    
    switch (piece.type) {
        case PIECES.PAWN:
            moves = getPawnMoves(row, col, piece);
            break;
        case PIECES.CHATUR:
            moves = getChaturMoves(row, col, piece);
            break;
        case PIECES.ROOK:
            moves = getRookMoves(row, col, piece);
            break;
        case PIECES.KNIGHT:
            moves = getKnightMoves(row, col, piece);
            break;
        case PIECES.BISHOP:
            moves = getBishopMoves(row, col, piece);
            break;
        case PIECES.QUEEN:
            moves = getQueenMoves(row, col, piece);
            break;
        case PIECES.KING:
            moves = getKingMoves(row, col, piece);
            break;
    }
    
    // Filter out moves that would put own king in check
    return moves.filter(move => !wouldBeInCheck(row, col, move.row, move.col, piece.color));
}

// Get pawn moves (standard: moves straight, captures diagonal)
function getPawnMoves(row, col, piece) {
    const moves = [];
    const direction = piece.color === 'white' ? -1 : 1;
    const startRow = piece.color === 'white' ? 6 : 1;
    
    // Move forward
    const newRow = row + direction;
    if (isValidSquare(newRow, col) && !board[newRow][col]) {
        moves.push({ row: newRow, col });
        
        // Double move from start
        if (row === startRow) {
            const doubleRow = row + 2 * direction;
            if (!board[doubleRow][col]) {
                moves.push({ row: doubleRow, col });
            }
        }
    }
    
    // Capture diagonally
    for (const dc of [-1, 1]) {
        const captureCol = col + dc;
        if (isValidSquare(newRow, captureCol)) {
            const target = board[newRow][captureCol];
            if (target && target.color !== piece.color) {
                moves.push({ row: newRow, col: captureCol });
            }
        }
    }
    
    return moves;
}

// Get Chatur moves (inverse of pawn: moves diagonal, captures straight)
function getChaturMoves(row, col, piece) {
    const moves = [];
    const direction = piece.color === 'white' ? -1 : 1;
    const startRow = piece.color === 'white' ? 6 : 1;
    
    // Move diagonally forward
    for (const dc of [-1, 1]) {
        const newRow = row + direction;
        const newCol = col + dc;
        
        if (isValidSquare(newRow, newCol) && !board[newRow][newCol]) {
            moves.push({ row: newRow, col: newCol });
            
            // Double diagonal move from start
            if (row === startRow && !piece.hasMoved) {
                const doubleRow = row + 2 * direction;
                const doubleCol = col + 2 * dc;
                if (isValidSquare(doubleRow, doubleCol) && !board[doubleRow][doubleCol]) {
                    moves.push({ row: doubleRow, col: doubleCol });
                }
            }
        }
    }
    
    // Capture straight forward
    const captureRow = row + direction;
    if (isValidSquare(captureRow, col)) {
        const target = board[captureRow][col];
        if (target && target.color !== piece.color) {
            moves.push({ row: captureRow, col });
        }
    }
    
    return moves;
}

// Get rook moves
function getRookMoves(row, col, piece) {
    return getSlidingMoves(row, col, piece, [[0, 1], [0, -1], [1, 0], [-1, 0]]);
}

// Get bishop moves
function getBishopMoves(row, col, piece) {
    return getSlidingMoves(row, col, piece, [[1, 1], [1, -1], [-1, 1], [-1, -1]]);
}

// Get queen moves
function getQueenMoves(row, col, piece) {
    return getSlidingMoves(row, col, piece, [
        [0, 1], [0, -1], [1, 0], [-1, 0],
        [1, 1], [1, -1], [-1, 1], [-1, -1]
    ]);
}

// Get sliding moves (for rook, bishop, queen)
function getSlidingMoves(row, col, piece, directions) {
    const moves = [];
    
    for (const [dr, dc] of directions) {
        let r = row + dr;
        let c = col + dc;
        
        while (isValidSquare(r, c)) {
            const target = board[r][c];
            if (!target) {
                moves.push({ row: r, col: c });
            } else {
                if (target.color !== piece.color) {
                    moves.push({ row: r, col: c });
                }
                break;
            }
            r += dr;
            c += dc;
        }
    }
    
    return moves;
}

// Get knight moves
function getKnightMoves(row, col, piece) {
    const moves = [];
    const offsets = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1]
    ];
    
    for (const [dr, dc] of offsets) {
        const r = row + dr;
        const c = col + dc;
        
        if (isValidSquare(r, c)) {
            const target = board[r][c];
            if (!target || target.color !== piece.color) {
                moves.push({ row: r, col: c });
            }
        }
    }
    
    return moves;
}

// Get king moves
function getKingMoves(row, col, piece) {
    const moves = [];
    const offsets = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1], [0, 1],
        [1, -1], [1, 0], [1, 1]
    ];
    
    for (const [dr, dc] of offsets) {
        const r = row + dr;
        const c = col + dc;
        
        if (isValidSquare(r, c)) {
            const target = board[r][c];
            if (!target || target.color !== piece.color) {
                moves.push({ row: r, col: c });
            }
        }
    }
    
    // Castling
    if (!piece.hasMoved && !isKingInCheck(piece.color)) {
        // Kingside castling
        if (canCastle(row, col, piece.color, 'kingside')) {
            moves.push({ row, col: col + 2, castling: 'kingside' });
        }
        // Queenside castling
        if (canCastle(row, col, piece.color, 'queenside')) {
            moves.push({ row, col: col - 2, castling: 'queenside' });
        }
    }
    
    return moves;
}

// Check if castling is possible
function canCastle(row, col, color, side) {
    const rookCol = side === 'kingside' ? 7 : 0;
    const rook = board[row][rookCol];
    
    if (!rook || rook.type !== PIECES.ROOK || rook.hasMoved) {
        return false;
    }
    
    // Check if squares between king and rook are empty
    const start = side === 'kingside' ? col + 1 : rookCol + 1;
    const end = side === 'kingside' ? rookCol : col;
    
    for (let c = start; c < end; c++) {
        if (board[row][c]) return false;
    }
    
    // Check if king passes through check
    const direction = side === 'kingside' ? 1 : -1;
    for (let i = 0; i <= 2; i++) {
        if (wouldBeInCheck(row, col, row, col + i * direction, color)) {
            return false;
        }
    }
    
    return true;
}

// Check if a square is valid
function isValidSquare(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
}

// Check if king is in check
function isKingInCheck(color) {
    const kingPos = findKing(color);
    if (!kingPos) return false;
    
    return isSquareAttacked(kingPos.row, kingPos.col, color);
}

// Find the king's position
function findKing(color) {
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && piece.type === PIECES.KING && piece.color === color) {
                return { row, col };
            }
        }
    }
    return null;
}

// Check if a square is attacked by the opponent
function isSquareAttacked(row, col, defendingColor) {
    const attackingColor = defendingColor === 'white' ? 'black' : 'white';
    
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece && piece.color === attackingColor) {
                const attacks = getAttackingSquares(r, c, piece);
                if (attacks.some(a => a.row === row && a.col === col)) {
                    return true;
                }
            }
        }
    }
    
    return false;
}

// Get squares a piece attacks (for check detection)
function getAttackingSquares(row, col, piece) {
    switch (piece.type) {
        case PIECES.PAWN:
            return getPawnAttacks(row, col, piece);
        case PIECES.CHATUR:
            return getChaturAttacks(row, col, piece);
        case PIECES.ROOK:
            return getRookMoves(row, col, piece);
        case PIECES.KNIGHT:
            return getKnightMoves(row, col, piece);
        case PIECES.BISHOP:
            return getBishopMoves(row, col, piece);
        case PIECES.QUEEN:
            return getQueenMoves(row, col, piece);
        case PIECES.KING:
            return getKingAttacks(row, col, piece);
        default:
            return [];
    }
}

// Pawn attacks diagonally
function getPawnAttacks(row, col, piece) {
    const attacks = [];
    const direction = piece.color === 'white' ? -1 : 1;
    
    for (const dc of [-1, 1]) {
        const r = row + direction;
        const c = col + dc;
        if (isValidSquare(r, c)) {
            attacks.push({ row: r, col: c });
        }
    }
    
    return attacks;
}

// Chatur attacks straight forward
function getChaturAttacks(row, col, piece) {
    const attacks = [];
    const direction = piece.color === 'white' ? -1 : 1;
    const r = row + direction;
    
    if (isValidSquare(r, col)) {
        attacks.push({ row: r, col });
    }
    
    return attacks;
}

// King attacks adjacent squares
function getKingAttacks(row, col, piece) {
    const attacks = [];
    const offsets = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1], [0, 1],
        [1, -1], [1, 0], [1, 1]
    ];
    
    for (const [dr, dc] of offsets) {
        const r = row + dr;
        const c = col + dc;
        if (isValidSquare(r, c)) {
            attacks.push({ row: r, col: c });
        }
    }
    
    return attacks;
}

// Check if a move would put own king in check
function wouldBeInCheck(fromRow, fromCol, toRow, toCol, color) {
    // Simulate the move
    const originalPiece = board[fromRow][fromCol];
    const capturedPiece = board[toRow][toCol];
    
    board[toRow][toCol] = originalPiece;
    board[fromRow][fromCol] = null;
    
    const inCheck = isKingInCheck(color);
    
    // Undo the move
    board[fromRow][fromCol] = originalPiece;
    board[toRow][toCol] = capturedPiece;
    
    return inCheck;
}

// Make a move
function makeMove(fromRow, fromCol, toRow, toCol) {
    const piece = board[fromRow][fromCol];
    const capturedPiece = board[toRow][toCol];
    const move = validMoves.find(m => m.row === toRow && m.col === toCol);
    
    // Handle capture
    if (capturedPiece) {
        capturedPieces[capturedPiece.color].push(capturedPiece);
    }
    
    // Handle castling
    if (move && move.castling) {
        const rookFromCol = move.castling === 'kingside' ? 7 : 0;
        const rookToCol = move.castling === 'kingside' ? toCol - 1 : toCol + 1;
        board[toRow][rookToCol] = board[toRow][rookFromCol];
        board[toRow][rookFromCol] = null;
        board[toRow][rookToCol].hasMoved = true;
    }
    
    // Make the move
    board[toRow][toCol] = piece;
    board[fromRow][fromCol] = null;
    piece.hasMoved = true;
    
    // Handle pawn/chatur promotion
    const promotionRow = piece.color === 'white' ? 0 : 7;
    if ((piece.type === PIECES.PAWN || piece.type === PIECES.CHATUR) && toRow === promotionRow) {
        showPromotionDialog(toRow, toCol, piece.color);
        return;
    }
    
    finishTurn();
}

// Finish the turn after move is complete
function finishTurn() {
    selectedSquare = null;
    validMoves = [];
    
    // Switch turns
    currentTurn = currentTurn === 'white' ? 'black' : 'white';
    
    // Check for game end conditions
    if (isCheckmate(currentTurn)) {
        gameOver = true;
        const winner = currentTurn === 'white' ? 'Black' : 'White';
        showGameStatus(`Checkmate! ${winner} wins! 👑`, 'checkmate');
    } else if (isStalemate(currentTurn)) {
        gameOver = true;
        showGameStatus('Stalemate! It\'s a draw! 🤝', 'checkmate');
    } else if (isKingInCheck(currentTurn)) {
        showGameStatus('Check! ⚠️', 'check');
    } else {
        hideGameStatus();
    }
    
    renderBoard();
    updateTurnIndicator();
    updateCapturedPieces();
}

// Check for checkmate
function isCheckmate(color) {
    if (!isKingInCheck(color)) return false;
    return !hasAnyLegalMoves(color);
}

// Check for stalemate
function isStalemate(color) {
    if (isKingInCheck(color)) return false;
    return !hasAnyLegalMoves(color);
}

// Check if player has any legal moves
function hasAnyLegalMoves(color) {
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && piece.color === color) {
                const moves = getValidMoves(row, col);
                if (moves.length > 0) return true;
            }
        }
    }
    return false;
}

// Show promotion dialog
function showPromotionDialog(row, col, color) {
    pendingPromotion = { row, col, color };
    
    const modal = document.getElementById('promotion-modal');
    const options = document.getElementById('promotion-options');
    options.innerHTML = '';
    
    const promotionPieces = [PIECES.QUEEN, PIECES.ROOK, PIECES.BISHOP, PIECES.KNIGHT];
    
    for (const pieceType of promotionPieces) {
        const btn = document.createElement('button');
        btn.className = 'promotion-option';
        btn.textContent = PIECE_SYMBOLS[color][pieceType];
        btn.onclick = () => promotePiece(pieceType);
        options.appendChild(btn);
    }
    
    modal.classList.add('active');
}

// Promote the piece
function promotePiece(pieceType) {
    const { row, col, color } = pendingPromotion;
    board[row][col] = { type: pieceType, color, hasMoved: true };
    
    document.getElementById('promotion-modal').classList.remove('active');
    pendingPromotion = null;
    
    finishTurn();
}

// Update turn indicator
function updateTurnIndicator() {
    const indicator = document.getElementById('turn-indicator');
    const turnText = indicator.querySelector('.turn-text');
    turnText.textContent = `${currentTurn.charAt(0).toUpperCase() + currentTurn.slice(1)}'s Turn`;
    
    // Update player panel active state
    document.querySelectorAll('.player-panel').forEach(panel => panel.classList.remove('active'));
    document.querySelector(`.player-${currentTurn}`).classList.add('active');
}

// Update captured pieces display
function updateCapturedPieces() {
    for (const color of ['white', 'black']) {
        const container = document.getElementById(`captured-${color}`);
        container.innerHTML = capturedPieces[color]
            .map(p => PIECE_SYMBOLS[color][p.type])
            .join('');
    }
}

// Show game status message
function showGameStatus(message, type) {
    const status = document.getElementById('game-status');
    status.textContent = message;
    status.className = `game-status visible ${type}`;
}

// Hide game status message
function hideGameStatus() {
    const status = document.getElementById('game-status');
    status.className = 'game-status';
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    initGame();
    
    document.getElementById('new-game').addEventListener('click', initGame);
    
    document.getElementById('show-rules').addEventListener('click', () => {
        document.getElementById('rules-modal').classList.add('active');
    });
    
    document.getElementById('close-rules').addEventListener('click', () => {
        document.getElementById('rules-modal').classList.remove('active');
    });
    
    document.getElementById('rules-modal').addEventListener('click', (e) => {
        if (e.target.id === 'rules-modal') {
            document.getElementById('rules-modal').classList.remove('active');
        }
    });
});
