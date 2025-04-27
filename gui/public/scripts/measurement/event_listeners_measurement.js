const socket = io();
let trig = false;
let state;
let id;
const measTitleBtn = document.getElementById('measTitleBtn');
const measurementTitle = document.getElementById('measurementTitle');
const stopMeasurementBtn = document.getElementById('stopMeasurementBtn');
const grafanaBtn = document.getElementById('grafanaBtn');
const pgadminBtn = document.getElementById('pgadminBtn');
const sensors = document.getElementsByClassName('sensor');
const description = document.getElementById('description')
const descLabel = document.getElementById('descLabel');
const descText = document.getElementById('descText');
const grafanaiframe  = document.getElementById('grafanaiframe')
const btn1hframe = document.getElementById('1hframe')
const btn4hframe = document.getElementById('4hframe')
const btn12hframe = document.getElementById('12hframe')
const btn1dframe = document.getElementById('1dframe')
const btn3dframe = document.getElementById('3dframe')
const btn1wframe = document.getElementById('1wframe')
const btn1mframe = document.getElementById('1mframe')

window.onload = ()=>{
description.value = ''
}




fetchState().then((data)=>{
    if(data.status === 0){
        state = 0
        measurementTitle.parentElement.classList.add("inactive")
        measurementTitle.parentElement.parentElement.children[1].classList.remove("inactive")
        measurementTitle.parentElement.parentElement.children[1].querySelector("h2").innerText= data.title
        measurementTitle.parentElement.parentElement.parentElement.appendChild(description)
        descText.innerText = data.description
        const descriptionTitle = document.createElement("h2")
        id = data.id
        let timestampTo = Date.now()
        console.log(timestampTo)
        let timestampFrom = timestampTo - 259200000
        descriptionTitle.textContent = "Poznámky"
       
        grafanaiframe.data = `http://raspberrypi:3000/d-solo/cef3prnyp9qm8a/new-dashboard?orgId=1&refresh=10s&from=now-24h&to=now&timezone=Europe/London&var-measurementID=${data.id}&panelId=1&__feature.dashboardSceneSolo`
        description.insertBefore(descriptionTitle,description.children[0])
        
            description.classList.add("container")

    }
})
setInterval(async () => {
    try {
        const latestValues = await fetchlatestValues();
        if (latestValues && typeof latestValues === 'object') {
            const values = Object.values(latestValues); // Extract values from the object
            for (let i = 0; i < sensors.length; i++) {
                sensors[i].innerHTML = `CH${i + 1}: ${values[i+1] || '--'}`; // Set default value if undefined
            }
        }
    } catch (error) {
        console.log('Error fetching latest values:', error);
    }
}, 1000);

if( measurementTitle.parentElement.classList.contains("inactive") === false){
    console.log("listeners added")
grafanaBtn.addEventListener('click', () => {
    const url = 'http://raspberrypi:3000/d/bedy5ps5puha8e/fermentation?orgId=1&from=2025-02-23T14:40:11.884Z&to=2025-02-27T13:23:27.115Z&timezone=browser&refresh=110s';
    window.open(url, '_blank'); // Open the URL in a new tab
});

pgadminBtn.addEventListener('click', () => {
    const url = 'http://raspberrypi:5050';
    window.open(url, '_blank'); // Open the URL in a new tab
});}


