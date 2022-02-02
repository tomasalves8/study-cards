const mysql = require('mysql');
const express = require('express');
var path = require ('path');
const app = express();
const bodyParser = require('body-parser');
var crypto = require('crypto');
var expressSession = require('express-session');
var cookieParser = require('cookie-parser');

const PORT = process.env.PORT || 3000;
const oneWeek = 1000 * 60 * 60 * 24 * 7;

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'study-cards'
});

app.use(expressSession({
    secret: process.env.COOKIESECRET || "secret",
    saveUninitialized:true,
    cookie: { maxAge: oneWeek },
    resave: false 
}));

app.use(function(req, res, next) {
    res.locals.user = req.session.user;
    next();
});

app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); 
app.use(express.static(__dirname + '/public'));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);

app.get('/', (req, res) => {
    res.render('index.ejs');
});

app.get('/classes', (req, res) => {
    var classes = {};
    connection.query('SELECT * FROM class', (err, rows) => {
        if (err) {
            console.log(err);
            res.render('classes.ejs', {classes: {}});
        } else {
            classes = rows;
            res.render('classes.ejs', {classes: classes});
        }
    });
 });

app.get('/login', (req, res) => {
    if(req.session.user){
        res.redirect('/classes');
        return;
    }
    res.render('login.ejs', {error: ""});
});

app.post('/login', (req, res) => {
    let usernameEmail = req.body.email;
    let password = req.body.password;
    if(usernameEmail == "" || password == ""){
        res.render('login.ejs', {error: "Please enter a username and password"});
    }
    let hash = crypto.createHash('sha256').update(password).digest('base64');
    connection.query('SELECT * FROM student WHERE email = ? OR username = ?', [usernameEmail, usernameEmail], (err, results) => {
        if(err) throw err;
        if(results.length > 0){
            if(results[0].password === hash){
                req.session.user = results[0];
                req.session.user.password = null;
                res.redirect('/');
            }
            else{
                res.render('login.ejs', {error: "Incorrect Details!"});
            }
        }else{
            res.render('login.ejs', {error: "Incorrect Details!"});
        }
    });     
});

app.all('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.get('/hashpassword/:password/', (req, res) => {
    let password = req.params.password;
    let hash = crypto.createHash('sha256').update(password).digest('base64');
    res.send(hash);
});

app.listen(PORT, () => { console.log(`Server is running on port ${PORT}`) });