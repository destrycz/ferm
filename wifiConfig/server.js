const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const { exec } = require('child_process');
const wifiConfig = require('./controllers/wifiConfig')
const app = express();

// Serve static files (like your HTML)
app.use(express.static('public'));

// Parse form data (POST requests)
app.use(bodyParser.urlencoded({ extended: true }));

// Home route to show the form
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/views/settings.html');
});

// Route to handle WiFi configuration
app.post('/wifi-config', (req, res) => {
  const { ssid, password } = req.body;

  if (!ssid || !password) {
    return res.send("<h2>SSID and Password are required!</h2>");
  }

    const connected = reconfigureWifi(ssid,password);
    if(connected === false){
      res.send(`<h2>Failed to connect to WiFi: ${stderr}</h2>`);
    }else{
      res.send(`
        <h2>Successfully connected to ${ssid}!</h2>
        <p>You can now access other services.</p>
        <script>
          setTimeout(() => {
            window.location.href = "http://raspberrypi:4000/measurement"; // <-- redirect after 3 sec
          }, 2000);
        </script>
      `);
    }

    


    
})


function reconfigureWifi(ssid, password) {
  const command = `nmcli device wifi connect "${ssid}" password "${password}"`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Connection error: ${error.message}`);
      console.error(`stderr: ${stderr}`);
      return false
    }

    console.log(`Connected: ${stdout}`);
    return true
  });
}


// Start the server on port 80
app.listen(4001, () => {
  console.log('Server is running on http://0.0.0.0');
});
