import { Injectable } from '@angular/core';
import { now } from 'jquery';
import { Observable, Observer, interval, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { BTC_PRICE_LIST } from '../mock/btc-181123_2006-181124_0105';

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
  static dataIndex = 0;
  static dataLength = BTC_PRICE_LIST.length;

  lastBarTimestamp: number;

  static dataGenerator(entry): BarData {
    let obj = {} as BarData;
    obj.time = new Date(entry.time).getTime();
    obj.high = entry.high;
    obj.close = entry.close;
    obj.low = entry.low;
    obj.open = entry.open;
    obj.volume = entry.volume;
    return obj;
  }

  constructor() {
  }

  getHistoryList(param): Observable<BarData[]> {
    const list = [];
    const now = new Date();
    const filtered = BTC_PRICE_LIST.filter(obj => {
          let date = new Date(obj.time)
          return date.getDay() <= now.getDay();
    });
    filtered.forEach(entry => {
      list.push(MockService.dataGenerator(entry));
    });
    return new Observable((ob: Observer<any>) => {
      ob.next(list);
      ob.complete();
    });
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
      const duration = 3e3;
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
            if (currentTimestamp - this.lastBarTimestamp >= granularity) {
              /* time goes to next, generate new one */
              this.lastBarTimestamp += granularity;
              return MockService.dataGenerator(this.lastBarTimestamp);
            } else if (currentTimestamp + duration - this.lastBarTimestamp >= granularity) {
              // next one will be new one, get data from local, then return to client
              // so old bars will be real data
              return { ...BTC_PRICE_LIST[MockService.dataIndex], time: this.lastBarTimestamp, };
            } else {
              console.log(MockService.dataIndex);
              /* simulate real time update, update the one that last time returned */
              const data = BTC_PRICE_LIST[MockService.dataIndex];
              const priceChanged = Math.random() * 10 - 10 / 2; // make price change in same step
              ;
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
