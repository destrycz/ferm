const express = require('express');
const app = express();
const i2c = require('i2c-bus');
const path = require('path');
const http = require('http');
const LCD = require('raspberrypi-liquid-crystal');
const server = http.createServer(app);
const { Server: SocketServer } = require('socket.io');
const io = new SocketServer(server);
const pg = require('pg')
const { Pool } = pg
     
const pool = new Pool({
  host: 'raspberrypi',
  user: 'timescaledb',
  password: 'password'
})



const fs = require('fs');

var request = require('request-promise'); 
const { time } = require('console');



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
server.listen(8001, () => {
  // 
  console.log('app listen on portt 8000');
  
});

// Function to read sensor data
async function readSensorData() {
    let buffer = Buffer.alloc(TOTAL_BYTES);
    i2cBus.i2cReadSync(I2C_ADDR, TOTAL_BYTES, buffer);

    let sensorValues = [];
    for (let i = 0; i < TOTAL_BYTES; i += 2) {
        let value = buffer.readUInt16BE(i); // Read as big-endian
        sensorValues.push(value);
    }

    let relativeTime = Math.floor((Date.now() - startTime) / 1000); // Time in seconds
    console.log(`Time: ${relativeTime}s, Sensor Values:`, sensorValues);

    collectedData.push([...sensorValues]);
    // Keep only the last 10 readings
    if (collectedData.length > 10) {
        console.log("joooo")
        collectedData.shift();
    }
    await insertReadings(collectedData)
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

// setInterval(insertReadings, 1000)

async function insertReadings(sensorData){
    const timestamp = new Date(Date.now());
    const client = await pool.connect()

    console.log("sensorData sss", sensorData)
    try{ 
        // let timestampedData = [];
        // sensorData.forEach(element => {
        //    timestampedData.push([timestamp, ...element])
        // });
     
        // console.log("ppsdpsd a", timestampedData)

        await client.query("BEGIN")
        // await client.query(`INSERT INTO ferm.measurement_v2(
	    // "timestamp", sec, ethanol1, ethanol2, ethanol3, co1, nh3_1, no2_1, co2, nh3_2, no2_2, co3, nh3_3, no2_3)
	    // VALUES 
        // ($1, 0, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`, timestampedData)
        // await client.query(`
        // INSERT INTO ferm.measurement_v2
        // ("timestamp", sec, ethanol1, ethanol2, ethanol3, co1, nh3_1, no2_1, co2, nh3_2, no2_2, co3, nh3_3, no2_3)
        // VALUES
        // (${timestampedData[0][0]}, 0, ${timestampedData[0][1]}, ${timestampedData[0][2]}, ${timestampedData[0][3]}, ${timestampedData[0][4]}, ${timestampedData[0][5]}, ${timestampedData[0][6]}, ${timestampedData[0][7]}, ${timestampedData[0][8]}, ${timestampedData[0][9]}, ${timestampedData[0][10]}, ${timestampedData[0][11]}, ${timestampedData[0][12]}, ${timestampedData[0][13]}),
        // (${timestampedData[1][0]}, 0, ${timestampedData[1][1]}, ${timestampedData[1][2]}, ${timestampedData[1][3]}, ${timestampedData[1][4]}, ${timestampedData[1][5]}, ${timestampedData[1][6]}, ${timestampedData[1][7]}, ${timestampedData[1][8]}, ${timestampedData[1][9]}, ${timestampedData[1][10]}, ${timestampedData[1][11]}, ${timestampedData[1][12]}, ${timestampedData[1][13]})
        // `)
        await client.query("COMMIT")
        console.log("Readings inserted")
        
    }
    catch(e) {
        console.log(e);
        await client.query("ROLLBACK")
    }
    finally{
        client.release()
    }
}

// Read sensor data every second

 // Turn on backlight
 



 // (I2C Bus 1, I2C Address, Columns, Rows)

// Initialize the LCD


