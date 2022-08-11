import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { ITEM_CATEGORIES, RUNES, RUNEWORDS, SOCKETS } from './runewords';
import { ItemCategory, Rune, Socket } from './types/runeword';
import { BehaviorSubject, combineLatest, distinctUntilKeyChanged, map, Observable, Subject, takeUntil } from 'rxjs';

type FilterState = Readonly<{
  searchString: string;
  runes: Record<Rune, boolean>;
  runesRequireAll: boolean;
  sockets: Record<Socket, boolean>;
  itemCategories: Record<ItemCategory, boolean>;
  reverse: boolean;
  sortBy: 'rune' | 'tier' | 'name';
}>;

type TypeExtract<T, E> = {
  [R in keyof T]: T[R] extends E ? E : never;
};

type RecordExtract<T> = TypeExtract<T, Record<any, any>>;

type RecordPropertyKeyType<T, K extends keyof RecordExtract<T>> = T[K] extends Record<infer L, unknown> ? L : never;

const defaultFilterState: FilterState = {
  searchString: '',
  reverse: false,
  runesRequireAll: false,
  sortBy: 'rune',
  sockets: { 2: false, 3: false, 4: false, 5: false, 6: false },
  itemCategories: { 'armor': false, 'head': false, 'melee': false, 'ranged': false, 'shield': false },
  runes: RUNES.reduce(
    (acc, curr) => ({ ...acc, [curr]: false }),
    {} as { [T in Rune]: boolean }
  )
};

function filterStateValid(filterState: unknown): filterState is FilterState {
  return typeof filterState === 'object'
    && filterState !== null
    && (Object.keys(defaultFilterState) as (keyof FilterState)[]).every(k => typeof (filterState as FilterState)[k] === typeof defaultFilterState[k]);
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit, OnDestroy {
  private readonly destroyed = new Subject<void>();
  title = 'runewords';

  readonly filterStateSubject = new BehaviorSubject<FilterState>(defaultFilterState);

  readonly runes$: Observable<({ value: Rune, checked: boolean })[]> =
    this.filterStateSubject.pipe(
      distinctUntilKeyChanged('runes'),
      map(filt =>
        RUNES.map(rune => ({ value: rune, checked: filt.runes[rune] }))
      )
    );
  readonly sockets$: Observable<({ value: Socket, checked: boolean })[]> =
    this.filterStateSubject.pipe(
      distinctUntilKeyChanged('sockets'),
      map(filt =>
        SOCKETS.map(socket => ({ value: socket, checked: filt.sockets[socket] }))
      )
    );
  readonly itemCategories$: Observable<({ value: ItemCategory, checked: boolean })[]> =
    this.filterStateSubject.pipe(
      distinctUntilKeyChanged('itemCategories'),
      map(filt =>
        ITEM_CATEGORIES.map(itemCategory => ({ value: itemCategory, checked: filt.itemCategories[itemCategory] }))
      )
    );
  readonly reverseOrder$ = this.filterStateSubject.pipe(
    distinctUntilKeyChanged('reverse'),
    map(filt => filt.reverse)
  );
  readonly runesRequireAll$ = this.filterStateSubject.pipe(
    distinctUntilKeyChanged('runesRequireAll'),
    map(filt => filt.runesRequireAll)
  );

  readonly runewords$ = this.reverseOrder$.pipe(map(reverse => reverse ? [...RUNES].reverse() : RUNES));

  readonly searchString$ = this.filterStateSubject.pipe(
    distinctUntilKeyChanged('searchString'),
    map(filt => filt.searchString)
  );

  readonly filter$ = combineLatest([
    this.searchString$,
    this.runes$.pipe(map(v => this.extractChecked(v))),
    this.sockets$.pipe(map(v => this.extractChecked(v))),
    this.itemCategories$.pipe(map(v => this.extractChecked(v))),
    this.reverseOrder$,
    this.runesRequireAll$
  ])
    .pipe(
      map(([search, runes, sockets, itemCategories, reverse, runesRequireAll]) =>
      ({
        searchParts: search.toLowerCase().trim().split(/\s+/).filter(s => s.length > 0),
        runes,
        sockets,
        itemCategories,
        reverse,
        runesRequireAll
      }))
    );

  readonly sortedRunewords$ = combineLatest([]);

  readonly filteredRunewords$ = this.filter$.pipe(
    map(filt => {
      const filteredRunewords = RUNEWORDS.filter(runeword => {
        const runewordAsString = (runeword.runes.join(' ') + runeword.attributes.join(' ') + runeword.name + runeword.itemType).toLowerCase();
        const containsString = filt.searchParts.length === 0 || filt.searchParts.every(term => runewordAsString.includes(term));
        const fitsSockets = filt.sockets.length === 0 || (filt.sockets as number[]).includes(runeword.runes.length);
        const fitsRunes = filt.runes.length === 0 || runeword.runes.every(rune => filt.runes.includes(rune));
        const hasRunes = filt.runes.length === 0 || filt.runes.every(rune => runeword.runes.includes(rune));
        const fitsCategories = filt.itemCategories.length === 0 || filt.itemCategories.some(cat => runeword.itemCategories.includes(cat));
        return containsString && fitsSockets && (filt.runesRequireAll ? hasRunes : fitsRunes) && fitsCategories;
      });
      if (filt.reverse) {
        filteredRunewords.reverse();
      }
      return filteredRunewords;
    }
    )
  );


  constructor() {
  }

  extractChecked<T>(a: { value: T, checked: boolean }[]): T[] {
    return a.filter(b => b.checked).map(b => b.value);
  }

  ngOnInit(): void {
    const sessionFilterString = sessionStorage.getItem('filterState');
    if (typeof sessionFilterString === 'string' && sessionFilterString.length > 0) {
      const initialFilter = JSON.parse(sessionFilterString);
      this.filterStateSubject.next(filterStateValid(initialFilter) ? initialFilter : defaultFilterState);
    }
    this.filterStateSubject.pipe(takeUntil(this.destroyed)).subscribe(filt => sessionStorage.setItem('filterState', JSON.stringify(filt)));
  }

  ngOnDestroy(): void {
    this.destroyed.next();
    this.destroyed.complete();
  }

  setSearchString(eventTarget: EventTarget | null): void {
    const searchString = eventTarget instanceof HTMLInputElement ? eventTarget.value : '';
    this.filterStateSubject.next(
      {
        ...this.filterStateSubject.value,
        searchString
      }
    );
  }

  toggleMulti<RecordProperty extends keyof TypeExtract<FilterState, Record<any, any>>, Key extends RecordPropertyKeyType<FilterState, RecordProperty>>(
    filterProperty: RecordProperty,
    key: Key,
    eventTarget: EventTarget | null
  ): void {
    const checked = eventTarget instanceof HTMLInputElement ? eventTarget.checked : false;
    const currentRecord = (this.filterStateSubject.value as RecordExtract<FilterState>)[filterProperty];
    const newRecord = { ...currentRecord, [key]: checked };
    this.filterStateSubject.next({ ...this.filterStateSubject.value, [filterProperty]: newRecord });
  }

  toggleSingle<BoolProperty extends keyof TypeExtract<FilterState, boolean>>(filterProperty: BoolProperty, eventTarget: EventTarget | null) {
    const checked = eventTarget instanceof HTMLInputElement ? eventTarget.checked : false;
    this.filterStateSubject.next({ ...this.filterStateSubject.value, [filterProperty]: checked });
  }

}
