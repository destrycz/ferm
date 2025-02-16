const express = require('express');
const app = express();

const path = require('path');
const http = require('http');
const server = http.createServer(app);
const { Server: SocketServer } = require('socket.io');
const io = new SocketServer(server);
const port = 3100;

const fs = require('fs');

var request = require('request-promise'); 

async function arraysum() { 

	// This variable contains the data 
	// you want to send 
	var data = { 
		array: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] 
	} 

	var options = { 
		method: 'POST', 

		// http:flaskserverurl:port/route 
		uri: 'http://127.0.0.1:5000/arraysum', 
		body: data, 

		// Automatically stringifies 
		// the body to JSON 
		json: true
	}; 

	var sendrequest = await request(options) 

		// The parsedBody contains the data 
		// sent back from the Flask server 
		.then(function (parsedBody) { 
			console.log(parsedBody); 
			
			// You can do something with 
			// returned data 
			let result; 
			result = parsedBody['result']; 
			console.log("Sum of Array from Python: ", result); 
		}) 
		.catch(function (err) { 
			console.log(err); 
		}); 
} 

arraysum(); 

app.use(express.static('./public'));

app.get('/socket.io/socket.io.js', (req, res) => {
    res.sendFile(path.join(__dirname, './node_modules/socket.io-client/dist/socket.io.js'));
});

app.get('/', (req, res) => {
    const filePath = './public/views/index.html'
    const file = path.join(__dirname, filePath);
    res.sendFile(file);
    // res.status(200);
});
server.listen(port, () => {
  // 
  console.log('app listen on portt', port);
  
});