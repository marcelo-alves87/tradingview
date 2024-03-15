import { Injectable } from '@angular/core';
import { Observable, of, Observer, interval, Subscription } from 'rxjs';
import { map, mergeMap, switchMap, take } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';


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
  static datalength: number;

  static dataGenerator(time = +new Date()): BarData {
    const obj: any = {};
    Object.assign(obj, MockService.lastBar, { time });
    ++this.dataIndex >= MockService.datalength && (this.dataIndex = 0);
    return obj;
  }

  constructor(private http: HttpClient, private datepipe: DatePipe) {
  }

  toBarData(obj): BarData {
    let barData = {} as  BarData;
    barData.ativo = obj.ativo;
    barData.time = new Date(obj.time).getTime() + (3*60*60*1000);  
    barData.open = obj.open;
    barData.high = obj.high;
    barData.low = obj.low;
    barData.close = obj.close;
    barData.volume = obj.volume;
    return barData;
  }

  getJsonFile(params): Observable<any[]> {
    const salt = (new Date()).getTime();
    return this.http.get<any[]>("http://localhost:3000/" + salt + ".json?time=" + params.time + "&ativo=" + params.ativo);
    
  }

 getHistoryList(param): Observable<BarData[]> {
  MockService.symbol = param.symbol.name;  
  return this.getJsonFile({ time: 0, ativo : MockService.symbol }).pipe(
    take(1),
    map( data => {
      let list = [];
      data.forEach(obj => {
        let barData = this.toBarData(obj);
        list.push(barData);        
      })
      let barData = list[list.length - 1];    
      MockService.lastBar = barData;
      MockService.lastBarTimestamp = barData.time;
      MockService.datalength = list.length;      
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
    subscription = interval(duration)
      .pipe(
        /*
         * mock data, no need to care about the logic if you use server data
         * the point is the time of the data
         * data.time === last.time => update
         * data.time !== last.time => draw new bar
         */
        map(() => {
          const currentTimestamp = +new Date();
          let timestamp = Math.floor(currentTimestamp/granularity) * granularity;          
          if (timestamp > MockService.lastBar.time) {
            /* time goes to next, generate new one */
            let obj = MockService.lastBar;
            obj.time = timestamp;           
            obj.open = obj.close;
            obj.high = obj.close;
            obj.low = obj.close;
            MockService.lastBar = obj;
            return obj;
          } else {
            /* simulate real time update, update the one that last time returned */
            
            const priceChanged = Math.random() < 0.5 ? Math.random()* -1 : Math.random(); // make price change in same step
            MockService.lastBar.close += priceChanged;
            MockService.lastBar.high = MockService.lastBar.high > MockService.lastBar.close ? MockService.lastBar.high : MockService.lastBar.close;
            MockService.lastBar.low = MockService.lastBar.low < MockService.lastBar.close ? MockService.lastBar.low : MockService.lastBar.close;
            MockService.lastBar.volume += priceChanged;
            return MockService.lastBar;
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