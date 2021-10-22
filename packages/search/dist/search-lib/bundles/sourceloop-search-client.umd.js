(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@angular/core'), require('rxjs'), require('rxjs/operators'), require('@angular/forms'), require('@angular/common'), require('@angular/common/http')) :
    typeof define === 'function' && define.amd ? define('@sourceloop/search-client', ['exports', '@angular/core', 'rxjs', 'rxjs/operators', '@angular/forms', '@angular/common', '@angular/common/http'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory((global.sourceloop = global.sourceloop || {}, global.sourceloop["search-client"] = {}), global.ng.core, global.rxjs, global.rxjs.operators, global.ng.forms, global.ng.common, global.ng.common.http));
})(this, (function (exports, core, rxjs, operators, forms, common, http) { 'use strict';

    // cant use T extends IReturnType here
    var SEARCH_SERVICE_TOKEN = new core.InjectionToken('Search_Service_Token');
    // IRequestParameters default values
    var DEFAULT_LIMIT = 20;
    var DEFAULT_LIMIT_TYPE = false;
    var DEFAULT_ORDER = [];
    var DEBOUNCE_TIME = 1000;
    var DEFAULT_OFFSET = 0;
    var DEFAULT_SAVE_IN_RECENTS = true;

    var SearchComponent = /** @class */ (function () {
        function SearchComponent(searchService, platformId) {
            this.searchService = searchService;
            this.platformId = platformId;
            this.searchBoxInput = '';
            this.suggestionsDisplay = false;
            this.categoryDisplay = false;
            this.suggestions = [];
            this.relevantSuggestions = [];
            this.recentSearches = [];
            this.category = 'All';
            this.observableForSearchRequest = new rxjs.Subject();
            // emitted when user clicks one of the suggested results (including recent search sugestions)
            this.clicked = new core.EventEmitter();
            this.searched = new core.EventEmitter();
            this.disabled = false;
        }
        SearchComponent.prototype.ngOnInit = function () {
            var _this = this;
            this.observableForSearchRequest
                .pipe(operators.tap(function (v) { return (_this.suggestions = []); }), operators.debounceTime(DEBOUNCE_TIME))
                .subscribe(function (value) {
                _this.searched.emit({
                    event: value.event,
                    keyword: value.input,
                    category: _this.category,
                });
                _this.getSuggestions(value);
            });
        };
        // ControlValueAccessor Implementation
        SearchComponent.prototype.writeValue = function (value) {
            this.searchBoxInput = value;
        };
        // When the value in the UI is changed, this method will invoke a callback function
        SearchComponent.prototype.registerOnChange = function (fn) {
            this.onChange = fn;
        };
        SearchComponent.prototype.registerOnTouched = function (fn) {
            this.onTouched = fn;
        };
        SearchComponent.prototype.setDisabledState = function (isDisabled) {
            this.disabled = isDisabled;
        };
        SearchComponent.prototype.getSuggestions = function (eventValue) {
            var _this = this;
            var _a, _b, _c, _d, _e;
            var order = (_a = this.config.order) !== null && _a !== void 0 ? _a : DEFAULT_ORDER;
            var orderString = '';
            order.forEach(function (preference) { return (orderString = "" + orderString + preference + " "); });
            var saveInRecents = (_b = this.config.saveInRecents) !== null && _b !== void 0 ? _b : DEFAULT_SAVE_IN_RECENTS;
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
            var requestParameters = {
                match: eventValue.input,
                sources: this._categoryToSourceName(this.category),
                limit: (_c = this.config.limit) !== null && _c !== void 0 ? _c : DEFAULT_LIMIT,
                limitByType: (_d = this.config.limitByType) !== null && _d !== void 0 ? _d : DEFAULT_LIMIT_TYPE,
                order: orderString,
                offset: (_e = this.config.offset) !== null && _e !== void 0 ? _e : DEFAULT_OFFSET,
            };
            this.searchService
                .searchApiRequest(requestParameters, saveInRecents)
                .subscribe(function (value) {
                _this.suggestions = value;
            }, function (_error) {
                _this.suggestions = [];
            });
        };
        SearchComponent.prototype.getRecentSearches = function () {
            var _this = this;
            if (!this.config.hideRecentSearch &&
                this.searchService.recentSearchApiRequest) {
                this.searchService.recentSearchApiRequest().subscribe(function (value) {
                    _this.recentSearches = value;
                }, function (_error) {
                    _this.recentSearches = [];
                });
            }
        };
        // event can be KeyBoardEvent or Event of type 'change' fired on change in value of drop down for category
        SearchComponent.prototype.hitSearchApi = function (event) {
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
                    this.getSuggestions({ input: this.searchBoxInput, event: event });
                }
                return;
            }
            // no debounce time needed in case of change in category
            if (event instanceof KeyboardEvent === false && event.type === 'change') {
                this.getSuggestions({ input: this.searchBoxInput, event: event });
                return;
            }
            this.observableForSearchRequest.next({
                input: this.searchBoxInput,
                event: event,
            });
        };
        SearchComponent.prototype.populateValue = function (suggestion, event) {
            var value = suggestion[this.config.displayPropertyName]; // converted to string to assign value to searchBoxInput
            this.searchBoxInput = value;
            this.suggestionsDisplay = false;
            // ngModelChange doesn't detect change in value when populated from outside, hence calling manually
            this.onChange(this.searchBoxInput);
            // need to do this to show more search options for selected suggestion - just in case user reopens search input
            this.getSuggestions({ input: this.searchBoxInput, event: event });
            this.clicked.emit({ item: suggestion, event: event });
        };
        SearchComponent.prototype.populateValueRecentSearch = function (recentSearch, event) {
            event.stopPropagation();
            event.preventDefault();
            var value = recentSearch['match'];
            this.searchBoxInput = value;
            this.suggestionsDisplay = false;
            this.onChange(this.searchBoxInput);
            // need to do this to show more search options for selected suggestion - just in case user reopens search input
            this.getSuggestions({ input: this.searchBoxInput, event: event });
            this.focusInput();
            this.showSuggestions();
        };
        SearchComponent.prototype.fetchModelImageUrlFromSuggestion = function (suggestion) {
            var modelName = suggestion['source'];
            var url;
            this.config.models.forEach(function (model, i) {
                if (model.name === modelName && model.imageUrl) {
                    url = model.imageUrl;
                }
            });
            return url;
        };
        // also returns true if there are any suggestions related to the model
        SearchComponent.prototype.getSuggestionsFromModelName = function (modelName) {
            var _this = this;
            this.relevantSuggestions = [];
            this.suggestions.forEach(function (suggestion) {
                var sourceModelName = suggestion['source'];
                if (sourceModelName === modelName) {
                    _this.relevantSuggestions.push(suggestion);
                }
            });
            if (this.relevantSuggestions.length) {
                return true;
            }
            else {
                return false;
            }
        };
        SearchComponent.prototype.boldString = function (str, substr) {
            var strRegExp = new RegExp("(" + substr + ")", 'gi');
            var stringToMakeBold = str;
            return stringToMakeBold.replace(strRegExp, "<b>$1</b>");
        };
        SearchComponent.prototype.hideSuggestions = function () {
            this.suggestionsDisplay = false;
            this.onTouched();
        };
        SearchComponent.prototype.showSuggestions = function () {
            this.suggestionsDisplay = true;
            this.getRecentSearches();
        };
        SearchComponent.prototype.focusInput = function () {
            if (common.isPlatformBrowser(this.platformId)) {
                this.searchInputElement.nativeElement.focus();
            }
        };
        SearchComponent.prototype.setCategory = function (category, event) {
            this.category = category;
            this.categoryDisplay = false;
            if (this.searchBoxInput) {
                this.hitSearchApi(event);
                this.focusInput();
                this.showSuggestions();
            }
        };
        SearchComponent.prototype.showCategory = function () {
            this.categoryDisplay = !this.categoryDisplay;
        };
        SearchComponent.prototype.hideCategory = function () {
            this.categoryDisplay = false;
        };
        SearchComponent.prototype.resetInput = function () {
            this.searchBoxInput = '';
            this.suggestionsDisplay = true;
            this.focusInput();
            // ngModelChange doesn't detect change in value when populated from outside, hence calling manually
            this.onChange(this.searchBoxInput);
            this.getRecentSearches();
        };
        SearchComponent.prototype.ngOnDestroy = function () {
            this.observableForSearchRequest.unsubscribe();
        };
        SearchComponent.prototype._categoryToSourceName = function (category) {
            if (category === 'All') {
                return [];
            }
            else {
                return [category.name];
            }
        };
        return SearchComponent;
    }());
    SearchComponent.decorators = [
        { type: core.Component, args: [{
                    selector: 'sourceloop-search',
                    template: "<div\n  class=\"search-container\"\n  [ngClass]=\"suggestionsDisplay ? 'search-focus-in' : 'search-focus-out'\"\n>\n  <form>\n    <div class=\"flex-box align-items-center justify-content-between\">\n      <div class=\"search-column-left\">\n        <div class=\"flex-box align-items-center justify-content-between\">\n          <svg\n            width=\"16\"\n            height=\"16\"\n            viewBox=\"0 0 16 16\"\n            fill=\"none\"\n            xmlns=\"http://www.w3.org/2000/svg\"\n          >\n            <path\n              fill-rule=\"evenodd\"\n              clip-rule=\"evenodd\"\n              d=\"M2 6.5C2 8.981 4.0185 11 6.5 11C8.981 11 11 8.981 11 6.5C11 4.0185 8.981 2 6.5 2C4.0185 2 2 4.0185 2 6.5ZM1 6.5C1 3.4625 3.4625 1 6.5 1C9.5375 1 12 3.4625 12 6.5C12 9.5375 9.5375 12 6.5 12C3.4625 12 1 9.5375 1 6.5ZM10.7236 11.4306C10.9771 11.2131 11.2131 10.9771 11.4306 10.7236L15.0001 14.2926L14.2931 15.0001L10.7236 11.4306Z\"\n              fill=\"#9C9C9C\"\n            />\n          </svg>\n          <input\n            class=\"search-input\"\n            autocomplete=\"off\"\n            type=\"text\"\n            [placeholder]=\"config.placeholder\"\n            #searchInput\n            name=\"searchInput\"\n            (focus)=\"showSuggestions()\"\n            (blur)=\"hideSuggestions()\"\n            [(ngModel)]=\"searchBoxInput\"\n            (keyup)=\"hitSearchApi($event)\"\n            placeholder=\"Search\"\n            (ngModelChange)=\"onChange(this.searchBoxInput)\"\n            [disabled]=\"disabled\"\n          />\n        </div>\n      </div>\n      <div class=\"search-column-right\">\n        <button\n          *ngIf=\"searchBoxInput\"\n          type=\"button\"\n          class=\"clear-button\"\n          id=\"clear-button\"\n          (click)=\"resetInput()\"\n        >\n          Clear x\n        </button>\n        <ng-container *ngIf=\"!config.hideCategorizeButton\">\n          <button class=\"category-button\" (click)=\"showCategory()\">\n            {{ category !== 'All' ? category.displayName : category }}\n            <svg height=\"14\" viewBox=\"0 0 14 14\" width=\"14\">\n              <polygon\n                [attr.points]=\"\n                  categoryDisplay\n                    ? '0,14 7,6, 14,14, 7,6, 0,14'\n                    : '0,6 7,14, 14,6, 7,14, 0,6'\n                \"\n                style=\"stroke: 'inherit'; fill: 'inherit'\"\n              ></polygon>\n            </svg>\n          </button>\n          <ng-container *ngIf=\"categoryDisplay\">\n            <div class=\"category-overlay\" (click)=\"hideCategory()\"></div>\n            <div class=\"category-popup\">\n              <ul>\n                <li (click)=\"setCategory('All', $event)\" class=\"category\">\n                  All\n                </li>\n                <li\n                  *ngFor=\"let model of config.models\"\n                  (click)=\"setCategory(model, $event)\"\n                  class=\"category\"\n                >\n                  {{ model.displayName }}\n                </li>\n              </ul>\n            </div>\n          </ng-container>\n        </ng-container>\n      </div>\n    </div>\n  </form>\n\n  <div *ngIf=\"suggestionsDisplay\" class=\"search-popup\">\n    <ng-container *ngIf=\"config.categorizeResults\">\n      <div class=\"search-item-info\" *ngIf=\"category === 'All'\">\n        You are searching on {{ category }}\n      </div>\n      <div class=\"search-item-info\" *ngIf=\"category !== 'All'\">\n        You are searching on {{ category.displayName }}\n      </div>\n    </ng-container>\n    <ng-container *ngIf=\"searchBoxInput\">\n      <ng-container *ngIf=\"config.categorizeResults\">\n        <div class=\"search-result\" *ngFor=\"let model of config.models\">\n          <h3\n            *ngIf=\"getSuggestionsFromModelName(model.name)\"\n            class=\"suggestions-heading\"\n          >\n            <img\n              *ngIf=\"model.imageUrl\"\n              [src]=\"model.imageUrl\"\n              [alt]=\"model.displayName\"\n            />\n            {{ model.displayName }}({{ relevantSuggestions?.length }})\n          </h3>\n          <ul>\n            <li\n              *ngFor=\"let suggestion of relevantSuggestions\"\n              (mousedown)=\"populateValue(suggestion, $event)\"\n              class=\"suggestions\"\n              [innerHTML]=\"\n                boldString(\n                  suggestion[config.displayPropertyName],\n                  searchBoxInput\n                )\n              \"\n            ></li>\n          </ul>\n        </div>\n      </ng-container>\n      <ng-container *ngIf=\"!config.categorizeResults\">\n        <div class=\"search-result\">\n          <ul>\n            <li\n              *ngFor=\"let suggestion of suggestions\"\n              (mousedown)=\"populateValue(suggestion, $event)\"\n            >\n              <!--Need to call fetchModelImageUrlFromSuggestion as each suggestion can come from different model-->\n              <img\n                *ngIf=\"fetchModelImageUrlFromSuggestion(suggestion)\"\n                class=\"suggestions-categorize-false\"\n                [src]=\"fetchModelImageUrlFromSuggestion(suggestion)\"\n                style=\"margin-right: 5px\"\n                alt=\"Img\"\n              />\n              <p\n                [innerHTML]=\"\n                  boldString(\n                    suggestion[config.displayPropertyName],\n                    searchBoxInput\n                  )\n                \"\n                style=\"display: inline\"\n              ></p>\n            </li>\n          </ul>\n        </div>\n      </ng-container>\n    </ng-container>\n\n    <ng-container *ngIf=\"!config.hideRecentSearch && recentSearches.length > 0\">\n      <div class=\"recent-searches\">\n        <h3 class=\"suggestions-heading\">Recent Searches</h3>\n        <ul>\n          <li\n            *ngFor=\"let recentSearch of recentSearches\"\n            class=\"suggestions\"\n            (mousedown)=\"populateValueRecentSearch(recentSearch, $event)\"\n          >\n            <svg\n              width=\"16\"\n              height=\"16\"\n              viewBox=\"0 0 16 16\"\n              fill=\"none\"\n              xmlns=\"http://www.w3.org/2000/svg\"\n            >\n              <path\n                fill-rule=\"evenodd\"\n                clip-rule=\"evenodd\"\n                d=\"M2 6.5C2 8.981 4.0185 11 6.5 11C8.981 11 11 8.981 11 6.5C11 4.0185 8.981 2 6.5 2C4.0185 2 2 4.0185 2 6.5ZM1 6.5C1 3.4625 3.4625 1 6.5 1C9.5375 1 12 3.4625 12 6.5C12 9.5375 9.5375 12 6.5 12C3.4625 12 1 9.5375 1 6.5ZM10.7236 11.4306C10.9771 11.2131 11.2131 10.9771 11.4306 10.7236L15.0001 14.2926L14.2931 15.0001L10.7236 11.4306Z\"\n                fill=\"#9C9C9C\"\n              />\n            </svg>\n            <span>{{ recentSearch.match }}</span>\n          </li>\n        </ul>\n      </div>\n    </ng-container>\n  </div>\n</div>\n",
                    providers: [
                        {
                            provide: forms.NG_VALUE_ACCESSOR,
                            useExisting: SearchComponent,
                            multi: true,
                        },
                    ],
                    styles: [".search-container{border:1px solid transparent;border-radius:4px;background-color:#f7f7f7;padding:0 15px;position:relative;width:inherit}.search-container:hover{outline:2px solid #91263b}.search-container:hover.search-focus-in{outline:none}.search-container.search-focus-in{outline:none;box-shadow:0 0 4px #0003;background-color:#fff;border-bottom:0;border-radius:4px 4px 0 0}.search-container.search-focus-in:hover{outline:0}.search-container .flex-box{display:flex}.search-container .align-items-center{align-items:center}.search-container .justify-content-between{justify-content:space-between}.search-container .search-column-left{flex-direction:column;width:100%}.search-container .search-column-right{flex-direction:column;text-align:right}.search-container .search-column-right select{border:0;outline:0;width:60px;background-color:transparent;margin-left:10px;font-size:12px;color:#333;border-left:1px solid #d1d1d1;padding-left:4px}.search-container .search-symbol{color:#d1d1d1;font-size:12px;display:inline-block}.search-container .search-input{padding:0 .75rem;font-size:14px;font-weight:400;line-height:1.5;color:#333;background-color:transparent;border:0;border-radius:0;width:100%;box-sizing:border-box;height:38px;display:inline-block}.search-container .search-input::-moz-placeholder{color:#d1d1d1}.search-container .search-input:-ms-input-placeholder{color:#d1d1d1}.search-container .search-input::placeholder{color:#d1d1d1}.search-container .search-input:focus{outline:none}.search-container .clear-button{background-color:transparent;border:0 solid #ced4da;color:#d1d1d1;font-size:12px;cursor:pointer}.search-container .clear-button span{display:inline-block;margin-left:5px;font-size:14px}.search-container .category-button{padding:0 .75rem;font-size:14px;font-weight:400;line-height:1.5;color:#d1d1d1;cursor:pointer;border:none;background:transparent;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}.search-container .category-button svg{stroke:#d1d1d1}.search-container .category-overlay{top:0;left:0;position:fixed;z-index:9998;background-color:transparent;width:100%;height:100%}.search-container .category-popup{overflow-x:hidden;overflow-y:auto;position:absolute;top:100%;right:0px;z-index:9999;background-color:#fff;box-shadow:0 5px 4px #0003;border-radius:0 0 4px 4px;width:-webkit-max-content;width:-moz-max-content;width:max-content;font-size:11.2px!important}.search-container .category-popup ul{padding:0;margin:0}.search-container .category-popup ul li{list-style:none;font-size:1rem;font-weight:400;line-height:1.5;color:#333;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}.search-container .category-popup ul li.category{align-items:center;display:flex;cursor:pointer;padding:0 16px;border-bottom:1px solid #f2f2f2;font-family:\"Rakuten Sans\",sans-serif;font-size:12.8px;line-height:32px;letter-spacing:0px;text-align:left}.search-container .category-popup ul li.category:hover{background-color:#fee8e8}.search-container .category-popup ul li.category svg{margin-right:5px}.search-container .category-popup ul li.suggestions-categorize-false:hover{background-color:#fee8e8}.search-container .search-popup{padding:0 15px 15px;margin:0;max-height:80vh;overflow-x:hidden;overflow-y:auto;position:absolute;top:calc(100% - 2px);left:-1px;right:-1px;z-index:9999;background-color:#fff;box-shadow:0 5px 4px #0003;border-radius:0 0 4px 4px}.search-container .search-popup hr{border:0;border-top:1px solid #ebebeb;margin:0;position:-webkit-sticky;position:sticky;top:0;padding:0 0 15px;z-index:1}.search-container .search-popup .search-item-info{color:#91263b;text-align:center;font-size:12px;margin-bottom:15px}.search-container .search-popup ul{padding:0;margin:0}.search-container .search-popup ul li{list-style:none;font-size:1rem;font-weight:400;line-height:1.5;color:#333}.search-container .search-popup ul li.suggestions{font-size:15px;line-height:36px;padding:0 15px 0 44px;align-items:center;display:flex;cursor:pointer}.search-container .search-popup ul li.suggestions:hover{background-color:#fee8e8}.search-container .search-popup ul li.suggestions svg{margin-right:5px}.search-container .search-popup ul li.suggestions-categorize-false:hover{background-color:#fee8e8}.search-container .search-popup .search-result{padding:10px 0 0;margin:0 -15px}.search-container .search-popup .search-result.no-categorize-result ul{width:100%;padding:0;margin:0 0 10px}.search-container .search-popup .search-result.no-categorize-result ul li{font-size:15px;line-height:36px;padding:0 15px 0 31px;display:flex;align-items:center;cursor:pointer}.search-container .search-popup .search-result.no-categorize-result ul li:hover{background-color:#fee8e8}.search-container .search-popup .search-result.no-categorize-result ul li img{width:18px;margin-right:9px}.search-container .search-popup .suggestions-heading{color:#9c9c9c;font-size:14px;font-weight:normal;margin:0 0 10px 17px;display:flex;align-items:center;position:relative}.search-container .search-popup .suggestions-heading .show-more{position:absolute;right:20px;color:#d1d1d1;font-size:12px;cursor:pointer;text-decoration:none}.search-container .search-popup .suggestions-heading .show-more :hover{text-decoration:underline}.search-container .search-popup .suggestions-heading img{width:18px;margin-right:9px}.search-container .search-popup .recent-searches{padding:10px 0 0;margin:0 -15px}.search-container .search-popup .recent-searches .suggestions-heading{margin-left:30px}.search-container .search-popup .recent-searches li.suggestions{padding-left:31px}\n"]
                },] }
    ];
    SearchComponent.ctorParameters = function () { return [
        { type: undefined, decorators: [{ type: core.Inject, args: [SEARCH_SERVICE_TOKEN,] }] },
        { type: Object, decorators: [{ type: core.Inject, args: [core.PLATFORM_ID,] }] }
    ]; };
    SearchComponent.propDecorators = {
        config: [{ type: core.Input }],
        clicked: [{ type: core.Output }],
        searched: [{ type: core.Output }],
        searchInputElement: [{ type: core.ViewChild, args: ['searchInput',] }]
    };

    var SearchLibModule = /** @class */ (function () {
        function SearchLibModule() {
        }
        return SearchLibModule;
    }());
    SearchLibModule.decorators = [
        { type: core.NgModule, args: [{
                    declarations: [SearchComponent],
                    imports: [common.CommonModule, forms.FormsModule, http.HttpClientModule],
                    exports: [SearchComponent],
                },] }
    ];

    var Configuration = /** @class */ (function () {
        function Configuration(d) {
            var _a, _b, _c, _d, _e, _f;
            if (d.categorizeResults === false &&
                (d.hideCategorizeButton === false || d.hideCategorizeButton === undefined)) {
                throw new Error('You must provide hideCategorizeButton:true as categorizeResults is false');
            }
            if (d.saveInRecents === false && d.saveInRecentsOnlyOnEnter === true) {
                throw new Error('You must provide saveInRecents:true for saveInRecentsOnlyOnEnter:true');
            }
            this.displayPropertyName = d.displayPropertyName;
            this.models = d.models;
            this.placeholder = (_a = d.placeholder) !== null && _a !== void 0 ? _a : 'Search';
            /* IRequestParameters - will be given default values before call is made in case undefined/null,
            otherwise there ! is used on which sonar gives code smell */
            this.limit = d.limit;
            this.limitByType = d.limitByType;
            this.order = d.order;
            this.offset = d.offset;
            this.saveInRecents = d.saveInRecents;
            this.categorizeResults = (_b = d.categorizeResults) !== null && _b !== void 0 ? _b : true;
            this.hideRecentSearch = (_c = d.hideRecentSearch) !== null && _c !== void 0 ? _c : false;
            this.hideCategorizeButton = (_d = d.hideCategorizeButton) !== null && _d !== void 0 ? _d : false;
            this.saveInRecentsOnlyOnEnter = (_e = d.saveInRecentsOnlyOnEnter) !== null && _e !== void 0 ? _e : false;
            this.searchOnlyOnEnter = (_f = d.searchOnlyOnEnter) !== null && _f !== void 0 ? _f : false;
        }
        return Configuration;
    }());

    /*
     * Public API Surface of my-lib
     */

    /**
     * Generated bundle index. Do not edit.
     */

    exports.Configuration = Configuration;
    exports.DEBOUNCE_TIME = DEBOUNCE_TIME;
    exports.DEFAULT_LIMIT = DEFAULT_LIMIT;
    exports.DEFAULT_LIMIT_TYPE = DEFAULT_LIMIT_TYPE;
    exports.DEFAULT_OFFSET = DEFAULT_OFFSET;
    exports.DEFAULT_ORDER = DEFAULT_ORDER;
    exports.DEFAULT_SAVE_IN_RECENTS = DEFAULT_SAVE_IN_RECENTS;
    exports.SEARCH_SERVICE_TOKEN = SEARCH_SERVICE_TOKEN;
    exports.SearchComponent = SearchComponent;
    exports.SearchLibModule = SearchLibModule;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=sourceloop-search-client.umd.js.map
