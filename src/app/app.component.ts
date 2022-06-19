import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { runes, runewords } from './runewords';
import { ItemCategory, Rune, Runeword } from './types/runeword';
import { BehaviorSubject, combineLatest, filter, map, Observable, shareReplay, startWith, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'runewords';
  readonly runewords: ReadonlyArray<Runeword> = runewords;
  readonly runes: ReadonlyArray<Rune> = runes;
  readonly sockets = [2, 3, 4, 5, 6];
  readonly itemCategories: ItemCategory[] = ['armor', 'head', 'melee', 'ranged', 'shield'];
  readonly searchControl = new FormControl(sessionStorage.getItem('search') ?? '');
  readonly runesCheckedSubject = new BehaviorSubject<Record<Rune, boolean>>(
    this.runes.reduce(
      (acc, curr) => ({ ...acc, [curr]: false }), {} as Partial<Record<Rune, boolean>>
    ) as Record<Rune, boolean>
  );
  readonly runes$: Observable<({ value: Rune, checked: boolean })[]> = this.runesCheckedSubject.pipe(
    map(runesChecked =>
      this.runes.map(rune => ({ value: rune, checked: runesChecked[rune] }))
    )
  );
  readonly socketsCheckedSubject = new BehaviorSubject<Record<number, boolean>>({ 2: false, 3: false, 4: false, 5: false, 6: false });
  readonly sockets$: Observable<({ value: number, checked: boolean })[]> =
    this.socketsCheckedSubject.pipe(
      map(socketsChecked =>
        this.sockets.map(socket => ({ value: socket, checked: socketsChecked[socket] }))
      )
    );
  readonly itemCategoriesCheckedSubject = new BehaviorSubject<Record<ItemCategory, boolean>>({ 'armor': false, 'head': false, 'melee': false, 'ranged': false, 'shield': false });
  readonly itemCategories$: Observable<({ value: ItemCategory, checked: boolean })[]> =
    this.itemCategoriesCheckedSubject.pipe(
      map(itemCategoriesChecked =>
        this.itemCategories.map(itemCategory => ({ value: itemCategory, checked: itemCategoriesChecked[itemCategory] }))
      )
    );

  readonly searchValue$ = this.searchControl.valueChanges.pipe(startWith(this.searchControl.value), filter((s: any): s is string => typeof s === 'string'), shareReplay(1));

  readonly filter$ = combineLatest([
    this.searchValue$,
    this.runes$.pipe(map(v => this.extractChecked(v))),
    this.sockets$.pipe(map(v => this.extractChecked(v))),
    this.itemCategories$.pipe(map(v => this.extractChecked(v)))
  ])
    .pipe(
      map(([search, runes, sockets, itemCategories]) =>
      ({
        search: search.toLowerCase().trim().split(/\s+/).filter(s => s.length > 0),
        runes,
        sockets,
        itemCategories
      }))
    );

  readonly filteredRunewords$ = this.filter$.pipe(
    map(filt =>
      this.runewords.filter(runeword => {
        const runewordAsString = (runeword.runes.join(' ') + runeword.attributes.join(' ') + runeword.name + runeword.itemType).toLowerCase();
        const containsString = filt.search.length === 0 || filt.search.every(term => runewordAsString.includes(term));
        const fitsSockets = filt.sockets.length === 0 || filt.sockets.includes(runeword.runes.length);
        const fitsRunes = filt.runes.length === 0 || runeword.runes.every(rune => filt.runes.includes(rune));
        const fitsCategories = filt.itemCategories.length === 0 || filt.itemCategories.some(cat => runeword.itemCategories.includes(cat));
        return containsString && fitsSockets && fitsRunes && fitsCategories;
      })
    )
  );

  extractChecked<T>(a: { value: T, checked: boolean }[]): T[] {
    return a.filter(b => b.checked).map(b => b.value);
  }

  constructor() {
  }

  private readonly destroyed = new Subject<void>();

  ngOnInit(): void {
    const runesString = sessionStorage.getItem('runes');
    if (runesString !== null && runesString.length > 0) {
      this.runesCheckedSubject.next(JSON.parse(runesString));
    }
    const socketsString = sessionStorage.getItem('sockets');
    if (socketsString !== null && socketsString.length > 0) {
      this.socketsCheckedSubject.next(JSON.parse(socketsString));
    }
    const itemCategoriesString = sessionStorage.getItem('itemCategories');
    if (itemCategoriesString !== null && itemCategoriesString.length > 0) {
      this.itemCategoriesCheckedSubject.next(JSON.parse(itemCategoriesString));
    }
    this.searchControl.valueChanges.pipe(filter((v): v is string => typeof v === 'string'), takeUntil(this.destroyed)).subscribe(v => sessionStorage.setItem('search', v));
  }

  ngOnDestroy(): void {
    this.destroyed.next();
    this.destroyed.complete();
  }

  toggleRune(rune: Rune, eventTarget: EventTarget | null) {
    const checked = eventTarget instanceof HTMLInputElement ? eventTarget.checked : false;
    this.runesCheckedSubject.next({ ...this.runesCheckedSubject.value, [rune]: checked })
    sessionStorage.setItem('runes', JSON.stringify(this.runesCheckedSubject.value));
  }

  toggleSocket(socket: number, eventTarget: EventTarget | null) {
    const checked = eventTarget instanceof HTMLInputElement ? eventTarget.checked : false;
    this.socketsCheckedSubject.next({ ...this.socketsCheckedSubject.value, [socket]: checked })
    sessionStorage.setItem('sockets', JSON.stringify(this.socketsCheckedSubject.value));
  }

  toggleItemCategory(itemCategory: ItemCategory, eventTarget: EventTarget | null) {
    const checked = eventTarget instanceof HTMLInputElement ? eventTarget.checked : false;
    this.itemCategoriesCheckedSubject.next({ ...this.itemCategoriesCheckedSubject.value, [itemCategory]: checked })
    sessionStorage.setItem('itemCategories', JSON.stringify(this.itemCategoriesCheckedSubject.value));
  }
}