measTitleBtn.addEventListener('click',async ()=>{
    
       if(measurementTitle.value === ''){
        alert("Nazev nesmi byt prazdny")
       }else{
        console.log("description",descText.value)
        // Send "measurementTitle" data to the server
        await fetch('/create-measurement', {
            
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ measurementTitle: measurementTitle.value,
                measurementDescription: descText.value
                
             })
            
        })
        .then(response => response.json())
        .then(data => {
            
            measurementTitle.parentElement.classList.add("inactive")

            measurementTitle.parentElement.parentElement.children[1].classList.remove("inactive")
            measurementTitle.parentElement.parentElement.parentElement.appendChild(description)
            description.classList.add("container")
            measurementTitle.parentElement.parentElement.children[1].querySelector("h2").innerText= data.message
        })
        .catch(error => console.error('Error:', error));
    }
    })
    stopMeasurementBtn.addEventListener('click',async ()=>{
    
       
        await fetch('/finish-measurement', { method: 'POST' })
        .then(response => response.json()) // Parse JSON response
        .then(data => {
            console.log("deleted", data.message);
    
            measurementTitle.parentElement.classList.remove("inactive");
            measurementTitle.parentElement.parentElement.children[1].querySelector("h2").innerText = "";
            measurementTitle.parentElement.insertBefore(description,measTitleBtn)
            description.classList.remove("container")
            measurementTitle.parentElement.parentElement.children[1].classList.add("inactive");
            descriptionTitle.classList.add("inactive");
        })
        .catch(error => console.error('Error:', error));
    
    })

   
    async function fetchState() {
        const response = await fetch('/measurement/state', { 
            method: 'GET', 
            headers: { 'Content-Type': 'application/json' }
        });
    
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
    
        const data = await response.json();
        return data; // Return the JSON object
    }


    async function fetchlatestValues() {
        return new Promise((resolve, reject) => {
            socket.emit("measurement-latest-values", null, (response) => {
                if (!response || response.error) {
                    console.log("Error getting latest data from the server:", response ? response.error : 'Unknown error');
                    reject(new Error("Error getting latest data from the server"));
                    return;
                }
                //console.log(response)
                // Assuming response is now an object
                resolve(response); // Resolve the promise with valid data
            });
        });
    }

  

btn1hframe.addEventListener('click',()=>{
    grafanaiframe.data = `http://raspberrypi:3000/d-solo/cef3prnyp9qm8a/new-dashboard?orgId=1&refresh=10s&from=now-1h&to=now&timezone=Europe/London&var-measurementID=${id}&panelId=1&__feature.dashboardSceneSolo`
})
btn4hframe.addEventListener('click',()=>{
    grafanaiframe.data = `http://raspberrypi:3000/d-solo/cef3prnyp9qm8a/new-dashboard?orgId=1&refresh=10s&from=now-4h&to=now&timezone=Europe/London&var-measurementID=${id}&panelId=1&__feature.dashboardSceneSolo`
})
btn12hframe.addEventListener('click',()=>{
    grafanaiframe.data = `http://raspberrypi:3000/d-solo/cef3prnyp9qm8a/new-dashboard?orgId=1&refresh=10s&from=now-12h&to=now&timezone=Europe/London&var-measurementID=${id}&panelId=1&__feature.dashboardSceneSolo`
})
btn1dframe.addEventListener('click',()=>{
    grafanaiframe.data = `http://raspberrypi:3000/d-solo/cef3prnyp9qm8a/new-dashboard?orgId=1&refresh=10s&from=now-1d&to=now&timezone=Europe/London&var-measurementID=${id}&panelId=1&__feature.dashboardSceneSolo`
})
btn3dframe.addEventListener('click',()=>{
    grafanaiframe.data = `http://raspberrypi:3000/d-solo/cef3prnyp9qm8a/new-dashboard?orgId=1&refresh=10s&from=now-3d&to=now&timezone=Europe/London&var-measurementID=${id}&panelId=1&__feature.dashboardSceneSolo`
})
btn1wframe.addEventListener('click',()=>{
    grafanaiframe.data = `http://raspberrypi:3000/d-solo/cef3prnyp9qm8a/new-dashboard?orgId=1&refresh=10s&from=now-7d&to=now&timezone=Europe/London&var-measurementID=${id}&panelId=1&__feature.dashboardSceneSolo`
})
btn1mframe.addEventListener('click',()=>{
    grafanaiframe.data = `http://raspberrypi:3000/d-solo/cef3prnyp9qm8a/new-dashboard?orgId=1&refresh=10s&from=now-30d&to=now&timezone=Europe/London&var-measurementID=${id}&panelId=1&__feature.dashboardSceneSolo`
})