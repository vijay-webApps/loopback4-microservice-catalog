import {Props} from './props';
import {Status} from './status';
import {TourStep} from './tourStep';
export interface TourState {
  sessionId: string;
  status: Status;
  step: string;
  route?: string;
  props?: Props;
}

export interface Tour {
  tourId: string;
  tourSteps: TourStep[];
  styleSheet: string;
}