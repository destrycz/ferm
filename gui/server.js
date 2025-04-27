const express = require('express');
const webSocket = require('socket.io');
const path = require('path');
const http = require('http');
const pgController = require('./controllers/postgre')
const rController = require('./controllers/redis')

const app = express();
const server = http.createServer(app);
const port = 4000;
app.use(express.json());
const io = webSocket(server);
let measurementCreated = false;
let measurementTitle = {};


app.post('/create-measurement',async (req, res) => {
    
    measurementTitle = req.body.measurementTitle;

    let measurementDescription = req.body.measurementDescription
    console.log("Measurement description: ",measurementDescription)
    console.log("Measurement Created:" ,measurementTitle);
    measurementCreated = true;
    try{
    
    const id = await pgController.createMeasurement(measurementTitle,measurementDescription)
    rController.sendMessageToDataHandling({id:id.toString(),run:true})
   
    } catch (err) {
        console.error('Error inserting data:', err);
    }


    res.json({ message: measurementTitle,
                measurementDescription
      });
});

app.post('/finish-measurement',async (req, res) => {
   
    const state =  await pgController.getLatestMeasurementDetail()
    const response = await pgController.finishMeasurement(state.id)
    rController.sendMessageToDataHandling({response,run:false})
    
    console.log("Measurement reset");

    res.json({ success: true, message: "Measurement finished" });
});


app.post('/save-desc',async(req,res)=>{
    let desc = req.body.measurementDescription
    console.log(desc)
    const response = await pgController.saveDescription(desc)
    console.log("description saved to measuremen id ",response)
    res.json({success:true,message:"Description saved"})
})


app.use(express.urlencoded({ extended: true }));


app.use(express.static('./public'));

app.get('/', (req, res) => {
    const filePath = './public/views/index.html'
    const file = path.join(__dirname, filePath);
    res.sendFile(file);
    
});
app.get('/measurement', (req, res) => {
    const filePath = './public/views/measurement.html'
    const file = path.join(__dirname, filePath);
    res.sendFile(file);
    
});
// app.get('/settings', (req, res) => {
//     const filePath = './public/views/settings.html'
//     const file = path.join(__dirname, filePath);
//     res.sendFile(file);
    
// });

app.get('/socket.io/socket.io.js', (req, res) => {
    res.sendFile(path.join(__dirname, '/node_modules/socket.io-client/dist/socket.io.js'));
});

app.get('/measurement/state',async (req, res) => {

   const state = await pgController.getLatestMeasurementDetail()
   console.log(state)
     
    res.json(state);
});

app.get('/history', async (req, res) => {
    
        const filePath = './public/views/history.html';
        const file = path.join(__dirname, filePath);

        res.sendFile(file);
   
});

app.get('/getHistory',async(req,res)=>{
    console.log("historyyy")
    try{
    const historyData = await pgController.getHistory()
    res.json(historyData)
    }
    catch(err){
        console.error("Error fetching history data: ", err)
        res.status(500).send("Error fetching history data")
    }

})
app.delete('/deleteMeasurement/:id', async (req, res) => {
    const { id } = req.params;

    try {
        
        const result = await pgController.deleteMeasurement(id); // Calling the delete function

        if (result) {
            // If result is true (successful deletion)
            res.status(200).json({ message: 'Measurement deleted successfully' });
        } else {
            // If result is false or something failed inside the function
            res.status(404).json({ message: `Measurement with ID ${id} not found` });
        }
    } catch (err) {
        // Handle errors (e.g., database issues)
        console.error('Error deleting measurement:', err);
        res.status(500).json({ message: 'Error deleting measurement' });
    }
});

io.on('connection', (socket) => {
    console.log("New user connected.");
    socket.on('measurement-latest-values', async (payload, callback) => {
        try {
            const data = await rController.getLatestData();
            if (!data) {
                console.error("No data returned from getLatestData");
                callback({ error: "No data" }); 
                return;
            }
            
            callback(data); 
        } catch (err) {
            console.log("Error getting data: ", err);
            callback({ error: "Error getting data" });
        }
    });
});






server.listen(port, () => {
    console.log("Server listening on port ", port)
    
})