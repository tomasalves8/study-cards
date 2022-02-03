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

function isLoggedIn(req){
    return req.session.user;
}

app.get('/', (req, res) => {
    res.render('index.ejs');
});

app.get('/classes', (req, res) => {
    if(!isLoggedIn(req)){
        res.redirect("/");
        return;
    }
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
    if(isLoggedIn(req)){
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

app.get('/class/:classID', (req, res) => {
    if(!isLoggedIn(req)){
        res.redirect("/");
        return;
    }
    let classID = req.params.classID;
    connection.query('SELECT * FROM class WHERE idClass = ?', [classID], (err, results) => {
        if(err) throw err;
        if(results.length > 0){
            classVar = results[0];
            connection.query('SELECT * FROM card WHERE idClass = ?', [classID], (err, results) => {
                if(err) throw err;
                if(results.length > 0){
                    classVar.cards = results;
                }else{
                    classVar.cards = {};
                }
                res.render('class.ejs', {classVar: classVar});
            });
        }else{
            res.redirect('/');
        }
    });
});

app.post('/class/:classID', (req, res) => {
    if(!isLoggedIn(req)){
        res.redirect("/");
        return;
    }
    let classID = req.params.classID;
    let question = req.body.question;
    let answer = req.body.answer;
    // insert into card
    connection.query('INSERT INTO card (idClass, question, answer) VALUES (?, ?, ?)', [classID, question, answer], (err, results) => {
        if(err) throw err;
        res.redirect('/class/' + classID);
    });
});

app.get('/class/:classID/play', (req, res) => {
    if(!isLoggedIn(req)){
        res.redirect("/");
        return;
    }
    const numOfCards = 10;
    let classID = req.params.classID;
    connection.query('SELECT * FROM card WHERE idClass = ? ORDER BY RAND() LIMIT ?', [classID,numOfCards], (err, results) => {
        if(err) throw err;
        if(results.length > 0){
            res.render('play.ejs', {cards: results});
        }else{
            res.redirect('/class/' + classID);
        }
    });
});

app.get('/deleteCard/:cardID/', (req, res) => {
    if(!isLoggedIn(req)){
        res.redirect("/");
        return;
    }
    let cardID = req.params.cardID;
    // get classID
    connection.query('SELECT idClass FROM card WHERE idCard = ?', [cardID], (err, results) => {
        if(err) throw err;
        if(results.length > 0){
            let classID = results[0].idClass;
            connection.query('DELETE FROM card WHERE idCard = ?', [cardID], (err, results) => {
                if(err) throw err;
                res.redirect('/class/' + classID);
            });
        }else{
            res.redirect('/class/' + classID);
        }
    });   
});


app.get('/hashpassword/:password/', (req, res) => {
    let password = req.params.password;
    let hash = crypto.createHash('sha256').update(password).digest('base64');
    res.send(hash);
});

app.listen(PORT, () => { console.log(`Server is running on port ${PORT}`) });