
const bodyParser = require('body-parser');
const fs = require('fs');
const { exec } = require('child_process');


// Route to handle WiFi configuration


// Function to update WiFi config file
exports.updateWifiConfig = function(ssid, password) {
  const wifiConfig = `
ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1
country=US

network={
    ssid="${ssid}"
    psk="${password}"
    key_mgmt=WPA-PSK
}
  `;

  // Write to the wpa_supplicant.conf file
  fs.writeFileSync('/etc/wpa_supplicant/wpa_supplicant.conf', wifiConfig);
}

// Function to reconfigure WiFi
exports.reconfigureWifi = function() {
  exec('wpa_cli -i wlan0 reconfigure', (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
    console.error(`stderr: ${stderr}`);
  });

  // Optionally, you can reboot the Pi
  // exec('sudo reboot', (error, stdout, stderr) => {
  //   if (error) {
  //     console.error(`exec error: ${error}`);
  //     return;
  //   }
  //   console.log(`stdout: ${stdout}`);
  //   console.error(`stderr: ${stderr}`);
  // });
}

