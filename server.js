const express = require('express');
const app = express();
const path = require('path');



app.use(express.static('public'))


app.get('/', function(req, res){
    res.sendFile(__dirname + 'public/index.html');
  });

app.listen(3000);
console.log('server started\n');

