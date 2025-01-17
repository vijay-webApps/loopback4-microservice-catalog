import {Model, model, property} from '@loopback/repository';
import {ModelPropertyDescriptionString} from './model-property-description.enum';

@model({
  description: 'This is the signature for OTP login request.',
})
export class OtpLoginRequest extends Model {
  @property({
    type: 'string',
    description: ModelPropertyDescriptionString.reqStrPropDesc,
    required: true,
  })
  key: string;

  @property({
    type: 'string',
    description: ModelPropertyDescriptionString.reqStrPropDesc,
    required: true,
  })
  otp: string;

  constructor(data?: Partial<OtpLoginRequest>) {
    super(data);
  }
}
