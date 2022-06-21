import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'attributeNumbers'
})
export class AttributeNumbersPipe implements PipeTransform {

  transform(value: string, ...args: unknown[]): { text: string, type: 'text' | 'number' | 'varies' }[] {
    const numberMatches = Array.from(value.matchAll(/(?:^|[^\s\d\w\(]|(?:[^\s\(][^\s\d\w])|(?:[^\(\s]\d+\S)|(?:\(\d*[^\s\d]+))+\d+\S*|(\d+(?:[^\d\s\)]+))|(\([Vv]aries\))/g));
    if (numberMatches.length === 0) {
      return [{ text: value, type: 'text' }];
    }
    return numberMatches.reduce(
      (acc: { start: number, end: number, type: 'varies' | 'number' | 'text' }[], currMatch: RegExpMatchArray, currentIndex: number): { start: number, end: number, type: 'varies' | 'number' | 'text' }[] => {
        const currMatchIndex = currMatch.index ?? 0;
        const currType: 'varies' | 'number' = currMatch[0].toLowerCase() !== '(varies)' ? 'number' : 'varies';
        if (currMatchIndex === 0) {
          const result = [{ start: 0, end: currMatch[0].length, type: currType }];
          if (currentIndex === numberMatches.length - 1 && currMatchIndex + currMatch.length < value.length) {
            return [...result, { start: currMatchIndex + currMatch[0].length, end: value.length, type: 'text' as const }]
          }
        }
        const prevMatch = acc[acc.length - 1];
        const text = { start: prevMatch?.end ?? 0, end: currMatchIndex, type: 'text' as const };
        const result = [...acc, text, { start: currMatchIndex, end: currMatchIndex + currMatch[0].length, type: currType }];
        if (currentIndex === numberMatches.length - 1 && currMatchIndex + currMatch.length < value.length) {
          return [...result, { start: currMatchIndex + currMatch[0].length, end: value.length, type: 'text' as const }]
        }
        return result;
      }, [] as { start: number, end: number, type: 'varies' | 'number' | 'text' }[]
    )
      .map((section: { start: number, end: number, type: 'varies' | 'number' | 'text' }) => {
        return { text: value.slice(section.start, section.end), type: section.type };
      });
  }

}
