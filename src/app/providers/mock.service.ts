import { Injectable } from '@angular/core';
import { Observable, of, interval, Subscription } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';

interface BarData {
  ativo: string;
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  OrderBookScore_Open: number,  
  OrderBookScore_High: number,
  OrderBookScore_Low: number,
  OrderBookScore_Close: number,
  Spread_Open: number,  
  Spread_High: number,
  Spread_Low: number,
  Spread_Close: number
  
}

@Injectable({
  providedIn: 'root',
})
export class MockService {
  private lastBar!: BarData;
  private lastBarTimestamp: number = 0;
  private symbol: string = '';
  private dataLength: number = 0;
  private processing: boolean = false;
  private subscription?: Subscription;

  constructor(private http: HttpClient) {}

  private toBarData(obj: any): BarData {
    return {
      ativo: obj.ativo,
      time: new Date(obj.time).getTime() + 3 * 60 * 60 * 1000, // Adjust timezone
      open: obj.open,
      high: obj.high,
      low: obj.low,
      close: obj.close,
      volume: obj.volume,
      OrderBookScore_Open: obj.OrderBookScore_Open ?? 0,  
      OrderBookScore_High: obj.OrderBookScore_High ?? 0,
      OrderBookScore_Low: obj.OrderBookScore_Low ?? 0,
      OrderBookScore_Close: obj.OrderBookScore_Close ?? 0,
      Spread_Open: obj.Spread_Open ?? 0,  
      Spread_High: obj.Spread_High ?? 0,
      Spread_Low: obj.Spread_Low ?? 0,
      Spread_Close: obj.Spread_Close ?? 0
      
    };
  }

  private getJsonFile(params: { time: number; ativo: string }): Observable<BarData[]> {
    return this.http.get<BarData[]>(`http://localhost:3000/data.json?time=${params.time}&ativo=${params.ativo}`);
  }

  getHistoryList({ param }: { param: { granularity: any; startTime; endTime: any; symbol: { name: string; }; }; }): Observable<BarData[]> {
    this.symbol = param.symbol.name;

    return this.getJsonFile({ time: 0, ativo: this.symbol }).pipe(
      take(1),
      map((data) => {
        const list = data.map((obj) => this.toBarData(obj));
        if (list.length > 1) list.pop(); // Remove last element if needed

        if (list.length > 0) {
          this.lastBar = list[list.length - 1];
          this.lastBarTimestamp = this.lastBar.time;
          this.dataLength = list.length;
        }

        return list;
      })
    );
  }

  fakeWebSocket() {
    let granularity = 0;

    const ws: any = {
      send: (message: string) => {
        const matched = message.match(/.+_kline_(\d+)/);
        if (matched) {
          granularity = +matched[1] * 1e3;
          this.startDataFeed(granularity, ws);
        } else {
          this.subscription?.unsubscribe();
        }
      },
      close: () => {
        this.subscription?.unsubscribe();
      },
    };

    setTimeout(() => ws.onopen?.(), 1000); // Simulate WebSocket opening

    return ws;
  }

  private startDataFeed(granularity: number, ws: any) {
    this.subscription = interval(1000)
      .pipe(
        switchMap(() => this.getJsonFile({ ativo: this.symbol, time: this.lastBarTimestamp - 3 * 60 * 60 * 1000 })),
        map((data) => {
          if (!data.length) return this.handleEmptyData(granularity);

          data.forEach((obj) => {
            const barData = this.toBarData(obj);
            this.lastBarTimestamp = barData.time;

            const timestamp = Math.floor(barData.time / granularity) * granularity;
            
            if (timestamp > this.lastBar.time) {
              this.lastBar = { ...barData, time: timestamp };
            } else {
              this.lastBar.close = barData.close;
              this.lastBar.high = barData.high;
              this.lastBar.low = barData.low;
              this.lastBar.volume = barData.volume;
              this.lastBar.OrderBookScore_Open = barData.OrderBookScore_Open;  
              this.lastBar.OrderBookScore_High = barData.OrderBookScore_High;
              this.lastBar.OrderBookScore_Low = barData.OrderBookScore_Low;
              this.lastBar.OrderBookScore_Close = barData.OrderBookScore_Close;  
              this.lastBar.Spread_Open = barData.Spread_Open;  
              this.lastBar.Spread_High = barData.Spread_High;
              this.lastBar.Spread_Low = barData.Spread_Low;
              this.lastBar.Spread_Close = barData.Spread_Close;             
            }
          });

          return this.lastBar;
        })
      )
      .subscribe((x) => ws.onmessage?.(x));
  }

  private handleEmptyData(granularity: number) {
    if (!this.lastBar) {
      this.lastBar = {
        ativo: this.symbol,
        time: Date.now(),
        open: 0,
        high: 0,
        low: 0,
        close: 0,
        volume: 0,
        OrderBookScore_Open: 0,  
        OrderBookScore_High: 0,
        OrderBookScore_Low: 0,
        OrderBookScore_Close: 0,
        Spread_Open: 0,  
        Spread_High: 0,
        Spread_Low: 0,
        Spread_Close: 0
        
      };
    }
    const timestamp = this.lastBarTimestamp + granularity;
    if (timestamp > this.lastBar.time && !this.processing) {
      this.processing = true;
      this.lastBar.time = timestamp;
    }
    return this.lastBar;
  }
}
