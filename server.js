const express = require('express');
const app = express();
const i2c = require('i2c-bus');
const path = require('path');
const http = require('http');
const LCD = require('raspberrypi-liquid-crystal');
const server = http.createServer(app);
const { Server: SocketServer } = require('socket.io');
const io = new SocketServer(server);


const fs = require('fs');

var request = require('request-promise'); 



const I2C_ADDR = 0x09; // ESP32's I2C address
const I2C_ADDR_LCD = 0x27;
const SENSOR_COUNT = 12;
const BYTES_PER_SENSOR = 2;
const TOTAL_BYTES = SENSOR_COUNT * BYTES_PER_SENSOR;
const CSV_FILE = 'sensor_data.csv';


let collectedData = []; // Store 10 readings
let startTime = Date.now(); // Track start time



const i2cBus = i2c.openSync(1);

const lcd = new LCD(1, I2C_ADDR_LCD, 16, 2);
lcd.beginSync();
// Print first message
lcd.printLineSync(0, "Device Ready!");


// Clear after 5 seconds
setTimeout(() => {
  lcd.clearSync();
  
}, 5000);

 




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
server.listen(8000, () => {
  // 
  console.log('app listen on portt 8000');
  
});







// Function to read sensor data
function readSensorData() {
    let buffer = Buffer.alloc(TOTAL_BYTES);
    i2cBus.i2cReadSync(I2C_ADDR, TOTAL_BYTES, buffer);

    let sensorValues = [];
    for (let i = 0; i < TOTAL_BYTES; i += 2) {
        let value = buffer.readUInt16BE(i); // Read as big-endian
        sensorValues.push(value);
    }

    let relativeTime = Math.floor((Date.now() - startTime) / 1000); // Time in seconds
    console.log(`Time: ${relativeTime}s, Sensor Values:`, sensorValues);

    collectedData.push([relativeTime, ...sensorValues]);

    // Keep only the last 10 readings
    if (collectedData.length > 10) {
        collectedData.shift();
    }
}

// Function to save data to CSV every 10 seconds
function saveToCSV() {
    if (collectedData.length === 0) return;

    const fileExists = fs.existsSync(CSV_FILE);

    // Create header if the file does not exist
    if (!fileExists) {
        const headers = ["seconds", ...Array.from({ length: SENSOR_COUNT }, (_, i) => `sensor_${i + 1}`)];
        fs.writeFileSync(CSV_FILE, headers.join(",") + "\n");
    }

    // Append all collected rows
    const rows = collectedData.map(values => values.join(",")).join("\n") + "\n";

    fs.appendFileSync(CSV_FILE, rows);
    console.log("Saved 10 readings to CSV.");

    collectedData = []; // Clear collected data after saving
}

// Read sensor data every second
setInterval(readSensorData, 1000);

// Save data every 10 seconds
setInterval(saveToCSV, 10000);


// Read sensor data every second

 // Turn on backlight
 



 // (I2C Bus 1, I2C Address, Columns, Rows)

// Initialize the LCD


