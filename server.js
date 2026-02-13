const http = require('http');
const { Server } = require('socket.io');
const express = require('express');
const session = require('express-session');
const router = require('./router');
const db = require('./database');
const app = express();

const server = http.createServer(app);
const io = new Server(server);

app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}))

app.set('view engine', 'ejs');
app.set('view options', { root: __dirname + '/views' });
app.use(express.static('public'));
app.use(express.static(__dirname + "/node_modules/bootstrap/dist/css/"));
app.use(express.static(__dirname + "/node_modules/bootstrap-icons/font/"));
app.use(express.static(__dirname + "/node_modules/jquery/dist/"));
app.use(express.static(__dirname + '/node_modules/socket.io/client-dist/'));
app.use(express.urlencoded({extended: true}));


app.use('/', router);

server.listen(3000, function () {
	console.log('Server is running on port 3000');
});

const onlineUsers = new Map(); 

io.on('connection', (socket) => {
	console.log('New socket connected:', socket.id);

	socket.on('disconnect', () => {
		console.log('Socket disconnected:', socket.id);
	});

    socket.on("register", (userId) => {
        onlineUsers.set(userId, socket.id);
        console.log("User registered:", userId, socket.id);
    });

    socket.on("private_message", (private_message) => {
        console.log('Private message: ', private_message);
        
        const { conversationId, toUserId, fromUserId, message } = private_message;
        const targetSocketId = onlineUsers.get(toUserId);

        if (targetSocketId) {
            io.to(targetSocketId).emit("receive_message", {
                conversationId,
                fromUserId,
                message
            });
        }
    });
});

