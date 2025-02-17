import { BrowserModule } from '@angular/platform-browser';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { TvComponent } from './tv/tv.component';
import { DatePipe } from '@angular/common'

@NgModule({ declarations: [
        AppComponent,
        TvComponent
    ],
    bootstrap: [AppComponent], imports: [BrowserModule], providers: [DatePipe, provideHttpClient(withInterceptorsFromDi())] })
export class AppModule { }
