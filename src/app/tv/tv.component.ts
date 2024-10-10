import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { MockService } from '../providers/mock.service';
import { timer } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Title } from '@angular/platform-browser';


@Component({
  selector: 'app-tv',
  templateUrl: './tv.component.html',
  styleUrls: ['./tv.component.scss']
})
export class TvComponent implements OnInit, OnDestroy {
  @Input() symbol;

  tradingview;

  ws;
  wsMessage = 'you may need to send specific message to subscribe data, eg: BTC';

  granularityMap = {
    '1': 60,
    '3': 180,
    '5': 300,
    '30': 30 * 60,
    '60': 60 * 60,
    '120': 60 * 60 * 2,
    '240': 60 * 60 * 4,
    '360': 60 * 60 * 6,
    'D': 86400
  };

  constructor(private mockService: MockService, private titleService: Title) {
    
  }

  save() {
    /*let obj = this.tradingview.chart(0);
    
    this.tradingview.save(obj => {
      const newBlob = new Blob([JSON.stringify(obj.charts[0])], { type: "application/json" });
      const data = window.URL.createObjectURL(newBlob);
      const link = document.createElement("a");
      link.href = data;
      link.download = this.symbol + '.json'; // set a name for the file
      link.click();
    });*/

    // Assume you already have a chart object initialized
    const chart = this.tradingview.activeChart();

    // Function to add RSI indicator with a period of 14
    chart.createStudy('Relative Strength Index', false, false, [14], null, {
        'Plot.color': '#FF0000' // Color the RSI line as red
    });
  }

  handleFileInput(files: FileList) {
    let fileReader = new FileReader();
    fileReader.onload = (e) => {
      this.tradingview.load(JSON.parse(fileReader.result as string));      
    }
    fileReader.readAsText(files.item(0));
  }

  ngOnInit() {
    this.titleService.setTitle(this.symbol);
    this.ws = this.mockService.fakeWebSocket();

    this.ws.onopen = () => {
      console.log('fake websocket: onopen');
      this.drawTv();
    };
  }

  ngOnDestroy() {    
    this.ws.close();
  }

