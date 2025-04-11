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
  AvgBuyPrice_Open: number,  
  AvgBuyPrice_High: number,
  AvgBuyPrice_Low: number,
  AvgBuyPrice_Close: number,
  AvgSellPrice_Open: number,
  AvgSellPrice_High: number,
  AvgSellPrice_Low: number,
  AvgSellPrice_Close: number,
  AvgBuyQty_Open: number,
  AvgBuyQty_High: number,
  AvgBuyQty_Low: number,
  AvgBuyQty_Close: number,
  AvgSellQty_Open: number,
  AvgSellQty_High: number,
  AvgSellQty_Low: number,
  AvgSellQty_Close: number
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
      AvgBuyPrice_Open: obj.AvgBuyPrice_Open ?? 0,  
      AvgBuyPrice_High: obj.AvgBuyPrice_High ?? 0,
      AvgBuyPrice_Low: obj.AvgBuyPrice_Low ?? 0,
      AvgBuyPrice_Close: obj.AvgBuyPrice_Close ?? 0,
      AvgSellPrice_Open: obj.AvgSellPrice_Open ?? 0,  
      AvgSellPrice_High: obj.AvgSellPrice_High ?? 0,
      AvgSellPrice_Low: obj.AvgSellPrice_Low ?? 0,
      AvgSellPrice_Close: obj.AvgSellPrice_Close ?? 0,   
      AvgBuyQty_Open: obj.AvgBuyQty_Open ?? 0,
      AvgBuyQty_High: obj.AvgBuyQty_High ?? 0,
      AvgBuyQty_Low: obj.AvgBuyQty_Low ?? 0,   
      AvgBuyQty_Close: obj.AvgBuyQty_Close ?? 0,
      AvgSellQty_Open: obj.AvgSellQty_Open ?? 0,
      AvgSellQty_High: obj.AvgSellQty_High ?? 0,
      AvgSellQty_Low: obj.AvgSellQty_Low ?? 0,
      AvgSellQty_Close: obj.AvgSellQty_Close ?? 0,
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
              this.lastBar.AvgBuyPrice_Open = barData.AvgBuyPrice_Open;  
              this.lastBar.AvgBuyPrice_High = barData.AvgBuyPrice_High;
              this.lastBar.AvgBuyPrice_Low = barData.AvgBuyPrice_Low;
              this.lastBar.AvgBuyPrice_Close = barData.AvgBuyPrice_Close;
              this.lastBar.AvgSellPrice_Open =  barData.AvgSellPrice_Open;  
              this.lastBar.AvgSellPrice_High = barData.AvgSellPrice_High;
              this.lastBar.AvgSellPrice_Low = barData.AvgSellPrice_Low;
              this.lastBar.AvgSellPrice_Close = barData.AvgSellPrice_Close;  
              this.lastBar.AvgBuyQty_Open = barData.AvgBuyQty_Open;
              this.lastBar.AvgBuyQty_High = barData.AvgBuyQty_High;
              this.lastBar.AvgBuyQty_Low = barData.AvgBuyQty_Low;
              this.lastBar.AvgBuyQty_Close = barData.AvgBuyQty_Close;
              this.lastBar.AvgSellQty_Open = barData.AvgSellQty_Open;
              this.lastBar.AvgSellQty_High = barData.AvgSellQty_High;
              this.lastBar.AvgSellQty_Low = barData.AvgSellQty_Low;
              this.lastBar.AvgSellQty_Close = barData.AvgSellQty_Close;
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
        AvgBuyPrice_Open: 0,  
        AvgBuyPrice_High: 0,
        AvgBuyPrice_Low: 0,
        AvgBuyPrice_Close: 0,
        AvgSellPrice_Open: 0,
        AvgSellPrice_High: 0,
        AvgSellPrice_Low: 0,
        AvgSellPrice_Close: 0,
        AvgBuyQty_Open: 0,
        AvgBuyQty_High: 0,
        AvgBuyQty_Low: 0,
        AvgBuyQty_Close: 0,
        AvgSellQty_Open: 0,
        AvgSellQty_High: 0,
        AvgSellQty_Low: 0,
        AvgSellQty_Close: 0
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
