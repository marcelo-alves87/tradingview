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
  static proc : boolean; 

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
        switchMap(() => this.getJsonFile({ativo : MockService.symbol, time : new Date(MockService.lastBarTimestamp - (3*60*60*1000) )})),
        map((data) => {          
          if(data && data.length > 0) {
            
            data.forEach(obj => {
              let barData = this.toBarData(obj);
              MockService.lastBarTimestamp = barData.time;
              let timestamp = Math.floor(barData.time/granularity) * granularity;        
              if (timestamp > MockService.lastBar.time) {
                MockService.lastBar = barData;
                MockService.lastBar.time = timestamp;                
              } else {
                MockService.lastBar.close = barData.close;
                MockService.lastBar.high = MockService.lastBar.high > barData.close ? MockService.lastBar.high : barData.close;
                MockService.lastBar.low = MockService.lastBar.low < barData.close ? MockService.lastBar.low : barData.close;
                MockService.lastBar.volume = barData.volume;
                return MockService.lastBar;
              }
            });
          } else {
            let timestamp = MockService.lastBarTimestamp + granularity;
            if (timestamp > MockService.lastBar.time && !MockService.proc) {
                MockService.proc = true;
                MockService.lastBar.time = timestamp;
              
            } else {
              return MockService.lastBar;
            }
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