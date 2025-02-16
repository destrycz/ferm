import time
import board
import busio
import csv
from datetime import datetime
from flask import Flask, request 
import json 

# Setup flask server 
app = Flask(__name__) 

# Setup url route which will calculate 
# total sum of array. 
@app.route('/arraysum', methods = ['POST']) 
def sum_of_array(): 
	data = request.get_json() 
	print(data) 

	# Data variable contains the 
	# data from the node server 
	ls = data['array'] 
	result = sum(ls) # calculate the sum 

	# Return data in json format 
	return json.dumps({"result":result}) 

if __name__ == "__main__": 
	app.run(port=5000)

# Initialize the I2C bus with the correct pins
i2c = busio.I2C(3, 2)  # Adjust GPIO pins as per your setup
esp_i2c = 0x09

# Check if the ESP32 is connected
time.sleep(2)  # Allow time for I2C to initialize
if esp_i2c not in i2c.scan():
    print("Could not find ESP device on I2C bus.")
    exit()

# Buffer to store sensor data
data_buffer = []

# CSV file to save data
csv_filename = "sensor_data.csv"

# Function to read data from ESP32
def read_sensor_data():
    num_samples = 12  # Number of samples sent by ESP32
    num_bytes = num_samples * 2  # Each measurement is 2 bytes
    res = bytearray(num_bytes)

    try:
        # Request data from ESP32
        i2c.readfrom_into(esp_i2c, res)

        # Decode measurements
        measurements = []
        for i in range(0, len(res), 2):
            raw_value = (res[i] << 8) | res[i + 1]  # Combine two bytes
            measurements.append(raw_value)

        return measurements

    except Exception as e:
        print("Error reading from ESP32:", e)
        return None

# Function to save buffered data to a CSV file
def save_to_csv():
    global data_buffer

    if not data_buffer:
        return  # No data to save

    with open(csv_filename, "a", newline="") as file:
        writer = csv.writer(file)
        for row in data_buffer:
            writer.writerow(row)

    print(f"Saved {len(data_buffer)} entries to {csv_filename}")
    data_buffer = []  # Clear the buffer after saving

# Main loop
start_time = time.time()
while True:
    measurements = read_sensor_data()
    if measurements:
        print(measurements)
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        data_buffer.append([timestamp] + measurements)  # Store timestamp with data

    time.sleep(1.02)  # Adjust sampling rate if needed

    # Check if 15 minutes have passed
    if time.time() - start_time >= 900:  # 900 seconds = 15 minutes
        save_to_csv()
        start_time = time.time()  # Reset timer