  drawTv() {
    this.tradingview = new window.TradingView.widget({
      // debug: true, // uncomment this line to see Library errors and warnings in the console
      fullscreen: true,
      symbol: this.symbol,
      interval: '5',
      container_id: 'tradingview',
      library_path: 'assets/vendors/charting_library/',
      locale: 'en',
      disabled_features: [
        // 'timeframes_toolbar',
        // 'go_to_date',
        // 'use_localstorage_for_settings',
        'volume_force_overlay',
        // 'show_interval_dialog_on_key_press',
        'symbol_search_hot_key',
        'study_dialog_search_control',
        'display_market_status',
        /*'header_compare',
        'header_symbol_search',
        'header_fullscreen_button',
        'header_settings',
        'header_chart_type',
        'header_resolutions',*/
        'control_bar',
        'edit_buttons_in_legend',
        'border_around_the_chart',
        'main_series_scale_menu',
        'star_some_intervals_by_default',
        'datasource_copypaste',
        'header_indicators',
        // 'context_menus',
        // 'compare_symbol',
        'header_undo_redo',
        'border_around_the_chart',
        'timezone_menu',
        'remove_library_container_border',
      ],
      // enabled_features: ['study_templates'],
      charts_storage_url: 'http://localhost:3000',
      charts_storage_api_version: '1.1',
      client_id: 'tradingview.com',
      user_id: 'public_user_id',
      timezone: 'America/Sao_Paulo',
      datafeed: {
        onReady(x) {
          timer(0)
            .pipe(
              tap(() => {
                x({
                  supported_resolutions: ['1', '3', '5', '30', '60', '120', '240', '360', 'D'],
                });
              })
            ).subscribe();
        },
        getBars: (...args) => {
          const [symbol, granularity, startTime, endTime, onResult, onError, isFirst] = args;
          console.log('[getBars]:', args);
          this.mockService.getHistoryList({
            granularity: this.granularityMap[granularity],
            startTime,
            endTime,
            symbol
          }).subscribe((data: any) => {
            // push the history data to callback
            onResult(data, { noData: false });
          });
        },
        resolveSymbol: (symbol, onResolve, onError) => {
          console.log('[resolveSymbol]');
          timer(1e3)
            .pipe(
              tap(() => {
                onResolve({
                  name: this.symbol,
                  full_name: this.symbol,
                  base_name: this.symbol,
                  has_intraday: true,
                  description: '',
                  type: '',
                  session: '24x7',
                  exchange: '',
                  listed_exchange: '',
                  timezone: 'America/New_York',
                  minmov: 1,
                  format: 'price',
                  pricescale: 100,
                  supported_resolutions: ['1', '3', '5', '30', '60', '120', '240', '360', 'D'],
                });
              })
            ).subscribe();
        },
        getServerTime: (callback) => {
          console.log('[serverTime]');
        },
        subscribeBars: (...args) => {
          const [symbol, granularity, onTick] = args;
          console.log('[subscribe], arg:', args);
          this.ws.onmessage = (e) => {
            try {
              const data = e;
              if (data) {
                // realtime data
                // data's timestamp === recent one ? Update the recent one : A new timestamp data
                onTick(data);
              }
            } catch (e) {
              console.error(e);
            }
          };

          // subscribe the realtime data
          this.ws.send(`${this.wsMessage}_kline_${this.granularityMap[granularity]}`);
        },
        unsubscribeBars: () => {
          this.ws.send('stop receiving data or just close websocket');
        },
        searchSymbols: () => { /* ts: required method */ },
    },

    custom_indicators_getter: function (PineJS) {
      return Promise.resolve([
        {
          name: "MACD",
          metainfo: {
            _metainfoVersion: 51,
        
            id: "MACD@tv-basicstudies-1",
            name: "MACD",
            description: "MACD - Moving Average Convergence Divergence",
            shortDescription: "MACD",
        
            isCustomIndicator: true,
            isTVScript: false,
            isTVScriptStub: false,
        
            format: {
              type: "price",
              precision: 4,
            },
        
            defaults: {
              palettes: {
                palette_0: {
                  // Default colors for the histogram
                  colors: [{ color: "#00FF00" }, { color: "#FF0000" }],
                },
              },
            },
        
            inputs: [
              {
                name: "fastLength",
                type: "integer",
                defval: 12,
                min: 1,
                max: 100,
                title: "Fast Length"
              },
              {
                name: "slowLength",
                type: "integer",
                defval: 26,
                min: 1,
                max: 100,
                title: "Slow Length"
              },
              {
                name: "signalLength",
                type: "integer",
                defval: 9,
                min: 1,
                max: 100,
                title: "Signal Length"
              },
            ],
        
            plots: [
              {
                id: "macdLine",
                title: "MACD Line",
                type: "line",
                color: "#FF0000",
                linewidth: 2
              },
              {
                id: "signalLine",
                title: "Signal Line",
                type: "line",
                color: "#00FF00",
                linewidth: 2
              },
              {
                id: "histogram",
                title: "Histogram",
                type: "histogram",
                palette: "palette_0", // Use palette for colorizing the histogram
              },
            ],
        
            palettes: {
              palette_0: {
                colors: [{ name: "Positive" }, { name: "Negative" }],
                valToIndex: {
                  100: 0, // Maps positive value to green color
                  200: 1, // Maps negative value to red color
                },
              },
            },
          },
        
          constructor: function () {
            this.main = function (context, input) {
              this._context = context;
              this._input = input;
        
              var macdLine = this._input[0];  // Placeholder for actual MACD line calculation
              var signalLine = this._input[1];  // Placeholder for actual signal line calculation
        
              // Example condition: if MACD is greater than the signal line, it's positive
              var valueForPositive = 100;
              var valueForNegative = 200;
        
              var result = macdLine > signalLine ? valueForPositive : valueForNegative;
        
              return [result];
            };
          },
        },
      ]);
    },
  });

  // Call your method when the chart is ready
      this.tradingview.onChartReady(() => {
        this.tradingview.chart().createStudy("MACD", false, false);
        
        // Function to add RSI indicator with a period of 14
        this.tradingview.chart().createStudy('Relative Strength Index', false, false, [14], null, {
          'Plot.color': '#FF0000', // Color the RSI line as red
        
        });

  
              
      });
    }
}