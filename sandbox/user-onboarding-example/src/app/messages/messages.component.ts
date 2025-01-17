import {Component, OnInit} from '@angular/core';
import {MessageService} from '../message.service';
import {TourService} from '../tour.service';

@Component({
  selector: 'app-messages',
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.scss'],
})
export class MessagesComponent implements OnInit {
  constructor(
    public readonly messageService: MessageService,
    private readonly tourService: TourService,
  ) {}
  disablePointerEvents: boolean;
  ngOnInit() {
    this.tourService.tourRunning$.subscribe(tourState => {
      this.disablePointerEvents = tourState;
    });
  }
}
