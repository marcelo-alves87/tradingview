import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { MockService } from '../providers/mock.service';
import { timer } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Title } from '@angular/platform-browser';
import { interpret } from '../interpretation/trend-interpretation';

@Component({
    selector: 'app-tv',
    templateUrl: './tv.component.html',
    styleUrls: ['./tv.component.scss'],
    standalone: false
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
  private allBars: any[] = []; // or BarData[] if you import the type
  private noticeOpen = false;
  private liveNotification = false;
  private content = {title: '', body: ''};
  private isDialogShown = false;

  constructor(private mockService: MockService, private titleService: Title) {
    
  }

  save() {
    let obj = this.tradingview.activeChart();
        
    this.tradingview.save(obj => {
      const newBlob = new Blob([JSON.stringify(obj.charts[0])], { type: "application/json" });
      const data = window.URL.createObjectURL(newBlob);
      const link = document.createElement("a");
      link.href = data;
      link.download = this.symbol + '_layout_.json';
      link.click();
    });

   
  }

  handleFileInput(files: FileList) {
    let fileReader = new FileReader();
    fileReader.onload = (e) => {
      this.tradingview.load(JSON.parse(fileReader.result as string));      
    }
    fileReader.readAsText(files.item(0));
  }

  toggleDescription(event: Event): void {
    const checkbox = (event.target as HTMLInputElement);
    this.noticeOpen = checkbox.checked;
    if(!checkbox.checked) {
      this.tradingview.closePopupsAndDialogs();
    }
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

  toggleLiveNotification(event: Event): void {
    const checkbox = (event.target as HTMLInputElement);
    this.liveNotification = checkbox.checked;
  }

  async _openNoticeDialog(bar) {
    if(!bar) {
      bar = this.allBars[this.allBars.length - 1];
    }
    await this.tradingview.closePopupsAndDialogs();
    
    const { leitura, tendencia, observacoes } = await interpret(bar.DensitySpread_Mean, bar.Liquidity_Mean, bar.Pressure_Mean);
            
    this.content.body = `
      <div style="text-align: center;">
        <strong>Leitura do livro/fluxo:</strong><br>
          ${leitura}<br><br>
          <strong>Tendência provável:</strong><br>
          ${tendencia}<br><br>
          <strong>Observações:</strong><br>
          ${observacoes}
      </div>
    `;

    this.content.title =  `Leitura • ${new Date(bar.time).toLocaleString()}`;

      if(!this.isDialogShown) {
        this.isDialogShown = true;
      // show a chart-styled tooltip (dialog) using your widget helpers
        this.tradingview.showNoticeDialog({
          title: this.content.title,
          body: this.content.body,
          callback: () => {
              this.tradingview.closePopupsAndDialogs();       
              this.isDialogShown = false;    
          }
        });
    }
  }

  drawTv() {

   this.tradingview = new (window as any).TradingView.widget({
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
        //'volume_force_overlay',
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
      timezone: 'America/Buenos_Aires',
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
            param: {
              granularity: this.granularityMap[granularity],
              startTime,
              endTime,
              symbol
            }
          }).subscribe((data: any) => {
            this.allBars = data; // store globally
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

                if (this.allBars && Array.isArray(this.allBars)) { // Ensure it's an array
                  const lastbar = this.allBars[this.allBars.length - 1];

                  if (lastbar.time === data.time) {
                    // Update the lastbar as data
                    this.allBars[this.allBars.length - 1] = data;

                    if(this.liveNotification && this.noticeOpen) {
                      this._openNoticeDialog(undefined);
                    }

                  } else if (lastbar.time < data.time) {
                    // Add new data at the end of the array
                    this.allBars.push(data);
                  }
               }



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

    
  });

  // Call your method when the chart is ready
      this.tradingview.onChartReady(() => {


        this.tradingview.chart().createStudy('Raw Spread', false, false, [], null, {
          'Plot.color': '#FF0000', // Color the RSI line as red
        
        });
        
        this.tradingview.chart().createStudy('Density Spread', false, false, [], null, {
          'Plot.color': '#FF0000', // Color the RSI line as red
        
        }); 
        
        this.tradingview.chart().createStudy('Liquidity', false, false, [], null, {
          'Plot.color': '#FF0000', // Color the RSI line as red
        
        }); 

        this.tradingview.chart().createStudy('Pressure', false, false, [], null, {
          'Plot.color': '#FF0000', // Color the RSI line as red
        
        }); 


        

        this.tradingview.chart().crossHairMoved(async (param: any) => {

          const t = typeof param.time === 'number' && param.time > 2e10
            ? Math.floor(param.time / 1000)
            : param.time;
          
          const match = this.allBars.find(bar => {
            const barTime = bar.time > 2e10 ? Math.floor(bar.time / 1000) : bar.time;
            return barTime === t;
          });

          if(match) {
            const insidePrice =
              typeof param?.price === 'number' &&
              param.price >= match.low &&
              param.price <= match.high;

            if (insidePrice && this.noticeOpen) {
              this._openNoticeDialog(match);
            }
        }

        }); 

      });
    }
}