import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, timeout, catchError, map } from 'rxjs';

export interface MotivationalQuote {
  text: string;
  author: string;
  source: 'online' | 'local';
}

/** Training / grit focused offline pool. */
export const LOCAL_QUOTES: ReadonlyArray<Omit<MotivationalQuote, 'source'>> = [
  { text: 'The only bad workout is the one that didn’t happen.', author: 'Unknown' },
  { text: 'Success is the sum of small efforts repeated day in and day out.', author: 'Robert Collier' },
  { text: 'The body achieves what the mind believes.', author: 'Napoleon Hill' },
  {
    text: 'Discipline is choosing between what you want now and what you want most.',
    author: 'Abraham Lincoln'
  },
  { text: 'You don’t have to be extreme, just consistent.', author: 'Unknown' },
  {
    text: 'Strength does not come from winning. Your struggles develop your strengths.',
    author: 'Arnold Schwarzenegger'
  },
  { text: 'Don’t limit your challenges. Challenge your limits.', author: 'Jerry Dunn' },
  { text: 'The difference between try and triumph is just a little umph.', author: 'Marvin Phillips' },
  { text: 'Take care of your body. It’s the only place you have to live.', author: 'Jim Rohn' },
  { text: 'No matter how slow you go, you are still lapping everyone on the couch.', author: 'Unknown' },
  { text: 'The pain you feel today will be the strength you feel tomorrow.', author: 'Unknown' },
  { text: 'Push yourself, because no one else is going to do it for you.', author: 'Unknown' },
  { text: 'Don’t stop when you’re tired. Stop when you’re done.', author: 'Unknown' },
  { text: 'Your body can stand almost anything. It’s your mind you have to convince.', author: 'Unknown' },
  { text: 'Motivation gets you started. Habit keeps you going.', author: 'Jim Ryun' },
  { text: 'The hard days are what make you stronger.', author: 'Aly Raisman' },
  { text: 'Somewhere in the world someone is training when you are not.', author: 'Unknown' },
  { text: 'If it doesn’t challenge you, it doesn’t change you.', author: 'Fred DeVito' },
  { text: 'You miss 100% of the shots you don’t take.', author: 'Wayne Gretzky' },
  { text: 'I’ve failed over and over again — that is why I succeed.', author: 'Michael Jordan' },
  { text: 'Champions keep playing until they get it right.', author: 'Billie Jean King' },
  { text: 'It’s not about perfect. It’s about effort.', author: 'Jillian Michaels' },
  { text: 'The clock is ticking. Are you becoming the person you want to be?', author: 'Greg Plitt' },
  { text: 'Excuses don’t burn calories.', author: 'Unknown' },
  { text: 'Make yourself proud.', author: 'Unknown' },
  { text: 'Progress, not perfection.', author: 'Unknown' },
  { text: 'Be stronger than your strongest excuse.', author: 'Unknown' },
  { text: 'Fall seven times, stand up eight — then hit your next set.', author: 'Unknown' },
  { text: 'Today’s sweat is tomorrow’s strength.', author: 'Unknown' },
  { text: 'Show up. The results will follow.', author: 'Unknown' }
];

/** Scripture / devotion / mysticism — not training motivation. */
const RELIGIOUS_PATTERN =
  /\b(god|gods|jesus|christ|christian|bible|biblical|lord|allah|quran|koran|moses|muhammad|prophet|gospel|scripture|church|temple|mosque|synagogue|prayer|pray|amen|heaven|hell|salvation|holy spirit|holy ghost|blessed be|in his name|faith in (?:god|christ)|buddha|buddhist|hindu|krishna|yahweh|jehovah|torah|sermon|disciple|apostle|psalm|genesis|revelation|sufi|nirvana|dharma)\b/i;

const REJECT_AUTHORS =
  /^(rumi|hafiz|buddha|jesus|christ|the bible|bible|dalai lama|muhammad|mohammed|moses|saint |st\. )/i;

@Injectable({ providedIn: 'root' })
export class MotivationalQuoteService {
  private readonly http = inject(HttpClient);

  /**
   * Prefer a filtered online pick; otherwise a curated training quote.
   * ZenQuotes / unfiltered random feeds are skipped — they skew spiritual.
   */
  load(): Observable<MotivationalQuote> {
    return this.fetchDummyJsonPool().pipe(
      timeout(4500),
      catchError(() => of(this.localQuote()))
    );
  }

  /**
   * Pull a small DummyJSON page and choose the first line that passes
   * the motivational filter (avoids single-shot religious hits).
   */
  private fetchDummyJsonPool(): Observable<MotivationalQuote> {
    const skip = Math.floor(Math.random() * 90);
    return this.http
      .get<{ quotes?: Array<{ quote?: string; author?: string }> }>(
        `https://dummyjson.com/quotes?limit=25&skip=${skip}`
      )
      .pipe(
        map((res) => {
          const rows = res.quotes ?? [];
          for (const row of rows) {
            const text = row.quote?.trim();
            const author = row.author?.trim() || 'Unknown';
            if (text && this.isMotivational(text, author)) {
              return { text, author, source: 'online' as const };
            }
          }
          throw new Error('No motivational quote in pool');
        })
      );
  }

  private isMotivational(text: string, author: string): boolean {
    if (REJECT_AUTHORS.test(author.trim())) {
      return false;
    }
    if (RELIGIOUS_PATTERN.test(`${text} ${author}`)) {
      return false;
    }
    // Scripture-style citations ("John 3:16")
    if (/\b(?:[1-3]\s?)?[A-Z][a-z]+\s+\d{1,3}:\d{1,3}\b/.test(text)) {
      return false;
    }
    return text.length >= 12 && text.length <= 200;
  }

  private localQuote(): MotivationalQuote {
    const pick = LOCAL_QUOTES[Math.floor(Math.random() * LOCAL_QUOTES.length)];
    return { text: pick.text, author: pick.author, source: 'local' };
  }
}
