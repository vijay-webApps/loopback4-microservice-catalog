import { IDefaultReturnType, IModel } from './types';
export declare class Configuration<T = IDefaultReturnType> {
    /** property to be displayed in the results */
    displayPropertyName: keyof T;
    /** list of model configuration to be render and categorize search results */
    models: IModel[];
    /** max number of results (based on limitByType option) */
    limit?: number;
    /** apply limit on individual models, or on overall results */
    limitByType?: boolean;
    /** apply a particular ordering on results */
    order?: string[];
    /** offset for results in case limit is used */
    offset?: number;
    /** save the search query in recent history */
    saveInRecents?: boolean;
    /** a placeholder to display in the search box */
    placeholder?: string;
    /** categorize results on the basis of models provided */
    categorizeResults?: boolean;
    /** hides the recent search list */
    hideRecentSearch?: boolean;
    /** hide the category selection button */
    hideCategorizeButton?: boolean;
    /** save value in recent search only on enter or change in category, if false, also saved on typing */
    saveInRecentsOnlyOnEnter?: boolean;
    /** search only on enter key or when category is changed */
    searchOnlyOnEnter?: boolean;
    constructor(d: Configuration<T>);
}
