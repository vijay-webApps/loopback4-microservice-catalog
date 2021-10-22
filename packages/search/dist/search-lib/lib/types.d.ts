import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
export interface ISearchQuery {
    match: string;
    limit: number | null;
    order: string | null;
    limitByType: boolean | null;
    offset: number | null;
    sources: string[] | null;
}
export interface IModel {
    name: string;
    displayName: string;
    imageUrl?: string;
}
export interface IReturnType {
    rank: number;
    source: string;
}
export interface IDefaultReturnType extends IReturnType {
    name: string;
    description: string;
}
export interface ISearchService<T extends IReturnType> {
    searchApiRequest(requestParameters: ISearchQuery, saveInRecents: boolean): Observable<T[]>;
    recentSearchApiRequest?(): Observable<ISearchQuery[]>;
}
export declare const SEARCH_SERVICE_TOKEN: InjectionToken<ISearchService<IReturnType>>;
export declare type RecentSearchEvent = {
    event: KeyboardEvent | Event;
    keyword: string;
    category: 'All' | IModel;
};
export declare type ItemClickedEvent<T> = {
    event: MouseEvent;
    item: T;
};
export declare type TypeEvent = {
    event: Event;
    input: string;
};
export declare const DEFAULT_LIMIT = 20;
export declare const DEFAULT_LIMIT_TYPE = false;
export declare const DEFAULT_ORDER: never[];
export declare const DEBOUNCE_TIME = 1000;
export declare const DEFAULT_OFFSET = 0;
export declare const DEFAULT_SAVE_IN_RECENTS = true;
