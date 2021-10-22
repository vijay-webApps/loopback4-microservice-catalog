import { Component, EventEmitter, Inject, Input, Output, PLATFORM_ID, ViewChild, } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, tap } from 'rxjs/operators';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { SEARCH_SERVICE_TOKEN, DEBOUNCE_TIME, DEFAULT_LIMIT, DEFAULT_LIMIT_TYPE, DEFAULT_OFFSET, DEFAULT_SAVE_IN_RECENTS, DEFAULT_ORDER, } from '../types';
import { isPlatformBrowser } from '@angular/common';
export class SearchComponent {
    constructor(searchService, platformId) {
        this.searchService = searchService;
        this.platformId = platformId;
        this.searchBoxInput = '';
        this.suggestionsDisplay = false;
        this.categoryDisplay = false;
        this.suggestions = [];
        this.relevantSuggestions = [];
        this.recentSearches = [];
        this.category = 'All';
        this.observableForSearchRequest = new Subject();
        // emitted when user clicks one of the suggested results (including recent search sugestions)
        this.clicked = new EventEmitter();
        this.searched = new EventEmitter();
        this.disabled = false;
    }
    ngOnInit() {
        this.observableForSearchRequest
            .pipe(tap(v => (this.suggestions = [])), debounceTime(DEBOUNCE_TIME))
            .subscribe((value) => {
            this.searched.emit({
                event: value.event,
                keyword: value.input,
                category: this.category,
            });
            this.getSuggestions(value);
        });
    }
    // ControlValueAccessor Implementation
    writeValue(value) {
        this.searchBoxInput = value;
    }
    // When the value in the UI is changed, this method will invoke a callback function
    registerOnChange(fn) {
        this.onChange = fn;
    }
    registerOnTouched(fn) {
        this.onTouched = fn;
    }
    setDisabledState(isDisabled) {
        this.disabled = isDisabled;
    }
    getSuggestions(eventValue) {
        var _a, _b, _c, _d, _e;
        const order = (_a = this.config.order) !== null && _a !== void 0 ? _a : DEFAULT_ORDER;
        let orderString = '';
        order.forEach(preference => (orderString = `${orderString}${preference} `));
        let saveInRecents = (_b = this.config.saveInRecents) !== null && _b !== void 0 ? _b : DEFAULT_SAVE_IN_RECENTS;
        if (this.config.saveInRecents && this.config.saveInRecentsOnlyOnEnter) {
            if ((eventValue.event instanceof KeyboardEvent &&
                eventValue.event.key === 'Enter') ||
                (eventValue.event instanceof Event &&
                    eventValue.event.type === 'change')) {
                saveInRecents = true; // save in recents only on enter or change in category
            }
            else {
                // do not save in recent search on typing
                saveInRecents = false;
            }
        }
        /* need to put default value here and not in contructor
        because sonar was giving code smell with definite assertion as all these parameters are optional */
        const requestParameters = {
            match: eventValue.input,
            sources: this._categoryToSourceName(this.category),
            limit: (_c = this.config.limit) !== null && _c !== void 0 ? _c : DEFAULT_LIMIT,
            limitByType: (_d = this.config.limitByType) !== null && _d !== void 0 ? _d : DEFAULT_LIMIT_TYPE,
            order: orderString,
            offset: (_e = this.config.offset) !== null && _e !== void 0 ? _e : DEFAULT_OFFSET,
        };
        this.searchService
            .searchApiRequest(requestParameters, saveInRecents)
            .subscribe((value) => {
            this.suggestions = value;
        }, (_error) => {
            this.suggestions = [];
        });
    }
    getRecentSearches() {
        if (!this.config.hideRecentSearch &&
            this.searchService.recentSearchApiRequest) {
            this.searchService.recentSearchApiRequest().subscribe((value) => {
                this.recentSearches = value;
            }, (_error) => {
                this.recentSearches = [];
            });
        }
    }
    // event can be KeyBoardEvent or Event of type 'change' fired on change in value of drop down for category
    hitSearchApi(event) {
        // this will happen only in case user searches something and then erases it, we need to update recent search
        if (!this.searchBoxInput) {
            this.suggestions = [];
            this.getRecentSearches();
            return;
        }
        // no debounce time needed in case of searchOnlyOnEnter
        if (this.config.searchOnlyOnEnter) {
            if ((event instanceof KeyboardEvent && event.key === 'Enter') ||
                (event instanceof Event && event.type === 'change')) {
                this.getSuggestions({ input: this.searchBoxInput, event });
            }
            return;
        }
        // no debounce time needed in case of change in category
        if (event instanceof KeyboardEvent === false && event.type === 'change') {
            this.getSuggestions({ input: this.searchBoxInput, event });
            return;
        }
        this.observableForSearchRequest.next({
            input: this.searchBoxInput,
            event,
        });
    }
    populateValue(suggestion, event) {
        const value = suggestion[this.config.displayPropertyName]; // converted to string to assign value to searchBoxInput
        this.searchBoxInput = value;
        this.suggestionsDisplay = false;
        // ngModelChange doesn't detect change in value when populated from outside, hence calling manually
        this.onChange(this.searchBoxInput);
        // need to do this to show more search options for selected suggestion - just in case user reopens search input
        this.getSuggestions({ input: this.searchBoxInput, event });
        this.clicked.emit({ item: suggestion, event });
    }
    populateValueRecentSearch(recentSearch, event) {
        event.stopPropagation();
        event.preventDefault();
        const value = recentSearch['match'];
        this.searchBoxInput = value;
        this.suggestionsDisplay = false;
        this.onChange(this.searchBoxInput);
        // need to do this to show more search options for selected suggestion - just in case user reopens search input
        this.getSuggestions({ input: this.searchBoxInput, event });
        this.focusInput();
        this.showSuggestions();
    }
    fetchModelImageUrlFromSuggestion(suggestion) {
        const modelName = suggestion['source'];
        let url;
        this.config.models.forEach((model, i) => {
            if (model.name === modelName && model.imageUrl) {
                url = model.imageUrl;
            }
        });
        return url;
    }
    // also returns true if there are any suggestions related to the model
    getSuggestionsFromModelName(modelName) {
        this.relevantSuggestions = [];
        this.suggestions.forEach(suggestion => {
            const sourceModelName = suggestion['source'];
            if (sourceModelName === modelName) {
                this.relevantSuggestions.push(suggestion);
            }
        });
        if (this.relevantSuggestions.length) {
            return true;
        }
        else {
            return false;
        }
    }
    boldString(str, substr) {
        const strRegExp = new RegExp(`(${substr})`, 'gi');
        const stringToMakeBold = str;
        return stringToMakeBold.replace(strRegExp, `<b>$1</b>`);
    }
    hideSuggestions() {
        this.suggestionsDisplay = false;
        this.onTouched();
    }
    showSuggestions() {
        this.suggestionsDisplay = true;
        this.getRecentSearches();
    }
    focusInput() {
        if (isPlatformBrowser(this.platformId)) {
            this.searchInputElement.nativeElement.focus();
        }
    }
    setCategory(category, event) {
        this.category = category;
        this.categoryDisplay = false;
        if (this.searchBoxInput) {
            this.hitSearchApi(event);
            this.focusInput();
            this.showSuggestions();
        }
    }
    showCategory() {
        this.categoryDisplay = !this.categoryDisplay;
    }
    hideCategory() {
        this.categoryDisplay = false;
    }
    resetInput() {
        this.searchBoxInput = '';
        this.suggestionsDisplay = true;
        this.focusInput();
        // ngModelChange doesn't detect change in value when populated from outside, hence calling manually
        this.onChange(this.searchBoxInput);
        this.getRecentSearches();
    }
    ngOnDestroy() {
        this.observableForSearchRequest.unsubscribe();
    }
    _categoryToSourceName(category) {
        if (category === 'All') {
            return [];
        }
        else {
            return [category.name];
        }
    }
}
SearchComponent.decorators = [
    { type: Component, args: [{
                selector: 'sourceloop-search',
                template: "<div\n  class=\"search-container\"\n  [ngClass]=\"suggestionsDisplay ? 'search-focus-in' : 'search-focus-out'\"\n>\n  <form>\n    <div class=\"flex-box align-items-center justify-content-between\">\n      <div class=\"search-column-left\">\n        <div class=\"flex-box align-items-center justify-content-between\">\n          <svg\n            width=\"16\"\n            height=\"16\"\n            viewBox=\"0 0 16 16\"\n            fill=\"none\"\n            xmlns=\"http://www.w3.org/2000/svg\"\n          >\n            <path\n              fill-rule=\"evenodd\"\n              clip-rule=\"evenodd\"\n              d=\"M2 6.5C2 8.981 4.0185 11 6.5 11C8.981 11 11 8.981 11 6.5C11 4.0185 8.981 2 6.5 2C4.0185 2 2 4.0185 2 6.5ZM1 6.5C1 3.4625 3.4625 1 6.5 1C9.5375 1 12 3.4625 12 6.5C12 9.5375 9.5375 12 6.5 12C3.4625 12 1 9.5375 1 6.5ZM10.7236 11.4306C10.9771 11.2131 11.2131 10.9771 11.4306 10.7236L15.0001 14.2926L14.2931 15.0001L10.7236 11.4306Z\"\n              fill=\"#9C9C9C\"\n            />\n          </svg>\n          <input\n            class=\"search-input\"\n            autocomplete=\"off\"\n            type=\"text\"\n            [placeholder]=\"config.placeholder\"\n            #searchInput\n            name=\"searchInput\"\n            (focus)=\"showSuggestions()\"\n            (blur)=\"hideSuggestions()\"\n            [(ngModel)]=\"searchBoxInput\"\n            (keyup)=\"hitSearchApi($event)\"\n            placeholder=\"Search\"\n            (ngModelChange)=\"onChange(this.searchBoxInput)\"\n            [disabled]=\"disabled\"\n          />\n        </div>\n      </div>\n      <div class=\"search-column-right\">\n        <button\n          *ngIf=\"searchBoxInput\"\n          type=\"button\"\n          class=\"clear-button\"\n          id=\"clear-button\"\n          (click)=\"resetInput()\"\n        >\n          Clear x\n        </button>\n        <ng-container *ngIf=\"!config.hideCategorizeButton\">\n          <button class=\"category-button\" (click)=\"showCategory()\">\n            {{ category !== 'All' ? category.displayName : category }}\n            <svg height=\"14\" viewBox=\"0 0 14 14\" width=\"14\">\n              <polygon\n                [attr.points]=\"\n                  categoryDisplay\n                    ? '0,14 7,6, 14,14, 7,6, 0,14'\n                    : '0,6 7,14, 14,6, 7,14, 0,6'\n                \"\n                style=\"stroke: 'inherit'; fill: 'inherit'\"\n              ></polygon>\n            </svg>\n          </button>\n          <ng-container *ngIf=\"categoryDisplay\">\n            <div class=\"category-overlay\" (click)=\"hideCategory()\"></div>\n            <div class=\"category-popup\">\n              <ul>\n                <li (click)=\"setCategory('All', $event)\" class=\"category\">\n                  All\n                </li>\n                <li\n                  *ngFor=\"let model of config.models\"\n                  (click)=\"setCategory(model, $event)\"\n                  class=\"category\"\n                >\n                  {{ model.displayName }}\n                </li>\n              </ul>\n            </div>\n          </ng-container>\n        </ng-container>\n      </div>\n    </div>\n  </form>\n\n  <div *ngIf=\"suggestionsDisplay\" class=\"search-popup\">\n    <ng-container *ngIf=\"config.categorizeResults\">\n      <div class=\"search-item-info\" *ngIf=\"category === 'All'\">\n        You are searching on {{ category }}\n      </div>\n      <div class=\"search-item-info\" *ngIf=\"category !== 'All'\">\n        You are searching on {{ category.displayName }}\n      </div>\n    </ng-container>\n    <ng-container *ngIf=\"searchBoxInput\">\n      <ng-container *ngIf=\"config.categorizeResults\">\n        <div class=\"search-result\" *ngFor=\"let model of config.models\">\n          <h3\n            *ngIf=\"getSuggestionsFromModelName(model.name)\"\n            class=\"suggestions-heading\"\n          >\n            <img\n              *ngIf=\"model.imageUrl\"\n              [src]=\"model.imageUrl\"\n              [alt]=\"model.displayName\"\n            />\n            {{ model.displayName }}({{ relevantSuggestions?.length }})\n          </h3>\n          <ul>\n            <li\n              *ngFor=\"let suggestion of relevantSuggestions\"\n              (mousedown)=\"populateValue(suggestion, $event)\"\n              class=\"suggestions\"\n              [innerHTML]=\"\n                boldString(\n                  suggestion[config.displayPropertyName],\n                  searchBoxInput\n                )\n              \"\n            ></li>\n          </ul>\n        </div>\n      </ng-container>\n      <ng-container *ngIf=\"!config.categorizeResults\">\n        <div class=\"search-result\">\n          <ul>\n            <li\n              *ngFor=\"let suggestion of suggestions\"\n              (mousedown)=\"populateValue(suggestion, $event)\"\n            >\n              <!--Need to call fetchModelImageUrlFromSuggestion as each suggestion can come from different model-->\n              <img\n                *ngIf=\"fetchModelImageUrlFromSuggestion(suggestion)\"\n                class=\"suggestions-categorize-false\"\n                [src]=\"fetchModelImageUrlFromSuggestion(suggestion)\"\n                style=\"margin-right: 5px\"\n                alt=\"Img\"\n              />\n              <p\n                [innerHTML]=\"\n                  boldString(\n                    suggestion[config.displayPropertyName],\n                    searchBoxInput\n                  )\n                \"\n                style=\"display: inline\"\n              ></p>\n            </li>\n          </ul>\n        </div>\n      </ng-container>\n    </ng-container>\n\n    <ng-container *ngIf=\"!config.hideRecentSearch && recentSearches.length > 0\">\n      <div class=\"recent-searches\">\n        <h3 class=\"suggestions-heading\">Recent Searches</h3>\n        <ul>\n          <li\n            *ngFor=\"let recentSearch of recentSearches\"\n            class=\"suggestions\"\n            (mousedown)=\"populateValueRecentSearch(recentSearch, $event)\"\n          >\n            <svg\n              width=\"16\"\n              height=\"16\"\n              viewBox=\"0 0 16 16\"\n              fill=\"none\"\n              xmlns=\"http://www.w3.org/2000/svg\"\n            >\n              <path\n                fill-rule=\"evenodd\"\n                clip-rule=\"evenodd\"\n                d=\"M2 6.5C2 8.981 4.0185 11 6.5 11C8.981 11 11 8.981 11 6.5C11 4.0185 8.981 2 6.5 2C4.0185 2 2 4.0185 2 6.5ZM1 6.5C1 3.4625 3.4625 1 6.5 1C9.5375 1 12 3.4625 12 6.5C12 9.5375 9.5375 12 6.5 12C3.4625 12 1 9.5375 1 6.5ZM10.7236 11.4306C10.9771 11.2131 11.2131 10.9771 11.4306 10.7236L15.0001 14.2926L14.2931 15.0001L10.7236 11.4306Z\"\n                fill=\"#9C9C9C\"\n              />\n            </svg>\n            <span>{{ recentSearch.match }}</span>\n          </li>\n        </ul>\n      </div>\n    </ng-container>\n  </div>\n</div>\n",
                providers: [
                    {
                        provide: NG_VALUE_ACCESSOR,
                        useExisting: SearchComponent,
                        multi: true,
                    },
                ],
                styles: [".search-container{border:1px solid transparent;border-radius:4px;background-color:#f7f7f7;padding:0 15px;position:relative;width:inherit}.search-container:hover{outline:2px solid #91263b}.search-container:hover.search-focus-in{outline:none}.search-container.search-focus-in{outline:none;box-shadow:0 0 4px #0003;background-color:#fff;border-bottom:0;border-radius:4px 4px 0 0}.search-container.search-focus-in:hover{outline:0}.search-container .flex-box{display:flex}.search-container .align-items-center{align-items:center}.search-container .justify-content-between{justify-content:space-between}.search-container .search-column-left{flex-direction:column;width:100%}.search-container .search-column-right{flex-direction:column;text-align:right}.search-container .search-column-right select{border:0;outline:0;width:60px;background-color:transparent;margin-left:10px;font-size:12px;color:#333;border-left:1px solid #d1d1d1;padding-left:4px}.search-container .search-symbol{color:#d1d1d1;font-size:12px;display:inline-block}.search-container .search-input{padding:0 .75rem;font-size:14px;font-weight:400;line-height:1.5;color:#333;background-color:transparent;border:0;border-radius:0;width:100%;box-sizing:border-box;height:38px;display:inline-block}.search-container .search-input::-moz-placeholder{color:#d1d1d1}.search-container .search-input:-ms-input-placeholder{color:#d1d1d1}.search-container .search-input::placeholder{color:#d1d1d1}.search-container .search-input:focus{outline:none}.search-container .clear-button{background-color:transparent;border:0 solid #ced4da;color:#d1d1d1;font-size:12px;cursor:pointer}.search-container .clear-button span{display:inline-block;margin-left:5px;font-size:14px}.search-container .category-button{padding:0 .75rem;font-size:14px;font-weight:400;line-height:1.5;color:#d1d1d1;cursor:pointer;border:none;background:transparent;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}.search-container .category-button svg{stroke:#d1d1d1}.search-container .category-overlay{top:0;left:0;position:fixed;z-index:9998;background-color:transparent;width:100%;height:100%}.search-container .category-popup{overflow-x:hidden;overflow-y:auto;position:absolute;top:100%;right:0px;z-index:9999;background-color:#fff;box-shadow:0 5px 4px #0003;border-radius:0 0 4px 4px;width:-webkit-max-content;width:-moz-max-content;width:max-content;font-size:11.2px!important}.search-container .category-popup ul{padding:0;margin:0}.search-container .category-popup ul li{list-style:none;font-size:1rem;font-weight:400;line-height:1.5;color:#333;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}.search-container .category-popup ul li.category{align-items:center;display:flex;cursor:pointer;padding:0 16px;border-bottom:1px solid #f2f2f2;font-family:\"Rakuten Sans\",sans-serif;font-size:12.8px;line-height:32px;letter-spacing:0px;text-align:left}.search-container .category-popup ul li.category:hover{background-color:#fee8e8}.search-container .category-popup ul li.category svg{margin-right:5px}.search-container .category-popup ul li.suggestions-categorize-false:hover{background-color:#fee8e8}.search-container .search-popup{padding:0 15px 15px;margin:0;max-height:80vh;overflow-x:hidden;overflow-y:auto;position:absolute;top:calc(100% - 2px);left:-1px;right:-1px;z-index:9999;background-color:#fff;box-shadow:0 5px 4px #0003;border-radius:0 0 4px 4px}.search-container .search-popup hr{border:0;border-top:1px solid #ebebeb;margin:0;position:-webkit-sticky;position:sticky;top:0;padding:0 0 15px;z-index:1}.search-container .search-popup .search-item-info{color:#91263b;text-align:center;font-size:12px;margin-bottom:15px}.search-container .search-popup ul{padding:0;margin:0}.search-container .search-popup ul li{list-style:none;font-size:1rem;font-weight:400;line-height:1.5;color:#333}.search-container .search-popup ul li.suggestions{font-size:15px;line-height:36px;padding:0 15px 0 44px;align-items:center;display:flex;cursor:pointer}.search-container .search-popup ul li.suggestions:hover{background-color:#fee8e8}.search-container .search-popup ul li.suggestions svg{margin-right:5px}.search-container .search-popup ul li.suggestions-categorize-false:hover{background-color:#fee8e8}.search-container .search-popup .search-result{padding:10px 0 0;margin:0 -15px}.search-container .search-popup .search-result.no-categorize-result ul{width:100%;padding:0;margin:0 0 10px}.search-container .search-popup .search-result.no-categorize-result ul li{font-size:15px;line-height:36px;padding:0 15px 0 31px;display:flex;align-items:center;cursor:pointer}.search-container .search-popup .search-result.no-categorize-result ul li:hover{background-color:#fee8e8}.search-container .search-popup .search-result.no-categorize-result ul li img{width:18px;margin-right:9px}.search-container .search-popup .suggestions-heading{color:#9c9c9c;font-size:14px;font-weight:normal;margin:0 0 10px 17px;display:flex;align-items:center;position:relative}.search-container .search-popup .suggestions-heading .show-more{position:absolute;right:20px;color:#d1d1d1;font-size:12px;cursor:pointer;text-decoration:none}.search-container .search-popup .suggestions-heading .show-more :hover{text-decoration:underline}.search-container .search-popup .suggestions-heading img{width:18px;margin-right:9px}.search-container .search-popup .recent-searches{padding:10px 0 0;margin:0 -15px}.search-container .search-popup .recent-searches .suggestions-heading{margin-left:30px}.search-container .search-popup .recent-searches li.suggestions{padding-left:31px}\n"]
            },] }
];
SearchComponent.ctorParameters = () => [
    { type: undefined, decorators: [{ type: Inject, args: [SEARCH_SERVICE_TOKEN,] }] },
    { type: Object, decorators: [{ type: Inject, args: [PLATFORM_ID,] }] }
];
SearchComponent.propDecorators = {
    config: [{ type: Input }],
    clicked: [{ type: Output }],
    searched: [{ type: Output }],
    searchInputElement: [{ type: ViewChild, args: ['searchInput',] }]
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoLmNvbXBvbmVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3Byb2plY3RzL3NlYXJjaC1saWIvc3JjL2xpYi9zZWFyY2gvc2VhcmNoLmNvbXBvbmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQ0wsU0FBUyxFQUVULFlBQVksRUFDWixNQUFNLEVBQ04sS0FBSyxFQUdMLE1BQU0sRUFDTixXQUFXLEVBQ1gsU0FBUyxHQUNWLE1BQU0sZUFBZSxDQUFDO0FBRXZCLE9BQU8sRUFBQyxPQUFPLEVBQUMsTUFBTSxNQUFNLENBQUM7QUFDN0IsT0FBTyxFQUFDLFlBQVksRUFBRSxHQUFHLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUNqRCxPQUFPLEVBQXVCLGlCQUFpQixFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDdkUsT0FBTyxFQUlMLG9CQUFvQixFQUNwQixhQUFhLEVBQ2IsYUFBYSxFQUNiLGtCQUFrQixFQUNsQixjQUFjLEVBQ2QsdUJBQXVCLEVBQ3ZCLGFBQWEsR0FLZCxNQUFNLFVBQVUsQ0FBQztBQUNsQixPQUFPLEVBQUMsaUJBQWlCLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQWNsRCxNQUFNLE9BQU8sZUFBZTtJQXdCMUIsWUFFbUIsYUFBZ0MsRUFDWCxVQUFrQjtRQUR2QyxrQkFBYSxHQUFiLGFBQWEsQ0FBbUI7UUFDWCxlQUFVLEdBQVYsVUFBVSxDQUFRO1FBeEIxRCxtQkFBYyxHQUFHLEVBQUUsQ0FBQztRQUNwQix1QkFBa0IsR0FBRyxLQUFLLENBQUM7UUFDM0Isb0JBQWUsR0FBRyxLQUFLLENBQUM7UUFDeEIsZ0JBQVcsR0FBUSxFQUFFLENBQUM7UUFDdEIsd0JBQW1CLEdBQVEsRUFBRSxDQUFDO1FBQzlCLG1CQUFjLEdBQW1CLEVBQUUsQ0FBQztRQUNwQyxhQUFRLEdBQW1CLEtBQUssQ0FBQztRQUNqQywrQkFBMEIsR0FBRyxJQUFJLE9BQU8sRUFBaUMsQ0FBQztRQUUx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XG4gIEVsZW1lbnRSZWYsXG4gIEV2ZW50RW1pdHRlcixcbiAgSW5qZWN0LFxuICBJbnB1dCxcbiAgT25EZXN0cm95LFxuICBPbkluaXQsXG4gIE91dHB1dCxcbiAgUExBVEZPUk1fSUQsXG4gIFZpZXdDaGlsZCxcbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge0NvbmZpZ3VyYXRpb259IGZyb20gJy4uL2xpYi1jb25maWd1cmF0aW9uJztcbmltcG9ydCB7U3ViamVjdH0gZnJvbSAncnhqcyc7XG5pbXBvcnQge2RlYm91bmNlVGltZSwgdGFwfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQge0NvbnRyb2xWYWx1ZUFjY2Vzc29yLCBOR19WQUxVRV9BQ0NFU1NPUn0gZnJvbSAnQGFuZ3VsYXIvZm9ybXMnO1xuaW1wb3J0IHtcbiAgSVNlYXJjaFNlcnZpY2UsXG4gIElNb2RlbCxcbiAgSVNlYXJjaFF1ZXJ5LFxuICBTRUFSQ0hfU0VSVklDRV9UT0tFTixcbiAgREVCT1VOQ0VfVElNRSxcbiAgREVGQVVMVF9MSU1JVCxcbiAgREVGQVVMVF9MSU1JVF9UWVBFLFxuICBERUZBVUxUX09GRlNFVCxcbiAgREVGQVVMVF9TQVZFX0lOX1JFQ0VOVFMsXG4gIERFRkFVTFRfT1JERVIsXG4gIElSZXR1cm5UeXBlLFxuICBSZWNlbnRTZWFyY2hFdmVudCxcbiAgVHlwZUV2ZW50LFxuICBJdGVtQ2xpY2tlZEV2ZW50LFxufSBmcm9tICcuLi90eXBlcyc7XG5pbXBvcnQge2lzUGxhdGZvcm1Ccm93c2VyfSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuXG5AQ29tcG9uZW50KHtcbiAgc2VsZWN0b3I6ICdzb3VyY2Vsb29wLXNlYXJjaCcsXG4gIHRlbXBsYXRlVXJsOiAnLi9zZWFyY2guY29tcG9uZW50Lmh0bWwnLFxuICBzdHlsZVVybHM6IFsnLi9zZWFyY2guY29tcG9uZW50LnNjc3MnXSxcbiAgcHJvdmlkZXJzOiBbXG4gICAge1xuICAgICAgcHJvdmlkZTogTkdfVkFMVUVfQUNDRVNTT1IsXG4gICAgICB1c2VFeGlzdGluZzogU2VhcmNoQ29tcG9uZW50LFxuICAgICAgbXVsdGk6IHRydWUsXG4gICAgfSxcbiAgXSxcbn0pXG5leHBvcnQgY2xhc3MgU2VhcmNoQ29tcG9uZW50PFQgZXh0ZW5kcyBJUmV0dXJuVHlwZT5cbiAgaW1wbGVtZW50cyBPbkluaXQsIE9uRGVzdHJveSwgQ29udHJvbFZhbHVlQWNjZXNzb3JcbntcbiAgc2VhcmNoQm94SW5wdXQgPSAnJztcbiAgc3VnZ2VzdGlvbnNEaXNwbGF5ID0gZmFsc2U7XG4gIGNhdGVnb3J5RGlzcGxheSA9IGZhbHNlO1xuICBzdWdnZXN0aW9uczogVFtdID0gW107XG4gIHJlbGV2YW50U3VnZ2VzdGlvbnM6IFRbXSA9IFtdO1xuICByZWNlbnRTZWFyY2hlczogSVNlYXJjaFF1ZXJ5W10gPSBbXTtcbiAgY2F0ZWdvcnk6IElNb2RlbCB8ICdBbGwnID0gJ0FsbCc7XG4gIG9ic2VydmFibGVGb3JTZWFyY2hSZXF1ZXN0ID0gbmV3IFN1YmplY3Q8e2lucHV0OiBzdHJpbmc7IGV2ZW50OiBFdmVudH0+KCk7XG4gIEBJbnB1dCgpIGNvbmZpZyE6IENvbmZpZ3VyYXRpb248VD47XG4gIC8vIGVtaXR0ZWQgd2hlbiB1c2VyIGNsaWNrcyBvbmUgb2YgdGhlIHN1Z2dlc3RlZCByZXN1bHRzIChpbmNsdWRpbmcgcmVjZW50IHNlYXJjaCBzdWdlc3Rpb25zKVxuICBAT3V0cHV0KCkgY2xpY2tlZCA9IG5ldyBFdmVudEVtaXR0ZXI8SXRlbUNsaWNrZWRFdmVudDxUPj4oKTtcbiAgQE91dHB1dCgpIHNlYXJjaGVkID0gbmV3IEV2ZW50RW1pdHRlcjxSZWNlbnRTZWFyY2hFdmVudD4oKTtcbiAgLyogZW1pdHRlZCB3aGVuIHVzZXIgbWFrZXMgc2VhcmNoIHJlcXVlc3QgKGluY2x1ZGluZyByZWNlbnQgc2VhcmNoIHJlcXVlc3RzICYgcmVxdWVzdHMgbWFkZSBvbiBjaGFuZ2UgaW4gY2F0ZWdvcnkgZnJvbSBkcm9wZG93bilcbiAgSW4gY2FzZSBvZiByZWNlbnQgc2VhcmNoIEFycmF5IG9mIHJlY2VudCBTZWFyY2ggcmVxdWVzdCByZXN1bHQgaXMgZW1pdHRlZCAqL1xuXG4gIG9uQ2hhbmdlITogKHZhbHVlOiBzdHJpbmcgfCB1bmRlZmluZWQpID0+IHZvaWQ7XG4gIG9uVG91Y2hlZCE6ICgpID0+IHZvaWQ7XG4gIGRpc2FibGVkID0gZmFsc2U7XG5cbiAgQFZpZXdDaGlsZCgnc2VhcmNoSW5wdXQnKSBwdWJsaWMgc2VhcmNoSW5wdXRFbGVtZW50ITogRWxlbWVudFJlZjtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBASW5qZWN0KFNFQVJDSF9TRVJWSUNFX1RPS0VOKVxuICAgIHByaXZhdGUgcmVhZG9ubHkgc2VhcmNoU2VydmljZTogSVNlYXJjaFNlcnZpY2U8VD4sXG4gICAgQEluamVjdChQTEFURk9STV9JRCkgcHJpdmF0ZSByZWFkb25seSBwbGF0Zm9ybUlkOiBvYmplY3QsXG4gICkge31cblxuICBuZ09uSW5pdCgpOiB2b2lkIHtcbiAgICB0aGlzLm9ic2VydmFibGVGb3JTZWFyY2hSZXF1ZXN0XG4gICAgICAucGlwZShcbiAgICAgICAgdGFwKHYgPT4gKHRoaXMuc3VnZ2VzdGlvbnMgPSBbXSkpLFxuICAgICAgICBkZWJvdW5jZVRpbWUoREVCT1VOQ0VfVElNRSksXG4gICAgICApXG4gICAgICAuc3Vic2NyaWJlKCh2YWx1ZTogVHlwZUV2ZW50KSA9PiB7XG4gICAgICAgIHRoaXMuc2VhcmNoZWQuZW1pdCh7XG4gICAgICAgICAgZXZlbnQ6IHZhbHVlLmV2ZW50LFxuICAgICAgICAgIGtleXdvcmQ6IHZhbHVlLmlucHV0LFxuICAgICAgICAgIGNhdGVnb3J5OiB0aGlzLmNhdGVnb3J5LFxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5nZXRTdWdnZXN0aW9ucyh2YWx1ZSk7XG4gICAgICB9KTtcbiAgfVxuXG4gIC8vIENvbnRyb2xWYWx1ZUFjY2Vzc29yIEltcGxlbWVudGF0aW9uXG4gIHdyaXRlVmFsdWUodmFsdWU6IHN0cmluZyk6IHZvaWQge1xuICAgIHRoaXMuc2VhcmNoQm94SW5wdXQgPSB2YWx1ZTtcbiAgfVxuICAvLyBXaGVuIHRoZSB2YWx1ZSBpbiB0aGUgVUkgaXMgY2hhbmdlZCwgdGhpcyBtZXRob2Qgd2lsbCBpbnZva2UgYSBjYWxsYmFjayBmdW5jdGlvblxuICByZWdpc3Rlck9uQ2hhbmdlKGZuOiAodmFsdWU6IHN0cmluZyB8IHVuZGVmaW5lZCkgPT4gdm9pZCk6IHZvaWQge1xuICAgIHRoaXMub25DaGFuZ2UgPSBmbjtcbiAgfVxuICByZWdpc3Rlck9uVG91Y2hlZChmbjogKCkgPT4gdm9pZCk6IHZvaWQge1xuICAgIHRoaXMub25Ub3VjaGVkID0gZm47XG4gIH1cbiAgc2V0RGlzYWJsZWRTdGF0ZT8oaXNEaXNhYmxlZDogYm9vbGVhbik6IHZvaWQge1xuICAgIHRoaXMuZGlzYWJsZWQgPSBpc0Rpc2FibGVkO1xuICB9XG5cbiAgZ2V0U3VnZ2VzdGlvbnMoZXZlbnRWYWx1ZTogVHlwZUV2ZW50KSB7XG4gICAgY29uc3Qgb3JkZXIgPSB0aGlzLmNvbmZpZy5vcmRlciA/PyBERUZBVUxUX09SREVSO1xuICAgIGxldCBvcmRlclN0cmluZyA9ICcnO1xuICAgIG9yZGVyLmZvckVhY2gocHJlZmVyZW5jZSA9PiAob3JkZXJTdHJpbmcgPSBgJHtvcmRlclN0cmluZ30ke3ByZWZlcmVuY2V9IGApKTtcblxuICAgIGxldCBzYXZlSW5SZWNlbnRzID0gdGhpcy5jb25maWcuc2F2ZUluUmVjZW50cyA/PyBERUZBVUxUX1NBVkVfSU5fUkVDRU5UUztcbiAgICBpZiAodGhpcy5jb25maWcuc2F2ZUluUmVjZW50cyAmJiB0aGlzLmNvbmZpZy5zYXZlSW5SZWNlbnRzT25seU9uRW50ZXIpIHtcbiAgICAgIGlmIChcbiAgICAgICAgKGV2ZW50VmFsdWUuZXZlbnQgaW5zdGFuY2VvZiBLZXlib2FyZEV2ZW50ICYmXG4gICAgICAgICAgZXZlbnRWYWx1ZS5ldmVudC5rZXkgPT09ICdFbnRlcicpIHx8XG4gICAgICAgIChldmVudFZhbHVlLmV2ZW50IGluc3RhbmNlb2YgRXZlbnQgJiZcbiAgICAgICAgICBldmVudFZhbHVlLmV2ZW50LnR5cGUgPT09ICdjaGFuZ2UnKVxuICAgICAgKSB7XG4gICAgICAgIHNhdmVJblJlY2VudHMgPSB0cnVlOyAvLyBzYXZlIGluIHJlY2VudHMgb25seSBvbiBlbnRlciBvciBjaGFuZ2UgaW4gY2F0ZWdvcnlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGRvIG5vdCBzYXZlIGluIHJlY2VudCBzZWFyY2ggb24gdHlwaW5nXG4gICAgICAgIHNhdmVJblJlY2VudHMgPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gICAgLyogbmVlZCB0byBwdXQgZGVmYXVsdCB2YWx1ZSBoZXJlIGFuZCBub3QgaW4gY29udHJ1Y3RvclxuICAgIGJlY2F1c2Ugc29uYXIgd2FzIGdpdmluZyBjb2RlIHNtZWxsIHdpdGggZGVmaW5pdGUgYXNzZXJ0aW9uIGFzIGFsbCB0aGVzZSBwYXJhbWV0ZXJzIGFyZSBvcHRpb25hbCAqL1xuICAgIGNvbnN0IHJlcXVlc3RQYXJhbWV0ZXJzOiBJU2VhcmNoUXVlcnkgPSB7XG4gICAgICBtYXRjaDogZXZlbnRWYWx1ZS5pbnB1dCxcbiAgICAgIHNvdXJjZXM6IHRoaXMuX2NhdGVnb3J5VG9Tb3VyY2VOYW1lKHRoaXMuY2F0ZWdvcnkpLFxuICAgICAgbGltaXQ6IHRoaXMuY29uZmlnLmxpbWl0ID8/IERFRkFVTFRfTElNSVQsXG4gICAgICBsaW1pdEJ5VHlwZTogdGhpcy5jb25maWcubGltaXRCeVR5cGUgPz8gREVGQVVMVF9MSU1JVF9UWVBFLFxuICAgICAgb3JkZXI6IG9yZGVyU3RyaW5nLFxuICAgICAgb2Zmc2V0OiB0aGlzLmNvbmZpZy5vZmZzZXQgPz8gREVGQVVMVF9PRkZTRVQsXG4gICAgfTtcblxuICAgIHRoaXMuc2VhcmNoU2VydmljZVxuICAgICAgLnNlYXJjaEFwaVJlcXVlc3QocmVxdWVzdFBhcmFtZXRlcnMsIHNhdmVJblJlY2VudHMpXG4gICAgICAuc3Vic2NyaWJlKFxuICAgICAgICAodmFsdWU6IFRbXSkgPT4ge1xuICAgICAgICAgIHRoaXMuc3VnZ2VzdGlvbnMgPSB2YWx1ZTtcbiAgICAgICAgfSxcbiAgICAgICAgKF9lcnJvcjogRXJyb3IpID0+IHtcbiAgICAgICAgICB0aGlzLnN1Z2dlc3Rpb25zID0gW107XG4gICAgICAgIH0sXG4gICAgICApO1xuICB9XG4gIGdldFJlY2VudFNlYXJjaGVzKCkge1xuICAgIGlmIChcbiAgICAgICF0aGlzLmNvbmZpZy5oaWRlUmVjZW50U2VhcmNoICYmXG4gICAgICB0aGlzLnNlYXJjaFNlcnZpY2UucmVjZW50U2VhcmNoQXBpUmVxdWVzdFxuICAgICkge1xuICAgICAgdGhpcy5zZWFyY2hTZXJ2aWNlLnJlY2VudFNlYXJjaEFwaVJlcXVlc3QoKS5zdWJzY3JpYmUoXG4gICAgICAgICh2YWx1ZTogSVNlYXJjaFF1ZXJ5W10pID0+IHtcbiAgICAgICAgICB0aGlzLnJlY2VudFNlYXJjaGVzID0gdmFsdWU7XG4gICAgICAgIH0sXG4gICAgICAgIChfZXJyb3I6IEVycm9yKSA9PiB7XG4gICAgICAgICAgdGhpcy5yZWNlbnRTZWFyY2hlcyA9IFtdO1xuICAgICAgICB9LFxuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICAvLyBldmVudCBjYW4gYmUgS2V5Qm9hcmRFdmVudCBvciBFdmVudCBvZiB0eXBlICdjaGFuZ2UnIGZpcmVkIG9uIGNoYW5nZSBpbiB2YWx1ZSBvZiBkcm9wIGRvd24gZm9yIGNhdGVnb3J5XG4gIGhpdFNlYXJjaEFwaShldmVudDogRXZlbnQpIHtcbiAgICAvLyB0aGlzIHdpbGwgaGFwcGVuIG9ubHkgaW4gY2FzZSB1c2VyIHNlYXJjaGVzIHNvbWV0aGluZyBhbmQgdGhlbiBlcmFzZXMgaXQsIHdlIG5lZWQgdG8gdXBkYXRlIHJlY2VudCBzZWFyY2hcbiAgICBpZiAoIXRoaXMuc2VhcmNoQm94SW5wdXQpIHtcbiAgICAgIHRoaXMuc3VnZ2VzdGlvbnMgPSBbXTtcbiAgICAgIHRoaXMuZ2V0UmVjZW50U2VhcmNoZXMoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBubyBkZWJvdW5jZSB0aW1lIG5lZWRlZCBpbiBjYXNlIG9mIHNlYXJjaE9ubHlPbkVudGVyXG4gICAgaWYgKHRoaXMuY29uZmlnLnNlYXJjaE9ubHlPbkVudGVyKSB7XG4gICAgICBpZiAoXG4gICAgICAgIChldmVudCBpbnN0YW5jZW9mIEtleWJvYXJkRXZlbnQgJiYgZXZlbnQua2V5ID09PSAnRW50ZXInKSB8fFxuICAgICAgICAoZXZlbnQgaW5zdGFuY2VvZiBFdmVudCAmJiBldmVudC50eXBlID09PSAnY2hhbmdlJylcbiAgICAgICkge1xuICAgICAgICB0aGlzLmdldFN1Z2dlc3Rpb25zKHtpbnB1dDogdGhpcy5zZWFyY2hCb3hJbnB1dCwgZXZlbnR9KTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBubyBkZWJvdW5jZSB0aW1lIG5lZWRlZCBpbiBjYXNlIG9mIGNoYW5nZSBpbiBjYXRlZ29yeVxuICAgIGlmIChldmVudCBpbnN0YW5jZW9mIEtleWJvYXJkRXZlbnQgPT09IGZhbHNlICYmIGV2ZW50LnR5cGUgPT09ICdjaGFuZ2UnKSB7XG4gICAgICB0aGlzLmdldFN1Z2dlc3Rpb25zKHtpbnB1dDogdGhpcy5zZWFyY2hCb3hJbnB1dCwgZXZlbnR9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLm9ic2VydmFibGVGb3JTZWFyY2hSZXF1ZXN0Lm5leHQoe1xuICAgICAgaW5wdXQ6IHRoaXMuc2VhcmNoQm94SW5wdXQsXG4gICAgICBldmVudCxcbiAgICB9KTtcbiAgfVxuXG4gIHBvcHVsYXRlVmFsdWUoc3VnZ2VzdGlvbjogVCwgZXZlbnQ6IE1vdXNlRXZlbnQpIHtcbiAgICBjb25zdCB2YWx1ZSA9IHN1Z2dlc3Rpb25bXG4gICAgICB0aGlzLmNvbmZpZy5kaXNwbGF5UHJvcGVydHlOYW1lXG4gICAgXSBhcyB1bmtub3duIGFzIHN0cmluZzsgLy8gY29udmVydGVkIHRvIHN0cmluZyB0byBhc3NpZ24gdmFsdWUgdG8gc2VhcmNoQm94SW5wdXRcbiAgICB0aGlzLnNlYXJjaEJveElucHV0ID0gdmFsdWU7XG4gICAgdGhpcy5zdWdnZXN0aW9uc0Rpc3BsYXkgPSBmYWxzZTtcbiAgICAvLyBuZ01vZGVsQ2hhbmdlIGRvZXNuJ3QgZGV0ZWN0IGNoYW5nZSBpbiB2YWx1ZSB3aGVuIHBvcHVsYXRlZCBmcm9tIG91dHNpZGUsIGhlbmNlIGNhbGxpbmcgbWFudWFsbHlcbiAgICB0aGlzLm9uQ2hhbmdlKHRoaXMuc2VhcmNoQm94SW5wdXQpO1xuICAgIC8vIG5lZWQgdG8gZG8gdGhpcyB0byBzaG93IG1vcmUgc2VhcmNoIG9wdGlvbnMgZm9yIHNlbGVjdGVkIHN1Z2dlc3Rpb24gLSBqdXN0IGluIGNhc2UgdXNlciByZW9wZW5zIHNlYXJjaCBpbnB1dFxuICAgIHRoaXMuZ2V0U3VnZ2VzdGlvbnMoe2lucHV0OiB0aGlzLnNlYXJjaEJveElucHV0LCBldmVudH0pO1xuICAgIHRoaXMuY2xpY2tlZC5lbWl0KHtpdGVtOiBzdWdnZXN0aW9uLCBldmVudH0pO1xuICB9XG4gIHBvcHVsYXRlVmFsdWVSZWNlbnRTZWFyY2gocmVjZW50U2VhcmNoOiBJU2VhcmNoUXVlcnksIGV2ZW50OiBNb3VzZUV2ZW50KSB7XG4gICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICBjb25zdCB2YWx1ZSA9IHJlY2VudFNlYXJjaFsnbWF0Y2gnXTtcbiAgICB0aGlzLnNlYXJjaEJveElucHV0ID0gdmFsdWU7XG4gICAgdGhpcy5zdWdnZXN0aW9uc0Rpc3BsYXkgPSBmYWxzZTtcbiAgICB0aGlzLm9uQ2hhbmdlKHRoaXMuc2VhcmNoQm94SW5wdXQpO1xuICAgIC8vIG5lZWQgdG8gZG8gdGhpcyB0byBzaG93IG1vcmUgc2VhcmNoIG9wdGlvbnMgZm9yIHNlbGVjdGVkIHN1Z2dlc3Rpb24gLSBqdXN0IGluIGNhc2UgdXNlciByZW9wZW5zIHNlYXJjaCBpbnB1dFxuICAgIHRoaXMuZ2V0U3VnZ2VzdGlvbnMoe2lucHV0OiB0aGlzLnNlYXJjaEJveElucHV0LCBldmVudH0pO1xuICAgIHRoaXMuZm9jdXNJbnB1dCgpO1xuICAgIHRoaXMuc2hvd1N1Z2dlc3Rpb25zKCk7XG4gIH1cblxuICBmZXRjaE1vZGVsSW1hZ2VVcmxGcm9tU3VnZ2VzdGlvbihzdWdnZXN0aW9uOiBUKSB7XG4gICAgY29uc3QgbW9kZWxOYW1lID0gc3VnZ2VzdGlvbltcbiAgICAgICdzb3VyY2UnIGFzIHVua25vd24gYXMga2V5b2YgVFxuICAgIF0gYXMgdW5rbm93biBhcyBzdHJpbmc7XG4gICAgbGV0IHVybDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgIHRoaXMuY29uZmlnLm1vZGVscy5mb3JFYWNoKChtb2RlbCwgaSkgPT4ge1xuICAgICAgaWYgKG1vZGVsLm5hbWUgPT09IG1vZGVsTmFtZSAmJiBtb2RlbC5pbWFnZVVybCkge1xuICAgICAgICB1cmwgPSBtb2RlbC5pbWFnZVVybDtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gdXJsO1xuICB9XG5cbiAgLy8gYWxzbyByZXR1cm5zIHRydWUgaWYgdGhlcmUgYXJlIGFueSBzdWdnZXN0aW9ucyByZWxhdGVkIHRvIHRoZSBtb2RlbFxuICBnZXRTdWdnZXN0aW9uc0Zyb21Nb2RlbE5hbWUobW9kZWxOYW1lOiBzdHJpbmcpIHtcbiAgICB0aGlzLnJlbGV2YW50U3VnZ2VzdGlvbnMgPSBbXTtcbiAgICB0aGlzLnN1Z2dlc3Rpb25zLmZvckVhY2goc3VnZ2VzdGlvbiA9PiB7XG4gICAgICBjb25zdCBzb3VyY2VNb2RlbE5hbWUgPSBzdWdnZXN0aW9uW1xuICAgICAgICAnc291cmNlJyBhcyBrZXlvZiBUXG4gICAgICBdIGFzIHVua25vd24gYXMgc3RyaW5nO1xuICAgICAgaWYgKHNvdXJjZU1vZGVsTmFtZSA9PT0gbW9kZWxOYW1lKSB7XG4gICAgICAgIHRoaXMucmVsZXZhbnRTdWdnZXN0aW9ucy5wdXNoKHN1Z2dlc3Rpb24pO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGlmICh0aGlzLnJlbGV2YW50U3VnZ2VzdGlvbnMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIGJvbGRTdHJpbmcoc3RyOiBUW2tleW9mIFRdIHwgc3RyaW5nLCBzdWJzdHI6IHN0cmluZykge1xuICAgIGNvbnN0IHN0clJlZ0V4cCA9IG5ldyBSZWdFeHAoYCgke3N1YnN0cn0pYCwgJ2dpJyk7XG4gICAgY29uc3Qgc3RyaW5nVG9NYWtlQm9sZDogc3RyaW5nID0gc3RyIGFzIHVua25vd24gYXMgc3RyaW5nO1xuICAgIHJldHVybiBzdHJpbmdUb01ha2VCb2xkLnJlcGxhY2Uoc3RyUmVnRXhwLCBgPGI+JDE8L2I+YCk7XG4gIH1cblxuICBoaWRlU3VnZ2VzdGlvbnMoKSB7XG4gICAgdGhpcy5zdWdnZXN0aW9uc0Rpc3BsYXkgPSBmYWxzZTtcbiAgICB0aGlzLm9uVG91Y2hlZCgpO1xuICB9XG5cbiAgc2hvd1N1Z2dlc3Rpb25zKCkge1xuICAgIHRoaXMuc3VnZ2VzdGlvbnNEaXNwbGF5ID0gdHJ1ZTtcbiAgICB0aGlzLmdldFJlY2VudFNlYXJjaGVzKCk7XG4gIH1cblxuICBmb2N1c0lucHV0KCkge1xuICAgIGlmIChpc1BsYXRmb3JtQnJvd3Nlcih0aGlzLnBsYXRmb3JtSWQpKSB7XG4gICAgICB0aGlzLnNlYXJjaElucHV0RWxlbWVudC5uYXRpdmVFbGVtZW50LmZvY3VzKCk7XG4gICAgfVxuICB9XG5cbiAgc2V0Q2F0ZWdvcnkoY2F0ZWdvcnk6ICdBbGwnIHwgSU1vZGVsLCBldmVudDogTW91c2VFdmVudCkge1xuICAgIHRoaXMuY2F0ZWdvcnkgPSBjYXRlZ29yeTtcbiAgICB0aGlzLmNhdGVnb3J5RGlzcGxheSA9IGZhbHNlO1xuICAgIGlmICh0aGlzLnNlYXJjaEJveElucHV0KSB7XG4gICAgICB0aGlzLmhpdFNlYXJjaEFwaShldmVudCk7XG4gICAgICB0aGlzLmZvY3VzSW5wdXQoKTtcbiAgICAgIHRoaXMuc2hvd1N1Z2dlc3Rpb25zKCk7XG4gICAgfVxuICB9XG5cbiAgc2hvd0NhdGVnb3J5KCkge1xuICAgIHRoaXMuY2F0ZWdvcnlEaXNwbGF5ID0gIXRoaXMuY2F0ZWdvcnlEaXNwbGF5O1xuICB9XG5cbiAgaGlkZUNhdGVnb3J5KCkge1xuICAgIHRoaXMuY2F0ZWdvcnlEaXNwbGF5ID0gZmFsc2U7XG4gIH1cblxuICByZXNldElucHV0KCkge1xuICAgIHRoaXMuc2VhcmNoQm94SW5wdXQgPSAnJztcbiAgICB0aGlzLnN1Z2dlc3Rpb25zRGlzcGxheSA9IHRydWU7XG4gICAgdGhpcy5mb2N1c0lucHV0KCk7XG4gICAgLy8gbmdNb2RlbENoYW5nZSBkb2Vzbid0IGRldGVjdCBjaGFuZ2UgaW4gdmFsdWUgd2hlbiBwb3B1bGF0ZWQgZnJvbSBvdXRzaWRlLCBoZW5jZSBjYWxsaW5nIG1hbnVhbGx5XG4gICAgdGhpcy5vbkNoYW5nZSh0aGlzLnNlYXJjaEJveElucHV0KTtcbiAgICB0aGlzLmdldFJlY2VudFNlYXJjaGVzKCk7XG4gIH1cbiAgbmdPbkRlc3Ryb3koKSB7XG4gICAgdGhpcy5vYnNlcnZhYmxlRm9yU2VhcmNoUmVxdWVzdC51bnN1YnNjcmliZSgpO1xuICB9XG5cbiAgX2NhdGVnb3J5VG9Tb3VyY2VOYW1lKGNhdGVnb3J5OiAnQWxsJyB8IElNb2RlbCkge1xuICAgIGlmIChjYXRlZ29yeSA9PT0gJ0FsbCcpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIFtjYXRlZ29yeS5uYW1lXTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==