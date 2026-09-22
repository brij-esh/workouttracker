import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, timeout, catchError, map } from 'rxjs';

export interface MotivationalQuote {
  text: string;
  author: string;
  source: 'online' | 'local';
}

/** Curated offline backup when the network/API is unavailable. */
export const LOCAL_QUOTES: ReadonlyArray<Omit<MotivationalQuote, 'source'>> = [
  {
    text: 'The only bad workout is the one that didn’t happen.',
    author: 'Unknown'
  },
  {
    text: 'Success is the sum of small efforts repeated day in and day out.',
    author: 'Robert Collier'
  },
  {
    text: 'It does not matter how slowly you go as long as you do not stop.',
    author: 'Confucius'
  },
  {
    text: 'The body achieves what the mind believes.',
    author: 'Napoleon Hill'
  },
  {
    text: 'Discipline is choosing between what you want now and what you want most.',
    author: 'Abraham Lincoln'
  },
  {
    text: 'You don’t have to be extreme, just consistent.',
    author: 'Unknown'
  },
  {
    text: 'Strength does not come from winning. Your struggles develop your strengths.',
    author: 'Arnold Schwarzenegger'
  },
  {
    text: 'Don’t limit your challenges. Challenge your limits.',
    author: 'Jerry Dunn'
  },
  {
    text: 'The difference between try and triumph is just a little umph.',
    author: 'Marvin Phillips'
  },
  {
    text: 'Take care of your body. It’s the only place you have to live.',
    author: 'Jim Rohn'
  }
];

@Injectable({ providedIn: 'root' })
export class MotivationalQuoteService {
  private readonly http = inject(HttpClient);

  /** Fresh quote on each call (page reload). Falls back to a local quote offline. */
  load(): Observable<MotivationalQuote> {
    return this.fetchDummyJson().pipe(
      timeout(4500),
      catchError(() =>
        this.fetchZenQuotes().pipe(
          timeout(3500),
          catchError(() => of(this.localQuote()))
        )
      )
    );
  }

  private fetchDummyJson(): Observable<MotivationalQuote> {
    return this.http.get<{ quote?: string; author?: string }>('https://dummyjson.com/quotes/random').pipe(
      map((row) => {
        const text = row.quote?.trim();
        const author = row.author?.trim();
        if (!text || !author) {
          throw new Error('Empty quote');
        }
        return { text, author, source: 'online' as const };
      })
    );
  }

  private fetchZenQuotes(): Observable<MotivationalQuote> {
    return this.http.get<Array<{ q?: string; a?: string }>>('https://zenquotes.io/api/random').pipe(
      map((rows) => {
        const row = rows?.[0];
        const text = row?.q?.trim();
        const author = row?.a?.trim();
        if (!text || !author) {
          throw new Error('Empty quote');
        }
        return { text, author, source: 'online' as const };
      })
    );
  }

  private localQuote(): MotivationalQuote {
    const pick = LOCAL_QUOTES[Math.floor(Math.random() * LOCAL_QUOTES.length)];
    return { text: pick.text, author: pick.author, source: 'local' };
  }
}
