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
  RawSpread_Mean: number,
  DensitySpread_Mean: number,
  Pressure_Mean: number
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
      Pressure_Mean: obj.Pressure_Mean ?? 0,
      RawSpread_Mean: obj.RawSpread_Mean ?? 0, 
      DensitySpread_Mean: obj.DensitySpread_Mean ?? 0
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
              this.lastBar.Pressure_Mean = barData.Pressure_Mean;  
              this.lastBar.RawSpread_Mean = barData.RawSpread_Mean;  
              this.lastBar.DensitySpread_Mean = barData.DensitySpread_Mean;           
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
        Pressure_Mean: 0,  
        RawSpread_Mean:  0, 
        DensitySpread_Mean:  0     

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
