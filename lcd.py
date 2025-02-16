import board
import busio
import adafruit_character_lcd.character_lcd_i2c as character_lcd
import time

# Define LCD size
lcd_columns = 16
lcd_rows = 2

# Initialize I2C bus
i2c = busio.I2C(board.SCL, board.SDA)

# Set LCD address (default is 0x27 or 0x3F)
lcd = character_lcd.Character_LCD_I2C(i2c, lcd_columns, lcd_rows, address=0x27)  # Change to 0x3F if needed

# Display text
lcd.message = "Hello, Raspberry!\nLCD is working!"
time.sleep(5)

# Clear display
lcd.clear()

# Show new message
lcd.message = "Adafruit LCD\nLibrary Test"
time.sleep(5)

# Optional: Turn off backlight before exit
lcd.backlight = False
