# --- Importy potřebných knihoven ---
import threading  # pro paralelní vlákna
import json  # práce s JSON daty
import os  # práce s proměnnými prostředí
import smbus2  # komunikace přes I2C sběrnici
import psycopg2  # připojení k PostgreSQL databázi
import datetime  # práce s časem
import redis  # klient pro Redis
import time  # zpoždění, spánek programu
from dotenv import load_dotenv  # načítání proměnných z .env souboru
from psycopg2.extras import execute_values  # hromadné vkládání do DB
from RPLCD.i2c import CharLCD  # knihovna pro I2C LCD displej
# from gpiozero import LED
# --- Načtení proměnných prostředí z .env souboru ---
load_dotenv()
# led_err = LED(14) # červená LED pro značení chyb
# led_ok = LED(24) # zelená LED pro značení OK stavu
# --- Konfigurace proměnných ---
batchCount = int(os.getenv("BATCH_COUNT", "25"))  # kolik měření tvoří jednu dávku
I2C_BUS = 1 # I2C rozhraní
NUM_SENSORS = 12 # počet senzorů
BYTES_TO_READ = NUM_SENSORS * 2  # každý senzor posílá 2 byty / celkem 24 bytů
ESP32_ADDRESS = 0x09 #I2C adresa ESP 32
LCD_ADDRESS = 0x27 #I2C adresa LCD displeje
bus = smbus2.SMBus(I2C_BUS)  # inicializace I2C sběrnice
batches = 0 # inicializace počtu dávek
previous_start_saving = False  #  příznak k detekci ukončení měření

# --- Sdílené proměnné ---
totalReadings = []  # ukládá aktuální dávku měření
lcd = CharLCD(i2c_expander='PCF8574', address=LCD_ADDRESS, port=1, cols=16, rows=2)
lcd.write_string("Unit ready") # uvítací zpráva na LCD
# led_ok.on()  
startSaving = threading.Event()  # příznak zda ukládat do DB
currentMeasurementId = None  # ID měření (přiřazeno externě)
measurement_id_lock = threading.Lock()  # zámek pro přístup k ID

# --- Redis připojení ---
r = redis.Redis(host='redis-stack', port=6379, decode_responses=True)

# --- Funkce pro příjem zpráv z Redis Pub/Sub kanálu ---
def redis_messages():
    pubsub = r.pubsub()
    pubsub.subscribe('measurement_message')  # naslouchání kanálu

    print(" [*] Waiting for messages on Redis channel 'task_channel'...")

    for message in pubsub.listen():
        if message['type'] != 'message':
            continue
        try:
            data = json.loads(message['data'])  # dekódování zprávy
            print(f"Received JSON: {data}")
            if data.get("run", False):
                startSaving.set()  # zapnout ukládání
            else:
                startSaving.clear()  # vypnout ukládání
            with measurement_id_lock:
                global currentMeasurementId
                currentMeasurementId = data.get("id", None)
            print(f"Updated Measurement ID: {currentMeasurementId}")
        except Exception as e:
            print(f"Error processing message: {e}")

# --- Funkce pro čtení ze senzorů přes I2C ---
def sensor_read():
    global previous_start_saving  
    global totalReadings
    while True:
        try:
            # Čtení dat z ESP32 (každý senzor 2 byty)
            
            raw_data = bus.read_i2c_block_data(ESP32_ADDRESS, 0x00, BYTES_TO_READ)
            new_readings = [(raw_data[i] << 8) | raw_data[i + 1] for i in range(0, BYTES_TO_READ, 2)]

            # Inicializace předchozích hodnot při prvním běhu
            if 'previous_readings' not in globals():
                previous_readings = new_readings[:]
                second_last_readings = new_readings[:]

            # Dvouúrovňová filtrace náhlých výkyvů
            readings = []
            for prev2, prev1, new in zip(second_last_readings, previous_readings, new_readings):
                if abs(new - prev1) > 300 or abs(new - prev2) > 300:
                    readings.append(prev1)  # podezřelý výkyv – ignorovat
                else:
                    readings.append(new)

            # Aktualizace historie pro další iteraci
            second_last_readings = previous_readings[:]
            previous_readings = readings[:]
            timestamp = datetime.datetime.now().isoformat()

            # Uložení aktuálních hodnot do Redis (hash pod "sensorValues")
            redis_data = {"timestamp": timestamp}
            redis_keys = [
                "ethanol1", "ethanol2", "ethanol3",
                "nh3_1", "no2_1", "co1",
                "nh3_2", "no2_2", "co2",
                "nh3_3", "no2_3", "co3"
            ]
            for i, key in enumerate(redis_keys):
                redis_data[key] = readings[i]
            r.hset("sensorValues", mapping=redis_data)
            print(f"Stored in Redis: {redis_data}")
            
            # if(RPi.GPIO.input(14)):
            #     led_ok.off()
            # else:
            #     led_ok.on()
            
            
            

            # Pokud je spuštěno měření, začni ukládání do dávky a do Timescale databáze
            if startSaving.is_set():
                with measurement_id_lock:
                    measurement_id = currentMeasurementId if currentMeasurementId is not None else -1
                totalReadings.append((timestamp, *readings, measurement_id))
                print(f"Batch: {len(totalReadings)} / {batchCount}, Measurement ID: {measurement_id}")

                # Pokud je dávka naplněna, ulož ji do databáze
                if len(totalReadings) >= batchCount:
                    print(f"Batch count ({batchCount}) reached, inserting to DB")
                    insert_batch(totalReadings)
                    totalReadings.clear()

            # Uložení zbytku dat při vypnutí měření
            if previous_start_saving and not startSaving.is_set():
                if totalReadings:
                    print("startSaving turned OFF! Saving remaining data...")
                    insert_batch(totalReadings)
                    totalReadings.clear()

            previous_start_saving = startSaving.is_set()

        except Exception as e:
            print(f"Error reading from ESP32: {e}")
            # led_ok.off()
            # led_err.on()
        time.sleep(1)  
        # pauza mezi měřeními

# --- Funkce pro vložení dávky do databáze ---
def insert_batch(batch):
    global batches
    if not batch:
        print("Empty batch, skipping insertion.")
        return
    try:
        connection = psycopg2.connect(
            host=os.getenv("DB_HOST"),
            dbname=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PWD"),
            port=os.getenv("DB_PORT")
        )
        cursor = connection.cursor()
        query = """
        INSERT INTO ferm.measurement 
        (timestamp, ethanol1, ethanol2, ethanol3, nh3_1, no2_1, co1, 
        nh3_2, no2_2, co2, nh3_3, no2_3, co3, measurement_id) 
        VALUES %s
        """
        execute_values(cursor, query, batch)
        connection.commit()
        batches += 1
        lcd.clear()
        lcd.write_string(f"Batch No. {batches} inserted.")
        print(f"Inserted batch of {len(batch)} rows.")
    except Exception as err:
        print(f"Database Insert Error: {err}")
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()
        print("DB connection closed.")

# --- Hlavní smyčka programu ---
def main():
    # Spuštění listeneru Redis zpráv na pozadí
    threading.Thread(target=redis_messages, daemon=True).start()
    # led_ok.on()
    # Sběr dat ze senzorů běží v hlavním vlákně
    sensor_read()

if __name__ == "__main__":
    main()

