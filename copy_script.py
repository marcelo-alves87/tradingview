import shutil
import time

SOURCE = 'src/assets/btc-181123_2006-181124_0105.json'
DEST_GROUP = ['dist/tradingview-angular-example/assets/',\
              'dist/tradingview-angular-example_1/assets/'] 


while True:

    for dest in DEST_GROUP:
        shutil.copy(SOURCE, dest)  
    time.sleep(1)
