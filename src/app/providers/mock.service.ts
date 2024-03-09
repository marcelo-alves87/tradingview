import { Injectable } from '@angular/core';
import { Observable, of, Observer, interval, Subscription } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';

interface BarData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

@Injectable({
  providedIn: 'root'
})
export class MockService {
  static dataTemplate: BarData = { 'time': 1545572340000, 'open': 3917, 'high': 3917, 'low': 3912.03, 'close': 3912.62, 'volume': 3896 };
  static dataIndex = 0;
  static lastBarTimestamp: number;

  static dataGenerator(time = +new Date()): BarData {
    return;
  }

  constructor(private http: HttpClient) {
  }

  toBarData(obj): BarData {
    let barData = {} as  BarData;
    barData.time = new Date(obj.time).getTime();        
    barData.open = obj.open;
    barData.high = obj.high;
    barData.low = obj.low;
    barData.close = obj.close;
    barData.volume = obj.volume;
    return barData;
  }

 getHistoryList(param): Observable<BarData[]> {
  
  return this.http.get<any[]>("assets/btc-181123_2006-181124_0105.json").pipe(
    take(1),
    map( data => {
      let list = [];
      data.forEach(obj => {
        let barData = this.toBarData(obj);
        MockService.lastBarTimestamp = barData.time;
        list.push(barData);        
      })
      MockService.dataIndex = list.length - 1;
      return list;
    }),
    switchMap( data => new Observable((ob: Observer<any>) => {
      ob.next(data);
      ob.complete();
    }))
  );

}

  fakeWebSocket() {
    let granularity: number;
    let subscription: Subscription;

    const ws: any = {
      send(message: string) {
        const matched = message.match(/.+_kline_(\d+)/);

        // if matched, then send data based on granularity
        // else unsubscribe, which means to close connection in this example
        if (matched) {
          granularity = +matched[1] * 1e3;
          sendData();
        } else {
          subscription.unsubscribe();
        }
      },
      close() {
      }
    };

    const sendData = () => {
      const duration = 1e3;
      subscription =  interval(duration)
        .pipe(
          /*
           * mock data, no need to care about the logic if you use server data
           * the point is the time of the data
           * data.time === last.time => update
           * data.time !== last.time => draw new bar
           */
         
          switchMap( () => this.http.get<any[]>("assets/btc-181123_2006-181124_0105.json")),
          map( data => {
            let list = []
            data.forEach(obj => {
              let barData : BarData = this.toBarData(obj);  
              list.push(barData);
            })
            list = list.filter(barData => barData.time > MockService.lastBarTimestamp);
            if(list.length > 0) {
              let barData = list[list.length - 1];    
              if (barData.time - MockService.lastBarTimestamp >= granularity) {
                MockService.lastBarTimestamp += granularity;    
              } 
              return {
                time: MockService.lastBarTimestamp,
                open: barData.open,
                close: barData.close,
                low: barData.low,
                high: barData.high,
                volume: barData.volume,
              }; 
            }
          })    
            
          
          
        )
        .subscribe(x => {
          ws.onmessage && ws.onmessage(x);
        });
    };

    // simulate open websocket after one second
    setTimeout(() => {
      ws.onopen();
    }, 1e3);

    return ws;
  }
}