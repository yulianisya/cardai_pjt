require('dotenv').config();

var sqlite3 = require('sqlite3').verbose();
const express = require('express');
var http = require('http');
const path = require('path');
var bodyParser = require('body-parser');

const { auth,requiresAuth } = require('express-openid-connect');

const app = express();
var server = http.createServer(app);
var io = require('socket.io')(server);

//app.use(express.static(path.join(__dirname,'./public')));        //this statement won't work in this app

const config = {
  authRequired: false,
  auth0Logout: true,
  secret: process.env.SECRET,
  baseURL: process.env.BASE_URL,
  clientID: process.env.CLIENT_ID,
  issuerBaseURL: process.env.ISSUER_BASE_URL
};

app.use(auth(config));
app.use(bodyParser.urlencoded({extended: false}));



var db = new sqlite3.Database('./database/employees.db');

db.run('CREATE TABLE IF NOT EXISTS emp(id TEXT, name TEXT)');
db.run('CREATE TABLE IF NOT EXISTS msg(name TEXT, tele TEXT, email TEXT, message TEXT)');




/* This code is mentioned in the Auth0 quickstart dashboard

app.get('/', (req,res) => {
	res.send(req.oidc.isAuthenticated() ? 'Logged in' : 'Logged out');
});

*/


//So, we've converted the above code to meet our purpose.
app.get('/', (req,res) => {
	res.sendFile(req.oidc.isAuthenticated() ? path.join(__dirname,'./public/index.html') : path.join(__dirname,'./public/login.html'));		//OK Tested
});


app.get('/about', (req,res) => {
	res.sendFile(path.join(__dirname,'./public/about.html'));
});

app.get('/contact', (req,res) => {
	res.sendFile(path.join(__dirname,'./public/contact.html'));
});

app.get('/add', requiresAuth(), (req,res) => {
	res.sendFile(path.join(__dirname,'./public/addemp.html'));
});

app.get('/modify', requiresAuth(), (req,res) => {
	res.sendFile(path.join(__dirname,'./public/modifyemp.html'));
});

app.get('/view', requiresAuth(), (req,res) => {
	res.sendFile(path.join(__dirname,'./public/viewemp.html'));
});

app.get('/del', requiresAuth(), (req,res) => {
	res.sendFile(path.join(__dirname,'./public/delemp.html'));
});




// Add
app.post('/addemp', requiresAuth(), function(req,res){
  db.serialize(()=>{
    db.run('INSERT INTO emp(id,name) VALUES(?,?)', [req.body.empid, req.body.empname], function(err) {
      if (err) {
        console.log(err.message);
        io.emit('result', 'An error occurred');
      }
      console.log("New employee has been added");
      io.emit('result', 'Employee added successfully');
    });

  });

});


//Update
app.post('/modifyemp', requiresAuth(), function(req,res){
  db.serialize(()=>{
    db.run('UPDATE emp SET name = ? WHERE id = ?', [req.body.empname,req.body.empid], function(err){
      if(err){
        io.emit('result', 'An error occurred');
        console.error(err.message);
      }
      io.emit('result', 'Employee modified successfully');
      console.log("Entry updated successfully");
    });
  });
});


// View
app.post('/viewemp', requiresAuth(), function(req,res){
  db.serialize(()=>{
    db.each('SELECT id ID, name NAME FROM emp WHERE id =?', [req.body.empid], function(err,row){     //db.each() is only one which is funtioning while reading data from the DB
      if(err){
        io.emit('result', 'An error occurred');
        console.error(err.message);
      }
      io.emit('result',` ID: ${row.ID},    Name: ${row.NAME}`);
      console.log("Entry displayed successfully");
    });
  });
});


// Delete
app.post('/delemp', requiresAuth(), function(req,res){
  db.serialize(()=>{
    db.run('DELETE FROM emp WHERE id = ?', req.body.empid, function(err) {
      if (err) {
        io.emit('result', 'An error occurred');
        console.error(err.message);
      }
      io.emit('result', 'Employee has been removed');
      console.log("Entry deleted");
    });
  });

});


app.post('/message', function(req, res){
  db.serialize(()=>{
    db.run('INSERT INTO msg(name,tele,email,message) VALUES(?,?,?,?)', [req.body.name, req.body.telnum, req.body.emailid, req.body.message], function(err) {
      if (err) {
        console.log(err.message);
        io.emit('result', 'An error occurred');
      }
      console.log("Message recorded");
      io.emit('result', 'Message sent successfully');
    });

  });
});




server.listen(3000, function(){
    console.log("server is listening on port: 3000");
});