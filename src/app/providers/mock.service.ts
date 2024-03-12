import { Injectable } from '@angular/core';
import { Observable, of, Observer, interval, Subscription } from 'rxjs';
import { last, map, mergeMap, switchMap, take } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { Bar } from 'src/assets/vendors/charting_library/charting_library.min';

interface BarData {
  ativo: string;
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
  static dataIndex = 0;
  static lastBarTimestamp: number;
  static symbol;
  static lastBar : BarData;

  static dataGenerator(time = +new Date()): BarData {
    return;
  }

  constructor(private http: HttpClient) {
  }

  toBarData(obj): BarData {
    let barData = {} as  BarData;
    barData.ativo = obj.ativo;
    barData.time = new Date(obj.time).getTime();        
    barData.open = obj.open;
    barData.high = obj.high;
    barData.low = obj.low;
    barData.close = obj.close;
    barData.volume = obj.volume;
    return barData;
  }

  getJsonFile(): Observable<any[]> {
    const salt = (new Date()).getTime();
    return this.http.get<any[]>("http://localhost:3000/btc-181123_2006-181124_0105.json?"+salt);
    
  }
 getHistoryList(param): Observable<BarData[]> {
  MockService.symbol = param.symbol.name;  
  return this.getJsonFile().pipe(
    take(1),
    map( data => {
      let list = [];
      data.forEach(obj => {
        let barData = this.toBarData(obj);
        MockService.lastBarTimestamp = barData.time;
        MockService.lastBar = barData;
        list.push(barData);        
      })
      list = list.filter(barData => barData.ativo == MockService.symbol);      
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
        mergeMap(() => this.getJsonFile()),
        map((data) => {
            if(data != null) {
              let list = []
              data.forEach(obj => {
                let barData : BarData = this.toBarData(obj);  
                list.push(barData);
              })
              
              list = list.filter(barData => barData.time >= MockService.lastBarTimestamp && barData.ativo == MockService.symbol);
              
              if(list.length > 0) {
                let barData = list[list.length - 1];    
                if (barData.time - MockService.lastBarTimestamp >= granularity) {
                  MockService.lastBarTimestamp += (barData.time % MockService.lastBarTimestamp);    
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
        }})  
          
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