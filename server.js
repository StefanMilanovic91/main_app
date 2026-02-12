const express = require('express');
const session = require('express-session');
const router = require('./router');
const db = require('./database');
const app = express();

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
app.use(express.urlencoded({extended: true}));
app.use(express.json());

app.use('/', router);


app.listen(3000, function(){
    console.log('Server is running on port 3000');
});

