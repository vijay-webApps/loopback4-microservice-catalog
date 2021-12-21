import {Entity, model, property} from '@loopback/repository';
import {IAuthUser} from 'loopback4-authentication';

@model({
  name: 'users',
})
export class User extends Entity implements IAuthUser {
  @property({
    type: 'number',
    id: true,
  })
  id?: number;

  @property({
    type: 'string',
    required: true,
    name: 'first_name',
  })
  firstName: string;

  @property({
    type: 'string',
    name: 'last_name',
  })
  lastName?: string;

  @property({
    type: 'string',
    name: 'middle_name',
  })
  middleName?: string;

  @property({
    type: 'string',
    required: true,
  })
  username: string;

  @property({
    type: 'string',
  })
  email?: string;

  @property({
    type: 'string',
  })
  password?: string;

  constructor(data?: Partial<User>) {
    super(data);
  }
}

export interface UserRelations {
  // describe navigational properties here
}

export type UserWithRelations = User & UserRelations;
