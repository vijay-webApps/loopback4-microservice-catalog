import { NgModule } from '@angular/core';
import { SearchComponent } from './search/search.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
export class SearchLibModule {
}
SearchLibModule.decorators = [
    { type: NgModule, args: [{
                declarations: [SearchComponent],
                imports: [CommonModule, FormsModule, HttpClientModule],
                exports: [SearchComponent],
            },] }
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoLWxpYi5tb2R1bGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9wcm9qZWN0cy9zZWFyY2gtbGliL3NyYy9saWIvc2VhcmNoLWxpYi5tb2R1bGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUN2QyxPQUFPLEVBQUMsZUFBZSxFQUFDLE1BQU0sMkJBQTJCLENBQUM7QUFDMUQsT0FBTyxFQUFDLFlBQVksRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQzdDLE9BQU8sRUFBQyxXQUFXLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUMzQyxPQUFPLEVBQUMsZ0JBQWdCLEVBQUMsTUFBTSxzQkFBc0IsQ0FBQztBQU90RCxNQUFNLE9BQU8sZUFBZTs7O1lBTDNCLFFBQVEsU0FBQztnQkFDUixZQUFZLEVBQUUsQ0FBQyxlQUFlLENBQUM7Z0JBQy9CLE9BQU8sRUFBRSxDQUFDLFlBQVksRUFBRSxXQUFXLEVBQUUsZ0JBQWdCLENBQUM7Z0JBQ3RELE9BQU8sRUFBRSxDQUFDLGVBQWUsQ0FBQzthQUMzQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7TmdNb2R1bGV9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtTZWFyY2hDb21wb25lbnR9IGZyb20gJy4vc2VhcmNoL3NlYXJjaC5jb21wb25lbnQnO1xuaW1wb3J0IHtDb21tb25Nb2R1bGV9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XG5pbXBvcnQge0Zvcm1zTW9kdWxlfSBmcm9tICdAYW5ndWxhci9mb3Jtcyc7XG5pbXBvcnQge0h0dHBDbGllbnRNb2R1bGV9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbi9odHRwJztcblxuQE5nTW9kdWxlKHtcbiAgZGVjbGFyYXRpb25zOiBbU2VhcmNoQ29tcG9uZW50XSxcbiAgaW1wb3J0czogW0NvbW1vbk1vZHVsZSwgRm9ybXNNb2R1bGUsIEh0dHBDbGllbnRNb2R1bGVdLFxuICBleHBvcnRzOiBbU2VhcmNoQ29tcG9uZW50XSxcbn0pXG5leHBvcnQgY2xhc3MgU2VhcmNoTGliTW9kdWxlIHt9XG4iXX0=